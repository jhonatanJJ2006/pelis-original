import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'apps/web/public/icons');
const svgPath = path.join(iconsDir, 'icon-512.svg');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512, padding: 0.1 },
];

const svg = fs.readFileSync(svgPath);

for (const { name, size, padding = 0 } of sizes) {
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;
  let pipeline = sharp(svg).resize(inner, inner, { fit: 'contain', background: '#0a0e1a' });

  if (padding > 0) {
    pipeline = sharp(await pipeline.png().toBuffer()).extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: '#0a0e1a',
    });
  }

  const out = path.join(iconsDir, name);
  await pipeline.png().toFile(out);
  console.log(`Generated ${out}`);
}
