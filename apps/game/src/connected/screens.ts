import type { FullPlayerView, FullPublicView, SeatId } from '@mothership/contracts';
import {
  actionStepFocusId, buildConnectedPlayerShellModel, buildTableShellModel, createConnectedPlayerAnnouncer, createTableAnnouncer, isCurrent,
} from '@mothership/presentation';
import type { ConnectedPlayerInput, ConnectedPlayerShellModel, ShellIntent, TableShellInput, TableShellModel } from '@mothership/presentation';
import type { ClientPorts, PlayerPorts } from '../ports.js';
import { createScreen } from '../screens/screen.js';
import type { ScreenController, ScreenHost } from '../screens/screen.js';
import { DEFAULT_SESSION_TIMING } from '../session/audience-session.js';
import type { SessionTiming } from '../session/audience-session.js';
import { createActionFlow, offeredChoices } from './action-flow.js';
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
// This branch consumes views only. Presentation events and cues belong to the event
// director, which is reviewed separately.

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
  const catchUp = createDeadlineCatchUp({ api, ports: options.ports, matchId: options.matchId, order: 0, timing: options.catchUpTiming });
  return createScreen<FullPublicView, TableShellInput, TableShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput(environment, view, local) {
      // The display asks the server to look at a deadline it believes has passed. It changes
      // nothing itself: the phase on screen is replaced only by the next authoritative view.
      catchUp.observe({ phaseId: view?.phase.id ?? null, current: isCurrent(environment), expired: environment.deadline.kind === 'expired', foreground: local.pageVisible });
      return { ...environment, view };
    },
    buildModel: buildTableShellModel,
    announcer: createTableAnnouncer(),
    handleIntent: () => null,
    dispose() {
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
function applyActionIntent(flow: ActionFlow, intent: ShellIntent, view: FullPlayerView | null): boolean | null {
  switch (intent.type) {
    case 'action/open': return flow.open(intent.kind);
    case 'action/choose': {
      const state = flow.getState();
      if (state.step !== 'choosing' || view === null) return false;
      // The control carried a name. It becomes a choice only if the server offers exactly that.
      const choice = offeredChoices(view, state.kind).find(candidate => (candidate.kind === 'move' ? candidate.destination : candidate.targetSeatId) === intent.value);
      return choice === undefined ? false : flow.choose(choice);
    }
    case 'action/back': return flow.back();
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
  const flow = createActionFlow({ api, ports: options.ports, matchId: options.matchId, seatId: options.seatId, timing: options.actionTiming });
  // A phone asks later than a display would, and each seat at its own moment.
  const catchUp = createDeadlineCatchUp({ api, ports: options.ports, matchId: options.matchId, order: Number(options.seatId.slice(5)), timing: options.catchUpTiming });
  let latest: FullPlayerView | null = null;

  return createScreen<FullPlayerView, ConnectedPlayerInput, ConnectedPlayerShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput(environment, view, local) {
      latest = view;
      // The flow is told the present before its state is read, so a choice that was not sent
      // never outlives a closed panel, a view that is no longer fresh, or an ended phase.
      const expired = environment.deadline.kind === 'expired';
      flow.observe({
        view,
        current: isCurrent(environment),
        expired,
        panelOpen: local.pageVisible && local.privateRevealed && view !== null,
        foreground: local.pageVisible,
      });
      catchUp.observe({ phaseId: view?.phase.id ?? null, current: isCurrent(environment), expired, foreground: local.pageVisible });
      return { ...environment, view, privacy: { concealed: !local.pageVisible, revealed: local.privateRevealed }, action: flow.getState() };
    },
    buildModel: buildConnectedPlayerShellModel,
    announcer: createConnectedPlayerAnnouncer(),
    handleIntent(intent, { local, model }) {
      if (intent.type === 'private/toggle') {
        // There is nothing to reveal unless a match is on screen in the foreground.
        if (model.match === null || !local.pageVisible) return null;
        return { local: { ...local, privateRevealed: !local.privateRevealed } };
      }
      // An action control exists only inside the open private panel. An intent that names one
      // while the panel is closed did not come from the screen as it stands.
      if (model.match?.privateArea.content == null) return null;
      if (applyActionIntent(flow, intent, latest) !== true) return null;
      return {
        focus(next) {
          const card = next.match?.privateArea.content?.actions.card;
          return card === undefined ? null : actionStepFocusId(card);
        },
      };
    },
    watch: onChange => flow.subscribe(onChange),
    dispose() {
      flow.dispose();
      catchUp.dispose();
      api.cancelPending();
    },
  });
}
