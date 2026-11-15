// mothership:dev-only
//
// The ship travel's comparison with the approved poster (the Lead Designer's review of #269: "draw the film's still
// beside the approved poster the pack uses and compare the ship"). design/tools/ship-travel-check.mjs captures the
// component as the browser draws it, under the production headers, and saves the capture next to the bundle; these
// functions read that capture and the approved poster (apps/game/candidates/planet-library/transit.poster.webp, a
// lossy WebP) into canvases and measure how far apart they are, in 0–255 levels per colour channel:
//   compareFull   the still at the poster's own 1920 × 1080: the ship's box and the whole frame;
//   comparePhone  the pack's nav screen (the poster as a full-phone cover) beside the shell and the film, at a
//                 development phone size: the film's area below the top bar.
// Each also measures two controls, the same capture moved 3 px and scaled 2 % about the ship's centre, so the record
// shows the measure would catch a ship drawn a little differently.

/** The ship's box on the poster, its exhaust included: the ship rests at (960, 532.59), 1.23 times its 620 × 210. */
export const SHIP_BOX = Object.freeze({ x: 380, y: 400, w: 960, h: 230 });
const SHIP_CENTRE = Object.freeze([960, 532.59]);

async function image(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
function pixels(img, w, h, { dx = 0, dy = 0, scale = 1, about = [0, 0], sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#05060C';
  ctx.fillRect(0, 0, w, h);
  ctx.translate(about[0] + dx, about[1] + dy);
  ctx.scale(scale, scale);
  ctx.translate(-about[0], -about[1]);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}
/** Mean absolute difference per channel (0–255) in a box, and the share of pixels that differ by more than 24 levels. */
function difference(a, b, width, box) {
  let sum = 0, far = 0, n = 0;
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const i = (y * width + x) * 4;
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      sum += d;
      if (d / 3 > 24) far += 1;
      n += 1;
    }
  }
  return { mean: Math.round((sum / (n * 3)) * 100) / 100, far: Math.round((far / n) * 10000) / 10000 };
}

/** The still (a capture of the component at 1920 × 1080) against the approved poster. */
export async function compareFull({ poster, shot }) {
  const [P, S] = await Promise.all([image(poster), image(shot)]);
  const W = 1920, H = 1080, all = { x: 0, y: 0, w: W, h: H };
  const p = pixels(P, W, H), s = pixels(S, W, H);
  const shifted = pixels(S, W, H, { dx: 3 }), scaled = pixels(S, W, H, { scale: 1.02, about: SHIP_CENTRE });
  // A picture of where they differ, eight times as strong, for the review folder.
  const diff = document.createElement('canvas');
  diff.width = W; diff.height = H; diff.className = 'pv-diff';
  const ctx = diff.getContext('2d');
  const out = ctx.createImageData(W, H);
  for (let i = 0; i < p.length; i += 4) {
    for (let c = 0; c < 3; c += 1) out.data[i + c] = Math.min(255, Math.abs(p[i + c] - s[i + c]) * 8);
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  ctx.strokeStyle = '#F1B84B'; ctx.lineWidth = 2;
  ctx.strokeRect(SHIP_BOX.x, SHIP_BOX.y, SHIP_BOX.w, SHIP_BOX.h);
  document.body.replaceChildren(diff);
  return {
    poster: { width: P.naturalWidth, height: P.naturalHeight },
    shot: { width: S.naturalWidth, height: S.naturalHeight },
    box: SHIP_BOX,
    ship: difference(p, s, W, SHIP_BOX),
    frame: difference(p, s, W, all),
    controls: { shifted3px: difference(p, shifted, W, SHIP_BOX), scaled2pct: difference(p, scaled, W, SHIP_BOX) },
  };
}

/**
 * The pair at a phone size (a capture of both phones side by side): the pack's poster on the left, the shell and the
 * film on the right, compared in the film's area, from below the top bar to above the bottom safe area.
 */
export async function comparePhone({ shot, size, layout, scale = 1 }) {
  const S = await image(shot);
  const W = size.width, H = size.height, side = { sy: 0, sw: W * scale, sh: H * scale };
  const left = pixels(S, W, H, { ...side, sx: 0 });
  const right = pixels(S, W, H, { ...side, sx: W * scale });
  const area = { x: 0, y: Math.ceil(layout.bars.top), w: W, h: Math.floor(H - layout.bars.top - layout.bars.bottom) };
  // The ship's box where the cover puts it on this phone, inside the film's area.
  const k = Math.max(W / 1920, H / 1080), ox = (W - 1920 * k) / 2, oy = (H - 1080 * k) / 2;
  const x0 = Math.max(0, Math.floor(ox + SHIP_BOX.x * k)), x1 = Math.min(W, Math.ceil(ox + (SHIP_BOX.x + SHIP_BOX.w) * k));
  const y0 = Math.max(area.y, Math.floor(oy + SHIP_BOX.y * k)), y1 = Math.min(area.y + area.h, Math.ceil(oy + (SHIP_BOX.y + SHIP_BOX.h) * k));
  const ship = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const shiftedRight = pixels(S, W, H, { ...side, sx: W * scale, dx: 3 });
  return {
    size, scale, area, ship,
    film: difference(left, right, W, area), shipBox: difference(left, right, W, ship),
    controls: { shifted3px: difference(left, shiftedRight, W, ship) },
  };
}
