// The boarding film's close: runtime source, Designer's. The Game N mark stamped over the corridor, in the films' own
// lettering and amber (the hosted kit's letters.mjs, as version 1's), and the ink that takes the frame to the night
// (the kit's tide, blot for blot). The mark is a picture drawn once; landing, its light and the ink are laid each frame.

import { blotPath, defs } from '../../../../apps/game/hosted/pregame-films/kit/fx.mjs';
import { AMBER_FACE, inkWord } from '../../../../apps/game/hosted/pregame-films/kit/letters.mjs';
import { clamp01, ease, lerp, progress, rng } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { NIGHT, glow, impact, rgba, sparks, sprite, streak } from './engine.mjs';

const WORD = 'Game N';

/** The mark's size on a frame, as version 1 set it: its cap height in px. */
export const markSize = view => Math.min(view.W * 0.16, view.H * 0.095);

/** The mark's pictures for a frame: the lettered word, and its face alone (what a sheen is cut to). */
export async function markSprites(doc, view) {
  const size = markSize(view);
  const make = async options => {
    const D = defs(), word = inkWord(D, 'bf-mark', WORD, { x: 0, y: 0, size, skew: -8, extrude: [0.5, 0.62], steps: 8, depth: 1, sheen: 0, hot: false, ...options });
    const w = word.width + size * 1.5, h = size * 2.6;
    return { ...(await sprite(doc, { rect: [-w / 2, -h / 2, w, h], px: 1, inner: `${D.markup()}${word.svg}` })), width: word.width };
  };
  const white = { top: '#FFFFFF', mid: '#FFFFFF', bottom: '#FFFFFF', side: 'none', sideDeep: 'none', ink: 'none', highlight: '#FFFFFF' };
  return [await make({ face: AMBER_FACE }), await make({ face: white, depth: 0, shadow: 0, rough: false })];
}

/**
 * The mark landing. `at` is the film's time; `beats` its stamp, hit and sheen (ms). Full motion: it comes down out
 * of the dark above the lens, lands with a jolt of light, throws sparks and ink, and a sheen crosses its face. `still`
 * (Reduce motion): the mark at rest.
 */
export function createMark(doc) {
  const work = doc.createElement('canvas'), wx = work.getContext('2d');
  return {
    paint(ctx, view, pictures, at, beats, still = false, L = ctx) {
      const [word, face] = pictures ?? [];
      if (!word) return;
      const k = still ? 1 : progress(at, ...beats.stamp);
      if (k <= 0) return;
      const size = markSize(view), cx = view.W / 2, cy = view.H * 0.2;
      // It falls the last of the way fast: a blur of itself above, then the landing.
      const land = ease.inCubic(k), scale = lerp(2.6, 1, land), settle = still ? 0 : progress(at, beats.hit, beats.hit + 300);
      const bounce = settle > 0 && settle < 1 ? 0.045 * Math.sin(settle * Math.PI * 3) * (1 - settle) : 0;
      const draw = (s, alpha, dy = 0) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy + dy); ctx.rotate(-2.5 * Math.PI / 180); ctx.scale(s, s);
        ctx.drawImage(word.canvas, word.x, word.y, word.w, word.h);
        ctx.restore();
      };
      if (!still && k < 1) for (let i = 3; i >= 1; i -= 1) draw(scale + i * 0.16 * (1 - land), 0.16 * clamp01(k * 3), -size * 0.2 * i * (1 - land));
      draw(scale * (1 + bounce), clamp01(k * 3.2));
      if (still) return;
      const since = at - beats.hit;
      if (since >= 0) {
        // The landing: light, lines thrown out, sparks, and a streak through the letters.
        const flash = 1 - progress(at, beats.hit, beats.hit + 150);
        glow(L, cx, cy, word.width * 0.9, '#FFE6B0', 0.5 * flash, { sy: 0.5 });
        streak(L, cx, cy, view.W * 2.2, size * 0.2, '#FFF1CC', 0.6 * (1 - progress(at, beats.hit, beats.hit + 420)));
        impact(ctx, { seed: 5, n: 24, k: progress(at, beats.hit, beats.hit + 360), at: [cx, cy], r0: word.width * 0.56, r1: word.width * 0.95, color: '#F4EBDD', width: 2.2 * view.px, alpha: 0.5, aspect: 1.9 });
        sparks(ctx, { seed: 9, n: 22, t: at, t0: beats.hit, at: [cx, cy + size * 0.3], speed: [0.22, 0.75], angle: -Math.PI / 2, spread: Math.PI * 1.5, life: [220, 520], color: '#FFD27A', width: 1.5 * view.px, scale: view.px });
        // Ink thrown off the letters' feet.
        const r = rng(31);
        ctx.fillStyle = rgba('#0B0E15', 0.9 * (1 - progress(at, beats.hit + 300, beats.hit + 620)));
        for (let i = 0; i < 16; i += 1) {
          const a = Math.PI * (0.08 + 0.84 * r()) * (r() > 0.5 ? 1 : -1) + Math.PI / 2, d = word.width * (0.5 + 0.34 * r()) * ease.outCubic(clamp01(since / (150 + 120 * r()))), s = size * (0.02 + 0.05 * r() ** 2);
          ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * d * 1.25, cy + Math.sin(a) * d * 0.55, s * 1.6, s, a, 0, Math.PI * 2); ctx.fill();
        }
      }
      // The sheen: a band of light crossing the face, cut to it.
      const sheen = progress(at, ...beats.sheen);
      if (face && sheen > 0 && sheen < 1) {
        const w = Math.ceil(face.w), h = Math.ceil(face.h);
        if (work.width < w || work.height < h) { work.width = w; work.height = h; }
        wx.globalCompositeOperation = 'copy';
        const mid = lerp(-0.1, 1.1, sheen) * w, band = size * 1.1;
        const g = wx.createLinearGradient(mid - band, 0, mid + band, band * 0.4);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        wx.fillStyle = g; wx.fillRect(0, 0, w, h);
        wx.globalCompositeOperation = 'destination-in';
        wx.drawImage(face.canvas, 0, 0, w, h);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(cx, cy); ctx.rotate(-2.5 * Math.PI / 180);
        ctx.drawImage(work, 0, 0, w, h, face.x, face.y, face.w, face.h);
        ctx.restore();
      }
    },
    /** The mark's own shape where it stands at `at`, drawn on `target` (so light behind it can be cut away under it). */
    shape(target, view, pictures, at, beats, still = false) {
      const [word] = pictures ?? [];
      const k = still ? 1 : progress(at, ...beats.stamp);
      if (!word || k <= 0) return;
      const scale = lerp(2.6, 1, ease.inCubic(k));
      target.save();
      target.globalAlpha = clamp01(k * 3.2);
      target.translate(view.W / 2, view.H * 0.2); target.rotate(-2.5 * Math.PI / 180); target.scale(scale, scale);
      target.drawImage(word.canvas, word.x, word.y, word.w, word.h);
      target.restore();
    },
    dispose() { work.width = 0; work.height = 0; },
  };
}

/**
 * The ink tide the film ends on, `v` 0..1: the kit's tide (fx.mjs inkTide), blot for blot, laid on the canvas. Blots of
 * ink bloom from the frame's edges and corners, drops thrown ahead of them, and meet over the middle.
 */
export function paintTide(ctx, view, v, seed = 21) {
  if (v <= 0) return;
  const { W, H } = view, R = rng(seed), diag = Math.hypot(W, H);
  const sources = [[0, 0], [W, 0], [W, H], [0, H], [W * 0.5, -H * 0.04], [W * 1.04, H * 0.55], [W * 0.45, H * 1.04], [-W * 0.04, H * 0.45]];
  const bleed = [], ink = [], drops = [];
  sources.forEach(([sx, sy], i) => {
    const delay = R() * 0.22, k = clamp01((v - delay) / (1 - delay)), toward = Math.atan2(H / 2 - sy, W / 2 - sx);
    const thrown = Array.from({ length: 6 }, () => [toward + (R() - 0.5) * 1.7, lerp(1.04, 1.32, R()), lerp(0.003, 0.012, R())]);
    if (k <= 0) return;
    const r = diag * (0.04 + 0.8 * (k ** 1.55)), wobble = v * 2.2;
    bleed.push(blotPath({ cx: sx, cy: sy, r: r * 1.07, seed: seed + i * 13, rough: 0.2, wobble, points: 96 }));
    ink.push(blotPath({ cx: sx, cy: sy, r, seed: seed + i * 13, rough: 0.17, wobble, points: 96 }));
    for (const [a, reach, size] of thrown) drops.push([sx + Math.cos(a) * r * reach, sy + Math.sin(a) * r * reach, diag * size * (0.35 + k)]);
  });
  const Path = view.Path;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  for (const d of bleed) ctx.fill(new Path(d));
  ctx.fillStyle = NIGHT;
  for (const d of ink) ctx.fill(new Path(d));
  for (const [x, y, r] of drops) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  if (v >= 0.985) ctx.fillRect(0, 0, W, H);
}
