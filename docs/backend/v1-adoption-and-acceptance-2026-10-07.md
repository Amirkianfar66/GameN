# V1 adoption and acceptance handoff — 7 October 2026

This is the Backend/Integration follow-up to draft #39 and the preserved 6 October review records. It uses base `40e47f060521276672c8ee6312e122ce37566d8a` (#47), ruleset `in-person-v1-2026-10-06`, protocol 2 and Original Powers off. It updates triage from actual source/probes and identifies dependencies; it does not merge role work, change canon, deploy or accept a cloud/physical-device game.

## Candidate pins and adoption order

| Candidate | Immutable commit | Dependency / gate |
| --- | --- | --- |
| Main landing #37 | `71dfd0277c6ccc4a5dd78b9702face98a46310b8` | Main-targeted Backend plus connected Frontend foundation; draft, green |
| Required Balance CI #47 | `40e47f060521276672c8ee6312e122ce37566d8a` | On #37; includes reviewed Balance #31 `a3898b83deaf19f25e83436b1b18856520b27876`; draft, green |
| Host schemas #38 | `38ebd591238e1b006df7d8b155f37985a0bd9c3d` | On #37; additive strict schemas, draft, green |
| Frontend schema consumer #43 | `c9a6c8fe4482f479761e0eeee757155edd37ba89` | On #38; separate from full-match line, draft, green |
| Frontend actions #42 | `ec4053919bab58c8285ec0730bc93b86b4979dfb` | On #37; draft, green |
| Frontend votes #44 | `2d77bcd213ed80748c9d58dc4abbaebeee29f620` | On #42; draft, green |
| Frontend knowledge #48 | `cb2ae426752b190cb80e5e50b22f989a79d76196` | On #44; draft, green |
| Frontend results #49 | `86b64a8133cdcda40394d9ffce68df3461dd2108` | On #48; draft, green |
| Frontend recovery #50 | `a4ad3cd43bdece63e0a5990775589c9b919bb219` | On #49; draft, green |
| Frontend full match | `4b6dc327104f099051a71bb9e71adbf71390a2a5` | On #50; committed browser evidence, no independent full-match rerun here |
| Hosted client proposal #53 | `731c7cc34450a3c6dde6d3d701a0f9470bf749b9` | On full match; two source-review blockers in [Backend readiness](hosted-preview-readiness.md) |
| Balance report gate #51 | `e0239bfc80da7645eef5994160a3184132179919` | On #31; claims compatibility with #47; draft, green; combined adoption still untested |
| Designer #45 | `6017c61ac4a297d8b1298e5e898a38f38742df45` | Separate main-based asset/tokens handoff; green, not adopted here |
| Motion #30 | `24a52371d959286c4c259ff3a2ab621d53f048e9` | Protocol-1 fixture lineage on #18; original R6 probe now passes; production integration still separate |

PR pins/green status were read back on 7 October; hosted/full-match local commits are separately pinned. #42 → #44 → #48 → #49 → #50 → full match ancestry was independently checked. **Neither #38 nor #43 is an ancestor of the full-match commit.** The full-match line has no engine/contracts/service/Firebase diff against #37. Do not claim schema consumer adoption from the full-match record.

Keep one focused integration change per dependency: establish #37 and #47 as the review baseline; integrate #38/#43 and the sequential Frontend line in an isolated combined candidate with affected-role review and fresh checks; then integrate compatible #51 while retaining #47's root guard. #51 must not replace the required engine gate with an unavailable-engine success path. Verify exact catalogue/source hashes, reviewed exceptions, per-mode executable work, 423 baselines/4,130 negative controls and all 30 playout completions on the resulting combined pin. #45 tokens/assets and #30 protocol-2 motion need their own narrow adoption reviews. This order is a proposal, not merge authorization; all our PRs remain draft and unmerged.

#47's exact-head CI run `37538163825` passed 679 root tests plus 35 Backend and 4 Frontend emulator tests, 718 total. Its CI merge `a1ac6d91bd7d6e7b95715355ac0be935e7791317` has the same tree as published head `40e47f...`. Balance results are 431 passed, 33 explicitly blocked, 6 manual, 470 total; 423 baselines, 4,130/4,130 negative controls detected, and ten completed playouts per player mode. These supersede #39's historical 473/36 counts without rewriting that source record. Superseded red #24 is not the landing path.

## Review-record continuity and evidence limits

Preserve `docs/reviews/2026-10-06-all-agents.md` (SHA-256 `ca89e03b7ee059dc7033eef42bbc4a22358995313260fa8b8ecf53cc20148648`) and `docs/reviews/2026-10-06-follow-up.md` (`6266e873d1a89264f4c923825dd5af97fe195f6d7ea3dac00ab6dadcbad3faff`). They reside in the coordinator checkout; this branch does not replace either with a retrospective claim. The following triage corrects or narrows prior assertions.

Coordinator independently installed/built Motion #30 at `24a523...` and ran R3–R5 checks, the original R6 private-only cue probe and 68 focused tests, all passing. This Backend session inspected `/private/tmp/gamen-status-motion-be20ztpz/r6-probe.log` and `motion-tests.log`, not another rerun. **Original R6 can close for this pin.** It does not approve protocol-2 public events or production motion adoption. Public/seat projections and production event contracts still require their own review.

Frontend's full-match record at `4b6dc...` reports 630 tests and one 2,737-second, seven-player emulator journey: five rounds and showdown, 46 real 60-second phases, Blue plus Alien winners. Nine Chromium contexts represent seven players, host and display. Backend inspected its committed facts/log and source, not an independent repeat, physical phones or human social-deduction balance. Record hashes: `docs/frontend/connected-full-match.md` `4cfc316324f0af731304a2caf60fb7c8d38311f35a52fd7f3bce1240f14ff183`; facts `a94066b2ea767577437adb46f96540a1b8818bddb76ad1f29ea980edebf85649`; log `1afdef3d909abcc2d946d78d54e4d61ade11232bc3207e8c56d61b030494137b`.

That journey checks Supply recipients' later weapons, a wrong Code attempt, results, and selected recovery/reload behavior. Disable/Protection/Rescue/Hack/ordinary-shot resolutions, Captain/release/healing, correct Code and draw need distinct end-to-end evidence. An action registration check does not prove its later effect. Uncommitted journey edits in the active Frontend worktree are not this evidence pin. Hosted `731c7cc...` reports 635 local tests but its wrong-origin startup refusal is not a live Auth/App Check match.

## Triage: approved defects and follow-ups

### G17 — approved-rule implementation defect

Owner decision V1-16 in `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json` requires successful Supplier grants to be known only to recipients and Supplier, with no public weapon marker and no Officer second shot. No new canon choice is needed for that disclosure.

`packages/engine/src/full-game/lifecycle.ts:94–102` applies successful grants but records no Supplier outcome; projection at 266–268 provides own weapons/knowledge/queued IDs only. Strict `packages/contracts/src/full-game.ts:78–81` has no grant result; `services/game-api/src/full-game.ts:175–202` persists projections and selected events without a grant-outcome channel.

An independent pure probe built exact #37 `71dfd027...` with Node 22, resolved two accepted Supply variants with different successful recipient sets, serialized/reloaded the engine, and found the Supplier views byte-identical with empty pending IDs. Recipient counts were correct; public/uninvolved views were identical. This reproduces missing Supplier disclosure; it is not an emulator/UI fix test. Probe evidence: `/private/tmp/gamen-g17-repro.xua4hS/repro.mjs` and `result.json`.

Propose a focused affected-role-reviewed change: persist a durable successful-grant ledger at round-3 resolution, expose it through a new opt-in own-acknowledgments DTO/read bound to the active authenticated seat. Supplier sees actual successful recipient IDs/round, recipients see only their own receipt, other seats/display see none. Preserve existing strict protocol-2 views/receipts; adding even optional unknown fields breaks older strict readers. States predating the ledger cannot infer history from an erased queue: use fresh post-rollout matches or an explicit history-unavailable result. Journal reconstruction would be a separate migration.

Required acceptance: successful/failed/eliminated-target grants, actor death versus registered effects, Officer behavior, replay exactly once, restart/reload and recovered UID, denied other-seat/old-UID reads, public/nonrecipient noninterference including revisions/events, and Frontend private panel/DOM/storage boundaries. Those tests and implementation are proposed, not completed here. D11/D12 remain separate unresolved mechanics, not permission to block approved V1-16 disclosure.

### G18 — private acknowledgment contract and UI follow-up

V1-08 already records/evaluates one round-5 Code attempt, without revealing correctness on acceptance. Engine lines 173–175 store `codeSubmitted`/`correctCode`; availability becomes false, but the view has no Code acknowledgment. Frontend settles/removes its pending IDs, and reload can leave the action idle with no offer. A paired correct/wrong Code probe on #37 confirms attempts are recorded after serialize/reload and that receipts/all audience views remain identical, avoiding a correctness leak (`code-repro.mjs`, `code-result.json` in the same evidence folder). It does not constitute a browser reload test.

A new opt-in private acknowledgment can expose Hacker-only `codeAttemptRecorded` without guessed seat IDs or correctness. Preserve unresolved receipt reconciliation. This is implementation/product follow-up within V1-08, not a new owner rule decision.

### G15 — tally provenance gap, no reproduced wrong tally

`lastTally` lacks round/source phase/publication time, and persists across later phases. Current `apps/game/src/connected/votes.ts:63–88` says “Last vote counted”; the announcement adapter now avoids an aborted-match recount. No incorrect vote count was reproduced. Propose provenance via an explicitly reviewed/negotiated contract, not an unannounced field in a strict view. Test equal counts in consecutive rounds, runoff, release/Jail, abort and reload labels. No voting-canon reapproval is needed.

### G20 — recovery usability within approved V1-21

Current tokens are 32 random bytes/base64url (43 characters), hash-only on the server, expire in ten minutes and redeem once (`services/game-api/src/full-game.ts:436–477`). Keep entropy and use host-supervised copy/paste; match ID can be shared separately. #41 excludes tokens from URL/QR/logs/custom persistence. Clipboard behavior needs a reviewed UI implementation. A shorter human PIN would require its own security/protocol design; it is not automatically a game-rule choice. Cover issuance retry ordering, expired/used tokens, same/replacement UID, reverse binding and no token leaks.

### G22 — distinguish session restoration, host-player and host-only

Same-tab reload retains the anonymous Auth UID through session persistence and `authStateReady`; it does not automatically create a new identity. Closed/cleared credentials are different. **Host-player recovery already rotates `hostUid` atomically** when its seat is redeemed (`services/game-api/src/full-game.ts:478`). Existing emulator regression `services/game-api/test-emulator/full-service.test.mjs:365–380` checks old host refusal/new host recovery issuance and abort; coverage was inspected, not rerun in this triage.

Host-only identity loss has no general transfer endpoint. #41 explicitly documents it. Choosing a recoverable login/session policy, or designing general host-capability transfer with authority/revocation, is a real product/operational decision. Do not implement a new-host claim or redeal/reset shortcut. A blanket assertion that all host credential loss requires a new match is inaccurate.

## Acceptance and remaining owner choices

G17, hosted CSP and G23 need implementation review and regressions. G18/G15 are private acknowledgment/provenance follow-ups; G20 is usability; G22 is partly covered and partly an operational-policy gap. These do not reopen settled V1 mechanics. For the follow-ups above, remaining decisions include D11/D12, staging destination/account/cost authorization, preview access/Auth policy and host-only credential-loss policy. Other registered open edges, including D16–D20 and D34/D35 in the pinned Balance traceability register, remain for separate triage; D10 is deferred with Original Powers off. This handoff does not close those entries.

After integration, run the required checks on a clean combined head (including all three `--require-engine` modes), browser production exclusion and standalone packaging, then actual host/player/display emulator and hosted acceptance. Cover whole matches separately for 7/8/9, all uncovered effects/result paths, rejection/retry/delayed resolution, adverse listener denial, reload/recovery and unattended server timing. Keep synthetic pairs for disclosure noninterference. Real phones/table readability, screen readers, reduced motion and supervised human playtesting remain distinct evidence. Human social balance cannot be inferred from bot playouts or screenshots.

Limited hosted playtesting is the coordinator's authorized publication task after destination selection and the actual technical gates. It is not merge authorization or complete V1 acceptance. [Backend readiness](hosted-preview-readiness.md) supplies concrete configuration/IAM/live checks and records the two current hosted blockers. This deliverable leaves runtime, role-owned sources, strict schemas and all rule/source locks unchanged.
