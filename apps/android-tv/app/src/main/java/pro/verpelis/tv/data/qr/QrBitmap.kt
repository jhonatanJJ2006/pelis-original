package pro.verpelis.tv.data.qr

import android.graphics.Bitmap
import android.graphics.Color

object QrBitmap {
    private val DARK = Color.parseColor("#0B0B0D")
    private val LIGHT = Color.parseColor("#F4F1EA")

    fun encode(data: String, size: Int = 512): Bitmap? {
        val modules = QrModules.encode(data) ?: return null
        return try {
            val width = modules.size
            val pixels = IntArray(width * width)
            for (i in pixels.indices) {
                pixels[i] = if (modules.dark[i]) DARK else LIGHT
            }
            val raw = Bitmap.createBitmap(width, width, Bitmap.Config.ARGB_8888)
            raw.setPixels(pixels, 0, width, 0, 0, width, width)
            if (width == size) {
                raw
            } else {
                Bitmap.createScaledBitmap(raw, size, size, false).also { scaled ->
                    if (scaled != raw) raw.recycle()
                }
            }
        } catch (_: Exception) {
            null
        }
    }
}
