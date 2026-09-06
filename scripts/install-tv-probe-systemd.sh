#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"
mkdir -p "${UNIT_DIR}"
cp "${ROOT}/scripts/systemd/pelis-tv-probe.service" "${UNIT_DIR}/"
cp "${ROOT}/scripts/systemd/pelis-tv-probe.timer" "${UNIT_DIR}/"
systemctl --user daemon-reload
systemctl --user enable --now pelis-tv-probe.timer
systemctl --user status pelis-tv-probe.timer --no-pager || true
echo "Timer instalado. Ver: systemctl --user list-timers | grep pelis-tv"
