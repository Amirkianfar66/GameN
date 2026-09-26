# Authoritative server vertical slice

**Status:** Implementation specification and contract draft for integration review. No service is implemented or validated by this document. Technical foundation: `docs/architecture/production-v1.0.md`, sections 4–7; current rule overlays take precedence over its summaries.

## Scenario and boundaries

Use an emulator-only fixture with all nine canonical seats and two interactive identities: Officer and a target in Room A. Seven seats are scripted. Begin at the Officer's Round 2 turn. In variant A, the target has Protection validly granted in Round 1 and activated at Round 2; in variant B, the target is unprotected. Optional powers are disabled.

The Officer registers one same-location shot within 60 seconds. Resolution consumes that shot, blocks it in A and changes Healthy to Injured in B. Use fixed locations and a predetermined completed Jail vote with no jailed player. The harness supplies those prerequisites explicitly; it is not a production skip-vote endpoint. Replay each variant from its own initial state.

## Minimal contract draft

```ts
type RegisterShot = {
  protocolVersion: 1;
  matchId: string;
  commandId: string;
  phaseId: string;
  command: { type: "REGISTER_SHOT"; targetSeatId: string };
};
type Receipt = {
  commandId: string;
  status: "accepted" | "rejected";
  code: "REGISTERED" | "PHASE_CLOSED" | "NOT_ALLOWED";
};
type PublicView = {
  protocolVersion: 1;
  rulesetVersion: string;
  viewRevision: number;
  round: number;
  phase: { id: string; kind: string; endsAt: number | null };
  activeSeatId: string | null;
  seats: PublicSeat[];
};
type PlayerView = PublicView & {
  self: { seatId: string; role: string; shotAvailable: boolean };
  ownPendingCommandIds: string[];
};
```

`PublicSeat` contains only approved public location, health, confinement, Captain and reveal facts. Every view has its own revision; a player's revision is not the public revision. A composed player document prevents combining incompatible public/private snapshots. Extend private knowledge by role later; never publish the full role map, Code, Protection or target queue.

Identity comes from the verified Firebase Auth token, never an actor UID in the payload. Validate all inputs at runtime. Publish an authenticated receipt lookup and `advanceIfExpired(matchId, phaseId)` contract alongside these types. Return only the caller's receipt. Authentication/schema/ID-conflict failures have separate safe error codes. A server-time response supports countdown calibration; client timestamps have no authority.

## Transaction and privacy

After Auth/App Check and authorization, transactionally read membership, authoritative state and the caller-scoped receipt key. If a receipt exists, compare its canonical payload digest and return it before checking whether the phase has expired. An ID reused for different content is rejected.

For a new command, validate phase, trusted time, resource and target eligibility; evaluate the pure engine; atomically persist state, server-only journal, receipt, changed audience views and durable outbox effects. Reserve the Officer's ordinary shot once when accepted. Record validation time and random facts for replay; generate no fresh randomness inside transaction retries. No external network calls occur inside the transaction.

Serialize on per-match state, not a global counter. A normal state update is not a reason to invalidate unrelated command IDs. Receipt retention must cover the entire permitted retry window, including match-end recovery.

Server-only paths: `matches/{id}/engine/current`, `events/`, `receipts/` and `outbox/`. Players read only their `playerViews/{uid}`; admitted display identities read `views/public`. Deny all client writes to generated game documents. Admin SDK authorization remains the API's responsibility. Host status grants no secret access.

A hidden registration updates only authorized views: no public timestamp, global sequence gap, target highlight or public event. Approval is pending for who learns Protection consumption; omit defense-specific disclosure from the slice. Public health can change at the permitted stage. Keep secrets out of logs, persistent client caches and analytics.

## Time, scheduling and recovery

Accept timed commands only when the trusted evaluation time of the successful transaction attempt is before `endsAt`. Document this boundary; client send time and eventual commit time are not promised acceptance clocks.

Create a durable deadline intent with the phase transaction. An idempotent dispatcher enqueues a stable task ID. A task checks **phase ID and deadline token**, not the private match sequence, and trusted time at or beyond `endsAt`, then advances at most once. Secret actions must not invalidate timers. Delayed tasks cannot permit late commands; stale/duplicate tasks are no-ops. Outbox repair and authorized expiry catch-up recover missed dispatches. Start the next full turn when it actually opens.

Reconnect restores the same seat and authorized snapshot. For an unknown command outcome, retry the original ID or query its receipt. Do not queue new offline gameplay. Presence and animation completion never advance authority.

## Required evidence

| Test | Expected property |
| --- | --- |
| Same command repeated after expiry | Original receipt; one resource spend |
| Two different shot IDs race | At most one accepted |
| ID reused for another target | Conflict; original command unchanged |
| Protected/unprotected fixtures | Block/no health loss; otherwise one injury |
| Actor injured, jailed or eliminated after registration | Registered shot still resolves |
| Deadline vs shot race; delayed/duplicate job | Defined time boundary; one advance |
| Secret registration | Other viewers and public document unchanged |
| Cross-seat read/direct write attempts | Denied; no secret payload returned |
| Enqueue failure and reconnect | Durable repair; same role/resources |
| Replay with pinned versions | Same state and permitted outcomes |

Run engine and emulator tests first. Actual task delivery, load and device integration require staging evidence later. Record commands, commit and failures; a design document is not a passing test report.
