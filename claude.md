# Guía de Skills — Pelis Original

Catálogo de **110 skills** instaladas en este repo. Cursor las detecta en `.agents/skills/` y `.cursor/skills/`.

**Cómo usarlas:** menciona la tarea en el chat o pide explícitamente que se lea el `SKILL.md` correspondiente. Si no sabes cuál elegir, empieza por `studio` o `skills-menu`.

---

## Entrada rápida

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `studio` | `.agents/skills/studio` | Router inteligente: describe tu tarea y te lleva al agente o skill correcto. |
| `skills-menu` | `.agents/skills/skills-menu` | Muestra el menú completo de skills y agentes organizados por tarea. |
| `the-architect` | `.agents/skills/the-architect` | Clasifica el proyecto, entrevista stakeholders y genera un blueprint de arquitectura. |
| `system-architecture` | `.agents/skills/system-architecture` | Diseña y revisa arquitecturas para desarrollo asistido por agentes. |
| `project-dossier` | `.agents/skills/project-dossier` | Crea o actualiza `PROJECT.md` con hechos persistentes del proyecto. |
| `decision` | `.agents/skills/decision` | Registra decisiones estilo ADR en `decisions/NNNN-slug.md`. |

---

## UI/UX y diseño frontend (relevante para Pelis)

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `ui-ux-pro-max` | `.cursor/skills/ui-ux-pro-max` | Guía completa UX/UI: estilos, paletas, tipografías, guidelines y stacks. |
| `frontend-design` | `.agents/skills/frontend-design` | Diseño visual distintivo al crear o rediseñar interfaces. |
| `design-taste-frontend` | `.agents/skills/design-taste-frontend` | Anti-slop: landings y redesigns que no parecen plantilla genérica. |
| `design-taste-frontend-v1` | `.agents/skills/design-taste-frontend-v1` | Versión v1 del taste-skill (compatibilidad hacia atrás). |
| `redesign-existing-projects` | `.agents/skills/redesign-existing-projects` | Mejora sitios existentes sin romper funcionalidad. |
| `minimalist-ui` | `.agents/skills/minimalist-ui` | UI editorial minimalista: monocromo cálido, bento grids planos. |
| `industrial-brutalist-ui` | `.agents/skills/industrial-brutalist-ui` | Estética brutalista industrial: grids rígidos, tipografía extrema. |
| `high-end-visual-design` | `.agents/skills/high-end-visual-design` | Patrones de agencia premium: tipografía, sombras, animaciones. |
| `gpt-taste` | `.agents/skills/gpt-taste` | UX avanzada con GSAP, layouts editoriales y motion. |
| `stitch-design-taste` | `.agents/skills/stitch-design-taste` | Genera `DESIGN.md` para Google Stitch con estándares premium. |
| `web-design-guidelines` | `.agents/skills/web-design-guidelines` | Audita UI contra Web Interface Guidelines de Vercel. |
| `ui-styling` | `.cursor/skills/ui-styling` | shadcn/ui + Tailwind: componentes accesibles y temas. |
| `design` | `.cursor/skills/design` | Diseño integral: marca, tokens, logos, CIP, slides, banners, iconos. |
| `design-system` | `.cursor/skills/design-system` | Tokens en 3 capas, specs de componentes y slides con tokens. |
| `brand` | `.cursor/skills/brand` | Voz de marca, identidad visual y consistencia. |
| `brandkit` | `.agents/skills/brandkit` | Genera brand kits premium: logos, decks de identidad, mockups. |
| `banner-design` | `.cursor/skills/banner-design` | Banners para redes, ads, heroes web e impresión. |
| `color-palette-generator` | `.agents/skills/color-palette-generator` | Paletas armoniosas desde descripción, mood o imagen. |
| `image-to-code` | `.agents/skills/image-to-code` | De imagen de diseño a código web fiel al mockup. |
| `imagegen-frontend-web` | `.agents/skills/imagegen-frontend-web` | Genera referencias visuales web (una imagen por sección). |
| `imagegen-frontend-mobile` | `.agents/skills/imagegen-frontend-mobile` | Genera pantallas móviles premium en mockups de teléfono. |

---

## Accesibilidad (AccessLint)

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `scan` | `.agents/skills/scan` | Audita una página en vivo y localiza violaciones WCAG por selector DOM. |
| `diff` | `.agents/skills/diff` | Compara violaciones nuevas vs baseline (cambios sin commitear o rama). |
| `audit` | `.agents/skills/audit` | Encuentra y corrige problemas WCAG 2.2 (modo reporte o fix). |

---

## Arquitectura y calidad de código

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `clean-architecture` | `.agents/skills/clean-architecture` | Revisa código según Clean Architecture y SOLID. |
| `kent-beck-style` | `.agents/skills/kent-beck-style` | Refactoring incremental, YAGNI y KISS al estilo Kent Beck. |
| `full-output-enforcement` | `.agents/skills/full-output-enforcement` | Evita truncar código y placeholders en salidas largas. |
| `daves-adr` | `.agents/skills/daves-adr` | Crea Architecture Decision Records estructurados. |
| `daves-architecture-report` | `.agents/skills/daves-architecture-report` | Informe de arquitectura con 5 agentes en paralelo. |
| `daves-dependency-graph` | `.agents/skills/daves-dependency-graph` | Grafos de dependencias upstream/downstream. |
| `daves-impact-analysis` | `.agents/skills/daves-impact-analysis` | Impacto en cascada de cambios arquitectónicos. |
| `daves-scenario-compare` | `.agents/skills/daves-scenario-compare` | Compara escenarios: coste, timeline, riesgo, complejidad. |
| `daves-nfr-capture` | `.agents/skills/daves-nfr-capture` | Captura requisitos no funcionales con criterios medibles. |
| `daves-nfr-review` | `.agents/skills/daves-nfr-review` | Revisa NFRs por completitud y factibilidad. |
| `c4-diagram` | `.agents/skills/daves-c4-diagram` | Diagramas C4 desde notas del sistema. |
| `diagram` | `.agents/skills/daves-diagram` | Diagramas de arquitectura con librería Python diagrams. |
| `diagram-review` | `.agents/skills/daves-diagram-review` | Analiza diagramas y flowcharts existentes. |
| `daves-cost-analysis` | `.agents/skills/daves-cost-analysis` | Análisis de costes de infraestructura y optimización. |
| `daves-startup-diagnostic` | `.agents/skills/daves-startup-diagnostic` | Diagnóstico de startup (skill Dave's). |

---

## Presentaciones y slides

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `slides` | `.cursor/skills/slides` | Presentaciones HTML estratégicas con Chart.js y design tokens. |
| `slide-deck-generator` | `.agents/skills/slide-deck-generator` | Deck HTML autocontenido con navegación por teclado. |

---

## Imágenes y assets

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `resize-images` | `.agents/skills/resize-images` | Redimensiona imágenes para web, social, slides e impresión. |
| `product-image-processor` | `.agents/skills/product-image-processor` | Descarga, redimensiona y quita fondos de imágenes de producto. |

---

## Sitio, zoning y due diligence (NYC / arquitectura)

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `environmental-analysis` | `.agents/skills/environmental-analysis` | Clima, inundación, sísmica, suelo y topografía desde una dirección. |
| `mobility-analysis` | `.agents/skills/mobility-analysis` | Tránsito, walk score, bici y acceso aeropuerto. |
| `demographics-analysis` | `.agents/skills/demographics-analysis` | Población, ingresos, vivienda y empleo del área. |
| `history` | `.agents/skills/history` | Contexto del barrio, landmarks y actividad comercial. |
| `nyc-landmarks` | `.agents/skills/nyc-landmarks` | Comprueba si un edificio NYC es landmark o distrito histórico. |
| `nyc-dob-permits` | `.agents/skills/nyc-dob-permits` | Historial de permisos DOB de un edificio NYC. |
| `nyc-dob-violations` | `.agents/skills/nyc-dob-violations` | Violaciones DOB/ECB abiertas y resueltas. |
| `nyc-acris` | `.agents/skills/nyc-acris` | Transacciones, hipotecas y gravámenes en ACRIS. |
| `nyc-hpd` | `.agents/skills/nyc-hpd` | Violaciones y quejas HPD (residencial). |
| `nyc-bsa` | `.agents/skills/nyc-bsa` | Variances y permisos especiales del BSA. |
| `nyc-property-report` | `.agents/skills/nyc-property-report` | Informe combinado: landmarks, DOB, ACRIS, HPD, BSA. |
| `zoning-analysis-nyc` | `.agents/skills/zoning-analysis-nyc` | Envelope de zoning NYC con datos PLUTO. |
| `zoning-envelope` | `.agents/skills/zoning-envelope` | Visor 3D interactivo del envelope de zoning. |
| `occupancy-calculator` | `.agents/skills/occupancy-calculator` | Cargas de ocupación IBC y clasificación de uso. |
| `workplace-programmer` | `.agents/skills/workplace-programmer` | Programa de espacios de oficina por conversación. |
| `spec-writer` | `.agents/skills/spec-writer` | Especificaciones CSI outline desde lista de materiales. |

---

## Sostenibilidad y EPD

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `epd-research` | `.agents/skills/epd-research` | Busca EPDs por material, división CSI o categoría. |
| `epd-parser` | `.agents/skills/epd-parser` | Extrae datos de impacto ambiental de PDFs EPD. |
| `epd-compare` | `.agents/skills/epd-compare` | Compara productos en GWP y métricas ambientales. |
| `epd-to-spec` | `.agents/skills/epd-to-spec` | Specs CSI con umbrales GWP y requisitos EPD. |

---

## Productos, FF&E y materiales

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `product-research` | `.agents/skills/product-research` | Investiga productos FF&E desde un brief de diseño. |
| `product-spec-bulk-fetch` | `.agents/skills/product-spec-bulk-fetch` | Extrae specs desde URLs de producto. |
| `product-spec-pdf-parser` | `.agents/skills/product-spec-pdf-parser` | Extrae specs desde catálogos PDF. |
| `product-data-cleanup` | `.agents/skills/product-data-cleanup` | Normaliza schedules FF&E desordenados. |
| `product-data-import` | `.agents/skills/product-data-import` | Genera schedule FF&E desde datos crudos. |
| `product-enrich` | `.agents/skills/product-enrich` | Auto-etiqueta productos con categoría, color y material. |
| `product-match` | `.agents/skills/product-match` | Encuentra productos similares por imagen o nombre. |
| `product-pair` | `.agents/skills/product-pair` | Sugiere productos complementarios. |
| `master-schedule` | `.agents/skills/master-schedule` | Verifica y configura `master-schedule.json` y Google Sheet. |
| `csv-to-sif` | `.agents/skills/csv-to-sif` | Convierte CSV/Excel FF&E a formato SIF. |
| `sif-to-csv` | `.agents/skills/sif-to-csv` | Convierte SIF a CSV legible. |

---

## Dave's — documentación, vault y productividad

| Skill | Ruta | Para qué sirve |
|-------|------|----------------|
| `daves-summarize` | `.agents/skills/daves-summarize` | Resume notas con profundidad y audiencia configurables. |
| `daves-exec-summary` | `.agents/skills/daves-exec-summary` | Resumen ejecutivo de documentos largos. |
| `daves-meeting-notes` | `.agents/skills/daves-meeting-notes` | Notas de reunión estructuradas con extracción de acciones. |
| `daves-voice-meeting` | `.agents/skills/daves-voice-meeting` | De audio/transcripción a notas de reunión. |
| `daves-find-decisions` | `.agents/skills/daves-find-decisions` | Extrae decisiones de reuniones y emails. |
| `daves-find-related` | `.agents/skills/daves-find-related` | Encuentra contenido relacionado en el vault. |
| `daves-orphan-finder` | `.agents/skills/daves-orphan-finder` | Detecta notas huérfanas sin enlaces. |
| `daves-auto-tag` | `.agents/skills/daves-auto-tag` | Auto-etiqueta notas en lote. |
| `daves-auto-summary` | `.agents/skills/daves-auto-summary` | Genera resúmenes de una línea en frontmatter. |
| `daves-article` | `.agents/skills/daves-article` | Captura artículos desde URL con resumen y citas. |
| `daves-weblink` | `.agents/skills/daves-weblink` | Guarda página web como nota de referencia. |
| `daves-book-notes` | `.agents/skills/daves-book-notes` | Notas de libros con extracción paralela. |
| `daves-document-extract` | `.agents/skills/daves-document-extract` | Extrae contenido de cualquier formato de documento. |
| `daves-pdf-extract` | `.agents/skills/daves-pdf-extract` | Extrae PDF preservando estructura y tablas. |
| `daves-pptx-extract` | `.agents/skills/daves-pptx-extract` | Convierte PowerPoint a Markdown estructurado. |
| `daves-email-capture` | `.agents/skills/daves-email-capture` | Captura emails en notas del vault. |
| `daves-link-checker` | `.agents/skills/daves-link-checker` | Valida URLs externas en notas Markdown. |
| `daves-broken-links` | `.agents/skills/daves-broken-links` | Encuentra wiki-links y anclas rotas. |
| `daves-check-weblinks` | `.agents/skills/daves-check-weblinks` | Comprueba weblinks (skill Dave's). |
| `daves-project-report` | `.agents/skills/daves-project-report` | Informe de estado del proyecto desde el vault. |
| `daves-weekly-summary` | `.agents/skills/daves-weekly-summary` | Resumen semanal de actividades y decisiones. |
| `daves-quality-report` | `.agents/skills/daves-quality-report` | Métricas de calidad del contenido del vault. |
| `daves-score-document` | `.agents/skills/daves-score-document` | Puntúa documentos contra rúbricas personalizables. |
| `daves-timeline` | `.agents/skills/daves-timeline` | Timeline visual de eventos del vault. |
| `daves-video-digest` | `.agents/skills/daves-video-digest` | Triage y procesamiento profundo de videos YouTube. |
| `daves-youtube-analyze` | `.agents/skills/daves-youtube-analyze` | Analiza YouTube con transcripción y takeaways. |
| `daves-csv-to-page` | `.agents/skills/daves-csv-to-page` | Convierte CSV a página (skill Dave's). |
| `daves-de-ai-ify` | `.agents/skills/daves-de-ai-ify` | Humaniza texto con tono menos genérico de IA. |
| `daves-rename` | `.agents/skills/daves-rename` | Renombra archivos en lote con patrones. |
| `daves-skill-creator` | `.agents/skills/daves-skill-creator` | Genera nuevos skills siguiendo la plantilla estándar. |

---

## Skills recomendadas para este proyecto (Pelis)

| Tarea en Pelis | Skill sugerida |
|----------------|----------------|
| Mejorar UI de streaming | `design-taste-frontend`, `ui-ux-pro-max`, `redesign-existing-projects` |
| Auditar accesibilidad | `scan`, `audit`, `web-design-guidelines` |
| Revisar arquitectura Convex/Next | `clean-architecture`, `the-architect`, `system-architecture` |
| Redimensionar pósters | `resize-images` |
| Crear slides de producto | `slides`, `slide-deck-generator` |

---

## Ubicaciones

```
pelis-original/
├── .agents/skills/     # 103 skills (Agent Skills)
├── .cursor/skills/     # 7 skills (Cursor UI/UX Pro Max y relacionadas)
└── claude.md           # Este archivo
```

Cada skill vive en su carpeta con un `SKILL.md` que contiene instrucciones detalladas. Léelo antes de invocar la skill en tareas complejas.
