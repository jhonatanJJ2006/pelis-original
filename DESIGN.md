# Pelis — Sistema de diseño azul océano

> Experiencia cinematográfica sobre fondos azul marino profundo, con acentos eléctricos, cian y coral para CTAs.

**Theme:** dark blue ocean

**Implementación:** tokens en `globals.css`, paleta `cinema-*` en `tailwind.config.ts`.

---

## Dirección visual

Fondos azul abismo profundo (`#010810`), superficies (`#020B18`, `#061428`). Acentos primarios en azul eléctrico (`#3B82F6`) y cian (`#22D3EE`). Coral (`#E50914`) solo para CTAs de acción. Navegación y descubrimiento vía **Swiper** en hero, filas, catálogos, favoritos, planes y géneros.

**Tipografía:** Outfit + Bebas Neue.

---

## Tokens — Colores

| Name | Value | Clase Tailwind | Role |
|------|-------|----------------|------|
| Abyss Blue | `#010810` | `cinema-bg` | Fondo principal |
| Ocean Surface | `#020B18` | `cinema-surface` | Cards, inputs |
| Navy Elevated | `#061428` | `cinema-elevated` | Tabs, nav hover |
| Steel Border | `#0A1F38` | `cinema-border` | Bordes |
| Electric Blue | `#3B82F6` | `cinema-violet` | Acentos, nav activo |
| Sky Blue | `#60A5FA` | `cinema-violet-light` | Hover, links |
| Cyan | `#22D3EE` | `cinema-teal` | Chips, gradientes |
| Coral Red | `#E50914` | `cinema-accent` | CTAs primarios |
| Gold | `#F5C842` | `cinema-gold` | Premium |
| Ice Text | `#B8D4F0` | `cinema-muted` | Texto secundario |

---

## Swiper — Componentes

| Componente | Uso |
|------------|-----|
| `HeroCarousel` | Carrusel principal con `EffectCreative` |
| `MovieRow` | Filas horizontales en home |
| `MovieSwiper` | Catálogos (películas, series, favoritos) |
| `ContinueWatchingRow` | Retomar reproducción |
| `GenreSwiper` | Chips de género |
| `ContentSwiper` | Contenido genérico (historial, etc.) |
| Subscribe page | Planes en carrusel horizontal |

---

## Motion

Ver sección Motion en implementación anterior. Tokens: `--ease-out-expo`, duraciones 120–450ms, `ScrollReveal` para entradas.

---

## Implementación

- `apps/web/src/app/globals.css` — tokens y utilidades Swiper
- `apps/web/tailwind.config.ts` — paleta cinema-*
- `packages/ui/src/features/` — componentes compartidos
