/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Removed proxy configuration to allow Next.js API routes to work
  // The ServerMonitor component is now independent and uses direct RedM server calls
};

module.exports = nextConfig;