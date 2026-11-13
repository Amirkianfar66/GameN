# Food Task runtime candidate

Part of [#234](https://github.com/Amirkianfar66/GameN/issues/234), fixed release
[Food test 1 / #237](https://github.com/Amirkianfar66/GameN/issues/237).
The implementation and exact-head acceptance record are in
[PR #238](https://github.com/Amirkianfar66/GameN/pull/238). A component checkpoint
is not a deployed or activated release.

Runtime worktree: `/private/tmp/gamen-backend-food-task-runtime`, branch
`codex/backend-food-task-runtime`. Actual starting SHA:
`5a5bb9068cd4fb085cb2482cd969058221d2c870`, the contract accepted by Integration
and Frontend. The branch fast-forwarded to identical-tree merged baseline
`f9e7e11bd6c23671f96832bf45d79146e6fd855c`. The original Backend checkout and
its local work were preserved. Reviewed executable code through
`18f25ab2690350e3313c1dee5f9ff3c211a443c9` includes the final narrow
probe-before-CLOCK correction. The PR records the final tested documentation/code
head and its actual results; no result below silently transfers to different code.

## Version and authority

Explicit new matches selecting `food-task-1.4` use protocol3 /
`planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12`. Ruleset SHA256:
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
Existing matches retain their exact saved tuples, fields, packets and replay
semantics. Creation defaults remain unchanged. No cloud configuration, IAM,
deployment, artwork publication or default activation is included.

The owner-approved killed-Captain exception is recorded in
`docs/specifications/planet-successor/food-task-captain-return-owner-decision-2026-11-13.md`
and its matching overlay. At the original Task-start+32,500ms common return,
a Captain killed after leaving Command returns to the last ordinary room,
otherwise the other if full, using existing body-inclusive capacity and canonical
slot order. C1 is freed at this return. No early public relocation, capacity
change or mid-round election is added. All other participants retain their
recorded places. No owner gameplay decision remains open for this component.

## Engine and disclosure

The pure engine implements the exclusive Food step, invitation races and refusal
rules, random control assignment,30s Task including4s briefing, approved panel
and Hold continuations, hazards/Protection/luck, crate replacement, eight-second
disconnect grace and fixed32.5s return. Registered inputs retain immutable
contexts and effects across retries. Clone does not protect a Food hazard.

Integer food starts at10; delivery adds10 once. An ordinary turn consumes its
one meal once; Hack adds no second meal. Food, meal costs and hunger follow the
whole selected reality without refill. Hunger resolves after retained attacks
and before Rescue, using the approved eligibility and inherited medical rules.
New hunger cannot be rescued at that same checkpoint.

Ordinary rooms, office facts and other donor state stay at the frozen publication
world until common return. Participant-only events and private terminal outcomes
do not become a public death, cause, cinematic or early return. An abort archives
the private step, clears live controls/deadlines and retains the publication mask;
JSON restore and original receipt recovery remain valid. Existing predecessor
checkpoint assertions remain unchanged.

## Reviewed service contract

The existing ordinary snapshot remains authoritative for roster, characters,
rooms and slots. Exact Food snapshots add `foodPublicView` and nullable
`foodPlayerView` in the same response using one server-time sample. Historical
snapshots omit them. The current participant receives only their own
`participantTask.ownReturnPlacement`, computed on a copy with the approved
Captain fallback. Frontend consumes it instead of inferring from frozen C1.
Integration accepted the seam at `d0a12f252d9d076c0978b97cfcdf942e5f0e4a75`
with209 focused checks. No later public placement field was added.

Authenticated operations are `foodCommand`, `foodReceipt` and `foodHeartbeat`.
Callers cannot supply actor, role, health, client time, death, defense or food.
A living online participant's own read/input renews a two-second server lease;
expiry starts the original eight-second grace. Offline reads drain original
boundaries before reconnecting. No disconnect fabricates Hold-UP. Recovery
checks current UID/seat/binding before returning private results, including
midflight ordinary-command receipt discovery; a revoked caller cannot receive a
successor's same-ID receipt or conflict information.

`FOOD_TASK_TRANSPORT` specifies one in-flight500ms snapshot throughout the full
32.5s AWAY interval and1s fallback heartbeat when reads have not renewed contact.
Accepted-command refreshes coalesce. Separate per-UID minute budgets are
snapshot180, presence90, input120, closure120 and control30. Hold-UP/recovery
closure cannot be starved by other buckets. Original receipts and pending-input
recovery precede fresh budgets/context. Historical profiles retain120/minute.

## Durable processing and cooperation

The successful durable admission assigns a match sequence and monotonic server
time, then persists the exact request, binding, entropy and identities. This is
not a backdated HTTP timestamp. Processing drains the committed prefix and every
earlier/equal engine/presence boundary at its original time before the input.
Private scheduler deadlines never replace the public phase/return deadline.

A fenced eight-second bot-driver lease coalesces workers. Nearby bot wakes use
bounded real-time waits and fresh own-view projection, with a20s driver budget;
longer gaps retain durable scheduling. New speculative presses are checked at
actual admission after SDK retry. Already admitted contexts are never retimed.

A separate eight-second ownership lease guards all live Food Session writers.
Positive owners have fixed target sequences; zero owners cover admission and bot
metadata, release before downstream draining, and retain technical recovery
wakes on error/ACK loss. Followers poll original entries read-only with awaited
50ms sleeps and a20s wall bound. There is no unawaited mutation race after a
caller returns. Stale owners cannot clear successors. A current-state handoff
prevents setup-classified requests mutating a newly running Food match outside
its coordinator; its separately committed historical rate charge occurs once.

Pure lookups use a strong read-only metadata/chunk snapshot. Guarded effect-free
reads fence their captured Session against the full current Control and renew
private contact metadata without Session locks/publication. Contact hydration
checks Task/binding/living-online status and original entry time before absence
and scheduling. Old expiry wakes rearm to valid later contacts. Heartbeats keep
their existing queued journal path. Pure authorization, original lookup and rate
checks prevent known-denied callers creating writer work. SDK mutation retry
policy and the existing #206 assertions remain unchanged.

Bot Lock planning retains its100ms advisory margin. Actual admission separately
checks the full approved250ms destination click, exact Panel revision, Task,
session, offer and original click expiry. Only an unchanged, definitively
uncommitted Lock may be retained locally;250ms/3000ms late cases cannot revive an
old ID on another rail pass. UP and all other fresh-input safeguards are unchanged.

The pure internal `hasOnlyDuePlanetFoodWarnings` query checks **all** outstanding
Task boundaries through actual time, including ties; it requires a nonempty,
warning-only set and the exact Food tuple/phase. It changes no state or RNG.
Only an otherwise valid Lock may enter ahead of those warnings; normal processing
still journals every warning before the input. Missing optional support keeps
the conservative fallback. Presence, pending-prefix, physical deadlines, worker
fencing and original click bounds remain mandatory.

The final narrow driver correction preserves the first actionable bot's own-view
Lock proposal before an unnecessary preliminary CLOCK round trip. It honors
existing stored member order, unfinished intent and retry timing, creates no
command ID before ownership, and rechecks the proposal in the owned loop. It
uses the same fenced admission/drain path. Earlier UP/other actions retain their
order; non-Lock and non-warning work retains the previous CLOCK path.

Private `ingressSequence` and `sessionWriterRecovery` outbox fields are not client
fields. Task dispatch still emits the same four-field payload. Packaging reuses
Integration's reviewed Food closure from2343cc6a and includes the internal
classifier in the isolated Planet export. Neither packaging profile accesses
match state during its disabled-service smoke check.

## Verification evidence and final gates

Pinned toolchain: Node22.21.1/npm10.9.4; local emulators use Java21 and
`demo-mothership`. Detailed final results, exact source SHA and latency matrix
belong to PR #238 and release issue #237. These earlier measured checkpoints
remain evidence with their actual scope:

| Checkpoint | Actual result |
| --- | --- |
| Classifier engine tree c615465e | All1,706 engine tests passed; original historical hashes/assertions retained |
| Full Backend/Firebase at0f2c8c79 | 518 passed, zero failed/skipped |
| Bootstrap contracts/versions | 367 passed, zero failed/skipped |
| Genuine Firestore at0f2c8c79 | 7 passed:7/8/9 × both human controls plus overlapping snapshot/worker/timer/receipt/UP lanes |
| Isolated classic and Planet packages at0f2c8c79 | Both clean installs, forbidden-source scans and runtime/private-task export smoke checks passed |
| Independent exact-source audits | Auth, recovery, canonical order, original click expiry, classifier and direct-probe correction accepted; final matrix still required |
| New direct-probe checks at18f25ab2 | Four light cases passed in0.57s; no heavy tests run during Frontend's capture slot |

Normal real HTTP/private-trigger/Tasks journeys use Auth admission, ordinary
setup/boarding, one human and bots. They use no seeded authority, injected clock,
manual advance/runBots or direct Task callback. Native and data-only suites
explicitly use controlled clocks; they do not replace connected acceptance.

At0f2c8c79 the isolated7/8 journeys delivered once, retained the original common
return, finalized stock20 and recovered exact receipts. Control reply maxima
were155/151ms; read p95 values259/250ms, with maxima2270/3736ms. Nine failed TIME:
its bot Lock arrived only35ms before the30s deadline; replies max220ms, read p95
385ms/max3641ms. These are historical results, not the final matrix for the
probe-before-CLOCK correction. Earlier failures and the finite exit check remain
in [#237](https://github.com/Amirkianfar66/GameN/issues/237#issuecomment-6860476862).
An artificial48-request single-phone burst also returned a lock timeout; no
arbitrary burst/load/scalability claim is made.

The final same-source7/8/9 acceptance must establish delivery once, original
return, receipt/reconnect recovery and actual latency without competing local
batches. Frontend's static-capture slot and Backend's actual-time slot are
explicitly handed over; an idle task is not an implied release.

Integration also recorded predecessor e132341e's historical9-player delayed
boarding failure at `planet-boarding.test.mjs:40`: a Firestore code3 streamed-read
error, not an assertion failure. The +91,000ms injected game clock is not wall
transaction expiry. The SDK does not classify this message as retryable, and the
log lacks enough transaction context to establish its cause. Assertions and
retry policy stay unchanged. Retain its exact-case and full-file final-head
rerun/diagnosis, followed by required combined CI; do not call it fixed from
unrelated passing counts.

The standalone Backend tree still lacks Frontend's reviewed `FOOD_RETURNED`
label map; whole-workspace typecheck/verify is not claimed here. Integration's
combined consumer supplies it and owns exact-head required CI, art selection,
Designer acceptance, release pinning and any staging activation. Capacity playout
timeout remains Integration-owned. Physical-device, hosted-network, staging and
human social-deduction balance acceptance are not established by these tests.
No deployment or default activation was performed by this component.

## Redacted command and original receipt

Synthetic example only. The authenticated identity supplies the actor; exact own
retries/lookup retain the stored receivedAt and result.

```json
{"operation":"foodCommand","request":{"schemaVersion":1,"protocolVersion":3,"matchId":"test-match","phaseId":"food-phase","foodStepId":"food-phase","round":1,"commandId":"own-id","command":{"type":"TASK_ASK","partnerSeatId":"seat-2"}}}
```

```json
{"schemaVersion":1,"protocolVersion":3,"matchId":"test-match","phaseId":"food-phase","foodStepId":"food-phase","round":1,"commandId":"own-id","status":"accepted","receivedAt":1800000000000,"result":{"kind":"REQUEST","requestId":"opaque-request","requestRevision":0,"state":"PENDING"}}
```
