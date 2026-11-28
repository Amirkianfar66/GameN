// The capsule visits for the In-game animation builder (the Lead, 18 November, 11:04): for each view (A to E, option 1's
// stagings) and each capsule unit of the layout, the visitor's spot and each person's walk from their place in that view to it
// and back, as deck points in metres with the view's camera on both phones (so the feet and the scale can be found at any point);
// the unit's hatch, handle, tray and light in the room and which way it faces; along each walk, the furniture layers and people
// the walker passes behind and in front of; and the lamps along each walk, every 0.25 m, in camera report v4's form (as poses.mjs
// takes them). The visit's beats are ship-life's (docs/design/ship-life.md); the walks here are longer than its rooms', so their
// times are given at a stated pace. Writes visits-<layout>.json. Generates nothing.
import { writeFileSync } from 'fs';
import { IDS, EYE, FULL } from '../vis/vis5.mjs';
import { LAMPS, RING } from '../pv6/report6.mjs';
import { roomOf8, camAt8, LAYOUT } from './views8.mjs';
import { LAYOUTS, unitIn, partsOf, visitorOf, WALL } from './units8.mjs';
import { planWalk, bodyPoints } from './visit8.mjs';
import { camera, DEG, prismOf, hitT } from './geom8.mjs';
const segNear = (a, b, p) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
const DIR = new URL('./', import.meta.url).pathname, UNIT_M = 1.72 / 239.7, PACE = 1.2;
const r2 = n => +(+n).toFixed(2), r1 = n => +(+n).toFixed(1), r3 = n => +(+n).toFixed(3);
const compass = rad => +(((rad / DEG) % 360 + 360) % 360).toFixed(1);
const camOn = (V, W, H) => { const { C, yaw } = camAt8(V), SH = H - 191, f = W / 2 / Math.tan(35 * DEG), hy = SH / 2 + f * Math.tan(-5 * DEG); return { cam: camera({ C, yaw, f, cx: W / 2, hy, mode: 'rect' }), W, SH }; };
// a person as a body for the depth tests: a 0.2 m cylinder, 1.72 m tall
function cylT(p, C, u) { const ox = C[0] - p.x, oz = C[2] - p.z, a = u[0] * u[0] + u[2] * u[2], b = 2 * (ox * u[0] + oz * u[2]), c = ox * ox + oz * oz - 0.04, disc = b * b - 4 * a * c; if (disc < 0 || a < 1e-12) return [Infinity, Infinity];
  const ts = [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)].filter(t => t > 0 && C[1] + u[1] * t >= 0 && C[1] + u[1] * t <= 1.72); return ts.length ? [Math.min(...ts), Math.max(...ts)] : [Infinity, Infinity]; }
// the far side of a prism along a ray (where it leaves): to tell a piece behind the walker
function exitT(pr, C, d) { const t0 = hitT(pr, C, d); if (t0 === Infinity) return Infinity; let lo = t0, hi = t0 + 10; const inside = t => { const q = [C[0] + d[0] * t, C[1] + d[1] * t, C[2] + d[2] * t]; return hitT(pr, q, d) === 0 || (q[1] >= pr.y0 && q[1] <= pr.y1 && pr.edges.every(({ e, n }) => n[0] * (q[0] - e[0]) + n[1] * (q[2] - e[1]) <= 1e-9)); };
  for (let i = 0; i < 30; i += 1) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; } return lo; }
// what the walker at deck point p passes behind (nearer than them, over them) and in front of (farther, under them), in one view
function layersAt(room, V, walker, cam, W, SH, p) { const bp = bodyPoints(cam, p), behind = {}, front = {}, cut = new Set(), pts = []; let inF = 0;
  const pieces = room.objects.filter(o => o.place !== V).map(o => ({ o, pr: prismOf(o), name: `${o.place} ${o.name}` })), others = room.people.filter(q => q.place !== V && q.place !== walker);
  for (const q of bp) { const v = cam.view(q); if (v[2] < 0.05) { pts.push('behind'); continue; } const [x, y] = cam.proj(v);
    if (x < 0 || x > W || y < 0 || y > SH) { if (x < 0) cut.add('left'); if (x > W) cut.add('right'); if (y < 0) cut.add('top'); if (y > SH) cut.add('bottom'); pts.push(x < 0 ? 'left' : x > W ? 'right' : y < 0 ? 'top' : 'bottom'); continue; } inF += 1; pts.push('in');
    const d = [q[0] - cam.C[0], q[1] - cam.C[1], q[2] - cam.C[2]], L = Math.hypot(...d), u = d.map(c => c / L);
    for (const { pr, name } of pieces) { const t = hitT(pr, cam.C, u); if (t === Infinity) continue; if (t < L - 0.02) behind[name] = (behind[name] ?? 0) + 1; else front[name] = (front[name] ?? 0) + 1; }
    for (const o of others) { const [t] = cylT(o, cam.C, u); if (t === Infinity) continue; if (t < L - 0.02) behind[o.name] = (behind[o.name] ?? 0) + 1; else front[o.name] = (front[o.name] ?? 0) + 1; } }
  const share = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v / bp.length]));
  return { inFrame: inF / bp.length, behind: share(behind), front: share(front), cut: [...cut].sort(), pts }; }
const sections = (rows, key) => { const names = [...new Set(rows.flatMap(r => Object.keys(r[key])))], out = {};
  for (const n of names) { const secs = []; let cur = null; for (const r of rows) { const v = r[key][n] ?? 0; if (v >= 0.05) { if (!cur) cur = { from: r.s, to: r.s, most: v }; else { cur.to = r.s; cur.most = Math.max(cur.most, v); } } else if (cur) { secs.push(cur); cur = null; } } if (cur) secs.push(cur);
    const kept = secs.filter(x => x.to - x.from >= 0.1); if (kept.length) out[n] = kept.map(x => ({ fromM: r2(x.from), toM: r2(x.to), mostOfBody: r2(x.most) })); } return out; };
// the lamps on a walker at deck point p, from the chest (1.2 m up), as camera report v4 gives them (azimuth 0 = into the picture,
// +90 = screen right, 180 = toward the camera; elevation above level; share of 1/d² of all lights): the two strongest wall lamps
// and the ring, in poses.mjs's form
function lampsAt(cam, p) { const fwd = [Math.sin(cam.yaw), Math.cos(cam.yaw)], right = [Math.cos(cam.yaw), -Math.sin(cam.yaw)], chest = [p[0], 1.2, p[1]];
  const one = q => { const d = [q[0] - chest[0], q[1] - chest[1], q[2] - chest[2]], h = Math.hypot(d[0], d[2]), dist = Math.hypot(...d); return { azimuthDeg: r1(Math.atan2(d[0] * right[0] + d[2] * right[1], d[0] * fwd[0] + d[2] * fwd[1]) / DEG), elevationDeg: r1(Math.atan2(d[1], h) / DEG), w: 1 / (dist * dist) }; };
  const wall = LAMPS.map(l => ({ name: `lamp ${l.id}`, ...one(l.at) })), ring = RING.map(one), total = [...wall, ...ring].reduce((s, l) => s + l.w, 0);
  const rw = ring.reduce((s, l) => s + l.w, 0), rv = ring.reduce((a, l) => { const az = l.azimuthDeg * DEG, el = l.elevationDeg * DEG; return [a[0] + l.w * Math.cos(el) * Math.sin(az), a[1] + l.w * Math.sin(el), a[2] + l.w * Math.cos(el) * Math.cos(az)]; }, [0, 0, 0]);
  const top = wall.sort((a, b) => b.w - a.w).slice(0, 2).map(l => ({ name: l.name, azimuthDeg: l.azimuthDeg, elevationDeg: l.elevationDeg, share: r2(l.w / total) }));
  return [...top, { name: 'the ring', azimuthDeg: r1(Math.atan2(rv[0], rv[2]) / DEG), elevationDeg: r1(Math.atan2(rv[1], Math.hypot(rv[0], rv[2])) / DEG), share: r2(rw / total) }]; }
// one walk in one view: its samples (every 0.1 m), the sections behind and in front, the frame, the lamps every 0.25 m
function walkIn(room, V, walker, walk) { const pts = walk.points, segs = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])]), samples = []; let s0 = 0;
  for (const [a, b, L] of segs) { for (let s = 0; s < L - 1e-9; s += 0.1) samples.push({ s: s0 + s, at: [a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L] }); s0 += L; } samples.push({ s: s0, at: pts[pts.length - 1] });
  const phones = {}; for (const [W, H] of [[390, 844], [430, 932]]) { const { cam, SH } = camOn(V, W, H), rows = samples.map(({ s, at }) => ({ s, ...layersAt(room, V, walker, cam, W, SH, at) }));
    // the frame along the walk: runs of whole, partly and out; where the walker leaves it and, on the way back, where they come back
    const state = r => (r.inFrame >= 0.999 ? 'whole' : r.inFrame > 0 ? 'partly' : 'out'), runs = [];
    rows.forEach((r, i) => { const st = state(r), at = samples[i].at; if (runs.length && runs[runs.length - 1].state === st) { runs[runs.length - 1].toM = r2(r.s); runs[runs.length - 1].to = at.map(r3); } else runs.push({ state: st, fromM: r2(r.s), toM: r2(r.s), from: at.map(r3), to: at.map(r3) }); });
    const L = r2(s0), back = [...runs].reverse().map(x => ({ state: x.state, fromM: r2(L - x.toM), toM: r2(L - x.fromM), from: x.to, to: x.from }));
    // each change of state, where it happens (the first sample in the new state): going there, and coming back from the visitor's spot
    const changes = rs => rs.slice(1).map((x, i) => ({ atM: x.fromM, at: x.from, from: rs[i].state, to: x.state }));
    const there = changes(runs), returning = changes(back);
    // the frame's edges that cut the walker as they leave it (the last sample before they are gone, or the visitor's spot when they
    // never are) and as they come back (the first sample seen again on the way back)
    // (the edge each body point still in the frame goes past, from one sample to the next; when they never leave, the edges that cut
    // them at the visitor's spot)
    const exitBy = (a, b) => [...new Set(a.pts.map((st, k) => (st === 'in' ? b.pts[k] : null)).filter(st => st && st !== 'in'))].sort();
    const gi = rows.findIndex((r, i) => i > 0 && state(r) === 'out' && state(rows[i - 1]) !== 'out'), through = gi > 0 ? exitBy(rows[gi - 1], rows[gi]) : rows[rows.length - 1].cut;
    const rv = [...rows].reverse(), si = rv.findIndex(r => state(r) !== 'out'), backThrough = si > 0 ? exitBy(rv[si], rv[si - 1]) : si === 0 ? rv[0].cut : [];
    const leaves = runs[0].state === 'whole' && there.length ? { startsLeavingAtM: there[0].atM, at: there[0].at, ...(there.find(c => c.to === 'out') ? { goneAtM: there.find(c => c.to === 'out').atM, goneAt: there.find(c => c.to === 'out').at } : { gone: false }), through } : null;
    const seen = returning.find(c => c.from === 'out'), whole = [...returning].reverse().find(c => c.to === 'whole');
    const comesBack = back[back.length - 1].state === 'whole' && returning.length ? { ...(seen ? { firstSeenAgainAtM: seen.atM, at: seen.at } : {}), ...(whole ? { wholeAgainAtM: whole.atM, wholeAt: whole.at } : {}), through: backThrough, note: "along the walk back, in metres from the visitor's spot" } : null;
    phones[`${W}x${H}`] = { frame: runs, changes: { there, back: returning }, outOfFrame: runs.every(x => x.state === 'out'), wholeAllTheWay: runs.every(x => x.state === 'whole'), leaves, comesBack,
      behind: sections(rows, 'behind'), inFrontOf: sections(rows, 'front') }; }
  const { cam } = camOn(V, 390, 844), lamps = []; for (let s = 0; s <= s0 + 1e-9; s += 0.25) { const k = samples.reduce((b, x) => (Math.abs(x.s - s) < Math.abs(b.s - s) ? x : b), samples[0]); lamps.push({ atM: r2(s), at: k.at.map(r3), lamps: lampsAt(cam, k.at) }); }
  return { phones, lamps }; }
export function visits(layout = LAYOUT) {
  const out = { layout, version: 2, units: {}, views: {}, beats: { source: "ship-life's visit (docs/design/ship-life.md, approved 11 November): walk, open, take, eat facing the room, wrapper back, shut, walk back; 6.5-7.7 s, a brief visit 4.8-6 s, one visitor at a time; the tag and press area stay at the place",
    walkPaceMps: PACE, note: `ship-life's walks are 0.4 to 1.2 s in its rooms; here the walks are 0.3 to 4 m, so each is timed at ${PACE} m/s: its time there and back is added to the beats between them` },
    measure: { deck: 'metres: x east, z north, y up from the deck; the room is 4 m square, its middle at 0, 0', scale: `a figure's px per drawing unit at a deck point = f × ${UNIT_M.toFixed(6)} / depth (the rig's 239.7 drawing units are 1.72 m)`, project: 'view(p) = [ (p-C)·right, p.y - C.y, (p-C)·fwd ], fwd = (sin yaw, 0, cos yaw), right = (cos yaw, 0, -sin yaw); screen x = cx + f·v0/v2, y = hy - f·v1/v2 (y from the stage top); depth = v2' } };
  for (const u of LAYOUTS[layout]) { const room = roomOf8('A', 1, { layout }), U = unitIn(room, u); out.units[u.id] = { kind: u.kind, ...partsOf(U), visitor: visitorOf(U), eatFacingDeg: compass(Math.atan2(-visitorOf(U)[0], -visitorOf(U)[1])), movesWithStationIn: u.kind === 'counter' ? 'B (with Atlas\'s bench, 0.35 m north); there its places are 0.35 m north of these' : null }; }
  for (const V of ['A', 'B', 'C', 'D', 'E']) { const room = roomOf8(V, 1, { layout }), cams = {};
    for (const [W, H] of [[390, 844], [430, 932]]) { const { cam, SH } = camOn(V, W, H); cams[`${W}x${H}`] = { C: cam.C.map(r3), yawDeg: compass(cam.yaw), f: r2(cam.f), cx: cam.cx, hy: r2(cam.hy), stage: [W, SH], lens: 'rect' }; }
    const view = { camera: cams, viewer: V, outOfView: FULL[V].blind_place, units: {}, walks: [] };
    for (const u of LAYOUTS[layout]) { const U = unitIn(room, u), spot = visitorOf(U, V), shared = visitorOf(U), ch = u.visitorIn?.[V];
      const mv = [spot[0] - shared[0], spot[1] - shared[1]], movedM = Math.hypot(...mv), towardDeg = Math.round(compass(Math.atan2(mv[0], mv[1]))) % 360;
      view.units[u.id] = { visitor: spot, ...(ch ? { cheat: { sharedSpot: shared, movedM: r2(movedM), towardDeg, why: ch.why, by: ch.by }, note: `in this view only, the eating spot is ${r2(movedM).toFixed(2)} m from the shared one (toward ${towardDeg}°), ${ch.why} (${ch.by}); this view never draws the unit, which stands on ${room.P(u.on).name}'s own bench` } : {}), ...(u.kind === 'counter' && V === 'B' ? { note: "Atlas's bench and the unit on it stand 0.35 m north in this view" } : {}) };
      for (const p of room.people.filter(q => q.place !== V)) { let w = planWalk(room, p.place, [p.x, p.z], spot, { clear: 0.2, wall: 0.22, apart: 0.36 }), close = null;
        if (!w) { w = planWalk(room, p.place, [p.x, p.z], spot, { clear: 0.18, wall: 0.2, apart: 0.3 }); if (w) close = room.people.filter(q => q.place !== V && q.place !== p.place && w.points.some((pt, i) => i && segNear(w.points[i - 1], pt, [q.x, q.z]) < 0.36)).map(q => q.name); } if (!w) { view.walks.push({ unit: u.id, who: p.name, place: p.place, from: [r3(p.x), r3(p.z)], path: null, note: 'no path' }); continue; }
        const there = walkIn(room, V, p.place, w), back = { points: [...w.points].reverse(), lengthM: w.lengthM };
        view.walks.push({ unit: u.id, who: p.name, place: p.place, from: [r3(p.x), r3(p.z)], to: spot, points: w.points, lengthM: w.lengthM, secondsEachWay: r1(w.lengthM / PACE), ...(close && close.length ? { closePast: close, note: `passes 0.3 m from ${close.join(' and ')}: the only way to the spot in this staging` } : {}), there, back: { points: back.points, note: 'the same path reversed: its sections are the same, read from the other end' } }); } }
    // with two units, each person's nearer one by walk
    if (LAYOUTS[layout].length > 1) for (const p of room.people.filter(q => q.place !== V)) { const mine = view.walks.filter(w => w.place === p.place && w.lengthM); const best = mine.sort((a, b) => a.lengthM - b.lengthM)[0]; if (best) best.nearer = true; }
    out.views[V] = view; }
  return out; }
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const L = process.argv[2] ?? LAYOUT, v = visits(L); writeFileSync(DIR + `visits-${L}.json`, JSON.stringify(v, null, 1));
  for (const [V, x] of Object.entries(v.views)) console.log(V, x.walks.map(w => `${w.unit}:${w.who} ${w.lengthM ?? 'NO PATH'} m${w.nearer ? '*' : ''} [${Object.keys(w.there?.phones['390x844'].behind ?? {}).join(',')}]`).join(' | '));
}
