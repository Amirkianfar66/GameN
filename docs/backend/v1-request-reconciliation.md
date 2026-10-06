# V1 request and decision reconciliation

Issue [#36](https://github.com/Amirkianfar66/GameN/issues/36). Documentation base: `71dfd0277c6ccc4a5dd78b9702face98a46310b8`; branch: `codex/v1-request-reconciliation`. This triage changes no implementation, shared contract, dependency, source lock or game rule. It records ownership and proposed adoption gates; it grants no merge or deployment approval.

V1-01 through V1-21 remain approved. Original Powers remain off. Older role requests must be read against the current protocol-2 handoff and owner overlay rather than treated as new authority or repeated approval requests.

## Exact evidence and authority

The coordination review was re-read from [the saved report](/Users/amirkianfar/GameN/docs/reviews/2026-10-06-all-agents.md), SHA-256 `ca89e03b7ee059dc7033eef42bbc4a22358995313260fa8b8ecf53cc20148648`. That captured file is outside this documentation base and is not added by this change. Its conclusions and actual counts below are attributed to that review, not to a new test run for this document.

Read-only remote-head verification on 6 October 2026 returned these exact pins:

| Evidence | Immutable pin |
| --- | --- |
| Backend/dependency candidate, PR #28 | `5adaf98f8412e2294f45e00f8fb7c4c515127226` |
| Connected Frontend, PR #29 | `8b97180038a37b798fbef345272a32e42c0d0853` |
| Balance, PR #31 and `agent/game-balance-baseline` | `dedfe6929e65b22289ea427caba0ae9527e71e24` |
| Parked protocol-1 director, PR #30, as reviewed | `11c9b55ef4c3d7a724dbc7c0dd8dae55ab10fc04` |
| Balance's earlier engine audit | `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde` |

The engine lifecycle and full-game contract bytes inspected by Balance are unchanged between its earlier engine audit and Backend #28. The service, dependency and connected-client handoffs nevertheless require their own current review.

| Rule evidence at Backend #28 | SHA-256 and meaning |
| --- | --- |
| [Approved owner overlay](../../rules/overlays/in-person-v1-owner-decisions-2026-10-06.json) | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`; approved V1-01–V1-21; currently the match's `rulesetHash` |
| [Historical source manifest](../../rules/source-manifest.json) | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`; historical baseline and overlay source pins |
| [Combined V1 manifest](../../rules/in-person-v1-manifest.json) | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2`; separate composite evidence, not the current wire hash |

Ruleset: `in-person-v1-2026-10-06`; wire protocol: 2. These three hashes are distinct. A future composite match pin needs an explicit version/compatibility decision preserving active matches; recording it here does not replace the overlay hash.

Source precedence remains [AGENTS.md](../../AGENTS.md): explicit owner decisions, confirmed overlays, then unsuperseded baseline rules; architecture and prototypes do not settle gameplay. The approved [decision sheet](v1-rule-decisions-proposal.md) and [client handoff](protocol2-client-handoff.md) take precedence over historical summaries. The [Balance rulebook](https://github.com/Amirkianfar66/GameN/blob/dedfe6929e65b22289ea427caba0ae9527e71e24/docs/balance/game-rules.md) is a useful sourced consolidation, with source authority retained. Its [decision register](https://github.com/Amirkianfar66/GameN/blob/dedfe6929e65b22289ea427caba0ae9527e71e24/docs/balance/rules-audit-v1.md#decision-register) needs the targeted dispositions below; its count of working readings does not create a blanket new approval gate.

## Findings and role boundaries

| Finding | Owner and disposition |
| --- | --- |
| R1: incomplete participant records bypass consent/pseudonym validation | Balance must validate every actual participant in every non-template record. Missing server facts may remain incomplete; false/absent consent or an invalid pseudonym must not pass. Require regression cases for all three and review template handling before adopting the validator. |
| R2: failed scenario baselines skip controls and exit successfully | Balance must fail any required nonpassing baseline and add a failing-baseline exit-status regression. An intentional unavailable-engine mode must report its nonexecution explicitly and cannot satisfy CI. The review's synthetic probe produced 423 failed baselines, zero controls and exit 0; it did not demonstrate an engine failure. |
| R3: latest director frame loses cues depending on event/view arrival order | Frontend owns the parked director correction: defined cue consumption/expiry and final-frame tests for both delivery orders. |
| R4: public cues survive blocked/recovery screens | Frontend owns cue invalidation when its owning view leaves the screen, including stale/background recovery. |
| R5: public cue/spoken-line numbering depends on private activity | Frontend owns independent channels/counters and public-channel noninterference tests. The review demonstrated a frame-contract defect, not another seat's Firestore feed or public DOM receiving a secret. |

This issue implements none of R1–R5. R3–R5 concern the parked protocol-1 director, not connected PR #29's views-only page. Its other acknowledged findings in `docs/frontend/verification-slice-3.md` remain open; correcting only these three does not establish director adoption. Protocol-2 adaptation, real-feed cue verification and Designer freshness agreement are additional gates.

## Current Frontend requests

Read the [current protocol-2 adoption assessment](https://github.com/Amirkianfar66/GameN/blob/8b97180038a37b798fbef345272a32e42c0d0853/docs/frontend/protocol2-adoption-assessment.md) alongside the [earlier integration requests](https://github.com/Amirkianfar66/GameN/blob/8b97180038a37b798fbef345272a32e42c0d0853/docs/frontend/integration-requests.md), historical re-review and [connected evidence](https://github.com/Amirkianfar66/GameN/blob/8b97180038a37b798fbef345272a32e42c0d0853/docs/frontend/connected-v1.md). Earlier fixture/protocol-1 assessments are not the status of the connected flow.

| Request | Reconciled disposition |
| --- | --- |
| REQ-1 real Frontend suites/exclusion in root verification | Implemented in the integrated candidate; missing suites and skipped/todo tests fail. Adoption still needs the actual coherent candidate's required checks. |
| REQ-2/REQ-3 browser type program and import boundaries | Implemented in candidate root tooling. Frontend accepts its app's DOM/JSX program and owns the additional separation of its browser-free client core from browser modules. Engine/service remain without DOM; presentation remains renderer-free. |
| REQ-4 browser/renderer dependencies; REQ-7 Firebase web client | Frontend accepted Stage A's exact React/DOM 19.3.0, Vite 8.3.3, React plugin 6.1.2 and Firebase 12.18.0 in #28. Requested 12.19.0 fails the pinned compiler's real Firestore declarations on missing `Temporal`; do not assume its Auth fixes were adopted. Later Three/R3F/GSAP stages remain separate. |
| REQ-5 browser automation/CI | Separate adoption remains pending. Existing review journeys do not establish a permanent browser gate or real-device acceptance. |
| REQ-6 historical source-lock documents | Preserve frozen bytes. A focused reviewed pointer/lock update may identify the current documents; do not regenerate the lock to silence integrity checks. |
| Earlier A/B/C: concurrent identical calls, replay order, restores/revisions | Answered by the handoff: at most one stored receipt under interleaving, durable replay before phase/time validation, lower revision is an integrity failure, and reconstruction uses a new match identifier. |
| Earlier D: importable examples | Partial: Backend's synthetic JSON remains service-test evidence; Frontend has hand-built schema-checked examples within its own ownership. A shared development-only example surface needs separate review/exclusion. |
| Earlier E/F/G: event ordering and audience revisions | Handoff/code answer ordering and numeric `{revision}-{ordinal}` identifiers. Each audience gets at most one revision for its net changed projection in one transaction; private changes do not create unrelated public sequence gaps. Malformed identifiers are an unhealthy stream. |

The [contract refinement proposal](contract-refinements-proposal.md) is still a proposal. CR-P2-01 (target-key enum) and CR-P2-03 (own pending kinds without targets) have Frontend support for the next protocol. CR-P2-04's lifecycle conflict label has support, and the client handles both existing/proposed conflict codes. Strict audience shape or field-meaning changes require reviewed protocol/compatibility adoption and active-match version routing; they must not silently redefine protocol 2.

**CR-P2-02/BAL-C01 is answered for current protocol 2.** `ordinaryWeapons` is the resource count. `shotAvailable` says the ordinary-shot category is present for this actor/window; it can be true with an empty `REGISTER_SHOT` list and is false during Showdown. Frontend correctly requires `self.shotAvailable && (legalTargets.REGISTER_SHOT?.length ?? 0) > 0`, plus fresh match/phase/audience, trusted time and no unresolved intent. Showdown uses its own legal targets. Balance should re-review these current documents; no connected-flow defect was reproduced and no rename/semantic change is adopted here.

| Current gap | Owner/next gate |
| --- | --- |
| G1 host session/admission schemas | Focused Backend issue [#33](https://github.com/Amirkianfar66/GameN/issues/33); Frontend's strict local readers are provisional. Export/adopt reviewed schemas separately. |
| G2 lobby lacks revision/ruleset pins | Accepted interim uses Firestore snapshot order and pins first game view. Future lobby replay hardening is separate, not a reproduced current blocker. |
| G3 display pairing; G4 identity/persistence; G10 phones cannot use loopback preview | Environment/pairing issue [#35](https://github.com/Amirkianfar66/GameN/issues/35). Full UID entry and emulator-only anonymous per-tab session persistence are current interim behavior, not production decisions. Auth credential persistence and private match cache policy are distinct. |
| G5 slow seven-player shot demonstration | Preserve real 60-second phases. Nine-player Officer registration was exercised; an optional seeded/clock harness needs an explicit development-only decision, never a host phase override. |
| G6 registration events; G7 kinds after reload; G8 event ordinals | Current semantics are documented: accepted immediate commands can have `COMMAND_REGISTERED`; queued IDs are a subset. Reload wording stays generic; pending kind is future CR-P2-03. Numeric ordinal handling is accepted. |
| G9 local future tasks delivered immediately | Focused Backend issue [#34](https://github.com/Amirkianfar66/GameN/issues/34). Client `v1Advance` catch-up worked; unattended local deadlines and production delivery were not established. |
| G11 abort/recovery operations unused by first flow | Frontend owns later controls using existing documented operations. Identity policy depends on #35; no endpoint or gameplay invention is needed here. |

The connected page offers only `MOVE` and `REGISTER_SHOT`. Remaining role actions, Hack, Code, elections/Jail/release, showdown, results, abort/recovery UI, designed lobby/pairing and complete device acceptance remain Frontend follow-ups. The dependency smoke probe proves package/type/bundle compatibility; actual connected transport evidence is a separate result.

## Current Balance requests

Read [integration requests](https://github.com/Amirkianfar66/GameN/blob/dedfe6929e65b22289ea427caba0ae9527e71e24/docs/balance/integration-requests.md) and the [contract review](https://github.com/Amirkianfar66/GameN/blob/dedfe6929e65b22289ea427caba0ae9527e71e24/docs/balance/contract-review.md) at the Balance pin above.

| Request | Reconciled disposition |
| --- | --- |
| BAL-REQ-1 Balance CI | Accept as an additive integration proposal only after reviewed R1/R2 corrections. Its bootstrap-era root diff must not replace newer engine, Backend, tooling, Frontend, build or exclusion gates. Static `check` validates fixtures/documents; scenario execution is a separate required gate. See the plan below. |
| BAL-REQ-2 private post-match research export; BAL-C13 result cause | Separate Backend/privacy design dependency for complete records. Finished/Aborted only, authorized facilitator/researcher role rather than host alone, no Auth/device/address/free text/Hack content or operational analytics. Consent, access and retention need owner approval first. Opportunity counts need legal-set evaluation, not only accepted commands. Incomplete records remain possible, with R1 participant checks mandatory. No export is added here. |
| BAL-REQ-3 sourced rulebook/current register pointer | Support a reviewed pointer while preserving source precedence. This document triages the identified open edges. It does not edit another role's register or ask for blanket reapproval of D11–D38. Any AGENTS/source-lock change is a focused integration change. |
| BAL-REQ-4 supported engine test surface | Five functions are used: `createFullGame`, `executeFullGame`, `advanceFullGame`, `abortFullGame`, `projectFullGame`. Balance also maps private internals. Review a test-only observation contract or explicit field stability before promising that map survives refactors. Fixtures/server truth must remain excluded from production/client exports. |
| BAL-REQ-5/BAL-C03 composite ruleset pin | Valid provenance hardening proposal. Keep overlay, historical manifest and combined manifest hashes separate now; version a future composite wire pin rather than silently replacing existing matches' hash. |
| BAL-REQ-6 locked historical files | Existing audit/matrix/brief stay frozen with current V1 documents alongside. A later reviewed pointer/lock update can improve navigation without changing historical evidence. |
| BAL-REQ-7/BAL-C01 shot availability | Current protocol-2 clarification above answers the older handoff concern. Require Balance's current re-review; preserve its current scenarios' resource/target interpretation. |
| BAL-REQ-7/BAL-C02 impossible cross-field views | Focused schema/projection hardening proposal. Passing current reachable-state invariants does not prove validators reject impossible combinations. Review intended invariants, phase exceptions, compatibility and version impact; no current connected projection defect was demonstrated. |
| BAL-C12 public Hack partner | Audience clarification request. Plain sight at a table does not itself authorize a public wire field. Current partner is private to the two participants; any public shape change needs approved disclosure and protocol review. |
| BAL-C15/C16/C17 fixture consumption, election label, provenance | Advisory fixture/copy/provenance follow-ups. Existing engine tests assert Protection consumption; the end-Round-1/start-Round-2 boundary label is distinct from D16 movement permission. No new canon follows from these requests. |

BAL-C06/D13 is already settled by V1-04: required positive-vote ties repeat; no-candidate and all-abstain cases defer as approved. A runoff cap/tie-break is a new rule proposal. BAL-C14/D29 is already settled by V1-10: one final private ballot per player per phase. Do not reopen either approval. Other D14/D21–D33/D36–D38 working readings require targeted source comparison if a change is proposed; their presence in Balance's register alone is not a blanket implementation defect or owner reapproval requirement. D10's powers-on details remain outside current powers-off V1 acceptance.

## Open edges without silent rule changes

The observations below describe the reviewed engine, not a new approval. Code evidence is pinned to [lifecycle.ts at Backend #28](https://github.com/Amirkianfar66/GameN/blob/5adaf98f8412e2294f45e00f8fb7c4c515127226/packages/engine/src/full-game/lifecycle.ts) and [full-game.ts](https://github.com/Amirkianfar66/GameN/blob/5adaf98f8412e2294f45e00f8fb7c4c515127226/packages/contracts/src/full-game.ts). Preserve current behavior while owner clarification is sought; any different behavior needs explicit rule/version review and targeted scenarios.

| ID | Classification and exact question | Current behavior/evidence to preserve |
| --- | --- | --- |
| D11, Supplier self-recipient | Owner clarification of a compatible current reading, not a verified defect. V1-16 requires two distinct same-location non-eliminated recipients; V1-13 names other self-target rules without settling Supplier. Does Supplier count as one recipient? | Allowed by `SUPPLY` legal targets (`lifecycle.ts` line 145). Do not add a self-exclusion without an explicit decision. |
| D12, fewer than two recipients | Linked owner clarification. Exact-two is already required; a one/zero-recipient fallback would be a new rule change. What happens when fewer than two eligible seats exist under the D11 answer? | Schema requires exactly two distinct IDs (`full-game.ts` line 15); no partial grant or out-of-room fabricated recipient. Current eligible set can include Supplier. |
| D16, movement in Captain election | Genuine boundary clarification: confirmed movement says once before voting begins, but does this include the election at the round boundary? | `beforeVoting` includes ordinary turn, Hack and Captain election (`lifecycle.ts` line 15); accepted movement follows this list at lines 169–172. Preserve until clarified. |
| D17, early ordinary/Hack/release-choice closure | Pacing/flow proposal and clarification. Ordinary/Hack have confirmed 60-second durations and V1-11 gives release choice 60 seconds. A new finish-early action/closure policy is not current canon. | Every live phase has a 60-second deadline (`lifecycle.ts` line 21; `full-game.ts` line 38); a choice does not advance the phase immediately. V1-09 already forbids early voting/showdown closure: do not reopen it or introduce host skips. |
| D18, Hack questions/refusal | Owner table-conduct guidance: who asks, how many Yes/No questions, and what refusal means. Existing truth/timing/embargo rules remain. | Arbitrary spoken truth cannot be automatically verified. Do not invent an engine command or new public/private disclosure to answer social conduct. |
| D19, eliminated table conduct | Owner table-conduct guidance, not a demonstrated engine defect. What can an eliminated player say/show? | Faction reveal does not authorize exact-role/Code or all-knowledge publication before the approved end disclosure. Do not automate additional revelation. |
| D20, advance turn-order visibility | Owner audience/visibility clarification. Architecture's display recommendation is not a rule authorizing the whole order. | Engine records order privately; current public view gives the active seat (`lifecycle.ts` lines 255–260). Publishing current or future-round orders requires approved disclosure and strict shape/version review. |
| D34, showdown self-target | Genuine owner clarification. V1-13 prohibits ordinary-shot self-targeting; the showdown source does not explicitly settle its special-shot case. | `SHOWDOWN_SHOT` excludes the shooter (`lifecycle.ts` line 150). Missing target already means no shot under V1-09; do not fabricate, redirect or enable a self-shot without a decision. |
| D35, disclosure after abort | Owner clarification of V1-12's no-winner Aborted state versus V1-18's “match end” reveal. Should the app disclose roles/Code after abort? | `endReveal` is present only for `FINISHED` (`lifecycle.ts` lines 251–260; `full-game.ts` line 65). Preserve the conservative audience boundary. Any new abort reveal needs rule/schema/version review; restricted research export is a separate access path. |
| D15, early unwinnable/nobody-left termination | New rule proposal, not a missing approved behavior. Should the existing five-round/showdown structure gain an early termination rule? | Preserve normal Round 5 effects, conditional showdown and existing victory/draw checks. No current source requires early unwinnable termination. Adoption needs a new explicit owner decision, immutable ruleset/version and cases defining cause/checkpoint. |

## Balance CI adoption plan after correction review

**No Balance implementation is adopted by this issue.** Balance #31 stays outside the [coherent connected landing candidate](connected-merge-candidate.md) until R1/R2 corrected commits and their negative regressions receive review. A future focused Integration PR must record the corrected Balance SHA, the actual committed candidate SHA and all three source hashes. Do not copy active uncommitted work or treat author-reported corrections as reviewed.

The future root/CI change must preserve all existing checks and require Balance work unconditionally. A missing workspace, test command, adapter, report or expected catalogue is a failure. No `if exists`, successful unavailable-engine mode or failed-baseline skip may turn the job green. CLI exit 0 alone is insufficient for these runners at the reviewed pin.

Proposed reproduction commands, executed from the clean, committed future combined candidate with Node `22.21.1` and npm `10.9.4`:

```sh
export PATH="/Users/amirkianfar/.nvm/versions/node/v22.21.1/bin:$PATH"
CANDIDATE_PATH="$PWD"
CANDIDATE_SHA="$(git rev-parse HEAD)"
BALANCE_EVIDENCE_PATH="$(mktemp -d /private/tmp/gamen-balance-ci.XXXXXX)"
npm ci
npm run verify
npm run check:browser-dependencies
npm run check --workspace @mothership/balance
npm run scenarios --workspace @mothership/balance -- --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --out "$BALANCE_EVIDENCE_PATH/scenarios.json"
npm run controls --workspace @mothership/balance -- --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --out "$BALANCE_EVIDENCE_PATH/controls.json"
npm run walk --workspace @mothership/balance -- --engine-root "$CANDIDATE_PATH" --engine-commit "$CANDIDATE_SHA" --seeds 10 --out "$BALANCE_EVIDENCE_PATH/playouts.json"
```

CI resolves its pinned runtime normally; the absolute PATH above identifies the existing local toolchain. These commands exist at the relevant pins, but they are a future plan, not checks run for this documentation change. A reviewed permanent report gate must enforce all of the following in addition to command exit status:

| Gate | Required assertions |
| --- | --- |
| Corrected validator/controls regressions | Incomplete non-template false/absent consent and invalid pseudonyms are rejected; valid template behavior is explicit. A required failing baseline gives nonzero status. Review both fixes before root adoption. |
| Static Balance check | Positive test count; zero failures, skips, todos or cancellations; materialization and traceability match the reviewed catalogue. This is not scenario execution. |
| Scenarios | Available engine with exact candidate commit/pins; every ready scenario executed; positive executed counts in modes 7/8/9; zero failed/invalid and zero unavailable/other not-run ready cases. Reports cover every catalogue ID exactly once. |
| Explicit blocked/manual exceptions | Compare IDs, status, decision IDs and reasons with a reviewed catalogue allowlist. At the current pin, each mode's blocked suffixes are `FLOW-07`, `FLOW-08`, `FLOW-09`, `MOVE-05`, `SUP-08`, `SUP-09`, `HACK-06`, `FLOW-10`, `WIN-07`, `SHOW-15`, `OPS-03`, `POW-01` (36 total). The only manual IDs are `V1-M{7,8,9}-HACK-07` (conduct instructions/observed playtest) and `V1-M{7,8,9}-OPS-02` (service recovery behavior), six total. Each remains explicitly blocked/not run, never passed. Changes to this allowlist require review; counts alone cannot conceal a newly missing case. |
| Controls | A report exists and covers modes 7/8/9; each mode has positive baseline and control counts, with every required ready/setup baseline accounted for against the reviewed catalogue and every generated control executed; `baselineNotPassing === 0`, `undetected === 0`, and `detected === controls`. Available-engine evidence is required. The current report's `scenarios` includes skipped baselines, so that number alone proves nothing. |
| Playouts | Exactly ten requested/executed/completed per mode; zero unfinished, invariant violations, hint mismatches and deterministic replay mismatches. This establishes invariant/replay evidence, not human balance. |
| Evidence/clean candidate | Reports identify the actual engine commit, source and fixture hashes; preserve logs and report pins with the integration handoff. Fail mismatched/unavailable pins and unexpected working-tree changes. |

The reviewed scenario catalogue had 473 cases: 431 passed, zero failed, 36 blocked and six manual not run. Those are historical review results, not promised counts after correction/adoption. Balance's 37 passing static tests and green bootstrap-only CI do not satisfy execution gates. The review independently reproduced 30 playouts; its larger author-reported 600 playouts/4,130 controls were not independently reproduced.

Run the actual Backend and Frontend emulator gates sequentially with Java 21, then verify the standalone Backend package:

```sh
npm run test:emulator
npm run test:frontend:emulator
npm run package:backend -- --verify-install
```

These gates keep their fixed ports; do not run emulator suites concurrently. Root verification, browser compatibility and production exclusion remain required alongside Balance. Shared contract/runtime changes additionally need affected Frontend/Balance review and current adapter compatibility evidence.

## Integration status and remaining acceptance

The coordination review actually ran the connected candidate's root verification: **558 passed** (25 bootstrap/contracts, 79 engine, 46 Backend, 11 tooling, 106 presentation, 291 game), with zero failures/skips/todos, plus typecheck/build/integrity/exclusion. Backend emulators passed **35/35** and Frontend emulators **4/4**. Its seven-player movement/recovery and nine-player Officer-registration headless browser journeys passed; round-end shot resolution was outside the latter journey. This document reruns none of them.

Those results do not establish checks on the new landing head. The actual coherent candidate and required CI must be refreshed at its final published SHA, including the browser probe, sequential emulator gates and package installation; record actual output rather than assuming the old counts still pass. PR #24's missing Frontend consumer remains a failing head; old green #26/#28/#29 does not approve #24. Issue #32's consolidated landing route must receive current checks and coordinating review.

Host document schema exports (#33), unattended local deadline runner (#34), and first-phone environment/identity/pairing (#35) are separate follow-ups. This triage (#36) changes none of them. Client catch-up with a present browser does not establish progression while all clients are closed or deployed Tasks/IAM delivery. A loopback headless browser is not a phone, local-network, accessibility or complete-game acceptance test.

No code, root CI, Frontend/Balance files or rule-source bytes are changed here. No emulator was started for this documentation task. Complete in-person V1, production services, human playtesting and social-deduction balance remain unaccepted; no cloud provisioning, deployment or merge is authorized by this reconciliation.
