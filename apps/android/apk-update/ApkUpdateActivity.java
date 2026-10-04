package pro.verpelis.twa;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.util.List;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Launcher gate for the phone TWA. Bubblewrap's generated project has no UI of
 * its own, so this activity runs before {@link LauncherActivity} opens the web.
 * It compares the installed versionCode with /api/app/availability and, only
 * when the server apkVersionCode is greater, offers to download the APK and
 * hand it to the system installer. It never installs silently.
 *
 * The generated app/ tree is gitignored. scripts/apply-twa-apk-update.mjs copies
 * this file in and points the MAIN/LAUNCHER intent here before Gradle runs.
 */
public class ApkUpdateActivity extends Activity {
    static final String AVAILABILITY_URL = "https://verpelis.pro/api/app/availability";
    static final String APK_URL = "https://verpelis.pro/downloads/pelis.apk";
    private static final String PREFS = "pelis_twa_apk_update";
    private static final String KEY_DISMISSED = "dismissed_code";
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final int REQ_UNKNOWN_SOURCES = 41;
    private static final int MIN_APK_BYTES = 1024;

    private final Object leaveLock = new Object();
    private boolean leaving = false;
    private volatile boolean promptVisible = false;
    private int remoteCode = -1;

    private TextView checking;
    private LinearLayout card;
    private TextView message;
    private TextView status;
    private Button updateButton;
    private Button laterButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(buildUi());
        checkForUpdate();
    }

    @Override
    public void onBackPressed() {
        if (promptVisible) {
            dismissAndOpenWeb();
            return;
        }
        openWeb();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_UNKNOWN_SOURCES) return;
        if (canRequestInstall()) {
            downloadAndInstall();
        } else {
            setStatus("Sin ese permiso no se puede instalar. Puedes seguir usando esta versión.");
            setBusy(false);
        }
    }

    private View buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B0B0D"));

        checking = label("Comprobando actualizaciones…", 16, Color.parseColor("#B8B8C0"));
        checking.setGravity(Gravity.CENTER);
        root.addView(checking, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER));

        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(24), dp(24), dp(24), dp(24));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#16161A"));
        bg.setCornerRadius(dp(16));
        card.setBackground(bg);
        card.setVisibility(View.GONE);

        TextView title = label("Actualización disponible", 22, Color.parseColor("#D4AF37"));
        title.setTypeface(Typeface.DEFAULT_BOLD);
        message = label("", 16, Color.parseColor("#F5F5F0"));
        TextView hint = label(
                "Actualizar descarga el APK y abre el instalador de Android. Tienes que confirmar; no se instala sola.",
                15,
                Color.parseColor("#B8B8C0"));
        status = label("", 14, Color.parseColor("#F5F5F0"));

        updateButton = actionButton("Actualizar", Color.parseColor("#D4AF37"), Color.parseColor("#0B0B0D"));
        laterButton = actionButton("Más tarde", Color.parseColor("#2A2A30"), Color.parseColor("#F5F5F0"));
        updateButton.setOnClickListener(v -> onUpdateClicked());
        laterButton.setOnClickListener(v -> dismissAndOpenWeb());

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams buttonLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        buttonLp.setMargins(dp(6), 0, dp(6), 0);
        actions.addView(updateButton, buttonLp);
        actions.addView(laterButton, buttonLp);

        card.addView(title);
        card.addView(gap());
        card.addView(message);
        card.addView(gap());
        card.addView(hint);
        card.addView(gap());
        card.addView(status);
        card.addView(gap());
        card.addView(actions);

        int screen = getResources().getDisplayMetrics().widthPixels;
        int cardWidth = Math.min(screen - dp(48), dp(420));
        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(cardWidth, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        root.addView(card, cardLp);
        return root;
    }

    private void checkForUpdate() {
        new Thread(() -> {
            boolean offer = false;
            int code = -1;
            String name = "";
            try {
                long installed = installedVersionCode();
                JSONObject json = new JSONObject(new String(getBytes(AVAILABILITY_URL, 8000, 8000, 64 * 1024), "UTF-8"));
                boolean available = json.optBoolean("apkAvailable", false);
                code = json.optInt("apkVersionCode", -1);
                name = json.optString("apkVersionName", "");
                int dismissed = prefs().getInt(KEY_DISMISSED, -1);
                offer = available && code > installed && code != dismissed;
            } catch (Exception ignored) {
                offer = false;
            }
            final boolean show = offer;
            final int remote = code;
            final String versionName = name;
            runOnUiThread(() -> {
                if (isLeaving()) return;
                if (!show || remote <= 0) {
                    openWeb();
                    return;
                }
                remoteCode = remote;
                showPrompt(versionName);
            });
        }, "pelis-apk-update-check").start();
    }

    private void showPrompt(String versionName) {
        promptVisible = true;
        checking.setVisibility(View.GONE);
        String label = (versionName == null || versionName.trim().isEmpty())
                ? "Hay una versión más nueva de Pelis."
                : "Hay una versión más nueva de Pelis (" + versionName.trim() + ").";
        message.setText(label);
        status.setText("");
        card.setVisibility(View.VISIBLE);
        updateButton.requestFocus();
    }

    private void onUpdateClicked() {
        if (!updateButton.isEnabled()) return;
        if (!canRequestInstall()) {
            setStatus("Para instalar, permite que Pelis instale aplicaciones de orígenes desconocidos. Luego vuelve aquí. No se instala sola.");
            try {
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQ_UNKNOWN_SOURCES);
            } catch (Exception ex) {
                setStatus("No se pudo abrir el permiso de instalación. Puedes seguir con esta versión.");
            }
            return;
        }
        downloadAndInstall();
    }

    private void downloadAndInstall() {
        setBusy(true);
        setStatus("Descargando actualización…");
        new Thread(() -> {
            try {
                File dir = new File(getCacheDir(), "apk-update");
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IOException("No se pudo preparar la descarga.");
                }
                File apk = new File(dir, "pelis.apk");
                streamToFile(APK_URL, apk);
                if (isLeaving()) return;
                runOnUiThread(() -> {
                    if (isLeaving() || isFinishing()) return;
                    try {
                        handOffToInstaller(apk);
                        setStatus("Confirma la instalación en la pantalla del sistema. Si la cancelas, puedes reintentar.");
                    } catch (Exception ex) {
                        String detail = ex.getMessage();
                        setStatus(detail == null || detail.trim().isEmpty()
                                ? "No se pudo abrir el instalador."
                                : detail);
                    } finally {
                        setBusy(false);
                    }
                });
            } catch (Exception ex) {
                runOnUiThread(() -> {
                    if (isLeaving() || isFinishing()) return;
                    setStatus("No se pudo descargar la actualización. Revisa la conexión.");
                    setBusy(false);
                });
            }
        }, "pelis-apk-update-download").start();
    }

    private void handOffToInstaller(File apk) throws IOException {
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
        Intent view = new Intent(Intent.ACTION_VIEW);
        view.setDataAndType(uri, APK_MIME);
        view.setClipData(ClipData.newRawUri("pelis.apk", uri));
        view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        List<ResolveInfo> matches = getPackageManager().queryIntentActivities(view, PackageManager.MATCH_DEFAULT_ONLY);
        if (matches.isEmpty()) {
            throw new IOException("Este dispositivo no tiene un instalador de paquetes.");
        }
        for (ResolveInfo info : matches) {
            grantUriPermission(info.activityInfo.packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        startActivity(view);
    }

    private void dismissAndOpenWeb() {
        if (remoteCode > 0) {
            prefs().edit().putInt(KEY_DISMISSED, remoteCode).apply();
        }
        openWeb();
    }

    private void openWeb() {
        synchronized (leaveLock) {
            if (leaving) return;
            leaving = true;
        }
        promptVisible = false;
        Intent launch = new Intent(this, LauncherActivity.class);
        startActivity(launch);
        finish();
    }

    private boolean isLeaving() {
        synchronized (leaveLock) {
            return leaving || isFinishing();
        }
    }

    private boolean canRequestInstall() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        return getPackageManager().canRequestPackageInstalls();
    }

    @SuppressWarnings("deprecation")
    private long installedVersionCode() throws PackageManager.NameNotFoundException {
        PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return info.getLongVersionCode();
        }
        return info.versionCode;
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    private void setBusy(boolean busy) {
        updateButton.setEnabled(!busy);
        updateButton.setText(busy ? "Descargando…" : "Actualizar");
    }

    private void setStatus(String text) {
        status.setText(text == null ? "" : text);
    }

    private byte[] getBytes(String url, int connectMs, int readMs, int maxBytes) throws IOException {
        HttpURLConnection conn = open(url, connectMs, readMs);
        try {
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new IOException("HTTP " + code);
            }
            InputStream in = conn.getInputStream();
            byte[] buf = new byte[4096];
            int total = 0;
            byte[] out = new byte[Math.min(maxBytes, 64 * 1024)];
            int n;
            while ((n = in.read(buf)) != -1) {
                if (total + n > out.length) {
                    throw new IOException("respuesta demasiado grande");
                }
                System.arraycopy(buf, 0, out, total, n);
                total += n;
            }
            byte[] exact = new byte[total];
            System.arraycopy(out, 0, exact, 0, total);
            return exact;
        } finally {
            conn.disconnect();
        }
    }

    private void streamToFile(String url, File dest) throws IOException {
        HttpURLConnection conn = open(url, 15000, 120000);
        File tmp = new File(dest.getParentFile(), dest.getName() + ".part");
        try {
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new IOException("HTTP " + code);
            }
            InputStream in = conn.getInputStream();
            OutputStream out = new FileOutputStream(tmp);
            try {
                byte[] buf = new byte[16384];
                int n;
                long total = 0;
                while ((n = in.read(buf)) != -1) {
                    if (isLeaving()) {
                        throw new IOException("cancelado");
                    }
                    out.write(buf, 0, n);
                    total += n;
                }
                out.flush();
                if (total < MIN_APK_BYTES) {
                    throw new IOException("descarga corta");
                }
            } finally {
                out.close();
            }
        } catch (IOException ex) {
            tmp.delete();
            throw ex;
        } finally {
            conn.disconnect();
        }
        if (dest.exists() && !dest.delete()) {
            tmp.delete();
            throw new IOException("No se pudo preparar el archivo de actualización.");
        }
        if (!tmp.renameTo(dest)) {
            tmp.delete();
            throw new IOException("No se pudo preparar el archivo de actualización.");
        }
    }

    private HttpURLConnection open(String url, int connectMs, int readMs) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(connectMs);
        conn.setReadTimeout(readMs);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("User-Agent", "PelisTwa-Updater");
        conn.setRequestProperty("Accept", "*/*");
        return conn;
    }

    private TextView label(String text, int sp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        return view;
    }

    private View gap() {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(12)));
        return view;
    }

    private Button actionButton(String text, int background, int textColor) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(textColor);
        button.setBackgroundColor(background);
        button.setFocusable(true);
        button.setMinHeight(dp(48));
        return button;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
