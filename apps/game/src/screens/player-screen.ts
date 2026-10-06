import type { PlayerView } from '@mothership/contracts';
import { buildPlayerShellModel, describePlayerTransition } from '@mothership/presentation';
import type { PlayerShellInput, PlayerShellModel } from '@mothership/presentation';
import type { ClientPorts } from '../ports.js';
import { createPlayerSession } from '../session/audience-session.js';
import type { SessionTiming } from '../session/audience-session.js';
import type { PlayerTransport } from '../transport/transport.js';
import { createScreen } from './screen.js';
import type { ScreenController, ScreenHost } from './screen.js';

export interface PlayerScreenOptions {
  readonly transport: PlayerTransport;
  readonly matchId: string;
  readonly ports: ClientPorts;
  readonly host: ScreenHost;
  readonly timing?: Partial<SessionTiming>;
}

/** Headless controller for one player's phone: everything except drawing and input wiring. */
export function createPlayerScreen(options: PlayerScreenOptions): ScreenController<PlayerShellModel> {
  const session = createPlayerSession(options);
  return createScreen<PlayerView, PlayerShellInput, PlayerShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput: (environment, view, local) => ({
      ...environment,
      view,
      privacy: { concealed: !local.pageVisible, roleDrawerOpen: local.roleDrawerOpen },
    }),
    buildModel: buildPlayerShellModel,
    describe: describePlayerTransition,
    reduceLocal(local, intent, model) {
      if (intent.type !== 'role-drawer/toggle') return null;
      // There is nothing to reveal unless a match is on screen in the foreground.
      if (model.match === null || !local.pageVisible) return null;
      return { ...local, roleDrawerOpen: !local.roleDrawerOpen };
    },
  });
}
