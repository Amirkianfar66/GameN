# Designer stack: consumer review and adoption plan

**19 October 2026. Documentation only.** Requested by Integration's [all-agent review][all-agent] for [#155][issue]. No runtime port, gameplay, shared contract, source art, default, merge or deployment is approved by this review.

**Documentation base:** Frontend #156, `bacd9298d4fb34d8161aca218eb7968fb669f461`; branch `codex/frontend-design-stack-consumer-review`. **Executable source baseline:** `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`. Keep the [four-bed requirements](hospital-four-bed-successor-handoff-2026-10-18.md) and every existing match/receipt/Ready agreement intact.

## Reviewed delivery and inventory completeness

I read the complete pinned handoffs, including their exact-file blocks and unresolved/evidence tails: Hospital 264 lines, Captain 284, four-bed 235, Clone 244. These are reviewable source proposals; synthetic review pages are not connected consumer acceptance.

| PR | Published head inspected | Declared inventory source | Entries verified | Full published diff |
| --- | --- | --- | --- | --- |
| [#158 Hospital][pr158] | `7cf140aff60374a99b3ac83e2c67b7cf6916348e` | `e589e7a7a32a491fb417de582acc82dc94c9cf31` | 103 | 105 |
| [#159 Captain][pr159] | `7f3344ede87e8291c34601e649ca4ec91432b4db` | `17ff5ef07a0211f5d582ee1dab94ded14f4fd024` | 122 | 125 |
| [#160 four beds / overflow][pr160] | `a668c101c4716aa3f21ff52abaf5dc8925ef3c68` | `8f615f0565b0fc8de68b39cb4b8e26f9c6af8413` | 96 | 98 |
| [#161 private Clone][pr161] | `cb9386bd716dc346160509d5e49d7348fdaf4f84` | `243a4f78d7f3c207de6180de8a6e827514524a63` | 71 | 73 |

All **392/392** declared inventory entries match their declared source commits. `git diff` supplies **401 full published changed-path occurrences across the four PRs**, including nine documentation-tail occurrences missed by treating the declared source inventories as final-head listings. Seven inventoried files differ at their final heads, all Markdown documentation. Their exact old/new hashes and the nine tail paths are in the [audit](evidence/designer-stack-consumer-review-2026-10-19/inventory-audit.json). Full final-head lists: [#158](evidence/designer-stack-consumer-review-2026-10-19/pr158-full-published-head.sha256), [#159](evidence/designer-stack-consumer-review-2026-10-19/pr159-full-published-head.sha256), [#160](evidence/designer-stack-consumer-review-2026-10-19/pr160-full-published-head.sha256), [#161](evidence/designer-stack-consumer-review-2026-10-19/pr161-full-published-head.sha256). These are complete Git-tree lists, independent of GitHub's 100-file summary cap.

The latest [Designer index][designer-index] is version 6. Its statement that staging is engine 1.5/source `37f573a`, and handoff references to “draft 1.7/1.8/1.10”, are dated source context. They do not supersede the executable 1.10 baseline or prove adoption of these new films. The later stack's Hospital document corrects the original open four-bed request; the confirmed cap/incoming-overflow decision is settled.

**Preserve separate setup art #116.** Its head is `27be8749b51775fee3a0d81b62a3cdabedafe1be`, base `8f1f356f2208ff49bcaef3f501f9778da19ccab0`; all 84 entries in its [separate inventory][setup-inventory] were verified. Its [section 20 handoff][setup-handoff] remains a separate `abilities-0.8.0` proposal. The new Clone mark does not adopt, replace or discard setup selection stamps, the common role-card back, explicit Reveal/Hide or Ready treatment. Do not merge the setup prototype controller or reset existing setup timing/recovery.

## Exact drawing candidates, with adoption held

All paths in this table are under `design/board-v2/`, at the combined source head **`cb9386bd716dc346160509d5e49d7348fdaf4f84`**. The 14 direct modules' bytes match their respective pinned handoffs. Hashes identify source candidates, not approved production ports.

| Family | Exact module | SHA-256 |
| --- | --- | --- |
| Medical | `fx/medical.mjs` | `3f596f1537d0b58d820359993bfbd01ff58194b1e8b7c08435aebbaa306e7af8` |
| Medical | `films/medical.mjs` | `fef1b67902b18c3ba7a5ab81207538dfaa34ba8bc4bc7e4e81b89fd2b32c3baa` |
| Captain | `fx/captain.mjs` | `ad2853bf1e913cb4da5dafe2ddb728a477b686e02d5115d8d2a812ca5c871d88` |
| Captain | `films/captain.mjs` | `70f871155418e27c2e592cc410d690c642e7986a4179d569e79610611691e1c9` |
| Captain | `figures/captain.mjs` | `64435ec8d0893f5c34865d165f4d80294667c878df99d6ac41e607b76267824a` |
| Four-bed | `scenes/hospital-ward-four.mjs` | `005311acdcefc0b33e42212621feae2a88a1b24ede432e2ab1d5fb60574f8157` |
| Four-bed | `scenes/slots-four.mjs` | `268d53c7a807df9f465b9c632ec6f962f94551cdeabcfa06475af21fff1df085` |
| Four-bed | `js/fit-four.mjs` | `9091cee28f6265675ea33f2d59e3598773ba714a8240997140b5c35a44c1c1ca` |
| Four-bed | `js/turns-four.mjs` | `a1099fee5c44ddbc147d6f8b58ec38ba3d7e1e022e31bfc02a0b62dff1ef1e6e` |
| Four-bed; fallback blocked | `fx/medical-four.mjs` | `c289a932a955a28ef9a1be4635bfb1632badc77b42c06e9c062fc42970fd166b` |
| Four-bed | `fx/overflow.mjs` | `916d17bb81dcadb18a71f2e4ac044853c7067522ba02c91df9a22c3f4a413a8f` |
| Four-bed | `films/overflow.mjs` | `074df18a98baeb57fbead94f3be22d544530dc1950518b1e2be0264cc3f67428` |
| Private Clone | `fx/clone.mjs` | `c565f4301350c049534c8902b5780767522b1b3a7d8b330383462f4331460b7a` |
| Private Clone | `films/clone.mjs` | `34836d024ad992cde20e84dcaea3584b9c0c247ef7c5c5a2435c8df698187da0` |

The [candidate hash list](evidence/designer-stack-consumer-review-2026-10-19/candidate-drawing-and-art.sha256) names every one of those modules plus **100 new SVGs**, each with its full SHA-256: 28 medical, 43 Captain, eight four-bed ward/light layers and 21 Clone. Source generated descriptors are separately hashed in the audit: `assets/manifest.json`, `contract/slots.json`, `contract/slots-four.json`, `contract/films.json`. At the combined source head there are 144 SVGs plus those four JSON outputs, 148 generated outputs in total; only 100 SVGs are new candidates in this review.

The [34-module dependency closure](evidence/designer-stack-consumer-review-2026-10-19/module-closure.json) contains those 14 roots and 20 existing source dependencies unchanged from #144 head `95d70f0c885f6b7d619c4ebff935093dfe891ea6`. It has no controller, fixture, tool or external import. Reuse the reviewed rig/kit/ward/label/blocked dependencies through their existing ports. `js/fit-four.mjs` and `js/turns-four.mjs` are the two pure layout candidates despite their directory name: preserve the existing panel bands and controls sheet. Resolve source-to-port imports and record derivative output hashes in the later permitted port; source hashes alone do not certify an adapted file.

Do not port `js/page.js`, `*-view.mjs`, `*-fixtures.mjs`, `js/layout.mjs`, prototype styles, capture/check scripts or query-driven clocks. Do not remove their development fences or copy the fixture's admission/anchor/return logic. The source manifest `board-v2-0.8.0` and layout proposal `board-v2-four-0.1.0` are not runtime release IDs or allocated Ready agreements.

## Concrete corrections and contract conflicts

### C1 — RELEASE confirmation: exact next permitted wording change

At the executable baseline, [connected-player.ts:145][release-copy] asks **`Release everyone detained in Jail or Hospital?`**. [captain.ts:96–100][captain] releases living detained prisoners physically in Jail; a Hospital detainee remains detained in its berth. Integration separately verified the wrong literal in the live hash-matching bundle ([report][all-agent]); this review independently confirms the source mismatch.

Record this exact replacement for the next permitted runtime copy patch: **`Release all living prisoners currently in Jail?`**. Preserve the command ID, offers, request/recovery path and server rules. Keep EJECT's existing **`Eject everyone currently in Jail?`**: its full affected set includes bodies. Do not fix the RELEASE prompt by broadening the server's command or narrowing EJECT's event. No runtime string changes are made here.

### C2 — #160 valid-anchor / no-film fallback is missing

[Hospital-four section 7][four-handoff] promises words-only feedback for a fifth distinct clinical anchor. [fourClinicalBerth / fourFilmBerth][four-helper] instead throw before returning a drawing decision. Isolated Node `v22.21.1` source probes reproduced `HV5 names no bed of a four-berth ward` from both helpers. HV1 unoccupied returns `plays:true`; HV1 held by another normalized seat returns `plays:false`. The malformed `BAD` anchor also throws. Exact observed results and source hash are in the audit. These are pure geometry observations, not successor schema or browser acceptance.

Required coordination with Backend/Designer, consistent with [Integration's reported conflict][fallback-review] and the [Backend reconciliation][backend-reconciliation]:

1. First validate the event, exact tuple, audience, occurrence/revision/expiry and anchor under the approved wire contract. A historical `HV5`/`slotCount:9` shape does not allocate a successor anchor namespace.
2. Then distinguish a valid physical-bed mapping from a valid presentation anchor that this geometry cannot draw. The latter needs an explicit no-film path before the strict bed-only primitive, or a reviewed no-film representation. Preserve the authorized narration and current snapshot. Do not invent H5, silently reuse an anchor, hide an emitted DEATH or blanket-catch validation failures.
3. H4-ORDER-01 precedes the anchor-bound proof. Healed-first replacement can need the union of four starting reservations plus a new subject, even with four final beds. Proposal A excludes overflow medical facts/HV allocation; it does not bound other admitted medical subjects to four. Alternative B keeps DEATH's mandatory anchor. Both remain unadopted.
4. Designer supplies revised source/API documentation and exact hashes; Backend/Integration specifies legal anchors/event facts; Frontend reviews the safe no-film behavior. The current `medical-four.mjs` remains blocked for direct adoption.

### C3 — caller identity normalization is mandatory

Both medical berth selectors expect `{seat, slotId}` and a subject in that same identity space; wire snapshots have `seatId`. The [Backend answer][backend-reconciliation] requires explicit normalization, including retained bodies. Source probes confirm that passing a raw `seatId` body at H1 incorrectly produces `plays:true`, while mapping it to `seat:'seat-2'` produces `plays:false` for another subject. This is an adapter requirement, not a new wire field. Keep stable original seat IDs; never use display indexes or re-number the roster. Test it for both roster-sized and four-bed helpers before a port.

## Old/new tuple, art, geometry and Ready mapping

| Path | Gameplay pins | Art / layout / Ready agreement |
| --- | --- | --- |
| Existing matches and prepared deals | Protocol 2, engine `full-game-1.10.0`, ruleset `in-person-v1-clone-2026-10-14`, hash `6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234` | Keep `design-0.4.0`, `board-v2-0.1.1`, roster-sized Hospital and the exact saved `FullVersions` agreement. No in-place repin or migration. |
| Possible presentation-only delivery of medical/Captain/Clone films | May retain exact 1.10 gameplay only if Integration separately accepts that compatibility | Allocate a fresh reviewed art/client pairing; retain roster geometry. Do not republish `design-0.4.0` bytes or upgrade old prepared/Ready agreements. This is a planning option, not permission to port now. |
| Four-bed successor / overflow | New exact gameplay tuple/hash; engine/protocol/version decision unallocated. `full-game-1.11.0` is only Backend's proposal | Allocate art, strict readers and layout together. `board-v2-four-0.1.0` is only Designer's candidate. Keep starting roster 7/8/9 and four physical Hospital positions; no `playerCount=4`. |
| Separate #116 setup treatment | Preserve `staged-start-1` timing and each deal's exact pins | Independent source proposal; common back/assets on every phone, explicit own reveal, exact Ready acknowledgment. No implicit adoption through the Clone tray mark. |

[Ready][ready] acknowledges exact prepared gameplay/art versions, not a separately supplied layout ID. The new layout must be unambiguously bound through an approved tuple/art mapping or a reviewed extension. [Prepared-art selection][prepared-art] and the hosted [Ready compatibility gate][ready-client] must agree. A generic `board-v2-0.8.0` source manifest is not a production art pin.

The [private Blackout reader][blackout-reader] currently compares its exact slot array to the roster-sized helper, and public layout/model/host select the old revision and ward by starting roster. Update those paths together only under the future successor; do not globally shrink legacy helpers or schemas. Frozen `snapshotId + room + slotId` keeps its original target if a bed is freed/reused; no strike may silently redirect to a replacement patient. Old H5–H9 remain valid for their own historical tuples.

## Consumer behavior to preserve in a permitted port

- **Medical S9/S5/S10:** persistent critical state follows public `health`, `jailed` and authoritative medical opportunity/round, including reconnect. Entry uses actual admitted H slot; HEALED/DEATH imagery uses the permitted clinical anchor and normalized holder check. Never infer admission, due death, rescue or its author from a timer, picture or receipt. Preserve the gown/detention tag and latest board actor exactly once.
- **Captain S6/S7/S8:** RELEASE's event lists living physical-Jail prisoners; EJECT lists every physical-Jail occupant, including bodies. Its pending faction-reveal list is a different set. Hospital patients stay in place. Hold a real before-snapshot for origin imagery; if absent, do not invent a Jail origin. S8 reads own `captainCommandUses` and current offers, with local in-flight state; a pending/rejected/unknown command does not play a film or mark an allowance used. A new Captain inherits the actual used flags.
- **Offboard Code:** derive choices from the complete original roster and server-authorized action availability. Retain the canonical seat/choice IDs in cards and four-seat selection/confirmation. Include original offboard identities, whatever their removal cause; no faction/cause inferred from a grey cut-out. Plaque count comes from current null-placement seats, not animated increments. The claim tab and offboard tab must coexist without hiding Code/Back/Confirm/recovery/Pass. Show a roster-order identity list rather than inventing chronological history; an ordered history would need authoritative evidence.
- **Private Clone S3:** own revealed/current/focused private area only. Draw no public actor marker, CSS hook, sound or private status in other seats/display/host. Common assets load uniformly. A live unused→active view can play activation once; normal active→ended can play expiry once. Baseline/reconnect/reopen/resume is state at rest, with no backlog owed. Blur, concealment, page hide, stale binding or newer incompatible view removes private DOM and cancels RAF; preserve sent-command IDs and receipt lookup. Unsent picks follow existing concealment/reset policy.
- **Clone phase qualification:** Backend [confirms][backend-reconciliation] normal expiry after the covered resolution and same-view elimination cleanup. If still active at FINISHED/ABORTED, terminal cleanup clears it in that view; prior normal expiry/elimination may already have cleared it. Suppress expiry art for elimination or the terminal-caused view; unused stays unused. SHOWDOWN is live gameplay, not `matchEnded`: normal R5 expiry precedes it. Current shared data is sufficient; receipt replay or a local expiry timer cannot trigger S3.
- **Narration and optional drawing:** retain the released once-per-occurrence authoritative words on receipt as the proposed consumer policy. Film `announce` beats must not repeat, delay indefinitely or suppress those words. A valid no-film result, held berth, absent origin or canceled decoration retains narration. Simultaneous subjects require collision-safe composition and stable per-subject chronology; if that composition is not reviewed, use narration/current state rather than overlapping unsafe imagery. Never order public effects using hidden actor/command order.
- **Overflow and concurrency:** only a reviewed server occurrence may authorize FULL/cause-specific art. Null placement alone establishes removal, not its cause. Proposal A emits no overflow clinical film; B needs its legal anchor. Multiple victims use final authoritative plaque count, not one local increment per flyer, and no synthetic fifth bed. Both single/multiple overflow compositions remain unaccepted.
- **Lifecycle and input:** draw only after a matching committed view is available, never rewind a newer snapshot. Cancellation restores latest world/capsule actors, ghosts, tags and hit targets. Blackout owns its window. All films are nonblocking; inputs/deadlines never wait for a film. Respect reduced motion switched mid-film and cancel without replay when switched off. Tear down listeners/RAF on disposal/pagehide and preserve receipt recovery through reload.

## Required consumer acceptance — all not run

Run affected gameplay/placement/Code cases separately for starting rosters 7, 8 and 9, and old versus successor art/tuple variants. Label typed constructed fixtures, native-service/emulator records, hosted observations, physical phones and assistive-technology evidence separately. A committed synthetic capture does not pass these cases.

| ID | Trigger / scenario | Required consumer result and evidence |
| --- | --- | --- |
| LC-01 | Blur while `visibilityState` is still visible; private area Hide/close | Clone card/private DOM/marks disappear immediately; no public pixels/network/ARIA leak; sent/unknown command identity and recovery survive. Reopen shows state at rest. |
| LC-02 | Hidden→visible, pagehide/bfcache and disposal | Settle/cancel drawings and timers/listeners as appropriate; never replay old private/public films or duplicate listeners; keep current auth/seat/request recovery. |
| LC-03 | Initial/cached/reconnect/late-join, expired event, duplicate, wrong audience/tuple/binding | Current snapshot renders correct placement/status; invalid/old events never animate or narrate anew. Stale/out-of-order views cannot restore removed actors/private state. |
| LC-04 | Newer snapshot moves subject or reuses its bed/Jail place; event arrives before its committed view | Wait for authoritative view; cancel incompatible origins/poses, retain current targets; no rewind, ghost or effect on another occupant. Unrelated newer data never restarts a film. |
| LC-05 | Blackout starts during each public film; reduced motion toggled both ways mid-film | Blackout privacy/targets take priority; motion settles immediately and switching back does not replay. Effects never change phase/deadline/accepted actions. |
| MED-01 | Multiple injury/heal/death subjects, including INJURY→HEALED and INJURY→DEATH in one batch | Stable approved anchors/chronology, at most one subject drawing, collision-free insets, each authorized narration once; never fabricate a final medical episode. |
| MED-02 | Reused anchor held by patient or retained body; raw `seatId` input mapped explicitly | Holder blocks imagery in both helpers; no covered active target/body, no missing narration. Prove canonical subject/holder identity normalization. |
| H4-01 | Four starting reservations, healed departure and new admission; valid extra presentation anchor versus malformed anchor | Reviewed valid/no-film branch retains narration/current snapshot; invalid wire still fails closed. No H5, anchor reuse, swallowed fact or blanket exception catch. |
| H4-02 | Fourth/fifth admission, full ward, queued Rescue, retained bodies, competing arrivals | Backend/Balance's reconciled order chooses survivor/overflow; client allocates none. Incoming overflow is permanently offboard/no later Rescue; old matches keep their own capacities. |
| H4-03 | Two overflow victims with concurrent medical outcomes and/or EJECT | Correct authorized fact set and stable presentation order; plaque equals final snapshot, no fake bed/double count/cause leak, correct new metadata/dispatch. A/B expectations are fixed only after contract adoption. |
| CAP-01 | RELEASE and EJECT independently: living Jail prisoners, Jail body, detained Hospital patient | Exact corrected RELEASE prompt; RELEASE excludes body/Hospital, EJECT clears all physical-Jail subjects including body; Hospital unchanged; no extra medical death inferred. |
| CAP-02 | Rapid attempts of both commands in either order, lost acknowledgment, repeat command ID, Captain handoff | After first command consume only its actual allowance and re-read current offers. Both require a living physical-Jail prisoner, so do not force two successes from synthetic fixtures. Preserve once-only semantics/receipts and no film for unknown/rejected requests. |
| CAP-03 | Missing held-before snapshot, changed return destination, later Jail occupant | No invented Jail origin, actual released destination/clothes, cancel stale cut-outs/console motion; no covered current target. |
| CODE-01 | Offboard targets from EJECT and overflow; four distinct original IDs; claim + offboard tabs | Exact current legal choices and canonical IDs/confirmation, no roster shrink/reindex; unsubmitted private picks reset per policy, accepted choices/receipt IDs persist. |
| CLN-01 | Own activation, normal expiry, Jail, R5→SHOWDOWN, FINISHED/ABORTED, earlier elimination/expiry | Correct qualified state/trigger, no film from receipt or countdown; same-view removal on elimination; terminal result takes screen; no false terminal interpretation of SHOWDOWN. |
| CLN-02 | Non-Alien player, display, host and owner with private area closed; common asset requests | No Clone/private marker/DOM/ARIA/network distinction outside permitted own area; compare public rendering and request behavior independently of synthetic screenshots. |
| GEO-01 | 320×568 / 390×844 and shell boundaries, safe areas, 200% text, up to eight offered offboard cards | Measure centers/corners with real pointer hit tests and keyboard focus, ≥44 px targets, usable claim/Code/recovery/Pass; no invisible controls under the sheet, no film steals input. Screen-reader and physical-phone evidence remain separate. |
| VER-01 | Fresh new prepared deal, unsupported/mismatched tuple/art/layout/Ready, existing prepared/Ready/1.10 match | Exact mapping accepted/refused; old saved agreements and H5–H9 still load under their pins; new four-slot private reader and dark inventory agree. No defaults or migrations changed incidentally. |

## Next permitted implementation sequence and current evidence

1. **Coordinate first:** Integration/Backend/independent Balance reconcile H4-ORDER-01 and allocate event/audience/private offboard provenance, valid-anchor/no-film meaning and exact tuple/art/Ready mapping. Designer resolves C2 with a reviewed source revision/hash. Four beds/incoming elimination are not reopened; no repeated owner question.
2. **Prepare focused ports only when authorized:** stage the 14 named candidates by family and their common SVGs with source/derivative provenance; retain historical geometry and separate #116. The RELEASE copy correction is a small explicit companion change at the next permitted runtime step, never a rules change. No runtime branch or code is created by this plan.
3. **Prove consumption:** execute the matrix above with exact contracts and independent expected outcomes. Start with source/unit boundaries, then real connected services and measured browser lifecycle/input/privacy; report device gaps. Synthetic art captures and source probes do not establish those results.
4. **Integration gate:** review actual diffs, tests and immutable mapping before any later adoption, merge or deployment. Completing this documentation does not grant that authorization.

Actual evidence in this review: complete handoffs; 392 inventory hashes, 401 complete final changed-path occurrences/tails, separate 84-entry setup inventory; 14-module/100-SVG candidate list and 34-module closure (20 unchanged source dependencies); isolated Node geometry/identity probes; baseline RELEASE/Captain/Clone/reader/Ready source inspection; Backend reconciliation at `8e423a7d19b2df64e351b738ab37dae1e1ead854`. The committed audit records all pins and probe outputs.

Integration's [all-agent report][all-agent] separately records 48 focused tests, 15 board checks, 148 generated outputs, representative images and prior #156/#157 CI results. I did not rerun those suites or Chromium. This review's new consumer/native-service/emulator/browser/device/Balance acceptance remains **not run**. Whitespace, exact source/local links and documentation-only path checks accompany this change; no runtime, shared contract, source art, profile/default or cloud state changes.

[all-agent]: https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6255701337
[issue]: https://github.com/Amirkianfar66/GameN/issues/155
[pr158]: https://github.com/Amirkianfar66/GameN/blob/7cf140aff60374a99b3ac83e2c67b7cf6916348e/docs/design/hospital-films.md
[pr159]: https://github.com/Amirkianfar66/GameN/blob/7f3344ede87e8291c34601e649ca4ec91432b4db/docs/design/captain-films.md
[pr160]: https://github.com/Amirkianfar66/GameN/blob/a668c101c4716aa3f21ff52abaf5dc8925ef3c68/docs/design/hospital-four.md
[pr161]: https://github.com/Amirkianfar66/GameN/blob/cb9386bd716dc346160509d5e49d7348fdaf4f84/docs/design/clone-s3.md
[designer-index]: https://github.com/Amirkianfar66/GameN/blob/cb9386bd716dc346160509d5e49d7348fdaf4f84/docs/design/deliverables.md
[setup-inventory]: https://github.com/Amirkianfar66/GameN/blob/cb9386bd716dc346160509d5e49d7348fdaf4f84/docs/design/deliverables/pr116-setup-art.sha256
[setup-handoff]: https://github.com/Amirkianfar66/GameN/blob/27be8749b51775fee3a0d81b62a3cdabedafe1be/docs/design/abilities-handoff.md
[release-copy]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/presentation/src/model/connected-player.ts#L142-L146
[captain]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/engine/src/full-game/captain.ts#L79-L109
[four-handoff]: https://github.com/Amirkianfar66/GameN/blob/a668c101c4716aa3f21ff52abaf5dc8925ef3c68/docs/design/hospital-four.md#L113-L116
[four-helper]: https://github.com/Amirkianfar66/GameN/blob/a668c101c4716aa3f21ff52abaf5dc8925ef3c68/design/board-v2/fx/medical-four.mjs#L59-L80
[fallback-review]: https://github.com/Amirkianfar66/GameN/pull/160#issuecomment-6255700374
[backend-reconciliation]: https://github.com/Amirkianfar66/GameN/blob/8e423a7d19b2df64e351b738ab37dae1e1ead854/docs/backend/designer-contract-reconciliation-2026-10-19.md
[ready]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/services/game-api/src/full-game.ts#L714-L719
[prepared-art]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/services/game-api/src/prepared-art.ts
[ready-client]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/hosted/ready-compatibility.mjs
[blackout-reader]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/full-game.ts#L167-L176
