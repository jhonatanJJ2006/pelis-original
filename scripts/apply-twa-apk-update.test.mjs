import test from 'node:test';
import assert from 'node:assert/strict';
import {
  patchAndroidManifest,
  patchFilePaths,
  patchGradleVersions,
} from './apply-twa-apk-update.mjs';

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="pro.verpelis.twa">
    <uses-permission android:name="android.permission.INTERNET"/>
    <application
        android:name="Application"
        android:theme="@android:style/Theme.Translucent.NoTitleBar">
        <activity android:name="LauncherActivity"
            android:exported="true">
            <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="@string/launchUrl" />
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="https"
                    android:host="@string/hostName"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

test('moves the launcher to ApkUpdateActivity once', () => {
  const once = patchAndroidManifest(manifest);
  const twice = patchAndroidManifest(once);
  assert.equal(twice, once);
  assert.equal(once.match(/android.intent.category.LAUNCHER/g).length, 1);
  assert.match(once, /android:name="\.ApkUpdateActivity"/);
  assert.match(once, /android:name="LauncherActivity"/);
  assert.match(once, /android.intent.action.VIEW/);
  assert.match(once, /REQUEST_INSTALL_PACKAGES/);
  assert.match(once, /application\/vnd.android.package-archive/);
  assert.doesNotMatch(
    once.slice(once.indexOf('LauncherActivity')),
    /android.intent.category.LAUNCHER/,
  );
});

test('extends file provider paths without duplicating', () => {
  const xml = '<paths>\n    <files-path path="twa_splash/" name="twa_splash" />\n</paths>\n';
  const once = patchFilePaths(xml);
  assert.match(once, /cache-path path="apk-update\/"/);
  assert.equal(patchFilePaths(once), once);
});

test('writes versionCode and versionName from the TWA manifest', () => {
  const gradle = 'defaultConfig {\n        versionCode 3\n        versionName "3"\n}\n';
  const next = patchGradleVersions(gradle, 4, '4');
  assert.match(next, /versionCode 4/);
  assert.match(next, /versionName "4"/);
  assert.equal(patchGradleVersions(next, 4, '4'), next);
});
