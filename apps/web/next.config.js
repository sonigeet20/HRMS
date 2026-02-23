/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hrms/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
