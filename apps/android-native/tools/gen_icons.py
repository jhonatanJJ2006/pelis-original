"""Genera iconos y banner PELIS (wordmark dorado sobre tinta). Uso: python3 tools/gen_icons.py"""
from PIL import Image, ImageDraw, ImageFont
import os
INK = (11, 11, 13); GOLD = (196, 163, 90); MUTED = (156, 151, 140)
FONT = 'core/src/main/res/font/fraunces_bold.ttf'
DENS = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}

def fit(draw, text, path, max_w):
    size = 10
    while True:
        f = ImageFont.truetype(path, size + 2)
        if draw.textlength(text, font=f) > max_w: return ImageFont.truetype(path, size)
        size += 2

def icon(px, round_=False):
    s = px * 4
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if round_: d.ellipse([0, 0, s - 1, s - 1], fill=INK)
    else: d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.18), fill=INK)
    f = fit(d, 'PELIS', FONT, s * 0.72)
    d.text((s / 2, s / 2 - s * 0.03), 'PELIS', font=f, fill=GOLD, anchor='mm')
    d.rectangle([s * 0.3, s * 0.66, s * 0.7, s * 0.66 + max(2, s * 0.012)], fill=GOLD)
    return img.resize((px, px), Image.LANCZOS)

for module in ('phone', 'tv'):
    for dens, px in DENS.items():
        out = f'{module}/src/main/res/mipmap-{dens}'
        os.makedirs(out, exist_ok=True)
        icon(px).save(f'{out}/ic_launcher.png')
        icon(px, True).save(f'{out}/ic_launcher_round.png')

# Banner Android TV 320x180 (xhdpi)
w, h = 640, 360
b = Image.new('RGB', (w, h), INK)
d = ImageDraw.Draw(b)
f = fit(d, 'PELIS', FONT, w * 0.55)
d.text((w / 2, h / 2), 'PELIS', font=f, fill=GOLD, anchor='mm')
os.makedirs('tv/src/main/res/drawable-xhdpi', exist_ok=True)
b.resize((320, 180), Image.LANCZOS).save('tv/src/main/res/drawable-xhdpi/banner.png')
b.save('/tmp/pelis-banner-preview.png'); icon(192).save('/tmp/pelis-icon-preview.png')
