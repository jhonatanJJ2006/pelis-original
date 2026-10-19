#!/usr/bin/env python3
"""
Imágenes de alta calidad desde la API de TMDB (solo TMDB; nunca webs de streaming).

Para cada película/serie (tabla movie) y anime sin póster/fondo, o con imágenes
pequeñas, busca el título en TMDB y guarda:
  - póster  w780  → public/uploads/<uuid>.webp (+ -400 / -200 para srcset)  → imageId
  - fondo   original redimensionado a 1920 px → public/uploads/<uuid>.webp (+ -1280/-400/-200) → backdropImageId
La TV pide /_next/image a su tamaño, así nunca descarga el original.

Uso:  set -a; . ./.env; set +a; python3 scripts/tmdb-hq-images.py [--apply] [--kind movie|anime|all] [--limit N]
Sin --apply solo informa. Escribe un informe JSON (con los valores anteriores para
deshacer) en tmp/tmdb-hq-images-<fecha>.json. Nunca imprime la API key.
"""
import argparse, datetime, difflib, io, unicodedata, json, os, re, subprocess, sys, time, uuid
import requests
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC = os.environ.get('PELIS_PUBLIC_DIR') or os.path.join(ROOT, 'apps', 'web', 'public')
UPLOADS = os.path.join(PUBLIC, 'uploads')
REPORT_DIR = os.environ.get('PELIS_REPORT_DIR') or os.path.join(ROOT, 'tmp')
KEY = os.environ.get('TMDB_API_KEY', '')
DB = (os.environ.get('DATABASE_URL') or '').split('?')[0]
SEP = '\x1f'
MIN_POSTER_W = 500
MIN_BACKDROP_W = 1280

def psql(sql):
    out = subprocess.run(['psql', DB, '-AtF', SEP, '-c', sql], check=True, capture_output=True, text=True).stdout
    return [l.split(SEP) for l in out.splitlines() if l]

session = requests.Session()
if KEY.startswith('eyJ'):
    session.headers['Authorization'] = 'Bearer ' + KEY

def tmdb(path, **params):
    if not KEY.startswith('eyJ'):
        params['api_key'] = KEY
    for attempt in range(4):
        r = session.get('https://api.themoviedb.org/3' + path, params=params, timeout=20)
        if r.status_code == 429:
            time.sleep(2 + attempt * 2); continue
        if r.status_code == 404:
            return {}
        r.raise_for_status()
        return r.json()
    return {}

def local_size(path):
    if not path or not path.startswith('/'):
        return None
    f = os.path.join(PUBLIC, path.lstrip('/'))
    if not os.path.isfile(f):
        return None
    try:
        with Image.open(f) as im:
            return im.size
    except Exception:
        return None

def clean_name(name):
    n = name.split(' / ')[0]
    n = re.sub(r'\[.*?\]|\(.*?\)', ' ', n)
    n = re.sub(r'\b(lat|latino|1080p|720p|cinemaximo)\b', ' ', n, flags=re.I)
    return re.sub(r'\s+', ' ', n).strip()

def norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    return re.sub(r'[^a-z0-9]', '', s)

def confident(name, hit):
    """Evita pósters equivocados: el título (local u original) debe parecerse al nuestro."""
    a = norm(clean_name(name))
    for t in (hit.get('title'), hit.get('name'), hit.get('original_title'), hit.get('original_name')):
        b = norm(t)
        if not a or not b:
            continue
        if difflib.SequenceMatcher(None, a, b).ratio() >= 0.6 or (len(a) >= 4 and (a in b or b in a)):
            return True
    return False

def search(kind, name, year):
    q = clean_name(name)
    if not q:
        return None
    endpoint = '/search/movie' if kind == 'movie' else '/search/tv'
    yk = 'year' if kind == 'movie' else 'first_air_date_year'
    tries = [dict(query=q, language='es-MX', **({yk: year} if year else {}))]
    if year:
        tries.append(dict(query=q, language='es-MX'))
    for params in tries:
        res = (tmdb(endpoint, **params) or {}).get('results') or []
        for r in res[:5]:
            date = r.get('release_date') or r.get('first_air_date') or ''
            if year and date[:4].isdigit() and abs(int(date[:4]) - int(year)) > 1:
                continue
            if not confident(name, r):
                continue
            return r
    return None

def images(kind, tmdb_id):
    data = tmdb(f"/{'movie' if kind == 'movie' else 'tv'}/{tmdb_id}/images", include_image_language='es,en,null')
    def best(lst, prefer):
        lst = sorted(lst or [], key=lambda i: (i.get('iso_639_1') not in prefer, -(i.get('vote_average') or 0), -(i.get('width') or 0)))
        return lst[0] if lst else None
    return best(data.get('posters'), ('es', 'en')), best(data.get('backdrops'), (None, 'es', 'en'))

def save(file_path, size, widths):
    r = session.get('https://image.tmdb.org/t/p/' + size + file_path, timeout=60)
    r.raise_for_status()
    im = Image.open(io.BytesIO(r.content)).convert('RGB')
    uid = uuid.uuid4().hex
    for i, w in enumerate(widths):
        copy = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        name = f'{uid}.webp' if i == 0 else f'{uid}-{w}.webp'
        copy.save(os.path.join(UPLOADS, name), 'WEBP', quality=82 if i == 0 else 78, method=5)
    return uid, im.size

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--kind', default='all')
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    if not KEY or not DB:
        sys.exit('Faltan TMDB_API_KEY o DATABASE_URL en el entorno')
    os.makedirs(UPLOADS, exist_ok=True)
    rows = []
    if a.kind in ('all', 'movie'):
        for r in psql('select id, name, "releaseYear", "mediaType", image, coalesce("imageId",\'\'), coalesce("backdropImage",\'\'), coalesce("backdropImageId",\'\') from movie order by name'):
            rows.append(dict(table='movie', id=r[0], name=r[1], alt='', year=r[2][:4] if re.match(r'^\d{4}', r[2] or '') else '', kind='tv' if r[3] == 'SERIES' else 'movie', image=r[4], imageId=r[5], backdrop=r[6], backdropId=r[7]))
    if a.kind in ('all', 'anime'):
        for r in psql('select id, title, year::text, coalesce(format,\'\'), image, coalesce("imageId",\'\'), coalesce("backdropImage",\'\'), coalesce("backdropImageId",\'\'), coalesce("alternativeTitle",\'\') from anime order by title'):
            rows.append(dict(table='anime', id=r[0], name=r[1], alt=r[8], year=r[2], kind='movie' if r[3] == 'MOVIE' else 'tv', image=r[4], imageId=r[5], backdrop=r[6], backdropId=r[7]))
    report = dict(started=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + 'Z', apply=a.apply, items=[])
    stats = dict(checked=0, needing=0, poster_needed=0, backdrop_needed=0, poster_fixed=0, backdrop_fixed=0, not_found=0, no_image_on_tmdb=0, errors=0)
    for row in rows:
        poster_path = f"/uploads/{row['imageId']}.webp" if row['imageId'] else row['image']
        back_path = f"/uploads/{row['backdropId']}.webp" if row['backdropId'] else row['backdrop']
        if row['table'] == 'anime':
            need_poster = not poster_path or poster_path.endswith('placeholder.webp')  # AniList ~460 px: vale para tarjetas
        else:
            ps = local_size(poster_path)
            need_poster = ps is None or ps[0] < MIN_POSTER_W
        remote_back = (back_path or '').startswith('http')
        bs = None if remote_back else local_size(back_path)
        need_back = (not remote_back) and (bs is None or bs[0] < MIN_BACKDROP_W or bs[0] / max(bs[1], 1) < 1.3)
        stats['checked'] += 1
        if not (need_poster or need_back):
            continue
        if a.limit and stats['needing'] >= a.limit:
            break
        stats['needing'] += 1
        stats['poster_needed'] += need_poster
        stats['backdrop_needed'] += need_back
        item = dict(table=row['table'], id=row['id'], name=row['name'], need_poster=need_poster, need_backdrop=need_back,
                    before=dict(imageId=row['imageId'] or None, backdropImageId=row['backdropId'] or None, poster_size=None if row['table'] == 'anime' else local_size(poster_path), backdrop_size=bs))
        try:
            hit = search(row['kind'], row['name'], row['year'])
            if not hit and row['alt'] and row['alt'] != row['name']:
                hit = search(row['kind'], row['alt'], row['year'])
            if not hit:
                stats['not_found'] += 1; item['result'] = 'no encontrado en TMDB'; report['items'].append(item); continue
            item['tmdb'] = dict(id=hit['id'], kind=row['kind'], title=hit.get('title') or hit.get('name'))
            poster, backdrop = images(row['kind'], hit['id'])
            poster = poster or ({'file_path': hit['poster_path']} if hit.get('poster_path') else None)
            backdrop = backdrop or ({'file_path': hit['backdrop_path']} if hit.get('backdrop_path') else None)
            sets = []
            if need_poster and poster:
                if a.apply:
                    uid, sz = save(poster['file_path'], 'w780', [780, 400, 200]); item['poster'] = dict(uid=uid, size=sz)
                    sets.append(f'"imageId" = \'{uid}\'')
                stats['poster_fixed'] += 1
            if need_back and backdrop:
                if a.apply:
                    uid, sz = save(backdrop['file_path'], 'original', [1920, 1280, 400, 200]); item['backdrop'] = dict(uid=uid, size=sz)
                    sets.append(f'"backdropImageId" = \'{uid}\'')
                stats['backdrop_fixed'] += 1
            if (need_poster and not poster) or (need_back and not backdrop):
                stats['no_image_on_tmdb'] += 1
                item['missing_on_tmdb'] = dict(poster=bool(need_poster and not poster), backdrop=bool(need_back and not backdrop))
            if a.apply and sets:
                psql(f'update {row["table"]} set {", ".join(sets)} where id = \'{row["id"]}\'')
            item['result'] = 'ok'
        except Exception as e:
            stats['errors'] += 1; item['result'] = 'error: ' + type(e).__name__
        report['items'].append(item)
        time.sleep(0.03)
    report['stats'] = stats
    os.makedirs(REPORT_DIR, exist_ok=True)
    out = os.path.join(REPORT_DIR, f"tmdb-hq-images-{'apply' if a.apply else 'dry'}-{a.kind}-{datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):%Y%m%dT%H%M%SZ}.json")
    json.dump(report, open(out, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(stats), out)

if __name__ == '__main__':
    main()
