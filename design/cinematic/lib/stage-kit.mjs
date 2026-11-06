// mothership:dev-only
//
// Small helpers the pilots' stages share: waiting two frames after a redraw, a persistent library
// of scene pictures, so that a seek reuses decoded art (<use>) instead of reloading a picture per
// frame, and the rooms' art holders a board treatment draws in. Review-page code, never a client.

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

/**
 * A board treatment's holders (design/cinematic/lib/visibility.mjs ART_LAYER_Z): one SVG in each
 * room's art layer (.v2-room .v2-art) of the board document `doc`, in the board's pixels (w x h),
 * at z-index 1: over the room's back picture, under everything else in the room (its scene layers,
 * figures, name tags, label and press areas) and under the bars. The room clips it. The caller puts a
 * copy of the frame's art in each, its ids scoped per room (lib/scene.mjs scopeIds()).
 */
export function artHolders(doc, w, h, { film = 'board-art' } = {}) {
  return [...doc.querySelectorAll('.v2-room .v2-art')].map(art => {
    const r = art.getBoundingClientRect();
    const svg = doc.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', String(w)); svg.setAttribute('height', String(h));
    Object.assign(svg.style, { position: 'absolute', left: `${-r.left}px`, top: `${-r.top}px`, zIndex: '1', pointerEvents: 'none' });
    svg.dataset.film = film;
    art.append(svg);
    return svg;
  });
}
