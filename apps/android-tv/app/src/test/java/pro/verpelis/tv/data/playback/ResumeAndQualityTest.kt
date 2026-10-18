package pro.verpelis.tv.data.playback

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ResumeAndQualityTest {
    @Test fun `resume only between the first seconds and the credits`() {
        assertNull(ResumePolicy.resumeFromMs(5, 6000))
        assertEquals(754_000L, ResumePolicy.resumeFromMs(754, 6000))
        assertNull(ResumePolicy.resumeFromMs(5970, 6000))
        assertEquals(120_000L, ResumePolicy.resumeFromMs(120, 0))
    }

    @Test fun `seek is clamped and clock is formatted`() {
        assertEquals(0L, ResumePolicy.seekTarget(4_000, 100_000, forward = false))
        assertEquals(100_000L, ResumePolicy.seekTarget(95_000, 100_000, forward = true))
        assertEquals(20_000L, ResumePolicy.seekTarget(10_000, 0, forward = true))
        assertEquals("12:34", ResumePolicy.formatClock(754_000))
        assertEquals("1:52:00", ResumePolicy.formatClock(6_720_000))
        assertTrue(ResumePolicy.shouldSave(6_000, 100_000))
        assertFalse(ResumePolicy.shouldSave(3_000, 100_000))
    }

    @Test fun `quality levels are one per height, capped to the display`() {
        val levels = QualityLevels.build(
            listOf(
                QualityLevel(2160, 16_000_000, 0, 0),
                QualityLevel(1080, 6_000_000, 0, 1),
                QualityLevel(1080, 8_000_000, 0, 2),
                QualityLevel(720, 3_000_000, 0, 3),
                QualityLevel(480, 1_000_000, 0, 4),
            ),
            displayHeight = 1080,
        )
        assertEquals(listOf(1080, 720, 480), levels.map { it.height })
        assertEquals(2, levels.first().track)
        assertEquals("1080p Full HD", levels.first().label)
        assertTrue(QualityLevels.showSelector(levels))
    }

    @Test fun `single level hides the selector`() {
        val one = QualityLevels.build(listOf(QualityLevel(720, 2_500_000, 0, 0)), 1080)
        assertFalse(QualityLevels.showSelector(one))
        val bigOnly = QualityLevels.build(listOf(QualityLevel(2160, 1, 0, 0)), 1080)
        assertEquals(1, bigOnly.size)
    }

    @Test fun `series episodes availability`() {
        val s = TitleDetail(id = "s", kind = TitleKind.SERIES, name = "S", episodes = 0)
        assertEquals(1, s.episodeCount)
        assertTrue(s.isEpisodeAvailable(1))
        assertFalse(s.isEpisodeAvailable(2))
        assertEquals(12, TitleDetail(id = "a", kind = TitleKind.ANIME, name = "A").episodeCount)
        assertFalse(TitleDetail(id = "a", kind = TitleKind.ANIME, name = "A").savesProgress)
    }
}

class SynopsisTextTest {
    @Test fun `cast block is split out of the synopsis`() {
        val (syn, cast) = SynopsisText.split("Dos hermanos investigan.\n**REPARTO**:\nDave Bautista, Jason Momoa", null)
        assertEquals("Dos hermanos investigan.", syn)
        assertEquals("Dave Bautista, Jason Momoa", cast)
        assertEquals("A" to "B, C", SynopsisText.split("A", "B, C"))
        assertEquals("Texto **sin** reparto" .replace("**", "") to "", SynopsisText.split("Texto **sin** reparto", ""))
    }
}
