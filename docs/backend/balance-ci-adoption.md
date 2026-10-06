# Required Balance evidence on the connected landing candidate

7 October 2026. Focused integration proposal for [issue #46](https://github.com/Amirkianfar66/GameN/issues/46), dependent on [landing PR #37](https://github.com/Amirkianfar66/GameN/pull/37). It remains unmerged and changes no game rules, protocol fields, dependency versions or production runtime.

## Reviewed sources and scope

- Landing: `71dfd0277c6ccc4a5dd78b9702face98a46310b8`.
- Balance: `a3898b83deaf19f25e83436b1b18856520b27876` from [PR #31](https://github.com/Amirkianfar66/GameN/pull/31). Its R1 consent checks and R2 runner exit semantics were independently cleared in the coordinator follow-up.
- History-preserving integration: `563554f0bb80d8249a7272f9357e920ac27bc682`, with the two commits above as parents. Balance-owned files are imported unchanged.
- Ruleset: `in-person-v1-2026-10-06`; approved V1-01 through V1-21; Original Powers off; engine `full-game-1.0.0`; protocol 2.
- Coordinator follow-up: `docs/reviews/2026-10-06-follow-up.md` in the shared checkout, SHA-256 `6266e873d1a89264f4c923825dd5af97fe195f6d7ea3dac00ab6dadcbad3faff`. This status refresh preserves the original review and clears the specific Balance dependency; it does not approve every candidate.

The only new implementation is root integration tooling and its tests. Existing engine, service, Frontend, Firebase and Balance sources remain at the pins above. `package-lock.json`, source locks and historical Canvas files are unchanged. The root verification chain retains every established gate and adds Balance checks unconditionally.

## Required commands

```sh
npm ci
npm run verify
npm run check:browser-dependencies
npm run test:emulator
npm run test:frontend:emulator
npm run package:backend -- --verify-install
```

Use Node `22.21.1`, npm `10.9.4` and Java 21. `verify` now appends:

- `npm run test:balance`: the Balance materialization, traceability and static tests, requiring a positive test count and zero failures, cancellations, skips or todos.
- `npm run test:scenarios`: builds the candidate, then runs scenarios, negative controls and ten seeded playouts for each of modes 7, 8 and 9. Every runner receives `--require-engine` and the actual clean checkout HEAD as `--engine-commit`. It uses this checkout's engine, without an external engine override.

Each invocation creates a fresh temporary evidence directory outside the checkout. It checks the actual JSON reports, rather than accepting an exit code or printed summary alone. Required reports and subprocess errors fail the gate. Existing CI still runs Backend and Frontend emulator suites sequentially and then verifies standalone packaging. No workflow condition can substitute an unavailable engine for successful evidence.

A GitHub PR workflow may test a synthetic merge commit. The report records that actual tested checkout HEAD; the PR head remains separately identifiable in GitHub. Uncommitted source changes are rejected by the engine evidence gate: commit the reviewable change before running its complete verification. Temporary synthetic reports contain no live match data or credentials.

## Required execution and exception accounting

| Group | Catalogue | Executed and passed | Blocked | Manual, not run | Control baselines | Negative controls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| mode-7 | 151 | 138 | 11 | 2 | 138 | 1,316 |
| mode-8 | 153 | 140 | 11 | 2 | 140 | 1,296 |
| mode-9 | 158 | 145 | 11 | 2 | 145 | 1,518 |
| unsupported | 8 | 8 | 0 | 0 | — | — |
| Total | 470 | 431 | 33 | 6 | 423 | 4,130 |

The report must contain exactly one result per reviewed catalogue ID, with matching group, mode, seed and decisions. All ready cases must pass; filtering, replacing an omitted ID with a duplicate, unexpected exceptions or changed catalogue hashes fail. Serialized `finalDigest` is intentionally null, and 23 valid setup cases have no commands/transitions; neither is used to infer missing execution.

For each of modes 7, 8 and 9, the blocked suffix/decision allowlist is:

| Suffix | Decisions |
| --- | --- |
| FLOW-07 | D17 |
| FLOW-08 | D20 |
| FLOW-09 | D19 |
| MOVE-05 | D16 |
| SUP-08 | D11 |
| SUP-09 | D12, D11 |
| HACK-06 | D18 |
| FLOW-10 | D17 |
| SHOW-15 | D34 |
| OPS-03 | D35 |
| POW-01 | D10 |

Only HACK-07 and OPS-02 in each mode are manual. Their exact reason is `manual: needs human or user-interface evidence, not an engine run`. Blocked cases with probes must complete those probes without assertion or invariant failures; their observations do not settle canon. No-probe blocked cases retain their catalogue reason. POW-01 / D10 is deferred outside current V1 because Original Powers are off; its accounting does not reopen that approved scope. The other no-probe cases await their recorded decisions. The historical reconciliation's 473/36 counts included withdrawn WIN-07 and are preserved as old evidence; this gate adopts the corrected 470/33 catalogue.

Negative controls require the exact reviewed baseline/control counts, every baseline passing unmodified, every control detected, and empty failed-baseline and undetected lists. These reports are aggregates; this change does not claim an independent per-control ledger.

Playouts require exactly ten completed runs in every mode, zero unfinished runs and zero invariant, legal-target hint or replay mismatches. The current policy and seed labels are checked. These are synthetic legality, accounting, disclosure and replay checks; they do not establish human social-deduction balance, phone acceptance or multiplayer correctness.

## Evidence source pins

All three reports must identify the approved adapter, engine, ruleset, protocol and actual candidate commit. Scenario source hashes are compared with files in the clean tested checkout and the reviewed pins.

| Source | SHA-256 |
| --- | --- |
| Owner overlay | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| Historical source manifest | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Combined V1 manifest | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2` |
| Rulebook | `0b58e8b677b95dbc092b65f0e60b6b79802b60931849c5555da3a3dbdbffb190` |
| Catalogue source | `69da1d4bc462e734eac18691eb6d84161916080ee7bb8910b77663a4439c3ebc` |

The validator also pins all four generated scenario files and compares the historical rule source hashes. Any later catalogue/source update requires focused review and corresponding explicit gate updates. It is not permission to alter approved rules.

## Separate integration requests

Designer [PR #45](https://github.com/Amirkianfar66/GameN/pull/45) at `5553ea9aedd43b2b1785742cdcc9164f5a290aab` is assessed separately. None of its source, assets, tokens or exports is adopted here.

| Request | Separate proposed disposition |
| --- | --- |
| DSN-REQ-1, CI | Prepare a focused additive build, package-test and asset-check gate appended once to the current root test chain. Preserve all current verification/emulator/package gates. Fresh combined-head checks are required; committed render freshness does not approve art or devices. |
| DSN-REQ-2, tokens | Prefer option A for review: preserve historical 0.2.0 and separately pin proposed 0.3.0. Keep `proposedDesignTokens` unchanged; `nextDesignTokens` remains an evaluation export until explicit Frontend adoption. No adoption follows from source pinning. |
| DSN-REQ-3, historical documents | Freeze the four pinned historical sources; use current status/refinement documents. Later historical wording edits need their own reviewed lock/provenance update. |
| DSN-REQ-4, projection facts | Current protocol 2 already supplies command-specific legal targets, own ordinary weapon/rescue counts and eliminated-seat faction reveals. Dedicated spent-reason, self-faction and Captain-immunity fields remain absent. Counts/rank must not imply those semantics. V1-17 private Protection disclosure remains private. |
| DSN-REQ-5, delivery/export | Review a static-copy path or package subpath separately. Load complete public-board/player-ui/roles bundles on every phone before its first match view, and public-board on display; never request assets based on private state. Retain fallback and exclude studies/prototypes from production. |

Historical token hash: `013e5e60d6ad255ca24a373f02a0095fb31cca17df39b6287315c225d70127e1`. Proposed 0.3.0 hash: `095f91a6cc5feb6cb5f0b9cf1c8ec299db16395c0f8436d8fee60ef80b357619`. Proposed manifest `design-0.1.0` still marks human art review pending. Connected art, rights, Frontend adoption and device acceptance remain separate reviews.

Published Frontend #42/#43/#44 and local full-match `113aa6da03b30d112f4ef43335d8bca478169bbf` need their own focused adoption and whole-match evidence. They do not silently replace landing71df. Motion #30 remains parked for R6, where private-only view updates remove live public cues. Phone-environment implementation and device acceptance remain pending under #41.

## Review and validation

The PR will record fresh local and GitHub evidence at its final tested head; that evidence is pending until both runs finish. Integration and affected-role review remain required before merge. This proposal provisions no cloud resources, exposes no listener, deploys nothing and changes no repository access/settings.
