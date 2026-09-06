package pro.verpelis.tv

import android.app.Application
import pro.verpelis.tv.audio.UiSounds
import pro.verpelis.tv.data.SessionStore
import pro.verpelis.tv.data.SoundPreferences
import pro.verpelis.tv.data.UpdateStore
import pro.verpelis.tv.data.api.PelisApiClient

class PelisTvApp : Application() {
    lateinit var sessionStore: SessionStore
        private set
    lateinit var soundPreferences: SoundPreferences
        private set
    lateinit var uiSounds: UiSounds
        private set
    lateinit var apiClient: PelisApiClient
        private set
    lateinit var updateStore: UpdateStore
        private set

    override fun onCreate() {
        super.onCreate()
        sessionStore = SessionStore(this)
        soundPreferences = SoundPreferences(this)
        uiSounds = UiSounds(soundPreferences)
        apiClient = PelisApiClient(sessionStore)
        updateStore = UpdateStore(this)
    }
}
