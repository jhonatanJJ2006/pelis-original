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
  exclude: [
    /\/uploads\//,
    /\/version\.json$/,
    /app-version\.json$/,
    /tv-app-version\.json$/,
    /assetlinks\.json$/,
  ],
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
  async redirects() {
    // La landing de descargas vive en /descargas; /descargar queda como alias permanente.
    return [{ source: '/descargar', destination: '/descargas', permanent: true }];
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
      {
        source: '/version.json',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        // Digital Asset Links: Chrome TWA exige JSON sin redirect y Content-Type correcto.
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
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
