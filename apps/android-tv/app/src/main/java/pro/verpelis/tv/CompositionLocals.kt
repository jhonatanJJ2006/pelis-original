package pro.verpelis.tv

import androidx.compose.runtime.staticCompositionLocalOf
import pro.verpelis.tv.audio.UiSounds
import pro.verpelis.tv.data.SessionStore
import pro.verpelis.tv.data.SoundPreferences
import pro.verpelis.tv.data.UpdateStore
import pro.verpelis.tv.data.api.PelisApiClient

val LocalSessionStore = staticCompositionLocalOf<SessionStore> {
    error("SessionStore not provided")
}

val LocalSoundPreferences = staticCompositionLocalOf<SoundPreferences> {
    error("SoundPreferences not provided")
}

val LocalUiSounds = staticCompositionLocalOf<UiSounds> {
    error("UiSounds not provided")
}

val LocalApiClient = staticCompositionLocalOf<PelisApiClient> {
    error("PelisApiClient not provided")
}

val LocalUpdateStore = staticCompositionLocalOf<UpdateStore> {
    error("UpdateStore not provided")
}
