#!/usr/bin/env bash
# A dry run of a PV6-B to PV6-E sheet (version 2)'s tool from a folder holding the sheet's published files: check, s1 (both prompts), same, s2
# (both prompts), keep and lift, with the empty-room guide standing in for the step-1 picture and step 2's own input standing in for
# the masked edit (so the "pieces" are the guide's own flat stations). It shows the tool runs end to end on the published files and
# that the prompts, inputs and PLACE mask match the manifest (the tool stops otherwise); same on the guide gives the guide's own
# numbers against PV6-A-2, not a test of a picture. Calls no service; generates nothing. Usage: bash dryrun8.sh <folder> <view>
set -euo pipefail
# Version 4 (B and C): the tool the manifest names (pv8_tools.py), and step 3 on the dry step-2 picture: s3, keep3 (its own input standing
# in for the edit) and lift3, so the capsule comes off as its own piece. C's version 8: the tool's version 3 (pv9_tools.py) and step 4 on the
# dry step-3 picture likewise: s4, keep4 and lift4.
F="$(cd "$1" && pwd)"; X="$2"; OUT="$F/_dry"; mkdir -p "$OUT"; G="$F/img/pv6-$X-empty.png"
T="$F/$(python3 -I -c 'import glob, json, sys; print(json.load(open(glob.glob(sys.argv[1] + "/room-b-pv6[b-e].json")[0]))["kit"]["tool"]["file"])' "$F")"
S3=$(python3 -I -c 'import glob, json, sys; print(1 if "place3" in json.load(open(glob.glob(sys.argv[1] + "/room-b-pv6[b-e].json")[0]))["kit"]["views"][sys.argv[2]]["files"] else 0)' "$F" "$X")
S4=$(python3 -I -c 'import glob, json, sys; print(1 if "place4" in json.load(open(glob.glob(sys.argv[1] + "/room-b-pv6[b-e].json")[0]))["kit"]["views"][sys.argv[2]]["files"] else 0)' "$F" "$X")
python3 -I "$T" check > "$OUT/check.txt"
python3 -I "$T" s1 "$X" "$OUT/dry-$X" > "$OUT/$X-s1.json"
python3 -I "$T" s1 "$X" "$OUT/dry-$X-one" --one-input > "$OUT/$X-s1-one.json"
python3 -I "$T" same "$X" "$G" "$OUT/dry-$X" > "$OUT/$X-same.out" || true
python3 -I "$T" s2 "$X" "$G" "$OUT/dry-$X" > "$OUT/$X-s2.json"
python3 -I "$T" s2 "$X" "$G" "$OUT/dry-$X-one" --one-input > "$OUT/$X-s2-one.json"
python3 -I "$T" keep "$X" "$G" "$OUT/dry-$X-S2-input.png" "$OUT/dry-$X-s2.png" > "$OUT/$X-keep.json"
python3 -I "$T" lift "$X" "$G" "$OUT/dry-$X-s2.png" "$OUT/dry-$X" > "$OUT/$X-lift.out" || true
if [ "$S3" = 1 ]; then
  python3 -I "$T" s3 "$X" "$OUT/dry-$X-s2.png" "$OUT/dry-$X" > "$OUT/$X-s3.json"
  python3 -I "$T" keep3 "$X" "$OUT/dry-$X-s2.png" "$OUT/dry-$X-S3-input.png" "$OUT/dry-$X-s3.png" > "$OUT/$X-keep3.json"
  python3 -I "$T" lift3 "$X" "$OUT/dry-$X-s2.png" "$OUT/dry-$X-s3.png" "$OUT/dry-$X" > "$OUT/$X-lift3.out" || true
fi
if [ "$S4" = 1 ]; then   # C's version 8: step 4 on the dry step-3 picture, its own input standing in for the fix
  python3 -I "$T" s4 "$X" "$OUT/dry-$X-s3.png" "$OUT/dry-$X" > "$OUT/$X-s4.json"
  python3 -I "$T" keep4 "$X" "$OUT/dry-$X-s3.png" "$OUT/dry-$X-S4-input.png" "$OUT/dry-$X-s4.png" > "$OUT/$X-keep4.json"
  python3 -I "$T" lift4 "$X" "$OUT/dry-$X-s3.png" "$OUT/dry-$X-s4.png" "$OUT/dry-$X" > "$OUT/$X-lift4.out" || true
fi
python3 -I - "$OUT" "$F" "$X" <<'PY'
import glob, json, os, sys
O, F, X = sys.argv[1], sys.argv[2], sys.argv[3]; V = json.load(open(glob.glob(os.path.join(F, 'room-b-pv6[b-e].json'))[0]))['kit']['views'][X]
s1, s1o = json.load(open(f'{O}/{X}-s1.json')), json.load(open(f'{O}/{X}-s1-one.json')); s2, s2o = json.load(open(f'{O}/{X}-s2.json')), json.load(open(f'{O}/{X}-s2-one.json'))
kp, lf, sm = json.load(open(f'{O}/{X}-keep.json')), json.load(open(f'{O}/dry-{X}-lift.json')), json.load(open(f'{O}/dry-{X}-same.json'))
row = {'s1PromptsAsManifest': s1['prompt']['sha256'] == V['prompts']['s1']['sha256'] and s1o['prompt']['sha256'] == V['prompts']['s1-one']['sha256'],
       's1Inputs': [i['file'] for i in s1['inputs']], 's1OneInputs': [i['file'] for i in s1o['inputs']], 's1InputAsManifest': s1['inputs'][0]['sha256'] == V['files']['empty']['sha256'],
       's2AlphaAsExpected': s2['rawMaskAlpha'] == V['expected']['s2']['rawMaskAlpha'], 's2PromptsAsManifest': s2['prompt']['sha256'] == V['prompts']['s2']['sha256'] and s2o['prompt']['sha256'] == V['prompts']['s2-one']['sha256'],
       's2Share': s2['maskedShare'], 's2Inputs': [i['file'] for i in s2['inputs']], 'keptOutsideMask': kp['moreThan4pxOutsideMask'],
       'lifted': {k: v['shareOfItsOutline'] for k, v in lf['pieces'].items()}, 'missing': lf['missing'], 'rebuildMeanAbsDiff': lf['rebuildMeanAbsDiff'],
       'sameOnTheGuide': {'pass': sm['pass'], 'gates': sm['gates'], 'shared': {k: v for k, v in sm['sharedSurfaces'].items() if k != 'note'}}}
if os.path.exists(f'{O}/{X}-s3.json'):   # version 4: step 3
    s3, k3, l3 = json.load(open(f'{O}/{X}-s3.json')), json.load(open(f'{O}/{X}-keep3.json')), json.load(open(f'{O}/dry-{X}-lift3.json'))
    row |= {'s3AlphaAsExpected': s3['rawMaskAlpha'] == V['expected']['s3']['rawMaskAlpha'], 's3PromptAsManifest': s3['prompt']['sha256'] == V['prompts']['s3']['sha256'] == V['prompts']['s3-one']['sha256'],
            's3Share': s3['maskedShare'], 's3Inputs': [i['file'] for i in s3['inputs']], 'kept3OutsideMask': k3['moreThan4pxOutsideMask'],
            'lifted3': {k: v['shareOfItsOutline'] for k, v in l3['pieces'].items()}, 'missing3': l3['missing'], 'rebuild3MeanAbsDiff': l3['rebuildMeanAbsDiff']}
if os.path.exists(f'{O}/{X}-s4.json'):   # C's version 8: step 4
    s4, k4, l4 = json.load(open(f'{O}/{X}-s4.json')), json.load(open(f'{O}/{X}-keep4.json')), json.load(open(f'{O}/dry-{X}-lift4.json'))
    row |= {'s4AlphaAsExpected': s4['rawMaskAlpha'] == V['expected']['s4']['rawMaskAlpha'], 's4PromptAsManifest': s4['prompt']['sha256'] == V['prompts']['s4']['sha256'] == V['prompts']['s4-one']['sha256'],
            's4Share': s4['maskedShare'], 's4Inputs': [i['file'] for i in s4['inputs']], 'kept4OutsideMask': k4['moreThan4pxOutsideMask'],
            'lifted4': {k: v['shareOfItsOutline'] for k, v in l4['pieces'].items()}, 'small4': {k: v['changedPx'] for k, v in l4['belowTheRecipesSize'].items()}, 'missing4': l4['missing'], 'rebuild4MeanAbsDiff': l4['rebuildMeanAbsDiff']}
json.dump(row, open(f'{O}/summary.json', 'w'), indent=1); print(json.dumps(row, indent=1))
PY
