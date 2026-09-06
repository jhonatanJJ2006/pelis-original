package pro.verpelis.tv.audio

import android.media.AudioManager
import android.media.ToneGenerator
import pro.verpelis.tv.data.SoundPreferences

class UiSounds(private val prefs: SoundPreferences) {
    private var tone: ToneGenerator? = try {
        ToneGenerator(AudioManager.STREAM_MUSIC, 60)
    } catch (_: RuntimeException) {
        null
    }

    fun playFocus() {
        if (prefs.soundsEnabled) {
            tone?.startTone(ToneGenerator.TONE_PROP_BEEP, 40)
        }
    }

    fun playClick() {
        if (prefs.soundsEnabled) {
            tone?.startTone(ToneGenerator.TONE_PROP_ACK, 50)
        }
    }

    fun release() {
        tone?.release()
        tone = null
    }
}
