/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Disable static optimization to avoid prerender issues
  trailingSlash: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_URL: process.env.API_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Disable static export to prevent prerender issues
  experimental: {
    // Ensure SSR is used instead of static generation
    esmExternals: true,
  },

  // Additional configuration for better compatibility
  // Trust proxy headers for Cloudflare Tunnel
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Forwarded-Host',
            value: 'fazenda.stoffeltech.com',
          },
          {
            key: 'X-Forwarded-Proto',
            value: 'https',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;