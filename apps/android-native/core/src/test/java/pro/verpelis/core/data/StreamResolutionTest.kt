package pro.verpelis.core.data

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class StreamResolutionTest {
    private val base = "https://verpelis.pro"
    private val old = "$base/api/stream/goat-2026/playlist.m3u8"
    private val master = "/api/stream/goat-2026/goat-2026/master.m3u8"

    private fun pick(videoUrl: String?, token: String?, reply: ResolveReply?): Pair<String?, List<String>> {
        val calls = mutableListOf<String>()
        val url = runBlocking {
            StreamResolution.pick(base, videoUrl, token) { t -> calls += t; reply ?: throw java.io.IOException("offline") }
        }
        return url to calls
    }

    @Test fun resolverGoesFirstOverStoredPlaylist() {
        val (url, calls) = pick(old, "goat-2026", ResolveReply(200, master))
        assertEquals("$base$master", url)
        assertEquals(listOf("goat-2026"), calls)
    }

    @Test fun fallsBackToVideoUrlWhenResolverFails() {
        assertEquals(old, pick(old, "goat-2026", ResolveReply(404)).first)
        assertEquals(old, pick(old, "goat-2026", ResolveReply(503)).first)
        assertEquals(old, pick(old, "goat-2026", null).first)
        assertEquals(old, pick(old, "goat-2026", ResolveReply(200, null)).first)
        assertEquals(old, pick(old, null, null).first)
    }

    @Test fun noFallbackWithoutSessionOrPlan() {
        assertNull(pick(old, "goat-2026", ResolveReply(401)).first)
        assertNull(pick(old, "goat-2026", ResolveReply(403)).first)
    }

    @Test fun externalUrlSkipsResolver() {
        val (url, calls) = pick("https://cdn.example.com/a.mp4", "t", ResolveReply(200, master))
        assertEquals("https://cdn.example.com/a.mp4", url)
        assertEquals(emptyList<String>(), calls)
    }

    @Test fun tokenOnly() {
        assertEquals("$base$master", pick(null, "t", ResolveReply(200, master)).first)
        assertNull(pick(null, "t", ResolveReply(404)).first)
        assertNull(pick(null, null, null).first)
    }
}
