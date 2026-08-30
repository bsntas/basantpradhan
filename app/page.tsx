import { getServerUser } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerUser();
  let user = null;
  if (session) {
    const dbUser = findUserById(session.userId);
    if (dbUser) user = { name: dbUser.name, email: dbUser.email, purchases: dbUser.purchases };
  }
  const hasPurchased = user?.purchases.includes('koltey-golai') ?? false;

  return (
    <div className="min-h-screen bg-navy-900 overflow-x-hidden">
      <Navbar user={user} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #c9a84c22 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div className="animate-fade-in">
            <p className="text-gold/70 text-sm uppercase tracking-[0.3em] mb-4 font-sans">Debut Novel</p>
            <h1 className="font-serif text-6xl lg:text-7xl xl:text-8xl leading-none mb-6">
              <span className="shimmer-text">Koltey</span>
              <br />
              <span className="text-cream-100">Golai</span>
            </h1>
            <p className="text-gold font-serif text-xl italic mb-8">by Basant Pradhan</p>
            <p className="text-cream-300 text-lg leading-relaxed mb-10 max-w-lg">
              A poignant tale set in the misty hills of Darjeeling, where the lives of ordinary
              people intersect in extraordinary ways. Through vivid prose and deeply drawn
              characters, Basant Pradhan weaves a story of love, loss, and the enduring spirit
              of a community caught between tradition and change.
            </p>

            <div className="flex flex-wrap gap-4">
              {hasPurchased ? (
                <Link href="/reader"
                  className="px-8 py-4 bg-gold text-navy-900 font-bold text-sm uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm shadow-lg shadow-gold/20">
                  Read Now
                </Link>
              ) : (
                <>
                  <Link href="/purchase"
                    className="px-8 py-4 bg-gold text-navy-900 font-bold text-sm uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm shadow-lg shadow-gold/20">
                    Buy Full Book — £9.99
                  </Link>
                  {user ? (
                    <Link href="/reader"
                      className="px-8 py-4 border border-gold/50 text-gold font-medium text-sm uppercase tracking-wider hover:bg-gold/10 transition-all rounded-sm">
                      Free Preview
                    </Link>
                  ) : (
                    <Link href="/register"
                      className="px-8 py-4 border border-gold/50 text-gold font-medium text-sm uppercase tracking-wider hover:bg-gold/10 transition-all rounded-sm">
                      Register to Preview
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: 3-D book mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="animate-float" style={{ transformStyle: 'preserve-3d' }}>
              {/* Book group */}
              <div className="relative" style={{ width: 280, height: 390 }}>
                {/* Spine */}
                <div className="absolute top-0 bottom-0 rounded-l-sm"
                  style={{
                    width: 40,
                    left: -38,
                    background: 'linear-gradient(90deg, #04070f 0%, #111827 100%)',
                    transform: 'rotateY(-90deg)',
                    transformOrigin: 'right',
                    boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
                  }}>
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gold/60 text-xs tracking-widest font-serif"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                      KOLTEY GOLAI
                    </p>
                  </div>
                </div>

                {/* Cover */}
                <div className="absolute inset-0 rounded-r-sm overflow-hidden"
                  style={{
                    background: 'linear-gradient(155deg, #111827 0%, #0f3460 50%, #0a0e1a 100%)',
                    boxShadow: '8px 8px 40px rgba(0,0,0,0.7), inset 0 0 80px rgba(201,168,76,0.05)',
                    border: '1px solid rgba(201,168,76,0.15)',
                  }}>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-8">
                    {/* Top ornament */}
                    <div className="w-full flex items-center gap-2 opacity-60">
                      <div className="flex-1 h-px bg-gold/40" />
                      <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                      <div className="flex-1 h-px bg-gold/40" />
                    </div>

                    {/* Center content */}
                    <div className="text-center">
                      {/* Silhouette hills */}
                      <div className="relative h-24 mb-6 opacity-40">
                        <svg viewBox="0 0 280 96" className="w-full" fill="none">
                          <path d="M0 96 Q40 20 80 50 Q120 80 160 30 Q200 0 240 40 Q260 55 280 30 L280 96 Z" fill="#c9a84c" opacity="0.3"/>
                          <path d="M0 96 Q60 40 100 60 Q140 80 180 45 Q220 20 280 50 L280 96 Z" fill="#c9a84c" opacity="0.5"/>
                          <circle cx="200" cy="25" r="15" fill="#c9a84c" opacity="0.2"/>
                        </svg>
                      </div>
                      <h2 className="font-serif text-3xl text-cream-100 leading-tight mb-1">Koltey</h2>
                      <h2 className="font-serif text-3xl text-gold leading-tight">Golai</h2>
                    </div>

                    {/* Author */}
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2 opacity-60">
                        <div className="flex-1 h-px bg-gold/40" />
                        <div className="flex-1 h-px bg-gold/40" />
                      </div>
                      <p className="text-cream-300 text-xs tracking-[0.25em] uppercase font-sans">Basant Pradhan</p>
                    </div>
                  </div>
                </div>

                {/* Shadow */}
                <div className="absolute -bottom-4 left-4 right-0 h-8 rounded-full opacity-40"
                  style={{ background: 'rgba(0,0,0,0.5)', filter: 'blur(12px)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4">About the Author</p>
            <h2 className="font-serif text-4xl text-cream-100 mb-6">Basant Pradhan</h2>
            <div className="space-y-4 text-cream-300 leading-relaxed">
              <p>
                Basant Pradhan is a writer rooted in the hills of Darjeeling whose voice captures
                the spirit of a land straddling cultures, histories, and longings. His writing
                draws deeply from the lived experiences of the hill communities — their joys,
                struggles, and the quiet resilience that defines them.
              </p>
              <p>
                <em>Koltey Golai</em> is his debut novel, a work that has been years in the making —
                a love letter to the places and people that shaped him, told in prose that is
                at once intimate and universal.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-full border-2 border-gold/30 flex items-center justify-center bg-navy-800"
              style={{ boxShadow: '0 0 40px rgba(201,168,76,0.1)' }}>
              <svg className="w-24 h-24 text-gold/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOOK DETAILS ─────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-8 border-t border-gold/10 bg-navy-950/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4">The Book</p>
          <h2 className="font-serif text-4xl text-cream-100 mb-12">About Koltey Golai</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left mb-12">
            {[
              { label: 'Genre', value: 'Literary Fiction' },
              { label: 'Language', value: 'English' },
              { label: 'Format', value: 'Digital (Read Online)' },
              { label: 'Price', value: '£9.99' },
              { label: 'Access', value: 'Unlimited Reads' },
              { label: 'Features', value: 'Voice Narration' },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gold/10 rounded-lg p-4 bg-navy-800/50">
                <p className="text-gold/70 text-xs uppercase tracking-wider mb-1">{label}</p>
                <p className="text-cream-200 font-medium">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            {hasPurchased ? (
              <Link href="/reader"
                className="px-10 py-4 bg-gold text-navy-900 font-bold uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm">
                Open Book
              </Link>
            ) : (
              <>
                <Link href="/purchase"
                  className="px-10 py-4 bg-gold text-navy-900 font-bold uppercase tracking-wider hover:bg-gold-light transition-all rounded-sm">
                  Buy Now — £9.99
                </Link>
                {user ? (
                  <Link href="/reader"
                    className="px-10 py-4 border border-gold/40 text-gold uppercase tracking-wider hover:bg-gold/10 transition-all rounded-sm">
                    Read Preview
                  </Link>
                ) : (
                  <Link href="/login"
                    className="px-10 py-4 border border-gold/40 text-gold uppercase tracking-wider hover:bg-gold/10 transition-all rounded-sm">
                    Login to Preview
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-gold/10 text-center">
        <p className="font-serif text-gold text-2xl mb-2">Basant Pradhan</p>
        <p className="text-cream-300/50 text-sm">© {new Date().getFullYear()} Basant Pradhan. All rights reserved.</p>
        <p className="text-cream-300/30 text-xs mt-4">Unauthorised reproduction or distribution of this content is prohibited.</p>
      </footer>
    </div>
  );
}
