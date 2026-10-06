// mothership:dev-only
//
// What the motion gallery shows: one specimen per cue, each a short scripted scene that is
// fed to the REAL client core through a scripted transport living in the page. A cue seen in
// the gallery therefore went the whole way: reader, session, director, frame, renderer.
//
// EVERYTHING HERE IS SYNTHETIC. The match, its views and its events are authored in this
// file for looking at motion. They follow no rule, are the outcome of nothing, and are not
// the contract fixture, which a browser is never given. Two specimens are not connected to
// the director at all and say so: no approved fact exists for what they show.
//
// No document access in this module, so the same scenes run under test without a browser.

// A statement, not only a comment: it survives bundling and comment stripping, so the
// production-exclusion check finds this module wherever it ends up.
globalThis[Symbol.for('mothership:dev-only')] = true;

export const GALLERY_MATCH_ID = 'gallery-synthetic-match';
const EPOCH = 1_900_000_000_000;
const VERSIONS = {
  protocolVersion: 1, rulesetVersion: 'gallery-synthetic', rulesetHash: '0'.repeat(64),
  engineVersion: '0.0.0-gallery-no-engine', assetManifestVersion: '0.0.0-no-assets',
};
const clone = value => JSON.parse(JSON.stringify(value));

/** The shared public facts of the gallery's one synthetic match. */
function baseFacts() {
  return {
    versions: VERSIONS,
    matchId: GALLERY_MATCH_ID,
    viewRevision: 100,
    playerCount: 9,
    round: 2,
    phase: { id: 'gallery-phase-1', kind: 'ORDINARY_TURN', startedAt: EPOCH, endsAt: EPOCH + 60_000 },
    activeSeatId: 'seat-1',
    seats: Array.from({ length: 9 }, (unused, index) => {
      const number = index + 1;
      return { seatId: `seat-${number}`, location: number <= 4 ? 'Room A' : number === 5 ? 'Command Room' : 'Room B', health: 'Healthy', jailed: false, captain: number === 5 };
    }),
  };
}
export const publicView = () => ({ ...baseFacts(), audience: { kind: 'public' } });
/** Seat 1's own view. The role is a synthetic assignment made so that the Shot card has something to offer. */
export const playerView = () => ({
  ...baseFacts(), audience: { kind: 'player', seatId: 'seat-1' },
  self: { seatId: 'seat-1', role: 'Officer', shotAvailable: true }, ownPendingCommandIds: [],
});

/** The view one revision on, with whatever a scene changes. */
function next(view, change) {
  const copy = clone(view);
  copy.viewRevision += 1;
  change(copy);
  return copy;
}
let eventNumber = 0;
const eventFor = (view, fact) => ({
  protocolVersion: 1, matchId: view.matchId, eventId: `gallery-event-${++eventNumber}`, audience: clone(view.audience), viewRevision: view.viewRevision, fact,
});
const seatIn = (view, seatId) => view.seats.find(seat => seat.seatId === seatId);

/**
 * A transport that lives in the page and delivers what a scene tells it to. It satisfies
 * the same interface a backend adapter will and always reports mode "fixture", so every
 * specimen carries the synthetic-data banner. Its server clock starts at the synthetic
 * phase start and runs in real time, so the countdown keeps running while a cue plays.
 */
export function createScriptedTransport({ audience, now }) {
  let listener = null;
  const startedAt = now();
  const serverTimeMs = () => Math.round(EPOCH + (now() - startedAt));
  /** How a scene answers a command. Until it sets one, the contract's "try again later". */
  let answerCommand = () => ({ ok: false, serverTimeMs: serverTimeMs(), error: { code: 'UNAVAILABLE' } });
  const transport = {
    mode: 'fixture',
    audience,
    subscribe(next) {
      listener = next;
      return () => {
        if (listener === next) listener = null;
      };
    },
    serverTime: async () => ({ protocolVersion: 1, serverTimeMs: serverTimeMs() }),
    advanceIfExpired: async () => ({ ok: false, serverTimeMs: serverTimeMs(), error: { code: 'UNAVAILABLE' } }),
  };
  if (audience === 'player') {
    transport.submitCommand = async command => answerCommand(command);
    transport.lookupReceipt = async () => ({ status: 'unknown', serverTimeMs: serverTimeMs() });
  }
  return {
    transport,
    serverTimeMs,
    connect(view) {
      listener?.onConnectionChange('connected');
      listener?.onPayload(clone(view));
    },
    deliver: view => listener?.onPayload(clone(view)),
    deliverEvent: event => listener?.onEventPayload(clone(event)),
    onCommand(answer) {
      answerCommand = answer;
    },
  };
}

/** How long after the scene opens its fact arrives, so the eye has found the place first. */
const LEAD_IN_MS = 700;
/** Long enough for a new control to become active (the client's own 400 ms guard, with room). */
const CONTROL_WAIT_MS = 500;

/**
 * status:
 *   connected    drawn for a cue the director issued for a contract event
 *   interaction  local feedback for the player's own input; no event is involved
 *   not-connected  drawn by the gallery alone. The director has no such cue and the contract no such fact
 */
export const SPECIMENS = [
  {
    id: 'card-selection',
    title: 'Select a card',
    level: 'Interaction',
    status: 'interaction',
    surface: 'player',
    treatment: 'Small lift and an offset ink shadow on the card.',
    token: 'selection',
    limit: 'Local feedback only. It claims nothing about eligibility or success.',
    words: 'The card says “Choosing a target” and lists the players the view offers.',
    lookAt: '[data-action="shot"]',
    expectedCues: [],
    start: () => playerView(),
    open: true,
    async play({ dispatch, wait }) {
      await wait(LEAD_IN_MS);
      dispatch({ type: 'shot/open' });
      await wait(1_600);
      dispatch({ type: 'shot/back' });
    },
  },
  {
    id: 'registration',
    title: 'Command registered',
    level: 'Interaction',
    status: 'connected',
    surface: 'player',
    treatment: 'The card’s status line lands like a stamp. The same neutral mark for any secret command.',
    token: 'registrationStamp',
    limit: 'Private to the seat, inside the open private panel only. No impact or damage cue, and no public effect of any kind.',
    words: 'The card says “Registered” and “This is not a result.” The same is spoken privately.',
    lookAt: '[data-action="shot"]',
    expectedCues: ['registration'],
    start: () => playerView(),
    open: true,
    async play({ feed, dispatch, wait, view }) {
      // The scripted server registers whatever it is sent: it judges nothing.
      feed.onCommand(async command => {
        await wait(250);
        const listed = next(view, v => {
          v.self.shotAvailable = false;
          v.ownPendingCommandIds = [command.commandId];
        });
        feed.deliver(listed);
        feed.deliverEvent(eventFor(listed, { type: 'COMMAND_REGISTERED', commandId: command.commandId }));
        return { ok: true, serverTimeMs: feed.serverTimeMs(), receipt: { protocolVersion: 1, matchId: command.matchId, phaseId: command.phaseId, commandId: command.commandId, status: 'accepted', code: 'REGISTERED' } };
      });
      await wait(LEAD_IN_MS);
      dispatch({ type: 'shot/open' });
      await wait(CONTROL_WAIT_MS);
      dispatch({ type: 'shot/choose-target', seatId: 'seat-2' });
      await wait(CONTROL_WAIT_MS);
      dispatch({ type: 'shot/confirm' });
    },
  },
  {
    id: 'public-move',
    title: 'Public token move',
    level: 'Game event',
    status: 'connected',
    surface: 'table',
    treatment: 'The token arrives with a short slide and an ink trail that clears as it settles. In the roster the location cell is lit.',
    token: 'publicMove',
    limit: 'Only a supplied public move. The slide always comes from the same side and implies no route, adjacency or stop in between.',
    words: 'Player 8 is listed under Room A, and “Player 8 is now in Room A.” is spoken.',
    lookAt: '[data-cue-at="seat-8/place"]',
    expectedCues: ['public-move'],
    start: () => publicView(),
    async play({ feed, wait, view }) {
      await wait(LEAD_IN_MS);
      const moved = next(view, v => { seatIn(v, 'seat-8').location = 'Room A'; });
      feed.deliver(moved);
      feed.deliverEvent(eventFor(moved, { type: 'PUBLIC_MOVE', seatId: 'seat-8', from: 'Room B', to: 'Room A' }));
    },
  },
  {
    id: 'status-change',
    title: 'Public status change',
    level: 'Game event',
    status: 'connected',
    surface: 'table',
    treatment: 'The status itself is outlined for a moment, in paper. In the roster the health cell is lit.',
    token: 'cardTransition',
    limit: 'What a public health change gets today. The contract gives no cause, so there is no impact, shooter, line or lettering.',
    words: 'Player 9’s status reads “Injured”, and “Player 9 is now Injured.” is spoken.',
    lookAt: '[data-cue-at="seat-9/health"]',
    expectedCues: ['status-change'],
    start: () => publicView(),
    async play({ feed, wait, view }) {
      await wait(LEAD_IN_MS);
      const changed = next(view, v => { seatIn(v, 'seat-9').health = 'Injured'; });
      feed.deliver(changed);
      feed.deliverEvent(eventFor(changed, { type: 'PUBLIC_HEALTH_CHANGED', seatId: 'seat-9', health: 'Injured' }));
    },
  },
  {
    id: 'phase-change',
    title: 'New phase',
    level: 'Phase',
    status: 'connected',
    surface: 'table',
    treatment: 'The labels settle in and a rule is drawn under them.',
    token: 'cardTransition',
    limit: 'The motion direction lists no cue for an ordinary turn change; this one is a proposal and may be dropped. The countdown is not part of it.',
    words: 'The phase reads “Player 2’s turn”, and “Round 2. Player 2’s turn.” is spoken.',
    lookAt: '[data-cue-at="phase"]',
    expectedCues: ['phase-change'],
    start: () => publicView(),
    async play({ feed, wait, view }) {
      await wait(LEAD_IN_MS);
      const turn = next(view, v => {
        v.phase = { ...v.phase, id: 'gallery-phase-2' };
        v.activeSeatId = 'seat-2';
      });
      feed.deliver(turn);
      feed.deliverEvent(eventFor(turn, { type: 'PHASE_CHANGED', phaseId: turn.phase.id }));
    },
  },
  {
    id: 'round-transition',
    title: 'Round transition',
    level: 'Phase',
    status: 'connected',
    surface: 'table',
    treatment: 'Panel rules are drawn across from both sides and the round heading is struck once.',
    token: 'roundTransition',
    limit: 'A public phase update. The timer and every control stay readable and usable. Played only on a device that saw the round number go up.',
    words: 'The heading reads “Round 3”, and “Round 3. Player 1’s turn.” is spoken.',
    lookAt: '[data-cue-at="phase"]',
    expectedCues: ['round-transition'],
    start: () => publicView(),
    async play({ feed, wait, view }) {
      await wait(LEAD_IN_MS);
      const round = next(view, v => {
        v.round += 1;
        v.phase = { ...v.phase, id: 'gallery-phase-3' };
      });
      feed.deliver(round);
      feed.deliverEvent(eventFor(round, { type: 'PHASE_CHANGED', phaseId: round.phase.id }));
    },
  },
  {
    id: 'resolved-shot',
    title: 'Public resolved shot',
    level: 'Game event',
    status: 'not-connected',
    surface: 'table',
    treatment: 'A localized ink burst and brief impact lettering.',
    token: 'publicImpact',
    limit: 'NOT CONNECTED. No approved public fact says that a shot was resolved or what kind of attack it was, and the director has no such cue. Drawn by this gallery alone so the treatment can be judged.',
    words: 'Nothing. No fact is behind this specimen, so the screen states none.',
    lookAt: '[data-cue-at="seat-2/place"]',
    overlay: { at: 'seat-2/place', kind: 'impact', lettering: 'BANG!' },
    expectedCues: [],
    start: () => publicView(),
    async play({ overlay, wait }) {
      await wait(LEAD_IN_MS);
      overlay();
    },
  },
  {
    id: 'blocked-outcome',
    title: 'Disclosed blocked outcome',
    level: 'Game event',
    status: 'not-connected',
    surface: 'table',
    treatment: 'A brief ink shield shape and a label.',
    token: 'publicImpact',
    limit: 'FIXTURE ONLY. Whether anyone is told that an attack was blocked, and who, is undecided (RULE-003). The director has no such cue.',
    words: 'Nothing. No fact is behind this specimen, so the screen states none.',
    lookAt: '[data-cue-at="seat-2/place"]',
    overlay: { at: 'seat-2/place', kind: 'shield', lettering: 'BLOCKED' },
    expectedCues: [],
    start: () => publicView(),
    async play({ overlay, wait }) {
      await wait(LEAD_IN_MS);
      overlay();
    },
  },
];

/**
 * Runs one specimen's scene against a real screen controller.
 * @param {object} options
 * @param {object} options.specimen One of SPECIMENS.
 * @param {(config: { transport: object, matchId: string }) => object} options.createScreen Makes the real table or player screen.
 * @param {(ms: number) => Promise<void>} options.wait
 * @param {() => number} options.now
 * @param {() => void} [options.overlay] Draws a not-connected specimen's treatment. Only the gallery page can.
 * @returns {{ screen: object, played: Promise<void>, stop(): void }}
 */
export function runSpecimen({ specimen, createScreen, wait, now, overlay = () => {} }) {
  const feed = createScriptedTransport({ audience: specimen.surface === 'player' ? 'player' : 'public', now });
  const screen = createScreen({ transport: feed.transport, matchId: GALLERY_MATCH_ID });
  let stopped = false;
  // A scene that has been stopped does nothing more: every wait after that never resolves.
  const guardedWait = ms => wait(ms).then(() => (stopped ? new Promise(() => {}) : undefined));
  const view = specimen.start();
  const played = (async () => {
    // Started on the next turn of the loop, after whoever draws the screen has attached to it.
    await guardedWait(0);
    screen.start();
    feed.connect(view);
    if (specimen.open) screen.dispatch({ type: 'private/toggle' });
    await specimen.play({ feed, wait: guardedWait, view, overlay: () => { if (!stopped) overlay(); }, dispatch: intent => { if (!stopped) screen.dispatch(intent); } });
  })();
  return {
    screen,
    played,
    stop() {
      stopped = true;
    },
  };
}
