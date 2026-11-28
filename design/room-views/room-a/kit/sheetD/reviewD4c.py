# Sheet RA-D's review pictures for RA-D-4c (compositeD4c.py: RA-D-4 with the capsule's housing completed from step 3's raw and the
# toolbox's cast shadow from RA-D-3h's raw), for the page only, each labelled as AI-generated: RA-D-4, step 3's raw, RA-D-3h's raw and
# RA-D-4c are AI-generated pictures (RA-D-4c a code composite of them); the outlines and masks drawn over them are code-drawn.
# - ra-D-4c-capsule.png: the capsule at three times: step 3's raw, RA-D-4 and RA-D-4c above; the raw and RA-D-4c with the capsule's
#   outline (yellow) and step 3's shape (dashed red) below.
# - ra-D-4c-toolbox.png: the toolbox at three times: RA-D-4 (before) and RA-D-4c (after) above; RA-D-3h's raw and RA-D-4c with the
#   shadow's outline (yellow) below.
# - ra-D-4c-changed.png: every pixel that differs from RA-D-4, lit by part, round the capsule and round the toolbox, at twice.
# - ra-D-4c-402.png: the 402 x 742 view (the stage's slice of the painting, at twice): RA-D-4 and RA-D-4c.
# - ra-D-4c-whole.png: RA-D-4c whole, at half size.
# Never an input, never an asset, never committed. Usage: python3 -I reviewD4c.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
C = json.load(open(os.path.join(D, 'composite-D4c.json'))); MAN = json.load(open(os.path.join(D, 'room-a-ra-d.json')))
pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest(); fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rgb = lambda f: Image.open(f).convert('RGB')
after = rgb(os.path.join(D, 'ra-D-4c.png'))
if pix(np.array(after)) != C['outputs']['ra-D-4c.png']['pixelsSha256'] or not C['pass']: sys.exit('STOP: the plate is not the one its record names, or it did not pass')
SRC = {s['name']: s for s in C['sources']}
for n_, f_ in (('RA-D-4', 'img/RA-D-4.png'), ('RA-D-4-raw', 'img/RA-D-4-raw.png'), ('RA-D-3h-raw', 'img/RA-D-3h-raw.png')):
    if fsha(os.path.join(REC, f_)) != SRC[n_]['sha256']: sys.exit(f'STOP: {f_} is not {n_}')
before, raw4, raw = rgb(os.path.join(REC, 'img', 'RA-D-4.png')), rgb(os.path.join(REC, 'img', 'RA-D-4-raw.png')), rgb(os.path.join(REC, 'img', 'RA-D-3h-raw.png'))
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
AI = 'AI-generated pictures: RA-D-4, its raw edit, RA-D-3h’s raw edit and RA-D-4c (a code composite of them)'
AIX = 'AI-generated picture: RA-D-4c, a code composite of AI-generated pictures (RA-D-4, its raw edit and RA-D-3h’s raw edit)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = list(im.size)
CAPP = [q for r in C['capsule']['outline']['runs'] for q in r['points']]; SHP = [q for r in C['shadow']['outline']['runs'] for q in r['points']]
p3 = np.array(Image.open(os.path.join(D, 'ra-D-place3.png')).convert('L')) > 127
def zoom(im, box, z, poly=None, shape=False):
    x0, y0, x1, y1 = box; c = im.crop(box).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    if shape:
        a = np.array(c); m = np.kron(p3[y0:y1, x0:x1], np.ones((z, z), bool)); paint_edge(a, m, (255, 60, 60), dash=True); c = Image.fromarray(a)
    if poly: dd = ImageDraw.Draw(c); pts = [((q[0] - x0) * z, (q[1] - y0) * z) for q in poly]; dd.line(pts + [pts[0]], fill=(255, 230, 0), width=2)
    return c
CK = C['checks']; CA = C['capsule']; PS, PP = CA['pastTheShapePx'], CA['pastThePlanPx']; BR = CA['bracket']; WS = CA['wallSeam']
cb, z = (612, 700, 726, 860), 3
grid = col([row([tag(zoom(raw4, cb, z), 'Step 3’s raw'), tag(zoom(before, cb, z), 'RA-D-4 (kept)'), tag(zoom(after, cb, z), 'RA-D-4c')]),
            row([tag(zoom(raw4, cb, z, CAPP, True), 'The raw: outline, and step 3’s shape'), tag(zoom(after, cb, z, CAPP, True), 'RA-D-4c: outline, and the shape')])])
save(labelled(grid, AI, f"The food capsule at three times. RA-D-4 cut the housing at step 3’s shape: its bottom edge and the handle’s lower half, and the right side face’s outer ink. RA-D-4c takes the housing whole from the raw, {CK['changedPxByPart']['capsule']:,} px, inside one outline (yellow) that closes on its own ink, with 1 px of feather: the housing runs {PS['top']} px above the shape (its top face), {PS['right']} px past its right edge, {PS['left']} px past its left and {PS['bottom']} px below it. The bracket plate the raw paints below is left out (none of its {BR['px']:,} px taken; {BR['inTheFeather']} in the feather), so RA-D-4’s wall stays below the housing and its seam passes behind it (y {WS['left']['yAtTheHousing']} at the left edge, {WS['right']['yAtTheHousing']} at the right)."), 'ra-D-4c-capsule.png')
tb = (340, 1072, 540, 1252); S = C['shadow']['seam']
grid = col([row([tag(zoom(before, tb, z), 'RA-D-4: before'), tag(zoom(after, tb, z), 'RA-D-4c: after')]),
            row([tag(zoom(raw, tb, z), 'RA-D-3h’s raw: its shadow'), tag(zoom(after, tb, z, SHP), 'RA-D-4c, the shadow’s outline')])])
save(labelled(grid, AI, f"The toolbox at three times, before and after: the raw’s cast shadow at its front-left, {CK['changedPxByPart']['shadow']:,} px, taken inside the outline with 1 px of feather; the box and everything else unchanged. The deck seam crossing the band is the raw’s inside the outline and the plate’s outside; where they cross it, {S['crossingsApartPx']['dark']} px apart (its dark line) and {S['crossingsApartPx']['light']} px (its light line)."), 'ra-D-4c-toolbox.png')
# the check: every pixel that differs from RA-D-4, lit by part (the capsule cyan, the shadow magenta), the outlines yellow, at twice
A4, AC = np.array(before).astype(int), np.array(after).astype(int); ch = (A4 != AC).any(axis=2)
def chk(box, poly, colr, shape=False):
    x0, y0, x1, y1 = box; base = (np.array(after)[y0:y1, x0:x1].astype(float) * 0.35).astype(np.uint8); m = ch[y0:y1, x0:x1]
    base[m] = colr; im = Image.fromarray(base).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.NEAREST)
    if shape: a = np.array(im); paint_edge(a, np.kron(p3[y0:y1, x0:x1], np.ones((2, 2), bool)), (255, 60, 60), dash=True); im = Image.fromarray(a)
    dd = ImageDraw.Draw(im); pts = [((q[0] - x0) * 2, (q[1] - y0) * 2) for q in poly]; dd.line(pts + [pts[0]], fill=(255, 230, 0), width=1); return im
save(labelled(row([tag(chk((600, 696, 740, 876), CAPP, (0, 230, 255), True), f"The capsule: {CK['changedPxByPart']['capsule']:,} px"), tag(chk((330, 1150, 520, 1260), SHP, (255, 60, 220)), f"The shadow: {CK['changedPxByPart']['shadow']:,} px")]), AIX,
           f"The check, at twice: RA-D-4c dimmed; lit, every pixel that differs from RA-D-4 ({CK['changedPxAgainstRA-D-4']:,}): the capsule cyan, the shadow magenta; the outlines yellow, step 3’s shape dashed red. Every other pixel, {CK['unchangedPxAgainstRA-D-4']:,} of {CK['picturePx']:,}, is RA-D-4’s, and none outside the outlines and their 1 px feather changed."), 'ra-D-4c-changed.png')
sl = MAN['camera']['phones']['slices']['402x742']; x0, y0, x1, y1 = sl['paintingRect']; sw, sh = sl['stage']
ph = lambda im: im.crop((round(x0), round(y0), round(x1), round(y1))).resize((sw * 2, sh * 2), Image.LANCZOS)
save(labelled(row([tag(ph(before), 'RA-D-4 at 402 × 742'), tag(ph(after), 'RA-D-4c at 402 × 742')]), AI, f"The 402 × 742 view: the stage’s slice of the painting ({sw} × {sh}, at twice), before and after. No people or controls drawn."), 'ra-D-4c-402.png')
save(labelled(after.resize((after.width // 2, after.height // 2), Image.LANCZOS), AIX, 'RA-D-4c whole, at half size: view D’s final plate, the food capsule completed and the toolbox’s cast shadow added in code.'), 'ra-D-4c-whole.png')
json.dump(out, open(os.path.join(D, 'review-D4c.json'), 'w'), indent=1); print(json.dumps(out))
