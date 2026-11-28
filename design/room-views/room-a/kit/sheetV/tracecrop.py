# For tracing (not published): a crop of a step-1 picture at N times, nearest-neighbour, with the sheet's step-2 mask edge (gold),
# its 15 px band tinted, a 10 px grid (picture pixels; every 50 px brighter and labelled), and an AI-generated label when the
# picture is one. Usage: python3 -I tracecrop.py <picture.png> <place mask.png> <x0> <y0> <x1> <y1> <scale> <out.png> [label]
import importlib.util, os, sys
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('lift5', os.path.join(HERE, '..', 'sheet', 'lift5.py')); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
pic, mk, x0, y0, x1, y1, S, out = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:8]), sys.argv[8]
label = sys.argv[9] if len(sys.argv) > 9 else ''
a = np.asarray(Image.open(pic).convert('RGB')).astype(float); place = np.array(Image.open(mk).convert('L')) > 127
band = L.grow(place, 15) & L.grow(~place, 15); edge = L.grow(place, 1) & ~place
a[band] = a[band] * 0.75 + np.array([120, 190, 255]) * 0.25; a[edge] = [255, 210, 60]
im = Image.fromarray(a.astype(np.uint8)).crop((x0, y0, x1, y1)); w, h = im.size; im = im.resize((w * S, h * S), Image.NEAREST)
TOP = 22; canvas = Image.new('RGB', (w * S + 34, h * S + TOP + 14), (20, 20, 24)); canvas.paste(im, (34, TOP)); d = ImageDraw.Draw(canvas)
for gx in range((x0 // 10) * 10, x1 + 1, 10):
    if gx < x0: continue
    X = 34 + (gx - x0) * S; d.line([(X, TOP), (X, TOP + h * S)], fill=(255, 255, 255) if gx % 50 == 0 else (150, 150, 150), width=1)
    if gx % 50 == 0: d.text((X + 2, TOP + h * S + 1), str(gx), fill=(255, 255, 255))
for gy in range((y0 // 10) * 10, y1 + 1, 10):
    if gy < y0: continue
    Y = TOP + (gy - y0) * S; d.line([(34, Y), (34 + w * S, Y)], fill=(255, 255, 255) if gy % 50 == 0 else (150, 150, 150), width=1)
    if gy % 50 == 0: d.text((1, Y - 6), str(gy), fill=(255, 255, 255))
d.text((4, 4), f'{label} x {x0}-{x1}, y {y0}-{y1} at {S}x; gold: step-2 mask edge; tint: its 15 px band; grid 10 px', fill=(255, 220, 140))
canvas.save(out); print(out, canvas.size)
