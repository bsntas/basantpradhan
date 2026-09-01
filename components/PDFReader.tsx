'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TABLE_OF_CONTENTS, type TocEntry } from '@/lib/toc';
import { BOOK_TEXT } from '@/lib/bookText';

const VoiceControls = dynamic(() => import('@/components/VoiceControls'), { ssr: false });

const PDFJS_CDN = '/pdfjs/pdf.min.js';
const WORKER_CDN = '/pdfjs/pdf.worker.min.js';
const PREVIEW_LIMIT = 10;

// Module-level cache: survives React re-mounts within the same tab session.
const pdfDataCache = new Map<string, ArrayBuffer>();

interface PDFReaderProps {
  bookUrl: string;
  purchased: boolean;
  previewLimit?: number;
}

function currentChapter(page: number): TocEntry | undefined {
  let ch: TocEntry | undefined;
  for (const entry of TABLE_OF_CONTENTS) {
    if (entry.page <= page) ch = entry;
    else break;
  }
  return ch;
}

export default function PDFReader({ bookUrl, purchased, previewLimit = PREVIEW_LIMIT }: PDFReaderProps) {
  const topCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottomCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isFlippingRef = useRef(false);
  const skipNextRenderRef = useRef(false);
  const currentPageRef = useRef(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flipState, setFlipState] = useState<null | 'out'>(null);
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [tocOpen, setTocOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('pdf');

  const maxPage = purchased ? totalPages : Math.min(previewLimit, totalPages);

  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
      loadDocument();
    };
    script.onerror = () => setError('Failed to load PDF engine. Please refresh.');
    document.head.appendChild(script);
    return;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocument = useCallback(async () => {
    if (!window.pdfjsLib) return;
    try {
      setLoading(true);
      setError('');
      let data = pdfDataCache.get(bookUrl);
      if (!data) {
        const resp = await fetch(bookUrl, { credentials: 'include' });
        if (!resp.ok) throw new Error('Failed to load book');
        data = await resp.arrayBuffer();
        pdfDataCache.set(bookUrl, data);
      }
      const doc = await window.pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setLoading(false);
    } catch {
      setError('Could not load the book. Please try again.');
      setLoading(false);
    }
  }, [bookUrl]);

  useEffect(() => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
      loadDocument();
    }
  }, [loadDocument]);

  // Renders pageNum to a canvas at DPR-aware resolution.
  // Two-up landscape spreads are cropped to the right half.
  const renderToCanvas = useCallback(async (
    pageNum: number,
    canvas: HTMLCanvasElement,
  ): Promise<{ w: number; h: number } | null> => {
    if (!pdfDoc || !containerRef.current) return null;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
      if (cW === 0 || cH === 0) return null;

      const natural = page.getViewport({ scale: 1 });
      const isSpread = natural.width > natural.height * 1.15;
      const effectiveW = isSpread ? natural.width / 2 : natural.width;

      const scaleW = (cW - 48) / effectiveW;
      const scaleH = (cH - 48) / natural.height;
      const fitScale = Math.min(scaleW, scaleH, 2.5);

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: fitScale * dpr });
      const halfW = Math.round(viewport.width / 2);

      canvas.width  = isSpread ? halfW : viewport.width;
      canvas.height = viewport.height;
      const cssW = Math.round(canvas.width / dpr);
      const cssH = Math.round(viewport.height / dpr);
      canvas.style.width  = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const ctx = canvas.getContext('2d')!;
      if (isSpread) {
        ctx.translate(-halfW, 0);
      }
      await page.render({ canvasContext: ctx, viewport }).promise;

      return { w: cssW, h: cssH };
    } catch {
      return null;
    }
  }, [pdfDoc]);

  const renderPage = useCallback(async (pageNum: number) => {
    // Skip if goToPage already rendered to topCanvas during flip — avoid double-render flash
    if (skipNextRenderRef.current) {
      skipNextRenderRef.current = false;
      return;
    }
    if (!topCanvasRef.current) return;
    const size = await renderToCanvas(pageNum, topCanvasRef.current);
    if (size) setCanvasSize(size);
  }, [renderToCanvas]);

  // Keep ref in sync so ResizeObserver always reads the latest page without
  // being listed as a dependency (which would restart it on every page turn).
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // Use rAF so layout is complete before measuring the container
  useEffect(() => {
    const raf = requestAnimationFrame(() => renderPage(currentPage));
    return () => cancelAnimationFrame(raf);
  }, [currentPage, renderPage]);

  // ResizeObserver re-renders on container resize.
  // Intentionally omits currentPage from deps — the observer must NOT restart
  // on every page turn, because browsers fire the callback once on first
  // observation, which would consume the flip skip-guard and cause a flicker.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => renderPage(currentPageRef.current));
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset text scroll to top on page change in text mode
  useEffect(() => {
    if (viewMode === 'text' && textScrollRef.current) {
      textScrollRef.current.scrollTop = 0;
    }
  }, [currentPage, viewMode]);

  const goToPage = useCallback(async (newPage: number, dir: 'forward' | 'backward') => {
    if (newPage < 1 || newPage > maxPage) return;

    // Text mode: instant navigation, no canvas animation
    if (viewMode === 'text') {
      setCurrentPage(newPage);
      return;
    }

    if (isFlippingRef.current) return;
    if (!bottomCanvasRef.current || !topCanvasRef.current) return;

    isFlippingRef.current = true;

    // Pre-render new page to bottom canvas (visible during fold-out).
    await renderToCanvas(newPage, bottomCanvasRef.current);

    setFlipDir(dir);
    setFlipState('out'); // Phase 1: old page folds away (0° → -90°)

    const topCanvas = topCanvasRef.current;

    // Fold-out complete: canvas is at -90° (edge-on, invisible).
    // Render new content while invisible, then snap to 0° — bottom canvas
    // was already showing the new page so there is no visible gap.
    const onFoldOut = async () => {
      topCanvas.removeEventListener('animationend', onFoldOut);
      if (!topCanvasRef.current) return;

      const size = await renderToCanvas(newPage, topCanvas);
      if (size) setCanvasSize(size);

      // Skip the useEffect re-render — canvas already has the correct content.
      skipNextRenderRef.current = true;
      setCurrentPage(newPage);
      setFlipState(null); // removes animation class; top canvas snaps to 0° with new content
      isFlippingRef.current = false;
    };
    topCanvas.addEventListener('animationend', onFoldOut);
  }, [maxPage, renderToCanvas, viewMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1, 'forward');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPage(currentPage - 1, 'backward');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, goToPage]);

  useEffect(() => {
    if (!tocOpen) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('toc-panel');
      if (el && !el.contains(e.target as Node)) setTocOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tocOpen]);

  const topCanvasClass = [
    'block rounded-sm absolute top-0 left-0 z-10',
    flipState === 'out'
      ? (flipDir === 'forward' ? 'animate-flip-out-forward' : 'animate-flip-out-backward')
      : '',
  ].join(' ');

  const activeToc = currentChapter(currentPage);

  // Text view: detect chapter start and split title from body
  const isChapterStart = TABLE_OF_CONTENTS.some(e => e.page === currentPage);
  const rawText = BOOK_TEXT[currentPage] ?? '';
  let headingText = '';
  let bodyText = rawText;
  if (isChapterStart && rawText) {
    const nlIdx = rawText.indexOf('\n');
    if (nlIdx !== -1) {
      headingText = rawText.slice(0, nlIdx).trim();
      bodyText = rawText.slice(nlIdx + 1).trim();
    } else {
      headingText = rawText;
      bodyText = '';
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-cream-300 text-sm">पुस्तक लोड हुँदैछ…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={loadDocument} className="px-4 py-2 bg-gold text-navy-900 rounded text-sm font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">

      {/* ── Info bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 h-10 border-b border-gold/10 bg-navy-900/60">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          {!purchased && (
            <span className="shrink-0 text-[10px] font-semibold tracking-wide text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full uppercase">
              Preview
            </span>
          )}
          {activeToc ? (
            <span className="text-xs text-cream-300/60 truncate">
              <span className="text-gold/80">{activeToc.title}</span>
              {activeToc.titleEn && (
                <span className="ml-2 text-cream-300/35 hidden sm:inline">{activeToc.titleEn}</span>
              )}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-cream-300/45 tabular-nums font-mono">
            {currentPage}&thinsp;/&thinsp;{maxPage}
            {!purchased && totalPages > 0 && (
              <span className="text-cream-300/25"> of {totalPages}</span>
            )}
          </span>
          <div className="w-px h-4 bg-gold/15" />
          {/* View mode toggle: PDF ↔ Text */}
          <button
            onClick={() => setViewMode(m => m === 'pdf' ? 'text' : 'pdf')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors ${
              viewMode === 'text' ? 'text-gold bg-gold/10' : 'text-cream-300/55 hover:text-gold hover:bg-white/5'
            }`}
            title={viewMode === 'pdf' ? 'Switch to text view' : 'Switch to PDF view'}
          >
            {viewMode === 'pdf' ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 16h8v2H8v-2zm0-4h8v2H8v-2zm0-4h5v2H8V8z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            )}
            <span className="hidden sm:inline">{viewMode === 'pdf' ? 'पाठ' : 'PDF'}</span>
          </button>
          <div className="w-px h-4 bg-gold/15" />
          <button
            onClick={() => setTocOpen(o => !o)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors ${
              tocOpen ? 'text-gold bg-gold/10' : 'text-cream-300/55 hover:text-gold hover:bg-white/5'
            }`}
            title="Table of Contents / विषय-सूची"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
            </svg>
            <span className="hidden sm:inline">विषय-सूची</span>
          </button>
        </div>
      </div>

      {/* ── TOC drawer ───────────────────────────────────────────── */}
      {tocOpen && (
        <div
          id="toc-panel"
          className="absolute top-10 right-0 z-40 w-72 bg-navy-800 border border-gold/20 rounded-bl-xl shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
            <h3 className="text-cream-100 font-serif text-sm">
              विषय-सूची
              <span className="text-cream-300/35 font-sans text-xs ml-2">Contents</span>
            </h3>
            <button onClick={() => setTocOpen(false)} className="text-cream-300/50 hover:text-gold text-xl leading-none">×</button>
          </div>
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto py-2">
            {TABLE_OF_CONTENTS.map((entry) => {
              const isActive = activeToc?.page === entry.page;
              const isLocked = !purchased && entry.page > maxPage;
              return (
                <li key={entry.page}>
                  <button
                    onClick={() => {
                      if (!isLocked) {
                        goToPage(entry.page, entry.page > currentPage ? 'forward' : 'backward');
                        setTocOpen(false);
                      }
                    }}
                    disabled={isLocked}
                    className={[
                      'w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors',
                      isActive ? 'bg-gold/15 text-gold' : 'text-cream-300 hover:bg-navy-700',
                      isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <span className="text-sm leading-tight">
                      <span className="block">{entry.title}</span>
                      {entry.titleEn && (
                        <span className="text-xs text-cream-300/40 font-sans">{entry.titleEn}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-cream-300/30 font-mono">
                      {isLocked ? (
                        <svg className="w-3.5 h-3.5 text-gold/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                      ) : `p.${entry.page}`}
                    </span>
                  </button>
                </li>
              );
            })}
            {!purchased && (
              <li className="px-4 py-3 border-t border-gold/10">
                <p className="text-xs text-cream-300/40 text-center">
                  🔒 पूर्ण पहुँचको लागि किन्नुहोस्<br/>
                  <span className="text-gold/60">Purchase for full access</span>
                </p>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ── Canvas / Text area ───────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative"
        style={viewMode === 'pdf' ? { perspective: '1200px' } : undefined}
        onContextMenu={e => e.preventDefault()}
        onTouchStart={e => {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
        }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          const dy = e.changedTouches[0].clientY - touchStartY.current;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) goToPage(currentPage + 1, 'forward');
            else        goToPage(currentPage - 1, 'backward');
          }
        }}
      >
        {/* ── PDF canvas stack — always mounted; hidden in text mode so sizing stays ready ── */}
        <div
          className="relative shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
          style={{
            ...(canvasSize.w ? { width: canvasSize.w, height: canvasSize.h } : {}),
            display: viewMode === 'pdf' ? undefined : 'none',
          }}
        >
          {/* Bottom canvas: new page pre-rendered, revealed as top folds away */}
          <canvas
            ref={bottomCanvasRef}
            className="block rounded-sm absolute top-0 left-0"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              visibility: flipState !== null ? 'visible' : 'hidden',
            }}
          />
          {/* Top canvas: current page, animates out on navigation */}
          <canvas
            ref={topCanvasRef}
            className={topCanvasClass}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          />
        </div>

        {/* ── Text view: book-page layout ─────────────────────────── */}
        {viewMode === 'text' && (
          <div
            ref={textScrollRef}
            className="overflow-y-auto shadow-[0_8px_40px_rgba(0,0,0,0.6)] rounded-sm bg-navy-900/80 border border-gold/10"
            style={{
              width:  canvasSize.w || 520,
              height: canvasSize.h || '85%',
            }}
          >
            <div className="px-8 sm:px-12 py-10 min-h-full flex flex-col">

              {/* Chapter heading — shown on chapter-start pages */}
              {headingText ? (
                <div className="text-center mb-8">
                  <h2
                    className="text-gold text-2xl font-bold leading-snug"
                    style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
                  >
                    {headingText}
                  </h2>
                  {isChapterStart && activeToc?.titleEn && (
                    <p className="text-cream-300/40 text-sm mt-1.5 italic font-sans tracking-wide">
                      {activeToc.titleEn}
                    </p>
                  )}
                  <div className="mt-5 flex items-center gap-3 justify-center">
                    <div className="h-px w-12 bg-gold/25" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gold/40" />
                    <div className="h-px w-12 bg-gold/25" />
                  </div>
                </div>
              ) : null}

              {/* Body text */}
              {bodyText ? (
                <p
                  className="text-cream-200 text-[15.5px] leading-[2.2] text-justify flex-1 select-text"
                  style={{ fontFamily: "'Noto Serif Devanagari', 'Noto Serif', serif", whiteSpace: 'pre-line' }}
                >
                  {bodyText}
                </p>
              ) : !headingText ? (
                <p className="text-cream-300/35 text-center text-sm italic mt-10">
                  यस पृष्ठमा पाठ उपलब्ध छैन।
                  <br />
                  <span className="text-xs text-cream-300/25">No text available for this page.</span>
                </p>
              ) : null}

              {/* Printed page number at bottom */}
              {currentPage > 2 && (
                <p className="text-cream-300/20 text-[11px] text-center mt-10 font-mono tracking-widest select-none">
                  — {currentPage - 2} —
                </p>
              )}
            </div>
          </div>
        )}

        {/* Preview gate overlay */}
        {!purchased && currentPage >= maxPage && (
          <div className="absolute inset-0 bg-navy-900/92 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <svg className="w-14 h-14 text-gold/55" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <h3 className="text-cream-100 font-serif text-2xl">कथा जारी राख्नुहोस्</h3>
            <p className="text-cream-300/70 text-sm">Continue the story</p>
            <p className="text-cream-300 text-center max-w-xs text-sm px-4">
              नि:शुल्क पूर्वावलोकन समाप्त भयो। पूरा पुस्तक पढ्न किन्नुहोस्।
            </p>
            <a href="/purchase" className="mt-2 px-6 py-3 bg-gold text-navy-900 rounded font-semibold hover:bg-gold-light transition-colors">
              पूरा पुस्तक किन्नुहोस् — £9.99
            </a>
          </div>
        )}
      </div>

      {/* ── Navigation bar ───────────────────────────────────────── */}
      <div className="shrink-0 bg-navy-900/70 border-t border-gold/10 px-4 py-2.5">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => goToPage(1, 'backward')}
            disabled={currentPage <= 1}
            className="p-2 text-cream-300/50 hover:text-gold disabled:opacity-25 transition-colors rounded hover:bg-white/5"
            title="First page"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zm-6 0L7.82 12l4.59-4.59L11 6l-6 6 6 6 1.41-1.41z"/>
            </svg>
          </button>

          <button
            onClick={() => goToPage(currentPage - 1, 'backward')}
            disabled={currentPage <= 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 border border-gold/20 text-cream-200 hover:bg-navy-700 hover:border-gold/35 disabled:opacity-25 transition-all rounded text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
            </svg>
            <span className="hidden sm:inline">अघिल्लो</span>
          </button>

          <div className="text-center min-w-[3.5rem]">
            <span className="text-gold font-serif text-lg tabular-nums">{currentPage}</span>
            <span className="text-cream-300/45 text-sm"> / {maxPage}</span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1, 'forward')}
            disabled={currentPage >= maxPage}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 border border-gold/20 text-cream-200 hover:bg-navy-700 hover:border-gold/35 disabled:opacity-25 transition-all rounded text-sm"
          >
            <span className="hidden sm:inline">अर्को</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </button>

          <button
            onClick={() => goToPage(maxPage, 'forward')}
            disabled={currentPage >= maxPage}
            className="p-2 text-cream-300/50 hover:text-gold disabled:opacity-25 transition-colors rounded hover:bg-white/5"
            title="Last page"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zm6 0L16.18 12l-4.59 4.59L13 18l6-6-6-6-1.41 1.41z"/>
            </svg>
          </button>
        </div>
        <p className="text-cream-300/25 text-[10px] text-center mt-1 select-none">
          <span className="sm:hidden">swipe left / right to navigate</span>
          <span className="hidden sm:inline">← → arrow keys · swipe on touch screens</span>
        </p>
      </div>

      {/* ── Voice controls — always visible; reads bookText in PDF mode too ── */}
      <VoiceControls text={BOOK_TEXT[currentPage] ?? ''} pageNumber={currentPage} />
    </div>
  );
}
