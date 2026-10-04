# Aviso de actualización (TWA móvil)

`apps/android/app/` lo genera Bubblewrap y está en `.gitignore`, así que la actividad no vive ahí.

`ApkUpdateActivity` es el launcher. Al abrir Pelis compara el `versionCode` instalado con `GET https://verpelis.pro/api/app/availability` (`apkVersionCode`). Si el del servidor es mayor y `apkAvailable` es true, muestra **Actualizar** / **Más tarde** antes de abrir la web. Actualizar descarga `https://verpelis.pro/downloads/pelis.apk` y lo entrega al instalador del sistema. No instala en silencio. Si falta el permiso, abre la pantalla de orígenes desconocidos.

`pnpm android:build` aplica este overlay (`scripts/apply-twa-apk-update.mjs`) justo antes de Gradle: copia la actividad, mueve `MAIN/LAUNCHER`, añade `REQUEST_INSTALL_PACKAGES` y alinea `versionCode` / `versionName` con `twa-manifest.json`.

`app-version.json` no se toca en este cambio. Hay que publicarlo junto con el APK nuevo (versionCode 4); si el JSON sube antes que el binario, la app ofrecería un APK que no es más nuevo.
