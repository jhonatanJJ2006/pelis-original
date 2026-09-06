import fs from 'node:fs';
import path from 'node:path';

/** Carga .env del root sin sobreescribir variables ya presentes en process.env. */
export function loadEnv(rootDir = process.cwd()) {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

/** Contraseñas del keystore TWA (apps/android/android.keystore, alias android). */
export function androidKeystoreEnv() {
  const pass =
    process.env.PELIS_STORE_PASS ||
    process.env.ANDROID_KEYSTORE_PASSWORD ||
    process.env.BUBBLEWRAP_KEYSTORE_PASSWORD;
  const keyPass =
    process.env.PELIS_KEY_PASS ||
    process.env.ANDROID_KEY_PASSWORD ||
    process.env.BUBBLEWRAP_KEY_PASSWORD ||
    pass;
  return { storePass: pass, keyPass, alias: process.env.ANDROID_KEY_ALIAS || 'android' };
}

export function upsertEnvFile(envPath, entries) {
  const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split('\n') : [];
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  }
  const body = lines.join('\n').replace(/\n+$/, '') + '\n';
  fs.writeFileSync(envPath, body);
}
