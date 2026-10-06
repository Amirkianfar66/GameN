// Headless client core for the player phone and the table display. No rendering library,
// browser global, fixture or game rule lives here: a host supplies a transport and ports,
// forwards input, and draws the model each controller produces.

export type { ClientPorts, MonotonicClock, Scheduler } from './ports.js';

export type { FeedListener, GameTransport, PlayerTransport, PublicTransport, TransportMode, ViewFeed } from './transport/transport.js';
export { createPlayerApiClient, createPublicApiClient, DEFAULT_API_TIMEOUT_MS } from './transport/api-client.js';
export type {
  AdvanceResult, ApiCallFailure, ApiErrorCode, LookupResult, NoResponse, PlayerApiClient, PublicApiClient, ServerTimeResult, SubmitResult,
} from './transport/api-client.js';

export { createPlayerSnapshotStore, createPublicSnapshotStore, probeProtocolVersion, SUPPORTED_PROTOCOL_VERSIONS } from './snapshot/snapshot-store.js';
export type { SnapshotOutcome, SnapshotRejection, SnapshotStore } from './snapshot/snapshot-store.js';

export { createServerClock } from './clock/server-clock.js';
export type { ClockReading, ClockSample, ServerClock } from './clock/server-clock.js';
export { estimateDeadline, millisecondsToNextSecond } from './clock/deadline.js';

export { createPlayerSession, createPublicSession, DEFAULT_SESSION_TIMING } from './session/audience-session.js';
export type { AudienceSession, SessionOptions, SessionState, SessionTiming } from './session/audience-session.js';

export { createPlayerScreen } from './screens/player-screen.js';
export type { PlayerScreenOptions } from './screens/player-screen.js';
export { createTableScreen } from './screens/table-screen.js';
export type { TableScreenOptions } from './screens/table-screen.js';
export type { ScreenController, ScreenFrame, ScreenHost } from './screens/screen.js';

export { shellBreakpoints, shellCssVariables, shellTokenStylesheet } from './styles/tokens-css.js';
export type { ShellTokenSource } from './styles/tokens-css.js';
