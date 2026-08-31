'use client';

import { useEffect, useRef, useState } from 'react';

const PDFJS_CDN = '/pdfjs/pdf.min.js';
const WORKER_CDN = '/pdfjs/pdf.worker.min.js';

// The cover PDF is a two-up spread (back cover left, front cover right).
// We render the full spread offscreen and copy only the right half to the canvas.
const FRONT_COVER_HALF = 'right'; // change to 'left' if your spread is reversed

export default function BookCover() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [coverWidth, setCoverWidth] = useState(280);
  const [coverHeight, setCoverHeight] = useState(390);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!window.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = PDFJS_CDN;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('script load failed'));
          document.head.appendChild(s);
        });
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;

      const resp = await fetch('/api/cover');
      if (!resp.ok) throw new Error('cover fetch failed');
      const data = await resp.arrayBuffer();
      if (cancelled) return;

      const doc = await window.pdfjsLib.getDocument({ data }).promise;
      const page = await doc.getPage(1);

      if (!canvasRef.current || cancelled) return;
      const canvas = canvasRef.current;

      // Render full spread at a scale that makes the front-cover half ~280px wide
      const fullViewport = page.getViewport({ scale: 1 });
      const targetHalfWidth = canvas.parentElement?.clientWidth ?? 280;
      const scale = (targetHalfWidth * 2) / fullViewport.width;
      const scaledViewport = page.getViewport({ scale });

      // Render full spread to an offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = scaledViewport.width;
      offscreen.height = scaledViewport.height;
      const offCtx = offscreen.getContext('2d')!;
      await page.render({ canvasContext: offCtx, viewport: scaledViewport }).promise;

      if (cancelled || !canvasRef.current) return;

      // Copy only the front-cover half to the visible canvas
      const halfW = Math.floor(scaledViewport.width / 2);
      const srcX = FRONT_COVER_HALF === 'right' ? halfW : 0;

      canvas.width = halfW;
      canvas.height = scaledViewport.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(offscreen, srcX, 0, halfW, scaledViewport.height, 0, 0, halfW, scaledViewport.height);

      setCoverWidth(halfW);
      setCoverHeight(scaledViewport.height);
      if (!cancelled) setLoaded(true);
    }

    render().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <CSSBookMockup />;
  }

  return (
    <div className="relative animate-float" style={{ transformStyle: 'preserve-3d' }}>
      {/* Book spine */}
      <div
        className="absolute top-0 bottom-0 rounded-l-sm bg-gradient-to-r from-navy-950 to-navy-800"
        style={{
          width: 36,
          left: -34,
          transform: 'rotateY(-90deg)',
          transformOrigin: 'right',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          className="text-gold/60 text-xs tracking-widest font-serif"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          KOLTEY GOLAI
        </p>
      </div>

      {/* Cover canvas — shows only the front-cover half */}
      <div
        className="relative overflow-hidden rounded-r-sm"
        style={{
          boxShadow: '8px 12px 48px rgba(0,0,0,0.7), 2px 2px 0 rgba(201,168,76,0.15)',
          width: loaded ? coverWidth : 280,
          minHeight: loaded ? coverHeight : 390,
        }}
        onContextMenu={e => e.preventDefault()}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy-800">
            <div className="w-8 h-8 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block select-none"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease', userSelect: 'none' }}
        />
      </div>

      {/* Drop shadow */}
      <div
        className="absolute -bottom-4 left-4 right-0 h-8 rounded-full opacity-50"
        style={{ background: 'rgba(0,0,0,0.5)', filter: 'blur(14px)' }}
      />
    </div>
  );
}

function CSSBookMockup() {
  return (
    <div className="animate-float relative" style={{ width: 280, height: 390 }}>
      <div
        className="absolute top-0 bottom-0 rounded-l-sm bg-gradient-to-r from-navy-950 to-navy-800"
        style={{ width: 36, left: -34, transform: 'rotateY(-90deg)', transformOrigin: 'right' }}
      >
        <div className="h-full flex items-center justify-center">
          <p className="text-gold/60 text-xs tracking-widest font-serif"
            style={{ writingMode: 'vertical-rl' }}>KOLTEY GOLAI</p>
        </div>
      </div>
      <div
        className="absolute inset-0 rounded-r-sm flex flex-col items-center justify-between p-8"
        style={{
          background: 'linear-gradient(155deg, #111827 0%, #0f3460 50%, #0a0e1a 100%)',
          boxShadow: '8px 8px 40px rgba(0,0,0,0.7)',
          border: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        <div className="w-full flex items-center gap-2 opacity-60">
          <div className="flex-1 h-px bg-gold/40" />
          <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <div className="flex-1 h-px bg-gold/40" />
        </div>
        <div className="text-center">
          <h2 className="font-serif text-4xl text-cream-100 leading-tight mb-1">Koltey</h2>
          <h2 className="font-serif text-4xl text-gold leading-tight">Golai</h2>
        </div>
        <p className="text-cream-300 text-xs tracking-[0.25em] uppercase font-sans">Basant Pradhan</p>
      </div>
    </div>
  );
}
