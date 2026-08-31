'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TABLE_OF_CONTENTS, type TocEntry } from '@/lib/toc';

const PDFJS_CDN = '/pdfjs/pdf.min.js';
const WORKER_CDN = '/pdfjs/pdf.worker.min.js';
const PREVIEW_LIMIT = 10;

interface PDFReaderProps {
  bookUrl: string;
  purchased: boolean;
  previewLimit?: number;
  onTextChange?: (text: string) => void;
}

type FlipState = 'idle' | 'out' | 'in';

function currentChapter(page: number): TocEntry | undefined {
  let ch: TocEntry | undefined;
  for (const entry of TABLE_OF_CONTENTS) {
    if (entry.page <= page) ch = entry;
    else break;
  }
  return ch;
}

export default function PDFReader({ bookUrl, purchased, previewLimit = PREVIEW_LIMIT, onTextChange }: PDFReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flipState, setFlipState] = useState<FlipState>('idle');
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');
  const [scale, setScale] = useState(1.4);
  const [tocOpen, setTocOpen] = useState(false);

  const maxPage = purchased ? totalPages : Math.min(previewLimit, totalPages);

  // Load PDF.js from CDN
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
      const resp = await fetch(bookUrl, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to load book');
      const data = await resp.arrayBuffer();
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

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const tc = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = tc.items.map((i: any) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      onTextChange?.(text);
    } catch {
      // ignore render errors on page change
    }
  }, [pdfDoc, scale, onTextChange]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  // Adjust scale to fit container
  useEffect(() => {
    const updateScale = () => {
      const containerWidth = Math.min(window.innerWidth - 48, 900);
      setScale(containerWidth / 595);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const goToPage = useCallback((newPage: number, dir: 'forward' | 'backward') => {
    if (flipState !== 'idle' || newPage < 1 || newPage > maxPage) return;
    setFlipDir(dir);
    setFlipState('out');

    setTimeout(() => {
      setCurrentPage(newPage);
      setFlipState('in');
    }, 250);

    setTimeout(() => {
      setFlipState('idle');
    }, 500);
  }, [flipState, maxPage]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1, 'forward');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPage(currentPage - 1, 'backward');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, goToPage]);

  // Close TOC on outside click
  useEffect(() => {
    if (!tocOpen) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('toc-panel');
      if (el && !el.contains(e.target as Node)) setTocOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tocOpen]);

  const canvasClass = [
    'block rounded shadow-2xl select-none max-w-full',
    flipState === 'out'
      ? (flipDir === 'forward' ? 'animate-flip-out-forward' : 'animate-flip-out-backward')
      : flipState === 'in'
      ? (flipDir === 'forward' ? 'animate-flip-in-forward' : 'animate-flip-in-backward')
      : '',
  ].join(' ');

  const activeToc = currentChapter(currentPage);
  // Only show TOC entries that are within the readable range
  const visibleToc = TABLE_OF_CONTENTS.filter(e => purchased || e.page <= maxPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-cream-300 text-sm">पुस्तक लोड हुँदैछ…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={loadDocument} className="px-4 py-2 bg-gold text-navy-900 rounded text-sm font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 relative">
      {/* Top bar: chapter label + TOC toggle */}
      <div className="w-full flex items-center justify-between max-w-3xl px-2">
        <div className="text-xs text-cream-300/60 font-sans">
          {activeToc ? (
            <span>
              <span className="text-gold">{activeToc.title}</span>
              {activeToc.titleEn && <span className="ml-2 text-cream-300/40">({activeToc.titleEn})</span>}
            </span>
          ) : null}
        </div>

        <button
          onClick={() => setTocOpen(o => !o)}
          className="flex items-center gap-2 text-cream-300/70 hover:text-gold transition-colors text-xs font-medium"
          title="Table of Contents / विषय-सूची"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9h14V7H3v2zm0 4h14v-2H3v2zm0 4h14v-2H3v2zm16 0h2v-2h-2v2zm0-10v2h2V7h-2zm0 6h2v-2h-2v2z"/>
          </svg>
          विषय-सूची
        </button>
      </div>

      {/* TOC drawer */}
      {tocOpen && (
        <div
          id="toc-panel"
          className="absolute top-12 right-4 z-40 w-72 bg-navy-800 border border-gold/20 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
            <h3 className="text-cream-100 font-serif text-sm">विषय-सूची <span className="text-cream-300/40 font-sans text-xs ml-1">Contents</span></h3>
            <button onClick={() => setTocOpen(false)} className="text-cream-300/50 hover:text-gold text-lg leading-none">×</button>
          </div>
          <ul className="max-h-96 overflow-y-auto py-2">
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
                      'w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 transition-colors',
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

      {/* Preview warning */}
      {!purchased && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3 text-center max-w-lg">
          <p className="text-gold text-sm font-medium">
            पूर्वावलोकन — पृष्ठ १–{Math.min(previewLimit, totalPages)} / {totalPages}
          </p>
          <p className="text-cream-300/70 text-xs mt-1">
            Preview Mode · Purchase the full book to read all {totalPages} pages.
          </p>
        </div>
      )}

      {/* Canvas container */}
      <div
        className="relative overflow-hidden rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        style={{ perspective: '1200px' }}
        onContextMenu={e => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          className={canvasClass}
          style={{ display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
        />

        {/* Preview gate overlay */}
        {!purchased && currentPage >= maxPage && (
          <div className="absolute inset-0 bg-navy-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 rounded-lg">
            <svg className="w-16 h-16 text-gold/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <h3 className="text-cream-100 font-serif text-2xl">कथा जारी राख्नुहोस्</h3>
            <p className="text-cream-300/80 text-sm">Continue the story</p>
            <p className="text-cream-300 text-center max-w-xs text-sm">
              नि:शुल्क पूर्वावलोकन समाप्त भयो। पूरा पुस्तक पढ्न किन्नुहोस्।
            </p>
            <a href="/purchase" className="mt-2 px-6 py-3 bg-gold text-navy-900 rounded font-semibold hover:bg-gold-light transition-colors">
              पूरा पुस्तक किन्नुहोस् — £9.99
            </a>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => goToPage(1, 'backward')}
          disabled={currentPage <= 1}
          className="p-2 text-cream-300 hover:text-gold disabled:opacity-30 transition-colors"
          title="First page / पहिलो पृष्ठ"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zm-6 0L7.82 12l4.59-4.59L11 6l-6 6 6 6 1.41-1.41z"/></svg>
        </button>
        <button
          onClick={() => goToPage(currentPage - 1, 'backward')}
          disabled={currentPage <= 1}
          className="px-6 py-2.5 bg-navy-800 border border-gold/30 text-cream-200 hover:bg-navy-700 disabled:opacity-30 transition-all rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
          अघिल्लो
        </button>

        <div className="text-center">
          <span className="text-gold font-serif text-lg">{currentPage}</span>
          <span className="text-cream-300/60 text-sm"> / {maxPage}</span>
          {!purchased && <span className="text-cream-300/40 text-xs block">पूर्वावलोकन</span>}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1, 'forward')}
          disabled={currentPage >= maxPage}
          className="px-6 py-2.5 bg-navy-800 border border-gold/30 text-cream-200 hover:bg-navy-700 disabled:opacity-30 transition-all rounded flex items-center gap-2"
        >
          अर्को
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </button>
        <button
          onClick={() => goToPage(maxPage, 'forward')}
          disabled={currentPage >= maxPage}
          className="p-2 text-cream-300 hover:text-gold disabled:opacity-30 transition-colors"
          title="Last page / अन्तिम पृष्ठ"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zm6 0L16.18 12l-4.59 4.59L13 18l6-6-6-6-1.41 1.41z"/></svg>
        </button>
      </div>

      <p className="text-cream-300/40 text-xs">← → तीर कुञ्जीहरू प्रयोग गर्नुहोस् &nbsp;·&nbsp; Use arrow keys to navigate</p>
    </div>
  );
}
