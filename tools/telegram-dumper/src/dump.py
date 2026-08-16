from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from telethon import TelegramClient
from telethon.errors import ChannelPrivateError, ChatAdminRequiredError, RPCError
from telethon.tl.custom.message import Message
from telethon.tl.types import (
    MessageReactions,
    MessageReplies,
    ReactionCount,
    PeerChannel,
)

from .client import build_client, with_flood_wait
from .config import Config, ensure_dirs
from .media import download_for_message
from .state import State

log = logging.getLogger(__name__)


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def _serialize_reactions(reactions: MessageReactions | None) -> list[dict[str, Any]]:
    if reactions is None:
        return []
    out: list[dict[str, Any]] = []
    for rc in reactions.results or []:
        if not isinstance(rc, ReactionCount):
            continue
        reaction = rc.reaction
        emoji = getattr(reaction, "emoticon", None)
        doc_id = getattr(reaction, "document_id", None)
        out.append(
            {
                "emoji": emoji,
                "document_id": doc_id,
                "count": rc.count,
                "chosen": getattr(rc, "chosen", None),
            }
        )
    return out


def _serialize_replies(replies: MessageReplies | None) -> dict[str, Any] | None:
    if replies is None:
        return None
    recent = []
    for peer in replies.recent_repliers or []:
        user_id = getattr(peer, "user_id", None)
        if user_id is not None:
            recent.append(int(user_id))
    return {
        "replies": replies.replies,
        "replies_pts": replies.replies_pts,
        "recent_repliers": recent,
    }


def _sender_info(message: Message) -> dict[str, Any]:
    sender = message.sender
    if sender is None:
        return {"id": None, "name": None, "username": None}
    return {
        "id": getattr(sender, "id", None),
        "name": _sender_name(sender),
        "username": getattr(sender, "username", None),
    }


def _sender_name(sender: Any) -> str:
    if sender is None:
        return ""
    first = (getattr(sender, "first_name", None) or "").strip()
    last = (getattr(sender, "last_name", None) or "").strip()
    full = f"{first} {last}".strip()
    return full or getattr(sender, "title", "") or getattr(sender, "username", "") or ""


def _forward_info(message: Message) -> dict[str, Any] | None:
    fwd = message.fwd_from
    if fwd is None:
        return None
    from_id = None
    if fwd.from_id is not None:
        peer = fwd.from_id
        from_id = getattr(peer, "channel_id", None) or getattr(peer, "user_id", None)
        if from_id is None and isinstance(peer, PeerChannel):
            from_id = peer.channel_id
    return {
        "from_id": from_id,
        "from_name": getattr(fwd, "from_name", None),
        "date": _iso(fwd.date),
        "post_author": getattr(fwd, "post_author", None),
    }


def _build_record(
    message: Message,
    channel_id: int,
    media_path: Path | None,
) -> dict[str, Any]:
    media = message.media
    media_type = None
    file_id = None
    if media is not None:
        media_type = type(media).__name__
        document = getattr(media, "document", None)
        photo = getattr(media, "photo", None)
        if document is not None:
            file_id = str(document.id)
        elif photo is not None:
            file_id = str(photo.id)

    record: dict[str, Any] = {
        "channel_id": channel_id,
        "id": message.id,
        "date": _iso(message.date),
        "edit_date": _iso(message.edit_date),
        "type": _message_type(message),
        "sender": _sender_info(message),
        "text": message.raw_text or "",
        "reply_to_msg_id": message.reply_to_msg_id,
        "topic_id": getattr(message, "topic_id", None),
        "views": message.views or 0,
        "forwards": message.forwards or 0,
        "media_type": media_type,
        "media_file_id": file_id,
        "media_path": str(media_path) if media_path else None,
        "media_size": media_path.stat().st_size if media_path and media_path.exists() else 0,
        "sticker": bool(getattr(message, "sticker", None)),
        "pinned": bool(getattr(message, "pinned", False)),
        "silent": bool(getattr(message, "silent", False)),
        "forward": _forward_info(message),
        "replies": _serialize_replies(message.replies),
        "reactions": _serialize_reactions(message.reactions),
        "via_bot_id": getattr(message, "via_bot_id", None),
        "post_author": getattr(message, "post_author", None),
        "grouped_id": getattr(message, "grouped_id", None),
    }
    return record


def _message_type(message: Message) -> str:
    if message.action is not None:
        return f"service:{type(message.action).__name__}"
    if message.sticker:
        return "sticker"
    if message.media is not None:
        return "media"
    if message.raw_text:
        return "text"
    return "empty"


def _append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


async def _resolve_entity(client: TelegramClient, channel_id: int) -> Any:
    return await with_flood_wait(client.get_entity, channel_id)


async def _process_channel(
    client: TelegramClient,
    cfg: Config,
    state: State,
    channel_id: int,
    jsonl_handle: Any,
) -> dict[str, int]:
    entity = await _resolve_entity(client, channel_id)
    title = getattr(entity, "title", None) or getattr(entity, "username", "") or str(channel_id)
    log.info("Channel %s resolved: %s", channel_id, title)

    last_id = state.get_last_msg_id(channel_id)
    known = state.known_msg_ids(channel_id, last_id)
    is_first_run = last_id == 0 and state.get_total(channel_id) == 0

    log.info(
        "Channel %s: last_msg_id=%s, total_so_far=%s, is_first_run=%s",
        channel_id,
        last_id,
        state.get_total(channel_id),
        is_first_run,
    )

    processed = 0
    downloaded = 0
    max_seen = last_id
    pending = 0

    iter_kwargs: dict[str, Any] = {"entity": entity, "reverse": is_first_run}
    if not is_first_run:
        iter_kwargs["min_id"] = last_id

    async for message in client.iter_messages(**iter_kwargs):
        if message.id <= last_id:
            continue
        if message.id in known:
            continue

        try:
            media_path = await download_for_message(message, channel_id, cfg, state)
        except Exception as exc:
            log.warning("msg %s: media error %s — continuing", message.id, exc)
            media_path = None

        if media_path is not None:
            downloaded += 1

        record = _build_record(message, channel_id, media_path)
        _append_jsonl(cfg.jsonl_path, record)
        state.record_message(channel_id, message.id, record["date"])
        processed += 1
        pending += 1
        if message.id > max_seen:
            max_seen = message.id

        if pending >= cfg.batch_commit:
            state.mark_synced(channel_id, max_seen)
            jsonl_handle.flush()
            pending = 0
            log.info(
                "Channel %s: progress %s new msgs (last_id=%s, downloaded=%s)",
                channel_id,
                processed,
                max_seen,
                downloaded,
            )

    state.mark_synced(channel_id, max_seen)
    jsonl_handle.flush()
    log.info(
        "Channel %s: done. %s new msgs, %s media downloaded, last_id=%s",
        channel_id,
        processed,
        downloaded,
        max_seen,
    )
    return {
        "processed": processed,
        "downloaded": downloaded,
        "last_msg_id": max_seen,
    }


async def run(cfg: Config) -> int:
    ensure_dirs(cfg)
    state = State(cfg.db_path)
    client = build_client(cfg)

    await client.start()
    me = await client.get_me()
    log.info(
        "Signed in as %s (%s) phone=%s",
        getattr(me, "username", ""),
        getattr(me, "id", ""),
        getattr(me, "phone", ""),
    )

    cfg.jsonl_path.parent.mkdir(parents=True, exist_ok=True)
    jsonl_handle = cfg.jsonl_path.open("a", encoding="utf-8")

    exit_code = 0
    summary: list[dict[str, Any]] = []
    try:
        for channel_id in cfg.channel_ids:
            try:
                result = await _process_channel(client, cfg, state, channel_id, jsonl_handle)
                summary.append({"channel_id": channel_id, **result})
            except ChannelPrivateError:
                log.error("Channel %s: CHANNEL_PRIVATE — account is not a member", channel_id)
                exit_code = 1
            except ChatAdminRequiredError:
                log.error("Channel %s: needs admin rights for full history", channel_id)
                exit_code = 1
            except RPCError as exc:
                log.error("Channel %s: RPC error %s", channel_id, exc)
                exit_code = 1
    finally:
        jsonl_handle.close()
        await client.disconnect()

    log.info("==== SUMMARY ====")
    for row in summary:
        log.info("%s", row)
    return exit_code


def main(argv: list[str] | None = None) -> int:
    from .config import load_config

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    cfg = load_config()
    logging.getLogger().setLevel(cfg.log_level)

    try:
        return asyncio.run(run(cfg))
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        return 130