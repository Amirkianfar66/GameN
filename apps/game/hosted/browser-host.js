// Browser mounting for the hosted playtest. No fixture state or operator controls.
import { openRoomMovement } from './room-movement.mjs';
import { createComicMotion } from './comic-motion.mjs';
import { fitBoard } from './board-layout.mjs';
import { createStripCues } from './strip-cues.mjs';
import { parseShellIntent, planRedraw, SHELL_IDS, splitRegions } from '@mothership/presentation';

// A command identifier is random and means nothing. randomUUID needs a secure context,
// required by the hosted transport; the fallback covers a browser that lacks the method.
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
export function mountScreen({ container, screen, render, subscribeExtra = () => () => {}, onDispose = () => {} }) {
  const root = document.createElement('div');
  const polite = liveRegion('polite');
  const assertive = liveRegion('assertive');
  // The layer a moving character is carried in. Outside the redrawn shell, so a redraw never
  // cuts a flight short, and over every room, so a flight is never clipped by a panel.
  const fx = document.createElement('div');
  fx.className = 'phone-fx';
  fx.setAttribute('aria-hidden', 'true');
  container.replaceChildren(root, polite, assertive, fx);

  const comicMotion = createComicMotion(root, { fx });
  const stripCues = createStripCues(root);
  let rootAttributes = {};
  let drawn = null;
  let spokenSeq = 0;
  let focusSeq = 0;
  let privacyEpoch = 0;
  let privateWasOpen = false;
  let phoneView = 'board';
  let phoneFocus = null;
  let phoneNotice = null;
  let phoneOpener = '#ms-phone-actions';
  const inertNodes = new Set();

  function applyRootAttributes(next) {
    for (const name of Object.keys(rootAttributes)) if (!(name in next)) root.removeAttribute(name);
    for (const [name, value] of Object.entries(next)) {
      if (rootAttributes[name] !== value) root.setAttribute(name, value === true ? '' : String(value));
    }
    rootAttributes = next;
  }

  function draw() {
    const beforeMotion = comicMotion.before();
    const frame = screen.getFrame();
    if (!frame.model.match?.privateArea?.open && privateWasOpen && ['actions', 'role'].includes(phoneView)) phoneView = 'board';
    if (frame.model.match?.result && ['actions', 'role'].includes(phoneView)) phoneView = 'board';
    if (!frame.model.match?.privateArea?.open) phoneNotice = null;
    const split = splitRegions(render(frame.model, { phoneView, phoneNotice }));
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
    const sheet = root.querySelector('.ms-private[data-open="true"]');
    for (const node of inertNodes) node.inert = false;
    inertNodes.clear();
    const compact = root.querySelector('.phone-nav') !== null;
    if (sheet && !compact) {
      const phaseBottom = root.querySelector('.ms-phase')?.getBoundingClientRect().bottom ?? 0;
      sheet.style.setProperty('--phone-sheet-top', `${Math.max(0, phaseBottom) + 8}px`);
      for (const node of root.querySelectorAll('.ms-main > *, .ms-header, .ms-footer')) {
        if (node === sheet || node.contains(sheet)) continue;
        node.inert = true; inertNodes.add(node);
      }
    }
    const opened = Boolean(sheet) && !privateWasOpen;
    privateWasOpen = Boolean(sheet);
    // Stations and bands first, so motion measures where every character finally stands.
    fitBoard(root);
    comicMotion.after(frame.model, beforeMotion);
    stripCues.after();
    const focusWasReplaced = hadFocus && !root.contains(document.activeElement);
    if (document.title !== frame.model.title) document.title = frame.model.title;

    if (frame.focus !== null && frame.focus.seq !== focusSeq) {
      focusSeq = frame.focus.seq;
      document.getElementById(frame.focus.targetId)?.focus();
    } else if (focusWasReplaced) {
      const target = candidates.map(id => document.getElementById(id)).find(element => element !== null) ?? document.getElementById(SHELL_IDS.main);
      target?.focus({ preventScroll: true });
    }

    if (phoneFocus) { root.querySelector(phoneFocus)?.focus({ preventScroll: true }); phoneFocus = null; }
    else if (opened) root.querySelector('#ms-private-heading')?.focus({ preventScroll: true });

    // Private content left the screen: private lines that were spoken leave the document too.
    if (frame.privacyEpoch !== privacyEpoch) {
      privacyEpoch = frame.privacyEpoch;
      for (const line of container.querySelectorAll('[data-private="true"]')) line.remove();
    }
    // Two channels, never mixed: what anyone could be told, then what is this seat's alone.
    for (const [line, isPrivate] of [[frame.announcement, false], [frame.privateAnnouncement, true]]) {
      if (line === null || line.seq <= spokenSeq) continue;
      spokenSeq = line.seq;
      speak(container, line.politeness === 'assertive' ? assertive : polite, line.text, isPrivate);
    }
  }

  // A control says what it is for and, where it stands for one, which seat, action or choice. The shared parser decides
  // whether that is an intent at all; this host assembles none of its own.
  function onClick(event) {
    const room = event.target instanceof Element ? event.target.closest('button[data-move-room]') : null;
    if (room && root.contains(room)) {
      phoneOpener = `#${room.id}`;
      phoneView = 'actions'; phoneNotice = null;
      phoneNotice = openRoomMovement(screen, room.dataset.moveRoom);
      phoneFocus = phoneNotice ? '#ms-private-heading' : null; draw(); return;
    }
    const tab = event.target instanceof Element ? event.target.closest('button[data-phone-view]') : null;
    if (tab && root.contains(tab)) {
      if (tab.disabled) return;
      let view = tab.dataset.phoneView;
      if (!['board', 'actions', 'role', 'more'].includes(view)) return;
      if (view === phoneView && view !== 'board') view = 'board';
      if (view !== 'board') phoneOpener = `#${tab.id}`;
      phoneView = view; phoneNotice = null;
      phoneFocus = view === 'more' ? '#phone-menu-heading' : ['actions', 'role'].includes(view) ? '#ms-private-heading' : phoneOpener;
      const needsPrivate = view === 'actions' || view === 'role';
      if (needsPrivate !== Boolean(screen.getFrame().model.match?.privateArea?.open)) screen.dispatch({ type: 'private/toggle' });
      else draw();
      return;
    }
    const control = event.target instanceof Element ? event.target.closest('button[data-intent]') : null;
    if (control === null || !root.contains(control) || control.disabled) return;
    if (control.dataset.intent === 'action/pass') {
      if (!screen.getFrame().model.match?.passTurn.available) return;
      phoneView = 'board'; phoneNotice = null;
      if (screen.getFrame().model.match?.privateArea?.open) screen.dispatch({ type: 'private/toggle' });
      phoneFocus = '#ms-action-step';
      screen.dispatch({ type: 'action/pass' });
      draw();
      return;
    }
    const intent = parseShellIntent(control.dataset.intent, { seatId: control.dataset.targetSeat, kind: control.dataset.kind, value: control.dataset.value });
    if (intent !== null) { phoneNotice = null; screen.dispatch(intent); }
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
  const onBlur = () => { if (screen.getFrame().model.match?.privateArea?.open) { phoneView = 'board'; screen.dispatch({ type: 'private/toggle' }); } };
  function onKeyDown(event) {
    const sheet = root.querySelector('.ms-private[data-open="true"]');
    // Escape steps back like the strip's own Back control while a choice is being made or
    // confirmed; with nothing chosen, Back puts the action down and the tray is shown again.
    const unsent = root.querySelector('.phone-action-dock .phone-strip > .ms-card__state:is([data-step="choosing"], [data-step="confirming"])');
    if (event.key === 'Escape' && unsent && phoneView === 'actions') {
      event.preventDefault(); phoneNotice = null;
      screen.dispatch({ type: 'action/back' });
      return;
    }
    if (event.key === 'Escape' && phoneView !== 'board') {
      event.preventDefault(); phoneView = 'board'; phoneNotice = null; phoneFocus = phoneOpener;
      if (screen.getFrame().model.match?.privateArea?.open) screen.dispatch({ type: 'private/toggle' });
      else draw();
      return;
    }
    if (!sheet) return;
    if (root.querySelector('.phone-nav') || event.key !== 'Tab') return;
    const controls = [...sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), summary, [tabindex="0"]')]
      .filter(node => !node.hidden && node.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first) return;
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };


  const stopFrames = screen.subscribe(draw);
  const stopExtra = subscribeExtra(draw);
  // A rotation, a resized window or a keyboard opening refits the board; nothing else is redrawn.
  const resized = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fitBoard(root)) : null;
  resized?.observe(root);
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  root.addEventListener('keydown', onKeyDown);
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
    stopExtra();
    onDispose();
    resized?.disconnect();
    comicMotion.dispose();
    stripCues.dispose();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    root.removeEventListener('keydown', onKeyDown);
    for (const node of inertNodes) node.inert = false;
    inertNodes.clear();
    motion.removeEventListener('change', onMotion);
    screen.dispose();
    container.replaceChildren();
  }
  // A page kept in the back/forward cache would otherwise hold its feed open.
  window.addEventListener('pagehide', unmount, { once: true });
  return unmount;
}
