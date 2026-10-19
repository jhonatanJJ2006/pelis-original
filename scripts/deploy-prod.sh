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
  # Un build cortado (OOM, Ctrl+C) deja .next sin BUILD_ID: no reiniciar sobre eso.
  if [[ ! -s .next/BUILD_ID ]]; then
    echo "✗ Build incompleto (.next/BUILD_ID no existe). pelis-web NO se reinició." >&2
    exit 1
  fi
  NEW_BUILD_ID="$(cat .next/BUILD_ID)"
  echo "✓ Build $NEW_BUILD_ID"

  echo "→ Liberando puerto 3000 (dev server u otro proceso)..."
  free_port_3000

  echo "→ Reiniciando pelis-web..."
  # -n: si sudo pidiera contraseña, fallar en vez de quedarse colgado.
  if ! sudo -n systemctl restart pelis-web; then
    echo "✗ No se pudo reiniciar pelis-web (sudo/systemctl). El servidor sigue con el build viejo." >&2
    exit 1
  fi

  sleep 3
  if systemctl is-active --quiet pelis-web; then
    echo "✓ pelis-web activo"
  else
    echo "✗ pelis-web no está activo — revisa: journalctl -u pelis-web -n 50"
    exit 1
  fi

  HTTP_CODE=000
  for _ in $(seq 1 30); do
    HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ || true)"
    [[ "$HTTP_CODE" == "200" ]] && break
    sleep 2
  done
  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "✗ localhost:3000 → HTTP $HTTP_CODE" >&2
    exit 1
  fi
  echo "✓ localhost:3000 → HTTP 200"

  # El HTML servido debe enlazar CSS del build nuevo y cada CSS debe responder 200.
  CSS_LIST="$(curl -s http://localhost:3000/ | grep -o '/_next/static/css/[A-Za-z0-9_-]*\.css' | sort -u || true)"
  if [[ -z "$CSS_LIST" ]]; then
    echo "✗ La página no enlaza ningún CSS" >&2
    exit 1
  fi
  for css in $CSS_LIST; do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$css" || true)"
    if [[ "$CODE" != "200" ]]; then
      echo "✗ $css → HTTP $CODE (el servidor no sirve el build nuevo)" >&2
      exit 1
    fi
  done
  echo "✓ CSS enlazado responde 200 ($(echo "$CSS_LIST" | wc -l) archivos)"
fi

echo ""
echo "Listo. Verifica: https://verpelis.pro"
echo "Si no ves cambios en el navegador: Ctrl+Shift+R (hard refresh)."
