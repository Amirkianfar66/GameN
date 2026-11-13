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

Full workspace verification, the integrated real-engine service/worker/bot
journey, emulators and physical phone checks are not established at this first
checkpoint. Source-only component/mock tests do not prove hosted multiplayer
correctness, real-network speed or human social-deduction balance.
