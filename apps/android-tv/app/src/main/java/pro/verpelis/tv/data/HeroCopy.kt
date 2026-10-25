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
    /** Póster: fondo de reserva si no hay fondo horizontal o es casi negro. */
    val poster: String? = null,
    /** Solo un título destacado lleva «Estreno destacado». */
    val featured: Boolean = false,
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
    poster = image,
    featured = featured == true,
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
    poster = image,
    featured = featured == true,
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
    poster = image,
    featured = featured,
)

/** Sinopsis del hero en la TV: dos líneas a 12 sp caben unos 170 caracteres. */
const val HERO_SYNOPSIS_MAX = 170

/** Fondo con luminancia media (0–255) por debajo de esto: se usa el póster. */
const val HERO_DARK_LUMA = 22

private val CREDITS_START = Regex(
    """\*\*|(?:^|\n)[ \t]*(?:reparto|elenco|cast|starring|protagonistas|protagonizada por|dirigid[ao] por|direcci[oó]n|directora?|guion|música|país)\b""",
    RegexOption.IGNORE_CASE,
)
private val CREDITS_SENTENCE = Regex(
    """\b(?:reparto|starring)\b|\b(?:completan|encabezan|lideran|forman)\b[^.]*\belenco\b""",
    RegexOption.IGNORE_CASE,
)
private val SENTENCE_SPLIT = Regex("""(?<![\s.]\p{Lu}\.)(?<=[.!?…]["»”')]?)\s+(?=[¡¿«"'(]*\p{Lu})""")
private val ES = java.util.Locale("es")

private fun sentenceCase(text: String): String {
    val letters = text.filter { it.isLetter() }
    var out = text
    if (letters.length >= 12 && letters.count { it.isUpperCase() } > letters.length * 0.8) {
        out = text.lowercase(ES).replace(Regex("""(^|[.!?¡¿]\s+)(\p{Ll})""")) { m ->
            m.groupValues[1] + m.groupValues[2].uppercase(ES)
        }
    }
    val first = out.indexOfFirst { it.isLetter() }
    if (first < 0 || !out[first].isLowerCase() || out.substring(0, first).any { it !in "¡¿«\"'( " }) return out
    return out.substring(0, first) + out.substring(first, first + 1).uppercase(ES) + out.substring(first + 1)
}

/**
 * Sinopsis corta y limpia (igual que la web): sin reparto ni créditos, en tipo
 * oración y cortada por palabra con «…». Vacía si no queda texto útil.
 */
fun heroSynopsis(raw: String?, max: Int = HERO_SYNOPSIS_MAX): String {
    var text = raw.orEmpty()
    CREDITS_START.find(text)?.let { text = text.substring(0, it.range.first) }
    text = text.replace(Regex("[*_#]+"), " ").replace(Regex("\\s+"), " ").trim()
    text = text.split(SENTENCE_SPLIT)
        .map { it.trim() }
        .filter { it.isNotEmpty() && !CREDITS_SENTENCE.containsMatchIn(it) }
        .joinToString(" ")
        .trim()
    if (text.none { it.isLetter() }) return ""
    text = sentenceCase(text)
    if (text.length <= max) return text
    val head = text.substring(0, max)
    val end = maxOf(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "))
    if (end >= max * 0.55) return head.substring(0, end + 1)
    val space = head.lastIndexOf(' ')
    val base = (if (space > max * 0.5) head.substring(0, space) else head.substring(0, max - 1))
        .trimEnd(' ', ',', ';', ':', '.', '-', '–', '—')
    return "$base…"
}

/** ¿Fondo casi negro? (luminancia media 0–255). */
fun isTooDark(meanLuma: Double?): Boolean = meanLuma != null && !meanLuma.isNaN() && meanLuma < HERO_DARK_LUMA

/** Ids únicos, en orden, para pedir las duraciones en lotes. */
fun heroRuntimeIds(vararg lists: List<String>?): List<String> {
    val seen = LinkedHashSet<String>()
    lists.forEach { list -> list?.forEach { if (it.isNotBlank()) seen.add(it) } }
    return seen.toList()
}
