#!/usr/bin/env bash
# transcode-abr.sh — genera HLS multicalidad (ABR) dentro de la MISMA carpeta-token.
#
# Uso:
#   scripts/transcode-abr.sh <token | carpeta-token> [opciones]
#
# Opciones:
#   --rungs 1080,720,480,360  Peldaños candidatos (solo se usan los <= fuente). Defecto: 1080,720,480,360
#   --input FICHERO           Fuente alternativa (p. ej. el .mkv original) en vez de la playlist actual
#   --preset P                Preset libx264 (defecto: veryfast)
#   --crf N                   CRF con tope VBV (defecto: 21)
#   --start-rung N            Peldaño listado primero en master.m3u8 (defecto: 480; Safari arranca por él)
#   --subs                    Añade playlist_vtt.m3u8 (si existe) como EXT-X-MEDIA SUBTITLES en el master
#   --master-only             No codifica; solo (re)escribe master.m3u8 con los peldaños completos
#   --test-seconds N --out D  Prueba: codifica solo N s en el directorio D (no toca la carpeta-token)
#   --dry-run                 Muestra el plan y el comando ffmpeg, sin ejecutar
#
# Garantías:
#   - Nunca borra ni sobrescribe playlist.m3u8 / segmentos / subtítulos existentes.
#   - Cada peldaño se codifica en <dir>/.abr-tmp/ y se mueve (rename atómico) a <dir>/v<N>/ al validar.
#   - master.m3u8 se escribe al final (tmp + mv): el resolver (master > playlist > index) cambia
#     solo cuando todo está completo.
#   - Idempotente / reanudable: los peldaños con v<N>/.complete se saltan; un .abr-tmp a medias de
#     una ejecución interrumpida se descarta (solo contiene salida de este script).
#   - nice -n 19 + ionice -c3 para no quitar CPU/disco al servidor web.
# Ver docs/TRANSCODE-ABR.md.
set -euo pipefail

usage() { sed -n 2,25p "$0"; }

RUNGS="1080,720,480,360"
INPUT=""
PRESET="${ABR_PRESET:-veryfast}"
CRF="${ABR_CRF:-21}"
START_RUNG=480
WITH_SUBS=0
MASTER_ONLY=0
TEST_SECONDS=""
TEST_OUT=""
DRY_RUN=0
TARGET=""
SEG_TIME=4
KEY_INT_S=2
MASTER_MARK="## generado por scripts/transcode-abr.sh"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rungs) RUNGS="$2"; shift 2 ;;
    --input) INPUT="$2"; shift 2 ;;
    --preset) PRESET="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    --start-rung) START_RUNG="$2"; shift 2 ;;
    --subs) WITH_SUBS=1; shift ;;
    --master-only) MASTER_ONLY=1; shift ;;
    --test-seconds) TEST_SECONDS="$2"; shift 2 ;;
    --out) TEST_OUT="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "opción desconocida: $1" >&2; usage >&2; exit 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done
[[ -n "$TARGET" ]] || { usage >&2; exit 2; }
if [[ -n "$TEST_SECONDS" && -z "$TEST_OUT" ]]; then echo "--test-seconds requiere --out" >&2; exit 2; fi

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

command -v ffmpeg >/dev/null || die "ffmpeg no está instalado"
command -v ffprobe >/dev/null || die "ffprobe no está instalado"

# --- Localizar la carpeta-token (misma lógica que apps/web/src/lib/movie-stream-paths.ts) ---
IFS=':' read -r -a ROOTS <<< "${MOVIE_OUTPUT_ROOTS:-/run/media/det/Pelis-A/output:/run/media/det/Pelis-B/output}"
if [[ "$TARGET" == */* ]]; then
  TOKEN_DIR="$(realpath "$TARGET")"
else
  TOKEN_DIR=""
  for r in "${ROOTS[@]}"; do [[ -d "$r/$TARGET" ]] && { TOKEN_DIR="$r/$TARGET"; break; }; done
  [[ -n "$TOKEN_DIR" ]] || die "token '$TARGET' no encontrado en ${ROOTS[*]}"
fi
TOKEN="$(basename "$TOKEN_DIR")"
# La playlist vive en <token>/<token>/ (layout actual) o en <token>/.
if [[ -d "$TOKEN_DIR/$TOKEN" ]]; then PDIR="$TOKEN_DIR/$TOKEN"; else PDIR="$TOKEN_DIR"; fi

if [[ -z "$INPUT" ]]; then
  for n in playlist.m3u8 index.m3u8; do [[ -f "$PDIR/$n" ]] && { INPUT="$PDIR/$n"; break; }; done
  [[ -n "$INPUT" ]] || die "sin playlist.m3u8/index.m3u8 en $PDIR (usa --input)"
fi
[[ -f "$INPUT" ]] || die "entrada no existe: $INPUT"

OUT_DIR="$PDIR"
[[ -n "$TEST_OUT" ]] && { OUT_DIR="$TEST_OUT"; mkdir -p "$OUT_DIR"; }

# --- Lock por token (evita dos ejecuciones simultáneas sobre la misma película) ---
LOCK="${TMPDIR:-/tmp}/transcode-abr-${TOKEN}.lock"
exec 9>"$LOCK"
flock -n 9 || die "ya hay otra ejecución sobre $TOKEN ($LOCK)"

# --- Sondeo de la fuente ---
FIRST="$INPUT"
if [[ "$INPUT" == *.m3u8 ]]; then
  seg="$(grep -v '^#' "$INPUT" | grep -m1 . || true)"
  [[ "$seg" = /* ]] || seg="$(dirname "$INPUT")/$seg"
  FIRST="$seg"
  SRC_DUR="$(awk -F'[:,]' '/^#EXTINF/{s+=$2} END{printf "%.3f", s}' "$INPUT")"
else
  SRC_DUR="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$INPUT")"
fi
vinfo="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,avg_frame_rate -of default=nw=1 "$FIRST")"
f() { sed -n "s/^$1=//p" <<< "$vinfo" | head -1; }
SRC_CODEC="$(f codec_name)"; SRC_PIX="$(f pix_fmt)"; SRC_W="$(f width)"; SRC_H="$(f height)"
FPS_FRAC="$(f r_frame_rate)"; [[ "$FPS_FRAC" == "0/0" || -z "$FPS_FRAC" ]] && FPS_FRAC="$(f avg_frame_rate)"
FPS="$(awk -F/ '{ if ($2>0) printf "%.3f", $1/$2; else print 24 }' <<< "$FPS_FRAC")"
GOP="$(awk -v f="$FPS" -v k="$KEY_INT_S" 'BEGIN{ printf "%d", f*k + 0.5 }')"
ainfo="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels -of default=nw=1 "$FIRST" || true)"
HAS_AUDIO=0; [[ -n "$ainfo" ]] && HAS_AUDIO=1
[[ -n "$SRC_W" && -n "$SRC_H" ]] || die "no se pudo leer la resolución de $FIRST"
[[ -n "$TEST_SECONDS" ]] && SRC_DUR="$TEST_SECONDS"

# Encoder: hardware solo si el dispositivo VAAPI funciona de verdad (en la máquina Movies, Haswell
# sin driver i965 instalado → libx264). Se informa; la codificación usa libx264 (calidad conocida).
HW="none"
if [[ -e /dev/dri/renderD128 ]] && ffmpeg -hide_banner -v quiet -init_hw_device vaapi=va:/dev/dri/renderD128 -f lavfi -i nullsrc=s=64x64:d=0.1 -vf format=nv12,hwupload -c:v h264_vaapi -frames:v 1 -f null - 2>/dev/null; then
  HW="vaapi-disponible"
fi

log "token=$TOKEN dir=$PDIR"
log "fuente: $SRC_CODEC $SRC_PIX ${SRC_W}x${SRC_H} @${FPS}fps dur=${SRC_DUR}s audio=$(tr '\n' ' ' <<< "$ainfo")"
log "encoder=libx264 preset=$PRESET crf=$CRF gop=$GOP (${KEY_INT_S}s) seg=${SEG_TIME}s hw=$HW"

# --- Escalera: nombre caja_w caja_h maxrate_k bufsize_k audio_k profile level ---
ladder() {
  case "$1" in
    1080) echo "1080 1920 1080 5000 10000 128 high 4.0" ;;
    720)  echo "720 1280 720 2800 5600 128 high 3.1" ;;
    480)  echo "480 854 480 1200 2400 96 main 3.0" ;;
    360)  echo "360 640 360 700 1400 96 main 3.0" ;;
    *) die "peldaño desconocido: $1" ;;
  esac
}

# Un peldaño entra si la fuente llena (≥95 %) su caja en ancho O alto: así un 1918x802
# (cinemascope) conserva su 1080p en vez de bajar a 720p. Nunca se escala hacia arriba.
declare -a PLAN=()
IFS=',' read -r -a WANT <<< "$RUNGS"
for r in "${WANT[@]}"; do
  read -r name bw bh _ <<< "$(ladder "$r")"
  if awk -v w="$SRC_W" -v h="$SRC_H" -v bw="$bw" -v bh="$bh" 'BEGIN{ exit !(w >= bw*0.95 || h >= bh*0.95) }'; then
    PLAN+=("$r")
  fi
done
# Fuente más pequeña que todos los peldaños: un único peldaño (el menor pedido) a tamaño nativo.
if [[ ${#PLAN[@]} -eq 0 ]]; then PLAN=("${WANT[-1]}"); fi

dims() { # caja → WxH que cabe sin agrandar, pares
  awk -v w="$SRC_W" -v h="$SRC_H" -v bw="$1" -v bh="$2" 'BEGIN{
    s = bw/w; if (bh/h < s) s = bh/h; if (s > 1) s = 1;
    ow = int(w*s/2 + 0.5)*2; oh = int(h*s/2 + 0.5)*2; print ow, oh }'
}

is_complete() { [[ -f "$OUT_DIR/v$1/.complete" && -f "$OUT_DIR/v$1/index.m3u8" ]] && grep -q '^#EXT-X-ENDLIST' "$OUT_DIR/v$1/index.m3u8"; }

TODO=()
for r in "${PLAN[@]}"; do
  if is_complete "$r"; then log "v$r ya completo → se salta"; else TODO+=("$r"); fi
done
log "plan: ${PLAN[*]} | pendientes: ${TODO[*]:-ninguno}"

# --- Codificación (una sola decodificación, split a N escalas) ---
TMP="$OUT_DIR/.abr-tmp"
if [[ $MASTER_ONLY -eq 0 && ${#TODO[@]} -gt 0 ]]; then
  if [[ -d "$TMP" ]]; then
    # Solo puede contener salida de una ejecución anterior de este script (protegida por el lock).
    log "descartando $TMP de una ejecución interrumpida"
    rm -rf -- "$TMP"
  fi
  fc="[0:v:0]split=${#TODO[@]}"; for i in "${!TODO[@]}"; do fc+="[s$i]"; done; fc+=";"
  maps=(); vsm=""
  for i in "${!TODO[@]}"; do
    read -r name bw bh maxk bufk ak prof lvl <<< "$(ladder "${TODO[$i]}")"
    read -r ow oh <<< "$(dims "$bw" "$bh")"
    fc+="[s$i]scale=${ow}:${oh}:flags=bicubic,setsar=1,format=yuv420p[o$i];"
    maps+=(-map "[o$i]")
    [[ $HAS_AUDIO -eq 1 ]] && maps+=(-map 0:a:0)
    maps+=(-c:v:$i libx264 -profile:v:$i "$prof" -level:v:$i "$lvl"
           -maxrate:v:$i "${maxk}k" -bufsize:v:$i "${bufk}k")
    [[ $HAS_AUDIO -eq 1 ]] && maps+=(-b:a:$i "${ak}k")
    if [[ $HAS_AUDIO -eq 1 ]]; then vsm+="v:$i,a:$i,name:${TODO[$i]} "; else vsm+="v:$i,name:${TODO[$i]} "; fi
    log "  v${TODO[$i]}: ${ow}x${oh} $prof@$lvl crf=$CRF maxrate=${maxk}k audio=${ak}k"
  done
  fc="${fc%;}"
  mkdir -p "$TMP"
  for r in "${TODO[@]}"; do mkdir -p "$TMP/v$r"; done
  limit=(); [[ -n "$TEST_SECONDS" ]] && limit=(-t "$TEST_SECONDS")
  cmd=(nice -n 19 ionice -c3 ffmpeg -hide_banner -nostdin -y -loglevel warning -stats_period 30 -stats
       -i "$INPUT" "${limit[@]}"
       -filter_complex "$fc" "${maps[@]}"
       -preset "$PRESET" -crf "$CRF"
       -g "$GOP" -keyint_min "$GOP" -sc_threshold 0
       -force_key_frames "expr:gte(t,n_forced*${KEY_INT_S})"
       -x264-params "open-gop=0"
       -c:a aac -ac 2 -ar 48000
       -max_muxing_queue_size 4096
       -f hls -hls_time "$SEG_TIME" -hls_playlist_type vod -hls_list_size 0
       -hls_flags independent_segments -hls_segment_type mpegts -start_number 0
       -hls_segment_filename "$TMP/v%v/%05d.ts"
       -var_stream_map "${vsm% }"
       "$TMP/v%v/index.m3u8")
  if [[ $DRY_RUN -eq 1 ]]; then printf '%q ' "${cmd[@]}"; echo; exit 0; fi
  t0=$(date +%s)
  "${cmd[@]}"
  t1=$(date +%s)
  log "ffmpeg terminó en $((t1 - t0)) s"

  # Validar y publicar cada peldaño (rename atómico dentro del mismo disco).
  for r in "${TODO[@]}"; do
    pl="$TMP/v$r/index.m3u8"
    grep -q '^#EXT-X-ENDLIST' "$pl" || die "v$r: sin #EXT-X-ENDLIST"
    d="$(awk -F'[:,]' '/^#EXTINF/{s+=$2} END{printf "%.3f", s}' "$pl")"
    awk -v a="$d" -v b="$SRC_DUR" 'BEGIN{ x=a-b; if (x<0) x=-x; exit !(x <= 2 || x/b <= 0.01) }' \
      || die "v$r: duración $d s no coincide con la fuente $SRC_DUR s"
    while read -r s; do [[ -s "$TMP/v$r/$s" ]] || die "v$r: falta segmento $s"; done < <(grep -v '^#' "$pl" | grep .)
    printf '{"token":"%s","rung":"%s","encodedSeconds":%s,"durationS":%s,"preset":"%s","crf":%s,"at":"%s"}\n' \
      "$TOKEN" "$r" "$((t1 - t0))" "$d" "$PRESET" "$CRF" "$(date -u +%FT%TZ)" > "$TMP/v$r/.complete"
    if [[ -e "$OUT_DIR/v$r" ]]; then
      # No debería pasar (solo se publica tras validar); se aparta en vez de borrar.
      mv -- "$OUT_DIR/v$r" "$OUT_DIR/v$r.stale-$(date +%s)"
    fi
    mv -- "$TMP/v$r" "$OUT_DIR/v$r"
    log "v$r publicado ($(du -sh "$OUT_DIR/v$r" | cut -f1))"
  done
  rmdir -- "$TMP" 2>/dev/null || true
fi

# --- master.m3u8 (al final, tmp + mv) ---
codecs_for() { # carpeta → CODECS RFC 6381 leído del primer segmento
  local seg p l a
  seg="$1/$(grep -v '^#' "$1/index.m3u8" | grep -m1 .)"
  # MPEG-TS lista el stream dos veces (programa + streams): nos quedamos con la primera aparición.
  local info; info="$(ffprobe -v error -select_streams v:0 -show_entries stream=profile,level -of default=nw=1 "$seg")"
  p="$(sed -n 's/^profile=//p' <<< "$info" | head -1)"; l="$(sed -n 's/^level=//p' <<< "$info" | head -1)"
  case "$p" in High) a="6400" ;; Main) a="4d40" ;; *Baseline*) a="42e0" ;; *) a="6400" ;; esac
  printf 'avc1.%s%02x' "$a" "$l"
  [[ $HAS_AUDIO -eq 1 ]] && printf ',mp4a.40.2'
  return 0
}
res_for() {
  local seg; seg="$1/$(grep -v '^#' "$1/index.m3u8" | grep -m1 .)"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$seg" | grep -m1 x
}
bw_for() { # → "pico promedio" en bit/s (pico = segmento más caro; promedio = total/duración)
  awk -v dir="$1" '
    /^#EXTINF/ { split($0, a, /[:,]/); d = a[2]; next }
    /^[^#]/ && NF { cmd = "stat -c %s \"" dir "/" $0 "\""; cmd | getline sz; close(cmd);
                   tot += sz; dur += d; if (d > 0.5) { r = sz*8/d; if (r > peak) peak = r } }
    END { printf "%d %d\n", peak*1.1, (dur > 0 ? tot*8/dur : 0) }' "$1/index.m3u8"
}

DONE=()
for r in 1080 720 480 360; do is_complete "$r" && DONE+=("$r"); done
[[ ${#DONE[@]} -gt 0 ]] || die "ningún peldaño completo; no se escribe master.m3u8"

if [[ -f "$OUT_DIR/master.m3u8" ]] && ! grep -qF "$MASTER_MARK" "$OUT_DIR/master.m3u8"; then
  die "$OUT_DIR/master.m3u8 existe y no lo generó este script; no se toca"
fi

ORDER=()
for r in "${DONE[@]}"; do [[ "$r" == "$START_RUNG" ]] && ORDER+=("$r"); done
for r in "${DONE[@]}"; do [[ "$r" != "$START_RUNG" ]] && ORDER+=("$r"); done

M="$OUT_DIR/.master.m3u8.tmp"
{
  echo "#EXTM3U"
  echo "#EXT-X-VERSION:6"
  echo "#EXT-X-INDEPENDENT-SEGMENTS"
  echo "$MASTER_MARK $(date -u +%FT%TZ)"
  subattr=""
  if [[ $WITH_SUBS -eq 1 && -f "$OUT_DIR/playlist_vtt.m3u8" ]]; then
    echo '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Español",LANGUAGE="es",DEFAULT=NO,AUTOSELECT=YES,URI="playlist_vtt.m3u8"'
    subattr=',SUBTITLES="subs"'
  fi
  for r in "${ORDER[@]}"; do
    read -r peak avg <<< "$(bw_for "$OUT_DIR/v$r")"
    echo "#EXT-X-STREAM-INF:BANDWIDTH=$peak,AVERAGE-BANDWIDTH=$avg,RESOLUTION=$(res_for "$OUT_DIR/v$r"),FRAME-RATE=$FPS,CODECS=\"$(codecs_for "$OUT_DIR/v$r")\"$subattr"
    echo "v$r/index.m3u8"
  done
} > "$M"
mv -f -- "$M" "$OUT_DIR/master.m3u8"
log "master.m3u8 escrito ($OUT_DIR/master.m3u8):"
cat "$OUT_DIR/master.m3u8" >&2
