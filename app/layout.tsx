import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'बसन्त प्रधान — Basant Pradhan',
  description: 'बसन्त प्रधानको आधिकारिक लेखक साइट। कोल्टे गोलाई पढ्नुहोस् — Official author site of Basant Pradhan. Read Koltey Golai.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ne">
      <head>
        {/* Noto Serif Devanagari for Nepali text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-navy-900 text-cream-200 antialiased">{children}</body>
    </html>
  );
}
