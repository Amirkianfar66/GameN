#!/usr/bin/env bash
# Sheet RA-E (Room A, view E), the whole build, as sheet RA-B's makeB.sh: the guides (guideE.mjs, rendered by render.cjs), the
# masks and kit (kitE.py), the manifest, prompts and publishing folder (buildE.mjs), the phone crops (cropsE.py), the colour
# check's calibration on the guides and on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunE.sh) and the page
# (sheetE.mjs). A render whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly first
# (scanfixA.py). Calls no service; generates nothing. Usage: bash makeE.sh
set -euo pipefail
cd "$(dirname "$0")"
if [ -e linesE.mjs ]; then node linesE.mjs > /dev/null; fi   # version 2: the guide's own lines on the deck
if [ -e windowE2.py ]; then python3 -I windowE2.py > /dev/null; fi   # version 2: the step-1 picture's painted window, for steps 2 and 3's map
if [ -e measureE2.py ]; then python3 -I measureE2.py > /dev/null; fi   # version 2: the step-1 picture's painted deck, the floor fit, the feet
node guideE.mjs > /dev/null
node render.cjs ra-E-empty.svg,ra-E-guide.svg,ra-E-guide-s2.svg,ra-E-regions.svg,ra-E-empty-regions.svg,ra-E-empty-annotated.svg,ra-E-furniture.svg,ra-E-stations.svg,ra-E-capsule.svg,ra-E-capsule-label.svg,ra-E-own.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-E-*.png
if [ -e featuresE2.py ]; then python3 -I featuresE2.py > /dev/null; fi   # version 2: the step-1 picture's painted features
python3 -I kitE.py > /dev/null
if [ -e checkE2.py ]; then python3 -I checkE2.py > /dev/null; fi   # version 2: the view's own checks on the final masks
node buildE.mjs > /dev/null
python3 -I cropsE.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-E-phone-*.png
# version 1.1: the before/after of the guide, for the page, in the views with the slant treatment (B and E)
python3 -I ../sheetV/beforeafter.py E > /dev/null
if [ -e ra-E-seams-v11.png ]; then python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-E-seams-*.png; fi
# version 2: the review pictures of the accepted step-1 picture (AI-generated, labelled), for the page; the view's zooms first, where a
# script makes them from its measured files (zoomsE2.py)
if [ -e zoomsE2.py ]; then python3 -I zoomsE2.py > /dev/null; fi
python3 -I ../sheetV/overlayV2.py E > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-E-[0-9]-*.png
python3 -I colour-check-ra1.py ra-E-empty.png ra-E-empty-regions.png --json _cal-empty.json > /dev/null
python3 -I colour-check-ra1.py ra-E-guide.png ra-E-regions.png --json _cal-guide.json > /dev/null
python3 -I colour-check-ra1.py ../../roomb/pv8/pub-B/img/pv6-B-empty.png ../../roomb/pv8/pub-B/img/pv6-B-empty-regions.png --json _cal-roomb.json > /dev/null || true
bash dryrunE.sh > /dev/null
# version 3, where a kept step-2 picture was completed in code: the composite, its review pictures and their byte scan (v3make-E.sh)
if [ -e v3make-E.sh ]; then bash v3make-E.sh; fi
node sheetE.mjs
python3 -I - <<'PY'
import json
s = json.load(open('pub/_dry/summary.json')); e, g, b = (json.load(open(f'_cal-{k}.json')) for k in ('empty', 'guide', 'roomb'))
print('dry run:', s['check'], '| prompts', all(s['promptsAsManifest'].values()), '| alpha', s['s2']['alphaAsExpected'], s.get('s3', {}).get('alphaAsExpected', '-'), '| lifted', len(s['lifted']), 'missing', s['missing'], '| lifted3', len(s.get('lifted3', {})), 'missing3', s.get('missing3', '-'), '| colours', s['colours'])
print('colour check: empty guide', e['pass'], '| guide', g['pass'], "| Room B's guide", b['pass'], [k for k, v in b['result'].items() if not v])
PY
