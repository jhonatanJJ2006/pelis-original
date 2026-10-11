package pro.verpelis.core.ui

import android.content.Context
import android.content.Intent
import pro.verpelis.core.data.Subtitle
import pro.verpelis.core.player.PlaybackRequest

/** Serializa una solicitud de reproducción como extras de Intent. */
object PlaybackIntent {
    fun put(intent: Intent, r: PlaybackRequest): Intent = intent
        .putExtra("url", r.url).putExtra("title", r.title).putExtra("movieId", r.movieId).putExtra("live", r.live)
        .putExtra("subs", r.subtitles.map { "${it.label}\u0001${it.lang}\u0001${it.url}" }.toTypedArray())

    fun read(intent: Intent): PlaybackRequest = PlaybackRequest(
        url = intent.getStringExtra("url").orEmpty(),
        title = intent.getStringExtra("title").orEmpty(),
        movieId = intent.getStringExtra("movieId"),
        live = intent.getBooleanExtra("live", false),
        subtitles = intent.getStringArrayExtra("subs").orEmpty().mapNotNull {
            val p = it.split('\u0001'); if (p.size == 3) Subtitle(p[0], p[1], p[2]) else null
        },
    )

    fun start(context: Context, cls: Class<*>, r: PlaybackRequest) =
        context.startActivity(put(Intent(context, cls), r))
}
