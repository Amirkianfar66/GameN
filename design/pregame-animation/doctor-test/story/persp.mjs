// A small perspective kit for the new world's illustrations (the owner's references, 17 November 2026: deep
// one-point streets and rooms, dense hand-inked linework, hatching that follows the surfaces, hulls greebled to the
// last plate). Things are modelled in metres (x right, y up, z away), projected through a camera, and drawn as SVG
// in the new ink: flat fills in two or three tones, ink lines whose weight falls off with distance, hatching laid
// along each surface so it converges with it, panel seams, vents and rivets, and haze that thickens with depth.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const v3 = { sub, add, mul, dot, cross, norm };
export const f = v => Number((+v).toFixed(2));

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** A camera: `eye`, looking at `look`, vertical field of view `fov` (radians), on a W x H picture. */
export function camera({ W, H, eye, look, up = [0, 1, 0], fov = 1.1, shift = [0, 0] }) {
  const fw = norm(sub(look, eye)), r = norm(cross(up, fw)), u = cross(fw, r);
  const fl = (H / 2) / Math.tan(fov / 2);
  const P = p => {
    const d = sub(p, eye), x = dot(d, r), y = dot(d, u), z = Math.max(0.05, dot(d, fw));
    return [W / 2 + shift[0] + (x * fl) / z, H / 2 + shift[1] - (y * fl) / z, fl / z, z];
  };
  return { W, H, eye, fw, r, u, fl, P, depth: p => dot(sub(p, eye), fw) };
}

/**
 * A drawing in depth: items are added with their depth and drawn far to near. `ink` the line colour, `haze` the air's
 * colour and `fog` its thickness (metres to half), `light` the direction light comes from (for which faces are lit).
 */
export function scene(cam, { ink = '#07080C', haze = '#8C8FA8', fog = 40, light = [0.4, 0.8, -0.45], weight = 1, ambient = 0.45 } = {}) {
  const items = [];
  const L = norm(light);
  const toward = (fill, k) => mixHex(fill, haze, Math.min(0.85, k));
  const fogAt = z => 1 - Math.pow(0.5, z / fog);
  const NEAR = 0.35;
  /** A polygon cut to what lies in front of the camera's near plane. */
  const clipPoly = pts => {
    const out = [];
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i], b = pts[(i + 1) % pts.length], da = cam.depth(a) - NEAR, db = cam.depth(b) - NEAR;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) out.push(lerp3(a, b, da / (da - db)));
    }
    return out;
  };
  /** A segment cut to the near plane, or null. */
  const clipSeg = (a, b) => {
    const da = cam.depth(a) - NEAR, db = cam.depth(b) - NEAR;
    if (da < 0 && db < 0) return null;
    if (da >= 0 && db >= 0) return [a, b];
    const m = lerp3(a, b, da / (da - db));
    return da >= 0 ? [a, m] : [m, b];
  };
  const path = pts => `M${pts.map(p => { const q = cam.P(p); return `${f(q[0])} ${f(q[1])}`; }).join('L')}Z`;
  const lw = (z, w) => f(Math.max(0.35, Math.min(6, (w * weight * cam.fl) / (z * 260))));
  const S = {
    cam, items, ink, path,
    /** Adds raw SVG at a depth. */
    raw(z, svg) { items.push({ z, svg }); },
    /**
     * A flat face (3 or more points, in order). Shaded by the light (its normal), hazed by its depth, inked round.
     * `hatch` lays lines along it in its own u (p0→p1) and v (p0→last) directions; `panels` cuts it into plates.
     */
    face(pts, fill, { w = 1.6, hatch = null, panels = null, seed = 1, twoSided = false, glow = false, noInk = false, alpha = null } = {}) {
      const n = norm(cross(sub(pts[1], pts[0]), sub(pts[pts.length - 1], pts[0])));
      const c = mul(pts.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pts.length);
      const facing = dot(n, sub(cam.eye, c));
      if (facing < 0 && !twoSided) return;
      const nn = facing < 0 ? mul(n, -1) : n;
      const lit = glow ? 1 : Math.max(0, dot(nn, L));
      const z = cam.depth(c), fg = fogAt(z);
      const base = glow ? fill : shadeHex(fill, ambient + (1 - ambient) * lit);
      const shown = clipPoly(pts);
      if (shown.length < 3) return;
      const cut = shown.length !== pts.length || shown.some((p, i) => p !== pts[i]);
      S.n = (S.n ?? 0) + 1;
      const cid = `pf${S.n}`;
      let svg = `<path d="${path(shown)}" fill="${toward(base, fg)}"${alpha == null ? '' : ` opacity="${alpha}"`}/>`;
      let inner = '';
      if (panels && pts.length === 4) inner += S.platesOn(pts, panels, { z, fg, seed, lit, fill });
      if (hatch && pts.length === 4 && (hatch.always || lit < (hatch.below ?? 0.55))) inner += S.hatchOn(pts, { ...hatch, z, fg });
      if (inner) svg += cut ? `<clipPath id="${cid}"><path d="${path(shown)}"/></clipPath><g clip-path="url(#${cid})">${inner}</g>` : inner;
      if (!noInk) svg += `<path d="${path(shown)}" fill="none" stroke="${ink}" stroke-width="${lw(z, w)}" stroke-linejoin="round" opacity="${f(1 - fg * 0.7)}"/>`;
      items.push({ z, svg });
    },
    /** Hatching on a quad: `n` lines across it, slanted by `slant` (of the face's width), lighter with haze. */
    hatchOn(pts, { n = 18, slant = 0.25, w = 0.7, opacity = 0.55, z, fg, cross: x = false }) {
      const [a, b, c, d] = pts;
      let s = '';
      const line = (p, q) => { const sg = clipSeg(p, q); if (!sg) return; const P1 = cam.P(sg[0]), P2 = cam.P(sg[1]); s += `M${f(P1[0])} ${f(P1[1])}L${f(P2[0])} ${f(P2[1])}`; };
      for (let i = -Math.ceil(n * Math.abs(slant)); i <= n; i += 1) {
        const u0 = i / n, u1 = u0 + slant;
        const t0 = Math.max(0, Math.min(1, u0)), t1 = Math.max(0, Math.min(1, u1));
        if (t0 === t1) continue;
        const v0 = slant ? (t0 - u0) / slant : 0, v1 = slant ? 1 - (u1 - t1) / slant : 1;
        line(lerp3(lerp3(a, b, t0), lerp3(d, c, t0), v0), lerp3(lerp3(a, b, t1), lerp3(d, c, t1), v1));
        if (x) line(lerp3(lerp3(a, d, t0), lerp3(b, c, t0), v0), lerp3(lerp3(a, d, t1), lerp3(b, c, t1), v1));
      }
      return `<path d="${s}" stroke="${ink}" stroke-width="${lw(z, w)}" fill="none" opacity="${f(opacity * (1 - fg * 0.8))}"/>`;
    },
    /** Cuts a quad into plates: seams, some plates darker or with vents, rivets at corners. */
    platesOn(pts, { cols = 4, rows = 3, vents = 0.15, dark = 0.2, rivets = true }, { z, fg, seed, lit, fill }) {
      const r = rng(seed), [a, b, c, d] = pts;
      const at = (u, v) => lerp3(lerp3(a, b, u), lerp3(d, c, u), v);
      let s = '', seams = '', dots = '';
      const us = [0], vs = [0];
      for (let i = 1; i < cols; i += 1) us.push(i / cols + (r() - 0.5) * 0.3 / cols);
      for (let i = 1; i < rows; i += 1) vs.push(i / rows + (r() - 0.5) * 0.3 / rows);
      us.push(1); vs.push(1);
      for (let i = 0; i < cols; i += 1) for (let j = 0; j < rows; j += 1) {
        const u0 = us[i], u1 = us[i + 1], v0 = vs[j], v1 = vs[j + 1], k = r();
        const quad = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
        const vis = clipPoly(quad);
        if (vis.length < 3) continue;
        if (k < dark) s += `<path d="${path(vis)}" fill="${toward(shadeHex(fill, 0.35 + 0.4 * lit), fg)}"/>`;
        else if (k < dark + vents) {
          let vl = '';
          for (let q = 1; q < 7; q += 1) { const sg = clipSeg(at(u0 + (u1 - u0) * 0.15, v0 + ((v1 - v0) * q) / 7), at(u0 + (u1 - u0) * 0.85, v0 + ((v1 - v0) * q) / 7)); if (!sg) continue; const P1 = cam.P(sg[0]), P2 = cam.P(sg[1]); vl += `M${f(P1[0])} ${f(P1[1])}L${f(P2[0])} ${f(P2[1])}`; }
          s += `<path d="${vl}" stroke="${ink}" stroke-width="${lw(z, 0.9)}" opacity="${f(0.8 - fg * 0.6)}"/>`;
        }
        if (rivets && k > 0.6) for (const [uu, vv] of [[u0 + 0.06 * (u1 - u0), v0 + 0.08 * (v1 - v0)], [u1 - 0.06 * (u1 - u0), v0 + 0.08 * (v1 - v0)]]) { if (cam.depth(at(uu, vv)) < NEAR) continue; const P1 = cam.P(at(uu, vv)); dots += `<circle cx="${f(P1[0])}" cy="${f(P1[1])}" r="${f(Math.max(0.4, P1[2] * 0.012))}"/>`; }
        for (const [p, q] of [[at(u0, v1), at(u1, v1)], [at(u1, v1), at(u1, v0)]]) { const sg = clipSeg(p, q); if (!sg) continue; const P1 = cam.P(sg[0]), P2 = cam.P(sg[1]); seams += `M${f(P1[0])} ${f(P1[1])}L${f(P2[0])} ${f(P2[1])}`; }
      }
      return s + `<path d="${seams}" stroke="${ink}" stroke-width="${lw(z, 0.8)}" fill="none" opacity="${f(0.85 - fg * 0.6)}"/><g fill="${ink}" opacity="${f(0.8 - fg * 0.6)}">${dots}</g>`;
    },
    /** A box from corner `a` to corner `b` (axis-aligned), each visible face shaded; options pass to face(). */
    box(a, b, fill, opts = {}) {
      const [x0, y0, z0] = a, [x1, y1, z1] = b;
      S.solid([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], fill, opts);
    },
    /** A solid of eight corners (as box orders them), each visible face drawn. */
    solid(P, fill, opts = {}) {
      const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]];
      faces.forEach((q, i) => S.face(q.map(k => P[k]), (opts.fills && opts.fills[i]) || fill, { ...opts, seed: (opts.seed ?? 1) + i }));
    },
    /** A box turned: centre `c`, half-sizes [along f, along u, along s], and the basis { f, u, s }. */
    obox(c, [hf, hu, hs], { f: F, u: U, s: Sd }, fill, opts = {}) {
      const at = (a, b, d) => add(add(add(c, mul(F, a * hf)), mul(U, b * hu)), mul(Sd, d * hs));
      S.solid([at(-1, -1, -1), at(1, -1, -1), at(1, 1, -1), at(-1, 1, -1), at(-1, -1, 1), at(1, -1, 1), at(1, 1, 1), at(-1, 1, 1)], fill, opts);
    },
    /** A pipe through 3D points, radius `r` metres: an ink outline, its body, a lit line along its top. */
    pipe(points, r, color, { light = '#B9C4D3', w = 1.4 } = {}) {
      for (let i = 0; i < points.length - 1; i += 1) {
        const sg = clipSeg(points[i], points[i + 1]);
        if (!sg) continue;
        // In short pieces, each tapered from its near end to its far end as perspective makes it.
        const len = Math.hypot(...sub(sg[1], sg[0])), n = Math.max(1, Math.min(24, Math.ceil(len / 0.8)));
        for (let k = 0; k < n; k += 1) {
          const p = lerp3(sg[0], sg[1], k / n), q = lerp3(sg[0], sg[1], (k + 1) / n), z = (cam.depth(p) + cam.depth(q)) / 2, fg = fogAt(z);
          const A = cam.P(p), B = cam.P(q);
          let dx = B[0] - A[0], dy = B[1] - A[1];
          const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const nx = -dy, ny = dx, ra = r * A[2], rb = r * B[2], e = (k === 0 || k === n - 1) ? 0 : 0.6;
          const band = (o0, o1, grow = 0) => `M${f(A[0] - dx * e + nx * (ra * o0 + grow))} ${f(A[1] - dy * e + ny * (ra * o0 + grow))}L${f(B[0] + dx * e + nx * (rb * o0 + grow))} ${f(B[1] + dy * e + ny * (rb * o0 + grow))}L${f(B[0] + dx * e + nx * (rb * o1 - grow))} ${f(B[1] + dy * e + ny * (rb * o1 - grow))}L${f(A[0] - dx * e + nx * (ra * o1 - grow))} ${f(A[1] - dy * e + ny * (ra * o1 - grow))}Z`;
          // The side toward the light (up the screen) is lit.
          const up = ny < 0 ? 1 : -1;
          let svg = `<path d="${band(-1, 1, 0)}" fill="${toward(shadeHex(color, 0.55), fg)}"/>`
            + `<path d="${band(up * 0.85, up * 0.05)}" fill="${toward(color, fg)}"/>`
            + `<path d="${band(up * 0.62, up * 0.48)}" fill="${toward(light, fg)}" opacity="0.75"/>`
            + `<path d="${band(-up * 0.95, -up * 0.55)}" fill="${ink}" opacity="${f(0.45 * (1 - fg))}"/>`;
          const edge = (o) => `M${f(A[0] + nx * ra * o)} ${f(A[1] + ny * ra * o)}L${f(B[0] + nx * rb * o)} ${f(B[1] + ny * rb * o)}`;
          svg += `<path d="${edge(1)}${edge(-1)}" stroke="${ink}" stroke-width="${lw(z, w)}" fill="none" opacity="${f(1 - fg * 0.6)}"/>`;
          if (k % 2 === 1) svg += `<path d="M${f(B[0] + nx * rb * 1.18)} ${f(B[1] + ny * rb * 1.18)}L${f(B[0] - nx * rb * 1.18)} ${f(B[1] - ny * rb * 1.18)}" stroke="${ink}" stroke-width="${f(Math.max(0.8, rb * 0.5))}" opacity="${f(0.9 - fg * 0.6)}"/><path d="M${f(B[0] + nx * rb * 1.1)} ${f(B[1] + ny * rb * 1.1)}L${f(B[0] - nx * rb * 1.1)} ${f(B[1] - ny * rb * 1.1)}" stroke="${toward(shadeHex(color, 0.85), fg)}" stroke-width="${f(Math.max(0.5, rb * 0.28))}"/>`;
          items.push({ z, svg });
        }
      }
    },
    /** A cable hanging between two 3D points, sagging `sag` metres. */
    cable(p, q, sag, { r = 0.025, color = '#111318' } = {}) {
      const pts = [];
      for (let k = 0; k <= 24; k += 1) { const t = k / 24, m = lerp3(p, q, t); m[1] -= sag * 4 * t * (1 - t); if (cam.depth(m) >= NEAR) pts.push(cam.P(m)); }
      if (pts.length < 2) return;
      const z = (cam.depth(p) + cam.depth(q)) / 2, fg = fogAt(z), wd = Math.max(0.6, Math.min(14, 2 * r * pts[Math.floor(pts.length / 2)][2]));
      const d = `M${pts.map(P => `${f(P[0])} ${f(P[1])}`).join('L')}`;
      items.push({ z: z - 0.01, svg: `<path d="${d}" stroke="${toward(color, fg)}" stroke-width="${f(wd)}" fill="none" stroke-linecap="round"/>` });
    },
    /** A light: a glowing disc at a 3D point, `r` metres, and its bloom. */
    lamp(p, r, color, { bloom = 6, z: zz = null } = {}) {
      const P = cam.P(p), z = zz ?? cam.depth(p);
      items.push({ z: z - 0.02, svg: `<circle cx="${f(P[0])}" cy="${f(P[1])}" r="${f(Math.min(60, r * P[2] * bloom * 0.45))}" fill="${color}" opacity="0.3" filter="url(#px-bloom)"/><circle cx="${f(P[0])}" cy="${f(P[1])}" r="${f(Math.max(0.8, r * P[2]))}" fill="${color}"/>` });
    },
    svg(min = -Infinity, max = Infinity) { return items.filter(i => i.z >= min && i.z < max).sort((a, b) => b.z - a.z).map(i => i.svg).join(''); },
  };
  return S;
}

/** The shared definitions: bloom, grain, specks. */
export const PERSP_DEFS = '<filter id="px-bloom" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>'
  + '<filter id="px-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>'
  + '<filter id="px-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.05  0 0 0 0 0.06  0 0 0 18 -11"/></filter>'
  + '<filter id="px-specks" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.93  0 0 0 0 0.9  0 0 0 22 -15.6"/></filter>';

/** The grain and specks over a whole picture (the printed page's texture). */
export const grain = (W, H, k = 1) => `<rect width="${W}" height="${H}" filter="url(#px-grain)" opacity="${f(0.55 * k)}"/><rect width="${W}" height="${H}" filter="url(#px-specks)" opacity="${f(0.45 * k)}"/>`;

export function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
export function shadeHex(a, k) { return mixHex('#000000', a, Math.max(0, Math.min(1.25, k)) > 1 ? 1 : k).replace(/^#000000$/, '#000000'); }
