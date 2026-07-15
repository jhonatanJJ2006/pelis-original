import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_KEY = 'b1261ab7cbed1aaacf052f9ec50abbe4';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';
const POSTERS_DIR = resolve(import.meta.dirname, '..', 'apps', 'web', 'public', 'peliculas');

const FIXES = [
  { token: 'corazon-fuego', id: 18183 },      // Como agua para chocolate (1992)
  { token: 'ciudad-cristal', id: 350 },        // The Devil Wears Prada (2006)
  { token: 'vuelo-colibri', id: 46195 },       // Rio (2011)
  { token: 'rebano', id: 75174 },              // The Grey (2011)
];

async function fetchMovieDetails(id, lang) {
  const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=${lang}&append_to_response=credits`, {
    signal: AbortSignal.timeout(15000),
  });
  return r.json();
}

async function main() {
  const tmdbPath = resolve(import.meta.dirname, '..', 'tmdb-data.json');
  const data = JSON.parse(readFileSync(tmdbPath, 'utf-8'));

  for (const { token, id } of FIXES) {
    console.log(`\n${token}: fetching TMDB ID ${id}...`);

    const [es, en] = await Promise.all([
      fetchMovieDetails(id, 'es-MX'),
      fetchMovieDetails(id, 'en-US'),
    ]);

    const entry = {
      token,
      title: es.title || en.title,
      synopsis: es.overview || '',
      genre: (es.genres?.[0]?.name || en.genres?.[0]?.name || ''),
      year: (es.release_date || en.release_date || '').split('-')[0],
      actors: (es.credits?.cast?.slice(0, 4).map(a => a.name).join(', ') || ''),
    };

    console.log(`  → ${entry.title} (${entry.year})`);

    // Update in-memory
    const idx = data.findIndex(d => d.token === token);
    if (idx >= 0) data[idx] = entry;
    else data.push(entry);

    // Download poster
    const posterPath = es.poster_path || en.poster_path;
    if (posterPath) {
      const imgResp = await fetch(`${IMAGE_URL}${posterPath}`, { signal: AbortSignal.timeout(30000) });
      if (imgResp.ok) {
        writeFileSync(resolve(POSTERS_DIR, `${token}.webp`), Buffer.from(await imgResp.arrayBuffer()));
        console.log(`  ✓ poster saved`);
      }
    }
  }

  // Write updated tmdb-data.json
  writeFileSync(tmdbPath, JSON.stringify(data, null, 2));
  console.log(`\n✓ tmdb-data.json updated (${data.length} entries)`);
}

main().catch(console.error);
