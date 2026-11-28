#!/usr/bin/env bash
# Sheet RA-@V@'s dry run, as sheet RA-B's (dryrunB.sh), with sheet RA-A's step 3 (dryrunA.sh) where the manifest has it: the tool on
# the sheet's own published files, in a folder (by default pub/), every command once, with the code-drawn guides standing in for the
# image tool's pictures: the empty-room guide as the step-1 picture, step 2's guide as step 2's raw edit, and the guide as step 3's.
# Writes <folder>/_dry/ and its summary.json (hashes, shares and counts only). It shows the commands run and their outputs agree with
# the manifest; it says nothing about a real picture. Calls no service; generates nothing.
# Usage: bash dryrun@V@.sh [folder]
set -euo pipefail
F="${1:-$(dirname "$0")/pub}"; cd "$F"; mkdir -p _dry; find _dry -mindepth 1 -delete
T="python3 -I r@v@1_tools.py"
G2=$(python3 -I -c "import json; print(json.load(open('room-a-ra-@v@.json'))['kit']['views']['@V@']['files']['guideS2']['published'])")
$T check > _dry/check.txt
$T s1 @V@ _dry/@V@ > _dry/s1.json
$T s2 @V@ img/ra-@V@-empty.png _dry/@V@ > _dry/s2.json
$T keep @V@ img/ra-@V@-empty.png "$G2" _dry/@V@-kept2.png > _dry/keep.json
$T lift @V@ img/ra-@V@-empty.png _dry/@V@-kept2.png _dry/@V@ > _dry/lift.out
$T colours @V@ 1 img/ra-@V@-empty.png _dry/@V@-step1 > _dry/colours1.json
$T colours @V@ 2 _dry/@V@-kept2.png _dry/@V@-step2 > _dry/colours2.json
if python3 -I -c "import json, sys; sys.exit(0 if 's3' in json.load(open('room-a-ra-@v@.json'))['kit']['views']['@V@']['prompts'] else 1)"; then
  $T s3 @V@ _dry/@V@-kept2.png _dry/@V@ > _dry/s3.json
  $T keep3 @V@ _dry/@V@-kept2.png img/ra-@V@-guide.png _dry/@V@-kept3.png > _dry/keep3.json
  $T lift3 @V@ _dry/@V@-kept2.png _dry/@V@-kept3.png _dry/@V@ > _dry/lift3.out
  $T colours @V@ 3 _dry/@V@-kept3.png _dry/@V@-step3 > _dry/colours3.json
fi
python3 -I - <<'PY'
import hashlib, json, os
m = json.load(open('room-a-ra-@v@.json')); V = m['kit']['views']['@V@']; J = lambda f: json.load(open('_dry/' + f)); S3 = 's3' in V['prompts']
ptxt = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
s2, k2, l2 = J('s2.json'), J('keep.json'), J('@V@-lift.json')
out = {'sheet': m['sheet'], 'version': m['version'], 'manifestSha256': ptxt('room-a-ra-@v@.json'), 'check': open('_dry/check.txt').read().strip().splitlines()[-1],
       'promptsAsManifest': {k: ptxt(f'_dry/@V@-S{k[1]}-prompt.txt') == V['prompts'][k]['sha256'] for k in V['prompts']},
       's2': {'maskedShare': s2['maskedShare'], 'alphaAsExpected': s2['rawMaskAlpha'] == V['expected']['s2']['rawMaskAlpha'], 'keptOutsideMax': k2['moreThan4pxOutsideMask']['maxAbsDiff']},
       'lifted': {k: v['px'] for k, v in l2['pieces'].items()}, 'missing': l2['missing'],
       'colours': {str(n): J(f'colours{n}.json')['pass'] for n in ((1, 2, 3) if S3 else (1, 2))}}
if S3:
    s3, k3, l3 = J('s3.json'), J('keep3.json'), J('@V@-lift3.json')
    out['s3'] = {'maskedShare': s3['maskedShare'], 'alphaAsExpected': s3['rawMaskAlpha'] == V['expected']['s3']['rawMaskAlpha'], 'keptOutsideMax': k3['moreThan4pxOutsideMask']['maxAbsDiff']}
    out['lifted3'] = {k: v['px'] for k, v in l3['pieces'].items()}; out['missing3'] = l3['missing']
json.dump(out, open('_dry/summary.json', 'w'), indent=1); print(json.dumps(out))
PY
