import { installSerwist } from '@serwist/sw';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: unknown;
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

installSerwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:js|css|woff2?)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkOnly',
      options: { cacheName: 'api' },
    },
    {
      urlPattern: /\/peliculas\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'posters',
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/uploads\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'uploads',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});
