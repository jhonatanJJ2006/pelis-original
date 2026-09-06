import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'apps/android');
const apkOut = path.join(root, 'apps/web/public/downloads/pelis.apk');
const bubblewrap = path.join(androidDir, 'node_modules/.bin/bubblewrap');

function findBundledJdkHome() {
  const toolsDir = path.join(root, '.tools');
  if (!fs.existsSync(toolsDir)) return null;
  const match = fs
    .readdirSync(toolsDir)
    .map((name) => path.join(toolsDir, name))
    .find((dir) => fs.existsSync(path.join(dir, 'bin', 'java')));
  return match ?? null;
}

function ensureJava() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return process.env;
  } catch {
    const jdkHome = findBundledJdkHome();
    if (!jdkHome) {
      console.error('Java JDK 17+ es obligatorio.');
      console.error('Opciones:');
      console.error('  1. sudo apt install openjdk-17-jdk-headless');
      console.error('  2. Descargar JDK en .tools/ (ver DEPLOY.md)');
      process.exit(1);
    }
    console.log(`Usando JDK incluido: ${jdkHome}\n`);
    return {
      ...process.env,
      JAVA_HOME: jdkHome,
      PATH: `${path.join(jdkHome, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
    };
  }
}

const buildEnv = ensureJava();
const jdkHome = buildEnv.JAVA_HOME ?? findBundledJdkHome();
const toolsDir = path.join(root, '.tools');
const androidSdkPath = path.join(toolsDir, 'android-sdk');

function ensureBubblewrapConfig() {
  const configDir = path.join(process.env.HOME ?? '', '.bubblewrap');
  const configPath = path.join(configDir, 'config.json');
  if (!jdkHome || !fs.existsSync(androidSdkPath)) return;

  const binPath = path.join(androidSdkPath, 'bin');
  const cmdlineBin = path.join(androidSdkPath, 'cmdline-tools', 'latest', 'bin');
  if (!fs.existsSync(binPath) && fs.existsSync(cmdlineBin)) {
    fs.symlinkSync(path.join('cmdline-tools', 'latest', 'bin'), binPath);
  }

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({ jdkPath: jdkHome, androidSdkPath }, null, 2)
  );
}

ensureBubblewrapConfig();

function run(cmd, args, cwd = androidDir) {
  const bin = process.platform === 'win32' && !cmd.endsWith('.cmd') ? `${cmd}.cmd` : cmd;
  const result = spawnSync(bin, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32', env: buildEnv });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasAndroidProject() {
  return fs.existsSync(path.join(androidDir, 'app', 'build.gradle'));
}

console.log('=== Pelis Android APK (TWA) ===\n');

if (!fs.existsSync(bubblewrap)) {
  console.log('Instalando @bubblewrap/cli en apps/android...');
  execSync('pnpm install', { cwd: androidDir, stdio: 'inherit', env: buildEnv });
}

if (!hasAndroidProject()) {
  console.error('\nPrimera vez: debes inicializar el proyecto TWA en tu terminal (es interactivo).\n');
  console.error('Ejecuta estos comandos:\n');
  console.error('  cd apps/android');
  console.error('  npx @bubblewrap/cli init --manifest=https://verpelis.pro/manifest.json\n');
  console.error('Cuando pregunte, usa estos valores:');
  console.error('  - ¿Instalar JDK? → No (ya está en .tools/)');
  console.error('  - Domain: verpelis.pro');
  console.error('  - Package: pro.verpelis.twa');
  console.error('  - App name: Pelis');
  console.error('  - Keystore: crear uno nuevo y guarda la contraseña\n');
  console.error('Luego vuelve a ejecutar: pnpm android:build\n');
  process.exit(1);
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
console.log('Descarga pública: https://verpelis.pro/downloads/pelis.apk');
console.log('\nSiguiente paso: pnpm android:fingerprint (actualiza assetlinks.json) y vuelve a desplegar.');
