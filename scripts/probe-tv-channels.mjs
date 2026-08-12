#!/usr/bin/env node
/**
 * Script CLI para probar todos los canales TV contra el backend Convex.
 *
 * Usage:
 *   node scripts/probe-tv-channels.mjs                    # prueba los primeros 100 activos
 *   node scripts/probe-tv-channels.mjs --batch=20          # tamaño de batch
 *   node node scripts/probe-tv-channels.mjs --dry-run      # solo reporta
 *   node scripts/probe-tv-channels.mjs --only-popular     # solo populares
 *
 * Variables de entorno:
 *   NEXT_PUBLIC_CONVEX_URL  (ej. https://uncommon-dolphin-106.convex.cloud)
 *   ADMIN_TOKEN            (token de admin para autenticar)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Cargar .env si existe
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const CONVEX_URL =
  process.env.CONVEX_PROD_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  'https://flexible-lobster-410.convex.cloud';
if (!CONVEX_URL) {
  console.error('ERROR: CONVEX_PROD_URL o NEXT_PUBLIC_CONVEX_URL no están definidas.');
  process.exit(1);
}

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}
const batchSize = parseInt(getArg('batch', '8'), 10);
const dryRun = args.includes('--dry-run');
const onlyPopular = args.includes('--only-popular');
const onlyActive = args.includes('--only-active') || true;

async function convexQuery(path, args = {}) {
  const r = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args }),
  });
  const json = await r.json();
  if (json.status === 'error') {
    throw new Error(json.errorMessage ?? JSON.stringify(json));
  }
  return json.value;
}

async function convexMutation(path, args = {}, token) {
  const r = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path, args }),
  });
  const json = await r.json();
  if (json.status === 'error') {
    throw new Error(json.errorMessage ?? JSON.stringify(json));
  }
  return json.value;
}

async function convexAction(path, args = {}, token) {
  const r = await fetch(`${CONVEX_URL}/api/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path, args }),
  });
  const json = await r.json();
  if (json.status === 'error') {
    throw new Error(json.errorMessage ?? JSON.stringify(json));
  }
  return json.value;
}

async function probeUpstream(streamUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(streamUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'PelisTV-Probe/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return { status: 'offline', error: `HTTP ${response.status}` };

    const ct = response.headers.get('content-type') ?? '';
    const finalUrl = response.url || streamUrl;
    const isManifest =
      ct.includes('mpegurl') || finalUrl.toLowerCase().includes('.m3u8');
    if (!isManifest) return { status: 'online' };

    const text = await response.text();
    if (!text.startsWith('#EXTM3U') && !text.includes('#EXT-X-')) {
      return { status: 'offline', error: 'No es M3U8 válido' };
    }
    if (!text.includes('#EXTINF') && !text.includes('#EXT-X-STREAM-INF')) {
      return { status: 'offline', error: 'Sin segmentos' };
    }
    return { status: 'online' };
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

async function main() {
  console.log('🎬 Pelis TV Probe CLI\n');
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Only popular: ${onlyPopular}`);
  console.log('');

  // 1. Listar canales (paginado)
  console.log('📋 Listando canales...');
  const allChannels = [];
  let offset = 0;
  while (true) {
    const page = await convexQuery('tv:list', {
      limit: 100,
      offset,
      popularOnly: onlyPopular || undefined,
    });
    if (!page.items?.length) break;
    allChannels.push(...page.items);
    if (!page.hasMore) break;
    offset += page.items.length;
  }
  console.log(`   ${allChannels.length} canales encontrados\n`);

  if (dryRun) {
    console.log('Primer 10 canales:');
    allChannels.slice(0, 10).forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.country ?? '??'}] ${c.name} (${c.streamStatus ?? 'unknown'})`);
    });
    return;
  }

  // 2. Probar cada uno
  let online = 0;
  let offline = 0;
  const sampleErrors = [];

  for (let i = 0; i < allChannels.length; i += batchSize) {
    const slice = allChannels.slice(i, i + batchSize);
    const results = await Promise.all(
      slice.map(async (ch) => ({
        ch,
        result: await probeUpstream(ch.streamUrl),
      }))
    );

    for (const { ch, result } of results) {
      if (result.status === 'online') online += 1;
      else {
        offline += 1;
        if (sampleErrors.length < 15) {
          sampleErrors.push({ name: ch.name, url: ch.streamUrl, error: result.error });
        }
      }
    }

    process.stdout.write(
      `\r   Progreso: ${Math.min(i + slice.length, allChannels.length)}/${allChannels.length} (online: ${online}, offline: ${offline})   `
    );

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n\n📊 Resultado:');
  console.log(`   Total:    ${allChannels.length}`);
  console.log(`   Online:   ${online} (${((online / allChannels.length) * 100).toFixed(1)}%)`);
  console.log(`   Offline:  ${offline} (${((offline / allChannels.length) * 100).toFixed(1)}%)`);
  if (sampleErrors.length) {
    console.log('\n🔍 Muestra de errores:');
    sampleErrors.forEach((e) => {
      console.log(`   - ${e.name}`);
      console.log(`     ${e.error}`);
    });
  }
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});