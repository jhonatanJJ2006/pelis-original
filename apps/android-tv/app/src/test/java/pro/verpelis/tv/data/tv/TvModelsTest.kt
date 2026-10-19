package pro.verpelis.tv.data.tv

import org.junit.Assert.assertEquals
import org.junit.Test
import pro.verpelis.tv.data.playback.TitleKind

class TvModelsTest {
    @Test
    fun initialsFromNameOrEmail() {
        assertEquals("PQ", MeDto(name = "Pelis QA").initials)
        assertEquals("PQ", MeDto(email = "pelis.qa@verpelis.pro").initials)
        assertEquals("?", MeDto().initials)
    }

    @Test
    fun titleTextHelpers() {
        val t = TitleDto(id = "1", name = "X", genre = listOf("Acción", "Drama"), year = 2003.0, mediaType = "series")
        assertEquals("Acción, Drama", t.genreText)
        assertEquals("2003", t.yearText)
        assertEquals(TitleKind.SERIES, t.kind)
        assertEquals("Adventure, Comedy", TitleDto(genre = "['Adventure', 'Comedy']").genreText)
    }
}
