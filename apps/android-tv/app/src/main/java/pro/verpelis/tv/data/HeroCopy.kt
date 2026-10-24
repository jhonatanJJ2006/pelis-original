package pro.verpelis.tv.data

import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.data.tv.ContinueItem
import pro.verpelis.tv.data.tv.TitleDto

/** Espera antes de pedir el fondo nuevo, para no encadenar descargas al pasar el mando. */
const val HERO_BACKDROP_DEBOUNCE_MS = 250L

/** Espera antes de pedir duración/tráiler, para no golpear la API en cada paso. */
const val HERO_EXTRA_DEBOUNCE_MS = 400L

/**
 * Título que pinta el hero. El nombre ya viene de `displayTitle` en el API
 * (movies y seguir viendo); aquí no se vuelve a inventar.
 */
data class HeroFocus(
    val id: String,
    val kind: TitleKind,
    val name: String,
    val backdropImage: String?,
    val synopsis: String?,
    val year: String,
    val classification: String?,
    val genres: String,
    /** Segundos del archivo, si seguir viendo los trae. */
    val durationSeconds: Int?,
)

/** Sube al mover el foco: una carga vieja ya no puede pintar. */
class HeroImageGate {
    private var generation = 0
    fun begin(): Int = ++generation
    fun isCurrent(token: Int): Boolean = token == generation
}

fun formatHeroDuration(totalSeconds: Int?): String? {
    if (totalSeconds == null || totalSeconds <= 0) return null
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    return when {
        hours > 0 && minutes > 0 -> "$hours h $minutes min"
        hours > 0 -> "$hours h"
        else -> "$minutes min"
    }
}

fun formatHeroMinutes(minutes: Int?): String? {
    if (minutes == null || minutes <= 0) return null
    return formatHeroDuration(minutes * 60)
}

fun heroMetaLine(year: String?, duration: String?, classification: String?, genres: String?): String {
    return listOfNotNull(
        year?.trim()?.takeIf { it.isNotEmpty() },
        duration?.trim()?.takeIf { it.isNotEmpty() },
        classification?.trim()?.takeIf { it.isNotEmpty() },
        genres?.trim()?.takeIf { it.isNotEmpty() },
    ).joinToString("  ·  ")
}

fun genreLabel(genre: Any?): String = when (genre) {
    is List<*> -> genre.filterNotNull().joinToString(", ") { it.toString().trim() }
    null -> ""
    else -> genre.toString()
        .trim('[', ']', ' ')
        .replace("'", "")
        .split(',')
        .joinToString(", ") { it.trim() }
        .trim()
        .trim(',')
}

fun remainingLabel(durationSec: Long, progressSec: Long): String? {
    if (durationSec <= 0) return null
    val remain = (durationSec - progressSec).coerceAtLeast(0)
    val minutes = (remain / 60).toInt()
    return if (minutes <= 0) "Queda menos de 1 min" else "Quedan $minutes min"
}

private fun kindOf(mediaType: String?, fallback: TitleKind): TitleKind = when (mediaType?.lowercase()) {
    "series" -> TitleKind.SERIES
    "anime" -> TitleKind.ANIME
    "movie" -> TitleKind.MOVIE
    else -> fallback
}

fun CatalogItem.heroFocus(fallback: TitleKind): HeroFocus = HeroFocus(
    id = id,
    kind = kindOf(mediaType, fallback),
    name = displayName,
    backdropImage = backdropImage,
    synopsis = synopsis,
    year = releaseYear.orEmpty(),
    classification = classification,
    genres = genreLabel(genre),
    durationSeconds = null,
)

fun TitleDto.heroFocus(): HeroFocus = HeroFocus(
    id = id,
    kind = kind,
    name = displayName,
    backdropImage = backdropImage,
    synopsis = synopsis,
    year = yearText,
    classification = classification,
    genres = genreLabel(genre).ifBlank { genreText },
    durationSeconds = null,
)

fun ContinueItem.heroFocus(): HeroFocus = HeroFocus(
    id = id,
    kind = kind,
    name = name,
    backdropImage = backdropImage?.takeIf { it.isNotBlank() },
    synopsis = synopsis,
    year = year.orEmpty(),
    classification = classification,
    genres = genres.orEmpty(),
    durationSeconds = durationSec.takeIf { it > 0 }?.toInt(),
)
