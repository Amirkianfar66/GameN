# Sheet RA-C version 3's review pictures, for the page only (the Lead, 19:08 on 27 November: "3x zooms of each completion and of the
# screen (before, after, outline); the screen fit with its gate number; the full picture and the 402 x 742 view; the outside-unchanged
# count against the kept RA-C-2"). They show RA-C-2, the AI-generated kept step 2, and RA-C-2c, its code composite with RA-C-2's raw
# edit and its code-filled screen (compositeC2.py). Each carries a visible label saying it is AI-generated.
# - ra-C-2c-<piece>.png: each completed piece at 3 times: before (RA-C-2), after (RA-C-2c), and after with the traced outline (cyan),
#   its closing path inside the mask dashed.
# - ra-C-2c-screen.png: the monitor at 3 times: before, after, and after with the fitted screen (cyan) and the map's (magenta).
# - ra-C-2c-ventbox.png: RA-C-1's vent box still showing above the monitor's top, at 6 times, before and after (left alone: the Lead's call).
# - ra-C-2c-full.png: RA-C-2c whole. ra-C-2c-402.png: the 402 x 742 phone's 402 x 551 slice, at twice its stage size.
# - ra-C-2c-changed.png: the check: RA-C-2c dimmed, every pixel that differs from RA-C-2 lit (the Lead's four pieces cyan, the handle
#   orange, the screen fill green), with the traced outlines.
# Never an input, never an asset, never committed. Reads RA-C-2 (by its sha256) and ra-C-2c.png (by composite-C2.json's pixel hash).
# Usage: python3 -I reviewC2.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
R, S, MAN = (json.load(open(os.path.join(D, f))) for f in ('composite-C2.json', 'screens-C.json', 'room-a-ra-c.json'))
pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
base = next(s for s in R['sources'] if s['name'] == 'RA-C-2')
if hashlib.sha256(open(os.path.join(REC, base['file']), 'rb').read()).hexdigest() != base['sha256']: sys.exit('STOP: not RA-C-2')
before = Image.open(os.path.join(REC, base['file'])).convert('RGB'); after = Image.open(os.path.join(D, 'ra-C-2c.png')).convert('RGB')
if pix(np.array(after)) != R['outputs']['ra-C-2c.png']['pixelsSha256']: sys.exit('STOP: ra-C-2c.png is not the plate composite-C2.json records')
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line1, line2):   # the AI-generated label, burned in at the top, its size fitted to the width (as view A's version 7);
    w = im.width; px = max(13, round(w / 34)); tl = lambda s, f: ImageDraw.Draw(im).textlength(s, font=f)   # the caption wraps when it must
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
def dashed(dd, pts, fill, width=1, on=6, off=4):   # a dashed polyline (the closing path, inside the mask)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = np.hypot(x1 - x0, y1 - y0); s = 0.0
        while s < n:
            e = min(n, s + on); dd.line([(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n), (x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n)], fill=fill, width=width); s = e + off
AI = 'AI-generated pictures: RA-C-2, and RA-C-2c (a code composite of AI-generated pictures)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = im.size
def triple(box, Z, panes, label2, f, extra=None):
    x0, y0, x1, y1 = box; w, h = (x1 - x0) * Z, (y1 - y0) * Z
    ims = [p.crop(box).resize((w, h), Image.NEAREST) for p in panes[:2]] + [panes[1].crop(box).resize((w, h), Image.NEAREST)]
    if extra: extra(ImageDraw.Draw(ims[2]), x0, y0, Z)
    gap = 8; im = Image.new('RGB', (3 * w + 2 * gap, h), (10, 12, 18))
    for k, (pane, t) in enumerate(zip(ims, panes[2])): im.paste(tag(pane, t), (k * (w + gap), 0))
    save(labelled(im, AI, label2), f)
SHORT = {'crates': "The crates' left end", 'monitor': "The monitor's frame", 'toolbox': "The toolbox's left end and lid edge", 'hatch': 'The hatch rim', 'handle': "The toolbox's handle"}
BOX = {'crates': (320, 826, 444, 1042), 'monitor': (904, 742, 1024, 866), 'toolbox': (880, 1160, 960, 1296), 'hatch': (868, 1314, 1024, 1536), 'handle': (944, 1156, 1024, 1194)}
Z = 3
for p in R['pieces']:
    box = BOX[p['key']]; x0, y0, x1, y1 = box
    def draw(dd, x0, y0, Z, p=p):
        for poly in [p['outline']] + p.get('holes', []): dd.line([((q[0] - x0) * Z, (q[1] - y0) * Z) for q in poly + poly[:1]], fill=(0, 255, 255), width=1)
        dashed(dd, [((q[0] - x0) * Z, (q[1] - y0) * Z) for q in p['closing']], (255, 170, 60), 2)
    extra = '' if p['listed'] else ' (one more)'
    triple(box, Z, (before, after, ('Before: RA-C-2', 'After: RA-C-2c', 'Traced outline')),
           f"{SHORT[p['key']]}{extra}: x {x0}-{x1}, y {y0}-{y1} at 3 times. Cyan: the traced ink outline; orange dashes: where it closes inside the mask", f"ra-C-2c-{p['key']}.png", draw)
# the screen
s = S['screens'][0]
def drawS(dd, x0, y0, Z):
    mb = s['map']['box']; dd.rectangle([(mb[0] - x0) * Z, (mb[1] - y0) * Z, (mb[2] - x0) * Z - 1, (mb[3] - y0) * Z - 1], outline=(255, 70, 255), width=2)
    dd.line([((q[0] - x0) * Z, (q[1] - y0) * Z) for q in s['corners'] + s['corners'][:1]], fill=(0, 255, 255), width=2)
triple((904, 742, 1024, 902), Z, (before, after, ('Before: RA-C-2', 'After: filled black', 'Fitted screen')),
       f"The screen at 3 times: filled black in code, the bezel kept; fitted (cyan), the map's (magenta). Lightness p95: {s['p95L']:.3f} (gate < 0.12)", 'ra-C-2c-screen.png', drawS)
# RA-C-1's vent box above the monitor's top, left alone
box = (936, 742, 1014, 768); x0, y0, x1, y1 = box; Z6 = 6; w, h = (x1 - x0) * Z6, (y1 - y0) * Z6
a, b = before.crop(box).resize((w, h), Image.NEAREST), after.crop(box).resize((w, h), Image.NEAREST)
im = Image.new('RGB', (w, 2 * h + 8), (10, 12, 18)); im.paste(tag(a, 'Before: RA-C-2'), (0, 0)); im.paste(tag(b, 'After: RA-C-2c'), (0, h + 8))
save(labelled(im, AI, f"Left alone: RA-C-1's vent box still shows above the monitor's top (x {x0}-{x1}, y {y0}-{y1}, 6 times)"), 'ra-C-2c-ventbox.png')
# the whole picture, and the 402 x 742 view
save(labelled(after, 'AI-generated picture: RA-C-2c (a code composite of AI-generated pictures)', "View C's step 2, its cut pieces completed in code, its screen filled black"), 'ra-C-2c-full.png')
s4 = MAN['camera']['phones']['slices']['402x742']; px0, py0, px1, py1 = s4['paintingRect']; Wd, SH = s4['stage']
c = after.crop((round(px0), round(py0), round(px1), round(py1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
save(labelled(c, 'AI-generated picture: RA-C-2c (a code composite)', "402x742: the phone's slice, twice its stage size"), 'ra-C-2c-402.png')
# the check: what changed against RA-C-2
A, B = np.array(before), np.array(after); ch = (A != B).any(axis=2)
fb = S["fill"]["box"]
dim = (B * 0.32).astype(np.uint8); im = dim.copy(); im[ch] = (255, 40, 40)   # red would show a change outside every piece: there is none
listed = {p['key'] for p in R['pieces'] if p['listed']}
for p in R['pieces']:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]; bx0, by0, bx1, by1 = int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3
    sel = np.zeros_like(ch); sel[by0:by1, bx0:bx1] = ch[by0:by1, bx0:bx1]
    im[sel] = (0, 235, 255) if p['key'] in listed else (255, 150, 40)
blk = (B == 0).all(axis=2); sel = np.zeros_like(ch); sel[fb[1]:fb[3], fb[0]:fb[2]] = (ch & blk)[fb[1]:fb[3], fb[0]:fb[2]]; im[sel] = (60, 255, 90)
img = Image.fromarray(im); dd = ImageDraw.Draw(img)
for p in R['pieces']:
    for poly in [p['outline']] + p.get('holes', []): dd.line([tuple(q) for q in poly + poly[:1]], fill=(255, 255, 255), width=1)
CK = R['checks']
save(labelled(img, 'AI-generated picture: RA-C-2c, dimmed (a code composite)', f"Changed against RA-C-2: {CK['changedPx']:,} px, all in the completions (the Lead's four cyan, the handle orange) or the screen (green); outside them: {CK['changedOutsideTheCompletionsAndTheScreen']}"), 'ra-C-2c-changed.png')
json.dump({f: list(sz) for f, sz in out.items()}, open(os.path.join(D, 'review-C2.json'), 'w'), indent=1)
print('version 3 review pictures:', ', '.join(f'{f} {sz[0]}x{sz[1]}' for f, sz in out.items()))
