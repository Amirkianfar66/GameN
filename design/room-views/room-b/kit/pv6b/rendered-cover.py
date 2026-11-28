# Who is in front of whom, as rendered (Room B test page v5): from cover6.cjs's transparent stage frames (device scale 2), for
# each person on each phone: the share of their drawing hidden by furniture drawn after them (1 - the white left in "stack"
# over the white in "alone"), and the share of their figure's box, their face box (their head when no face shows: Lyra) and
# their press area under furniture drawn over them (the black in "stack"), and whether its centre is (the Lead: Juno's press area
# may be partly behind her cart's near part as long as its centre stays visible). Writes cover.json into the folder.
# Usage: python3 -I rendered-cover.py <folder with cover-frames.json and the frames>
import json, os, sys, numpy as np
from PIL import Image
V = os.path.abspath(sys.argv[1]); F = json.load(open(os.path.join(V, 'cover-frames.json'))); out = {}
def frame(f):
    a = np.array(Image.open(os.path.join(V, f)).convert('RGBA')).astype(np.float64) / 255
    return a[..., 3] * a[..., 0], a[..., 3] * (1 - a[..., 0])   # white (the person, seen) and black (furniture over them), each weighted by alpha
for key, ph in F.items():
    res = {}
    for pid, q in ph['people'].items():
        # key: the phone, and @t for a moment of the people's motion; s: device px per stage px
        alone, _ = frame(f'{key}-{pid}-alone.png'); seen, over = frame(f'{key}-{pid}-stack.png'); s = alone.shape[1] / ph['W']
        def share(b):
            x0, y0, x1, y1 = (int(round(v * s)) for v in b); x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(alone.shape[1], x1), min(alone.shape[0], y1)
            return round(float(over[y0:y1, x0:x1].mean()), 4) if x1 > x0 and y1 > y0 else None
        p = q['press']
        res[pid] = {'name': q['name'], 'moment': ph.get('moment', 0), 'after': q['after'], 'drawingPx': round(float(alone.sum() / s / s), 1), 'hiddenShare': round(float(1 - seen.sum() / max(1e-9, alone.sum())), 4),
                    'boxShare': share(q['box']), 'faceShare': share(q['face']) if q['face'] else None, 'faceShows': q['faceShows'], 'pressShare': share([p['x0'], p['y0'], p['x1'], p['y1']]),
                    'pressCentreCovered': share([(p['x0'] + p['x1']) / 2 - 1, (p['y0'] + p['y1']) / 2 - 1, (p['x0'] + p['x1']) / 2 + 1, (p['y0'] + p['y1']) / 2 + 1])}   # the 2 x 2 px at the press area's centre
    out[key] = res
json.dump(out, open(os.path.join(V, 'cover.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))
