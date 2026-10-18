package pro.verpelis.tv.data.playback

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackErrorsTest {
    @Test fun `status codes map to the real cause`() {
        assertEquals(PlaybackErrorKind.UNAUTHENTICATED, PlaybackErrors.fromStatus(401).kind)
        assertEquals(PlaybackErrorKind.NO_PLAN, PlaybackErrors.fromStatus(403).kind)
        assertEquals(PlaybackErrorKind.MISSING, PlaybackErrors.fromStatus(404).kind)
        assertEquals(PlaybackErrorKind.MISSING, PlaybackErrors.fromStatus(410).kind)
        assertEquals(PlaybackErrorKind.DISK, PlaybackErrors.fromStatus(503).kind)
        assertEquals(PlaybackErrorKind.NETWORK, PlaybackErrors.fromStatus(500).kind)
    }

    @Test fun `server code wins over status`() {
        assertEquals(PlaybackErrorKind.DISK, PlaybackErrors.fromStatus(404, "disk_unavailable").kind)
        assertEquals(PlaybackErrorKind.MISSING, PlaybackErrors.fromStatus(503, "video_missing").kind)
        assertEquals(PlaybackErrorKind.NO_PLAN, PlaybackErrors.fromStatus(401, "no_plan").kind)
        assertEquals(PlaybackErrorKind.UNAUTHENTICATED, PlaybackErrors.fromStatus(400, "unauthenticated").kind)
    }

    @Test fun `messages say what to do`() {
        assertTrue(PlaybackErrors.fromStatus(401).message.contains("Inicia sesión"))
        assertTrue(PlaybackErrors.fromStatus(403).message.contains("plan"))
        assertTrue(PlaybackErrors.fromStatus(404).message.contains("no está disponible"))
        assertTrue(PlaybackErrors.fromStatus(503).message.contains("servidor de videos"))
        assertTrue(PlaybackErrors.of(PlaybackErrorKind.NETWORK).message.contains("Error de conexión"))
        assertTrue(PlaybackErrors.fromStatus(401).needsLogin)
    }

    @Test fun `player failures use http status, then io, then decoder`() {
        assertEquals(PlaybackErrorKind.NO_PLAN, PlaybackErrors.fromPlayerFailure(403, ioFailure = true).kind)
        assertEquals(PlaybackErrorKind.NETWORK, PlaybackErrors.fromPlayerFailure(null, ioFailure = true).kind)
        assertEquals(PlaybackErrorKind.UNSUPPORTED, PlaybackErrors.fromPlayerFailure(null, ioFailure = false).kind)
    }

    @Test fun `session problems outrank missing`() {
        val missing = PlaybackErrors.fromStatus(404)
        val auth = PlaybackErrors.fromStatus(401)
        assertEquals(auth, PlaybackErrors.worst(missing, auth))
        assertEquals(auth, PlaybackErrors.worst(auth, missing))
        assertEquals(PlaybackErrorKind.MISSING, PlaybackErrors.worst(null, null).kind)
    }
}
