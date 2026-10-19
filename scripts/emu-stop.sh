#!/usr/bin/env bash
# Apaga todos los emuladores Android (qemu) y daemons de Gradle. No toca nada más.
set -uo pipefail
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
"$SDK/platform-tools/adb" devices 2>/dev/null | awk '/^emulator-/{print $1}' | while read -r d; do
  "$SDK/platform-tools/adb" -s "$d" emu kill >/dev/null 2>&1 || true
done
for u in $(systemctl --user list-units --plain --no-legend 'pelis-emu-*' 2>/dev/null | awk '{print $1}'); do
  systemctl --user stop "$u" || true
done
sleep 3
# Por nombre de proceso (no -f) para no matar shells cuya línea de comandos mencione qemu.
pkill -KILL '^qemu-system' 2>/dev/null || true
pkill -KILL -x emulator 2>/dev/null || true
pkill -f 'org.gradle.launcher.daemon' 2>/dev/null || true
echo "✓ Emuladores y daemons de Gradle parados"
