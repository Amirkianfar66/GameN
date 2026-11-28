# For tracing (not published): the same crop of two pictures side by side at N times, nearest-neighbour, with a mask's edge (red),
# optional polygons (cyan) and a 10 px grid (picture pixels; every 50 brighter and labelled), labelled as AI-generated pictures.
# Usage: python3 -I pair.py <left.png> <right.png> <mask.png> <x0> <y0> <x1> <y1> <scale> <out.png> <label> [polygons.json]
import importlib.util, json, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
left, right, mk, x0, y0, x1, y1, S, out, label = sys.argv[1], sys.argv[2], sys.argv[3], *map(int, sys.argv[4:9]), sys.argv[9], sys.argv[10]
polys = json.load(open(sys.argv[11])) if len(sys.argv) > 11 else []
m = np.array(Image.open(mk).convert('L')) > 127; edge = L.grow(m, 1) & ~m
def panel(f):
    a = np.asarray(Image.open(f).convert('RGB')).copy(); a[edge] = [255, 0, 0]
    im = Image.fromarray(a).crop((x0, y0, x1, y1)); w, h = im.size; im = im.resize((w * S, h * S), Image.NEAREST); d = ImageDraw.Draw(im)
    for p in polys: d.polygon([((q[0] - x0) * S, (q[1] - y0) * S) for q in p], outline=(0, 255, 255))
    for gx in range((x0 // 10) * 10, x1 + 1, 10):
        if gx >= x0: d.line([((gx - x0) * S, 0), ((gx - x0) * S, h * S)], fill=(255, 255, 255) if gx % 50 == 0 else (140, 140, 140))
    for gy in range((y0 // 10) * 10, y1 + 1, 10):
        if gy >= y0: d.line([(0, (gy - y0) * S), (w * S, (gy - y0) * S)], fill=(255, 255, 255) if gy % 50 == 0 else (140, 140, 140))
    return im
a, b = panel(left), panel(right); W, H = a.size
c = Image.new('RGB', (2 * W + 40, H + 40), (16, 16, 20)); c.paste(a, (30, 30)); c.paste(b, (W + 40, 30)); d = ImageDraw.Draw(c)
for gx in range((x0 // 50) * 50, x1 + 1, 50):
    if gx >= x0: d.text((30 + (gx - x0) * S + 2, H + 30), str(gx), fill=(255, 255, 255))
for gy in range((y0 // 50) * 50, y1 + 1, 50):
    if gy >= y0: d.text((1, 30 + (gy - y0) * S - 5), str(gy), fill=(255, 255, 255))
d.text((4, 4), f'{label} | x {x0}-{x1}, y {y0}-{y1} at {S}x | red: step-2 mask edge; grid 10 px', fill=(255, 220, 140))
c.save(out); print(out, c.size)
