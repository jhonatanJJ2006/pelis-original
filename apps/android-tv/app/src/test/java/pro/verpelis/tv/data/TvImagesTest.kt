package pro.verpelis.tv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TvImagesTest {
    private val base = "https://verpelis.pro/"

    @Test
    fun uploadsGoThroughNextOptimizer() {
        assertEquals(
            "https://verpelis.pro/_next/image?url=%2Fuploads%2Fa.webp&w=256&q=70",
            TvImages.sized(base, "/uploads/a.webp", 232),
        )
        assertEquals(
            "https://verpelis.pro/_next/image?url=%2Fuploads%2Fb.webp&w=1080&q=70",
            TvImages.sized(base, "https://verpelis.pro/uploads/b.webp", 1080),
        )
    }

    @Test
    fun externalUrlsUntouched() {
        val anilist = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1.png"
        assertEquals(anilist, TvImages.sized(base, anilist, 256))
        assertEquals("https://verpelis.pro/logo.png", TvImages.sized(base, "/logo.png", 256))
        assertNull(TvImages.sized(base, " ", 256))
    }

    @Test
    fun widthSnapsToAllowedNextSizes() {
        assertEquals(256, TvImages.nextWidth(232))
        assertEquals(640, TvImages.nextWidth(500))
        assertEquals(1920, TvImages.nextWidth(5000))
    }
}
