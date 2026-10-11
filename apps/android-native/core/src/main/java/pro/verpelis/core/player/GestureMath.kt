package pro.verpelis.core.player

/** Lógica pura de los gestos del reproductor (testeable sin Android). */
object GestureMath {
    enum class Zone { BRIGHTNESS, VOLUME }

    /** Mitad izquierda = brillo, mitad derecha = volumen. */
    fun zoneFor(x: Float, width: Float): Zone = if (x < width / 2f) Zone.BRIGHTNESS else Zone.VOLUME

    /** Los gestos solo funcionan en pantalla completa. */
    fun gesturesEnabled(fullscreen: Boolean): Boolean = fullscreen

    /**
     * Aplica un arrastre vertical (dy en px, negativo = hacia arriba) a un nivel 0..1.
     * Recorrer toda la altura de la pantalla equivale a pasar de 0 a 1.
     */
    fun applyDrag(level: Float, dy: Float, height: Float): Float {
        if (height <= 0f) return level.coerceIn(0f, 1f)
        return (level - dy / height).coerceIn(0f, 1f)
    }

    /** Convierte 0..1 a un índice de volumen del AudioManager. */
    fun toVolumeIndex(level: Float, max: Int): Int = Math.round(level.coerceIn(0f, 1f) * max).coerceIn(0, max)

    fun fromVolumeIndex(index: Int, max: Int): Float = if (max <= 0) 0f else (index.toFloat() / max).coerceIn(0f, 1f)

    /** Brillo de ventana: nunca 0 absoluto para que la pantalla no quede negra. */
    fun toWindowBrightness(level: Float): Float = level.coerceIn(0.01f, 1f)

    /** Porcentaje que muestra el HUD superior. */
    fun hudPercent(level: Float): Int = Math.round(level.coerceIn(0f, 1f) * 100)

    /** Ancho del relleno de la barra horizontal del HUD. */
    fun hudFill(level: Float, barWidth: Float): Float = level.coerceIn(0f, 1f) * barWidth

    /** Rebobinar/avanzar con el D-pad (TV): pasos de 10 s acotados a la duración. */
    fun seek(positionMs: Long, durationMs: Long, forward: Boolean, stepMs: Long = 10_000): Long {
        val target = positionMs + if (forward) stepMs else -stepMs
        return if (durationMs > 0) target.coerceIn(0, durationMs) else target.coerceAtLeast(0)
    }
}
