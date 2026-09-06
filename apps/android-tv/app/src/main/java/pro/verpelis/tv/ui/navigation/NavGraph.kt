package pro.verpelis.tv.ui.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import pro.verpelis.tv.ui.screens.HomeScreen
import pro.verpelis.tv.ui.screens.LoginScreen
import pro.verpelis.tv.ui.screens.PlayerScreen
import pro.verpelis.tv.ui.screens.SearchScreen
import pro.verpelis.tv.ui.screens.SettingsScreen

object Routes {
    const val Home = "home"
    const val Search = "search"
    const val Login = "login"
    const val Settings = "settings"
    const val Player = "player/{channelId}?name={name}"

    fun player(channelId: String, name: String): String {
        return "player/$channelId?name=${Uri.encode(name)}"
    }
}

@Composable
fun PelisTvNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Routes.Home,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        composable(Routes.Home) {
            HomeScreen(
                onOpenSearch = { navController.navigate(Routes.Search) },
                onOpenSettings = { navController.navigate(Routes.Settings) },
                onOpenLogin = { navController.navigate(Routes.Login) },
                onPlayChannel = { id, name -> navController.navigate(Routes.player(id, name)) },
            )
        }
        composable(Routes.Search) {
            SearchScreen(
                onBack = { navController.popBackStack() },
                onPlayChannel = { id, name -> navController.navigate(Routes.player(id, name)) },
            )
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
        composable(Routes.Settings) {
            SettingsScreen(onBack = { navController.popBackStack() })
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
