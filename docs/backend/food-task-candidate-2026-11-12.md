# Food Supply candidate: Integration review and build gate

Reviewed PR #231 at `4e329bbb31c916a4c722b8a5d2eb0de4182bb2eb`, based on
`8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d`.

**Verdict: ready to merge as a design reference.** This accepts neither a runtime
port of `design/food-supply/task.mjs` nor its proposed wire shape. The owner has
settled the listed Food gameplay decisions. They are recorded in the
[owner record](../specifications/planet-successor/food-task-owner-decision-2026-11-12.md),
[focused overlay](../../rules/overlays/planet-food-task-owner-decision-2026-11-12.json)
and [candidate authority](../../rules/planet-successor-food-task-candidate-2026-11-12.json).
Planned tuple: protocol 3 / planet-game-1.4.0 /
in-person-planet-food-task-2026-11-12. It is not registered as a supported runtime
tuple or selected by new-match defaults.

## Exact-head review

The previous Protection, client-time, dose conversion, motion-anchor and delayed
deadline findings are addressed in the design reference. Protection now comes
from current game state and is consumed; the reference uses server-received
time; meals use half a package; participant views have interpolation anchors;
the earliest due end boundary wins. The phone pack adds pending, refused,
unknown-receipt and recovery states, Join/Cancel/expiry races, instructions before
the timer and a non-scrolling briefing reminder. The small-phone sheet now keeps
the offline name tag visible alongside the hazard warning.

The owner-approved 100/400/150ms numbers and Food lifecycle are settled, even
where earlier rows still mark them proposed. Common return is fixed at 32.5 s.
The four-second briefing split and the swing/collision constants are still
explicit proposals. No human-balance, real-network or physical-phone evidence
is supplied by the green design tests.

## What must be finished before Task construction

1. **Backend/Integration contract acceptance.** The command families remain
   `TASK_ASK`, `TASK_ANSWER`, `TASK_ASK_WITHDRAW`, `TASK_PRESS`. Define strict,
   authenticated seat-ID payloads, Task/request identities, expected revisions,
   permissions and durable command receipts. Client time, control assignment,
   RNG, Protection and outcomes are never authoritative client fields. Bind an
   exact act to a press; retries recover its original result without a new roll.
   Reject future/invalid revisions and non-finite/untrusted timing. The prototype
   is illustrative and does not replace these checks.
2. **State, clocks and scheduler.** Persist the round's Food-step identity,
   asking deadline, pending request and full answer deadline; Task start, active
   deadline and common return; presence observations and grace deadlines;
   original positions, random assignment, participants and completed results.
   Serialize request acceptance, withdrawal, expiry, death, delivery and return.
   A late worker resolves the earliest due boundary without shortening a newly
   entered playable window. Recommended deterministic equality rule: a deadline
   is closed at its timestamp; a later worker cannot accept an expired press.
   Presence detection/heartbeats must be specified: a client cannot cancel by
   submitting its own `offline` flag. Use a durable deadline/outbox design beyond
   the existing single ordinary phase timer; no browser timer advances authority.
3. **Safe projections and events.** Participants need authoritative motion
   anchors, clock synchronization, times, controls and private receipts. Others
   receive only approved absence, phase, stock and finalized board facts. Never
   port the reference's global event cursor directly: `commit()` increments
   `seq` for private refusals and `projection()` filters their contents but keeps
   the original IDs. A synthetic ordinary RAISED event becomes `synthetic:3`
   rather than `synthetic:2` when the other participant had one private refusal.
   Use audience-scoped cursors/identities and noninterference checks. Protection
   and luck must remain indistinguishable, including metadata and write timing.
   Do not publish an early `endedAt`, reason or death that reveals the private
   ending before common return. Food stock may communicate the approved delivery.
4. **Whole-reality food and medical integration.** Store integer doses rather
   than floating package arithmetic. Task effects precede forks; food/hunger and
   meal completion evidence follow the selected reality. Exactly one meal per
   ordinary turn, not per private-conversation phase, animation or retry.
   Specify the remaining precise hunger sub-order within each actor's retained
   Main Action/Shot, before Rescue/medical placement, and the case where Blackout
   or an ordinary shot already injured/eliminated a hungry player. Recommend
   treating hunger as a single injury condition, not an extra ordinary shot or
   reset of an existing medical deadline; obtain owner resolution if inherited
   rules do not determine the outcome. Preserve existing capacity reconciliation
   and do not invent a second admission priority. Handle Task-killed office
   holders and turn-order skipping through the existing office/death rules; do
   not reopen the Food step following an office fallback.
5. **Remaining tuning and access.** Finalize the still-proposed briefing split,
   swing, collision and raise/fall constants before pinning an executable rule
   hash. The 32.5 s common return and approved 100/400/150 ms click/margin are not
   open questions. Gather phone/network evidence; 150 ms is a warning margin, not
   a bound on latency. A slower accessibility mode changes both participants'
   danger and needs an explicit shared policy, not a per-phone speed change.
   Screen-reader and motor-access usability remain untested.

Contract review should supply example packets for request/pending/decline,
Task start, ordinary control updates, identical Protection/luck stops,
unknown-result recovery, death, early completion, cancellation and common return,
plus world-local meals and finalized public stock. Frontend reviews those types
before native construction; Designer checks their permitted presentation.

## Subsequent work, after contract acceptance

- **Backend:** pure deterministic Task engine, atomic game/food/Protection
  effects, presence/deadline scheduling, meal and Sync integration, candidate-only
  validation and historical-version tests. A Task kill is not an ordinary shot.
- **Frontend:** build the pinned sheets against accepted packets; animate from
  server anchors; wait for receipts; never replay queued taps on reconnect; use
  approved no-result public states and authoritative food for ship-life visits.
  No copying the synthetic preview or shipping its review videos as runtime.
- **Designer:** preserve the accepted art and flow; resolve remaining tuning and
  any actual contract-to-sheet conflict, then give PR-specific native visual
  acceptance through the existing phone comparison gate.
- **Balance:** evaluate shortage sequences, repeated sabotage, refusal/intentional
  disconnect, alternating eligible pairs and both survivor paths with 7, 8 or 9
  players. For example, nine meals use 4.5 packages: after the initial 5 packages
  and one missed delivery, only one dose remains for the following round before
  its Food step. Successful later delivery can replenish it; a second miss
  can create multiple hungry players and four-bed overflow. This is arithmetic
  and a playtest question, not proof of balance or permission to change doses.

## Verification performed for this review

- GitHub exact-head readback: all 9 required checks completed successfully;
  PR #231 open, non-draft and mergeable at the reviewed head.
- Node 22.21.1: `node --test --test-reporter=spec packages/design-tokens/test/food-supply.test.mjs`:
  **24 passed, 0 failed**. These are the existing design/reference tests, not a
  Food-enabled runtime, balance simulation or multiplayer test.
- Inspected the updated source/handoff and the recorded `states.png` and
  `large-text.png` sheets, including 320x568/200% text examples. No fresh browser
  capture, film re-render or native visual approval is claimed.
- Reproduced the private-refusal event-ID difference with an isolated synthetic
  reference call. It is a production-contract blocker, not a reason to reject a
  clearly dev-only design reference.
- Installed pinned dependencies in this isolated candidate worktree with
  `npm ci --ignore-scripts --no-audit --no-fund`. Node 22.21.1 / npm 10.9.4;
  `npm run check:toolchain`, `check:workspace` and `check:sources` all passed.
- Candidate validation passed: both JSON documents parse; version/inactive gates
  agree; three local source pins and five exact design Git-object hashes match;
  262 inherited rules/reference/runtime files are byte-identical to the base.
  The four new files have no trailing whitespace. No historical manifest or
  authority hash was replaced.
- No Food runtime, cloud/emulator integration, real phones/network, screen reader,
  human playtest or full local `npm run verify` was run for this documentation
  change. Existing GitHub CI is distinguished from local checks.

Frontend received the exact-head FYI and acknowledged the implementation hold.
This record does not merge PR #231, approve native artwork adoption or deploy.
