# The room data page's copy of view A's plate (version 4; the Lead, 14:36 on 19 November): RA-A-4, AI-generated, with the cabinet's
# right frame drawn in code (sheet RA-A version 7, frameA.py). Copies frameA.py's output, checks its pixels against frame-A.json,
# re-encodes it losslessly where its compressed bytes spell a word on the Designer team's scan list by chance (the sheet's
# scanfixA.py: the same pixels, checked), and writes plate-A.json: the copy's file sha256 and its pixels' sha256, which exportA.mjs
# puts in scene.json's plate entry. Generates nothing. Usage: python3 -I plateA.py
import hashlib, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(D, '..', 'sheet')
FR = json.load(open(os.path.join(S, 'frame-A.json'))); O = FR['outputs']['ra-A-4-frame.png']
src, dst = os.path.join(S, 'ra-A-4-frame.png'), os.path.join(D, 'ra-A-4-frame.png')
pix = lambda f: hashlib.sha256(np.ascontiguousarray(np.array(Image.open(f).convert('RGB'))).tobytes()).hexdigest()
if pix(src) != O['pixelsSha256']: sys.exit("STOP: the sheet's ra-A-4-frame.png is not the plate frame-A.json records")
shutil.copyfile(src, dst)
subprocess.run([sys.executable, '-I', os.path.join(S, 'scanfixA.py'), os.path.join(D, '..', '..', 'roomb', 'pv8', '_scan-words.txt'), dst], check=True)
if pix(dst) != O['pixelsSha256']: sys.exit('STOP: the copy is not the same pixels')
rec = {'file': 'ra-A-4-frame.png', 'sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest(), 'pixelsSha256': O['pixelsSha256'],
       'asWrittenByFrameA': O['sha256'], 'reencoded': hashlib.sha256(open(dst, 'rb').read()).hexdigest() != O['sha256']}
json.dump(rec, open(os.path.join(D, 'plate-A.json'), 'w'), indent=1); print(json.dumps(rec))
