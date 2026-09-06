export const PRODUCTION_URL = 'https://verpelis.pro';

/** APK celular (WebView / TWA phone). */
export const APK_DOWNLOAD_PATH = '/downloads/pelis.apk';
export const APK_DOWNLOAD_URL = `${PRODUCTION_URL}${APK_DOWNLOAD_PATH}`;
export const APK_VERSION_PATH = '/downloads/app-version.json';
/** Debe coincidir con apps/android/twa-manifest.json y public/.well-known/assetlinks.json. */
export const ANDROID_PACKAGE_ID = 'pro.verpelis.twa';

/** APK Android TV / TV Box. */
export const TV_APK_DOWNLOAD_PATH = '/downloads/pelis-tv.apk';
export const TV_APK_DOWNLOAD_URL = `${PRODUCTION_URL}${TV_APK_DOWNLOAD_PATH}`;
export const TV_APK_VERSION_PATH = '/downloads/tv-app-version.json';
