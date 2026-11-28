#!/usr/bin/env bash
# Sheet RA-C (Room A, view C), the whole build, as sheet RA-B's makeB.sh: the guides (guideC.mjs, rendered by render.cjs), the
# masks and kit (kitC.py), the manifest, prompts and publishing folder (buildC.mjs), the phone crops (cropsC.py), the colour
# check's calibration on the guides and on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunC.sh) and the page
# (sheetC.mjs). A render whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly first
# (scanfixA.py). Calls no service; generates nothing. Usage: bash makeC.sh
set -euo pipefail
cd "$(dirname "$0")"
if [ -e linesC.mjs ]; then node linesC.mjs > /dev/null; fi   # version 2: the guide's own lines on the deck
if [ -e windowC2.py ]; then python3 -I windowC2.py > /dev/null; fi   # version 2: the step-1 picture's painted window, for steps 2 and 3's map
if [ -e measureC2.py ]; then python3 -I measureC2.py > /dev/null; fi   # version 2: the step-1 picture's painted deck, the floor fit, the feet
node guideC.mjs > /dev/null
node render.cjs ra-C-empty.svg,ra-C-guide.svg,ra-C-guide-s2.svg,ra-C-regions.svg,ra-C-empty-regions.svg,ra-C-empty-annotated.svg,ra-C-furniture.svg,ra-C-stations.svg,ra-C-capsule.svg,ra-C-capsule-label.svg,ra-C-own.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-C-*.png
if [ -e featuresC2.py ]; then python3 -I featuresC2.py > /dev/null; fi   # version 2: the step-1 picture's painted features
python3 -I kitC.py > /dev/null
if [ -e checkC2.py ]; then python3 -I checkC2.py > /dev/null; fi   # version 2: the view's own checks on the final masks
node buildC.mjs > /dev/null
python3 -I cropsC.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-C-phone-*.png
# version 1.1: the before/after of the guide, for the page, in the views with the slant treatment (B and E)
python3 -I ../sheetV/beforeafter.py C > /dev/null
if [ -e ra-C-seams-v11.png ]; then python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-C-seams-*.png; fi
# version 2: the review pictures of the accepted step-1 picture (AI-generated, labelled), for the page; the view's zooms first, where a
# script makes them from its measured files (zoomsC2.py)
if [ -e zoomsC2.py ]; then python3 -I zoomsC2.py > /dev/null; fi
python3 -I ../sheetV/overlayV2.py C > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-C-[0-9]-*.png
python3 -I colour-check-ra1.py ra-C-empty.png ra-C-empty-regions.png --json _cal-empty.json > /dev/null
python3 -I colour-check-ra1.py ra-C-guide.png ra-C-regions.png --json _cal-guide.json > /dev/null
python3 -I colour-check-ra1.py ../../roomb/pv8/pub-B/img/pv6-B-empty.png ../../roomb/pv8/pub-B/img/pv6-B-empty-regions.png --json _cal-roomb.json > /dev/null || true
bash dryrunC.sh > /dev/null
# version 3, where a kept step-2 picture was completed in code: the composite, its review pictures and their byte scan (v3make-C.sh)
if [ -e v3make-C.sh ]; then bash v3make-C.sh; fi
node sheetC.mjs
python3 -I - <<'PY'
import json
s = json.load(open('pub/_dry/summary.json')); e, g, b = (json.load(open(f'_cal-{k}.json')) for k in ('empty', 'guide', 'roomb'))
print('dry run:', s['check'], '| prompts', all(s['promptsAsManifest'].values()), '| alpha', s['s2']['alphaAsExpected'], s.get('s3', {}).get('alphaAsExpected', '-'), '| lifted', len(s['lifted']), 'missing', s['missing'], '| lifted3', len(s.get('lifted3', {})), 'missing3', s.get('missing3', '-'), '| colours', s['colours'])
print('colour check: empty guide', e['pass'], '| guide', g['pass'], "| Room B's guide", b['pass'], [k for k, v in b['result'].items() if not v])
PY
