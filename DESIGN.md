# Maison Noir — Sistema de diseño

> Cine de sala oscura. Champagne, tiza y terciopelo. No es un clon de Netflix.

**Tema:** dark premium · **Nombre:** Maison Noir

**Implementación:** tokens en `apps/web/src/app/globals.css`, paleta `cinema-*` en `apps/web/tailwind.config.ts`. Los nombres `cinema-*` se mantienen a propósito: la app se retintea remapeando hex, no renombrando clases.

Playground vivo (solo desarrollo): [`/playground`](/playground)

---

## Dirección visual

Maison Noir es una sala de cine boutique. Fondos casi negros con calor residual (`#0B0B0D`), superficies de terciopelo grafito, acento principal en **champagne gold** (`#C4A35A`). El oro premium se reserva para suscripción y sellos. El peligro y el “en vivo” viven en un burdeos profundo, nunca en el CTA.

No hay glow eléctrico, no hay coral Netflix, no hay Bebas Neue de marcador deportivo. La tipografía de display es editorial (Fraunces). El cuerpo es Outfit. El movimiento es corto, caro y se apaga si el usuario pide menos motion.

**Lo que sí:** hairline dorado al hover, lift de 4px, posters letterbox, títulos en caja editorial, foco champagne visible.

**Lo que no:** mayúsculas gritadas en cada H1, pulsos infinitos, sombras azul neón, botones de peligro que usan el acento primario.

---

## Color

Los nombres Tailwind `cinema-*` **no se renombran**. Solo cambia el hex y el rol.

| Nombre (token) | Antes | Ahora | Rol |
|----------------|-------|-------|-----|
| `cinema-bg` | `#010810` abismo frío | `#0B0B0D` | Fondo de sala |
| `cinema-surface` | `#020B18` | `#141418` | Cards, inputs, nav |
| `cinema-elevated` | `#061428` | `#1C1C22` | Tabs, hovers, chips |
| `cinema-border` | `#0A1F38` | `#2A2A32` | Hairlines |
| `cinema-accent` | `#E50914` coral Netflix | `#C4A35A` champagne | CTA primario, foco, nav activo |
| `cinema-accent-light` | `#FF2D3B` | `#E0C98A` | Hover del CTA |
| `cinema-accent-glow` | `#FF4D58` | `#E8D4A0` | Halo suave del CTA |
| `cinema-gold` | `#F5C842` | `#F5C842` | Premium / suscripción (se queda oro) |
| `cinema-gold-light` | `#FFD966` | `#FFD966` | Hover premium |
| `cinema-violet` | `#3B82F6` eléctrico | `#D4B896` highlight cálido | Acento “primario” legado en componentes |
| `cinema-violet-light` | `#60A5FA` | `#E8D4B8` | Hover / links cálidos |
| `cinema-teal` | `#22D3EE` cian | `#8A9A7B` sage | Un acento de descubrimiento, con mesura |
| `cinema-teal-light` | `#67E8F9` | `#A8B89A` | Hover del sage |
| `cinema-muted` | `#B8D4F0` hielo | `#A39E94` piedra cálida | Texto secundario |
| `cinema-silver` | `#7EB3E8` | `#8A857C` | Meta, captions |
| `cinema-ash` | `#4A7AAB` | `#6B665E` | Placeholders, iconos inactivos |
| `cinema-chalk` | — (blanco) | `#F4F1EA` | Texto principal |
| `cinema-danger` | — (`red-600` / coral) | `#8B1E2D` burdeos | Peligro, borrar, EN VIVO |
| `cinema-danger-light` | — | `#A5283A` | Hover de peligro |

Variables CSS equivalentes en `:root` (`--color-coral-red` ahora es burdeos; `--color-violet-accent` es el highlight cálido). No uses el coral histórico para CTAs.

**Contraste (fondo `#0B0B0D`):** tiza `#F4F1EA` ≥ 15:1. Champagne `#C4A35A` sobre fondo oscuro ≈ 7:1 (AA para texto grande / UI). CTA champagne lleva texto `cinema-bg`, no tiza. Burdeos `#8B1E2D` lleva texto tiza.

---

## Tipografía

| Rol | Familia | Variable | Uso |
|-----|---------|----------|-----|
| Cuerpo / UI | Outfit | `--font-body` | Botones, inputs, meta, párrafos |
| Display | Fraunces | `--font-display` | Títulos de página, hero, empty states, wordmark |

Escala (clase → tamaño / interlineado / tracking):

| Token | Clase | Tamaño | Notas |
|-------|-------|--------|-------|
| Display XL | `.font-display` + `text-5xl md:text-7xl` | 48–72px | Hero. Caja normal, no `uppercase` gritada. `tracking-tight`, `leading-[0.95]`. |
| Display L | `.font-display text-4xl md:text-5xl` | 36–48px | H1 de catálogo. |
| Display M | `.font-display text-2xl md:text-3xl` | 24–30px | Section header. |
| Título UI | `text-lg font-semibold` | 18px | Cards, dialogs. |
| Cuerpo | `text-base` | 16px | Párrafos. Color `cinema-chalk` / `cinema-muted`. |
| Meta | `text-sm` | 14px | Filtros, captions. `cinema-muted`. |
| Micro | `text-xs` / `text-[10px]` | 10–12px | Badges, year, EN VIVO. Eyebrows sí pueden ir `uppercase tracking-widest`. |

El wordmark “Pelis” usa Fraunces en caja de título, no Bebas. Los eyebrows (“Catálogo”, “Tu lista”) sí van en versales con tracking amplio: eso es editorial, no marcador.

---

## Espaciado

| Token | Valor | Uso |
|-------|-------|-----|
| `--page-max-width` | 1280px | `.page-shell` / `container` |
| `--section-gap` | 48px | Separación entre filas |
| Page padding | `px-4 py-8 md:py-10` | `.page-shell` |
| Card padding | 12–16px (`p-3` / `p-4`) | Movie card, channel card |
| Stack de página | `space-y-10 md:space-y-16` | Home, catálogos |

---

## Radio

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-buttons` / `--radius-inputs` | 10px | Button, Input, Select |
| `--radius-cards` | 16px (`rounded-2xl`) | Cards, posters, empty icon frame |
| Pills | `rounded-full` | Badges, filter chips, tab dots |

---

## Motion

| Token | Valor |
|-------|-------|
| `--ease-out-expo` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| `--duration-instant` | 120ms |
| `--duration-fast` | 180ms |
| `--duration-normal` | 280ms |
| `--duration-slow` | 450ms |

**Permitido:** fade/slide de entrada, lift de card (`-translate-y-1`), hairline que se enciende, stagger corto en toolbar del poster.

**Prohibido con `prefers-reduced-motion: reduce`:** `hero-zoom`, `hero-zoom-in`, `pulse-soft`, `pulse-accent`, `float`, `shimmer`, `glow-pulse`. En ese modo las animaciones se anulan y el autoplay del hero no corre.

---

## Componentes — sí / no

### Button
- **Sí:** `primary` = champagne + texto oscuro. `gold` = premium. `danger` = `cinema-danger` (burdeos), nunca `cinema-accent`.
- **No:** CTA rojo Netflix. Peligro que herede el acento primario.

### Badge
- **Sí:** `primary` champagne suave. `violet` = highlight cálido (el nombre queda). `danger` burdeos. Serie = oro macizo.
- **No:** badge de película en coral.

### Input / Select
- **Sí:** superficie grafito, focus anillo champagne, autofill con el mismo fondo.
- **No:** glow azul al foco.

### MovieCard
- **Sí:** hover = lift 4px + hairline champagne + sombra cálida. Play en champagne.
- **No:** sombra azul eléctrica.

### MoviePoster
- **Sí:** placeholder letterbox (barras + marco) cuando falta imagen.
- **No:** bloque plano gris o icono genérico a pantalla completa.

### EmptyState
- **Sí:** marco 80px, icono highlight cálido, título Fraunces, CTA primary.
- **No:** título en versales Bebas.

### SectionHeader
- **Sí:** filete champagne vertical, título editorial, link "Ver todo" en oro.
- **No:** barra arcoíris violeta-cian.

### CatalogFilterBar
- **Sí:** search + selects + "Limpiar filtros" ghost. Misma altura 44px.
- **No:** filtros con acento eléctrico.

---

## Accesibilidad

- Foco: focus-visible = anillo champagne (ring-cinema-accent) con offset sobre cinema-bg. Nunca quitar el outline sin reemplazo.
- Contraste: tiza sobre sala; champagne como texto grande o como fondo con texto oscuro; muted #A39E94 solo para secundario.
- Reduced motion: desactivar zoom del hero, pulsos, float, shimmer y glow. El carrusel del hero no hace autoplay.
- Live / peligro: burdeos + texto, no solo color. EN VIVO lleva punto + label.
- Idioma: lang=es. Copy de UI en español.
- Hit targets: botones de 44px (h-11). Tabs inferiores de 48px.

---

## Cómo añadir un componente

1. Producto (card, filtro, empty, poster): packages/ui/src/features/<nombre>/.
2. Primitivo (Button, Input, Badge): packages/ui/src/shared/ui/.
3. Usa solo tokens cinema-*. Peligro = cinema-danger, no red-600 ni cinema-accent.
4. Hover de media: lift + hairline champagne. Respeta motion-safe y prefers-reduced-motion.
5. Copy en español. Títulos de display en caja normal.
6. Añádelo al playground (apps/web/src/app/playground/page.tsx).
7. Tests solo para Button, EmptyState o MovieCard (o contrato público). Sin snapshots de hex.
8. No toques reproductores (video-player, HLS, /tv/[id]) por un cambio visual.

---

## Implementación

- apps/web/src/app/globals.css — tokens, utilidades, reduced motion
- apps/web/tailwind.config.ts — paleta cinema-*
- apps/web/src/app/layout.tsx — Outfit + Fraunces
- packages/ui/src/features/ — movie-card, poster, empty, section-header, filter-bar
- apps/web/src/app/playground/page.tsx — catálogo vivo (oculto en production)

---

## Cómo verificar

Scripts del package.json raíz: test, test:unit, test:components, test:e2e, test:e2e:ui, test:smoke, test:playground, test:all.

E2E usa PLAYWRIGHT_BASE_URL (default http://localhost:3000) y reuseExistingServer fuera de CI. Ver e2e/playwright.config.ts.
