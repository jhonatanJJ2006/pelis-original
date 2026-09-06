/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';
import withSerwistInit from '@serwist/next';
import { imageRemotePatterns } from './image-remote-patterns.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withSerwist = withSerwistInit({
  swSrc: 'sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  exclude: [/\/uploads\//],
});

const nextConfig = {
  transpilePackages: ['@pelis/ui', '@pelis/db', '@pelis/auth', '@pelis/validators', 'better-auth'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: path.resolve(__dirname, '../../node_modules/zod'),
    };
    return config;
  },
  images: {
    remotePatterns: imageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: '/peliculas/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSerwist(nextConfig);
