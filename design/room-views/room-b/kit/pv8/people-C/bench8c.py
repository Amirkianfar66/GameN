# Atlas's bench in view C (bench8e.py, view E's, for Lyra's view; the In-game animation builder's report on E and the Lead's order,
# 18 November): the bench's layer, lifted from PV6-C-3 inside step 2's PLACE mask, carries what step 2 re-painted above the bench
# top's painted back edge: the wall, the lower edge of the wall shelf with the bottoms of its jars and books, and its brackets. By
# depth alone that went into the bench's band, in front of Atlas, who stands behind the bench. This finds the painted back edge
# and that strip above it, so occlude8c.py draws the strip behind every person (band 0) and the bench, with the things on it (the
# microscope, the test tubes in their rack and the coral jar), stays in front. The edge shows only at the bench's left end and
# right of the coral jar (step 3's dispenser stands there in PV6-C-4, on its own layer); between, straight from run to run.
# Writes bench-C.json (the edge, the height, the polygons, the strip as row runs). Generates nothing. Usage: python3 -I bench8c.py
import hashlib, json, os, numpy as np
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__)); P = lambda p: os.path.join(D, p)
PIC = json.load(open(P('picture.json'))); G = json.load(open(P('_geo-C.json'))); S = json.load(open(P('scene.json')))
pic = np.array(Image.open(P(PIC['placed2']['file'])).convert('RGB')).astype(float); H, W = pic.shape[:2]
lum = (0.299 * pic[..., 0] + 0.587 * pic[..., 1] + 0.114 * pic[..., 2]) / 255
lay = next(p for s, p in PIC['layers']['pieces'].items() if s == 'D bench'); layer = np.array(Image.open(P(lay['file'])).convert('RGBA'))[..., 3] > 0
RUNS = [(440, 446), (610, 694)]   # columns where the back edge shows (the bench's left end; right of the coral jar)
pts = [(x, 866 + int(np.argmin(lum[866:883, x]))) for a, b in RUNS for x in range(a, b + 1)]
xs = np.array([p[0] for p in pts]); ys = np.array([p[1] for p in pts])
edge = np.interp(np.arange(W), xs, ys)   # straight between runs, flat past the ends
OBJECTS = {   # traced along the ink outlines in PV6-C-3 at 6x, painting px
    'microscope': [(445, 905), (445, 878), (452, 872), (466, 866), (512, 864), (525, 869), (525, 905)],
    'test tube rack': [(524, 905), (524, 872), (529, 863), (566, 863), (571, 872), (571, 905)],
    'coral jar': [(571, 905), (571, 858), (576, 852), (578, 844), (607, 844), (609, 852), (611, 858), (611, 905)]}
om = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(om)
for poly in OBJECTS.values(): dr.polygon(poly, fill=255)
obj = np.array(om) > 0
above = layer & (np.arange(H)[:, None] < np.floor(edge)[None, :])
strip = above & ~obj
runs = []
for y in np.where(strip.any(axis=1))[0]:
    r = strip[y]; d = np.diff(np.concatenate(([0], r.astype(np.int8), [0]))); s0, e0 = np.where(d == 1)[0], np.where(d == -1)[0]
    runs += [[int(y), int(a), int(b - 1)] for a, b in zip(s0, e0)]
# the painted top's height and depth, from the plan's bench: its top face's far edge (the corners farthest from the camera)
cam = G['camera']; C = np.array(cam['C'], float); yaw = cam['yaw']
fwd, right, up = np.array([np.sin(yaw), 0.0, np.cos(yaw)]), np.array([np.cos(yaw), 0.0, -np.sin(yaw)]), np.array([0.0, 1.0, 0.0])
top = [np.array(p, float) for p in G['stations']['D bench']['solids'][0]['faces'][-1]]   # the top face, its corners in order
def proj(p): q = p - C; z = q @ fwd; return cam['cx'] + cam['f'] * (q @ right) / z - 0.5, cam['hy'] - cam['f'] * (q @ up) / z - 0.5
i = max(range(4), key=lambda j: (top[j] - C) @ fwd)   # the farthest corner; the back edge is its longer neighbour on the picture
a0 = top[i]; a1 = max((top[(i - 1) % 4], top[(i + 1) % 4]), key=lambda p: abs(proj(p)[0] - proj(a0)[0])); corners = [a0, a1]
n = np.cross(a1 - a0, up); n /= np.linalg.norm(n); TOPM = float(a0[1])
def ray(x, y): return fwd + ((x + 0.5 - cam['cx']) / cam['f']) * right + ((cam['hy'] - (y + 0.5)) / cam['f']) * up
height = []
for x in (446, 610, 640, 670, 694):
    y = float(edge[x]); d = ray(x, y); t = (n @ (a0 - C)) / (n @ d); hp = C + t * d   # the back face's plane
    t2 = (TOPM - C[1]) / d[1]; tp = C + t2 * d   # the plan's top height
    height.append({'x': x, 'y': round(y, 1), 'onTheBackFaceM': round(float(hp[1]), 3), 'atThePlansTopNearerByM': round(float((hp - C) @ fwd - (tp - C) @ fwd), 3)})
gx = [proj(c) for c in corners]
phones = {}
for key, ph in S['phones'].items():
    k, x0, y0 = ph['k'], ph['slice']['x0'], ph['slice']['y0']; st = lambda x, y: [round((x - x0) / k, 1), round((y - y0) / k, 1)]
    phones[key] = {'polyline': [st(x, float(edge[x])) for x in (440, 446, 610, 650, 694)], 'atlasRange': {'x': [round((451 - x0) / k, 1), round((579 - x0) / k, 1)]}}
rec = {'view': 'C', 'what': "Atlas's bench: the painted top's back edge in PV6-C-3 and the strip above it in the bench's layer (the wall, the shelf's lower edge), which occlude8c.py draws behind every person (band 0)",
       'picture': {'label': PIC['placed2']['label'], 'sha256': PIC['placed2']['sha256']}, 'layer': {'file': lay['file'], 'sha256': hashlib.sha256(open(P(lay['file']), 'rb').read()).hexdigest()},
       'edge': {'rule': 'per column, the darkest row between y 866 and 882 (the edge\'s ink line), where nothing stands on the edge; straight between the runs, flat past the ends',
                'runs': RUNS, 'points': [[int(x), int(y)] for x, y in pts], 'polyline': [[x, round(float(edge[x]), 1)] for x in (440, 446, 610, 650, 694)],
                'plansFarTopEdge': [[round(float(v), 1) for v in p] for p in gx], 'phones': phones},
       'height': {'plansTopM': TOPM, 'rule': "where the edge's ray meets the plan's bench back face (the vertical plane through its far top edge); and how far nearer the camera a top at the plan's height would put that edge", 'at': height},
       'objects': {'how': 'traced along their ink outlines in PV6-C-3 at 6x, painting px; the wall shelf, its jars and books, and its brackets are wall', 'polygons': OBJECTS},
       'strip': {'px': int(strip.sum()), 'aboveTheEdgePx': int(above.sum()), 'objectsPx': int((above & obj).sum()), 'bbox': [int(np.where(strip.any(0))[0].min()), int(np.where(strip.any(1))[0].min()), int(np.where(strip.any(0))[0].max()) + 1, int(np.where(strip.any(1))[0].max()) + 1],
                 'maskSha256': hashlib.sha256(np.packbits(strip).tobytes()).hexdigest(), 'runs': runs}}
open(P('bench-C.json'), 'w').write(json.dumps({k: v for k, v in rec.items() if k != 'strip'}, indent=1)[:-2] + ',\n "strip": ' + json.dumps({k: v for k, v in rec['strip'].items() if k != 'runs'})[:-1] + ',\n  "runs": [\n' + ',\n'.join('   ' + json.dumps(r) for r in runs) + '\n  ]}\n}\n')
json.load(open(P('bench-C.json')))
print(json.dumps({'edge': rec['edge']['polyline'], 'phones': phones, 'height': height, 'strip': {k: v for k, v in rec['strip'].items() if k != 'runs'}}, indent=1))
