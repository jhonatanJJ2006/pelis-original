#!/usr/bin/env node
/**
 * Wrapper opcional. El build real es Gradle en apps/android-tv.
 * No commitea APKs. Requiere ANDROID_HOME / SDK 35.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tv = resolve(root, 'apps/android-tv');
const result = spawnSync(resolve(tv, 'gradlew'), [':app:assembleDebug', ...process.argv.slice(2)], {
  cwd: tv,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
