package pro.verpelis.tv.data.playback

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackResolverTest {
    private val base = "https://verpelis.pro/"

    private fun resolver(get: (String) -> HttpReply, head: (String) -> HttpReply = { HttpReply(200) }, calls: MutableList<String> = mutableListOf()) =
        PlaybackResolver(base, get = { calls += "GET $it"; get(it) }, head = { calls += "HEAD $it"; head(it) })

    @Test fun `absolute joins relative api paths`() {
        assertEquals("https://verpelis.pro/api/stream/a/b.m3u8", PlaybackUrls.absolute(base, "/api/stream/a/b.m3u8"))
        assertEquals("https://verpelis.pro/uploads/x.webp", PlaybackUrls.absolute(base, "uploads/x.webp"))
        assertEquals("https://cdn.example/x.m3u8", PlaybackUrls.absolute(base, "https://cdn.example/x.m3u8"))
        assertEquals(null, PlaybackUrls.absolute(base, "  "))
        assertEquals("https://verpelis.pro/api/stream/resolve?token=a+b%2Fc", PlaybackUrls.resolveEndpoint(base, "a b/c"))
    }

    @Test fun `token resolver goes first for local streams (prefers master)`() = runBlocking {
        val calls = mutableListOf<String>()
        val r = resolver({ HttpReply(200, """{"url":"/api/stream/t/t/master.m3u8"}""") }, calls = calls)
            .resolve("/api/stream/t/t/playlist.m3u8", "t")
        assertEquals(Resolution.Ok(PlayableSource("https://verpelis.pro/api/stream/t/t/master.m3u8", true)), r)
        assertEquals(listOf("GET https://verpelis.pro/api/stream/resolve?token=t"), calls)
    }

    @Test fun `external videoUrl plays directly`() = runBlocking {
        val r = resolver({ error("no network expected") }).resolve("https://cdn.example/movie.mp4", "t")
        assertEquals(Resolution.Ok(PlayableSource("https://cdn.example/movie.mp4", false)), r)
    }

    @Test fun `401 and 403 from the resolver are final`() = runBlocking {
        val r401 = resolver({ HttpReply(401, """{"code":"unauthenticated"}""") }, head = { error("no head") })
            .resolve("/api/stream/t/t/playlist.m3u8", "t")
        assertEquals(PlaybackErrorKind.UNAUTHENTICATED, (r401 as Resolution.Failed).error.kind)
        val r403 = resolver({ HttpReply(403, """{"code":"no_plan"}""") }, head = { error("no head") })
            .resolve("/api/stream/t/t/playlist.m3u8", "t")
        assertEquals(PlaybackErrorKind.NO_PLAN, (r403 as Resolution.Failed).error.kind)
    }

    @Test fun `404 from resolver falls back to videoUrl when it exists`() = runBlocking {
        val r = resolver({ HttpReply(404, """{"url":null,"code":"video_missing"}""") }, head = { HttpReply(200) })
            .resolve("/api/stream/t/t/playlist.m3u8", "t")
        assertTrue(r is Resolution.Ok)
    }

    @Test fun `503 disk unavailable is reported when videoUrl also fails`() = runBlocking {
        val r = resolver({ HttpReply(503, """{"code":"disk_unavailable"}""") }, head = { HttpReply(404) })
            .resolve("/api/stream/t/t/playlist.m3u8", "t")
        assertEquals(PlaybackErrorKind.DISK, (r as Resolution.Failed).error.kind)
    }

    @Test fun `network failure is a connection error`() = runBlocking {
        val r = resolver({ HttpReply(0) }, head = { HttpReply(0) }).resolve(null, "t")
        assertEquals(PlaybackErrorKind.NETWORK, (r as Resolution.Failed).error.kind)
    }

    @Test fun `no video and no token is missing`() = runBlocking {
        val r = resolver({ error("unused") }).resolve(null, null)
        assertEquals(PlaybackErrorKind.MISSING, (r as Resolution.Failed).error.kind)
    }
}
