// Headless client core for the player phone and the table display. No rendering library,
// browser global, fixture or game rule lives here: a host supplies a transport and ports,
// forwards input, and draws the model each controller produces.

export type { ClientPorts, IdSource, MonotonicClock, PlayerPorts, Scheduler, UnresolvedCommandStore } from './ports.js';

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

export { createShotFlow, DEFAULT_SHOT_FLOW_TIMING } from './command/shot-flow.js';
export type { ShotFlow, ShotFlowContext, ShotFlowOptions, ShotFlowTiming } from './command/shot-flow.js';

export { createPlayerScreen } from './screens/player-screen.js';
export type { PlayerScreenOptions } from './screens/player-screen.js';
export { createTableScreen } from './screens/table-screen.js';
export type { TableScreenOptions } from './screens/table-screen.js';
export type { IntentOutcome, ScreenController, ScreenFrame, ScreenHost, SpokenLine } from './screens/screen.js';

// The connected client: wire protocol 2 against a real backend.
export { V1_OPERATIONS } from './connected/transport.js';
export type { CollectionListener, CollectionTarget, ConnectedTransport, DocumentListener, DocumentTarget, Snapshot, V1Operation } from './connected/transport.js';
export { createConnectedApi } from './connected/api.js';
export type {
  ApprovedAdmission, ConnectedAdvanceResult, ConnectedApi, ConnectedCommandResult, ConnectedFailure, ConnectedFailureCode, ConnectedLookupResult,
  ConnectedTimeResult, CreatedMatch, IssuedRecovery, OperationResult, RecoveredSeat, RequestedAdmission,
} from './connected/api.js';
export { createConnectedPlayerStore, createConnectedPublicStore, readAdmission, readHostSession, readLobby, SUPPORTED_CONNECTED_VERSIONS } from './connected/readers.js';
export type { Admission, DocumentOutcome, DocumentRejection, HostSession } from './connected/readers.js';
export { collectionPath, documentPath } from './connected/paths.js';
export { createConnectedPlayerSession, createConnectedPublicSession } from './connected/session.js';
export type { ConnectedSessionOptions } from './connected/session.js';
export { createConnectedPlayerScreen, createConnectedTableScreen } from './connected/screens.js';
export type { ConnectedPlayerScreenOptions, ConnectedTableScreenOptions } from './connected/screens.js';
export { createLifecycleRequests, DURABLE_FIELDS } from './connected/lifecycle-requests.js';
export type { LifecycleOutcome, LifecycleRequests, LifecycleRequestsOptions, LifecycleRequestStore, UnsettledRequest } from './connected/lifecycle-requests.js';
export { createDeadlineCatchUp, DEFAULT_CATCH_UP_TIMING } from './connected/deadline-catch-up.js';
export type { CatchUpContext, CatchUpOptions, CatchUpTiming, DeadlineCatchUp } from './connected/deadline-catch-up.js';
export { createActionFlow, DEFAULT_ACTION_FLOW_TIMING, offeredChoices } from './connected/action-flow.js';
export type {
  ActionChoice, ActionFlow, ActionFlowContext, ActionFlowOptions, ActionFlowState, ActionFlowTiming, ActionKind, Destination, NotAcceptedReason,
} from './connected/action-flow.js';

export { shellBreakpoints, shellCssVariables, shellTokenStylesheet } from './styles/tokens-css.js';
export type { ShellTokenSource } from './styles/tokens-css.js';
