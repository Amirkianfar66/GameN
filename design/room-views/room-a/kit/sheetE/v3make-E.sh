#!/usr/bin/env bash
# Sheet RA-E version 3's own build steps (makeE.sh runs this where it exists): RA-E-2c, view E's kept step 2 completed in code
# (compositeE2.py), and its review pictures (reviewE2.py), from the image session's records in _rec2 (img/RA-E-2.png,
# img/RA-E-2-raw.png and img/RA-E-1.png, each checked by its sha256); a review picture whose bytes spell a word on the Designer team's
# scan list by chance is re-encoded losslessly (scanfixA.py). Calls no service; generates nothing.
set -euo pipefail
cd "$(dirname "$0")"
python3 -I compositeE2.py _rec2 > /dev/null
python3 -I reviewE2.py _rec2 > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-E-2c-*.png
