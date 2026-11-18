// mothership:dev-only
//
// The bars and icons control: one page for the owner's review of every bar and every icon, on a phone.
//   Bars     each state of the top bar, the bottom bar, what lies over the room and the sheet frame, as a
//            true-size strip of the phone, drawn by the runtime component itself (../components/phone-shell)
//   Test     the whole phone, live: the shell fills the screen, with the room scene in its room area, and a
//            control for every switch (states.mjs)
//   Icons    every icon of the one source (../components/icons.mjs), in both forms, and the game's own icons
//            that are still drawn differently (apps/game/hosted/planet/phone-controls.mjs)
//   Status   what the page is built from, and the owner's marks
// The owner marks a state or an icon OK or Change, with a note; the marks are kept in the page's store, which
// the Designer team reads. Nothing here is the game: synthetic fixtures, no match, no rule. It is published
// as a private test page by design/tools/bars-icons-control.mjs, which bundles it and gives it the art.

import '../components/phone-shell/phone-shell.css';
import '../components/room-scene/room-scene.css';
import './control.css';
import { PHONE_SHELL_VERSION, mountPhoneShell } from '../components/phone-shell/phone-shell.mjs';
import { COMPONENT_KIT_VERSION } from '../components/kit/kit.mjs';
import { ICONS, ICON_FAMILY_VERSION, ICON_NAMES, iconSvg } from '../components/icons.mjs';
import { ROOM_SCENE_VERSION, mountRoomScene } from '../components/room-scene/room-scene.mjs';
import { phoneIcon } from '../../../apps/game/hosted/planet/phone-controls.mjs';
import { BASE, GROUPS, PRESETS, SWITCHES, clockSeconds, matchPreset, presetOf, sceneInput, sheetContent, shellInput } from './states.mjs';

const doc = document, root = doc.documentElement;
/** What the build gives the page: the source commit, the build time and the icons page's table. */
const DATA = (() => { try { return JSON.parse(doc.getElementById('bc-data')?.textContent ?? '{}'); } catch { return {}; } })();
const VIEWS = Object.freeze(['bars', 'icons', 'status']);
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
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
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
const page = { text: 100, view: 'bars', back: 'bars' };
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
  whole: { from: 'whole', parts: [], pad: 0 },
});
function standIn(text, className = 'bc-standin') { return h('div', { class: className }, text); }

function makeStrip(preset) {
  const phone = h('div', { class: 'bc-phone', inert: true });
  const scaler = h('div', { class: 'bc-scaler' }, phone);
  const open = () => openTest(preset.key);
  const windowEl = h('div', { class: 'bc-window', role: 'button', tabindex: '0', 'aria-label': `Open “${preset.label}” in the test view`,
    onclick: open, onkeydown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } } }, scaler);
  const card = h('article', { class: 'bc-strip', id: `bc-strip-${preset.key}` },
    h('header', { class: 'bc-strip-head' },
      h('h3', { class: 'bc-strip-title' }, preset.label),
      h('span', { class: 'bc-tag' }, `Sheet ${preset.sheet}`)),
    windowEl,
    h('div', { class: 'bc-strip-foot' }, markControl(`bar-${preset.key}`, { label: preset.label, group: preset.groupTitle })));
  const strip = { preset, card, phone, scaler, windowEl, shell: null, toast: 0, timer: null };
  strips.push(strip);
  return strip;
}
function mountStrip(strip) {
  if (strip.shell) return;
  const { preset, phone } = strip;
  phone.style.width = `${stripWidth()}px`;
  phone.style.height = `${STRIP_HEIGHT}px`;
  const input = () => ({ ...shellInput(preset.controls, { toastId: `strip-${preset.key}-${strip.toast}` }), insets: { top: 0, bottom: 0 } });
  strip.shell = mountPhoneShell(phone, input(), { onLayout: () => cropStrip(strip) });
  const words = sheetContent(preset.controls);
  if (words && strip.shell.sheetBody) strip.shell.sheetBody.append(standIn(words, 'bc-standin-sheet'));
  if (preset.crop === 'whole') strip.shell.stage.append(standIn(sceneInput(preset.controls, { clock: null }).standIn ?? 'The room'));
  // A toast shows once and fades: a strip shows it again every few seconds.
  if (preset.controls.toast !== 'none') strip.timer = setInterval(() => { if (page.view === 'bars' && !test.open) { strip.toast += 1; strip.shell.update(input()); frames(2).then(() => cropStrip(strip)); } }, 3400);
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
  let top = 0, height = STRIP_HEIGHT;
  if (crop.from === 'top' && rects.length) height = Math.min(STRIP_HEIGHT, Math.max(...rects.map(r => r.bottom)) + crop.pad);
  if (crop.from === 'bottom' && rects.length) { top = Math.max(0, Math.min(...rects.map(r => r.top)) - crop.pad); height = STRIP_HEIGHT - top; }
  const available = windowEl.clientWidth || width;
  const scale = Math.min(1, available / width) * (crop.from === 'whole' ? 0.62 : 1);
  phone.style.top = `${-top}px`;
  scaler.style.width = `${width}px`;
  scaler.style.height = `${height}px`;
  scaler.style.transform = `translateX(-50%) scale(${scale})`;
  windowEl.style.height = `${Math.round(height * scale)}px`;
  windowEl.dataset.scale = scale === 1 ? 'true size' : `${Math.round(scale * 100)} %`;
}
function buildBars(view) {
  const lazy = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { lazy.unobserve(entry.target); mountStrip(strips.find(s => s.card === entry.target)); }
  }, { rootMargin: '900px 0px' });
  const textChoice = segmented('Text size', TEXT_SIZES.map(([value, text]) => [value, text]), page.text, setTextSize);
  textListeners.add(percent => textChoice.choose(percent));
  view.append(h('div', { class: 'bc-wrap bc-tools' },
    h('button', { type: 'button', class: 'bc-primary', onclick: () => openTest(test.presetKey ?? 'own') }, icon('phone', { filled: true }), 'Open the test view'),
    textChoice,
    h('p', { class: 'bc-hint' }, 'Each strip is the real bar, at this phone’s size. Tap a strip to open it on the whole phone.')));
  view.append(h('nav', { class: 'bc-wrap bc-jump', 'aria-label': 'Groups' }, GROUPS.map(group => h('a', { href: '#bars', onclick: event => { event.preventDefault(); doc.getElementById(`bc-group-${group.id}`).scrollIntoView({ block: 'start' }); } }, group.title, h('span', { class: 'bc-count' }, String(group.presets.length))))));
  for (const group of GROUPS) {
    const section = h('section', { class: 'bc-group', id: `bc-group-${group.id}` },
      h('div', { class: 'bc-wrap bc-group-head' }, h('h2', {}, group.title), h('p', {}, group.note)),
      h('div', { class: 'bc-strips' }, group.presets.map(preset => { const strip = makeStrip(preset); lazy.observe(strip.card); return strip.card; })));
    view.append(section);
  }
  const recrop = () => frames(3).then(() => { for (const strip of strips) cropStrip(strip); });
  textListeners.add(recrop);
  let resize = null;
  window.addEventListener('resize', () => { clearTimeout(resize); resize = setTimeout(() => {
    const width = stripWidth();
    for (const strip of strips) if (strip.shell) strip.phone.style.width = `${width}px`;
    recrop();
  }, 160); });
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
    const words = sheetContent(c);
    body.replaceChildren(...(words ? [standIn(words, 'bc-standin-sheet')] : []));
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
}
function buildTest() {
  const selectRow = (id, label, options, value, onChange) => {
    const select = h('select', { id, class: 'bc-select', onchange: () => onChange(select.value) }, options.map(([v, text]) => h('option', { value: v }, text)));
    select.value = value;
    return { row: h('div', { class: 'bc-row' }, h('label', { for: id }, label), select), select };
  };
  test.device = h('div', { class: 'bc-device' });
  test.caption = h('div', { class: 'bc-caption', role: 'status', 'aria-live': 'polite' });
  const float = h('div', { class: 'bc-float', role: 'toolbar', 'aria-label': 'Test view' },
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Leave the test view', onclick: closeTest }, icon('close')),
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Previous state', onclick: () => stepPreset(-1) }, icon('chevronLeft')),
    h('button', { type: 'button', class: 'bc-float-btn', 'aria-label': 'Next state', onclick: () => stepPreset(1) }, icon('chevronRight')),
    h('button', { type: 'button', class: 'bc-float-btn bc-float-main', 'aria-label': 'Open the control', onclick: () => setDrawer(true) }, icon('settings', { filled: true })));
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
  if (page.view !== 'test') page.back = page.view;
  test.pending = preset;
  if (location.hash !== '#test') location.hash = 'test'; else showTest();
}
function showTest() {
  const preset = test.pending ?? presetOf(test.presetKey ?? 'own');
  test.pending = null;
  test.open = true;
  page.view = 'test';
  test.el.hidden = false;
  doc.body.dataset.test = '';
  if (test.safe === null) { test.safe = wide() ? 'notch' : 'screen'; test.safeSelect.value = test.safe; }
  setDrawer(wide());
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
const iconsState = { filled: false, ground: 'glass' };
function iconCell(name) {
  const meta = ICONS[name];
  const cell = h('button', { type: 'button', class: 'bc-icon', 'data-icon': name, 'aria-label': `${meta.label} · ${name}`, onclick: () => openIcon(name) },
    h('span', { class: 'bc-icon-art' }), h('span', { class: 'bc-icon-name' }, name), h('span', { class: 'bc-icon-dot', 'aria-hidden': 'true' }));
  const paint = () => {
    cell.firstChild.replaceChildren(icon(name, { filled: iconsState.filled }));
    cell.dataset.mark = marks.map.get(`icon-${name}`)?.status ?? '';
  };
  marks.views.add(paint);
  paint();
  return { cell, paint };
}
let iconDialog = null;
function openIcon(name) {
  const meta = ICONS[name], more = DATA.icons?.[name] ?? null;
  const big = filled => h('figure', { class: 'bc-big' }, h('div', { class: 'bc-big-art' }, icon(name, { filled, size: 96 })), h('figcaption', {}, filled ? 'Selected' : 'At rest'));
  const fact = (term, value) => (value ? [h('dt', {}, term), h('dd', {}, value)] : []);
  iconDialog.replaceChildren(
    h('header', { class: 'bc-dialog-head' }, h('div', {}, h('p', { class: 'bc-eyebrow' }, GROUP_NAMES[meta.group] ?? meta.group), h('h2', {}, meta.label)),
      h('button', { type: 'button', class: 'bc-ghost', onclick: () => iconDialog.close() }, 'Close')),
    h('div', { class: 'bc-big-row', 'data-ground': iconsState.ground }, big(false), big(true),
      h('figure', { class: 'bc-big' }, h('div', { class: 'bc-big-art bc-big-true' }, icon(name), icon(name, { filled: true })), h('figcaption', {}, 'Game size · 24 px'))),
    h('dl', { class: 'bc-facts' }, fact('Name', h('code', {}, name)), fact('Drawn at', more ? h('code', {}, `icons.mjs · line ${more.line}`) : null),
      fact('Used by', more?.usedBy ?? null), fact('In the phone pack', more ? (more.pack ? 'Yes' : 'No') : null)),
    markControl(`icon-${name}`, { label: `${meta.label} (${name})`, group: 'Icons' }));
  iconDialog.showModal();
}
function buildIcons(view) {
  const cells = [];
  const repaint = () => { grid.dataset.ground = iconsState.ground; for (const c of cells) c.paint(); };
  const grid = h('div', { class: 'bc-icon-groups', 'data-ground': iconsState.ground },
    Object.keys(GROUP_NAMES).map(group => {
      const names = ICON_NAMES.filter(n => ICONS[n].group === group);
      return h('section', { class: 'bc-icon-group' }, h('h2', {}, GROUP_NAMES[group], h('span', { class: 'bc-count' }, String(names.length))),
        h('div', { class: 'bc-icon-grid' }, names.map(name => { const c = iconCell(name); cells.push(c); return c.cell; })));
    }));
  const twice = h('div', { class: 'bc-twice', 'data-ground': 'glass' }, DRAWN_TWICE.map(([ours, theirs, label]) => h('div', { class: 'bc-twice-row' },
    h('span', { class: 'bc-twice-name' }, label),
    h('span', { class: 'bc-twice-art', title: 'The one source' }, icon(ours)),
    h('span', { class: 'bc-twice-art bc-twice-old', title: 'The game’s own, retiring' }, phoneIcon(doc, theirs)))));
  iconDialog = h('dialog', { class: 'bc-dialog', 'aria-label': 'Icon' });
  iconDialog.addEventListener('click', event => { if (event.target === iconDialog) iconDialog.close(); });
  view.append(
    h('div', { class: 'bc-wrap bc-tools' },
      segmented('Form', [['rest', 'At rest'], ['selected', 'Selected']], 'rest', value => { iconsState.filled = value === 'selected'; repaint(); }),
      segmented('Ground', [['glass', 'Dark glass'], ['paper', 'Paper']], 'glass', value => { iconsState.ground = value; repaint(); }),
      h('p', { class: 'bc-hint' }, `${ICON_NAMES.length} icons, one source, one style: a 24 px grid and 1.8 px round strokes. Tap an icon to see it large and mark it.`)),
    h('div', { class: 'bc-wrap' }, grid),
    h('section', { class: 'bc-wrap bc-section' },
      h('h2', {}, 'Drawn twice in the game today', h('span', { class: 'bc-count' }, String(DRAWN_TWICE.length))),
      h('p', { class: 'bc-hint' }, 'Left: the one source. Right: the game’s own drawing, still used inside the Actions, Panels, Promises and Captain sheets. The match screens’ release replaces them with the left column; the Settings button before the match follows with the pre-game screens.'),
      h('div', { class: 'bc-twice-head' }, h('span', {}, ''), h('span', {}, 'One source'), h('span', {}, 'Retiring')),
      twice),
    h('section', { class: 'bc-wrap bc-section' },
      h('h2', {}, 'Other drawings still on screen', h('span', { class: 'bc-count' }, String(STILL_SHOWN.length))),
      h('p', { class: 'bc-hint' }, 'Found by drawing the game at 390 × 844 and listing every picture. Each has an icon in the one source, and a component that will replace it.'),
      h('ul', { class: 'bc-list' }, STILL_SHOWN.map(([where, name, by]) => h('li', {}, h('span', { class: 'bc-list-art', 'data-ground': 'glass' }, icon(name)), h('span', {}, h('strong', {}, where), h('br'), `Replaced by ${by}`))))),
    iconDialog);
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
      row('Top bar, bottom bar, sheet frame, target bar, banners, toast', PHONE_SHELL_VERSION, 'PR #265', 'Frontend’s review'),
      row('Buttons, rows, pills and the other shared controls', COMPONENT_KIT_VERSION, 'PR #265', 'Frontend’s review'),
      row('Every icon', ICON_FAMILY_VERSION, 'PR #313, with its page and test', 'the Lead Designer’s review'),
      row('The bars connected in the game', 'test release 2', 'PR #307', 'Frontend’s review and Integration’s approval'),
      row('The room behind the bars', ROOM_SCENE_VERSION, 'PR #261 · shown for context, not part of this control', 'the new painted rooms')),
    h('h2', {}, 'What it is not'),
    h('ul', { class: 'bc-plain' },
      h('li', {}, 'Not the game: no match, no rule, no real player. Names and seats are invented.'),
      h('li', {}, 'A sheet’s content, the private talk’s capsule and the films are other builders’ parts, shown as labelled stand-ins.'),
      h('li', {}, 'A browser on your phone, inside this page’s frame: the bars are true size, the phone’s height is the frame’s.')),
    h('p', { class: 'bc-built' }, DATA.commit ? `Built from ${DATA.branch} at ${DATA.commit.slice(0, 8)} · ${DATA.built}` : 'An unbundled copy: no build facts.')));
  paint();
}

// ── The page ─────────────────────────────────────────────────────────
function build() {
  const app = doc.getElementById('bc-app') ?? doc.body.appendChild(h('div', { id: 'bc-app' }));
  const views = Object.fromEntries(VIEWS.map(name => [name, h('section', { class: 'bc-view', id: `bc-view-${name}`, hidden: true })]));
  const links = VIEWS.map(name => h('a', { href: `#${name}`, class: 'bc-nav-link' }, name[0].toUpperCase() + name.slice(1)));
  const notice = h('p', { class: 'bc-notice', role: 'status', hidden: true });
  app.append(
    h('header', { class: 'bc-head' }, h('div', { class: 'bc-wrap' },
      h('p', { class: 'bc-eyebrow' }, 'Game N · phone'),
      h('h1', {}, 'Bars & Icons Control'),
      h('p', { class: 'bc-lede' }, 'Every state of the top bar, the bottom bar and the sheet frame, and every icon, drawn by the game’s own files. Look, try, then mark each one OK or Change.'))),
    h('nav', { class: 'bc-nav', 'aria-label': 'Views' }, h('div', { class: 'bc-wrap bc-nav-row' }, links)),
    h('div', { class: 'bc-wrap' }, notice),
    h('main', {}, Object.values(views)));
  marks.views.add(() => {
    notice.hidden = marks.state !== 'off' && marks.state !== 'slow' && marks.writable;
    notice.textContent = marks.state === 'off' ? 'Marks are not kept in this view. Open this page in Claude, signed in, to mark states and icons.'
      : marks.state === 'slow' ? 'Your marks can’t be reached yet. They appear when the store answers.' : 'You can look and try everything here. Only the page’s owner can mark.';
  });
  const built = new Set();
  const builders = { bars: buildBars, icons: buildIcons, status: buildStatus };
  buildTest();
  const show = () => {
    const name = location.hash.slice(1);
    if (name === 'test') { showTest(); return; }
    if (test.open) hideTest();
    const view = VIEWS.includes(name) ? name : 'bars';
    page.view = view;
    if (!built.has(view)) { built.add(view); builders[view](views[view]); }
    for (const v of VIEWS) views[v].hidden = v !== view;
    links.forEach((link, i) => { if (VIEWS[i] === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    if (view === 'bars') frames(2).then(() => { for (const strip of strips) cropStrip(strip); });
  };
  window.addEventListener('hashchange', show);
  show();
  startMarks();
}
build();
