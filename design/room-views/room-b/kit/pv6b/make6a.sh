#!/usr/bin/env bash
# Room B test page v5 (the room half of PV6-A), every step: check each input is the file picture.json names (the plate, the
# placed picture, the four layers and their records, camera report v4), colour-check both pictures with their maps, cut the
# skylight's mask from the plate's own black, lay out the scene (checked against the camera report), time the passers, put the
# four layers in depth bands, then build the page, capture the checks and frames, build again, and check the preview, which is
# the published page byte for byte (the publish wrapper read back from the artifact, skeleton.html). Generates no picture.
# After publishing, read every published file back (the Artifact tool) into one folder and run verify-published6a.sh on it.
set -euo pipefail
cd "$(dirname "$0")"
python3 -I - <<'PY'
import json, hashlib
q = json.load(open('people-files.json')); bad_people = [f for f, h in q['files'].items() if hashlib.sha256(open(f, 'rb').read()).hexdigest() != h]
if bad_people: raise SystemExit('the people files differ from people-files.json: ' + ', '.join(bad_people))
print(f"people: {len(q['files'])} files as the people page publishes them (version {q['version']})")
p = json.load(open('picture.json')); h = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest(); bad = []
want = [(p['plate']['file'], p['plate']['sha256']), ('_in/img/' + p['plate']['file'], p['plate']['sha256']), (p['placed']['file'], p['placed']['sha256']), ('_in/img/' + p['placed']['file'], p['placed']['sha256']),
        (p['plate']['record']['file'], p['plate']['record']['sha256']), (p['placed']['record']['file'], p['placed']['record']['sha256']), (p['layers']['record']['file'], p['layers']['record']['sha256']),
        (p['camera']['report'], p['camera']['sha256'])] + [(v['file'], v['sha256']) for v in p['layers']['pieces'].values()]
for f, s in want:
    if h(f) != s: bad.append(f)
lift = json.load(open(p['layers']['record']['file']))['pieces']
for st, v in p['layers']['pieces'].items():
    if lift[st]['sha256'] != v['sha256']: bad.append(f'{st} is not the layer the lift record names')
if bad: raise SystemExit('not the files picture.json names: ' + ', '.join(bad))
print(f'inputs: {len(want)} files as picture.json names them')
PY
python3 -I ../pv6/colour-check-v4.py PV6-A-2.png ../pv6/pv6-A-empty-regions.png --json colour-plate.json > /dev/null
python3 -I ../pv6/colour-check-v4.py PV6-A-3.png ../pv6/pv6-A-regions.png --json colour-placed.json > /dev/null
python3 -I masks6a.py > /dev/null
node export6a.mjs > /dev/null
node timing6a.mjs > /dev/null
python3 -I occlude6.py > /dev/null
node build6a.mjs
rm -rf _cover
node capture6a.cjs > _capture.log
python3 -I rendered-cover.py _cover > /dev/null
cp _cover/cover.json cover.json   # the page's readout shows who is in front of whom as measured
python3 -I tag-cover.py > /dev/null
node build6a.mjs
rm -rf _verify-local
node verify6a.cjs . _verify-local > /dev/null
python3 -I verify-fit6a.py _verify-local > /dev/null
python3 -I rendered-cover.py _verify-local > /dev/null
python3 -I verify-gate6a.py _verify-local
python3 -I -c "import json; c = json.load(open('checks.json')); o = json.load(open('occlusion.json')); m = json.load(open('masks.json'))
print('colour', 'pass' if json.load(open('colour-plate.json'))['pass'] and json.load(open('colour-placed.json'))['pass'] else 'FAIL', '| skylight mask IoU', m['skylight']['iou'], '| capture errors', c['errors'], '| layout issues', {k: v['issues'] for k, v in c['layout'].items()}, '| order', o['order'])"
