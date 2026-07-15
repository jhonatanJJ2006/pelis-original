import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEED_PATH = resolve(import.meta.dirname, '..', 'packages', 'convex', 'src', 'seed.ts');
const NEW_PATH = resolve(import.meta.dirname, '..', 'movies-extra-processed.json');

let seedContent = readFileSync(SEED_PATH, 'utf-8');
const newMovies = JSON.parse(readFileSync(NEW_PATH, 'utf-8'));

// Extract all existing tokens from seed.ts (both JSON format and TS format)
const existingTokens = new Set();
const jsonRegex = /"token":\s*"([^"]+)"/g;
const tsRegex = /token:\s*'([^']+)'/g;
let match;
while ((match = jsonRegex.exec(seedContent)) !== null) existingTokens.add(match[1]);
while ((match = tsRegex.exec(seedContent)) !== null) existingTokens.add(match[1]);

console.log(`Existing tokens in seed.ts: ${existingTokens.size}`);

const toAdd = newMovies.filter(m => {
  if (existingTokens.has(m.token)) {
    console.log(`  SKIP ${m.name} (${m.token}) - exists`);
    return false;
  }
  return true;
});

console.log(`Adding ${toAdd.length} / ${newMovies.length} movies`);

const entries = toAdd.map(m => {
  const p = (s) => s.replace(/'/g, "\\'").replace(/\n/g, ' ');
  return `  { name: '${p(m.name)}', image: '${m.image}', synopsis: '${p(m.synopsis)}', genre: '${m.genre}', token: '${m.token}', actors: '${p(m.actors)}', classification: '${m.classification}', releaseYear: '${m.releaseYear}', mediaType: 'movie' },`;
}).join('\n');

// Insert before the closing of MOVIES array
const insertPoint = seedContent.lastIndexOf('];\n\nconst PLANS');
const before = seedContent.slice(0, insertPoint);
const after = seedContent.slice(insertPoint);
const newContent = before + ',\n' + entries + '\n' + after;
writeFileSync(SEED_PATH, newContent);

console.log(`✓ seed.ts updated: ${toAdd.length} more movies added`);
