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

// Both samples come from the authorized task model and its actual visible DOM.
// A pre-existing state or a different contact is not this input's result.
export function foodRenderEffect(request, before, after) {
  const command = request.command;
  if (command.type !== 'TASK_PRESS' || !before || !after
    || [before, after].some(state => state.taskId !== command.taskId || state.controlSessionId !== command.controlSessionId)) return null;
  const {input} = command;
  if (input.kind === 'PANEL_RELEASE' && before.panel === 'release' && after.panel === 'lock') return 'Panel moving';
  if (input.kind === 'PANEL_LOCK' && before.panel === 'lock' && after.panel === 'release') return 'Panel locked';
  if (input.kind === 'KEY' && before.key === 'available' && ['turned', 'delivered'].includes(after.key)) {
    return after.key === 'delivered' ? 'Delivered' : 'Key turned';
  }
  if (input.kind !== 'HOLD') return null;
  if (input.edge === 'UP') {
    return before.hold?.sequence === input.gestureSequence && ['held', 'pending'].includes(before.hold.state)
      && after.hold?.state === 'off' ? 'Hold cleared' : null;
  }
  if (after.hold?.sequence !== input.gestureSequence || after.hold.crateId !== input.crateId
    || before.hold?.state === after.hold.state) return null;
  return after.hold.state === 'held' ? 'Crate held' : after.hold.state === 'pending' ? 'Hold pending' : null;
}

export function observeFoodTrial(root, {seatId}) {
  const document = root.ownerDocument, win = document.defaultView;
  const trace = createFoodTrialTrace({now: () => win.performance.now(), timeOriginMs: win.performance.timeOrigin, seatId});
  const heldPointers = new Set(), heldKeys = new Set(), scheduled = new Set();
  const frames = [], lifecycle = [];
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
  function noteLifecycle(event) {
    if (lifecycle.length < 64) {
      lifecycle.push({event: event.type, observedAtMs: win.performance.now(), visible: visible(), focused: document.hasFocus(),
        physicalHold: controller?.getModel().physicalHolding ?? false});
    }
    if (event.type === 'blur' || !visible()) invalidate();
  }
  win.addEventListener('blur', noteLifecycle);
  win.addEventListener('focus', noteLifecycle);
  document.addEventListener('visibilitychange', noteLifecycle);

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

  function taskRender() {
    const model = controller?.getModel(), board = surface(), task = model?.view?.participantTask;
    if (!model?.fresh || !task || board?.dataset.screen !== 'food-task') return null;
    const release = control('PANEL_RELEASE'), lock = control('PANEL_LOCK');
    const panel = task.panel.locked && release && !release.closest('[hidden], [inert]') ? 'release'
      : !task.panel.locked && lock && !lock.closest('[hidden], [inert]') ? 'lock' : null;
    const node = control('HOLD_DOWN'), keyNode = control('KEY'), gesture = task.ownGesture;
    let hold = null;
    if (gesture && node && !node.closest('[hidden], [inert]')) {
      if (gesture.currentHolder && node.hasAttribute('data-holding')) hold = {state: 'held', ...gesture.currentHolder};
      else if (gesture.pendingIntent && node.hasAttribute('data-pending')) hold = {state: 'pending', ...gesture.pendingIntent};
      else if (!gesture.currentHolder && !gesture.pendingIntent && node.getAttribute('aria-pressed') === 'false') hold = {state: 'off'};
    }
    if (gesture && !gesture.currentHolder && !gesture.pendingIntent && keyNode && !keyNode.closest('[hidden], [inert]')) {
      hold = {state: 'off'};
    }
    const own = task.people.find(person => person.seatId === seatId);
    const key = own?.keyTurned && board.querySelector('[aria-label="Delivered"]') ? 'delivered'
      : keyNode && !keyNode.closest('[hidden], [inert]') && own
        ? own.keyTurned && keyNode.hasAttribute('data-turned') ? 'turned' : !own.keyTurned ? 'available' : null
        : null;
    return {taskId: task.taskId, controlSessionId: task.controlSessionId, panel, hold, key};
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
      const before = marker?.commandIds.length ? taskRender() : null;
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
      if (!before) return;
      for (const confirm of trace.projected(marker, request => accepted() && foodRenderEffect(request, before, taskRender()))) {
        afterRender(confirm);
      }
    },
    invalidate,
    report() {
      return {...trace.report(), viewport: {width: win.innerWidth, height: win.innerHeight},
        motion: surface()?.dataset.motion ?? null, visible: visible(), focused: document.hasFocus(),
        frames: structuredClone(frames), droppedFrames, lifecycle: structuredClone(lifecycle),
        paintBoundary: 'Observed DOM state and a subsequent visible rendering opportunity'};
    },
    dispose() {
      invalidate();
      stop?.();
      controller = null;
      for (const handle of scheduled) win.cancelAnimationFrame(handle);
      scheduled.clear();
      for (const type of inputEvents) win.removeEventListener(type, capture, true);
      win.removeEventListener('blur', noteLifecycle);
      win.removeEventListener('focus', noteLifecycle);
      document.removeEventListener('visibilitychange', noteLifecycle);
    },
  };
}
