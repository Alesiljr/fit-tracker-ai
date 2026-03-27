/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fittracker/shared'],
  headers: async () => [
    {
      // Static assets — cache for 1 year (immutable)
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // API routes — no cache
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
      ],
    },
    {
      // Auth pages — short cache, revalidate
      source: '/(login|register)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=600' },
      ],
    },
    {
      // App pages — no cache for authenticated content
      source: '/(dashboard|log|chat|progress|profile|goals|reports|privacy)(.*)',
      headers: [
        { key: 'Cache-Control', value: 'private, no-cache, must-revalidate' },
      ],
    },
  ],
};

module.exports = nextConfig;
