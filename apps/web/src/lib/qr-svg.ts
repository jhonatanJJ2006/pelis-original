/**
 * QR Code SVG (byte mode, ECC L, versions 2–6). Suficiente para
 * https://verpelis.pro/link-tv?code=XXXXXX sin dependencia extra.
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

function rsGenerator(ecLen: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j]!, EXP[i]!);
      next[j + 1] ^= poly[j]!;
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = data.concat(new Array<number>(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = res[i]!;
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j]!, coef);
    }
  }
  return res.slice(data.length);
}

/** Capacidad de datos (bytes) y ECC por versión, ECC L. */
const VERSIONS: Array<{ version: number; data: number; ec: number; blocks: number }> = [
  { version: 2, data: 34, ec: 10, blocks: 1 },
  { version: 3, data: 55, ec: 15, blocks: 1 },
  { version: 4, data: 80, ec: 20, blocks: 1 },
  { version: 5, data: 108, ec: 26, blocks: 1 },
  { version: 6, data: 136, ec: 18, blocks: 2 },
];

function sizeForVersion(version: number): number {
  return 21 + (version - 1) * 4;
}

function encodeData(text: string, dataCapacity: number): number[] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, dataCapacity * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i + j] ?? 0);
    data.push(v);
  }
  const pads = [0xec, 0x11];
  let p = 0;
  while (data.length < dataCapacity) data.push(pads[p++ % 2]!);
  return data;
}

function isReserved(x: number, y: number, n: number): boolean {
  if (x < 9 && y < 9) return true;
  if (x >= n - 8 && y < 9) return true;
  if (x < 9 && y >= n - 8) return true;
  if (y === 6 || x === 6) return true;
  return false;
}

function placeFinder(modules: boolean[][], ox: number, oy: number) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      modules[oy + y]![ox + x] = edge || inner;
    }
  }
}

function placeTiming(modules: boolean[][], n: number) {
  for (let i = 8; i < n - 8; i++) {
    modules[6]![i] = i % 2 === 0;
    modules[i]![6] = i % 2 === 0;
  }
}

function applyMask(x: number, y: number): boolean {
  return (x + y) % 2 === 0;
}

export function qrMatrix(text: string): boolean[][] {
  const payload = new TextEncoder().encode(text);
  const spec = VERSIONS.find((v) => payload.length + 2 <= v.data) ?? VERSIONS[VERSIONS.length - 1]!;
  const n = sizeForVersion(spec.version);
  const data = encodeData(text, spec.data);
  const ecWordsPerBlock = spec.version === 6 ? 18 : spec.ec;
  const blockSize = Math.floor(spec.data / spec.blocks);
  const blocks: number[][] = [];
  let offset = 0;
  for (let b = 0; b < spec.blocks; b++) {
    const chunk = data.slice(offset, offset + blockSize);
    offset += blockSize;
    blocks.push(chunk.concat(rsEncode(chunk, ecWordsPerBlock)));
  }

  const stream: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const block of blocks) {
      if (i < block.length) stream.push(block[i]!);
    }
  }

  const modules: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  placeFinder(modules, 0, 0);
  placeFinder(modules, n - 7, 0);
  placeFinder(modules, 0, n - 7);
  placeTiming(modules, n);
  modules[n - 8]![8] = true;

  const bits: number[] = [];
  for (const word of stream) {
    for (let i = 7; i >= 0; i--) bits.push((word >> i) & 1);
  }

  let bit = 0;
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const y = upward ? n - 1 - i : i;
      for (let dx = 0; dx < 2; dx++) {
        const x = col - dx;
        if (isReserved(x, y, n)) continue;
        const dark = bits[bit] === 1;
        bit += 1;
        modules[y]![x] = applyMask(x, y) ? !dark : dark;
      }
    }
    upward = !upward;
  }

  return modules;
}

export function qrSvg(text: string, size = 240): string {
  const modules = qrMatrix(text);
  const n = modules.length;
  const quiet = 2;
  const dim = n + quiet * 2;
  let rects = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules[y]![x]) {
        rects += `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-hidden="true"><rect width="${dim}" height="${dim}" fill="#F4F1EA"/>${rects.replace(/<rect/g, '<rect fill="#0B0B0D"')}</svg>`;
}

export function qrSvgDataUrl(text: string, size = 240): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(text, size))}`;
}
