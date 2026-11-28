#!/usr/bin/env bash
# Sheet RA-D version 2.1's own build steps after the dry run (makeD.sh runs this where it exists): the review pictures of RA-D-3, the two
# step-2 runs' raws, RA-D-3x and step 2b's mask on it (reviewD3x.py), from the image session's records in _rec2, each checked by its
# sha256; a review picture whose bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly (scanfixA.py).
# RA-D-3x (compositeD3x.py) and step 2b's masks (kitD2b.py) are made earlier in makeD.sh, before the manifest. Calls no service;
# generates nothing.
set -euo pipefail
cd "$(dirname "$0")"
python3 -I reviewD3x.py _rec2 > /dev/null
python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-3x-*.png
# version 2.3: RA-D-3hc's review pictures (reviewD3hc.py), from the records in _rec3, each checked by its sha256
if [ -e reviewD3hc.py ]; then python3 -I reviewD3hc.py _rec3 > /dev/null; python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-3hc-*.png; fi
# version 2.4: RA-D-4c's review pictures (reviewD4c.py), from the records in _rec4, each checked by its sha256
if [ -e reviewD4c.py ]; then python3 -I reviewD4c.py _rec4 > /dev/null; python3 -I scanfixA.py ../../roomb/pv8/_scan-words.txt ra-D-4c-*.png; fi
