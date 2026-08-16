# Run Telegram Movie Channels Dumper

Guía paso a paso para dejar el dumper de canales de Telegram corriendo 24/7 en tu laptop, con sincronización periódica cada 15 minutos vía `systemd`.

El proyecto vive en `tools/telegram-dumper/` (script Telethon + archivos `.service`/`.timer`). Este documento es la versión "tarjeta de instrucciones" — léelo una vez y ejecútalo.

---

## 0. Prerrequisitos

- Linux con `systemd` (Ubuntu/Debian/Fedora/Arch).
- Python 3.10+ (`python3 --version`).
- Una cuenta de Telegram que sea **miembro** del canal/grupo `-1002154921408`.
- 5 minutos para crear credenciales en https://my.telegram.org.

---

## 1. Crear credenciales de Telegram (1 vez)

1. Ve a https://my.telegram.org e inicia sesión con tu número.
2. Click en **API development tools**.
3. Click en **Create new app**. Llena:
   - App title: `pelis-dumper`
   - Short name: `pelis-dumper`
   - Platform: `Desktop`
4. Guarda los dos valores que te muestra:
   - `api_id` → número (ej. `12345678`)
   - `api_hash` → string hex (ej. `a1b2c3d4e5f6...`)

> **No los compartas.** Irán al archivo `.env` que está en `.gitignore`.

---

## 2. Configurar el proyecto

```bash
cd /home/det/Desktop/PELIS/pelis-original/tools/telegram-dumper

cp .env.example .env
nano .env
```

Edita `.env` con tus valores reales:

```dotenv
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=a1b2c3d4e5f6...
TELEGRAM_CHANNEL_IDS=-1002154921408
TELEGRAM_SESSION_NAME=dumper
MAX_MEDIA_MB=200
BATCH_COMMIT=50
LOG_LEVEL=INFO
```

Para varios canales sepáralos con coma: `TELEGRAM_CHANNEL_IDS=-1002154921408,-1009876543210`.

---

## 3. Instalar dependencias (venv recomendado)

```bash
cd /home/det/Desktop/PELIS/pelis-original/tools/telegram-dumper
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Verifica:

```bash
.venv/bin/python -c "import telethon, dotenv, tenacity; print('OK')"
```

---

## 4. Primer login (interactivo, 1 sola vez)

Este paso te pedirá **teléfono + código SMS** y crea el archivo `data/dumper.session`. Tras esto, todos los runs son silenciosos.

```bash
cd /home/det/Desktop/PELIS/pelis-original/tools/telegram-dumper
./scripts/sync.sh
```

El script:
1. Imprime "Signed in as …" → ya estás autenticado.
2. Hace backfill completo del canal (todos los mensajes históricos).
3. Descarga media a `data/media/<channel>_<msg>_<file_id>.<ext>`.
4. Escribe cada mensaje como JSON en `data/messages.jsonl`.
5. Persiste el cursor en `data/dumper.db`.

**Si tienes 2FA activado** te pedirá la contraseña cloud después del SMS.

> ⚠️ Primera vez puede tardar minutos/horas según el tamaño del canal. Deja la terminal abierta.

Comprobar que el dump inicial funcionó:

```bash
ls -la data/
wc -l data/messages.jsonl
ls data/media/ | head
```

---

## 5. Activar sync cada 15 minutos (systemd user timer)

```bash
cd /home/det/Desktop/PELIS/pelis-original/tools/telegram-dumper
./scripts/install-systemd.sh
```

Esto:
- Copia `telegram-dumper.{service,timer}` a `~/.config/systemd/user/`.
- `daemon-reload` + `enable` + `start` del timer.
- El primer run automático es a los 2 min del boot; luego cada 15 min.

Verifica:

```bash
systemctl --user status telegram-dumper.timer
systemctl --user list-timers | grep telegram
```

Si quieres que corra incluso cuando no estés logueado:

```bash
sudo loginctl enable-linger "$USER"
```

---

## 6. Monitoreo

```bash
# Logs en vivo (última ejecución)
journalctl --user -u telegram-dumper.service -f

# Últimas 200 líneas
journalctl --user -u telegram-dumper.service -n 200

# Estado del timer
systemctl --user status telegram-dumper.timer

# Forzar sync manual ahora mismo
systemctl --user start telegram-dumper.service
# o equivalentemente:
~/Desktop/PELIS/pelis-original/tools/telegram-dumper/scripts/sync.sh
```

Métricas rápidas:

```bash
# Total de mensajes guardados
wc -l ~/Desktop/PELIS/pelis-original/tools/telegram-dumper/data/messages.jsonl

# Cursor por canal (SQLite)
sqlite3 ~/Desktop/PELIS/pelis-original/tools/telegram-dumper/data/dumper.db \
  "SELECT channel_id, last_msg_id, total_msgs, last_sync_at FROM channels;"

# Media descargado
du -sh ~/Desktop/PELIS/pelis-original/tools/telegram-dumper/data/media/
```

---

## 7. Desinstalar

```bash
systemctl --user disable --now telegram-dumper.timer
rm ~/.config/systemd/user/telegram-dumper.{service,timer}
systemctl --user daemon-reload

# Si quieres borrar TODO el estado local:
rm -rf ~/Desktop/PELIS/pelis-original/tools/telegram-dumper/data
rm ~/Desktop/PELIS/pelis-original/tools/telegram-dumper/.env
```

---

## Tuning rápido

| Quiero… | Edita |
|---|---|
| Cambiar la cadencia (ej. 5 min) | `scripts/systemd/telegram-dumper.timer` → `OnUnitActiveSec=5min`, luego `./scripts/install-systemd.sh` |
| Sin límite de media | `MAX_MEDIA_MB=0` en `.env` |
| Saltar vídeos pesados (cap 50 MB) | `MAX_MEDIA_MB=50` |
| Más verboso para debug | `LOG_LEVEL=DEBUG` |
| Añadir otro canal | añadir `,-1001234567890` a `TELEGRAM_CHANNEL_IDS` |

---

## Estructura final

```
tools/telegram-dumper/
├── .env                       ← secrets (gitignored)
├── .env.example
├── .gitignore
├── README.md                  ← referencia técnica
├── requirements.txt
├── data/                      ← gitignored
│   ├── messages.jsonl         ← 1 JSON por mensaje
│   ├── dumper.db              ← SQLite: cursores + dedupe
│   ├── dumper.session         ← sesión Telethon persistente
│   └── media/                 ← archivos descargados
├── scripts/
│   ├── sync.sh                ← entrypoint
│   ├── install-systemd.sh
│   └── systemd/
│       ├── telegram-dumper.service
│       └── telegram-dumper.timer
└── src/
    ├── __init__.py
    ├── __main__.py            ← python -m src
    ├── config.py
    ├── client.py
    ├── state.py
    ├── media.py
    └── dump.py
```

---

## Cómo pedirle a otra sesión de opencode que lo corra por ti

Tienes 3 opciones, de más a menos autónoma:

### Opción A — Sesión nueva con el archivo como contexto (recomendado)

1. Abre opencode en una sesión limpia.
2. Pega este prompt:

```
Lee el archivo /home/det/Desktop/PELIS/pelis-original/RUN_TELEGRAM_DUMPER.md
y ejecuta los pasos del 1 al 5 en orden. Cuando llegues al paso 4
(scripts/sync.sh) vas a necesitar que te dé el código SMS que Telegram
me envía al teléfono — pídemelo. No borres data/, no modifiques archivos
fuera de tools/telegram-dumper/. Reporta al final: cuántas líneas se
escribieron en data/messages.jsonl, cuántos archivos en data/media/, y
el estado de systemctl --user status telegram-dumper.timer.
```

3. La sesión teirá pidiendo cada valor conforme los necesite: api_id, api_hash, código SMS, contraseña 2FA. Tú se los dictas y sigue.

### Opción B — Sesión con acceso a terminal pero sin ti

Si ya tienes api_id/api_hash escritos en `.env` y solo quieres que la sesión active el timer:

```
Activa el dumper de Telegram siguiendo solo el paso 5 de
/home/det/Desktop/PELIS/pelis-original/RUN_TELEGRAM_DUMPER.md.
El archivo .env ya está configurado y data/dumper.session ya existe.
Reporta systemctl --user status telegram-dumper.timer al final.
```

### Opción C — Ejecutar tú directamente (sin sesión)

Si solo quieres un checklist personal, sigue los pasos 1-6 de este documento en tu propia terminal. Es lo más rápido si vas a estar presente.

---

## Troubleshooting rápido

| Síntoma | Causa / Fix |
|---|---|
| `ERROR: TELEGRAM_API_ID missing in .env` | No copiaste `.env.example` a `.env` o no rellenaste el valor |
| `ERROR: TELEGRAM_CHANNEL_IDS empty` | El campo está vacío en `.env` |
| `Channel …: CHANNEL_PRIVATE` | Tu cuenta no es miembro del canal. Únete primero desde el cliente de Telegram |
| `FloodWait 3600s` | Telegram limitó tu cuenta por actividad excesiva. El script espera y reintenta — no lo interrumpas |
| El timer dice "waiting" pero nunca corre | Tu sesión de usuario no está activa. Aplica `sudo loginctl enable-linger $USER` |
| `data/messages.jsonl` no crece | Mira los logs: `journalctl --user -u telegram-dumper.service -n 50` |
| Quiero re-empezar desde cero | `rm -rf data/` y vuelve a correr `./scripts/sync.sh` |