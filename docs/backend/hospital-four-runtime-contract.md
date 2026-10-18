# Four-bed successor runtime contract

Implementation candidate for #155; executable base `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`, isolated branch `codex/backend-hospital-four-runtime`. Owner implementation dispatch: https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6256068599. This branch does not activate a release profile or deploy.

The exact original #96 question, answer and question item are retained in `rules/overlays/hospital-four-owner-decision-2026-10-19.json`. The supplied answer is **“Free healed Hospital places first, then use existing seat order”**. This candidate implements it as healed-first/numeric admission, rather than inheriting actor-order admission from the unlimited ward.

## Exact candidate allocation

- Protocol `2`, engine `full-game-1.11.0`, ruleset `in-person-v1-hospital-four-2026-10-19`.
- Rule SHA-256 `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c`.
- Logical layout `board-v2-four-0.1.0`; production art identity `design-0.5.0` reserved for this exact tuple. No production art bytes or default are activated here. These identities had no executable allocation in the starting baseline; the Designer layout name had been a proposal.
- Existing `FullVersions` and Ready equality remain the agreement shape. Successor plus old art, or old gameplay plus the new reserved art, is rejected. Prepared historical deals and previous exact tuples remain untouched.

## Atomic checkpoint

Registered Main then Shot effects, Rescue, R3 Supply and due deaths keep their current order. New injuries wait in a private local admission batch at their origin; no intermediate projection, extra persisted waitlist or physical fifth bed is introduced. At final placement, healed Hospital departures vacate first. New candidates still Injured or already Eliminated by a second hit then compete in numeric seat order, counting all established Hospital occupants including bodies. Ordinary returns follow admission and use existing last-room/fallback rules.

A new candidate healed during the same batch is Healthy and returns without failing admission. A second-hit candidate cannot be Rescued: it competes as a new body and stays in a bed if admitted, otherwise goes permanently offboard. Existing bodies never leave merely because another player needs a place. Pending patients retain their origin until placement, so room-local block membership follows that staged placement under this new tuple; older tuples retain their exact immediate-transfer behavior.

Constructed regression expectations, separately for 7/8/9:

| Before/effects | Expected final result |
| --- | --- |
| Three Hospital occupants; P6 hit before P1; neither healed | P1 gets bed four; P6 permanently offboard. Victim number, not attack/network order, decides admission. |
| Four Hospital occupants P2/P3/P4/P7; P1 hit; P7 Rescued | P7 leaves; P1 takes the freed fourth bed. |
| Four established bodies; new P1 hit and Rescue targets P1 | P1 becomes Healthy during the registered Rescue stage, so it does not fail admission; no overflow. |
| Four established bodies; P1 hit twice and then targeted by Rescue | P1 already Eliminated, cannot heal, fails admission and is offboard; no fifth body/bed. |

These are labeled constructed guards until executed. Engine/service tests provide executable histories and separately labeled native traces; Backend tests are not independent Balance acceptance.

## Consumer boundary

All 7/8/9 original seats remain in views/Code/history. Overflow is `health:'Eliminated', location:null, slotId:null, medical:null, jailed:false, captain:false`. Private `hospitalOverflow` evidence is exact-successor only and validated against its authoritative occurrence, independent of Captain EJECT; no public per-seat reason field is added.

Overflow publishes `{type:'HOSPITAL_OVERFLOW_REMOVED',phaseId,round,seatId}` as a public/player outcome with exact gameplay pins, audience-specific opaque occurrence ID, revision, publishedAt and 30-second expiry. The denied candidate has no committed medical INJURY/DEATH/anchor for this batch; other subjects' clinical facts and earlier history remain. Ordinary health/placement and the current snapshot carry persistent removal after a missed, expired or baseline-suppressed occurrence.

Physical Hospital positions and frozen Blackout targets are H1–H4. `blackoutSlotIds(room,count,versions?)` preserves its old two-argument behavior; readers supply exact versions. New-only layout validation rejects old/new mismatches and H5–H9 physical placements while preserving historical inventories.

Clinical presentation keeps **HV1–HV7/8/9 and slotCount 7/8/9**, independent of four physical beds. Starting beds (including bodies) reserve their existing HV positions; new clinical subjects receive distinct anchors as before. Every medical wire fact still requires its anchor. On the four-bed renderer, valid HV5+ means words only, with no H5 geometry; strict wire validation precedes drawing. A valid HV1–HV4 occupied by another stable seat/body likewise suppresses imagery only. Normalize wire seatId to the helper's identity explicitly. Never drop a clinical fact, relax DEATH validation, silently reuse anchors or invent an admission film.

Affected-role review is requested on this exact implementation candidate. Frontend owns rendering/wording and Designer fallback adaptation; independent Claude Balance owns expected-outcome audit. Final Integration owns review, art/profile activation and any later deployment.
