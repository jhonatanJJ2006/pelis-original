/**
 * Hosts that already appear as image URLs in the app, seed data, or enrichment.
 * Keep this list derived from real usage — do not invent CDNs.
 */
export const imageRemotePatterns = [
  { protocol: 'https', hostname: 'image.tmdb.org' },
  { protocol: 'https', hostname: 'cdn.myanimelist.net' },
  { protocol: 'https', hostname: 's4.anilist.co' },
  { protocol: 'https', hostname: 'images.pluto.tv' },
  { protocol: 'https', hostname: 'upload.wikimedia.org' },
  { protocol: 'https', hostname: 'i.imgur.com' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
];
