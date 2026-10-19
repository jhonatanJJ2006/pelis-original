# Piloto ABR 2026-10-18

Script: `scripts/transcode-abr.sh` (PR #135). Máquina Movies, i5-4570 4C, libx264 `veryfast`
CRF 21 con tope VBV, `nice 19`/`ionice -c3`, con dos emuladores Android y Gradle compitiendo por CPU
(load ~15–19).

## Inventario (`/home/det/Desktop/PELIS/media-inventory-2026-10-18.csv`)

159 carpetas-token (87 en Pelis-A, 72 en Pelis-B), 287,6 h, 201 GB de rendición original.

| Campo   | Recuento                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------ |
| Vídeo   | h264 154, **hevc 5** (goat, leviticus, quieres-ser-mi-novia, socias-por-accidente, they-will-kill-you) |
| pix_fmt | yuv420p 159 (ningún 10 bit)                                                                            |
| Audio   | aac 159; estéreo 152, **5.1: 7**                                                                       |
| Altura  | ≥ 800 px (o ancho ≥ 1880): 76; 720 px: 41; resto 256–692 px                                            |
| master  | ninguno antes del piloto                                                                               |

`goat-2026-h264` es el intento antiguo (segmentos de ~14 s, sin alinear, no está en la DB): no se usa.

## Resultados

| Película (fuente)                           | Duración  | Peldaños         | Tiempo   | Velocidad | Tamaño por peldaño                                    |
| ------------------------------------------- | --------- | ---------------- | -------- | --------- | ----------------------------------------------------- |
| GOAT (HEVC 1918×802, AAC 2.0)               | 99,7 min  | 1080/720/480/360 | 56,6 min | 1,76×     | 2967 / 1607 / 805 / 519 MB (5,9 GB; original 2,46 GB) |
| The Wrecking Crew (H.264 1920×800, AAC 2.0) | 124,3 min | 1080/720/480/360 | 70,2 min | 1,77×     | 3255 / 1612 / 864 / 574 MB (6,3 GB; original 3,72 GB) |
| Leviticus (HEVC 1920×800, AAC 2.0)          | 88,0 min  | 1080/720/480/360 | 44,6 min | 1,97×     | 1283 / 658 / 374 / 262 MB (2,6 GB; original 2,38 GB)  |

`master.m3u8` de GOAT (bit/s medidos):

| Peldaño | Resolución | AVERAGE-BANDWIDTH | BANDWIDTH (pico×1,1) | CODECS                |
| ------- | ---------- | ----------------- | -------------------- | --------------------- |
| 480     | 854×358    | 1 124 350         | 1 808 350            | avc1.4d401e,mp4a.40.2 |
| 1080    | 1918×802   | 4 155 360         | 7 137 802            | avc1.640028,mp4a.40.2 |
| 720     | 1280×536   | 2 248 180         | 4 105 424            | avc1.64001f,mp4a.40.2 |
| 360     | 640×268    | 722 509           | 1 118 909            | avc1.4d401e,mp4a.40.2 |

Verificación GOAT:

- `ffprobe master.m3u8`: 4 programas H.264 + AAC, duración 5981,06 s = fuente; 1496 segmentos de 4 s
  por peldaño; keyframes cada 2,002 s.
- Producción, cuenta QA: `/api/stream/resolve?token=goat-2026` →
  `/api/stream/goat-2026/goat-2026/master.m3u8`. Primer/medio/último segmento de cada peldaño: 200
  (GET completo) y 206 (Range).
- hls.js 1.6 en Chromium headless: 4 niveles (268/358/536/802 px) y **reproduce** (arranca en 360p).
  Chromium no soporta HEVC (`isTypeSupported(hvc1…)` = false): por eso GOAT nunca reproducía.
- Sin cambios en la DB: `videoUrl` sigue en `playlist.m3u8`, pero la web y la TV resuelven por token
  primero. La app nativa de móvil usa `videoUrl` primero → seguirá con la rendición HEVC.

Verificación The Wrecking Crew y Leviticus (misma prueba que GOAT, 2026-10-18 ~19:50 UTC):

- `ffprobe master.m3u8`: duración 7456,4 s y 5279,0 s (= fuente); 1865 y 1320 segmentos por peldaño,
  iguales en los 4 peldaños.
- Producción, cuenta QA: `/api/stream/resolve` devuelve `…/master.m3u8` para los dos tokens; primer,
  medio y último segmento de cada peldaño: 206 (Range).
- hls.js en Chromium headless: 4 niveles (266/356/534/800 px) y reproduce en los dos (arranca en 360p).

| Película          | Peldaño | Resolución | AVERAGE-BANDWIDTH | BANDWIDTH |
| ----------------- | ------- | ---------- | ----------------- | --------- |
| The Wrecking Crew | 1080    | 1920×800   | 3 657 161         | 7 012 174 |
| The Wrecking Crew | 720     | 1280×534   | 1 808 486         | 4 033 013 |
| The Wrecking Crew | 480     | 854×356    | 966 381           | 1 802 468 |
| The Wrecking Crew | 360     | 640×266    | 640 062           | 1 109 275 |
| Leviticus         | 1080    | 1920×800   | 2 033 831         | 6 831 431 |
| Leviticus         | 720     | 1280×534   | 1 040 819         | 3 879 154 |
| Leviticus         | 480     | 854×356    | 589 594           | 1 798 746 |
| Leviticus         | 360     | 640×266    | 410 930           | 1 107 620 |

## Peldaño 360p

Con ~0,85 Mbps de subida (medido hoy por el túnel: 150–220 KB/s en descargas sueltas), solo 360p
(media 0,72 Mbps) cabe en tiempo real; 480p (1,1 Mbps) ya rebufferiza con un espectador remoto.
**Recomendación: mantener 360p** y, para la biblioteca completa, bajarle el tope a `maxrate 600k`
(media ~0,55 Mbps) y probar CRF 23 en todos los peldaños.

## Estimación biblioteca completa (155 películas restantes, 280,7 h)

> Actualización: se eligió la opción (c), mover 29 carpetas a Pelis-B, y se mantuvieron CRF 21 y
> 360p a 0,7M. La cola de 144 películas corre desde 2026-10-18 (ver `docs/TRANSCODE-ABR.md`).

- Tiempo: **~128 h de codificación (~5,3 días)** a la velocidad medida con la máquina cargada
  (escala por píxeles de salida; las fuentes de 720p y menores van más rápido). Sin los emuladores,
  probablemente ~25–30 % menos.
- Disco (CRF 21, escalera completa): **~790 GB**: Pelis-A ~430 GB (libres 228 GB → **no cabe**),
  Pelis-B ~360 GB (libres 731 GB → cabe).
- Opciones para Pelis-A: (a) para fuentes H.264 usar la rendición original como peldaño superior
  (no recodificar 1080p; ahorra ~50 % del espacio, pero sus segmentos de 10 s no están alineados con
  los demás), (b) CRF 23 + 360p a 600k, (c) mover tokens a Pelis-B (el resolver busca en ambos discos).
