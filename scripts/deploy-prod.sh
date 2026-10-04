#!/usr/bin/env bash
# Despliega cambios en verpelis.pro (Postgres + Next.js producción).
# Uso:
#   ./scripts/deploy-prod.sh           # migrate + prisma generate + build + restart
#   ./scripts/deploy-prod.sh --web     # prisma generate + build + restart
#   ./scripts/deploy-prod.sh --db-only # migraciones y prisma generate
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---all}"

usage() {
  echo "Uso: $0 [--all|--web|--db-only]"
  exit 1
}

case "$MODE" in
  --all|--web|--db-only) ;;
  -h|--help) usage ;;
  *) usage ;;
esac

free_port_3000() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp >/dev/null 2>&1 || true
  fi
  sleep 1
}

if [[ "$MODE" == "--all" || "$MODE" == "--db-only" ]]; then
  echo "→ Aplicando migraciones Postgres..."
  cd "$ROOT"
  pnpm --filter @pelis/db db:deploy
  echo "✓ Migraciones aplicadas"
fi

# migrate deploy no regenera el cliente. Sin este paso el servidor sigue
# con el cliente viejo y las columnas nuevas revientan en runtime.
echo "→ Regenerando el cliente de Prisma..."
cd "$ROOT"
pnpm --filter @pelis/db db:generate
echo "✓ Cliente de Prisma regenerado"

if [[ "$MODE" == "--web" || "$MODE" == "--all" ]]; then
  echo "→ Build Next.js (apps/web)..."
  cd "$ROOT/apps/web"
  pnpm build

  echo "→ Liberando puerto 3000 (dev server u otro proceso)..."
  free_port_3000

  echo "→ Reiniciando pelis-web..."
  sudo systemctl restart pelis-web

  sleep 3
  if systemctl is-active --quiet pelis-web; then
    echo "✓ pelis-web activo"
  else
    echo "✗ pelis-web no está activo — revisa: journalctl -u pelis-web -n 50"
    exit 1
  fi

  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || true)"
  echo "✓ localhost:3000 → HTTP $HTTP_CODE"
fi

echo ""
echo "Listo. Verifica: https://verpelis.pro"
echo "Si no ves cambios en el navegador: Ctrl+Shift+R (hard refresh)."
