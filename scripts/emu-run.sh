#!/usr/bin/env bash
# Única forma permitida de arrancar un emulador Android en Movies.
# - RAM del emulador limitada (-memory, por defecto 2048 MB).
# - Corre en su propia unidad systemd --user con MemoryMax=4G: si se pasa,
#   el OOM mata solo al emulador (nunca a Grok Bot, deploys ni ffmpeg).
# - Se apaga solo tras EMU_MAX_MIN minutos (por defecto 45).
# Uso: scripts/emu-run.sh [avd] [extra args del emulador...]
#   EMU_MAX_MIN=20 EMU_MEMORY=2048 scripts/emu-run.sh pelis_tv
set -euo pipefail
AVD="${1:-pelis_tv}"; shift || true
SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
MAX_MIN="${EMU_MAX_MIN:-45}"
MEM="${EMU_MEMORY:-2048}"
UNIT="pelis-emu-${AVD//[^A-Za-z0-9_]/_}"
if systemctl --user is-active --quiet "$UNIT"; then
  echo "✗ $UNIT ya está corriendo (scripts/emu-stop.sh para pararlo)" >&2; exit 1
fi
systemctl --user reset-failed "$UNIT" 2>/dev/null || true
systemd-run --user --unit="$UNIT" --collect \
  -p MemoryMax=4G -p MemorySwapMax=0 -p RuntimeMaxSec="$((MAX_MIN * 60))" \
  "$SDK/emulator/emulator" -avd "$AVD" -memory "$MEM" -no-snapshot-save -no-audio \
  -no-boot-anim -no-window -gpu swiftshader_indirect "$@"
echo "→ $UNIT arrancado (RAM ${MEM} MB, tope 4G, se apaga en ${MAX_MIN} min). Esperando arranque..."
ADB="$SDK/platform-tools/adb"
timeout 300 "$ADB" wait-for-device
until [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == 1 ]]; do sleep 3; done
echo "✓ Emulador listo. Al terminar: scripts/emu-stop.sh"
