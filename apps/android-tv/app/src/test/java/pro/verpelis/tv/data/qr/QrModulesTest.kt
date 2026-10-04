package pro.verpelis.tv.data.qr

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class QrModulesTest {
    @Test
    fun encodesPairingUrlIntoAScannableMatrix() {
        val matrix = QrModules.encode("https://verpelis.pro/link-tv?code=AB12CD")
        assertNotNull(matrix)
        matrix!!
        assertTrue(matrix.size in 21..177)
        assertTrue(matrix.dark.any { it })
        assertTrue(matrix.dark.any { !it })
        // Finder pattern sits just inside the quiet zone (margin = 1).
        assertTrue(matrix.isDark(1, 1))
        assertTrue(matrix.isDark(matrix.size - 2, 1))
        assertTrue(matrix.isDark(1, matrix.size - 2))
    }

    @Test
    fun blankPayloadIsNotAQr() {
        assertTrue(QrModules.encode("  ") == null)
    }
}
