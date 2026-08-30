/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
  headers: async () => [
    {
      source: '/api/book',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
  ],
};

module.exports = nextConfig;
