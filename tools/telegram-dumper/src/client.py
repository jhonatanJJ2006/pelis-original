from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError,
    ServerError,
    TimedOutError,
)
from telethon.network.connection import ConnectionTcpAbridged
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .config import Config

log = logging.getLogger(__name__)


def build_client(cfg: Config) -> TelegramClient:
    session_path = Path(cfg.data_dir) / cfg.session_name
    return TelegramClient(
        str(session_path),
        cfg.api_id,
        cfg.api_hash,
        connection=ConnectionTcpAbridged,
        retry_delay=5,
        auto_reconnect=True,
        connection_retries=None,
        request_retries=5,
    )


async def with_flood_wait(coro_func, *args, **kwargs):
    async for attempt in AsyncRetrying(
        reraise=True,
        stop=stop_after_attempt(8),
        wait=wait_exponential(multiplier=2, min=2, max=300),
        retry=retry_if_exception_type(
            (FloodWaitError, ServerError, TimedOutError, ConnectionError, OSError)
        ),
    ):
        with attempt:
            try:
                return await coro_func(*args, **kwargs)
            except FloodWaitError as exc:
                wait = exc.seconds + 2
                log.warning("FloodWait %ss — sleeping", wait)
                await asyncio.sleep(wait)
                raise