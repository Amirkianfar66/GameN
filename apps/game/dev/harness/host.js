// mothership:dev-only
//
// Browser host for a headless screen controller: draws its frames into the page and
// forwards input and platform signals back. This is the interim renderer used by the
// fixture harness. It holds no game state and makes no decision of its own.

import { cuesAlreadyIn, parseShellIntent, planCues, planRedraw, SHELL_IDS, splitRegions } from '@mothership/presentation';

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

// A command identifier is random and means nothing. randomUUID needs a secure context,
// which a loopback address is; the fallback covers a browser that lacks the method.
function randomId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return [...crypto.getRandomValues(new Uint8Array(16))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// The one thing kept across a reload: the identifiers of a command whose outcome is not yet
// known. Session storage is per tab and ends with it. The client core decides what goes in
// and takes it out again as soon as the outcome is known; it never puts a target there.
const UNRESOLVED_KEY = 'mothership:unresolved-command';
const unresolvedCommandStore = {
  load: () => window.sessionStorage.getItem(UNRESOLVED_KEY),
  save: value => window.sessionStorage.setItem(UNRESOLVED_KEY, value),
  clear: () => window.sessionStorage.removeItem(UNRESOLVED_KEY),
};

/** Ports backed by the browser. performance.now() is monotonic and ignores the wall clock. */
export function browserPorts() {
  return {
    clock: { now: () => performance.now() },
    scheduler: {
      setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimeout: handle => window.clearTimeout(handle),
    },
    ids: { next: randomId },
    unresolved: unresolvedCommandStore,
  };
}

/** How long a spoken line stays in the document before it is taken out again. */
const SPOKEN_LINE_LIFETIME_MS = 15_000;

// The longest a cue may last, from the token stylesheet. A mark is taken off again after
// this long whatever the stylesheet did with it, so nothing a cue adds can stay.
function longestBeatMs() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--ms-motion-beat-max').trim();
  const ms = /^\d+(\.\d+)?ms$/.test(value) ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(ms) ? ms : 1_000;
}

// A log, not a single slot: two announcements in quick succession are both read, in order,
// instead of the second overwriting the first before a screen reader reaches it.
function liveRegion(politeness) {
  const region = document.createElement('div');
  region.className = 'ms-visually-hidden';
  region.id = `ms-live-${politeness}`;
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'false');
  region.setAttribute('aria-relevant', 'additions');
  return region;
}

function speak(container, region, text, isPrivate) {
  // The latest word about a command replaces the earlier ones, in either region, so someone
  // reading the page line by line never finds "result unknown" next to "registered".
  if (isPrivate) for (const earlier of container.querySelectorAll('[data-private="true"]')) earlier.remove();
  const line = document.createElement('p');
  // Marked so it can be taken out of the document the moment the private panel closes.
  if (isPrivate) line.dataset.private = 'true';
  line.textContent = text;
  region.append(line);
  // Each line leaves by itself, whether or not anything is said after it.
  window.setTimeout(() => line.remove(), SPOKEN_LINE_LIFETIME_MS);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.container Emptied and owned by the mount.
 * @param {import('@mothership/game').ScreenController<any>} options.screen
 * @param {(model: any) => import('@mothership/presentation').MarkupElement} options.render
 * @returns {() => void} Unmount: removes every listener and disposes the screen.
 */
export function mountScreen({ container, screen, render }) {
  const root = document.createElement('div');
  const polite = liveRegion('polite');
  const assertive = liveRegion('assertive');
  container.replaceChildren(root, polite, assertive);

  let rootAttributes = {};
  let drawn = null;
  // One mark per channel: public and private lines are numbered apart.
  const spoken = { public: 0, private: 0 };
  let focusSeq = 0;
  let privacyEpoch = 0;
  // Cues already in the frame this host starts on are not its to play. One mark per list:
  // the two are numbered apart.
  let cuesShown = cuesAlreadyIn(screen.getFrame().cues, screen.getFrame().privateCues);
  const cueTimers = new Map();

  // A cue is a mark on the elements it is about, and the stylesheet does the rest. The mark
  // changes no text, takes no focus and blocks nothing; a redraw that replaces the element
  // simply ends it. Marking adds nothing private: the place for a private cue exists only
  // inside the open private panel.
  function playCue({ at, name }) {
    for (const element of root.querySelectorAll(`[data-cue-at="${CSS.escape(at)}"]`)) {
      window.clearTimeout(cueTimers.get(element));
      // Taking the mark off and reading a layout value makes the browser start afresh
      // when the same element is cued again before the last cue has finished.
      element.removeAttribute('data-cue');
      void element.offsetWidth;
      element.setAttribute('data-cue', name);
      cueTimers.set(element, window.setTimeout(() => {
        cueTimers.delete(element);
        element.removeAttribute('data-cue');
      }, longestBeatMs()));
    }
  }

  function applyRootAttributes(next) {
    for (const name of Object.keys(rootAttributes)) if (!(name in next)) root.removeAttribute(name);
    for (const [name, value] of Object.entries(next)) {
      if (rootAttributes[name] !== value) root.setAttribute(name, value === true ? '' : String(value));
    }
    rootAttributes = next;
  }

  function draw() {
    const frame = screen.getFrame();
    const split = splitRegions(render(frame.model));
    applyRootAttributes(split.rootAttrs);

    // Only what changed is replaced, so focus and reading position elsewhere survive a
    // countdown tick. The plan says what to redraw and in which order; this host carries it out.
    const active = document.activeElement;
    const hadFocus = active instanceof HTMLElement && root.contains(active);
    // Where focus may go if what holds it is redrawn away: the element with the same id,
    // then whatever each region around it names, innermost first.
    const candidates = [];
    if (hadFocus) {
      if (active.id !== '') candidates.push(active.id);
      for (let region = active.closest('[data-region]'); region !== null; region = region.parentElement?.closest('[data-region]') ?? null) {
        if (region.dataset.focusFallback) candidates.push(region.dataset.focusFallback);
      }
    }
    const plan = planRedraw(drawn, split);
    if (plan.frame !== null) root.innerHTML = plan.frame;
    for (const step of plan.steps) {
      const selector = step.into === 'slot' ? `[data-region-slot="${CSS.escape(step.id)}"]` : `[data-region="${CSS.escape(step.id)}"]`;
      root.querySelector(selector).outerHTML = step.html;
    }
    drawn = split;
    const focusWasReplaced = hadFocus && !root.contains(document.activeElement);
    if (document.title !== frame.model.title) document.title = frame.model.title;

    if (frame.focus !== null && frame.focus.seq !== focusSeq) {
      focusSeq = frame.focus.seq;
      document.getElementById(frame.focus.targetId)?.focus();
    } else if (focusWasReplaced) {
      const target = candidates.map(id => document.getElementById(id)).find(element => element !== null) ?? document.getElementById(SHELL_IDS.main);
      target?.focus({ preventScroll: true });
    }

    // Private content left the screen: private lines that were spoken leave the document too.
    if (frame.privacyEpoch !== privacyEpoch) {
      privacyEpoch = frame.privacyEpoch;
      for (const line of container.querySelectorAll('[data-private="true"]')) line.remove();
    }
    // Two channels, never mixed: what anyone could be told, then what is this seat's alone.
    for (const [line, isPrivate] of [[frame.announcement, false], [frame.privateAnnouncement, true]]) {
      const channel = isPrivate ? 'private' : 'public';
      if (line === null || line.seq <= spoken[channel]) continue;
      spoken[channel] = line.seq;
      speak(container, line.politeness === 'assertive' ? assertive : polite, line.text, isPrivate);
    }

    // Last, on the document as it now stands: each cue of this frame not yet shown, once.
    const cues = planCues(cuesShown, frame.cues, frame.privateCues);
    cuesShown = cues.shown;
    for (const mark of cues.marks) playCue(mark);
    // Timers of elements a redraw has since replaced have nothing left to do.
    for (const [element, timer] of cueTimers) {
      if (root.contains(element)) continue;
      window.clearTimeout(timer);
      cueTimers.delete(element);
    }
  }

  // A control says what it is for and, for a target, which seat. The shared parser decides
  // whether that is an intent at all; this host assembles none of its own.
  function onClick(event) {
    const control = event.target instanceof Element ? event.target.closest('button[data-intent]') : null;
    if (control === null || !root.contains(control)) return;
    const intent = parseShellIntent(control.dataset.intent, { seatId: control.dataset.targetSeat });
    if (intent !== null) screen.dispatch(intent);
  }
  function onChange(event) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement)) return;
    const intent = parseShellIntent(control.dataset.intent, { checked: control.checked });
    if (intent !== null) screen.dispatch(intent);
  }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = () => screen.setDeviceReducedMotion(motion.matches);
  const onVisibility = () => screen.setPageVisible(document.visibilityState === 'visible');

  const stopFrames = screen.subscribe(draw);
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotion);

  screen.setDeviceReducedMotion(motion.matches);
  screen.start();
  draw();
  if (document.visibilityState !== 'visible') screen.setPageVisible(false);

  let mounted = true;
  function unmount() {
    if (!mounted) return;
    mounted = false;
    stopFrames();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', onMotion);
    screen.dispose();
    for (const timer of cueTimers.values()) window.clearTimeout(timer);
    cueTimers.clear();
    container.replaceChildren();
  }
  // A page kept in the back/forward cache would otherwise hold its feed open.
  window.addEventListener('pagehide', unmount, { once: true });
  return unmount;
}
