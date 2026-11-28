# Sheet RA-B version 3's review pictures, for the page only (the Lead, 17:43 on 27 November: "zooms of the three completed edges at
# 3x; the screen fits with their gate numbers; the full picture; the 402 x 742 view; a check that nothing outside the three
# completions changed against the kept RA-B-3"). They show RA-B-3, the AI-generated kept step 2, and RA-B-3c, its code composite with
# RA-B-3's raw edit (compositeB3.py). Each carries a visible label saying it is AI-generated.
# - ra-B-3c-<piece>.png: each completed piece at 3 times: before (RA-B-3), after (RA-B-3c), and after with the traced outline.
# - ra-B-3c-screens.png: the monitors at 3 times, with the fitted screens (cyan) and the step-2 map's screens (magenta).
# - ra-B-3c-full.png: RA-B-3c whole. ra-B-3c-402.png: the 402 x 742 phone's 402 x 551 slice, at twice its stage size.
# - ra-B-3c-changed.png: the check: RA-B-3c dimmed, every pixel that differs from RA-B-3 lit (the Lead's three cyan, the two more
#   orange), with the traced outlines.
# Never an input, never an asset, never committed. Reads RA-B-3 (by its sha256) and ra-B-3c.png (by composite-B3.json's pixel hash).
# Usage: python3 -I reviewB3.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
R, S, MAN = (json.load(open(os.path.join(D, f))) for f in ('composite-B3.json', 'screens-B.json', 'room-a-ra-b.json'))
pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
base = next(s for s in R['sources'] if s['name'] == 'RA-B-3')
if hashlib.sha256(open(os.path.join(REC, base['file']), 'rb').read()).hexdigest() != base['sha256']: sys.exit('STOP: not RA-B-3')
before = Image.open(os.path.join(REC, base['file'])).convert('RGB'); after = Image.open(os.path.join(D, 'ra-B-3c.png')).convert('RGB')
if pix(np.array(after)) != R['outputs']['ra-B-3c.png']['pixelsSha256']: sys.exit('STOP: ra-B-3c.png is not the plate composite-B3.json records')
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, line1, line2):   # the AI-generated label, burned in at the top, its size fitted to the width (as view A's version 7)
    w = im.width; px = max(13, round(w / 34))
    while px > 12 and max(ImageDraw.Draw(im).textlength(line1, font=font(px)), ImageDraw.Draw(im).textlength(line2, font=font(round(px * 0.8)))) > w - 2 * round(px * 0.6): px -= 1
    f1, f2 = font(px), font(round(px * 0.8)); h = round(px * 2.9)
    out = Image.new('RGB', (w, im.height + h), (10, 12, 18)); out.paste(im, (0, h)); dd = ImageDraw.Draw(out)
    dd.text((round(px * 0.6), round(px * 0.35)), line1, font=f1, fill=(255, 224, 160))
    dd.text((round(px * 0.6), round(px * 1.6)), line2, font=f2, fill=(235, 235, 235)); return out
def tag(im, text):   # a small caption in a panel's top-left corner
    im = im.copy(); dd = ImageDraw.Draw(im, 'RGBA'); f = font(15); x0, y0, x1, y1 = dd.textbbox((0, 0), text, font=f)
    dd.rectangle([4, 4, 4 + (x1 - x0) + 12, 4 + (y1 - y0) + 10], fill=(10, 12, 18, 215)); dd.text((10, 8 - y0), text, font=f, fill=(255, 255, 255)); return im
AI = 'AI-generated pictures: RA-B-3, and RA-B-3c (a code composite of AI-generated pictures)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = im.size
BOX = {'desk-left': (330, 835, 440, 1025), 'monitor-left': (395, 762, 520, 848), 'toolbox': (580, 1018, 700, 1168), 'monitor-right': (505, 762, 635, 848), 'foot-right': (600, 985, 672, 1040)}
Z = 3
for p in R['pieces']:
    box = BOX[p['key']]; x0, y0, x1, y1 = box; w, h = (x1 - x0) * Z, (y1 - y0) * Z
    a, b = before.crop(box).resize((w, h), Image.NEAREST), after.crop(box).resize((w, h), Image.NEAREST); c = b.copy(); dd = ImageDraw.Draw(c)
    for poly in [p['outline']] + p.get('holes', []): dd.line([((q[0] - x0) * Z, (q[1] - y0) * Z) for q in poly + poly[:1]], fill=(0, 255, 255), width=1)
    gap = 8; im = Image.new('RGB', (3 * w + 2 * gap, h), (10, 12, 18))
    for k, (pane, t) in enumerate(((a, 'Before: RA-B-3'), (b, 'After: RA-B-3c'), (c, 'Traced outline'))): im.paste(tag(pane, t), (k * (w + gap), 0))
    extra = '' if p['listed'] else ' (one of the two more)'
    save(labelled(im, AI, f"{p['name'][0].upper() + p['name'][1:]}{extra}: x {x0}-{x1}, y {y0}-{y1} at 3 times"), f"ra-B-3c-{p['key']}.png")
# the screens
box = (400, 762, 640, 862); x0, y0, x1, y1 = box; w, h = (x1 - x0) * Z, (y1 - y0) * Z
im = after.crop(box).resize((w, h), Image.NEAREST); dd = ImageDraw.Draw(im)
for s in S['screens']:
    mb = s['map']['box']; dd.rectangle([(mb[0] - x0) * Z, (mb[1] - y0) * Z, (mb[2] - x0) * Z - 1, (mb[3] - y0) * Z - 1], outline=(255, 70, 255), width=2)
    dd.line([((q[0] - x0) * Z, (q[1] - y0) * Z) for q in s['corners'] + s['corners'][:1]], fill=(0, 255, 255), width=2)
g = ', '.join(f"{s['name'].split()[0]} {s['p95L']:.3f}" for s in S['screens'])
save(labelled(im, 'AI-generated picture: RA-B-3c (a code composite)', f"Fitted to the painted black (cyan); the map's (magenta). Lightness p95 (gate < 0.12): {g}"), 'ra-B-3c-screens.png')
# the whole picture, and the 402 x 742 view
save(labelled(after, 'AI-generated picture: RA-B-3c (a code composite of AI-generated pictures)', "View B's step 2, its cut pieces completed in code"), 'ra-B-3c-full.png')
s4 = MAN['camera']['phones']['slices']['402x742']; px0, py0, px1, py1 = s4['paintingRect']; Wd, SH = s4['stage']
c = after.crop((round(px0), round(py0), round(px1), round(py1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
save(labelled(c, 'AI-generated picture: RA-B-3c (a code composite)', "402x742: the phone's slice, twice its stage size"), 'ra-B-3c-402.png')
# the check: what changed against RA-B-3
A, B = np.array(before), np.array(after); ch = (A != B).any(axis=2)
dim = (B * 0.32).astype(np.uint8); im = dim.copy(); im[ch] = (255, 40, 40)   # red would show a change outside every piece: there is none
listed = {p['key'] for p in R['pieces'] if p['listed']}
for p in R['pieces']:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]; bx0, by0, bx1, by1 = int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3
    sel = np.zeros_like(ch); sel[by0:by1, bx0:bx1] = ch[by0:by1, bx0:bx1]
    im[sel] = (0, 235, 255) if p['key'] in listed else (255, 150, 40)
img = Image.fromarray(im); dd = ImageDraw.Draw(img)
for p in R['pieces']:
    for poly in [p['outline']] + p.get('holes', []): dd.line([tuple(q) for q in poly + poly[:1]], fill=(255, 255, 255), width=1)
CK = R['checks']
save(labelled(img, 'AI-generated picture: RA-B-3c, dimmed (a code composite)', f"Changed against RA-B-3: {CK['changedPx']:,} px, all inside the completions (the Lead's three cyan, two more orange); outside them: {CK['changedOutsideTheCompletions']}"), 'ra-B-3c-changed.png')
json.dump({f: list(sz) for f, sz in out.items()}, open(os.path.join(D, 'review-B3.json'), 'w'), indent=1)
print('version 3 review pictures:', ', '.join(f'{f} {sz[0]}x{sz[1]}' for f, sz in out.items()))
