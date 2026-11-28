# Probe (not published): the text files of a published sheet checked by the artifact service's file listing (its sha256, first 32
# hex, and its size) against the local publishing folder; on a match, the local copy goes into the read-back folder so the verify
# script can run its scans and the dry run on the whole set. Usage: python3 -I listmatch.py <pub folder> <read-back folder>
#   <path>=<size>:<sha256 prefix> ...
import hashlib, os, shutil, sys
P, R = sys.argv[1], sys.argv[2]; bad = []
for a in sys.argv[3:]:
    path, rest = a.split('='); size, pre = rest.split(':'); f = os.path.join(P, path); b = open(f, 'rb').read()
    ok = len(b) == int(size) and hashlib.sha256(b).hexdigest().startswith(pre) and len(pre) >= 32
    print(f'{path}: {"matches the listing" if ok else "DIFFERS"} ({len(b)} bytes, {hashlib.sha256(b).hexdigest()[:16]}…)')
    if ok: os.makedirs(os.path.dirname(os.path.join(R, path)) or R, exist_ok=True); shutil.copyfile(f, os.path.join(R, path))
    else: bad.append(path)
sys.exit(1 if bad else 0)
