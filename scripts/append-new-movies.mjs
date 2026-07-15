import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEED_PATH = resolve(import.meta.dirname, '..', 'packages', 'convex', 'src', 'seed.ts');
const NEW_PATH = resolve(import.meta.dirname, '..', 'movies-processed.json');

// Read current seed.ts and new movies
let seedContent = readFileSync(SEED_PATH, 'utf-8');
const newMovies = JSON.parse(readFileSync(NEW_PATH, 'utf-8'));

// Read existing tokens from current seed.ts
const existingTokens = new Set();
const tokenRegex = /token:\s*'([^']+)'/g;
let match;
while ((match = tokenRegex.exec(seedContent)) !== null) {
  existingTokens.add(match[1]);
}

// Filter out duplicates and also remove Cómo entrenar a tu dragón (already as ultimo-dragon)
const TOKENS_TO_SKIP = new Set(['como-entrenar-a-tu-dragon']);

const toAdd = newMovies.filter(m => {
  if (TOKENS_TO_SKIP.has(m.token)) {
    console.log(`Skipping ${m.name} (${m.token}) - already exists`);
    return false;
  }
  if (existingTokens.has(m.token)) {
    console.log(`Skipping ${m.name} (${m.token}) - duplicate token`);
    return false;
  }
  return true;
});

console.log(`\nAdding ${toAdd.length} new movies (skipped ${newMovies.length - toAdd.length})`);

// Build the MOVIES array entries with proper format (unquoted keys like original)
const entries = toAdd.map(m => {
  const props = [
    `name: '${m.name.replace(/'/g, "\\'")}'`,
    `image: '/peliculas/${m.token}.webp'`,
    `synopsis: '${(m.synopsis || '').replace(/'/g, "\\'").replace(/\n/g, ' ')}'`,
    `genre: '${m.genre}'`,
    `token: '${m.token}'`,
    `actors: '${(m.actors || '').replace(/'/g, "\\'")}'`,
    `classification: '${m.classification}'`,
    `releaseYear: '${m.releaseYear}'`,
    `mediaType: 'movie'`,
  ];
  return `  { ${props.join(', ')} },`;
}).join('\n');

// Insert before the closing bracket of MOVIES array
const insertPoint = seedContent.lastIndexOf('];\n\nconst PLANS');
if (insertPoint === -1) {
  console.error('Could not find insertion point');
  process.exit(1);
}

const before = seedContent.slice(0, insertPoint);
const after = seedContent.slice(insertPoint);
const newContent = before + ',\n' + entries + '\n' + after;
writeFileSync(SEED_PATH, newContent);

console.log(`✓ seed.ts updated with ${toAdd.length} new movies`);
console.log(`Total movies: ${toAdd.length + (existingTokens.size - TOKENS_TO_SKIP.size + 1 /* one is skip */)}`);
