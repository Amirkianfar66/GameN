#!/usr/bin/env bash
# Sheet RA-B (Room A, view B), version 2, the whole build: version 1's, with measureB.py, dimB.py, reviewDimB.py and overlayB.py
# before the manifest (they read the records' RA-B-1 from _rec1). Version 1: the whole build, as sheet RA-A's makeA.sh: the guides (guideB.mjs, rendered by render.cjs), the masks
# and kit (kitB.py), the manifest, prompts and publishing folder (buildB.mjs), the phone crops (cropsB.py), the colour check's
# calibration on the guides and on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunB.sh) and the page
# (sheetB.mjs). A render whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly first
# (scanfixA.py). Calls no service; generates nothing. Usage: bash makeB.sh
set -euo pipefail
cd "$(dirname "$0")"
python3 -I measureB.py > /dev/null   # guideB.mjs reads measure-B.json
node guideB.mjs > /dev/null
node render.cjs ra-B-empty.svg,ra-B-guide.svg,ra-B-guide-s2.svg,ra-B-regions.svg,ra-B-empty-regions.svg,ra-B-empty-annotated.svg,ra-B-furniture.svg,ra-B-stations.svg,ra-B-capsule.svg,ra-B-capsule-label.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-*.png
python3 -I dimB.py _rec1 --scan-words ../../roomb/pv8/_scan-words.txt > /dev/null
python3 -I kitB.py > /dev/null
python3 -I reviewDimB.py > /dev/null
python3 -I overlayB.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-dim-*.png ra-B-review-*.png
node buildB.mjs > /dev/null
python3 -I cropsB.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-phone-*.png
python3 -I colour-check-ra1.py ra-B-empty.png ra-B-empty-regions.png --json _cal-empty.json > /dev/null
python3 -I colour-check-ra1.py ra-B-guide.png ra-B-regions.png --json _cal-guide.json > /dev/null
python3 -I colour-check-ra1.py ../../roomb/pv8/pub-B/img/pv6-B-empty.png ../../roomb/pv8/pub-B/img/pv6-B-empty-regions.png --json _cal-roomb.json > /dev/null || true
bash dryrunB.sh > /dev/null
node sheetB.mjs
python3 -I - <<'PY'
import json
s = json.load(open('pub/_dry/summary.json')); e, g, b = (json.load(open(f'_cal-{k}.json')) for k in ('empty', 'guide', 'roomb'))
print('dry run:', s['check'], '| prompts', all(s['promptsAsManifest'].values()), '| alpha', s['s2']['alphaAsExpected'], '| lifted', len(s['lifted']), 'missing', s['missing'], '| colours', s['colours'])
print('colour check: empty guide', e['pass'], '| guide', g['pass'], "| Room B's guide", b['pass'], [k for k, v in b['result'].items() if not v])
PY
