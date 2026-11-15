// mothership:dev-only
//
// The end scene's comparisons (the Lead Designer's review of #271: "the still compared with both arrival posters").
// design/tools/end-scene-check.mjs captures the component as the browser draws it, under the production headers, and
// the pinned pack's own `end` screen as the pack's prototype draws it, and saves the captures next to the bundle; these
// functions read them and the approved posters (apps/game/candidates/planet-library/arrival-{red,blue}.poster.webp,
// lossy WebP files) into canvases and measure how far apart they are, in 0–255 levels per colour channel:
//   compareFull   the still's hero at the poster's own 1920 × 1080: the ship's box, and the whole frame;
//   compareAgree  the pack's end screen beside the scene, at a development phone size: the hero (its picture and the
//                 pack's fade, the title block left out), the ship's box in it, and the title block (the stamp and the
//                 words as drawn).
// Each also measures controls, the same capture moved 3 px (and, at full size, scaled 2 % about the ship's centre), in
// the ship's box and the title block, where the picture has its finest ink, so the record shows the measure would
// catch a scene drawn a little differently. The rest of the frame is mostly smooth space and the planet's shading,
// where a shifted capture hardly differs.

/** The ship's box on the poster, its exhaust and fin included: it rests at (844.8, 507.6), 133.9 px tall, tilted 9°. */
export const SHIP_BOX = Object.freeze({ x: 600, y: 420, w: 450, h: 160 });
const SHIP_CENTRE = Object.freeze([844.8, 507.6]);

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
/**
 * Mean absolute difference per channel (0–255) in a box, leaving out `skip` (a box inside it), and the share of
 * pixels that differ by more than 24 levels.
 */
function difference(a, b, width, box, skip = null) {
  let sum = 0, far = 0, n = 0;
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      if (skip && x >= skip.x && x < skip.x + skip.w && y >= skip.y && y < skip.y + skip.h) continue;
      const i = (y * width + x) * 4;
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      sum += d;
      if (d / 3 > 24) far += 1;
      n += 1;
    }
  }
  return { mean: n ? Math.round((sum / (n * 3)) * 100) / 100 : null, far: n ? Math.round((far / n) * 10000) / 10000 : null, pixels: n };
}
/** A picture of where two images differ, eight times as strong, with a box drawn on it, as the page's only content. */
function showDifference(p, s, W, H, box) {
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
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  document.body.replaceChildren(diff);
}

/** The still's hero (a capture of the component at 1920 × 1080, no fade, no words) against an approved poster. */
export async function compareFull({ poster, shot }) {
  const [P, S] = await Promise.all([image(poster), image(shot)]);
  const W = 1920, H = 1080, all = { x: 0, y: 0, w: W, h: H };
  const p = pixels(P, W, H), s = pixels(S, W, H);
  const shifted = pixels(S, W, H, { dx: 3 }), scaled = pixels(S, W, H, { scale: 1.02, about: SHIP_CENTRE });
  showDifference(p, s, W, H, SHIP_BOX);
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
 * The pack's end screen (`pack`) and the scene in the shell (`shot`), both captured at the same phone size (`width` ×
 * `height` CSS px) and pixel ratio `scale`. `hero` and `title` are the boxes the pack lays them in, in CSS px. The hero
 * is compared without the title block, which is compared on its own. Afterwards the page shows the pair side by side,
 * the pack on the left, for the review folder.
 */
export async function compareAgree({ pack, shot, scale, hero, title, width, height }) {
  const [P, S] = await Promise.all([image(pack), image(shot)]);
  const W = P.naturalWidth, H = P.naturalHeight;
  const px = box => {
    const x0 = Math.max(0, Math.floor(box.x * scale)), y0 = Math.max(0, Math.floor(box.y * scale));
    const x1 = Math.min(W, Math.ceil((box.x + box.w) * scale)), y1 = Math.min(H, Math.ceil((box.y + box.h) * scale));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  // The ship's box where the pack's cover puts the poster on this hero (background-size: cover, centred).
  const k = Math.max(hero.w / 1920, hero.h / 1080), ox = hero.x + (hero.w - 1920 * k) / 2, oy = hero.y + (hero.h - 1080 * k) / 2;
  const heroBox = px(hero), titleBox = px(title), shipBox = px({ x: ox + SHIP_BOX.x * k, y: oy + SHIP_BOX.y * k, w: SHIP_BOX.w * k, h: SHIP_BOX.h * k });
  const p = pixels(P, W, H), s = pixels(S, W, H), shifted = pixels(S, W, H, { dx: 3 * scale });
  const row = document.createElement('div');
  row.className = 'pv-row';
  for (const img of [P, S]) { Object.assign(img.style, { width: `${width}px`, height: `${height}px`, display: 'block' }); row.append(img); }
  document.body.replaceChildren(row);
  return {
    pack: { width: P.naturalWidth, height: P.naturalHeight },
    shot: { width: S.naturalWidth, height: S.naturalHeight },
    scale, boxes: { hero: heroBox, ship: shipBox, title: titleBox },
    hero: difference(p, s, W, heroBox, titleBox),
    ship: difference(p, s, W, shipBox),
    title: difference(p, s, W, titleBox),
    controls: { ship3px: difference(p, shifted, W, shipBox), title3px: difference(p, shifted, W, titleBox) },
  };
}
