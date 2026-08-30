'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PurchasePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
      else router.push('/login?redirect=/purchase');
      setCheckingAuth(false);
    });
  }, [router]);

  const completePurchase = async () => {
    setLoading(true);
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: 'koltey-golai' }),
    });
    setLoading(false);
    if (res.ok) router.push('/reader');
    else router.push('/login');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 40%, #c9a84c10 0%, transparent 60%)' }} />

      <Link href="/" className="text-gold font-serif text-2xl mb-10">Basant Pradhan</Link>

      <div className="relative w-full max-w-lg bg-navy-800 border border-gold/20 rounded-xl overflow-hidden shadow-2xl">
        {/* Top banner */}
        <div className="bg-gradient-to-r from-gold-dark to-gold px-8 py-5">
          <p className="text-navy-900 text-xs uppercase tracking-widest font-bold mb-1">Purchase</p>
          <h1 className="font-serif text-3xl text-navy-950">Koltey Golai</h1>
          <p className="text-navy-800 text-sm font-medium">by Basant Pradhan</p>
        </div>

        <div className="p-8">
          {user && (
            <p className="text-cream-300/70 text-sm mb-6">
              Purchasing as <span className="text-gold">{user.email}</span>
            </p>
          )}

          {/* What you get */}
          <div className="mb-8 space-y-3">
            {[
              'Full digital book — unlimited reads',
              'In-browser reader with page-flip animations',
              'Voice narration with custom voices & speed',
              'Access from any device, anytime',
            ].map(item => (
              <div key={item} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gold shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span className="text-cream-300 text-sm">{item}</span>
              </div>
            ))}
          </div>

          {/* Mock payment */}
          <div className="border border-gold/20 rounded-lg p-5 mb-6 bg-navy-900/50">
            <p className="text-cream-300/50 text-xs uppercase tracking-wider mb-3">Payment Details</p>
            <div className="space-y-3">
              <input className="input-field" placeholder="Card number" defaultValue="4242 4242 4242 4242" readOnly />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="MM/YY" defaultValue="12/28" readOnly />
                <input className="input-field" placeholder="CVC" defaultValue="123" readOnly />
              </div>
            </div>
            <p className="text-gold/50 text-xs mt-3 text-center">
              ⚠ Demo mode — no real payment is processed
            </p>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-cream-300 font-medium">Total</span>
            <span className="text-gold font-serif text-3xl">£9.99</span>
          </div>

          <button
            onClick={completePurchase}
            disabled={loading}
            className="w-full py-4 bg-gold text-navy-900 font-bold text-lg uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm disabled:opacity-50"
          >
            {loading ? 'Processing…' : 'Complete Purchase'}
          </button>

          <p className="text-center text-cream-300/40 text-xs mt-4">
            By purchasing you agree to our terms. Digital products are non-refundable.
          </p>
        </div>
      </div>

      <Link href="/" className="mt-8 text-cream-300/50 text-sm hover:text-cream-300 transition-colors">
        ← Back to home
      </Link>
    </div>
  );
}
