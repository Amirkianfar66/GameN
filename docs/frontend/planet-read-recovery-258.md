# Hosted Planet READ recovery — #258

Base: `7dd2fb708b243f0c2067f1605911c35a385ac316`. The controlled tests reproduce a source-level recovery gap: a never-settling credential, fetch or response body keeps the sole coalesced READ pending after the session's local wait expires. This does not establish the cause of the earlier hosted banner or that reload was required.

Only `apps/game/src/browser/planet-request.ts` changes at runtime. READ has a 16-second budget starting before Auth/App Check acquisition. The existing eight-second freshness wait is unchanged; one further wait window permits finite late replies with their original clock/uncertainty. At expiry, acquisition ends without late API dispatch, or native fetch/body is aborted. The coalescer retains ownership until that transport settles, including delayed cancellation. Monotonic checks before/after credential acquisition, before dispatch and around body completion reject overdue continuations even when a timer callback is delayed.

Credential SDK promises themselves cannot be cancelled; their late completion is fenced. Client cancellation does not prove the server did nothing: a READ may already have renewed a Food lease. Mutation lifetimes, original IDs/bodies, uncertainty, exact retry and causal Hold UP are unchanged. Session/controller, privacy masking, clocks, UI/wording, art, rules, security and backend sources are byte-identical to base.

## Evidence

The **same 22 controlled tests** were run against the original compiled READ adapter and the corrected adapter, restoring the candidate afterward:

| Adapter | Passed | Failed | Cancelled / skipped |
| --- | --- | --- | --- |
| Original main | 6 | 16 expected regressions|0 / 0|
| Corrected | 22 | 0|0 / 0|

[Original results](evidence/planet-read-recovery-258/baseline.tap), [corrected results](evidence/planet-read-recovery-258/candidate.tap).

Coverage includes all acquisition/header/body stalls; automatic scheduled recovery without caller refresh/reload; overdue monotonic time ahead of timer delivery; a nine-second response retaining its original 4.5-second uncertainty followed by a fresh scheduled clock; old-generation reply concealment; delayed actual abort settlement with no overlapping READ; unknown committed Abort across readback/reload/exact Retry; and independent original DOWN/UP. No shared emulator, live match or browser matrix ran.

Actual checks: TypeScript build; **106/106 focused tests** across the new tests and existing request/session/Food/clock/host-Abort suites; root typecheck; source integrity; production exclusion 83 modules / 2 entries / 241 files. Reproduce:

```sh
npx tsc --build apps/game
node --test apps/game/test/planet-read-lifetime.test.mjs apps/game/test/planet-request.test.mjs apps/game/test/food-session.test.mjs apps/game/test/planet-host-abort.test.mjs apps/game/test/planet-session.test.mjs apps/game/test/server-clock.test.mjs
npm run typecheck
npm run check:sources
node apps/game/scripts/check-production-exclusion.mjs
```

Integration separately owns the native-fetch socket-cancellation check at the final commit, required CI, focused consumer approval and Hosting publication/live verification. `planet-request.ts` is outside the frozen Food/design-0.9 source closure; historical approval/adoption records and pinned source inventory are untouched. No new visual batch or backend deployment is required by this diff. This is transport hardening, not a general performance or physical-device claim.
