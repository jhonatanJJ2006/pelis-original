# @pelis/player

Reproductor de video HTML5 propio para Pelis: hls.js (carga lazy) con fallback HLS nativo,
Chromecast, AirPlay / Remote Playback, Picture-in-Picture, subtítulos WebVTT, velocidad y
navegación con mando a distancia (D-pad, Enter, teclas Media\*).

Decisión: [`decisions/0001-player-native-cast-dlna.md`](../../decisions/0001-player-native-cast-dlna.md).

> **Estado:** paquete aditivo. La web en producción sigue usando
> `@pelis/ui/features/video-player` (fixes HLS de producción, HEVC, prefetch, reanudar, gestos y
> cromo Maison Noir). Este paquete todavía no está conectado a ninguna pantalla.

## Stack

- **HTML5 `<video>`**; archivos directos (`.mp4`) se asignan a `src`.
- **hls.js 1.6** cuando hay MSE (Chrome, Firefox, Edge, Android WebView). Recupera errores
  fatales de media (`recoverMediaError`) y de red (`startLoad`) antes de rendirse.
- **HLS nativo** (`application/vnd.apple.mpegurl`) en Safari/iOS/tvOS cuando no hay MSE.
- **Google Cast Web Sender (CAF)** cargado solo al pulsar Cast.
- **AirPlay** (`webkitShowPlaybackTargetPicker`) y **Remote Playback API** (`video.remote`).
  Un navegador no puede descubrir dispositivos DLNA/UPnP por sí mismo.
- **Teclado / mando** mapeado a acciones; no interfiere con botones ni inputs enfocados.

## Estructura

```
src/
├── Player.tsx    # componente principal
├── types.ts      # contratos públicos
├── hls.ts        # hls.js + fallback nativo
├── cast.ts       # Chromecast (CAF)
├── dlna.ts       # AirPlay / Remote Playback
├── remote.ts     # teclado y mando a distancia
├── progress.ts   # throttle de guardado de progreso
└── captions.ts   # ciclo de subtítulos y formato de tiempo
```

## Uso

```tsx
import { Player } from '@pelis/player';

<Player
  src="/api/stream/abc/master.m3u8"
  poster="/peliculas/foo.webp"
  title="Foo"
  autoPlay
  startAt={120}
  onProgress={(current, total) => saveHistory(current, total)}
  onError={(err) => console.warn(err.code, err.message)}
/>;
```

- `sourceType="hls"` fuerza HLS en endpoints sin extensión `.m3u8`.
- `hlsConfig` acepta config de hls.js; para paridad con la web se puede pasar
  `createVodHlsConfig()` de `@pelis/ui/features/video-player/hls-config`.
- `onProgress` se llama como mucho cada 5 s, una vez al llegar al 95 % y con la última posición
  al pausar, cambiar de fuente o desmontar.
- Tema: variables CSS `--pelis-player-bg`, `--pelis-player-surface`, `--pelis-player-border`,
  `--pelis-player-accent` y `--pelis-player-text` (por defecto Maison Noir).

## Compatibilidad

| Feature                                   | Soporte                                         |
| ----------------------------------------- | ----------------------------------------------- |
| HLS.js (Chrome, Firefox, Android WebView) | ✅                                              |
| HLS nativo (Safari, iOS, tvOS)            | ✅ fallback                                     |
| Chromecast                                | ⚠️ solo URLs accesibles sin cookies (ver abajo) |
| AirPlay (Safari)                          | ✅ selector del sistema                         |
| Remote Playback (Chrome Android)          | ⚠️ no con fuentes MSE/hls.js                    |
| Picture-in-Picture                        | ✅                                              |
| Mando a distancia / teclado               | ✅ flechas, Enter, Espacio, Media\*, M, F, C, K |
| Subtítulos WebVTT                         | ✅                                              |
| DRM (Widevine)                            | ❌ fuera de alcance (ADR 0001)                  |

## Limitaciones conocidas

- El receptor de Chromecast descarga el stream sin la sesión del usuario: `/api/stream`,
  `/api/tv/stream` y `/api/anime/stream` (protegidos por `denyUnlessStreamAccess`) necesitarán
  URLs firmadas de corta duración o un receptor propio antes de exponer Cast.
- Sin manejo de HEVC: la web actual detecta HEVC y elige alternativas; portar esa lógica antes de
  usar este paquete en producción.

## Tests

```bash
pnpm --filter @pelis/player test       # vitest (unit + components de este paquete)
pnpm --filter @pelis/player typecheck
```

## Pendiente

- Integrar en `/movies/[id]` y `/tv/[id]` detrás de un flag, reutilizando `hls-config`, HEVC y
  reanudar de `@pelis/ui`.
- URLs firmadas para Cast.
- E2E Playwright (`e2e/player.e2e.ts`).
