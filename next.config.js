/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
    // Ensure the private PDF is bundled with the /api/book serverless function
    outputFileTracingIncludes: {
      '/api/book':  ['./private/**/*'],
      '/api/cover': ['./private/**/*'],
    },
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
