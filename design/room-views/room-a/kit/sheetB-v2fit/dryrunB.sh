#!/usr/bin/env bash
# Sheet RA-B's dry run, as sheet RA-A's: the tool on the sheet's own published files, in a folder (by default pub/), every command
# once, with the code-drawn guides standing in for the image tool's pictures: the empty-room guide as the step-1 picture and the
# guide as step 2's raw edit. Writes <folder>/_dry/ and its summary.json (hashes, shares and counts only). It shows the commands run
# and their outputs agree with the manifest; it says nothing about a real picture. Calls no service; generates nothing.
# Usage: bash dryrunB.sh [folder]
set -euo pipefail
F="${1:-$(dirname "$0")/pub}"; cd "$F"; mkdir -p _dry; find _dry -mindepth 1 -delete
T="python3 -I rb1_tools.py"
$T check > _dry/check.txt
$T s1 B _dry/B > _dry/s1.json
$T s2 B img/ra-B-empty.png _dry/B > _dry/s2.json
$T keep B img/ra-B-empty.png img/ra-B-guide.png _dry/B-kept2.png > _dry/keep.json
$T lift B img/ra-B-empty.png _dry/B-kept2.png _dry/B > _dry/lift.out
$T colours B 1 img/ra-B-empty.png _dry/B-step1 > _dry/colours1.json
$T colours B 2 _dry/B-kept2.png _dry/B-step2 > _dry/colours2.json
python3 -I - <<'PY'
import hashlib, json
m = json.load(open('room-a-ra-b.json')); V = m['kit']['views']['B']; J = lambda f: json.load(open('_dry/' + f))
s2, k2, l2 = J('s2.json'), J('keep.json'), J('B-lift.json')
ptxt = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
out = {'sheet': m['sheet'], 'version': m['version'], 'manifestSha256': ptxt('room-a-ra-b.json'), 'check': open('_dry/check.txt').read().strip().splitlines()[-1],
       'promptsAsManifest': {k: ptxt(f'_dry/B-S{k[1]}-prompt.txt') == V['prompts'][k]['sha256'] for k in ('s1', 's2')},
       's2': {'maskedShare': s2['maskedShare'], 'alphaAsExpected': s2['rawMaskAlpha'] == V['expected']['s2']['rawMaskAlpha'], 'keptOutsideMax': k2['moreThan4pxOutsideMask']['maxAbsDiff']},
       'lifted': {k: v['px'] for k, v in l2['pieces'].items()}, 'missing': l2['missing'],
       'colours': {str(n): J(f'colours{n}.json')['pass'] for n in (1, 2)}}
json.dump(out, open('_dry/summary.json', 'w'), indent=1); print(json.dumps(out))
PY
