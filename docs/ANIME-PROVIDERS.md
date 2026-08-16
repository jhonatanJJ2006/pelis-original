# Proveedores de anime — Pelis Original

Guía para configurar streaming de anime vía Consumet (self-hosted + fallback).

---

## Arquitectura

```
Frontend (/anime/[id])
    → api.anime.getEpisodes (anilistId + provider)
    → packages/db/src/lib/consumet-client.ts
    → CONSUMET_API_URL (self-hosted o api.consumet.org)
    → Proveedores: gogoanime, zoro, animepahe, 9anime, animekai, marin, animefox
```

El catálogo (títulos, posters, sinopsis) viene de **Postgres + AniList**.  
Los episodios y streams vienen de **Consumet**, que agrega sitios de scraping.

---

## Variables de entorno

```env
# Self-hosted (recomendado)
CONSUMET_API_URL=http://localhost:3001

# Fallback si no se define: https://api.consumet.org
```

---

## Levantar Consumet self-hosted

```bash
docker compose up -d redis consumet
```

Verificar:

```bash
curl "http://localhost:3001/meta/anilist/info/21?provider=gogoanime"
```

Debería devolver JSON con episodios de One Piece.

---

## Proveedores disponibles

| ID | Nombre UI | Idioma | Prioridad |
|----|-----------|--------|-----------|
| gogoanime | GogoAnime | sub | 1 |
| zoro | HiAnime | sub/dub | 2 |
| animepahe | AnimePahe | sub | 3 |
| 9anime | 9anime | sub/dub | 4 |
| animekai | AnimeKai | sub | 5 |
| marin | Marin | sub | 6 |
| animefox | AnimeFox | sub | 7 |

Configuración centralizada: `packages/db/src/lib/anime-providers.ts`

---

## Fallback automático

Si el proveedor seleccionado no responde, el backend prueba los demás en orden de prioridad:

1. `fetchEpisodesWithFallback()` — episodios
2. `fetchVideoWithFallback()` — video HLS

La UI muestra qué proveedor funcionó y permite cambiar manualmente.

---

## Health check

Admin → `/admin/anime` → panel "Estado de proveedores"

O vía API: `anime.checkProvidersHealth` (cache 15 min, prueba con One Piece / AniList ID 21).

---

## Importar catálogo (~200 títulos)

```bash
pnpm --filter @pelis/db import:anilist -- --limit 200
```

Desde admin: botón "Importar catálogo AniList".

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| Sin episodios | Verificar `anilistId` en BD; ejecutar `anime.resolveAnilistId` |
| HTTP 500 en todos los proveedores | Levantar Consumet self-hosted; la API pública suele estar caída |
| Video no carga | Probar otro proveedor; revisar CORS/HLS en consola |
| Redis connection refused | `docker compose up -d redis` antes de consumet |
| Rate limit AniList | Import usa delay 500ms entre requests |

---

## Notas

- Los proveedores son **sub inglés** en su mayoría; dub limitado (HiAnime, 9anime).
- El campo `providers` JSON en cada anime es informativo; no controla el streaming.
- Consumet depende de sitios externos que cambian dominios frecuentemente.
