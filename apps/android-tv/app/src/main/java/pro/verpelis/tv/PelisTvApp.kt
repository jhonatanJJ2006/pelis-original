package pro.verpelis.tv

import android.app.ActivityManager
import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import pro.verpelis.tv.audio.UiSounds
import pro.verpelis.tv.data.SessionStore
import pro.verpelis.tv.data.SoundPreferences
import pro.verpelis.tv.data.UpdateStore
import pro.verpelis.tv.data.api.PelisApiClient

class PelisTvApp : Application(), ImageLoaderFactory {
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

    /** Fire TV Stick / TV box de 1–1,5 GB: menos caché, RGB_565 y sin crossfade. */
    val lowRam: Boolean by lazy {
        val am = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        am.isLowRamDevice || am.memoryClass <= 192
    }

    override fun onCreate() {
        super.onCreate()
        sessionStore = SessionStore(this)
        soundPreferences = SoundPreferences(this)
        uiSounds = UiSounds(soundPreferences)
        apiClient = PelisApiClient(sessionStore)
        updateStore = UpdateStore(this)
    }

    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .okHttpClient { apiClient.imageHttp }
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(if (lowRam) 0.12 else 0.2)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("img"))
                    .maxSizeBytes(if (lowRam) 40L * 1024 * 1024 else 96L * 1024 * 1024)
                    .build()
            }
            // /_next/image responde max-age=60: guardar igual en disco para no volver a
            // pedir los posters a Movies en cada arranque.
            .respectCacheHeaders(false)
            .allowRgb565(lowRam)
            .crossfade(if (lowRam) 0 else 120)
            .build()
}
