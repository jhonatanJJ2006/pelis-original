package pro.verpelis.core.player

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ResumeStoreTest {
    @Test fun keepsMiddle() = assertTrue(ResumeStore.shouldKeep(600_000, 6_000_000))
    @Test fun dropsStart() = assertFalse(ResumeStore.shouldKeep(3_000, 6_000_000))
    @Test fun dropsEnd() = assertFalse(ResumeStore.shouldKeep(5_990_000, 6_000_000))
    @Test fun keepsUnknownDuration() = assertTrue(ResumeStore.shouldKeep(60_000, -1))
}
