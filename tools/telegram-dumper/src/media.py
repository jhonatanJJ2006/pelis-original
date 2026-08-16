from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from telethon.tl.custom.message import Message

from .config import Config
from .state import State

log = logging.getLogger(__name__)


async def download_for_message(
    message: Message,
    channel_id: int,
    cfg: Config,
    state: State,
) -> Optional[Path]:
    if not message.media:
        return None

    document = getattr(message.media, "document", None)
    photo = getattr(message.media, "photo", None)

    file_id = ""
    ext = "bin"
    expected_size = 0

    if document is not None:
        file_id = str(document.id)
        expected_size = int(document.size or 0)
        for attr in document.attributes:
            name = type(attr).__name__
            if name in ("DocumentAttributeFilename",):
                ext = (attr.file_name or "").rsplit(".", 1)[-1] or ext
                break
        mime = getattr(document, "mime_type", "") or ""
        if mime.startswith("video/"):
            ext = ext if ext and ext != "bin" else "mp4"
        elif mime.startswith("audio/"):
            ext = ext if ext and ext != "bin" else "ogg"
        elif mime == "image/webp" and not message.sticker:
            ext = "webp"
        if message.sticker:
            ext = "tgs" if mime == "application/x-tgsticker" else "webp"
    elif photo is not None:
        file_id = str(photo.id)
        sizes = getattr(photo, "sizes", None) or []
        expected_size = max(
            (int(getattr(s, "size", 0) or 0) for s in sizes if hasattr(s, "size")),
            default=0,
        )
        ext = "jpg"

    if not file_id:
        return None

    if cfg.max_media_bytes and expected_size and expected_size > cfg.max_media_bytes:
        log.info(
            "msg %s: media %sB exceeds cap %sB — skipping",
            message.id,
            expected_size,
            cfg.max_media_bytes,
        )
        return None

    if state.media_exists(file_id):
        log.debug("msg %s: media file_id %s already on disk — skip", message.id, file_id)
        return None

    suffix = f".{ext}" if ext else ""
    target = cfg.media_dir / f"{channel_id}_{message.id}_{file_id}{suffix}"

    try:
        saved = await message.download_media(file=str(target))
    except Exception as exc:
        log.warning("msg %s: download failed (%s) — skipping", message.id, exc)
        return None

    if saved is None:
        return None

    saved_path = Path(saved)
    size = saved_path.stat().st_size if saved_path.exists() else 0

    if cfg.max_media_bytes and size > cfg.max_media_bytes:
        log.info(
            "msg %s: downloaded media %sB exceeds cap — removing", message.id, size
        )
        try:
            saved_path.unlink(missing_ok=True)
        except OSError:
            pass
        return None

    state.record_media(file_id, message.id, channel_id, str(saved_path), size)
    return saved_path