from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


@dataclass(frozen=True)
class Config:
    api_id: int
    api_hash: str
    channel_ids: tuple[int, ...]
    max_media_mb: int
    data_dir: Path
    media_dir: Path
    jsonl_path: Path
    db_path: Path
    session_name: str
    log_level: str
    batch_commit: int

    @property
    def max_media_bytes(self) -> int:
        return self.max_media_mb * 1024 * 1024 if self.max_media_mb > 0 else 0


def _parse_channel_ids(raw: str) -> tuple[int, ...]:
    ids: list[int] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if chunk.startswith("@"):
            raise ValueError(
                f"Channel id must be numeric (got {chunk!r}). "
                "Pass the -100… form, not a username."
            )
        try:
            ids.append(int(chunk))
        except ValueError as exc:
            raise ValueError(f"Invalid channel id: {chunk!r}") from exc
    if not ids:
        raise ValueError("TELEGRAM_CHANNEL_IDS is empty")
    return tuple(ids)


def load_config() -> Config:
    if not ENV_FILE.exists():
        print(f"ERROR: {ENV_FILE} not found. Copy .env.example to .env first.", file=sys.stderr)
        sys.exit(2)

    load_dotenv(ENV_FILE, override=False)

    try:
        api_id = int(os.environ["TELEGRAM_API_ID"])
    except KeyError:
        print("ERROR: TELEGRAM_API_ID missing in .env", file=sys.stderr)
        sys.exit(2)
    except ValueError:
        print("ERROR: TELEGRAM_API_ID must be numeric", file=sys.stderr)
        sys.exit(2)

    api_hash = os.environ.get("TELEGRAM_API_HASH", "").strip()
    if not api_hash:
        print("ERROR: TELEGRAM_API_HASH missing in .env", file=sys.stderr)
        sys.exit(2)

    channel_ids_raw = os.environ.get("TELEGRAM_CHANNEL_IDS", "").strip()
    if not channel_ids_raw:
        print("ERROR: TELEGRAM_CHANNEL_IDS missing in .env", file=sys.stderr)
        sys.exit(2)

    try:
        channel_ids = _parse_channel_ids(channel_ids_raw)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(2)

    max_media_mb = int(os.environ.get("MAX_MEDIA_MB", "200"))
    if max_media_mb < 0:
        print("ERROR: MAX_MEDIA_MB must be >= 0 (0 = unlimited)", file=sys.stderr)
        sys.exit(2)

    data_dir = PROJECT_ROOT / "data"
    media_dir = data_dir / "media"
    jsonl_path = data_dir / "messages.jsonl"
    db_path = data_dir / "dumper.db"

    session_name = os.environ.get("TELEGRAM_SESSION_NAME", "dumper").strip() or "dumper"
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    batch_commit = int(os.environ.get("BATCH_COMMIT", "50"))

    return Config(
        api_id=api_id,
        api_hash=api_hash,
        channel_ids=channel_ids,
        max_media_mb=max_media_mb,
        data_dir=data_dir,
        media_dir=media_dir,
        jsonl_path=jsonl_path,
        db_path=db_path,
        session_name=session_name,
        log_level=log_level,
        batch_commit=batch_commit,
    )


def ensure_dirs(cfg: Config) -> None:
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    cfg.media_dir.mkdir(parents=True, exist_ok=True)