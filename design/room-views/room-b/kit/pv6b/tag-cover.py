# The tags over the drawn people (Room B test page v5), for both placements on both phones at 100% and 200% text: the share of
# each person's drawing under any tag (its alpha from cover6.cjs's "alone" frame, held at 0 s), and what each tag touches (a face,
# another person's press area, the bottom chips), as the page measured them (checks.json tagLayout). Writes tag-cover.json.
# Usage: python3 -I tag-cover.py
import json, os, numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); CK = json.load(open(os.path.join(D, 'checks.json'))); S = json.load(open(os.path.join(D, 'scene.json'))); out = {}
for name, row in CK['tagLayout'].items():
    key, pct, mode = [x.strip() for x in name.split(' · ')]; W = S['phones'][key]['W']; res = {}
    for pid, c in row['per'].items():
        a = np.array(Image.open(os.path.join(D, '_cover', f'{key}-{pid}-alone.png')).convert('RGBA'))[..., 3].astype(np.float64) / 255; s = a.shape[1] / W
        under = np.zeros(a.shape, bool)
        for t in row['tags']:
            x0, y0, x1, y1 = (int(round(v * s)) for v in (t['x0'], t['y0'], t['x1'], t['y1'])); under[max(0, y0):y1, max(0, x0):x1] = True
        own = next(t for t in row['tags'] if t['id'] == pid); x0, y0, x1, y1 = (int(round(v * s)) for v in (own['x0'], own['y0'], own['x1'], own['y1'])); mine = np.zeros(a.shape, bool); mine[max(0, y0):y1, max(0, x0):x1] = True
        res[pid] = {'name': c['name'], 'coveredByTags': round(float((a * under).sum() / a.sum()), 4), 'coveredByOwnTag': round(float((a * mine).sum() / a.sum()), 4), 'touches': row['tagTouch'][pid]}
    out[name] = {'phone': key, 'pct': pct, 'mode': mode, 'issues': row['issues'], 'people': res}
json.dump(out, open(os.path.join(D, 'tag-cover.json'), 'w'), indent=1)
for name, r in out.items(): print(name, '|', ', '.join(f"{v['name']} {100 * v['coveredByTags']:.1f}%" + (f" (touches {', '.join(v['touches']['faces'] + v['touches']['otherPress'] + v['touches']['bottomChips'])})" if any(v['touches'][k] for k in ('faces', 'otherPress', 'bottomChips')) else '') for v in r['people'].values()), '| issues', r['issues'])
