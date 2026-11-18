# C's version 7 (the Lead, 18 November): s3's input made on the accepted step-2 picture by the published folder's own tool, and
# checked: inside each of step 3's shapes the guide exactly; outside them the step-2 picture untouched, the cart's lift (its glass
# jars) included, and none of the lift's solid pixels (alpha above 127) inside a shape; no lit teal left inside the strips (the
# lit teal of strips8.py: G > R + 35, B > R + 25, G > 110). The tool's s3 runs in a temporary folder, which is removed with what it
# made there; writes s3check-<view>.json beside this script: hashes and counts only (the pictures stay on the records page).
# Generates nothing. Usage: python3 -I dry3on8.py <published folder> <view> <step-2 picture.png> <the cart's lift.png>
import glob, hashlib, json, os, subprocess, sys, tempfile, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); F, V, pic, lift = os.path.abspath(sys.argv[1]), sys.argv[2], os.path.abspath(sys.argv[3]), os.path.abspath(sys.argv[4])
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
M = json.load(open(glob.glob(os.path.join(F, 'room-b-pv6[b-e].json'))[0])); K = M['kit']['views'][V]; TOOL = os.path.join(F, M['kit']['tool']['file'])
rgb = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(int)
with tempfile.TemporaryDirectory(dir=D) as T:
    run = subprocess.run([sys.executable, '-I', TOOL, 's3', V, pic, os.path.join(T, 'dry')], cwd=T, capture_output=True, text=True)
    if run.returncode: sys.exit(f'STOP: the tool stopped: {run.stdout[-400:]}{run.stderr[-400:]}')
    out = json.loads(run.stdout); fi, fm = os.path.join(T, 'dry-S3-input.png'), os.path.join(T, 'dry-S3-mask.png')
    inp, mask = rgb(fi), np.asarray(Image.open(fm))
    made = {'inputFile': sha(fi), 'rawInputRGB': out['rawInputRGB'], 'maskFile': sha(fm), 'rawMaskAlpha': out['rawMaskAlpha'], 'prompt': out['prompt']['sha256']}
base, guide = rgb(pic), rgb(os.path.join(F, K['files']['guide']['published']))
place3 = np.asarray(Image.open(os.path.join(F, K['files']['place3']['published'])).convert('L')) > 127
split3 = np.asarray(Image.open(os.path.join(F, K['files']['split3']['published'])).convert('L'))
diff = lambda a, b, m: int((np.abs(a - b).max(axis=2)[m] > 0).sum())
shapes = {n: {'px': int((split3 == g).sum()), 'differingFromTheGuidePx': diff(inp, guide, split3 == g)} for n, g in K['split3'].items()}
la = np.asarray(Image.open(lift).convert('RGBA'))[..., 3]; solid = la > 127
R, G, B = inp[..., 0], inp[..., 1], inp[..., 2]; teal = (G > R + 35) & (B > R + 25) & (G > 110)
strips = {n: int((teal & (split3 == g)).sum()) for n, g in K['split3'].items() if n.startswith('wall vent strip')}
rec = {'view': V, 'what': "s3's input on the accepted step-2 picture, made by the published folder's tool and checked (the Lead, 18 November); hashes and counts only",
       'picture': {'label': M['steps']['s3']['base']['picture'], 'sha256': sha(pic), 'asTheManifest': sha(pic) == M['steps']['s3']['base']['sha256']},
       'cartLift': {'sha256': sha(lift), 'asTheTrim': sha(lift) == K['trim3']['source']['cartLift']['sha256']}, 'tool': {'file': M['kit']['tool']['file'], 'sha256': sha(TOOL)},
       's3': {**made, 'maskAsTheManifest': made['rawMaskAlpha'] == K['expected']['s3']['rawMaskAlpha'], 'promptAsTheManifest': made['prompt'] == K['prompts']['s3']['sha256']},
       'shapes': shapes, 'outside': {'px': int((~place3).sum()), 'differingFromThePicturePx': diff(inp, base, ~place3)},
       'jars': {'liftPx': int((la > 0).sum()), 'liftSolidPx': int(solid.sum()), 'solidInsideTheShapesPx': int((solid & place3).sum()), 'liftOutsideTheShapesDifferingPx': diff(inp, base, (la > 0) & ~place3)},
       'strips': {'litTealPx': strips}}
rec['pass'] = bool(rec['picture']['asTheManifest'] and rec['cartLift']['asTheTrim'] and rec['s3']['maskAsTheManifest'] and rec['s3']['promptAsTheManifest'] and all(s['differingFromTheGuidePx'] == 0 for s in shapes.values())
                   and rec['outside']['differingFromThePicturePx'] == 0 and rec['jars']['solidInsideTheShapesPx'] == 0 and rec['jars']['liftOutsideTheShapesDifferingPx'] == 0 and len(strips) == 2 and not any(strips.values()))
json.dump(rec, open(os.path.join(D, f's3check-{V}.json'), 'w'), indent=1)
print(json.dumps(rec, indent=1))
sys.exit(0 if rec['pass'] else 1)
