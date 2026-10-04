# Pelis TV (`pro.verpelis.tv`)

App nativa **Compose for TV**. Fuentes reales en `app/src/` (trackeadas en git).

El APK de distribución `apps/web/public/downloads/pelis-tv.apk` se decompiló con jadx (`LoginScreen`, `HomeScreen`, `NavGraph`, `PelisApiClient`, Maison Noir). Este árbol es esa app **reconstruida en Kotlin limpio** y cableada al pairing de `@pelis/db`.

El QR del APK original era un stub (`PROXIMAMENTE` + código local aleatorio). Aquí el login split estilo Netflix habla con `/api/tv-auth/*`.

## Requisitos

- JDK 17+
- Android SDK 35 + Build-Tools
- Un Android TV / emulador `tv_1080p` (API 24+)

Variables Gradle (opcional, runtime Movies local):

```bash
# emulador → Next en la misma máquina
./gradlew :app:assembleDebug -PpelisApiBase=http://10.0.2.2:3000/

# tele en la LAN → Movies
./gradlew :app:assembleDebug -PpelisApiBase=http://192.168.x.x:3000/
```

Por defecto `https://verpelis.pro/`.

## Build / instalar

```bash
cd apps/android-tv
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

APK de release (firmar aparte; no commitear keystores):

```bash
./gradlew :app:assembleRelease
```

Package: `pro.verpelis.tv`. `versionCode` 4 / `1.3.0`.

## Auth nativa (v3)

Además del QR (`/api/tv-auth/*`), el panel izquierdo ofrece **Iniciar sesión** y **Registrarse** vía Better Auth:

- `POST api/auth/sign-in/email` / `sign-up/email`
- Tras registro: OTP `api/auth/email-otp/send-verification-otp` + `verify-email`, luego re-login
- Cookie prod: `__Secure-better-auth.session_token` (CookieJar + Bearer opcional)
- Sin Google OAuth en TV nativa

Base URL por defecto: `https://verpelis.pro/`.

## Arranque en frío y pairing

1. Sin sesión → login split (panel izquierdo + QR/código).
2. En el celular (sesión Pelis): `https://verpelis.pro/link-tv` o el QR (`/link-tv?code=`).
3. La tele hace poll + `POST /api/tv-auth/claim` y guarda cookie/token Better Auth.
4. Con sesión → home de **canales en vivo** + filas de películas/series/anime.

## Modal de update

En cualquier pantalla (login o home), compara `BuildConfig.VERSION_CODE` con `GET /api/app/availability` (`tvApkVersionCode`). El aviso sale solo si el código del servidor es mayor y el APK está publicado. **Actualizar** descarga `downloads/pelis-tv.apk` y lo entrega al instalador del sistema (`ACTION_VIEW`); no se instala en silencio. Si hace falta, pide el permiso de orígenes desconocidos. **Más tarde** silencia esa versión. D-pad: los dos botones se quedan con el foco.

## Cómo probar en la tele

1. Cold open sin sesión → login Netflix + QR visible (no “PROXIMAMENTE”).
2. Aprobar desde el celular en `/link-tv` → la tele entra a canales.
3. Subir `tv-app-version.json` por encima del `versionCode` instalado → modal Actualizar / Más tarde (instalador del sistema).
4. Home: filas de catálogo + canales. Scroll D-pad sin refetch de todas las categorías (máx. 8 extra, 3 en paralelo, 24 ítems/fila).
5. Reproductor de canal: `/api/tv/stream/{id}` (exige plan, igual que la web).

## Qué no copiar de `apps/android/`

`apps/android/app/` está gitignorado (TWA Bubblewrap). **No** aplicar ese patrón aquí: `apps/android-tv/app/src` debe ir al repo. Solo se ignoran `.gradle/`, `build/`, `local.properties` y APKs generados.
