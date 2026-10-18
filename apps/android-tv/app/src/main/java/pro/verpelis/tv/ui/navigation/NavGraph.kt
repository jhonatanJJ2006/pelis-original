package pro.verpelis.tv.ui.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.data.playback.TitleCache
import pro.verpelis.tv.data.playback.TitleDetail
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.data.playback.PlaybackRepository
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.playback.DetailScreen
import pro.verpelis.tv.ui.playback.VodPlayerScreen
import pro.verpelis.tv.ui.screens.HomeScreen
import pro.verpelis.tv.ui.screens.LoginScreen
import pro.verpelis.tv.ui.screens.PlayerScreen
import pro.verpelis.tv.ui.screens.SearchScreen
import pro.verpelis.tv.ui.screens.SettingsScreen
import pro.verpelis.tv.ui.shell.NavSection
import pro.verpelis.tv.ui.shell.TvShell
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.TvRepository
import androidx.compose.runtime.CompositionLocalProvider
import pro.verpelis.tv.data.tv.CatalogKind
import pro.verpelis.tv.ui.library.CatalogScreen
import pro.verpelis.tv.ui.library.HistoryScreen
import pro.verpelis.tv.ui.library.MyListScreen
import pro.verpelis.tv.ui.library.ProfileScreen

object Routes {
    const val Home = "home"
    const val Search = "search"
    const val Login = "login"
    const val Settings = "settings"
    const val Movies = "movies"
    const val Series = "series"
    const val Anime = "anime"
    const val MyList = "mylist"
    const val History = "history"
    const val Profile = "profile"
    const val Player = "player/{channelId}?name={name}"

    const val Detail = "title/{kind}/{id}"
    const val Watch = "watch/{kind}/{id}?ep={ep}&start={start}"

    fun player(channelId: String, name: String): String {
        return "player/$channelId?name=${Uri.encode(name)}"
    }

    fun detail(kind: TitleKind, id: String): String = "title/${kind.routeKey}/${Uri.encode(id)}"

    fun watch(kind: TitleKind, id: String, episode: Int, startMs: Long): String =
        "watch/${kind.routeKey}/${Uri.encode(id)}?ep=$episode&start=$startMs"

    /** Secciones del menú lateral que ya tienen pantalla. */
    val RailSections: List<NavSection> = listOf(
        NavSection.SEARCH,
        NavSection.HOME,
        NavSection.MOVIES,
        NavSection.SERIES,
        NavSection.ANIME,
        NavSection.MY_LIST,
        NavSection.PROFILE,
        NavSection.SETTINGS,
    )

    fun forSection(s: NavSection): String = when (s) {
        NavSection.SEARCH -> Search
        NavSection.HOME -> Home
        NavSection.MOVIES -> Movies
        NavSection.SERIES -> Series
        NavSection.ANIME -> Anime
        NavSection.MY_LIST -> MyList
        NavSection.PROFILE -> Profile
        NavSection.SETTINGS -> Settings
        else -> Home
    }
}

@Composable
fun PelisTvNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Routes.Home,
    debugPlayUrl: String? = null,
) {
    val apiClient = LocalApiClient.current
    val playback = remember(apiClient) { PlaybackRepository(apiClient.baseUrl, apiClient.okHttp) }
    val tvRepo = remember(apiClient) { TvRepository(apiClient.baseUrl, apiClient.okHttp) }
    val goSection: (NavSection) -> Unit = { s ->
        val route = Routes.forSection(s)
        if (s == NavSection.HOME) {
            if (!navController.popBackStack(Routes.Home, inclusive = false)) navController.navigate(Routes.Home)
        } else {
            navController.navigate(route) {
                popUpTo(Routes.Home) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }
    @Composable
    fun Shelled(section: NavSection, content: @Composable () -> Unit) =
        TvShell(section = section, sections = Routes.RailSections, onNavigate = goSection, content = content)
    val toLogin: () -> Unit = {
        navController.navigate(Routes.Login) { popUpTo(Routes.Home) }
    }
    // Solo builds debug: `am start ... --es pelis.debugPlayUrl <m3u8>` abre el reproductor con
    // un HLS arbitrario (p. ej. uno multicalidad para probar el selector de calidad).
    if (BuildConfig.DEBUG && !debugPlayUrl.isNullOrBlank()) {
        LaunchedEffect(debugPlayUrl) {
            TitleCache.put(TitleDetail(id = "debug-hls", kind = TitleKind.MOVIE, name = "Prueba HLS multicalidad", videoUrl = debugPlayUrl))
            navController.navigate(Routes.watch(TitleKind.MOVIE, "debug-hls", 1, 0L))
        }
    }
    CompositionLocalProvider(LocalTvRepository provides tvRepo) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        composable(Routes.Home) {
            Shelled(NavSection.HOME) {
                HomeScreen(
                    onOpenSettings = { goSection(NavSection.SETTINGS) },
                    onPlayChannel = { id, name -> navController.navigate(Routes.player(id, name)) },
                    onOpenTitle = { kind, id -> navController.navigate(Routes.detail(kind, id)) },
                )
            }
        }
        composable(
            route = Routes.Detail,
            arguments = listOf(
                navArgument("kind") { type = NavType.StringType },
                navArgument("id") { type = NavType.StringType },
            ),
        ) { entry ->
            DetailScreen(
                kind = TitleKind.fromRoute(entry.arguments?.getString("kind")),
                id = entry.arguments?.getString("id").orEmpty(),
                repository = playback,
                onPlay = { kind, id, ep, start -> navController.navigate(Routes.watch(kind, id, ep, start)) },
                onNeedLogin = toLogin,
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            route = Routes.Watch,
            arguments = listOf(
                navArgument("kind") { type = NavType.StringType },
                navArgument("id") { type = NavType.StringType },
                navArgument("ep") { type = NavType.IntType; defaultValue = 1 },
                navArgument("start") { type = NavType.LongType; defaultValue = 0L },
            ),
        ) { entry ->
            VodPlayerScreen(
                kind = TitleKind.fromRoute(entry.arguments?.getString("kind")),
                id = entry.arguments?.getString("id").orEmpty(),
                episode = entry.arguments?.getInt("ep") ?: 1,
                startMs = entry.arguments?.getLong("start") ?: 0L,
                repository = playback,
                onBack = { navController.popBackStack() },
                onNeedLogin = toLogin,
            )
        }
        composable(Routes.Search) {
            Shelled(NavSection.SEARCH) {
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onPlayChannel = { id, name -> navController.navigate(Routes.player(id, name)) },
                    onOpenTitle = { kind, id -> navController.navigate(Routes.detail(kind, id)) },
                )
            }
        }
        composable(Routes.Login) {
            LoginScreen(
                onSignedIn = {
                    navController.navigate(Routes.Home) {
                        popUpTo(Routes.Login) { inclusive = true }
                    }
                },
                onBack = {
                    if (!navController.popBackStack()) {
                        navController.navigate(Routes.Home)
                    }
                },
            )
        }
        val openTitle: (TitleKind, String) -> Unit = { kind, id -> navController.navigate(Routes.detail(kind, id)) }
        composable(Routes.Movies) { Shelled(NavSection.MOVIES) { CatalogScreen(CatalogKind.MOVIES, openTitle) } }
        composable(Routes.Series) { Shelled(NavSection.SERIES) { CatalogScreen(CatalogKind.SERIES, openTitle) } }
        composable(Routes.Anime) { Shelled(NavSection.ANIME) { CatalogScreen(CatalogKind.ANIME, openTitle) } }
        composable(Routes.MyList) {
            Shelled(NavSection.MY_LIST) {
                MyListScreen(openTitle, onOpenHistory = { navController.navigate(Routes.History) }, onNeedLogin = toLogin)
            }
        }
        composable(Routes.History) {
            Shelled(NavSection.MY_LIST) { HistoryScreen(openTitle, onNeedLogin = toLogin) }
        }
        composable(Routes.Profile) {
            Shelled(NavSection.PROFILE) {
                ProfileScreen(
                    onOpenMyList = { goSection(NavSection.MY_LIST) },
                    onOpenHistory = { navController.navigate(Routes.History) },
                    onNeedLogin = toLogin,
                    onSignedOut = { goSection(NavSection.HOME) },
                )
            }
        }
        composable(Routes.Settings) {
            Shelled(NavSection.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }
        composable(
            route = Routes.Player,
            arguments = listOf(
                navArgument("channelId") { type = NavType.StringType },
                navArgument("name") {
                    type = NavType.StringType
                    defaultValue = ""
                },
            ),
        ) { entry ->
            val channelId = entry.arguments?.getString("channelId").orEmpty()
            val name = entry.arguments?.getString("name").orEmpty()
            PlayerScreen(
                channelId = channelId,
                channelName = name,
                onBack = { navController.popBackStack() },
                onNeedLogin = {
                    navController.navigate(Routes.Login) {
                        popUpTo(Routes.Home)
                    }
                },
            )
        }
    }
    }
}
