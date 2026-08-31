'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Registration failed'); return; }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 40%, #c9a84c10 0%, transparent 60%)' }} />

      <Link href="/" className="text-gold font-serif text-2xl mb-10 hover:text-gold-light transition-colors">
        Basant Pradhan
      </Link>

      <div className="relative w-full max-w-md bg-navy-800 border border-gold/20 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-cream-100 mb-1">खाता बनाउनुहोस्</h1>
          <p className="text-cream-300/50 text-xs mb-1">Create Account</p>
          <p className="text-cream-300/60 text-sm"><em>कोल्टे गोलाई</em> पढ्न सामेल हुनुहोस्</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Google SSO button */}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full py-3 border border-gold/20 bg-navy-700 hover:bg-navy-600 text-cream-200 rounded transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google मार्फत दर्ता गर्नुहोस्
          <span className="text-cream-300/50 text-xs">(Sign up with Google)</span>
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gold/10" />
          <span className="text-cream-300/30 text-xs">वा / or</span>
          <div className="flex-1 h-px bg-gold/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">पूरा नाम / Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your Name" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="your@email.com" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">पासवर्ड / Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">पासवर्ड पुष्टि / Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              placeholder="••••••••" className="input-field" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-gold text-navy-900 font-bold uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm disabled:opacity-50 mt-2">
            {loading ? 'खाता बनाउँदैछ…' : 'खाता बनाउनुहोस्'}
          </button>
        </form>

        <p className="text-center text-cream-300/60 text-sm mt-6">
          पहिले नै खाता छ?{' '}
          <Link href="/login" className="text-gold hover:text-gold-light transition-colors">साइन इन गर्नुहोस्</Link>
          <span className="text-cream-300/30"> (Sign In)</span>
        </p>

        <div className="mt-5 pt-5 border-t border-gold/10 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-cream-300/40 hover:text-cream-300/70 text-xs transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
