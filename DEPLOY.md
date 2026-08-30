> **STALE.** Este runbook describe Convex y ya no aplica. Prod hoy: https://verpelis.pro via Cloudflare Tunnel hacia localhost:3000 (systemd pelis-web.service). Secretos solo en `.env`. GitHub Environments (production/staging/dev) los posee Glob y aun no existen. Ver `AGENTS.md`.

# Guía de deploy — Pelis (verpelis.pro)

Runbook completo del proceso de despliegue: cómo exponer la app en `https://verpelis.pro`
con Cloudflare (DNS + Tunnel) desde el servidor local, con backend en Convex.

> ⚠️ Este documento NO contiene secretos (tokens, API keys). Las claves viven en `.env`
> (gitignored), en los deployments de Convex (`convex env list`) y en los dashboards.

---

## 1. Arquitectura

```
https://verpelis.pro
        │
   Cloudflare (DNS + proxy + SSL + Tunnel)
        │  Tunnel cloudflared (conexión saliente)
        ▼
   Servidor local (puerto 3000)
        │  systemd: pelis-web.service (Next.js producción)
        ▼
   Convex (backend + BD + auth)
   https://uncommon-dolphin-106.convex.cloud   (dev deployment)
   https://uncommon-dolphin-106.convex.site    (HTTP actions / auth)
```

- **Frontend**: Next.js 14 (monorepo turbo + pnpm), app en `apps/web`.
- **Backend**: Convex (`packages/convex`), auth con better-auth + email OTP (Resend).
- **Dominio**: `verpelis.pro` registrado en Squarespace, DNS administrado por Cloudflare.
- **Cuenta Cloudflare**: `2jhonatanjara2@gmail.com`
- **Cuenta Convex**: team `jhonatan-jasa`, proyecto `pelis`.

---

## 2. Cloudflare (DNS + dominio)

### 2.1 Agregar el dominio (zona)

1. En Cloudflare Dashboard → **Add a site** → `verpelis.pro` (plan free).
2. Cloudflare entrega 2 nameservers, p. ej. `dom.ns.cloudflare.com` y `rose.ns.cloudflare.com`.
3. En Squarespace → Domain → **Change Nameservers** → poner los de Cloudflare.
4. La zona pasa de `pending` → `active` (tarda unos minutos; verifica con `npx wrangler` no aplica aquí — usa el dashboard o la API).

Verificación del estado:
```bash
dig +short NS verpelis.pro @8.8.8.8
dig +short verpelis.pro @dom.ns.cloudflare.com   # → IPs edge de Cloudflare
```

### 2.2 Acceso por API / MCP (opencode)

Los MCP servers de Cloudflare ya están configurados en `~/.config/opencode/opencode.jsonc`
(servers: `cloudflare`, `cloudflare-docs`, `cloudflare-bindings`, `cloudflare-builds`,
`cloudflare-observability`) y las skills en `~/.config/opencode/skills/`. Con eso, en
opencode se puede hablar con la API de Cloudflare directamente (zona, DNS, purge cache…).

Datos de la cuenta:
- Account ID: `c6b0a07f4c6088f28a2724d168aadd69`
- Zone `verpelis.pro` ID: `ed2725b03d55349048d879a40adb4583`

### 2.3 SSL

Universal SSL se emite solo, unos minutos después de la activación (CA: Google Trust
Services). Si `https://verpelis.pro` falla con *TLS handshake failure* justo después de
activar la zona, es que el certificado aún no está emitido — esperar y reintentar.

---

## 3. Tunnel Cloudflare (exponer localhost)

### 3.1 Instalación y login

```bash
sudo apt install cloudflared          # o binario oficial
cloudflared tunnel login              # abre navegador, autoriza la cuenta
```

### 3.2 Crear el tunnel

```bash
cloudflared tunnel create verpelis    # id: 9ef12c9e-7203-4a28-a3a6-516c505c49c7
```

Esto crea el archivo de credenciales en `~/.cloudflared/<tunnel-id>.json`.

### 3.3 Configuración (`~/.cloudflared/config.yml`)

```yaml
tunnel: 9ef12c9e-7203-4a28-a3a6-516c505c49c7
credentials-file: /home/det/.cloudflared/9ef12c9e-7203-4a28-a3a6-516c505c49c7.json

ingress:
  - hostname: verpelis.pro
    service: http://localhost:3000
  - hostname: www.verpelis.pro
    service: http://localhost:3000
  - service: http_status:404
```

### 3.4 DNS (CNAME al tunnel)

En el dashboard (o API): registro **CNAME** `verpelis.pro` → `<tunnel-id>.cfargotunnel.com`,
**Proxied** (nube naranja). Repetir para `www`. El A del apex resuelve a IPs edge de
Cloudflare (flattening) — es normal que `dig CNAME` no muestre el registro.

### 3.5 Instalación como servicio (arranca con el sistema)

```bash
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/<tunnel-id>.json /etc/cloudflared/
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared     # debe quedar active
```

> El tunnel se mantiene vivo con 4 conexiones salientes (no requiere puertos abiertos ni IP fija).

---

## 4. Servidor Next.js (producción)

### 4.1 Variables de entorno (`/home/det/Desktop/PELIS/pelis-original/.env`)

```bash
NEXT_PUBLIC_CONVEX_URL=https://uncommon-dolphin-106.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://uncommon-dolphin-106.convex.site
CONVEX_DEPLOYMENT=dev:uncommon-dolphin-106
CONVEX_URL=https://uncommon-dolphin-106.convex.cloud
CONVEX_SITE_URL=https://uncommon-dolphin-106.convex.site
SITE_URL=https://verpelis.pro
BETTER_AUTH_SECRET=...
RESEND_API_KEY=...
STRIPE_SECRET_KEY=...        # placeholders hasta poner claves reales
STRIPE_WEBHOOK_SECRET=...
AUTH_GOOGLE_ID=...           # placeholders (no configurar en Convex)
AUTH_GOOGLE_SECRET=...
```

`.env` está en `.gitignore` (no se sube).

### 4.2 Build

```bash
cd /home/det/Desktop/PELIS/pelis-original
pnpm install
cd apps/web && pnpm build        # = pnpm with-env next build (carga ../../.env)
```

> ⚠️ NO usar `pnpm build` desde la raíz: `@pelis/android` falla (requiere JDK 17).
> Siempre buildear desde `apps/web`. El sw.js (service worker) se regenera en el build.

### 4.3 Servicio systemd (`/etc/systemd/system/pelis-web.service`)

```ini
[Unit]
Description=Pelis Next.js production server
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/det/Desktop/PELIS/pelis-original/apps/web
ExecStart=/usr/bin/pnpm --filter @pelis/web start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now pelis-web
systemctl is-active pelis-web
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/   # 200
```

> Después de cada build: `sudo systemctl restart pelis-web`.

---

## 5. Convex (backend + auth)

### 5.1 Login

```bash
cd /home/det/Desktop/PELIS/pelis-original/packages/convex
npx convex login --login-flow poll --no-open --device-name pelis-server
# abre la URL que imprime en el navegador y autoriza con la cuenta correcta
npx convex login status    # verifica el team (debe decir jhonatan-jasa)
```

- Token guardado en `~/.convex/config.json`.
- Si se cambia de cuenta, hay que rehacer este login.

### 5.2 Vincular el proyecto (CRÍTICO)

```bash
npx convex dev --configure existing --team jhonatan-jasa --project pelis --dev-deployment cloud --once
```

> ⚠️ **Pitfall importante**: si el proyecto NO está vinculado, el CLI opera sobre una
> simulación local (`.convex/local`, "anonymous-convex") y **escribe las env vars y los
> datos ahí, no en la nube** — los mensajes no dejan claro que esté pasando.
> Después de este paso, `npx convex env list` y `npx convex deployments` deben apuntar a
> `uncommon-dolphin-106` (dev).

### 5.3 Variables de entorno del deployment

```bash
npx convex env set SITE_URL https://verpelis.pro
npx convex env set BETTER_AUTH_SECRET '<mismo valor que .env>'
npx convex env set RESEND_API_KEY '<mismo valor que .env>'
npx convex env list
```

Estas las lee `packages/convex/src/http.ts` (baseURL/trustedOrigins de better-auth) y
`stripe.ts`. Si faltan, el módulo HTTP falla al cargar (error tipo `Missing API key`).

### 5.4 Deploy del código

```bash
npx convex dev --once    # typecheck + push funciones, esquema e índices
```

- `convex dev --once` = push de una vez (no queda mirando).
- `convex deploy` apunta al deployment de **producción** (interactivo); `convex dev` al dev.
- El proyecto tiene además un prod auto-creado: `flexible-lobster-410`.

### 5.5 Sembrar datos (solo la primera vez)

```bash
npx convex run seed:run      # películas (idempotente por token) + 3 planes
npx convex run anime:seed    # anime (idempotente)
```

### 5.6 URLs

- Cloud: `https://uncommon-dolphin-106.convex.cloud`
- HTTP actions / auth: `https://uncommon-dolphin-106.convex.site`
- Verificación auth: `curl https://uncommon-dolphin-106.convex.site/api/auth/get-session` → 200

---

## 6. Verificación final

```bash
systemctl is-active pelis-web cloudflared          # active active
curl -sI https://verpelis.pro                      # HTTP 200, server: cloudflare
echo | openssl s_client -connect 104.21.68.114:443 -servername verpelis.pro 2>/dev/null | openssl x509 -noout -subject -dates
curl -s https://verpelis.pro/ | grep -o "<title>.*</title>"   # Pelis — Cine y series en streaming
```

---

## 7. Git (push)

```bash
cd /home/det/Desktop/PELIS/pelis-original
gh auth setup-git              # conectar git a GitHub (token de gh)
export GIT_AUTHOR_NAME="jhonatanJJ2006" GIT_AUTHOR_EMAIL="112997355+jhonatanJJ2006@users.noreply.github.com" \
       GIT_COMMITTER_NAME="jhonatanJJ2006" GIT_COMMITTER_EMAIL="112997355+jhonatanJJ2006@users.noreply.github.com"
git add -A && git commit -m "mensaje" && git push origin main
```

- Si el push es rechazado (el remoto avanzó): `git fetch origin && git rebase origin/main`,
  resolver conflictos y `git push`.
- `sw.js` es generado: ante conflictos, tomar la versión del remoto.

---

## 8. Checklist para un deploy desde cero (resumen)

1. `pnpm install`
2. `.env` actualizado (URLs de Convex + SITE_URL)
3. `cd apps/web && pnpm build`
4. `sudo systemctl restart pelis-web`
5. `cd ../packages/convex && npx convex login` (si hace falta) y `npx convex dev --configure ... --once`
6. `npx convex env set SITE_URL/BETTER_AUTH_SECRET/RESEND_API_KEY` + `npx convex env list`
7. `npx convex dev --once` (deploy) y `npx convex run seed:run` + `npx convex run anime:seed`
8. Verificar: servicios systemd, `https://verpelis.pro`, `/api/auth/get-session`

## 9. Pendientes conocidos

- Stripe: `.env` y deployment con claves placeholder — se requieren claves reales (test) para suscripciones.
- Google login: placeholders `AUTH_GOOGLE_ID/SECRET` — no configurados en Convex.
- El deployment prod `flexible-lobster-410` existe pero no se usa (la app apunta al dev).

---

## 10. Deploy rápido tras cambios de código

> **Importante:** `git push` solo sube el código a GitHub. **No actualiza** lo que sirve
> `https://verpelis.pro`. Hay que rebuildar Next.js y/o desplegar Convex en el servidor.

### Qué ejecutar según el tipo de cambio

| Cambios en… | Comando |
|-------------|---------|
| `apps/web`, `packages/ui` (solo frontend) | `./scripts/deploy-prod.sh --web` |
| `packages/convex` (solo backend) | `./scripts/deploy-prod.sh --convex` |
| Frontend + backend (lo habitual) | `./scripts/deploy-prod.sh` |
| Solo backup en GitHub | `git push origin main` (no afecta producción) |

### Script automatizado

Desde la raíz del repo:

```bash
chmod +x scripts/deploy-prod.sh   # solo la primera vez
./scripts/deploy-prod.sh            # web + convex
./scripts/deploy-prod.sh --web      # solo frontend
./scripts/deploy-prod.sh --convex   # solo Convex
```

Equivale manualmente a:

```bash
# Frontend
cd apps/web && pnpm build
sudo systemctl restart pelis-web

# Backend
cd packages/convex && npx convex dev --once
```

### Verificación

```bash
systemctl is-active pelis-web cloudflared   # active active
curl -sI https://verpelis.pro/movies | head -3
```

En el navegador: **Ctrl+Shift+R** por si el service worker (`sw.js`) cachea assets viejos.

### Flujo típico después de desarrollar

1. `git add … && git commit -m "…"`
2. `git push origin main`
3. `./scripts/deploy-prod.sh`
4. Abrir `https://verpelis.pro` con hard refresh

---

## 11. Versionado PWA y APK

### Web (PWA)

Cada `pnpm build` en `apps/web` ejecuta `scripts/write-version.mjs` y genera
`public/version.json` con el SHA de git y la fecha de build.

- El service worker (`apps/web/sw.ts`) usa `skipWaiting: false` y espera el mensaje
  `SKIP_WAITING` desde `PwaUpdateBanner`.
- Si hay una versión nueva, el usuario ve: *"Hay novedades en Pelis — actualiza para ver lo último"*.

### APK (Android TWA)

Al publicar un APK nuevo:

1. Incrementar `appVersionCode` en `apps/android/twa-manifest.json`.
2. Actualizar `apps/web/public/downloads/app-version.json`:
   ```json
   { "apkVersionCode": 2, "apkVersionName": "1.0.1" }
   ```
3. Copiar el APK a `apps/web/public/downloads/pelis.apk`.
4. Rebuild y deploy: `./scripts/deploy-prod.sh --web`.

La API `/api/app/availability` expone `webVersion`, `apkVersionCode` y `apkVersionName`.
Usuarios con la app instalada (standalone/Android) verán un aviso si su versión local
(`localStorage.pelis_apk_version`) es menor que `apkVersionCode`.

Tras instalar la nueva APK, el usuario debe pulsar **Actualizar app** para registrar la versión.

---

## 12. Streaming multi-disco (Pelis-A / Pelis-B)

Los videos HLS están repartidos en dos discos montados:

| Disco | Ruta | Películas (~) |
|-------|------|---------------|
| Pelis-A | `/run/media/det/Pelis-A/output` | 76 |
| Pelis-B | `/run/media/det/Pelis-B/output` | 72 |

Estructura en disco por película:

```
{disco}/output/{token}/{token}/playlist.m3u8
{disco}/output/{token}/{token}/000.ts
{disco}/output/{token}/{token}/001.ts
...
```

### Variable de entorno

En `pelis-web.service`:

```ini
Environment=MOVIE_OUTPUT_ROOTS=/run/media/det/Pelis-A/output:/run/media/det/Pelis-B/output
```

La app busca el manifest en ambos discos vía `/api/stream/resolve?token=...`.

### Verificación

```bash
curl -s "https://verpelis.pro/api/stream/resolve?token=661a0c94d7722"
curl -sI "https://verpelis.pro/api/stream/661a0c94d7722/661a0c94d7722/playlist.m3u8"
curl -sI "https://verpelis.pro/api/stream/661a0c94d7722/661a0c94d7722/000.ts"
```

Tras cambiar la variable: `sudo systemctl daemon-reload && sudo systemctl restart pelis-web`
