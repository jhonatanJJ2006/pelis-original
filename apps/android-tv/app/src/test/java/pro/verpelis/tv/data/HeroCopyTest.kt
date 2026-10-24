package pro.verpelis.tv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.data.tv.ContinueItem

class HeroCopyTest {
    @Test
    fun durationAndMetaMatchTheHeroLine() {
        assertEquals("2 h 46 min", formatHeroDuration(2 * 3600 + 46 * 60))
        assertEquals("1 h", formatHeroDuration(3600))
        assertEquals("46 min", formatHeroMinutes(46))
        assertNull(formatHeroDuration(0))
        assertEquals(
            "2024  ·  2 h 46 min  ·  PG-13  ·  Ciencia ficción, Aventura",
            heroMetaLine("2024", "2 h 46 min", "PG-13", "Ciencia ficción, Aventura"),
        )
    }

    @Test
    fun genresFromAStringOrAList() {
        assertEquals("Drama, Historia", genreLabel(listOf("Drama", "Historia")))
        assertEquals("Drama, Historia", genreLabel("['Drama', 'Historia']"))
        assertEquals("", genreLabel(null))
    }

    @Test
    fun remainingTimeIsSentenceCase() {
        assertEquals("Quedan 34 min", remainingLabel(durationSec = 50 * 60, progressSec = 16 * 60))
        assertEquals("Queda menos de 1 min", remainingLabel(durationSec = 90, progressSec = 40))
        assertNull(remainingLabel(0, 0))
    }

    @Test
    fun catalogAndContinueMapIntoTheHero() {
        val movie = CatalogItem(
            id = "m1",
            name = "Dune: parte dos",
            backdropImage = "/uploads/dune.webp",
            synopsis = "Paul se une a los Fremen.",
            genre = "Ciencia ficción, Aventura",
            releaseYear = "2024",
            classification = "PG-13",
            mediaType = "movie",
        ).heroFocus(TitleKind.MOVIE)
        assertEquals(TitleKind.MOVIE, movie.kind)
        assertEquals("/uploads/dune.webp", movie.backdropImage)
        assertEquals("Ciencia ficción, Aventura", movie.genres)
        assertNull(movie.durationSeconds)

        val cont = ContinueItem(
            id = "c1",
            kind = TitleKind.MOVIE,
            name = "Barbie",
            image = "/uploads/barbie.webp",
            fraction = 0.4f,
            progressSec = 20 * 60,
            backdropImage = "/uploads/barbie-wide.webp",
            durationSec = 114 * 60,
        ).heroFocus()
        assertEquals(114 * 60, cont.durationSeconds)
        assertEquals("/uploads/barbie-wide.webp", cont.backdropImage)
    }

    @Test
    fun aNewerFocusInvalidatesTheImageLoad() {
        val gate = HeroImageGate()
        val first = gate.begin()
        val second = gate.begin()
        assertFalse(gate.isCurrent(first))
        assertTrue(gate.isCurrent(second))
        assertTrue(HERO_BACKDROP_DEBOUNCE_MS >= 200)
    }
}
