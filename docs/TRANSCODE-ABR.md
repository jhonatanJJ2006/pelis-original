# HLS multicalidad (ABR): `scripts/transcode-abr.sh`

Convierte la rendición única de una película (carpeta-token en los discos externos) en una
escalera ABR H.264 dentro de la **misma** carpeta-token, sin tocar lo que ya existe.

## Por qué

- Cada película tenía **una** rendición. Varias (las de Telegram) son HEVC: Chrome/Chromium y muchos
  Android/TV no las decodifican (`MediaSource.isTypeSupported('…hvc1…')` = `false` en Chromium
  headless). GOAT nunca reprodujo.
- La subida de casa es ~105 KB/s (≈0,85 Mbps) por el túnel de Cloudflare: un segmento de 10 s a
  1080p (4,4 MB) tardaba ~42 s. Con ABR el reproductor baja a 480p/360p en vez de quedarse cargando.
- La web (hls.js, `capLevelToPlayerSize`, menú de calidad) y la TV (ExoPlayer adaptativo + menú)
  ya entienden `master.m3u8`, y el resolver lo prefiere (`master.m3u8` > `playlist.m3u8` > `index.m3u8`,
  `apps/web/src/lib/movie-stream-paths.ts`).

## Layout resultante

```
/run/media/det/Pelis-A/output/<token>/<token>/
  playlist.m3u8, 000.ts …            # original: NO se toca
  playlist_vtt.m3u8, playlistN.vtt   # subtítulos: NO se tocan
  v1080/index.m3u8, 00000.ts …, .complete
  v720/ …   v480/ …   v360/ …
  master.m3u8                        # se escribe el último (tmp + mv)
```

El resolver devuelve `/api/stream/<token>/<token>/master.m3u8`; `rewriteM3u8Manifest` ya reescribe
las rutas relativas `v720/index.m3u8` y sus segmentos a `/api/stream/…`. **No hace falta cambiar la
DB**: la web y la TV llaman primero a `/api/stream/resolve`. (La app nativa de móvil,
`apps/android-native`, usa `movie.videoUrl` si existe, que apunta a `playlist.m3u8`: seguirá con la
rendición original hasta que cambie ese orden o se actualice `videoUrl`.)

## Uso

```bash
# en la máquina Movies, desde el checkout/worktree
scripts/transcode-abr.sh goat-2026                       # token (busca en MOVIE_OUTPUT_ROOTS)
scripts/transcode-abr.sh /run/media/det/Pelis-A/output/goat-2026
scripts/transcode-abr.sh goat-2026 --dry-run             # plan + comando ffmpeg
scripts/transcode-abr.sh goat-2026 --test-seconds 60 --out /tmp/abr-test   # prueba sin tocar el disco
scripts/transcode-abr.sh goat-2026 --master-only         # reescribe master con los peldaños completos
scripts/transcode-abr.sh goat-2026 --input /ruta/original.mkv              # fuente original
scripts/transcode-abr.sh goat-2026 --rungs 1080,720,480  # sin 360p
```

Largo → siempre desacoplado y con log:

```bash
setsid nohup scripts/transcode-abr.sh goat-2026 > ~/abr-goat.log 2>&1 < /dev/null &
# o: systemd-run --user --unit abr-goat scripts/transcode-abr.sh goat-2026
```

Inventario de la biblioteca (solo lectura): `scripts/media-inventory.sh --titles titles.tsv --out inv.csv`.

## Parámetros de codificación

| Peldaño | Caja      | Perfil@nivel | CRF | maxrate / bufsize | Audio           |
| ------- | --------- | ------------ | --- | ----------------- | --------------- |
| 1080    | 1920×1080 | High@4.0     | 21  | 5 M / 10 M        | AAC-LC 2ch 128k |
| 720     | 1280×720  | High@3.1     | 21  | 2,8 M / 5,6 M     | AAC-LC 2ch 128k |
| 480     | 854×480   | Main@3.0     | 21  | 1,2 M / 2,4 M     | AAC-LC 2ch 96k  |
| 360     | 640×360   | Main@3.0     | 21  | 0,7 M / 1,4 M     | AAC-LC 2ch 96k  |

- libx264 `-preset veryfast`, `yuv420p` 8 bit, **CRF con tope VBV** (gasta menos en escenas fáciles;
  el tope garantiza el pico). Audio 48 kHz estéreo (5.1 → downmix `-ac 2`).
- GOP fijo de 2 s alineado entre peldaños: `-g/-keyint_min = round(2·fps)`, `-sc_threshold 0`,
  `-force_key_frames expr:gte(t,n_forced*2)`, GOP cerrado.
- Segmentos MPEG-TS de 4 s, `hls_playlist_type vod`, `independent_segments`.
  `-hls_init_time 2` (primeros segmentos más cortos) **no tiene efecto** en ffmpeg 8 con VOD
  (`hls_list_size 0`): probado, todos salen de 4 s. Un segmento de 4 s a 360p pesa ~300 KB.
- Un peldaño entra si la fuente llena ≥95 % de su caja en ancho **o** alto (un 1918×802
  cinemascope conserva su 1080p a 1918×802). Nunca se escala hacia arriba; fuente menor que 360p →
  un único peldaño a tamaño nativo.
- Una sola decodificación (`split`) para todos los peldaños.
- `master.m3u8`: `BANDWIDTH` = pico medido por segmento ×1,1, `AVERAGE-BANDWIDTH` = medio medido,
  `RESOLUTION`, `FRAME-RATE`, `CODECS` leídos con ffprobe de la salida. El primer peldaño listado es
  480p (`--start-rung`), que es por donde arrancan Safari/AVPlayer; hls.js y ExoPlayer eligen por
  ancho de banda estimado.
- `--subs` añade `playlist_vtt.m3u8` como `EXT-X-MEDIA SUBTITLES` (por defecto no: la web carga
  los subtítulos desde `movie.subtitleTracks` y saldrían duplicados).

## Seguridad / reanudación

- `nice -n 19` + `ionice -c3`; lock por token en `/tmp/transcode-abr-<token>.lock`.
- Salida en `<dir>/.abr-tmp/`; cada peldaño se valida (`#EXT-X-ENDLIST`, duración ±1 %/2 s respecto a
  la fuente, todos los segmentos presentes) y se publica con `mv` atómico a `v<N>/` con `.complete`.
- Reejecutar es seguro: salta peldaños completos y descarta un `.abr-tmp` interrumpido (solo
  contiene salida del script). `master.m3u8` solo se sobrescribe si lo generó este script.
- Revertir una película: `mv master.m3u8 master.m3u8.off` (el resolver vuelve a `playlist.m3u8`
  en el siguiente `resolve`; las playlists se cachean 300 s en el cliente).

## Hardware

Máquina Movies: Intel i5-4570 (Haswell, 4 núcleos, sin HT), iGPU HD 4600, 30 GB RAM, ffmpeg 8.0.1.
ffmpeg trae `h264_vaapi`/`h264_qsv`, pero **no hay driver VA-API** instalado (`i965-va-driver`), así que
VAAPI falla al inicializar y el script usa libx264. Instalar el driver es un cambio de sistema; además
el encoder H.264 de Haswell da peor calidad por bit que x264 veryfast, que es lo que más importa con
0,85 Mbps de subida. El script detecta y registra si VAAPI llega a estar disponible (`hw=`).

## Piloto 2026-10-18

Resultados en `docs/TRANSCODE-ABR-PILOT-2026-10-18.md`.
