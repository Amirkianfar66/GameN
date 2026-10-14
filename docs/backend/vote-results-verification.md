# Vote-result Backend verification (#119)

Input baseline: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`, preserved `codex/v1-ability-art-release` integration. Implementation/test head verified: `3a408f7f9d3e24fb17aff7c1fa97df5bec5c40b2`. Branch `codex/backend-vote-results`; draft [PR #125](https://github.com/Amirkianfar66/GameN/pull/125). Earlier Backend worktrees and PRs remain intact.

Protocol 2; engine `full-game-1.4.0`; ruleset `in-person-v1-vote-results-2026-10-12`; immutable overlay hash `617173762d5a1589d0adce55d4742a3aa70f6d5af03a968b6ab9f90d5392b010`. Each completed election/runoff, release or Jail vote opens its own five-second aggregate result. Skipped votes have none. Gameplay and Code are blocked until continuation; late first delivery opens the full next clock at actual transition time. Resolution and terminal disclosure retain their reviewed order. Exact historical tuples and existing matches, replay, receipts, assignment and asset pins are preserved.

New deals require the exact prepared five-pin `acceptedVersions` Ready acknowledgment. Missing/mismatched compatibility returns `UNSUPPORTED_PROTOCOL` without Ready mutation or durable receipt; malformed input returns `INVALID_REQUEST`. Authentication/binding and accepted-receipt replay remain authoritative. This is a compatibility declaration, not proof of downloaded bytes.

## Actual checks

Node `22.21.1`, npm `10.9.4`; `npm ci` installed 887 packages. Owned compile command `tsc --build packages/contracts packages/engine services/game-api infra/firebase` passed. Source integrity checks passed, including original Canvas/source bytes, immutable overlays and tuple bindings.

- 568 owned engine, strict contract, Backend and infra checks passed with no skips. Dedicated vote engine acceptance contains 54 cases, covering 7/8/9 players, all outcomes, repeat runoff, skipped/all-abstain distinction, exact/late deadlines, private ballots, queued attacks/Rescue/Supplier, Code/terminal order, abort and historical behavior.
- Dedicated real Auth/Firestore vote acceptance: 21/21 passed. Native readiness compatibility: 12/12 passed for 1.4 and historical 1.3 across 7/8/9. Cases exercise concurrent deadlines, persisted journal replay, receipt conflicts, scoped lost-task repair, recovery and exact public/unrelated publication timestamps.
- Broad isolated Auth/Firestore data run: 227/239 passed initially. All twelve failures were the native staged-start helper lacking the new Ready echo. After updating only that fixture helper, the complete 25-case staged-start file passed. Thus all 239 distinct data cases have passing evidence across the broad run and focused rerun; there was no single subsequent all-green 239-case run. No assertion was removed. Historical placement fixtures now explicitly retain their original 1.3 timing instead of following the current default.
- `node scripts/package-backend.mjs --out /private/tmp/gamen-feedback-backend-vote --verify-install` passed standalone production install, import/runtime checks and fixture/credential exclusion scans.
- `npm run verify` passed toolchain, workspace and source checks, then failed at Frontend exhaustive phase mappings in `packages/presentation/src/copy/en.ts` and `model/common.ts`, which lack `VOTE_RESULT`. Root build and downstream combined gates are pending the affected Frontend/Integration work. Existing Balance/capacity scripts remain with their coordinating owner, including their explicit historical 1.3 default expectation.

Focused logs are local under `/private/tmp/gamen-vote-*`; they contain synthetic emulator evidence. Three first-run vote privacy checks also exposed a test-only `Timestamp.toJSON` call; exact seconds/nanoseconds serialization repaired the helper and all 21 cases then passed.

## Review boundaries

Frontend's early proposal review at `e41e86e16c51494e77bc7743c967519a65c694d1` identified no additional early vote-schema gap. Exact consumer/schema/compatible-manifest adoption and final combined verification remain required in #122/#123. No unresolved vote gameplay decision. The canonical capacity ordering requested by the owner remains recorded as `CAP-ORDER-01`: free healed Hospital occupants first, then injured entrants in stored seat order.

The isolated local suite ran Auth/Firestore at 29199/28280 with Functions disabled. Standard 9199/8180/5101 were occupied by another session and were preserved. Full Functions/HTTP delivery, automatic private-trigger scheduling, actual browser/device acceptance and production behavior were not run for this source. Existing fixture service deadline/repair adapters establish transaction/replay correctness, not cloud delivery or human social-deduction balance. No merge, deployment, IAM or cloud configuration change.

Synthetic neutral receipt example: `{protocolVersion:2,matchId:'fixture-match',phaseId:'fixture-vote',commandId:'fixture-intent',status:'accepted',code:'REGISTERED'}`. No individual ballot or outcome is added to that receipt.
