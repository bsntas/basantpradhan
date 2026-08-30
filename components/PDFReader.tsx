'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (src: string | ArrayBuffer | { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
    };
  }
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (num: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: ReturnType<PDFPageProxy['getViewport']> }) => { promise: Promise<void> };
  getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const PREVIEW_LIMIT = 5;

interface PDFReaderProps {
  bookUrl: string;
  purchased: boolean;
  previewLimit?: number;
  onTextChange?: (text: string) => void;
}

type FlipState = 'idle' | 'out' | 'in';

export default function PDFReader({ bookUrl, purchased, previewLimit = PREVIEW_LIMIT, onTextChange }: PDFReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flipState, setFlipState] = useState<FlipState>('idle');
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [scale, setScale] = useState(1.4);

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
    } catch (e) {
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

      // Extract text for voice reader
      const tc = await page.getTextContent();
      const text = tc.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
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
      setScale(containerWidth / 595); // A4 width in points ≈ 595
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const goToPage = useCallback((newPage: number, dir: 'forward' | 'backward') => {
    if (flipState !== 'idle' || newPage < 1 || newPage > maxPage) return;
    setFlipDir(dir);
    setPendingPage(newPage);
    setFlipState('out');

    setTimeout(() => {
      setCurrentPage(newPage);
      setFlipState('in');
    }, 250);

    setTimeout(() => {
      setFlipState('idle');
      setPendingPage(null);
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

  const canvasClass = [
    'block rounded shadow-2xl select-none max-w-full',
    flipState === 'out'
      ? (flipDir === 'forward' ? 'animate-flip-out-forward' : 'animate-flip-out-backward')
      : flipState === 'in'
      ? (flipDir === 'forward' ? 'animate-flip-in-forward' : 'animate-flip-in-backward')
      : '',
  ].join(' ');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
        <p className="text-cream-300 text-sm">Loading your book…</p>
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
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Preview warning */}
      {!purchased && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3 text-center max-w-lg">
          <p className="text-gold text-sm font-medium">
            Preview Mode — Showing pages 1–{Math.min(previewLimit, totalPages)} of {totalPages}
          </p>
          <p className="text-cream-300/70 text-xs mt-1">
            Purchase the full book to read all {totalPages} pages.
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
            <h3 className="text-cream-100 font-serif text-2xl">Continue the Story</h3>
            <p className="text-cream-300 text-center max-w-xs text-sm">
              You've reached the end of your free preview. Purchase the full book to keep reading.
            </p>
            <a href="/purchase" className="mt-2 px-6 py-3 bg-gold text-navy-900 rounded font-semibold hover:bg-gold-light transition-colors">
              Buy Full Book — £9.99
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
          title="First page"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41zm-6 0L7.82 12l4.59-4.59L11 6l-6 6 6 6 1.41-1.41z"/></svg>
        </button>
        <button
          onClick={() => goToPage(currentPage - 1, 'backward')}
          disabled={currentPage <= 1}
          className="px-6 py-2.5 bg-navy-800 border border-gold/30 text-cream-200 hover:bg-navy-700 disabled:opacity-30 transition-all rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
          Previous
        </button>

        <div className="text-center">
          <span className="text-gold font-serif text-lg">{currentPage}</span>
          <span className="text-cream-300/60 text-sm"> / {maxPage}</span>
          {!purchased && <span className="text-cream-300/40 text-xs block">preview</span>}
        </div>

        <button
          onClick={() => goToPage(currentPage + 1, 'forward')}
          disabled={currentPage >= maxPage}
          className="px-6 py-2.5 bg-navy-800 border border-gold/30 text-cream-200 hover:bg-navy-700 disabled:opacity-30 transition-all rounded flex items-center gap-2"
        >
          Next
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </button>
        <button
          onClick={() => goToPage(maxPage, 'forward')}
          disabled={currentPage >= maxPage}
          className="p-2 text-cream-300 hover:text-gold disabled:opacity-30 transition-colors"
          title="Last page"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41zm6 0L16.18 12l-4.59 4.59L13 18l6-6-6-6-1.41 1.41z"/></svg>
        </button>
      </div>

      <p className="text-cream-300/40 text-xs">Use ← → arrow keys to navigate</p>
    </div>
  );
}
