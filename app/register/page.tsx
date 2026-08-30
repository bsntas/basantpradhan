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
          <h1 className="font-serif text-3xl text-cream-100 mb-2">Create Account</h1>
          <p className="text-cream-300/60 text-sm">Join to read <em>Koltey Golai</em></p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="Your Name" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="your@email.com" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters" className="input-field" />
          </div>
          <div>
            <label className="text-cream-300 text-xs uppercase tracking-wider block mb-2">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              placeholder="••••••••" className="input-field" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-gold text-navy-900 font-bold uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm disabled:opacity-50 mt-2">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-cream-300/60 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-gold hover:text-gold-light transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
