// mothership:dev-only
//
// The Food component's picture comparisons, for design/tools/food-component-check.mjs. The check captures the
// component under the production headers and saves, next to the bundle, what it is compared with: the approved
// package's own page for the same part (design/food-supply/phone.html, served unchanged) and Frontend's native
// captures from #290. This page reads two pictures into canvases and measures how far apart they are, box by box, in
// 0–255 levels per colour channel: the mean difference, the largest, how many pixels differ at all, and the share of
// pixels more than 24 levels apart. For each box it also measures a control, the second picture moved 3 px sideways, so that the record shows
// what a drawing a little out of place would measure there. Afterwards the page can show the pictures side by side,
// for the review folder.

import './preview.css';

async function image(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
function pixels(img, width, height, dx = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#10141C';
  context.fillRect(0, 0, width, height);
  context.drawImage(img, dx, 0);
  return context.getImageData(0, 0, width, height).data;
}
/** How far apart two pictures are in a box, leaving out the boxes in `skip`. */
function difference(a, b, width, box, skip = []) {
  let sum = 0, far = 0, max = 0, differing = 0, n = 0;
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      if (skip.some(s => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h)) continue;
      const i = (y * width + x) * 4, r = Math.abs(a[i] - b[i]), g = Math.abs(a[i + 1] - b[i + 1]), bl = Math.abs(a[i + 2] - b[i + 2]), d = r + g + bl;
      sum += d;
      if (d > 0) differing += 1;
      if (d / 3 > 24) far += 1;
      if (r > max) max = r;
      if (g > max) max = g;
      if (bl > max) max = bl;
      n += 1;
    }
  }
  return { mean: n ? Math.round((sum / (n * 3)) * 100) / 100 : null, far: n ? Math.round((far / n) * 10000) / 10000 : null, max: n ? max : null, differing: n ? differing : null, pixels: n };
}

/**
 * `a` and `b` are two pictures of the same size. `boxes` names the places to measure, each { box, skip }: a box and
 * the boxes inside it to leave out, in CSS px ([x, y, width, height]) at `scale` device pixels each. With `labels`,
 * the page then shows the pictures (and any `extra` ones) side by side, each over its label.
 */
async function compare({ a, b, boxes, scale = 1, labels = null, extra = [] }) {
  const [A, B, ...more] = await Promise.all([image(a), image(b), ...extra.map(image)]);
  const W = A.naturalWidth, H = A.naturalHeight, sameSize = B.naturalWidth === W && B.naturalHeight === H;
  const pa = pixels(A, W, H), pb = pixels(B, W, H), moved = pixels(B, W, H, 3 * scale);
  const px = ([x, y, w, h]) => {
    const x0 = Math.max(0, Math.floor(x * scale)), y0 = Math.max(0, Math.floor(y * scale)), x1 = Math.min(W, Math.ceil((x + w) * scale)), y1 = Math.min(H, Math.ceil((y + h) * scale));
    return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  };
  const measured = {};
  for (const [name, { box, skip = [] }] of Object.entries(boxes)) {
    const area = px(box), left = skip.map(px);
    measured[name] = { box: area, skipped: left, ...difference(pa, pb, W, area, left), moved3px: difference(pa, moved, W, area, left) };
  }
  if (labels) {
    document.body.dataset.single = '';
    const row = document.createElement('div');
    row.className = 'preview-row';
    [A, B, ...more].forEach((img, index) => {
      const figure = document.createElement('figure'), caption = document.createElement('figcaption');
      Object.assign(img.style, { width: `${img.naturalWidth / scale}px`, height: `${img.naturalHeight / scale}px`, display: 'block' });
      caption.textContent = labels[index] ?? '';
      figure.append(img, caption);
      row.append(figure);
    });
    document.body.replaceChildren(row);
  }
  return { a: { width: W, height: H }, b: { width: B.naturalWidth, height: B.naturalHeight }, sameSize, scale, boxes: measured };
}

window.__compare = { compare };
