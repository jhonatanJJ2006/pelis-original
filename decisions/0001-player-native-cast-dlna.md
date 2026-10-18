# 0001 — Player propio HTML5 + hls.js + Cast/AirPlay

- **Status:** decided — revisada el 2026-10-17 contra `staging`
- **Date:** 2026-10-17
- **Deciders:** equipo Pelis

## Context

La web en producción ya reproduce HLS con `@pelis/ui/features/video-player` (hls.js 1.6.16,
config VOD para el túnel de casa, prefetch de fragmentos, manejo de HEVC, reanudar, gestos y
cromo Maison Noir). Lo que falta es segunda pantalla (Chromecast/AirPlay) y navegación con mando
de TV desde el navegador/TWA. Las apps Android usan Media3 nativo y no dependen de esto.

## Options considered

1. **Custom HTML5 + hls.js + Cast/AirPlay + mando TV** — reproductor web propio con PiP,
   subtítulos, velocidad, atajos de teclado y progreso por callback.
2. **Custom HTML5 + hls.js** — sin segunda pantalla.
3. **Custom HTML5 + DRM (Widevine/PlayReady)** — requiere servidor de licencias.
4. **Player + navegación TV-first** — foco, flechas, layout para tele.

## Decision

Opción 1, con la navegación por mando de la opción 4, como **paquete aditivo**
`packages/player/`. No reemplaza ni depreca el reproductor de `@pelis/ui` mientras no tenga
paridad con sus fixes de producción. Sin DRM.

## Consequences

- `packages/player/`: componente React, integración hls.js (lazy), Chromecast (CAF, lazy),
  AirPlay / Remote Playback API, `attachRemote` para teclado y mando, throttle de progreso.
- El progreso se persiste vía callback (`onProgress`) contra la API de historial de `@pelis/db`;
  el paquete no conoce la capa de datos.
- Integración en `apps/web` como trabajo posterior, detrás de un flag, pasando
  `createVodHlsConfig()` y portando el manejo HEVC.
- Chromecast necesita URLs de stream accesibles sin cookies (las rutas `/api/stream*` exigen
  sesión): URLs firmadas o receptor propio antes de activarlo.
- DLNA/UPnP real no es posible desde un navegador; se delega en AirPlay / Remote Playback.
- Si llega contenido con DRM, reevaluar.
