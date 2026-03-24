/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fittracker/shared'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        { key: 'X-Build-Id', value: Date.now().toString() },
      ],
    },
  ],
};

module.exports = nextConfig;
