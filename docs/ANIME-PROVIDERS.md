# Proveedores de anime — Pelis Original

Guía del catálogo de anime: cómo se agrupan las series, de dónde salen los episodios y
cómo se reproduce cada uno.

---

## Arquitectura

Hay tres fuentes de datos separadas, y conviene no mezclarlas:

```
Catálogo (títulos, posters, sinopsis, temporadas)
    → Postgres (tabla `anime`) + AniList

Lista de episodios (número, título, sinopsis, miniatura, fecha)
    → api.anime.getSeasonEpisodes
    → packages/db/src/lib/anizip-client.ts  →  https://api.ani.zip

Reproducción de un episodio
    → api.anime.getEpisodeStream
    → proveedores `embed` (iframe) o `hls` (Consumet)
```

La clave del diseño: **la lista de episodios no depende de los scrapers**. Los scrapers se
caen constantemente, así que los episodios se muestran siempre y el proveedor solo entra en
juego cuando el usuario pulsa reproducir.

---

## Tipos de proveedor

Definidos en `packages/db/src/lib/anime-providers.ts`.

### `embed` — reproductor en iframe

Se direccionan con AniList ID + número de episodio y cargan **en el navegador del usuario**,
así que funcionan aunque el servidor no pueda alcanzar los sitios de streaming.

| ID       | Nombre UI | Idioma  | Prioridad   | Estado                                            |
| -------- | --------- | ------- | ----------- | ------------------------------------------------- |
| vidnest  | VidNest   | sub/dub | 1 (default) | Estable                                           |
| vidlink  | VidLink   | sub/dub | 2           | Roto: su bundle sigue llamando a `localhost:8080` |
| videasy  | Videasy   | sub/dub | 3           | Dominio cambió a `.to`; sin verificar             |
| animeflv | AnimeFLV  | sub/dub | 5           | Roto: ya no inyecta iframes en `/ver/…`           |

`animeunity` se quitó de la lista: el dominio `www.animeunity.to` ahora redirige a
`www.animeunity.so`, que no resuelve.

### `hls` — scraping vía Consumet

Devuelven un `.m3u8` que se reproduce en el player nativo (web y ExoPlayer en la TV) con
pistas de subtítulos. Mejor integración, pero **frágiles**: dependen de que el sitio scrapeado
siga en línea, de su dominio actual y de que la IP del servidor no esté bloqueada.

| ID           | Nombre UI    | Slug Consumet  | Idioma  | Prioridad |
| ------------ | ------------ | -------------- | ------- | --------- |
| zoro         | HiAnime      | `hianime`      | sub/dub | 10        |
| animepahe    | AnimePahe    | `animepahe`    | sub     | 11        |
| animekai     | AnimeKai     | `animekai`     | sub     | 12        |
| kickassanime | KickAssAnime | `kickassanime` | sub/dub | 13        |

`gogoanime`, `9anime`, `marin` y `animefox` ya no existen en Consumet; `zoro` se llama
`hianime` en la imagen actual.

**Estado 2026-10-18 (Movies, `riimuru/consumet-api`, `@consumet/extensions` 1.8.7; 1.8.8 en npm
usa los mismos dominios):** ningún proveedor útil devuelve HLS. `hianime.to` responde 521 (origen
caído detrás de Cloudflare), `anikai.to` y `kickass-anime.ro` no resuelven, AnimePahe se mudó a
`animepahe.su` y el scraper no entiende la página nueva, AnimeSaturn da 404. Solo AnimeUnity
(italiano) contesta. Los repos `consumet/*` en GitHub están bloqueados por DMCA desde 2026-03,
así que no hay fork oficial que actualizar.

---

## Variables de entorno

```env
# Consumet self-hosted. Sin esta variable los `hls` se omiten sin gastar tiempo.
CONSUMET_API_URL=http://127.0.0.1:3001

# Opcional: probar Consumet HLS ANTES que VidNest y los iframes (reproductor nativo en la
# TV). Sin CONSUMET_API_URL no hace nada. Dejar apagado mientras los scrapers estén caídos:
# solo añade latencia.
ANIME_CONSUMET_HLS=1
```

Levantar Consumet en Movies (solo escucha en `127.0.0.1`, `restart: unless-stopped`, Consumet
limitado a 512 MB y 1 CPU, Redis a 96 MB sin persistencia):

```bash
docker compose -p pelis-original up -d redis consumet
curl "http://127.0.0.1:3001/meta/anilist/info/21?provider=hianime"
```

Si eso devuelve `{"message":"Something went wrong..."}` o tarda 40 s, el scraper está roto o el
sitio está caído. Los proveedores `embed` siguen funcionando de todos modos.

### Fuentes que devuelve el servidor

`anime.getEpisodeStream` con fuente Consumet:

- Sin `Referer` exigido por el CDN: URL directa del CDN. No pasa por Movies, así que no gasta
  la subida (150–220 KB/s).
- Con `Referer`: `url` va por `/api/anime/stream` (mismo proxy que VidNest, sin prefetch), y
  además `directUrl` + `headers` para que ExoPlayer las pida directo con esas cabeceras.

`nativeOnly: true` (lo manda la app de TV): se omiten los iframes y la respuesta es `hls` o
`none` en una sola búsqueda, en lugar de que la TV tenga que repetir la llamada excluyendo
reproductores web.

---

## Fallback automático

`anime.getEpisodeStream` intenta, en orden:

1. El proveedor pedido, si es `embed` → devuelve la URL del iframe si su propio backend está
   sano. Si falla, se añade a la lista de `failedEmbeds` para no caer otra vez sobre él.
2. El proveedor pedido, si es `hls` → resuelve el episodio en Consumet y busca fuentes.
3. Cualquier `hls` disponible (intenta todos).
4. Cualquier `embed` disponible, **excluyendo** el proveedor pedido y los ya fallidos, y
   re-comprobando salud por cada uno (el primer embed que pase todos los checks gana).

Cuando cae a un paso posterior, la respuesta incluye `fellBackFrom` y la UI del reproductor
avisa de que cambió de proveedor.

---

## Health check

Admin → `/admin/anime` → panel "Estado de proveedores".

Vía API: `anime.checkProvidersHealth` (cache 15 min). Los `embed` se comprueban por
alcanzabilidad del reproductor; los `hls`, por si devuelven episodios de One Piece
(AniList ID 21).

**DNS en Movies:** el router (192.168.0.1) a veces falla al resolver `api.ani.zip` por DNSSEC.
El contenedor de Consumet usa `1.1.1.1`/`8.8.8.8` (ver `docker-compose.yml`); pelis-web usa el
resolver del sistema.

---

## Agrupación de series y temporadas

AniList publica cada temporada como una entrada independiente, así que sin agrupar el
catálogo muestra "Attack on Titan", "Attack on Titan Season 2", "Final Season"… como si
fueran animes distintos.

Columnas en la tabla `anime`: `seriesKey`, `seriesTitle`, `seasonNumber`, `seasonLabel`,
`isSeriesMain`, `format`.

- Al importar (`anime.seed`, `import:anilist`, admin) se derivan del título con
  `deriveSeriesFields()`, que reconoce sufijos como "Season 3 Part 2" o "Final Season".
- Para agrupar bien de verdad hay que ejecutar el script, que usa las **relaciones** de
  AniList (PREQUEL/SEQUEL/PARENT/SIDE_STORY) y además fusiona duplicados:

```bash
pnpm --filter @pelis/db group:anime -- --dry   # informe, sin escribir
pnpm --filter @pelis/db group:anime            # aplicar
```

Conviene ejecutarlo después de cada importación masiva.

---

## Importar catálogo (~200 títulos)

```bash
pnpm --filter @pelis/db import:anilist -- --limit 200
pnpm --filter @pelis/db group:anime
```

Desde admin: botón "Importar catálogo AniList".

---

## Troubleshooting

| Problema                           | Solución                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Animes repetidos en el catálogo    | `pnpm --filter @pelis/db group:anime`                                                     |
| Temporadas como animes separados   | Igual que arriba; el script las une por relaciones de AniList                             |
| Sin episodios en una temporada     | Falta `anilistId`; `getSeasonEpisodes` lo resuelve solo, o usar `anime.resolveAnilistId`  |
| Todos los proveedores `hls` fallan | Normal si Consumet está roto; se usa `embed` automáticamente                              |
| Ningún proveedor reproduce         | Comprobar que el DNS del servidor/cliente resuelve los dominios; algunos ISP los bloquean |
| Redis connection refused           | `docker compose up -d redis` antes de consumet                                            |
| Rate limit AniList (429)           | `anilistQuery` reintenta respetando `Retry-After`                                         |

---

## Notas

- El campo `providers` JSON de cada anime es informativo; **no** controla el streaming.
- Los reproductores `embed` son servicios de terceros con publicidad; el iframe va con
  `sandbox` sin `allow-popups` para bloquear popunders.
- Un seed sin `anilistId` genera duplicados. `src/lib/anime-seed-data.ts` es la única fuente
  del catálogo inicial y todas sus entradas llevan `anilistId`.
