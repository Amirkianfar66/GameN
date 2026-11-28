#!/usr/bin/env bash
# Sheet RA-B's published-copy check, as sheet RA-A's verifyA.sh: on every file read back from a publish (in <folder>), each file byte
# for byte against pub/, the page against the skeleton, no model name or identifier (the Designer team's word list), none of the
# owner's reference pictures (by sha256), no link but the fonts', and then the dry run on a copy of the read-back files.
# Usage: bash verifyB.sh <read-back folder>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$1" && pwd)"; SC="$HERE/../../roomb"
python3 -I - "$R" "$HERE" "$SC" <<'PY'
import hashlib, os, sys
R, HERE, SC = sys.argv[1:]; P = os.path.join(HERE, 'pub'); same, bad = 0, []
for root, _, files in os.walk(R):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), R)
        if rel == 'index.html': continue
        if open(os.path.join(R, rel), 'rb').read() == open(os.path.join(P, rel), 'rb').read(): same += 1
        else: bad.append(rel)
sk = open(os.path.join(SC, 'pv6b/skeleton.html'), 'rb').read(); page = open(os.path.join(P, 'sheet-ra-b.html'), 'rb').read()
idx = open(os.path.join(R, 'index.html'), 'rb').read() == sk + page + b'\n</body></html>'
refs = set(l.split()[0] for l in open(os.path.join(SC, 'pv6/refsrc-sha256.txt')) if l.strip())
owners = [rel for root, _, fs in os.walk(R) for f in fs for rel in [os.path.relpath(os.path.join(root, f), R)] if hashlib.sha256(open(os.path.join(R, rel), 'rb').read()).hexdigest() in refs]
print(f'byte for byte: {same} files, differ: {bad} | index = skeleton + page + close: {idx} | owner\'s pictures: {owners or "none"}')
if bad or not idx or owners: sys.exit(1)
PY
W="$SC/pv8/_scan-words.txt"; if grep -rliE -f "$W" "$R"; then echo 'MODEL WORDS FOUND'; exit 1; else echo 'model words: none'; fi
L=$(grep -rhoE "https?://[^\"' )<]+" "$R" | grep -vE 'fonts\.(googleapis|gstatic)\.com' | sort -u || true); if [ -n "$L" ]; then echo "LINKS: $L"; exit 1; else echo 'links: fonts only'; fi
T=$(mktemp -d); cp -R "$R"/. "$T"/; rm -f "$T/index.html"; bash "$HERE/dryrunB.sh" "$T" | python3 -I -c "
import json, sys; s = json.load(sys.stdin); ok = s['check'] == 'all files and expected hashes match' and all(s['promptsAsManifest'].values()) and s['s2']['alphaAsExpected'] and not s['missing'] and all(s['colours'].values())
print('dry run on the copy:', 'pass' if ok else 'FAIL', '| lifted', len(s['lifted'])); sys.exit(0 if ok else 1)"
rm -rf "$T"
