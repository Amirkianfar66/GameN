# Sheet RA-D version 2.1's review pictures, for the page only: RA-D-3x (compositeD3x.py: RA-D-1 with RA-D-3's desk and cabinet,
# completed in code) and step 2b's mask on it (kitD2b.py). Each carries a visible label saying it is AI-generated: RA-D-1, RA-D-3,
# RA-D-3b and RA-D-3x are AI-generated pictures (RA-D-3x a code composite of them); the masks, outlines and guide are code-drawn.
# - ra-D-3x-step2b.png: RA-D-3x whole, with step 2b's two areas (the toolbox's magenta; the hatch's cyan and the lid's gold, the
#   split between them inside the one area) and the pieces' planned outlines dashed.
# - ra-D-3x-step2b-zoom.png: the hatch's corner of the room at twice: RA-D-3x with the areas, and the input the image tool receives
#   (rd1_tools.py s2b: the step-2 guide inside step 2b's mask).
# - ra-D-3x-runs.png: the two step-2 runs' raw edits, RA-D-3's and RA-D-3b's, at the desk and at the cabinet, with step 2's mask
#   (white): which run, and why (where each runs past the mask).
# - ra-D-3x-cabinet.png, ra-D-3x-desk.png: the completions at twice: RA-D-3 (the keep), RA-D-3x, and RA-D-3x with the traced outline
#   (cyan; orange dashes where it closes inside the mask).
# - ra-D-3x-screens.png: the two screens at three times: the fitted outlines (green) and the step-2 map's screens (magenta).
# - ra-D-3x-changed.png: the check: RA-D-3x dimmed, every pixel that differs from RA-D-1 lit (the desk's area cyan, the cabinet's
#   green, the completions past the mask orange), the trim in front of the desk dashed yellow.
# Never an input, never an asset, never committed. Reads RA-D-1, RA-D-3 and the two runs' raws from the records (by their sha256) and
# ra-D-3x.png (by composite-D3x.json's pixel hash). Writes review-D3x.json (each picture's size). Usage: python3 -I reviewD3x.py <records>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
J = lambda f: json.load(open(os.path.join(D, f)))
C, K2, SCR, S2 = J('composite-D3x.json'), J('kit-D2b.json'), J('screens-D.json'), J('step2-D.json')
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
WANT = {'RA-D-1': next(s['sha256'] for s in C['sources'] if s['name'] == 'RA-D-1'), 'RA-D-3': next(s['sha256'] for s in C['sources'] if s['name'] == 'RA-D-3'),
        'RA-D-3-raw': next(s['sha256'] for s in C['sources'] if s['name'] == 'RA-D-3-raw'), 'RA-D-3b-raw': S2['runs'][1]['raw']['sha256']}
for k, h in WANT.items():
    if fsha(os.path.join(REC, 'img', f'{k}.png')) != h: sys.exit(f'STOP: img/{k}.png is not {k}')
rgb = lambda f: Image.open(f).convert('RGB')
(d1, d3, r3, r3b), x = (rgb(os.path.join(REC, 'img', f'{k}.png')) for k in ('RA-D-1', 'RA-D-3', 'RA-D-3-raw', 'RA-D-3b-raw')), rgb(os.path.join(D, 'ra-D-3x.png'))
if pix(np.array(x)) != C['outputs']['ra-D-3x.png']['pixelsSha256']: sys.exit('STOP: ra-D-3x.png is not the plate composite-D3x.json records')
L = lambda f: np.array(Image.open(os.path.join(D, f)).convert('L'))
place, place2b, split2b, lab = L('ra-D-place.png') > 127, L('ra-D-place2b.png') > 127, L('ra-D-split2b.png'), L('ra-D-stations.png').astype(int)
g2 = np.array(rgb(os.path.join(D, 'ra-D-guide-s2.png'))); H, W = place.shape
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
AI = 'AI-generated pictures: RA-D-3 and RA-D-3x (a code composite of RA-D-1 and RA-D-3’s raw edit)'
AIR = 'AI-generated pictures: the raw edits of RA-D-3 and RA-D-3b, view D’s two step-2 runs'
AIX = 'AI-generated picture: RA-D-3x, a code composite of AI-generated pictures (RA-D-1 and RA-D-3’s raw edit)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = list(im.size)
GREY = {80: (255, 0, 255), 60: (0, 255, 255), 20: (255, 215, 0)}
def areas_on(a):
    for g, c in GREY.items(): paint_edge(a, split2b == g, c)
    for g, c in ((80, (255, 170, 255)), (60, (170, 255, 255)), (20, (255, 240, 170))): paint_edge(a, np.abs(lab - g) <= 2, c, dash=True)
    return a
# 1. step 2b's areas on RA-D-3x, whole
a = areas_on(np.array(x).copy())
save(labelled(Image.fromarray(a), AIX, 'Step 2b’s mask on RA-D-3x: the toolbox’s own area (magenta); the hatch’s and its lid’s one area (cyan and gold, the split between them inside it); dashed, the pieces’ planned outlines. The desk and the cabinet are not masked.'), 'ra-D-3x-step2b.png')
# 2. the hatch's corner at twice: the areas, and the input the image tool receives
bx = (380, 880, 760, 1260); Z = 2
inp = np.array(x).copy(); inp[place2b] = g2[place2b]
p1 = tag(Image.fromarray(a).crop(bx).resize(((bx[2] - bx[0]) * Z, (bx[3] - bx[1]) * Z), Image.NEAREST), 'RA-D-3x, step 2b’s areas')
p2 = tag(Image.fromarray(inp).crop(bx).resize(((bx[2] - bx[0]) * Z, (bx[3] - bx[1]) * Z), Image.NEAREST), 'the input: the guide inside the mask')
save(labelled(row([p1, p2]), AIX, f'At 2×: step 2b’s two areas on RA-D-3x, {K2["gapPx"]["grown"]} px of its painted deck between them; and the input the image tool receives (rd1_tools.py s2b), the step-2 guide inside the mask.'), 'ra-D-3x-step2b-zoom.png')
# 3. the two runs at the desk and at the cabinet, with step 2's mask
def with_mask(im):
    a = np.array(im).copy(); paint_edge(a, place, (255, 255, 255)); return Image.fromarray(a)
DESK, CAB = (0, 820, 380, 1420), (740, 600, 1024, 1000)
runs = col([row([tag(with_mask(r3).crop(DESK), 'RA-D-3’s raw: the desk'), tag(with_mask(r3b).crop(DESK), 'RA-D-3b’s raw: the desk')]),
            row([tag(with_mask(r3).crop(CAB), 'RA-D-3’s raw: the cabinet'), tag(with_mask(r3b).crop(CAB), 'RA-D-3b’s raw: the cabinet')])])
save(labelled(runs, AIR, 'The two runs’ raw edits, with step 2’s mask (white). RA-D-3 is taken for both: its cabinet’s frame ends 22 to 30 px below the mask, RA-D-3b’s 46 to 56 px (a taller cabinet, two boxes below it); its desk runs past the mask at the right bezel and the desk’s right corner, RA-D-3b’s also at the left monitor’s top and the desk’s right end. Both put the toolbox in front of the desk.'), 'ra-D-3x-runs.png')
# 4. the completions at twice: before (RA-D-3), after (RA-D-3x), and the outline
PCS = {p['key']: p for p in C['pieces']}
def triple(box, keys, Z, f, line2):
    x0, y0, x1, y1 = box; w, h = (x1 - x0) * Z, (y1 - y0) * Z
    ims = [d3.crop(box).resize((w, h), Image.NEAREST), x.crop(box).resize((w, h), Image.NEAREST), x.crop(box).resize((w, h), Image.NEAREST)]
    dd = ImageDraw.Draw(ims[2]); T = lambda pts: [((px - x0) * Z, (py - y0) * Z) for px, py in pts]
    for k in keys:
        p = PCS[k]; o = [tuple(q) for q in p['outline']]; cl = [tuple(q) for q in p['closing']]
        ring = o + [o[0]]; dd.line(T(ring), fill=(0, 255, 255), width=2)
        if cl: dashed(dd, T(cl), (255, 150, 40), width=2)
    save(labelled(row([tag(ims[0], 'RA-D-3 (the keep)'), tag(ims[1], 'RA-D-3x'), tag(ims[2], 'RA-D-3x, the outline')]), AI, line2), f)
triple((750, 618, 1014, 940), ['cabinet'], 2, 'ra-D-3x-cabinet.png', 'At 2×: the cabinet’s frame, completed all round from RA-D-3’s raw inside its traced outer ink (cyan); it closes on its own ink.')
triple((190, 840, 345, 1190), ['monitor', 'desk-end'], 2, 'ra-D-3x-desk.png', 'At 2×: the right monitor’s right bezel and the desk top’s right end with its leg, completed from RA-D-3’s raw inside their traced outlines (cyan), closing inside the mask (orange dashes).')
# 5. the screens at three times
sb = (0, 852, 240, 992); Z3 = 3
smap = np.array(Image.open(os.path.join(D, 'ra-D-regions.png')).convert('RGB')).astype(int)
emap = np.array(Image.open(os.path.join(D, 'ra-D-empty-regions.png')).convert('RGB')).astype(int)
mag = lambda m: np.abs(m - np.array((255, 0, 255))).max(axis=2) <= 8
s_a = np.array(x).copy(); paint_edge(s_a, mag(smap) & ~mag(emap), (255, 0, 255))
sc = Image.fromarray(s_a).crop(sb).resize(((sb[2] - sb[0]) * Z3, (sb[3] - sb[1]) * Z3), Image.NEAREST); dd = ImageDraw.Draw(sc)
for s in SCR['screens']:
    c = [((px - sb[0]) * Z3, (py - sb[1]) * Z3) for px, py in s['corners']]; dd.line(c + [c[0]], fill=(60, 255, 90), width=2)
pl = x.crop(sb).resize(((sb[2] - sb[0]) * Z3, (sb[3] - sb[1]) * Z3), Image.NEAREST)
sp = ', '.join(f"{s['name']} {s['px']:,} px, p95 lightness {s['p95L']}" for s in SCR['screens'])
save(labelled(col([tag(pl, 'RA-D-3x'), tag(sc, 'fitted (green) and the step-2 map’s (magenta)')]), AIX, f'At 3×: the two screens, painted flat black, fitted to the black (green): {sp}. The step-2 map’s screens (magenta) are not where they are painted.'), 'ra-D-3x-screens.png')
# 6. the check: every pixel that differs from RA-D-1, lit
dif = np.abs(np.array(x).astype(int) - np.array(d1).astype(int)).max(axis=2) > 0
yy, xx = np.mgrid[0:H, 0:W]; deskA = place & (xx < 380); cabA = place & (xx > 740) & (yy < 1000)
ch = (np.array(x).astype(float) * 0.35).astype(np.uint8)
ch[dif & deskA] = (0, 230, 255); ch[dif & cabA] = (60, 255, 90); ch[dif & ~place] = (255, 150, 40)
im = Image.fromarray(ch); dd = ImageDraw.Draw(im); tp = [tuple(q) for q in C['trim']['polygon']]; dashed(dd, tp + [tp[0]], (255, 230, 0), width=2)
n_out = int((dif & ~deskA & ~cabA & ~place).sum())
save(labelled(im, AIX, f'The check: RA-D-3x dimmed, every pixel that differs from RA-D-1 lit ({int(dif.sum()):,}): in the desk’s area cyan, the cabinet’s green, the completions past the mask orange ({n_out:,}); the trim in front of the desk, kept as RA-D-1, dashed yellow. The hatch’s area is RA-D-1’s, unchanged.'), 'ra-D-3x-changed.png')
json.dump(out, open(os.path.join(D, 'review-D3x.json'), 'w'), indent=1)
print(json.dumps(out))
