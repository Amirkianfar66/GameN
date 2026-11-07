# mothership:dev-only
#
# Traces the character pilot's three heads from the owner's own art into the rig's head frame
# (docs/design/character-pilot.md, "Faces traced from the owner's art"):
#   python3 -m venv .venv && .venv/bin/pip install vtracer pillow
#   .venv/bin/python -I design/tools/character-pilot-trace.py
# Inputs:  design/character-pilot/faces/source/{mira,nova,atlas}.png, heads cropped from the owner's
#          art (Mira from the owner's example of 7 November 2026; Nova and Atlas from the owner's
#          redesign sheet, mirrored to face left as the rig's figures do).
# Outputs: design/character-pilot/faces/{mira,nova,atlas}.mjs, each head as filled paths in the rig's
#          head frame (the middle of the face near 0,0, the chin near 16), with its eyes for the
#          blink, where its neck leaves the jaw, its skin and hair colours, and where its hanging
#          hair may sway.
# Optional: only someone re-tracing needs Python; the outputs are committed. vtracer is MIT-licensed.
#
# For each head: the ground is flood-filled away from the crop's edge (a fill cannot reach shapes
# enclosed in ink), the neck and shoulders are cut away below a line under the jaw, and stray specks
# are dropped. The rest is traced at 4x (vtracer); every outline is smoothed of the source pixels'
# staircase (sharp turns kept) and simplified to within a third of a source pixel; and the head is
# fitted to the head frame by two landmarks, the eyes' midpoint and the chin.
# A colour within 31 (CIE76, the game's minimum of 30 and a margin) of a team colour is moved just far
# enough away from it: a warm shade loses a little redness at the same lightness. Nova's pinks take her
# proposed magenta, as her accent does.

import colorsys
import json
import math
import os
import re
import sys
import tempfile
from collections import deque

from PIL import Image, ImageDraw
import vtracer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FACES = os.path.join(ROOT, 'design', 'character-pilot', 'faces')
SCALE = 4
# Where the landmarks land in the head frame: the eyes' midpoint and the chin.
EYES_AT, CHIN_AT = (-2.4, -1.8), (-5.2, 16.4)
FACTION_ACCENTS = {'blue': '#70AFFF', 'red': '#FF8C8C', 'alien': '#C4A4FF'}
MIN_DISTANCE = 31


def bluish_dark(rgb):
    r, g, b = rgb
    return (b - r) > 8 and max(rgb) < 70          # the example's navy stage; the ink is neutral


def hue_ground(lo, hi, smin=0.35):
    def test(rgb):
        r, g, b = (v / 255 for v in rgb)
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        hd = h * 360
        inside = (lo <= hd <= hi) if lo <= hi else (hd >= lo or hd <= hi)
        # The ground, its pale halo against the icon's rim, or the rim and page themselves.
        return (inside and s >= smin and v > 0.18) or (inside and s >= 0.06 and v > 0.5) or (s < 0.1 and v > 0.86)
    return test


HEADS = {
    'mira': {
        'id': 'c8', 'source': "the owner's example of 7 November 2026 (Mira repainted on the pilot)",
        'ground': bluish_dark,
        'keep': [(0, 0), (380, 0), (380, 335), (345, 330), (300, 318), (270, 300), (240, 281), (205, 264), (180, 252), (178, 215), (150, 228), (125, 238), (98, 238), (95, 250), (0, 255)],
        'eyes_mid': (112, 147), 'chin': (100, 232),
        'eyes': [(86, 146, 13, 20), (146, 145, 31, 21)], 'neck': (160, 228, 19),
        'trace': (24, 8, 12), 'sway': True,
    },
    'nova': {
        'id': 'c6', 'source': "the owner's redesign sheet (portrait), mirrored",
        'ground': hue_ground(320, 20),
        'keep': [(0, 0), (310, 0), (310, 182), (240, 182), (152, 179), (150, 160), (125, 172), (95, 185), (70, 187), (0, 175)],
        'eyes_mid': (100, 112), 'chin': (82, 181),
        'eyes': [(84, 112, 11, 14), (125, 110, 22, 15)], 'neck': (144, 180, 16),
        'trace': (24, 7, 16), 'sway': False, 'tint': '#C2408F',
    },
    'atlas': {
        'id': 'c4', 'source': "the owner's redesign sheet (portrait), mirrored",
        'ground': hue_ground(95, 170),
        'keep': [(0, 0), (315, 0), (315, 166), (205, 166), (178, 160), (170, 170), (140, 179), (110, 189), (80, 189), (0, 178)],
        'eyes_mid': (110, 111), 'chin': (95, 184),
        'eyes': [(93, 110, 9, 11), (130, 111, 19, 12)], 'neck': (148, 184, 22),
        'trace': (24, 7, 16), 'sway': False,
    },
}


# ---------- Colour ----------

def lab(hexstr):
    """CIE L*a*b* as the repository measures it (design/board-v2/fx/blocked.mjs)."""
    r, g, b = (int(hexstr[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    x = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047
    y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722
    z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 216 / 24389 else (841 / 108) * t + 4 / 29
    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def from_lab(L, a, b):
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    inv = lambda t: t ** 3 if t ** 3 > 216 / 24389 else (t - 4 / 29) * 108 / 841
    x, y, z = inv(fx) * 0.95047, inv(fy), inv(fz) * 1.08883
    rgb = (3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.2040 * y + 1.0570 * z)
    gamma = lambda c: 12.92 * c if c <= 0.0031308 else 1.055 * max(c, 0) ** (1 / 2.4) - 0.055
    return '#' + ''.join(f'{max(0, min(255, round(gamma(c) * 255))):02X}' for c in rgb)


def nearest_accent(hexstr):
    a = lab(hexstr)
    return min(math.dist(a, lab(v)) for v in FACTION_ACCENTS.values())


def mix(a, b, k):
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * k):02X}' for x, y in zip(ca, cb))


def safe_colour(hexstr, tint=None):
    """The colour itself, Nova's magenta for a strong pink, or the least nudge (less red, the same lightness) that keeps it MIN_DISTANCE from every team colour."""
    r, g, b = (int(hexstr[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, s_, v = colorsys.rgb_to_hsv(r, g, b)
    if tint and (h * 360 >= 320 or h * 360 <= 20) and s_ > 0.4 and v > 0.35:
        hexstr = mix(hexstr, tint, 0.6)
    if nearest_accent(hexstr) >= MIN_DISTANCE:
        return hexstr
    L, a, bb = lab(hexstr)
    for step in range(1, 61):
        candidate = from_lab(L, a - step * 0.6, bb + step * 0.2)
        if nearest_accent(candidate) >= MIN_DISTANCE:
            return candidate
    return mix(hexstr, '#8A6A50', 0.5)


# ---------- Geometry ----------

def similarity(src_a, src_b, dst_a, dst_b):
    """The scale-rotate-translate taking src_a to dst_a and src_b to dst_b."""
    sx, sy = src_b[0] - src_a[0], src_b[1] - src_a[1]
    dx, dy = dst_b[0] - dst_a[0], dst_b[1] - dst_a[1]
    s = math.hypot(dx, dy) / math.hypot(sx, sy)
    t = math.atan2(dy, dx) - math.atan2(sy, sx)
    c, n = s * math.cos(t), s * math.sin(t)
    def apply(p):
        x, y = p[0] - src_a[0], p[1] - src_a[1]
        return (dst_a[0] + c * x - n * y, dst_a[1] + n * x + c * y)
    return apply, s


def rdp(points, tolerance):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1e-9
    worst, at = -1, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / length
        if d > worst:
            worst, at = d, i
    if worst <= tolerance:
        return [points[0], points[-1]]
    return rdp(points[:at + 1], tolerance)[:-1] + rdp(points[at:], tolerance)


def smooth(points, passes=2, corner=50):
    """A closed outline with the source pixels' staircase smoothed away; sharp turns (hair tips, cut corners) are kept."""
    n = len(points)
    if n < 8:
        return points
    def turn(i):
        (ax, ay), (bx, by), (cx, cy) = points[i - 1], points[i], points[(i + 1) % n]
        a = math.atan2(by - ay, bx - ax) - math.atan2(cy - by, cx - bx)
        return abs((a + math.pi) % (2 * math.pi) - math.pi) * 180 / math.pi
    fixed = [turn(i) > corner for i in range(n)]
    for _ in range(passes):
        points = [p if fixed[i] else ((points[i - 1][0] + 2 * p[0] + points[(i + 1) % n][0]) / 4, (points[i - 1][1] + 2 * p[1] + points[(i + 1) % n][1]) / 4) for i, p in enumerate(points)]
    return points


def path_data(outline):
    """A closed outline as compact SVG path data: tenths of a unit, the first point absolute and the rest relative."""
    pts = []
    for x, y in outline:
        p = (round(x * 10), round(y * 10))
        if not pts or p != pts[-1]:
            pts.append(p)
    while len(pts) > 1 and pts[-1] == pts[0]:
        pts.pop()
    if len(pts) < 3:
        return ''
    def num(v):
        text = str(v // 10) if v % 10 == 0 else f'{v / 10:.1f}'
        return text.replace('0.', '.', 1) if text.startswith(('0.', '-0.')) else text
    out, last = 'M', ''
    for i, (x, y) in enumerate(pts):
        if i == 1:
            out += 'l'
            last = ''
        for v in ((x, y) if i == 0 else (x - pts[i - 1][0], y - pts[i - 1][1])):
            t = num(v)
            if last and not t.startswith('-') and not (t.startswith('.') and '.' in last):
                out += ' '
            out += t
            last = t
    return out + 'z'


def subpaths(d):
    """vtracer's absolute M/C/Z path as lists of points (each curve's midpoint and end)."""
    tokens = re.findall(r'[MCZ]|-?\d+(?:\.\d+)?', d)
    out, current, i, cmd = [], [], 0, None
    while i < len(tokens):
        t = tokens[i]
        if t in 'MCZ':
            cmd = t
            i += 1
            if cmd == 'Z':
                if current:
                    out.append(current)
                current = []
            continue
        if cmd == 'M':
            current = [(float(tokens[i]), float(tokens[i + 1]))]
            i += 2
        elif cmd == 'C':
            p0 = current[-1]
            c1 = (float(tokens[i]), float(tokens[i + 1]))
            c2 = (float(tokens[i + 2]), float(tokens[i + 3]))
            p3 = (float(tokens[i + 4]), float(tokens[i + 5]))
            mid = tuple(0.125 * a + 0.375 * b + 0.375 * c + 0.125 * e for a, b, c, e in zip(p0, c1, c2, p3))
            current += [mid, p3]
            i += 6
        else:
            i += 1
    if current:
        out.append(current)
    return out


# ---------- Tracing ----------

def ground_mask(im, test):
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i] or not test(px[x, y]):
            continue
        seen[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    m = Image.new('L', (w, h), 0)
    m.putdata([255 if s else 0 for s in seen])
    return m


def largest_island(mask):
    """The mask with only its largest 8-connected island kept: the head, without stray specks of the ground's halo."""
    w, h = mask.size
    px = mask.load()
    label = [0] * (w * h)
    sizes = [0]
    for start in range(w * h):
        if label[start] or not px[start % w, start // w]:
            continue
        sizes.append(0)
        n = len(sizes) - 1
        label[start] = n
        q = deque([start])
        while q:
            i = q.popleft()
            sizes[n] += 1
            x, y = i % w, i // w
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    u, v = x + dx, y + dy
                    if 0 <= u < w and 0 <= v < h and not label[v * w + u] and px[u, v]:
                        label[v * w + u] = n
                        q.append(v * w + u)
    keep = max(range(1, len(sizes)), key=lambda n: sizes[n])
    out = Image.new('L', (w, h), 0)
    out.putdata([255 if l == keep else 0 for l in label])
    return out


def trace(name, spec, work):
    im = Image.open(os.path.join(FACES, 'source', f'{name}.png')).convert('RGB')
    ground = ground_mask(im, spec['ground'])
    cut = Image.new('L', im.size, 0)
    ImageDraw.Draw(cut).polygon(spec['keep'], fill=255)
    alpha = largest_island(Image.composite(Image.new('L', im.size, 0), cut, ground))
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS).convert('RGBA')
    big.putalpha(alpha.resize(big.size, Image.BILINEAR).point(lambda v: 255 if v > 127 else 0))
    png, svg = os.path.join(work, f'{name}.png'), os.path.join(work, f'{name}.svg')
    big.save(png)
    speckle, precision, layers = spec['trace']
    vtracer.convert_image_to_svg_py(png, svg, colormode='color', hierarchical='stacked', mode='spline',
                                    filter_speckle=speckle, color_precision=precision, layer_difference=layers,
                                    corner_threshold=60, length_threshold=5.0, max_iterations=10, splice_threshold=45,
                                    path_precision=0)
    return open(svg).read()


def fit(name, spec, svg_text):
    to_frame, s = similarity(spec['eyes_mid'], spec['chin'], EYES_AT, CHIN_AT)
    tolerance = 0.35 * s
    paths, areas, remapped = [], {}, {}
    for m in re.finditer(r'<path d="([^"]+)" fill="(#[0-9A-Fa-f]{6})" transform="translate\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)"', svg_text):
        d, fill, tx, ty = m.group(1), m.group(2).upper(), float(m.group(3)), float(m.group(4))
        safe = safe_colour(fill, spec.get('tint'))
        if safe != fill:
            remapped[fill] = safe
        parts = []
        for sub in subpaths(d):
            if len(sub) < 3:
                continue
            pts = [to_frame(p) for p in smooth([((x + tx) / SCALE, (y + ty) / SCALE) for x, y in sub])]
            # A closed outline is simplified in two halves, split at the point farthest from its start.
            far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
            pts = rdp(pts[:far + 1], tolerance)[:-1] + rdp(pts[far:] + [pts[0]], tolerance)[:-1]
            if len(pts) < 3:
                continue
            area = 0.5 * abs(sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))))
            data = path_data(pts)
            if area < 0.02 or not data:
                continue
            areas[safe] = areas.get(safe, 0) + area
            parts.append(data)
        if parts:
            paths.append([safe, ''.join(parts)])
    def frame_ellipse(cx, cy, rx, ry):
        x, y = to_frame((cx, cy))
        return [round(x, 2), round(y, 2), round(rx * s, 2), round(ry * s, 2)]
    eyes = [frame_ellipse(*e) for e in spec['eyes']]
    nx, ny = to_frame(spec['neck'][:2])
    neck = [round(nx, 2), round(ny, 2), round(spec['neck'][2] * s, 2)]
    # The skin: the largest warm, light colour; the hair: the largest dark one.
    def hsv(h):
        return colorsys.rgb_to_hsv(*(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))
    skins = [c for c in areas if 0.02 <= hsv(c)[0] <= 0.12 and hsv(c)[1] > 0.2 and hsv(c)[2] > 0.7]
    browns = [c for c in areas if hsv(c)[1] >= 0.25 and 0.08 <= hsv(c)[2] <= 0.45]
    darks = [c for c in areas if hsv(c)[2] < 0.42]
    skin = max(skins, key=lambda c: areas[c])
    hair = max(browns or darks, key=lambda c: areas[c])
    chin_y = round(to_frame(spec['chin'])[1], 2)
    return {'paths': paths, 'eyes': eyes, 'neck': neck, 'skin': skin, 'hair': hair, 'sway': chin_y + 1.2 if spec['sway'] else None, 'remapped': remapped, 'scale': s}


def module(name, spec, head):
    const = f'{name.upper()}_HEAD'
    body = ',\n'.join(f'  [{json.dumps(f)}, {json.dumps(d)}]' for f, d in head['paths'])
    source = spec['source'][0].upper() + spec['source'][1:]
    return f"""// mothership:dev-only
//
// Generated by design/tools/character-pilot-trace.py: do not edit by hand. {source},
// traced (vtracer) and fitted to the rig's head frame. The owner's own art.

/** {name.capitalize()}'s head: filled paths in the head frame, painted in order. */
export const {const}_PATHS = Object.freeze([
{body},
]);

/**
 * {name.capitalize()}'s head: its eyes for the blink ([cx, cy, rx, ry], far then near); where the drawing's
 * neck leaves the jaw ([x, y, half-width]); the skin and hair colours; and the line hanging hair
 * hangs from, or null.
 */
export const {const} = Object.freeze({{
  id: {json.dumps(spec['id'])},
  eyes: Object.freeze({json.dumps(head['eyes'])}.map(e => Object.freeze(e))),
  neck: Object.freeze({json.dumps(head['neck'])}),
  skin: {json.dumps(head['skin'])},
  hair: {json.dumps(head['hair'])},
  sway: {json.dumps(head['sway'])},
  paths: {const}_PATHS,
}});
"""


def main():
    report = {}
    with tempfile.TemporaryDirectory() as work:
        for name, spec in HEADS.items():
            head = fit(name, spec, trace(name, spec, work))
            text = module(name, spec, head)
            with open(os.path.join(FACES, f'{name}.mjs'), 'w') as f:
                f.write(text)
            report[name] = {'paths': len(head['paths']), 'bytes': len(text), 'skin': head['skin'], 'hair': head['hair'],
                            'eyes': head['eyes'], 'neck': head['neck'], 'remapped': head['remapped'], 'scale': round(head['scale'], 4)}
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
