// mothership:dev-only
//
// The stamp beside the pack's own frame. design/tools/round-stamp-check.mjs captures the pinned pack's "Round 1
// begins" frame as the pack's prototype draws it (design/phone-ui/prototype/index.html?s=room&room=room-a&stamp=round1,
// served unchanged) and the phone with the component standing, and saves both captures next to the bundle. This
// reads the two into canvases, lays them side by side for the review picture, and measures how far apart the
// stamp's face is in them, in 0–255 levels per colour channel.
//   The face: the largest upright rectangle that lies inside the tilted stamp, clear of its border. It holds the
//   stamp's gold and most of its letters, and nothing of the room behind.
//   Controls: the component's capture moved one CSS pixel right and down, and drawn 3 % larger about the stamp's
//   centre, measured the same way, so the record shows the measure would catch a stamp drawn a little differently.
// The room behind the stamp is not compared: the pack's frame draws its own room, and the room scene has its own
// check.

async function image(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
/** A capture's pixels, drawn as it is, or moved by (dx, dy) and scaled about `about`, in the capture's own pixels. */
function pixels(img, { dx = 0, dy = 0, scale = 1, about = [0, 0] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.translate(about[0] + dx, about[1] + dy);
  ctx.scale(scale, scale);
  ctx.translate(-about[0], -about[1]);
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}
/** In a box: the mean absolute difference per channel (0–255), the largest, and the share of pixels more than 24 levels apart. */
function difference(a, b, width, box) {
  let sum = 0, far = 0, most = 0, n = 0;
  for (let y = box.y; y < box.y + box.h; y += 1) {
    for (let x = box.x; x < box.x + box.w; x += 1) {
      const i = (y * width + x) * 4;
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      sum += d;
      most = Math.max(most, Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d / 3 > 24) far += 1;
      n += 1;
    }
  }
  return { mean: n ? Math.round((sum / (n * 3)) * 100) / 100 : null, max: most, far: n ? Math.round((far / n) * 10000) / 10000 : null, pixels: n };
}

/**
 * `pack` and `shot`: the two captures' file names beside the bundle, each `width` × `height` CSS px at `scale` pixels
 * a CSS px. `face`: the rectangle compared, and `around`: the stamp's surroundings shown enlarged, both in CSS px of
 * the phone. Draws the review picture as the page's content and returns the measures.
 */
export async function compareWithPack({ pack, shot, scale, width, height, face, around, centre, labels }) {
  const [theirs, ours] = await Promise.all([image(pack), image(shot)]);
  if (theirs.naturalWidth !== ours.naturalWidth || theirs.naturalHeight !== ours.naturalHeight) throw new Error('The two captures are not the same size');
  const W = theirs.naturalWidth;
  const px = box => ({ x: Math.ceil(box.x * scale), y: Math.ceil(box.y * scale), w: Math.floor((box.x + box.w) * scale) - Math.ceil(box.x * scale), h: Math.floor((box.y + box.h) * scale) - Math.ceil(box.y * scale) });
  const box = px(face), mid = [centre.x * scale, centre.y * scale];
  const a = pixels(theirs), b = pixels(ours);
  const result = {
    box: face, boxPixels: box,
    face: difference(a, b, W, box),
    controls: {
      moved1px: difference(a, pixels(ours, { dx: scale, dy: scale }), W, box),
      larger3percent: difference(a, pixels(ours, { scale: 1.03, about: mid }), W, box),
    },
  };

  // The review picture: the two phones, and under them the stamp's surroundings enlarged with their difference.
  const page = document.createElement('div');
  page.className = 'pv-agree';
  const cell = (caption, node) => { const f = document.createElement('figure'); f.className = 'pv-cell'; const c = document.createElement('figcaption'); c.textContent = caption; f.append(c, node); return f; };
  const phone = img => { const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; Object.assign(canvas.style, { width: `${width}px`, height: `${height}px` }); canvas.getContext('2d').drawImage(img, 0, 0); return canvas; };
  // The crops are shown one capture pixel to one CSS pixel: the page is captured at one pixel a point, so they are kept pixel for pixel.
  const near = px(around);
  const crop = draw => { const canvas = document.createElement('canvas'); canvas.width = near.w; canvas.height = near.h; Object.assign(canvas.style, { width: `${near.w}px`, height: `${near.h}px` }); draw(canvas.getContext('2d')); return canvas; };
  const cropOf = img => crop(ctx => ctx.drawImage(img, near.x, near.y, near.w, near.h, 0, 0, near.w, near.h));
  const diff = crop(ctx => {
    const out = ctx.createImageData(near.w, near.h);
    for (let y = 0; y < near.h; y += 1) for (let x = 0; x < near.w; x += 1) {
      const i = ((near.y + y) * W + near.x + x) * 4, o = (y * near.w + x) * 4;
      for (let c = 0; c < 3; c += 1) out.data[o + c] = Math.min(255, Math.abs(a[i + c] - b[i + c]) * 8);
      out.data[o + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    // The face that is measured.
    ctx.strokeStyle = '#F1B84B'; ctx.lineWidth = 2;
    ctx.strokeRect(box.x - near.x + 1, box.y - near.y + 1, box.w - 2, box.h - 2);
  });
  const phones = document.createElement('div');
  phones.className = 'pv-grid';
  phones.append(cell(labels.pack, phone(theirs)), cell(labels.shot, phone(ours)));
  const crops = document.createElement('div');
  crops.className = 'pv-grid';
  crops.append(cell(`The pack’s stamp, ${scale} times its size`, cropOf(theirs)), cell(`The component’s stamp, ${scale} times its size`, cropOf(ours)), cell('Where they differ, eight times as strong; the box is the face that is measured', diff));
  page.append(phones, crops);
  document.body.replaceChildren(page);
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  const size = page.getBoundingClientRect();
  return { ...result, picture: { width: Math.ceil(size.right), height: Math.ceil(size.bottom) } };
}
