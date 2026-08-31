import { getServerUser } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import { isVipEmail, PRICES, BOOK_ID } from '@/lib/config';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BookCover = dynamic(() => import('@/components/BookCover'), { ssr: false });

export default async function HomePage() {
  const session = await getServerUser();
  let user = null;
  if (session) {
    const dbUser = await findUserById(session.userId);
    if (dbUser) user = { name: dbUser.name, email: dbUser.email, purchases: dbUser.purchases };
  }
  const hasPurchased = isVipEmail(user?.email) || (user?.purchases.includes(BOOK_ID) ?? false);

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
            <p className="text-gold/70 text-sm uppercase tracking-[0.3em] mb-4 font-sans">प्रथम उपन्यास · Debut Novel</p>
            <h1 className="font-serif text-6xl lg:text-7xl xl:text-8xl leading-none mb-3">
              <span className="shimmer-text">कोल्टे</span>
              <br />
              <span className="text-cream-100">गोलाई</span>
            </h1>
            <p className="text-cream-300/50 font-sans text-base tracking-widest mb-3">Koltey Golai</p>
            <p className="text-gold font-serif text-xl italic mb-8">— Basant Pradhan</p>
            <p className="text-cream-300 text-lg leading-relaxed mb-10 max-w-lg">
              दार्जिलिङका धुँधले पहाडहरूमा आधारित एक संवेदनशील कथा, जहाँ साधारण मानिसहरूको जीवन असाधारण तरिकाले गाँसिएको छ।
              प्रेम, क्षति र परम्परा तथा परिवर्तनबीच झुलिरहेको समुदायको अटल आत्मालाई बसन्त प्रधानले जीवन्त गद्यमा उकेरेका छन्।
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
                    Buy Full Book — {PRICES.INR.display} / {PRICES.GBP.display}
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

          {/* Right: Real PDF cover with 3-D book effect */}
          <div className="flex justify-center lg:justify-end" style={{ perspective: '1200px' }}>
            <BookCover />
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-8 border-t border-gold/10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4">लेखकको बारेमा · About the Author</p>
            <h2 className="font-serif text-4xl text-cream-100 mb-6">बसन्त प्रधान</h2>
            <div className="space-y-4 text-cream-300 leading-relaxed">
              <p>
                बसन्त प्रधान दार्जिलिङका पहाडहरूमा जरा गाडेका एक लेखक हुन् जसको आवाजले दुई संस्कृति, इतिहास र तरसाइहरूका बीच उभिएको धरातलको भावना समाउँछ।
                उनको लेखन पहाडी समुदायको जीवन अनुभवबाट गहिरो रूपमा उनिएको छ।
              </p>
              <p>
                <em>कोल्टे गोलाई</em> उनको प्रथम उपन्यास हो — वर्षौँको मेहनतले तयार भएको एक कृति, जुन उनलाई आकार दिने ठाउँहरू र मानिसहरूलाई प्रेमपत्र हो।
              </p>
              <p className="text-cream-300/50 text-sm italic">
                Basant Pradhan is a writer rooted in the hills of Darjeeling whose debut novel <em>Koltey Golai</em> is a love letter to the hill communities — their joys, struggles, and quiet resilience.
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
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4">पुस्तकको बारेमा · The Book</p>
          <h2 className="font-serif text-4xl text-cream-100 mb-12">कोल्टे गोलाई</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left mb-12">
            {[
              { label: 'Genre', value: 'Literary Fiction' },
              { label: 'Language', value: 'Nepali (नेपाली)' },
              { label: 'Format', value: 'Digital (Read Online)' },
              { label: 'Price', value: `${PRICES.INR.display} / ${PRICES.GBP.display}` },
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
                  Buy Now — {PRICES.INR.display} / {PRICES.GBP.display}
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
