# Food Task runtime candidate

Work item #234. Runtime worktree `/private/tmp/gamen-backend-food-task-runtime`,
branch `codex/backend-food-task-runtime`, actual starting SHA
`5a5bb9068cd4fb085cb2482cd969058221d2c870`. This starts from the exact contract
accepted by Integration and Frontend on 13 November 2026. Contract PR #236 is
merged. The runtime branch fast-forwarded safely to shared baseline
`f9e7e11bd6c23671f96832bf45d79146e6fd855c`; its committed tree was identical to
the actual starting contract. This separately reviewable implementation retains
all local work and the original starting SHA above.

The candidate targets protocol 3 / planet-game-1.4.0 /
in-person-planet-food-task-2026-11-12. Existing creation defaults, saved tuples,
old packets and replay semantics remain unchanged. No deployment, IAM or live
cloud configuration change is part of this implementation.

## Candidate service seam for affected-role review

The existing ordinary snapshot remains the source for names, characters,
original room/slot and ordinary phase. The candidate adds `foodPublicView` and
`foodPlayerView` to the same response, gated to the exact Food tuple. The Food
subtree uses that response's single serverTimeMs sample; it never combines
unrelated asynchronous reads. Historical snapshots omit both fields.

New authenticated operations are `foodCommand` (strict reviewed request),
`foodReceipt` (own original command lookup) and `foodHeartbeat` (own server
presence lease). No actor, assignment, client time, death, defense or food grant
is accepted from the caller. Heartbeats renew a server lease; expiration records
absence and then the approved full eight-second grace. Losing a connection
never fabricates a Hold release.

While a Task is privately active, an authenticated own snapshot or command also
renews that living participant's two-second lease. It cannot renew another seat.
An offline participant reconnects only after due original boundaries are drained;
an elapsed eight-second grace cannot be undone by a later read. Original command
receipt recovery performs no new presence or gameplay mutation.

The candidate transport policy is exported as `FOOD_TASK_TRANSPORT`: one in-flight
snapshot every 500ms through the entire 32.5-second public AWAY interval; coalesce an
accepted-command refresh and reset that timer. Use a one-second heartbeat only
when a fresh snapshot has not renewed the connection. Stop heartbeats at the
private terminal outcome, while continuing snapshots until common return.
Separate authenticated UID budgets per minute are snapshot 180, presence 90,
input 120, closure 120 and control 30. HOLD UP and HOLD_RECOVER_OFF use the closure
bucket; snapshot/presence/input exhaustion cannot consume it. Exact stored
command retries and own receipt lookup precede fresh limits. Historical profiles
retain their existing 120-per-minute limit. These are transport bounds, not
physics, role eligibility or additional actions.

Task input receipt time is the **successful durable admission** point, not an
HTTP arrival timestamp that could race an earlier uncommitted request. The
admission transaction deduplicates, assigns the per-match sequence and a
monotonic server time, and persists the exact input/context/random stream.
Processing drains the committed prefix in sequence order using those immutable
times. Processing retries never retime a press or reroll a hazard. A deadline
worker fences admission, drains that prefix, then advances the clock. These
candidate-only internals do not change predecessor transaction semantics or
weaken #206 assertions.

Public phase/absence timing stays independent of private motion and terminal
boundaries. The private outbox uses the earliest pending boundary and fresh
private deadline token; it does not publish that private deadline through the
ordinary phase. Reconnect and late workers drain all due Task boundaries before
admitting a new input, retaining the original Task and common-return times.

One current participant's `participantTask.ownReturnPlacement` is server-computed
from the recorded original place and the narrow Captain exception below. It is
required in the exact runtime snapshot, optional in the standalone generic
contract, absent for nonparticipants, and never includes the partner's fallback.
Frontend must consume it rather than infer a destination from the frozen board.
Integration accepted the shared field/transport seam at exact commit
`d0a12f252d9d076c0978b97cfcdf942e5f0e4a75`, independently rebuilding and passing
209 focused runtime/contract checks. The native consumer/visual review remains
part of the combined release gate.

An abort archives the private Food step without a live deadline or controls. The
ordinary publication mask is retained, so aborting cannot prematurely publish a
private death or officer loss. The archived authority survives JSON restore;
aborted snapshots follow the existing service's null-view behavior. No return,
meal, delivery or press is generated by abort cleanup.

## Recorded Captain-return decision

A Captain can participate from Command Room under Food eligibility. If killed,
the latest Food record returns participants to their recorded place at the
common boundary. C1 would then be occupied by the body, and eliminated occupants
count toward its capacity of one. The inherited capacity-resolution owner
decision instead returns an eliminated former Captain to their last ordinary
room (or the other if full), and existing elections place the new Captain in C1.

Evidence: Food owner record, “Both participants return” paragraph;
`rules/overlays/room-capacity-resolution-owner-decision-2026-10-12.json`,
Captain-loss decision and unchanged capacity; engine `voteClosed` assigns C1.
The owner explicitly selected the inherited Captain-loss return on 13 November 2026.
The focused owner record/overlay added in this PR binds that exception: last
ordinary room, otherwise the other if full, at the unchanged 32.5-second common
return. All other participants retain their recorded places. No eligibility
exception or mid-round election is added.

## First engine review checkpoint

This checkpoint contains the candidate authority/tuple, exclusive Food phase,
pure Task machine, selected-world ledger, fixed-return masking, hunger/medical
integration and same-response service contract. The transactional service and
worker are being integrated separately; this checkpoint is not ready to merge
or activate by itself. Frontend owns the new checkpoint's presentation label.

Actual local checks on Node22.21.1:

- Contracts and engine project build passed.
- Pure Task/food ledger suites:81/81 passed.
- Constructed physical-stage suite:41/41 passed.
- Native lifecycle/journey controls:18/18 passed; subsequent targeted recovery,
  Protection/luck and Hack checks:12/12 passed (three repeat cooperative cases).
- Native fork/whole-reality Sync/hunger histories:3/3 passed, with exact replay.
- Historical golden replay/version suites:45/45 passed, retaining original
  state/public/player checkpoint hashes and old-field absence.
- Accepted Food contract conformance suites:159/159 passed.
- Runtime authority/old-tuple rejection checks:4/4 passed.

These results describe the first engine checkpoint; the completed service checks
below supersede its earlier unrun service boundary.

## Service integration and verification

The explicit `food-task-1.4` profile wires the real engine through the existing
authenticated endpoint, private Firestore authority, bot trigger, deadline Task
and repair outbox. The infrastructure accepts this opt-in profile without changing
the creation switch, default profile, setup flow or asset selection. No cloud
environment has been changed. Practice bots use only their own authorized Food
view; they prefer an eligible human Partner using existing public controller
metadata. Roles and personality presets do not select partners or Task controls.

Actual checks on Node22.21.1/npm10.9.4:

| Check | Actual result |
| --- | --- |
| Contracts/engine/service/Firebase project build | Passed |
| Workspace/source/toolchain integrity | Passed |
| All engine test files | 1,697 passed; zero failures/skips |
| Latest abort/return projection controls | 18 passed, including killed participant and pre-return JSON restore;12 latest archive/corruption controls passed |
| All backend/Firebase unit test files | 451 passed; zero failures/skips |
| Final native service controls | 10 passed; latest combined mock/native rerun41/41 passed |
| All bootstrap contract/version test files | 367 passed; zero failures/skips |
| Genuine Firestore normal-setup journeys | 6 passed:7/8/9 players, both human controls |
| Latest historical replay/version rerun | 45 passed; original hashes/assertions unchanged |

The native and Firestore journeys use normal timed setup/boarding, an eligible
bot's invitation, the human's own view and real engine commands. Each samples all
66 snapshots at500ms and attempts33 heartbeats at1s through the full32.5-second
AWAY interval; private-terminal heartbeats correctly reject while polling
continues. They verify delivery once, fixed return, service restart/original
receipt time, and one ordinary meal despite retries. Native controls additionally
saturate real snapshot/input budgets before a causal UP, and prove that a fresh
offline DOWN journals COMMAND before reconnect PRESENCE with exact encoded-state
replay. A host can abort the active Task and recover the original own receipt.

The independent service audit found that reconnect presence was initially
journaled ahead of the command that actually preceded it; the record order is now
corrected and the exact replay control passes. The independent rule audit found
the Food-abort validation failure; the archival fix and privacy controls above
address it. Its separate six Captain controls and source-hash audit passed.
The unversioned historical checkpoint helper also keeps its predecessor phase
matrix; Food extensions require the explicit versions argument. The original
Blackout contract assertion remains unchanged.

Whole-workspace type checking currently fails at
`packages/presentation/src/planet/library.ts:28` because the Frontend-owned label
map lacks `FOOD_RETURNED`. The focused Backend build passes; the connected consumer
must supply that label in the combined candidate. Full `npm run verify` and
physical-device checks are not claimed. The capacity playout timeout remains
Integration-owned and unchanged. All nine GitHub checks at runtime head
`67b7ea5a2c65a9b2f4c09527c9b2f2d53b902ed4` stop at this same missing mapping;
their emulator/test stages have not established a passing result.

Real Functions/Tasks connected acceptance is still under investigation: the first
three-match cooperative script reached return without delivery. The deterministic
and genuine Firestore controls pass; this does not waive the real connected exit
check or establish a gameplay change. Record the reproducible diagnosis and final
result before requesting runtime approval. Source-only/mock checks do not prove
hosted multiplayer correctness, real-network speed or human social-deduction
balance.

The isolated real seven-player rerun also exposed API calls taking2.6–4.2seconds,
and the corrected timed-input driver reached its240-second test limit. Raw
Firestore trigger counts include immediate namespace-filtered no-ops and are not
counts of actual bot evaluations. Source inspection does establish that multiple
bot workers can separately decide work exists and then admit redundant CLOCKs.
The narrowly scoped correction is being reviewed as private per-match worker
coalescing with fenced admissions and durable expiry/rearming; human commands,
causal UP, engine boundaries and committed-prefix processing keep their authority.
Reproduction and exit check:
https://github.com/Amirkianfar66/GameN/issues/237#issuecomment-6855462405.

## Finite remaining review checklist

- Complete the real HTTP/private-trigger/Tasks connected acceptance or document
  its concrete blocker with reproduction and exit check in release issue #237.
- Obtain final exact-head adapter/worker review. Integration has accepted the
  committed field/transport seam; no further owner rule vote is open.
- Integrate the Frontend-owned checkpoint label and connected consumer, admit the
  exact artwork closure, then run combined CI/connected/Designer release gates.
- Integration alone pins and activates the combined Food test1 artifact after
  those gates. This Backend PR performs no deployment or default activation.
