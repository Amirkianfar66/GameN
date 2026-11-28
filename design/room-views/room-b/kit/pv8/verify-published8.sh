#!/usr/bin/env bash
# A published sheet PV6-B to PV6-E (version 2) against the local build: every read-back file byte for byte against pub-<view>/, the page against
# the sheet's HTML in the publish skeleton, no model identifiers and none of the owner's reference pictures, then the dry run on the
# read-back copy. Usage: bash verify-published8.sh <read-back folder> <view>
set -euo pipefail
R="$(cd "$1" && pwd)"; X="$2"; x=$(echo "$X" | tr 'A-Z' 'a-z'); D="$(cd "$(dirname "$0")" && pwd)"; P="$D/pub-$X"; bad=0
same() { if cmp -s "$1" "$2"; then return 0; else echo "DIFF  ${1#$R/}"; bad=1; return 1; fi; }
n=0; d=0; while IFS= read -r f; do if same "$R/$f" "$P/$f"; then n=$((n+1)); else d=$((d+1)); fi; done < "$D/_publist-$X.txt"; echo "$n files byte for byte, $d differ or are missing"
{ cat "$D/../pv6b/skeleton.html" "$P/sheet-pv6$x.html"; printf '\n</body></html>'; } > "$R/_expected-index.html"; if same "$R/index.html" "$R/_expected-index.html"; then echo "the page is the sheet in the publish skeleton"; fi
W="$D/_scan-words.txt"; [ -s "$W" ] || { echo "the model-name scan's word list is missing ($W)"; exit 1; }   # one pattern a line, kept out of git so that no committed file names a model
set +e; grep -qiE -f "$W" "$R/index.html" "$R"/*.json "$R"/*.txt "$R"/*.py; rc=$?; set -e
if [ $rc = 0 ]; then echo "a model identifier in a published file"; bad=1; elif [ $rc = 1 ]; then echo "no model identifiers"; else echo "the model-identifier scan could not read the files"; bad=1; fi
refs=$(cat "$D/../pv6/refsrc-sha256.txt"); [ "$(wc -l <<<"$refs")" -ge 4 ] || { echo "the owner's reference hashes are missing (pv6/refsrc-sha256.txt)"; exit 1; }; hit=0   # their sha256 only; the pictures are not kept here
for f in "$R"/img/*.png; do h=$(sha256sum "$f" | cut -d' ' -f1); if grep -q "$h" <<<"$refs"; then echo "REFERENCE PICTURE PUBLISHED: $f"; hit=1; bad=1; fi; done; [ $hit = 0 ] && echo "none of the owner's reference pictures"
bash "$D/dryrun8.sh" "$R" "$X" > /dev/null 2>&1 || true; tail -1 "$R/_dry/check.txt"
python3 -I -c "
import json, sys; v = json.load(open('$R/_dry/summary.json'))
ok = v['s1PromptsAsManifest'] and v['s1InputAsManifest'] and v['s2AlphaAsExpected'] and v['s2PromptsAsManifest'] and not v['missing']
if 's3AlphaAsExpected' in v: ok = ok and v['s3AlphaAsExpected'] and v['s3PromptAsManifest'] and not v['missing3']; print('step 3 on the copy: alpha', v['s3AlphaAsExpected'], '| prompt', v['s3PromptAsManifest'], '| lifted', v['lifted3'])
if 's4AlphaAsExpected' in v: ok = ok and v['s4AlphaAsExpected'] and v['s4PromptAsManifest'] and not v['missing4']; print('step 4 on the copy: alpha', v['s4AlphaAsExpected'], '| prompt', v['s4PromptAsManifest'], '| lifted', v['lifted4'])
print('dry run on the copy: prompts and inputs as the manifest', v['s1PromptsAsManifest'] and v['s2PromptsAsManifest'], '| PLACE alpha', v['s2AlphaAsExpected'], '| lifted', v['lifted'], '| same on the guide', v['sameOnTheGuide']['pass'])
sys.exit(0 if ok else 1)" || bad=1
[ $bad = 0 ] && echo "PUBLISHED COPY OK" || { echo "PUBLISHED COPY DIFFERS"; exit 1; }
