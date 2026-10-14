# Consolidated owner-approved motion and gameplay specification

Repository: `Amirkianfar66/GameN`. Recorded: 13 October 2026.

**Status: specification decisions consolidated; implementation and deployment not authorized.**

The owner's latest instruction, "approve all recommendations", ends the individual-question workflow for this specification. Previously proposed recommendations are approved as a group. Remaining technical and rule details have been completed as integration defaults under that direction, preserving individually confirmed mechanics. The [decision register](decision-register.md) distinguishes these sources of authority; it does not claim the owner separately answered each new default.

The earlier explicit restriction on code changes, deployments and automatic executable-rule changes still applies. Only this Markdown specification and its integration pointer have changed. No agent is dispatched and no runtime, artwork, cloud resource or historical match is modified.

## Read the completed specification

1. [Game design](game-design.md): the complete mechanics and phone experience.
2. [Rules contracts and resolution matrix](rules-contracts.md): command authority, exact ordering, audiences, deadlines and future acceptance cases.
3. [Motion requirements](motion-requirements.md): each scene, stable targets, timing, privacy and reduced motion.
4. [Decision register and handoff](decision-register.md): individual approvals, blanket-approved recommendations and integration defaults.

No gameplay question in this package is waiting for another owner response. Engineering review, actual implementation verification and balance testing remain work to perform, not missing owner decisions.

## Consequential defaults completed under the blanket approval

- New final-round injuries do not cause immediate Hospital death or an extra round. R4 patients still receive R5 as their full rescue opportunity. Registered Rescue resolves before due death and final victory checks.
- A detained patient stays in Hospital with detention intact. Healing returns them to Jail. Captain RELEASE/EJECT affect living prisoners physically in Jail, preserving their stated location scope; neither remotely acts on Hospital patients.
- Clone uses the role Main Action, lasts through the following normal round, and survives imprisonment without a reset. A Round 5 activation covers only remaining normal R5 resolution; every Clone expires before showdown. Special showdown shots bypass it, while existing Protection can block one applicable shot.
- A shared fifteen-second all-room Blackout runs every normal round, even without requests. Public timing and affected-room lighting do not disclose who requested it. Damage still uses private accepted requests and the frozen position map.
- Defensive outcomes are delivered only to the affected room's event-time observers. The shared display and outsiders receive ordinary public state, without block banners/counts/sounds.
- Showdown keeps players in their actual rooms, including Hospital. Its special shots alone ignore room separation, ordinary injury/Jail shooting restrictions and Command Room immunity. Preserve full-batch resolution and existing victory/draw rules.
- Captain commands reject an empty eligible Jail without spending a use. Accepted effects are immediate; faction disclosure and victory follow the normal end-round checkpoint so already-registered actions still resolve.
- Chamber entry fits within the existing five-second claim stage. The full sixty-second conversation is physical and private in person; no voice service is introduced. Exit restores the latest authoritative positions.

## Scope and source precedence

Preserve position-memory Blackout, public Hack participation/private content, visible but cause-ambiguous defenses, Phantom Clone, direct Captain commands, full-roster Hospital and the one-round rescue rule with its stated terminal exception. Earlier conflicting presentation advice and V1 assumptions are superseded for the next version only.

The source basis is commit `abb6839524b6dc3e5225e600f2f067c3fa3f9501`, engine `full-game-1.3.0`, ruleset `in-person-v1-capacity-resolution-2026-10-12`, on `codex/owner-motion-spec-2026-10-13`. This is not a claim about current deployment. Historical executable rules, Canvas bytes and existing match/deal/receipt/replay/asset pins remain unchanged.

Supporting sources are the [historical decisions](../../../rules/sources/v2.1-decisions.json), [V1 owner overlay](../../../rules/overlays/in-person-v1-owner-decisions-2026-10-06.json), [consolidated ordering](../../../rules/overlays/consolidated-decisions-2026-09-26.json), [movement](../../../rules/overlays/movement-decision.json), [showdown](../../../rules/overlays/final-showdown-decision.json), and [latest capacity/return decisions](../../../rules/overlays/room-capacity-resolution-owner-decision-2026-10-12.json). They apply where this later specification does not explicitly supersede them.

Earlier inspected handoffs remain source references, not adoption claims: Backend vote-result `bd4d77ccc1c46d90c5beafb770252fdae6f086ae` (PR #125); declared-Hack local snapshot `ba1842ff991dfb53207cbef110940016cc8d533d`; Claude Designer phone kit `ca78625bf9f97629cf7cfd8c40a2f97d7cc078ca` (PR #127); Frontend `bc92e581063cd2c4123a740755579fdfd1522b95` (PR #126).

## Verification boundary

Verified on 13 October 2026 at the recorded base: `npm run check:toolchain`, `npm run check:workspace`, `npm run check:sources` and `git diff --check` all passed using Node `22.21.1` and npm `10.9.4`. A separate documentation audit passed for all six changed Markdown files, 36 local links, all 36 unique Q-IDs and nine G-sections. SHA-256 comparison confirmed all 134 files under `rules/` and `reference/design-canvas/` unchanged; only the existing integration register's introductory pointer changed outside this folder.

Runtime, emulator, device, animation and human balance tests were not run for these documentation-only changes; acceptance of the new mechanics is not claimed. Future implementation must allocate new immutable versions, obtain affected-role technical review and run the acceptance matrix before release. This local specification is not committed, pushed, merged or deployed by this consolidation.
