package pro.verpelis.core.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import pro.verpelis.core.player.GestureMath.Zone

class GestureMathTest {
    @Test fun izquierdaEsBrilloDerechaVolumen() {
        assertEquals(Zone.BRIGHTNESS, GestureMath.zoneFor(10f, 1000f))
        assertEquals(Zone.BRIGHTNESS, GestureMath.zoneFor(499f, 1000f))
        assertEquals(Zone.VOLUME, GestureMath.zoneFor(500f, 1000f))
        assertEquals(Zone.VOLUME, GestureMath.zoneFor(990f, 1000f))
    }

    @Test fun gestosSoloEnPantallaCompleta() {
        assertTrue(GestureMath.gesturesEnabled(true))
        assertFalse(GestureMath.gesturesEnabled(false))
    }

    @Test fun arrastrarHaciaArribaSube() {
        assertEquals(0.75f, GestureMath.applyDrag(0.5f, -250f, 1000f), 0.0001f)
        assertEquals(0.25f, GestureMath.applyDrag(0.5f, 250f, 1000f), 0.0001f)
    }

    @Test fun nivelAcotado() {
        assertEquals(1f, GestureMath.applyDrag(0.9f, -5000f, 1000f), 0f)
        assertEquals(0f, GestureMath.applyDrag(0.1f, 5000f, 1000f), 0f)
        assertEquals(0.4f, GestureMath.applyDrag(0.4f, 100f, 0f), 0f)
    }

    @Test fun volumen() {
        assertEquals(8, GestureMath.toVolumeIndex(0.5f, 15))
        assertEquals(15, GestureMath.toVolumeIndex(2f, 15))
        assertEquals(0, GestureMath.toVolumeIndex(-1f, 15))
        assertEquals(0.5f, GestureMath.fromVolumeIndex(5, 10), 0.0001f)
        assertEquals(0f, GestureMath.fromVolumeIndex(5, 0), 0f)
    }

    @Test fun brilloNuncaCero() {
        assertEquals(0.01f, GestureMath.toWindowBrightness(0f), 0f)
        assertEquals(1f, GestureMath.toWindowBrightness(3f), 0f)
    }

    @Test fun hud() {
        assertEquals(42, GestureMath.hudPercent(0.42f))
        assertEquals(100, GestureMath.hudPercent(1.5f))
        assertEquals(60f, GestureMath.hudFill(0.5f, 120f), 0.0001f)
    }

    @Test fun seekDpad() {
        assertEquals(20_000L, GestureMath.seek(10_000, 60_000, true))
        assertEquals(0L, GestureMath.seek(5_000, 60_000, false))
        assertEquals(60_000L, GestureMath.seek(55_000, 60_000, true))
    }
}
