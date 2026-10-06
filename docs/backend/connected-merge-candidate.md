# Connected V1 main-targeted merge candidate

Issue [#32](https://github.com/Amirkianfar66/GameN/issues/32) replaces the ambiguous stacked landing route with one draft candidate targeting actual `main`. The candidate is a review proposal, not approval of its source PRs or complete/production V1 acceptance.

## Exact inputs and preserved history

| Input | Exact commit |
| --- | --- |
| Actual remote main / PR base | `b9d93342c9f1fe35dafcb68d63737b8e46e17ecb` |
| Backend and browser dependency stack, #28 | `5adaf98f8412e2294f45e00f8fb7c4c515127226` |
| Connected Frontend, #29 | `8b97180038a37b798fbef345272a32e42c0d0853` |
| Main + Backend source merge | `53faa2533cb4f357ad522f3403ea7c3da8bcca40` |
| Connected source merge | `93180c5c6427daafd0b367c7fd47dd3e60c8c37d` |

Branch: `codex/v1-connected-merge-candidate`. Both merges preserve exact parents. The Frontend already descends from Backend #28. Neither workstream contained main's later bootstrap-record commit, so a new candidate includes that actual baseline rather than reporting the older stack as current main.

The sole merge conflict was historical text at the end of `docs/integration-baseline.md`. Resolution keeps main's actual bootstrap merge record and Backend's appended first-slice handoff, and makes the delivery-status sentence explicitly historical. Canon, source locks and original baseline SHA are preserved. Frontend's committed source is unchanged. The main checkout's uncommitted review file and all active role checkouts/drafts are untouched.

Review source read from `/Users/amirkianfar/GameN/docs/reviews/2026-10-06-all-agents.md`, SHA-256 `ca89e03b7ee059dc7033eef42bbc4a22358995313260fa8b8ecf53cc20148648`, with Backend5ada/Frontend8b/Balance dedfe692 pins. Its browser journeys are retained local evidence from that review, not newly executed candidate phone or complete-game acceptance.

## Landing disposition and checks

The proposed landing unit is the main-targeted draft linked from #32. It contains the reviewed histories behind Backend #11 → #12 → #16 → #17 → #20 → #22 → #24 → #26 → #28 and Frontend #15 → #18 → #29. These remain open/unmerged evidence and dependencies for affected-role review. The consolidation does not declare their contracts, browser dependencies or Frontend changes approved.

**Do not merge #24 independently.** Its own head lacks the required Frontend suites and remains red. Green #26/#28/#29 never substitutes for #24's failing check. #24's proposed landing route is superseded by this consolidated candidate; its PR records that disposition. After review of this actual candidate and green checks at its exact head, the coordinating reviewer may decide how to close/retarget the source PRs. No PR is merged or closed by this work.

The unchanged verification gates still run the full bootstrap/contracts, engine, Backend, tooling and real Frontend suites, typechecks, source integrity, build and production exclusion. The candidate adds two explicit CI steps: the existing strict browser dependency probe, and the actual Frontend emulator suite through root `test:frontend:emulator`. Missing suites/commands fail. Backend and Frontend emulators run sequentially on their fixed ports, followed by standalone package verification. The `bootstrap` job remains the check identity; tests are never conditionally skipped.

Run Node `22.21.1`, npm `10.9.4` and Java21:

```sh
npm ci
npm run verify
npm run check:browser-dependencies
npm run test:emulator
npm run test:frontend:emulator
npm run package:backend -- --verify-install
```

Actual results and the final published head/run are recorded in the draft PR after execution. Source inputs previously had 558 verification tests, 35 Backend emulator tests and 4 Frontend emulator tests; those review counts are not a substitute for running this candidate. Real browser journeys are not added to CI without the separately reviewed browser/runtime setup.

## Follow-up boundaries

Host document exports (#33), unattended local deadline polling (#34), first-phone environment setup (#35) and request/decision reconciliation (#36) remain focused follow-ups from this candidate. Balance #31 is excluded until its R1 consent-validator and R2 failing-baseline controls corrections receive review. Balance CI must validate actual execution/counts rather than green bootstrap or unavailable-engine exit status. Parked motion #30 and its R3–R5 remain Frontend-owned; Designer draft assets remain excluded.

Ruleset remains `in-person-v1-2026-10-06`, approved overlay SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`. Historical source-manifest pin remains `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. Backend protocol2, V1-01–V1-21 and Original Powers off are unchanged. No deployment, network exposure, repository setting/access change, public release, complete V1 or human-balance acceptance is claimed.
