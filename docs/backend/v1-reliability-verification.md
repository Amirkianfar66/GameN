# V1 receipt recovery and reliability verification

Deliverable issue #19, branch `codex/v1-recovery-reliability`, implementation base `230cc39bdced7f54dbd44eabeef6aa91e9462ce0`. The PR identifies the final tested commit. Dependencies remain PR #11 → #12 → #16 → #17; live GitHub read confirmed each open/unmerged before this follow-up. All V1-01–V1-21 remain approved, Original Powers off, ruleset `in-person-v1-2026-10-06` / SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`. No engine, service runtime, shared schema, rule, dependency or production artifact input is changed.

## Changes and actual local evidence

The [runtime handoff](v1-deployment.md) now limits persistence to match/seat/phase/command identifiers, retains payloads and private targets only in page memory, requires reconciliation before replacing an unresolved intent, and distinguishes a durable decision from invocation-scoped failures. Receipt-before-phase/time validation, terminal accepted/rejected receipts, concurrent duplicate safety and unknown outcomes are named guarantees. A fresh closed-phase view followed by unknown lookup rules out later acceptance, but does not prohibit a later `PHASE_CLOSED` rejection. Rollback/reseed requires a fresh match ID; no same-identity epoch/restore mechanism is implemented. Lost recovery-token issuance is reconciled through the original operation ID before replacement, preventing a delayed old issuance from superseding a newer grant.

Five permanent emulator regressions cover six concurrent accepted Officer deliveries, both rejection codes under concurrent delivery, identical retries after phase advance/resolution, one resource reservation/health effect, one receipt/journal/registration event, unchanged audience data/update times, lost acknowledgement after a real commit followed by a safe error, and negative lookup after fresh phase closure. Existing admission races now retain exact operation request IDs and settle only `UNAVAILABLE` with two bounded identical retries, still requiring exactly one approval and one forbidden loser plus binding/membership/lobby consistency. Reconstruction asserts a new match ID and keeps old command receipts in their source match.

Executed on 6 October 2026 with Node `22.21.1`, npm `10.9.4` and Java `21.0.12.1`:

| Command | Actual final result |
| --- | --- |
| `npm ci` | Passed; 826 packages from committed lockfile |
| `npm run verify` | Passed: 25 bootstrap/contracts + 79 engine + 41 backend = 145 tests; zero failures/skips/todos |
| `npm run test:emulator` | Passed: 35 tests, zero failures/skips/todos; real loopback Auth/Firestore/Functions, clean suite shutdown |
| `npm run package:backend -- --verify-install` | Passed: clean standalone production installation/import and forbidden-source/fixture scans |
| `node --check services/game-api/test-emulator/full-service.test.mjs` and `git diff --check` | Passed |

Final tested emulator test file SHA-256: `63e561a350741fd97f26a5e0b8807ea8f8e34966b0e2c5aaf2ac2d50a9f6445f`. The first emulator run exposed a synthetic lost-ack wrapper missing `db.doc` (fixed so the failure occurs after actual commit) and an existing admission race treating exhausted emulator lock contention as a final forbidden response (now resolved through bounded identical operation retries without relaxing invariants). After the wrapper repair, all 35 passed; the final run after retry/test strengthening also passed all 35. No failing/skipped result is represented as passing.

The standalone package recorded artifact SHA-256 `00f814d83370f142fb378be5f30d4b85dc4a76d60176c224e619a1d5e9272322` and runtime SHA-256 `99c0b8cc29fcda76e7bbb25b1b8037677218a5311988a7754caef1abf4694d34`. Both match the baseline because runtime/package inputs are unchanged. `verifiedStandaloneInstall`, forbidden-source and legacy-fixture scans passed; generated artifacts are ignored and not committed.

## Remaining acceptance gates

Frontend inspected consumer pin is `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f`, read-only. Its actual suites and production-exclusion checks are assigned to the separate pinned combined tooling candidate; this Backend-shell branch alone does not establish Frontend acceptance. Protocol 2, existing strict payload shapes and game rules remain unchanged. Frontend/Balance handoff adoption and integration review remain required before merging the dependency stack.

Not run: deployment/provisioning; production App Check, IAM, Tasks/Eventarc/Scheduler delivery or backup restoration; real-device connected acceptance, load/cost guarantees or human playtests. Emulator reconstruction is deterministic replay under a new local match identity, not production restoration evidence. No cloud resources were created and no PR was merged.
