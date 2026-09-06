import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { androidKeystoreEnv, loadEnv } from './lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'apps/android');
const apkOut = path.join(root, 'apps/web/public/downloads/pelis.apk');
const bubblewrap = path.join(androidDir, 'node_modules/.bin/bubblewrap');

loadEnv(root);
const keystoreEnv = androidKeystoreEnv();
if (!keystoreEnv.storePass) {
  console.error('Define PELIS_STORE_PASS en .env (y PELIS_KEY_PASS si difiere).');
  process.exit(1);
}

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
    return { ...process.env };
  } catch {
    const jdkHome = findBundledJdkHome();
    if (!jdkHome) {
      console.error('Java JDK 17+ es obligatorio.');
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

const buildEnv = {
  ...ensureJava(),
  PELIS_STORE_PASS: keystoreEnv.storePass,
  PELIS_KEY_PASS: keystoreEnv.keyPass,
  ANDROID_KEYSTORE_PASSWORD: keystoreEnv.storePass,
  ANDROID_KEY_PASSWORD: keystoreEnv.keyPass,
  BUBBLEWRAP_KEYSTORE_PASSWORD: keystoreEnv.storePass,
  BUBBLEWRAP_KEY_PASSWORD: keystoreEnv.keyPass,
};

const jdkHome = buildEnv.JAVA_HOME ?? findBundledJdkHome();
const androidSdkPath = path.join(root, '.tools/android-sdk');

if (fs.existsSync(androidSdkPath)) {
  buildEnv.ANDROID_HOME = androidSdkPath;
  buildEnv.ANDROID_SDK_ROOT = androidSdkPath;
  const localProps = path.join(androidDir, 'local.properties');
  fs.writeFileSync(localProps, `sdk.dir=${androidSdkPath.replace(/\\/g, '/')}\n`);
}

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
  fs.writeFileSync(configPath, JSON.stringify({ jdkPath: jdkHome, androidSdkPath }, null, 2));
}

ensureBubblewrapConfig();

function run(cmd, args, cwd = androidDir) {
  const bin = process.platform === 'win32' && !cmd.endsWith('.cmd') ? `${cmd}.cmd` : cmd;
  const result = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: buildEnv,
  });
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
  console.error('Proyecto TWA no inicializado. Ver apps/android/README o bubblewrap init.');
  process.exit(1);
}

if (!fs.existsSync(path.join(androidDir, 'android.keystore'))) {
  console.error('No hay android.keystore. Ejecuta: node scripts/android-keystore-init.mjs');
  process.exit(1);
}

console.log('\nCompilando APK firmado (Gradle release)...');
run('./gradlew', [':app:assembleRelease', '--no-daemon']);

const candidates = [
  path.join(androidDir, 'app/build/outputs/apk/release/app-release.apk'),
  path.join(androidDir, 'app/build/outputs/apk/release/app-release-unsigned.apk'),
  path.join(androidDir, 'app-release-signed.apk'),
  path.join(androidDir, 'app/build/outputs/apk/release/app-release-signed.apk'),
];

const built = candidates.find((p) => fs.existsSync(p));
if (!built) {
  console.error('\nNo se encontró el APK generado.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(apkOut), { recursive: true });
fs.copyFileSync(built, apkOut);
console.log(`\nAPK copiado a: ${apkOut}`);
console.log('Descarga pública: https://verpelis.pro/downloads/pelis.apk');
