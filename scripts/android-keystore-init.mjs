#!/usr/bin/env node
/**
 * Crea o regenera apps/android/android.keystore (TWA pro.verpelis.twa).
 * Lee contraseña de .env: PELIS_STORE_PASS / PELIS_KEY_PASS (o aliases Bubblewrap).
 *
 *   node scripts/android-keystore-init.mjs          # solo si no existe
 *   node scripts/android-keystore-init.mjs --force  # backup + nuevo keystore
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { androidKeystoreEnv, loadEnv } from './lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const keystore = path.join(root, 'apps/android/android.keystore');
const force = process.argv.includes('--force');

loadEnv(root);
const { storePass, keyPass, alias } = androidKeystoreEnv();

if (!storePass || !keyPass) {
  console.error('Faltan PELIS_STORE_PASS y PELIS_KEY_PASS en .env');
  process.exit(1);
}

if (fs.existsSync(keystore) && !force) {
  console.log('Keystore ya existe:', keystore);
  console.log('Usa --force para respaldar y crear uno nuevo.');
  process.exit(0);
}

if (fs.existsSync(keystore) && force) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${keystore}.bak-${stamp}`;
  fs.copyFileSync(keystore, backup);
  console.log('Backup:', backup);
  fs.unlinkSync(keystore);
}

const dname = process.env.PELIS_KEYSTORE_DN || 'CN=Jhona Dev, OU=DET, O=DET, C=EC';
execSync(
  [
    'keytool -genkeypair -v',
    `-keystore "${keystore}"`,
    `-alias ${alias}`,
    '-keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12',
    `-storepass "${storePass.replace(/"/g, '\\"')}"`,
    `-keypass "${keyPass.replace(/"/g, '\\"')}"`,
    `-dname "${dname.replace(/"/g, '\\"')}"`,
  ].join(' '),
  { stdio: 'inherit', shell: true }
);

const out = execSync(
  `keytool -list -v -keystore "${keystore}" -alias ${alias} -storepass "${storePass.replace(/"/g, '\\"')}"`,
  { encoding: 'utf8', shell: true }
);
const sha = out.match(/SHA256:\s*([0-9A-F:]+)/i)?.[1];
console.log('\nKeystore listo:', keystore);
if (sha) console.log('SHA256:', sha.toUpperCase());
console.log('Siguiente: pnpm android:publish');
