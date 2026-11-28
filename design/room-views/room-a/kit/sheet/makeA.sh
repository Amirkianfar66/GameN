#!/usr/bin/env bash
# Sheet RA-A (Room A, view A), the whole build: the guides (guideA.mjs, rendered by render.cjs), the masks and kit (kitA.py), the
# manifest, prompts and publishing folder (buildA.mjs), the phone crops (cropsA.py), the colour check's calibration on the guides and
# on Room B's empty-room guide (colour-check-ra1.py), the dry run (dryrunA.sh) and the page (sheetA.mjs). A render whose bytes spell
# a word on the Designer team's scan list by chance is re-encoded losslessly first (scanfixA.py). Version 3: the kit's 15 px test
# against RA-A-1 (kitA.py stops the build if it fails) and the review overlays for the page (overlayA.py, from RA-A-1 in _in/,
# checked by its sha256). Version 6: step 4 (kit4A.py, overlay4A.py from RA-A-4 in _in4/, build4A.mjs), added after version 4's
# files, which stay byte for byte. Version 7: step 4 failed twice, so the cabinet's right frame is drawn in code on RA-A-4
# (frameA.py, from the image session's RA-A-1, RA-A-4 and the cabinet's step-2 layer in _rec/img/, each checked by its sha256) with
# its review pictures (reviewFrameA.py); version 6's files stay byte for byte. Calls no service; generates nothing. Usage: bash makeA.sh
set -euo pipefail
cd "$(dirname "$0")"
node guideA.mjs > /dev/null
node render.cjs ra-A-empty.svg,ra-A-guide.svg,ra-A-guide-s2.svg,ra-A-regions.svg,ra-A-empty-regions.svg,ra-A-empty-annotated.svg,ra-A-furniture.svg,ra-A-stations.svg,ra-A-capsule.svg,ra-A-capsule-label.svg > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-A-*.png   # a PNG whose bytes spell a scan word by chance, re-encoded losslessly
python3 -I kitA.py > /dev/null
node buildA.mjs > /dev/null
python3 -I overlayA.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-A-review-*.png
node buildA.mjs > /dev/null   # again, to stage the review overlays
python3 -I cropsA.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-A-phone-*.png
python3 -I colour-check-ra1.py ra-A-empty.png ra-A-empty-regions.png --json _cal-empty.json > /dev/null
python3 -I colour-check-ra1.py ra-A-guide.png ra-A-regions.png --json _cal-guide.json > /dev/null
python3 -I colour-check-ra1.py ../../roomb/pv8/pub-B/img/pv6-B-empty.png ../../roomb/pv8/pub-B/img/pv6-B-empty-regions.png --json _cal-roomb.json > /dev/null
python3 -I kit4A.py > /dev/null   # version 6: step 4, the cabinet's right side over RA-A-4 (fix4A.json)
python3 -I overlay4A.py > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-A-place4.png ra-A-split4.png ra-A-review4-*.png
node build4A.mjs > /dev/null   # adds step 4's files to pub/; version 4's stay byte for byte
python3 -I frameA.py _rec . > /dev/null   # version 7: the cabinet's right frame drawn in code on RA-A-4 (frame-A.json)
python3 -I reviewFrameA.py _rec > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-A-frame-*.png
cp frameA.py frame-A.json pub/ && cp ra-A-frame-cabinet.png ra-A-frame-402.png pub/img/review/   # version 7's files, added; version 6's stay byte for byte
bash dryrunA.sh > /dev/null
node sheetA.mjs
python3 -I - <<'PY'
import json
s = json.load(open('pub/_dry/summary.json')); e, g, b = (json.load(open(f'_cal-{k}.json')) for k in ('empty', 'guide', 'roomb'))
print('dry run:', s['check'], '| prompts', all(s['promptsAsManifest'].values()), '| alphas', s['s2']['alphaAsExpected'] and s['s3']['alphaAsExpected'], '| lifted', len(s['lifted']), '+', len(s['lifted3']), 'missing', s['missing'] + s['missing3'], '(expected', s['missingExpected'], ') | colours', s['colours'])
print('colour check: empty guide', e['pass'], '| guide', g['pass'], "| Room B's guide", b['pass'], [k for k, v in b['result'].items() if not v])
if 's4' in s: print('step 4:', s['s4'])
PY
