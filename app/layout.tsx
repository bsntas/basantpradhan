import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'बसन्त प्रधान — Basant Pradhan',
  description: 'बसन्त प्रधानको आधिकारिक लेखक साइट। कोल्टे गोलाई पढ्नुहोस् — Official author site of Basant Pradhan. Read Koltey Golai.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ne" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content on theme load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('bp_theme')||'dark';var l=(t==='light')||(t==='system'&&!window.matchMedia('(prefers-color-scheme: dark)').matches);if(l)document.documentElement.classList.add('light');})();`,
          }}
        />
        {/* Noto Serif Devanagari for Nepali text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-navy-900 text-cream-200 antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
