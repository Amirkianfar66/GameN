# Room A's owner page: view B's round window, its opening fitted to the flat black painted in RA-B-3c (view B's plate, accepted by the
# Lead on 27 November, 18:56), for the voyage the page draws in it (the Lead, 28 November, 00:43: "draw the room scene's voyage into
# the painted opening, in every view where the window is in sight"), exactly as sheet RA-D's windowD2.py fits view D's (its method,
# gate and ellipse summary): from the black's centre, 720 rays, half a degree apart; along each, the edge where the OKLCH lightness
# (the colour check's, colour-check-ra1.py) first reaches 0.12, read with bilinear lightness every 0.1 px. Those edges, joined, are
# the opening's outline. The seed is the middle of the window's box on 402 x 742 in camera report B, on the painting. Writes
# window-B.json. Reads the plate from sheetB (checked by scene-B.json's sha256). Generates nothing. Usage: python3 -I windowB.py
import hashlib, importlib.util, json, os
from collections import deque
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); RA = os.path.join(D, '..')
SCB = json.load(open(os.path.join(RA, 'checkV', 'B', 'scene-B.json'))); SRC, WANT = os.path.join(RA, 'sheetB', 'ra-B-3c.png'), SCB['plate']['sha256']
if hashlib.sha256(open(SRC, 'rb').read()).hexdigest() != WANT: raise SystemExit('STOP: sheetB/ra-B-3c.png is not the plate scene-B.json names')
spec = importlib.util.spec_from_file_location('cc', os.path.join(RA, 'sheetD', 'colour-check-ra1.py')); CC = importlib.util.module_from_spec(spec); spec.loader.exec_module(CC)
a = np.array(Image.open(SRC).convert('RGB')); Lk = CC.oklch(a)[0]; H, W = Lk.shape; T = 0.12
# the painted black: the run of pixels under lightness 0.12 joined to the window's middle
REPB = json.load(open(os.path.join(RA, 'camera-report-B.json'))); bx = REPB['features']['402x742']['window']['box']; PL = SCB['phones']['402x742']['plate']
sx, sy = (bx['x0'] + bx['x1']) / 2, (bx['y0'] + bx['y1']) / 2; seed = (int((sy - PL['top']) * 1536 / PL['height']), int((sx - PL['left']) * 1024 / PL['width']))
blk = Lk < T
if not blk[seed]: raise SystemExit(f'STOP: the seed {seed} is not in the painted black')
disc = np.zeros_like(blk); q = deque([seed]); disc[seed] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        v, u = y + dy, x + dx
        if 0 <= v < H and 0 <= u < W and blk[v, u] and not disc[v, u]: disc[v, u] = True; q.append((v, u))
dy_, dx_ = np.nonzero(disc); cx, cy = dx_.mean() + 0.5, dy_.mean() + 0.5
def Lb(x, y):   # bilinear lightness at a point in pixel-edge coordinates (pixel centres at i + 0.5)
    x, y = x - 0.5, y - 0.5; x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
    return (Lk[y0, x0] * (1 - fx) * (1 - fy) + Lk[y0, x0 + 1] * fx * (1 - fy) + Lk[y0 + 1, x0] * (1 - fx) * fy + Lk[y0 + 1, x0 + 1] * fx * fy)
pts = []
for k in range(720):
    t = np.radians(k / 2); ux, uy = np.cos(t), np.sin(t); r = 20.0; prev = Lb(cx + r * ux, cy + r * uy)
    while r < 200:
        r2 = r + 0.1; cur = Lb(cx + r2 * ux, cy + r2 * uy)
        if cur >= T: f = (T - prev) / (cur - prev) if cur != prev else 0; rr = r + 0.1 * f; pts.append((cx + rr * ux, cy + rr * uy)); break
        r, prev = r2, cur
P = np.array(pts)
def fit_ellipse(P):   # direct least squares (Fitzgibbon, Pilu and Fisher), in coordinates centred on the points' mean
    m = P.mean(axis=0); x, y = (P - m).T
    D1 = np.vstack([x * x, x * y, y * y]).T; D2 = np.vstack([x, y, np.ones_like(x)]).T
    S1, S2, S3 = D1.T @ D1, D1.T @ D2, D2.T @ D2; Tm = -np.linalg.inv(S3) @ S2.T; M = S1 + S2 @ Tm
    M = np.array([M[2] / 2, -M[1], M[0] / 2]); w, v = np.linalg.eig(M); v = np.real(v)
    cond = 4 * v[0] * v[2] - v[1] ** 2; a1 = v[:, np.nonzero(cond > 0)[0][0]]; A, B, C = a1; Dd, E, F = Tm @ a1
    x0 = (2 * C * Dd - B * E) / (B * B - 4 * A * C); y0 = (2 * A * E - B * Dd) / (B * B - 4 * A * C)
    th = 0.5 * np.arctan2(B, A - C); ct, st = np.cos(th), np.sin(th)
    Ap = A * ct * ct + B * ct * st + C * st * st; Cp = A * st * st - B * ct * st + C * ct * ct
    Fp = F + A * x0 * x0 + B * x0 * y0 + C * y0 * y0 + Dd * x0 + E * y0
    ra, rb = np.sqrt(-Fp / Ap), np.sqrt(-Fp / Cp)
    return {'cx': float(x0 + m[0]), 'cy': float(y0 + m[1]), 'ra': float(ra), 'rb': float(rb), 'theta': float(th)}
def resid(e, P):   # the distance of each point from the ellipse, along the ray from its centre (approximate, in px)
    ct, st = np.cos(e['theta']), np.sin(e['theta']); dx, dy = P[:, 0] - e['cx'], P[:, 1] - e['cy']
    u, v = dx * ct + dy * st, -dx * st + dy * ct; rho = np.hypot(u, v); phi = np.arctan2(v, u)
    re = 1 / np.sqrt((np.cos(phi) / e['ra']) ** 2 + (np.sin(phi) / e['rb']) ** 2); return rho - re
e = fit_ellipse(P); r = resid(e, P); keep = np.abs(r) <= 1.0
if keep.sum() < len(P): e = fit_ellipse(P[keep]); r = resid(e, P)
def inpoly(poly, X, Y):   # even-odd test of the pixel centres against a closed outline
    Q = np.array(poly, float); A, B = Q, np.roll(Q, -1, axis=0); res = np.zeros(X.shape, bool)
    for (ax, ay), (bx, by) in zip(A, B):
        c = ((ay <= Y) & (by > Y)) | ((by <= Y) & (ay > Y)); xi = ax + (Y - ay) * (bx - ax) / np.where(by == ay, 1, by - ay); res ^= c & (X < xi)
    return res
inside = lambda X, Y: (lambda u, v: (u / e['ra']) ** 2 + (v / e['rb']) ** 2 <= 1)(*(((X - e['cx']) * np.cos(e['theta']) + (Y - e['cy']) * np.sin(e['theta'])), (-(X - e['cx']) * np.sin(e['theta']) + (Y - e['cy']) * np.cos(e['theta']))))
X, Y = np.meshgrid(np.arange(W) + 0.5, np.arange(H) + 0.5); regE = inside(X, Y)
outline = [[round(float(x), 2), round(float(y), 2)] for x, y in P]
x0b, y0b, x1b, y1b = int(P[:, 0].min()) - 2, int(P[:, 1].min()) - 2, int(P[:, 0].max()) + 3, int(P[:, 1].max()) + 3
reg = np.zeros((H, W), bool); reg[y0b:y1b, x0b:x1b] = inpoly(outline, X[y0b:y1b, x0b:x1b], Y[y0b:y1b, x0b:x1b])
l = Lk[reg]; p95 = round(float(np.percentile(l, 95)), 4)
litInside = int((reg & ~blk).sum()); sliver = int((disc & ~reg).sum())
litE, sliverE, p95E = int((regE & ~blk).sum()), int((disc & ~regE).sum()), round(float(np.percentile(Lk[regE], 95)), 4)
ys, xs = np.nonzero(reg); box = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
N = 180; poly = [[round(e['cx'] + e['ra'] * np.cos(t) * np.cos(e['theta']) - e['rb'] * np.sin(t) * np.sin(e['theta']), 2),
                  round(e['cy'] + e['ra'] * np.cos(t) * np.sin(e['theta']) + e['rb'] * np.sin(t) * np.cos(e['theta']), 2)] for t in np.linspace(0, 2 * np.pi, N, endpoint=False)]
out = {'view': 'B', 'what': "view B's round window: its opening fitted to the flat black painted in RA-B-3c, for the voyage the owner page draws in it", 'date': '2026-11-28',
       'picture': {'name': 'RA-B-3c', 'sha256': WANT, 'pixelsSha256': SCB['plate']['pixelsSha256'], 'aiGenerated': True, 'codeComposite': True}, 'seed': list(seed),
       'gate': 'flat black, as the colour check gates an opening (colour-check-ra1.py): 95% of the region under OKLCH lightness 0.12',
       'method': "from the painted black's centre, 720 rays half a degree apart; along each, the edge where the OKLCH lightness first reaches 0.12 (bilinear, every 0.1 px); the edges, joined in order, are the opening's outline. The opening is the pixels whose centres lie inside it.",
       'opening': {'points': len(outline), 'outline': outline, 'what': "the painted black's edge, for the moving sky: draw the sky inside this outline"},
       'region': {'px': int(reg.sum()), 'box': box, 'p95L': p95, 'medianL': round(float(np.median(l)), 4), 'maxL': round(float(l.max()), 4), 'pass': p95 < T},
       'ellipse': {'centre': [round(e['cx'], 2), round(e['cy'], 2)], 'semiAxes': [round(e['ra'], 2), round(e['rb'], 2)], 'rotationDeg': round(float(np.degrees(e['theta'])), 2),
                   'form': "a point (x, y) is inside when (u / a)^2 + (v / b)^2 <= 1, with u, v its offset from the centre turned by -rotation, and a, b the semi-axes",
                   'fit': {'edges': len(P), 'used': int(keep.sum()), 'dropped': int((~keep).sum()), 'maxOffPx': round(float(np.abs(r).max()), 2), 'rmsPx': round(float(np.sqrt(np.mean(r[keep] ** 2))), 3)},
                   'wouldLeave': {'skyOverTheFramePx': litE, 'blackSliverPx': sliverE, 'p95L': p95E},
                   'what': 'a summary only: the painted black is not quite an ellipse, so the opening is the traced outline above',
                   'polygon': {'points': N, 'outline': poly}},
       'skyOverTheFrame': {'px': litInside, 'what': 'pixels inside the opening at lightness 0.12 or more: the anti-aliased step into the frame\'s ink, which the sky would cover'},
       'blackSliverLeft': {'px': sliver, 'what': 'pixels of the painted black (under 0.12, joined to it) outside the opening, which the sky would leave black'},
       'paintedBlack': {'px': int(disc.sum()), 'box': [int(dx_.min()), int(dy_.min()), int(dx_.max()) + 1, int(dy_.max()) + 1]},
       'units': 'painting pixels (1024 x 1536); a pixel spans i to i + 1'}
json.dump(out, open(os.path.join(D, 'window-B.json'), 'w'), indent=1); open(os.path.join(D, 'window-B.json'), 'a').write('\n')
print('opening', len(outline), 'points | ellipse', out['ellipse']['centre'], out['ellipse']['semiAxes'], out['ellipse']['rotationDeg'], out['ellipse']['fit'], out['ellipse']['wouldLeave'], '| region', out['region'], '| sky over frame', litInside, '| sliver', sliver, '| painted', out['paintedBlack'])
