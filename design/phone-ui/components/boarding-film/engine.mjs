// The film engine: runtime source, Designer's. What a canvas film needs to play on a phone at the screen's rate: every
// picture is drawn once (an SVG in the crew's ink, made into a bitmap in memory), and a frame only places pictures and
// light. Nothing here writes, parses or filters SVG while a film runs, reads a clock, or uses Math.random: a frame is a
// pure function of the time it is given, so a film can seek, and a phone that joins late draws the moment it joins at.
//
// Within the hosted game's Content Security Policy: no script is evaluated, nothing external is loaded and no worker
// is started. A picture is made from the film's own SVG text through a `blob:` image, which `img-src` allows.

import { clamp01, hash, lerp, noise } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';

export const NIGHT = '#07090F';

const TAU = Math.PI * 2;

/** `#RRGGBB` and an alpha as a canvas colour. */
export function rgba(hex, alpha = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.round(clamp01(alpha) * 1000) / 1000})`;
}

// ── Pictures: drawn once ────────────────────────────────────────────

/** An SVG document for a world rectangle `[x, y, w, h]`, to be made `px` pixels a unit. */
export function svgOf([x, y, w, h], px, inner) {
  const width = Math.max(1, Math.round(w * px)), height = Math.max(1, Math.round(h * px));
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${width}" height="${height}" preserveAspectRatio="none">${inner}</svg>`, width, height };
}

/** Makes an SVG text into a bitmap: a canvas `width` × `height` px. Resolves when it is drawn. */
export async function rasterize(doc, svg, width, height) {
  const win = doc.defaultView;
  const url = win.URL.createObjectURL(new win.Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new win.Image();
    image.decoding = 'async';
    await new Promise((done, fail) => { image.onload = done; image.onerror = () => fail(new Error('A film picture could not be drawn')); image.src = url; });
    if (image.decode) await image.decode().catch(() => {});
    const canvas = doc.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    win.URL.revokeObjectURL(url);
  }
}

/**
 * A sprite: a bitmap and the rectangle of its own units it covers. `make` is `{ rect: [x, y, w, h], px, inner }`:
 * the SVG markup `inner` for that rectangle, at `px` pixels a unit (never more than `maxPx` pixels a side).
 */
export async function sprite(doc, { rect, px, inner, maxPx = 4096 }) {
  const [x, y, w, h] = rect;
  const scale = Math.min(px, maxPx / w, maxPx / h);
  const { svg, width, height } = svgOf(rect, scale, inner);
  const canvas = await rasterize(doc, svg, width, height);
  return { canvas, x, y, w, h, px: width / w };
}

/** A sprite made on the spot from canvas drawing: `draw(ctx)` in the rectangle's own units. */
export function drawn(doc, rect, px, draw) {
  const [x, y, w, h] = rect;
  const canvas = doc.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * px)); canvas.height = Math.max(1, Math.round(h * px));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, -x * canvas.width / w, -y * canvas.height / h);
  draw(ctx);
  return { canvas, x, y, w, h, px: canvas.width / w };
}

/** A sprite's silhouette in one colour (for a rim of light, a shadow or a figure that is nobody). */
export function silhouette(doc, source, color) {
  const canvas = doc.createElement('canvas');
  canvas.width = source.canvas.width; canvas.height = source.canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { ...source, canvas };
}

/** The same picture at a lower resolution (a soft, out-of-focus copy when it is drawn large). */
export function softened(doc, source, factor = 0.25) {
  const canvas = doc.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.canvas.width * factor)); canvas.height = Math.max(1, Math.round(source.canvas.height * factor));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source.canvas, 0, 0, canvas.width, canvas.height);
  return { ...source, canvas, px: source.px * factor };
}

export const bytesOf = s => (s?.canvas ? s.canvas.width * s.canvas.height * 4 : 0);

/**
 * A queue of pictures to draw, most urgent first (`at`: the film time each is first needed). One is drawn at a time
 * and the page breathes between two, so a film already playing keeps its frames. `jobs` are `{ key, at, make }`,
 * `make` returning a promise of the picture (or of a list of pictures). A picture no longer needed is let go with
 * `release(key)`: its memory is given back at once.
 */
export function createBakery(doc) {
  const win = doc.defaultView;
  const store = new Map(), pending = [];
  const stats = { pictures: 0, bytes: 0, peakBytes: 0, bakeMs: 0, failed: 0, longestMs: 0, done: 0 };
  let running = false, stopped = false, idle = [];
  // Between two pictures the page gets a turn (input, a frame), without a timer's minimum wait.
  const channel = win.MessageChannel ? new win.MessageChannel() : null;
  let turn = null;
  if (channel) channel.port1.onmessage = () => { const done = turn; turn = null; done?.(); };
  const breathe = () => new Promise(done => { if (channel) { turn = done; channel.port2.postMessage(0); } else win.setTimeout(done, 0); });
  const listOf = made => (Array.isArray(made) ? made : [made]);
  const sizeOf = made => listOf(made).reduce((sum, s) => sum + (s?.canvas ? bytesOf(s) : s?.width ? s.width * s.height * 4 : 0), 0);
  const free = made => { for (const s of listOf(made)) { const c = s?.canvas ?? (s?.getContext ? s : null); if (c) { c.width = 0; c.height = 0; } } };
  async function run() {
    if (running) return;
    running = true;
    while (pending.length && !stopped) {
      pending.sort((a, b) => a.at - b.at);
      const job = pending.shift();
      const start = win.performance.now();
      try {
        const made = await job.make();
        if (stopped) { free(made); break; }
        if (job.dropped) free(made);
        else {
          store.set(job.key, made);
          stats.pictures += 1;
          stats.bytes += sizeOf(made);
          stats.peakBytes = Math.max(stats.peakBytes, stats.bytes);
        }
      } catch {
        stats.failed += 1;
        store.set(job.key, null);
      }
      const took = win.performance.now() - start;
      stats.bakeMs += took; stats.longestMs = Math.max(stats.longestMs, took); stats.done += 1;
      await breathe();
    }
    running = false;
    if (!pending.length) { for (const done of idle) done(); idle = []; }
  }
  return {
    stats,
    /** Adds jobs; one whose key is known is left as it is. */
    add(jobs) {
      for (const job of jobs) if (!store.has(job.key) && !pending.some(p => p.key === job.key)) pending.push({ ...job });
      void run();
    },
    get: key => store.get(key) ?? null,
    has: key => store.get(key) != null,
    waiting: key => pending.some(p => p.key === key),
    /** Whether a picture is being drawn or waiting to be. */
    busy: () => running || pending.length > 0,
    /** Lets a picture go, drawn or still waiting. */
    release(key) {
      const at = pending.findIndex(p => p.key === key);
      if (at >= 0) { pending[at].dropped = true; pending.splice(at, 1); }
      const made = store.get(key);
      if (made) { stats.bytes -= sizeOf(made); stats.pictures -= 1; free(made); }
      store.delete(key);
    },
    /** Resolves when everything asked for so far is drawn. */
    settled() { return pending.length || running ? new Promise(done => idle.push(done)) : Promise.resolve(); },
    stop() {
      stopped = true; pending.length = 0;
      if (channel) { channel.port1.onmessage = null; channel.port1.close(); channel.port2.close(); turn?.(); turn = null; }
      for (const made of store.values()) if (made) free(made);
      store.clear(); stats.bytes = 0; stats.pictures = 0;
      for (const done of idle) done(); idle = [];
    },
  };
}

// ── The camera: planes of depth ─────────────────────────────────────

/**
 * Where a plane of depth lands on the screen. A shot is composed flat at its reference camera (`ref`, with `dolly` 0),
 * and each layer is given a depth `p`: 0 at infinity, 1 the subject's plane, more than 1 in front of it. The camera
 * `{ x, y, dolly, zoom }` then moves: across (a plane shifts by `p` of the camera's move), in (`dolly` is how far
 * toward the subject it has gone, 0..1, negative when pulled back: a plane grows by 1 / (1 − dolly·p), the near ones
 * more) and `zoom` (the lens: every plane alike). `view` is `{ W, H, k }`, `k` the reference's px a unit.
 * A point (X, Y) on the plane is drawn at (ox + X·s, oy + Y·s).
 */
export function plane(view, ref, cam, p) {
  const s = (cam.zoom ?? 1) * view.k / (1 - (cam.dolly ?? 0) * p);
  const [jx, jy] = cam.shake ?? [0, 0];
  return {
    s,
    ox: view.W / 2 - (ref[0] + (cam.x - ref[0]) * p) * s + jx,
    oy: view.H / 2 - (ref[1] + (cam.y - ref[1]) * p) * s + jy,
  };
}

/**
 * A lens on a set in three dimensions (x across, y up, z away): `view` { W, H, f } (f: px a unit at one unit's
 * distance) and `cam` { x, y, z, tilt, shake } (tilt lowers the horizon by a share of the frame's height: the camera
 * looks up). Returns `at(x, y, z)` → [X, Y, s], `s` px a unit at that depth.
 */
export function lens(view, cam) {
  const hy = view.H * (0.5 + (cam.tilt ?? 0)), [jx, jy] = cam.shake ?? [0, 0];
  return (x, y, z) => {
    const s = view.f / Math.max(1, z - cam.z);
    return [view.W / 2 + (x - cam.x) * s + jx, hy - (y - cam.y) * s + jy, s];
  };
}

/** The rectangle of a plane a camera sees over its move (`cams`: samples of it), with a margin in px. */
export function seen(view, ref, cams, p, margin = 24) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, s = 0;
  for (const cam of cams) {
    const T = plane(view, ref, { ...cam, shake: null }, p);
    x0 = Math.min(x0, (-margin - T.ox) / T.s); x1 = Math.max(x1, (view.W + margin - T.ox) / T.s);
    y0 = Math.min(y0, (-margin - T.oy) / T.s); y1 = Math.max(y1, (view.H + margin - T.oy) / T.s);
    s = Math.max(s, T.s);
  }
  return { rect: [x0, y0, x1 - x0, y1 - y0], s };
}

/** The part of `rect` inside `bounds` (both `[x, y, w, h]`), or null. */
export function within(rect, bounds) {
  const x0 = Math.max(rect[0], bounds[0]), y0 = Math.max(rect[1], bounds[1]);
  const x1 = Math.min(rect[0] + rect[2], bounds[0] + bounds[2]), y1 = Math.min(rect[1] + rect[3], bounds[1] + bounds[3]);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
}

/** Draws a sprite on a plane. */
export function place(ctx, s, T, alpha = 1) {
  if (!s || alpha <= 0) return;
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(s.canvas, T.ox + s.x * T.s, T.oy + s.y * T.s, s.w * T.s, s.h * T.s);
  if (alpha < 1) ctx.globalAlpha = 1;
}

// ── Light ───────────────────────────────────────────────────────────

/** A glow: light added round a point, falling off to nothing at `r` (`sx`, `sy` stretch it). */
export function glow(ctx, x, y, r, color, alpha = 1, { sx = 1, sy = 1, core = 0.08, mode = 'lighter' } = {}) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(core, rgba(color, alpha * 0.82));
  g.addColorStop(0.45, rgba(color, alpha * 0.26));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** A lens's streak across a bright point. */
export function streak(ctx, x, y, length, thick, color, alpha = 1) {
  glow(ctx, x, y, length / 2, color, alpha, { sy: thick / length * 2, core: 0.02 });
}

/**
 * A beam: light from a mouth (`from`, `w0` wide) spreading to `to` (`w1` wide), brightest at the mouth. Drawn in
 * `layers` widening passes, so its edges are soft without a blur.
 */
export function beam(ctx, from, to, w0, w1, color, alpha = 0.4, { layers = 3, mode = 'lighter', fade = 0.55 } = {}) {
  if (alpha <= 0) return;
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
  g.addColorStop(0, rgba(color, alpha / layers));
  g.addColorStop(fade, rgba(color, alpha * 0.42 / layers));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  for (let i = 0; i < layers; i += 1) {
    const k = 1 + i * 0.22, a = w0 * k / 2, b = w1 * k / 2;
    ctx.beginPath();
    ctx.moveTo(from[0] + nx * a, from[1] + ny * a);
    ctx.lineTo(to[0] + nx * b, to[1] + ny * b);
    ctx.lineTo(to[0] - nx * b, to[1] - ny * b);
    ctx.lineTo(from[0] - nx * a, from[1] - ny * a);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A wash over a rectangle of the screen (a grade, a flash, a dip to the dark). */
export function wash(ctx, W, H, color, alpha, mode = 'source-over') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── Particles: each a pure function of time ─────────────────────────

/**
 * Dust in the air: `n` motes drifting in a box of the screen (`[x, y, w, h]`), each lit by `light(x, y)` (0..1 and
 * more), so they show only where light falls.
 */
export function motes(ctx, { seed = 1, n = 60, t, box: [bx, by, bw, bh], size = [0.6, 1.8], color = '#FFF4D6', alpha = 0.8, light = () => 1, speed = 1 }) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i += 1) {
    const depth = hash(i, seed + 1);
    const x = bx + ((hash(i, seed + 2) * bw + (t * 0.006 * speed * (0.4 + depth) + 24 * noise(t * 0.0004 + i, seed + 3))) % bw + bw) % bw;
    const y = by + ((hash(i, seed + 4) * bh - t * 0.004 * speed * (0.3 + depth) + 18 * noise(t * 0.0005 + i * 1.7, seed + 5)) % bh + bh) % bh;
    const lit = light(x, y);
    if (lit <= 0.02) continue;
    const twinkle = 0.55 + 0.45 * Math.sin(t * 0.004 * (0.6 + depth) + i);
    const r = lerp(size[0], size[1], depth);
    ctx.fillStyle = rgba(color, Math.min(1, alpha * lit * twinkle * (0.35 + 0.65 * depth)));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** Sparks thrown from a point at `t0`: bright streaks on ballistic paths, gone in `life` ms. */
export function sparks(ctx, { seed = 1, n = 14, t, t0, at: [ox, oy], speed = [0.25, 0.7], angle = -Math.PI / 2, spread = Math.PI, gravity = 0.0011, life = [180, 420], color = '#FFD27A', width = 1.6, scale = 1 }) {
  const dt = t - t0;
  if (dt < 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i += 1) {
    const ms = lerp(life[0], life[1], hash(i, seed + 1));
    if (dt > ms) continue;
    const a = angle + (hash(i, seed + 2) - 0.5) * spread, v = lerp(speed[0], speed[1], hash(i, seed + 3)) * scale;
    const at = d => [ox + Math.cos(a) * v * d, oy + Math.sin(a) * v * d + 0.5 * gravity * scale * d * d];
    const [x1, y1] = at(dt), [x0, y0] = at(Math.max(0, dt - 34));
    ctx.strokeStyle = rgba(color, (1 - dt / ms) ** 1.5);
    ctx.lineWidth = width * scale * (1 - 0.5 * dt / ms);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/** A puff: soft clouds swelling from a point at `t0` and thinning out (dust kicked up, steam let go). */
export function puff(ctx, { seed = 3, n = 6, t, t0, at: [ox, oy], r = 60, ms = 520, color = '#D8C9AE', alpha = 0.45, drift = [0, -0.02], spread = 1, flat = 1, mode = 'source-over' }) {
  const dt = t - t0;
  if (dt < 0 || dt > ms) return;
  const k = dt / ms, grow = 1 - (1 - k) ** 3;
  for (let i = 0; i < n; i += 1) {
    const a = hash(i, seed) * TAU, d = r * 0.7 * grow * hash(i, seed + 1) * spread;
    glow(ctx, ox + Math.cos(a) * d + drift[0] * dt, oy + Math.sin(a) * d * 0.5 * flat + drift[1] * dt, r * (0.35 + 0.65 * grow) * (0.6 + 0.6 * hash(i, seed + 2)), color, alpha * (1 - k) ** 1.4, { core: 0.3, mode, sy: flat });
  }
}

/** Lines thrown out from an impact, comic fashion: `k` 0..1 over its life. */
export function impact(ctx, { seed = 2, n = 22, k, at: [cx, cy], r0, r1, color = '#F4EAD8', width = 2.4, alpha = 0.9, aspect = 1 }) {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha * (1 - k) ** 1.2);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i += 1) {
    const a = (i + hash(i, seed) * 0.8) / n * TAU;
    const inner = lerp(r0, r1, k) * (0.9 + 0.2 * hash(i, seed + 1)), outer = inner + (r1 - r0) * (0.25 + 0.5 * hash(i, seed + 2)) * (1 - k * 0.5);
    ctx.lineWidth = width * (0.5 + hash(i, seed + 3));
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner * aspect, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer * aspect, cy + Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Light, drawn small ──────────────────────────────────────────────

/**
 * Where a frame's soft light is drawn: a canvas of its own, a quarter of the frame's size each way, lying over the
 * picture as a layer the browser stretches to fit. A glow or a beam is soft, so it loses nothing drawn small, and it
 * costs a sixteenth of what it would on the frame. `ctx` takes the same calls as the frame's own context, in the
 * frame's own px. What must hide the light (ink, a letter standing in front of it) is cut out of it with `cut`.
 */
export function createLight(doc, share = 0.25) {
  const canvas = doc.createElement('canvas'), ctx = canvas.getContext('2d');
  let W = 1, H = 1;
  return {
    canvas,
    ctx,
    /** Starts a frame of `view` { W, H } from the dark. */
    begin(view) {
      const w = Math.max(1, Math.ceil(view.W * share)), h = Math.max(1, Math.ceil(view.H * share));
      W = view.W; H = view.H;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(w / W, 0, 0, h / H, 0, 0);
    },
    /** Draws with `draw(ctx)` what the light is to be cut away under. */
    cut(draw) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      draw(ctx);
      ctx.restore();
    },
    dispose() { canvas.width = 0; canvas.height = 0; },
  };
}

// ── The finish ──────────────────────────────────────────────────────

/** A tile of film grain, made once: light and dark specks, to lie over the frame as its own layer. */
export function grainTile(doc, size = 128, seed = 17) {
  const canvas = doc.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d'), data = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const v = hash(i, seed), light = v > 0.5;
    data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = light ? 255 : 0;
    data.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255 * (light ? 0.55 : 1));
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
/** Where the grain's layer sits at `t`: it jumps 24 times a second, as film's grain does. [x, y] as shares of a tile. */
export const grainAt = t => { const tick = Math.floor(Math.max(0, t) / (1000 / 24)); return [hash(tick, 5), hash(tick, 9)]; };
