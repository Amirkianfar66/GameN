# Four-bed Hospital — successor specification and contract plan

Status: **owner-approved gameplay; specification proposal only; not implemented or deployed**. Tracks [issue #155](https://github.com/Amirkianfar66/GameN/issues/155), decision `HOSPITAL-4-2026-10-18`.

The [19 October Designer / Backend source reconciliation](designer-contract-reconciliation-2026-10-19.md) answers S3, clarifies clinical occupancy and full EJECT seat lists, and records the unadopted #160 HV5 fallback mismatch plus independent Balance follow-up. It does not settle H4-ORDER-01 or adopt a successor event/anchor contract.

Actual clean starting commit and source baseline: `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`, branch `codex/backend-hospital-four-plan`, isolated managed worktree `backend-hospital-four-plan`. The primary checkout remains on its original branch with its pre-existing image and reviews preserved. Existing Backend worktrees and completed changes are untouched.

The exact Integration record is copied without modification to [the owner evidence](evidence/hospital-four-owner-decision-2026-10-18.json), SHA-256 `e8200252806d5e468805b6e00cc9ea85eb37651d72522293b533ee31f3d27c5d`. Integration recorded the owner's explicit clarification: **“Yes—eliminate the incoming player.”** This new decision overrides the earlier roster-sized/no-overflow Hospital direction only for a future successor. It does not authorize blanket removal of every existing body, erase identities/history or change the released match tuple.

## Version and delivery boundary

Released historical agreement remains protocol `2`, engine `full-game-1.10.0`, ruleset `in-person-v1-clone-2026-10-14`, ruleset SHA-256 `6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234`, art `design-0.4.0`, logical layout `board-v2-0.1.1`. Old matches, prepared deals, accepted Ready agreements, receipts and replay retain their exact tuples and geometry, including historical `H5` through `H9` where applicable.

`full-game-1.11.0` is **proposed and unallocated**, not an accepted engine version or reserved release. Integration will review and allocate the successor engine/ruleset/hash/layout/art/Ready agreement together. No new executable overlay, capability, schema field, default, release selector, asset or deployment is introduced by this plan. Keep protocol 2 only if the reviewed exact-tuple/Ready extension remains sufficient; this document does not independently approve a wire/version allocation.

Do not change the old capacity helper or slot inventory globally. Existing `slotIdsFor(location, playerCount)` and `blackoutSlotIds(room, playerCount)` have no version argument; a future implementation must add a reviewed version-aware path without altering their historical behavior. A new four-bed geometry must not silently reuse the old logical layout identity or fake `playerCount=4`.

## Confirmed change and inherited semantics

| Area | Newly approved decision or inherited rule |
| --- | --- |
| Hospital size | **New:** exactly four physical beds in every 7-, 8- and 9-player successor match; logical positions `H1`–`H4` proposed. A/B/Jail remain five; Command remains one Healthy free Captain; no physical Final Zone is reintroduced. |
| Full Hospital | **New:** an incoming Healthy player whose unblocked damage would make them Injured and enter an already full Hospital is permanently Eliminated and off-board. They consume no fifth bed and cannot later be Rescued. No overflow waitlist, ordinary-room holding, displacement of an existing occupant or resurrection is introduced. |
| Occupancy | **Inherited:** count every physical Hospital occupant, including retained Eliminated bodies and detained patients. A second hit or automatic death of an existing patient leaves its body occupying its bed. The new clarification does not remove those bodies. |
| Attack ordering | **Inherited:** stored round actor order, each actor's Main Action then Shot. Collect valid Blackout targets before applying any attacks; requests/selection/network arrival and victim seat number do not establish damage priority. |
| Admission checkpoint | **Baseline fact; successor review pending:** 1.10 immediately transfers on unblocked damage but has a roster-sized ward. Applying that checkpoint to a four-bed admission decision is the proposal below, conditional on H4-ORDER-01; unlimited historical admission does not prove future last-bed priority. |
| Rescue and deaths | **Inherited effect order:** attacks, Rescue, R3 Supply, due medical deaths, final placement. Rescue never revives an already Eliminated player. Whether healed space precedes the new capacity decision is H4-ORDER-01; later-Rescue overflow examples below are conditional on the proposed immediate-admission model. |
| Slot sealing/returns | **Inherited:** unchanged occupants and holes persist; final missing slots/competing returns use ascending player number and lowest free logical positions. On 1.10 this seals positions after immediate logical admission. Successor admission priority requires H4-ORDER-01 review. |
| Registered actions | **Inherited:** later actor injury, Jail or elimination never cancels an already registered targeted action. Overflow must not delete accepted queues, targets, spent uses, receipts or journal records. |
| End conditions | **Inherited:** resolve the entire normal batch or showdown before victory; no win check at each overflow victim. Keep separate EJECT-stage evidence, faction disclosure, health/power formulas and all terminal exceptions. |

Source precedence: latest explicit owner decisions in their stated scope, then confirmed overlays, then unsuperseded source rules. The 2026-10-13 closed packet and executable baseline establish the released 1.10 stage order. The successor ordering described here is an inheritance proposal for affected-role review, not authority to change either historical tuple.

### Owner reaffirmation of issue #96 ordering

On 18 October 2026 a direct human reply arrived in the Backend chat to the earlier asynchronous question explicitly scoped to issue #96. Exact question:

> Issue #96 leaves one ordering question: when several Injured players compete for the last Hospital place at the same end-of-round, which rule should apply? I’ll record this as unresolved until you decide; other capacity work can continue.

Exact owner answer: **“Free healed Hospital places first, then use existing seat order”**.

Provenance: Backend chat `01a11169-fbe6-7ad0-943c-27571afc7d70`; tool call `call_aa4dac80a0a8494882e1e5d35336cb8f`; question item identifier `["request_user_input_async","call_aa4dac80a0a8494882e1e5d35336cb8f",0]`; trusted incoming message envelope `send_user_message_question_reply`. The envelope provides the question item identifier but no separate human-message ID. This direct reply is owner evidence, not a helper inference or a new statement by Integration.

This exactly matches [the recorded CAP-ORDER-01 decision](../decisions/2026-10-11-room-capacity.md) and [its confirmed overlay](../../rules/overlays/room-capacity-owner-decision-2026-10-11.json). The historical capacity behavior frees healed places before competing Injured entrants are admitted in stored seat-array order, rather than randomized actor order. Existing [engine cases](../../packages/engine/test/full-room-capacity.test.mjs):308–347 and [service cases](../../services/game-api/test-emulator/room-capacity.test.mjs):386 onward exercise 7/8/9-player ordering. They are source evidence inspected here, not fresh test executions.

The later owner packet changes the logical injury checkpoint, introduced by exact 1.7 and inherited by 1.10: it occurs during attacks, before Rescue, while final slot reconciliation and returns remain numeric. This is distinct from 1.2 healed-first/stored-seat placement and 1.3's staged numeric refinement, not a new Clone ordering rule. The new answer is expressly to #96; it does not expressly address the interaction between that newer checkpoint and #155 overflow. Integration and independent Balance must acknowledge this version boundary and review admission-priority inheritance with the complete successor contract (H4-ORDER-01). Preserve the exact answer and old tests; do not silently reinterpret it as a new #155 ordering instruction, discard it because code differs, or mutate released replay semantics.

The following minimal constructed comparisons isolate that interaction; they are **not executed or native reachability claims**. Both successor interpretations below assume the approved four beds and permanent removal when admission finds all four occupied. They differ in the admission checkpoint/priority being reviewed, not in the settled cap or overflow consequence. Assume single unblocked hits, no due deaths or other effects, and an otherwise continuing match.

| Constructed last-bed history | Applying 1.10 immediate logical admission to the successor | Applying healed-space-first / seat-order admission to the successor |
| --- | --- | --- |
| Three existing patients P2/P4/P7; stored actor order applies a hit to Healthy P6 before a hit to Healthy P1; no Rescue | P6 takes bed four and survives Injured. P1 is permanently removed. | P1, the lower victim seat, takes bed four and survives Injured. P6 is permanently removed. |
| Four existing patients P2/P3/P4/P7; hit on Healthy P1; registered Rescue heals P7 later in the batch | P1 is permanently removed during attacks. P7 survives Healthy and returns; three Hospital occupants remain. | P7 survives Healthy and vacates before admission. P1 survives Injured in the freed fourth bed. |

The historical #96 tuple itself keeps its approved five-bed limit and waiting rule, not the new permanent-removal consequence. Neither comparison is permission to retrofit four-bed behavior into that tuple or change 1.10. The complete Integration review must reconcile the exact owner answer, later injury checkpoint and #155 overflow timing before implementation; current code alone cannot settle the successor. Do not ask the owner to repeat the answer already supplied.

### Exact baseline evidence

All links below refer to files unchanged from the pinned `6ca4b51` baseline in this documentation branch. Historical test pins are identified rather than presented as new-successor acceptance.

| Existing behavior | Source and existing tests inspected |
| --- | --- |
| Immediate logical admission; second hit retains a body; Rescue cannot revive Eliminated | [medical.ts](../../packages/engine/src/full-game/medical.ts):36–58. [Historical 1.7 medical tests](../../packages/engine/test/full-board-medical.test.mjs):178,196,235,252; [Auth/Firestore medical tests](../../services/game-api/test-emulator/board-medical.test.mjs):243–298. |
| Actor Main→Shot, then Rescue/Supply/due deaths/placement; entire-stage victory | [lifecycle.ts](../../packages/engine/src/full-game/lifecycle.ts):134–199; [closed ordering contract](../specifications/owner-motion-2026-10-13/rules-contracts.md):35–44. [1.9 Blackout cases](../../packages/engine/test/full-blackout.test.mjs):341–374 exercise both strikes, later elimination and retained targets. The same stage implementation is inherited by exact 1.10. |
| Bodies consume positions, missing entrants use player number, holes persist | [slots.ts](../../packages/engine/src/full-game/slots.ts):25–44,72–94; [medical.ts](../../packages/engine/src/full-game/medical.ts):61–102. [Historical slot tests](../../packages/engine/test/full-board-slots.test.mjs):85,122,141; [medical test](../../packages/engine/test/full-board-medical.test.mjs):674 explicitly distinguishes reversed shot order from numeric final assignment. |
| Actual-room showdown and eliminated-shooter effects | [lifecycle.ts](../../packages/engine/src/full-game/lifecycle.ts):140–149,183–194. [Historical medical tests](../../packages/engine/test/full-board-medical.test.mjs):369,398 and exact [1.10 Clone histories](../../packages/engine/test/full-clone.test.mjs) cover terminal expiry/Protection/showdown independently of any new overflow. |
| EJECT-specific null placement/provenance and Hospital exclusion | [captain.ts](../../packages/engine/src/full-game/captain.ts):38–41,100–128; [Captain tests](../../packages/engine/test/full-captain.test.mjs):147,248,332. Their EJECT-used invariant must stay exact for historical tuples. |
| Four original Code identities and complete original roster survive off-board removal | [roster.ts](../../packages/engine/src/full-game/roster.ts):69–73, [lifecycle.ts](../../packages/engine/src/full-game/lifecycle.ts):304–306, [view references](../../packages/contracts/src/full-game.ts):138–143. [Captain Code history](../../packages/engine/test/full-captain.test.mjs):224 and [Clone service histories](../../services/game-api/test-emulator/clone.test.mjs) are existing evidence, not Hospital4 runs. |

## Proposed successor transitions under the existing 1.10 stage order

At each registered attack: keep the existing dead-target no-op, applicable Clone/Protection handling and registration-time targeting rules. A blocked attack creates no injury/admission/overflow and consumes defenses only under their existing rules. Special showdown shots continue bypassing Clone and applying eligible Protection; Hospital overflow is a consequence of an otherwise unblocked injury, not a new ability to bypass defenses on an incoming Healthy player.

For an already Injured Hospital patient, further damage still eliminates them in that existing bed. Due death still happens after Rescue/Supply and retains the existing body/slot. Neither event makes a place available. Do not run the new incoming-overflow test against a player already in their own Hospital bed.

The following transition is conditional on Integration adopting the immediate-admission model after H4-ORDER-01 review. For a new injury candidate, inspect logical physical Hospital occupancy at that effect step:

1. Fewer than four: create the ordinary injury episode and immediate logical admission, invalidate the actual departure slot, and include the patient in subsequent same-batch occupancy. Final sealing assigns a valid missing bed without shifting established occupants.
2. Four: commit permanent elimination and removal instead of an admitted patient. Proposed public terminal snapshot shape is `health:'Eliminated', location:null, slotId:null, medical:null, jailed:false, captain:false`; the authoritative state uses `medicalEpisode:null`, not a new private `medical` field; retain original identity, last actual room, prior medical history and all accepted resource/action history. No active Hospital episode or Rescue opportunity remains. The private representation of the failed admission/episode counter is an implementation review item; it must not imply a successful admission or create a later revival path.

Clear an overflow victim's current Captain office, active Clone and current detention consistently with permanent off-board elimination. Do not consume Captain RELEASE/EJECT allowances or alter unrelated bodies' detention/history. Any remembered protection record remains historical; it cannot revive an Eliminated victim. Medical detainees that actually enter a free bed still retain detention, return to Jail on healing, and remain outside physical-Jail RELEASE/EJECT scope. Physical Jail plus living detained Hospital return obligations retains its existing maximum of five; an off-board overflow victim has no return obligation.

Under the proposed immediate-admission model, with three existing Hospital occupants and two new eligible victims: the earlier attack admits its victim and makes logical occupancy four. The later attack's victim overflows, even if that victim has a lower seat number or its network command arrived earlier. Final numeric slot allocation cannot exchange those outcomes. With four existing occupants and a pending Rescue, the incoming player is still removed during attacks; Rescue later heals only an eligible surviving patient. Existing bodies never become eligible merely because the ward is full.

Round 4 admissions keep their Round 5 Rescue/death timing. Round 5 and showdown retain no accelerated aging, extra round or new Rescue window. The owner rule is not limited to ordinary rounds: an unblocked showdown injury that would newly enter a full Hospital follows the same incoming-overflow rule. That direct overflow elimination is distinct from automatic medical aging, which remains absent after showdown.

## Minimum contract proposal for affected-role review

These are proposed engineering contracts, **not current legal wire values or newly approved shared fields**.

| Boundary | Required future-only change |
| --- | --- |
| Capacity/placement | Exact successor capability resolves Hospital maximum and inventory to four; retain roster count 7/8/9 and complete original seat list. Engine, `validBoardMedicalView`, public capacity label and strict event/view readers must agree and reject `H5`–`H9` only on the successor. Do not repair an old over-four save by migrating/deleting patients. |
| Blackout | Reviewed successor layout identity and version-aware neutral Hospital targets exactly `H1`–`H4`; frozen original target identities still survive actual later relocation/removal, with already-Eliminated targets taking no replacement damage. Other rooms, half-open dark selection, consuming misses and full 5+10 timing remain exact. Event anchor validators must not borrow `blackoutSlotIds(location,9)` as the successor's capacity proof. |
| Off-board provenance | Generalize the new tuple's private off-board guard to prove a Hospital overflow independently of Captain EJECT. Current `assertCaptainState` requires `ejectUsed` for every null placement. Reuse validated authoritative overflow outcome/history or separately reviewed private provenance; never fake EJECT, spend its allowance or weaken historical corruption checks. Complete replay must reproduce the same victim/reason. No public per-seat cause field is required merely to represent off-board status. |
| Current snapshots | Existing Eliminated/null/null/no-active-medical shape can carry permanent removal; no fifth room, synthetic bed, deleted seat or reduced `playerCount`. Keep original identity accessible for Code/history and ordinary elimination UI. New actions remain unavailable to an Eliminated actor; receipt lookup and authorized history remain usable. |
| Sanitized outcome | Preferred proposal A below emits a separate server-authorized non-bed overflow-removal occurrence plus existing health/placement facts, and **omits `MEDICAL_OUTCOME` for that overflow transition**, including DEATH. Illustrative fact `{type:'HOSPITAL_OVERFLOW_REMOVED',phaseId,round,seatId}` remains **unallocated**. Alternative B may retain medical DEATH only with an explicitly reviewed presentation anchor. Exact name/audience/disclosure/provenance and event choice require affected-role review; no film or client occupancy inference creates the result. |
| Event delivery | Inherit atomic checkpoint publication, subject-canonical ordering rather than hidden actor order, opaque audience-specific occurrence IDs, technical freshness/expiry, first/reconnect baseline, current-binding authorization and pending receipt recovery. Retained Hospital bodies keep their frozen room-observation boundary; off-board victims gain none. Preserve generic room-only block events and exclude shared display/nonparticipating host. |

### Four physical beds versus clinical presentation anchors

The present `CLINICAL_VIGNETTE` contract accepts `slotCount:7|8|9`, tied to starting player count ([schema](../../packages/contracts/src/captain-outcomes.ts):24–29). [The service allocator](../../services/game-api/src/full-game.ts):27–46 reserves every starting Hospital occupant, including bodies, then assigns one distinct HV anchor to every clinical subject in the batch. Its old unique-roster proof is valid for historical 1.10.

Blindly changing that allocator/schema to four is invalid: four existing occupants plus an incoming overflow death give five subjects even though the fifth never occupies a bed. Never create physical `H5`, steal another patient's anchor, shift existing beds or manufacture a Hospital admission film. Do not invent `HV5` as an extra bed; any larger presentation-only namespace requires its own reviewed contract.

Preferred review direction: keep clinical vignettes separate from physical slots and route overflow occurrences through a non-bed removal/neutral announcement path. Four-geometry HV anchors are only a conditional option under the new tuple: with immediate admission before Rescue, starting physical occupants plus genuinely admitted new subjects fit four once overflow is excluded. If H4-ORDER-01 instead adopts healed-space-first admission, four starting occupants plus a healed departure and admitted replacement can require five distinct clinical subjects in one batch, despite only four physical beds. Therefore the anchor bound must be re-proved after ordering review. An independent presentation-only namespace with more than four anchors is an alternative requiring explicit geometry/meaning review; it must never describe five physical beds. Four beds alone does not approve four vignettes or any new animation.

Clinical transient injury→Rescue and injury→death for genuinely admitted patients still need stable per-subject batch anchors even if the final snapshot has another slot. Existing medical/flatline/Captain events and old anchors remain exact for old tuples. No new blanket DEATH-anchor exception or optional field should silently widen all historical schemas.

#### Explicit overflow event choice — H4-CLINICAL-01

[Frontend's source review](https://github.com/Amirkianfar66/GameN/pull/157#pullrequestreview-5563583943) and [Integration's planning review](https://github.com/Amirkianfar66/GameN/pull/157#issuecomment-6251438246) identify a required distinction: adding a non-bed removal event **does not** waive the anchor requirement of any medical DEATH fact also emitted. These reviews accept a planning record, not a successor event contract or admission model.

| Future-only event proposal | Overflow facts and anchor obligations |
| --- | --- |
| **A — preferred for review: non-bed removal only** | Emit the reviewed non-bed removal occurrence, existing `PUBLIC_HEALTH_CHANGED` to Eliminated and `BOARD_PLACEMENT_CHANGED` to null/null, with the authoritative snapshot retaining the complete Eliminated/off-board seat. Do **not** emit `MEDICAL_OUTCOME` INJURY or DEATH for this failed admission/overflow transition. It therefore has no clinical record or allocated HV anchor. This exclusion is explicit at authoritative outcome generation, not an allocator filter hiding an emitted medical fact. Ordinary admitted-patient INJURY/HEALED/DEATH remain unchanged. |
| **B — alternative requiring separate review: retain medical DEATH** | If overflow also emits `MEDICAL_OUTCOME` kind DEATH, keep its mandatory valid `CLINICAL_VIGNETTE` presentation anchor and include the victim in the clinical-subject union. A new removal event alongside it grants no exception. Review the presentation namespace/geometry and bound, including four starting reservations plus the off-board subject; avoid duplicate announcements or an invented admission/physical fifth bed. No global optional anchor, dropped DEATH fact at delivery or silent reuse of another subject's anchor. |

A is the concrete preferred documentation proposal; neither A nor B is adopted or implemented. Integration/Frontend/Designer must select the successor contract after H4-ORDER-01 reconciliation. Even A does not prove a four-anchor bound if healed-first replacement creates additional genuinely admitted clinical subjects in the same batch.

Whichever event choice is reviewed, coordinate all of these boundaries together:

- **Authoritative generation and history:** [the clinical outcome helper and strict stored-outcome reader](../../packages/engine/src/full-game/outcomes.ts):8–26 currently accept existing clinical facts; add an exact-successor non-bed route without invoking the ordinary clinical DEATH helper for proposal A. Keep private overflow provenance independent of EJECT and retain journals/receipts/identity.
- **Service publication and metadata:** [the allocator and event publisher](../../services/game-api/src/full-game.ts):27–46,368–389 must agree with the selected fact set. Its current four-type outcome classifier must explicitly recognize the reviewed new occurrence and supply exact gameplay pins, audience-specific occurrence identity, revision, publication time and 30-second expiry. It must not fall through as an ordinary event or bypass the strict event parser. Proposal B still receives mandatory clinical anchor enrichment.
- **Strict wire and consumer handling:** [the outcome/event union](../../packages/contracts/src/captain-outcomes.ts):20–35, [typed presentation outcomes](../../packages/presentation/src/model/types.ts), [the outcome feed](../../apps/game/src/connected/outcome-feed.ts):23–64 and [host dispatch](../../apps/game/hosted/board-v2-host.mjs):77–85 need coordinated exact-successor support. A non-bed occurrence requires an explicit host branch; it must not fall into placement handling or borrow a clinical bed. Preserve audience/tuple/revision/expiry checks, first/reconnect baseline suppression and historical required anchors.
- **Persistent removal and acceptance:** remove the world/capsule figure from the current authoritative snapshot even when the occurrence is missed, expired or baseline-suppressed. For each 7/8/9 mode, acceptance must prove A emits zero overflow clinical facts/anchors, or B emits a valid reviewed anchor for every retained DEATH; both must prove correct metadata, host routing, privacy and no duplicate cinematic. These are planned checks, **not run**.


Frontend must update `validClinicalAnchorForPlayerCount` usage through a reviewed successor-specific path; `outcome-feed.ts` currently rejects four-geometry anchors. Designer/Frontend must coordinate four-berth drawing ports, target geometry, art manifest, source hashes and exact layout/Ready pairing. The released drawing ports and Hospital ward accept seven/eight/nine beds; they must not infer four from a smaller roster. Medical/overflow film acceptance is separate: the current neutral clinical text and generic defense film do not establish a delivered drone, flatline or overflow cinematic.

## Identity, registered effects and victory

Gameplay removal removes physical/active participation, not the seat's existence. Retain the full 7/8/9 roster, chosen public identity, original roles/factions/Code membership, journal sequence, command IDs, receipts, accepted queues and historical resources. A new Code attempt still uses four distinct original seat IDs, including eliminated/off-board candidates; an Eliminated Hacker cannot initiate a new command, but an already accepted Code result is retained and checked under the existing Healthy Red requirement. Exact role/Code reveal remains terminal.

Overflow belongs to the same complete normal elimination stage as other registered attack/medical consequences, at the checkpoint reconciled under H4-ORDER-01. Keep the stage's Blue/Red before-and-after survival proof; do not call victory on the fifth victim, erase a later eliminated shooter's action, merge an earlier EJECT loss into normal simultaneity or change Alien survival/power requirements. R5 correct Code, team minimum health, normal power comparison, showdown participation and terminal Draw remain unchanged formulas applied to the new final roster state. End the effect of an eliminated Alien's Clone without revealing its cause.

Balance should evaluate the consequence that four retained Hospital bodies can permanently close later admissions under the unchanged retention rule. That is an approved-rule consequence to audit, not a reason to reopen the four-bed choice or silently remove bodies.

## Planned acceptance, all not run

Every row is required separately for 7, 8 and 9 players. Capacity-sensitive timing expectations must be reconciled under H4-ORDER-01 before implementation; conditional immediate-model results are labeled below. This document contains no successor runtime or executed acceptance results. Use native full setup/commands/deadlines where reachable; label defensive constructed predecessors and do not invent ammunition or override a legitimate early winner just to reach a scenario.

| Cases | Required expected result |
| --- | --- |
| Empty through third admission; fourth admission | Valid unique `H1`–`H4`, ordinary episode/due round, unchanged occupants and holes; no guessed roster reduction. |
| Full ward plus fifth incoming candidate; queued Rescue for that same candidate | Under immediate admission: permanently off-board, no fifth bed/episode/later revival/refund; accepted Rescue cannot revive. Reconcile the candidate's pending Rescue versus the admission checkpoint under H4-ORDER-01 rather than silently choosing its outcome. |
| Three occupied plus two different new candidates | Execute both explicit last-bed comparison histories against the reviewed H4-ORDER-01 expectation. Under immediate admission earlier actor effect wins; under healed-first/seat-order lower victim seat wins. Network registration/selection order never creates priority. |
| Same-actor Main and Shot; two frozen strikes on one target | Preserve Main→Shot and both independently valid bindings. Under immediate admission, first overflow makes later damage a spent no-op; otherwise fourth admission then second-hit death retains that bed. Review the complete same-target history with H4-ORDER-01; no resurrection/refund. |
| Bodies/live detainees occupy all four; attack or due death of an existing patient | Body remains counted; no global body cleanup or displaced resident, no new free place. |
| Full ward with later Rescue of a different patient; later checkpoint/round admission | Use the explicit P7-healed/P1-incoming comparison and reviewed H4-ORDER-01 expectation. Already committed overflow stays final; a healed survivor returns under existing Jail/A/B rules. |
| Clone/Protection and repeated hits | Eligible block causes no injury/overflow; preserve exact defense priority/consumption, frozen generic audience and no cause leak. |
| Jail-origin incoming; injured detainee already admitted; former Captain | Overflow clears only victim's current office/detention; ordinary admitted detention/return obligations and physical-Jail command scope stay exact. EJECT allowances remain independently unused/used as recorded. |
| R4→R5, new R5 injury, showdown | Existing episode deadlines remain; permanent overflow occurs at the reviewed admission checkpoint if full, no extra aging/Rescue/round, all registered special shots still resolve before victory. |
| Overflowed actor/Supplier recipient/Hacker/original Code candidate | Retained actions and previously accepted Code remain; removed recipient gets no living-only grant, no new command by dead actor, original Code set unchanged. |
| Victory and EJECT-stage separation | Full-stage Blue/Red/Alien/Draw outcomes use unchanged health/power/Code formulas; no cross-stage simultaneous-loss inference. |
| Authority/concurrency/recovery | Concurrent due tasks commit one decision, deterministic last-place winner, exact replay/restart/lost-ack receipts, stale task inert, malformed new fifth-bed saves fail closed; historical five-plus Hospital snapshots still load under their own pins. |
| Consumer/outcomes | Public/private snapshots agree; explicit removal fact is server-authorized, no fake bed or hidden attacker/role/grantor cue, correct anchor batch/TTL/audience and no reconnect cinematic replay. Same `snapshotId+room+slotId` binding, exact Ready/art agreement, preserved original identity choices. |

### Resource-aware seven-player trace to validate

In powers-off seven-player normal rounds the available damage budget is at most four: one initial Undercover weapon, two R3 Supplier grants and one Blue Disabler use. See [starting weapons](../../packages/engine/src/full-game/roster.ts):82–86 and [Supply](../../packages/engine/src/full-game/lifecycle.ts):160–169. A native ordinary fifth-admission claim therefore needs additional proof; use a clearly constructed full-ward guard case or a legal showdown trace instead.

One **source-consistent proposed, not executed** native predecessor: canonical roles/seat order, starting A seats 1–5 and B seats 6–7; Jail Alien7 in R1 and retain detention with no RELEASE/EJECT. R3 Supply goes to Insider1 and Blue Disabler3. R4 ordinary registrations are Shot1→Cracker2, Disabler3's targetless REQUEST_BLACKOUT plus Shot3→Undercover5, and Shot5→Insider1; subsequently seat3 selects Supplier4's frozen slot during the shared dark interval. No Rescue/correct Code; other ballots abstain. Damage resolves in stored actor order despite a later shooter becoming Injured earlier, producing four patients without competing for a fifth place. Without Rescue they die and retain four Hospital beds at the R5 checkpoint. Blue3, Red6 and detained Alien7 remain, power 1:1, so showdown can exercise the next incoming overflow. Validate the complete trace and early-victory conditions before calling it native evidence. Modes 8/9 have different Disabler/Officer budgets and require their own audited histories, not this seven-player fixture relabeled.

## Review register and implementation sequence

| ID | Status | Required review/action |
| --- | --- | --- |
| H4-GAME-01 | Confirmed | Four beds, incoming permanent removal, no later Rescue; owner record is authority. No blanket existing-body removal or victory-formula change is approved. |
| H4-ORDER-01 | Pending Integration / independent Balance review | Acknowledge the exact owner reaffirmation scoped to #96, preserve its healed-first/seat-order tuple, and review inheritance of the later immediate injury checkpoint for #155. Do not silently extend the older answer to a different successor checkpoint or rewrite 1.10. |
| H4-VERSION-01 | Pending Integration | Engine 1.11 remains proposed/unallocated; allocate exact successor rules/hash/layout/art/Ready mapping together, leaving old prepared deals and current creation profile alone. |
| H4-OFFBOARD-01 | Pending Backend/Integration review | Select strict private overflow provenance independent of EJECT, preserve old guard and retained full identity/queue/history. This is an engineering schema choice, not permission to spend a Captain power. |
| H4-CLINICAL-01 | Pending Integration/Frontend/Designer/Backend | Preferred A explicitly omits overflow medical facts; alternative B retains DEATH only with a mandatory reviewed clinical anchor. Select the event contract and coordinated generation/classifier/strict union/host handling after H4-ORDER-01; re-prove anchor bounds. Neither proposal is adopted; no unreviewed field, fake fifth bed or claimed film. |
| H4-BALANCE-01 | Pending independent Claude Balance | Bind original/new expected outcomes and native reachability separately for 7/8/9; do not copy engine logic into expectations or call source inspection a simulation/playtest. |

The owner has settled four beds and incoming permanent removal. The source audit establishes the released stage order; H4-ORDER-01 explicitly records the scoped #96 reaffirmation for review before its interaction with successor overflow is adopted. If affected-role review finds an additional gameplay conflict, record its exact competing sources and concrete history on #155 before choosing behavior. Technical tuple/anchor/provenance design choices do not independently reopen settled gameplay or require routine owner permission holds.

Recommended future sequence: Integration allocates/reviews the successor contract; Backend implements isolated exact-version capacity/admission/provenance and tests; Frontend/Designer supply reviewed geometry/outcome handling with independent Balance cases; Integration assembles exact art/profile/Ready pairing and performs final verification/release review. Implementation, shared schema activation, new art and deployment are outside this document's current authorization.

## Verification of this planning change

Owner evidence, this Backend plan and the linked source reconciliation are the three added Backend documents. Actual documentation verification:

- **Passed:** all 36 local Markdown link occurrences (26 unique targets) exist; owner JSON parses, exactly matches Integration's bytes and the recorded SHA-256, and remains marked not implemented/deployed. The direct #96 question/answer and question item identifier are preserved in this plan.
- **Passed:** all tracked baseline files remain unchanged; the only added paths are these three Backend documents. Read-only SHA checks cover 24 pinned source files, 7 rule sources and 119 original Canvas files, plus exact Canvas inventory and the matching token proposal.
- **Passed:** pinned toolchain check with Node `22.21.1` and npm `10.9.4`. The initial invocation found global npm `11.9.0`; setting the existing pinned Node directory first in PATH corrected it without installation or repository changes.
- **Passed:** final staged `git diff --check` and documentation-only path check before commit.

Source inspection includes inherited engine/service tests and two independent Backend helper audits; those helpers are not the independent Claude Balance role. Engine/service/emulator/browser/balance/human tests for the new rule are **not run**, because no successor runtime is implemented. Historical test files/expectations are preserved rather than edited to match a proposal.
