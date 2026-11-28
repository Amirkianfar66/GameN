# Sheet RA-E version 3's review pictures, for the page only (the Lead, 19:15 on 27 November: "3x zooms of both completions (before,
# after, outline), with the corner marked on the cabinet's zoom; the full picture and the 402 x 742 view; the outside-unchanged count
# against the kept RA-E-2"). They show RA-E-2, the AI-generated kept step 2, and RA-E-2c, its code composite with RA-E-2's raw edit
# (compositeE2.py). Each carries a visible label saying it is AI-generated.
# - ra-E-2c-crates.png: the crates' left ends at 3 times: before (RA-E-2), after (RA-E-2c), and after with the traced outlines (cyan),
#   their closing paths inside the mask dashed, the mask's two gaps boxed (magenta).
# - ra-E-2c-cabinet-top.png, -right.png, -bottom.png: the cabinet's frame at 3 times, the same three panels, the painted corner at x 107
#   marked (yellow dashes) on every panel.
# - ra-E-2c-full.png: RA-E-2c whole. ra-E-2c-402.png: the 402 x 742 phone's 402 x 551 slice, at twice its stage size.
# - ra-E-2c-changed.png: the check: RA-E-2c dimmed, every pixel that differs from RA-E-2 lit (the crates cyan, the cabinet green), with
#   the traced outlines.
# Never an input, never an asset, never committed. Reads RA-E-2 (by its sha256) and ra-E-2c.png (by composite-E2.json's pixel hash).
# Usage: python3 -I reviewE2.py <records folder>
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); REC = sys.argv[1]
R, MAN = (json.load(open(os.path.join(D, f))) for f in ('composite-E2.json', 'room-a-ra-e.json'))
pix = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
base = next(s for s in R['sources'] if s['name'] == 'RA-E-2')
if hashlib.sha256(open(os.path.join(REC, base['file']), 'rb').read()).hexdigest() != base['sha256']: sys.exit('STOP: not RA-E-2')
before = Image.open(os.path.join(REC, base['file'])).convert('RGB'); after = Image.open(os.path.join(D, 'ra-E-2c.png')).convert('RGB')
if pix(np.array(after)) != R['outputs']['ra-E-2c.png']['pixelsSha256']: sys.exit('STOP: ra-E-2c.png is not the plate composite-E2.json records')
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
def dashed(dd, pts, fill, width=1, on=6, off=4):   # a dashed polyline
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = np.hypot(x1 - x0, y1 - y0); s = 0.0
        while s < n:
            e = min(n, s + on); dd.line([(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n), (x0 + (x1 - x0) * e / n, y0 + (y1 - y0) * e / n)], fill=fill, width=width); s = e + off
AI = 'AI-generated pictures: RA-E-2, and RA-E-2c (a code composite of AI-generated pictures)'
out = {}
def save(im, f): im.save(os.path.join(D, f), optimize=True); out[f] = im.size
CORNER = R['theFrameAtTheCorner']['paintedCornerX']
def triple(box, Z, titles, label2, f, keys, corner=False, gaps=False, stack=False):
    x0, y0, x1, y1 = box; w, h = (x1 - x0) * Z, (y1 - y0) * Z
    ims = [before.crop(box).resize((w, h), Image.NEAREST), after.crop(box).resize((w, h), Image.NEAREST), after.crop(box).resize((w, h), Image.NEAREST)]
    dd = ImageDraw.Draw(ims[2])
    for p in R['pieces']:
        if p['key'] not in keys: continue
        dd.line([((q[0] - x0) * Z, (q[1] - y0) * Z) for q in p['outline'] + p['outline'][:1]], fill=(0, 255, 255), width=1)
        if not p['checks']['closingAlongThePicturesEdge']: dashed(dd, [((q[0] - x0) * Z, (q[1] - y0) * Z) for q in p['closing']], (255, 170, 60), 2)
    if gaps:
        for g in R['maskGaps']:
            b = g['box']; dd.rectangle([(b[0] - x0) * Z, (b[1] - y0) * Z, (b[2] - x0) * Z - 1, (b[3] - y0) * Z - 1], outline=(255, 70, 255), width=2)
    if corner:
        for im in ims: dashed(ImageDraw.Draw(im), [((CORNER - x0) * Z, 0), ((CORNER - x0) * Z, h)], (255, 230, 0), 2, 8, 6)
    gap = 8
    if stack: im = Image.new('RGB', (w, 3 * h + 2 * gap), (10, 12, 18))
    else: im = Image.new('RGB', (3 * w + 2 * gap, h), (10, 12, 18))
    for k, (pane, t) in enumerate(zip(ims, titles)): im.paste(tag(pane, t), (0, k * (h + gap)) if stack else (k * (w + gap), 0))
    save(labelled(im, AI, label2), f)
T3 = ('Before: RA-E-2', 'After: RA-E-2c', 'Traced outline')
Z = 3
triple((744, 822, 846, 1050), Z, T3, "The crates' left ends: x 744-846, y 822-1050 at 3 times. Cyan: the traced ink outlines; orange dashes: where they close inside the mask; magenta: the mask's two gaps, inside the outlines", 'ra-E-2c-crates.png', ('crate-upper', 'crate-lower'), gaps=True)
triple((0, 538, 140, 640), Z, T3, f"The cabinet's frame, its top bar and top-right corner: x 0-140, y 538-640 at 3 times. Yellow dashes: the painted corner, x {CORNER}; cyan: the traced outline", 'ra-E-2c-cabinet-top.png', ('cabinet',), corner=True)
triple((72, 600, 140, 980), Z, T3, f"The cabinet's right post: x 72-140, y 600-980 at 3 times. Yellow dashes: the painted corner, x {CORNER}; the raw's post reaches x 113.9 with its ink", 'ra-E-2c-cabinet-right.png', ('cabinet',), corner=True)
triple((0, 940, 140, 1092), Z, T3, f"The cabinet's frame, its bottom-right corner and bottom bar to the picture's edge: x 0-140, y 940-1092 at 3 times. Yellow dashes: the painted corner, x {CORNER}", 'ra-E-2c-cabinet-bottom.png', ('cabinet',), corner=True)
# the whole picture, and the 402 x 742 view
save(labelled(after, 'AI-generated picture: RA-E-2c (a code composite of AI-generated pictures)', "View E's step 2, its cut pieces completed in code"), 'ra-E-2c-full.png')
s4 = MAN['camera']['phones']['slices']['402x742']; px0, py0, px1, py1 = s4['paintingRect']; Wd, SH = s4['stage']
c = after.crop((round(px0), round(py0), round(px1), round(py1))).resize((2 * Wd, 2 * SH), Image.LANCZOS)
save(labelled(c, 'AI-generated picture: RA-E-2c (a code composite)', "402x742: the phone's slice, twice its stage size"), 'ra-E-2c-402.png')
# the check: what changed against RA-E-2
A, B = np.array(before), np.array(after); ch = (A != B).any(axis=2)
dim = (B * 0.32).astype(np.uint8); im = dim.copy(); im[ch] = (255, 40, 40)   # red would show a change outside every piece: there is none
for p in R['pieces']:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]; bx0, by0, bx1, by1 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2), int(max(xs)) + 3, int(max(ys)) + 3
    sel = np.zeros_like(ch); sel[by0:by1, bx0:bx1] = ch[by0:by1, bx0:bx1]
    im[sel] = (0, 235, 255) if p['key'].startswith('crate') else (60, 255, 90)
img = Image.fromarray(im); dd = ImageDraw.Draw(img)
for p in R['pieces']: dd.line([tuple(q) for q in p['outline'] + p['outline'][:1]], fill=(255, 255, 255), width=1)
CK = R['checks']
save(labelled(img, 'AI-generated picture: RA-E-2c, dimmed (a code composite)', f"Changed against RA-E-2: {CK['changedPx']:,} px, all in the completions (the crates cyan, the cabinet green); outside them: {CK['changedOutsideTheCompletions']}, and {CK['unchangedOutsideTheCompletions']:,} px there unchanged"), 'ra-E-2c-changed.png')
json.dump({f: list(sz) for f, sz in out.items()}, open(os.path.join(D, 'review-E2.json'), 'w'), indent=1)
print('version 3 review pictures:', ', '.join(f'{f} {sz[0]}x{sz[1]}' for f, sz in out.items()))
