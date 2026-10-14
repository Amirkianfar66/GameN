# Board-v2 authority prerequisite for issue #139

Status: implementation design prepared for affected-role review, not an adopted shared schema or executable rule version. Parent release: `37f573afca9023e8e4a92375375cea96638d120f`. The minimal capsule disclosure proposal is PR #140; it does not complete this prerequisite.

Authority: final owner packet SHA-256 `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743`, G-01/G-05/G-07/G-09 and rules-contracts; issue #139 authorizes scoped implementation. Designer's corrected `15e61f0bbd043930a578900862be9d5156b3b602` slot module reads Backend assignments and does not allocate. Its pure drawing revision is `board-v2-0.1.1`; reviewed asset binding belongs to Integration.

## Proposed versioned boundary

Use a separate new exact tuple, with Integration allocating the final engine/ruleset/hash/art pairing. Do not change existing default creation profiles or silently add this behavior to 1.6's capsule-only scope. Keep the prerequisite disabled for release activation until its affected schema and dependent mechanics are reviewed and accepted.

Propose one new-tuple-only stored public `slotId` per on-board seat: `A1`–`A5`, `B1`–`B5`, `J1`–`J5`, `C1`, and `H1`–`H{playerCount}`. It is logical position, not a pixel coordinate. `location` retains gameplay meaning. The immutable manifest maps a tuple to one layout revision; avoid a second mutable layout authority. Existing `playerCount` supplies starting roster size and existing `jailed` supplies detention. Do not add a second roster-count or medical-detention flag.

The slot allocator is pure engine authority: preserve all occupied slots, including retained bodies; departures leave holes; an entrant takes the lowest free matching slot. Initial placement uses canonical ascending player number after the independent completed-roster room draw. Immediate commands serialize through current transactions. Forced batch returns use approved ascending player number; attack/Rescue effects retain recorded round order. A failed command never reserves a slot or spends movement.

No persisted public slot may be inferred from today's roster sorting or a continuing browser's cache. The same occupancy can result from different arrival histories. Assignments must survive JSON/Firestore recovery and complete journal replay. Require at most one occupant per slot and exactly one slot per on-board seat. A/B/Jail have five slots, Command one and Captain-only, Hospital has starting roster size. Slots cannot be renumbered by viewport, art travel, reconnect or observer identity.

## Coherent Hospital state and lifecycle

Every Injured player is physically in Hospital, including detained patients. New Healthy-to-Injured damage immediately creates an admission/injury episode and assigns a Hospital slot in the same logical step. This is not delayed until the final placement loop. A second unblocked hit eliminates before Rescue; dead players cannot be revived.

Store private authoritative episode evidence sufficient for admission round and due death round. Successful healing clears it; a later fresh injury starts a new episode. No-op Rescue, detention or reconnect cannot extend it. Rescue and Round 3 Supply resolve before due death. R2 admission is due after R3 Rescue; R4 is due after R5 Rescue; new R5/showdown injuries do not gain accelerated death, an extra round or a new healing window. Do not expose an invented episode ID or hidden effect source in public views.

A Jail vote against an Injured player changes detention while retaining their Hospital slot. A healed detained patient returns to physical Jail; a healed free player returns to the last actual A/B room or the other if full. Remember the actual fallback destination. Injured former Captains go directly to Hospital. Forced transfers consume no voluntary move. Bodies retain physical slots, including Hospital beds, except the separately approved EJECT cleanup.

At final placement, reconcile all Injured admissions, healed-detainee Jail returns and free ordinary returns in the approved order, preserving occupants and lower-player-number competition. Jail capacity accounting includes physical occupants plus detained patients awaiting return; a corrupt impossible state fails its invariant. It cannot create medical overflow.

Keep showdown participants in actual rooms and detention, with a shared cinematic layer rather than transfer to Final Zone. Existing special-shot target freedom and stored R5 resolution order remain; shots are all registered before resolution, registered dead shooters still resolve, Clone is bypassed, Protection retains its approved behavior, and no Hospital aging tick or Rescue window is added afterward.

## Source paths and dependent mechanics

| Boundary | Required work |
| --- | --- |
| Engine state / roster | Version-gated persistent slots and private medical episode state; exact legacy saves unchanged |
| Capacity / placement | One allocator across every relocation; full-roster Hospital, detained-patient routing, lower-player-number returns and invariant checks |
| Lifecycle | Creation, MOVE, election/Command, Jail/release, damage, Rescue, Captain loss, final placement and actual-room showdown |
| Shared contracts / projections | Strict new-tuple slot and medical-location invariants on public/player views; historical fields absent rather than null-filled; no hidden medical cause |
| Service persistence | State codec, prepared pins, transaction projection writes, receipt-first recovery and deterministic journal replay; bot readers consume reviewed views |
| Integration | Immutable source overlay/hash, source checks, compatible creation/art profile, legacy asset routing, exact drawing-port fence and combined acceptance |

Captain commands need their own reviewed physical-Jail scope. Current selected-prisoner release voting cannot remotely release a medical detainee while claiming final G-06 behavior. EJECT also needs an explicit off-board elimination representation and deferred faction reveal: current non-null location plus immediate eliminated faction disclosure cannot express it. Define that shared boundary before implementing the Captain companion slice; do not add a fake gameplay room.

Blackout subsequently needs one frozen slot/health snapshot per room, authoritative lit/dark deadlines and slot/snapshot intent. Clone and sanitized room outcomes require their own reviewed state/event contracts. Slot/Hospital preparation does not claim those mechanics implemented. Pure ward art, nameplates, navigation and capsule drawings can be ported separately within a reviewed art revision, using current authorized facts.

## Acceptance matrix before activation

For each 7/8/9 roster: initial allocation unrelated to roles/characters; holes retained after entry/exit; competing moves for the last A/B/Command place; full-room offers/rejection; simultaneous forced transfers; healed ordinary/Jail returns and Captain loss; retained bodies; injured prisoner admission and detention vote; healing back to Jail; episode reset and second-hit-before-Rescue; R2/R3 and R4/R5 death boundaries; fresh R5/showdown injury; actual-room full-batch showdown; JSON/Firestore/reconnect/receipt/journal recovery; exact historical replay/projection controls. Independent Claude Balance audit is required. Device/render captures and human social balance remain separate evidence.

This document records prepared dependencies only. No slot field, Hospital behavior, new creation profile, deployment or IAM change is adopted by it.
