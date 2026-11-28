#!/usr/bin/env bash
# Sheet RA-D's dry run, as sheet RA-B's (dryrunB.sh), with sheet RA-A's step 3 (dryrunA.sh) where the manifest has it: the tool on
# the sheet's own published files, in a folder (by default pub/), every command once, with the code-drawn guides standing in for the
# image tool's pictures: the empty-room guide as the step-1 picture, step 2's guide as step 2's raw edit, and the guide as step 3's.
# Writes <folder>/_dry/ and its summary.json (hashes, shares and counts only). It shows the commands run and their outputs agree with
# the manifest; it says nothing about a real picture. Calls no service; generates nothing. Version 2.1: where the manifest has step 2b,
# its commands run with --stand-in on a code-drawn stand-in for RA-D-3x (which only the image session's records rebuild): the
# empty-room guide with the step-2 guide's desk and cabinet (step 2's PLACE mask but its hatch's area) and the two screens where
# step 2b's map puts them filled black; step 2's guide stands in for step 2b's raw edit. Version 2.3: where the manifest pins step 3's
# start to RA-D-3hc, step 3's commands run with --stand-in on step 2b's kept stand-in, and the guide stands in for step 3's raw edit.
# Usage: bash dryrunD.sh [folder]
set -euo pipefail
F="${1:-$(dirname "$0")/pub}"; cd "$F"; mkdir -p _dry; find _dry -mindepth 1 -delete
T="python3 -I rd1_tools.py"
G2=$(python3 -I -c "import json; print(json.load(open('room-a-ra-d.json'))['kit']['views']['D']['files']['guideS2']['published'])")
$T check > _dry/check.txt
$T s1 D _dry/D > _dry/s1.json
$T s2 D img/ra-D-empty.png _dry/D > _dry/s2.json
$T keep D img/ra-D-empty.png "$G2" _dry/D-kept2.png > _dry/keep.json
$T lift D img/ra-D-empty.png _dry/D-kept2.png _dry/D > _dry/lift.out
$T colours D 1 img/ra-D-empty.png _dry/D-step1 > _dry/colours1.json
$T colours D 2 _dry/D-kept2.png _dry/D-step2 > _dry/colours2.json
if python3 -I -c "import json, sys; sys.exit(0 if 's2b' in json.load(open('room-a-ra-d.json'))['kit']['views']['D']['prompts'] else 1)"; then
  python3 -I - <<'PY'
import importlib.util, json
import numpy as np
from PIL import Image
m = json.load(open('room-a-ra-d.json')); F = m['kit']['views']['D']['files']; L = lambda k, mode: np.array(Image.open(F[k]['published']).convert(mode))
empty, g2, place, p2b = L('empty', 'RGB'), L('guideS2', 'RGB'), L('place', 'L') > 127, L('place2b', 'L') > 127
regions, emap = L('regions2b', 'RGB').astype(int), L('emptyRegions', 'RGB').astype(int)
s = importlib.util.spec_from_file_location('lift5', 'lift5.py'); lift5 = importlib.util.module_from_spec(s); s.loader.exec_module(lift5)
lab, _ = lift5.parts(place); hatch_area = np.isin(lab, [v for v in np.unique(lab[p2b]) if v])
out = empty.copy(); keep = place & ~hatch_area; out[keep] = g2[keep]
mag = lambda a: np.abs(a - np.array((255, 0, 255))).max(axis=2) <= 8
out[mag(regions) & ~mag(emap)] = 0
Image.fromarray(out).save('_dry/standin-3x.png')
PY
  $T s2b D _dry/standin-3x.png _dry/D --stand-in > _dry/s2b.json
  $T keep2b D _dry/standin-3x.png "$G2" _dry/D-kept2b.png --stand-in > _dry/keep2b.json
  $T lift2b D _dry/standin-3x.png _dry/D-kept2b.png _dry/D --stand-in > _dry/lift2b.out
  $T colours D 2b _dry/D-kept2b.png _dry/D-step2b > _dry/colours2b.json
fi
if python3 -I -c "import json, sys; sys.exit(0 if 's3' in json.load(open('room-a-ra-d.json'))['kit']['views']['D']['prompts'] else 1)"; then
  S3START=_dry/D-kept2.png; S3SI=""
  if python3 -I -c "import json, sys; sys.exit(0 if json.load(open('room-a-ra-d.json'))['kit']['views']['D']['expected']['s3'].get('startPixels') else 1)"; then S3START=_dry/D-kept2b.png; S3SI=--stand-in; fi
  $T s3 D $S3START _dry/D $S3SI > _dry/s3.json
  $T keep3 D $S3START img/ra-D-guide.png _dry/D-kept3.png $S3SI > _dry/keep3.json
  $T lift3 D $S3START _dry/D-kept3.png _dry/D $S3SI > _dry/lift3.out
  $T colours D 3 _dry/D-kept3.png _dry/D-step3 > _dry/colours3.json
fi
python3 -I - <<'PY'
import hashlib, json, os
m = json.load(open('room-a-ra-d.json')); V = m['kit']['views']['D']; J = lambda f: json.load(open('_dry/' + f)); S3 = 's3' in V['prompts']; S2B = 's2b' in V['prompts']
ptxt = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
s2, k2, l2 = J('s2.json'), J('keep.json'), J('D-lift.json')
out = {'sheet': m['sheet'], 'version': m['version'], 'manifestSha256': ptxt('room-a-ra-d.json'), 'check': open('_dry/check.txt').read().strip().splitlines()[-1],
       'promptsAsManifest': {k: ptxt(f'_dry/D-S{k[1:]}-prompt.txt') == V['prompts'][k]['sha256'] for k in V['prompts']},
       's2': {'maskedShare': s2['maskedShare'], 'alphaAsExpected': s2['rawMaskAlpha'] == V['expected']['s2']['rawMaskAlpha'], 'keptOutsideMax': k2['moreThan4pxOutsideMask']['maxAbsDiff']},
       'lifted': {k: v['px'] for k, v in l2['pieces'].items()}, 'missing': l2['missing'],
       'colours': {str(n): J(f'colours{n}.json')['pass'] for n in ((1, 2, *(('2b',) if S2B else ()), 3) if S3 else (1, 2))}}
if S2B:
    s2b, k2b, l2b = J('s2b.json'), J('keep2b.json'), J('D-lift2b.json')
    out['s2b'] = {'maskedShare': s2b['maskedShare'], 'alphaAsExpected': s2b['rawMaskAlpha'] == V['expected']['s2b']['rawMaskAlpha'], 'keptOutsideMax': k2b['moreThan4pxOutsideMask']['maxAbsDiff'],
                  'standIn': bool(s2b['picture'].get('standIn')), 'baseIsRA-D-3x': s2b['picture']['isRA-D-3x']}
    out['lifted2b'] = {k: v['px'] for k, v in l2b['pieces'].items()}; out['missing2b'] = l2b['missing']
if S3:
    s3, k3, l3 = J('s3.json'), J('keep3.json'), J('D-lift3.json')
    out['s3'] = {'maskedShare': s3['maskedShare'], 'alphaAsExpected': s3['rawMaskAlpha'] == V['expected']['s3']['rawMaskAlpha'], 'keptOutsideMax': k3['moreThan4pxOutsideMask']['maxAbsDiff']}
    if V['expected']['s3'].get('startPixels'): out['s3'].update({'pinned': True, 'standIn': bool(s3['picture'].get('standIn')), 'startIsRA-D-3hc': s3['picture'].get('isRA-D-3hc')})
    out['lifted3'] = {k: v['px'] for k, v in l3['pieces'].items()}; out['missing3'] = l3['missing']
json.dump(out, open('_dry/summary.json', 'w'), indent=1); print(json.dumps(out))
PY
