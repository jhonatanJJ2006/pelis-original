# PELIS nativo (Kotlin + Jetpack Compose)

Apps nativas que reemplazarán al contenedor TWA de `apps/android` (que se mantiene sin cambios hasta el reemplazo).

Módulos:

- `core`: cliente de la API (`/api/function/<nombre>`, better-auth y `tv-auth`), sesión con las mismas cookies que la web, tema Maison Noir, reproductor Media3 compartido (HLS, gestos, HUD, calidad y subtítulos) y lógica de gestos con tests.
- `phone`: app de celular (`pro.verpelis.app.native`). Login con correo y contraseña, o con Google en el navegador (Custom Tab) usando el flujo de vinculación `/link-tv`. Inicio, Buscar (películas, series, géneros), Anime, TV en vivo, detalle, Mi lista, Historial, Perfil y Planes (el pago abre el checkout web).
- `tv`: app Android TV (`pro.verpelis.tv.native`) con Compose for TV, entrada `LEANBACK_LAUNCHER`, foco D-pad (escala 1.1, borde dorado 3 dp), vinculación por código o QR y reproductor controlado con D-pad.

No se agregaron endpoints nuevos en `apps/web`: todo usa rutas existentes.

## Compilar

```
export JAVA_HOME=/ruta/a/jdk-17
echo "sdk.dir=/ruta/a/android-sdk" > local.properties
./gradlew :core:testDebugUnitTest :phone:assembleDebug :tv:assembleDebug
```

APKs: `phone/build/outputs/apk/debug/phone-debug.apk` y `tv/build/outputs/apk/debug/tv-debug.apk`.

## Reproductor

- Celular: se abre siempre horizontal y en pantalla completa. Arrastre vertical en la mitad izquierda ajusta el brillo (atributos de ventana) y en la mitad derecha el volumen (AudioManager), solo en pantalla completa. HUD horizontal arriba al centro. Carga con indicador dorado sobre fondo no negro.
- TV: controles de PlayerView con D-pad.

## Pendiente

- Empaquetar las fuentes Fraunces e Inter (por ahora Serif y SansSerif del sistema).
- Íconos y banner definitivos, firma de release y actualización in-app (apk-update).
- Selector de episodios de series y temporadas; anime solo con fuentes HLS (las de tipo embed no se reproducen en nativo).
- Ajuste fino pantalla por pantalla contra los diseños de Stitch.
