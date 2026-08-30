import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Basant Pradhan — Author',
  description: 'Official author site of Basant Pradhan. Read Koltey Golai, his debut novel.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy-900 text-cream-200 antialiased">{children}</body>
    </html>
  );
}
