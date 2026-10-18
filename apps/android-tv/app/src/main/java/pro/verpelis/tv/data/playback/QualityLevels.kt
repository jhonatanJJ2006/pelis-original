package pro.verpelis.tv.data.playback

/** Una variante de video del HLS (índices del grupo/pista de ExoPlayer). */
data class QualityLevel(val height: Int, val bitrate: Int, val group: Int, val track: Int) {
    val label: String
        get() = when {
            height >= 2160 -> "2160p 4K"
            height >= 1080 -> "${height}p Full HD"
            height >= 720 -> "${height}p HD"
            height > 0 -> "${height}p SD"
            else -> "Calidad ${track + 1}"
        }
    val detail: String
        get() = if (bitrate > 0) "%.1f Mbps".format(bitrate / 1_000_000.0) else ""
}

object QualityLevels {
    /**
     * Niveles del selector: uno por altura (el de mayor bitrate), de mayor a menor,
     * sin superar la pantalla (mismo tope que la selección adaptativa).
     * Con un solo nivel el selector se oculta.
     */
    fun build(candidates: List<QualityLevel>, displayHeight: Int): List<QualityLevel> {
        val byHeight = candidates
            .groupBy { it.height }
            .map { (_, list) -> list.maxBy { it.bitrate } }
            .sortedByDescending { it.height }
        val capped = if (displayHeight > 0) byHeight.filter { it.height <= displayHeight || it.height <= 0 } else byHeight
        return capped.ifEmpty { byHeight.takeLast(1) }
    }

    fun showSelector(levels: List<QualityLevel>): Boolean = levels.size > 1
}
