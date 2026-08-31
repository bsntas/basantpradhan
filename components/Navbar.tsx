'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SettingsMenu from './SettingsMenu';

interface NavbarProps {
  user: { name: string; email: string; purchases: string[] } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-sm border-b border-gold/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-gold font-serif text-xl tracking-wide">Basant Pradhan</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-cream-300 hover:text-gold transition-colors text-sm tracking-wider uppercase">Home</Link>
            {user && user.purchases.includes('koltey-golai') && (
              <Link href="/reader" className="text-cream-300 hover:text-gold transition-colors text-sm tracking-wider uppercase">Read Book</Link>
            )}
            {user ? (
              <>
                <span className="text-gold/60 text-sm">|</span>
                <span className="text-cream-200 text-sm">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm px-4 py-1.5 border border-gold/40 text-gold hover:bg-gold hover:text-navy-900 transition-all rounded-sm tracking-wider uppercase"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-cream-300 hover:text-gold transition-colors text-sm tracking-wider uppercase">Login</Link>
                <Link href="/register" className="px-4 py-1.5 bg-gold text-navy-900 font-medium hover:bg-gold-light transition-colors rounded-sm text-sm tracking-wider uppercase">
                  Register
                </Link>
              </>
            )}
            <SettingsMenu />
          </div>

          {/* Mobile: settings + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <SettingsMenu />
            <button className="text-gold" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 border-t border-gold/20 pt-4">
            <Link href="/" className="text-cream-300 hover:text-gold transition-colors text-sm tracking-wider uppercase" onClick={() => setMenuOpen(false)}>Home</Link>
            {user ? (
              <>
                <span className="text-cream-200 text-sm">{user.name}</span>
                {user.purchases.includes('koltey-golai') && (
                  <Link href="/reader" className="text-cream-300 hover:text-gold transition-colors text-sm" onClick={() => setMenuOpen(false)}>Read Book</Link>
                )}
                <button onClick={logout} className="text-left text-sm text-gold hover:text-gold-light uppercase tracking-wider">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-cream-300 hover:text-gold text-sm uppercase tracking-wider" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/register" className="text-sm text-gold uppercase tracking-wider" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
