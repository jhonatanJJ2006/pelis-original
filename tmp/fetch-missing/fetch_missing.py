#!/usr/bin/env python3
"""Fetcher dirigido: busca las películas sin video en los canales de Telegram,
descarga el video completo (sin cap de tamaño) a Pelis-B/fetch-pendientes/<token>/.

Solo descarga. La conversión HLS y el update de DB se hacen aparte.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import re
import sys
import unicodedata
from pathlib import Path

from telethon import TelegramClient, errors

ROOT = Path(__file__).resolve().parent.parent.parent  # pelis-original/
CSV_PATH = ROOT / "tmp/movies-sin-video-20260823-180931.csv"
SESSION_TMPL = str(ROOT / "tmp/fetch-missing/fetcher{shard}.session")
DEST_ROOT = Path("/run/media/det/Pelis-B/fetch-pendientes")
STATE_PATH = ROOT / "tmp/fetch-missing/state.json"

# tokens ya resueltos por otra vía (HLS en disco + DB)
SKIP_TOKENS = {"661f3b4f07c08"}

API_ID = 27944776
API_HASH = "f9e2b9595f9f0ade7fbd9feb15212fb5"
CHANNELS = [-1002154921408, -1002144657691]

MIN_SIZE = 150 * 1024 * 1024   # 150 MB: pelis reales
MAX_SIZE = 12 * 1024 * 1024 * 1024
SEARCH_LIMIT = 40
SLEEP_BETWEEN_SEARCH = 2.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fetcher")


def normalize(s: str) -> str:
    s = (s or "").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^\w\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


ALIASES: dict[str, list[str]] = {
    "ella": ["her 2013"],
    "la invencion de hugo cabret": ["hugo"],
    "mision imposible 6 repercusion": ["mision imposible fallout", "mission impossible fallout"],
    "mision imposible la sentencia final": ["mision imposible sentencia final", "the final reckoning"],
    "guerra mundial z": ["world war z"],
    "volver al futuro": ["back to the future"],
    "la isla siniestra": ["shutter island"],
    "el sexto sentido": ["sixth sense"],
    "la cosa del otro mundo": ["the thing 1982", "la cosa"],
    "parque jurasico": ["jurassic park"],
    "dulce noviembre": ["sweet november"],
    "tienes un e mail": ["you ve got mail"],
    "supercool": ["superbad"],
    "siempre a tu lado hachiko": ["hachiko"],
    "talentos ocultos": ["hidden figures"],
    "zona de miedo": ["hurt locker"],
    "un buen ano": ["a good year"],
    "diario de una pasion": ["the notebook"],
    "como agua para chocolate": ["como agua para chocolate"],
    "hechizo de amor": ["practical magic"],
    "el veredicto": ["the verdict"],
    "muerte en el nilo": ["death on the nile"],
    "el dia de la revelacion": [],  # placeholder no usado
    "blanca nieves": ["blancanieves", "snow white"],
}


def load_movies() -> list[dict]:
    with CSV_PATH.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    movies = []
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            continue
        norm = normalize(name)
        queries = [name] + ALIASES.get(norm, [])
        # variante sin tildes para la búsqueda server-side
        deacc = normalize(name)
        if deacc != name.lower():
            queries.append(deacc)
        seen: set[str] = set()
        uniq = []
        for q in queries:
            k = q.lower()
            if k not in seen:
                seen.add(k)
                uniq.append(q)
        movies.append({
            "id": r["id"].strip(),
            "token": r["token"].strip(),
            "name": name,
            "norm": norm,
            "year": (r.get("releaseYear") or "").strip(),
            "queries": uniq,
        })
    return movies


def score_message(msg, movie: dict) -> int:
    text = normalize(getattr(msg, "raw_text", "") or "")
    size = 0
    duration = 0
    doc = getattr(msg, "document", None)
    if doc is None:
        return -1
    size = doc.size or 0
    for attr in doc.attributes:
        d = getattr(attr, "duration", None)
        if d:
            duration = d
    if size < MIN_SIZE or size > MAX_SIZE:
        return -1
    mime = getattr(doc, "mime_type", "") or ""
    if mime and not mime.startswith("video"):
        return -1

    score = 0
    if movie["norm"] and movie["norm"] in text:
        score += 10
    else:
        # match parcial: primeras 3 palabras del título
        words = movie["norm"].split()
        if len(words) >= 3 and all(w in text for w in words[:3]):
            score += 6
        elif len(words) >= 2 and words[0] in text and words[-1] in text:
            score += 3
        else:
            return -1
    if movie["year"] and movie["year"] in text:
        score += 4
    for hint in ("latino", "espanol", "español", "castellano", "sub"):
        if hint in text:
            score += 1
            break
    if 40 * 60 <= duration <= 200 * 60:
        score += 2
    if MIN_SIZE <= size <= 8 * 1024 * 1024 * 1024:
        score += 1
    return score


async def find_best(client: TelegramClient, movie: dict, claimed: set[int]):
    best = None
    best_score = 0
    best_channel = None
    for channel in CHANNELS:
        for query in movie["queries"]:
            try:
                async for msg in client.iter_messages(channel, search=query, limit=SEARCH_LIMIT):
                    if msg.id in claimed:
                        continue
                    sc = score_message(msg, movie)
                    if sc > best_score:
                        best, best_score, best_channel = msg, sc, channel
                        if sc >= 15:
                            break
            except errors.FloodWaitError as e:
                log.warning("FloodWait %ss en search '%s' — espero", e.seconds, query)
                await asyncio.sleep(e.seconds + 30)
                continue
            except errors.RPCError as e:
                log.warning("RPC error search '%s': %s", query, e)
                continue
            await asyncio.sleep(SLEEP_BETWEEN_SEARCH)
            if best_score >= 15:
                break
        if best_score >= 15:
            break
    return (best, best_channel, best_score) if best else None


def existing_video(token: str) -> bool:
    d = DEST_ROOT / token
    mf = d / "manifest.json"
    if not mf.exists():
        return False  # sin manifest no hay garantía de descarga completa
    try:
        manifest = json.loads(mf.read_text())
    except Exception:  # noqa: BLE001
        return False
    expected = manifest.get("expected_size")
    for f in d.iterdir():
        if f.suffix.lower() not in (".mp4", ".mkv", ".avi", ".webm"):
            continue
        size = f.stat().st_size
        if size < MIN_SIZE:
            continue
        if expected and abs(size - expected) > 1024 * 1024:
            continue  # archivo truncado de un intento previo
        return True
    return False


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, default=0)
    parser.add_argument("--total", type=int, default=1)
    args = parser.parse_args()

    movies = [m for i, m in enumerate(load_movies(), 1) if (i % args.total) == args.shard]
    log.info("Shard %d/%d — películas a procesar: %d", args.shard, args.total, len(movies))
    DEST_ROOT.mkdir(parents=True, exist_ok=True)

    session_path = SESSION_TMPL.format(shard=args.shard)
    client = TelegramClient(session_path, API_ID, API_HASH)
    await client.start()
    me = await client.get_me()
    log.info("Signed in as %s (%s)", getattr(me, "username", ""), getattr(me, "id", ""))

    done: list[str] = []
    failed: list[tuple[str, str]] = []
    claimed: set[int] = set()

    for i, movie in enumerate(movies, 1):
        token = movie["token"]
        label = f"[{i}/{len(movies)}] {movie['name']} ({movie['year']})"
        if token in SKIP_TOKENS:
            log.info("%s → ya resuelta (HLS en disco), skip", label)
            done.append(movie["id"])
            continue
        if existing_video(token):
            log.info("%s → ya descargada antes, skip", label)
            done.append(movie["id"])
            continue

        found = None
        try:
            found = await find_best(client, movie, claimed)
        except Exception as exc:  # noqa: BLE001
            log.warning("%s → error buscando: %s", label, exc)

        if not found:
            log.info("%s → SIN CANDIDATO", label)
            failed.append((movie["id"], movie["name"]))
            continue

        msg, channel, score = found
        dest_dir = DEST_ROOT / token
        dest_dir.mkdir(parents=True, exist_ok=True)
        expected = msg.document.size or 0
        (dest_dir / "manifest.json").write_text(json.dumps({
            "token": token,
            "name": movie["name"],
            "channel_id": channel,
            "msg_id": msg.id,
            "expected_size": expected,
            "score": score,
        }), encoding="utf-8")
        log.info("%s → descargo msg %s canal %s (score=%d, %.0f MB)",
                 label, msg.id, channel, score, (msg.document.size or 0) / 1048576)
        try:
            path = await client.download_media(msg, file=str(dest_dir / "video"))
            if path and Path(path).stat().st_size >= MIN_SIZE:
                claimed.add(msg.id)
                done.append(movie["id"])
                log.info("%s ✓ guardado en %s", label, path)
            else:
                log.warning("%s → descarga corta/incompleta: %s", label, path)
                failed.append((movie["id"], movie["name"]))
        except errors.FloodWaitError as e:
            log.warning("FloodWait %ss durante descarga — espero y reintento 1 vez", e.seconds)
            await asyncio.sleep(e.seconds + 60)
            try:
                path = await client.download_media(msg, file=str(dest_dir / "video"))
                if path and Path(path).stat().st_size >= MIN_SIZE:
                    claimed.add(msg.id)
                    done.append(movie["id"])
                    log.info("%s ✓ (reintento) %s", label, path)
                else:
                    failed.append((movie["id"], movie["name"]))
            except Exception as exc:  # noqa: BLE001
                log.warning("%s → fallo reintento: %s", label, exc)
                failed.append((movie["id"], movie["name"]))
        except Exception as exc:  # noqa: BLE001
            log.warning("%s → error descarga: %s", label, exc)
            failed.append((movie["id"], movie["name"]))

        # progreso persistente simple por shard
        (ROOT / f"tmp/fetch-missing/state{args.shard}.json").write_text(
            f"done={len(done)}\nfailed={len(failed)}\nlast={movie['name']}\n",
            encoding="utf-8",
        )

    log.info("==== RESUMEN ====")
    log.info("descargadas/ya-presentes: %d | sin candidato o fallidas: %d", len(done), len(failed))
    for mid, mname in failed:
        log.info("FALLIDA: %s", mname)

    await client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
