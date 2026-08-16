#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${PYTHON:-python3}"

if [[ -d "${HERE}/.venv" ]]; then
  # shellcheck disable=SC1091
  source "${HERE}/.venv/bin/activate"
  PY="${HERE}/.venv/bin/python"
fi

cd "${HERE}"
exec "${PY}" -m src "$@"