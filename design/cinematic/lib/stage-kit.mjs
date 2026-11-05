// mothership:dev-only
//
// Small helpers the pilots' stages share: waiting two frames after a redraw, and a persistent
// library of scene pictures, so that a seek reuses decoded art (<use>) instead of reloading a
// picture per frame. Review-page code, never a client.

const SVGNS = 'http://www.w3.org/2000/svg';

/** Resolves after two animation frames: the redraw is on screen. */
export const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));

/**
 * pictures: [{ href, w, h }]. Returns { swap(markup), ready }: swap replaces each <image href=X .../>
 * of a known picture with a <use> of the library's copy; ready resolves once every picture decoded.
 */
export function pictureLibrary(root, pictures) {
  const ids = new Map(pictures.map(({ href }, i) => [href, `pic-${i}`]));
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>${pictures.map(({ href, w, h }) => `<image id="${ids.get(href)}" href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`).join('')}</defs>`;
  root.append(svg);
  const swap = markup => markup.replace(/<image href="([^"]+)"[^>]*\/>/g, (whole, href) => (ids.has(href) ? `<use href="#${ids.get(href)}"/>` : whole));
  const ready = Promise.all(pictures.map(({ href }) => { const img = new Image(); img.src = href; return img.decode().catch(() => {}); }));
  return { swap, ready, ids };
}
