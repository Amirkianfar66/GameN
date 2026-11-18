// The Food surface: Designer's runtime component (design/phone-ui/components/food).
//
// It draws what the frozen native port draws: the Food surface's own top bar and tabs, the Task screen for both
// controls, every Food sheet and card, and the shared display's notice. The drawing is the port's own, copied
// file by file (sources.json lists each copy, its pinned source and every difference; a test holds them to it).
// This module is the part that is new: it gives that drawing its inputs and reports what the player does.
//
//   const food = mountFood(host, input, handlers);    // a player's phone
//   food.update(changes); food.suspend(); food.resume(); food.dispose();
//   food.openTasks(); food.close();                   // the Actions entry opens "Start a Task"
//   food.relayout();                                  // after the game's text size changes
//   const notice = mountFoodNotice(host, input);      // the shared display: update, dispose
//   foodGauge(document, doses);                       // the ordinary header's gauge, as a node
//
// It reports intents and sends nothing: no request, no timer of its own, no storage. Frontend keeps the
// controller, the contact adapter (createFoodHoldInput), the picture loader, blur, focus and visibility, and the
// ordinary app's own header and styles. The stylesheets are imported by food-render.mjs, as the port imports them.

import { hasCrewDrawing } from '../../../../apps/game/hosted/crew-runtime.mjs';
import { mountFoodRenderer } from './food-render.mjs';
import { mountFoodPublic } from './food-notice.mjs';
import { createFoodUi } from './food-ui.mjs';
import { foodGauge as gaugeNode } from './food-gauge.mjs';
import { FOOD_DEFAULTS, FOOD_NOTICE_DEFAULTS, foodIdentities, foodModel, foodNoticeModel, foodNow, foodOrdinary, nextFoodInput, nextFoodNoticeInput } from './food-input.mjs';

export {
  FOOD_ANSWERS, FOOD_CAN, FOOD_CLOSURE_KEYS, FOOD_DEFAULTS, FOOD_NAVIGATION_TARGETS, FOOD_NOTICE_DEFAULTS, FOOD_PRESSES, FOOD_PRIVATE_INPUTS, FOOD_STATUSES, FOOD_VERSION, FOOD_VIEW_KEYS,
  nextFoodInput, nextFoodNoticeInput,
} from './food-input.mjs';

/** Every intent the surface reports. Each is optional; a name that is not one of these is refused. */
export const FOOD_HANDLERS = Object.freeze(['onHold', 'onLetGo', 'onReleaseAll', 'onPress', 'onAsk', 'onAnswer', 'onWithdraw', 'onNavigate', 'onSurface', 'onBars']);
const HOST_CLASS = 'planet-food-host';
/** What setCrewPictureSurface(root, versions) leaves on the app's root for versions that have the crew drawing. */
const CREW_SURFACE = '[data-crew-art="crew-drawing-1.0.0"]';

function hostOf(host, name) {
  if (!host || host.nodeType !== 1 || !host.ownerDocument?.defaultView) throw new TypeError(`${name} needs a host element in a page`);
  return host;
}
/**
 * The top bar's portraits are the game's own pictures. For a view whose versions have the crew drawing, the game's
 * art sheet gives them to the element the app marked with setCrewPictureSurface(root, versions) and to what is inside
 * it. A host outside it would be drawn with blank portraits, so a view there is refused, like any input the surface
 * cannot draw. Nothing is drawn of a concealed surface or with no view, so nothing is asked of the host then.
 */
function crewSurfaceOf(host, input) {
  if (input.status === 'concealed' || input.view === null || !hasCrewDrawing(input.view.versions)) return;
  if (!host.closest(CREW_SURFACE)) throw new TypeError('Food: the host must be inside the game\'s crew picture surface: mark the app\'s root with setCrewPictureSurface(root, versions) before giving the surface a view');
}

/**
 * A player's phone.
 *
 * Contacts on Hold are reported, never matched here: `onHold(contact)` when a pointer, a key or an assistive
 * activation goes down on it, `onLetGo(contact)` for every pointer and key that comes up anywhere on the page (one
 * set of window listeners per mount, as the port keeps them), and `onReleaseAll()` whenever everything must be let
 * go. A contact is `{ pointerId }`, `{ key, repeat }` or `{ assistive: true }`; an up carries `{ pointerId }` or
 * `{ key }`. Which contact holds, and whether a press may become a DOWN at all, is createFoodHoldInput's.
 */
export function mountFood(host, input = {}, handlers = {}) {
  const document = hostOf(host, 'mountFood').ownerDocument, win = document.defaultView;
  if (handlers === null || typeof handlers !== 'object') throw new TypeError('Food: the handlers must be an object');
  for (const [name, handler] of Object.entries(handlers)) {
    if (!FOOD_HANDLERS.includes(name)) throw new TypeError(`Food: there is no "${name}" to report`);
    if (handler !== undefined && typeof handler !== 'function') throw new TypeError(`Food: ${name} must be a function`);
  }
  const on = { ...handlers };
  const deviceReduced = win.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const hadClass = host.classList.contains(HOST_CLASS);
  const listeners = new Set();
  let current = nextFoodInput(FOOD_DEFAULTS, input), identities = foodIdentities(current), ordinary = foodOrdinary(current);
  crewSurfaceOf(host, current);
  let renderer = null, suspended = false, disposed = false, layoutDue = false;
  let owned = { active: false, exclusive: false }, measured = { top: null, bottom: null };

  /** A handler's own failure is the app's to see, and never stops the surface drawing. */
  function say(name, ...args) {
    const handler = on[name];
    if (!handler) return;
    try { handler(...args); } catch (error) { win.queueMicrotask(() => { throw error; }); }
  }
  const live = () => !disposed && current.status === 'live';
  const scoped = value => value.status !== 'concealed' && value.view !== null;

  // What the port's renderer read from Frontend's controller, built from the inputs alone.
  const controller = {
    getModel: () => foodModel(current, foodNow(current)),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    press(name) { if (live()) say('onPress', name); },
    ask(seatId) { if (live()) say('onAsk', seatId); },
    answer(answer) { if (live()) say('onAnswer', answer); },
    withdraw() { if (live()) say('onWithdraw'); },
  };
  // Where the port built createFoodHoldInput. The same calls, in the same places, now report.
  const contacts = {
    pointerDown(pointerId) { say('onHold', { pointerId }); return true; },
    pointerUp(pointerId) { say('onLetGo', { pointerId }); },
    keyDown(key, repeat = false) { say('onHold', { key, repeat: !!repeat }); return true; },
    keyUp(key) { say('onLetGo', { key }); },
    assistiveClick() { say('onHold', { assistive: true }); },
    releaseAll() { say('onReleaseAll'); },
    dispose() {},
  };
  // The pictures may arrive, or change, after the mount: the drawing asks for them on every frame, and is told when
  // the loader says they came (where the loader offers `subscribe`, as Frontend's food-assets.mjs does).
  const arrivals = new Set();
  let unwatch = null;
  const arrived = () => { if (!suspended) for (const listener of [...arrivals]) listener(); };
  function watch() {
    unwatch?.();
    const end = typeof current.assets?.subscribe === 'function' ? current.assets.subscribe(arrived) : null;
    unwatch = typeof end === 'function' ? end : null;
  }
  const assets = {
    get back() { return current.assets?.back ?? null; },
    operator: (...args) => current.assets?.operator(...args) ?? null,
    subscribe(listener) { arrivals.add(listener); return () => arrivals.delete(listener); },
  };
  /** What Food covers is reported apart from what its bars measure, each when it changes. */
  function surface(next) {
    const ownership = { active: !!next.active, exclusive: !!next.exclusive }, bars = { top: next.top ?? null, bottom: next.bottom ?? null };
    if (ownership.active !== owned.active || ownership.exclusive !== owned.exclusive) { owned = ownership; say('onSurface', { ...ownership }); }
    if (bars.top !== measured.top || bars.bottom !== measured.bottom) { measured = bars; say('onBars', { ...bars }); }
  }
  function mount() {
    renderer = mountFoodRenderer(host, controller, {
      identities: () => identities, ordinary: () => ordinary, assets, contacts, surface,
      preferences: () => ({ reduced: current.reducedMotion || !!deviceReduced?.matches }),
      navigate: target => say('onNavigate', target), settings: () => say('onNavigate', 'settings'),
      boardMode: () => current.navigation.boardMode, bars: () => current.bars,
    });
    layoutDue = false;
    if (suspended) renderer.suspend();
  }
  /** Concealed, the surface is taken down, not hidden: its page, its listeners and everything it remembered of this viewer. */
  function unmount() {
    if (!renderer) return;
    renderer.dispose();
    renderer = null;
    listeners.clear();
  }
  function draw() {
    if (!renderer || suspended) return;
    if (layoutDue) { layoutDue = false; renderer.relayout(); } else for (const listener of [...listeners]) listener();
  }

  watch();
  if (current.status !== 'concealed') { mount(); draw(); }

  return Object.freeze({
    /**
     * Each key given replaces that key, and the rest stay. A change that is refused changes nothing.
     * Concealed, nothing of the viewer is kept (nextFoodInput): a later change of status alone shows nothing again.
     */
    update(changes = {}) {
      if (disposed) return;
      const before = current, next = nextFoodInput(current, changes);
      crewSurfaceOf(host, next);
      // Concealed: everything is let go first, while the app can still be told; then the surface is taken down; and
      // only then is what was held of the viewer dropped.
      if (next.status === 'concealed') unmount();
      current = next;
      identities = foodIdentities(current);
      ordinary = foodOrdinary(current);
      if (current.assets !== before.assets) watch();
      if (current.status === 'concealed') return;
      // Losing the view while shown (Food is over for this viewer) lets everything go as well.
      if (scoped(before) && !scoped(current)) say('onReleaseAll');
      if (!renderer) mount();
      draw();
    },
    /** Lets every contact go, then stops the frames. */
    suspend() {
      if (disposed || suspended) return;
      suspended = true;
      renderer?.suspend();
    },
    /** Draws the current state at the current time and starts the frames again. A cue's age is its own server time, so nothing replays. */
    resume() {
      if (disposed || !suspended) return;
      suspended = false;
      renderer?.resume();
      if (layoutDue) draw();
    },
    /** Lays the surface out again. Call it after the game's text size changes: the styles are in rem, the measures are not. Suspended, it is done on resume. */
    relayout() {
      if (disposed) return;
      layoutDue = true;
      draw();
    },
    /** The Actions entry: opens "Start a Task". */
    openTasks() { if (!disposed) renderer?.openTasks(); },
    /** Closes whichever Food sheet is open. */
    close() { if (!disposed) renderer?.close(); },
    /** Lets every contact go, clears what Food covers, removes the surface and its listeners, and keeps nothing of the viewer. Safe to call twice. */
    dispose() {
      if (disposed) return;
      unmount();
      disposed = true;
      current = nextFoodInput(current, { status: 'concealed' });
      identities = [];
      ordinary = null;
      unwatch?.();
      unwatch = null;
      arrivals.clear();
      if (!hadClass) host.classList.remove(HOST_CLASS);
    },
  });
}

/**
 * The shared display's notice: the "two players are away" banner and the stock's rise. It takes the finalized
 * public stock and step, this screen's status and the ordinary header's height. Nothing of a viewer.
 */
export function mountFoodNotice(host, input = {}) {
  hostOf(host, 'mountFoodNotice');
  const hadClass = host.classList.contains(HOST_CLASS);
  let current = nextFoodNoticeInput(FOOD_NOTICE_DEFAULTS, input), listener = null, disposed = false;
  const notice = mountFoodPublic(host, {
    subscribe(next) { listener = next; next(foodNoticeModel(current)); return () => { listener = null; }; },
    top: () => current.bars.top,
  });
  return Object.freeze({
    update(changes = {}) {
      if (disposed) return;
      current = nextFoodNoticeInput(current, changes);
      listener?.(foodNoticeModel(current));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      notice.dispose();
      if (!hadClass) host.classList.remove(HOST_CLASS);
    },
  });
}

const uis = new WeakMap();
/** The ordinary header's Food gauge, as the port draws it: a node for `doses`, or null when there is nothing to show. The header that holds it stays Frontend's. */
export function foodGauge(document, doses) {
  let ui = uis.get(document);
  if (!ui) { ui = createFoodUi(document); uis.set(document, ui); }
  return gaugeNode(ui, doses);
}
