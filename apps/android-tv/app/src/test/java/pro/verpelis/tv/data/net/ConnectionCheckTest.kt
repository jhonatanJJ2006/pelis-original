package pro.verpelis.tv.data.net

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ConnectionCheckTest {
    @Test
    fun hostOf_stripsSchemeAndPath() {
        assertEquals("verpelis.pro", ConnectionCheck.hostOf("https://verpelis.pro/"))
        assertEquals("10.0.2.2:3000", ConnectionCheck.hostOf("http://10.0.2.2:3000/api/"))
    }

    @Test
    fun describe_usesPlainSpanishWithoutInventedClaims() {
        val all = listOf(
            ConnectionStatus.NoNetwork,
            ConnectionStatus.ServerUnreachable("verpelis.pro"),
            ConnectionStatus.Ok("verpelis.pro", 120),
        ).map(ConnectionCheck::describe)
        assertTrue(all[0].contains("no está conectada a internet"))
        assertTrue(all[1].contains("verpelis.pro no respondió"))
        assertTrue(all[2].contains("120 ms"))
        all.forEach { text ->
            listOf("caché", "fiduciaria", "protocolo", "servidor:").forEach { banned ->
                assertFalse("\"$banned\" en: $text", text.lowercase().contains(banned))
            }
        }
    }
}
