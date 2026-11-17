// The new world's ink: a hand-inked graphic-novel finish for SVG drawn once into pictures (the owner, 16 November
// 2026: "convincing three-dimensional depth and a hand-inked graphic-novel finish ... strong silhouettes, expressive
// outlines, textured shadows, and worn materials"). Every shape is a flat fill, a shadow cut in on the side away
// from the scene's light with hatching in it, and a brushed ink line whose weight swells and thins; a plane is then
// roughened (the line's tremble) and worn (scratches and grime) by filters, at the time it is drawn, never in play.

const f = v => Number((+v).toFixed(2));
export { f };

/** A seeded random, 0..1. */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** The shared definitions: hatching at three angles, cross-hatching, and the plane filters. `id` prefixes them. */
export function inkDefs(id, { ink = '#07090E' } = {}) {
  const hatch = (name, angle, gap, w, op) => `<pattern id="${id}-${name}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><path d="M0 0V${gap}" stroke="${ink}" stroke-width="${w}" opacity="${op}"/></pattern>`;
  return hatch('h1', 38, 3.2, 0.9, 0.55) + hatch('h2', -42, 3.6, 0.8, 0.45) + hatch('h3', 82, 2.6, 0.7, 0.4) + hatch('hl', 38, 2.4, 0.5, 0.7)
    // The line's tremble: a little displacement by noise, the ink's edge never ruler-straight.
    + `<filter id="${id}-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>`
    // Wear: grime in the hollows and pale scratches on the surfaces, cut to what is drawn.
    + `<filter id="${id}-wear" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`
    + '<feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="3" seed="11" result="g"/>'
    + '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 1.7 -0.72" result="grime"/>'
    + '<feComposite in="grime" in2="SourceAlpha" operator="in" result="grimeIn"/>'
    + '<feTurbulence type="turbulence" baseFrequency="0.9 0.06" numOctaves="1" seed="5" result="s"/>'
    + '<feColorMatrix in="s" type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.76  0 0 0 0 0.7  0 0 0 9 -4.6" result="scr"/>'
    + '<feComposite in="scr" in2="SourceAlpha" operator="in" result="scrIn"/>'
    + '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="grimeIn"/><feMergeNode in="scrIn"/></feMerge></filter>'
    // Depth: a plane far from the lens, softened and sunk into the air's colour.
    + `<filter id="${id}-far" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.1"/></filter>`;
}

/**
 * An inked shape: `d` its path, `fill` its colour. `shade` [dx, dy] cuts a shadow into it on that side (the light is
 * opposite), filled darker and hatched; `w` the ink's weight; `lit` a thin edge of light on the lit side.
 */
export function shape(id, d, fill, { shade = null, dark = null, w = 2.2, hatch = 'h1', lit = null, ink = '#07090E', opacity = null } = {}) {
  shape.n = (shape.n ?? 0) + 1;
  const cid = `${id}-c${shape.n}`;
  const op = opacity == null ? '' : ` opacity="${opacity}"`;
  let defs = `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
  let out = `<path d="${d}" fill="${fill}"${op}/>`;
  if (shade) {
    const [dx, dy] = shade, away = `translate(${f(-dx)} ${f(-dy)})`;
    // The shadow side: the shape in its dark, the lit shape moved toward the light over it, hatching in what is left.
    defs += `<mask id="${cid}-m" maskUnits="userSpaceOnUse" x="-4000" y="-4000" width="8000" height="8000"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="${away}"/></mask>`;
    out += `<g clip-path="url(#${cid})"><path d="${d}" fill="${dark ?? shadeOf(fill, 0.55)}"/><path d="${d}" fill="${fill}" transform="${away}"/></g>`
      + `<path d="${d}" fill="url(#${id}-${hatch})" mask="url(#${cid}-m)"/>`;
  }
  if (lit) out += `<g clip-path="url(#${cid})"><path d="${d}" fill="none" stroke="${lit.color}" stroke-width="${f(lit.w ?? 2)}" transform="translate(${f(lit.dx ?? 0)} ${f(lit.dy ?? 0)})" opacity="${lit.o ?? 0.8}"/></g>`;
  if (w > 0) out += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${f(w)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return `<defs>${defs}</defs>${out}`;
}

/** A colour darkened toward ink (k 0..1 kept). */
export function shadeOf(hex, k = 0.5) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * k + 8 * (1 - k)));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
/** A colour lifted toward a light (k 0..1 of the way). */
export function tintOf(hex, light = '#FFFFFF', k = 0.3) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(light.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A rectangle's path, with corners cut (`cut`) as plating is. */
export const plate = (x, y, w, h, cut = 0) => (cut
  ? `M${f(x + cut)} ${f(y)}H${f(x + w - cut)}L${f(x + w)} ${f(y + cut)}V${f(y + h - cut)}L${f(x + w - cut)} ${f(y + h)}H${f(x + cut)}L${f(x)} ${f(y + h - cut)}V${f(y + cut)}Z`
  : `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`);
export const rect = (x, y, w, h) => plate(x, y, w, h, 0);
export const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
export const ellipse = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;

/** Rivets along a line. */
export function rivets(x0, y0, x1, y1, n, { r = 1.6, ink = '#07090E', lit = '#8E9BB0' } = {}) {
  let out = '';
  for (let i = 0; i < n; i += 1) {
    const k = n === 1 ? 0.5 : i / (n - 1), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${ink}"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.45)}" fill="${lit}"/>`;
  }
  return out;
}

/**
 * A pipe from point to point (straight runs joined at right angles by `points`), with its round shading: a dark
 * underside, a lit top line, flanges at each joint and `bands` along it.
 */
export function pipe(points, r, color, { ink = '#07090E', light = '#9FB0C6', flanges = true, lightSide = -1 } = {}) {
  const d = `M${points.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}`;
  let out = `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${f(r * 2 + 3)}" stroke-linejoin="round" stroke-linecap="butt"/>`
    + `<path d="${d}" fill="none" stroke="${shadeOf(color, 0.55)}" stroke-width="${f(r * 2)}" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(r * 1.2)}" stroke-linejoin="round" transform="translate(${f(lightSide * r * 0.25)} ${f(lightSide * r * 0.25)})"/>`
    + `<path d="${d}" fill="none" stroke="${light}" stroke-width="${f(Math.max(0.6, r * 0.28))}" stroke-linejoin="round" opacity="0.7" transform="translate(${f(lightSide * r * 0.5)} ${f(lightSide * r * 0.5)})"/>`;
  if (flanges) {
    for (const [x, y] of points.slice(1, -1).concat(points.length === 2 ? [[(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2]] : [])) {
      out += `<rect x="${f(x - r * 1.45)}" y="${f(y - r * 1.45)}" width="${f(r * 2.9)}" height="${f(r * 2.9)}" rx="${f(r * 0.4)}" fill="${shadeOf(color, 0.8)}" stroke="${ink}" stroke-width="1.6"/>`;
    }
  }
  return out;
}

/** A cable hanging between two points: a catenary sagging by `sag`, its weight `w`. */
export function cable([x0, y0], [x1, y1], sag, { w = 2.4, color = '#11141B', ink = '#07090E', lit = null } = {}) {
  const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + sag;
  const d = `M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my * 2 - (y0 + y1) / 2)} ${f(x1)} ${f(y1)}`;
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round"/>`
    + (lit ? `<path d="${d}" fill="none" stroke="${lit}" stroke-width="${f(Math.max(0.5, w * 0.25))}" stroke-linecap="round" opacity="0.6" transform="translate(0 ${f(-w * 0.25)})"/>` : '');
}

/** A soft radial glow (light added to the air), as SVG. */
export function glowSvg(id, cx, cy, r, color, opacity = 0.8) {
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.35" stop-color="${color}" stop-opacity="${f(opacity * 0.4)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id})" style="mix-blend-mode:screen"/>`;
}
