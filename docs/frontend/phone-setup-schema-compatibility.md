# Setup schema compatibility checkpoint

Base: `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. This narrow Frontend dependency lets the shared schema honestly include setup flow 3 while its native timed-reading consumer is under review.

The model derives `setupFlowVersion` and the complete `setup` interval from `PlanetSessionSnapshot`, including the candidate's `roleFilmStartsAt`. The actual Backend candidate at `packages/contracts/src/planet-service.ts` was read on 10 November: flow 3 reading requires `startedAt`, `roleFilmStartsAt = startedAt + 20000`, and `endsAt = startedAt + 30000` with a complete character roster; boarding remains a separate 10000 ms interval.

This checkpoint deliberately rejects an explicit flow other than 2 after schema validation. It does not enable unfinished flow 3 playback, expose its role through the old Reveal path, or send Ready for it. The complete timed consumer will replace this guard in a separately reviewed follow-up. Missing/2 setup behavior and creation defaults stay as released. No art, rules, cloud configuration or deployment changes.

The added session regression supplies a complete flow 3 interval and checks concealed role, disabled Ready and no Ready request even after its end. It works both with the current schema (which rejects 3) and the candidate schema (which reaches the explicit consumer guard).

Integration source adoption is separate from runtime validation. The only changed hash-pinned native consumer is `apps/game/src/planet/session.ts`. Its entry in `docs/integration/pregame-production-consumer-approval-2026-11-08.json` and any transitive exact-inventory approval bindings require Integration review; Frontend does not edit those fences.
