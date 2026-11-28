# Sheet RA-C's phone crops, for the page only: what each phone's stage shows of the guide (with the furniture), its 70-degree slice
# at 5 degrees down cut from the 1024 x 1536 painting and scaled to the stage (390 x 653, 430 x 741, 402 x 551). Reads the slices
# from room-a-ra-c.json. Writes ra-C-phone-<width>.png. The image session never receives these. Usage: python3 -I cropsC.py
import json, os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(D, 'room-a-ra-c.json'))); g = Image.open(os.path.join(D, 'ra-C-guide.png')).convert('RGB')
for key, s in m['camera']['phones']['slices'].items():
    x0, y0, x1, y1 = s['paintingRect']; W, SH = s['stage']
    if x0 < 0 or y0 < 0 or x1 > 1024 or y1 > 1536: raise SystemExit(f'{key}: the slice leaves the painting')
    g.crop((round(x0), round(y0), round(x1), round(y1))).resize((W, SH), Image.LANCZOS).save(os.path.join(D, f'ra-C-phone-{W}.png'), optimize=True)
    print(key, 'crop', [round(v) for v in (x0, y0, x1, y1)], '->', W, 'x', SH)
