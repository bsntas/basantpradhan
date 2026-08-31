'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRICES, type CurrencyCode, DEFAULT_CURRENCY } from '@/lib/config';

export default function PurchasePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  const price = PRICES[currency];

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
      body: JSON.stringify({ bookId: 'koltey-golai', currency, amount: price.amount }),
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
          <p className="text-navy-900 text-xs uppercase tracking-widest font-bold mb-1">खरिद गर्नुहोस् · Purchase</p>
          <h1 className="font-serif text-3xl text-navy-950">कोल्टे गोलाई</h1>
          <p className="text-navy-800 text-sm font-medium">Koltey Golai · Basant Pradhan</p>
        </div>

        <div className="p-8">
          {user && (
            <p className="text-cream-300/70 text-sm mb-6">
              Purchasing as <span className="text-gold">{user.email}</span>
            </p>
          )}

          {/* What you get */}
          <div className="mb-6 space-y-3">
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

          {/* Currency selector */}
          <div className="mb-6">
            <p className="text-cream-300/50 text-xs uppercase tracking-wider mb-3">मुद्रा छनोट · Select Currency</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PRICES) as CurrencyCode[]).map(code => {
                const p = PRICES[code];
                const active = currency === code;
                return (
                  <button
                    key={code}
                    onClick={() => setCurrency(code)}
                    className={[
                      'rounded-lg border p-4 text-left transition-all',
                      active
                        ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_#c9a84c]'
                        : 'border-gold/20 bg-navy-900/50 hover:border-gold/40',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cream-300/50 uppercase tracking-wider">{code}</span>
                      {active && (
                        <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                    <p className={['font-serif text-2xl', active ? 'text-gold' : 'text-cream-200'].join(' ')}>
                      {p.display}
                    </p>
                    <p className="text-cream-300/40 text-xs mt-0.5">
                      {code === 'INR' ? 'UPI · Cards · Net Banking' : 'Cards · International'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mock payment notice */}
          <div className="border border-gold/10 rounded-lg p-4 mb-6 bg-navy-900/30 flex items-start gap-3">
            <svg className="w-5 h-5 text-gold/50 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <p className="text-cream-300/50 text-xs leading-relaxed">
              <span className="text-gold/70 font-medium">Demo mode</span> — payment gateway integration (Razorpay / Stripe) coming soon.
              Clicking below grants access immediately without charging.
            </p>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-cream-300 font-medium">कुल · Total</span>
            <span className="text-gold font-serif text-3xl">{price.display}</span>
          </div>

          <button
            onClick={completePurchase}
            disabled={loading}
            className="w-full py-4 bg-gold text-navy-900 font-bold text-lg uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm disabled:opacity-50"
          >
            {loading ? 'Processing…' : `Complete Purchase · ${price.display}`}
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
