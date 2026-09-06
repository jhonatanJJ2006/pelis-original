# Handoff pendientes — 2026-09-06 (Leo) — actualizado tarde

Si se acaban tokens / Cursor Models: retomar desde aquí. **Cero Cloud Agents (bc-*)**. Solo Grok Bot + Movies + `gh`.

## Prod ahora
- `main` / Movies: `3b95911` (runtime aún sin merge de esta rama)
- Availability live (localhost): `tvApkVersionCode=3`, `apkVersionCode=2`
- Pelis-A/B: mounts systemd persistentes (`run-media-det-Pelis\x2dA|B.mount`)

## Hecho esta sesión (rama `feat/android-tv-auth-ux`)
1. **TV APK v3** copiado a `apps/web/public/downloads/pelis-tv.apk` + `tv-app-version.json` (3 / 1.2.0).
2. **TWA móvil**: se mantiene APK DAL-correcto `0A:25` (mismo hash que `artifacts/twa/…`); `app-version.json` bajado a **2** (antes mentía 3).
3. `/api/app/availability` → `export const dynamic = 'force-dynamic'` (el `.body` prerenderizado servía TV code 2 stale).
4. `scripts/map-tv-categories.mjs` ampliado; re-run → 0 EN pendientes.
5. Timer probe TV: `scripts/systemd/pelis-tv-probe.*` + `scripts/install-tv-probe-systemd.sh` (**aún no enable** en user systemd).

## Pendiente inmediato
1. `./scripts/install-tv-probe-systemd.sh` en Movies (user timer 6h).
2. Restaurar keystore TWA `0A:25` → rebuild móvil code 3+.
3. PRs #51–#53 → staging (Mark) → promote Glob.
4. Consumet: Docker daemon down en esta sesión.
5. Series unificar / pósters / Stripe ops Dashboard.

## Android TV v3 (Webos)
- Sources: login/registro + QR harden, versionCode **3**
- Publicado en `/downloads/pelis-tv.apk` (firma **debug** — sideload OK; release firmado aparte si hace falta store)

## Bloqueo TWA
- `artifacts/twa/README.txt`: keystore actual WRONG `3B:1E` — no `android:build` hasta restaurar original.
