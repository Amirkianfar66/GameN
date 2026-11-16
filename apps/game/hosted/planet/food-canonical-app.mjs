import { resolvePlanetReleaseCapabilities } from '@mothership/contracts';
import { createFoodHoldInput, createFoodTaskController, readPlanetFood, readPlanetView } from '@mothership/game';
import { planetHasFood } from '@mothership/presentation';
import { FOOD_CLOSURE_KEYS, FOOD_VIEW_KEYS, foodGauge, mountFood, mountFoodNotice } from '../../../../design/phone-ui/components/food/food.mjs';

const pick = (source, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]]));
const noSurface = Object.freeze({ active: false, exclusive: false, top: null, bottom: null });

function renderView(view) {
  const task = view.participantTask;
  return {
    ...pick(view, FOOD_VIEW_KEYS),
    stock: { doses: view.stock.doses },
    offers: view.offers.map(offer => pick(offer, ['type', 'inputs', 'partnerSeatIds'])),
    participantTask: task && {
      ...pick(task, ['taskId', 'winchSeatId', 'panelSeatId', 'selfControl', 'startedAt', 'runningAt', 'deadlineAt', 'returnsAt',
        'stage', 'people', 'panel', 'crate', 'broken', 'outcome']),
      ownGesture: task.ownGesture && { pendingIntent: task.ownGesture.pendingIntent !== null },
      ownReturnPlacement: pick(task.ownReturnPlacement, ['location']),
      events: { events: task.events.events.map(event => pick(event, ['kind', 'at', 'mechanism', 'crateId'])) },
    },
  };
}

function mountPlayer(root, { session, game, transport, binding, ports, recovery, assets, preferences, renderer }) {
  const document = root.ownerDocument;
  const host = document.createElement('div');
  root.append(host);
  const readClock = () => transport.readClock?.() ?? { status: 'unsynced' };
  const clock = { now() {
    const reading = readClock();
    return reading.status === 'synced' ? reading.serverNowMs : null;
  } };
  const controller = createFoodTaskController(session.foodTransport(), { ...ports, recovery }, { binding, readClock });
  const hold = createFoodHoldInput({
    down: () => controller.holdDown(),
    up: () => controller.holdUp(),
    held: () => {
      const model = controller.getModel();
      return model.physicalHolding || model.needsContactOff;
    },
  });
  const pressKeys = new Map();
  let pressSequence = 0, feedbackPhase = null;
  let scope = null, inputKey = null, revision = null;
  let previousTextScale = preferences().textScale;
  let boundaryTimer = null, boundaryDue = null;
  let detached = false, disposed = false, drawing = false, redraw = false;
  let owned = noSurface, measured = noSurface, published = noSurface, publicationQueued = false;
  let shellFocus = null, focusedFood = false;

  function focusIn(event) {
    focusedFood = host.contains(event.target);
    if (!focusedFood) shellFocus = event.target;
  }

  function publishSurface() {
    publicationQueued = false;
    if (detached) return;
    const before = published;
    published = { active: owned.active, exclusive: owned.exclusive, top: measured.top, bottom: measured.bottom };
    renderer.foodSurface(published);
    if ((before.active || before.exclusive) && !published.active && !published.exclusive &&
        focusedFood && document.activeElement === document.body && document.hasFocus()) {
      const target = shellFocus?.isConnected && !shellFocus.closest('[hidden],[inert]')
        ? shellFocus : root.querySelector('#planet-nav-board');
      target?.focus({ preventScroll: true });
    }
  }

  function queueSurface() {
    if (publicationQueued || detached) return;
    publicationQueued = true;
    queueMicrotask(publishSurface);
  }

  const surface = mountFood(host, { status: 'concealed', assets }, {
    onHold(contact) {
      if ('pointerId' in contact) hold.pointerDown(contact.pointerId);
      else if ('key' in contact) hold.keyDown(contact.key, contact.repeat);
      else hold.assistiveClick();
    },
    onLetGo(contact) {
      if ('pointerId' in contact) hold.pointerUp(contact.pointerId);
      else hold.keyUp(contact.key);
    },
    onReleaseAll: () => hold.releaseAll(),
    onPress: press => void controller.press(press),
    onAsk: seatId => void controller.ask(seatId),
    onAnswer: answer => void controller.answer(answer),
    onWithdraw: () => void controller.withdraw(),
    onNavigate: target => renderer.navigate(target),
    onSurface: value => { owned = value; queueSurface(); },
    onBars: value => { measured = value; queueSurface(); },
  });

  function feedbackFor(view, feedback) {
    if (feedbackPhase !== view.phaseId) {
      feedbackPhase = view.phaseId;
      pressKeys.clear();
    }
    if (!feedback) return null;
    if (!pressKeys.has(feedback.commandId)) pressKeys.set(feedback.commandId, String(++pressSequence));
    const receipt = feedback.receipt;
    return {
      key: pressKeys.get(feedback.commandId),
      name: feedback.name,
      status: feedback.status,
      recovered: feedback.recovered,
      request: receipt?.status === 'accepted' && receipt.result.kind === 'REQUEST'
        ? pick(receipt.result, ['requestId', 'state']) : null,
      closure: receipt?.status === 'rejected' && receipt.requestClosure
        ? pick(receipt.requestClosure, FOOD_CLOSURE_KEYS) : null,
    };
  }

  function scheduleBoundary(model) {
    const reading = model.clock, step = model.view?.step, task = model.view?.participantTask;
    let due = null;
    if (model.fresh && step && reading.status === 'synced') {
      const { serverNowMs: now, uncertaintyMs: uncertainty } = reading;
      // Re-read the existing controller where its time-sensitive flags can
      // change between snapshots. This schedules rendering only.
      const times = [step.startedAt + uncertainty];
      if (step.kind === 'ASKING') times.push(step.askingEndsAt - uncertainty);
      if (model.view.invitation) times.push(model.view.invitation.answerEndsAt - uncertainty);
      if (task) times.push(task.runningAt + uncertainty, task.deadlineAt - uncertainty);
      const next = Math.min(...times.filter(time => time > now));
      if (Number.isFinite(next)) due = Math.ceil(ports.clock.now() + next - now);
    }
    if (due === boundaryDue) return;
    if (boundaryTimer !== null) ports.scheduler.clearTimeout(boundaryTimer);
    boundaryDue = due;
    boundaryTimer = due === null ? null : ports.scheduler.setTimeout(() => {
      boundaryTimer = boundaryDue = null;
      refresh();
    }, Math.max(1, due - ports.clock.now()));
  }

  function paint() {
    const model = controller.getModel(), ordinary = game.getModel();
    const view = model.view;
    if (!view || !scope || ordinary.connection === 'error') {
      scope = null;
      revision = null;
      pressKeys.clear();
      scheduleBoundary({ fresh: false });
      if (inputKey !== null) {
        inputKey = null;
        surface.update({ status: 'concealed' });
      }
      return;
    }
    // Both feeds are validated independently. Match the shell's ordinary view
    // to the same response before combining it with a fresh Food view.
    const same = ordinary.revision === scope.revision && ordinary.phase?.id === scope.phaseId;
    if (model.fresh && !same) return;
    scheduleBoundary(model);
    const changes = {
      status: model.fresh ? 'live' : 'stale',
      can: { ask: model.canAsk, answer: model.canAnswer, withdraw: model.canWithdraw, hold: model.canHold,
        panelRelease: model.canPanelRelease, panelLock: model.canPanelLock, key: model.canKey },
      sending: { feedback: feedbackFor(view, model.feedback), pendingCount: model.pendingCount,
        physicalHolding: model.physicalHolding, needsContactOff: model.needsContactOff },
      people: ordinary.dark ? [] : scope.people,
      board: {
        seats: same ? ordinary.board?.seats.map(seat => pick(seat, ['seatId', 'location'])) ?? [] : [],
        activeSeatId: same ? ordinary.activeSeatId : null,
        phase: same ? pick(ordinary.phase, ['kind', 'remainingMs']) : null,
      },
      viewer: { promiseOfferCount: same ? ordinary.promiseOfferCount : 0 },
      navigation: { openPanel: ordinary.panel, boardMode: renderer.view },
      reducedMotion: preferences().reduced,
      bars: renderer.bars(),
    };
    const key = JSON.stringify(changes);
    if (key === inputKey && view.viewRevision === revision) return;
    if (view.viewRevision !== revision) changes.view = renderView(view);
    inputKey = key;
    revision = view.viewRevision;
    surface.update({ ...changes, clock });
  }

  function refresh() {
    if (detached) return;
    if (drawing) { redraw = true; return; }
    drawing = true;
    try {
      do { redraw = false; paint(); } while (redraw && !detached);
    } finally { drawing = false; }
  }

  const stopModel = controller.subscribe(refresh);
  const stopGame = game.subscribe(refresh);
  const stopFeed = transport.listen({ matchId: binding.matchId, seatId: binding.seatId }, {
    snapshot(snapshot) {
      const ordinary = readPlanetView(snapshot.value, binding.matchId, binding.seatId);
      const food = ordinary && readPlanetFood(snapshot, ordinary, binding.seatId);
      if (!food?.playerView) {
        scope = null;
        controller.disconnect('authorization');
        return;
      }
      scope = { revision: ordinary.viewRevision, phaseId: ordinary.phase.id,
        people: (transport.identities?.() ?? []).map(({ seatId, displayName, characterId }) => ({
          seatId, name: displayName ?? `Player ${seatId.slice(5)}`, character: characterId ?? null,
        })) };
      if (controller.observe(food.playerView, { matchId: ordinary.matchId, versions: food.playerView.versions,
        phaseId: ordinary.phase.id, round: ordinary.round, serverNowMs: food.serverTimeMs }, snapshot.fresh) &&
        controller.getModel().canCheck) void controller.checkReceipts();
    },
    error(kind = 'network') {
      if (kind === 'authorization') scope = null;
      controller.disconnect(kind);
    },
  });

  function preferencesChanged() {
    refresh();
    const next = preferences().textScale;
    if (next !== previousTextScale) surface.relayout();
    previousTextScale = next;
  }

  root.addEventListener('focusin', focusIn);
  document.addEventListener('mothership:preferences-change', preferencesChanged);

  function detach() {
    if (detached) return;
    detached = true;
    scope = null;
    scheduleBoundary({ fresh: false });
    stopModel();
    stopGame();
    surface.dispose();
    hold.dispose();
    root.removeEventListener('focusin', focusIn);
    document.removeEventListener('mothership:preferences-change', preferencesChanged);
    host.remove();
    renderer.foodSurface(noSurface);
  }

  return {
    controller, recovery, refresh, detach,
    openTasks() {
      refresh();
      surface.openTasks();
    },
    setVisible(visible) {
      if (!visible) {
        surface.suspend();
        scope = null;
      }
      controller.setVisible(visible);
      if (visible) surface.resume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      detach();
      stopFeed();
      controller.dispose();
    },
  };
}

function mountDisplay(root, { game, renderer }) {
  const notice = mountFoodNotice(root);
  const stop = game.subscribe(model => {
    notice.update({
      step: model.food?.step ? { kind: model.food.step.kind } : null,
      stock: model.food ? { doses: model.food.stock.doses } : null,
      status: model.concealed ? 'concealed' : model.connection === 'live' ? 'live' : 'stale',
      bars: { top: renderer?.bars().top ?? 0 },
    });
  });
  return { dispose() { stop(); notice.dispose(); } };
}

const canonicalFood = Object.freeze({ mountPlayer, mountDisplay, gauge: foodGauge });

/** The adopted artifact selects the canonical source for the exact Food release. */
export function foodPresentationFor(versions) {
  return planetHasFood(versions) && versions.assetManifestVersion === 'design-0.9.0' &&
    resolvePlanetReleaseCapabilities(versions)?.food === true ? canonicalFood : null;
}
