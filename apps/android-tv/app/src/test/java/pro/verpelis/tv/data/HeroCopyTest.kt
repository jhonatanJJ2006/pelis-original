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

    @Test
    fun sinopsisSinRepartoNiCreditos() {
        val raw = "Un joven descubre un secreto familiar.\n\n**REPARTO**: Fulano, Mengano\n**Dirigida por** Zutano"
        assertEquals("Un joven descubre un secreto familiar.", heroSynopsis(raw))
        assertEquals(
            "Tarzán vuelve a la selva.",
            heroSynopsis("Tarzán vuelve a la selva. Margot Robbie y Samuel L. Jackson completan el talentoso elenco."),
        )
        assertEquals("Una historia de amor.", heroSynopsis("Una historia de amor.\nReparto: Ana, Luis"))
        assertEquals("", heroSynopsis("**REPARTO**: Ana"))
        assertEquals("", heroSynopsis(null))
    }

    @Test
    fun sinopsisEnTipoOracionYCortadaPorPalabra() {
        assertEquals(
            "Una familia se muda a una casa. Nada es lo que parece.",
            heroSynopsis("UNA FAMILIA SE MUDA A UNA CASA. NADA ES LO QUE PARECE."),
        )
        assertEquals("Una noche cambia todo.", heroSynopsis("una noche cambia todo."))
        val cut = heroSynopsis("palabra ".repeat(60), 100)
        assertTrue(cut.length <= 100)
        assertTrue(cut.endsWith("palabra…"))
    }

    @Test
    fun fondoOscuroYDestacado() {
        assertTrue(isTooDark(5.0))
        assertFalse(isTooDark(43.0))
        assertFalse(isTooDark(null))
        val item = CatalogItem(id = "a", name = "A", image = "/uploads/p.webp", featured = true)
        assertTrue(item.heroFocus(TitleKind.MOVIE).featured)
        assertEquals("/uploads/p.webp", item.heroFocus(TitleKind.MOVIE).poster)
        assertFalse(CatalogItem(id = "b", name = "B").heroFocus(TitleKind.MOVIE).featured)
    }

    @Test
    fun idsDeDuracionUnicosYEnOrden() {
        assertEquals(listOf("a", "b", "c"), heroRuntimeIds(listOf("a", "b"), null, listOf("a", "c", "")))
    }
}
