// mothership:dev-only
//
// The bars and icons control: one page for the owner's review of every bar and every icon, on a phone.
//   Bars     first, the Card tab's before and after (the owner's 18 November 2026 change): sheet 08's nine states,
//            each drawn by the shell as it was (the component at an earlier commit, which the build gives the page)
//            and as it is now. Then, in sub-parts: the top bar, the bottom bar, the other bars (what lies over the room), the sheets and
//            the whole phone. Each state is a true-size strip of the phone, drawn by the runtime component itself
//            (../components/phone-shell), with its size, and each part's size, background, border, corners, text
//            and icon read from the live component (specs.mjs)
//   Test     the whole phone, live: the shell fills the screen, with the room scene in its room area, and a
//            control for every switch (states.mjs)
//   Icons    in sub-parts, by what an icon is for: every icon of the one source (../components/icons.mjs), in
//            both forms, with where the bars draw it, at what size, in what colour and on what ground; and the
//            game's own icons that are still drawn differently (apps/game/hosted/planet/phone-controls.mjs)
//   Status   what the page is built from, and the owner's marks
// The owner marks a state or an icon OK or Change, with a note; the marks are kept in the page's store, which
// the Designer team reads. Nothing here is the game: synthetic fixtures, no match, no rule. It is published
// as a private test page by design/tools/bars-icons-control.mjs, which bundles it and gives it the art.

import '../components/phone-shell/phone-shell.css';
import '../components/room-scene/room-scene.css';
import './control.css';
import { PHONE_SHELL_VERSION, mountPhoneShell } from '../components/phone-shell/phone-shell.mjs';
// The shell as it was before the Card tab's change: the same file at an earlier commit, which the build tool
// serves for this query (design/tools/bars-icons-control.mjs). Without that tool it is today's shell again,
// and the page says the before is missing rather than show the new bar twice.
import { PHONE_SHELL_VERSION as BEFORE_VERSION, mountPhoneShell as mountShellBefore } from '../components/phone-shell/phone-shell.mjs?before';
// And the shell as it is before the toast's draft: the same file at the commit the build names for it.
import { mountPhoneShell as mountShellBeforeToast } from '../components/phone-shell/phone-shell.mjs?before-toast';
// The two sheet drafts, each alone and both together: the same file at the three commits the build names for them.
import { mountPhoneShell as mountShellDraftFoot } from '../components/phone-shell/phone-shell.mjs?draft-foot';
import { mountPhoneShell as mountShellDraftHead } from '../components/phone-shell/phone-shell.mjs?draft-head';
import { mountPhoneShell as mountShellDraftSheet } from '../components/phone-shell/phone-shell.mjs?draft-sheet';
import { COMPONENT_KIT_VERSION } from '../components/kit/kit.mjs';
import { ICONS, ICON_FAMILY_VERSION, ICON_NAMES, iconSvg } from '../components/icons.mjs';
import { iconPaintedSvg, iconTileSvg } from '../components/icon-paint.mjs';
import { ROOM_SCENE_VERSION, mountRoomScene } from '../components/room-scene/room-scene.mjs';
import { phoneIcon } from '../../../apps/game/hosted/planet/phone-controls.mjs';
import { BASE, GROUPS, PRESETS, SHEET_08, SHEET_DRAFT, SWITCHES, TILES_DRAFT, TOAST_DRAFT, clockSeconds, matchPreset, presetOf, sceneInput, sheetContent, sheetNote, shellInput } from './states.mjs';
import { mainSize, readIcons, readParts } from './specs.mjs';

const doc = document, root = doc.documentElement;
/** What the build gives the page: the source commit, the build time and the icons page's table. */
const DATA = (() => { try { return JSON.parse(doc.getElementById('bc-data')?.textContent ?? '{}'); } catch { return {}; } })();
const TEXT_SIZES = Object.freeze([[100, 'Standard'], [150, 'Large'], [200, 'Largest']]);
const PHONE_SIZES = Object.freeze({ '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] });
/** The review frames' safe areas (the pack's): a notch above, the home bar below. */
const NOTCH = Object.freeze({ top: 47, bottom: 34 });
const wide = () => root.clientWidth >= 860;

// ── Small helpers ────────────────────────────────────────────────────
function h(tag, props = {}, ...children) {
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
const icon = (name, { filled = false, size = 24, className = 'bc-ic' } = {}) => {
  const t = doc.createElement('template');
  t.innerHTML = iconSvg(name, { filled, size, className }).trim();
  return t.content.firstChild;
};
const frames = n => new Promise(done => { const step = left => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** A segmented choice of the page's own: buttons with aria-pressed. */
function segmented(label, options, current, onChoose) {
  const buttons = options.map(([value, text]) => h('button', { type: 'button', class: 'bc-seg-btn', 'aria-pressed': String(value === current), onclick: () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b === button(value)));
    onChoose(value);
  } }, text));
  const button = value => buttons[options.findIndex(([v]) => v === value)];
  const el = h('div', { class: 'bc-seg', role: 'group', 'aria-label': label }, h('span', { class: 'bc-seg-label' }, label), h('div', { class: 'bc-seg-row' }, buttons));
  el.choose = value => { for (const b of buttons) b.setAttribute('aria-pressed', String(b === button(value))); };
  return el;
}

// ── Sizes and colours, as read from the live components (specs.mjs) ──
const swatch = css => { const i = h('i', { class: 'bc-sw' }); i.style.background = css; return i; };
const colourLine = facts => [swatch(facts.css), h('code', {}, facts.hex), facts.alpha !== null ? ` ${facts.alpha} %` : '', facts.word ? ` · ${facts.word}` : ''];
const groundLine = ground => (!ground ? ['the room'] : ground.kind === 'picture' ? ['A picture']
  : ground.kind === 'gradient' ? [swatch(ground.css), 'Gradient', ground.stops.length ? [' · ', colourLine(ground.stops[0]), ' to ', colourLine(ground.stops[1])] : '', ground.blur ? ` · glass, blur ${ground.blur} px` : '']
  : [colourLine(ground.colour), ground.blur ? ` · glass, blur ${ground.blur} px` : '']);
const groundCss = ground => (ground?.kind === 'fill' ? ground.colour.css : ground?.kind === 'gradient' ? ground.css : null);
/** The parts of a bar, each with its size and what it is drawn with. */
function specList(parts) {
  if (!parts.length) return h('p', { class: 'bc-hint' }, 'No part of this bar shows in this state.');
  const line = (term, ...value) => [h('dt', {}, term), h('dd', {}, value)];
  return h('div', { class: 'bc-spec-list' }, parts.map(part => h('div', { class: 'bc-spec' },
    h('div', { class: 'bc-spec-head' }, h('b', {}, part.name), h('span', { class: 'bc-spec-size' }, `${part.width} × ${part.height} px`)),
    h('dl', {},
      part.dimmed !== null ? line('Shown at', `${part.dimmed} % strength: dimmed`) : null,
      part.tap ? line('Tap area', `${part.tap.width} × ${part.tap.height} px`) : null,
      part.ground ? line('Background', groundLine(part.ground)) : null,
      part.picture ? line('Picture', part.picture) : null,
      part.ring ? line('Ring', `${part.ring.width} px, inside the box · `, colourLine(part.ring.colour)) : null,
      part.border ? line('Border', `${part.border.width} px, ${part.border.sides === 'all' ? 'all round' : part.border.sides} · `, colourLine(part.border.colour)) : null,
      part.corners ? line('Corners', part.corners) : null,
      part.words ? line('Text', `“${part.words.said}” · ${part.words.size} px, weight ${part.words.weight}`, part.words.colour ? [' · ', colourLine(part.words.colour)] : '') : null,
      part.icon ? line('Icon', part.icon.name ? h('code', {}, part.icon.name) : 'A drawing', part.icon.filled ? ', selected form' : '', part.icon.painted === 'tile' ? ', a painted tile' : part.icon.painted ? ', painted' : '', ` · ${part.icon.width} × ${part.icon.height} px`, part.icon.colour ? [' · ', colourLine(part.icon.colour)] : '') : null))));
}
/** Brings a still phone to rest before it is read: an arriving sheet or toast is finished, not caught part-way in. */
function settle(element) {
  for (const animation of element.getAnimations?.({ subtree: true }) ?? []) { try { animation.finish(); } catch { /* one that never ends keeps running */ } }
}
/** Fills a readout only when what it says changed, so an open one is not redrawn on every tick. */
function paintSpecs(holder, parts) {
  const key = JSON.stringify(parts);
  if (holder.dataset.key === key) return;
  holder.dataset.key = key;
  holder.replaceChildren(specList(parts));
}

// ── The owner's marks ────────────────────────────────────────────────
// One document per state or icon, in the page's store: { status: 'ok' | 'change', note, label, group, at }.
// The Designer team reads them; the page only shows and saves them.
const marks = { map: new Map(), state: 'connecting', writable: true, db: null, views: new Set(), queue: new Map() };
const refreshMarks = () => { for (const paint of marks.views) paint(); };
async function startMarks() {
  if (typeof window.claude?.use !== 'function') { marks.state = 'off'; refreshMarks(); return; }
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]).catch(() => [null, null]);
  if (!db) { marks.state = 'off'; refreshMarks(); return; }
  marks.db = db;
  if (user && await user.canEdit().catch(() => true) === false) marks.writable = false;
  const slow = setTimeout(() => { if (marks.state === 'connecting') { marks.state = 'slow'; refreshMarks(); } }, 10000);
  db.collection('marks').onSnapshot(snap => {
    marks.map = new Map(snap.docs.map(d => [d.id, d.data()]));
    if (!snap.metadata.fromCache) { clearTimeout(slow); marks.state = 'live'; }
    refreshMarks();
  }, () => { clearTimeout(slow); marks.state = 'off'; refreshMarks(); });
  refreshMarks();
}
/** Saves a mark, or removes it (`body` null). One write at a time for each document. */
function saveMark(id, body) {
  if (!marks.db || !marks.writable) return;
  if (body) marks.map.set(id, body); else marks.map.delete(id);
  refreshMarks();
  const ref = marks.db.doc(`marks/${id}`);
  const next = (marks.queue.get(id) ?? Promise.resolve()).catch(() => {}).then(() => (body ? ref.set(body) : ref.delete()));
  marks.queue.set(id, next);
  next.catch(error => {
    if (error?.code === 'invalid_argument' || error?.code === 'revoked' || error?.code === 'not_granted') marks.writable = false;
    marks.failed = true;
    refreshMarks();
  });
}
let markSeq = 0;
/** OK and Change for one state or icon, with a note for Change. Tapping the chosen one again clears it. */
function markControl(id, { label, group }) {
  const seq = (markSeq += 1);
  const stamp = (status, note) => ({ status, note, label, group, at: new Date().toISOString() });
  const choose = status => {
    const now = marks.map.get(id);
    if (now?.status === status) saveMark(id, null);
    else saveMark(id, stamp(status, now?.note ?? ''));
  };
  const ok = h('button', { type: 'button', class: 'bc-mark-btn', 'data-status': 'ok', onclick: () => choose('ok') }, 'OK');
  const change = h('button', { type: 'button', class: 'bc-mark-btn', 'data-status': 'change', onclick: () => choose('change') }, 'Change');
  const note = h('input', { type: 'text', id: `bc-note-${seq}`, class: 'bc-mark-note', maxlength: '400', placeholder: 'What should change?', 'aria-label': `What should change in ${label}`,
    onchange: () => { if (marks.map.get(id)?.status === 'change') saveMark(id, stamp('change', note.value.trim())); } });
  const said = h('span', { class: 'bc-mark-said' });
  const wrap = h('div', { class: 'bc-mark' }, h('div', { class: 'bc-mark-row' }, ok, change, said), note);
  const paint = () => {
    if (!wrap.isConnected && wrap.dataset.seen) { marks.views.delete(paint); return; }
    if (wrap.isConnected) wrap.dataset.seen = '1';
    const now = marks.map.get(id), off = marks.state === 'off' || !marks.writable || !marks.db;
    ok.setAttribute('aria-pressed', String(now?.status === 'ok'));
    change.setAttribute('aria-pressed', String(now?.status === 'change'));
    ok.disabled = change.disabled = note.disabled = off;
    note.hidden = now?.status !== 'change';
    if (doc.activeElement !== note) note.value = now?.note ?? '';
    said.textContent = marks.state === 'off' ? '' : !marks.db ? 'Connecting…' : !marks.writable ? 'Only the owner marks' : marks.failed ? 'Not saved · try again' : now ? 'Saved' : '';
  };
  marks.views.add(paint);
  paint();
  return wrap;
}

// ── The text size, for every phone on the page ───────────────────────
// The game sets its text size on the page's root, and the components size in rem; so does this page. The
// page's own words are in px and keep their size.
const page = { text: 100, section: 'bars', route: 'top-bar', back: 'top-bar' };
const textListeners = new Set();
function setTextSize(percent) {
  page.text = percent;
  root.style.fontSize = percent === 100 ? '' : `${percent}%`;
  for (const fn of textListeners) fn(percent);
}

// ── Bars: the strips ─────────────────────────────────────────────────
const strips = [];
/** The width a strip's phone is drawn at: this phone's own width on a phone, 390 px on a wider screen. */
const stripWidth = () => (root.clientWidth <= 460 ? Math.max(320, Math.min(430, root.clientWidth)) : 390);
const STRIP_HEIGHT = 844;
const CROPS = Object.freeze({
  top: { from: 'top', parts: ['.ms-ps-tb'], pad: 30 },
  over: { from: 'top', parts: ['.ms-ps-tb', '.ms-ps-target', '.ms-ps-banner', '.ms-ps-toast'], pad: 22 },
  bottom: { from: 'bottom', parts: ['.ms-ps-tabs', '.ms-ps-talk', '.ms-ps-hero'], pad: 26 },
  chip: { from: 'bottom', parts: ['.ms-ps-chip', '.ms-ps-tabs'], pad: 22 },
  sheet: { from: 'bottom', parts: ['.ms-ps-sheet', '.ms-ps-tabs', '.ms-ps-talk'], pad: 26 },
  // The top of the phone down past the toast and an open sheet's head, whichever ends lower.
  toast: { from: 'top', parts: ['.ms-ps-tb', '.ms-ps-toast', '.ms-ps-sheet-head'], pad: 64 },
  whole: { from: 'whole', parts: [], pad: 0 },
  // The whole phone at its own size, for a state where the phone's height is what matters.
  phone: { from: 'whole', parts: [], pad: 0, full: true },
});
function standIn(text, className = 'bc-standin') { return h('div', { class: className }, text); }
/** What a sheet's body holds on this page: the labelled stand-in for its content, and a note's words where it has one. */
function sheetFill(controls) {
  const words = sheetContent(controls), note = sheetNote(controls);
  return [words ? standIn(words, 'bc-standin-sheet') : null, note ? h('p', { class: 'bc-standin-note' }, note) : null].filter(Boolean);
}

/**
 * A strip. By default it is one of the presets: today's shell, opened in the test view by a tap, with its mark.
 * `mount` draws it with another shell (the Card tab's before), `width` gives its phone's width, `opens` is the
 * preset a tap opens (null: none), `title`, `tags` and `mark` say what its card shows.
 */
function makeStrip(preset, first = false, { mount = mountPhoneShell, width = stripWidth, opens = preset.key, title = preset.label, tags = [`Sheet ${preset.sheet}`], mark = true, specs: withSpecs = true, route = null, height = () => STRIP_HEIGHT, rest = null } = {}) {
  const phone = h('div', { class: 'bc-phone', inert: true });
  const scaler = h('div', { class: 'bc-scaler' }, phone);
  const open = () => openTest(opens);
  const windowEl = opens
    ? h('div', { class: 'bc-window', 'data-crop': preset.crop, role: 'button', tabindex: '0', 'aria-label': `Open “${preset.label}” in the test view`,
      onclick: open, onkeydown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } } }, scaler)
    : h('div', { class: 'bc-window', 'data-crop': preset.crop, 'data-still': '' }, scaler);
  const sizeTag = h('span', { class: 'bc-tag bc-tag-size', title: 'The size of this bar' }, '…');
  const specs = h('div', { class: 'bc-specs' });
  // The first state of a sub-part shows its sizes and colours at once; the others on a tap.
  const details = h('details', { class: 'bc-specs-box', open: first, hidden: !withSpecs, ontoggle: () => paintStrip(strip) }, h('summary', {}, 'Sizes and colours'), specs);
  const card = h('article', { class: 'bc-strip', id: `bc-strip-${preset.key}` },
    h('header', { class: 'bc-strip-head' },
      h('h3', { class: 'bc-strip-title' }, title),
      h('span', { class: 'bc-tags' }, sizeTag, tags.map(tag => h('span', { class: 'bc-tag' }, tag)))),
    windowEl,
    preset.crop === 'whole' ? h('p', { class: 'bc-strip-note' }, 'The whole phone, small. Tap it to open it at full size.') : null,
    details,
    mark ? h('div', { class: 'bc-strip-foot' }, markControl(`bar-${preset.key}`, { label: preset.label, group: preset.groupTitle })) : null);
  const strip = { preset, card, phone, scaler, windowEl, sizeTag, specs, details, mount, width, height, rest, route: route ?? GROUPS.find(g => g.id === preset.group)?.route ?? null, shell: null, toast: 0, timer: null };
  strips.push(strip);
  return strip;
}
function mountStrip(strip) {
  if (strip.shell) return;
  const { preset, phone } = strip;
  phone.style.width = `${strip.width()}px`;
  phone.style.height = `${strip.height()}px`;
  // A strip is a still: with motion reduced, a sheet or a toast is read at rest, not part-way through arriving.
  const input = () => ({ ...shellInput(preset.controls, { toastId: `strip-${preset.key}-${strip.toast}` }), insets: { top: 0, bottom: 0 }, reducedMotion: true });
  strip.shell = strip.mount(phone, input(), { onLayout: () => cropStrip(strip) });
  if (strip.shell.sheetBody) strip.shell.sheetBody.append(...sheetFill(preset.controls));
  if (CROPS[preset.crop].from === 'whole') strip.shell.stage.append(standIn(sceneInput(preset.controls, { clock: null }).standIn
    ?? (preset.controls.status === 'concealed' ? 'Concealed · the room and this phone’s own controls are hidden' : 'The room')));
  // A toast shows once and fades: a strip shows it again every few seconds.
  if (preset.controls.toast !== 'none') strip.timer = setInterval(() => { if (page.route === strip.route && !test.open) { strip.toast += 1; strip.shell.update(input()); frames(2).then(() => cropStrip(strip)); } }, 3400);
  frames(2).then(() => cropStrip(strip));
}
/** Shows the part of the phone the strip is about, at this phone's own size where it fits. */
function cropStrip(strip) {
  const { phone, scaler, windowEl, preset } = strip;
  if (!strip.shell || !phone.isConnected) return;
  const crop = CROPS[preset.crop], width = phone.offsetWidth, box = phone.getBoundingClientRect();
  if (!box.width) return;
  const k = box.width / width;
  const rects = crop.parts.flatMap(sel => [...phone.querySelectorAll(sel)]).map(node => node.getBoundingClientRect()).filter(r => r.height > 0)
    .map(r => ({ top: (r.top - box.top) / k, bottom: (r.bottom - box.top) / k }));
  const tall = phone.offsetHeight || STRIP_HEIGHT;
  let top = 0, height = tall;
  if (crop.from === 'top' && rects.length) height = Math.min(tall, Math.max(...rects.map(r => r.bottom)) + crop.pad);
  if (crop.from === 'bottom' && rects.length) { top = Math.max(0, Math.min(...rects.map(r => r.top)) - crop.pad); height = tall - top; }
  const available = windowEl.clientWidth || width;
  const scale = Math.min(1, available / width) * (crop.from === 'whole' && !crop.full ? 0.62 : 1);
  phone.style.top = `${-top}px`;
  scaler.style.width = `${width}px`;
  scaler.style.height = `${height}px`;
  scaler.style.transform = `translateX(-50%) scale(${scale})`;
  // The whole phone keeps a margin above and below, so its outline shows.
  const inset = crop.from === 'whole' ? 16 : 0;
  scaler.style.top = `${inset}px`;
  windowEl.style.height = `${Math.round(height * scale) + inset * 2}px`;
  windowEl.dataset.scale = scale === 1 ? 'true size' : `${Math.round(scale * 100)} %`;
  // A still that shows a state the phone is brought to after it is drawn (a sheet scrolled to its end).
  strip.rest?.(strip);
  paintStrip(strip);
}
/** A strip's own facts: the size of its bar in its heading, and its parts' sizes and colours when that list is open. */
function paintStrip(strip) {
  if (!strip.shell || !strip.phone.isConnected) return;
  settle(strip.shell.element);
  const { preset } = strip, size = mainSize(strip.shell.element, preset.crop === 'chip' ? 'chip' : preset.group);
  strip.sizeTag.textContent = size && CROPS[preset.crop].from !== 'whole' ? `${size.width} × ${size.height} px` : `${strip.phone.offsetWidth} × ${strip.phone.offsetHeight} px`;
  if (strip.details.open && !strip.details.hidden) paintSpecs(strip.specs, readParts(strip.shell.element, preset.group === 'whole' ? null : [preset.group]));
}
let lazyStrips = null;
const recrop = () => frames(3).then(() => { for (const strip of strips) cropStrip(strip); });
/** Every mounted strip takes its phone's width again (the window's, or the Card tab view's own choice). */
const rewidth = () => { for (const strip of strips) if (strip.shell) { strip.phone.style.width = `${strip.width()}px`; strip.phone.style.height = `${strip.height()}px`; } recrop(); };
function startStrips() {
  if (lazyStrips) return;
  lazyStrips = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { lazyStrips.unobserve(entry.target); mountStrip(strips.find(s => s.card === entry.target)); }
  }, { rootMargin: '900px 0px' });
  textListeners.add(recrop);
  let resize = null;
  window.addEventListener('resize', () => { clearTimeout(resize); resize = setTimeout(rewidth, 160); });
}
/** The text size choice, kept in step with every other one on the page. */
function textSizeChoice() {
  const choice = segmented('Text size', TEXT_SIZES.map(([value, text]) => [value, text]), page.text, setTextSize);
  textListeners.add(percent => choice.choose(percent));
  return choice;
}

// ── Bars: a draft, the toast over an open sheet ──────────────────────
// A look shown before anything is checked (the owner, 18 November 2026: "Before you run tests let me see the design
// first"). Before is the shell at the commit the build names; after is the draft. Both are the component.
const TOAST = Object.freeze({ route: 'toast-draft', title: 'Toast over a sheet · draft', note: 'Draft: the look only, not checked yet. It may still change.' });
function buildToastDraftPart(view) {
  startStrips();
  const hasBefore = !!DATA.toastBefore;
  const pair = state => {
    const sides = [];
    if (hasBefore) sides.push(makeStrip({ ...state, key: `toast-before-${state.key}` }, false,
      { mount: mountShellBeforeToast, width: cardTabWidth, opens: null, title: 'Today', tags: ['Sheet 45'], mark: false, specs: false, route: TOAST.route }));
    sides.push(makeStrip({ ...state, key: `toast-after-${state.key}` }, false,
      { width: cardTabWidth, opens: null, title: 'Draft', tags: ['Draft'], mark: false, specs: false, route: TOAST.route }));
    for (const strip of sides) lazyStrips.observe(strip.card);
    return h('section', { class: 'bc-pair', 'aria-label': state.label }, h('h3', { class: 'bc-pair-title' }, state.label), sides.map(strip => strip.card));
  };
  const pairs = h('div', { class: 'bc-pairs' });
  const fit = () => pairs.style.setProperty('--bc-pair-w', `${cardTabWidth()}px`);
  const widths = segmented('Phone width', [['auto', 'This screen'], ['320', '320'], ['390', '390'], ['430', '430']], cardTab.width, setWidth);
  widthSyncs.add(value => { widths.choose(value); fit(); });
  fit();
  window.addEventListener('resize', fit);
  view.append(
    h('div', { class: 'bc-wrap bc-group-head' },
      h('h2', {}, 'The toast over a sheet or a banner', h('span', { class: 'bc-count bc-count-draft' }, 'Draft')),
      h('p', { class: 'bc-draft-line' }, TOAST.note),
      h('p', {}, 'A toast is the short message that drops in after you do something, such as “Registered”. The Lead Designer proposes this change. Nothing is decided until you say so.'),
      h('ul', { class: 'bc-change' },
        h('li', {}, h('b', {}, 'Today. '), 'The toast always drops in just under the top bar. Over a tall sheet it lands on the sheet’s title and the ✕, and cuts them through. With “Connection lost” showing, it lands on that banner.'),
        h('li', {}, h('b', {}, 'Draft. '), 'The toast never covers the top bar, the “Connection lost” banner or a sheet’s title. It takes the first free place below them: under the banner, or under a tall sheet’s title, over the sheet’s content. The banner with Retry, the title, Back and ✕ stay whole.'),
        h('li', {}, h('b', {}, 'Unchanged. '), 'With no banner and no sheet in its way, the toast stays where it is today.'))),
    h('div', { class: 'bc-wrap bc-tools' }, textSizeChoice(), widths,
      h('p', { class: 'bc-hint' }, hasBefore
        ? 'Each pair is the real bar twice: as it is today, then the draft. The toast shows for a moment and comes back every few seconds.'
        : 'This build has no copy of the bar as it is today, so only the draft is shown.')),
    h('div', { class: 'bc-wrap' }, h('div', { class: 'bc-verdict' },
      h('p', {}, h('b', {}, 'Is the draft right?'), ' Mark it here. After your OK it gets its checks; a Change comes back with your note.'),
      markControl('draft-toast-under-sheet-head', { label: 'Draft: the toast sits under an open sheet’s title', group: 'Sheets · draft' }))),
    pairs);
  pairs.append(...TOAST_DRAFT.map(pair));
}

// ── Bars: the bottom bar's icons as painted tiles, before and after ──
// The owner's picture of the bottom bar (18 November 2026), drawn in the real bar and shown here as a draft before
// any check; the owner's OK the same day; then shell 0.3.2 with its record. Before is the shell at the commit the
// build names (0.3.1); after is today's. The address keeps its first name, so an older link still opens it.
const TILES = Object.freeze({ route: 'tiles-draft', title: 'Bottom bar · painted icons', words: 'This is what i am thinking of bottom bar', answer: 'I am ok with this new bar' });
function buildTilesDraftPart(view) {
  startStrips();
  const hasBefore = !!DATA.toastBefore;
  const pair = state => {
    const sides = [];
    if (hasBefore) sides.push(makeStrip({ ...state, key: `tiles-before-${state.key}` }, false,
      { mount: mountShellBeforeToast, width: cardTabWidth, opens: null, title: 'Before', tags: ['Sheet 08'], mark: false, specs: false }));
    sides.push(makeStrip({ ...state, key: `tiles-after-${state.key}` }, false,
      { width: cardTabWidth, opens: matchPreset(state.controls)?.key ?? null, title: 'After', tags: ['New'], mark: false }));
    for (const strip of sides) lazyStrips.observe(strip.card);
    return h('section', { class: 'bc-pair', 'aria-label': state.label }, h('h3', { class: 'bc-pair-title' }, state.label), sides.map(strip => strip.card));
  };
  const pairs = h('div', { class: 'bc-pairs' });
  const fit = () => pairs.style.setProperty('--bc-pair-w', `${cardTabWidth()}px`);
  const widths = segmented('Phone width', [['auto', 'This screen'], ['320', '320'], ['390', '390'], ['430', '430']], cardTab.width, setWidth);
  widthSyncs.add(value => { widths.choose(value); fit(); });
  fit();
  window.addEventListener('resize', fit);
  view.append(
    h('div', { class: 'bc-wrap bc-group-head' },
      h('h2', {}, 'The bottom bar with painted icons', h('span', { class: 'bc-count bc-count-ok' }, 'Approved')),
      h('p', {}, 'You sent a picture of the bottom bar and wrote:'),
      h('blockquote', { class: 'bc-quote' }, `“${TILES.words}”`),
      h('p', {}, 'It was drawn in the game’s own bottom bar and shown here as a draft. Your answer:'),
      h('blockquote', { class: 'bc-quote' }, `“${TILES.answer}”`),
      h('p', { class: 'bc-ok-line' }, 'Approved by you on 18 November, and now checked: 66 of 66 recorded pictures and 31 of 31 checks pass. The Lead Designer’s review of the checked build is still to come. Nothing drawn has changed since you said OK.'),
      h('ul', { class: 'bc-change' },
        h('li', {}, h('b', {}, 'Before. '), 'Board, Actions and Panels are line icons, and the round button has a flat dark icon. Only the Card tab is a picture.'),
        h('li', {}, h('b', {}, 'After. '), 'Board, Actions and Panels are small painted tiles: the same frame, size and place as your character’s picture, a warm orange ground, the drawing in cream with a dark line. The round button’s icon (Pass or Vote) is painted in orange.'),
        h('li', {}, h('b', {}, 'An open tab. '), 'An amber ring round its tile and an amber label, as the Card tab has.'),
        h('li', {}, h('b', {}, 'Unavailable. '), 'The tile fades with its label. The round button turns grey, and its icon with it.'),
        h('li', {}, h('b', {}, 'Unchanged. '), 'The words, the order of the tabs, the bar’s height and where you tap.'),
        h('li', {}, h('b', {}, 'One orange for everyone. '), 'The tiles are the same orange on every phone, as in your picture. The last pair shows a player with a teal character: the tiles stay orange.'),
        h('li', {}, h('b', {}, 'Not in the game yet. '), 'The game takes it when the bar’s connection is updated and checked, which comes next.'))),
    h('div', { class: 'bc-wrap bc-tools' }, textSizeChoice(), widths,
      h('p', { class: 'bc-hint' }, hasBefore
        ? 'Each pair is the real bar twice: as it was, then as it is now. Tap an After bar to open it in the test view and press its buttons.'
        : 'This build has no copy of the bar as it was, so only the new one is shown.')),
    h('div', { class: 'bc-wrap' }, h('div', { class: 'bc-verdict' },
      h('p', {}, h('b', {}, 'Something to change?'), ' You said OK in our conversation. If you see something you want different, mark Change here with a note.'),
      markControl('draft-tab-tiles', { label: 'The bottom bar’s icons as painted tiles', group: 'Bottom bar · change' }))),
    pairs);
  pairs.append(...TILES_DRAFT.map(pair));
}

// ── Bars: the sheet's two drafts, a squeezed sheet's footer and its head ──
// Both are the Lead Designer's proposals for one problem: on the smallest phone at the Largest text, a sheet with a
// long title leaves its content a line or two. Each is shown alone and both together, beside today's, and each
// still says how much room its content gets, measured from the sheet it draws.
const SQUEEZE = Object.freeze({ route: 'sheet-draft', title: 'Long title at the largest text · two drafts' });
function buildSheetDraftPart(view) {
  startStrips();
  const hasBefore = !!DATA.toastBefore && !!DATA.sheetDrafts, state = SHEET_DRAFT, own = { width: cardTabWidth, height: cardTabHeight, mark: false, specs: false, route: SQUEEZE.route };
  // The sheet's scrolling part, brought to its end: the body where the footer stays, the wrapper where it follows.
  const toEnd = strip => { for (const sel of ['.ms-ps-sheet-scroll', '.ms-ps-sheet-body']) { const node = strip.shell?.element.querySelector(sel); if (node) node.scrollTop = node.scrollHeight; } };
  /** What the sheet a still draws gives its title and its content, measured from that sheet. */
  const measure = strip => {
    const sheet = strip.shell?.element.querySelector('.ms-ps-sheet');
    if (!sheet) return null;
    const head = sheet.querySelector('.ms-ps-sheet-head'), body = sheet.querySelector('.ms-ps-sheet-body'), scroll = sheet.querySelector('.ms-ps-sheet-scroll');
    const follows = sheet.hasAttribute('data-foot-scrolls');
    return { sheet: Math.round(sheet.offsetHeight), head: Math.round(head.offsetHeight), room: Math.round((follows && scroll ? scroll : body).clientHeight), follows, stacked: sheet.hasAttribute('data-head-stacked'),
      // How much taller the sheet's parts are than the sheet: what is cut at its foot.
      over: Math.max(0, Math.round(sheet.scrollHeight - sheet.clientHeight)) };
  };
  const still = (key, title, tags, mount, { end = false, opens = null } = {}) => {
    const fact = h('p', { class: 'bc-strip-note bc-room' }, '…');
    const strip = makeStrip({ ...state, key }, false, { ...own, ...(mount ? { mount } : {}), opens, title, tags,
      rest: s => {
        if (end) toEnd(s);
        const m = measure(s);
        if (m) fact.replaceChildren(h('b', {}, `Room for the content: ${m.room} px`), ` of a ${m.sheet} px sheet · the title’s part takes ${m.head} px`,
          m.stacked ? ' · the title on its own rows' : '', m.follows ? ' · the buttons follow the content' : '',
          m.over > 1 ? ` · the sheet’s parts are ${m.over} px taller than the sheet, cut at its foot` : '');
      } });
    strip.windowEl.after(fact);
    lazyStrips.observe(strip.card);
    return strip.card;
  };
  const group = (title, note, cards) => h('section', { class: 'bc-pair', 'aria-label': title }, h('h3', { class: 'bc-pair-title' }, title), note ? h('p', { class: 'bc-pair-note' }, note) : null, cards);
  const groups = hasBefore ? [
    group('Today', null, [still('squeeze-before', 'Today', ['Sheet 33'], mountShellBeforeToast)]),
    group('Draft A · the buttons scroll with the content', null, [
      still('squeeze-foot', 'Draft A · as it opens', ['Draft'], mountShellDraftFoot),
      still('squeeze-foot-end', 'Draft A · scrolled to its end', ['Draft'], mountShellDraftFoot, { end: true })]),
    group('Draft B · the title takes its own rows', null, [still('squeeze-head', 'Draft B', ['Draft'], mountShellDraftHead)]),
    group('Both drafts together', null, [
      still('squeeze-both', 'A and B · as it opens', ['Draft'], mountShellDraftSheet),
      still('squeeze-both-end', 'A and B · scrolled to its end', ['Draft'], mountShellDraftSheet, { end: true })]),
  ] : [group('Both drafts together', 'This build has no copy of the sheet as it is today, or of each draft alone.', [still('squeeze-both', 'A and B', ['Draft'], null, { opens: 'sheet-offer' })])];
  const pairs = h('div', { class: 'bc-pairs' });
  const fit = () => pairs.style.setProperty('--bc-pair-w', `${cardTabWidth()}px`);
  const widths = segmented('Phone', [['auto', 'This screen'], ['320', '320 × 568'], ['390', '390 × 844'], ['430', '430 × 932']], cardTab.width, setWidth);
  widthSyncs.add(value => { widths.choose(value); fit(); });
  fit();
  window.addEventListener('resize', fit);
  const show = (width, text) => () => { setTextSize(text); setWidth(width); };
  view.append(
    h('div', { class: 'bc-wrap bc-group-head' },
      h('h2', {}, 'A long title at the largest text', h('span', { class: 'bc-count bc-count-draft' }, 'Two drafts')),
      h('p', { class: 'bc-draft-line' }, 'Drafts: the look only, not checked yet. They may still change.'),
      h('p', {}, 'The Lead Designer proposes two changes for one problem. You can take either one, both or neither. Nothing is decided until you say so.'),
      h('ul', { class: 'bc-change' },
        h('li', {}, h('b', {}, 'Today. '), 'On the smallest phone at the Largest text, a long title beside Back and ✕ takes three lines, and the buttons at the foot take a row each. The content between them gets a line or two, and its last line is cut by the top button.'),
        h('li', {}, h('b', {}, 'Draft A · the buttons scroll with the content. '), 'When the content would get less than a third of the sheet, the buttons at the foot scroll with it. The content takes all the room under the title, and the buttons come after it.'),
        h('li', {}, h('b', {}, 'Draft B · the title takes its own rows. '), 'When a title would take more than two lines beside Back and ✕, those two move to a row of their own, and the title and the line under it get the sheet’s full width. The text keeps the size the player chose.'),
        h('li', {}, h('b', {}, 'Unchanged. '), 'Everywhere a title fits in two lines and the content has room. At 390 and 430 at the Standard text nothing moves.'))),
    h('div', { class: 'bc-wrap bc-tools' },
      h('button', { type: 'button', class: 'bc-primary', onclick: show('320', 200) }, 'Show the problem: 320 × 568, Largest text'),
      h('button', { type: 'button', class: 'bc-secondary', onclick: show('390', 100) }, '390 × 844, Standard'),
      h('button', { type: 'button', class: 'bc-secondary', onclick: show('430', 100) }, '430 × 932, Standard'),
      textSizeChoice(), widths,
      h('p', { class: 'bc-hint' }, 'Each still is the real sheet: today, each draft alone, and both together. Under each is the room its content gets, measured from that sheet. A still can’t be scrolled, so two of them are shown scrolled to their end.')),
    h('div', { class: 'bc-wrap' },
      // The Lead Designer's own recommendation, in their words, so the owner has one beside the two questions.
      h('p', { class: 'bc-advice' }, h('b', {}, 'The Lead recommends both together: '), 'A gives the content its room, and B gives the title the full width.'),
      h('div', { class: 'bc-verdict' },
        h('p', {}, h('b', {}, 'Draft A: is it right?'), ' The buttons scroll with the content when the content is squeezed.'),
        markControl('draft-sheet-footer-scrolls', { label: 'Draft A: a squeezed sheet’s buttons scroll with its content', group: 'Sheets · draft' })),
      h('div', { class: 'bc-verdict' },
        h('p', {}, h('b', {}, 'Draft B: is it right?'), ' A long title takes its own rows, under Back and ✕.'),
        markControl('draft-sheet-head-stacks', { label: 'Draft B: a long title takes its own rows', group: 'Sheets · draft' }))),
    pairs);
  pairs.append(...groups);
}

// ── Bars: the Card tab, before and after ─────────────────────────────
// The owner's 18 November 2026 change to sheet 08: Card is the last tab and shows the player's own character.
// Before is the shell at the commit the build names (shell 0.2.12), after is today's; both are the component.
const CARD_TAB = Object.freeze({ route: 'card-tab', title: 'Card tab · before and after',
  words: 'So I need to update the bottom bar I want on the card icon move to right and become the rightest icon of bar then instead of it its Icon card show the character icon',
  // The owner's second word, on seeing the first drawing (a round picture in the icon's box): shell 0.3.1.
  shape: 'The shape of it should be similar to the top character icon not circular but cubic same size' });
const cardTab = { width: 'auto' };
/** The Phone width choice is one for the before-and-after views: each keeps its own control in step with the others. */
const widthSyncs = new Set();
const cardTabWidth = () => (cardTab.width === 'auto' ? stripWidth() : Number(cardTab.width));
/** A phone's own height at each of the three widths, for a state where the height matters; 844 at this screen's width. */
const cardTabHeight = () => ({ 320: 568, 390: 844, 430: 932 }[cardTab.width] ?? STRIP_HEIGHT);
const setWidth = value => { cardTab.width = value; for (const sync of widthSyncs) sync(value); rewidth(); };
function buildCardTabPart(view) {
  startStrips();
  const hasBefore = BEFORE_VERSION !== PHONE_SHELL_VERSION;
  const pair = state => {
    const sides = [];
    if (hasBefore) sides.push(makeStrip({ ...state, key: `card-tab-before-${state.key}` }, false,
      { mount: mountShellBefore, width: cardTabWidth, opens: null, title: 'Before', tags: ['Sheet 08'], mark: false, specs: false }));
    sides.push(makeStrip({ ...state, key: `card-tab-after-${state.key}` }, false,
      { width: cardTabWidth, opens: matchPreset(state.controls)?.key ?? null, title: 'After', tags: ['New'], mark: false }));
    for (const strip of sides) lazyStrips.observe(strip.card);
    return h('section', { class: 'bc-pair', 'aria-label': state.label }, h('h3', { class: 'bc-pair-title' }, state.label), sides.map(strip => strip.card));
  };
  const pairs = h('div', { class: 'bc-pairs' });
  const fit = () => pairs.style.setProperty('--bc-pair-w', `${cardTabWidth()}px`);
  const widths = segmented('Phone width', [['auto', 'This screen'], ['320', '320'], ['390', '390'], ['430', '430']], cardTab.width, value => { cardTab.width = value; for (const sync of widthSyncs) sync(value); rewidth(); });
  widthSyncs.add(value => { widths.choose(value); fit(); });
  fit();
  window.addEventListener('resize', fit);
  const noCharacter = makeStrip(presetOf('card-icon'), false, { width: cardTabWidth, title: 'After', tags: ['New'], mark: false });
  lazyStrips.observe(noCharacter.card);
  // The Blackout's dark: the game gives no one's identity then, so the tab draws the card icon until the lights are back.
  const dark = makeStrip({ ...presetOf('dark'), key: 'card-tab-dark', crop: 'bottom', group: 'bottom' }, false, { width: cardTabWidth, opens: 'dark', title: 'After', tags: ['New'], mark: false });
  lazyStrips.observe(dark.card);
  // The whole phone on your own turn: the top bar and the Card tab draw the same picture, in the same shape and size.
  const both = makeStrip({ ...presetOf('pass'), key: 'card-tab-whole', crop: 'whole', group: 'whole' }, false,
    { width: cardTabWidth, opens: 'pass', title: 'After · the whole phone, small', tags: ['New'], mark: false, specs: false });
  lazyStrips.observe(both.card);
  view.append(
    h('div', { class: 'bc-wrap bc-group-head' },
      h('h2', {}, 'The Card tab, before and after', h('span', { class: 'bc-count' }, `${SHEET_08.length} states`)),
      h('p', {}, 'You asked for this on 18 November:'),
      h('blockquote', { class: 'bc-quote' }, `“${CARD_TAB.words}”`),
      h('p', {}, 'And, after seeing the first drawing, which was round:'),
      h('blockquote', { class: 'bc-quote' }, `“${CARD_TAB.shape}”`),
      h('ul', { class: 'bc-change' },
        h('li', {}, h('b', {}, 'The order. '), 'Before: Board · Actions · Pass · Card · Panels. After: Board · Actions · Pass · Panels · Card.'),
        h('li', {}, h('b', {}, 'The picture. '), 'The Card tab shows your own character in place of the card icon: the same picture as in the top bar, in the same rounded-square shape, at the same size, 32 px.'),
        h('li', {}, h('b', {}, 'Open. '), 'A picture can’t be filled in as an icon is, so an amber outline round it and the amber word show that Card is open. At rest it has no outline, as in the top bar.'),
        h('li', {}, h('b', {}, 'No picture to show. '), 'Before you have a character, and while the lights are out in the Blackout, the tab shows the card icon.'))),
    h('div', { class: 'bc-wrap bc-tools' },
      h('button', { type: 'button', class: 'bc-primary', onclick: () => openTest('pass') }, icon('phone', { filled: true }), 'Try the new bar on the whole phone'),
      textSizeChoice(), widths,
      h('p', { class: 'bc-hint' }, hasBefore
        ? 'Each pair is the real bar twice: as it was, then as it is now. The nine states are sheet 08’s, in its order. Open “Sizes and colours” under an After for the portrait’s size and its ring.'
        : 'This build has no copy of the bar as it was, so only the new bar is shown.')),
    h('div', { class: 'bc-wrap' }, h('div', { class: 'bc-verdict' },
      h('p', {}, h('b', {}, 'Is the new Card tab right?'), ' Mark it here. A Change comes back to the Designer team with your note.'),
      markControl('change-card-tab', { label: 'The Card tab: last, with the player’s own character', group: 'Bottom bar · change' }))),
    pairs);
  pairs.append(
    h('section', { class: 'bc-pair', 'aria-label': 'The top bar and the Card tab' }, h('h3', { class: 'bc-pair-title' }, 'Your turn · the same picture in the top bar and on the Card tab'), both.card),
    ...SHEET_08.map(pair),
    h('section', { class: 'bc-pair', 'aria-label': 'No character yet' }, h('h3', { class: 'bc-pair-title' }, 'No character yet · the Card tab keeps the card icon'), noCharacter.card),
    h('section', { class: 'bc-pair', 'aria-label': 'Blackout, dark' }, h('h3', { class: 'bc-pair-title' }, 'Blackout · lights out · the card icon until the lights are back'), dark.card,
      h('p', { class: 'bc-strip-note' }, 'While the lights are out the game shows no one’s picture, yours included. So the Card tab shows the card icon, and your picture returns with the lights.')));
}

function buildBarsPart(view, group) {
  startStrips();
  const textChoice = textSizeChoice();
  view.append(
    h('div', { class: 'bc-wrap bc-group-head' }, h('h2', {}, group.title, h('span', { class: 'bc-count' }, `${group.presets.length} states`)), h('p', {}, group.note)),
    h('div', { class: 'bc-wrap bc-tools' },
      h('button', { type: 'button', class: 'bc-primary', onclick: () => openTest(group.presets.some(p => p.key === test.presetKey) ? test.presetKey : group.presets[0].key) }, icon('phone', { filled: true }), 'Open the test view'),
      textChoice,
      h('p', { class: 'bc-hint' }, 'Each strip is the real bar, at this phone’s size, with its size beside its name. Open “Sizes and colours” for every part’s size, background, text and icon. Tap a strip to see it on the whole phone.')),
    h('div', { class: 'bc-strips' }, group.presets.map((preset, i) => { const strip = makeStrip(preset, i === 0); lazyStrips.observe(strip.card); return strip.card; })));
}

// ── The test view: the whole phone, live ─────────────────────────────
const test = { open: false, controls: { ...BASE }, presetKey: 'turn', running: 42, toast: 0, stage: 'room', safe: null, size: '390x844',
  shell: null, scene: null, sceneKey: null, tick: null, el: null, device: null, caption: null, drawer: null, selects: new Map(), captionTimer: null };
const clock = { now: () => Date.now() };

function say(text) {
  test.caption.textContent = text;
  test.caption.dataset.show = '';
  clearTimeout(test.captionTimer);
  test.captionTimer = setTimeout(() => { delete test.caption.dataset.show; }, 1900);
}
function setControls(change, { said = null } = {}) {
  const before = test.controls;
  test.controls = { ...before, ...change };
  if (before.toast !== test.controls.toast || ('toast' in change && change.toast !== 'none')) test.toast += 1;
  if (test.controls.clock === 'run' && before.clock !== 'run') test.running = 42;
  const preset = matchPreset(test.controls);
  test.presetKey = preset?.key ?? null;
  applyTest();
  paintDrawer();
  if (said !== false) say(said ?? (preset ? `${PRESETS.indexOf(preset) + 1} / ${PRESETS.length} · ${preset.label}` : 'Custom'));
}
function stepPreset(by) {
  const at = test.presetKey ? PRESETS.findIndex(p => p.key === test.presetKey) : (by > 0 ? -1 : 0);
  const next = PRESETS[(at + by + PRESETS.length) % PRESETS.length];
  setControls(next.controls);
}
/** The shell's taps, answered as a small stand-in for the game: enough to try each control. */
const testHandlers = {
  onTab: value => {
    const c = test.controls;
    if (c.tabs === 'talk') { setControls({ talkOpen: c.talkOpen === value ? 'none' : value }, { said: `Tapped · ${value === 'promises' ? 'Promises' : 'My card'}` }); return; }
    if (value === 'switch') { setControls({ view: c.view === 'room' ? 'board' : 'room' }, { said: `Tapped · ${c.view === 'room' ? 'Board' : 'Room'}` }); return; }
    const closing = c.open === value;
    setControls({ open: closing ? 'none' : value, sheet: closing ? 'none' : value === 'panels' ? 'none' : value }, { said: `Tapped · ${value[0].toUpperCase()}${value.slice(1)}` });
  },
  onHero: mode => {
    if (mode === 'pass') setControls({ sheet: 'pass', open: 'none' }, { said: 'Tapped · Pass' });
    else if (mode === 'vote') setControls({ hero: 'voted' }, { said: 'Tapped · Vote' });
    else say('Tapped · Voted');
  },
  onPromises: () => say('Tapped · Promises'),
  onMenu: () => say('Tapped · ⋮'),
  onCancelTarget: () => setControls({ target: 'none', chip: 'off' }, { said: 'Tapped · Cancel' }),
  onChip: () => say('Tapped · the chip'),
  onRetry: () => setControls({ banner: 'none', status: 'live', ...(test.controls.bar === 'reconnecting' ? { bar: 'turn' } : {}) }, { said: 'Tapped · Retry' }),
  onSheetAction: id => setControls({ sheet: 'none', open: 'none', ...(id === 'pass' ? { bar: 'turn', hero: 'pass-off' } : {}) }, { said: `Tapped · ${id}` }),
  onSheetBack: () => setControls({ sheet: 'none', open: 'none' }, { said: 'Tapped · Back' }),
  onSheetClose: () => setControls({ sheet: 'none', open: 'none' }, { said: 'Tapped · Close' }),
  onLayout: layout => { test.scene?.update({ size: layout.stage }); },
};
function applyTest() {
  if (!test.open) return;
  const c = test.controls;
  const input = { ...shellInput(c, { seconds: clockSeconds(c, test.running), toastId: `test-${test.toast}` }), insets: test.safe === 'notch' ? NOTCH : null };
  if (!test.shell) test.shell = mountPhoneShell(test.device, input, testHandlers);
  else test.shell.update(input);
  const body = test.shell.sheetBody;
  if (body && body.dataset.bcSheet !== c.sheet) {
    body.replaceChildren(...sheetFill(c));
    body.dataset.bcSheet = c.sheet;
  }
  // The room area: the room scene, mounted again when what it draws changes; or a labelled stand-in.
  const want = test.stage === 'room' ? sceneInput(c, { clock }) : { standIn: 'The room · switched off in this control' };
  const key = JSON.stringify([test.stage, want.standIn ?? null, want.scene ? [c.bar, c.status, c.banner === 'out', want.scene.control === null, c.target] : null]);
  if (key !== test.sceneKey) {
    test.sceneKey = key;
    test.scene?.dispose();
    test.scene = null;
    for (const old of test.shell.stage.querySelectorAll('.bc-standin')) old.remove();
    if (want.scene) {
      try {
        test.scene = mountRoomScene(test.shell.stage, { ...want.scene, size: test.shell.layout().stage }, {});
        if (want.then) test.scene.update(want.then);
      } catch (error) {
        test.shell.stage.append(standIn(`The room could not be drawn here · ${error?.message ?? error}`));
      }
    } else test.shell.stage.append(standIn(want.standIn));
  }
  // The readout waits for a sheet or a toast to arrive, so it reads them at rest.
  clearTimeout(test.specTimer);
  test.specTimer = setTimeout(paintTestSpecs, 420);
}
/** The drawer's readout of everything the test view shows now, when it is open. */
function paintTestSpecs() {
  if (test.open && test.specBox?.open && test.shell) paintSpecs(test.specs, readParts(test.shell.element, null));
}
function fitDevice() {
  if (!test.open) return;
  const device = test.device;
  if (!wide()) { Object.assign(device.style, { width: '', height: '', transform: '' }); Object.assign(device.parentElement.style, { width: '', height: '' }); return; }
  const [w, hgt] = PHONE_SIZES[test.size], room = device.parentElement.parentElement.getBoundingClientRect();
  const scale = Math.min(1, (room.height - 40) / hgt, (room.width - 40) / w);
  Object.assign(device.style, { width: `${w}px`, height: `${hgt}px`, transform: scale < 1 ? `scale(${scale})` : '' });
  Object.assign(device.parentElement.style, { width: `${Math.round(w * scale)}px`, height: `${Math.round(hgt * scale)}px` });
}
function paintDrawer() {
  const c = test.controls;
  for (const [key, row] of test.selects) {
    const sw = SWITCHES.find(s => s.key === key);
    if (sw) { row.select.value = c[key]; row.row.hidden = sw.when ? !sw.when(c) : false; }
  }
  test.presetSelect.value = test.presetKey ?? '';
  const preset = test.presetKey ? presetOf(test.presetKey) : null;
  test.markSlot.replaceChildren(preset
    ? h('div', {}, h('p', { class: 'bc-drawer-note' }, `Your mark for “${preset.label}”`), markControl(`bar-${preset.key}`, { label: preset.label, group: preset.groupTitle }))
    : h('p', { class: 'bc-drawer-note' }, 'A custom combination. Choose a state above to mark it.'));
}
function setDrawer(open) {
  test.el.dataset.drawer = open ? 'open' : 'closed';
  test.drawer.inert = !open && !wide();
  if (!open) test.fold?.(false);
}
function buildTest() {
  const selectRow = (id, label, options, value, onChange) => {
    const select = h('select', { id, class: 'bc-select', onchange: () => onChange(select.value) }, options.map(([v, text]) => h('option', { value: v }, text)));
    select.value = value;
    return { row: h('div', { class: 'bc-row' }, h('label', { for: id }, label), select), select };
  };
  test.device = h('div', { class: 'bc-device' });
  test.caption = h('div', { class: 'bc-caption', role: 'status', 'aria-live': 'polite' });
  // The floating controls fold to the screen's edge a few seconds after their last use, so they stay off the room;
  // folded, the one button left unfolds them.
  const main = h('button', { type: 'button', class: 'bc-float-btn bc-float-main', onclick: () => { if (float.hasAttribute('data-folded')) test.fold(false); else setDrawer(true); } }, icon('settings', { filled: true }));
  const used = fn => () => { fn(); test.fold(false); };
  const float = h('div', { class: 'bc-float', role: 'toolbar', 'aria-label': 'Test view' },
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Leave the test view', onclick: closeTest }, icon('close')),
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Previous state', onclick: used(() => stepPreset(-1)) }, icon('chevronLeft')),
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Next state', onclick: used(() => stepPreset(1)) }, icon('chevronRight')),
    main);
  test.fold = folded => {
    clearTimeout(test.foldTimer);
    float.toggleAttribute('data-folded', folded);
    main.setAttribute('aria-label', folded ? 'Show the test view’s controls' : 'Open the control');
    if (!folded) test.foldTimer = setTimeout(() => test.fold(true), 5000);
  };
  test.presetSelect = h('select', { id: 'bc-preset', class: 'bc-select', onchange: () => { const p = presetOf(test.presetSelect.value); if (p) setControls(p.controls); } },
    h('option', { value: '' }, 'Custom'),
    GROUPS.map(group => h('optgroup', { label: group.title }, group.presets.map(p => h('option', { value: p.key }, p.label)))));
  test.markSlot = h('div', { class: 'bc-drawer-mark' });
  const groups = [...new Set(SWITCHES.map(s => s.group))].map(name => h('fieldset', { class: 'bc-fieldset' }, h('legend', {}, name),
    SWITCHES.filter(s => s.group === name).map(sw => {
      const made = selectRow(`bc-sw-${sw.key}`, sw.label, sw.options, test.controls[sw.key], value => setControls({ [sw.key]: value }));
      test.selects.set(sw.key, made);
      return made.row;
    })));
  const text = selectRow('bc-page-text', 'Text size', TEXT_SIZES.map(([v, t]) => [String(v), `${t} · ${v} %`]), String(page.text), value => { setTextSize(Number(value)); frames(2).then(applyTest); });
  textListeners.add(percent => { text.select.value = String(percent); });
  const stage = selectRow('bc-page-stage', 'Room', [['room', 'Room B · today’s drawing'], ['plain', 'Off · bars only']], test.stage, value => { test.stage = value; applyTest(); });
  const safe = selectRow('bc-page-safe', 'Safe areas', [['screen', 'This screen’s own'], ['notch', 'iPhone · notch and home bar']], test.safe ?? 'screen', value => { test.safe = value; applyTest(); });
  const size = selectRow('bc-page-size', 'Phone size', Object.keys(PHONE_SIZES).map(k => [k, k.replace('x', ' × ')]), test.size, value => { test.size = value; fitDevice(); });
  size.row.classList.add('bc-wide-only');
  test.safeSelect = safe.select;
  test.specs = h('div', { class: 'bc-specs' });
  test.specBox = h('details', { class: 'bc-specs-box', ontoggle: () => paintTestSpecs() }, h('summary', {}, 'Sizes and colours of what shows'), test.specs);
  test.drawer = h('aside', { class: 'bc-drawer', 'aria-label': 'Control' },
    h('header', { class: 'bc-drawer-head' },
      h('h2', {}, 'Control'),
      h('button', { type: 'button', class: 'bc-ghost bc-wide-only', onclick: closeTest }, 'Leave'),
      h('button', { type: 'button', class: 'bc-ghost bc-narrow-only', onclick: () => setDrawer(false) }, 'Done')),
    h('div', { class: 'bc-drawer-body' },
      h('div', { class: 'bc-row bc-row-preset' }, h('label', { for: 'bc-preset' }, 'State'), test.presetSelect,
        h('div', { class: 'bc-step' },
          h('button', { type: 'button', class: 'bc-ghost', onclick: () => stepPreset(-1) }, icon('chevronLeft'), 'Previous'),
          h('button', { type: 'button', class: 'bc-ghost', onclick: () => stepPreset(1) }, 'Next', icon('chevronRight')))),
      test.markSlot,
      groups,
      h('fieldset', { class: 'bc-fieldset' }, h('legend', {}, 'This page'), text.row, stage.row, safe.row, size.row),
      test.specBox,
      h('p', { class: 'bc-drawer-note' }, 'The switches can make a combination the game never shows. Names and seats are invented.')));
  test.el = h('div', { class: 'bc-test', hidden: true, 'data-drawer': 'closed' },
    h('div', { class: 'bc-test-room' }, h('div', { class: 'bc-device-box' }, test.device)), float, test.caption, test.drawer);
  doc.body.append(test.el);
  window.addEventListener('resize', fitDevice);
  doc.addEventListener('keydown', event => {
    if (!test.open || event.target.closest('select, input')) return;
    if (event.key === 'ArrowRight') stepPreset(1);
    else if (event.key === 'ArrowLeft') stepPreset(-1);
    else if (event.key === 'Escape') { if (test.el.dataset.drawer === 'open' && !wide()) setDrawer(false); else closeTest(); }
  });
}
function openTest(presetKey) {
  const preset = presetOf(presetKey) ?? presetOf('own');
  test.pending = preset;
  if (location.hash !== '#test') location.hash = 'test'; else showTest();
}
function showTest() {
  const preset = test.pending ?? presetOf(test.presetKey ?? 'own');
  test.pending = null;
  test.open = true;
  test.el.hidden = false;
  doc.body.dataset.test = '';
  if (test.safe === null) { test.safe = wide() ? 'notch' : 'screen'; test.safeSelect.value = test.safe; }
  setDrawer(wide());
  test.fold(false);
  fitDevice();
  if (preset) setControls(preset.controls); else applyTest();
  clearInterval(test.tick);
  test.tick = setInterval(() => {
    if (test.controls.clock !== 'run') return;
    test.running = test.running <= 0 ? 42 : test.running - 1;
    applyTest();
  }, 1000);
  test.scene?.resume?.();
}
function closeTest() {
  if (location.hash === '#test') location.hash = page.back; else hideTest();
}
function hideTest() {
  test.open = false;
  clearInterval(test.tick);
  clearTimeout(test.foldTimer);
  test.el.hidden = true;
  delete doc.body.dataset.test;
  test.scene?.suspend?.();
}

// ── Icons ────────────────────────────────────────────────────────────
const GROUP_NAMES = Object.freeze({ navigation: 'Navigation', action: 'Game actions', status: 'People and places', phase: 'Phases', entry: 'Before the match', utility: 'Controls' });
/** The family's icon beside the game's own drawing of the same thing (phone-controls.mjs), which release 3 and 4 retire. */
const DRAWN_TWICE = Object.freeze([
  ['board', 'board', 'Board'], ['room', 'room', 'Room'], ['actions', 'actions', 'Actions'], ['card', 'card', 'Card'], ['panels', 'panels', 'Panels'],
  ['pass', 'pass', 'Pass'], ['vote', 'vote', 'Vote'], ['promise', 'promises', 'Promises'], ['menu', 'settings', 'Settings menu'], ['close', 'close', 'Close'],
  ['timer', 'clock', 'Clock'], ['move', 'move', 'Move'], ['scan', 'scan', 'Scan'], ['shoot', 'target', 'Shoot'], ['protect', 'shield', 'Protect'],
  ['rescue', 'medical', 'Rescue'], ['supply', 'supply', 'Supply'], ['code', 'code', 'Final Code'], ['shipHack', 'ship', 'Hack Spaceship'],
  ['suppress', 'suppress', 'Suppress'], ['blackhole', 'blackhole', 'Blackhole'], ['clone', 'clone', 'Clone'], ['blackout', 'blackout', 'Blackout'],
  ['release', 'unlock', 'Release'], ['eject', 'eject', 'Eject'], ['officer', 'badge', 'Officer'], ['course', 'compass', 'Course'], ['talk', 'talk', 'Private talk'],
  ['check', 'check', 'Done'], ['window', 'window', 'Windows'], ['players', 'people', 'Players'],
]);
/** Other drawings still on screen in the game that are not the family's (the icons page's rendered check). */
const STILL_SHOWN = Object.freeze([
  ['The blocked mark on a person', 'block', 'the board tags (#298)'],
  ['The Officer’s glyph in the office badge', 'officer', 'the board tags (#298)'],
  ['A promise’s kind, in the Promises sheet', 'jail', 'the Promises component (#297)'],
  ['A promise’s seal, in the Promises sheet', 'check', 'the Promises component (#297)'],
  ['A window’s heading, in the Windows sheet', 'window', 'the Windows component (#299)'],
  ['A window’s place, in the room and on the Board', 'window', 'the Windows component (#299) · no release yet'],
  ['The final Code’s line, in the end result', 'code', 'the end scene (#271, #304) · no release yet'],
  ['The Captain’s Release and Eject plates', 'release', 'a later change to the room films (#262)'],
]);
/** The icons' sub-parts: the family's six groups, by what an icon is for, then the two lists of other drawings. */
const ICON_PARTS = Object.freeze([
  { route: 'icons-navigation', group: 'navigation', title: 'Navigation', note: 'The tabs, the round button and the settings menu.' },
  { route: 'icons-actions', group: 'action', title: 'Game actions', note: 'What a player can do: the Actions tiles, the target bar and the office decisions.' },
  { route: 'icons-people', group: 'status', title: 'People and places', note: 'Offices, health and places: in tags, on the Board and in the bars.' },
  { route: 'icons-phases', group: 'phase', title: 'Phases', note: 'The top bar’s icon for each phase, and the clock.' },
  { route: 'icons-entry', group: 'entry', title: 'Before the match', note: 'Hosting, joining and recovering.' },
  { route: 'icons-controls', group: 'utility', title: 'Controls', note: 'What every screen shares: Close, Back, Done, Warning and the rest.' },
  { route: 'icons-twice', title: 'Drawn twice', note: 'Left: the one source. Right: the game’s own drawing, still used inside the Actions, Panels, Promises and Captain sheets. The match screens’ release replaces them with the left column; the Settings button before the match follows with the pre-game screens.' },
  { route: 'icons-other', title: 'Other drawings', note: 'Still on screen in the game, and not from the one source. Found by drawing the game at 390 × 844 and listing every picture. Each has an icon in the one source, and a component that will replace it.' },
]);
const iconsCount = part => (part.group ? ICON_NAMES.filter(n => ICONS[n].group === part.group).length : part.route === 'icons-twice' ? DRAWN_TWICE.length : STILL_SHOWN.length);
const iconsState = { filled: false, ground: 'glass' };
const iconPainters = new Set(), iconShown = new Map();
function iconCell(name) {
  const meta = ICONS[name];
  const cell = h('button', { type: 'button', class: 'bc-icon', 'data-icon': name, 'aria-label': `${meta.label} · ${name}`, onclick: () => openIcon(name) },
    h('span', { class: 'bc-icon-art' }), h('span', { class: 'bc-icon-name' }, name), h('span', { class: 'bc-icon-dot', 'aria-hidden': 'true' }));
  const paint = () => {
    cell.firstChild.replaceChildren(icon(name, { filled: iconsState.filled }));
    cell.dataset.mark = marks.map.get(`icon-${name}`)?.status ?? '';
  };
  marks.views.add(paint);
  iconPainters.add(paint);
  paint();
  return cell;
}
/**
 * Where the bars draw each icon: every state's shell is mounted once, off screen, and its icons are read
 * (specs.mjs readIcons): the part, the size, the colour and the ground. Read again when the text size changes.
 */
let usesFor = null, usesPromise = null;
function iconUses() {
  if (usesPromise && usesFor === page.text) return usesPromise;
  usesFor = page.text;
  usesPromise = (async () => {
    const host = h('div', { class: 'bc-probe', inert: true, 'aria-hidden': 'true' }), map = new Map(), seen = new Set();
    doc.body.append(host);
    for (const [i, preset] of PRESETS.entries()) {
      const phone = h('div', { class: 'bc-probe-phone' });
      host.append(phone);
      const shell = mountPhoneShell(phone, { ...shellInput(preset.controls, { toastId: `probe-${i}` }), insets: { top: 0, bottom: 0 }, reducedMotion: true }, {});
      settle(shell.element);
      for (const use of readIcons(shell.element)) {
        const key = JSON.stringify([use.name, use.filled, use.painted, use.part, use.size, use.colour?.css, groundCss(use.ground), use.dimmed]);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!map.has(use.name)) map.set(use.name, []);
        map.get(use.name).push(use);
      }
      shell.dispose();
      phone.remove();
      if (i % 6 === 5) await frames(1);
    }
    host.remove();
    return map;
  })();
  return usesPromise;
}
/** One use of an icon by the bars, drawn as the bar draws it: its size, its colour, its ground. */
function useRow(use, { named = true } = {}) {
  // A painted use (icons 1.1.0) is drawn as the bar draws it: the tile, or the drawing alone, painted.
  const art = h('span', { class: 'bc-use-art' }, use.painted ? paintedIcon(use.name, use.painted, Math.round(use.size)) : icon(use.name, { filled: use.filled, size: Math.round(use.size) }));
  const css = groundCss(use.ground);
  if (css) { art.style.background = css; if (use.ground.kind === 'fill') art.style.setProperty('--ic-knock', use.ground.colour.css); }
  if (use.colour) art.style.color = use.colour.css;
  if (use.dimmed !== null) art.firstChild.style.opacity = String(use.dimmed / 100);
  return h('li', {}, art, h('span', {},
    named ? [h('code', {}, use.name), use.filled ? ' · selected form' : '', use.painted === 'tile' ? ' · painted tile' : use.painted ? ' · painted' : '', h('br')]
      : use.painted ? [use.painted === 'tile' ? 'Painted tile' : 'Painted', h('br')] : use.filled ? ['Selected form', h('br')] : null,
    h('strong', {}, use.part), ` · ${use.size} × ${use.size} px`, use.dimmed !== null ? ` · dimmed to ${use.dimmed} %` : '', h('br'),
    use.colour ? colourLine(use.colour) : use.painted ? 'Its own paint' : '', ' on ', groundLine(use.ground)));
}
/** A painted icon as an element, at a size: the family's tile or its painted drawing (icon-paint.mjs). */
function paintedIcon(name, form, size) {
  const t = doc.createElement('template');
  t.innerHTML = (form === 'tile' ? iconTileSvg(name, { className: 'bc-ic' }) : iconPaintedSvg(name, { className: 'bc-ic' })).trim();
  const svg = t.content.firstChild;
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  return svg;
}
const strokesOf = name => [...new Set(ICONS[name].parts.filter(part => !part.dot).map(part => part.width ?? 1.8))].sort((a, b) => a - b).map(w => `${w} px`).join(' and ') || 'Dots only';
const familyFacts = () => {
  const line = (term, value) => [h('dt', {}, term), h('dd', {}, value)];
  return h('dl', { class: 'bc-facts bc-facts-card' },
    line('Size', '24 × 24 px grid, with 2 px kept clear all round'),
    line('Line', '1.8 px, with round ends and corners'),
    line('Colour', 'The text colour of the control it sits in'),
    line('Background', 'None of its own. It sits on its control’s ground: see “Where the bars draw them”'),
    line('Selected', 'A filled form; its inner lines are cut out in the ground’s colour'),
    line('Painted', 'For the game’s bottom bar: a tile like the character’s picture on each tab, and the drawing alone, painted, on the round button'));
};
let iconDialog = null;
function openIcon(name) {
  const meta = ICONS[name], more = DATA.icons?.[name] ?? null;
  const big = filled => h('figure', { class: 'bc-big' }, h('div', { class: 'bc-big-art' }, icon(name, { filled, size: 96 })), h('figcaption', {}, filled ? 'Selected' : 'At rest'));
  const fact = (term, value) => (value ? [h('dt', {}, term), h('dd', {}, value)] : []);
  const hasFill = meta.parts.some(part => part.fill), hasKnock = meta.parts.some(part => part.knock);
  const uses = h('ul', { class: 'bc-list bc-uses' }, h('li', {}, 'Measuring the bars…'));
  iconDialog.replaceChildren(
    h('header', { class: 'bc-dialog-head' }, h('div', {}, h('p', { class: 'bc-eyebrow' }, GROUP_NAMES[meta.group] ?? meta.group), h('h2', {}, meta.label)),
      h('button', { type: 'button', class: 'bc-ghost', onclick: () => iconDialog.close() }, 'Close')),
    h('div', { class: 'bc-big-row', 'data-ground': iconsState.ground }, big(false), big(true),
      h('figure', { class: 'bc-big' }, h('div', { class: 'bc-big-art bc-big-true' }, icon(name), icon(name, { filled: true })), h('figcaption', {}, 'Game size · 24 px'))),
    h('dl', { class: 'bc-facts' }, fact('Name', h('code', {}, name)),
      fact('Size', '24 × 24 px grid, 2 px clear all round'),
      fact('Line', strokesOf(name)),
      fact('Selected form', hasFill ? (hasKnock ? 'Filled, with inner lines cut out' : 'Filled') : 'The same as at rest'),
      fact('Background', 'None of its own'),
      fact('Drawn at', more ? h('code', {}, `icons.mjs · line ${more.line}`) : null),
      fact('Used by', more?.usedBy ?? null), fact('In the phone pack', more ? (more.pack ? 'Yes' : 'No') : null)),
    h('h3', { class: 'bc-dialog-sub' }, 'Where the bars draw it'), uses,
    markControl(`icon-${name}`, { label: `${meta.label} (${name})`, group: 'Icons' }));
  iconDialog.showModal();
  iconUses().then(map => {
    const list = map.get(name) ?? [];
    uses.replaceChildren(...(list.length ? list.map(use => useRow(use, { named: false })) : [h('li', {}, 'The bars don’t draw it. Other parts of the game do: see “Used by”.')]));
  });
}
const iconTools = [];
/** Form and ground, the same choice in every icons sub-part. */
function iconsTools() {
  const set = (key, value) => { iconsState[key] = value; for (const tools of iconTools) tools[key].choose(key === 'filled' ? (value ? 'selected' : 'rest') : value); for (const paint of iconPainters) paint(); };
  const tools = {
    filled: segmented('Form', [['rest', 'At rest'], ['selected', 'Selected']], iconsState.filled ? 'selected' : 'rest', value => set('filled', value === 'selected')),
    ground: segmented('Ground', [['glass', 'Dark glass'], ['paper', 'Paper']], iconsState.ground, value => set('ground', value)),
  };
  iconTools.push(tools);
  return [tools.filled, tools.ground];
}
function buildIconsPart(view, part) {
  const head = h('div', { class: 'bc-wrap bc-group-head' }, h('h2', {}, part.title, h('span', { class: 'bc-count' }, String(iconsCount(part)))), h('p', {}, part.note));
  if (part.route === 'icons-twice') {
    view.append(head, h('section', { class: 'bc-wrap bc-section' },
      h('div', { class: 'bc-twice-head' }, h('span', {}, ''), h('span', {}, 'One source'), h('span', {}, 'Retiring')),
      h('div', { class: 'bc-twice', 'data-ground': 'glass' }, DRAWN_TWICE.map(([ours, theirs, label]) => h('div', { class: 'bc-twice-row' },
        h('span', { class: 'bc-twice-name' }, label),
        h('span', { class: 'bc-twice-art', title: 'The one source' }, icon(ours)),
        h('span', { class: 'bc-twice-art bc-twice-old', title: 'The game’s own, retiring' }, phoneIcon(doc, theirs))))),
      h('p', { class: 'bc-hint' }, 'Both columns are 24 × 24 px with 1.8 px lines, on the same dark ground. Only the drawing differs.')));
    return;
  }
  if (part.route === 'icons-other') {
    view.append(head, h('section', { class: 'bc-wrap bc-section' },
      h('ul', { class: 'bc-list' }, STILL_SHOWN.map(([where, name, by]) => h('li', {}, h('span', { class: 'bc-list-art', 'data-ground': 'glass' }, icon(name)), h('span', {}, h('strong', {}, where), h('br'), `Replaced by ${by}`))))));
    return;
  }
  const names = ICON_NAMES.filter(n => ICONS[n].group === part.group);
  const grid = h('div', { class: 'bc-icon-grid', 'data-ground': iconsState.ground }, names.map(iconCell));
  iconPainters.add(() => { grid.dataset.ground = iconsState.ground; });
  const uses = h('ul', { class: 'bc-list bc-uses' }, h('li', {}, 'Measuring the bars…'));
  iconShown.set(part.route, () => iconUses().then(map => {
    const rows = names.flatMap(name => (map.get(name) ?? []).map(use => useRow(use)));
    uses.replaceChildren(...(rows.length ? rows : [h('li', {}, 'The bars draw none of these. Other parts of the game do: tap an icon to see which.')]));
  }));
  view.append(head,
    h('div', { class: 'bc-wrap bc-tools' }, iconsTools(), h('p', { class: 'bc-hint' }, 'Tap an icon to see it large, with its size, its line and where it is drawn, and to mark it.')),
    h('div', { class: 'bc-wrap' }, grid),
    h('section', { class: 'bc-wrap bc-section' }, h('h3', { class: 'bc-sub' }, 'Every icon'), familyFacts()),
    h('section', { class: 'bc-wrap bc-section' }, h('h3', { class: 'bc-sub' }, 'Where the bars draw them'),
      h('p', { class: 'bc-hint' }, 'Each row is one place a bar draws one of these icons, measured from the bar itself: the size it is drawn at, its colour, and the ground behind it.'), uses));
}

// ── Status ───────────────────────────────────────────────────────────
function buildStatus(view) {
  const count = h('div', { class: 'bc-tiles' });
  const changes = h('div', { class: 'bc-changes' });
  const paint = () => {
    const all = [...marks.map.entries()], ok = all.filter(([, m]) => m.status === 'ok').length, change = all.filter(([, m]) => m.status === 'change');
    const total = PRESETS.length + ICON_NAMES.length;
    count.replaceChildren(
      h('div', { class: 'bc-tile' }, h('b', {}, String(ok)), h('span', {}, 'marked OK')),
      h('div', { class: 'bc-tile', 'data-tone': change.length ? 'change' : null }, h('b', {}, String(change.length)), h('span', {}, 'to change')),
      h('div', { class: 'bc-tile' }, h('b', {}, String(total - ok - change.length)), h('span', {}, `not marked, of ${total}`)));
    changes.replaceChildren(
      h('h3', {}, 'To change'),
      change.length
        ? h('ul', { class: 'bc-list' }, change.map(([id, m]) => h('li', {}, h('span', {}, h('strong', {}, m.label ?? id), h('span', { class: 'bc-tag' }, m.group ?? ''), h('br'), m.note || 'No note yet'))))
        : h('p', { class: 'bc-hint' }, marks.state === 'off' || marks.state === 'slow' ? 'Nothing to list in this view.'
          : 'Nothing is marked Change. Mark a strip or an icon and it is listed here, with your note.'));
  };
  marks.views.add(paint);
  const row = (name, version, where, waits) => h('li', {}, h('strong', {}, name), h('span', {}, h('code', {}, version), ` · ${where}`), h('span', {}, `Waits for ${waits}`));
  view.append(h('div', { class: 'bc-wrap bc-section' },
    h('h2', {}, 'Your marks'), count, changes,
    h('h2', {}, 'What this page draws'),
    h('p', { class: 'bc-hint' }, 'Every bar and icon here is the same file the game imports. Nothing is redrawn for this page, so what you approve here is what the game gets.'),
    h('ul', { class: 'bc-parts' },
      row('Top bar, bottom bar, sheet frame, target bar, banners, toast', PHONE_SHELL_VERSION, 'PR #265, with the Card tab’s change in PR #321', 'your look at the Card tab, then Frontend’s review'),
      BEFORE_VERSION !== PHONE_SHELL_VERSION ? row('The bottom bar as it was, in the Card tab’s before and after', BEFORE_VERSION, `the same file at commit ${(DATA.before?.commit ?? '').slice(0, 8)}`, 'nothing: it is there to compare') : null,
      row('Buttons, rows, pills and the other shared controls', COMPONENT_KIT_VERSION, 'PR #265', 'Frontend’s review'),
      row('Every icon', ICON_FAMILY_VERSION, 'PR #313, with its page and test', 'the Lead Designer’s review'),
      row('The bars connected in the game', 'test release 2', 'PR #307', 'Frontend’s review and Integration’s approval'),
      row('The room behind the bars', ROOM_SCENE_VERSION, 'PR #261 · shown for context, not part of this control', 'the new painted rooms')),
    h('h2', {}, 'What it is not'),
    h('ul', { class: 'bc-plain' },
      h('li', {}, 'Not the game: no match, no rule, no real player. Names and seats are invented.'),
      h('li', {}, 'A sheet’s content, the private talk’s capsule and the films are other builders’ parts, shown as labelled stand-ins.'),
      h('li', {}, 'A browser on your phone, inside this page’s frame: the bars are true size, the phone’s height is the frame’s.')),
    h('p', { class: 'bc-built' }, DATA.commit ? `Built from ${DATA.branch} at ${DATA.commit.slice(0, 8)}${DATA.clean === false ? ', with changes not committed yet' : ''} · ${DATA.built}` : 'An unbundled copy: no build facts.')));
  paint();
}

// ── The page ─────────────────────────────────────────────────────────
function build() {
  const app = doc.getElementById('bc-app') ?? doc.body.appendChild(h('div', { id: 'bc-app' }));
  // Three sections; Bars and Icons are divided into sub-parts, each its own view with its own address.
  const sections = [
    { id: 'bars', title: 'Bars', parts: [{ route: TILES.route, title: TILES.title, count: TILES_DRAFT.length, build: buildTilesDraftPart },
      { route: CARD_TAB.route, title: CARD_TAB.title, count: SHEET_08.length, build: buildCardTabPart },
      { route: TOAST.route, title: TOAST.title, count: TOAST_DRAFT.length, build: buildToastDraftPart },
      { route: SQUEEZE.route, title: SQUEEZE.title, count: 2, build: buildSheetDraftPart },
      ...GROUPS.map(group => ({ route: group.route, title: group.title, count: group.presets.length, build: view => buildBarsPart(view, group) }))] },
    { id: 'icons', title: 'Icons', parts: ICON_PARTS.map(part => ({ route: part.route, title: part.title, count: iconsCount(part), build: view => buildIconsPart(view, part) })) },
    { id: 'status', title: 'Status', parts: [{ route: 'status', title: 'Status', build: buildStatus }] },
  ];
  const routes = new Map(sections.flatMap(section => section.parts.map(part => [part.route, { section, part }])));
  const last = { bars: sections[0].parts[0].route, icons: sections[1].parts[0].route, status: 'status' };
  const links = sections.map(section => h('a', { href: `#${last[section.id]}`, class: 'bc-nav-link' }, section.title));
  const sub = h('div', { class: 'bc-subnav', role: 'navigation', 'aria-label': 'Sub-parts' });
  const nav = h('nav', { class: 'bc-nav', 'aria-label': 'Views' }, h('div', { class: 'bc-wrap bc-nav-row' }, links), sub);
  const notice = h('p', { class: 'bc-notice', role: 'status', hidden: true });
  const main = h('main', {});
  iconDialog = h('dialog', { class: 'bc-dialog', 'aria-label': 'Icon' });
  iconDialog.addEventListener('click', event => { if (event.target === iconDialog) iconDialog.close(); });
  app.append(
    h('header', { class: 'bc-head' }, h('div', { class: 'bc-wrap' },
      h('p', { class: 'bc-eyebrow' }, 'Game N · phone'),
      h('h1', {}, 'Bars & Icons Control'),
      h('p', { class: 'bc-lede' }, 'Every bar and every icon, drawn by the game’s own files and sorted into parts. Each one shows its size, its background and its colours. Look, try, then mark it OK or Change.'))),
    // A draft on the page says so at the top, before anything else: a look only, not checked yet.
    h('div', { class: 'bc-wrap' }, h('p', { class: 'bc-draft', role: 'note' }, h('b', {}, 'Three drafts on this page. '), 'Drafts: the look only, not checked yet. They may still change. ',
      h('a', { href: `#${TOAST.route}` }, 'The toast over a sheet or a banner'), ' and ', h('a', { href: `#${SQUEEZE.route}` }, 'a long title at the largest text'), ' (two drafts)',
      '. ', h('a', { href: `#${TILES.route}` }, 'The bottom bar with painted icons'), ' is no longer a draft: you approved it, and it is checked. Everything else here is checked.')),
    nav,
    h('div', { class: 'bc-wrap' }, notice),
    main, iconDialog);
  marks.views.add(() => {
    notice.hidden = marks.state !== 'off' && marks.state !== 'slow' && marks.writable;
    notice.textContent = marks.state === 'off' ? 'Marks are not kept in this view. Open this page in Claude, signed in, to mark states and icons.'
      : marks.state === 'slow' ? 'Your marks can’t be reached yet. They appear when the store answers.' : 'You can look and try everything here. Only the page’s owner can mark.';
  });
  const views = new Map();
  buildTest();
  const show = () => {
    let name = location.hash.slice(1);
    if (name === 'test') { showTest(); return; }
    if (test.open) hideTest();
    if (last[name]) name = last[name];
    const { section, part } = routes.get(name) ?? routes.get(last.bars);
    const moved = page.route !== part.route || !views.size;
    Object.assign(page, { section: section.id, route: part.route, back: part.route });
    last[section.id] = part.route;
    if (!views.has(part.route)) {
      const view = h('section', { class: 'bc-view', id: `bc-view-${part.route}` });
      views.set(part.route, view);
      main.append(view);
      part.build(view);
    }
    for (const [route, view] of views) view.hidden = route !== part.route;
    sections.forEach((s, i) => {
      links[i].setAttribute('href', `#${last[s.id]}`);
      if (s === section) links[i].setAttribute('aria-current', 'page'); else links[i].removeAttribute('aria-current');
    });
    sub.hidden = section.parts.length < 2;
    sub.replaceChildren(h('div', { class: 'bc-wrap bc-subnav-row' }, section.parts.map(p => h('a', { class: 'bc-chip', href: `#${p.route}`, 'aria-current': p === part ? 'page' : null },
      p.title, h('span', { class: 'bc-count' }, String(p.count))))));
    const current = sub.querySelector('[aria-current]');
    if (current) current.parentElement.scrollLeft = Math.max(0, current.offsetLeft - 16);
    // A new sub-part starts at its top, under the row of views.
    if (moved && window.scrollY > nav.offsetTop) window.scrollTo(0, nav.offsetTop);
    if (section.id === 'bars') recrop();
    iconShown.get(part.route)?.();
  };
  window.addEventListener('hashchange', show);
  textListeners.add(() => { iconShown.get(page.route)?.(); });
  show();
  startMarks();
}
build();
