#!/usr/bin/env bash
# Sheets PV6-B to PV6-E, version 2, for one capsule layout (PV8_LAYOUT: A1, the counter unit on Atlas's bench; W2, two wall units):
# the guides (guide8.mjs, rendered), the pieces and PLACE kit (pieces8.mjs, kit8.py), the prompts (prompts8.mjs), the camera reports
# (report8.mjs), the visits (visits8.mjs), the figures (plan8.mjs), the publishing folders (build8.py), a dry run of each folder's tool
# on its own published files (dryrun8.sh) and the sheet pages (sheet8.mjs). Calls no service; generates nothing.
set -euo pipefail
cd "$(dirname "$0")"
export PV8_LAYOUT="${PV8_LAYOUT:-A1}"
rm -f pv6-?-guide-s2.svg pv6-?-guide-s2.png
for V in B C D E; do node guide8.mjs "$V" > /dev/null; done
node render8.cjs "$(for V in B C D E; do for f in guide regions empty empty-regions empty-annotated furniture stations; do printf 'pv6-%s-%s.svg,' "$V" "$f"; done; done | sed 's/,$//')" > /dev/null
S2=$(ls pv6-?-guide-s2.svg 2>/dev/null | tr '\n' ',' | sed 's/,$//'); if [ -n "$S2" ]; then node render8.cjs "$S2" > /dev/null; fi   # version 4: the step-2 guides without the capsule
for V in B C D E; do node pieces8.mjs "$V" > /dev/null; python3 -I kit8.py "$V" > /dev/null; done
node _prompts-json8.mjs B C D E
node report8.mjs > /dev/null
node visits8.mjs "$PV8_LAYOUT" > /dev/null
node plan8.mjs B C D E > /dev/null
node render8.cjs "$(for V in B C D E; do printf 'pv6-%s-plan.svg,pv6-%s-walks.svg,' "$V" "$V"; done | sed 's/,$//')" > /dev/null
python3 -I build8.py B C D E
for V in B C D E; do bash dryrun8.sh "pub-$V" "$V" > /dev/null; done
node sheet8.mjs B C D E
python3 -I - <<'PY'
import json
for V in 'BCDE':
    s = json.load(open(f'pub-{V}/_dry/summary.json'))
    print(V, 'dry run: prompts as manifest', s['s1PromptsAsManifest'] and s['s2PromptsAsManifest'], '| alpha', s['s2AlphaAsExpected'], '| PLACE', s['s2Share'], '| lifted', len(s['lifted']), 'missing', s['missing'], '| same on the guide', s['sameOnTheGuide']['pass'])
PY
