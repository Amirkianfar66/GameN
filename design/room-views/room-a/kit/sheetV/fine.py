# For tracing (not published): a crop at N times, nearest-neighbour, with a fine grid (every 2 px faint, every 10 px bright and
# labelled), the mask's edge (red) and optional polygons (cyan, JSON list of point lists), labelled as an AI-generated picture.
# Usage: python3 -I fine.py <picture.png> <mask.png> <x0> <y0> <x1> <y1> <scale> <out.png> <label> [polygons.json]
import importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
pic, mk, x0, y0, x1, y1, S, out, label = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8]), sys.argv[8], sys.argv[9]
polys = json.load(open(sys.argv[10])) if len(sys.argv) > 10 else []
a = np.asarray(Image.open(pic).convert('RGB')).copy(); m = np.array(Image.open(mk).convert('L')) > 127
im = Image.fromarray(a).crop((x0, y0, x1, y1)); w, h = im.size; im = im.resize((w * S, h * S), Image.NEAREST)
c = Image.new('RGB', (w * S + 40, h * S + 34), (16, 16, 20)); c.paste(im, (36, 22)); d = ImageDraw.Draw(c)
for gx in range(x0 + (x0 % 2), x1 + 1, 2):
    X = 36 + (gx - x0) * S; d.line([(X, 22), (X, 22 + h * S)], fill=(255, 255, 255) if gx % 10 == 0 else (95, 95, 95))
    if gx % 10 == 0: d.text((X + 1, 24 + h * S), str(gx), fill=(255, 255, 255))
for gy in range(y0 + (y0 % 2), y1 + 1, 2):
    Y = 22 + (gy - y0) * S; d.line([(36, Y), (36 + w * S, Y)], fill=(255, 255, 255) if gy % 10 == 0 else (95, 95, 95))
    if gy % 10 == 0: d.text((1, Y - 6), str(gy), fill=(255, 255, 255))
ys, xs = np.nonzero((L.grow(m, 1) & ~m)[y0:y1, x0:x1])
for y, x in zip(ys, xs): d.rectangle([36 + x * S + S // 2 - 1, 22 + y * S + S // 2 - 1, 36 + x * S + S // 2 + 1, 22 + y * S + S // 2 + 1], fill=(255, 0, 0))
for p in polys: d.line([(36 + (q[0] - x0) * S, 22 + (q[1] - y0) * S) for q in p + p[:1]], fill=(0, 255, 255), width=2)
d.text((4, 4), f'{label} | x {x0}-{x1}, y {y0}-{y1} at {S}x | grid 2 px, labels every 10 | red dots: mask edge pixels (outside)', fill=(255, 220, 140))
c.save(out); print(out, c.size)
