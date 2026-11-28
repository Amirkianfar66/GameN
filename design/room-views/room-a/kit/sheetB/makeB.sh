#!/usr/bin/env bash
# Sheet RA-B (Room A, view B), the whole build, as sheet RA-A's makeA.sh: the guides (guideB.mjs, rendered by render.cjs), the masks
# and kit (kitB.py), the manifest, prompts and publishing folder (buildB.mjs), the phone crops (cropsB.py), the colour check's
# calibration on the guides and on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunB.sh) and the page
# (sheetB.mjs). A render whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly first
# (scanfixA.py). Version 2 (on RA-B-2, from the records in _rec2/): first the guide's deck lines (linesB.mjs), RA-B-2's painted deck
# and the desk's floor fit (measureB2.py), and RA-B-2's painted features (featuresB2.py); the kit then runs the 15 px rule; the
# page's review pictures of RA-B-2 (overlayB2.py) are labelled as AI-generated. Version 3: RA-B-3c (compositeB3.py) and its labelled
# review pictures (reviewB3.py). Calls no service; generates nothing. Usage: bash makeB.sh
set -euo pipefail
cd "$(dirname "$0")"
node linesB.mjs > /dev/null
python3 -I measureB2.py > /dev/null
python3 -I featuresB2.py > /dev/null
node guideB.mjs > /dev/null
node render.cjs ra-B-empty.svg,ra-B-guide.svg,ra-B-guide-s2.svg,ra-B-regions.svg,ra-B-empty-regions.svg,ra-B-empty-annotated.svg,ra-B-furniture.svg,ra-B-stations.svg,ra-B-capsule.svg,ra-B-capsule-label.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-*.png
python3 -I kitB.py > /dev/null
node buildB.mjs > /dev/null
python3 -I cropsB.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-phone-*.png
# version 1.1: the before/after of the guide where the north wall meets the deck, for the page
python3 -I ../sheetV/beforeafter.py B > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-seams-*.png
# version 2: the review pictures of RA-B-2 (AI-generated, labelled), for the page
python3 -I overlayB2.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-2-*.png
# version 3: RA-B-3c, view B's step 2 completed in code (compositeB3.py, from the records in _rec3/), and its review pictures
# (reviewB3.py; AI-generated, labelled), for the page
python3 -I compositeB3.py _rec3 > /dev/null
python3 -I reviewB3.py _rec3 > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-B-3c-*.png
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
