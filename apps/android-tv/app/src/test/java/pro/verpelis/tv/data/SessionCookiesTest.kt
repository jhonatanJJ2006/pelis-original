package pro.verpelis.tv.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionCookiesTest {
    @Test fun `only signed better-auth cookies count as a session`() {
        assertTrue(SessionCookies.isUsable("better-auth.session_token=abc123.c2lnbmF0dXJl%3D"))
        assertTrue(SessionCookies.isUsable("__Secure-better-auth.session_token=abc%2Esig"))
        assertFalse(SessionCookies.isUsable("better-auth.session_token=abc123"))
        assertFalse(SessionCookies.isUsable("better-auth.session_token=abc123."))
        assertFalse(SessionCookies.isUsable(null))
        assertFalse(SessionCookies.isUsable(""))
    }

    @Test fun `signed cookie is recognised for its own token`() {
        assertTrue(SessionCookies.isSignedFor("tok.sig", "tok"))
        assertTrue(SessionCookies.isSignedFor("tok%2esig", "tok"))
        assertFalse(SessionCookies.isSignedFor("other.sig", "tok"))
        assertFalse(SessionCookies.isSignedFor("tok", "tok"))
    }
}
