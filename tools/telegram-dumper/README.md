# Telegram Movie Channels Dumper

MTProto (Telethon) backup tool for one or more Telegram channels/groups.
Exports every message (text + media) to a local **JSONL** stream and downloads
media files to `data/media/`. Designed to run periodically via **systemd
timer** every 15 minutes, with idempotent incremental sync.

## Layout

```
tools/telegram-dumper/
├── .env                 # secrets (NOT committed)
├── .env.example         # template
├── requirements.txt
├── src/                 # python -m src
│   ├── config.py
│   ├── client.py
│   ├── state.py
│   ├── media.py
│   └── dump.py
├── scripts/
│   ├── sync.sh          # venv-aware entrypoint used by systemd
│   ├── install-systemd.sh
│   └── systemd/         # user units
└── data/                # gitignored runtime state
    ├── messages.jsonl   # append-only, 1 JSON / line
    ├── dumper.db        # SQLite: last_msg_id, dedupe index
    └── media/<channel>_<msg>_<file_id>.<ext>
```

## One-time setup

1. **Get Telegram API credentials** at https://my.telegram.org
   → *API development tools* → create app → copy `api_id` and `api_hash`.

2. **Configure secrets**:
   ```bash
   cd tools/telegram-dumper
   cp .env.example .env
   $EDITOR .env          # fill TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_CHANNEL_IDS
   ```
   `TELEGRAM_CHANNEL_IDS` accepts multiple ids comma-separated, e.g.
   `-1002154921408,-1009876543210`.

3. **Install Python deps** (system or venv):
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

4. **First run — interactive login** (only once, to create the session):
   ```bash
   ./scripts/sync.sh
   ```
   It will ask for your phone number, then the SMS code Telegram sends. If 2FA
   is enabled, it will ask for the cloud password. The session file is stored
   in `data/dumper.session`. Subsequent runs reuse it silently.

   Tip: run this in a terminal you can read SMS from — once the session file
   exists, every later invocation is non-interactive.

## Periodic sync (systemd user timer)

```bash
./scripts/install-systemd.sh
```

This copies the `.service` + `.timer` into `~/.config/systemd/user/`, enables
the timer, and starts it. Cadence is every **15 minutes** (`OnUnitActiveSec`).

Useful commands:
```bash
systemctl --user status telegram-dumper.timer
systemctl --user list-timers | grep telegram
journalctl --user -u telegram-dumper.service -f       # live log
journalctl --user -u telegram-dumper.service -n 200   # recent log
systemctl --user stop telegram-dumper.timer
```

If you want it to keep running even when you're logged out, enable lingering:
```bash
sudo loginctl enable-linger "$USER"
```

## Manual one-off run

```bash
./scripts/sync.sh                      # sync once, exits
MAX_MEDIA_MB=0 ./scripts/sync.sh       # unlimited media size for this run
LOG_LEVEL=DEBUG ./scripts/sync.sh      # verbose
```

## What gets stored

Every line of `data/messages.jsonl` is a JSON object with:

| field | meaning |
|---|---|
| `channel_id`, `id` | Telegram ids |
| `date`, `edit_date` | ISO-8601 UTC |
| `type` | `text`, `media`, `sticker`, `service:…`, `empty` |
| `sender` | `{id, name, username}` |
| `text` | raw text (markdown preserved) |
| `reply_to_msg_id`, `topic_id`, `grouped_id` | thread metadata |
| `views`, `forwards`, `pinned`, `silent` | flags |
| `media_type`, `media_file_id`, `media_path`, `media_size` | media |
| `sticker` | true for stickers |
| `forward` | `{from_id, from_name, date, post_author}` |
| `replies` | `{replies, replies_pts, recent_repliers}` |
| `reactions` | `[{emoji, document_id, count, chosen}]` |
| `via_bot_id`, `post_author` | misc |

## Resumability

State lives in `data/dumper.db` (SQLite, WAL):

- `channels(channel_id, last_msg_id, total_msgs, last_sync_at)` —
  cursor per channel.
- `messages(channel_id, msg_id, date)` — full dedupe index.
- `media(file_id, message_id, channel_id, path, size, downloaded_at)` —
  dedupe by Telegram `file_id` so re-uploaded media is downloaded once.

If a run crashes mid-way, the next invocation picks up from
`last_msg_id` and only processes new messages. Already-seen messages are
filtered out via `known_msg_ids`.

## Tuning

| env var | default | description |
|---|---|---|
| `MAX_MEDIA_MB` | `200` | skip media larger than this; `0` = unlimited |
| `BATCH_COMMIT` | `50` | flush + persist cursor every N messages |
| `LOG_LEVEL` | `INFO` | `DEBUG` for verbose flood-wait logs |
| `TELEGRAM_SESSION_NAME` | `dumper` | session file basename |
| `OnUnitActiveSec` (timer) | `15min` | cadence — edit `.timer` to change |

## Uninstall

```bash
systemctl --user disable --now telegram-dumper.timer
rm ~/.config/systemd/user/telegram-dumper.{service,timer}
systemctl --user daemon-reload
```