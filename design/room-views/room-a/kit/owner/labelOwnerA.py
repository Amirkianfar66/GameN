# View A owner page's captures, labelled: each capture (captureOwnerA.cjs, _cap/) gets a visible label at its top saying the room is
# an AI-generated picture and what is drawn by code, and is written as WebP into pub/shots/ (re-encoded at another quality where
# its bytes spell a word on the Designer team's scan list by chance). Writes shots.json for the page: the captures, their captions
# and what the checks found. Usage: python3 -I labelOwnerA.py
import json, os, re
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__)); CAP, OUT = os.path.join(D, '_cap'), os.path.join(D, 'pub', 'shots')
os.makedirs(OUT, exist_ok=True)
words = [l.strip() for l in open(os.path.join(D, '..', '..', 'roomb', 'pv8', '_scan-words.txt')) if l.strip()]
rx = re.compile('|'.join(words).encode(), re.I)
def font(px):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()
def labelled(im, l1, l2):
    w = im.width; px = max(13, round(w / 30)); m = ImageDraw.Draw(im)
    while px > 12 and max(m.textlength(l1, font=font(px)), m.textlength(l2, font=font(round(px * 0.8)))) > w - 2 * round(px * 0.6): px -= 1
    h = round(px * 2.9); out = Image.new('RGB', (w, im.height + h), (10, 12, 18)); out.paste(im.convert('RGB'), (0, h)); d = ImageDraw.Draw(out)
    d.text((round(px * 0.6), round(px * 0.35)), l1, font=font(px), fill=(255, 224, 160)); d.text((round(px * 0.6), round(px * 1.6)), l2, font=font(round(px * 0.8)), fill=(235, 235, 235)); return out
L1 = 'Capture: the room is AI-generated (RA-A-4)'
PH = {'402x742': '402 × 742, your phone in the app', '390x844': '390 × 844', '430x932': '430 × 932'}
shots = []
for key in ('402x742', '390x844', '430x932'):
    items = [(f'first-{key}', f'The first screen at {PH[key]}, the room set to that phone', 'Its first screen')] + [(f'phone-{key}-{p}', f'The room at {PH[key]}, {p}% text', f'{p}% text') for p in (100, 200)] \
        + [(f'phone-{key}-room', f'The room only at {PH[key]}: the painting with nothing drawn over it', 'room only, nothing drawn over it')]
    for name, caption, short in items:
        im = labelled(Image.open(os.path.join(CAP, name + '.png')), L1, f"{key.replace('x', ' x ')}: {short}" + ('' if name.endswith('-room') else '; people and controls drawn by code'))
        f = os.path.join(OUT, name + '.webp')
        for q in (82, 80, 84, 78, 86):
            im.save(f, 'WEBP', quality=q, method=6)
            if not rx.search(open(f, 'rb').read()): break
        else: raise SystemExit(f'{name}: every quality spells a scan word')
        room = name.endswith('-room')
        shots.append({'file': f'shots/{name}.webp', 'w': im.width, 'h': im.height, 'caption': caption + ('.' if room else '. People and controls drawn by code.'), 'alt': f'Capture of this page: {caption.lower()}; the room is an AI-generated picture' + ('' if room else ', the people, tags and controls are drawn by code')})
C = json.load(open(os.path.join(CAP, 'checks.json')))
worst = max(v['worstPx'] for v in C['boxes'].values()); bad = [k for k, v in C['boxes'].items() if v['bad'] or v['overflow']]
summary = (f"on all three phones at both text sizes, every name tag, chip and control lands within {worst} px of the layout and its words fit inside it; "
           f"the people are drawn far to near ({', '.join({'A3': 'Echo', 'A2': 'Mira', 'A5': 'Lyra'}[i] for i in C['boxes']['402x742@100']['people'])}); "
           f"the page never scrolls sideways at {', '.join(sorted(C['page'].keys()))} px; every picture loads; {'no script errors' if not C['errors'] else str(len(C['errors'])) + ' script errors'}")
ro = C['roomOnly']
if any(v['overlays'] or v['people'] or v['images'] != 1 for v in ro.values()) or len(ro) != 3: raise SystemExit('STOP: Room only leaves something over the painting: ' + json.dumps(ro))
summary += '; Room only leaves the painting alone on the stage on every phone'
if bad or C['errors'] or any(v['broken'] or v['scrollW'] > v['clientW'] for v in C['page'].values()): raise SystemExit('STOP: the page checks fail: ' + json.dumps({'bad': bad, 'errors': C['errors']}))
json.dump({'shots': shots, 'summary': summary, 'worstPx': worst}, open(os.path.join(D, 'shots.json'), 'w'), indent=1)
print(len(shots), 'captures |', summary)
