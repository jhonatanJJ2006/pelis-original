#!/usr/bin/env bash
# Vigilante (timer systemd --user cada 5 min). Mata emuladores (qemu-system / emulator)
# más viejos que EMU_WATCHDOG_MAX_MIN (60) o todos si MemAvailable < EMU_WATCHDOG_MIN_AVAIL_MB (4096).
# Solo toca procesos qemu-system*/emulator: nunca pelis-web, postgres, cloudflared ni ffmpeg.
set -uo pipefail
MAX_MIN="${EMU_WATCHDOG_MAX_MIN:-60}"
MIN_AVAIL_MB="${EMU_WATCHDOG_MIN_AVAIL_MB:-4096}"
LOG="${EMU_WATCHDOG_LOG:-$HOME/Desktop/PELIS/logs/emu-watchdog.log}"
mkdir -p "$(dirname "$LOG")"
log(){ echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }
avail_mb=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
low=0; (( avail_mb < MIN_AVAIL_MB )) && low=1
for pid in $(pgrep -f 'qemu-system|/emulator/emulator' 2>/dev/null); do
  comm=$(ps -o comm= -p "$pid" 2>/dev/null) || continue
  [[ "$comm" =~ ^(qemu-system|emulator) ]] || continue
  age_min=$(( $(ps -o etimes= -p "$pid" | tr -d ' ') / 60 ))
  if (( low )) || (( age_min >= MAX_MIN )); then
    kill -TERM "$pid" 2>/dev/null; sleep 5; kill -KILL "$pid" 2>/dev/null
    log "matado pid=$pid ($comm) edad=${age_min}min MemAvailable=${avail_mb}MB motivo=$([[ $low == 1 ]] && echo memoria-baja || echo edad)"
  fi
done
