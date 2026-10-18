# Four-bed Hospital successor: Frontend handoff

**Date:** 18 October 2026. **Decision:** `HOSPITAL-4-2026-10-18`. **Tracking:** [#155][decision].
**Status:** Owner-approved rule; successor implementation and deployment have not happened in this handoff. Documentation only.
**Branch:** `codex/frontend-hospital-four-bed-handoff`. **Exact base:** `6ca4b51d5acd1454daec68c5108c8f12ee2286bf` ([release PR #154][release]).

## Approved rule and delivery boundary

Hospital has a maximum of **four physical beds for every supported starting roster: 7, 8 and 9 players**. If all four beds are occupied and another player becomes Injured and would enter Hospital, **permanently eliminate that incoming player and remove them from the board**. They take no fifth bed and cannot later be Rescued. Integration asked this exact incoming-player question and the owner answered: **“Yes—eliminate the incoming player.”**

This settles the cap and overflow victim for the successor. A proof of maximum occupancy is no longer a prerequisite to this decision. The older investigation below the confirmed decision in #155 is preserved history, not an outstanding owner choice.

Permanent gameplay removal preserves the original player identity, seat references, journals, receipts and replay history. The incoming-player decision does not independently authorize removing all existing bodies. A body still occupying an authoritative Hospital slot continues to occupy that slot unless an approved server rule changes its placement; Frontend must not free the bed because `health` is `Eliminated`.

Decision provenance is the confirmed-owner section of [#155][decision] and Integration's exact local record, `/Users/amirkianfar/GameN/docs/reviews/2026-10-18-hospital-capacity-owner-decision.json`, SHA-256 `e8200252806d5e468805b6e00cc9ea85eb37651d72522293b533ee31f3d27c5d`. This handoff records the decision durably without editing that record.

The inherited release remains protocol `2`, engine `full-game-1.10.0`, ruleset `in-person-v1-clone-2026-10-14`, ruleset hash `6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234`, art `design-0.4.0`. [Its exact gameplay pins][pins] and existing matches remain immutable. This document assigns no successor engine, ruleset, layout or art version and performs no migration. Runtime, contracts, rules, art and deployment edits remain on hold until the successor contract and source are coordinated.

## Verified source references

All release references below are pinned to `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`, not a moving branch. They describe inherited behavior, not an implemented four-bed successor.

| Source | Verified inherited behavior | Successor dependency |
| --- | --- | --- |
| [Medical placement contract][placement] | `H1` through `H9` are syntactically valid; Hospital maximum is `view.playerCount`. Supported Captain tuples already allow an Eliminated seat with null location/slot and null medical episode. | Version-aware four-slot validation and authoritative overflow placement; preserve old tuple validation. |
| [Blackout contract][blackout] and [private target reader][private-target-reader] | `blackoutSlotIds` uses the starting roster for Hospital; the private view requires its exact slot array, and the frozen layout revision is `board-v2-0.1.1`. | Coordinate the successor reader, layout revision and frozen logical slot list. Four-bed art alone cannot make the new private view valid; preserve historical helper/schema behavior. |
| [Clinical and placement outcomes][outcomes] | `MEDICAL_OUTCOME` has INJURY/HEALED/DEATH; `BOARD_PLACEMENT_CHANGED` permits null location and slot together. Clinical anchors are separately typed (see below). | Exact successor outcome/placement chronology, audience and any authorized overflow explanation. Existing medical facts do not name an overflow cause. |
| [Public board model][public-board] | Copies validated stored placement; labels geometry `board-v2-0.1.1` and retains starting `playerCount`. | Reviewed tuple/layout adapter that separates roster size from physical ward capacity. |
| [Drawing modules][drawing] and [host][host] | Ward, lit/dark art, scene fitting, press rectangles and turns layout are selected using starting roster 7/8/9. | New reviewed four-bed preset and derivatives; retain historical art selection. |
| [Persistent board/capsule scene][scene] | Omits explicit Eliminated/null/null seats; targets and capsule actors resolve from on-board seat models. | Consume authoritative removal during any scene phase, including private talk and return. |
| [Action offers and Code pool][actions], [connected action flow][action-flow] | Targets follow server offers; Code uses the original `view.seats` roster. Request identity and recovery are separate from drawing a seat. | Keep original seat IDs and command recovery when a board actor disappears. |
| [Outcome feed][outcome-feed] | Validates tuple, audience, event identity, revision, expiry and clinical anchors; initial/cache/reconnect snapshots establish a baseline. | Extend only through the coordinated successor contract; preserve deduplication and no replay on background/resume/reconnect. |
| [Ready request][ready-request], [version fields][ready-versions] and [server equality check][ready-check] | Ready acknowledges the exact prepared gameplay/art versions; no separate layout field is acknowledged. | Bind four-bed layout unambiguously to reviewed tuple/art mapping, or review an explicit extension, before accepting Ready. |

### Latest published Designer source inspected and preserved

[Designer PR #144][designer-pr] was inspected at its published head **`95d70f0c885f6b7d619c4ebff935093dfe891ea6`**. Its [deliverables index][designer-index], [Frontend handoff][designer-handoff], [ward source][designer-ward] and [owner-specification provenance][designer-provenance] are the inspected references. The ward still describes 7/8/9 berths; no four-bed successor source was verified at this head.

The delta from the previous drawing head `7786b9166422f1ffb59921fc224339044f4b0353` to `95d70f0c885f6b7d619c4ebff935093dfe891ea6` contains documentation, inventories/hash lists and the preserved owner-specification packet. `git diff --quiet 7786b9166422f1ffb59921fc224339044f4b0353 95d70f0c885f6b7d619c4ebff935093dfe891ea6 -- design/board-v2` returned exit **0**: the Board V2 drawing bytes are unchanged. This inspection is not adoption, a merge or an asset change.

The index is dated 14 October and describes an earlier staging engine 1.5/source `37f573a`. That sentence is historical Designer context; it does not supersede the inherited 1.10 baseline above. Its original specification's roster-sized Hospital is likewise preserved evidence superseded by #155 for the future successor.

### Backend planning review, 18 October 2026

Backend [PR #157][backend-pr] is a documentation proposal at exact head `a33cae88ff47cd1111f0baea37eae09f8ad714b2`; its [successor plan][backend-plan] preserves the direct #96 owner answer, “Free healed Hospital places first, then use existing seat order,” and contrasts it with later immediate logical admission. [Frontend's source review][frontend-review] and [Integration's review][integration-review] support the planning record. **H4-ORDER-01 admission reconciliation, successor version allocation and the clinical/event contract remain unapproved.** Frontend consumes the reviewed server result and does not decide the last-bed survivor. The supplied owner answer must be preserved without asking for it again.

## Required successor coordination

### Backend and Integration: authority, projection and targets

Provide a reviewed successor tuple and typed fixtures for four physical Hospital slots, legal placement and permanent incoming-overflow elimination. Frontend must consume an explicit authoritative Eliminated/offboard state and its agreed outcome facts. The existing null `location` plus null `slotId` representation is a coordination reference, not a new wire-contract decision made by this document. Do not deduce elimination, a free bed, a death time or overflow cause from the number of visible patients or beds.

Settle deterministic server processing for simultaneous admissions, an already-Injured patient, retained bodies, Rescue freeing space versus attack/death order, detention, round/aging boundaries, registered actions and victory checks. These are integration cases around the settled four-bed/incoming-player rule. Frontend must not choose which incoming player gets the last bed or cancel a previously registered action because its actor was later eliminated.

The overflow victim must not be offered for later Rescue. Legal target and action availability remain server-authorized. Preserve the full original roster and seat IDs for Code and other identity/history references; do not derive Code choices from visible actors or four beds. Review any genuinely changed eligibility separately instead of silently shrinking existing pools.

For Blackout, coordinate the exact successor layout revision and server-offered physical `slotIds` with Designer geometry. The [current private view refinement][private-target-reader] compares `slotIds` to the roster-sized `blackoutSlotIds(t.room, v.playerCount)` result; the successor needs an explicit version-aware reader alongside the new layout. Frozen `snapshotId + room + slotId` bindings preserve the original target if a patient later leaves or a bed is reused; never redirect an earlier strike to the replacement occupant. Render the four Hospital positions allowed by that contract, including empty/self/body positions where offered. Submit those exact logical IDs, never a DOM index or inferred occupied target. Preserve dark-state privacy: numbered positions must not disclose hidden names, identities, health or occupancy through markers, labels, effects or asset loading. Preserve established room-block disclosure boundaries.

### Designer: four beds and separate clinical presentation anchors

Deliver a focused four-berth successor drawing with stable bed IDs, back/front layers and depths, lit/dark art, slot/press rectangles, compact/enlarged layouts, safe-area behavior and common asset provenance/hashes. Keep the original roster 7/8/9 distinct from capacity four. Do not crop the roster-sized ward, renumber seats or derive a four-bed preset by changing every roster argument to `4`. Frontend adopts reviewed source and exact asset versions through Integration.

**Physical `H` slots and clinical `HV` anchors are different contracts.** At the inherited baseline, [clinical anchors][outcomes] are `kind: 'CLINICAL_VIGNETTE'`, an opaque audience `batchId`, `anchorId: HV1..HV9`, and `slotCount: 7 | 8 | 9` equal to the starting roster. Here `slotCount` describes presentation geometry; it is not Hospital occupancy or a physical bed limit. Do not change that field to `4` or make `HV5` mean a fifth bed.

A resolution batch can require presenting injury, healing or death subjects beyond the four final bed occupants. An overflow victim has no Hospital slot. Backend and Designer must agree on versioned anchor allocation and presentation for those subjects, including same-batch injury/healing/death and an offboard victim. Coordinate monitor/critical loops, drone/revival, flatline/shutdown and removal against those authorized facts. Frontend must not invent a fifth bed, recover an event's bed from the final Healthy state, or fabricate a destination for an offboard subject. Any non-bed clinical vignette must read as presentation, not admission or an extra physical place.

**H4-CLINICAL-01 must specify which facts overflow emits.** Every inherited `MEDICAL_OUTCOME`, including DEATH, requires a clinical anchor. The [service allocator][clinical-allocation] processes all such records, so an additional non-bed removal occurrence does not by itself exclude a separately emitted medical DEATH from allocation. Choose the authorized non-bed fact plus snapshot/placement facts, or explicitly review an additional clinical representation; preserve required historical anchors. The [checkpoint outcome classifier][outcome-publication] currently recognizes four outcome types and supplies their exact version/expiry/occurrence metadata. Coordinate its successor case with the strict event union and typed host dispatch; do not let a new fact fall through as an ordinary unversioned event. The illustrative Backend event name remains unallocated.

Re-prove the anchor bound after H4-ORDER-01. The relevant allocator set is the union of reserved starting Hospital occupants and clinical subjects. A **constructed, unexecuted healed-first case** starts with P2/P3/P4/P7, heals P7 and admits P1 into the freed bed: four beds suffice, but keeping all four starting reservations plus P1 requires five allocations. If the other three patients also have due-death facts, five subjects have clinical facts in the same batch. This is a conditional acceptance requirement, not a native reachability claim. Do not silently reuse an anchor or interpret the fifth presentation allocation as a physical bed.

Only show an overflow-specific explanation if the successor's audience-approved contract supplies that cause. Until then, generic authorized elimination/removal feedback must not invent a public reason or reveal faction/private defenses. Normal and reduced-motion treatments must preserve the same facts and controls.

### Frontend: persistent scenes, recovery and access

When the authoritative successor view removes the incoming player, remove the world actor, world target, any capsule actor, home ghost, nameplate and associated stale pick/effect state. Reconcile against the latest stored placement during capsule departure, talk and return. If the seat is offboard, there is no cached departure slot to restore and no synthetic `H5`. A still-valid control rendered in the capsule must keep the original offered target/choice and canonical command identity.

Board removal does not revoke authentication, forget the player, erase history, abandon an accepted command or replace an uncertain command ID. Preserve pending/accepted receipt recovery across hidden/stale views, reload and reconnect, even if private target marks are concealed. Fresh authoritative views and audience events drive settled board state and public effects; receipts, acknowledgments, private choices and bed counts do not adjudicate death.

Persistent removal must be restored from the authoritative snapshot even when its removal event was missed, expired or suppressed as an initial/reconnect baseline. Keep the existing outcome-feed baseline, expiry, audience, tuple, revision and deduplication protections. Reconnect, late join and foregrounding must not replay a death/drone/removal film or recreate a removed actor. Preserve usable Code, claim and recovery controls, keyboard focus, reduced motion and layout fallback while a seat leaves.

## Acceptance required before later adoption — not run

These are successor acceptance requirements, **not test results**. Cover starting rosters **7, 8 and 9 separately**, with server outcomes and visual evidence labeled independently.

| Case | Required observation |
| --- | --- |
| Fourth admission | With three occupied beds, an admitted patient uses one of the four server-authorized slots; client assigns none. |
| Full ward plus incoming injury | Server eliminates that incoming player and projects offboard placement; no fifth actor/bed, no later Rescue offer. |
| Competing incoming patients | From three occupied beds, the server's deterministic order selects admission and overflow; UI mirrors it. |
| Existing body and Rescue ordering | A retained body still occupies its stored bed; approved Rescue/attack/death ordering alone changes availability. |
| Boundaries and registered actions | Approved detention, aging, round, registered-action and victory results survive overflow; client cancels no action on its own. |
| Identity and legal actions | Original roster/Code identity remains, offered IDs stay exact, and the overflow victim cannot be Rescued. |
| Capsule transitions | Removal during departure, talk and return leaves no world/capsule ghost, target or cached return destination. |
| Frozen Blackout | Exactly the successor's four Hospital markers/IDs, including offered empty/self/body positions; no hidden occupancy or identity leak. |
| Clinical batch | Resolve the overflow-versus-medical-DEATH fact choice; validate the conditional healed-departure/replacement five-allocation case against the reviewed order. Stable clinical anchors remain independent of four physical beds. |
| Recovery and lifecycle | Stale/hidden/reconnect/late join/reload/reduced motion preserve request IDs and receipts, conceal private marks and replay no old event. |
| Small-screen access | At 320 × 568 and other supported shell boundaries, center/corner hit tests, keyboard focus, safe areas and 200% text preserve at least 44 px targets and Code/claim/recovery access. |
| Historical compatibility | Existing 1.10 and earlier supported matches retain their original tuple, roster-sized ward, stored bodies/placement, offers and replay behavior; no migration. |

Implementation gate: Backend/Integration publishes the successor tuple, typed placement/outcome/targeting and clinical-anchor contract; Balance reviews the interaction cases; Designer publishes the coordinated four-bed geometry and source hashes; Frontend reviews those exact artifacts before runtime edits. This gate coordinates implementation details and does not reopen the owner's confirmed cap or overflow victim.

## Evidence for this documentation change

Read #155 and the local exact owner record; verified the release and Designer PR heads; inspected the pinned sources above; confirmed unchanged Designer drawing bytes between `7786b91` and `95d70f0`. Validation passed: `git diff --cached --check`; all 22 pinned source references resolved to exact Git objects with valid line anchors where supplied; the local navigation link resolved. The diff contains exactly two files under `docs/frontend/`. Runtime, browser, emulator and physical-device successor acceptance tests are **not run**: there is no successor implementation in this change. Existing 1.10 evidence is historical evidence, not a passing four-bed test.

[decision]: https://github.com/Amirkianfar66/GameN/issues/155
[release]: https://github.com/Amirkianfar66/GameN/pull/154
[pins]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/full-game-versions.ts#L1-L2
[placement]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/board-medical.ts#L26-L54
[blackout]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/blackout.ts#L8-L28
[outcomes]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/captain-outcomes.ts#L9-L35
[public-board]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/presentation/src/model/public-board.ts#L6-L26
[drawing]: https://github.com/Amirkianfar66/GameN/tree/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/hosted/board-v2-drawing
[host]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/hosted/board-v2-host.mjs
[scene]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/hosted/board-v2-scene.mjs
[actions]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/presentation/src/model/actions.ts#L121-L129
[action-flow]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/src/connected/action-flow.ts
[outcome-feed]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/apps/game/src/connected/outcome-feed.ts#L6-L68
[designer-pr]: https://github.com/Amirkianfar66/GameN/pull/144
[designer-index]: https://github.com/Amirkianfar66/GameN/blob/95d70f0c885f6b7d619c4ebff935093dfe891ea6/docs/design/deliverables.md
[designer-handoff]: https://github.com/Amirkianfar66/GameN/blob/95d70f0c885f6b7d619c4ebff935093dfe891ea6/docs/design/board-v2-frontend-handoff.md
[designer-ward]: https://github.com/Amirkianfar66/GameN/blob/95d70f0c885f6b7d619c4ebff935093dfe891ea6/design/board-v2/scenes/hospital-ward.mjs
[designer-provenance]: https://github.com/Amirkianfar66/GameN/blob/95d70f0c885f6b7d619c4ebff935093dfe891ea6/docs/design/evidence/owner-motion-spec-2026-10-13/PROVENANCE.md
[private-target-reader]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/full-game.ts#L167-L176
[clinical-allocation]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/services/game-api/src/full-game.ts#L23-L46
[outcome-publication]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/services/game-api/src/full-game.ts#L377-L389
[ready-request]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/staged-start.ts#L55-L60
[ready-versions]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/packages/contracts/src/full-game.ts#L52-L54
[ready-check]: https://github.com/Amirkianfar66/GameN/blob/6ca4b51d5acd1454daec68c5108c8f12ee2286bf/services/game-api/src/full-game.ts#L714-L719
[backend-pr]: https://github.com/Amirkianfar66/GameN/pull/157
[backend-plan]: https://github.com/Amirkianfar66/GameN/blob/a33cae88ff47cd1111f0baea37eae09f8ad714b2/docs/backend/hospital-four-successor-plan.md
[frontend-review]: https://github.com/Amirkianfar66/GameN/pull/157#pullrequestreview-5563583943
[integration-review]: https://github.com/Amirkianfar66/GameN/pull/157#issuecomment-6251438246
