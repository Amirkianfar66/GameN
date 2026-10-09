# Designer prototype corrections, 9 October 2026

Continuation of draft [PR #88](https://github.com/Amirkianfar66/GameN/pull/88), issue #87, by the owner's replacement Codex Designer worker. Worktree `/Users/amirkianfar/.codex/worktrees/c739/GameN`; local branch `codex/designer-prototype-corrections`; starting head `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02`. Fresh GitHub metadata and fetched refs confirmed that head and base `94a49ce0c5220b814ec56333b028fbe6180b257e` on `codex/v1-pass-board-targets` before edits. Historical Claude folders were left intact. Ownership and integration gates remain unchanged.

## Corrections and evidence

The exact original functions reproduced pending `[5]` after background cleanup in both submitting and checking. Concealment now removes the private board marks, Move ghost, strip, tray offers, card and private announcements when backgrounded, stale, locally expired or disposed. Unsent choices drop; sent/checking/unknown/accepted flows remain internal. A late answer can settle a concealed flow without revealing it; a disposed controller cannot redraw it. Foreground/fresh state never opens private content. Explicit Actions/Card reopening restores the same state with no extra send, lookup or replayed receipt/card animation. Synthetic request counters are local evidence of that prototype behavior, not a durable service test.

Code examples (`tray.open`, `code.two`, `code.four`) now use Round 5; `crowd.supply` uses Round 3; `move.tags` makes the viewer Captain before offering Command. Elections/runoff use Round 2, return the former Captain to A/B and offer only Healthy, unjailed candidates. Related discrepancies found by the new guard were corrected: injured self-Rescue offers no movement, and voting includes all living players, including Injured/Jailed. The guard and negative mutations enforce applicable actor/round/phase/readiness/candidate predicates. It preserves independent Hack, Code and injured self-Rescue exceptions. It does not certify resources, prior-command/runoff history or complete match reachability. Crowds are visibly labeled **layout stress**. No adjacency or room capacity was introduced.

The handoff also corrects Hack publicity (requester is the public active seat; partner association stays private) and documents the existing typed acknowledgment/seat-session pairing and `historyAvailable` fallback. Synthetic knowledge prose is not the real Supplier/recipient feed. No contract expansion is requested.

## Fresh checks

Node `22.21.1`, npm `10.9.4`, macOS, headless Google Chrome `155.0.8059.39`. Browser tools use only local synthetic fixture servers. Sandbox loopback `EPERM` on initial browser attempts was resolved by rerunning the same commands with execution permission; no check was relaxed.

| Command | Result |
| --- | --- |
| `npm ci` | Passed; 887 packages, unchanged lockfile |
| `npm run build` | Passed |
| `node --test packages/design-tokens/test/board-motion-offers.test.mjs` | 20/20 passed, no skips/todo |
| `npm run check:board-motion --workspace @mothership/design-tokens` | 13/13 passed, 14 actions, 20 cues, 65 scenarios |
| `npm run flows:board-motion --workspace @mothership/design-tokens` | 187/187 assertions passed, including late/lost replies, concealment, explicit recovery/reopen and disposal |
| `npm run capture:board-motion --workspace @mothership/design-tokens` | 185 captures + 5 contact sheets, zero reported problems; inputs SHA-256 `ce2218f785e6be6dd6cf5484eb34e9fb0ddda05a15dc8351001f15997621e871` |
| `npm run check:assets --workspace @mothership/design-tokens` | 15/15 passed |
| `npm run check:layout --workspace @mothership/design-tokens` | 456 cases, zero failures |
| `npm run check:shell --workspace @mothership/design-tokens` | 54 loads, 468 redraws, 1368 public comparisons, zero failures |
| `npm run test --workspace @mothership/design-tokens` | 121/122 passed; sole failure is the separately scoped V1 phone checker (13 existing quote mismatches) |
| `npm run check:sources`, `npm run check:workspace`, `git diff --check` | Passed |

Visually inspected the regenerated Round 2 election and 320 × 568 Round 5 Code capture: only eligible election candidates are marked; Code still includes seats in Hospital/Jail/Command. The report verifies normal-width page fit, at least 44 px controls/targets and enlarged-text reflow. Desktop browser simulations and manually dispatched lifecycle events are not physical-device, real background/process-death or multiplayer acceptance.

The complete clean-commit `npm run verify` result and its exact tested head are recorded after the correction commit below. Root verify/CI omit the Designer phone checker and cannot close its failure.

## Separate copy follow-up and dependent work

Both [PR discussion comments](https://github.com/Amirkianfar66/GameN/pull/88#issuecomment-6071845711) ([Designer agreement](https://github.com/Amirkianfar66/GameN/pull/88#issuecomment-6072261768)) keep the 13 V1 phone quote mismatches out of PR #88. They were freshly reproduced unchanged here: 6/7 check groups passed, 13 verbatim failures. The focused issue #76 follow-up updates/retire superseded examples under `2026-10-08-compact-phone-ui.md` and regenerates its own docs, captures and flows. This correction leaves that checker strict.

Frontend [PR #92](https://github.com/Amirkianfar66/GameN/pull/92) was read at `aa007890c5bf8f4801bfb545c0f6da0426f7d6cd`, stacked on the old Designer head. Integration owns synchronization/review; this worker does not rebase or push Frontend. Backend [PR #90](https://github.com/Amirkianfar66/GameN/pull/90), read at `7f921f4ee05958834532a36d37b72541237fd9e0`, separately reviews that consumer. Designer fixes do not close any remaining production-consumer findings.

Both accepted protocol-2 gameplay tuples remain: `full-game-1.1.0` / `in-person-v1-pass-2026-10-08` and legacy `full-game-1.0.1` / `in-person-v1-2026-10-06`. Original Powers stay off. Production still uses manifest `design-0.2.0`, tokens `0.4.0`; `board-motion-0.2.0` is a proposal. DSN-D30 props, DSN-D31 motion treatments and DSN-D32 production figures retain their review gates; DSN-D33 pose/catalog, DSN-D27 capacity, DSN-D28 adjacency and DSN-D29 subtitles remain unresolved. Board targeting itself is approved. No merge, force push, deployment, IAM/billing operation, production/private match access, new art publication or modification of reference sources occurred.
