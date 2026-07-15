import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'apps/android');
const apkOut = path.join(root, 'apps/web/public/downloads/pelis.apk');
const bubblewrap = path.join(androidDir, 'node_modules/.bin/bubblewrap');

function run(cmd, args, cwd = androidDir) {
  const bin = process.platform === 'win32' && !cmd.endsWith('.cmd') ? `${cmd}.cmd` : cmd;
  const result = spawnSync(bin, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasAndroidProject() {
  return fs.existsSync(path.join(androidDir, 'app', 'build.gradle'));
}

console.log('=== Pelis Android APK (TWA) ===\n');

try {
  execSync('java -version', { stdio: 'ignore' });
} catch {
  console.error('Java JDK 17+ es obligatorio. Instala Android Studio o JDK 17.');
  process.exit(1);
}

if (!fs.existsSync(bubblewrap)) {
  console.log('Instalando @bubblewrap/cli en apps/android...');
  execSync('pnpm install', { cwd: androidDir, stdio: 'inherit' });
}

if (!hasAndroidProject()) {
  console.log('\nPrimera vez: inicializando proyecto TWA...');
  console.log('Usa estos valores si te los pide:');
  console.log('  - Domain: pelis-original.vercel.app');
  console.log('  - Package: com.pelis.app');
  console.log('  - App name: Pelis');
  console.log('  - Keystore: crear nuevo (guarda la contraseña)\n');
  run('npx', ['@bubblewrap/cli', 'init', '--manifest=https://pelis-original.vercel.app/manifest.json']);
}

console.log('\nCompilando APK firmado...');
run('npx', ['@bubblewrap/cli', 'build']);

const candidates = [
  path.join(androidDir, 'app-release-signed.apk'),
  path.join(androidDir, 'app-release-bundle-signed.apk'),
  path.join(androidDir, 'app/build/outputs/apk/release/app-release-signed.apk'),
];

const built = candidates.find((p) => fs.existsSync(p));
if (!built) {
  console.error('\nNo se encontró el APK generado. Revisa la salida de bubblewrap build.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(apkOut), { recursive: true });
fs.copyFileSync(built, apkOut);
console.log(`\nAPK copiado a: ${apkOut}`);
console.log('Descarga pública: https://pelis-original.vercel.app/downloads/pelis.apk');
console.log('\nSiguiente paso: pnpm android:fingerprint (actualiza assetlinks.json) y vuelve a desplegar.');
