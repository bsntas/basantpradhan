'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BOOK_VERSION } from '@/lib/config';

const PDFReader = dynamic(() => import('@/components/PDFReader'), { ssr: false });

interface UserState {
  name: string;
  email: string;
  purchases: string[];
}

export default function ReaderPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserState | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login?redirect=/reader'); return; }
      setUser(d.user);
      setAuthLoading(false);
    });
  }, [router]);

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-navy-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const purchased = user.purchases.includes('koltey-golai');

  return (
    <div className="h-[100dvh] overflow-hidden bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 z-30 bg-navy-900/95 backdrop-blur-sm border-b border-gold/15 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-cream-300/60 hover:text-gold transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </Link>
            <div className="h-4 w-px bg-gold/20" />
            <div>
              <p className="font-serif text-cream-100 text-sm leading-none">Koltey Golai</p>
              <p className="text-cream-300/50 text-xs mt-0.5">Basant Pradhan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {purchased ? (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Full Access
              </span>
            ) : (
              <Link href="/purchase"
                className="hidden sm:flex items-center gap-1.5 text-xs bg-gold text-navy-900 font-semibold px-3 py-1.5 rounded hover:bg-gold-light transition-colors">
                Buy Full Book
              </Link>
            )}
            <span className="text-cream-300/50 text-sm">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Reader fills all remaining space — no padding so PDFReader owns its layout */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <PDFReader
          bookUrl={`/api/book?v=${BOOK_VERSION}`}
          purchased={purchased}
          previewLimit={10}
        />
      </main>

      {/* Purchase banner — sits below the reader, doesn't push content up inside reader */}
      {!purchased && (
        <div className="shrink-0 z-20 bg-navy-900/95 backdrop-blur-sm border-t border-gold/20 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-cream-300 text-sm">
              <span className="text-gold font-medium">Enjoying the preview?</span>
              {' '}Get full access to all 174 pages.
            </p>
            <Link href="/purchase"
              className="shrink-0 px-5 py-2 bg-gold text-navy-900 font-bold text-sm uppercase tracking-wider hover:bg-gold-light transition-colors rounded-sm">
              Buy — ₹51 / £9.99
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
