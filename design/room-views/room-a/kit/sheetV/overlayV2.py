# Sheets RA-C to RA-E version 2, for the page only: review pictures of the view's accepted step-1 picture (AI-generated), each labelled
# as one in the picture itself and listed, with its alt text and caption, in review-<V>.json for the page (sheet<V>.mjs). Never an
# input, an asset or a commit. Reads step1-<V>.json (the picture's name and sha256), the picture from _rec1/img (sha256 checked), the
# masks, kit-<V>.json, features<V>.json, and, where the view has them, zooms-<V>.json (crops to show at a scale, with version 1.1's mask
# from the version 1.1 read-back and measured lines from measure-<V>2.json) and version 1.1's masks.
#   ra-<V>-<n>-masks.png          the picture with version 2's masks over it (step 2 gold, step 3 orange) and, where the view has
#                                 one, its window's painted opening (window-<V>.json), the moving sky's outline, green
#   ra-<V>-<n>-features-<k>.png   round each masked area with features near it, at 2 times: features cyan, exception zones magenta
#   ra-<V>-<n>-<zoom>.png         the view's zooms (zooms-<V>.json)
# Usage: python3 -I overlayV2.py <V>
import hashlib, importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
V = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, '..', f'sheet{V}')
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
J = lambda f: json.load(open(os.path.join(D, f)))
S1 = J(f'step1-{V}.json'); SRC = os.path.join(D, '_rec1', 'img', f"{S1['name']}.png")
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != S1['sha256']: raise SystemExit(f"STOP: _rec1/img/{S1['name']}.png is not {S1['name']}")
n = S1['name'].split('-')[-1]; pic = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
binary = lambda f: np.array(Image.open(f).convert('L')) > 127
place = binary(os.path.join(D, f'ra-{V}-place.png')); p3f = os.path.join(D, f'ra-{V}-place3.png'); place3 = binary(p3f) if os.path.exists(p3f) else np.zeros_like(place)
edge = lambda m: L.grow(m, 1) & ~m
KIT, FEAT = J(f'kit-{V}.json'), J(f'features{V}.json')
def font(k):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, k)
    return ImageFont.load_default()
def label(im, lines, size=15):
    size = min(size, 13) if im.size[0] < 600 else size   # narrow crops: a smaller face, the lines kept short
    d = ImageDraw.Draw(im); f = font(size); h = 8 + len(lines) * (size + 5)
    d.rectangle([0, 0, im.size[0], h], fill=(12, 14, 20)); [d.text((8, 5 + i * (size + 5)), t, fill=(255, 224, 150) if i == 0 else (235, 235, 235), font=f) for i, t in enumerate(lines)]
    return im
AI = f"AI-generated picture: {S1['name']}"
review = []
def save(im, name, alt, caption, section):
    f = f'ra-{V}-{n}-{name}.png'; im.save(os.path.join(D, f)); review.append({'file': f, 'alt': alt, 'caption': caption, 'w': im.size[0], 'h': im.size[1], 'section': section})
# the whole picture with the masks
GRW = KIT.get('growth'); before = L.grow(binary(os.path.join(D, f'ra-{V}-furniture.png')), 6) & place if GRW else place   # the selective growth's band, where there is one
a = pic.copy(); a[before] = a[before] * 0.7 + np.array([255, 200, 60]) * 0.3; a[L.grow(edge(before), 1)] = [255, 200, 60]
if GRW: band = place & ~before; a[band] = a[band] * 0.45 + np.array([0, 235, 255]) * 0.55; a[L.grow(edge(place), 1) & ~L.grow(before, 1)] = [0, 235, 255]
if place3.any(): a[place3] = a[place3] * 0.6 + np.array([255, 120, 40]) * 0.4; a[L.grow(edge(place3), 1)] = [255, 120, 40]
WINF = os.path.join(D, f'window-{V}.json'); WIN = json.load(open(WINF))['opening']['outline'] if os.path.exists(WINF) else None   # the fitted window, where the view has one
ov = Image.fromarray(a.astype(np.uint8))
if WIN: ImageDraw.Draw(ov).line([tuple(p) for p in WIN + WIN[:1]], fill=(0, 255, 0), width=2)
save(label(ov, [f"{AI}, view {V}'s step 1", "Step 2's mask tinted, its edge gold" + ("; the 12 px growth cyan" if GRW else '') + ("; step 3's orange" if place3.any() else '')] + (["The window's painted opening, the moving sky's outline, green"] if WIN else []), 18), 'masks',
     f"AI-generated picture {S1['name']}, view {V}'s empty room, with version 2's masks tinted over it" + (" and the window's painted opening outlined" if WIN else ''), f"AI-generated picture {S1['name']}, with step 2’s mask over it (tinted, its edge gold){'; the selective 12 px growth tinted cyan, its new edge cyan' if GRW else ''}{'; step 3’s orange' if place3.any() else ''}{'; the window’s painted opening, the moving sky’s outline, green' if WIN else ''}.", 'step1')
# the features and their zones, round each masked area that has some
c = pic.copy(); c[edge(place)] = [255, 210, 60]
if place3.any(): c[edge(place3)] = [255, 120, 40]
im = Image.fromarray(c.astype(np.uint8)); d = ImageDraw.Draw(im)
for f in FEAT['features']:
    for poly in f['polygons']: d.polygon([tuple(p) for p in poly], outline=(0, 255, 255))
    for z in f['exceptions']: d.polygon([tuple(p) for p in z['zone']], outline=(255, 0, 255))
boxes = []
for s in KIT['shapes'] + KIT.get('shapes3', []):
    b = s['bbox']; bx = (max(0, b[0] - 50), max(0, b[1] - 50), min(1024, b[2] + 51), min(1536, b[3] + 51))
    near = [f for f in FEAT['features'] for poly in f['polygons'] if not (max(p[0] for p in poly) < bx[0] or min(p[0] for p in poly) > bx[2] or max(p[1] for p in poly) < bx[1] or min(p[1] for p in poly) > bx[3])]
    if near: boxes.append(bx)
merged = []   # crops that overlap become one
for bx in sorted(boxes):
    for k, m in enumerate(merged):
        if not (bx[0] > m[2] or bx[2] < m[0] or bx[1] > m[3] or bx[3] < m[1]): merged[k] = (min(m[0], bx[0]), min(m[1], bx[1]), max(m[2], bx[2]), max(m[3], bx[3])); break
    else: merged.append(bx)
for k, bx in enumerate(merged, 1):
    q = im.crop(bx); w, h = q.size; s2 = 2 if w <= 420 and h <= 800 else 1; q = q.resize((w * s2, h * s2), Image.NEAREST)
    save(label(q, [AI, f"x {bx[0]}-{bx[2]}, y {bx[1]}-{bx[3]} at {s2}x", 'features cyan; exception zones magenta', 'masks gold' + (' and orange' if place3.any() else '')], 14), f'features-{k}',
         f"AI-generated picture {S1['name']}, x {bx[0]} to {bx[2]}, with the traced features in cyan and the exception zones in magenta",
         f"AI-generated picture {S1['name']}, x {bx[0]}–{bx[2]}, y {bx[1]}–{bx[3]} at {s2}×: features cyan, exception zones magenta, the mask{'s' if place3.any() else ''} gold{' and orange' if place3.any() else ''}.", 'rule15')
# the view's zooms
zf = os.path.join(D, f'zooms-{V}.json')
if os.path.exists(zf):
    Z = json.load(open(zf)); old = binary(os.path.join(D, '_readback-11', 'img', f'ra-{V}-place.png'))
    M2 = J(f'measure-{V}2.json') if os.path.exists(os.path.join(D, f'measure-{V}2.json')) else {}
    furn = binary(os.path.join(D, f'ra-{V}-furniture.png'))
    for z in Z:
        b = pic.copy(); b[edge(old)] = [255, 200, 0]; b[edge(place)] = [255, 0, 0]; b[edge(furn)] = [0, 255, 255]
        if place3.any(): b[edge(place3)] = [255, 120, 40]
        bx, S = tuple(z['box']), z['scale']; q = Image.fromarray(b.astype(np.uint8)).crop(bx); w, h = q.size; q = q.resize((w * S, h * S), Image.NEAREST); dd = ImageDraw.Draw(q)
        for key, col in zip(z.get('lines', []), ((255, 0, 255), (0, 255, 0))):   # the measured lines the zoom names: the first magenta, the second green
            if key in M2: ln = M2[key]; dd.line([((x - bx[0]) * S, (ln['intercept'] + ln['slope'] * x - bx[1]) * S) for x in (bx[0], bx[2])], fill=col, width=2)
        for poly in z.get('polygons', []): dd.polygon([((p[0] - bx[0]) * S, (p[1] - bx[1]) * S) for p in poly['points']], outline=tuple(poly['colour']))
        key = z['key'].split(' | ')   # a key in short lines, for a narrow zoom
        save(label(q, [AI, f"{z['what']}, x {bx[0]}-{bx[2]}, y {bx[1]}-{bx[3]} at {S}x", *key], 15), z['name'], f"AI-generated picture {S1['name']}, {z['what']}, zoomed", f"AI-generated picture {S1['name']}, {z['what']} at {S}×: {'; '.join(key)}.", z['section'])
json.dump(review, open(os.path.join(D, f'review-{V}.json'), 'w'), indent=1)
print(f'{V}: {len(review)} review pictures:', ', '.join(r['file'] for r in review))
