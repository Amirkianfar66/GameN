import type { PlayerPresentationEvent, PlayerView } from '@mothership/contracts';
import {
  buildPlayerShellModel, createPlayerAnnouncer, createPlayerDirector, isCurrent, resolveShotGate, shotStepFocusId, shotTargetCandidates,
} from '@mothership/presentation';
import type { PlayerShellInput, PlayerShellModel, ShellIntent } from '@mothership/presentation';
import { createShotFlow } from '../command/shot-flow.js';
import type { ShotFlow, ShotFlowTiming } from '../command/shot-flow.js';
import type { PlayerPorts } from '../ports.js';
import { createPlayerSession, DEFAULT_SESSION_TIMING } from '../session/audience-session.js';
import type { SessionTiming } from '../session/audience-session.js';
import { createPlayerApiClient } from '../transport/api-client.js';
import type { PlayerTransport } from '../transport/transport.js';
import { createScreen } from './screen.js';
import type { ScreenController, ScreenHost } from './screen.js';

export interface PlayerScreenOptions {
  readonly transport: PlayerTransport;
  readonly matchId: string;
  readonly ports: PlayerPorts;
  readonly host: ScreenHost;
  readonly timing?: Partial<SessionTiming>;
  readonly shotTiming?: Partial<ShotFlowTiming>;
}

// Returns whether the flow changed, or null when the intent is not one of its own.
function applyShotIntent(flow: ShotFlow, intent: ShellIntent): boolean | null {
  switch (intent.type) {
    case 'shot/open': return flow.open();
    case 'shot/choose-target': return flow.chooseTarget(intent.seatId);
    case 'shot/back': return flow.back();
    case 'shot/confirm': return flow.confirm();
    case 'shot/check-again': return flow.checkAgain();
    case 'shot/dismiss': return flow.dismiss();
    default: return null;
  }
}

/** Headless controller for one player's phone: everything except drawing and input wiring. */
export function createPlayerScreen(options: PlayerScreenOptions): ScreenController<PlayerShellModel> {
  const session = createPlayerSession(options);
  const api = createPlayerApiClient(options.transport, options.ports, options.timing?.apiTimeoutMs ?? DEFAULT_SESSION_TIMING.apiTimeoutMs);
  const flow = createShotFlow({ api, ports: options.ports, matchId: options.matchId, timing: options.shotTiming });
  const director = createPlayerDirector();

  return createScreen<PlayerView, PlayerPresentationEvent, PlayerShellInput, PlayerShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput(environment, view, local) {
      const panelOpen = local.pageVisible && local.privateRevealed && view !== null;
      // The flow is told the present before its state is read, so a choice that was not
      // sent never outlives a closed panel, a lost connection or an ended turn.
      flow.observe({
        view,
        canAct: view !== null && resolveShotGate(environment, view).open,
        candidates: view === null ? [] : shotTargetCandidates(view),
        panelOpen,
        current: isCurrent(environment),
        foreground: local.pageVisible,
      });
      return { ...environment, view, privacy: { concealed: !local.pageVisible, revealed: local.privateRevealed }, shot: flow.getState() };
    },
    buildModel: buildPlayerShellModel,
    announcer: createPlayerAnnouncer(),
    director,
    // The flow's own word that the server registered its command: a receipt, or the view
    // listing it. The director makes one cue of it however often it is asked.
    moreCues() {
      const commandId = flow.registeredCommandId();
      return commandId === null ? [] : director.onRegistered(commandId);
    },
    handleIntent(intent, { local, model }) {
      if (intent.type === 'private/toggle') {
        // There is nothing to reveal unless a match is on screen in the foreground.
        if (model.match === null || !local.pageVisible) return null;
        return { local: { ...local, privateRevealed: !local.privateRevealed } };
      }
      // A shot control exists only inside the open private panel. An intent that names one
      // while the panel is closed did not come from the screen as it stands.
      if (model.match?.privateArea.content == null) return null;
      if (applyShotIntent(flow, intent) !== true) return null;
      return {
        focus(next) {
          const card = next.match?.privateArea.content?.actions.cards[0];
          return card === undefined ? null : shotStepFocusId(card);
        },
      };
    },
    watch: onChange => flow.subscribe(onChange),
    dispose() {
      flow.dispose();
      api.cancelPending();
    },
  });
}
