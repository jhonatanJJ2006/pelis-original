# 0002 — Apps Android TV con Kotlin + Compose for TV

- **Status:** implemented — revisada el 2026-10-17 contra `staging`
- **Date:** 2026-10-17
- **Deciders:** equipo Pelis

## Context

Cuando se escribió esta ADR (rama `feat/native-player-tv`) solo existía el TWA. En `staging` ya
hay:

- `apps/android/` — TWA Bubblewrap, package `pro.verpelis.twa`.
- `apps/android-tv/` — app Android TV **publicada**, package `pro.verpelis.tv`: Kotlin + Compose
  for TV, Media3/ExoPlayer HLS, login con QR y correo (`/api/tv-auth/*`), aviso de actualización
  del APK, Retrofit/Moshi. Sin Hilt ni Leanback.
- `apps/android-native/` — módulos `core`, `phone` (`pro.verpelis.app.native`) y `tv`
  (`pro.verpelis.tv.native`), en desarrollo.

## Options considered

1. **Kotlin + Compose for TV (+ Leanback si hace falta)** — nativo, foco D-pad, Android TV.
2. **Kotlin + Jetpack Compose solo móvil** — TV vía TWA.
3. **Expo / React Native** — reuso de TS, peor en TV.
4. **Solo TWA + PWA instalable.**

## Decision

Opción 1, y es lo que ya está implementado en `apps/android-tv` (sin Leanback: Compose for TV
cubre el foco y las filas). El TWA se mantiene como canal rápido para móvil.

El esqueleto `app.pelis.tv` (Hilt + Leanback) de la rama original **no** se adopta: sustituiría la
app publicada `pro.verpelis.tv` y perdería login QR/correo, aviso de actualización y el rediseño.

## Consequences

- Una app TV publicada (`pro.verpelis.tv`) y una reescritura en curso en `apps/android-native`;
  decidir cuál queda antes de duplicar features.
- Los modelos Kotlin replican los shapes de `/api/*` a mano (ver `ARCHITECTURE.md`, V2).
- Builds vía Gradle wrapper commiteado (`apps/android-tv/gradlew`), script
  `pnpm android-tv:build`.
- Tests JVM existentes (`ApkUpdatePolicyTest`, `QrModulesTest`); faltan tests instrumentados.
