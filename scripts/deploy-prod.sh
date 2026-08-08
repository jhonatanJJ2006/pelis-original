#!/usr/bin/env bash
# Despliega cambios en verpelis.pro (frontend + Convex).
# Uso:
#   ./scripts/deploy-prod.sh          # web + convex (default)
#   ./scripts/deploy-prod.sh --web    # solo Next.js
#   ./scripts/deploy-prod.sh --convex # solo Convex
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---all}"

usage() {
  echo "Uso: $0 [--all|--web|--convex]"
  exit 1
}

case "$MODE" in
  --all|--web|--convex) ;;
  -h|--help) usage ;;
  *) usage ;;
esac

if [[ "$MODE" == "--web" || "$MODE" == "--all" ]]; then
  echo "→ Build Next.js (apps/web)..."
  cd "$ROOT/apps/web"
  pnpm build

  echo "→ Reiniciando pelis-web..."
  sudo systemctl restart pelis-web

  sleep 2
  if systemctl is-active --quiet pelis-web; then
    echo "✓ pelis-web activo"
  else
    echo "✗ pelis-web no está activo — revisa: journalctl -u pelis-web -n 50"
    exit 1
  fi

  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || true)"
  echo "✓ localhost:3000 → HTTP $HTTP_CODE"
fi

if [[ "$MODE" == "--convex" || "$MODE" == "--all" ]]; then
  echo "→ Desplegando Convex..."
  cd "$ROOT/packages/convex"
  npx convex dev --once
  echo "✓ Convex desplegado"
fi

echo ""
echo "Listo. Verifica: https://verpelis.pro"
echo "Si no ves cambios en el navegador: Ctrl+Shift+R (hard refresh)."
