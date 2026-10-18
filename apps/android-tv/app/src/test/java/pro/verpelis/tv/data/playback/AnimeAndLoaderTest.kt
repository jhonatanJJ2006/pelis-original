package pro.verpelis.tv.data.playback

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AnimeAndLoaderTest {
    private val base = "https://verpelis.pro/"
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private fun parse(json: String) = moshi.adapter(EpisodeStreamResponse::class.java).fromJson(json)

    @Test fun `hls response keeps native sources and drops iframe hosts`() {
        val pick = AnimeSources.pick(
            base,
            parse(
                """{"kind":"hls","provider":"vidnest-hls","sources":[
                {"url":"https://mega.nz/embed/abc","quality":"auto"},
                {"url":"https://cdn.x/ep1.mp4","quality":"720p"},
                {"url":"/api/anime/stream?u=https%3A%2F%2Fh.x%2Fm.m3u8","quality":"auto","isM3U8":true}],
                "subtitles":[{"url":"/api/anime/stream?u=s.vtt","lang":"Español"}]}""",
            ),
        ) as AnimePick.Playable
        assertEquals(2, pick.sources.size)
        assertTrue(pick.sources[0].isHls)
        assertEquals("https://verpelis.pro/api/anime/stream?u=https%3A%2F%2Fh.x%2Fm.m3u8", pick.sources[0].url)
        assertEquals(PlayableSource("https://cdn.x/ep1.mp4", false), pick.sources[1])
        assertEquals("https://verpelis.pro/api/anime/stream?u=s.vtt", pick.subtitles.single().url)
    }

    @Test fun `embed and none responses`() {
        assertEquals(AnimePick.EmbedOnly("mega"), AnimeSources.pick(base, parse("""{"kind":"embed","provider":"mega","url":"https://mega.nz/embed/x"}""")))
        assertEquals(AnimePick.Unavailable("Ningún proveedor"), AnimeSources.pick(base, parse("""{"kind":"none","error":"Ningún proveedor"}""")))
        assertEquals(AnimePick.EmbedOnly("x"), AnimeSources.pick(base, parse("""{"kind":"hls","provider":"x","sources":[{"url":"https://mega.nz/file/y"}]}""")))
    }

    private class FakeBackend(val responses: MutableList<EpisodeStreamResponse?>, val detail: TitleDetail, val resolution: Resolution = Resolution.Failed(PlaybackErrors.fromStatus(404))) : PlaybackBackend {
        override val base = "https://verpelis.pro/"
        val excludes = mutableListOf<List<String>>()
        var resolveCalls = 0
        override suspend fun title(kind: TitleKind, id: String) = detail
        override suspend fun resolve(detail: TitleDetail): Resolution { resolveCalls++; return resolution }
        override suspend fun animeEpisode(animeId: String, episode: Int, exclude: List<String>): EpisodeStreamResponse? {
            excludes += exclude
            return responses.removeAt(0)
        }
    }

    private val anime = TitleDetail(id = "a1", kind = TitleKind.ANIME, name = "Frieren", episodes = 28)

    @Test fun `embed-only anime skips to the next hls source`() = runBlocking {
        val backend = FakeBackend(
            mutableListOf(
                EpisodeStreamResponse(kind = "embed", provider = "mega"),
                EpisodeStreamResponse(kind = "hls", provider = "vidnest-hls", sources = listOf(AnimeSourceDto(url = "/api/anime/stream?u=m.m3u8", isM3U8 = true))),
            ),
            anime,
        )
        val statuses = mutableListOf<String>()
        val r = PlaybackLoader(backend).load(TitleKind.ANIME, "a1", 3) { statuses += it } as LoadResult.Ready
        assertEquals(listOf(emptyList(), listOf("mega", "vidnest")), backend.excludes)
        assertTrue(r.notice!!.contains("mega"))
        assertTrue(statuses.last().contains("solo ofrece reproductor web"))
        assertTrue(r.sources.single().isHls)
    }

    @Test fun `only iframes left gives a clear message`() = runBlocking {
        val backend = FakeBackend(mutableListOf(EpisodeStreamResponse(kind = "embed", provider = "mega"), EpisodeStreamResponse(kind = "embed", provider = "videasy")), anime)
        val r = PlaybackLoader(backend).load(TitleKind.ANIME, "a1", 1) as LoadResult.Failed
        assertEquals(PlaybackErrorKind.EMBED_ONLY, r.error.kind)
        assertTrue(r.error.message.contains("mega, videasy"))
    }

    @Test fun `none after an iframe still reports the iframe cause`() = runBlocking {
        val backend = FakeBackend(mutableListOf(EpisodeStreamResponse(kind = "embed", provider = "mega"), EpisodeStreamResponse(kind = "none", error = "Ningún proveedor")), anime)
        val r = PlaybackLoader(backend).load(TitleKind.ANIME, "a1", 1) as LoadResult.Failed
        assertEquals(PlaybackErrorKind.EMBED_ONLY, r.error.kind)
        assertTrue(r.error.message.contains("mega"))
    }

    @Test fun `none on first try keeps the server message`() = runBlocking {
        val backend = FakeBackend(mutableListOf(EpisodeStreamResponse(kind = "none", error = "Ningún proveedor")), anime)
        val r = PlaybackLoader(backend).load(TitleKind.ANIME, "a1", 1) as LoadResult.Failed
        assertEquals(PlaybackErrorKind.MISSING, r.error.kind)
        assertTrue(r.error.message.contains("Ningún proveedor"))
    }

    @Test fun `api 401 while fetching an episode asks to sign in`() = runBlocking {
        val backend = object : PlaybackBackend {
            override val base = "https://verpelis.pro/"
            override suspend fun title(kind: TitleKind, id: String) = anime
            override suspend fun resolve(detail: TitleDetail): Resolution = error("unused")
            override suspend fun animeEpisode(animeId: String, episode: Int, exclude: List<String>): EpisodeStreamResponse? =
                throw ApiCallException(401, "No autenticado")
        }
        val r = PlaybackLoader(backend).load(TitleKind.ANIME, "a1", 1) as LoadResult.Failed
        assertEquals(PlaybackErrorKind.UNAUTHENTICATED, r.error.kind)
    }

    @Test fun `series only has episode 1 and coming soon never resolves`() = runBlocking {
        val series = TitleDetail(id = "s1", kind = TitleKind.SERIES, name = "Serie", episodes = 8, token = "s1")
        val ok = Resolution.Ok(PlayableSource("https://verpelis.pro/api/stream/s1/master.m3u8", true))
        val backend = FakeBackend(mutableListOf(), series, ok)
        assertTrue(PlaybackLoader(backend).load(TitleKind.SERIES, "s1", 1) is LoadResult.Ready)
        val ep2 = PlaybackLoader(backend).load(TitleKind.SERIES, "s1", 2) as LoadResult.Failed
        assertTrue(ep2.error.message.contains("Próximamente"))
        val soon = FakeBackend(mutableListOf(), series.copy(comingSoon = true), ok)
        val r = PlaybackLoader(soon).load(TitleKind.SERIES, "s1", 1) as LoadResult.Failed
        assertTrue(r.error.message.contains("Próximamente"))
        assertEquals(0, soon.resolveCalls)
    }

    @Test fun `movie resolution errors keep their cause`() = runBlocking {
        val movie = TitleDetail(id = "m1", kind = TitleKind.MOVIE, name = "The Wrecking Crew", token = "t")
        val backend = FakeBackend(mutableListOf(), movie, Resolution.Failed(PlaybackErrors.fromStatus(403)))
        val r = PlaybackLoader(backend).load(TitleKind.MOVIE, "m1", 1) as LoadResult.Failed
        assertEquals(PlaybackErrorKind.NO_PLAN, r.error.kind)
    }
}
