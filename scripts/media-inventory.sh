#!/usr/bin/env bash
# Inventario de la biblioteca HLS en los discos externos (solo lectura).
#
# Uso:
#   scripts/media-inventory.sh [--titles titles.tsv] [--out inventario.csv]
#
# Recorre cada carpeta-token de MOVIE_OUTPUT_ROOTS (por defecto Pelis-A y Pelis-B),
# localiza la playlist igual que apps/web/src/lib/movie-stream-paths.ts
# (master.m3u8 > playlist.m3u8 > index.m3u8, en <token>/<token>/ y luego <token>/),
# y hace ffprobe del primer segmento de la rendición original.
#
# --titles: TSV opcional "token<TAB>título" (p. ej. exportado en solo lectura de la tabla movie).
# Columnas: root,token,title,manifest,has_master,video_codec,profile,pix_fmt,width,height,
#           audio_codec,audio_channels,duration_s,source_bytes,segments,avg_segment_s
set -euo pipefail

TITLES=""
OUT="/dev/stdout"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --titles) TITLES="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    -h|--help) sed -n 2,15p "$0"; exit 0 ;;
    *) echo "argumento desconocido: $1" >&2; exit 2 ;;
  esac
done

IFS=':' read -r -a ROOTS <<< "${MOVIE_OUTPUT_ROOTS:-/run/media/det/Pelis-A/output:/run/media/det/Pelis-B/output}"

declare -A TITLE_OF=()
if [[ -n "$TITLES" && -f "$TITLES" ]]; then
  while IFS=$'\t' read -r tok name; do [[ -n "$tok" ]] && TITLE_OF["$tok"]="$name"; done < "$TITLES"
fi

csv() { local s="${1//\"/\"\"}"; printf '"%s"' "$s"; }

# Playlist de la rendición original (nunca master.m3u8: ese es el ABR generado).
source_playlist() {
  local dir="$1" tok="$2" name d
  for name in playlist.m3u8 index.m3u8; do
    for d in "$dir/$tok" "$dir"; do
      [[ -f "$d/$name" ]] && { echo "$d/$name"; return 0; }
    done
  done
  return 1
}

{
  echo "root,token,title,manifest,has_master,video_codec,profile,pix_fmt,width,height,audio_codec,audio_channels,duration_s,source_bytes,segments,avg_segment_s"
  for root in "${ROOTS[@]}"; do
    [[ -d "$root" ]] || continue
    for dir in "$root"/*/; do
      dir="${dir%/}"; tok="$(basename "$dir")"
      has_master=no
      [[ -f "$dir/$tok/master.m3u8" || -f "$dir/master.m3u8" ]] && has_master=yes
      pl="$(source_playlist "$dir" "$tok" || true)"
      if [[ -z "$pl" ]]; then
        echo "$(csv "$root"),$(csv "$tok"),$(csv "${TITLE_OF[$tok]:-}"),,$has_master,,,,,,,,,,,"
        continue
      fi
      pdir="$(dirname "$pl")"
      first="$(grep -v '^#' "$pl" | grep -m1 . || true)"
      [[ "$first" = /* ]] || first="$pdir/$first"
      dur="$(awk -F'[:,]' '/^#EXTINF/{s+=$2} END{printf "%.1f", s}' "$pl")"
      nseg="$(grep -c '^#EXTINF' "$pl" || true)"
      # Tamaño de la rendición original: segmentos .ts junto a la playlist (sin subcarpetas ABR).
      bytes="$(find "$pdir" -maxdepth 1 -type f -name '*.ts' -printf '%s\n' | awk '{s+=$1} END{print s+0}')"
      probe() { ffprobe -v error -select_streams "$1" -show_entries "stream=$2" -of default=nw=1 "$first" 2>/dev/null || true; }
      field() { sed -n "s/^$1=//p" <<< "$2" | head -1; }
      v="$(probe v:0 codec_name,profile,pix_fmt,width,height)"
      a="$(probe a:0 codec_name,channels)"
      vc="$(field codec_name "$v")"; vprof="$(field profile "$v")"; vpix="$(field pix_fmt "$v")"
      vw="$(field width "$v")"; vh="$(field height "$v")"
      ac="$(field codec_name "$a")"; ach="$(field channels "$a")"
      avg="$(awk -v d="$dur" -v n="$nseg" 'BEGIN{ if (n>0) printf "%.1f", d/n }')"
      echo "$(csv "$root"),$(csv "$tok"),$(csv "${TITLE_OF[$tok]:-}"),$(csv "${pl#$root/}"),$has_master,$vc,$(csv "$vprof"),$vpix,$vw,$vh,$ac,$ach,$dur,$bytes,$nseg,$avg"
    done
  done
} > "$OUT"
