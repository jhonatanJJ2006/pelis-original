/**
 * Clientes nativos de Pelis (app de TV y app nativa de celular) que nunca deben
 * ver la landing de descargas. El TWA se detecta por `display-mode: standalone`
 * en CSS (`.web-only`); estos se detectan por User-Agent en el servidor.
 */
const IN_APP_UA = /\b(PelisTV|PelisTV-Updater|PelisAndroid)\b/i;

export function isPelisAppUserAgent(ua: string | null | undefined): boolean {
  return Boolean(ua && IN_APP_UA.test(ua));
}
