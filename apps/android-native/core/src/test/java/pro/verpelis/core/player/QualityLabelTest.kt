package pro.verpelis.core.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QualityLabelTest {
    @Test fun scopeRenditionsUseNominalTier() {
        assertEquals("1080p", QualityLabel.of(1918, 802))
        assertEquals("720p", QualityLabel.of(1280, 536))
        assertEquals("480p", QualityLabel.of(854, 358))
        assertEquals("360p", QualityLabel.of(640, 268))
    }

    @Test fun sixteenByNine() {
        assertEquals("1080p", QualityLabel.of(1920, 1080))
        assertEquals("720p", QualityLabel.of(1280, 720))
        assertEquals("480p", QualityLabel.of(854, 480))
    }

    @Test fun unknownWidthAndOddSizes() {
        assertEquals("720p", QualityLabel.of(0, 720))
        assertEquals("900p", QualityLabel.of(1600, 900))
        assertNull(QualityLabel.of(1280, 0))
    }
}
