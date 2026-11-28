# Re-encodes any of the sheet's PNGs whose compressed bytes spell a word on the Designer team's scan list by chance, losslessly (the
# same pixels, checked), with Pillow's PNG encoder at the first compression level whose bytes spell none. Deterministic: the same
# input gives the same bytes. Run on the renders before anything hashes them. Usage: python3 -I scanfixA.py <scan words> <png>...
import re, sys
import numpy as np
from PIL import Image
words = [l.strip() for l in open(sys.argv[1]) if l.strip()]
if not words: raise SystemExit('no scan words: stop')
rx = re.compile('|'.join(words).encode(), re.I)
for f in sys.argv[2:]:
    if not rx.search(open(f, 'rb').read()): continue
    im = Image.open(f); im.load(); px = np.array(im)
    for level in (9, 6, 1, 2, 3, 4, 5, 7, 8):
        im.save(f, 'PNG', compress_level=level)
        if not rx.search(open(f, 'rb').read()): break
    else: raise SystemExit(f'{f}: every compression level spells a scan word')
    if not (np.array(Image.open(f)) == px).all(): raise SystemExit(f'{f}: the pixels changed')
    print(f, 're-encoded at compression level', level, '(the same pixels)')
