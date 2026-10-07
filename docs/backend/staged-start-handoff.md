# Staged match start backend handoff

Issue: [#73](https://github.com/Amirkianfar66/GameN/issues/73).
Backend draft PR: [#74](https://github.com/Amirkianfar66/GameN/pull/74).
Runtime checkpoint: `297de42609ff575aa914e0f852aba80482957622`.
Base: `af797838dee531d7874da2145e99a50c67d32b45` (deployed practice-bot release).
Contracts checkpoint: `74ea5f190e151645f5c20fa8c647d3c955e58ee3`.

Protocol remains `2`; lifecycle is `staged-start-1`. Engine remains
`full-game-1.0.1`; ruleset remains `in-person-v1-2026-10-06` with hash
`6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`.
Original Powers remain disabled. Initial rooms are selected at admission,
before the private deal, and preserved through all stages and recovery.
Gameplay canon and engine code are unchanged.

## Lifecycle and projections

`lobby -> choosing -> awaiting-ready -> running`, with host abort available
at every stage. Host Begin requires the complete 7/8/9-seat roster. It freezes
admissions and bot capacity. Every human explicitly confirms a unique character
and name; historical lobby suggestions require confirmation again. Draft edits
are permitted only while choosing and reset that human's confirmation.
Character IDs are unique. Name claims compare NFKC-normalized, trimmed,
lowercase values. Cached acknowledgments do not reconfirm an edited draft.

The last choice confirmation persists one private random deal, independent of
names and characters. The stored deal includes role order, Code extras, round
orders, original admission rooms, version pins and its asset manifest pin.
Transactions reuse the invocation's random candidate across retries. Clients
cannot read `matches/{matchId}/setup/deal`.

`matches/{matchId}/setup/public` contains strict `FullSetupDocument`: versions,
match ID, count, revision, stage, opaque deal ID and neutral seat confirmation /
readiness flags. It contains no roles, Code, knowledge, phase or resources.

`matches/{matchId}/setupPlayerViews/{uid}` contains strict
`FullSetupPlayerView`: lifecycle, version pins, match/count/deal ID, binding
revision, own audience seat and own role. This is a partial pregame view.
Insider/Hacker/Alien starting knowledge becomes available in `FullPlayerView`
when actual gameplay starts. Only the active human binding can read its preview;
host and display have no private-view shortcut. Each Ready deletes that human's
preview. Authorized missing-preview reads support neutral waiting UI.

No engine state, gameplay projection, own acknowledgments, event journal,
deadline outbox or bot gameplay exists before all current humans are Ready.
Bots confirm and Ready automatically. All-bot rosters therefore launch in one
Begin transaction. Final human Ready creates the engine once and starts a fresh
full 60-second turn using server time. The immutable prepared deal supplies the
same role and room assignments. Gameplay triggers observe that engine write.

The internal `control/session` uses `lifecycleVersion: staged-start-1`,
`gameStarted: false` with `lobby`, `choosing`, `awaiting-ready`, and
`gameStarted: true` with `running`. Terminal updates preserve both markers;
`complete` / `aborted` are still terminal control statuses. Pregame abort keeps
`gameStarted: false`. Strict coarse lobby status stays `lobby` through choosing
and awaiting-ready. Public setup stage stays `running` after normal completion,
meaning setup has finished; gameplay/lobby projections carry the terminal result.
Unknown lifecycle markers fail closed. Existing engine state is never replaced
by a staged-start request.

## Browser operations

All three HTTP bodies require `schemaVersion: 1`, `protocolVersion: 2`,
`matchId`, `requestId`. Auth supplies UID; no body UID or seat claim is accepted.
Lifecycle version belongs to documents, not these request/response bodies.

| Endpoint / service method | Additional request fields | Success stage |
| --- | --- | --- |
| `v1BeginSetup` / `beginSetup` | none; current host only | `choosing`, or all-bot `running` |
| `v1ConfirmSetupChoice` / `confirmSetupChoice` | `bindingRevision`, `displayName`, `characterId` | `choosing` or `awaiting-ready` |
| `v1ReadyForMatch` / `readyForMatch` | `bindingRevision`, `dealId` | `awaiting-ready` or `running` |

Success binds `matchId`, `requestId`, revision, stage, deal ID and server time;
player successes also bind seat ID and current binding revision. Refusals use
the dedicated strict operation schemas. A request ID binds the operation and
complete parsed payload. Retrying the same intent is safe; reuse for another
payload returns `REQUEST_ID_CONFLICT`. Current binding/deal authority is checked
before cached success. The endpoints retain Auth, App Check, configured-origin,
JSON/4 KiB guards and typed 409 refusals. New endpoints have min 0 / max 12
instances; existing caps are unchanged.

## Recovery and compatibility

Seat recovery preserves chosen identity, initial room and the same prepared
deal. In awaiting-ready it deletes the displaced UID's preview, increments the
binding revision, resets that seat's Ready flag and creates the replacement's
own preview. The replacement must Ready explicitly. The displaced UID loses
reads and cached operation replay. Choosing recovery preserves confirmation;
the replacement still needs the role-stage Ready. Running recovery preserves
existing gameplay behavior and does not restart or pause the engine.

Fresh `v1StartMatch` requests are refused and cannot bypass the lifecycle.
An authorized exact historical start receipt remains replayable. Existing
running protocol-2 matches without lifecycle markers retain gameplay Rules and
service behavior; protocol-1 compatibility remains. New lifecycle markers gate
all gameplay projection reads until actual launch. Private prepared deals and
server operation receipts remain inaccessible to clients.

## Validation and integration

At clean runtime checkpoint `297de42609ff575aa914e0f852aba80482957622`,
`npm run verify` passed: 876 workspace tests, 70 static checks, 483 catalogue
scenarios (33 reviewed blocked and 6 explicit manual), 4,388 detected controls,
and 30 completed 7/8/9-seat playouts with zero invariant/replay mismatches.
The 107 backend/HTTP and 17 focused contracts tests are included in those counts.
Browser dependency/exclusion smoke and standalone backend package installation
also passed. These checks do not connect a browser or deploy a runtime.

Isolated local Auth/Firestore runs passed 67 existing regression/Rules cases
and all 19 focused staged-start cases. The first broad run passed 85/86: a new
assertion incorrectly expected a pregame internal deadline refusal rather than
the existing safe unchanged result. After correcting that assertion, the entire
19-case staged-start module passed. No gameplay or deadline behavior changed to
satisfy it. Tests used demo-mothership, Auth 39199 and Firestore 38180, with a
private hub/logging/temp directory and an exact copy of current Rules. Other
agents' emulators and cloud resources were untouched.

Actual HTTP/Functions-trigger smoke is migrated and included in CI, with no
manual bot-worker fallback. It was not run in the isolated local suite because
the existing guarded Functions runtime pins ports owned by another workstream.
Full CI and combined Frontend emulator acceptance remain pending. Backend-only
Frontend emulator flows still require the coordinator's new adapters, host
control reader and staged setup harness before they can pass. Do not deploy the
backend independently of that integration. No cloud deployment, IAM or
configuration changes have been made from this workstream.

Frontend controls, preview waiting UI, the owner decision record, Frontend
emulator migrations and the root standalone-export assertion update are owned
by the coordinator's integration branch. Bring those changes into the combined
candidate before publication. Backend PR targets `codex/v1-practice-bots`; no
merge is performed from this workstream.
