package pro.verpelis.tv.data.qr

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/** Module matrix for a pairing QR. No Android bitmap types so unit tests can run it. */
data class QrMatrix(val size: Int, val dark: BooleanArray) {
    fun isDark(x: Int, y: Int): Boolean = dark[y * size + x]
}

object QrModules {
    fun encode(data: String): QrMatrix? {
        if (data.isBlank()) return null
        return try {
            val hints = hashMapOf<EncodeHintType, Any>(
                EncodeHintType.MARGIN to 1,
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M,
                EncodeHintType.CHARACTER_SET to "UTF-8",
            )
            val matrix = QRCodeWriter().encode(data, BarcodeFormat.QR_CODE, 0, 0, hints)
            val size = matrix.width
            if (size <= 0 || matrix.height != size) return null
            val dark = BooleanArray(size * size)
            var anyDark = false
            for (y in 0 until size) {
                val row = y * size
                for (x in 0 until size) {
                    val on = matrix.get(x, y)
                    dark[row + x] = on
                    if (on) anyDark = true
                }
            }
            if (!anyDark) return null
            QrMatrix(size, dark)
        } catch (_: Exception) {
            null
        } catch (_: LinkageError) {
            null
        }
    }
}
