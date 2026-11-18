# The food capsule's painted glass, measured from its layer's pixels (the Lead, 18 November: the data and the page should agree on
# the lens, so the glass is measured, not taken from the records' paintedLens). In a search box around the lens: the bright rim is
# the pixels lighter than RIM (luminance 0.299 R + 0.587 G + 0.114 B, in 0-255); the glass is the 4-connected region of the other
# pixels that holds the seed, its holes filled (the highlight on the glass); it must not reach the box's edge (a rim with a gap).
# Gives the glass's centre (its pixels' mean, in pixel indices, as the records give points), its radius (of the circle of the same
# area), its box and pixel count, and both phones' stage points from scene.json's slice (a pixel taken at its centre, as
# export8b.mjs does). Writes nothing unless asked (--json out.json). Generates nothing.
# Usage: python3 -I lens8.py <capsule layer.png> <scene.json> x0,y0,x1,y1 sx,sy [--json out.json]
import hashlib, json, sys, numpy as np
from PIL import Image
RIM = 100
args = [a for a in sys.argv[1:] if not a.startswith('--')]; out = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
if out in args: args.remove(out)
layer, scene, box, seed = args[0], args[1], [int(v) for v in args[2].split(',')], [int(v) for v in args[3].split(',')]
L = np.asarray(Image.open(layer).convert('RGBA')).astype(float); x0, y0, x1, y1 = box; c = L[y0:y1, x0:x1]
lum = 0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2]; inside = (lum <= RIM) & (c[..., 3] > 0)
sx, sy = seed[0] - x0, seed[1] - y0
if not inside[sy, sx]: sys.exit('STOP: the seed is not on the glass')
reg = np.zeros_like(inside); stack = [(sy, sx)]; reg[sy, sx] = True
while stack:
    y, x = stack.pop()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < reg.shape[0] and 0 <= xx < reg.shape[1] and inside[yy, xx] and not reg[yy, xx]: reg[yy, xx] = True; stack.append((yy, xx))
if reg[0].any() or reg[-1].any() or reg[:, 0].any() or reg[:, -1].any(): sys.exit('STOP: the glass reaches the box edge: the rim has a gap')
# fill the holes: the pixels not reachable from the box edge through the outside of the glass
outside = np.zeros_like(reg); stack = [(y, x) for y in range(reg.shape[0]) for x in (0, reg.shape[1] - 1)] + [(y, x) for x in range(reg.shape[1]) for y in (0, reg.shape[0] - 1)]
for y, x in stack: outside[y, x] = not reg[y, x]
stack = [(y, x) for y, x in stack if outside[y, x]]
while stack:
    y, x = stack.pop()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < reg.shape[0] and 0 <= xx < reg.shape[1] and not reg[yy, xx] and not outside[yy, xx]: outside[yy, xx] = True; stack.append((yy, xx))
glass = ~outside; ys, xs = np.where(glass); n = int(glass.sum())
cx, cy = float(xs.mean() + x0), float(ys.mean() + y0); r = float(np.sqrt(n / np.pi))
S = json.load(open(scene)); phones = {}
for k, ph in S['phones'].items():
    kk, sx0, sy0 = ph['k'], ph['slice']['x0'], ph['slice']['y0']
    phones[k] = {'centre': [round((cx + 0.5 - sx0) / kk, 1), round((cy + 0.5 - sy0) / kk, 1)], 'radius': round(r / kk, 1)}
rec = {'layer': {'file': layer.split('/')[-1], 'sha256': hashlib.sha256(open(layer, 'rb').read()).hexdigest()}, 'method': f"the glass inside the bright rim (luminance above {RIM}), from the seed {seed}, holes filled, in the box {box}",
       'painting': {'centre': [round(cx, 1), round(cy, 1)], 'radius': round(r, 1), 'px': n, 'bbox': [int(xs.min()) + x0, int(ys.min()) + y0, int(xs.max()) + x0, int(ys.max()) + y0],
                    'units': 'pixel indices, as the records give points; the radius of the circle of the same area'}, 'phones': phones}
if out: json.dump(rec, open(out, 'w'), indent=1)
print(json.dumps(rec, indent=1))
