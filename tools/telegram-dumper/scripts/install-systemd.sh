#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"

mkdir -p "${UNIT_DIR}"
cp "${HERE}/systemd/telegram-dumper.service" "${UNIT_DIR}/"
cp "${HERE}/systemd/telegram-dumper.timer"   "${UNIT_DIR}/"

systemctl --user daemon-reload
systemctl --user enable  telegram-dumper.timer
systemctl --user start   telegram-dumper.timer

echo "Installed. Status:"
systemctl --user status telegram-dumper.timer --no-pager || true