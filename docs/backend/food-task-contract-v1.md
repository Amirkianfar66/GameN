# Food Task contract v1 — review proposal

Deliverable: [#234](https://github.com/Amirkianfar66/GameN/issues/234), consumer
[#235](https://github.com/Amirkianfar66/GameN/issues/235). This contract-first PR
adds strict candidate schemas, pure input-ordering/clock guards and conformance
examples. It does not implement the Task physics, API adapter, presence driver,
meal consumption, hunger, runtime dispatch, artwork or activation.

Implementation base: **1f795366a27b17f46ac195debe491954a27d8ae0**. Preparation used candidate
`262f35a63f2afa8dc0918ca86507c00edefabcf8`, Designer
`9bb497948861521030c37a8d2c60a6318f1745c9` and their integration parent
`8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d`. The later owner adoption of all four
Hold continuations is [comment 6849280539](https://github.com/Amirkianfar66/GameN/pull/233#issuecomment-6849280539).
The updated candidate records that adoption without rewriting either reviewed
commit, the parent authority or the pinned design evidence.

## Version boundary

Target: protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`. The schemas are standalone exports.
Neither `PlanetVersionsSchema`, existing command/view schemas, engine defaults
nor creation profiles accept or select this tuple in this PR. A hash-shaped
string is not proof of authority: `parseFoodTaskView` additionally binds the
match, authenticated seat and exact reviewed match versions/hash/art. The later
runtime PR must register the final reviewed executable authority and inherit
1.3 behavior explicitly. Historical saved packets stay field-absent and exact.

## Commands and receipts

`FoodTaskCommandRequestSchema` requires `schemaVersion:1`, `protocolVersion:3`,
`matchId`, `commandId`, `phaseId`, `foodStepId`, `round` and one strict command:

| Command | Caller-supplied fields |
| --- | --- |
| `TASK_ASK` | `partnerSeatId` |
| `TASK_ANSWER` | `requestId`, `requestRevision`, `answer: JOIN or DECLINE` |
| `TASK_ASK_WITHDRAW` | `requestId`, `requestRevision` |
| `TASK_PRESS` | `taskId`, `controlSessionId`, `expectedControlRevision`, `input` |

The input is `HOLD {edge:DOWN or UP, gestureSequence, crateId}` or one of
`PANEL_RELEASE`, `PANEL_LOCK`, `KEY`. Protocol recovery also accepts
`HOLD_RECOVER_OFF {recoveryRevision, throughSequence}` within TASK_PRESS. It is
explicit reconciliation of a locally released finger, with one visible Hold control. Pointer
up, pointer cancellation, focus loss and explicit backgrounding all send the
same UP input; the client does not send a second attack/cancel game action.
Crate ID may be null on an initial contact or release before acknowledgement.
Known crate IDs are generation preconditions; an unbound accepted contact binds
the first eligible server crate exactly once. Neither edge can change that
binding after acquisition.

Actor identity, control assignment, authoritative time, RNG, Protection, hazard
target/outcome and food grants are forbidden in requests. Authentication,
current membership, match/phase/step/round, request ownership and Task/control
session must be checked by the eventual adapter. Control sessions are
server-issued Task/seat assignments, not browser identities; recovery of that
seat does not replay old DOWN inputs. Revoked identities remain denied.

`FoodTaskReceiptSchema` is presser-only and stores the original server receipt
time. Accepted request receipts identify one request and its terminal state.
Accepted input receipts describe APPLIED, GESTURE_CLOSED, NO_CHANGE or
RECOVERED_CLOSED, without
defense, roll or kill-cause fields. Semantic rejections are durable too.
`FoodTaskStoredReceiptSchema` binds the actor and canonical request hash.
Receipt lookup happens after authentication but before new phase, death, expiry
or effect validation. Exact retries return the original response byte-for-byte;
reusing a command ID for a different request is a conflict, never a second input.
Persist receipt, authority transition and any randomness in one transaction.

`parseFoodTaskReceipt` correlates every reply to the original request context,
family, Task/session and gesture, plus the authenticated own seat for closures.
REQUEST_CLOSED carries the original private request closure, not a current request
that happened to replace it. `requestClosures` lets the original pair show joined,
withdrawn, declined or expired states after the active invitation clears. It is
never a public refusal history. A new request begins at revision 0 and its one
terminal transition advances to revision 1.

## Same-snapshot command context and revisions

Every view carries its authoritative `phaseId`; `step.stepId` is `foodStepId`.
Together with match/round and the remembered command ID these supply the request
context. `parseFoodTaskView` binds phase, round, exact versions/hash/art and server
time to the **same API response** that carries the ordinary Planet snapshot.
Never borrow phase or command context from an unrelated asynchronous read.

`serverNowMs` is transport clock metadata, copied from that response's single
`serverTimeMs` sample, not a new gameplay publication. It is excluded from the
revision body by `foodTaskRevisionBody`; all other authorized fields remain
revision-protected. A clock-only poll can retain viewRevision. An offer, physical
anchor, closure or other visible state change requires its audience revision to
advance. Existing consumers must explicitly adopt this versioned normalization;
this does not claim their historical same-revision checks already allow it.

## Hold ordering and crate custody

Gesture identity is `(taskId, controlSessionId, gestureSequence)`. Sequence is a
positive safe integer local to that server control session. Crate identity is
server-issued and changes on replacement; intake returns and safety-brake
custody keep the same crate identity. The pure `food-task-hold` ledger emits
NONE, ACQUIRE or RELEASE. It does not decide physics, roll hazards or consume
food. Apply its effect and persist its ledger atomically in the future engine.
Its effect tuple key is internal; it is not a wire event ID.

| Server arrival history | Required result |
| --- | --- |
| UP A arrives before DOWN A | Persist A's CLOSED tombstone; late DOWN cannot acquire now or later. |
| DOWN A is pending, then UP A before pickup | Close the held intent; a later eligibility boundary cannot pick up. |
| DOWN A arrives before its acknowledgement, then UP A with no crate ID | Resolve only A's durable binding at UP's original server receipt time. |
| DOWN A is unbound and held before the hook is eligible | Acquire once when the authoritative hook/briefing/physical boundary permits it; no repeat press. |
| A releases, B takes the same brake-held crate, then a separate-ID old UP A arrives | A is already closed; no release of B and no second hazard roll. |
| B overtakes UP A while A still holds | B does not invent a release of A. A's later matching UP may still release A. |
| Same-ID UP A retry after B starts or the Task ends | Return A's original receipt; no effect on B. |
| Another Task/session, dead actor or ended Task sends a new input | Reject without an acquire/release effect. Exact own receipt recovery remains available. |

Observed revision is not a blanket board compare-and-swap for Hold. Panel motion,
another key, presence or a refusal may change a snapshot without invalidating a
held contact. A Hold revision at or below current is admissible only with its
valid causal Task/session/gesture/crate bindings; future revisions reject.
Highest-sequence/tombstone checks prevent old DOWN resurrection. A high-water
mark does not reject UP for the still-current older holder. Other Panel inputs
must use their own physical dependency guards; independent keys must not stale
one another. The reference's unconditional stale-lower exception is not used.

`foodTaskHoldRelease` builds UP from the original DOWN context and a distinct
command ID, with nullable crate binding. A dedicated Task Hold controller must
send it even while DOWN is pending and after its visible offer changed; it must
not use the ordinary one-pending-action UI gate. Repeated pointer-up/cancel
notifications reuse that release request when possible; a separate-ID repeat
still cannot affect a later gesture.

Connection loss itself sends no invented UP. The server's eight-second presence
grace continues while machinery and hazards continue. On reconnect, fetch the
actual currentHolder, pendingIntent and uncertain command receipts first. If the
contact is now off, atomically reconcile it as described below; do not replay a queued DOWN or a
historical tap. Accessibility toggling produces the same DOWN/UP protocol.

## Server clock and deadline authority

The Task input ingress serializes original server receipt times in one clock
domain. It must record the time once, retain it through SDK retries and durable
recovery, and apply effects in that admitted order. Phone timestamps, animation
frames, acknowledgement arrival and retry/worker time cannot backdate or retime
physics. Drain the earliest due authoritative boundary before a newly received
input; intervals are closed at their endpoint. The guards reject backward server
time rather than rewinding physical state. The runtime PR must prove this ingress
and scheduling behavior; the pure ledger is not an HTTP/Firestore implementation.

Asking is 30 seconds. A timely ask keeps its entire 15-second answer interval.
The Task includes a four-second briefing and ends at start+30 seconds. Public
absence always ends at start+32.5 seconds, including early private completion,
loss, death or cancellation. Presence grace is eight seconds from the server's
first recorded absence, not a client-supplied online flag. A dead participant's
connection cannot cancel the survivor. There is no slower mode. Approved
50/200/150 ms panel, 450/300 ms lift/fall and other parameters are exported as
`FOOD_TASK_PARAMETERS`; browser rendering uses those anchors without authority.

## Reconnect and explicit finger-off recovery

`ownGesture` separately projects `currentHolder` (actual sequence/bound crate),
`pendingIntent` (newest held intent), `highestSequence` and `recoveryRevision`.
Every own Winch participant snapshot requires this state; Panel has none. Actual
currentHolder must agree with the current crate/custody. The runtime must persist
authoritative custody loss and ledger closure together, including a physical
boundary that invalidates ownership; this does not fabricate a player UP input.
DOWN 1, DOWN 2, UP 2 leaves contact 1 holding; projecting only highest would lose
that owner. `projectHoldRecovery` reads both bindings without changing state.

If the finger is physically off after reconnect, send fresh HOLD_RECOVER_OFF
with the recovered own revision and `throughSequence` equal to the maximum of
server highest and locally remembered contacts, including unacknowledged ones.
`foodTaskHoldRecoveryInput` validates/maps it. The server atomically closes all
pending contacts/high-water before releasing only the actual owner's crate once.
No newer pending contact can acquire between separate release packets. The
RECOVERED_CLOSED receipt has null gestureSequence and `closedThroughSequence`
matching the request; only recovery may carry that closure high-water.

`recoveryRevision` advances only on accepted gesture/custody state changes,
never clock reads, refusals or receipt lookups. A newer contact makes an old
recovery cursor STALE_RECOVERY without dropping the new contact. Same-ID retry
returns the original receipt. Delayed DOWN at/below the closure high-water never
resurrects. Re-read after a stale recovery; never replay DOWN from the snapshot.
Disconnect alone fabricates no release. Causal UP/recovery need no visible Hold
offer but still require authentication, original Task/session and active/living
checks. This is protocol recovery for the same Hold control, not another button.

## Complete machine rendering without cosmetic events

Coordinates are in rail-stop units: intake 0, Panel console 4, platform 5 and
Winch cab 6. Moving/swing rail positions are bounded to [-1,7]. Every `height`,
`fromHeight` and `toHeight` is a **crate-centre coordinate on one global axis**,
not a fraction relative to whichever surface happens to be underneath:
`designY = 658 - 250 * height`. The fixed approved design centres are:

| Surface | Design Y | Contract height |
| --- | --- | --- |
| Intake | 658 | 0 |
| Deck | 648 | 0.04 |
| Console | 540 | 0.472 |
| Platform | 568 | 0.36 |
| Fully raised, level | 408 | 1 |

`FOOD_TASK_VERTICAL` exports these values and the finite bounds [-0.25,1.5].
The bounds include replacement entry at Y704 (height -0.184) and the raised
pendulum arc. They are validation bounds, not new collision margins. Broken
fragments rest on the corresponding surface at centre Y+52 (half a crate). `crate.x`/`height` describe the
last authority anchor at `anchorAt`, not a value resampled on each clock poll.

A locked panel's stop is its actual integer stop. A moving panel's stop and
direction are the release origin at `anchorAt`; it begins a 50 ms snap to the
adjacent stop, rests 200 ms, and repeats, reversing at rail ends. Snap rendering
uses smoothstep interpolation. LOCK's destination and hazards are decided by
the server at receipt, never from the drawing. Swing is anchored at startedAt,
amplitude and direction, with the approved 1300 ms period and 2200 ms decay
parameter toward 0.38. A moving panel carries the crate directly; a locked one
adds that anchored swing. These are presentation coordinates, not permissions.

Every lift/fall trajectory carries horizontal and global vertical origin and
destination with its original start/end times and explicit `easing`.
Let `u=clamp((serverNow-startedAt)/(endsAt-startedAt),0,1)`. Vertical interpolation
is `fromHeight + (toHeight-fromHeight)*e(u)`, with:

- QUADRATIC_IN_OUT: `2*u*u` below 0.5, otherwise `1-(-2*u+2)^2/2` (lift).
- CUBIC_IN: `u*u*u` (fall).
- CUBIC_OUT: `1-(1-u)^3` (replacement rising into the hatch).

The motion overrides the anchor during its interval; before/after it clamps to
origin/destination. A zero-duration motion is already at its destination.
For a lift, horizontal centring uses QUADRATIC_IN_OUT at `clamp(u/0.35,0,1)`;
falls use CUBIC_IN for both axes. Replacement normally has equal X endpoints.
The server records the actual origin from the previous trajectory/swing sample,
not a default full-height pose. Broken trajectories validate destination height
against their named surface. LIFTING requires a raised target; FALLING supplies
an explicit surface target. A settled intake/platform uses its global centre.

For HELD/BRAKED swing without a linear trajectory, the persisted swing and panel
anchor determine the position. The approved geometry is pivot Y140, cable
length 268 and 128 pixels per rail stop. For offset `d` stops, the crate-centre
`Y=140+sqrt(268^2-(128*d)^2)`; convert with the same global height formula.
A later release records that exact origin. Reduced motion may draw a level
crate, but it cannot change the authority origin, hazard or interlock deadline. A partial-lift release starts at
the authoritative partial height; it does not visually jump to full height.
The active replacement crate has a new ID/generation. Each retained old broken
crate independently carries its fall trajectory, landing surface and original
break time, so reconnect can draw its current fall alongside the replacement.
It never needs to replay a BROKEN event to reconstruct those poses.

The panel also carries current blade state (raised, lowered or buffered), its
stop/change time and the authoritative warning window. A STOPPED cue explicitly
names CUT or DROP, actor and victim: CUT's actor is Panel and victim Winch;
DROP reverses them. Both mechanisms are already participant-visible. No field
identifies Protection versus luck. Current buffered blade or brake custody
remains visible even with an empty event suffix; old impacts are not replayed. Persist replacement-entry and old-crate fall
segments independently, and retain a SENT descent segment (platform height0.36
to -0.12 over its existing 1100ms visual cue) with its original anchor/easing.
An empty suffix can then draw the current pose directly. The existing panel
snap remains smoothstep; the new quadratic lift easing does not replace it.

## Participant end-card facts

`FoodTaskOutcomeSchema` is a strict participant-only discriminated union:

| Kind | Required authoritative detail |
| --- | --- |
| DELIVERED | `at`, `dosesAdded:10` (five packages) |
| LOST | `at`, `reason:TIME`, `CRATE_BROKEN_NO_FETCHER` or `NOT_OVER_PLATFORM` |
| CANCELLED | `at`, `reason:DISCONNECT`, `disconnectedSeatId` from the Task pair |

These map to the approved endCard in pinned `design/food-supply/phone.mjs`
lines 260–268. The backend chooses the applicable loss message at the terminal
transition. TIME records the original deadline; a cancellation names the living
participant whose full grace expired, and cannot precede that grace. The name
stays the same if that phone later reconnects. No phone infers these facts from
its current clock, current online flags, crate pose or an absent event suffix.
All terminal details are immutable across retries, late ticks and reconnect.

Only `participantTask.outcome` carries them, with the existing common return
interval unchanged. Public and nonparticipant schemas have no result/cause field.
Each `people` row also requires `death:null` while alive or the original
`death:{at,mechanism:CUT|DROP,actorSeatId}` when eliminated. The mechanism,
actor/victim pairing and occurred time are server-authored and remain available
with an empty cosmetic event suffix. Native cards do not infer the cause from
control assignment. A recovered snapshot draws the present and shows the right
card without restarting an old impact; a fresh cue may use that original time.
The room in that card comes from the same API response's frozen ordinary board
location/slot, never a copied prototype room or a new return-placement field.

Reason values never identify Protection, luck, Clone, a roll, grantor or secret
role. Delivered doses are the one authoritative grant, not another food write
triggered by rendering or receipt recovery.

## Audiences, canonical roster and private counters

| Audience | Permitted data |
| --- | --- |
| Public/nonparticipant | Original asking interval and anonymous someoneAsking; fixed AWAY interval and its two identities, approved food stock and ordinary finalized facts. |
| Invitation pair | Request ID/revision, the pair, answer deadline and request state. |
| Each own seat | Server offers/Partner choices, own unavailability reason, own receipt/gesture/meal evidence. |
| Task participants | Randomized controls, server motion anchors, alive/online, keys, breakage, neutral STOPPED and private outcome. |
| Server only | Protection cause/resource, RNG, assignment evidence, offline timestamps/grace deadlines, private receipt and input ledgers. |

`rosterSeatIds` always contains the complete canonical seven/eight/nine seats;
away participants remain identities in the normal board too. `awaySeatIds` is
explicit metadata, sorted by original seat number, never randomized control order. Do not filter them out and break self/office/event identity
validation. The future board uses reserved vacant places, not a second roster.

Merely hiding participantTask is insufficient: ordinary live boards, office
holders and Undercover donor grant consumption could reveal early Task death or
Protection use. Preserve their authorized Task-start publications until common
return, with explicit away status. Participants receive immediate crane facts in
the participant subtree, without defensive fields. Public AWAY/return timing
does not transition to ENDED early. Food count may change as approved, without a
public Task-result/cause message. At return, ordinary authorized knowledge can
update without attributing a Task killer, defense or role.

`partnerChoices` contains every other canonical seat, in original order, with
server-authored availability and reasons including last-round participation.
Only choices matching the TASK_ASK offer are enabled; the phone derives no
eligibility reason. During AWAY every choice is uniformly unavailable with
NOT_AVAILABLE_NOW, and own availability is false/TASK_ALREADY_STARTED. No row
may change to ELIMINATED from a private early Task death before common return.
New nonparticipant commands receive uniform PHASE_CLOSED before inspecting
partner health or Task outcome; authenticated original own receipts and private
request closures retain their normal recovery semantics. At common return the
ordinary authorized reasons can update. The runtime privacy tests must compare
the **complete Food subtree** plus ordinary board/offices/donor state for a
living-versus-early-dead private pair, including rejection codes, cursors and
revisions; authorized participant facts and approved stock changes are explicit
exceptions. An already-refused Volunteer may still be a Partner.

Each audience has independent event IDs/cursor and view revision. Private
refusals, closure-only tombstones and same-ID retries cannot change another
audience's cursor/revision or add a gap. Protection and lucky stops must produce
identical participant fields, IDs, counts, cursor/revision and timing. Existing
API snapshots and own-seat receipt lookup provide the transport binding; no new
IAM or direct client authority writes are needed.

Event windows are bounded state-snapshot suffixes, not a complete action log.
A nonempty suffix is contiguous and ends exactly at its published cursor. An
empty suffix means no retained cosmetic events; the current anchors/outcome are
complete through that cursor. A consumer drawing that snapshot may suppress
missed/expired animation and advance its cosmetic cursor. It must never infer
unseen outcomes or replay a cached impact from a gap.

## Food, ordinary completion and whole realities

Store integer doses: initial 10, successful delivery +10 once, eligible meal -1.
Display packages by formatting halves; warning is doses <= 2. Breakage changes no
food. Keep the stock's finalized/public or player-current basis explicit.

`turnEnds.order` is a **match-scoped ordinary-completion sequence**, not private
journal sequence, view revision or a resettable round index. Round 1 order 7 can be
followed by Round 2 order 8. It increments only for actual ordinary completions;
HACK continuation, cinematic, retry, skipped eliminated seat and snapshot read
do not add a meal. Store original completion time and a stable match/round/seat/
source-phase identity. Public turn timing carries no speculative placement.
Player placement is only that audience's authorized recorded state, or null.
Suppress older/seen/untrusted cues on reconnect; scope round/seat visual keys to
the match. A cosmetic visit never decrements stock or reports completion.

Meals, food and hunger are world-local. Forks copy the current inventory and
consumption; whole-reality Sync keeps the selected values without refill or
cross-world recombination. No branch identifier/count or pending hunger queue is
published. Hungry Healthy living players are injured after retained actions and
before Rescue in retained turn order; already Injured/Eliminated players receive
no extra effect. Preserve next-round new hunger Rescue, existing valid patient
Rescue, four-bed overflow, detention and full medical deadlines.

## Consumer examples and bot journey

[Contract examples](examples/food-task-contract-v1.json) are synthetic packets,
not runtime fixtures or executable authority. They cover both controls, empty
cosmetic suffixes, breakage/replacement, stopped drops, delivery, answer expiry,
causal release and reconnect. Tests parse every example with the same exported
schemas/adapters. Server arrival times in traces are harness data outside wire
requests.

The separate runtime slice must preserve the existing one-human-plus-bots path:
complete election, ask or join Food, let the server assign both controls, drive
the bot partner through accepted server inputs and deadlines, return at the
common boundary, then finish an ordinary turn with a server-recorded meal.
Reconnect and a human declining or timing out must also finish that journey.
This uses existing practice bots and authoritative Task state, not the design
practice simulator or new personality presets. No bot runtime is added here.

## Review and verification boundary

Strict schema tests cover 7/8/9 identities, bounded/unknown data, audience/clock
bindings and historical rejection. Gesture tests exercise actual pure ordering
state across reordering, JSON restore, repeat inputs and receipt conflicts.
These do not establish implemented physics, server transactions, projections,
Protection/luck equivalence, scheduling, real networks or multiplayer balance.
The separate runtime PR must test those paths and meals/hunger/Sync before any
test-release activation. Native UI still requires Designer's visual acceptance.

Integration and Frontend acceptance of this exact contract commit is required
before consumer adoption. No gameplay decision remains open for the four Hold
continuations; remaining gates are implementation and review evidence.

## Local verification of this contract draft

Pinned Node 22.21.1 / npm 10.9.4. `npm ci --offline --no-audit --no-fund`,
`npm run build`, `npm run typecheck`, `npm run test:contracts` (26/26),
`npm run test:bootstrap` (363/363), and toolchain/workspace/source checks passed.
The bootstrap result includes the four Food suites: strict schemas/adapter,
Hold ledger, clocks and 32 example packets/two executable ordering traces. The four focused
Food suites total 159 tests after the consolidated sheet-data amendment.

Selected historical engine regressions passed 42/42:
`planet-version-compat`, `planet-phone-version-compat`, `planet-opportunities`.
Selected service regressions passed 21/21: `version-routing`,
`pass-version-policy`, `planet-service-historical`, `planet-service-replay`,
`planet-service-privacy`. The Promise review found no shared voting-start
assumption; the opportunity tests keep Jail Promises pending until closure.

Full `npm run verify`, capacity playouts, emulator journeys, real networks,
physical phones and future Food runtime paths were **not run** for this
contract-only change. Hosted CI and Integration/Frontend acceptance remain
separate gates. The reported capacity subprocess timeout is Integration-owned;
this PR changes neither its limit nor its playouts/assertions.

The consolidated Frontend sheet trace at `a3b4f16b` identified terminal detail,
durable death detail and unambiguous vertical trajectories. This amendment
addresses all three together. It changes no command/receipt or Hold ledger.
The initial `df52395c` hosted backend-emulator failure is retained at
[the failed job](https://github.com/Amirkianfar66/GameN/actions/runs/43410007963/job/131833760992):
the tracked #206 eight-player duplicate transaction returned one accepted
receipt and one UNAVAILABLE (code3, Transaction is invalid or closed). Integration
owns its CI handling. The runtime paths and assertion are unchanged; this PR
adds no retry workaround. Current-head CI is a separate result.
