package pro.verpelis.tv.data

import java.net.URLEncoder

/**
 * URLs de imagen al tamaño de la tarjeta.
 *
 * Los posters y fondos de /uploads salen de Movies, cuya subida ronda los
 * 150–220 KB/s: un fondo original pesa ~250 KB y el poster ~35 KB. Pasados por el
 * optimizador de Next (/_next/image) a WebP al ancho de la tarjeta bajan a
 * ~6–14 KB, así la portada carga varias veces más rápido y Coil decodifica
 * bitmaps pequeños (menos RAM en los TV box).
 */
object TvImages {
    /** Anchos que acepta Next por defecto (imageSizes + deviceSizes). */
    private val NEXT_WIDTHS = intArrayOf(64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920)

    const val POSTER_WIDTH = 256
    /** Fondo a pantalla completa: 1920 px (Full HD). Antes 1080/640 y se veía pixelado al estirarlo. */
    const val BACKDROP_WIDTH = 1920
    /** TV box con poca RAM: 1200 px + RGB_565 (≈2,8 MB de bitmap), sin cargar nunca el original. */
    const val BACKDROP_WIDTH_LOW_RAM = 1200

    /** Ancho del fondo para esta pantalla: el ancho real en píxeles, con tope según la RAM. */
    fun backdropWidth(context: android.content.Context, lowRam: Boolean): Int {
        val screen = context.resources.displayMetrics.widthPixels.coerceAtLeast(640)
        return nextWidth(minOf(screen, if (lowRam) BACKDROP_WIDTH_LOW_RAM else BACKDROP_WIDTH))
    }

    /** Petición de Coil para un fondo horizontal decodificado al tamaño de la pantalla. */
    fun backdropRequest(context: android.content.Context, base: String, raw: String?, lowRam: Boolean): coil.request.ImageRequest? {
        val url = sized(base, raw, backdropWidth(context, lowRam)) ?: return null
        val w = backdropWidth(context, lowRam)
        return coil.request.ImageRequest.Builder(context)
            .data(url)
            .size(w, w * 9 / 16)
            .precision(coil.size.Precision.INEXACT)
            .allowRgb565(lowRam)
            .build()
    }
    private const val QUALITY = 70

    fun nextWidth(px: Int): Int = NEXT_WIDTHS.firstOrNull { it >= px } ?: NEXT_WIDTHS.last()

    /**
     * [raw] relativa (/uploads/...) o absoluta de nuestro propio dominio → URL del
     * optimizador. Otras URLs (AniList, logos de canales) se devuelven tal cual.
     */
    fun sized(base: String, raw: String?, widthPx: Int): String? {
        val value = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val root = base.trimEnd('/')
        val path = when {
            value.startsWith("/_next/image") || value.startsWith("$root/_next/image") ->
                return if (value.startsWith("/")) root + value else value
            value.startsWith("/") -> value
            value.startsWith("$root/") -> value.removePrefix(root)
            value.startsWith("http://") || value.startsWith("https://") -> return value
            else -> "/$value"
        }
        // /uploads y /peliculas pasan por el optimizador: nunca se baja el original a la TV.
        if (!path.startsWith("/uploads/") && !path.startsWith("/peliculas/")) return root + path
        val encoded = URLEncoder.encode(path, "UTF-8")
        return "$root/_next/image?url=$encoded&w=${nextWidth(widthPx)}&q=$QUALITY"
    }
}
