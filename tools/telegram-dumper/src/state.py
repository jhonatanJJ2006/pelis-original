from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS channels (
    channel_id     INTEGER PRIMARY KEY,
    last_msg_id    INTEGER NOT NULL DEFAULT 0,
    total_msgs     INTEGER NOT NULL DEFAULT 0,
    last_sync_at   TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS media (
    file_id        TEXT    PRIMARY KEY,
    message_id     INTEGER NOT NULL,
    channel_id     INTEGER NOT NULL,
    path           TEXT    NOT NULL,
    size           INTEGER NOT NULL DEFAULT 0,
    downloaded_at  TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS messages (
    channel_id     INTEGER NOT NULL,
    msg_id         INTEGER NOT NULL,
    date           TEXT    NOT NULL DEFAULT '',
    PRIMARY KEY (channel_id, msg_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_media_msg     ON media(message_id);
CREATE INDEX IF NOT EXISTS idx_media_channel ON media(channel_id);
CREATE INDEX IF NOT EXISTS idx_msgs_channel  ON messages(channel_id, msg_id);
"""


class State:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._lock = threading.Lock()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), isolation_level=None)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def get_last_msg_id(self, channel_id: int) -> int:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT last_msg_id FROM channels WHERE channel_id = ?",
                (channel_id,),
            ).fetchone()
            return int(row[0]) if row else 0

    def get_total(self, channel_id: int) -> int:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT total_msgs FROM channels WHERE channel_id = ?",
                (channel_id,),
            ).fetchone()
            return int(row[0]) if row else 0

    def set_last_msg_id(self, channel_id: int, msg_id: int) -> None:
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO channels (channel_id, last_msg_id, total_msgs, last_sync_at)
                VALUES (?, ?, 0, ?)
                ON CONFLICT(channel_id) DO UPDATE SET
                    last_msg_id  = excluded.last_msg_id,
                    last_sync_at = excluded.last_sync_at
                """,
                (channel_id, msg_id, ts),
            )

    def bump_total(self, channel_id: int, delta: int = 1) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO channels (channel_id, last_msg_id, total_msgs, last_sync_at)
                VALUES (?, 0, ?, ?)
                ON CONFLICT(channel_id) DO UPDATE SET
                    total_msgs   = total_msgs + ?,
                    last_sync_at = ?
                """,
                (channel_id, delta, _now(), delta, _now()),
            )

    def mark_synced(self, channel_id: int, last_msg_id: int) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO channels (channel_id, last_msg_id, total_msgs, last_sync_at)
                VALUES (?, ?, 0, ?)
                ON CONFLICT(channel_id) DO UPDATE SET
                    last_msg_id  = excluded.last_msg_id,
                    last_sync_at = excluded.last_sync_at
                """,
                (channel_id, last_msg_id, _now()),
            )

    def media_exists(self, file_id: str) -> bool:
        if not file_id:
            return False
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM media WHERE file_id = ? LIMIT 1", (file_id,)
            ).fetchone()
            return row is not None

    def record_media(
        self, file_id: str, message_id: int, channel_id: int, path: str, size: int
    ) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO media
                    (file_id, message_id, channel_id, path, size, downloaded_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (file_id, message_id, channel_id, path, size, _now()),
            )

    def record_message(self, channel_id: int, msg_id: int, iso_date: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO messages (channel_id, msg_id, date) VALUES (?, ?, ?)",
                (channel_id, msg_id, iso_date),
            )

    def known_msg_ids(self, channel_id: int, since_id: int) -> set[int]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT msg_id FROM messages WHERE channel_id = ? AND msg_id > ?",
                (channel_id, since_id),
            ).fetchall()
        return {int(r[0]) for r in rows}


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())