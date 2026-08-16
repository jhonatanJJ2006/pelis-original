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

| ID | Nombre UI | Idioma | Prioridad |
|----|-----------|--------|-----------|
| vidlink | VidLink | sub/dub | 1 |
| vidnest | VidNest | sub/dub | 2 |
| videasy | Videasy | sub/dub | 3 |

### `hls` — scraping vía Consumet

Devuelven un `.m3u8` que se reproduce en el player nativo con pistas de subtítulos. Mejor
integración, pero **frágiles**: dependen de que Consumet siga funcionando y de que la IP del
servidor no esté bloqueada.

| ID | Nombre UI | Idioma | Prioridad |
|----|-----------|--------|-----------|
| gogoanime | GogoAnime | sub | 10 |
| zoro | HiAnime | sub/dub | 11 |
| animepahe | AnimePahe | sub | 12 |
| 9anime | 9anime | sub/dub | 13 |
| animekai | AnimeKai | sub | 14 |
| marin | Marin | sub | 15 |
| animefox | AnimeFox | sub | 16 |

---

## Variables de entorno

```env
# Consumet self-hosted, solo necesario para los proveedores `hls`
CONSUMET_API_URL=http://localhost:3001

# Fallback si no se define: https://api.consumet.org
```

Levantar Consumet:

```bash
docker compose up -d redis consumet
curl "http://localhost:3001/meta/anilist/info/21?provider=gogoanime"
```

Si eso devuelve `{"message":"Something went wrong. Please try again later."}`, el scraper está
roto (situación habitual: el proyecto `consumet-api` ya no se mantiene). Los proveedores
`embed` siguen funcionando de todos modos.

---

## Fallback automático

`anime.getEpisodeStream` intenta, en orden:

1. El proveedor pedido, si es `embed` → devuelve la URL del iframe.
2. El proveedor pedido, si es `hls` → resuelve el episodio en Consumet y busca fuentes.
3. Cualquier proveedor `embed` disponible.

Cuando cae al paso 3, la respuesta incluye `fellBackFrom` y la UI del reproductor avisa de
que cambió de proveedor.

---

## Health check

Admin → `/admin/anime` → panel "Estado de proveedores".

Vía API: `anime.checkProvidersHealth` (cache 15 min). Los `embed` se comprueban por
alcanzabilidad del reproductor; los `hls`, por si devuelven episodios de One Piece
(AniList ID 21).

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

| Problema | Solución |
|----------|----------|
| Animes repetidos en el catálogo | `pnpm --filter @pelis/db group:anime` |
| Temporadas como animes separados | Igual que arriba; el script las une por relaciones de AniList |
| Sin episodios en una temporada | Falta `anilistId`; `getSeasonEpisodes` lo resuelve solo, o usar `anime.resolveAnilistId` |
| Todos los proveedores `hls` fallan | Normal si Consumet está roto; se usa `embed` automáticamente |
| Ningún proveedor reproduce | Comprobar que el DNS del servidor/cliente resuelve los dominios; algunos ISP los bloquean |
| Redis connection refused | `docker compose up -d redis` antes de consumet |
| Rate limit AniList (429) | `anilistQuery` reintenta respetando `Retry-After` |

---

## Notas

- El campo `providers` JSON de cada anime es informativo; **no** controla el streaming.
- Los reproductores `embed` son servicios de terceros con publicidad; el iframe va con
  `sandbox` sin `allow-popups` para bloquear popunders.
- Un seed sin `anilistId` genera duplicados. `src/lib/anime-seed-data.ts` es la única fuente
  del catálogo inicial y todas sus entradas llevan `anilistId`.
