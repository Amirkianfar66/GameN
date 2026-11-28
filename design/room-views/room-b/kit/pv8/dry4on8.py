# C's version 8 (the Lead, 18 November): s4's input made on step 3's picture by the published folder's own tool, and checked: inside
# each of step 4's shapes, the guide exactly where it draws and the picture where it does not; outside them, the picture untouched;
# no jar's shape more than 4 px below step 2's cut; and the dispenser's edge band against the picture itself: the hatch's face found
# again on the picture by fix8.py's rule (its frame line, its rows, in each row the face's left edge at the middle of its ramp),
# none of it inside the band, the band no more than 4 px into the books and nothing of it inside the housing in the hatch's rows.
# The tool's s4 runs in a temporary folder, which is removed with what it made there; writes s4check-<view>.json beside this
# script: hashes and counts only (the pictures stay on the records page). Generates nothing.
# Usage: python3 -I dry4on8.py <published folder> <view> <step-3 picture.png>
import glob, hashlib, json, os, subprocess, sys, tempfile, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); F, V, pic = os.path.abspath(sys.argv[1]), sys.argv[2], os.path.abspath(sys.argv[3])
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
M = json.load(open(glob.glob(os.path.join(F, 'room-b-pv6[b-e].json'))[0])); K = M['kit']['views'][V]; TOOL = os.path.join(F, M['kit']['tool']['file'])
rgb = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(int)
with tempfile.TemporaryDirectory(dir=D) as T:
    run = subprocess.run([sys.executable, '-I', TOOL, 's4', V, pic, os.path.join(T, 'dry')], cwd=T, capture_output=True, text=True)
    if run.returncode: sys.exit(f'STOP: the tool stopped: {run.stdout[-400:]}{run.stderr[-400:]}')
    out = json.loads(run.stdout); fi, fm = os.path.join(T, 'dry-S4-input.png'), os.path.join(T, 'dry-S4-mask.png')
    inp, mask = rgb(fi), np.asarray(Image.open(fm))
    made = {'inputFile': sha(fi), 'rawInputRGB': out['rawInputRGB'], 'maskFile': sha(fm), 'rawMaskAlpha': out['rawMaskAlpha'], 'prompt': out['prompt']['sha256']}
base = rgb(pic); g = np.asarray(Image.open(os.path.join(F, K['files']['guideS4']['published'])).convert('RGBA')); drawn = g[..., 3] == 255; guide = g[..., :3].astype(int)
place4 = np.asarray(Image.open(os.path.join(F, K['files']['place4']['published'])).convert('L')) > 127
split4 = np.asarray(Image.open(os.path.join(F, K['files']['split4']['published'])).convert('L'))
place = np.asarray(Image.open(os.path.join(F, K['files']['place']['published'])).convert('L')) > 127
diff = lambda a, b, m: int((np.abs(a - b).max(axis=2)[m] > 0).sum())
shapes = {n: {'px': int((split4 == gr).sum()), 'guideDrawnPx': int((drawn & (split4 == gr)).sum()), 'differingFromTheGuidePx': diff(inp, guide, drawn & (split4 == gr)),
              'differingFromThePicturePx': diff(inp, base, ~drawn & (split4 == gr))} for n, gr in K['split4'].items()}
H, W = place.shape; below = 0
for n, gr in K['split4'].items():   # the jars' tops: nothing more than 4 px below step 2's cut (its mask's first row from y 1000, column by column)
    if not n.endswith('jar top') and not n.endswith('flask top'): continue
    m = split4 == gr
    for x in np.where(m.any(axis=0))[0]:
        col = np.where(place[1000:1300, x])[0]; cut = 1000 + int(col[0]) if len(col) else -1
        below += int(m[:, x].sum()) if cut < 0 else int(m[cut + 5:, x].sum())
# the hatch's face on the picture, by fix8.py's rule
lum = 0.299 * base[..., 0] + 0.587 * base[..., 1] + 0.114 * base[..., 2]
frame = next(y for y in range(805, 867) if np.median(lum[y, 615:651]) < 60)
rows = [y for y in range(frame, 867) if np.median(lum[y, 615:651]) > 140]; face = np.zeros((H, W), bool)
for y in range(rows[0], rows[-1] + 1):
    hi = float(np.median(lum[y, 613:617])); hit = np.where(lum[y, 609:617] > (min(lum[y, 609], lum[y, 610]) + hi) / 2)[0]
    face[y, (int(hit[0]) + 609 if len(hit) else 617):680] = True
band = split4 == next(gr for n, gr in K['split4'].items() if n.endswith('left edge')); B_ = K['fix4']['band']; inside0 = int(np.floor(B_['side'] + 0.5))
edge = {'hatchFrameRow': frame, 'faceRows': [rows[0], rows[-1]], 'facePx': int(face.sum()), 'hatchFacePx': int((band & face).sum()),
        'intoTheBooksPx': int(max((band[y, :inside0]).sum() for y in range(H) if band[y].any())), 'insideTheHousingInTheHatchRowsPx': int(band[frame - 1:, inside0:].sum())}
rec = {'view': V, 'what': "s4's input on step 3's picture, made by the published folder's tool and checked (the Lead, 18 November); hashes and counts only",
       'picture': {'label': M['steps']['s4']['base']['picture'], 'sha256': sha(pic), 'asTheManifest': sha(pic) == M['steps']['s4']['base']['sha256']},
       'tool': {'file': M['kit']['tool']['file'], 'sha256': sha(TOOL)},
       's4': {**made, 'maskAsTheManifest': made['rawMaskAlpha'] == K['expected']['s4']['rawMaskAlpha'], 'promptAsTheManifest': made['prompt'] == K['prompts']['s4']['sha256']},
       'shapes': shapes, 'outside': {'px': int((~place4).sum()), 'differingFromThePicturePx': diff(inp, base, ~place4)},
       'jars': {'shapePxMoreThan4pxBelowTheCut': below}, 'edge': edge}
rec['pass'] = bool(rec['picture']['asTheManifest'] and rec['s4']['maskAsTheManifest'] and rec['s4']['promptAsTheManifest'] and len(shapes) == 4
                   and all(s['differingFromTheGuidePx'] == 0 and s['differingFromThePicturePx'] == 0 for s in shapes.values()) and rec['outside']['differingFromThePicturePx'] == 0
                   and below == 0 and edge['hatchFacePx'] == 0 and edge['intoTheBooksPx'] <= 4 and edge['insideTheHousingInTheHatchRowsPx'] == 0)
json.dump(rec, open(os.path.join(D, f's4check-{V}.json'), 'w'), indent=1)
print(json.dumps(rec, indent=1))
sys.exit(0 if rec['pass'] else 1)
