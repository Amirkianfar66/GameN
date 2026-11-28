#!/usr/bin/env bash
# Sheet RA-D (Room A, view D), the whole build, as sheet RA-B's makeB.sh: the guides (guideD.mjs, rendered by render.cjs), the
# masks and kit (kitD.py), the manifest, prompts and publishing folder (buildD.mjs), the phone crops (cropsD.py), the colour
# check's calibration on the guides and on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunD.sh) and the page
# (sheetD.mjs). A render whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly first
# (scanfixA.py). Calls no service; generates nothing. Usage: bash makeD.sh
set -euo pipefail
cd "$(dirname "$0")"
if [ -e linesD.mjs ]; then node linesD.mjs > /dev/null; fi   # version 2: the guide's own lines on the deck
if [ -e windowD2.py ]; then python3 -I windowD2.py > /dev/null; fi   # version 2: the step-1 picture's painted window, for steps 2 and 3's map
if [ -e measureD2.py ]; then python3 -I measureD2.py > /dev/null; fi   # version 2: the step-1 picture's painted deck, the floor fit, the feet
node guideD.mjs > /dev/null
node render.cjs ra-D-empty.svg,ra-D-guide.svg,ra-D-guide-s2.svg,ra-D-regions.svg,ra-D-empty-regions.svg,ra-D-empty-annotated.svg,ra-D-furniture.svg,ra-D-stations.svg,ra-D-capsule.svg,ra-D-capsule-label.svg,ra-D-own.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-*.png
if [ -e featuresD2.py ]; then python3 -I featuresD2.py > /dev/null; fi   # version 2: the step-1 picture's painted features
python3 -I kitD.py > /dev/null
# version 2.1: RA-D-3x from the image session's records (compositeD3x.py), then step 2b's masks on it (kitD2b.py), before the manifest
if [ -e compositeD3x.py ]; then python3 -I compositeD3x.py _rec2 > /dev/null; fi
if [ -e kitD2b.py ]; then python3 -I kitD2b.py _rec2 > /dev/null; fi
# version 2.3: RA-D-3hc from the image session's records of step 2b (compositeD3hc.py: RA-D-3h, its raw, and RA-D-3x), before the manifest
if [ -e compositeD3hc.py ]; then python3 -I compositeD3hc.py _rec3 > /dev/null; fi
# version 2.4: RA-D-4c from the image session's records of step 3 (compositeD4c.py: RA-D-4, its raw, RA-D-3h's raw, and RA-D-3hc),
# before the manifest; it moves painted-D.json on to RA-D-4c and adds the capsule's painted box
if [ -e compositeD4c.py ]; then python3 -I compositeD4c.py _rec4 > /dev/null; fi
if [ -e checkD2.py ]; then python3 -I checkD2.py > /dev/null; fi   # version 2: the view's own checks on the final masks
node buildD.mjs > /dev/null
python3 -I cropsD.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-phone-*.png
# version 1.1: the before/after of the guide, for the page, in the views with the slant treatment (B and E)
python3 -I ../sheetV/beforeafter.py D > /dev/null
if [ -e ra-D-seams-v11.png ]; then python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-seams-*.png; fi
# version 2: the review pictures of the accepted step-1 picture (AI-generated, labelled), for the page; the view's zooms first, where a
# script makes them from its measured files (zoomsD2.py)
if [ -e zoomsD2.py ]; then python3 -I zoomsD2.py > /dev/null; fi
python3 -I ../sheetV/overlayV2.py D > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-[0-9]-*.png
python3 -I colour-check-ra1.py ra-D-empty.png ra-D-empty-regions.png --json _cal-empty.json > /dev/null
python3 -I colour-check-ra1.py ra-D-guide.png ra-D-regions.png --json _cal-guide.json > /dev/null
python3 -I colour-check-ra1.py ../../roomb/pv8/pub-B/img/pv6-B-empty.png ../../roomb/pv8/pub-B/img/pv6-B-empty-regions.png --json _cal-roomb.json > /dev/null || true
bash dryrunD.sh > /dev/null
# version 3, where a kept step-2 picture was completed in code: the composite, its review pictures and their byte scan (v3make-D.sh)
if [ -e v3make-D.sh ]; then bash v3make-D.sh; fi
node sheetD.mjs
python3 -I - <<'PY'
import json
s = json.load(open('pub/_dry/summary.json')); e, g, b = (json.load(open(f'_cal-{k}.json')) for k in ('empty', 'guide', 'roomb'))
print('dry run:', s['check'], '| prompts', all(s['promptsAsManifest'].values()), '| alpha', s['s2']['alphaAsExpected'], s.get('s3', {}).get('alphaAsExpected', '-'), '| lifted', len(s['lifted']), 'missing', s['missing'], '| lifted3', len(s.get('lifted3', {})), 'missing3', s.get('missing3', '-'), '| colours', s['colours'])
print('colour check: empty guide', e['pass'], '| guide', g['pass'], "| Room B's guide", b['pass'], [k for k, v in b['result'].items() if not v])
PY
