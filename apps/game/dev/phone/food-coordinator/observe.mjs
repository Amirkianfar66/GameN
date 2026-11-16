globalThis[Symbol.for('mothership:dev-only')]=true;

import {createFoodTrialTrace, foodInputKind} from './trace.mjs';

const taskActions = {release: 'PANEL_RELEASE', lock: 'PANEL_LOCK', key: 'KEY', hold: 'HOLD_DOWN'};
const requestActions = {ask: 'TASK_ASK', join: 'JOIN', decline: 'DECLINE', withdraw: 'TASK_ASK_WITHDRAW'};
const controls = {
  PANEL_RELEASE: '.fs-ctl[data-act="release"]', PANEL_LOCK: '.fs-ctl[data-act="lock"]',
  KEY: '.fs-ctl[data-act="key"]', HOLD_DOWN: '.fs-ctl[data-act="hold"]', HOLD_UP: '.fs-ctl[data-act="hold"]',
  TASK_ASK: '[data-food="ask"]', JOIN: '[data-food="join"]', DECLINE: '[data-food="decline"]',
  TASK_ASK_WITHDRAW: '[data-food="withdraw"]',
};
const keyPress = event => event.key === ' ' || event.key === 'Enter';
const disabled = node => node.disabled || node.getAttribute('aria-disabled') === 'true' || !!node.closest('[inert]');

export function observeFoodTrial(root, {seatId}) {
  const document = root.ownerDocument, win = document.defaultView;
  const trace = createFoodTrialTrace({now: () => win.performance.now(), timeOriginMs: win.performance.timeOrigin, seatId});
  const heldPointers = new Set(), heldKeys = new Set(), scheduled = new Set();
  const frames = [];
  let droppedFrames = 0;
  let activeEvent = null, controller = null, stop = null, generation = 0;

  const surface = () => root.querySelector('.planet-food.ph:not([hidden])');
  const control = kind => controls[kind] ? surface()?.querySelector(controls[kind]) : null;
  const visible = () => document.visibilityState === 'visible';

  function arm(event, kind, node) {
    activeEvent = {event, kind, number: trace.input({
      kind, eventType: event.type, trusted: event.isTrusted, disabled: node ? disabled(node) : null,
    })};
  }

  function capture(event) {
    const node = event.target?.closest?.('.planet-food.ph .fs-ctl, .planet-food.ph button[data-food]');
    const own = node && root.contains(node) ? node : null;
    const kind = own && taskActions[own.dataset.act];
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      if (heldPointers.delete(event.pointerId)) arm(event, 'HOLD_UP', own);
      return;
    }
    if (event.type === 'keyup') {
      if (heldKeys.delete(event.key)) arm(event, 'HOLD_UP', own);
      return;
    }
    if (event.type === 'pointerdown' && kind && event.button === 0 && event.isPrimary !== false) {
      if (kind === 'HOLD_DOWN' && !disabled(own)) heldPointers.add(event.pointerId);
      arm(event, kind, own);
    } else if (event.type === 'keydown' && kind && keyPress(event) && !event.repeat) {
      if (kind === 'HOLD_DOWN' && !disabled(own)) heldKeys.add(event.key);
      arm(event, kind, own);
    } else if (event.type === 'click' && own) {
      const clickKind = requestActions[own.dataset.food] ?? (event.detail === 0 ? kind : null);
      if (clickKind) arm(event, clickKind, own);
    }
  }

  const inputEvents = ['pointerdown', 'pointerup', 'pointercancel', 'keydown', 'keyup', 'click'];
  for (const type of inputEvents) win.addEventListener(type, capture, true);
  function invalidate() {
    generation++;
    activeEvent = null;
    heldPointers.clear();
    heldKeys.clear();
  }
  function visibility() { if (!visible()) invalidate(); }
  win.addEventListener('blur', invalidate);
  document.addEventListener('visibilitychange', visibility);

  function frame(callback) {
    const handle = win.requestAnimationFrame(() => {
      scheduled.delete(handle);
      callback();
    });
    scheduled.add(handle);
  }

  function afterRender(callback) {
    if (!callback || !visible()) return;
    const current = generation;
    const stillCurrent = () => visible() && current === generation;
    // Two rAFs bracket a rendering opportunity. This does not use a layout
    // read or claim a hardware/compositor timestamp.
    frame(() => { if (stillCurrent()) frame(() => { if (stillCurrent()) callback(); }); });
  }

  function pending(request) {
    const feedback = controller?.getModel().feedback;
    trace.feedback(feedback);
    const kind = foodInputKind(request.command);
    const shown = () => {
      const f = controller?.getModel().feedback, node = control(kind);
      if (f?.commandId !== request.commandId || f.status !== 'sending' || !node || node.closest('[hidden]')) return false;
      return node.hasAttribute('data-sending') || node.getAttribute('aria-busy') === 'true'
        || (!node.classList.contains('fs-ctl') && disabled(node));
    };
    if (shown()) afterRender(trace.pendingDom(request.commandId, shown));
  }

  function outcome(kind) {
    const model = controller?.getModel(), board = surface(), task = model?.view?.participantTask;
    if (!model?.fresh || !board) return false;
    if (kind === 'TASK_ASK') return model.view.invitation?.state === 'PENDING' && !!board.querySelector('[data-food="wait"]');
    if (!task || board.dataset.screen !== 'food-task') return false;
    if (kind === 'JOIN') return !!board.querySelector('.fs-screen');
    if (kind === 'PANEL_RELEASE') return !task.panel.locked && !!control('PANEL_LOCK');
    if (kind === 'PANEL_LOCK') return task.panel.locked && !!control('PANEL_RELEASE');
    if (kind === 'HOLD_DOWN') return !!task.ownGesture?.currentHolder && !!control(kind)?.hasAttribute('data-holding');
    if (kind === 'HOLD_UP') {
      const gesture = task.ownGesture, hold = control(kind);
      return !!gesture && gesture.currentHolder === null && gesture.pendingIntent === null
        && (hold?.getAttribute('aria-pressed') === 'false' || !!control('KEY'));
    }
    return kind === 'KEY' && task.people.some(person => person.seatId === seatId && person.keyTurned)
      && (!!control(kind)?.hasAttribute('data-turned') || !!board.querySelector('[aria-label="Delivered"]'));
  }

  return {
    attach(foodController) {
      controller = foodController;
      stop?.();
      stop = controller.subscribe(model => trace.feedback(model.feedback));
    },
    wrapFoodTransport(transport) {
      return {...transport,
        command(request) {
          // eventPhase is NONE after native dispatch. A microtask can run between
          // the capture and target listeners of a trusted browser event.
          const marker = activeEvent?.event.eventPhase && activeEvent.kind === foodInputKind(request.command)
            ? activeEvent.number : null;
          return trace.dispatch(request, marker, () => {
            // Keep observations off the original send path after dispatch.
            const reply = transport.command(request);
            pending(request);
            return reply;
          });
        },
        receipt(context) { return trace.lookup(context, () => transport.receipt(context)); },
      };
    },
    // Drive this only after audience/epoch validation. The app still parses the
    // exact same public, own and ordinary values that its production path uses.
    project(packet, marker, forward) {
      const receivedAtMs = marker?.receivedAtMs ?? win.performance.now();
      const view = packet.food?.playerView;
      forward(packet);
      if (!view) return;
      const model = controller?.getModel(), displayed = model?.view;
      const accepted = () => {
        const current = controller?.getModel();
        return !!current?.fresh && current.view?.phaseId === view.phaseId && current.view?.viewRevision === view.viewRevision;
      };
      if (!displayed || displayed.serverNowMs !== view.serverNowMs || !accepted()) return;
      if (frames.length < 512) {
        frames.push({receivedAtMs, domObservedAtMs: win.performance.now(), sequence: marker?.sequence ?? null,
          stage: view.participantTask?.stage ?? null, surfaceVisible: !!surface()});
      } else droppedFrames++;
      if (!marker) return;
      for (const confirm of trace.projected(marker, kind => accepted() && outcome(kind))) afterRender(confirm);
    },
    invalidate,
    report() {
      return {...trace.report(), viewport: {width: win.innerWidth, height: win.innerHeight},
        motion: surface()?.dataset.motion ?? null, visible: visible(), frames: structuredClone(frames), droppedFrames,
        paintBoundary: 'Observed DOM state and a subsequent visible rendering opportunity'};
    },
    dispose() {
      invalidate();
      stop?.();
      controller = null;
      for (const handle of scheduled) win.cancelAnimationFrame(handle);
      scheduled.clear();
      for (const type of inputEvents) win.removeEventListener(type, capture, true);
      win.removeEventListener('blur', invalidate);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
