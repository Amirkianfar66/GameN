#!/usr/bin/env bash
# Sheet RA-A's dry run: the tool on the sheet's own published files, in a folder (by default pub/), every command once, with the
# code-drawn guides standing in for the image tool's pictures: the empty-room guide as the step-1 picture, the step-2 guide as
# step 2's raw edit and the guide as step 3's. Writes <folder>/_dry/ and its summary.json (hashes, shares and counts only). It shows
# the commands run and their outputs agree with the manifest; it says nothing about a real picture. Version 3: the stand-ins are
# the same inside step 2's plain-wall area (only a real step-2 picture repaints RA-A-1's wall there), so the lift finds nothing for
# that piece: the summary expects it missing, and nothing else. Version 6: where the folder holds step 4's kit, step 4 with the tool's
# version 2 (ra2_tools.py), the guide standing in for its raw edit. Calls no service; generates nothing. Usage: bash dryrunA.sh [folder]
set -euo pipefail
F="${1:-$(dirname "$0")/pub}"; cd "$F"; rm -rf _dry; mkdir _dry
T="python3 -I ra1_tools.py"
$T check > _dry/check.txt
$T s1 A _dry/A > _dry/s1.json
$T s2 A img/ra-A-empty.png _dry/A > _dry/s2.json
$T keep A img/ra-A-empty.png img/ra-A-guide-s2.png _dry/A-kept2.png > _dry/keep.json
$T lift A img/ra-A-empty.png _dry/A-kept2.png _dry/A > _dry/lift.out || true   # the plain wall's layer is expected missing here
$T s3 A _dry/A-kept2.png _dry/A > _dry/s3.json
$T keep3 A _dry/A-kept2.png img/ra-A-guide.png _dry/A-kept3.png > _dry/keep3.json
$T lift3 A _dry/A-kept2.png _dry/A-kept3.png _dry/A > _dry/lift3.out
$T colours A 1 img/ra-A-empty.png _dry/A-step1 > _dry/colours1.json
$T colours A 2 _dry/A-kept2.png _dry/A-step2 > _dry/colours2.json
$T colours A 3 _dry/A-kept3.png _dry/A-step3 > _dry/colours3.json
if [ -f room-a-ra-a-s4.json ]; then   # version 6: step 4, with the tool's version 2, the guide standing in for step 4's raw edit
  T2="python3 -I ra2_tools.py"
  $T2 check > _dry/check2.txt
  $T2 s4 A _dry/A-kept3.png _dry/A > _dry/s4.json
  $T2 keep4 A _dry/A-kept3.png img/ra-A-guide.png _dry/A-kept4.png > _dry/keep4.json
  $T2 lift4 A img/ra-A-empty.png _dry/A-kept4.png _dry/A > _dry/lift4.out
  $T2 frame4 A _dry/A-kept4.png _dry/A > _dry/frame4.out
  $T2 colours A 4 _dry/A-kept4.png _dry/A-step4 > _dry/colours4.json
fi
python3 -I - <<'PY'
import hashlib, json
m = json.load(open('room-a-ra-a.json')); V = m['kit']['views']['A']; J = lambda f: json.load(open('_dry/' + f))
s1, s2, s3, k2, k3 = J('s1.json'), J('s2.json'), J('s3.json'), J('keep.json'), J('keep3.json'); l2, l3 = J('A-lift.json'), J('A-lift3.json')
ptxt = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
out = {'sheet': m['sheet'], 'version': m['version'], 'manifestSha256': ptxt('room-a-ra-a.json'), 'check': open('_dry/check.txt').read().strip().splitlines()[-1],
       'promptsAsManifest': {k: ptxt(f'_dry/A-S{k[1]}-prompt.txt') == V['prompts'][k]['sha256'] for k in ('s1', 's2', 's3')},
       's2': {'maskedShare': s2['maskedShare'], 'alphaAsExpected': s2['rawMaskAlpha'] == V['expected']['s2']['rawMaskAlpha'], 'keptOutsideMax': k2['moreThan4pxOutsideMask']['maxAbsDiff']},
       's3': {'maskedShare': s3['maskedShare'], 'alphaAsExpected': s3['rawMaskAlpha'] == V['expected']['s3']['rawMaskAlpha'], 'keptOutsideMax': k3['moreThan4pxOutsideMask']['maxAbsDiff']},
       'lifted': {k: v['px'] for k, v in l2['pieces'].items()}, 'missing': l2['missing'], 'lifted3': {k: v['px'] for k, v in l3['pieces'].items()}, 'missing3': l3['missing'],
       'missingExpected': [k for k, g in V['split'].items() if g == min(V['split'].values()) and any(p.get('kind') == 'background' and f"{p['place']} {p['name']}" == k for p in m['pieces']['step2'])],
       'colours': {s: J(f'colours{s}.json')['pass'] for s in ('1', '2', '3')}}
import os
if os.path.exists('room-a-ra-a-s4.json'):   # version 6: step 4
    S = json.load(open('room-a-ra-a-s4.json')); s4, k4, l4, f4 = J('s4.json'), J('keep4.json'), J('A-lift4.json'), J('A-frame4.json')
    out['s4'] = {'kitSha256': ptxt('room-a-ra-a-s4.json'), 'check2': open('_dry/check2.txt').read().strip().splitlines()[-1], 'promptAsKit': ptxt('_dry/A-S4-prompt.txt') == S['prompts']['s4']['sha256'],
                 'maskedShare': s4['maskedShare'], 'alphaAsExpected': s4['rawMaskAlpha'] == S['expected']['s4']['rawMaskAlpha'], 'keptOutsideMax': k4['moreThan4pxOutsideMask']['maxAbsDiff'],
                 'lifted4': {k: v['px'] for k, v in l4['pieces'].items()}, 'missing4': l4['missing'], 'frame4': {'edgeX': f4['frameOuterEdgeX'], 'pass': f4['pass']}, 'colours4': J('colours4.json')['pass']}
json.dump(out, open('_dry/summary.json', 'w'), indent=1); print(json.dumps(out, indent=1))
PY
