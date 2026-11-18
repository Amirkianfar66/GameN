"""Cyber comic noir: one finishing look for every layer of a pre-game film (a prototype, for the owner's review).

A picture from any source (an image generator, the code-drawn sets, the crew's rig) goes through the same steps, tuned
by its depth ('far', 'mid', 'near'):
  1. team colours kept away: blues pushed to teal, reds to amber, violets to magenta (the role films' colour rule);
  2. colour script: everything into one limited palette; only the luminous accents keep their saturation;
  3. noir contrast: shadows crushed toward a blue-green black, hard light;
  4. comic tones: flattened into a few bands; halftone dots in the shadows; an ink line along strong edges;
  5. light and print: bloom on the accents, haze by depth, grain, specks, vignette.
Run offline on the background plates (nothing on the phone); the code-drawn crew gets the same grade when drawn.

The look test (look-test.html) ran it on the owner's painted Room A picture and three code-drawn plates. The owner's
picture is not in the repository: it is referred to by name only (rooma-before.jpg), and no picture is stored here.
"""
import sys
import numpy as np
from PIL import Image

DEPTH = {
    'far': dict(mid=0.46, lo=0.06, hi=0.8, desat=0.55, crush=0.04, gamma=1.05, bands=0.25, ink=0.35, dots=0.18, haze=0.22, soft=1.2, bloom=0.9),
    'mid': dict(mid=0.44, lo=0.02, hi=0.9, desat=0.42, crush=0.05, gamma=1.15, bands=0.35, ink=0.75, dots=0.32, haze=0.0, soft=0.0, bloom=0.7),
    'near': dict(mid=0.36, lo=0.0, hi=0.85, desat=0.38, crush=0.08, gamma=1.3, bands=0.35, ink=0.95, dots=0.38, haze=0.0, soft=1.6, bloom=0.5),
}
# Each location's colour script: the black its shadows sink to, the white its light warms to, the wash over its
# mid-tones, the haze of its air, and how much colour it keeps. The steps are the same everywhere.
PALETTES = {
    'steel': dict(shadow=(0.03, 0.07, 0.08), high=(1.0, 0.9, 0.76), wash=(0.9, 0.98, 1.0), haze=(0.2, 0.24, 0.27), keep=1.0),
    'rust': dict(shadow=(0.07, 0.04, 0.02), high=(1.0, 0.86, 0.62), wash=(1.0, 0.8, 0.58), haze=(0.36, 0.27, 0.19), keep=1.5),
    'cosmos': dict(shadow=(0.03, 0.02, 0.06), high=(1.0, 0.95, 0.88), wash=(0.96, 0.94, 1.0), haze=(0.08, 0.06, 0.12), keep=2.0),
}
HAZE = np.array([0.20, 0.24, 0.27], np.float32)
SHADOW = np.array([0.03, 0.07, 0.08], np.float32)   # the blue-green black the shadows sink to
HIGH = np.array([1.0, 0.9, 0.76], np.float32)       # a warm white for the highlights


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def box(a, r):
    """A box blur of radius r (pixels) along both axes, by running sums."""
    if r < 1:
        return a
    r = int(r)
    out = a
    for axis in (0, 1):
        pad = [(0, 0)] * out.ndim
        pad[axis] = (r + 1, r)
        p = np.pad(out, pad, mode='edge')
        c = np.cumsum(p, axis=axis, dtype=np.float32)
        n = out.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        out = (hi - lo) / (2 * r + 1)
    return out


def blur(a, r, passes=3):
    for _ in range(passes):
        a = box(a, max(1, r / passes ** 0.5))
    return a


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0)
    gc = np.where(m, (mx - g) / np.where(m, d, 1), 0)
    bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2 + rc - bc, 4 + gc - rc))
    h = np.where(m, (h / 6) % 1, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    choices = [np.stack(c, -1) for c in ((v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q))]
    out = np.zeros(hsv.shape, np.float32)
    for k in range(6):
        out = np.where((i == k)[..., None], choices[k], out)
    return out


def hue_pull(h, s, center, half, target):
    """Pull hues near `center` (degrees) to `target`, by how near and how saturated they are."""
    d = ((h * 360 - center + 180) % 360) - 180
    w = smoothstep(1.0, 0.55, np.abs(d) / half) * smoothstep(0.22, 0.45, s)
    delta = ((target - h * 360 + 180) % 360) - 180
    return (h + w * delta / 360) % 1


def noir(rgb, depth='mid', seed=3, palette='steel'):
    P = DEPTH[depth]
    C = PALETTES[palette]
    SHADOW, HIGH, HAZE = (np.array(C[k], np.float32) for k in ('shadow', 'high', 'haze'))
    H, W = rgb.shape[:2]
    hsv = rgb_to_hsv(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # 0 · Exposure matched: whatever the source, its darks and lights land on the same levels for this depth.
    p2, p98 = np.percentile(v, 2), np.percentile(v, 99)
    v = np.clip((v - p2) / max(1e-3, p98 - p2), 0, 1.2) * (P['hi'] - P['lo']) + P['lo']
    m = float(np.median(v))
    v = np.clip(v, 0, None) ** float(np.clip(np.log(P['mid']) / np.log(max(1e-3, min(0.99, m))), 0.45, 2.0))
    # 1 · Team colours kept away: blue to teal, violet to magenta, red to amber.
    h = hue_pull(h, s, 222, 34, 184)
    h = hue_pull(h, s, 270, 26, 322)
    h = hue_pull(h, s, 4, 30, 36)
    # 2 · Colour script: one limited palette; only bright, saturated light keeps its colour.
    accent = smoothstep(0.42, 0.72, s) * smoothstep(0.55, 0.88, v)
    keep = min(1.0, P['desat'] * C['keep'])
    s = s * (keep + (1 - keep) * accent)
    # 3 · Noir contrast: shadows crushed, mid-tones darkened, the light kept hard.
    v1 = np.clip((v - P['crush']) / (1 - P['crush']), 0, 1) ** P['gamma']
    v2 = v1 * v1 * (3 - 2 * v1)
    vv = v1 * 0.5 + v2 * 0.5
    vv = vv + (v - vv) * accent * 0.6
    out = hsv_to_rgb(np.stack([h, s, vv], -1))
    Y = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    ws = (1 - Y) ** 3
    out = out + (SHADOW - out) * (ws * 0.45)[..., None]
    wh = Y ** 4
    out = out + (out * HIGH - out) * (wh * 0.5)[..., None]
    wm = 4 * Y * (1 - Y)
    out = out * (1 + (np.array(C['wash'], np.float32) - 1) * (wm * 0.6)[..., None])
    # 4 · Comic tones: a few flat bands, halftone dots in the shadows, an ink line along strong edges.
    Y = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    n = 4
    q = np.floor(Y * n)
    fr = Y * n - q
    Yq = (q + smoothstep(0.3, 0.7, fr)) / n
    k = np.where(Y > 1e-4, Yq / np.maximum(Y, 1e-4), 1)
    out = out * (1 + (np.clip(k, 0, 3)[..., None] - 1) * P['bands'])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cell = max(4.0, W / 190)
    u, w = (xx + yy) / 1.41421 / cell, (xx - yy) / 1.41421 / cell
    dist = np.hypot(u - np.floor(u) - 0.5, w - np.floor(w) - 0.5)
    dark = smoothstep(0.6, 0.08, Y)
    rad = 0.52 * np.sqrt(dark)
    dots = smoothstep(rad + 0.07, rad - 0.07, dist) * smoothstep(0.62, 0.3, Y)
    out = out * (1 - P['dots'] * dots)[..., None]
    L = blur(Y, max(1.0, W / 700), passes=2)
    gx = np.roll(L, -1, 1) - np.roll(L, 1, 1)
    gy = np.roll(L, -1, 0) - np.roll(L, 1, 0)
    mag = np.hypot(gx, gy)
    t0, t1 = np.percentile(mag, 86), np.percentile(mag, 97)
    edges = smoothstep(t0, t1, mag)
    out = out * (1 - P['ink'] * 0.8 * edges)[..., None] + np.array([0.02, 0.025, 0.035], np.float32) * (P['ink'] * 0.8 * edges)[..., None]
    # 5 · Light and print: bloom on the accents, haze and softness by depth, grain, specks, vignette.
    hsv2 = rgb_to_hsv(np.clip(out, 0, 1))
    glow = np.clip(out, 0, 1) * (smoothstep(0.62, 0.92, hsv2[..., 2]) * smoothstep(0.3, 0.6, hsv2[..., 1]))[..., None]
    glow = blur(glow, W / 45)
    out = 1 - (1 - np.clip(out, 0, 1)) * (1 - glow * P['bloom'])
    if P['haze']:
        out = out + (HAZE - out) * P['haze']
    if P['soft']:
        out = blur(out, P['soft'] * W / 700, passes=2)
    rng = np.random.default_rng(seed)
    out = out + rng.normal(0, 0.022, (H, W, 1)).astype(np.float32)
    specks = rng.random((H, W)) < 0.0007
    out[specks] = out[specks] * 0.4 + 0.6 * np.array([0.92, 0.9, 0.86], np.float32)
    r = np.hypot((xx - W / 2) / (W / 2), (yy - H * 0.46) / (H / 2))
    out = out * (1 - 0.5 * smoothstep(0.55, 1.25, r))[..., None]
    return np.clip(out, 0, 1)


def lab(rgb):
    c = np.where(rgb > 0.04045, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


TEAMS = {'blue': (41, 121, 255), 'red': (232, 66, 63), 'alien': (155, 92, 255)}


def nearest_team(rgb):
    L = lab(rgb.reshape(-1, 3).astype(np.float64))
    return {k: round(float(np.linalg.norm(L - lab(np.array(v, float) / 255), axis=1).min()), 1) for k, v in TEAMS.items()}


if __name__ == '__main__':
    src, dst, depth = sys.argv[1], sys.argv[2], (sys.argv[3] if len(sys.argv) > 3 else 'mid')
    palette = sys.argv[4] if len(sys.argv) > 4 else 'steel'
    crop = None
    im = Image.open(src).convert('RGB')
    if crop:
        im = im.crop(crop)
    a = np.asarray(im, np.float32) / 255
    out = noir(a, depth, palette=palette)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, quality=90)
    print(dst, 'before', nearest_team(a[::2, ::2]), 'after', nearest_team(out[::2, ::2]))
