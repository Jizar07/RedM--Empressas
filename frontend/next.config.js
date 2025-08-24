/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3050/api/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3050/health',
      },
    ];
  },
};

module.exports = nextConfig;