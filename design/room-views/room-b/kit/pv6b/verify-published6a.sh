#!/usr/bin/env bash
# After publishing: <folder> holds every published file as read back from the artifact (the Artifact tool, by path). Each must
# be this folder's file byte for byte (index.html: the preview), and the page served from the read-back files alone must pass
# the same gate. Usage: ./verify-published6a.sh <folder>
set -euo pipefail
cd "$(dirname "$0")"
COPY=$(cd "$1" && pwd)
n=0; while IFS= read -r f; do rel=${f#"$COPY"/}; case "$rel" in _verify/*) continue;; esac; cmp "$f" "$rel"; n=$((n + 1)); done < <(find "$COPY" -type f | sort)
echo "$n published files, each this folder's file byte for byte"
ONLY_COPY=1 node verify6a.cjs "$COPY" "$COPY/_verify" > /dev/null
python3 -I verify-fit6a.py "$COPY/_verify" > /dev/null
python3 -I rendered-cover.py "$COPY/_verify" > /dev/null
python3 -I verify-gate6a.py "$COPY/_verify"
