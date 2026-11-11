# Phone interface Backend verification

Issue [#209](https://github.com/Amirkianfar66/GameN/issues/209), branch `codex/backend-phone-interface-v1`, reviewed 10 November 2026. This is a code and specification handoff, not a release or activation record.

## Exact source identities

- Actual implementation start: `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`.
- Original Backend branch preserved at `82ea5aec787362dd6b66acfc4bcbae2fb64629ed`.
- Shared contract checkpoint: `090429d764e11c9b594e2707aad9e5fe71601c07`.
- Complete tested Backend implementation: `2b2e6eac71992a96a057047b5f36823a9b5f802d`, tree `1c2a25e14d5cb951259fa30a4f0d4cab2ce35547`. The subsequent handoff commit adds documentation only; the PR's current head identifies that commit without a self-referential SHA in this file.
- Engine source checkpoint: `9660830e287fa4adf904ef633bc65bcaa5f1c98b`, integrated as `6dc687fc766e4179da8e01b09b72d220c4360095`.
- Service source checkpoint: `45578711b9377c11465d424e782851e9e341fdb3`, integrated as `2b2e6eac71992a96a057047b5f36823a9b5f802d`.
- Real combined Functions acceptance: `e8b0a07309ff446d9c288849a8241f97dfa912d9`, the same Backend tree `1c2a25e14d5cb951259fa30a4f0d4cab2ce35547`.
- Reviewed Frontend compatibility dependency: `eec7a5f83598324a4653839b808ed4afdb1c2461`. It is not included in this Backend branch. Integration's paired validation commit is `90b33138a56d20de0a8de6ab6c41b0ba8c5c0fde`; Backend's separate paired checkout is `5ec24c9a6acd529f9477b8915b03be537aee0b57`.
- Designer evidence: PR [#207](https://github.com/Amirkianfar66/GameN/pull/207), exact head `d52a8ae94f7639dd853f04b4e897b9b77aecff42`. No proposed artwork is adopted here.

## Executed checks

Node `22.21.1`, npm `10.9.4`; emulator runs used Java `21.0.13`. Fresh `npm ci` installed 887 packages successfully in the Backend and paired validation checkouts. Generated outputs were rebuilt from source.

| Check | Actual result | Local evidence |
| --- | --- | --- |
| New phone contracts plus existing private-feedback/boarding contract controls | 23 passed, 0 failed/skipped | `/private/tmp/gamen-phone-contract-tests.log` |
| Complete engine tests plus phone contract tests | 1,431 passed, 0 failed/skipped; 148,097.86 ms | `/private/tmp/gamen-phone-engine-tests.log` |
| Complete game-api and Firebase unit tests | 375 passed, 0 failed/skipped; 20,613.38 ms | `/private/tmp/gamen-phone-setup-backend-unit.log` |
| Auth/Firestore flow-2 and flow-3 service cases on private local ports | 18 passed, 0 failed/skipped; 47,212.61 ms | `/private/tmp/gamen-phone-setup-data.log` |
| Real Functions/Tasks, flow 3 with unchanged default engine 1.1 | 2 passed, 0 failed/skipped; 100,399.54 ms | `/private/tmp/gamen-phone-setup-functions-flow3.log` |
| Real Functions/Tasks, flow 3 plus opt-in engine 1.2 | 2 passed, 0 failed/skipped; 100,370.28 ms | `/private/tmp/gamen-phone-setup-functions-combined.log` |
| Backend `check:sources` and `check:workspace` | Passed with historical native consumer bytes intact | `/private/tmp/gamen-phone-backend-{sources,workspace}.log` |
| Paired full workspace build and typecheck | Passed in both independently assembled paired trees | `/private/tmp/gamen-phone-validation-{build,typecheck}.log`; Integration `/private/tmp/gamen-phone-backend-combined-{build,typecheck}.log` |
| Integration's focused paired engine/contracts/service/runtime/session/pregame tests | 185 passed, 0 failed/skipped; 76,738.78 ms | `/private/tmp/gamen-phone-backend-combined-focused.log`; `/private/tmp/gamen-phone-backend-review-results.json` |

These are overlapping suites, not an additive count of distinct tests. Evidence paths are local handoff artifacts, not checked-in production payloads or CI artifacts. Integration independently inspected the exact implementation and found no new blocking defect in this scope; that review is not merge/release approval.

Engine commands built contracts/engine and ran `node --test packages/engine/test/*.test.mjs tests/bootstrap/planet-phone-contract.test.mjs`. Unit commands built contracts, engine, service and Firebase before running their unit directories. The actual Functions entrypoint is the guarded `infra/firebase/test-emulator/planet-functions.test.mjs`, run once with flow 3/default profile and once with flow 3/`phone-private-choices-1.2` against the demo-only local emulator configuration. Integration's focused selection included `planet-phone-offers`, `planet-phone-version-compat`, `planet-phone-creation`, `planet-timed-reading`, `planet-boarding`, `planet-runtime`, `planet-phone-contract`, `planet-session` and `planet-pregame`.

## Timing, recovery and privacy evidence

Seven-, eight- and nine-player cases separately cover saved flow 3 and independent engine profile selection. Unit/service coverage includes exact 20+10 boundaries, early Ready rejection, human manual Ready, automatic bot readiness, fresh full boarding after the last human, duplicate/recovered operations, saved timing reuse, audience scrubbing and historical absent/flow-2 compatibility. Real Functions/Tasks cases exercise automatic all-bot 30-second selection, 30-second reading with the exact card/film boundary, separate 10-second boarding, one initialization and a fresh 15-second PRE_TURN. They use real elapsed time, not an injected clock or client advance/bot calls.

Both successful Functions suites exited with code 0 and all owned emulators stopped. The earlier default-engine suite logged one pending deadline availability error during shutdown after assertions succeeded; it is not represented as an extra passing case. The final combined suite completed with normal early-delivery retry behavior and orderly shutdown. Earlier temporary-config/path and noncanonical-port harness attempts were rejected; no guard was relaxed and those attempts are not counted as successful runs.

Private-offer coverage includes inventory-independent Hospital keypad offers and all original numbers (including eliminated seats), identical empty-stock rejection before answer/attempt mutation, existing declaration permissions, bystander/public noninterference, historical field absence, inherited private feedback/Sync/navigation gates and unknown tuple rejection. P18 tests cover living Healthy/Injured/Jailed Hacker eligibility from Round 2 until navigation, with spent/unspent Role Action; command mechanics remain unchanged.

## Historical replay

`packages/engine/test/fixtures/planet-1.1-replay.json` was captured using the unchanged `fb33cecb` engine before this contract/source work. Its SHA-256 is `2bc5d5c9360b712b1d790e014675eed58e7c2b463c11a3defd7e89127a17d086`: **9 histories, 443 recorded transitions and 452 checkpoints including the 9 initial states**. The checkpoints bind full state, public projection and every player projection; command receipts are recorded too.

The candidate replays these unchanged old tuples. Integration independently replayed the same fixture against the predecessor engine and matched all receipts/hashes. No fixture was regenerated to match changed behavior. The captured histories include P27/P28, private feedback, declaration permissions, P18 and panel rejection controls; they supplement the existing historical test suites rather than claiming exhaustive equivalence for every possible history.

## Consumer and release gates

Backend alone retains the old native session model, whose `2 | null` setup type cannot accept the widened shared version. A fresh Backend-only `npm run build` exited 2 with TS2322 at `apps/game/src/planet/session.ts:85`; evidence is `/private/tmp/gamen-phone-backend-alone-build.log`. Full workspace build/typecheck therefore requires the separately reviewed Frontend dependency. With that dependency, the paired build/typecheck pass, but `check:sources` correctly rejects `apps/game/src/planet/session.ts` because the historical exact consumer approval does not cover its new bytes. The observed new source hash is `5c7afc7cc10fa73b66ad986df0649468e581e27b68e2a526cb44ee2a4c7f0eaa`. Historical source/art approvals and manifests are not rewritten here.

The minimal compatibility consumer explicitly conceals role data and offers no Ready action for unsupported flow 3. The final timed phone presentation, corrected Designer source review, exact native source adoption and required combined CI remain pending. Full `npm run verify` is **not claimed passing**. Browser capture, physical phones, hosted acceptance, load, live IAM/Cloud Tasks and human balance were **not run** by Backend for this candidate.

Setup flow 3 and engine profile 1.2 are independent opt-ins; creation defaults, canonical rule hash, existing match pins and asset identity remain unchanged. All five workers and the exact reviewed consumer must support saved sessions before any later authorized activation. Rollback of new creation selection must retain capable processing for existing sessions. No merge, deployment, cloud configuration/IAM, issue #206 retry change or public asset publication is included.

Blackout's pre-vote placement direction has no approved outcome/cancellation package yet. The [two technical alternatives](planet-blackout-timing-proposals.md) remain proposals. No Blackout lifecycle or resolution implementation is included; any approved gameplay change needs its own explicit version/authority review.

## Designer FYI: Promise opportunities and capacity timeout

A read-only audit at Backend implementation head found no executable successor scenario/test assuming one shared evaluation at voting start. `packages/engine/test/planet-opportunities.test.mjs` explicitly settles Meet at vote opening while a Jail Promise stays Pending until ballot closure. `planet-election-promises.test.mjs` retains election Promises through Jail and runoff, settles Captain Support when the election completes and Officer Selection at appointment. P04/P23/P24 remain unchanged. Historical V1/capacity scenario suites do not define the successor's Promise opportunities. No mechanics are inferred from Designer PRs 174–183.

The reported 600-second capacity playout timeout is already corrected in this baseline by `bbdb95102fdd7b979ec64d4903031042724f8bde`: `scripts/test-capacity.mjs` gives playouts 1,200,000 ms and scenarios 600,000 ms, retaining all 600 playouts. This was reported to Integration for comparison with any failing run's exact SHA/outer timeout. This Backend change does not edit the CI/root scripts or claim a fresh capacity run.

Inherited malformed-storage hardening limits (nested view/session identity comparison and unique roster/UID validation) were reported separately. No ordinary authorized path was demonstrated, and Integration accepted keeping those outside this focused change.
