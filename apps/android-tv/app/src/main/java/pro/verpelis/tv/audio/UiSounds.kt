package pro.verpelis.tv.audio

import android.media.AudioManager
import android.media.ToneGenerator
import pro.verpelis.tv.data.SoundPreferences

class UiSounds(private val prefs: SoundPreferences) {
    private var tone: ToneGenerator? = try {
        ToneGenerator(AudioManager.STREAM_MUSIC, 55)
    } catch (_: RuntimeException) {
        null
    }

    fun playFocus() {
        if (prefs.soundsEnabled) {
            tone?.startTone(ToneGenerator.TONE_CDMA_PIP, 28)
        }
    }

    fun playClick() {
        if (prefs.soundsEnabled) {
            tone?.startTone(ToneGenerator.TONE_PROP_ACK, 55)
        }
    }

    fun release() {
        tone?.release()
        tone = null
    }
}
