# PELIS nativo (Kotlin + Jetpack Compose)

Apps nativas que reemplazarán al contenedor TWA de `apps/android` (que se mantiene sin cambios hasta el reemplazo).

Módulos:

- `core`: cliente de la API (`/api/function/<nombre>`, better-auth y `tv-auth`), sesión con las mismas cookies que la web, tema Maison Noir, reproductor Media3 compartido (HLS, gestos, HUD, calidad y subtítulos) y lógica de gestos con tests.
- `phone`: app de celular (`pro.verpelis.app.native`). Login con correo y contraseña, o con Google: hoja de cuentas nativa del sistema (Credential Manager + Google Identity, `GetGoogleIdOption` y, sin cuentas, `GetSignInWithGoogleOption`). La app pide `POST /api/app-auth/google/nonce` (nonce de un solo uso + client id OAuth WEB), obtiene un ID token de Google con ese `serverClientId` y nonce, y lo envía a `POST /api/app-auth/google/id-token`, que verifica firma (JWKS de Google), `iss`, `aud` = client id web, `exp`, nonce y `email_verified`, y crea la sesión igual que el canje del código. **Requisito en Google Cloud** (mismo proyecto que el client id web): un cliente OAuth tipo *Android* para `pro.verpelis.app.native` con el SHA-1 de la clave de release; sin él Google no entrega el token. Respaldo automático (sin Google Play services, sin cuentas o sin ese cliente): flujo web en Custom Tab: `/app-auth/google` hace el flujo web de Google y vuelve por `pro.verpelis.app://auth/callback` con un código de un solo uso (2 min, atado a state + PKCE) que la app canjea en `POST /api/app-auth/exchange`. Inicio, Buscar (películas, series, géneros), Anime, TV en vivo, detalle, Mi lista, Historial, Perfil y Planes (el pago abre el checkout web).
- `tv`: app Android TV (`pro.verpelis.tv.native`) con Compose for TV, entrada `LEANBACK_LAUNCHER`, foco D-pad (escala 1.1, borde dorado 3 dp), vinculación por código o QR y reproductor controlado con D-pad.

Endpoints propios de la app en `apps/web`: `/api/app-auth/google/nonce` y `/api/app-auth/google/id-token` (login nativo con Google), `/app-auth/google`, `/api/app-auth/google/complete` y `/api/app-auth/exchange` (respaldo web); el resto usa rutas existentes.

## Compilar

```
export JAVA_HOME=/ruta/a/jdk-17
echo "sdk.dir=/ruta/a/android-sdk" > local.properties
./gradlew :core:testDebugUnitTest :phone:assembleDebug :tv:assembleDebug
```

APKs: `phone/build/outputs/apk/debug/phone-debug.apk` y `tv/build/outputs/apk/debug/tv-debug.apk`.

## Reproductor

- Celular: se abre siempre horizontal y en pantalla completa. Arrastre vertical en la mitad izquierda ajusta el brillo (atributos de ventana) y en la mitad derecha el volumen (AudioManager), solo en pantalla completa. HUD horizontal arriba al centro. Carga con indicador dorado sobre fondo no negro.
- TV: controles de PlayerView con D-pad.
- Fuente: con token se llama primero a `/api/stream/resolve?token=<token>` (igual que la web y `apps/android-tv`), que devuelve el `master.m3u8` multicalidad cuando existe; `videoUrl` solo es respaldo si el resolver falla o no responde (401/403 no hacen respaldo). URLs externas se reproducen directo. Lógica en `core/.../data/StreamResolution.kt` con tests.
- HLS adaptativo con el buffer por defecto de ExoPlayer (sin precarga extra). Calidad: "Automática (nivel actual)" o una altura fija (1080p/720p/480p/360p) por selección de pistas.

## Pendiente

- Empaquetar las fuentes Fraunces e Inter (por ahora Serif y SansSerif del sistema).
- Íconos y banner definitivos, firma de release y actualización in-app (apk-update).
- Selector de episodios de series y temporadas; anime solo con fuentes HLS (las de tipo embed no se reproducen en nativo).
- Ajuste fino pantalla por pantalla contra los diseños de Stitch.
