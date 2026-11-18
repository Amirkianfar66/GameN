#!/usr/bin/env python3
"""Room B colour check, version 4, for sheet PV6-A (version 3, for sheet PV5, is unchanged apart from the points marked
"version 4" below). Version 3 was: Room B colour check, version 3, for sheet PV5 version 2 (version 1, for sheet pv1-shared version 2, is unchanged apart
from the points marked "version 2" and "version 3" below). Measures whether a picture's walls and deck are in Room B's colour family, the code's own
(tokens 0.5.0 color.room.roomB, the same as FAMILIES['room-b'] in design/room-pilot/rooms.mjs).

Usage: python3 colour-check-v4.py PICTURE.png REGIONS.png [--json OUT.json]
       python3 colour_check.py PICTURE.png whole [--json OUT.json]   (no map: the whole frame, for calibration only)

Colours are compared in OKLab / OKLCH (lightness L 0-1, chroma C, hue h in degrees), a perceptual space where hue and
lightness can be read apart. The map is the sheet's o1p-regions.png: back wall red, left wall green, right wall blue, deck
yellow; window magenta, screen cyan, console display orange, tank liquid violet; everything else black. Each area is eroded
before measuring (16 px for walls and deck, 6 px for openings), so the picture may drift from the guide by that much.

Version 2: one map per view (PV5: pv5-A-regions.png to pv5-E-regions.png). A view need not hold every area: D's view has no
window or screen, A's no screen, B's no window. An area with no pixels of its colour in the map is absent:
it is left out of the gates that name it and listed under "absent". An area that is in the map but erodes to nothing still
fails, as in version 1. The deck and at least one wall must be in the map. With every area present the output is version 1's,
byte for byte.

Version 3: the skylight (Option A's round glass in the ceiling, its four panes) is a third opening, azure (0, 128, 255) in the map. It is
checked like the window and the screen (flat black: 95% under lightness 0.12), is never part of the wall and deck gates, and,
like them, is left out and listed as absent where a map does not hold it. Nothing else changes from version 2.

Version 4 (PV6-A, the owner's one-view test with the colour and light of their four references): the base is Room B's violet
moved toward the references' plum where the warm light falls. The base band runs from 285 to 355 degrees (version 3: 285 to
330), so plum counts as base: the references' purple runs 320 to 346 (10th to 90th percentile, median 330; #673B65 is at 328.6). Warm light is allowed,
capped: warm orange (hue 30-75, chroma 0.10 or more, lightness 0.60 or more; #EC793C is at 46.2) at most 8% of the picture
(the references: 4.2-5.3%); rust (hue 25-55, chroma 0.05-0.11, lightness 0.30-0.50; #75402E is at 39.4) at most 3% of the
picture (the references: 1.1-1.8%); tan and olive (hue 70-115, chroma 0.035 or more, lightness under 0.80) at most 3% of the
walls and deck. These three replace version 3's "not brown". The accents allowed are orange, cream (#FCE3A0, hue 89.9,
lightness 0.92), rust and blue-green (#3A9497 to #066D84, hue 198-220): bright saturated pixels outside the base, the warm hues
(355 through 0 to 105) and blue-green (170-235) at most 0.2% of the picture (version 3's cap; the references: 0.003-0.075%). The median lightness of walls and deck lies
between 0.30 and 0.60 (the references are brighter than version 3's ramp: their median is 0.43-0.46, their floor lit). The base
share of walls and deck is at least 60%, and of each wall and the deck on its own at least 45% (warm pools on the floor). A new
map colour, lamp (255, 200, 0): the lamps' plates and cores, left out of the wall and deck gates. The openings and grey gates
are version 3's. Cream and blue-green are measured and reported, not gated.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter

FAMILY = {'deep': '#2A1446', 'shadow': '#4B2079', 'mid': '#7A3CAD', 'light': '#AE6CD3', 'pale': '#DCB6EE'}
# version 4: the references' plum, measured, and the warm accents
PLUM = {'deep': '#2A172E', 'shadow': '#582D59', 'mid': '#684166', 'light': '#774B70', 'warm': '#8C5675'}
ACCENTS = {'orange': '#EC793C', 'cream': '#FCE3A0', 'rust': '#75402E', 'blue-green': '#3A9497', 'blue-green dark': '#066D84'}
MAP = {'back': (255, 0, 0), 'left': (0, 255, 0), 'right': (0, 0, 255), 'deck': (255, 255, 0),
       'window': (255, 0, 255), 'screen': (0, 255, 255), 'display': (255, 128, 0), 'liquid': (128, 0, 255), 'skylight': (0, 128, 255), 'lamp': (255, 200, 0)}   # version 4: lamp
ERODE = {'back': 16, 'left': 16, 'right': 16, 'deck': 16, 'window': 6, 'screen': 6, 'display': 3, 'liquid': 6, 'skylight': 6, 'lamp': 0}   # version 3: the skylight; version 4: lamp

# The family's hues run 300.3-314.8 degrees (OKLCH). The band allows 15 degrees either side: violet-purple, not blue
# (about 265) and not magenta or pink (340 and up).
HUE_BAND = (285.0, 355.0)   # version 4: violet and plum (version 3: 285-330)
C_NEUTRAL = 0.035   # below this chroma a colour reads as neutral grey (the family's least saturated value, deep, is 0.090)
L_BLACK = 0.15      # below this lightness the hue cannot be read (the family's darkest value, deep, is 0.253)
ORANGE = {'hue': (30.0, 75.0), 'C': 0.10, 'L': 0.60}                       # version 4: warm orange light
RUST = {'hue': (25.0, 55.0), 'C': (0.05, 0.11), 'L': (0.30, 0.50)}        # version 4: rust on worn edges
TAN_BAND = (70.0, 115.0)                                                  # version 4: tan and olive, when not light (L under 0.80)
CREAM = {'hue': (70.0, 105.0), 'C': 0.04, 'L': 0.85}                       # version 4: lamp cores (reported)
BLUEGREEN = (170.0, 235.0)                                                # version 4: screens and glass (reported)

GATES = {   # version 4
    'walls and deck in the base': 'at least 60% of the wall and deck area: hue 285-355, chroma 0.035 or more, lightness 0.15 or more',
    'each wall and the deck in the base': 'at least 45% of each area on its own',
    'orange capped': 'at most 8% of the picture warm orange (hue 30-75, chroma 0.10 or more, lightness 0.60 or more)',
    'rust capped': 'at most 3% of the picture rust (hue 25-55, chroma 0.05-0.11, lightness 0.30-0.50)',
    'no tan or olive': 'at most 3% of the wall and deck area in hue 70-115 (chroma 0.035 or more, lightness 0.15-0.80)',
    'not grey': 'at most 15% of the wall and deck area neutral grey (chroma under 0.035, lightness 0.15 or more)',
    'median lightness': 'the median lightness of the wall and deck area between 0.30 and 0.60',
    'accents only orange, cream, rust, blue-green': 'at most 0.2% of the picture bright and saturated (lightness 0.55+, chroma 0.08+) outside hue 285-355, 355-105 and 170-235',
    'openings flat black': 'the window, the screen and the skylight: 95% of each opening under lightness 0.12',
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
    if regions_png == 'whole':
        return {'whole': np.ones(shape, bool)}
    m = np.array(Image.open(regions_png).convert('RGB'))
    if m.shape[:2] != shape:
        raise SystemExit(f'the map is {m.shape[1]}x{m.shape[0]}, the picture {shape[1]}x{shape[0]}')
    out, present = {}, {}
    for k, col in MAP.items():
        raw = Image.fromarray(((m == col).all(axis=2) * 255).astype(np.uint8))
        present[k] = bool(np.array(raw).any())   # version 2: in the map at all, before erosion
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
    tan = readable & (c >= C_NEUTRAL) & (h >= TAN_BAND[0]) & (h <= TAN_BAND[1]) & (l < 0.80)   # version 4
    grey = readable & (c < C_NEUTRAL)
    med_l = float(np.median(l))
    return {'pixels': n, 'inBase': round(float(fam.mean()), 4), 'tanOlive': round(float(tan.mean()), 4), 'grey': round(float(grey.mean()), 4),
            'tooDark': round(float((~readable).mean()), 4), 'medianL': round(med_l, 3), 'onRamp': ramp_place(med_l),
            'medianChroma': round(float(np.median(c)), 3), 'medianHueOfReadable': round(float(np.median(h[readable & (c >= C_NEUTRAL)])), 1) if (readable & (c >= C_NEUTRAL)).any() else None}


def check(picture, regions_png):
    rgb = np.array(Image.open(picture).convert('RGB'))
    L, C, H = oklch(rgb)
    mk = masks(regions_png, rgb.shape[:2])
    res = {'picture': picture, 'map': regions_png, 'method': 'OKLCH', 'hueBand': HUE_BAND, 'gates': GATES, 'areas': {}}
    if 'whole' in mk:
        res['areas']['whole frame'] = area_stats(L, C, H, mk['whole'])
        wd = mk['whole']
    else:
        present = mk.pop('_present')
        # version 2: the areas this view holds; the deck and at least one wall must be there
        absent = [name for name, keys in (('back wall', ('back',)), ('side walls', ('left', 'right')), ('deck', ('deck',)), ('window', ('window',)), ('screen', ('screen',)), ('skylight', ('skylight',)))
                  if not any(present[k] for k in keys)]
        if 'deck' in absent or ('back wall' in absent and 'side walls' in absent):
            raise SystemExit('the map has no deck or no wall: it is not a Room B view map')
        walls = (mk['back'] | mk['left'] | mk['right']) & ~mk['lamp']   # version 4: the lamps are not wall
        wd = walls | (mk['deck'] & ~mk['lamp'])
        for name, sel in [('walls and deck', wd), ('back wall', mk['back']), ('side walls', mk['left'] | mk['right']), ('deck', mk['deck'])]:
            res['areas'][name] = area_stats(L, C, H, sel)
        for name in ('window', 'screen', 'display', 'liquid', 'skylight', 'lamp'):
            sel = mk[name]
            res['areas'][name] = {'pixels': int(sel.sum()), 'p95L': round(float(np.percentile(L[sel], 95)), 3) if sel.any() else None,
                                  'medianL': round(float(np.median(L[sel])), 3) if sel.any() else None}
    # version 4: the warm light and the accents, over the whole picture
    hue = lambda a, b: (H >= a) & (H <= b)
    rd = L >= L_BLACK
    orange = rd & hue(*ORANGE['hue']) & (C >= ORANGE['C']) & (L >= ORANGE['L'])
    rust = rd & hue(*RUST['hue']) & (C >= RUST['C'][0]) & (C < RUST['C'][1]) & (L >= RUST['L'][0]) & (L < RUST['L'][1])
    cream = hue(*CREAM['hue']) & (C >= CREAM['C']) & (L >= CREAM['L'])
    bluegreen = rd & hue(*BLUEGREEN) & (C >= 0.05)
    bright = (L >= 0.55) & (C >= 0.08)
    allowed = hue(HUE_BAND[0], 360.0) | hue(0.0, 105.0) | hue(*BLUEGREEN)
    stray = bright & ~allowed
    res['warm'] = {'orange': round(float(orange.mean()), 4), 'rust': round(float(rust.mean()), 4), 'cream': round(float(cream.mean()), 4), 'blueGreen': round(float(bluegreen.mean()), 4)}
    res['accents'] = {'brightSaturated': round(float(bright.mean()), 4), 'strayShare': round(float(stray.mean()), 5), 'strayPixels': int(stray.sum())}
    a = res['areas']
    caps = {'orange capped': res['warm']['orange'] <= 0.08, 'rust capped': res['warm']['rust'] <= 0.03, 'accents only orange, cream, rust, blue-green': res['accents']['strayShare'] <= 0.002}
    if 'whole frame' in a:
        w = a['whole frame']
        res['result'] = {'walls and deck in the base': w['inBase'] >= 0.60, **caps, 'no tan or olive': w['tanOlive'] <= 0.03, 'not grey': w['grey'] <= 0.15,
                         'median lightness': 0.30 <= w['medianL'] <= 0.60, 'note': 'whole frame, no map: for calibration only'}
    else:
        w = a['walls and deck']
        res['result'] = {
            'walls and deck in the base': w['inBase'] >= 0.60,
            'each wall and the deck in the base': all(a[k].get('inBase', -1) >= 0.45 for k in ('back wall', 'side walls', 'deck') if k not in absent),
            **caps, 'no tan or olive': w['tanOlive'] <= 0.03, 'not grey': w['grey'] <= 0.15,
            'median lightness': 0.30 <= w['medianL'] <= 0.60,
            'openings flat black': all(a[k]['p95L'] is not None and a[k]['p95L'] < 0.12 for k in ('window', 'screen', 'skylight') if k not in absent),
        }
        if absent:
            res['absent'] = absent
    res['pass'] = all(v for k, v in res['result'].items() if k != 'note')
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
