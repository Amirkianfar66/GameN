// The boarding film's entrance, seen from the ramp: runtime source, Designer's. The lit doorway at the top of the ramp,
// the hull over it, the dusk under it. A small set in three dimensions, so the camera can stand low at the ramp's foot,
// push in and climb: x across, y up from the ground, z away from the lens, in the crew's own units (a figure stands
// about 225 high). Only the hull's wall is a picture drawn once (the crew's ink); the rest is laid on the canvas.

import { inkCanvas } from '../../../../apps/game/hosted/crew-drawing/ink.mjs';
import { clamp01, ease, hash, lerp, noise } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { beam, glow, rgba, streak } from './engine.mjs';

const INK = '#0B0E15';
/** The set: the ramp from its foot to the sill, the doorway in the wall at its top, the hull's belly and far legs. */
export const SET = Object.freeze({
  foot: 250, door: 790, sill: 262, // z of the ramp's foot and of the wall; the sill's height
  half: 98, // the ramp's half width
  doorHalf: 86, doorHigh: 236, // the doorway
  belly: 248, deep: 1210, // the hull's underside: its near edge is the wall, its far edge `deep`
});
/** The wall's picture covers this box, in wall units: x across from the doorway's middle, y down from the sill. */
export const WALL_BOX = Object.freeze([-1160, -700, 2320, 730]);

/** The ramp's height at depth z. */
export const rampY = z => SET.sill * clamp01((z - SET.foot) / (SET.door - SET.foot));

/**
 * The hull's wall round the entrance, in the crew's ink: its plating, the entrance's frame and the trim on its jambs,
 * the lamp over it, two ports, a conduit. SVG markup for WALL_BOX; drawn once. The doorway itself is left dark: what is
 * in it is laid there each frame.
 */
export function wallArt() {
  const cv = inkCanvas('bf-wall');
  const hull = '#363E55', lit = '#4A5470', deep = '#1E2434', trim = '#2C3346';
  const { doorHalf: dh, doorHigh: dH } = SET;
  cv.form([[-1200, -720], [1200, -720], [1200, 14], [-1200, 14]], hull, { weight: 0, depth: 0, rim: false, hatch: false, seed: 3, tension: 0.05 });
  cv.form([[-1200, -720], [1200, -720], [1200, -470], [-1200, -476]], lit, { weight: 2.6, depth: 9, seed: 4, tension: 0.05 });
  cv.form([[-1200, -40], [1200, -36], [1200, 30], [-1200, 30]], deep, { weight: 3, depth: 6, seed: 5, tension: 0.05 });
  for (const x of [-1090, -936, -780, -626, -470, -312, -160, 160, 312, 470, 626, 780, 936, 1090]) cv.line([[x, -716], [x + 3, -40]], { weight: 1.8, color: '#151A26', taper: 'none' });
  for (const [x0, x1, y] of [[-1200, -118, -292], [118, 1200, -290], [-1200, 1200, -598]]) cv.line([[x0, y], [x1, y + 2]], { weight: 1.5, color: '#141823', taper: 'none' });
  cv.line([[-1200, -474], [1200, -470]], { weight: 2.8, color: '#9AA6C2', taper: 'none' });
  // A conduit along the wall and its brackets.
  cv.form([[-1200, -372], [-128, -372], [-128, -356], [-1200, -356]], '#2A3044', { weight: 1.8, depth: 3, seed: 8, tension: 0.05 });
  cv.form([[128, -372], [1200, -372], [1200, -356], [128, -356]], '#2A3044', { weight: 1.8, depth: 3, seed: 9, tension: 0.05 });
  for (const x of [-1100, -960, -810, -660, -520, -380, -236, 236, 380, 520, 660, 810, 960, 1100]) cv.form([[x - 7, -378], [x + 7, -378], [x + 7, -350], [x - 7, -350]], '#1C2131', { weight: 1.4, depth: 1, seed: 20 + x, tension: 0.1, rim: false });
  // Ports either side of the entrance.
  let extra = '';
  for (const x of [-860, -550, -250, 250, 550, 860]) extra += `<circle cx="${x}" cy="-150" r="22" fill="#1A2030" stroke="${INK}" stroke-width="5"/><circle cx="${x - 6}" cy="-156" r="7" fill="#3B4664" opacity="0.7"/>`;
  // The entrance's frame: jambs and lintel, standing proud of the wall.
  cv.form([[-dh - 30, -dH - 34], [dh + 30, -dH - 34], [dh + 26, -dH - 2], [-dh - 26, -dH - 2]], trim, { weight: 3.4, depth: 6, seed: 31, tension: 0.08 });
  cv.form([[-dh - 30, -dH - 30], [-dh - 2, -dH - 4], [-dh - 2, 8], [-dh - 30, 8]], trim, { weight: 3.4, depth: 5, seed: 32, tension: 0.08 });
  cv.form([[dh + 2, -dH - 4], [dh + 30, -dH - 30], [dh + 30, 8], [dh + 2, 8]], trim, { weight: 3.4, depth: 5, seed: 33, tension: 0.08 });
  // The trim on the jambs: slanted bars, dull until the entrance seals.
  for (const side of [-1, 1]) for (let i = 0; i < 6; i += 1) {
    const x0 = side * (dh + 8), x1 = side * (dh + 24), y = -34 - i * 36;
    extra += `<path d="M${x0} ${y}L${x1} ${y - 12}L${x1} ${y - 26}L${x0} ${y - 14}Z" fill="#8A6A32" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }
  // The lamp over the entrance, and the rivets along the frame.
  cv.form([[-34, -dH - 62], [34, -dH - 62], [40, -dH - 38], [-40, -dH - 38]], '#1C2131', { weight: 2.4, depth: 3, seed: 36, tension: 0.2 });
  for (let i = 0; i < 9; i += 1) extra += `<circle cx="${-dh - 16 + i * ((dh + 16) * 2 / 8)}" cy="${-dH - 18}" r="2.6" fill="#141823"/>`;
  extra += `<rect x="${-dh}" y="${-dH}" width="${dh * 2}" height="${dH}" fill="#10141E"/>`;
  return `<defs>${cv.defs()}</defs>${cv.layer('body')}${extra}`;
}

/** The dusk seen under the hull, beyond the ship: its gold on the horizon, a far range, the ground. */
export function paintBeyond(ctx, view, at) {
  const [, horizon] = at(0, 0, 1e9);
  const g = ctx.createLinearGradient(0, horizon - view.H * 0.34, 0, horizon);
  g.addColorStop(0, '#26264A'); g.addColorStop(0.45, '#6A4058'); g.addColorStop(0.78, '#C26B4C'); g.addColorStop(1, '#F2C27A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.W, horizon);
  // A far range on the horizon.
  ctx.fillStyle = '#3A2638';
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  const n = 9;
  for (let i = 0; i <= n; i += 1) {
    const x = view.W * (i / n), h = view.H * (0.012 + 0.03 * hash(i, 61));
    ctx.lineTo(x - view.W * 0.04, horizon - h); ctx.lineTo(x + view.W * 0.04, horizon - h * (0.8 + 0.3 * hash(i, 62)));
  }
  ctx.lineTo(view.W, horizon + 1);
  ctx.closePath(); ctx.fill();
  const ground = ctx.createLinearGradient(0, horizon, 0, view.H);
  ground.addColorStop(0, '#3A2630'); ground.addColorStop(0.25, '#24161F'); ground.addColorStop(1, '#0C080C');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, view.W, view.H - horizon);
  ctx.strokeStyle = rgba('#E7A46E', 0.55); ctx.lineWidth = Math.max(1, view.px);
  ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(view.W, horizon); ctx.stroke();
}

/** The hull's underside from its near edge back, and the far legs standing under it: dark against the dusk. */
export function paintUnderside(ctx, view, at) {
  const [, nearY] = at(0, SET.belly, SET.door), [, farY] = at(0, SET.belly, SET.deep);
  const g = ctx.createLinearGradient(0, nearY, 0, farY);
  g.addColorStop(0, '#0C0F18'); g.addColorStop(1, '#1B1F30');
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(nearY, farY) - 1, view.W, Math.abs(farY - nearY) + 2);
  // The far legs.
  for (const [x, z] of [[-268, 1010], [252, 1040]]) {
    const [tx, ty, ts] = at(x, SET.belly, z), [bx, by] = at(x + (x < 0 ? -10 : 10), 0, z);
    ctx.fillStyle = '#0A0C14';
    ctx.beginPath();
    ctx.moveTo(tx - 16 * ts, ty); ctx.lineTo(tx + 16 * ts, ty); ctx.lineTo(bx + 24 * ts, by); ctx.lineTo(bx - 24 * ts, by);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(bx - 52 * ts, by - 8 * ts, 104 * ts, 10 * ts);
    ctx.strokeStyle = rgba('#F2A86A', 0.5); ctx.lineWidth = Math.max(1, 1.5 * ts);
    ctx.beginPath(); ctx.moveTo(tx + 16 * ts, ty); ctx.lineTo(bx + 24 * ts, by); ctx.stroke();
  }
}

/**
 * What is seen through the open doorway: a short passage running in from the sill (its walls, deck and ceiling warm
 * with the light), a lamp bar in it, and at its end the light itself. Not a white rectangle: a place to walk into.
 */
export function paintInterior(ctx, view, at, light) {
  const { doorHalf: dh, doorHigh: dH, sill, door } = SET;
  const [x0, y1, s0] = at(-dh, sill, door), [x1, y0] = at(dh, sill + dH, door);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.fillStyle = '#10141E'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.globalAlpha = 0.08 + 0.92 * light;
  // The passage: walls, ceiling and deck from the doorway to its far end.
  const deep = door + 260, [fx0, fy1, s1] = at(-dh * 0.9, sill, deep), [fx1, fy0] = at(dh * 0.9, sill + dH * 0.94, deep);
  const quad = (pts, fill) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
  quad([[x0, y0], [x1, y0], [fx1, fy0], [fx0, fy0]], '#C98A4A');
  quad([[x0, y1], [x1, y1], [fx1, fy1], [fx0, fy1]], '#F2B870');
  quad([[x0, y0], [fx0, fy0], [fx0, fy1], [x0, y1]], '#DDA05A');
  quad([[x1, y0], [fx1, fy0], [fx1, fy1], [x1, y1]], '#B97C42');
  // Its ribs and a rail along each wall.
  ctx.strokeStyle = rgba('#7A4A1E', 0.7);
  for (const k of [0.34, 0.68]) {
    const z = lerp(door, deep, k), [ax, ay, s] = at(-lerp(dh, dh * 0.9, k), sill, z), [bx, by] = at(lerp(dh, dh * 0.9, k), sill + lerp(dH, dH * 0.94, k), z);
    ctx.lineWidth = Math.max(1, 5 * s); ctx.strokeRect(ax, by, bx - ax, ay - by);
  }
  for (const side of [-1, 1]) { const a = at(side * dh * 0.98, sill + 96, door + 14), b = at(side * dh * 0.9, sill + 92, deep); ctx.lineWidth = Math.max(1, 4 * s0); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  // The far end: the light, a lamp bar over it.
  const g = ctx.createLinearGradient(0, fy0, 0, fy1);
  g.addColorStop(0, '#FFF6DE'); g.addColorStop(0.7, '#FFE2A8'); g.addColorStop(1, '#FFC978');
  ctx.fillStyle = g; ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(fx0 + (fx1 - fx0) * 0.2, fy0 + 6 * s1, (fx1 - fx0) * 0.6, 9 * s1);
  ctx.restore();
}

/** The door: the slab coming down in the frame (`down` 0..1). Its amber seal, shut: `seal` 0..1 from the sill's middle. */
export function paintSlab(ctx, view, at, down, seal = 0) {
  if (down <= 0) return;
  const { doorHalf: dh, doorHigh: dH, sill, door } = SET;
  const [x0, yTop, s] = at(-dh, sill + dH, door), [x1] = at(dh, sill, door);
  const full = dH * s, h = full * Math.min(1, down), w = x1 - x0, bottom = yTop + h;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, yTop, w, h); ctx.clip();
  // The slab hangs from the lintel: what shows is its lower part first.
  const top = bottom - full;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#4A5470'); g.addColorStop(0.55, '#363E55'); g.addColorStop(1, '#232A3D');
  ctx.fillStyle = g; ctx.fillRect(x0, top, w, full);
  // Its ribs, a window slit, and the warning band along its foot.
  ctx.strokeStyle = '#141925'; ctx.lineWidth = Math.max(1, 4.5 * s);
  ctx.beginPath();
  for (const k of [0.24, 0.5, 0.74]) { const y = top + full * k; ctx.moveTo(x0 + 12 * s, y); ctx.lineTo(x1 - 12 * s, y); }
  ctx.stroke();
  ctx.strokeStyle = rgba('#8FA0C8', 0.35); ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.beginPath();
  for (const k of [0.24, 0.5, 0.74]) { const y = top + full * k + 4 * s; ctx.moveTo(x0 + 12 * s, y); ctx.lineTo(x1 - 12 * s, y); }
  ctx.stroke();
  ctx.fillStyle = '#0E121C'; ctx.fillRect(x0 + w * 0.32, top + full * 0.1, w * 0.36, 14 * s);
  ctx.fillStyle = rgba('#FFC978', 0.5); ctx.fillRect(x0 + w * 0.32 + 3 * s, top + full * 0.1 + 3 * s, w * 0.36 - 6 * s, 8 * s);
  const band = 22 * s, by = bottom - band - 6 * s;
  ctx.fillStyle = '#8A6A32'; ctx.fillRect(x0, by, w, band);
  ctx.fillStyle = '#12151E';
  for (let x = x0 - band; x < x1; x += band * 1.5) { ctx.beginPath(); ctx.moveTo(x, by + band); ctx.lineTo(x + band * 0.75, by); ctx.lineTo(x + band * 1.5, by); ctx.lineTo(x + band * 0.75, by + band); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 5 * s);
  ctx.strokeRect(x0, yTop, w, h);
  if (seal > 0) {
    const half = dh + dH, run = half * seal, along = Math.min(run, dh), up = Math.max(0, run - dh), yS = yTop + full;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(x0 + w / 2, yS);
      ctx.lineTo(x0 + w / 2 + side * along * s, yS);
      if (up > 0) ctx.lineTo(x0 + w / 2 + side * dh * s, yS - up * s);
    }
    // A wide faint line under the seam is its glow; the seam itself over it.
    ctx.strokeStyle = rgba('#FF9A2E', 0.26); ctx.lineWidth = Math.max(4, 16 * s); ctx.stroke();
    ctx.strokeStyle = rgba('#FFB257', 0.96); ctx.lineWidth = Math.max(1.5, 4 * s); ctx.stroke();
    ctx.restore();
    // The seam's two heads: a spark running out along the sill and up each side.
    if (seal < 1) for (const side of [-1, 1]) {
      const hx = x0 + w / 2 + side * (up > 0 ? dh : along) * s, hy = yS - up * s;
      glow(ctx, hx, hy, 34 * s, '#FFE2A8', 0.95, { core: 0.2 });
    }
  }
}

/** The trim on the entrance's jambs, lit: `on` 0..1 from the sill up as the seal runs. `T` is the wall's place. */
export function paintTrim(ctx, T, on) {
  if (on <= 0) return;
  const { doorHalf: dh } = SET;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const side of [-1, 1]) for (let i = 0; i < 6; i += 1) {
    const k = clamp01(on * 6.6 - i);
    if (k <= 0) continue;
    const x0 = side * (dh + 8), x1 = side * (dh + 24), y = -34 - i * 36;
    ctx.fillStyle = rgba('#FF8A1E', 0.75 * k);
    ctx.beginPath();
    for (const [j, [x, yy]] of [[x0, y], [x1, y - 12], [x1, y - 26], [x0, y - 14]].entries()) { const X = T.ox + x * T.s, Y = T.oy + yy * T.s; if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.closePath(); ctx.fill();
    glow(ctx, T.ox + (x0 + x1) / 2 * T.s, T.oy + (y - 13) * T.s, 30 * T.s, '#FF8A1E', 0.35 * k);
  }
  ctx.restore();
}

/**
 * The ramp: its deck from the sill toward the lens, the treads across it, its edge beams and the lights along them.
 * `up` 0..1 draws it back into the hull (its foot comes up to the sill). `light` is the doorway's light on it; `t`
 * runs the edge lights toward the entrance.
 */
export function paintRampFront(ctx, view, at, cam, up, light, t = 0, L = ctx) {
  if (up >= 0.999) return;
  const { foot, door, half } = SET;
  const z0 = Math.max(lerp(foot, door, up), cam.z + 46);
  const high = z => lerp(rampY(z), SET.sill, up), edge = (side, z) => at(side * half, high(z), z);
  const [ax, ay] = edge(-1, z0), [bx, by] = edge(1, z0), [cx, cy] = edge(1, door), [dx, dy] = edge(-1, door);
  const deck = () => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy); ctx.closePath(); };
  // The deck: dark plate, the doorway's light running down it and dying toward the lens.
  deck(); ctx.fillStyle = '#171B28'; ctx.fill();
  const g = ctx.createLinearGradient(0, dy, 0, ay);
  g.addColorStop(0, rgba('#F2C080', 0.74 * light)); g.addColorStop(0.14, rgba('#C98A4A', 0.5 * light)); g.addColorStop(0.5, rgba('#7A4E30', 0.3 * light)); g.addColorStop(1, rgba('#3A2630', 0.1 * light));
  ctx.fillStyle = g; ctx.fill();
  // Treads: a dark joint and the light catching the lip above it.
  for (let z = door - 22; z > z0; z -= 34) {
    const [lx, ly, s] = edge(-1, z), [rx, ry] = edge(1, z), near = clamp01((z - foot) / (door - foot));
    ctx.strokeStyle = rgba('#07090F', 0.85); ctx.lineWidth = Math.max(1, 3.6 * s);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
    ctx.strokeStyle = rgba('#FFE2B0', (0.1 + 0.42 * near * near) * light); ctx.lineWidth = Math.max(1, 1.3 * s);
    ctx.beginPath(); ctx.moveTo(lx, ly - 2.6 * s); ctx.lineTo(rx, ry - 2.6 * s); ctx.stroke();
  }
  // Two grip strips running up the deck.
  ctx.strokeStyle = rgba('#07090F', 0.5);
  for (const x of [-34, 34]) {
    const [nx, ny, ns] = at(x, high(z0), z0), [fx, fy, fs] = at(x, high(door), door);
    ctx.lineWidth = Math.max(1, 5 * (ns + fs) / 2);
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(fx, fy); ctx.stroke();
  }
  // The hot strip down the middle, where the doorway's glare lands.
  const [mx, my, ms] = at(0, high(door), door), [nx, ny, ns] = at(0, high(z0), z0);
  beam(L, [mx, my], [nx, ny], SET.doorHalf * 1.3 * ms, half * 1.1 * ns, '#FFE0AC', 0.2 * light, { layers: 3, fade: 0.5 });
  // Edge beams, and the lights along them: amber, running toward the entrance.
  for (const side of [-1, 1]) {
    const [x0, y0, s0] = edge(side, z0), [x1, y1, s1] = edge(side, door);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 + side * 9 * s1, y1); ctx.lineTo(x0 + side * 9 * s0, y0); ctx.closePath();
    ctx.fillStyle = INK; ctx.fill();
    ctx.strokeStyle = rgba('#FFD9A0', 0.55 * light); ctx.lineWidth = Math.max(1, 1.6 * s1);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    for (let z = door - 56, i = 0; z > z0; z -= 68, i += 1) {
      const [lx, ly, s] = at(side * (half + 4.5), high(z), z);
      const chase = 0.45 + 0.55 * clamp01(1 - Math.abs((((t / 620 - i * 0.24) % 1) + 1) % 1 - 0.5) * 4);
      ctx.fillStyle = rgba('#FFC070', 0.9 * chase * (1 - up));
      ctx.beginPath(); ctx.ellipse(lx, ly - 1.5 * s, 3.4 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
      glow(L, lx, ly - 1.5 * s, 20 * s, '#FFA840', 0.5 * chase * (1 - up));
    }
  }
}

/**
 * The ramp's rails: posts along each side and a rail on top. Only the stretch `from`..`to` (depth) is drawn, so the
 * far rails go behind the crew and the near ones in front; nothing nearer the lens than `clear` is drawn at all.
 */
export function paintRails(ctx, view, at, cam, up, light, { from = -Infinity, to = Infinity, clear = 170 } = {}) {
  if (up >= 0.999) return;
  const { foot, door, half } = SET, high = 84;
  const y = z => lerp(rampY(z), SET.sill, up), start = Math.max(lerp(foot, door, up), cam.z + clear), x = half + 6;
  for (const side of [-1, 1]) {
    const posts = [];
    for (let z = door - 16; z > start; z -= 104) posts.push(z);
    // The rail: between each two posts, drawn as a bar that thins with distance.
    for (let i = 0; i + 1 < posts.length; i += 1) {
      const zf = posts[i], zn = posts[i + 1], mid = (zf + zn) / 2;
      if (mid < from || mid >= to) continue;
      const [fx, fy, fs] = at(side * x, y(zf) + high, zf), [nx, ny, ns] = at(side * x, y(zn) + high, zn);
      ctx.beginPath(); ctx.moveTo(fx, fy - 3.4 * fs); ctx.lineTo(nx, ny - 3.4 * ns); ctx.lineTo(nx, ny + 3.4 * ns); ctx.lineTo(fx, fy + 3.4 * fs); ctx.closePath();
      ctx.fillStyle = '#090B12'; ctx.fill();
      ctx.strokeStyle = rgba('#FFD49A', 0.72 * light); ctx.lineWidth = Math.max(1, 1.5 * fs);
      ctx.beginPath(); ctx.moveTo(fx, fy - 3.4 * fs); ctx.lineTo(nx, ny - 3.4 * ns); ctx.stroke();
    }
    for (const z of posts) {
      if (z < from || z >= to) continue;
      const [bx, by, s] = at(side * x, y(z), z), [tx, ty] = at(side * x, y(z) + high, z), w = 3.6 * s;
      ctx.fillStyle = '#090B12';
      ctx.fillRect(bx - w, ty, w * 2, by - ty);
      // The doorway's light on the post's inner face.
      ctx.fillStyle = rgba('#FFD49A', 0.62 * light);
      ctx.fillRect(side > 0 ? bx - w : bx + w - Math.max(1, 1.3 * s), ty, Math.max(1, 1.3 * s), by - ty);
    }
  }
}

/** The doorway's light behind the crew: the glare round the entrance and its white heart. */
export function paintHalo(ctx, view, at, light, t = 0) {
  if (light <= 0.01) return;
  const { doorHigh: dH, sill, door } = SET, [cx, cy, s] = at(0, sill + dH * 0.5, door);
  const breath = 0.94 + 0.06 * noise(t * 0.004, 12);
  glow(ctx, cx, cy, dH * 1.5 * s, '#FFE2B0', 0.62 * light * breath);
  glow(ctx, cx, cy, dH * 0.5 * s, '#FFFFFF', 0.5 * light, { core: 0.3 });
}

/** The doorway's light in the air between the crew and the lens: the shaft down the ramp, a veil, a streak. */
export function paintGlare(ctx, view, at, cam, light, t = 0, veil = 1) {
  if (light <= 0.01) return;
  const { doorHalf: dh, doorHigh: dH, sill, door, foot } = SET;
  const [cx, cy, s] = at(0, sill + dH * 0.5, door), [fx, fy] = at(0, 0, Math.max(foot - 120, cam.z + 30));
  const breath = 0.94 + 0.06 * noise(t * 0.004, 12);
  beam(ctx, [cx, cy + dH * 0.2 * s], [fx, fy + view.H * 0.2], dh * 1.9 * s, view.W * 1.5, '#FFD9A0', 0.3 * light * breath * veil, { layers: 4, fade: 0.5 });
  glow(ctx, cx, cy, dH * 1.2 * s, '#FFE9C4', 0.3 * light * breath * veil);
  streak(ctx, cx, cy - dH * 0.1 * s, view.W * 2.2, 9 * view.px, '#FFE9C8', 0.4 * light * breath);
}

/** The lamp over the entrance: a slow amber pulse while it is open, steady once it has sealed. */
export function paintLamp(ctx, view, at, t, sealed, L = ctx) {
  const { doorHigh: dH, sill, door } = SET;
  const [x, y, s] = at(0, sill + dH + 50, door);
  const on = sealed ? 1 : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.0085));
  ctx.fillStyle = rgba('#FF8A1E', 0.6 + 0.4 * on);
  ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  glow(L, x, y, 90 * s, '#FF7A12', 0.55 * on);
}

function lerpColor(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), t = clamp01(k);
  const ch = shift => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export { ease };
