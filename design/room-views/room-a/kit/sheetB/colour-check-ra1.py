#!/usr/bin/env python3
"""Room A colour check, version 1, for sheet RA-A (Room A, view A). It is Room B's colour check version 4 (colour-check-v4.py, sheet
PV6-A) with Room A's colour family in place of Room B's, and one gate more. It measures whether a picture's walls and deck are in
Room A's blue steel, the code's own (tokens 0.5.0 color.room.roomA), with the ship's warm light as Room B has it.

Usage: python3 colour-check-ra1.py PICTURE.png REGIONS.png [--json OUT.json]

Colours are compared in OKLab / OKLCH (lightness L 0-1, chroma C, hue h in degrees). The map is the sheet's region map: back wall
red, left wall green, right wall blue, deck yellow, window magenta, lamp (the light bars) amber (255, 200, 0); everything else black.
Each area is eroded before measuring (16 px for walls and deck, 6 px for the window, none for the lamps), so the picture may drift
from the guide by that much. A view need not hold every area: an area with no pixels in the map is absent, left out of the gates
that name it and listed under "absent". The deck and at least one wall must be in the map.

The base: Room A's family runs 248.5-260.3 degrees (OKLCH; deep #14243F 260.3, shadow #1D3D6B 257.7, mid #2D609E 254.8, light
#5C92CC 251.3, pale #A9CAEB 248.5). The band allows 15 degrees either side, 233-275: blue steel, not teal or cyan (under 233) and
not violet or purple (285 and up). The warm light and wear are Room B's: warm orange (hue 30-75, chroma 0.10 or more, lightness 0.60
or more; #EC793C is at 46.2) at most 8% of the picture; rust (hue 25-55, chroma 0.05-0.11, lightness 0.30-0.50; #75402E is at 39.4)
at most 3%; tan and olive (hue 70-115, chroma 0.035 or more, lightness 0.15-0.80) at most 3% of the walls and deck. New for Room
A: purple and violet (hue 285-355, chroma 0.035 or more, lightness 0.15 or more), Room B's colours, at most 3% of the walls and
deck. The accents allowed are orange, cream (#FCE3A0, hue 89.9) and rust: bright saturated pixels (lightness 0.55+, chroma 0.08+)
outside the base and the warm hues (355 through 0 to 105) at most 0.2% of the picture. The median lightness of walls and deck lies
between 0.28 and 0.60 (Room A's family is darker than Room B's: deep 0.262, shadow 0.361, mid 0.486; Room B's band is 0.30-0.60).
The base share of walls and deck is at least 60%, and of each wall and the deck on its own at least 45%. Not grey: at most 15% of
the walls and deck under chroma 0.035. The openings (here the window, where the view holds it) are flat black: 95% of the opening
under lightness 0.12. Cream is measured and reported, not gated.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter

FAMILY = {'deep': '#14243F', 'shadow': '#1D3D6B', 'mid': '#2D609E', 'light': '#5C92CC', 'pale': '#A9CAEB'}
ACCENTS = {'orange': '#EC793C', 'cream': '#FCE3A0', 'rust': '#75402E', 'paper': '#F4EBDD'}
MAP = {'back': (255, 0, 0), 'left': (0, 255, 0), 'right': (0, 0, 255), 'deck': (255, 255, 0), 'window': (255, 0, 255), 'lamp': (255, 200, 0)}
ERODE = {'back': 16, 'left': 16, 'right': 16, 'deck': 16, 'window': 6, 'lamp': 0}
HUE_BAND = (233.0, 275.0)
C_NEUTRAL = 0.035   # below this chroma a colour reads as neutral grey (the family's least saturated value, deep, is 0.055)
L_BLACK = 0.15      # below this lightness the hue cannot be read (the family's darkest value, deep, is 0.262)
ORANGE = {'hue': (30.0, 75.0), 'C': 0.10, 'L': 0.60}
RUST = {'hue': (25.0, 55.0), 'C': (0.05, 0.11), 'L': (0.30, 0.50)}
TAN_BAND = (70.0, 115.0)
PURPLE_BAND = (285.0, 355.0)
CREAM = {'hue': (70.0, 105.0), 'C': 0.04, 'L': 0.85}
L_RANGE = (0.28, 0.60)

GATES = {
    'walls and deck in the base': 'at least 60% of the wall and deck area: hue 233-275, chroma 0.035 or more, lightness 0.15 or more',
    'each wall and the deck in the base': 'at least 45% of each area on its own',
    'orange capped': 'at most 8% of the picture warm orange (hue 30-75, chroma 0.10 or more, lightness 0.60 or more)',
    'rust capped': 'at most 3% of the picture rust (hue 25-55, chroma 0.05-0.11, lightness 0.30-0.50)',
    'no tan or olive': 'at most 3% of the wall and deck area in hue 70-115 (chroma 0.035 or more, lightness 0.15-0.80)',
    'not purple': 'at most 3% of the wall and deck area in hue 285-355 (chroma 0.035 or more, lightness 0.15 or more): Room B\'s colours',
    'not grey': 'at most 15% of the wall and deck area neutral grey (chroma under 0.035, lightness 0.15 or more)',
    'median lightness': 'the median lightness of the wall and deck area between 0.28 and 0.60',
    'accents only orange, cream, rust': 'at most 0.2% of the picture bright and saturated (lightness 0.55+, chroma 0.08+) outside hue 233-275 and 355-105',
    'openings flat black': 'the window, where the view holds it: 95% of it under lightness 0.12',
}


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def oklch(rgb8):
    c = rgb8.astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * c[..., 0] + 0.5363325363 * c[..., 1] + 0.0514459929 * c[..., 2]
    m = 0.2119034982 * c[..., 0] + 0.6806995451 * c[..., 1] + 0.1073969566 * c[..., 2]
    s = 0.0883024619 * c[..., 0] + 0.2817188376 * c[..., 1] + 0.6299787005 * c[..., 2]
    l_, m_, s_ = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, np.hypot(a, b), np.degrees(np.arctan2(b, a)) % 360.0


def ramp_place(L):
    ramp = sorted(((oklch(np.array(hex_rgb(v)))[0].item(), k) for k, v in FAMILY.items()))
    if L < ramp[0][0]:
        return f'darker than {ramp[0][1]} ({ramp[0][0]:.3f})'
    for (l0, k0), (l1, k1) in zip(ramp, ramp[1:]):
        if L <= l1:
            return f'between {k0} ({l0:.3f}) and {k1} ({l1:.3f})'
    return f'lighter than {ramp[-1][1]} ({ramp[-1][0]:.3f})'


def masks(regions_png, shape):
    m = np.array(Image.open(regions_png).convert('RGB'))
    if m.shape[:2] != shape:
        raise SystemExit(f'the map is {m.shape[1]}x{m.shape[0]}, the picture {shape[1]}x{shape[0]}')
    out, present = {}, {}
    for k, col in MAP.items():
        raw = Image.fromarray(((m == col).all(axis=2) * 255).astype(np.uint8))
        present[k] = bool(np.array(raw).any())
        out[k] = np.array(raw.filter(ImageFilter.MinFilter(2 * ERODE[k] + 1))) > 0 if ERODE[k] else np.array(raw) > 0
    out['_present'] = present
    return out


def area_stats(L, C, H, sel):
    n = int(sel.sum())
    if n == 0:
        return {'pixels': 0}
    l, c, h = L[sel], C[sel], H[sel]
    readable = l >= L_BLACK
    fam = readable & (c >= C_NEUTRAL) & (h >= HUE_BAND[0]) & (h <= HUE_BAND[1])
    tan = readable & (c >= C_NEUTRAL) & (h >= TAN_BAND[0]) & (h <= TAN_BAND[1]) & (l < 0.80)
    purple = readable & (c >= C_NEUTRAL) & (h >= PURPLE_BAND[0]) & (h <= PURPLE_BAND[1])
    grey = readable & (c < C_NEUTRAL)
    med_l = float(np.median(l))
    hued = readable & (c >= C_NEUTRAL)
    return {'pixels': n, 'inBase': round(float(fam.mean()), 4), 'tanOlive': round(float(tan.mean()), 4), 'purple': round(float(purple.mean()), 4), 'grey': round(float(grey.mean()), 4),
            'tooDark': round(float((~readable).mean()), 4), 'medianL': round(med_l, 3), 'onRamp': ramp_place(med_l),
            'medianChroma': round(float(np.median(c)), 3), 'medianHueOfReadable': round(float(np.median(h[hued])), 1) if hued.any() else None}


def check(picture, regions_png):
    rgb = np.array(Image.open(picture).convert('RGB'))
    L, C, H = oklch(rgb)
    mk = masks(regions_png, rgb.shape[:2])
    res = {'picture': picture, 'map': regions_png, 'method': 'OKLCH', 'hueBand': HUE_BAND, 'gates': GATES, 'areas': {}}
    present = mk.pop('_present')
    absent = [name for name, keys in (('back wall', ('back',)), ('side walls', ('left', 'right')), ('deck', ('deck',)), ('window', ('window',)))
              if not any(present[k] for k in keys)]
    if 'deck' in absent or ('back wall' in absent and 'side walls' in absent):
        raise SystemExit('the map has no deck or no wall: it is not a Room A view map')
    walls = (mk['back'] | mk['left'] | mk['right']) & ~mk['lamp']
    wd = walls | (mk['deck'] & ~mk['lamp'])
    for name, sel in [('walls and deck', wd), ('back wall', mk['back']), ('side walls', mk['left'] | mk['right']), ('deck', mk['deck'])]:
        res['areas'][name] = area_stats(L, C, H, sel)
    for name in ('window', 'lamp'):
        sel = mk[name]
        res['areas'][name] = {'pixels': int(sel.sum()), 'p95L': round(float(np.percentile(L[sel], 95)), 3) if sel.any() else None,
                              'medianL': round(float(np.median(L[sel])), 3) if sel.any() else None}
    hue = lambda a, b: (H >= a) & (H <= b)
    rd = L >= L_BLACK
    orange = rd & hue(*ORANGE['hue']) & (C >= ORANGE['C']) & (L >= ORANGE['L'])
    rust = rd & hue(*RUST['hue']) & (C >= RUST['C'][0]) & (C < RUST['C'][1]) & (L >= RUST['L'][0]) & (L < RUST['L'][1])
    cream = hue(*CREAM['hue']) & (C >= CREAM['C']) & (L >= CREAM['L'])
    bright = (L >= 0.55) & (C >= 0.08)
    allowed = hue(*HUE_BAND) | hue(355.0, 360.0) | hue(0.0, 105.0)
    stray = bright & ~allowed
    res['warm'] = {'orange': round(float(orange.mean()), 4), 'rust': round(float(rust.mean()), 4), 'cream': round(float(cream.mean()), 4)}
    res['accents'] = {'brightSaturated': round(float(bright.mean()), 4), 'strayShare': round(float(stray.mean()), 5), 'strayPixels': int(stray.sum())}
    a = res['areas']; w = a['walls and deck']
    res['result'] = {
        'walls and deck in the base': w['inBase'] >= 0.60,
        'each wall and the deck in the base': all(a[k].get('inBase', -1) >= 0.45 for k in ('back wall', 'side walls', 'deck') if k not in absent),
        'orange capped': res['warm']['orange'] <= 0.08, 'rust capped': res['warm']['rust'] <= 0.03,
        'no tan or olive': w['tanOlive'] <= 0.03, 'not purple': w['purple'] <= 0.03, 'not grey': w['grey'] <= 0.15,
        'median lightness': L_RANGE[0] <= w['medianL'] <= L_RANGE[1],
        'accents only orange, cream, rust': res['accents']['strayShare'] <= 0.002,
        'openings flat black': all(a[k]['p95L'] is not None and a[k]['p95L'] < 0.12 for k in ('window',) if k not in absent),
    }
    if absent:
        res['absent'] = absent
    res['pass'] = all(res['result'].values())
    return res


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    out = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
    if out in args:
        args.remove(out)
    if len(args) != 2:
        raise SystemExit(__doc__)
    r = check(args[0], args[1])
    if out:
        with open(out, 'w') as f:
            json.dump(r, f, indent=1)
    print(json.dumps({'picture': r['picture'], 'pass': r['pass'], 'result': r['result'], 'areas': r['areas'], 'warm': r['warm'], 'accents': r['accents'], **({'absent': r['absent']} if 'absent' in r else {})}, indent=1))
