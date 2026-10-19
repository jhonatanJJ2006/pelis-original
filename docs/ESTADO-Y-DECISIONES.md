# Estado y decisiones de Pelis (handoff canónico)

Última actualización: 2026-10-18 (hora de Guayaquil, UTC-5). Dueño: Jhonatan Jara.

Este documento es la fuente de verdad para cualquier agente que continúe el trabajo. Reúne las
reglas, las decisiones ya tomadas, los formatos obligatorios, el estilo y el estado. **No cambies
nada de lo que aquí está decidido sin pedírselo antes al dueño.** El registro del día está en
`docs/HANDOFF-2026-10-18.md`.

Nunca escribas aquí valores de secretos: solo dónde viven.

---

## 1. Reglas de trabajo (no negociables)

- **Solo git y gh locales**, como `jhonatanJJ2006`, en la máquina **Movies** (usuario `det`).
  Nada de agentes en la nube de Cursor. **Nunca force-push.** No toques otros repos.
- **No edites el checkout de producción** `/home/det/Desktop/PELIS/pelis-original` para trabajar.
  Crea un worktree en `/home/det/Desktop/PELIS/worktrees/<nombre>` desde `origin/staging`.
- **Ramas:** `feat/*`, `fix/*` o `chore/*` (se acepta `feature/*` como legado). Un prefijo `docs/`
  **falla el Soft branch gate** (`.github/workflows/branch-gate.yml`); pasó con #138, que se cerró
  y se rehízo como #139.
- **PR siempre hacia `staging`.** Squash-merge solo cuando pasan **format**, **test**, **build** y
  **Soft branch gate**. El check de Vercel se ignora (Vercel no es producción).
- **Promoción `staging` → `main`** con un PR `staging → main` y **merge commit** (no squash).
- **Deploy** en Movies, desde el checkout de producción ya actualizado a `main`:
  `./scripts/deploy-prod.sh` (migraciones + prisma generate + build + restart de `pelis-web`).
  Si la promoción solo trae docs, scripts o apps Android, no hace falta deploy de la web.
- **El repo es público desde 2026-10-17**, por eso corre GitHub Actions (facturación de Actions).
  La API key de TMDB está escrita en 7 scripts (`scripts/download-tmdb-posters.mjs`,
  `download-extra-posters.mjs`, `download-new-posters.mjs`, `redownload-posters.mjs`,
  `fetch-tmdb-details.mjs`, `fix-tmdb-entries.mjs`, `link-orphan-movies.mjs`). Hay que pasarla a
  una variable de entorno y **rotarla**; la rotación es acción del dueño (pendiente).
- **Stripe sigue en sandbox/TEST** hasta que el dueño decida otra cosa.
- **Las APK se prueban en los emuladores de Movies** antes de publicarlas (ver §10).
- **Emuladores: solo con `scripts/emu-run.sh`** (RAM 2048 MB, scope systemd propio con `MemoryMax=4G`,
  se apaga solo a los 45 min) y **siempre `scripts/emu-stop.sh` al terminar**. Nunca lances
  `emulator` a mano. El 18-oct un emulador olvidado (~14 GB) provocó un OOM que mató el deploy y la
  cola ffmpeg. Vigilante: timer `pelis-emu-watchdog.timer` (systemd --user, cada 5 min,
  `ops/systemd-user/`) mata emuladores con más de 60 min o si MemAvailable < 4 GB; log en
  `~/Desktop/PELIS/logs/emu-watchdog.log`. Nunca toca pelis-web, postgres, cloudflared ni ffmpeg.
- **La cola ffmpeg y los deploys corren en su propio scope/unidad** (`pelis-abr-queue`,
  `deploy-prod.sh` se re-ejecuta con `systemd-run --user --scope`), para que un OOM ajeno no los mate.
- **El reloj de Movies está en UTC** (no UTC-5): logs y `date` en Movies van 5 h por delante de Ecuador.
- Nunca imprimas ni commitees secretos (`.env`, contraseñas del keystore, API keys).

## 2. Reglas de producto

- **Descargas de APK solo en la web, en `/descargas`.** `/descargar` hace 308 a `/descargas`
  (`apps/web/next.config.mjs`). Las descargas **nunca** aparecen dentro de las apps (TWA, nativa,
  TV). Con el user agent `PelisTV` (o `PelisAndroid`) la página muestra «Ya tienes Pelis»; en la
  TWA/PWA instalada los bloques `.web-only` se ocultan con `display-mode: standalone`.
- **El aviso de nueva versión solo existe dentro de las apps.** En la web, `PwaUpdateModal`
  mantiene el service worker pero nunca pinta el diálogo.
- **TV: dos formas de entrar**, ambas se mantienen: QR (`https://verpelis.pro/link-tv?code=…`) y
  correo/contraseña. Ojo: **`/tv` es la página web de canales**, no el emparejamiento (el diseño de
  Stitch decía `/tv`; se cambió a `/link-tv`).
- **Los pagos son solo web.** La TV muestra el plan en solo lectura con un QR a `/subscribe`.
- **La landing es `/inicio`.**
- **Copy en español llano.** Nunca publiques el copy inventado de Stitch: servidores falsos
  («Madrid / Paris Edge 01»), protocolos («DCI-P3 Seguro»), «señal fiduciaria», «sala maestra de
  transmisión», una caché offline que no existe («Explorar acervo en caché», «Obras maestras en
  almacenamiento local»), ni promesas de Dolby Atmos / 4K UHD.

## 3. Apps y paquetes

| App                      | Carpeta                     | Package                   | APK publicada         | Versión en repo                                         |
| ------------------------ | --------------------------- | ------------------------- | --------------------- | ------------------------------------------------------- |
| **Pelis TV (principal)** | `apps/android-tv`           | `pro.verpelis.tv`         | `pelis-tv.apk`        | **2.0.0 (11)** publicada; 2.0.1 (12) en curso (PR #156) |
| Nativa celular           | `apps/android-native/phone` | `pro.verpelis.app.native` | `pelis-nativo.apk`    | 1.2.1 (4)                                               |
| Nativa TV                | `apps/android-native/tv`    | `pro.verpelis.tv.native`  | `pelis-tv-nativo.apk` | 1.2.1 (4)                                               |
| TWA                      | `apps/android`              | `pro.verpelis.twa`        | `pelis.apk`           | 5                                                       |

- **Pelis TV (`apps/android-tv`) es la app principal y la que más usa Jhonatan.** Compose for TV +
  Media3/ExoPlayer: películas, series, anime y canales se reproducen de forma nativa (desde 1.7.0,
  #133).
  - 2.0.1 (12), en curso en `worktrees/tv2` (rama `feat/tv-2.0.1`, PR #156): los chips filtran al
    enfocarlos, la tecla DERECHA en búsqueda va a los resultados y se puede escribir la búsqueda
    desde el celular con un QR. No toques ese worktree desde otra tarea.
  - **El esqueleto `app.pelis.tv` de la rama vieja `feat/native-player-tv` nunca debe reemplazar a
    `apps/android-tv`** (se dejó fuera a propósito en #116).
- `apps/android-native` (phone + tv): llaman primero al resolver `/api/stream/resolve?token=…` y
  solo usan `movie.videoUrl` como respaldo (#140); selector de calidad con nombres estándar
  1080p/720p/480p/360p (#143); buffer por defecto de ExoPlayer.
- `apps/android`: TWA de `verpelis.pro`, versión 5 (#120); el icono abre la web con
  `FLAG_ACTIVITY_NEW_TASK` (#122).

## 4. Firma de APK

- **Un solo keystore de release para todas las APK:** `apps/android/android.keystore` (en el
  checkout de producción; está en `.gitignore`, nunca se commitea), alias `android`,
  SHA-1 `9E:35:19:22:F5:E3:B5:6B:36:46:DE:B7:35:14:D7:94:C9:1D:35:B0` (SHA-256 empieza por `B2:9F:5C:9E`,
  el mismo de `assetlinks.json`). Verificado con `apksigner` el 2026-10-18: las cuatro APK publicadas
  (`pelis.apk`, `pelis-tv.apk`, `pelis-nativo.apk`, `pelis-tv-nativo.apk`) llevan esta firma.
- **Contraseña:** en Movies, `~/.pelis-secrets/store-pass` (chmod 600); en la caja del agente, la
  variable de entorno `PELIS_STORE_PASS`. Nunca la imprimas ni la commitees.
- La firma de release lee variables de entorno (#120): `PELIS_STORE_FILE`, `PELIS_STORE_PASS`,
  `PELIS_KEY_ALIAS` (por defecto `android`), `PELIS_KEY_PASS` (por defecto = store pass). Sin
  `PELIS_STORE_FILE` se firma con la clave debug (para que CI no se rompa).
- **TVs con 1.4.0 o anterior** tienen la app firmada con la clave **debug**: hay que desinstalar
  **una vez**. Desde 1.8.0 (#145) el actualizador lo detecta y ofrece un botón para desinstalar.
- El actualizador de TV verifica **tamaño, SHA-256 y certificado** (y que el versionCode suba) antes
  de instalar, descarga desde cero y reintenta hasta 3 veces.

## 5. Publicación de APK

1. Compilar el release firmado y probarlo en el emulador.
2. Copiar la APK a `apps/web/public/downloads/` **en el checkout de producción**. Son archivos
   locales sin commitear (igual que `tv-app-version.json` y `app-version.json`); `git status` del
   checkout de producción los muestra modificados y es normal.
3. Actualizar `apps/web/public/downloads/tv-app-version.json` (versionCode/versionName) si es la TV.
4. Guardar una copia en `/home/det/Desktop/PELIS/release-apks-2026-10-18/` con nombre
   `pelis-tv-<versión>-<code>.apk`, y respaldar lo que estaba publicado en
   `release-apks-2026-10-18/previous-published/before-<versión>/`.
5. `/api/app/availability` lee los archivos del disco y expone tamaño y SHA-256
   (`tvApkSizeBytes`, `tvApkSha256`, `apkSizeBytes`); `/descargas` usa la misma fuente.

**Publicado (2026-10-19):** TV 2.0.1 (12), 11 224 099 bytes, SHA-256
`e53836e5a0610f4c89ee49f62c362a9024cf5ee3e87646c40fe2c9606539a1cf`. Respaldo de 2.0.0 (11) en
`previous-published/before-2.0.1/`. **Conocido:** el `tv-app-version.json` commiteado en el repo está
viejo (dice 1.2.0 (3)); el de producción dice 2.0.1 (12). Pendiente decidir si se commitea o se saca de git.

## 6. Login con Google

- Proyecto GCP **pelis-507722** (número 651974862711). Pantalla de consentimiento: **In production**
  (dato del dueño; no verificable desde el repo).
- Cliente **web**: `651974862711-jh7ckjgv5n58bb82thpkngerjljkvtu2` (es el que usa better-auth y el
  `serverClientId` de la app nativa).
- Cliente **Android**: `651974862711-r931sjeqed5lprvmnasogcicm0iua5hk`, para
  `pro.verpelis.app.native` con el SHA-1 de release de §4. No aparece en el repo: vive en GCP.
- **App de celular (`pro.verpelis.app.native`):** selector de cuentas nativo de Credential Manager
  (hoja del sistema, sin navegador ni barra de direcciones) con el ID token verificado en el servidor
  (`/api/app-auth/google/nonce` + `/api/app-auth/google/id-token`, #123). Respaldo: Custom Tab +
  código de un solo uso con PKCE (`/app-auth/google` → `/api/app-auth/exchange`, #118).
- La TV no usa Google: QR o correo/contraseña.

### Recuperar contraseña (web)

- `/login` → «¿Olvidaste tu contraseña?» → `/recuperar` (correo) → correo con enlace
  `${SITE_URL}/restablecer?token=…` → `/restablecer` (nueva contraseña + confirmación).
- Better Auth nativo (`emailAndPassword.sendResetPassword`): el token vence en 1 h, solo sirve una vez,
  al cambiar la contraseña se cierran las demás sesiones. Respuesta genérica (no revela si el correo existe).
  Límite: 3 solicitudes/min y 5 intentos de cambio/min por IP (rateLimit de Better Auth, en producción).
- Envío: `packages/db/src/lib/mailer.ts` (API de Resend). Variables: `RESEND_API_KEY` (obligatoria en
  producción), `EMAIL_FROM` (opcional, por defecto `Pelis <no-reply@verpelis.pro>`), `SITE_URL` para el
  enlace. Sin clave fuera de producción, el enlace se escribe en la consola del servidor.
- La TV (web `tv-login-screen`) muestra «Para recuperar tu contraseña entra a verpelis.pro/recuperar».
  La app nativa de TV aún no lo muestra.

## 7. Formato de vídeo (OBLIGATORIO)

Toda película se sirve como **HLS multicalidad**:

- Peldaños **1080p / 720p / 480p / 360p** en subcarpetas `v1080/ … v360/` y un `master.m3u8` en la
  carpeta-token, junto al `playlist.m3u8` original. **Nunca se borra lo que ya existe** (original,
  segmentos, subtítulos).
- Vídeo **H.264 8 bit yuv420p**. Audio **AAC-LC estéreo 48 kHz**, 128k (1080/720) o 96k (480/360).
- **Keyframes cada 2 s alineados** entre peldaños; **segmentos de 4 s**.
- libx264 `veryfast`, **CRF 21** con tope VBV: **5M / 2,8M / 1,2M / 0,7M**.
- `BANDWIDTH` del master **medido de los segmentos** (pico × 1,1, más `AVERAGE-BANDWIDTH`), y
  **480p listado primero** (por Safari/AVPlayer).
- **Se mantiene 360p** porque la subida de casa es de unos 150–220 KB/s.
- **Reproductores:** buffer por defecto (hls.js `maxBufferSize` 60 MB, no 180 MB; ExoPlayer sin
  LoadControl propio), `capLevelToPlayerSize`, selector de calidad y **sin precargar segmentos
  extra**: poco ancho de banda y equipos (Fire TV, TV boxes) con poca RAM.
- **HEVC no reproduce en Chrome**: por eso GOAT fallaba antes.
- Scripts: `scripts/transcode-abr.sh` (reanudable, `nice`/`ionice`, lock por token) y
  `scripts/media-inventory.sh` (inventario de solo lectura). Detalle: `docs/TRANSCODE-ABR.md`.
- El resolver prefiere `master.m3u8` > `playlist.m3u8` > `index.m3u8`
  (`apps/web/src/lib/movie-stream-paths.ts`) y busca en los dos discos (`MOVIE_OUTPUT_ROOTS`:
  Pelis-A y Pelis-B). **La DB no guarda rutas absolutas.**

### Cola de la biblioteca completa

- Corre en Movies: `/home/det/Desktop/PELIS/abr-pilot-2026-10-18/queue.sh` (una película a la vez,
  usa la copia `transcode-abr.sh` de esa carpeta). **No la toques.** Iniciada 2026-10-18 ~14:22
  (UTC-5), **144 películas**.
- **Progreso: `abr-pilot-2026-10-18/queue-status.txt`.** Se para sola si un disco baja de **30 GB**
  libres (reanudable).
- Fin estimado: el dueño estimó ~sáb 2026-10-24; el `queue-status.txt` del 2026-10-18 ~20:15
  (UTC-5) decía 5/144 hechas y ETA ~2026-10-25 21:00 (UTC-5). Mira el archivo, no esta fecha.
- Antes de la cola se movieron **29 carpetas-token de Pelis-A a Pelis-B** (`move.log`) para que
  cupiera la escalera.
- Hay un informe diario de progreso a las 8:00 fuera del repo; el dato fuente es `queue-status.txt`.
- Piloto (GOAT, The Wrecking Crew, Leviticus): ver `docs/TRANSCODE-ABR-PILOT-2026-10-18.md`.

| Película          | Fuente         | Duración  | Tiempo   | Velocidad | Total escalera |
| ----------------- | -------------- | --------- | -------- | --------- | -------------- |
| GOAT              | HEVC 1918×802  | 99,7 min  | 56,6 min | 1,76×     | 5,9 GB         |
| The Wrecking Crew | H.264 1920×800 | 124,3 min | 70,2 min | 1,77×     | 6,3 GB         |
| Leviticus         | HEVC 1920×800  | 88,0 min  | 44,6 min | 1,97×     | 2,6 GB         |

## 8. nginx `secure_link`

- Plan completo en `docs/HLS-NGINX-PLAN.md`. **Decisión: no por ahora.** Node gasta ~0,2 % de un
  núcleo sirviendo vídeo a la velocidad de subida actual; el cuello de botella real es la subida.
- Revisar si la subida mejora mucho o hay muchos espectadores a la vez. El despliegue iría detrás
  del flag `HLS_SIGNED_SEGMENTS` (por defecto apagado), con rollback inmediato.

## 9. Anime

- Fuentes actuales: reproductores **iframe** (`embed`, VidNest por defecto). Episodios desde
  `api.ani.zip`. Detalle: `docs/ANIME-PROVIDERS.md`.
- **Consumet se probó y está APAGADO.** Se levantaron los servicios `consumet` y `redis` de
  `docker-compose.yml`, pero ningún proveedor útil devolvió HLS (2026-10-18). Se apagaron, y
  `CONSUMET_API_URL` está comentada en el `.env` de producción. Las definiciones de compose se
  conservan. Para reactivar (solo si el dueño lo pide):
  `docker compose -p pelis-original -f docker-compose.yml up -d redis consumet`
  y descomentar `CONSUMET_API_URL` + restart de `pelis-web`.
- `ANIME_CONSUMET_HLS` apagado; hay **circuit breaker** por proveedor (#146).
- En la TV, si no hay fuente nativa, el anime muestra rápido el mensaje de «solo reproductor web»
  (`nativeOnly`, una sola búsqueda, #142/#145).
- La doble búsqueda en la web se arregló (#129). `anime.listSeries` está paginado
  (`limit`/`offset`, #152).

## 10. Arreglos de reproducción (PR #127–#133)

- Películas ya no precargan 3 segmentos extra (#127).
- TV en vivo: sin doble decode de URLs firmadas, timeout de inactividad en el proxy, recuperación con
  backoff, MPEG-TS marcado como no soportado (#128).
- Anime: una sola búsqueda, un stall ya no descarta el segmento, fallback al iframe de VidNest,
  numeración de Part 2, presupuesto de 25 s (#129).
- Buffer 60 MB, `capLevelToPlayerSize`, selector de calidad, preferir `master.m3u8` (#130).
- La UI deja pasar a ADMIN y los errores dicen la causa real (401/403/404/503/red) (#131).
- TV nativa con Media3 (#133).

## 11. Diseño

- Estilo **Maison Noir** (`DESIGN.md`): casi negro (`#0B0B0D`), serif de display (Fraunces) + sans
  de cuerpo (Outfit), oro e ivory contenidos, **anillo de foco dorado en TV**. Tokens `cinema-*`
  (no renombrar).
- **Stitch:** proyecto «PELIS Rediseño», id `5429531514682483752`. Acceso por la API MCP
  `https://stitch.googleapis.com/mcp` con la cabecera `X-Goog-Api-Key`; la key es la variable de
  entorno `STITCH_API_KEY` de la caja del agente. **Nunca la imprimas ni pongas su valor en ningún
  sitio.** Copias exportadas: `/home/det/Desktop/PELIS/stitch-export/` (Movies) y
  `/workspace/stitch-export/` (caja), con la auditoría `tv-audit.md`.
- **Regla:** cada pantalla de Stitch se implementa en su página real y con datos reales, no solo sus
  colores.

### Pantallas clave

| Pantalla                                 | Stitch id                          |
| ---------------------------------------- | ---------------------------------- |
| TV login (actual, estilo Netflix, 1.9.0) | `0e67b58f9e0f425fb7d8371c664dd76e` |
| TV login original (1.6.0, reemplazado)   | `fe4203145f55480985b6537208384423` |
| /inicio escritorio                       | `a88c6357100b4915b1cd1231f5c7d6d1` |
| /inicio móvil                            | `4fda206284294397a3f4e2f0b1fc9c91` |
| /descargas escritorio                    | `22b4164e91fc46af94d944057d5821b2` |
| /descargas móvil                         | `30c6f0ec381e415fbe99f961e83b2448` |

### TV 2.0: auditoría Stitch vs app (de `tv-audit.md`)

| Stitch id                                                                                                                                                                                                                   | Pantalla                                 | Estado en 2.0.0 (11)                   | Notas / desvíos deliberados                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| (compartido)                                                                                                                                                                                                                | Menú lateral (nav rail)                  | Aplicado                               | Logo P; Buscar, Inicio, Películas, Series, Anime, TV en vivo, Mi lista; Perfil y Ajustes abajo |
| (compartido)                                                                                                                                                                                                                | Cabecera + reloj, barra de ayudas        | Aplicado                               | Contadores reales; sin chip de «sync»                                                          |
| `1b6f23d89a0540d7876dc3ff2da3573d`                                                                                                                                                                                          | Inicio                                   | Aplicado                               | Destacado + «Continuar viendo» + filas                                                         |
| `aee79b6e1e904f209ab9c70888fda900`                                                                                                                                                                                          | Catálogo Películas                       | Aplicado                               | Cuadrícula con chips de género, páginas de 48                                                  |
| `5c7e631bcd1c4d2ebf3f53cf7d91119e` / `b660eeef6e4845daac2109218b712f9b`                                                                                                                                                     | Catálogo Series                          | Aplicado                               | Igual                                                                                          |
| `b84216a113c94172b34f6683e63473e3`                                                                                                                                                                                          | Catálogo Anime                           | Aplicado                               | Paginado con `anime.listSeries` limit/offset                                                   |
| `1fb8bacf8e784182a6a2fd38c017fb23`                                                                                                                                                                                          | Detalle película                         | Aplicado                               | Continuar / Desde el inicio / Mi lista, «Más como esto»; sin tráiler ni audio (no hay datos)   |
| `7d22d78fef014582b1617e55bfdf603c` / `870e8934b7a94c13a7424fc452f737dd`                                                                                                                                                     | Detalle anime                            | Aplicado                               | Temporadas + episodios; sin Mi lista (favoritos solo películas/series)                         |
| `0be4fc5a2fe04c67801cb30147dcae34` / `ae2eb3fe7621490fbda48d28ed0b2dfe` / `fcbba3f8fbc04791a6620c6f39342beb`                                                                                                                | Búsqueda                                 | Aplicado                               | Teclado en pantalla A–Z/Ñ/0–9, chips por tipo                                                  |
| `254ae81557e94093af8a7763cd8cae53` / `7dee60c1de674426af355f7f3d8eba13` / `4771e44827cf4dbcb3cba6b6b932a103`                                                                                                                | TV en vivo                               | Aplicado (por decisión)                | Por categoría, **sin EPG** (no hay fuente de datos)                                            |
| `772d7668aa524237b7fcb3fbd9a9af8d`                                                                                                                                                                                          | Reproductor                              | Aplicado (por decisión)                | Capa de info que se oculta a los 5 s                                                           |
| `aa7cae10733f49028d1d688bc89a511a`                                                                                                                                                                                          | Ajustes                                  | Aplicado                               | Sonidos, Conexión (real), Cuenta, Acerca de                                                    |
| `df063e4d15f742e7b9e6602efdb8032d`                                                                                                                                                                                          | Mi lista                                 | Aplicado                               |                                                                                                |
| `da0e4a251f334957a7b5f0810e6ce3d0`                                                                                                                                                                                          | Historial                                | Aplicado                               | Quitar y Borrar historial (doble confirmación)                                                 |
| `8300361b528145d7b3e1adf3ac53e20a`                                                                                                                                                                                          | Perfil                                   | Aplicado                               | Plan en solo lectura + QR a la web                                                             |
| `53d81dad4f6147288cfa7a81c54b64d2`                                                                                                                                                                                          | TV Vinculado                             | Aplicado                               | «Hola, {nombre}», sigue sola a los 10 s                                                        |
| `0e67b58f9e0f425fb7d8371c664dd76e`                                                                                                                                                                                          | Login                                    | Aplicado (1.9.0)                       | QR a `/link-tv`, no `/tv`                                                                      |
| `aa4523770c8746169e8bac8d60c10b0f`                                                                                                                                                                                          | Error de carga                           | Aplicado parcial (por decisión, 1.9.0) | Sin botón de caché ni copy inventado                                                           |
| `39c9a65017614fd4a067baec3324932a` / `757bac6f9b42486bb3e1d01064022e22`                                                                                                                                                     | Logins viejos                            | Reemplazados                           |                                                                                                |
| `37c48cb8b3b1438da5c0c78e923075a7` / `9872c1322e244029bb9b909e7919b1db` / `326edd9df0734d489255ab26f6230b12` / `e0a4efc7051a49f6815d9855df085b90` / `48ea81432622429a89e0efd99d35191d` / `a2984505e1ed4637a12b054cf177a364` | Planes, cancelación, suscripción exitosa | No aplicado (por decisión)             | Pagos solo web                                                                                 |

### Estructura de TV 2.0

Menú lateral → Inicio (destacado + Continuar viendo) → catálogos Películas / Series / Anime con
chips de género → ficha con «Más como esto» y episodios → búsqueda con teclado en pantalla → TV en
vivo por categoría (sin EPG) → Mi lista → Historial → Perfil → Ajustes → TV Vinculado → pantalla de
error compartida (`TvLoadError`) y barra de ayudas (`TvHintBar`).

- **Logo TV:** P dorada sobre `#0B0B0D`, generado con `apps/android-tv/branding/gen-logo.py`;
  banner en `apps/android-tv/app/src/main/res/drawable-xhdpi/tv_banner.png` (320×180).
- **Poca RAM:** imágenes dimensionadas (Coil + `/_next/image`), sin blur ni animaciones pesadas,
  listas lazy, como mucho una imagen de fondo por pantalla. 2.0.0 midió ~88 MB de PSS total en el
  emulador (Java heap 13,3 MB, native heap 41,7 MB).

## 12. Entorno de pruebas en Movies

- Emuladores (AVD): `pelis_phone_redesign` (emulator-5560) para celular y `pelis_tv_redesign`
  (emulator-5562, 1920×1080) para TV. También existen `pelis_phone` (5558) y `pelis_tv` (5556).
- Cuenta QA: `pelis.qa@verpelis.pro` (rol ADMIN). La clave está en
  `/home/det/Desktop/PELIS/aside-2026-10-03/qa-login.txt` (no la copies a ningún lado).
- Cuenta QA de TV: `pelis.qa.tv@verpelis.pro` (suscripción ACTIVE hasta 2027-10-19). Clave solo en
  `~/.pelis-secrets/qa-tv-pass` (600). No cambies la clave de `pelis.qa@verpelis.pro`.
- Arrancar: `EMU_MAX_MIN=30 scripts/emu-run.sh pelis_tv`; parar: `scripts/emu-stop.sh`.
- `adb exec-out screencap` en el emulador sin ventana a veces devuelve el fotograma anterior:
  captura dos veces y quédate con la segunda.

### Deploy (desde 2026-10-19)

`scripts/deploy-prod.sh` falla con exit 1 si el build queda sin `.next/BUILD_ID`, si `sudo -n systemctl
restart pelis-web` falla, si localhost no da 200 o si algún CSS enlazado no da 200. Corre en su propio
scope systemd. `det` tiene sudo sin contraseña.

## 13. Problemas conocidos y pendientes

- Series en las apps nativas: en el servidor solo existe el episodio 1.
- El canal «13 Kids» devuelve 404 en su origen.
- Algunos elementos del historial de QA muestran ids crudos como título.
- **Rotar la key de TMDB** y sacarla de los 7 scripts (acción del dueño).
- `tv-app-version.json` commiteado en el repo está viejo (1.2.0 (3)).
- Worktrees sobrantes en Movies (`/home/det/Desktop/PELIS/pelis-*-wt`, `worktrees/*`): limpiar
  cuando el dueño lo apruebe (no borrar `worktrees/tv2` mientras siga 2.0.1).
- Sin decidir: añadir las APK nativas (`pelis-nativo.apk`, `pelis-tv-nativo.apk`) a `/descargas`.
  Hoy están publicadas en `public/downloads/` pero `/descargas` solo enlaza `pelis.apk` y
  `pelis-tv.apk`.
- Canales XTOTV y FunBox son MPEG-TS: marcados como no soportados (#128).
- `api.ani.zip` a veces falla el DNS en Movies (router 192.168.0.1 con DNSSEC).
- TV 2.0.1 (12) en curso: PR #156.

## 14. Discrepancias encontradas al verificar (2026-10-18)

- La ETA de la cola ABR en `queue-status.txt` (~2026-10-25 21:00 UTC-5) es posterior a la que tenía
  el dueño (~sáb 2026-10-24). La cola sigue, mira el archivo.
- `docs/TRANSCODE-ABR.md` hablaba de ~105 KB/s de subida; la medición del piloto fue 150–220 KB/s.
  Las dos cifras dicen lo mismo: 360p es el único peldaño que cabe en tiempo real con un espectador
  remoto.
- El piloto recomendaba probar `maxrate 600k` en 360p y CRF 23; la cola usa los valores por defecto
  del script (CRF 21, 360p a 0,7M), que son los de §7.
- Consumet: además de los proveedores caídos, AnimeUnity (italiano) sí respondía; no sirve para el
  catálogo en español.
- Los contenedores `consumet` y `redis` ya no existen en `docker ps -a` (no solo están parados).
