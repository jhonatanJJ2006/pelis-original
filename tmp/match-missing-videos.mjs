#!/usr/bin/env node
/**
 * Cruza las películas sin video (CSV) contra los mensajes descargados
 * de Telegram (messages.jsonl) para encontrar videos candidatos.
 *
 * Solo LEE. Escribe tmp/match-sin-video.json con los resultados.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = process.argv[2] ?? join(ROOT, 'tmp/movies-sin-video-20260823-180931.csv');
const JSONL_PATH = join(ROOT, 'tools/telegram-dumper/data/messages.jsonl');
const MEDIA_DIR = join(ROOT, 'tools/telegram-dumper/data/media');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const VIDEO_EXT = /\.(mp4|mkv|avi|webm|mov)$/i;

function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Títulos alternativos conocidos: nombre en la BD → posibles nombres en el canal
const ALIASES = {
  'john wick chapter 4': ['john wick 4', 'john wick capitulo 4', 'john wick: chapter 4'],
  'blade runner 2049': ['blade runner', 'ultima frontera'],
  coco: ['coco'],
  'the punisher': ['punisher'],
  'la guerra de los mundos': ['war of the worlds', 'guerra de los mundos'],
  'guerra mundial z': ['world war z', 'wwz'],
  'volver al futuro': ['back to the future', 'regreso al futuro'],
  'parque jurasico': ['jurassic park', 'parque jurasico'],
  'la isla siniestra': ['shutter island'],
  'el sexto sentido': ['sixth sense'],
  'la cosa del otro mundo': ['the thing', 'la cosa'],
};

// --- Cargar CSV ---
const csvRaw = readFileSync(CSV_PATH, 'utf8').split('\n').filter(Boolean);
const header = parseCsvLine(csvRaw[0]);
const movies = csvRaw.slice(1).map((line) => {
  const cols = parseCsvLine(line);
  const row = {};
  header.forEach((h, i) => (row[h.trim()] = cols[i]));
  return row;
});

// --- Cargar mensajes ---
const messages = readFileSync(JSONL_PATH, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

console.log(`Películas en CSV: ${movies.length}`);
console.log(`Mensajes cargados: ${messages.length}`);

// Índice de mensajes de video que tienen archivo descargado
const videoMsgs = [];
for (const m of messages) {
  const p = m.media_path;
  if (!p || !VIDEO_EXT.test(p)) continue;
  const abs = join(ROOT, 'tools/telegram-dumper', p.replace(/^\/?/, ''));
  // media_path es relativo tipo "data/media/..." o absoluto dentro del dumper
  const candidates = [join(ROOT, p), join(MEDIA_DIR, m.media_path.split('/').pop())];
  const found = candidates.find((c) => existsSync(c));
  if (!found) continue;
  videoMsgs.push({
    msgId: m.id,
    channelId: m.channel_id,
    date: m.date,
    text: m.text ?? '',
    normText: normalize(m.text),
    filePath: found,
    size: statSync(found).size,
    fileName: found.split('/').pop(),
  });
}
console.log(`Mensajes de video con archivo en disco: ${videoMsgs.length}\n`);

// --- Matching ---
const results = [];
for (const movie of movies) {
  const titleNorm = normalize(movie.name);
  const year = movie.releaseYear;
  const needles = [titleNorm, ...(ALIASES[titleNorm] ?? [])];

  const hits = [];
  for (const vm of videoMsgs) {
    for (const needle of needles) {
      if (vm.normText.includes(needle)) {
        hits.push(vm);
        break;
      }
    }
  }

  results.push({
    id: movie.id,
    token: movie.token,
    name: movie.name,
    year,
    hits: hits.map((h) => ({
      channelId: h.channelId,
      msgId: h.msgId,
      date: h.date,
      sizeMB: Math.round(h.size / 1024 / 1024),
      textSnippet: h.text.slice(0, 100).replace(/\n/g, ' | '),
      filePath: h.filePath,
      fileName: h.fileName,
    })),
  });
}

// --- Resumen ---
let matched = 0;
for (const r of results) {
  if (r.hits.length > 0) {
    matched++;
    console.log(`✓ ${r.name} (${r.year}) → ${r.hits.length} hit(s)`);
    for (const h of r.hits.slice(0, 3)) {
      console.log(`   [${h.sizeMB} MB] ${h.textSnippet}`);
    }
  }
}
console.log(`\nMatcheadas: ${matched}/${movies.length}`);

writeFileSync(
  join(ROOT, 'tmp/match-sin-video.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
);
console.log('Detalle: tmp/match-sin-video.json');
