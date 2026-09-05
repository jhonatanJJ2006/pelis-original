#!/usr/bin/env node
/**
 * Generate Maison Noir web + Android icons from SVG masters.
 * Run from repo root: node scripts/icons/generate-maison-noir-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const webIcons = join(root, 'apps/web/public/icons');
const androidRes = join(root, 'apps/android/app/src/main/res');

const iconSvg = readFileSync(join(webIcons, 'icon-512.svg'));
const maskableSvg = readFileSync(join(root, 'scripts/icons/maskable-512.svg'));
const notificationSvg = readFileSync(join(root, 'scripts/icons/notification.svg'));

async function pngFromSvg(svgBuffer, size, outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log('wrote', outPath.replace(root + '/', ''), `(${size}x${size})`);
}

async function main() {
  // Web any-purpose
  await pngFromSvg(iconSvg, 192, join(webIcons, 'icon-192.png'));
  await pngFromSvg(iconSvg, 512, join(webIcons, 'icon-512.png'));
  await pngFromSvg(iconSvg, 180, join(webIcons, 'apple-touch-icon.png'));

  // Web maskable
  await pngFromSvg(maskableSvg, 192, join(webIcons, 'maskable-192.png'));
  await pngFromSvg(maskableSvg, 512, join(webIcons, 'maskable-512.png'));

  // Favicon multi-size ICO via ImageMagick
  const fav16 = join(root, 'scripts/icons/_fav-16.png');
  const fav32 = join(root, 'scripts/icons/_fav-32.png');
  const fav48 = join(root, 'scripts/icons/_fav-48.png');
  await pngFromSvg(iconSvg, 16, fav16);
  await pngFromSvg(iconSvg, 32, fav32);
  await pngFromSvg(iconSvg, 48, fav48);
  const favico = join(root, 'apps/web/public/favicon.ico');
  execFileSync('magick', [fav16, fav32, fav48, favico]);
  console.log('wrote apps/web/public/favicon.ico (16/32/48)');

  // Android store icon
  await pngFromSvg(iconSvg, 512, join(root, 'apps/android/store_icon.png'));

  // Launcher densities
  const launchers = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };
  for (const [dir, size] of Object.entries(launchers)) {
    await pngFromSvg(iconSvg, size, join(androidRes, dir, 'ic_launcher.png'));
  }

  // Maskable densities (existing bubblewrap sizes)
  const maskables = {
    'mipmap-mdpi': 82,
    'mipmap-hdpi': 123,
    'mipmap-xhdpi': 164,
    'mipmap-xxhdpi': 246,
    'mipmap-xxxhdpi': 328,
  };
  for (const [dir, size] of Object.entries(maskables)) {
    await pngFromSvg(maskableSvg, size, join(androidRes, dir, 'ic_maskable.png'));
  }

  // Notification (white monochrome)
  const notifs = {
    'drawable-mdpi': 24,
    'drawable-hdpi': 36,
    'drawable-xhdpi': 48,
    'drawable-xxhdpi': 72,
    'drawable-xxxhdpi': 96,
  };
  for (const [dir, size] of Object.entries(notifs)) {
    await pngFromSvg(notificationSvg, size, join(androidRes, dir, 'ic_notification_icon.png'));
  }

  // Splash: cinema-bg + centered mark (full icon art on dark)
  const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" fill="none">
  <defs>
    <linearGradient id="playGold" x1="492" y1="488" x2="708" y2="712" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E0C98A"/>
      <stop offset="0.45" stop-color="#F5C842"/>
      <stop offset="1" stop-color="#C4A35A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="#0B0B0D"/>
  <g transform="translate(344,344) scale(1)">
    <rect x="0" y="0" width="512" height="512" rx="96" fill="#0B0B0D"/>
    <rect x="84" y="84" width="344" height="344" rx="64" fill="#141418" stroke="#C4A35A" stroke-width="2.5"/>
    <rect x="128" y="160" width="256" height="192" rx="22" fill="#1C1C22"/>
    <rect x="152" y="182" width="208" height="5" rx="2.5" fill="#C4A35A" opacity="0.85"/>
    <rect x="152" y="325" width="208" height="5" rx="2.5" fill="#C4A35A" opacity="0.85"/>
    <path d="M214 214C214 209.6 218.2 207.1 222 209.1L298 249.1C301.5 250.9 301.5 261.1 298 262.9L222 302.9C218.2 304.9 214 302.4 214 298V214Z" fill="url(#playGold)"/>
  </g>
</svg>`;
  const splashBuf = Buffer.from(splashSvg);
  const splashes = {
    'drawable-mdpi': 300,
    'drawable-hdpi': 450,
    'drawable-xhdpi': 600,
    'drawable-xxhdpi': 900,
    'drawable-xxxhdpi': 1200,
  };
  for (const [dir, size] of Object.entries(splashes)) {
    await pngFromSvg(splashBuf, size, join(androidRes, dir, 'splash.png'));
  }

  console.log('\nAll Maison Noir icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
