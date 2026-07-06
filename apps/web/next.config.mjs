/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pelis/ui', '@pelis/convex', '@pelis/auth', '@pelis/validators'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.convex.cloud',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
