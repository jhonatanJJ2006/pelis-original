/**
 * Copies the tracked APK-update gate into the gitignored Bubblewrap project
 * and makes it the launcher. Idempotent: safe to run on every build.
 *
 * The phone app is a thin TWA (no UI of its own). ApkUpdateActivity checks
 * /api/app/availability before LauncherActivity opens the web.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LAUNCHER_FILTER =
  /<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"\s*\/>\s*<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>\s*<\/intent-filter>/;

const UPDATE_ACTIVITY = `
        <activity
            android:name=".ApkUpdateActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
`;

export function patchAndroidManifest(xml) {
  if (xml.includes('android:name=".ApkUpdateActivity"')) {
    return ensureManifestExtras(xml);
  }
  if (!LAUNCHER_FILTER.test(xml)) {
    throw new Error('No se encontró el intent-filter MAIN/LAUNCHER del TWA.');
  }
  if (!xml.includes('android:name="LauncherActivity"')) {
    throw new Error('No se encontró LauncherActivity en el manifest del TWA.');
  }
  let next = xml.replace(LAUNCHER_FILTER, '<!-- MAIN/LAUNCHER lo toma ApkUpdateActivity -->');
  next = next.replace(
    /<activity\s+android:name="LauncherActivity"/,
    `${UPDATE_ACTIVITY}\n        <activity android:name="LauncherActivity"`,
  );
  return ensureManifestExtras(next);
}

function ensureManifestExtras(xml) {
  let next = xml;
  if (!next.includes('android.permission.REQUEST_INSTALL_PACKAGES')) {
    next = next.replace(
      /<manifest\b([^>]*)>/,
      (open) => `${open}\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>`,
    );
  }
  if (!next.includes('application/vnd.android.package-archive')) {
    const queries = `
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:mimeType="application/vnd.android.package-archive" />
        </intent>
    </queries>
`;
    next = next.replace(/<application\b/, `${queries}    <application`);
  }
  return next;
}

export function patchFilePaths(xml) {
  if (xml.includes('apk-update/')) return xml;
  if (!xml.includes('</paths>')) {
    throw new Error('filepaths.xml del TWA no tiene </paths>.');
  }
  return xml.replace(
    '</paths>',
    '    <cache-path path="apk-update/" name="apk_update" />\n</paths>',
  );
}

export function patchGradleVersions(gradle, versionCode, versionName) {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    throw new Error(`versionCode inválido: ${versionCode}`);
  }
  if (typeof versionName !== 'string' || !/^[0-9A-Za-z._-]{1,32}$/.test(versionName)) {
    throw new Error(`versionName inválido: ${versionName}`);
  }
  if (!/versionCode\s+\d+/.test(gradle)) {
    throw new Error('No se encontró versionCode en app/build.gradle.');
  }
  if (!/versionName\s+"[^"]*"/.test(gradle)) {
    throw new Error('No se encontró versionName en app/build.gradle.');
  }
  return gradle
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
}

export function applyTwaApkUpdate(androidDir) {
  const twa = JSON.parse(fs.readFileSync(path.join(androidDir, 'twa-manifest.json'), 'utf8'));
  const versionCode = twa.appVersionCode;
  const versionName = String(twa.appVersionName ?? versionCode);

  const appDir = path.join(androidDir, 'app');
  const manifestPath = path.join(appDir, 'src/main/AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'Falta apps/android/app (proyecto Bubblewrap). Ejecuta bubblewrap init/update antes de compilar.',
    );
  }

  const source = path.join(androidDir, 'apk-update/ApkUpdateActivity.java');
  const dest = path.join(appDir, 'src/main/java/pro/verpelis/twa/ApkUpdateActivity.java');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);

  fs.writeFileSync(manifestPath, patchAndroidManifest(fs.readFileSync(manifestPath, 'utf8')));

  const pathsFile = path.join(appDir, 'src/main/res/xml/filepaths.xml');
  fs.writeFileSync(pathsFile, patchFilePaths(fs.readFileSync(pathsFile, 'utf8')));

  const gradleFile = path.join(appDir, 'build.gradle');
  fs.writeFileSync(
    gradleFile,
    patchGradleVersions(fs.readFileSync(gradleFile, 'utf8'), versionCode, versionName),
  );
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const androidDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/android');
  applyTwaApkUpdate(androidDir);
  console.log('Aviso de actualización aplicado al proyecto TWA.');
}
