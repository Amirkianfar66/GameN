# Dependent Balance adoption for private Supplier acknowledgments

This focused integration change adopts the committed Balance catalogue with the G17 fix. It requires the engine's actual `projectOwnAcknowledgments` read, runs every ready fixture and control at the checkout's clean Git HEAD, and keeps the previously reviewed blocked and manual cases explicit. A green gate establishes completed checks against that candidate; it does not establish human balance, browser acceptance or deployment acceptance.

## Source and ownership

- Backend base: `36525afeb39adb154f11d72731126bdca82f99d7`, the G17 implementation on hosted source `c8856242caea349b620345349f6b59c7a87b6d7f`; issue [#62](https://github.com/Amirkianfar66/GameN/issues/62).
- Original Balance source: `7d63089497ec4b7cb84881ea3a8cd58febdb2fdf`, including the [catalogue](../../tests/scenarios/v1/catalog.mjs), [rulebook](../balance/game-rules.md) and [review](../balance/contract-review.md). The owned-path-only history import is `9008c9f`; it imports no Frontend, Designer, root, runtime or rule-source bytes.
- Integration guard source: draft [PR #47](https://github.com/Amirkianfar66/GameN/pull/47), `40e47f060521276672c8ee6312e122ce37566d8a`; the current Balance report-gate implementation is imported from the original Balance source above (the follow-up associated with [PR #51](https://github.com/Amirkianfar66/GameN/pull/51)). Earlier report artifacts remain historical evidence about their recorded candidates.
- Reviewed real-read adapter source: local tooling commit `725a5a82978a18c9b9c7f0e7d2ff5b4da4faa9bc` on the original Balance source. Applied patch SHA-256 `161cfb44fcf7e06630f394e404899b83f191a455d20fec28fabd2e5feb9d9f37`; resulting adapter SHA-256 `381d6cfcd3f57cc94a300887740da8ed1df15142522bb98fa4e0fc76ef8d8376`.
- Separately reviewed refusing-fixture correction: patch SHA-256 `71dd50ceeffdc51625c1d690704b22895366bb7a6d1eb0be4c62b69e75c41f65`. It adds the new export to the deliberately refusing API fixture, and permanently requires all three engine CLIs to refuse an otherwise complete module missing only this export.

The history import preserves Balance's committed files. Only the two explicit adapter/fixture corrections alter those trees after import. Integration changes the independent root gate, its tests, the root scripts and the workflow's description. The source lock, frozen original Balance audit/matrix/brief, rule files, root lockfile, engine, service, shared contracts and all Frontend/Designer paths remain byte-identical to the Backend base. The Backend documentation-only verification follow-up `096bfa08ea6808977639e21fbdb93353c8b3d6cf` is carried as an ancestor before candidate verification; its runtime is identical to the implementation base.

## Actual acknowledgment binding

The [adapter](../../tests/scenarios/adapters/full-game-v1.mjs) calls `projectOwnAcknowledgments(state, seatId)` with the engine's initial binding revision of 1. It carries the complete returned DTO unmodified in `raw.also.players`, alongside each seat's existing strict protocol-2 view, so paired privacy cases compare both channels. The Supplier-facing fact is the flattened `successfulRecipientSeatIds` from its own `supplierResults` when `historyAvailable` is true; unavailable legacy history remains `null`, and fresh known-empty history is `[]`. It derives no disclosure from server queues, faction truth or ammunition.

Command identifiers are deterministic per caller (`command-${actor}-${ordinal}`). An unrelated seat's hidden command therefore cannot renumber a player's own acknowledgment and create a false audience difference. This is test adapter behavior; service request namespaces and gameplay semantics are unchanged.

G17 uses the independently versioned [own acknowledgment contract](own-acknowledgments.md), `full-game-1.0.1`, the existing approved ruleset and protocol 2. The strict public/player projection shapes are unchanged. This adoption adds no runtime contract and does not adopt the separate lobby identity proposal or Designer art/tokens. The engine adapter tests the initial binding; service/Rules tests in the G17 dependency cover recovery binding revisions and old-UID revocation.

## Independent reviewed gate

`npm run verify` retains every existing workspace, source, type, build, Backend and Frontend check, then runs `test:balance` and `test:scenarios`. CI retains the browser dependency probe, both emulator suites, and standalone Backend packaging verification. No package dependency or lockfile changes are needed.

The static gate runs Balance's strict check without `--allow-missing-overlay`. Materialization and traceability must match; every static test must execute and pass, with no skipped, cancelled, todo, empty or unfinished test file. The new export's negative CLI test remains mandatory.

The engine gate requires the built `full-game-1.0.1` engine, its real acknowledgment export, Node `22.21.1`, a clean checkout and the actual full Git HEAD. It invokes the three local CLIs without filters, alternate engine roots, stand-ins or trial flags, writing reports into a new directory outside the checkout. Root-owned validation pins the reviewed rulebook, catalogue authoring source, four generated groups, exception list and corrected real-read adapter. Every identifier must be reported exactly once, with the reviewed status, group, seed, decisions and reason. Errors, missing execution, concealed invariant failures, incomplete controls and incomplete playouts fail.

After those independent checks, Balance's adopted report gate reads those same three files with `--candidate-commit` equal to the actual HEAD. It checks common built-module digest, manifest and source pins, Git-read engine provenance and a clean candidate across all three reports. The root gate checks that HEAD and branch stayed unchanged throughout the run.

| Group | Total | Ready and required to pass | Blocked | Manual | Ready mode baselines | Controls required and detected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 7 players | 165 | 152 | 11 | 2 | 152 | 1384 |
| 8 players | 171 | 158 | 11 | 2 | 158 | 1385 |
| 9 players | 178 | 165 | 11 | 2 | 165 | 1619 |
| Unsupported configurations | 8 | 8 | 0 | 0 | 0 | 0 |
| All | 522 | 483 | 33 | 6 | 475 | 4388 |

Ten seeded playouts per mode (`walk-1` through `walk-10`) must complete: 30 total, zero unfinished runs, invariant violations, hint mismatches or replay mismatches. Every required control must be executed and detected, with no failed baseline or undetected control.

The eleven blocked suffixes in each mode stay `FLOW-07` (D17), `FLOW-08` (D20), `FLOW-09` (D19), `MOVE-05` (D16), `SUP-08` (D11), `SUP-09` (D12/D11), `HACK-06` (D18), `FLOW-10` (D17), `SHOW-15` (D34), `OPS-03` (D35), and `POW-01` (D10). `HACK-07` and `OPS-02` remain manual in each mode. A completed blocked probe records the build's behavior, not new canon or a ready pass. Original Powers remain off. The [reviewed exception list](../../tests/scenarios/v1/exceptions.json) is unchanged.

## Reviewed source pins

| Artifact | SHA-256 |
| --- | --- |
| Rulebook `rulebook-v1-2026-10-07-r4` | `76f593c91108b1dc7dcf898f1772f0cf1e9d27a06ba4a417b66ba17e1528991f` |
| Catalogue authoring source | `d4e59c2d76662c7990769bab431f5529aebd7dd4acfc3866267d82a292b1d07b` |
| Mode 7 | `93ce71e36d0763a93cc5204dca3909effb83e0f2876c709f04b9f1f75976fb6f` |
| Mode 8 | `edf2c6a972cf2b4e970b3b154408edc7bb1df22f3e1453a1abb4c199cdec57bd` |
| Mode 9 | `d7d8c7dde2141fece99353c63c1fd7d683e8756eeac9577207f755eacdd7d310` |
| Unsupported configurations | `f4c4a7c044c4596f4be251c0338aff23daa4f749dff90bb267022d83b706ee9c` |
| Exception list | `8687477328a57b37ade88e6cf35c010f9599e695c8f11846bf17dea10cf96148` |
| Approved owner overlay | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| Historical source manifest | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Combined V1 manifest | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2` |

Counts and hashes are intentional Integration review gates. A future Balance catalogue change fails until Integration reviews and moves these independent pins. The original Balance source's stand-in artifacts are clearly labeled fixture-validation evidence; the required root gate accepts only the actual engine. Existing historical engine reports are not reused as this candidate's results.

## Verification and adoption limits

Run the pinned toolchain with `npm ci`, `npm run verify`, `npm run check:browser-dependencies`, the two existing emulator commands and `npm run package:backend -- --verify-install`. The root gate prints the actual clean source commit and fresh report directory. Before candidate verification, offline `npm ci` installed 887 packages under Node `22.21.1`/npm `10.9.4`; the root build passed, all 80 focused Integration guard tests passed, and all 70 Balance static tests executed and passed with the owner overlay present. Syntax, whitespace, local links and the ownership comparison passed. The clean-candidate results are recorded below after execution; current-head CI remains a separate publication gate owned by the coordinator.

Balance review of the binding and catalogue adoption, Frontend review of the private G17 consumer contract, and current-head CI are required before merge. This change does not implement BAL-REQ-2 research export or adopt BAL-REQ-9 lobby identities. Typed names remain absent from research records. Browser/device integration, live deployment, human playtests and social-deduction balance are outside this evidence.
