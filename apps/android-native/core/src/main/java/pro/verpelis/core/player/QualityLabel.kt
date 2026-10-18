package pro.verpelis.core.player

import kotlin.math.abs

/**
 * Nombre estándar de un nivel HLS. Las películas en scope (2.39:1) tienen menos alto que el
 * nominal: 1918×802 → 1080p, 1280×536 → 720p, 854×358 → 480p, 640×268 → 360p.
 */
object QualityLabel {
    private val tiers = listOf(2160, 1440, 1080, 720, 480, 360, 240, 144)

    fun of(width: Int, height: Int): String? {
        if (height <= 0) return null
        val nominal = maxOf(height, if (width > 0) width * 9 / 16 else 0)
        val tier = tiers.minBy { abs(it - nominal) }
        return "${if (abs(tier - nominal) <= tier / 10) tier else nominal}p"
    }
}
