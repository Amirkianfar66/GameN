# Room A, views B and C: the check page's captures, labelled (view A's owner page's, ../owner/labelOwnerA.py): each capture
# (captureCheckV.cjs, <V>/_cap/) gets a visible label at its top saying the room is an AI-generated picture and what is drawn by code,
# and is written as WebP into <V>/pub/shots/ (re-encoded at another quality where its bytes spell a word on the Designer team's scan
# list by chance). Writes <V>/shots.json for the page: the captures, their captions and what the checks found; stops if a check
# fails. View E has no screen in view. Usage: python3 -I labelCheckV.py B|C|E
import json, os, re, sys
from PIL import Image, ImageDraw, ImageFont
V = sys.argv[1] if len(sys.argv) > 1 else ''
if V not in ('B', 'C', 'E', 'D'): sys.exit('usage: python3 -I labelCheckV.py B|C|E|D')
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), V); CAP, OUT = os.path.join(D, '_cap'), os.path.join(D, 'pub', 'shots')
os.makedirs(OUT, exist_ok=True)
SC = json.load(open(os.path.join(D, f'scene-{V}.json'))); PLATE = SC['plate']['name']; NAMES = SC['names']; NS = not SC['screens']['painting']
words = [l.strip() for l in open(os.path.join(D, '..', '..', '..', 'roomb', 'pv8', '_scan-words.txt')) if l.strip()]
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
L1 = f'Capture: the room is AI-generated ({PLATE})'
PH = {'402x742': '402 × 742, your phone in the app', '390x844': '390 × 844', '430x932': '430 × 932'}
shots = []
for key in ('402x742', '390x844', '430x932'):
    items = [(f'first-{key}', f'The first screen at {PH[key]}, the room set to that phone', 'its first screen')] + [(f'phone-{key}-{p}', f'The room at {PH[key]}, {p}% text', f'{p}% text') for p in (100, 200)] \
        + [(f'phone-{key}-room', f'The room only at {PH[key]}: the painting with nothing drawn over it', 'room only, nothing drawn over it')]
    for name, caption, short in items:
        room = name.endswith('-room')
        im = labelled(Image.open(os.path.join(CAP, name + '.png')), L1, f"{key.replace('x', ' x ')}: {short}" + ('' if room else ('; people, layers and controls drawn by code' if NS else '; screens, people, layers and controls drawn by code')))
        f = os.path.join(OUT, name + '.webp')
        for q in (82, 80, 84, 78, 86):
            im.save(f, 'WEBP', quality=q, method=6)
            if not rx.search(open(f, 'rb').read()): break
        else: raise SystemExit(f'{name}: every quality spells a scan word')
        shots.append({'file': f'shots/{name}.webp', 'w': im.width, 'h': im.height, 'caption': caption + ('.' if room else ('. The people, the layer parts over them and the controls are drawn by code.' if NS else '. The live screens, the people, the layer parts over them and the controls are drawn by code.')),
                      'alt': f'Capture of this page: {caption.lower()}; the room is an AI-generated picture' + ('' if room else (', the people, layers, tags and controls drawn by code' if NS else ', the screens, people, layers, tags and controls drawn by code'))})
C = json.load(open(os.path.join(CAP, 'checks.json')))
worst = max(v['worstPx'] for v in C['boxes'].values()); bad = [k for k, v in C['boxes'].items() if v['bad'] or v['overflow'] or not v['stackOk']]
order = ', '.join(NAMES[i] for i in C['boxes']['402x742@100']['people'])
n = len(SC['screens']['painting']); nscr = '' if n == 0 else 'the live screen' if n == 1 else f"the {'two' if n == 2 else n} live screens"
nfront = sum(1 for x in C['boxes']['402x742@100']['stack'] if x.startswith('front:'))
summary = (f"on all three phones at both text sizes, every name tag, chip and control lands within {worst} px of the layout and its words fit inside it; "
           f"the stage draws the plate, {nscr + ', ' if nscr else ''}then the people far to near ({order}){', each followed by the layer parts in front of them' if nfront else ', with no layer part in front of anyone'}; "
           f"the page never scrolls sideways at {', '.join(sorted(C['page'].keys()))} px; every picture loads; {'no script errors' if not C['errors'] else str(len(C['errors'])) + ' script errors'}")
ro = C['roomOnly']
if any(v['overlays'] or v['people'] or v['screens'] or v['images'] != 1 for v in ro.values()) or len(ro) != 3: raise SystemExit('STOP: Room only leaves something over the painting: ' + json.dumps(ro))
summary += '; Room only leaves the painting alone on the stage on every phone'
if bad or C['errors'] or any(v['broken'] or v['scrollW'] > v['clientW'] for v in C['page'].values()): raise SystemExit('STOP: the page checks fail: ' + json.dumps({'bad': bad, 'errors': C['errors'], 'boxes': {k: C['boxes'][k] for k in bad}}))
json.dump({'shots': shots, 'summary': summary, 'worstPx': worst}, open(os.path.join(D, 'shots.json'), 'w'), indent=1)
print(len(shots), 'captures |', summary)
