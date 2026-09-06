#!/usr/bin/env node
/**
 * Publica APKs en apps/web/public/downloads/ + JSON de versión.
 *
 *   pnpm android:publish              # TWA móvil (build + assetlinks + app-version.json)
 *   pnpm android-tv:publish           # TV debug → pelis-tv.apk + tv-app-version.json
 *   node scripts/publish-apks.mjs --all
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function runNode(script, extraArgs = []) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...extraArgs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function readGradleVersion() {
  const gradle = fs.readFileSync(path.join(root, 'apps/android/app/build.gradle'), 'utf8');
  const code = gradle.match(/versionCode\s+(\d+)/)?.[1];
  const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  return { code: code ? Number(code) : null, name: name ?? String(code) };
}

function readTvVersion() {
  const gradle = fs.readFileSync(path.join(root, 'apps/android-tv/app/build.gradle.kts'), 'utf8');
  const code = gradle.match(/versionCode\s*=\s*(\d+)/)?.[1];
  const name = gradle.match(/versionName\s*=\s*"([^"]+)"/)?.[1];
  return { code: code ? Number(code) : null, name: name ?? String(code) };
}

function writeJson(relativePath, data) {
  const full = path.join(root, 'apps/web/public', relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
}

function publishMobile() {
  console.log('\n=== Publicar TWA móvil ===\n');
  runNode('android-build.mjs');
  runNode('android-fingerprint.mjs');
  const { code, name } = readGradleVersion();
  if (code == null) {
    console.error('No se pudo leer versionCode de apps/android/app/build.gradle');
    process.exit(1);
  }
  writeJson('downloads/app-version.json', {
    apkVersionCode: code,
    apkVersionName: name,
  });
  console.log(`app-version.json → ${code} / ${name}`);
  console.log('https://verpelis.pro/downloads/pelis.apk');
}

function publishTv() {
  console.log('\n=== Publicar Android TV ===\n');
  const tvDir = path.join(root, 'apps/android-tv');
  const sdk = path.join(root, '.tools/android-sdk');
  const env = { ...process.env };
  if (fs.existsSync(sdk)) env.ANDROID_HOME = sdk;

  const build = spawnSync('./gradlew', [':app:assembleDebug', '--no-daemon'], {
    cwd: tvDir,
    stdio: 'inherit',
    env,
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  const src = path.join(tvDir, 'app/build/outputs/apk/debug/app-debug.apk');
  const dest = path.join(root, 'apps/web/public/downloads/pelis-tv.apk');
  if (!fs.existsSync(src)) {
    console.error('No se generó', src);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);

  const { code, name } = readTvVersion();
  writeJson('downloads/tv-app-version.json', {
    apkVersionCode: code,
    apkVersionName: name,
    package: 'pro.verpelis.tv',
  });
  console.log(`pelis-tv.apk → code ${code} / ${name}`);
  console.log('https://verpelis.pro/downloads/pelis-tv.apk');
}

loadEnv(root);

const args = process.argv.slice(2);
const all = args.includes('--all');
const mobile = all || args.includes('--mobile') || args.length === 0;
const tv = all || args.includes('--tv');

if (mobile) publishMobile();
if (tv) publishTv();
if (!mobile && !tv) {
  console.log('Uso: node scripts/publish-apks.mjs [--mobile] [--tv] [--all]');
}
