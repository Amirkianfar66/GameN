// What moves in the new world, drawn on the canvas each frame, a pure function of the time it is given: in the
// briefing room the cosmos turning (orbits and their moons, a tug crossing, the ship's lights), the duct fan, the
// terminal's changing displays, steam from a joint, the soldering iron's thread of smoke and dust in the light; in the
// ward the swinging lamp and its light, the fan, the storm at the porthole, the monitor's trace and the drips; and the
// cosmic event between them, the memory's door: orbital rings and swirling light, rushing out in scale.
// No display shows a word or a number: only traces, bars and marks.

import { glow, motes, rgba } from '../../../phone-ui/components/boarding-film/engine.mjs';
import { FAN, IRON_TIP, LIGHTS, ORBITS, SCREENS, STEAM, shipPorts } from './room.mjs';
import { DRIP, LAMP, MONITOR, PORTHOLE, WARD, WFAN, WPAL } from './ward.mjs';

const TAU = Math.PI * 2;
const hash = (n, s = 0) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = v => Math.max(0, Math.min(1, v));

/** Smoke: soft puffs rising from `at`, drifting and spreading, each a function of time. */
export function smoke(ctx, t, { at: [x0, y0], n = 9, life = 2600, rise = 0.045, drift = 0.012, r0 = 4, r1 = 26, color = '#C9D2DE', alpha = 0.22, seed = 1 }) {
  for (let i = 0; i < n; i += 1) {
    const age = ((t + hash(i, seed) * life) % life) / life;
    const x = x0 + drift * age * life + Math.sin(age * 5 + i) * 6 * age, y = y0 - rise * age * life;
    const r = r0 + (r1 - r0) * age, a = alpha * Math.sin(Math.PI * age);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
}

// ── The briefing room ───────────────────────────────────────────────

/** The view through the port: moons on their orbits, a tug crossing with its lights, the ship's ports, stars glinting, light swirling. Design px, clipped to the port by the caller. */
export function spaceLive(ctx, t) {
  // Swirling sheens over the nebula: arcs turning slowly round its knot.
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i += 1) {
    const a0 = t * 0.00018 * (i % 2 ? -1 : 1) + i * 1.6, r = 40 + i * 22;
    ctx.strokeStyle = rgba(['#E86FA8', '#3FE0D0', '#FFB347', '#E86FA8'][i], 0.18);
    ctx.lineWidth = 3 - i * 0.4;
    ctx.beginPath(); ctx.ellipse(215, 150, r, r * 0.62, 0, a0, a0 + 1.9); ctx.stroke();
  }
  ctx.restore();
  // Moons and satellites on the orbits.
  for (const o of ORBITS) {
    const a = o.phase + t * o.speed * 6, tilt = (o.tilt * Math.PI) / 180;
    const ex = Math.cos(a) * o.rx, ey = Math.sin(a) * o.ry;
    const x = o.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y = o.cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
    glow(ctx, x, y, 9, o.color, 0.8);
    ctx.fillStyle = '#FFF6E6'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
  }
  // Stars that catch and glint.
  for (let i = 0; i < 6; i += 1) {
    const k = Math.max(0, Math.sin(t / (400 + i * 90) + i * 2.3));
    if (k > 0.7) glow(ctx, 30 + hash(i, 3) * 260, 70 + hash(i, 5) * 260, 6 * k, '#FFF2D8', (k - 0.7) * 3);
  }
  // A tug crossing the dock, slow, its lights blinking.
  const tx = -80 + ((t * 0.045) % 520), ty = 330 - tx * 0.12;
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.12);
  ctx.fillStyle = '#07090E'; ctx.fillRect(-15, -5, 30, 10); ctx.fillStyle = '#3A4A63'; ctx.fillRect(-13, -3.5, 24, 6);
  ctx.fillStyle = '#07090E'; ctx.fillRect(-22, -2, 7, 4);
  ctx.restore();
  glow(ctx, tx - 22, ty + 2.6, 8, '#3FE0D0', 0.9);
  if (Math.floor(t / 300) % 2) glow(ctx, tx + 15, ty - 1.8, 5, '#FFE0A3', 1);
  // The ship's ports and running lights.
  ctx.fillStyle = rgba('#FFD48A', 0.9);
  shipPorts().forEach(([x, y], i) => { if ((Math.floor(t / 1300) + i) % 17 !== 0) ctx.fillRect(x - 1.2, y - 0.8, 2.6, 1.6); });
  glow(ctx, 150 + 154 * 0.82, 250, 7, '#FFFFFF', Math.floor(t / 600) % 2 ? 1 : 0.2);
  for (const y of [-16, 0, 14]) glow(ctx, 150 - 170 * 0.82, 250 + y * 0.82, 10, '#3FE0D0', 0.7 + 0.3 * Math.sin(t / 120 + y));
}

/** The wall's machinery: the fan turning, the screens' traces and bars, the lights, steam from the joints. */
export function wallLive(ctx, t) {
  // The fan's blades behind its grille.
  ctx.save(); ctx.translate(FAN.cx, FAN.cy); ctx.rotate(t * 0.006);
  ctx.fillStyle = '#0E131C';
  for (let i = 0; i < 4; i += 1) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.ellipse(FAN.r * 0.5, 0, FAN.r * 0.5, FAN.r * 0.18, 0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#07090E'; ctx.lineWidth = 1.6;
  for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(FAN.cx - FAN.r, FAN.cy + i * 5); ctx.lineTo(FAN.cx + FAN.r, FAN.cy + i * 5); ctx.stroke(); }
  // Screen 1: a sweep round the orbits, blips coming and going. Screen 2: a trace running, bars changing.
  const [s1, s2] = SCREENS;
  ctx.save(); ctx.beginPath(); ctx.rect(s1.x, s1.y, s1.w, s1.h); ctx.clip();
  const cx = s1.x + s1.w / 2, cy = s1.y + s1.h / 2;
  ctx.strokeStyle = rgba('#3FE0D0', 0.5); ctx.lineWidth = 0.8;
  for (const r of [8, 16, 24]) { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, TAU); ctx.stroke(); }
  const a = t * 0.004;
  const g = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
  if (g) { g.addColorStop(0, rgba('#3FE0D0', 0.55)); g.addColorStop(0.12, rgba('#3FE0D0', 0)); g.addColorStop(1, rgba('#3FE0D0', 0)); ctx.fillStyle = g; ctx.fillRect(s1.x, s1.y, s1.w, s1.h); }
  for (let i = 0; i < 4; i += 1) { const b = 0.5 + 0.5 * Math.sin(t / 500 + i * 2); ctx.fillStyle = rgba('#7CF2C8', b); ctx.fillRect(cx + Math.cos(i * 1.7) * (8 + i * 4) - 1, cy + Math.sin(i * 1.7) * (6 + i * 3) - 1, 2.4, 2.4); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(s2.x, s2.y, s2.w, s2.h); ctx.clip();
  ctx.strokeStyle = rgba('#3FE0D0', 0.9); ctx.lineWidth = 1.1; ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const x = s2.x + (i / 40) * s2.w, u = ((i / 40) * 2 + t / 700) % 1;
    const y = s2.y + s2.h * 0.4 - (u < 0.07 ? Math.sin((u / 0.07) * Math.PI) * 10 : Math.sin(i + t / 90) * 1);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) { const hgt = 3 + 9 * (0.5 + 0.5 * Math.sin(t / (180 + i * 37) + i)); ctx.fillStyle = rgba(i % 3 ? '#3FE0D0' : '#FFB347', 0.8); ctx.fillRect(s2.x + 4 + i * 7, s2.y + s2.h - 3 - hgt, 4, hgt); }
  ctx.restore();
  for (let i = 0; i < LIGHTS.n; i += 1) {
    const on = (Math.floor(t / (250 + i * 130)) + i) % 3 !== 0;
    if (on) glow(ctx, LIGHTS.x + i * LIGHTS.gap, LIGHTS.y, 6, i === 2 ? '#FFB347' : '#7CF2C8', 0.9);
  }
  // Steam from the joints on the left pipes.
  smoke(ctx, t, { at: STEAM[0], n: 8, life: 2400, rise: 0.05, drift: 0.02, r0: 4, r1: 30, color: '#C9D2DE', alpha: 0.2, seed: 2 });
  smoke(ctx, t + 900, { at: STEAM[1], n: 6, life: 3000, rise: 0.03, drift: 0.025, r0: 3, r1: 22, color: '#B9C4D3', alpha: 0.14, seed: 5 });
}

/** Over the bench: the soldering iron's thread of smoke, dust in the lamp's light. */
export function benchLive(ctx, t) {
  smoke(ctx, t, { at: IRON_TIP, n: 10, life: 2200, rise: 0.06, drift: 0.008, r0: 1.5, r1: 12, color: '#D8D2C6', alpha: 0.28, seed: 9 });
  motes(ctx, { seed: 31, n: 40, t, box: [190, 330, 170, 230], size: [0.5, 1.3], color: '#FFE0A3', alpha: 0.75, speed: 0.4 });
}

/** In front of everything: smoke drifting across close to the lens. */
export function foreLive(ctx, t) {
  smoke(ctx, t, { at: [-40, 720], n: 6, life: 5200, rise: 0.02, drift: 0.07, r0: 40, r1: 120, color: '#8FA2BC', alpha: 0.1, seed: 13 });
}

// ── The ward ─────────────────────────────────────────────────────────

/** The lamp's swing at t (radians): a slow pendulum. */
export const lampSwing = t => 0.09 * Math.sin(t / 520) + 0.02 * Math.sin(t / 210);
/** Where the lamp hangs at t, in the ward's px. */
export function lampAt(t) { const a = lampSwing(t); return [LAMP.x + Math.sin(a) * LAMP.len, LAMP.y + Math.cos(a) * LAMP.len]; }

/** Behind the room: the storm in the porthole, the fan, drips. */
export function wardBackLive(ctx, t) {
  const P = PORTHOLE;
  ctx.save(); ctx.beginPath(); ctx.arc(P.cx, P.cy, P.r, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(P.cx + 10, P.cy - 10, 4, P.cx, P.cy, P.r);
  g.addColorStop(0, '#E2B97C'); g.addColorStop(1, '#6B4A2A'); ctx.fillStyle = g; ctx.fillRect(P.cx - P.r, P.cy - P.r, P.r * 2, P.r * 2);
  // Swirling dust: arcs turning, fast, round a moving eye.
  for (let i = 0; i < 14; i += 1) {
    const r = 6 + i * 3.6, a0 = t * 0.004 * (1 + i * 0.05) + i;
    ctx.strokeStyle = rgba(i % 2 ? '#F2D6A4' : '#4A3220', 0.35); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(P.cx + Math.sin(t / 700) * 8, P.cy + Math.cos(t / 900) * 6, r, a0, a0 + 2.2); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.translate(WFAN.cx, WFAN.cy); ctx.rotate(t * 0.003);
  ctx.fillStyle = '#120B06';
  for (let i = 0; i < 3; i += 1) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.ellipse(WFAN.r * 0.5, 0, WFAN.r * 0.55, WFAN.r * 0.2, 0.25, 0, TAU); ctx.fill(); }
  ctx.restore();
  // Drips from the leaking joint.
  for (let i = 0; i < 2; i += 1) {
    const age = ((t + i * 700) % 1400) / 1400;
    const y = DRIP[1] + (age < 0.4 ? age * 8 : 3.2 + (age - 0.4) ** 2 * 900);
    if (y < 480) { ctx.fillStyle = rgba('#D8E2D0', 0.8); ctx.beginPath(); ctx.ellipse(DRIP[0], y, 1.6, 2.4, 0, 0, TAU); ctx.fill(); }
  }
}

/** The monitor's green trace, steadying. */
export function monitorLive(ctx, t) {
  const M = MONITOR;
  ctx.save(); ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();
  ctx.strokeStyle = WPAL.green; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let i = 0; i <= 50; i += 1) {
    const x = M.x + (i / 50) * M.w, u = ((i / 50) * 2.5 + t / 800) % 1;
    const y = M.y + M.h * 0.55 - (u < 0.08 ? Math.sin((u / 0.08) * Math.PI) * (u < 0.04 ? -3 : 13) : 0);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.restore();
  glow(ctx, M.x + M.w / 2, M.y + M.h / 2, M.w * 0.9, WPAL.green, 0.25);
}

/** The lamp, its cord, its cone and the dark it leaves: the ward's light, swinging. Over the room, under the figure's light. */
export function wardLight(ctx, t, { before }) {
  const [lx, ly] = lampAt(t), a = lampSwing(t);
  if (before) {
    // The dark beyond the lamp's reach, following its swing.
    const g = ctx.createRadialGradient(lx, ly + 220, 60, lx, ly + 220, 430);
    g.addColorStop(0, 'rgba(10,6,3,0)'); g.addColorStop(1, 'rgba(10,6,3,0.82)');
    ctx.fillStyle = g; ctx.fillRect(-40, -40, WARD.w + 80, WARD.h + 80);
    // The cone.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const tip = [lx, ly + 8], end = [lx + Math.sin(a) * 520, ly + 560];
    const grad = ctx.createLinearGradient(tip[0], tip[1], end[0], end[1]);
    grad.addColorStop(0, rgba(WPAL.amberHot, 0.32)); grad.addColorStop(1, rgba(WPAL.amber, 0));
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(tip[0] - 14, tip[1]); ctx.lineTo(tip[0] + 14, tip[1]); ctx.lineTo(end[0] + 260, end[1]); ctx.lineTo(end[0] - 260, end[1]); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(ctx, lx + Math.sin(a) * 200, 520, 220, WPAL.amber, 0.25, { sy: 0.32 });
    motes(ctx, { seed: 12, n: 60, t, box: [lx - 160, ly, 320, 460], size: [0.5, 1.4], color: '#FFF0CC', alpha: 0.7, speed: 0.5 });
    return;
  }
  // The cord and the shade, then its bulb's glow.
  ctx.strokeStyle = '#0A0705'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(LAMP.x, LAMP.y - 10); ctx.lineTo(lx, ly - 12); ctx.stroke();
  ctx.save(); ctx.translate(lx, ly); ctx.rotate(-a);
  ctx.fillStyle = '#3E2A1A'; ctx.strokeStyle = '#0A0705'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-9, -16); ctx.lineTo(9, -16); ctx.lineTo(22, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = WPAL.amberHot; ctx.beginPath(); ctx.ellipse(0, 0, 20, 4.4, 0, 0, TAU); ctx.fill();
  ctx.restore();
  glow(ctx, lx, ly + 3, 60, WPAL.amberHot, 0.9);
}

// ── The cosmic event: the memory's door ─────────────────────────────

/**
 * From the injector's glint: orbital rings tilting open round the point and rushing outward, light swirling in arms
 * of teal, magenta and gold, the scale changing as if falling through it; at the cut it turns inside out and folds
 * into the ward's lamp. `k` 0..1 how far it has gone, `at` its centre (screen px), `W` `H` the screen.
 */
export function cosmicDoor(ctx, { k, at: [cx, cy], W, H, t, closing = false }) {
  if (k <= 0.001) return;
  const reach = Math.hypot(W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // A field of light first, so the rings read on it.
  const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * (0.15 + 0.9 * k));
  base.addColorStop(0, rgba('#FFF6E6', 0.9 * k)); base.addColorStop(0.3, rgba('#FFB347', 0.5 * k)); base.addColorStop(0.7, rgba('#C83C9A', 0.35 * k)); base.addColorStop(1, rgba('#2B1B5E', 0));
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  // The rings: each tilted, turning, growing by powers (a change of scale).
  for (let i = 0; i < 9; i += 1) {
    const grow = Math.pow(2.2, (k * 5 + i * 0.55) % 5) * 10;
    const tilt = i * 0.7 + t * 0.0012 * (i % 2 ? 1 : -1);
    const a = clamp01(1 - grow / reach) * k;
    ctx.strokeStyle = rgba(['#3FE0D0', '#E86FA8', '#FFB347'][i % 3], 0.7 * a);
    ctx.lineWidth = 1 + 3 * a;
    ctx.beginPath(); ctx.ellipse(cx, cy, grow, grow * (0.35 + 0.25 * Math.sin(i)), tilt, 0, TAU); ctx.stroke();
    // A node riding each ring.
    const na = t * 0.004 + i;
    glow(ctx, cx + Math.cos(na) * grow * Math.cos(tilt) - Math.sin(na) * grow * 0.4 * Math.sin(tilt), cy + Math.cos(na) * grow * Math.sin(tilt) + Math.sin(na) * grow * 0.4 * Math.cos(tilt), 6 + 10 * a, '#FFF6E6', a);
  }
  // Swirling arms.
  for (let arm = 0; arm < 3; arm += 1) {
    ctx.strokeStyle = rgba(['#19C7B4', '#C83C9A', '#FFB347'][arm], 0.45 * k);
    ctx.lineWidth = 10 * k + 2;
    ctx.beginPath();
    for (let s = 0; s < 60; s += 1) {
      const r = (s / 60) * reach * (0.2 + 0.8 * k), ang = arm * (TAU / 3) + s * 0.12 + t * 0.003 * (closing ? -1 : 1);
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.7;
      s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // At its height, a near-white wash: the cut happens under it.
  if (k > 0.75) { ctx.fillStyle = rgba('#FFF3E2', (k - 0.75) * 3.6); ctx.fillRect(0, 0, W, H); }
}
