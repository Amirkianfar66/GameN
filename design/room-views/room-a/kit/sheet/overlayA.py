# Sheet RA-A's review overlays, for the page only (the Lead, 19 November): RA-A-1, the AI-generated step-1 picture, with version 3's
# step-2 mask edge (gold), step-3 mask edge (orange), the plain-wall area (pale blue), the painted features of the 15 px test
# (featuresA.json: green inside a mask, cyan clear of it, magenta a named exception), the features noted only (white dots) and the
# four small lights (pink). Each picture carries a visible label saying it is AI-generated. Writes ra-A-review-full.png, the back
# wall at 1.5 times (ra-A-review-wall.png) and each phone's slice at twice its stage size (ra-A-review-390.png, -402.png, -430.png).
# These are for review: never an input, never an asset, never committed. Reads RA-A-1 from _in/ and checks its sha256 first.
# Usage: python3 -I overlayA.py
import hashlib, importlib.util, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); J = lambda f: json.load(open(os.path.join(D, f)))
FEAT, KIT, MAN = J('featuresA.json'), J('kit-A.json'), J('room-a-ra-a.json')
SRC = os.path.join(D, '_in/img/RA-A-1.png')
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != FEAT['picture']['sha256']: raise SystemExit('STOP: _in/img/RA-A-1.png is not RA-A-1')
spec = importlib.util.spec_from_file_location('lift5', os.path.join(D, 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
binary = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L')) > 127
place, place3, split = binary('ra-A-place.png'), binary('ra-A-place3.png'), np.array(Image.open(os.path.join(D, 'ra-A-split.png')).convert('L'))
pic = np.array(Image.open(SRC).convert('RGB')).astype(float)
wall = split == J('plainA.json')['grey']; pic[wall] = pic[wall] * 0.78 + np.array([127, 219, 255]) * 0.22
edge = lambda m, w: m & ~L.shrink(m, w)
for m, col in ((place, (255, 209, 102)), (place3, (255, 159, 90))): pic[edge(m, 2)] = col
img = Image.fromarray(pic.round().clip(0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
KF = {f['name']: f for f in KIT['featureTest']['features']}
for f in FEAT['features']:
    k = KF[f['name']]; col = (255, 255, 255) if not f['test'] else (255, 64, 200) if k.get('exception') else (124, 252, 154) if k['step2']['status'] == 'inside' else (0, 229, 255)
    for poly in f['polygons']:
        pts = [tuple(p) for p in poly] + [tuple(poly[0])]
        if f['test']: d.line(pts, fill=col, width=1)
        else:
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) // 3))
                for i in range(0, n, 2): d.line([(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n), (x0 + (x1 - x0) * (i + 1) / n, y0 + (y1 - y0) * (i + 1) / n)], fill=col, width=1)
for lt in FEAT['lights']: x0, y0, x1, y1 = lt['box']; d.rectangle([x0 - 3, y0 - 3, x1 + 2, y1 + 2], outline=(255, 111, 181), width=2)
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line2):   # the AI-generated label, burned in at the top
    im = im.copy(); w = im.width; px = max(13, round(w / 34)); f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    d = ImageDraw.Draw(im, 'RGBA'); d.rectangle([0, 0, w, h], fill=(10, 12, 18, 225))
    d.text((round(px * 0.6), round(px * 0.35)), 'AI-generated picture (RA-A-1): review overlay', font=f1, fill=(255, 224, 160))
    d.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return im
V = MAN['version']
labelled(img, f'Sheet RA-A version {V} masks over it. Not an input or an asset.').save(os.path.join(D, 'ra-A-review-full.png'), optimize=True)
wall_box = (90, 470, 700, 1030); z = img.crop(wall_box); z = z.resize((round(z.width * 1.5), round(z.height * 1.5)), Image.LANCZOS)
labelled(z, f'The back wall, x {wall_box[0]}-{wall_box[2]}, y {wall_box[1]}-{wall_box[3]}, 1.5 times.').save(os.path.join(D, 'ra-A-review-wall.png'), optimize=True)
for key, s in MAN['camera']['phones']['slices'].items():
    x0, y0, x1, y1 = s['paintingRect']; W, SH = s['stage']
    c = img.crop((round(x0), round(y0), round(x1), round(y1))).resize((2 * W, 2 * SH), Image.LANCZOS)
    labelled(c, f'{key}: the phone\'s slice, twice its stage size').save(os.path.join(D, f'ra-A-review-{W}.png'), optimize=True)
print('review overlays: full, wall,', ', '.join(f"{s['stage'][0]}" for s in MAN['camera']['phones']['slices'].values()))
