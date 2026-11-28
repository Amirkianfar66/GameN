// Room B test page v5, live: the room half of PV6-A, Mira's view in the straight-line camera (camera report v4). The back layer
// is the empty room (scene.json's plate: PV6-A-2, an AI-generated picture), shown as the 70° straight slice at 5° down; Vega's
// bench with its microscope, Lyra's console, Juno's laptop cart and her stool are the four layers lifted from PV6-A-3 (the
// records page's files), regrouped by occlude6.py by depth alone: each pixel is drawn after every person farther than it and
// before every person nearer, whatever their pose; Juno's stool stays behind Juno, who sits on it. The game's own Room B ambient
// (the room scene component's ambient.mjs and ambient.css, used read-only) runs in the skylight's glass on the ship's one clock,
// SKY_LEAD 12 s ahead of Room B's window; there is no window or screen in this view. Each person's slot is at the camera
// report's spot, filled by one call to the people module (mountRoomBPerson, the In-game animation builder's, drawn live in code):
// the figure, its shadow on the deck (under every piece), Juno's front (her hands and the laptop, just above her cart's band)
// and the boxes the checks use. Tags, press areas and the room's controls are HTML on top.
import { ambientLayer, settleAmbient } from './vendor/design/phone-ui/components/room-scene/ambient.mjs';
import { layoutTags } from './tag-layout.mjs';
import { mountRoomBPerson } from './people/room-b-people/mount.mjs';
const S = await (await fetch('scene.json')).json(), O = await (await fetch('occlusion.json')).json();
// who is in front of whom as this page draws it, measured by its capture (cover.json); the readout shows it when present
const COVER = await fetch('cover.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
// tokens 0.5.0 color.room.roomB (= FAMILIES['room-b'] in design/room-pilot/rooms.mjs)
export const TOK = Object.freeze({ deep: '#2A1446', shadow: '#4B2079', mid: '#7A3CAD', light: '#AE6CD3', pale: '#DCB6EE' });
const PHONES = Object.keys(S.phones);
// The moment held under reduced motion: 0 s into the ship's 240 s loop (timing.json: no passer is in the skylight then).
export const HELD_AT = 0;
// The skylight's lead on Room B's window, on the one clock: 12 s (the Lead, 18 November, for all five views).
export const SKY_LEAD = 12;
const state = { phone: 0, pct: 100, squares: true, motion: 'on', at: null, ahead: SKY_LEAD, depth: 'on', tags: 'feet', crew: true, bands: true, plate: null };
// ahead: the skylight's lead in s; depth 'off' draws every piece under the people ("Under the crew"); crew, bands and plate are
// for the checks only (the people hidden; the pieces hidden; another plate)
const stageEl = document.getElementById('stage'), world = document.getElementById('world'), ov = document.getElementById('overlay');
const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
const px = n => `${+(+n).toFixed(2)}px`;
const node = (tag, cls, style = {}, parent = world) => { const e = document.createElement(tag); if (cls) e.className = cls; Object.assign(e.style, style); parent.appendChild(e); return e; };

// ---- The picture: the painting's plate on the stage, so the stage shows the 70° straight slice at 5° down.
function picture(P) { const img = node('img', 'pic', { left: px(P.plate.left), top: px(P.plate.top), width: px(P.plate.width), height: px(P.plate.height) }); img.src = state.plate ?? S.plate; img.alt = ''; img.draggable = false; }
// ---- A band of the lifted pieces: a full-size layer of the plate's size, placed as the plate is, so their pixels line up.
function band(P, name) { const img = node('img', 'band', { left: px(P.plate.left), top: px(P.plate.top), width: px(P.plate.width), height: px(P.plate.height) }); img.src = `${name}.png`; img.alt = ''; img.draggable = false; img.dataset.band = name; }

// ---- The skylight: a box the size of the plate, masked by the skylight's mask (the plate's own black), holding one ambient
// layer with its view box cropped to the code window's glass, right-aligned to cover the skylight's visible box.
const MULLIONS = /^M[\d.]+ 128 V252 M[\d.]+ 128 V252$/;
export function skylight(P) {
  const holder = node('div', 'opening skylight', { left: px(P.plate.left), top: px(P.plate.top), width: px(P.plate.width), height: px(P.plate.height),
    maskImage: 'url(mask-skylight.png)', webkitMaskImage: 'url(mask-skylight.png)', maskSize: '100% 100%', webkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat' });
  const svg = ambientLayer('room-b', { tx: 0, ty: 0, k: 1 }), place = P.openings.skylightVisible;
  svg.setAttribute('viewBox', S.source.glass.join(' ')); svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice');
  Object.assign(svg.style, { left: px(place.x - P.plate.left), top: px(place.y - P.plate.top), width: px(place.w), height: px(place.h), zIndex: 'auto', overflow: 'hidden' });
  // the whole glass, sky only: its copy loses the cream world's group (and with it the world's glow, rim and shadow), the code
  // window's mullions, bands and light cones; nothing else is changed
  for (const g of svg.querySelectorAll('g[class$="-home"]')) g.remove();
  for (const p of svg.querySelectorAll('path')) if (MULLIONS.test(p.getAttribute('d') ?? '')) p.remove();
  for (const r of svg.querySelectorAll('rect[fill="none"]')) r.remove();
  for (const g of svg.querySelectorAll('g[clip-path]')) if (/-frame\d+\)$/.test(g.getAttribute('clip-path'))) g.remove();
  holder.appendChild(svg); holder.dataset.opening = 'skylight'; return svg;
}

// ---- A person's slot. figureFor(p) gives what fills it, in stage px: { body, shadow, front, face, placeholder }. The body is
// drawn at the person's place in the depth order, the shadow under every piece, the front (if any) just above their own
// station's band, and face is the box the face and tag checks keep clear. Each part is mounted in its own full-stage holder
// marked with the person's id and the part, so the order and the checks never depend on how a figure is drawn.
// A stand-in leaves nothing on the deck: every shadow on the deck is the people module's own (its shadow layer: contact, cast
// and seat shadows), so the page draws none of its own.
function placeholderFigure(p) {
  const r = p.rect, body = document.createElement('img'), k = 0.85 * p.headR;
  body.className = 'shape'; body.src = p.png; body.alt = ''; body.draggable = false;
  Object.assign(body.style, { position: 'absolute', left: px(r.left), top: px(r.top), width: px(r.size), height: px(r.size), maxWidth: 'none', transform: r.flip ? 'scaleX(-1)' : '' });
  return { body, shadow: null, front: null, face: { x0: p.head[0] - k, y0: p.head[1] - k, x1: p.head[0] + k, y1: p.head[1] + k }, placeholder: true };
}
// The people: one call per slot, by the person's crew id, the feet's point and the scale; each comes in their own facing, so a
// slot never mirrors them. Their boxes are measured from the drawing (the module's measured.mjs); Lyra shows no face (seen
// from behind), so her head is what the face checks keep clear.
let HANDLES = {};
const boxOf = a => (a ? { x0: a[0], y0: a[1], x1: a[2], y1: a[3] } : null);
function peopleFigure(p) {
  const h = mountRoomBPerson({ id: p.crew, feet: p.feet, unit: p.u }), b = h.boxes(); HANDLES[p.id] = h;
  return { body: h.figure, shadow: h.shadow, front: h.front, face: boxOf(b.face) ?? boxOf(b.head), faceShows: !!b.face, head: boxOf(b.head), figure: boxOf(b.figure), feet: b.feet, placeholder: false, handle: h };
}
export let figureFor = peopleFigure;
export function useFigures(fn) { figureFor = fn; build(); }   // the figures' module plugs in here, one call per person
function mount(P, id, kind, el) {
  const holder = node('div', `part ${kind}`, { left: 0, top: 0, width: px(P.W), height: px(P.SH), pointerEvents: 'none' }); holder.dataset.id = id; holder.dataset.part = kind; holder.appendChild(el); return holder;
}

// ---- Build the room for the current phone: the picture, the skylight, then the pieces and the people far to near.
export function build() {
  const P = S.phones[PHONES[state.phone]];
  stageEl.style.width = px(P.W); stageEl.style.height = px(P.SH); world.innerHTML = '';
  picture(P); skylight(P);
  const bandsIn = O.order.filter(x => x.startsWith('band-'));
  for (const h of Object.values(HANDLES)) h.dispose(); HANDLES = {};
  FIG = Object.fromEntries(P.people.map(p => [p.id, figureFor(p, P)]));
  ORDER = O.order.filter(x => !x.endsWith(' front') || FIG[x.split(' ')[0]].front);   // a front only where the figure has one
  if (state.crew) for (const p of P.people) if (FIG[p.id].shadow) mount(P, p.id, 'shadow', FIG[p.id].shadow);   // every floor shadow under every piece
  if (state.depth === 'off' && state.bands) bandsIn.forEach(b => band(P, b));   // "Under the crew": every piece under the people
  for (const item of ORDER) {
    if (item.startsWith('band-')) { if (state.depth !== 'off' && state.bands) band(P, item); continue; }
    const [id, kind] = item.split(' ');
    if (state.crew) mount(P, id, kind === 'front' ? 'front' : 'body', kind === 'front' ? FIG[id].front : FIG[id].body);
  }
  const held = state.motion !== 'on' || state.at != null;
  stageEl.dataset.motion = held ? 'reduced' : 'full';
  if (held) settleAmbient(world, { at: state.at ?? HELD_AT }); else settleAmbient(world, { live: true });   // one sky: the ship's one clock
  // the people: held in their pose (0 ms) when the room is held, else live (they also hold themselves under data-motion="reduced")
  for (const f of Object.values(FIG)) if (f.handle) { if (held) f.handle.hold(); else f.handle.play(); }
  // the skylight's lead: its layer runs that many seconds ahead of Room B's window on the same clock
  if (state.ahead) for (const a of world.querySelector('[data-opening="skylight"] svg').getAnimations({ subtree: true })) a.currentTime += state.ahead * 1000;
  overlay(P);
}
let FIG = {}, ORDER = [];

// ---- The overlay: the room's label, "You", the out-of-view chip, the Board chip and the Windows control; tags and press areas.
const box2 = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const rectOf = e => { const r = e.getBoundingClientRect(), s = stageEl.getBoundingClientRect(), k = stageEl.offsetWidth / s.width; return { x0: (r.left - s.left) * k, y0: (r.top - s.top) * k, x1: (r.right - s.left) * k, y1: (r.bottom - s.top) * k }; };
const MEAS = { last: null };
function el(cls, html) { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; ov.appendChild(e); return e; }
function overlay(P) {
  ov.innerHTML = ''; ov.style.setProperty('--k', state.pct / 100);
  const ooc = S.phones[PHONES[state.phone]].byPct[state.pct].chip;
  const label = el('label', 'ROOM B'), you = el('you', 'You: 1 Mira'), chip = el('chip', 'Other rooms on the Board'), ctl = el('control', 'Windows · 2');
  const out = el('tag ooc', `<span class="n">${ooc.num}</span><span class="t">${ooc.name} · out of view</span>`);
  const yr = rectOf(you); out.style.left = 'auto'; out.style.right = '6px'; out.style.top = px(yr.y1 + 10);
  const or = rectOf(out), oPress = { x0: or.x0, x1: or.x1, y0: (or.y0 + or.y1) / 2 - Math.max(44, or.y1 - or.y0) / 2, y1: (or.y0 + or.y1) / 2 + Math.max(44, or.y1 - or.y0) / 2 };
  const chrome = [['label', rectOf(label)], ['You', yr], ['Board chip', rectOf(chip)], ['Windows control', rectOf(ctl)], ['out-of-view chip', oPress]];
  const figs = P.people, faces = figs.map(fg => FIG[fg.id].face);
  // Press areas (the Lead, 18 November, for the drawn people): each person's drawn figure's box, on the stage, trimmed clear of
  // the room's controls (cutting the side that keeps the most of it), at least 44 x 44. A slot with no measured figure keeps its
  // square from the camera report.
  const slotSquare = fg => ({ x0: fg.press[0] - fg.side / 2, x1: fg.press[0] + fg.side / 2, y0: fg.press[1] - fg.side / 2, y1: fg.press[1] + fg.side / 2 });
  const area = b => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  function trimClear(b, obstacles) {
    let out = { ...b };
    for (const o of obstacles) {
      if (!box2(out, o)) continue;
      const cuts = [{ ...out, x1: o.x0 }, { ...out, x0: o.x1 }, { ...out, y1: o.y0 }, { ...out, y0: o.y1 }].filter(c => c.x1 - c.x0 >= 44 && c.y1 - c.y0 >= 44);
      if (cuts.length) out = cuts.reduce((m, c) => (area(c) > area(m) ? c : m));
    }
    return out;
  }
  const squares = figs.map(fg => { const f = FIG[fg.id].figure; if (!f) return { id: fg.id, ...slotSquare(fg) };
    const onStage = { x0: Math.max(0, f.x0), y0: Math.max(0, f.y0), x1: Math.min(P.W, f.x1), y1: Math.min(P.SH, f.y1) };
    return { id: fg.id, ...trimClear(onStage, chrome.map(([, b]) => b)) }; });
  // Tags: at the feet (the default): each on the deck just below the person's drawn feet, centred on them; or at the pack's place,
  // where the pack's rule put them on v5: at the foot of the slot's press square. Either way the pack's tag rules lay them out:
  // whole and apart, inside the stage, clear of every face and of the room's controls.
  const tagAt = fg => { const f = FIG[fg.id];
    if (state.tags === 'pack' || !f.figure) { const q = slotSquare(fg); return { x: fg.press[0], bottom: q.y1 }; }
    return { x: f.feet[0], bottom: f.figure.y1 + 3 + 2 }; };   // the tag's top 3 px below the soles (the layout lifts it by 2)
  const tagEls = figs.map(fg => el('tag', `<span class="n">${fg.num}</span><span class="t">${fg.name}</span>`));
  const tagsIn = figs.map((fg, i) => { const r = rectOf(tagEls[i]); return { seat: fg.id, at: tagAt(fg), width: r.x1 - r.x0, height: r.y1 - r.y0, self: false }; });
  // at the feet the tags also keep clear of the drawn figures, so where two would meet one moves along the deck, not over a person
  const figureBoxes = state.tags === 'pack' ? [] : figs.map(fg => FIG[fg.id].figure).filter(Boolean);
  const laid = layoutTags({ panel: { width: P.W, height: P.SH }, pad: 4, gap: 2, lift: 2, footClear: 34, keepClear: [...chrome.map(([, b]) => b), ...faces, ...figureBoxes].map(b => ({ left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 })), tags: tagsIn });
  const tags = laid.places.map(pl => { const i = figs.findIndex(f => f.id === pl.seat), t = tagsIn[i]; tagEls[i].style.left = px(pl.left); tagEls[i].style.top = px(pl.top); return { id: pl.seat, x0: pl.left, x1: pl.left + t.width, y0: pl.top, y1: pl.top + t.height }; });
  if (state.squares) for (const q of [...squares, { id: 'ooc', ...oPress }]) { const s = el('press', ''); Object.assign(s.style, { left: px(q.x0), top: px(q.y0), width: px(q.x1 - q.x0), height: px(q.y1 - q.y0) }); s.onclick = () => s.classList.toggle('on'); }
  // what the tags touch, for the report: a face, another person's press area, the bottom chips (the Board chip, the Windows control)
  const bottom = chrome.filter(([nm]) => nm === 'Board chip' || nm === 'Windows control');
  const tagTouch = Object.fromEntries(tags.map(t => { const me = figs.find(f => f.id === t.id);
    return [t.id, { name: me.name, faces: figs.filter(o => box2(t, FIG[o.id].face)).map(o => o.name), otherPress: squares.filter(q => q.id !== t.id && box2(t, q)).map(q => figs.find(f => f.id === q.id).name), bottomChips: bottom.filter(([, b]) => box2(t, b)).map(([nm]) => nm) }]; }));
  const issues = [], per = {};
  for (const fg of figs) {
    const sq = squares.find(q => q.id === fg.id), tag = tags.find(t => t.id === fg.id);
    const fb = FIG[fg.id].figure ?? { x0: fg.box[0], y0: fg.box[1], x1: fg.box[2], y1: fg.box[3] };
    const c = per[fg.id] = { name: fg.name, heightPx: Math.round(fb.y1 - fb.y0), placeholder: !!FIG[fg.id].placeholder, face: FIG[fg.id].face, faceShows: FIG[fg.id].faceShows ?? true, figure: fb, front: !!FIG[fg.id].front, press: fg.side, whole: fb.x0 >= 0 && fb.x1 <= P.W && fb.y0 >= 0 && fb.y1 <= P.SH, pressInside: sq.x0 >= 0 && sq.x1 <= P.W && sq.y0 >= 0 && sq.y1 <= P.SH, tagged: !!tag };
    c.pressBox = sq; c.press = Math.round(Math.min(sq.x1 - sq.x0, sq.y1 - sq.y0));
    if (!c.whole) issues.push(`${fg.name} cut off`); if (!c.tagged) issues.push(`${fg.name} has no tag`); if (c.press < 44) issues.push(`${fg.name}'s press area under 44 px`); if (!c.pressInside) issues.push(`${fg.name}'s press area not whole`);
    const face = FIG[fg.id].face;
    for (const [nm, b] of chrome) { if (box2(sq, b)) issues.push(`${fg.name}'s press area under the ${nm}`); if (box2(b, face)) issues.push(`${fg.name}'s face under the ${nm}`); }
    if (tag) for (const o of figs) if (box2(tag, FIG[o.id].face)) issues.push(`${fg.name}'s tag on ${o.name}'s face`);
    if (tag && box2(tag, oPress)) issues.push(`${fg.name}'s tag on the out-of-view chip`);
    if (tag && (tag.x0 < 0 || tag.y0 < 0 || tag.x1 > P.W || tag.y1 > P.SH)) issues.push(`${fg.name}'s tag past the stage`);
  }
  for (let i = 0; i < figs.length; i += 1) for (let j = i + 1; j < figs.length; j += 1) { const a = figs[i], b = figs[j], fa = FIG[a.id].face, fb = FIG[b.id].face; if (box2({ x0: fa.x0 - 2, y0: fa.y0 - 2, x1: fa.x1 + 2, y1: fa.y1 + 2 }, { x0: fb.x0 - 2, y0: fb.y0 - 2, x1: fb.x1 + 2, y1: fb.y1 + 2 })) issues.push(`faces ${a.name}/${b.name} touch`); if (box2(squares[i], squares[j])) issues.push(`press ${a.name}/${b.name} overlap`); }
  if (!laid.inside) issues.push('a tag does not fit inside'); if (!laid.apart) issues.push('tags touch');
  for (const [nm, b] of chrome) if (b.x0 < 0 || b.y0 < 0 || b.x1 > P.W || b.y1 > P.SH) issues.push(`the ${nm} past the stage`);
  // the edge: the strict rule (every drawing whole on the stage)
  const edge = figs.map(fg => { const b = per[fg.id].figure, w = b.x1 - b.x0, over = Math.max(0, -b.x0) + Math.max(0, b.x1 - P.W); return { name: fg.name, pastPx: +over.toFixed(1), pct: +((100 * over) / w).toFixed(1) }; }).filter(e => e.pastPx > 0);
  const cov = COVER?.[PHONES[state.phone]] ?? {};   // as rendered, held at 0 s, 100% text (the capture's measure)
  const occlusion = Object.fromEntries(figs.map(fg => { const r = cov[fg.id]; return [fg.id, { name: fg.name, hiddenShare: state.depth === 'off' || !r ? 0 : r.hiddenShare, boxShare: state.depth === 'off' || !r ? 0 : r.boxShare, measured: !!r }]; }));
  const layers = [...world.children].map(e => e.dataset.band ?? (e.dataset.part === 'body' ? e.dataset.id : e.dataset.part === 'front' ? `${e.dataset.id} front` : null)).filter(Boolean);
  MEAS.last = { phone: PHONES[state.phone], pct: state.pct, tagsAt: state.tags, tagTouch, per, issues, edge, tags, squares, ooc: oPress, chrome: Object.fromEntries(chrome), held: stageEl.dataset.motion === 'reduced', at: state.at ?? (state.motion === 'on' ? null : HELD_AT), ahead: state.ahead, depth: state.depth, occlusion, layers };
  document.dispatchEvent(new CustomEvent('measured', { detail: MEAS.last }));
}
export const measure = () => MEAS.last;
export function setView(patch) { Object.assign(state, patch); build(); return MEAS.last; }
export const getState = () => ({ ...state });
// for the checks: every person at one moment of their own motion (ms; 0 is the held pose), and back to the room's state
export function peopleAt(t) { for (const f of Object.values(FIG)) f.handle?.at(t); return Object.fromEntries(Object.entries(FIG).map(([id, f]) => [id, f.handle ? f.handle.boxes() : null])); }
window.roomB = { setView, measure, getState, build, useFigures, peopleAt, HELD_AT, SKY_LEAD, get order() { return ORDER; } };
build();
