import type { FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import {
  actionStepFocusId, buildConnectedPlayerShellModel, buildHackFeedback, buildTableShellModel, createConnectedPlayerAnnouncer, createTableAnnouncer, isCurrent,
} from '@mothership/presentation';
import type { ConnectedPlayerInput, ConnectedPlayerShellModel, ShellIntent, TableShellInput, TableShellModel } from '@mothership/presentation';
import type { ClientPorts, PlayerPorts } from '../ports.js';
import { createScreen } from '../screens/screen.js';
import type { ScreenController, ScreenHost } from '../screens/screen.js';
import { DEFAULT_SESSION_TIMING } from '../session/audience-session.js';
import type { SessionTiming } from '../session/audience-session.js';
import { createOutcomeFeed } from './outcome-feed.js';
import { createActionFlow } from './action-flow.js';
import type { ActionFlow, ActionFlowTiming } from './action-flow.js';
import { createConnectedApi } from './api.js';
import { createDeadlineCatchUp } from './deadline-catch-up.js';
import type { CatchUpTiming } from './deadline-catch-up.js';
import { createConnectedPlayerSession, createConnectedPublicSession } from './session.js';
import type { ConnectedTransport } from './transport.js';

// Headless controllers for a phone and a shared display connected to a real backend under
// wire protocol 2. They are the same screen controller as the fixture's, fed by a session
// over the backend's view document; everything they show comes from that view.
//
// Exact successor tuples additionally consume validated live audience occurrences.
// Those occurrences never replace or advance authoritative gameplay views.

export interface ConnectedTableScreenOptions {
  readonly transport: ConnectedTransport;
  readonly matchId: string;
  readonly ports: ClientPorts;
  readonly host: ScreenHost;
  readonly timing?: Partial<SessionTiming>;
  readonly catchUpTiming?: Partial<CatchUpTiming>;
}

/** The shared display. It is built from a public view, so it has no private field to show and no command it could send. */
export function createConnectedTableScreen(options: ConnectedTableScreenOptions): ScreenController<TableShellModel> {
  const api = createConnectedApi(options.transport, options.ports, options.timing?.apiTimeoutMs ?? DEFAULT_SESSION_TIMING.apiTimeoutMs);
  const session = createConnectedPublicSession({ ...options, api });
  const outcomes = createOutcomeFeed(options.transport, options.matchId);
  const catchUp = createDeadlineCatchUp({ api, ports: options.ports, matchId: options.matchId, order: 0, timing: options.catchUpTiming });
  return createScreen<FullPublicView, TableShellInput, TableShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput(environment, view, local) {
      const reading = session.readClock();
      outcomes.observe(view, reading.status === 'synced' ? reading.serverNowMs : null, isCurrent(environment), local.pageVisible);
      // The display asks the server to look at a deadline it believes has passed. It changes
      // nothing itself: the phase on screen is replaced only by the next authoritative view.
      catchUp.observe({ phaseId: view?.phase.id ?? null, current: isCurrent(environment), expired: environment.deadline.kind === 'expired', foreground: local.pageVisible });
      return { ...environment, view };
    },
    buildModel(input) { const model = buildTableShellModel(input); return model.match ? { ...model, match: { ...model.match, outcomes: outcomes.read() } } : model; },
    watch: onChange => outcomes.subscribe(onChange),
    announcer: createTableAnnouncer(),
    handleIntent: () => null,
    dispose() {
      outcomes.dispose();
      catchUp.dispose();
      api.cancelPending();
    },
  });
}

export interface ConnectedPlayerScreenOptions extends Omit<ConnectedTableScreenOptions, 'ports'> {
  /** The seat the host approved for this identity. */
  readonly seatId: SeatId;
  readonly ports: PlayerPorts;
  readonly actionTiming?: Partial<ActionFlowTiming>;
}

// Returns whether the flow changed, or null when the intent is not one of its own.
function applyActionIntent(flow: ActionFlow, intent: ShellIntent): boolean | null {
  switch (intent.type) {
    case 'action/open': return flow.open(intent.kind);
    // The control carried a name. The flow takes it only if the server's view offers exactly that next.
    case 'action/choose': return flow.pick(intent.value);
    case 'action/back': return flow.back();
    case 'action/cancel': return flow.cancel();
    case 'action/confirm': return flow.confirm();
    case 'action/check-again': return flow.checkAgain();
    case 'action/dismiss': return flow.dismiss();
    default: return null;
  }
}

/** One player's phone: everything except drawing and input wiring. */
export function createConnectedPlayerScreen(options: ConnectedPlayerScreenOptions): ScreenController<ConnectedPlayerShellModel> {
  const api = createConnectedApi(options.transport, options.ports, options.timing?.apiTimeoutMs ?? DEFAULT_SESSION_TIMING.apiTimeoutMs);
  const session = createConnectedPlayerSession({ ...options, api });
  const outcomes = createOutcomeFeed(options.transport, options.matchId, options.seatId);
  const flow = createActionFlow({ api, ports: options.ports, matchId: options.matchId, seatId: options.seatId, timing: options.actionTiming });
  // A phone asks later than a display would, and each seat at its own moment.
  const catchUp = createDeadlineCatchUp({ api, ports: options.ports, matchId: options.matchId, order: Number(options.seatId.slice(5)), timing: options.catchUpTiming });
  return createScreen<FullPlayerView, ConnectedPlayerInput, ConnectedPlayerShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    concealPrivate: view => view?.phase.kind === 'VOTE_RESULT',
    privateAnnouncementScope(input) {
      const feedback = input.view === null ? null : buildHackFeedback(input, input.view);
      return feedback === null ? null : JSON.stringify([input.view?.matchId, feedback.id, feedback.phaseId, feedback.stage, feedback.declaredSide]);
    },
    buildInput(environment, view, local) {
      const reading = session.readClock();
      outcomes.observe(view, reading.status === 'synced' ? reading.serverNowMs : null, isCurrent(environment), local.pageVisible);
      // The server refused this device the match: the seat is no longer its own. Whatever it
      // was doing with a command is dropped, and nothing more is asked about it.
      if (environment.problem === 'no-access') flow.release();
      // The flow is told the present before its state is read, so a choice that was not sent
      // never outlives a closed panel, a view that is no longer fresh, or an ended phase.
      flow.observe({
        view,
        current: isCurrent(environment),
        // Only a countdown this device can trust and that is still running lets a command start.
        inTime: environment.deadline.kind === 'running',
        serverNowMs: view?.phase.endsAt != null && environment.deadline.kind === 'running' ? view.phase.endsAt - environment.deadline.remainingMs : null,
        panelOpen: local.pageVisible && local.privateRevealed && view !== null,
        foreground: local.pageVisible,
      });
      // Catch-up is the other way round: it needs the trusted clock to say the deadline has passed.
      catchUp.observe({ phaseId: view?.phase.id ?? null, current: isCurrent(environment), expired: environment.deadline.kind === 'expired', foreground: local.pageVisible });
      return { ...environment, view, privacy: { concealed: !local.pageVisible, revealed: local.privateRevealed }, action: flow.getState() };
    },
    buildModel(input) { const model = buildConnectedPlayerShellModel(input); return model.match ? { ...model, match: { ...model.match, outcomes: outcomes.read() } } : model; },
    announcer: createConnectedPlayerAnnouncer(),
    handleIntent(intent, { local, model }) {
      if (intent.type === 'private/toggle') {
        // There is nothing to reveal unless a match is on screen in the foreground.
        if (model.match === null || !local.pageVisible || model.match.phaseKind === 'VOTE_RESULT') return null;
        return { local: { ...local, privateRevealed: !local.privateRevealed } };
      }
      if (intent.type === 'action/pass') return local.pageVisible && model.match?.passTurn.available && flow.pass() ? {} : null;
      if (local.pageVisible && model.match?.commandRecovery?.canCheck && intent.type === 'action/check-again') {
        return applyActionIntent(flow, intent) === true ? {} : null;
      }
      // The neutral Pass receipt can be checked or dismissed with the private card closed.
      if (local.pageVisible && model.match?.passTurn.card && (intent.type === 'action/check-again' || intent.type === 'action/dismiss')) {
        return applyActionIntent(flow, intent) === true ? {} : null;
      }
      // An action control exists only inside the open private panel. An intent that names one
      // while the panel is closed did not come from the screen as it stands.
      if (model.match?.privateArea.content == null) return null;
      if (applyActionIntent(flow, intent) !== true) return null;
      return {
        focus(next) {
          const card = next.match?.privateArea.content?.actions.card;
          return card === undefined ? null : actionStepFocusId(card);
        },
      };
    },
    watch: onChange => { const stops = [flow.subscribe(onChange), outcomes.subscribe(onChange)]; return () => stops.forEach(stop => stop()); },
    dispose() {
      flow.dispose();
      outcomes.dispose();
      catchUp.dispose();
      api.cancelPending();
    },
  });
}
