/** Página mínima (HTML sin dependencias) que devuelve el control a la app nativa. */

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderAppAuthPage(
  input: { intentUrl: string; schemeUrl: string } | { error: string }
): string {
  const body =
    'error' in input
      ? `<h1>No se pudo iniciar sesión</h1><p>${esc(input.error)}</p>`
      : `<h1>Listo</h1><p>Volviendo a la app de PELIS…</p>
<p><a id="open" class="btn" href="${esc(input.schemeUrl)}">Abrir la app</a></p>
<script>
(function () {
  var ua = navigator.userAgent || '';
  var target = /Android/i.test(ua) && /Chrome\\//.test(ua) ? ${JSON.stringify(input.intentUrl)} : ${JSON.stringify(input.schemeUrl)};
  window.location.replace(target);
})();
</script>`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<title>PELIS</title>
<style>
body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0b0d;color:#ece6da;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-family:Georgia,serif;color:#e5c276;font-weight:600}
p{color:#b9b2a6;max-width:28rem}
.btn{display:inline-block;margin-top:12px;padding:12px 22px;border-radius:8px;background:#e5c276;color:#0b0b0d;text-decoration:none;font-weight:600}
</style></head><body>${body}</body></html>`;
}
