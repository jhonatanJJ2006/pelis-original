# Plan: servir segmentos HLS con nginx (no aplicado)

Estado: **propuesta, decidido no aplicarla por ahora** (2026-10-18). No se ha instalado ni cambiado
ningún servicio. Medido el 2026-10-18 en la máquina Movies. Revisar si la subida crece mucho o hay
muchos espectadores a la vez; el despliegue iría detrás de `HLS_SIGNED_SEGMENTS`.

## Cómo se sirve hoy

```
navegador / TV ──HTTPS──▶ Cloudflare ──tunnel──▶ cloudflared ──▶ 127.0.0.1:3000 (Next.js, 3 workers)
```

- `/etc/cloudflared/config.yml`: `verpelis.pro` y `www.verpelis.pro` → `http://127.0.0.1:3000`; resto 404.
- `GET /api/stream/resolve?token=…` → `findManifestForToken()` (`apps/web/src/lib/movie-stream-paths.ts`):
  busca `master.m3u8`, luego `playlist.m3u8`, luego `index.m3u8`, en `<token>/<token>/` y `<token>/`,
  en cada raíz de `MOVIE_OUTPUT_ROOTS` (`/run/media/det/Pelis-A/output:/run/media/det/Pelis-B/output`).
- `GET /api/stream/<ruta>` (`apps/web/src/app/api/stream/[...path]/route.ts`):
  - **No hay firma de URL.** El control es la cookie de sesión de Better Auth (o `Authorization`)
    - plan activo/ADMIN (`denyUnlessStreamAccess`, decisión cacheada 60 s por hash de sesión).
  - `.m3u8`: se lee y se reescribe (`rewriteM3u8Manifest`) para que cada URI sea `/api/stream/…`.
  - `.ts`: `createReadStream` con soporte de `Range` (206), `Cache-Control: private, max-age=31536000, immutable`.

## Medición de CPU (2026-10-18)

40 segmentos de _The Wrecking Crew_ (161 MB, ya en caché de página), en local, misma petición:

| Servidor                                                       | Tiempo | CPU    | CPU por MB  |
| -------------------------------------------------------------- | ------ | ------ | ----------- |
| Next.js `/api/stream` (3 workers)                              | 3,0 s  | 2,82 s | ~17,5 ms/MB |
| Next.js con `Range: bytes=0-` (235 MB)                         | 3,3 s  | 3,63 s | ~15,4 ms/MB |
| nginx 1.28 `sendfile` (prueba de usuario en :18090, ya parada) | 0,47 s | 0,01 s | ~0,06 ms/MB |

Conclusión honesta: nginx gasta ~250× menos CPU por byte, **pero** la subida de casa es
~105 KB/s (≈0,85 Mbps). A ese ritmo Node gasta ~1,8 ms de CPU por segundo de vídeo servido
(≈0,2 % de un núcleo), así que **hoy el ahorro es despreciable**: el cuello de botella es la subida,
y lo que lo arregla es el ABR con peldaño 360p (ver `docs/TRANSCODE-ABR.md`). nginx empieza a
compensar si la subida crece (con 100 Mbps ≈ 12 MB/s, Node gastaría ~20 % de un núcleo y bloquearía
el event loop de los workers que también sirven la web; nginx ~0,1 %).

## Diseño propuesto

Solo los **segmentos** pasan a nginx. Las playlists siguen en Node (sesión + plan + reescritura), y
Node firma las URIs de segmento al reescribir. Así no hace falta cookie en nginx (ExoPlayer/TV y
hls.js funcionan igual) y un enlace filtrado caduca.

### Esquema de firma (secure_link_md5)

URI de segmento: `/hls/<sig>/<exp>/<disk>/<dir>/<file>.ts`

- `disk`: `a` = Pelis-A, `b` = Pelis-B (la raíz donde `resolveStreamPath` encontró la playlist).
- `dir`: ruta relativa a la raíz, p. ej. `goat-2026/goat-2026/v720`.
- `exp`: epoch (s) de caducidad, p. ej. ahora + 6 h (una película + pausas).
- `sig` = `base64url(md5("<exp>/<disk>/<dir> <HLS_SIGNING_SECRET>"))` — firma por **carpeta**, una sola
  firma vale para todos los segmentos de esa rendición (la playlist se cachea 300 s en el cliente).

Node (en `rewriteM3u8Manifest`, detrás de `HLS_SIGNED_SEGMENTS=1`):

```ts
import { createHash } from 'node:crypto';
const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
const sig = createHash('md5')
  .update(`${exp}/${disk}/${dir} ${process.env.HLS_SIGNING_SECRET}`)
  .digest('base64url');
return `/hls/${sig}/${exp}/${disk}/${dir}/${file}`;
```

### nginx (nuevo `server` solo en loopback; no toca `ius` ni `revenue-ai`)

`/etc/nginx/sites-available/pelis-hls` (secreto en un include con permisos 600, fuera de git):

```nginx
# /etc/nginx/pelis-hls-secret.conf  (root:www-data 0640)
#   set $hls_secret "…";
map $hls_disk $hls_root {
    a /run/media/det/Pelis-A/output;
    b /run/media/det/Pelis-B/output;
    default "";
}

server {
    listen 127.0.0.1:8090;
    server_name _;
    access_log off;
    sendfile on;
    tcp_nopush on;
    sendfile_max_chunk 1m;
    aio threads;                 # disco USB externo: no bloquear el worker

    location ~ ^/hls/(?<hls_sig>[A-Za-z0-9_-]+)/(?<hls_exp>\d+)/(?<hls_disk>[ab])/(?<hls_dir>[A-Za-z0-9._/-]+)/(?<hls_file>[A-Za-z0-9._-]+\.ts)$ {
        include /etc/nginx/pelis-hls-secret.conf;
        secure_link $hls_sig,$hls_exp;
        secure_link_md5 "$hls_exp/$hls_disk/$hls_dir $hls_secret";
        if ($secure_link = "")  { return 403; }   # firma mala
        if ($secure_link = "0") { return 410; }   # caducada → el player pide la playlist otra vez
        if ($hls_dir ~ "\.\.")  { return 400; }

        root $hls_root;
        try_files /$hls_dir/$hls_file =404;
        types { video/mp2t ts; }
        add_header Cache-Control "private, max-age=31536000, immutable" always;
        add_header Accept-Ranges bytes always;
    }
    location / { return 404; }
}
```

`nginx -t` antes de `systemctl reload nginx`. El `www-data` de nginx necesita lectura en
`/run/media/det/...` (hoy los discos montan como `det`: o `user det;` en un nginx aparte, o ACL
`setfacl -m u:www-data:rx` en la ruta — decidir al aplicar).

### cloudflared

Añadir **antes** de la regla de `verpelis.pro` en `/etc/cloudflared/config.yml`:

```yaml
ingress:
  - hostname: verpelis.pro
    path: ^/hls/
    service: http://127.0.0.1:8090
  - hostname: verpelis.pro
    service: http://127.0.0.1:3000
  # … resto igual
```

`cloudflared tunnel ingress validate` y `cloudflared tunnel ingress rule https://verpelis.pro/hls/x`
antes de `systemctl restart cloudflared` (corte de ~2 s; hacerlo de madrugada).

### Despliegue por pasos

1. PR (staging → main): firma en `rewriteM3u8Manifest` tras `HLS_SIGNED_SEGMENTS` (por defecto 0) +
   tests de la firma (vector fijo compartido con la config nginx).
2. Crear secreto, include y `pelis-hls`; `nginx -t`; reload. Probar con `curl` en 127.0.0.1:8090
   (firma buena 200/206, mala 403, caducada 410, `..` 400).
3. Regla de cloudflared; probar `https://verpelis.pro/hls/...` con una URL firmada a mano.
4. `HLS_SIGNED_SEGMENTS=1` en el entorno de `pelis-web` + restart. Probar web, TV y app nativa.

### Rollback

- Rápido (sin tocar nginx/cloudflared): `HLS_SIGNED_SEGMENTS=0` y restart de `pelis-web`; las
  playlists vuelven a apuntar a `/api/stream/…` (que sigue funcionando todo el tiempo).
- Completo: quitar la regla `path: ^/hls/` de cloudflared (backup `config.yml.bak-<fecha>`) y
  restart; `rm /etc/nginx/sites-enabled/pelis-hls && nginx -t && systemctl reload nginx`.

## Alternativa: Caddy

Caddy no trae `secure_link`; habría que validar la firma con `forward_auth` hacia Node (vuelve a
meter a Node en cada segmento, aunque sin copiar bytes) o un plugin. Como nginx 1.28 ya está
instalado y compilado con `--with-http_secure_link_module`, nginx es la opción recomendada.
