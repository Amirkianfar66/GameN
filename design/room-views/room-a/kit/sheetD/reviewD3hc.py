# Sheet RA-D version 2.3's review pictures, for the page only: RA-D-3hc (compositeD3hc.py: RA-D-3h with the hatch, its lid and the
# toolbox completed in code from RA-D-3h's raw). Each carries a visible label saying it is AI-generated: RA-D-3h, its raw edit and
# RA-D-3hc are AI-generated pictures (RA-D-3hc a code composite of them); the outlines and masks drawn over them are code-drawn.
# - ra-D-3hc-lid.png: the lid's edges at three times: RA-D-3h (the keep, cut along step 2b's mask), RA-D-3hc, and RA-D-3hc with the
#   traced outline (cyan) and step 2b's mask (magenta).
# - ra-D-3hc-gap.png: the hatch's near-left rim through the 8 px gap between step 2b's two areas, at three times, the same three.
# - ra-D-3hc-toolbox.png: the toolbox at three times: RA-D-3h and RA-D-3hc above; RA-D-3h's raw (its shadow on the deck, left out)
#   and RA-D-3hc with the outline and the mask below.
# - ra-D-3hc.png: RA-D-3hc whole. ra-D-3hc-402.png: the 402 x 742 view (the stage's slice of the painting, at twice): RA-D-3h and
#   RA-D-3hc. ra-D-3hc-changed.png: the check: RA-D-3hc dimmed, every pixel that differs from RA-D-3h lit by part (the lid gold, the
#   hatch cyan, the gap white, the toolbox magenta), step 2b's mask dashed.
# Never an input, never an asset, never committed. Reads RA-D-3h and its raw from the records (by their sha256) and ra-D-3hc.png (by
# composite-D3hc.json's pixel hash). Writes review-D3hc.json (each picture's size). Usage: python3 -I reviewD3hc.py <records>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
J = lambda f: json.load(open(os.path.join(D, f)))
C, MAN = J('composite-D3hc.json'), J('room-a-ra-d.json')
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
for s in C['sources'][1:]:
    if fsha(os.path.join(REC, s['file'])) != s['sha256']: sys.exit(f"STOP: {s['file']} is not {s['name']}")
rgb = lambda f: Image.open(f).convert('RGB')
kept, raw, hc = rgb(os.path.join(REC, 'img', 'RA-D-3h.png')), rgb(os.path.join(REC, 'img', 'RA-D-3h-raw.png')), rgb(os.path.join(D, 'ra-D-3hc.png'))
if pix(np.array(hc)) != C['outputs']['ra-D-3hc.png']['pixelsSha256']: sys.exit('STOP: ra-D-3hc.png is not the plate composite-D3hc.json records')
m = np.array(Image.open(os.path.join(D, 'ra-D-place2b.png')).convert('L')) > 127; H, W = m.shape
POLY = [q for r in C['outline']['runs'] for q in r['points']]
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line1, line2):   # the AI-generated label, burned in at the top, its size fitted to the width; the caption wraps
    w = im.width; px = max(13, round(w / 34)); tl = lambda s, f: ImageDraw.Draw(im).textlength(s, font=f)
    while px > 12 and max(tl(line1, font(px)), tl(line2, font(round(px * 0.8)))) > w - 2 * round(px * 0.6): px -= 1
    f1, f2 = font(px), font(round(px * 0.8)); room = w - 2 * round(px * 0.6)
    def wrap(text, f):
        rows = ['']
        for word in text.split(' '):
            if tl((rows[-1] + ' ' + word).strip(), f) <= room or not rows[-1]: rows[-1] = (rows[-1] + ' ' + word).strip()
            else: rows.append(word)
        return rows
    r1, r2 = wrap(line1, f1), wrap(line2, f2); s1, s2 = round(px * 1.25), round(px * 1.05)
    h = round(px * 0.35) + len(r1) * s1 + round(px * 0.1) + len(r2) * s2 + round(px * 0.3)
    out = Image.new('RGB', (w, im.height + h), (10, 12, 18)); out.paste(im, (0, h)); dd = ImageDraw.Draw(out); y = round(px * 0.35)
    for row in r1: dd.text((round(px * 0.6), y), row, font=f1, fill=(255, 224, 160)); y += s1
    y += round(px * 0.1)
    for row in r2: dd.text((round(px * 0.6), y), row, font=f2, fill=(235, 235, 235)); y += s2
    return out
def tag(im, text):   # a small caption in a panel's top-left corner
    im = im.copy(); dd = ImageDraw.Draw(im, 'RGBA'); f = font(15); x0, y0, x1, y1 = dd.textbbox((0, 0), text, font=f)
    dd.rectangle([4, 4, 4 + (x1 - x0) + 12, 4 + (y1 - y0) + 10], fill=(10, 12, 18, 215)); dd.text((10, 8 - y0), text, font=f, fill=(255, 255, 255)); return im
def dashed(dd, pts, fill, width=1, on=6, off=4):
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = np.hypot(x1 - x0, y1 - y0); s = 0.0
        while s < n:
            e = min(n, s + on); dd.line([(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n), (x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n)], fill=fill, width=width); s = e + off
def edge(m): return m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
def paint_edge(a, m, col, dash=False):
    e = edge(m); ys, xs = np.where(e)
    if dash: k = ((xs + ys) // 3) % 2 == 0; ys, xs = ys[k], xs[k]
    a[ys, xs] = col
def row(ims, gap=8, bg=(10, 12, 18)):
    w = sum(i.width for i in ims) + gap * (len(ims) - 1); h = max(i.height for i in ims); out = Image.new('RGB', (w, h), bg); xo = 0
    for i in ims: out.paste(i, (xo, 0)); xo += i.width + gap
    return out
def col(ims, gap=8, bg=(10, 12, 18)):
    w = max(i.width for i in ims); h = sum(i.height for i in ims) + gap * (len(ims) - 1); out = Image.new('RGB', (w, h), bg); yo = 0
    for i in ims: out.paste(i, (0, yo)); yo += i.height + gap
    return out
AIH = 'AI-generated pictures: RA-D-3h and RA-D-3hc (a code composite of RA-D-3x and RA-D-3h’s raw edit)'
AIHR = 'AI-generated pictures: RA-D-3h, its raw edit, and RA-D-3hc (a code composite of them)'
AIX = 'AI-generated picture: RA-D-3hc, a code composite of AI-generated pictures (RA-D-3x and RA-D-3h’s raw edit)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = list(im.size)
def zoom(im, box, z, outline=False):
    x0, y0, x1, y1 = box; c = im.crop(box).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    if outline:
        dd = ImageDraw.Draw(c); sub = m[y0:y1, x0:x1]
        for yy in range(sub.shape[0]):
            for xx in range(sub.shape[1]):
                if xx > 0 and sub[yy, xx] != sub[yy, xx - 1]: dd.line([(xx * z, yy * z), (xx * z, (yy + 1) * z)], fill=(255, 0, 255), width=1)
                if yy > 0 and sub[yy, xx] != sub[yy - 1, xx]: dd.line([(xx * z, yy * z), ((xx + 1) * z, yy * z)], fill=(255, 0, 255), width=1)
        pts = [((q[0] - x0) * z, (q[1] - y0) * z) for q in POLY]; dd.line(pts + [pts[0]], fill=(0, 255, 255), width=2)
    return c
def three(box, z, what):
    return row([tag(zoom(kept, box, z), 'RA-D-3h (kept)'), tag(zoom(hc, box, z), 'RA-D-3hc'), tag(zoom(hc, box, z, True), 'RA-D-3hc, the outline (cyan), the mask (magenta)')])
P = {r['name']: r for r in C['outline']['runs']}; R = lambda n: P[n]['reachesPastTheMaskPx']
save(labelled(three((575, 885, 720, 1072), 3, 'lid'), AIH, f"The lid’s edges at three times. RA-D-3h cut the lid along step 2b’s mask; RA-D-3hc takes the raw’s lid whole: its top lies up to {R('the lid’s top'.replace('’', chr(39)))} px past the mask, its right side and corner up to {R('the lid' + chr(39) + 's right side')} px, its left side up to {R('the lid' + chr(39) + 's left side')} px. Outside the outline, RA-D-3h unchanged."), 'ra-D-3hc-lid.png')
pg = C['parts']['gap']
save(labelled(three((468, 1028, 604, 1214), 3, 'gap'), AIH, f"The hatch’s near-left rim through the gap, at three times. RA-D-3h shows RA-D-3x’s deck in the 8 px gap between step 2b’s two areas, across the hatch; RA-D-3hc takes the raw there ({pg['changedPx']} px), so the rim and the near rim run on to the toolbox, and both rims’ outer edges whole (up to {R('the hatch' + chr(39) + 's left rim' + chr(39) + 's outer edge')} and {R('the right rim' + chr(39) + 's outer edge')} px past the mask)."), 'ra-D-3hc-gap.png')
tb = (372, 1072, 548, 1236); z = 3
grid = col([row([tag(zoom(kept, tb, z), 'RA-D-3h (kept)'), tag(zoom(hc, tb, z), 'RA-D-3hc')]), row([tag(zoom(raw, tb, z), 'RA-D-3h’s raw: its shadow on the deck'), tag(zoom(hc, tb, z, True), 'RA-D-3hc, the outline, the mask')])])
T = J('painted-D.json')['toolbox']
save(labelled(grid, AIHR, f"The toolbox at three times, whole at the raw’s place: its left side up to {R('the toolbox' + chr(39) + 's left side')} px left of its area, its bottom-left corner {R('the toolbox' + chr(39) + 's bottom-left corner')} px past it, closing on its own ink. On the deck it stands {abs(T['deck']['shift'][0]) * 100:.1f} cm west of the plan’s place, turned {T['deck']['turnDeg']}°. Left out: the raw’s shadow on the deck at its front-left (below left), outside its ink; RA-D-3h’s lit deck stays there."), 'ra-D-3hc-toolbox.png')
save(labelled(hc.copy(), AIX, 'RA-D-3hc whole: view D’s step-2 plate, the hatch with its lid upright and the toolbox completed from RA-D-3h’s raw.'), 'ra-D-3hc-whole.png')
sl = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = sl['paintingRect']; sw, sh = sl['stage']
ph = lambda im: tag(im.crop((round(x0), round(y0), round(x1), round(y1))).resize((sw * 2, sh * 2), Image.LANCZOS), '')
p1, p2 = ph(kept), ph(hc)
save(labelled(row([tag(p1, 'RA-D-3h at 402 × 742'), tag(p2, 'RA-D-3hc at 402 × 742')]), AIH, f"The 402 × 742 view: the stage’s slice of the painting ({sw} × {sh}, at twice), RA-D-3h and RA-D-3hc. No people or controls drawn."), 'ra-D-3hc-402.png')
a = (np.array(hc).astype(float) * 0.35).astype(np.uint8); ch = (np.array(hc) != np.array(kept)).any(axis=2)
cols = {'lid': (255, 215, 0), 'hatch': (0, 255, 255), 'gap': (255, 255, 255), 'toolbox': (255, 0, 255)}
import importlib.util
ys, xs = np.nonzero(ch)
for part, b in C['parts'].items():
    pass
# colour each changed pixel by the part composite-D3hc.json counted it in (nearest run; the gap between the two areas)
grow = lambda q: q | np.roll(q, 1, 0) | np.roll(q, -1, 0) | np.roll(q, 1, 1) | np.roll(q, -1, 1)
def flood(seed, within):
    q = np.zeros_like(within); q[seed[1], seed[0]] = True
    while True:
        r = grow(q) & within
        if (r == q).all(): return q
        q = r
Tm, HL = flood((480, 1150), m), flood((620, 1100), m); g8 = lambda q: [q := grow(q) for _ in range(8)][-1]
gap = ~m & g8(Tm) & g8(HL)
names = list(P.keys()); PARTS = {'lid': [0, 1, 2, 3, 16], 'hatch': [4, 5, 6, 7, 15], 'toolbox': [8, 9, 10, 11, 12, 13, 14]}
best = np.full(len(xs), np.inf); run = np.zeros(len(xs), int)
for i, n in enumerate(names):
    Q = np.array(P[n]['points'], float); Q = np.vstack([Q, Q]) if len(Q) == 1 else Q; A_, B_ = Q[:-1], Q[1:]
    px, py = (xs + 0.5)[:, None], (ys + 0.5)[:, None]; dx, dy = B_[:, 0] - A_[:, 0], B_[:, 1] - A_[:, 1]
    t = np.clip(((px - A_[:, 0]) * dx + (py - A_[:, 1]) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    dd = np.hypot(px - (A_[:, 0] + t * dx), py - (A_[:, 1] + t * dy)).min(axis=1); w = dd < best; best[w] = dd[w]; run[w] = i
part = np.array([next(p for p, ids in PARTS.items() if r in ids) for r in run]); part = np.where(gap[ys, xs], 'gap', part)
for p, c in cols.items(): k = part == p; a[ys[k], xs[k]] = c
counts = {p: int((part == p).sum()) for p in cols}
if counts != {p: C['parts'][p]['changedPx'] for p in cols}: sys.exit(f'STOP: the parts differ from the record: {counts}')
e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)); ey, ex = np.nonzero(e); k = ((ex + ey) // 3) % 2 == 0; a[ey[k], ex[k]] = (255, 120, 120)
box = (360, 876, 732, 1244); ck = Image.fromarray(a).crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.NEAREST)
CK = C['checks']
save(labelled(ck, AIX, f"The check, at twice: RA-D-3hc dimmed; lit, every pixel that differs from RA-D-3h ({CK['changedPxAgainstRA-D-3h']:,}): the lid gold ({counts['lid']:,}), the hatch cyan ({counts['hatch']:,}), the gap white ({counts['gap']:,}), the toolbox magenta ({counts['toolbox']:,}); step 2b’s mask dashed red. Every other pixel, {CK['unchangedPxAgainstRA-D-3h']:,} of {CK['picturePx']:,}, is RA-D-3h’s, and none outside the outline and its 1 px feather changed."), 'ra-D-3hc-changed.png')
json.dump(out, open(os.path.join(D, 'review-D3hc.json'), 'w'), indent=1); print(json.dumps(out))
