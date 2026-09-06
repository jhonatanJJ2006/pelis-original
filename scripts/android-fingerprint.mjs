import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const keystore = path.join(root, 'apps/android/android.keystore');
const assetlinks = path.join(root, 'apps/web/public/.well-known/assetlinks.json');
const twaManifestPath = path.join(root, 'apps/android/twa-manifest.json');

if (!fs.existsSync(keystore)) {
  console.error('No se encontró apps/android/android.keystore');
  console.error(
    'Genera uno con: cd apps/android && npx bubblewrap build (crea el keystore en el primer build)'
  );
  process.exit(1);
}

const storePass = process.env.ANDROID_KEYSTORE_PASSWORD || process.env.BUBBLEWRAP_KEYSTORE_PASSWORD;
const keyPass =
  process.env.ANDROID_KEY_PASSWORD || process.env.BUBBLEWRAP_KEY_PASSWORD || storePass;
const alias = process.env.ANDROID_KEY_ALIAS || 'android';

if (!storePass) {
  console.error('Define la contraseña del keystore antes de ejecutar este script:');
  console.error('  export ANDROID_KEYSTORE_PASSWORD="tu-contraseña"');
  console.error('  (también acepta BUBBLEWRAP_KEYSTORE_PASSWORD)');
  process.exit(1);
}

const output = execSync(
  `keytool -list -v -keystore "${keystore}" -alias ${alias} -storepass ${storePass} -keypass ${keyPass}`,
  { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
).toString();

const match = output.match(/SHA256:\s*([0-9A-F:]+)/i);
if (!match) {
  console.error('No se pudo leer SHA256 del keystore. Revisa la contraseña/alias.');
  process.exit(1);
}

const fingerprint = match[1].toUpperCase();
const twaManifest = JSON.parse(fs.readFileSync(twaManifestPath, 'utf8'));
const packageName = twaManifest.packageId || 'pro.verpelis.twa';

const json = JSON.parse(fs.readFileSync(assetlinks, 'utf8'));
json[0] = {
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: packageName,
    sha256_cert_fingerprints: [fingerprint],
  },
};
fs.writeFileSync(assetlinks, `${JSON.stringify(json, null, 2)}\n`);

twaManifest.fingerprints = [{ name: 'sha256_cert', value: fingerprint }];
fs.writeFileSync(twaManifestPath, `${JSON.stringify(twaManifest, null, 2)}\n`);

console.log('SHA256 actualizado en apps/web/public/.well-known/assetlinks.json');
console.log(`package_name: ${packageName}`);
console.log(fingerprint);
console.log('Despliega el frontend para que TWA verifique verpelis.pro.');
