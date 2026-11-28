#!/usr/bin/env bash
# Sheet RA-C version 3's own build steps (makeC.sh runs this where it exists): RA-C-2c, view C's kept step 2 completed in code, with
# its screen filled black and fitted (compositeC2.py), and its review pictures (reviewC2.py), from the image session's records in
# _rec2 (img/RA-C-2.png, img/RA-C-2-raw.png and img/RA-C-1.png, each checked by its sha256); a review picture whose bytes spell a word
# on the Designer team's scan list by chance is re-encoded losslessly (scanfixA.py). Calls no service; generates nothing.
set -euo pipefail
cd "$(dirname "$0")"
python3 -I compositeC2.py _rec2 > /dev/null
python3 -I reviewC2.py _rec2 > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-C-2c-*.png
