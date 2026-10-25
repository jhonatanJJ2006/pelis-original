package pro.verpelis.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SynopsisTextTest {
    private val goat = "Will es una pequeña cabra con grandes sueños. ¡Los pequeños saben jugar!.\n**REPARTO**:\nCaleb McLaughlin, Gabrielle Union.\n\n**Dirigida por Tyree Dillihay\nEstudio de doblaje:\n-VSI Mexico City"

    @Test fun quitaMarkdownYCreditos() {
        val s = SynopsisText.clean(goat)
        assertFalse(s.contains("*")); assertFalse(s.contains("REPARTO")); assertFalse(s.contains("Dirigida")); assertFalse(s.contains("doblaje"))
        assertTrue(s.startsWith("Will es una pequeña cabra"))
    }

    @Test fun cortaPorPalabraConElipsis() {
        val s = SynopsisText.clean("Una historia muy larga sobre un grupo de amigos que viajan por todo el mundo buscando aventuras", 40)
        assertTrue(s.endsWith("…")); assertTrue(s.length <= 40); assertFalse(s.dropLast(1).endsWith(" "))
    }

    @Test fun conservaIniciales() {
        assertEquals("Con Samuel L. Jackson en el papel principal.", SynopsisText.clean("Con Samuel L. Jackson en el papel principal."))
    }

    @Test fun mayusculasSostenidasATipoOracion() {
        assertEquals("Una noche en la ciudad. Todo cambia.", SynopsisText.clean("UNA NOCHE EN LA CIUDAD. TODO CAMBIA."))
    }

    @Test fun vacioSiSoloHayCreditos() { assertEquals("", SynopsisText.clean("**REPARTO**: Fulano")) }
}
