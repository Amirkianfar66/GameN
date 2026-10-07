# Staged match start backend handoff

Issue: [#73](https://github.com/Amirkianfar66/GameN/issues/73).
Backend draft PR: [#74](https://github.com/Amirkianfar66/GameN/pull/74).
Timed service runtime checkpoint: `f44562d3575c6a23cba105b85e90b694badfce63`.
Prior timed emulator test checkpoint: `6cca76710a276cba3a008d05b8e33d5049c177cf`
(test-only synthetic name correction; runtime unchanged).
Rules listener compatibility checkpoint: `14fb2ed8a7f9d2b388771085d54a7361f5f441fc`.
Immutable-request reconciliation checkpoint: `f058028cfd6e90513a6479e0e4bb6c4372259703`.
The subsequent smoke-test follow-up observes automatic local Tasks delivery; it
does not change the timed service runtime or Rules from those pins.
Timed contracts checkpoint: `c185c157ae25404c0e8e0ae44aaa3d5b6e99ffbc`.
Deployed base: `af797838dee531d7874da2145e99a50c67d32b45` (practice-bot release).
Prior untimed checkpoints `297de42609ff575aa914e0f852aba80482957622` and
`d5339adc13a6fcbaf0b32cdd5b7f942a00c44717` are historical evidence only.

Protocol remains `2`; lifecycle is `staged-start-1`. Engine remains
`full-game-1.0.1`; ruleset remains `in-person-v1-2026-10-06` with hash
`6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`.
Original Powers remain disabled. Initial rooms are selected at admission,
before the private deal, and preserved through all stages and recovery.
Gameplay canon and engine code are unchanged.

## Timed lifecycle and projections

`lobby -> choosing -> awaiting-ready -> running`, with host abort available
at every stage. Host Begin requires the complete 7/8/9-seat roster and freezes
admissions and bot capacity. Begin always opens a full 30-second choosing window;
even an all-bot roster or every human's confirmation cannot prepare the deal
early. Bots begin confirmed and not Ready. Humans may confirm unique characters
and names before `choosingEndsAt`. Draft edits are permitted only during that
window and reset that human's confirmation. Character IDs are unique. Name
claims compare NFKC-normalized, trimmed, lowercase values. Cached acknowledgments
do not reconfirm an edited draft.

At or after the choosing deadline, the server setup worker preserves confirmed
choices and fills each unconfirmed choice with an available unique character
and name. A historical suggestion can be reused if available, but is not an
explicit confirmation. Conflicting or missing suggestions receive deterministic
available choices. The worker locks identities and persists one private random
deal, independent of names and characters. It records role order, Code extras,
round orders, original admission rooms, version pins and the asset manifest pin.
Transactions reuse the invocation's random candidate across retries; duplicate
delivery does not replace the committed deal. Clients cannot read
`matches/{matchId}/setup/deal`.

The deal transaction opens a full 30-second reading window from its actual
server evaluation time: `readingStartedAt >= choosingEndsAt` and
`readingEndsAt = readingStartedAt + 30000`. Delayed choosing-task delivery
therefore preserves a complete reading window. It marks every seat confirmed,
sets bots Ready automatically, and creates human role previews.

`matches/{matchId}/setup/public` contains strict `FullSetupDocument`: schema,
protocol and lifecycle versions, match ID, count, revision, stage, nullable
opaque deal ID, and neutral seat
confirmation/readiness flags. Five additional fields are required even when
null: `setupId`, `choosingStartedAt`, `choosingEndsAt`, `readingStartedAt`, and
`readingEndsAt`. Lobby has all five null; choosing has an opaque `setupId` and
the exact 30-second choosing interval, with reading fields null. Awaiting-ready
and running retain both exact intervals and the same setup/deal IDs. Abort
retains the coherent timing subset already reached. These fields contain no
roles, Code, knowledge, gameplay phase or resources. Consumers must adopt the
strict timed schema at the pinned checkpoint.

`matches/{matchId}/setupPlayerViews/{uid}` contains strict
`FullSetupPlayerView`: lifecycle, version pins, match/count/deal ID, binding
revision, own audience seat and own role. Insider/Hacker/Alien starting knowledge
arrives in `FullPlayerView` only when gameplay starts. Only the current human
binding can read its own preview; host and display have no private-view shortcut.
Existing preview documents require the current matching reading stage,
coherent exact windows, current durable deal/version pins and active binding.
The server-only publication owns the time gate. Read Rules do not compare
`request.time` to the reading start: Firebase defines that value as the time the
request was received, and integration observed an older open watch stream
refusing an otherwise authorized newly published role. See the
[Firebase Rules request reference](https://firebase.google.com/docs/reference/rules/rules.firestore.Request).

An active human can read their own missing preview at any stage. This returns
no role data and lets a live SDK listener receive deletion at launch or abort
without losing its public streams. Existing preview data remains strictly gated;
anonymous, host/display-only, other-seat, bot and displaced bindings remain
denied. This is an own missing GET allowance, not a list or write permission.

A human can press Ready early and continue reading the same preview. Ready does
not delete it or shorten the reading window. Gameplay requires both
`serverNow >= readingEndsAt` and every current human binding Ready. If any human
is missing when the reading timer expires, setup remains awaiting-ready with its
previews intact; a later Ready can launch once all humans are Ready. All-bot
rosters likewise wait both windows, at least 60 seconds after Begin; delivery
delay can extend that wait. Actual launch deletes all human previews and creates
the engine, gameplay projections, own acknowledgments, SETUP journal and gameplay
deadline outbox once. No such gameplay state or bot gameplay exists before both
gates. The first ordinary turn receives a fresh full 60 seconds from actual
launch time, including launch after late Ready. The prepared deal supplies the
same role and room assignments, and the engine write activates gameplay triggers.

The internal `control/session` uses `lifecycleVersion: staged-start-1`,
`gameStarted: false` with `lobby`, `choosing`, `awaiting-ready`, and
`gameStarted: true` with `running`. Terminal updates preserve both markers;
`complete` / `aborted` are still terminal control statuses. Pregame abort keeps
`gameStarted: false`. Strict coarse lobby status stays `lobby` through choosing
and awaiting-ready. Public setup stage stays `running` after normal completion,
meaning setup has finished; gameplay/lobby projections carry the terminal result.
Unknown lifecycle markers fail closed. Existing engine state is never replaced
by a staged-start request.

## Browser operations and server timers

All three HTTP bodies require `schemaVersion: 1`, `protocolVersion: 2`,
`matchId`, `requestId`. Auth supplies UID; no body UID or seat claim is accepted.
Lifecycle version belongs to documents, not these request/response bodies.

| Endpoint / service method | Additional request fields | Success stage |
| --- | --- | --- |
| `v1BeginSetup` / `beginSetup` | none; current host only | always `choosing`, deal ID null |
| `v1ConfirmSetupChoice` / `confirmSetupChoice` | `bindingRevision`, `displayName`, `characterId` | runtime confirmation stays `choosing`; schema also accepts `awaiting-ready` |
| `v1ReadyForMatch` / `readyForMatch` | `bindingRevision`, `dealId` | `awaiting-ready` or `running` |

Success binds `matchId`, `requestId`, revision, stage, deal ID and server time;
player successes also bind seat ID and current binding revision. Refusals use
the dedicated strict operation schemas. A request ID binds the operation and
complete parsed payload. Retry the same immutable intent after transient
`UNAVAILABLE`, or after the supplied `retryAfterMs` for `RATE_LIMITED`; a changed
payload requires a new request ID. Reuse for another payload returns
`REQUEST_ID_CONFLICT`. Current binding/deal authority is checked before cached
success. A cached response describes that operation's result; listeners supply
current stage and timing. The endpoints retain Auth, App Check, configured-origin,
JSON/4 KiB guards and typed 409 refusals. New endpoints have min 0 / max 12
instances; existing caps are unchanged.

Setup deadlines use a separate strict internal four-key payload:
`{ matchId, setupId, stage, deadlineToken }`, where stage is `choosing` or
`awaiting-ready`. It carries no browser request ID, UID, gameplay phase ID or
protocol field. Only the server generates the opaque deadline token. Its task
ID is the lowercase SHA256 of
`JSON.stringify(['setup', matchId, setupId, stage, deadlineToken])`; the token
itself is an opaque ID, not the hash. The private
`matches/{matchId}/setupOutbox/{taskId}` intent records the same payload,
`protocolVersion: 2`, `kind: SETUP_DEADLINE`, `dueAt`, task ID, status, attempts,
retry time and lease fields. Clients cannot read or write it. It is separate
from the gameplay deadline outbox.

`runSetupDeadline` validates the persisted intent and current setup epoch,
stage, roster and authority before transitioning. It returns `advanced`,
`unchanged`, `too-early`, `failed` or `blocked`; only `too-early` carries the
positive remaining `retryAfterMs`. Duplicate completed delivery is unchanged.
Early delivery cannot complete the intent. The task adapter throws for early
or failed evaluation so delivery can retry. The reading timer can complete
safely while waiting for missing human Ready; subsequent Ready retains the
time gate and can launch.

The production module now exports 24 V1 functions, including
`v1SetupDeadlineTask`, `v1DispatchSetupDeadline`, and `v1RepairSetupDeadlines`.
The task function is private in `us-central1`. The Firestore creation trigger
dispatches setupOutbox intents with their hashed task IDs and scheduled due time.
The scheduled repair runs every minute with a maximum 100-intent page per
invocation, handling pending, expired leased and dispatched intents. At due
time it evaluates the durable intent directly, including already-dispatched
but lost tasks; Cloud Tasks task-ID tombstones do not suppress that recovery.
The service exposes pagination for additional pages. The schedule and bounded
page size are not a promise that every backlog completes within one minute.

## Recovery and compatibility

Seat recovery preserves chosen identity, initial room, setup ID, original
windows and the same prepared deal. In awaiting-ready it deletes the displaced
UID's preview, increments the binding revision, resets that seat's Ready flag
and creates the replacement's own preview. The replacement must Ready explicitly,
including recovery after the reading deadline while gameplay is still waiting.
The displaced UID loses reads and cached operation replay. Choosing recovery
preserves confirmation; the replacement still needs the role-stage Ready.
Running recovery preserves existing gameplay behavior and does not restart or
pause the engine. Abort deletes previews and prevents stale setup timers from
launching gameplay.

Fresh `v1StartMatch` requests are refused and cannot bypass the lifecycle.
An authorized exact historical start receipt remains replayable. Existing
running protocol-2 matches without lifecycle markers retain gameplay Rules and
service behavior; protocol-1 compatibility remains. New lifecycle markers gate
all gameplay projection reads until actual launch. Private prepared deals,
setup intents and server operation receipts remain inaccessible to clients.

## Verification and integration status

At clean runtime checkpoint `f44562d3575c6a23cba105b85e90b694badfce63`,
`npm run verify` passed all 890 workspace tests, 70 static checks, 483 catalogue
scenarios (33 reviewed blocked and 6 explicit manual), 4,388 detected controls,
and 30 completed 7/8/9-seat playouts with zero invariant/replay mismatches.
The 118 backend/HTTP and 20 timed contracts tests are included in that evidence.
Browser dependency/exclusion smoke and standalone backend package installation
also passed. The package-install script still checks the original 18 endpoint
names; the coordinator owns its update to cover all 24. Runtime export metadata
coverage includes the six staged-start HTTP/private setup Functions.

At test checkpoint `6cca76710a276cba3a008d05b8e33d5049c177cf`, the pinned Firebase
CLI `15.0.0`, Java 21, Node `22.21.1` and current Rules/index copies passed all
97 isolated Auth/Firestore cases: 33 focused staged-start/Rules/setup-outbox
cases and 64 existing service, identity, acknowledgment, Rules and practice-bot
regressions. The suite used demo-mothership, Auth 39199, Firestore 38180 and
private hub/logging/temp paths. Those processes stopped after acceptance;
other agents' guarded 9199/8180/5101 runtime was not changed.

The initial broad run passed 94/97 before correcting two fake-clock replay
expectations and a synthetic historical-name confirmation. An intermediate
focused rerun passed 32/33; the replacement synthetic name exceeded the existing
12-code-point limit. The final name is valid and all 97 cases pass. No runtime
change was made to satisfy those assertions.

Coverage includes 7/8/9 seats, no early deal/engine, exact windows, automatic
unique choices, retained previews, late Ready, delayed/duplicate/stale timers,
recovery/abort races, durable lost-task repair and all-bot waiting. These backend
tests verify REST Rules reads and persisted service state.

At Rules checkpoint `14fb2ed8a7f9d2b388771085d54a7361f5f441fc`, all 34 focused
setup/Rules/outbox cases passed. The subsequent 64-case regression run passed
63/64: one concurrent draft/confirmation test required the documented bounded
reconciliation of a transient transaction refusal with its original immutable
requests. Its test-only correction retries only `UNAVAILABLE`, at most twice,
validates every response and retains all identity/lock/gameplay assertions.
The full affected identity module then passed 11/11. Thus all 98 distinct local
cases have passing coverage across these reruns; a clean one-pass 98-case run
is not claimed. Standalone installation and production exclusion passed again
with the corrected Rules. All isolated processes stopped afterward.

The coordinator's integration commit
`fc97ecb568f5ca6746a37ed77fba4e356a191c45` adds
`apps/game/test-emulator/connected-setup-listeners.test.mjs`. Its reported local
1/1 pass uses real modular SDK listeners across both transitions with full
30+30-second windows, two humans/five bots, early and late Ready, no reload and
zero listener errors. This backend branch does not adopt or execute that
Frontend-owned test. The coordinator also reported host-away browser and
all-bot acceptance. Passing combined GitHub CI and the strengthened automatic
Functions smoke remain integration gates; local adapters do not prove cloud
Tasks/IAM delivery.

Historical untimed evidence at `297de42609ff575aa914e0f852aba80482957622`:
`npm run verify` passed 876 workspace tests, 70 static checks, 483 catalogue
scenarios (33 reviewed blocked and 6 explicit manual), 4,388 detected controls,
and 30 completed 7/8/9-seat playouts with zero invariant/replay mismatches.
The 107 backend/HTTP and 17 focused contracts tests were included. Browser
dependency/exclusion smoke and standalone backend package installation passed.
Historical isolated Auth/Firestore evidence was 67 existing regression/Rules
cases plus the corrected 19-case untimed staged-start module. The initial broad
run was 85/86 before its pregame deadline assertion was aligned with the safe
unchanged result. Those results, and the later prior untimed `d5339ad` checkpoint,
do not verify this timed implementation.

The earlier combined CI run [37698800982](https://github.com/Amirkianfar66/GameN/actions/runs/37698800982)
at integration commit `c0f5a1a6fffafac959dc02cff17889ea8180637b` passed 59/114
Backend emulator cases and failed 55. Its two real HTTP/Functions smoke tests
passed, but still manually delivered persisted setup intents. Firebase CLI
15.0.0 automatically started the Tasks emulator with Functions, contrary to the
previous handoff description. Real-clock V1 triggers consumed injected-clock
fixtures, producing current timestamps where those tests required their own
historical clock. This is a test-boundary failure; the source review found no
production timing defect from that evidence.

The strengthened HTTP and all-bot smoke tests now observe automatic local
Firestore dispatch and Tasks progression, with a bounded 60-second wait per
stage and a 180-second test timeout. They retain exact 30-second selection and
reading windows, no early engine, one SETUP journal event and matching initial
outbox bound to the match, phase, token and deadline, and a fresh 60-second
gameplay phase. The all-bot smoke still requires
an accepted command from the actual private engine trigger, with no manual
setup/bot worker or client gameplay invocation, and host abort cleanup. These
observation-only versions have passed JavaScript syntax, workspace boundary and
source integrity checks, but have not run against Functions; CI must validate
their exact pin.
They cannot prove deployed Cloud Tasks delivery, IAM, Scheduler or device
acceptance.

The coordinator owns the root orchestration correction: 98 injected-clock and
Rules cases run under Auth/Firestore only; a fresh Functions suite runs all 14
legacy service cases before the two V1 smoke cases, retaining all 114 cases and
all 7 Frontend cases. Explicit ordering keeps the legacy broad outbox repair
away from V1 intents. Starting Functions must not reuse the fake-clock database.

Frontend strict timed-schema adoption, countdown/preview/Ready controls,
consumer emulator migration and combined candidate verification require the
coordinator's integration branch before publication. No cloud deployment or
changes to cloud IAM/configuration were performed by this workstream; no merge
or independent backend deployment is claimed.

Source references: [timed schemas](../../packages/contracts/src/staged-start.ts),
[service transitions and durable intents](../../services/game-api/src/full-game.ts),
[Functions adapters](../../infra/firebase/src/v1.ts),
[production exports](../../infra/firebase/src/production.ts),
[Rules](../../infra/firebase/firestore.rules), and
[actual Functions smoke](../../infra/firebase/test-emulator/v1-practice-bots-functions.test.mjs).
