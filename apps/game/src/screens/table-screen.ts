import type { PublicView } from '@mothership/contracts';
import { buildTableShellModel, describeTableTransition } from '@mothership/presentation';
import type { TableShellInput, TableShellModel } from '@mothership/presentation';
import type { ClientPorts } from '../ports.js';
import { createPublicSession } from '../session/audience-session.js';
import type { SessionTiming } from '../session/audience-session.js';
import type { PublicTransport } from '../transport/transport.js';
import { createScreen } from './screen.js';
import type { ScreenController, ScreenHost } from './screen.js';

export interface TableScreenOptions {
  readonly transport: PublicTransport;
  readonly matchId: string;
  readonly ports: ClientPorts;
  readonly host: ScreenHost;
  readonly timing?: Partial<SessionTiming>;
}

/**
 * Headless controller for the shared display. It is built from a public transport and a
 * public view, so it has no private field to show and no command it could send.
 */
export function createTableScreen(options: TableScreenOptions): ScreenController<TableShellModel> {
  const session = createPublicSession(options);
  return createScreen<PublicView, TableShellInput, TableShellModel>({
    session,
    ports: options.ports,
    host: options.host,
    phaseOf: view => view.phase,
    buildInput: (environment, view) => ({ ...environment, view }),
    buildModel: buildTableShellModel,
    describe: describeTableTransition,
    reduceLocal: () => null,
  });
}
