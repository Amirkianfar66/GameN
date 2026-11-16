// mothership:dev-only
//
// What the Food component's two preview pages share: the phone they draw in, the pictures, and the sample states.
// Nothing here is in the component's runtime graph.
//
// The states are of four kinds, all synthetic:
//   packet     Frontend's five inputs, unchanged (food-component-preview-inputs.json): the inputs the component
//              takes, as given. "food-panel-18" is a synthetic equivalent, not a connected payload.
//   variant    One of those five with this phone's own press changed, to show a refused and a recovered press.
//   case       One of Frontend's native fixtures (apps/game/dev/phone/food/native-fixtures.json), an authorized
//              synthetic Food view at a fixed time. Frontend's own controller (createFoodTaskController), given
//              that view, says what is offered; inputsFromModel() below turns its model into the component's
//              inputs. That mapping is the adapter Frontend writes, shown here for the preview only.
//   notice     The shared display's notice, from invented public facts.
// The two pages take the same state: index.html draws it with the component, port.html with the frozen port.

import packet from './food-component-preview-inputs.json';
import fixtures from '../../../../../apps/game/dev/phone/food/native-fixtures.json';
import { createFoodTaskController } from '@mothership/game';
import { loadArt } from '../../../../../apps/game/hosted/art.mjs';
import { setCrewPictureSurface } from '../../../../../apps/game/hosted/crew-runtime.mjs';
import { createFoodAssets, FOOD_ASSET_PATHS } from '../../../../../apps/game/hosted/planet/food-assets.mjs';
import { FOOD_VIEW_KEYS, foodIdentities, foodModel, foodNow, foodOrdinary, nextFoodInput } from '../food-input.mjs';

export const SIZES = Object.freeze({ '390x844': Object.freeze([390, 844]), '430x932': Object.freeze([430, 932]) });
/** The review frames' safe areas, as Frontend's packet gives them. A real phone gives its own through env(). */
export const SAFE = Object.freeze({ top: packet.reviewDefaults.syntheticSafeAreaInsetsPx.top, bottom: packet.reviewDefaults.syntheticSafeAreaInsetsPx.bottom });
/** The stand-ins for the ordinary app's own bars, which the Food surface is laid out against where it draws none. Their heights are not the game's. */
export const ORDINARY_BARS = Object.freeze({ header: 56, nav: 64 });
/** The game's text sizes (apps/game/hosted/planet/preferences.mjs): Standard, Large, Largest. */
export const TEXTS = Object.freeze({ 1: 'Standard', 1.5: 'Large', 2: 'Largest' });

const params = new URL(location.href).searchParams;
export const QUERY = Object.freeze({
  state: params.get('state') ?? 'food-panel-03',
  size: SIZES[params.get('size')] ? params.get('size') : '390x844',
  single: params.get('single') === '1',
  motion: params.get('motion') === 'reduced' ? 'reduced' : 'normal',
  text: TEXTS[Number(params.get('text'))] ? Number(params.get('text')) : 1,
  probe: params.get('probe') === '1',
  // For the check's control only: a packet's or a variant's clock moved by this many ms, which must show.
  nudge: Number.isFinite(Number(params.get('nudge'))) ? Number(params.get('nudge')) : 0,
});

const pick = (value, keys) => Object.fromEntries(keys.filter(key => key in value).map(key => [key, value[key]]));
const frameOf = part => packet.frames.find(frame => frame.part === part);
/** A packet frame's input as the component takes it: the fixed clock becomes { now() }. */
function packetInput(frame, changes = {}) {
  const { clock, ...rest } = structuredClone(frame.input);
  return { ...rest, clock: { now: () => clock.nowMs + QUERY.nudge }, ...changes };
}

/** This phone's own press, changed on one of the five inputs. The view is Frontend's, unchanged. */
const VARIANTS = Object.freeze({
  'variant-lock-refused': { title: 'Panel: LOCK was not done', from: 'food-panel-04',
    changes: f => ({ sending: { ...f.input.sending, feedback: { key: 'preview-lock-refused', name: 'LOCK', status: 'rejected', recovered: false } } }) },
  'variant-release-recovered': { title: 'Panel: RELEASE went through, found again after a lost answer', from: 'food-panel-04',
    changes: f => ({ sending: { ...f.input.sending, feedback: { key: 'preview-release-recovered', name: 'RELEASE', status: 'accepted', recovered: true } } }) },
  'variant-release-unknown': { title: 'Panel: RELEASE, answer unknown', from: 'food-panel-03',
    changes: f => ({ sending: { ...f.input.sending, feedback: { key: 'preview-release-unknown', name: 'RELEASE', status: 'unknown', recovered: false } } }) },
});

/** Frontend's native fixtures used here, each a plain authorized view with no staged press. `open` is the sheet to open. */
const CASES = Object.freeze({
  'food-winch-01': {}, 'food-winch-02': {}, 'food-winch-06': {}, 'food-winch-08': {}, 'food-winch-13': {}, 'food-winch-14': {}, 'food-winch-17': {},
  'food-panel-01': {}, 'food-panel-06': {}, 'food-panel-09': {}, 'food-panel-13': {}, 'food-panel-16': {}, 'food-panel-17': {},
  'food-flow-01': { open: 'tasks' }, 'food-flow-02': { open: 'partners' }, 'food-flow-03': {}, 'food-flow-04': {}, 'food-flow-09': {},
  'food-states-14': { open: 'howto' },
  // No Food step: the surface draws nothing, and the ordinary header (a stand-in here) holds the gauge.
  'food-flow-13': { gauge: true }, 'food-flow-15': { gauge: true }, 'food-flow-16': { gauge: true },
});
/** The packet names five of the fixtures' parts; here the fixture's own state has another name, so the two never pass for each other. */
const caseId = id => `case-${id}`;

/** The shared display's notice: public facts only. */
const NOTICES = Object.freeze({
  'notice-away': { title: 'Shared display: two players are away', steps: [{ step: { kind: 'AWAY' }, stock: { doses: 2 } }] },
  'notice-stock': { title: 'Shared display: the stock rose', steps: [{ step: null, stock: { doses: 2 } }, { step: null, stock: { doses: 12 } }] },
  'notice-stale': { title: 'Shared display: reconnecting, nothing shown', steps: [{ step: { kind: 'AWAY' }, stock: { doses: 2 }, status: 'stale' }] },
});

export const STATES = Object.freeze([
  ...packet.frames.map(frame => ({ id: frame.part, kind: 'packet', title: frame.provenance,
    synthetic: frame.part === 'food-panel-18' ? "Frontend's packet: a synthetic equivalent (a retained RELEASE-capable view marked stale), not a connected payload" : "Frontend's packet: a reconstructed synthetic input" })),
  ...Object.entries(VARIANTS).map(([id, v]) => ({ id, kind: 'variant', title: v.title, synthetic: `${v.from} of Frontend's packet with this phone's own press changed` })),
  ...Object.keys(CASES).map(id => ({ id: caseId(id), fixture: id, kind: 'case', title: fixtures.cases.find(c => c.id === id).title, synthetic: `Frontend's native fixture ${id}, on Frontend's own controller` })),
  ...Object.entries(NOTICES).map(([id, n]) => ({ id, kind: 'notice', title: n.title, synthetic: 'Public facts, invented for this preview' })),
]);

/** Frontend's adapter, as this preview writes it: the controller's model and the same response's public facts, as the component's inputs. */
export function inputsFromModel(model, { people, board, viewer, navigation, clock }) {
  const f = model.feedback, receipt = f?.receipt ?? null;
  return {
    view: model.view === null ? null : pick(model.view, FOOD_VIEW_KEYS),
    can: { ask: model.canAsk, answer: model.canAnswer, withdraw: model.canWithdraw, hold: model.canHold, panelRelease: model.canPanelRelease, panelLock: model.canPanelLock, key: model.canKey },
    sending: { pendingCount: model.pendingCount, physicalHolding: model.physicalHolding, needsContactOff: model.needsContactOff,
      feedback: f === null ? null : { key: f.commandId, name: f.name, status: f.status, recovered: f.recovered,
        request: receipt?.status === 'accepted' && receipt.result.kind === 'REQUEST' ? { requestId: receipt.result.requestId, state: receipt.result.state } : null,
        closure: receipt?.status === 'rejected' ? receipt.requestClosure ?? null : null } },
    status: !model.visible ? 'concealed' : model.fresh ? 'live' : 'stale',
    clock, people, board, viewer, navigation,
  };
}

/** One of Frontend's fixtures on Frontend's own controller: no server, a fixed clock, nothing stored. A press is sent to nobody and never answered. */
function caseSituation(id) {
  const record = structuredClone(fixtures.cases.find(c => c.id === id).native.initial), value = record.value, view = value.foodPlayerView, now = record.now;
  let stored = null, sequence = 0;
  const sent = [];
  const controller = createFoodTaskController(
    { currentUid: () => 'food-preview', refresh() {}, command(request) { sent.push(structuredClone(request)); return new Promise(() => {}); }, receipt: async () => ({ receipt: null, serverTimeMs: now }) },
    { clock: { now: () => now }, scheduler: { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: handle => clearTimeout(handle) }, ids: { next: () => `preview-${++sequence}` },
      recovery: { load: () => stored, save: v => { stored = v; }, clear: () => { stored = null; } } },
    { binding: { uid: 'food-preview', matchId: value.matchId, seatId: view.seatId }, readClock: () => ({ status: 'synced', serverNowMs: now, uncertaintyMs: 0 }) });
  controller.observe(view, { matchId: value.matchId, versions: view.versions, phaseId: view.phaseId, round: view.round, serverNowMs: view.serverNowMs });
  const ordinary = value.playerView, phase = ordinary.phase;
  const context = {
    people: value.members.map(m => ({ seatId: m.seatId, name: m.displayName, character: m.characterId })),
    board: { seats: ordinary.board.seats.map(s => ({ seatId: s.seatId, location: s.location })), activeSeatId: ordinary.activeSeatId,
      phase: { kind: phase.kind, remainingMs: Math.max(0, phase.endsAt - now) } },
    viewer: { promiseOfferCount: 0 }, navigation: { openPanel: 'board', boardMode: 'room' }, clock: { now: () => now },
  };
  return { controller, context, sent, open: CASES[id]?.open ?? null, gauge: CASES[id]?.gauge ? view.stock.doses : null };
}
/** Any of Frontend's fixtures on Frontend's own controller, for the probe: the component's inputs, and the controller they come from. */
export function fixtureSituation(id) {
  const { controller, context, sent } = caseSituation(id);
  return { input: { ...inputsFromModel(controller.getModel(), context), reducedMotion: false }, live: { controller, context, sent } };
}

/**
 * The state the page was asked for.
 *   surface 'phone':   { input, controller, identities, ordinary, open, gauge, live } — `input` for the component;
 *                      `controller`, `identities` and `ordinary` are what the frozen port's renderer takes for the same
 *                      state. `open` names a sheet to open, `gauge` the doses for the ordinary header's gauge. `live` is
 *                      set for a case: Frontend's controller, and the context for the adapter, so the page can run it.
 *   surface 'display': { steps } — the notice's inputs, in order.
 */
export function situation(id = QUERY.state) {
  const state = STATES.find(s => s.id === id);
  if (!state) throw new Error(`No preview state "${id}"`);
  if (state.kind === 'notice') return { state, surface: 'display', steps: NOTICES[id].steps };
  const reduced = QUERY.motion === 'reduced';
  if (state.kind === 'case') {
    const { controller, context, sent, open, gauge } = caseSituation(state.fixture), input = { ...inputsFromModel(controller.getModel(), context), reducedMotion: reduced };
    const checked = nextFoodInput(undefined, input);
    return { state, surface: 'phone', input, controller, identities: () => foodIdentities(checked), ordinary: () => foodOrdinary(checked), open, gauge, expected: null,
      live: { controller, context, sent } };
  }
  const frame = frameOf(state.kind === 'variant' ? VARIANTS[id].from : id);
  const input = { ...packetInput(frame, state.kind === 'variant' ? VARIANTS[id].changes(frame) : {}), reducedMotion: reduced };
  // The frozen port reads a controller: for a packet's input it is given the model the component builds from that same input.
  const checked = nextFoodInput(undefined, input), listeners = new Set();
  const controller = { getModel: () => foodModel(checked, foodNow(checked)), subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
    holdDown: () => false, holdUp() {}, press: async () => {}, ask: async () => {}, answer: async () => {}, withdraw: async () => {}, setVisible() {} };
  return { state, surface: 'phone', input, controller, identities: () => foodIdentities(checked), ordinary: () => foodOrdinary(checked), open: null, gauge: null,
    expected: state.kind === 'packet' ? frame.expected : null, live: null };
}

/** The phone the surface is drawn in: its size, the review frames' safe areas, and labelled stand-ins for the ordinary app's bars and board. */
export function phone(document, sizeKey = QUERY.size, { display = false } = {}) {
  const [width, height] = SIZES[sizeKey], el = document.createElement('div');
  el.className = 'preview-phone';
  el.dataset.size = sizeKey;
  Object.assign(el.style, { width: `${width}px`, height: `${height}px` });
  el.style.setProperty('--preview-safe-t', `${SAFE.top}px`);
  el.style.setProperty('--preview-safe-b', `${SAFE.bottom}px`);
  const board = document.createElement('div'), header = document.createElement('div'), nav = document.createElement('div'), host = document.createElement('div');
  board.className = 'preview-board';
  board.textContent = display ? "Stand-in · the shared display's own board" : "Stand-in · the ordinary app's own board";
  // The class names are the ordinary app's: the frozen port's notice measures ".planet-header" itself.
  header.className = 'planet-header preview-ordinary';
  header.style.height = `${SAFE.top + ORDINARY_BARS.header}px`;
  header.textContent = display ? "Stand-in · the shared display's header" : "Stand-in · the ordinary app's header";
  nav.className = 'planet-nav preview-ordinary';
  nav.style.height = `${ORDINARY_BARS.nav + SAFE.bottom}px`;
  nav.textContent = "Stand-in · the ordinary app's bar";
  host.className = 'preview-host';
  // The shared display has no bar below.
  el.append(board, header, ...(display ? [] : [nav]), host);
  // Where the ordinary header holds its Food gauge: Frontend's own wrapper, as apps/game/hosted/planet/render.mjs writes it.
  const gaugeSlot = document.createElement('span');
  gaugeSlot.className = 'planet-food fs-clock preview-gauge';
  header.append(gaugeSlot);
  /** The stand-ins' own heights, in CSS px: what the app gives the surface as `bars`. */
  const bars = () => ({ top: SAFE.top + ORDINARY_BARS.header, bottom: display ? 0 : ORDINARY_BARS.nav + SAFE.bottom });
  /** What the app does with the surface's ownership: it hides its own bars while Food draws them, and its board during a Task. */
  const owns = ({ active = false, exclusive = false } = {}) => { el.dataset.foodChrome = String(!!active); el.dataset.foodExclusive = String(!!exclusive); };
  owns();
  return { el, host, header, nav, gaugeSlot, bars, owns, size: { width, height } };
}

/**
 * Opens the sheet a state asks for: "Start a Task" as the app's Actions entry opens it (`openTasks`), then the
 * surface's own rows, as a player would tap them (and as Frontend's harness does).
 */
export function openSheet(host, open, openTasks) {
  if (!open) return;
  openTasks();
  if (open !== 'tasks') host.querySelector(`.planet-food [data-go="${open}"]`)?.click();
  if (open === 'partners') host.querySelector('.planet-food [data-partner="seat-3"]')?.click();
}

/** The hosted game's own pictures, loaded as the game loads them: its art bundles, the crew's portraits and the Food drawings. */
export async function pictures(document, root, versions) {
  setCrewPictureSurface(root, versions);
  const assets = createFoodAssets(document);
  await Promise.all([loadArt('player', document), assets.load()]);
  await document.fonts.ready;
  return assets;
}
/** The versions every sample state is pinned to. */
export const VERSIONS = Object.freeze(structuredClone(packet.frames[0].input.view.versions));

/** Applies the query's text size, as the game's settings do: the root's size, 100 % at Standard. */
export function applyText(document) {
  document.documentElement.style.fontSize = `${QUERY.text * 100}%`;
}

/** Two animation frames, so that what was asked for is drawn. */
export const drawn = win => new Promise(done => win.requestAnimationFrame(() => win.requestAnimationFrame(() => done())));
/**
 * Brings the page to rest at one moment, so that two captures of a state are the same picture: every animation and
 * transition is paused at `ms`, the spinners among them.
 *
 * Ending one fade can start another. With Reduce motion the kit gives every element an 80 ms transition on every
 * property, so a hint whose tone has just been set fades its colour, and the text that inherits that colour starts
 * a fade of its own when the hint's ends. One pass would leave that second fade running under the capture. So what
 * starts afterwards is held too, until two frames pass with nothing new.
 */
export async function freeze(document, ms = 300) {
  const held = new Set();
  const hold = () => {
    let added = 0;
    for (let fresh; (fresh = document.getAnimations().filter(animation => !held.has(animation))).length;) {
      for (const animation of fresh) { animation.pause(); animation.currentTime = ms; held.add(animation); }
      added += fresh.length;
      if (held.size > 400) throw new Error('freeze: the page keeps starting animations');
    }
    return added;
  };
  hold();
  for (let turn = 0; turn < 20; turn += 1) {
    await drawn(document.defaultView);
    if (!hold()) return held.size;
  }
  throw new Error('freeze: the page keeps starting animations');
}

/** The loader's pictures are object URLs, new on every page: named here, so that two pages' drawings can be compared. */
function pictureNames(assets) {
  const names = new Map();
  if (!assets) return names;
  if (assets.back) names.set(assets.back, 'supply-room.back.svg');
  for (const path of FOOD_ASSET_PATHS) {
    const match = /^operators\/(c[1-9])-(panel|winch)-(alive|out)\.svg$/.exec(path);
    const url = match ? assets.operator(match[2], match[1], match[3] === 'out') : null;
    if (url) names.set(url, path);
  }
  return names;
}

/** What a page shows of its Food frame, for the checks: the DOM as text, with nothing that differs by page. */
export function describe(root, assets = null) {
  const frame = root.querySelector('.planet-food.ph');
  if (!frame) return { present: false };
  const origin = root.getBoundingClientRect(), names = pictureNames(assets);
  const box = el => { const r = el.getBoundingClientRect(); return [r.left - origin.left, r.top - origin.top, r.width, r.height].map(n => Math.round(n * 100) / 100); };
  const shown = el => !el.closest('[hidden]');
  const html = frame.outerHTML.replace(/blob:[^"')\s&]+/g, url => `picture:${names.get(url) ?? 'unknown'}`);
  const active = frame.ownerDocument.activeElement;
  return {
    present: true, hidden: frame.hidden, screen: frame.dataset.screen ?? null, motion: frame.dataset.motion ?? null,
    html, text: frame.innerText, pictures: [...new Set(html.match(/picture:[^"')\s&]+/g) ?? [])].sort(),
    controls: [...frame.querySelectorAll('.fs-ctl')].filter(shown).map(node => ({ act: node.dataset.act, enabled: node.getAttribute('aria-disabled') !== 'true', busy: node.getAttribute('aria-busy') === 'true',
      label: node.querySelector('.fs-label')?.firstChild?.textContent ?? null, sub: node.querySelector('.fs-sub')?.textContent ?? null, box: box(node) })),
    reconnecting: [...frame.querySelectorAll('.fs-banner')].filter(shown).some(node => /Reconnecting…/.test(node.textContent)),
    portraits: [...frame.querySelectorAll('.tb-who .pt')].filter(shown).map(box),
    notices: [...frame.querySelectorAll('.fs-banner > *')].filter(shown).map(box),
    boxes: Object.fromEntries(['.tb', '.fs-view', '.fs-art > svg', '.fs-role', '.fs-hint', '.fs-dock', '.fs-strip', '.fs-meter-wrap', '.fs-controls', '.tabs', '.sheet', '.fs-card', '.fs-banner']
      .map(selector => [selector, [...frame.querySelectorAll(selector)].filter(shown).map(box)]).filter(([, list]) => list.length)),
    focus: frame.contains(active) ? (active.id || String(active.className) || active.tagName) : null,
  };
}
