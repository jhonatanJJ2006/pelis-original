package pro.verpelis.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.MessageDigest
import java.util.Base64

class PkceTest {
    @Test fun randomTokenIsBase64Url43Chars() {
        val t = Pkce.randomToken()
        assertEquals(43, t.length)
        assertTrue(t.matches(Regex("^[A-Za-z0-9_-]{43}$")))
        assertNotEquals(t, Pkce.randomToken())
    }

    @Test fun challengeIsS256WithoutPadding() {
        val v = Pkce.randomToken()
        val expected = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(MessageDigest.getInstance("SHA-256").digest(v.toByteArray()))
        assertEquals(expected, Pkce.challenge(v))
    }

    @Test fun constantTimeEquals() {
        assertTrue(Pkce.constantTimeEquals("abc", "abc"))
        assertFalse(Pkce.constantTimeEquals("abc", "abd"))
        assertFalse(Pkce.constantTimeEquals("abc", "abcd"))
    }
}
