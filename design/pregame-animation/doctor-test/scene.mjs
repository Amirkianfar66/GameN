// The Doctor test's scene: the pure-animation exploration of the role film's first 4 seconds, on a canvas, by the
// boarding pilot's method (its engine.mjs, imported unchanged): every drawing is made once into a picture in memory,
// already lit, and a frame only places pictures, the camera and the light. The character changes drawing on twos
// (acting.mjs); the camera, the light and the dust move on every frame of the screen.
//
// createDoctorTest(holder, { width, height, character, pixelRatio, quality }) → { paint(t, { variant }), ready(),
// stats, dispose() }. A test page only: nothing here is in the game.

import { NIGHT, createBakery, glow, motes, rgba, sprite, streak } from '../../phone-ui/components/boarding-film/engine.mjs';
import { clamp01, ease, lerp, progress } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { CUT_MS, DRAWING_MS, FLASH, GLINT, STILL_TIMES, TEST_MS, allDrawings, drawingOf } from './acting.mjs';
import { CREW_HEAD_SCALE, HAND_BOX, HEAD_BOX, bodyBox, bodySvg, handPlace, handSvg, hangOf, headLook, headPartSvg, injector, pieceSvg } from './drawings.mjs';
import { FACE_CHARACTER } from './face.mjs';
import { briefingRoom, colonyWard } from './sets.mjs';
import { roomPlanes } from './world/room.mjs';
import { wardPlanes } from './world/ward.mjs';
import { benchLive, cosmicDoor, foreLive, lampAt, monitorLive, spaceLive, wallLive, wardBackLive, wardLight } from './world/live.mjs';
import { PORT, portPath } from './world/room.mjs';

const ANCHOR = [62, 233];
const WARD = Object.freeze({ w: 520, h: 700 });
const PARALLAX_A = Object.freeze({ far: 0.55, air: 0.75, desk: 1, card: 1, mug: 1.3 });

// ── The cameras ──────────────────────────────────────────────────────

const keyed = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (t < b) { const k = ease.inOutCubic(clamp01((t - a) / (b - a))); return va.map((v, j) => lerp(v, vb[j], k)); }
  }
  return keys.at(-1)[1];
};

/** Shot A's camera at t: [x, y] the room's point held at today's focus on the screen, and the zoom. Serves the acting: it waits through the reach, then follows the lift in to her face. */
function cameraA(R, t, wide = false) {
  const [fx, fy] = R.focus, u = R.L.u;
  const [x, y, z] = keyed([
    [0, wide ? [fx - 10 * u, fy - 20 * u, 1.1] : [fx, fy, 1.32]], [1100, [fx - 4 * u, fy + 6 * u, 1.4]], [1500, [fx - 5 * u, fy + 8 * u, 1.42]],
    [2250, [fx - 22 * u, fy + 12 * u, 2.05]], [2650, [fx - 22 * u, fy + 10 * u, 2.14]], [3000, [fx - 20 * u, fy + 6 * u, 2.3]],
  ], t);
  return { x, y, z };
}

/** Shot B's camera: a medium shot on her at the cot's foot, creeping in, tilting up with her look. */
function cameraB(B, t, W, H) {
  const k = H / 844, [ax, ay] = B.at, s = B.scale;
  const chest = [ax + (60 - ANCHOR[0]) * s, ay + (88 - ANCHOR[1]) * s];
  const [dx, dy, z] = keyed([[CUT_MS, [0, 6, 1.5]], [3600, [0, 4, 1.54]], [3900, [0, -8, 1.6]], [TEST_MS, [0, -9, 1.61]]], t);
  return { x: chest[0] + dx, y: chest[1] + dy, z: z * k * (844 / WARD.h) * 0.62 };
}

// ── The scene ────────────────────────────────────────────────────────

export function createDoctorTest(holder, { width: W = 390, height: H = 844, character = FACE_CHARACTER, pixelRatio = 2, quality = 1, world = 'today' } = {}) {
  const NOVEL = world === 'novel';
  const doc = holder.ownerDocument, win = doc.defaultView;
  const dpr = pixelRatio;
  const canvas = doc.createElement('canvas');
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.cssText = `width:${W}px;height:${H}px;display:block`;
  holder.append(canvas);
  const ctx = canvas.getContext('2d');
  const bakery = createBakery(doc);
  const stats = { frames: 0, drawMs: 0, worstMs: 0, firstFrameMs: null, allDrawnMs: null, missing: 0 };
  const started = win.performance.now();

  const R = briefingRoom(W, H);
  const L = R.L;
  const B = { ...colonyWard(WARD.w, WARD.h) };
  B.at = [WARD.w * 0.3, WARD.h * 0.99];
  B.scale = (WARD.h * 0.84) / 233;
  const k = B.k;
  B.lamp = [WARD.w * 0.5, WARD.h * 0.24];

  // The light each drawing is made in, in the figure's own frame (today's film's: kit/cast.mjs litFigure's).
  const toFigA = ([x, y]) => [(x - L.at[0]) / L.scale + ANCHOR[0], (y - L.at[1]) / L.scale + ANCHOR[1]];
  const toFigB = ([x, y]) => [(x - B.at[0]) / B.scale + ANCHOR[0], (y - B.at[1]) / B.scale + ANCHOR[1]];
  const FINISH = { outline: 1.25, hatch: 2.1, wear: 0.3 };
  const LOOK_A = NOVEL ? {
    ambient: { color: '#2B3650', strength: 0.8 },
    key: { at: toFigA([L.lamp.head[0] - 20 * L.u, L.lamp.head[1] + 30 * L.u]), z: 85 / 1.94, color: '#FFB862', gain: 2.4 },
    rim: { dx: -0.55, dy: -0.83, color: '#A8F0E6', width: 3.6 / 1.94, gain: 1.1 },
    novel: FINISH,
  } : {
    ambient: { color: '#34456E', strength: 0.82 },
    key: { at: toFigA([L.lamp.head[0] - 20 * L.u, L.lamp.head[1] + 30 * L.u]), z: 85 / 1.94, color: '#FFC27A', gain: 2.25 },
    rim: { dx: -0.62, dy: -0.78, color: '#DCE8FF', width: 3.4 / 1.94, gain: 1 },
  };
  const LOOK_B = NOVEL ? {
    ambient: { color: '#3A2416', strength: 0.74 },
    key: { at: toFigB([270, 196]), z: 60 / B.scale, color: '#FFC27A', gain: 1.7 },
    rim: { dx: 0.7, dy: -0.7, color: '#FFD9A0', width: 2.6 / B.scale, gain: 0.9 },
    novel: FINISH,
  } : {
    ambient: { color: '#3A2C20', strength: 0.72 },
    key: { at: toFigB([B.lamp[0], B.lamp[1] + 10 * k]), z: (70 * k) / B.scale, color: '#FFD9A0', gain: 1.15 },
    rim: { dx: 0.8, dy: -0.6, color: '#F2DDB4', width: (2.4 * k) / B.scale, gain: 0.8 },
    sepia: true,
  };

  // ── What the film needs drawn, and when it is first needed ──
  const drawings = allDrawings();
  const zoomAt = d => (d.shot === 'A' ? cameraA(R, d.t, NOVEL).z * L.scale : cameraB(B, d.t, W, H).z * B.scale);
  const jobs = new Map();
  const need = (key, at, px, make) => {
    const j = jobs.get(key);
    if (j) { j.at = Math.min(j.at, at); j.px = Math.max(j.px, px); } else jobs.set(key, { key, at, px, make });
  };
  const sharp = dpr * quality;
  const headId = character;
  const actingFace = headId === FACE_CHARACTER;
  for (const d of drawings) {
    const shot = d.shot, look = shot === 'A' ? LOOK_A : LOOK_B;
    const bodyPx = zoomAt(d) * sharp * 0.72;
    const legs = shot === 'B';
    const sk = d.sk;
    const box = bodyBox(sk, { legs, item: shot === 'B' });
    if (shot === 'A') box[3] = Math.min(box[3], 140 - box[1]); // what stands behind the desk is never seen
    const skNoHand = shot === 'A' ? { ...sk, handF: { type: 'none' } } : sk;
    d.bodyKey = `body|${shot}|${JSON.stringify(skNoHand)}`;
    need(d.bodyKey, d.t, bodyPx, px => sprite(doc, { rect: box, px, inner: bodySvg(skNoHand, { look, legs, box, character, kit: NOVEL }) }));
    // The head: its art (and the hanging hair), then the face's pieces.
    const hl = headLook(look, sk);
    const headPx = bodyPx * CREW_HEAD_SCALE * 1.15;
    d.headKeys = [`head|${shot}|upper`];
    need(`head|${shot}|upper`, d.t, headPx, px => { const p = headPartSvg(headId, 'upper', { look: hl }); return sprite(doc, { rect: p.box, px, inner: p.svg }); });
    if (hangOf(headId) != null) {
      d.headKeys.push(`head|${shot}|lower`);
      need(`head|${shot}|lower`, d.t, headPx, px => { const p = headPartSvg(headId, 'lower', { look: hl }); return sprite(doc, { rect: p.box, px, inner: p.svg }); });
    }
    d.pieceKeys = [];
    const pieces = actingFace ? [['eyes', { look: d.face.look, lids: d.face.lids }], ['brow', d.face.brow], ['mouth', d.face.mouth]] : [['eyes', { look: 'ahead', lids: d.face.lids }]];
    for (const [kind, value] of pieces) {
      if (kind === 'eyes' && value.look === 'ahead' && value.lids <= 0.001) continue;
      const key = `piece|${shot}|${kind}|${JSON.stringify(value)}`;
      d.pieceKeys.push(key);
      need(key, d.t, headPx, px => { const p = pieceSvg(kind, value, { look: hl && { ...hl, novel: null }, id: headId }); return sprite(doc, { rect: p.box, px, inner: p.svg }); });
    }
    if (shot === 'A' && d.hand !== 'none') {
      d.handKey = `hand|${d.hand}`;
      need(d.handKey, d.t, bodyPx * 1.2, px => sprite(doc, { rect: HAND_BOX, px, inner: handSvg(d.hand, { look: { ...LOOK_A, key: null, rim: null, novel: NOVEL ? { outline: 0.9, wear: 0 } : null }, character }) }));
    }
  }
  // The injector, and the places.
  const inj = injector();
  need('injector', 0, L.gadget.s * 2.4 * sharp, px => sprite(doc, { rect: inj.box, px, inner: inj.svg }));
  const roomRect = [L.cx - 160 * L.u, 60 * L.u, 320 * L.u, 700 * L.u];
  const setJob = (key, at, rect, px, markup) => need(key, at, px, p => sprite(doc, { rect, px: p, inner: `<defs>${markup.defs}</defs>${markup.svg}` }));
  // The new world's places, drawn in the design's px and placed on this phone as today's room is (layout()).
  const design = `translate(${L.cx - 195 * L.u} 0) scale(${L.u})`;
  const D2L = ([x, y, w, h]) => [L.cx + (x - 195) * L.u, y * L.u, w * L.u, h * L.u];
  if (NOVEL) {
    const N = roomPlanes(L);
    const at = svg => ({ defs: N.defs, svg: `<g transform="${design}">${svg}</g>` });
    setJob('nw|space', 0, D2L([PORT.x - 4, PORT.y - 4, PORT.w + 8, PORT.h + 8]), sharp * 1.4, at(`<clipPath id="nw-port"><path d="${portPath()}"/></clipPath><g clip-path="url(#nw-port)">${N.space}</g>`));
    setJob('nw|wall', 0, D2L([-70, -12, 520, 640]), sharp * 1.25, at(N.wall));
    setJob('nw|bench', 0, D2L([-90, 340, 560, 520]), sharp * 1.35, at(N.bench));
    setJob('nw|card', 0, D2L([L.card.x - 40, L.card.y - 30, L.card.w + 70, L.card.h + 60]), sharp * 2.2, at(N.card));
    setJob('nw|fg', 0, D2L([-80, -40, 560, 960]), sharp * 0.5, at(N.fg));
    const Wd = wardPlanes();
    setJob('cw|back', 1500, [-40, -20, WARD.w + 80, WARD.h + 60], Math.min(sharp * 1.3 * (H / 844), 2200 / WARD.h), { defs: Wd.defs, svg: Wd.back });
    setJob('cw|room', 1500, [-10, 280, WARD.w + 20, WARD.h - 260], Math.min(sharp * 1.4 * (H / 844), 2400 / WARD.h), { defs: Wd.defs, svg: Wd.room });
  }
  if (!NOVEL) setJob('room|far', 0, roomRect, sharp * 1.0, { defs: R.defs, svg: R.far });
  if (!NOVEL) setJob('room|air', 0, roomRect, sharp * 0.6, { defs: R.defs, svg: R.air });
  if (!NOVEL) setJob('room|desk', 0, [L.cx - 160 * L.u, 360 * L.u, 330 * L.u, 400 * L.u], sharp * 1.5, { defs: R.defs, svg: R.desk });
  if (!NOVEL) setJob('room|card', 0, [L.card.x - 30 * L.u, L.card.y - 30 * L.u, L.card.w + 60 * L.u, L.card.h + 60 * L.u], sharp * 2.2, { defs: R.defs, svg: R.card });
  if (!NOVEL) setJob('room|mug', 0, [-20 * L.u, 480 * L.u, 170 * L.u, 260 * L.u], sharp * 0.7, { defs: R.defs, svg: R.mug });
  const sepia = '<filter id="pa-ward-sepia" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.393 0.769 0.189 0 0.02  0.349 0.686 0.168 0 0.01  0.272 0.534 0.131 0 -0.02  0 0 0 1 0"/></filter>';
  if (!NOVEL) setJob('ward', 2000, [0, 0, WARD.w, WARD.h], Math.min(sharp * 1.6 * (H / 844), 2400 / WARD.h), { defs: B.defs + sepia, svg: `<g filter="url(#pa-ward-sepia)">${B.ward}</g>` });

  const ordered = [...jobs.values()].sort((a, b) => a.at - b.at || a.key.localeCompare(b.key));
  bakery.add(ordered.map(j => ({ key: j.key, at: j.at, make: () => j.make(j.px) })));
  const firstKeys = ordered.filter(j => j.at === 0).map(j => j.key);
  let firstDone = false;
  void bakery.settled().then(() => { stats.allDrawnMs = Math.round(win.performance.now() - started); });

  // ── Painting ──
  const get = key => bakery.get(key);
  /** The drawing at t, or the nearest one before it already made (a drawing still being made is not waited for). */
  function shown(t) {
    const want = Math.min(drawings.length - 1, Math.round(drawingOf(t).t / DRAWING_MS));
    for (let i = want; i >= 0 && drawings[i].shot === drawings[want].shot; i -= 1) {
      const d = drawings[i];
      if (get(d.bodyKey) && d.headKeys.every(get)) return d;
    }
    return null;
  }
  const at = (T, s) => s && ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
  const layerT = (cam, sx, sy, p, ref) => {
    const z = 1 + (cam.z - 1) * p, cx = ref[0] + (cam.x - ref[0]) * p, cy = ref[1] + (cam.y - ref[1]) * p;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (sx - cx * z), dpr * (sy - cy * z));
  };
  const figureT = (anchorAt, scale) => ctx.transform(scale, 0, 0, scale, anchorAt[0] - ANCHOR[0] * scale, anchorAt[1] - ANCHOR[1] * scale);

  function head(d) {
    const sk = d.sk;
    ctx.save();
    ctx.translate(sk.head[0], sk.head[1]);
    ctx.rotate(((sk.tilt ?? 0) * Math.PI) / 180);
    ctx.scale(CREW_HEAD_SCALE, CREW_HEAD_SCALE);
    const [upperKey, lowerKey] = d.headKeys;
    const y = hangOf(headId);
    if (lowerKey) {
      // The hanging hair, behind the face's edge, skewed and stretched about its line (head.mjs's hangTransform).
      ctx.save();
      ctx.translate(0, y);
      ctx.transform(1, 0, Math.tan(Math.atan(d.face.sway / 24)), 1, 0, 0);
      ctx.scale(1, 1 + d.face.lift / 24);
      ctx.translate(0, -y);
      at(null, get(lowerKey));
      ctx.restore();
    }
    at(null, get(upperKey));
    for (const key of d.pieceKeys) at(null, get(key));
    ctx.restore();
  }

  function injectorAt(d, t) {
    // Resting on the desk, its grip where the reaching hand closes; then in the fist, tipping up as it is raised,
    // its tip a little late (follow-through).
    const s = L.gadget.s;
    if (!d.held) return { x: L.gadget.x, y: L.gadget.y, angle: 0, s };
    const { at: wrist } = handPlace(d.sk);
    const hx = L.at[0] + (wrist[0] - ANCHOR[0]) * L.scale, hy = L.at[1] + (wrist[1] - ANCHOR[1]) * L.scale;
    const up = clamp01((146 - d.sk.wF[1]) / 80);
    const lag = d.t > 1700 && d.t < 2400 ? Math.sin(((d.t - 1700) / 700) * Math.PI * 2) * 6 * (1 - (d.t - 1700) / 700) : 0;
    return { x: hx - 2 * L.u, y: hy + 6 * L.u, angle: lerp(-4, 12, up) - lag, s: s * lerp(1, 1.08, up) };
  }
  const placeInjector = p => {
    const s = get('injector');
    if (!s) return;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate((p.angle * Math.PI) / 180); ctx.scale(p.s, p.s); ctx.translate(-inj.grip[0], -inj.grip[1]);
    ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h);
    ctx.restore();
  };
  const glintPoint = p => {
    const a = (p.angle * Math.PI) / 180, dx = (inj.glint[0] - inj.grip[0]) * p.s, dy = (inj.glint[1] - inj.grip[1]) * p.s;
    return [p.x + dx * Math.cos(a) - dy * Math.sin(a), p.y + dx * Math.sin(a) + dy * Math.cos(a)];
  };

  function paintA(t, d, { still }) {
    const cam = cameraA(R, t);
    const [sx, sy] = R.focus;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height);
    layerT(cam, sx, sy, PARALLAX_A.far, R.focus); at(null, get('room|far'));
    layerT(cam, sx, sy, PARALLAX_A.air, R.focus); at(null, get('room|air'));
    if (!still) {
      // Dust turning in the dock's light through the blinds.
      motes(ctx, { seed: 52, n: 90, t, box: [L.win.x, L.win.y + 80 * L.u, L.win.w, 420 * L.u], size: [0.45 * L.u, 1.3 * L.u], color: '#EEF3FF', alpha: 0.55, speed: 0.6 });
    }
    layerT(cam, sx, sy, PARALLAX_A.desk, R.focus); at(null, get('room|desk'));
    const inj = injectorAt(d, t);
    if (!d.held) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(inj.x + 4 * L.u, inj.y + 22 * L.u, 24 * L.u, 4.5 * L.u, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      placeInjector(inj);
    }
    // The character: behind the desk's back edge, except the arm reaching over it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(-W, -H, W * 3, H + L.deskBack + 1 * L.u);
    ctx.moveTo(L.cx - 28 * L.u, L.deskBack - 2 * L.u); ctx.lineTo(-W, L.deskBack - 2 * L.u); ctx.lineTo(-W, L.deskFront); ctx.lineTo(L.cx - 40 * L.u, L.deskFront); ctx.closePath();
    ctx.clip();
    figureT(L.at, L.scale);
    at(null, get(d.bodyKey));
    head(d);
    ctx.restore();
    if (d.held) placeInjector(inj);
    if (d.handKey) {
      const { at: w, angle } = handPlace(d.sk), s = get(d.handKey);
      if (s) { ctx.save(); figureT(L.at, L.scale); ctx.translate(w[0], w[1]); ctx.rotate((angle * Math.PI) / 180); ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h); ctx.restore(); }
    }
    at(null, get('room|card'));
    layerT(cam, sx, sy, PARALLAX_A.mug, R.focus); at(null, get('room|mug'));
    // The glint where the light catches the injector's vials, by her face.
    if (!still) {
      layerT(cam, sx, sy, 1, R.focus);
      const g = clamp01(Math.sin(Math.PI * progress(t, GLINT[0], GLINT[1])));
      if (d.held && g > 0) {
        const [gx, gy] = glintPoint(inj);
        glow(ctx, gx, gy, 34 * L.u * g, '#FFFFFF', g);
        streak(ctx, gx, gy, 120 * L.u * g, 2 * L.u, '#DCE8FF', 0.8 * g);
        streak(ctx, gx, gy, 3 * L.u, 60 * L.u * g, '#FFFFFF', 0.6 * g);
      }
    }
  }

  function paintB(t, d, { still }) {
    const cam = cameraB(B, t, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120E0B'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = W / 2, sy = H * 0.46;
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, dpr * (sx - cam.x * cam.z), dpr * (sy - cam.y * cam.z));
    at(null, get('ward'));
    if (!still) {
      // The hanging lamp's light breathing, the dust turning in its cone.
      const flick = 0.85 + 0.15 * Math.sin(t / 90) * Math.sin(t / 37);
      glow(ctx, B.lamp[0], B.lamp[1] + 4 * k, 60 * k, '#FFE6B0', 0.35 * flick);
      motes(ctx, { seed: 12, n: 50, t, box: [B.lamp[0] - 120 * k, B.lamp[1], 240 * k, WARD.h * 0.6], size: [0.5 * k, 1.2 * k], color: '#FFF0CC', alpha: 0.6, speed: 0.5 });
    }
    ctx.save();
    figureT(B.at, B.scale);
    at(null, get(d.bodyKey));
    head(d);
    ctx.restore();
  }

  /** The memory flash: warm light swelling out of the glint and clearing on the ward. */
  function flash(t) {
    const k1 = progress(t, FLASH[0], FLASH[1]), k2 = 1 - progress(t, FLASH[1] + 50, FLASH[2]);
    const kk = t < FLASH[1] ? k1 * k1 : Math.max(0, k2);
    if (kk <= 0.001) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(canvas.width * 0.3, canvas.height * 0.48, 0, canvas.width * 0.3, canvas.height * 0.48, Math.hypot(canvas.width, canvas.height) * lerp(0.1, 1.1, kk));
    g.addColorStop(0, rgba('#FFFFFF', kk)); g.addColorStop(0.4, rgba('#FFF1D2', 0.9 * kk)); g.addColorStop(1, rgba('#FFB060', 0.5 * kk));
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#FFF3DC', Math.max(0, kk - 0.5) * 1.8); ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function paintAt(t, opts = {}) {
    const d = shown(t);
    if (!d) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height); stats.missing += 1; return false; }
    if (NOVEL) { if (d.shot === 'A') novelA(t, d, opts); else novelB(t, d, opts); return true; }
    if (d.shot === 'A') paintA(t, d, opts); else paintB(t, d, opts);
    return true;
  }

  // ── The new world ──
  const toDesign = () => ctx.transform(L.u, 0, 0, L.u, L.cx - 195 * L.u, 0);
  const port = new Path2D(portPath());
  let glintScreen = [W * 0.3, H * 0.45];
  function figureA(t, d) {
    const inj = injectorAt(d, t);
    if (!d.held) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(inj.x + 4 * L.u, inj.y + 22 * L.u, 24 * L.u, 4.5 * L.u, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      placeInjector(inj);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(-W, -H, W * 3, H + L.deskBack + 1 * L.u);
    ctx.moveTo(L.cx - 28 * L.u, L.deskBack - 2 * L.u); ctx.lineTo(-W, L.deskBack - 2 * L.u); ctx.lineTo(-W, L.deskFront); ctx.lineTo(L.cx - 40 * L.u, L.deskFront); ctx.closePath();
    ctx.clip();
    figureT(L.at, L.scale);
    at(null, get(d.bodyKey));
    head(d);
    ctx.restore();
    if (d.held) placeInjector(inj);
    if (d.handKey) {
      const { at: w, angle } = handPlace(d.sk), s = get(d.handKey);
      if (s) { ctx.save(); figureT(L.at, L.scale); ctx.translate(w[0], w[1]); ctx.rotate((angle * Math.PI) / 180); ctx.drawImage(s.canvas, s.x, s.y, s.w, s.h); ctx.restore(); }
    }
    return inj;
  }
  function novelA(t, d, { still }) {
    const cam = cameraA(R, t, true);
    const [sx, sy] = R.focus;
    const live = still ? STILL_TIMES[0] : t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040F'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    layerT(cam, sx, sy, 0.35, R.focus); at(null, get('nw|space'));
    ctx.save(); toDesign(); ctx.clip(port); spaceLive(ctx, live); ctx.restore();
    layerT(cam, sx, sy, 0.6, R.focus); at(null, get('nw|wall'));
    ctx.save(); toDesign(); wallLive(ctx, live); ctx.restore();
    layerT(cam, sx, sy, 1, R.focus); at(null, get('nw|bench'));
    ctx.save(); toDesign(); benchLive(ctx, live); ctx.restore();
    const inj = figureA(t, d);
    at(null, get('nw|card'));
    // The glint on the injector's vials by her face.
    const [gx, gy] = glintPoint(inj);
    const z = cam.z;
    glintScreen = [sx + (gx - cam.x) * z, sy + (gy - cam.y) * z];
    if (!still) {
      const g = clamp01(Math.sin(Math.PI * progress(t, GLINT[0], GLINT[1])));
      if (d.held && g > 0) {
        glow(ctx, gx, gy, 34 * L.u * g, '#FFFFFF', g);
        streak(ctx, gx, gy, 120 * L.u * g, 2 * L.u, '#A8F0E6', 0.8 * g);
        streak(ctx, gx, gy, 3 * L.u, 60 * L.u * g, '#FFFFFF', 0.6 * g);
      }
    }
    layerT(cam, sx, sy, 1.35, R.focus); at(null, get('nw|fg'));
    ctx.save(); toDesign(); foreLive(ctx, live); ctx.restore();
    vignette('#05040F', 0.7);
  }
  function novelB(t, d, { still }) {
    const cam = cameraB(B, t, W, H);
    const live = still ? STILL_TIMES[1] : t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120A05'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = W / 2, sy = H * 0.46;
    const T = (p, ref = [cam.x, cam.y]) => { const z = 1 + (cam.z - 1) * p; ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (sx - (ref[0] + (cam.x - ref[0]) * p) * z), dpr * (sy - (ref[1] + (cam.y - ref[1]) * p) * z)); };
    T(0.85, [B.at[0], 300]); at(null, get('cw|back')); wardBackLive(ctx, live);
    T(1); at(null, get('cw|room')); monitorLive(ctx, live);
    wardLight(ctx, live, { before: true });
    ctx.save(); figureT(B.at, B.scale); at(null, get(d.bodyKey)); head(d); ctx.restore();
    wardLight(ctx, live, { before: false });
    vignette('#120A05', 0.75);
  }
  function vignette(color, k) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.45, canvas.width * 0.35, canvas.width / 2, canvas.height * 0.45, Math.hypot(canvas.width, canvas.height) * 0.62);
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, k));
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  /** The memory's door: from the glint, out to the cut, then folding into the ward's lamp. */
  function door(t) {
    if (t < FLASH[0] || t > FLASH[2]) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (t < CUT_MS) cosmicDoor(ctx, { k: Math.pow(progress(t, FLASH[0], CUT_MS), 1.6), at: glintScreen, W, H, t });
    else {
      const cam = cameraB(B, t, W, H), [lx, ly] = lampAt(t);
      const at = [W / 2 + (lx - cam.x) * cam.z, H * 0.46 + (ly - cam.y) * cam.z];
      cosmicDoor(ctx, { k: 1 - progress(t, CUT_MS, FLASH[2]), at, W, H, t, closing: true });
    }
  }

  // Reduce motion: two held drawings, each faded in gently (from the night, then over the one before), at 0 and 3,000.
  const stills = [];
  function reduced(t) {
    const make = i => {
      if (stills[i]) return stills[i];
      const c2 = doc.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
      if (!paintAt(STILL_TIMES[i], { still: true })) return null;
      c2.getContext('2d').drawImage(canvas, 0, 0);
      stills[i] = c2;
      return c2;
    };
    const a = make(0), b = t >= CUT_MS ? make(1) : null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NIGHT; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const fadeA = ease.inOutCubic(progress(t, 0, 400)), fadeB = ease.inOutCubic(progress(t, CUT_MS, CUT_MS + 400));
    if (a) { ctx.globalAlpha = fadeA; ctx.drawImage(a, 0, 0); }
    if (b && fadeB > 0) { ctx.globalAlpha = fadeB; ctx.drawImage(b, 0, 0); }
    ctx.globalAlpha = 1;
  }

  return {
    canvas,
    stats,
    bakery: bakery.stats,
    heldBy: () => { const by = {}; for (const j of ordered) { const s = bakery.get(j.key); if (!s) continue; const kind = j.key.split('|')[0]; by[kind] = (by[kind] ?? 0) + s.canvas.width * s.canvas.height * 4; } return by; },
    plannedPictures: ordered.length,
    paint(t, { variant = 'full' } = {}) {
      const start = win.performance.now();
      const tt = Math.max(0, Math.min(TEST_MS, t));
      if (variant === 'reduced') reduced(tt);
      else { paintAt(tt); if (NOVEL) door(tt); else flash(tt); }
      const took = win.performance.now() - start;
      stats.frames += 1; stats.drawMs += took; stats.worstMs = Math.max(stats.worstMs, took);
      if (!firstDone && firstKeys.every(key => bakery.has(key))) { firstDone = true; stats.firstFrameMs = Math.round(win.performance.now() - started); }
    },
    firstReady: () => new Promise(done => { const check = () => (firstKeys.every(key => bakery.has(key)) ? done(Math.round(win.performance.now() - started)) : win.setTimeout(check, 20)); check(); }),
    ready: () => bakery.settled(),
    dispose() { bakery.stop(); canvas.remove(); for (const s of stills) if (s) { s.width = 0; s.height = 0; } },
  };
}

export { TEST_MS };
