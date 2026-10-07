// Headless client core for the player phone and the table display. No rendering library,
// browser global, fixture or game rule lives here: a host supplies a transport and ports,
// forwards input, and draws the model each controller produces.

export type { ClientPorts, IdSource, MonotonicClock, PlayerPorts, Scheduler, UnresolvedCommandStore } from './ports.js';

export type { AudienceFeed, FeedListener, GameTransport, PlayerTransport, PublicTransport, TransportMode } from './transport/transport.js';
export { createPlayerApiClient, createPublicApiClient, DEFAULT_API_TIMEOUT_MS } from './transport/api-client.js';
export type {
  AdvanceResult, ApiCallFailure, ApiErrorCode, LookupResult, NoResponse, PlayerApiClient, PublicApiClient, ServerTimeResult, SubmitResult,
} from './transport/api-client.js';

export { createPlayerSnapshotStore, createPublicSnapshotStore, probeProtocolVersion, SUPPORTED_PROTOCOL_VERSIONS } from './snapshot/snapshot-store.js';
export type { SnapshotOutcome, SnapshotRejection, SnapshotStore } from './snapshot/snapshot-store.js';

export { readPlayerEvent, readPublicEvent } from './events/event-reader.js';
export type { EventOutcome, EventRejection } from './events/event-reader.js';

export { createServerClock } from './clock/server-clock.js';
export type { ClockReading, ClockSample, ServerClock } from './clock/server-clock.js';
export { estimateDeadline, millisecondsToNextSecond } from './clock/deadline.js';

export { createPlayerSession, createPublicSession, DEFAULT_SESSION_TIMING } from './session/audience-session.js';
export type { AudienceSession, SessionOptions, SessionState, SessionTiming } from './session/audience-session.js';

export { createShotFlow, DEFAULT_SHOT_FLOW_TIMING } from './command/shot-flow.js';
export type { ShotFlow, ShotFlowContext, ShotFlowOptions, ShotFlowTiming } from './command/shot-flow.js';

export { createPlayerScreen } from './screens/player-screen.js';
export type { PlayerScreenOptions } from './screens/player-screen.js';
export { createTableScreen } from './screens/table-screen.js';
export type { TableScreenOptions } from './screens/table-screen.js';
export { DEFAULT_CUE_TIMING } from './screens/screen.js';
export type { CueTiming, FrameCue, IntentOutcome, ScreenController, ScreenFrame, ScreenHost, SpokenLine } from './screens/screen.js';

export { shellBreakpoints, shellCssVariables, shellTokenStylesheet } from './styles/tokens-css.js';
export type { ShellTokenSource } from './styles/tokens-css.js';
