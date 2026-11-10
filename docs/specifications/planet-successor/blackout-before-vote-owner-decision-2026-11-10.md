# Blackout resolves before Jail voting — owner decision

**Status:** owner confirmed on 10 November 2026; implementation and release review pending. Recording this decision does not activate it in existing or new matches.

## Authority and scope

In integration conversation `01a0de94-e774-7a53-80fd-5897c518c9bf`, the owner answered the pending Blackout outcome-order question:

> I recommend resolving Blackout before the Jail vote

This selects the pre-vote outcome alternative, rather than targeting before the vote and resolving damage afterward. Immediately before that answer, Integration explained that a later Jail vote cannot undo a completed strike and that full Hospital occupancy can permanently eliminate a newly injured victim before later Rescue frees a bed. The owner had already requested that Blackout be usable before voting.

The reviewed implementation plan is Proposal B in [Blackout timing proposals](../../backend/planet-blackout-timing-proposals.md), at source commit `19564d0c618dae9995bbd92979d248e82dba0a8f`. Its pending-choice status is superseded by this decision. Detailed engineering recommendations in that document remain subject to implementation review; they are not separate owner quotations.

## Confirmed sequence

1. Finish ordinary turns and the final private conversation. Close voluntary movement, Captain commands and Hospital-panel submissions at their existing boundaries.
2. If Blackhole is active, Sync one complete reality and run the independent six-second presentation. Do not resolve damage in a discarded reality.
3. Run the shared Blackout window: five seconds with lights on, then ten seconds in darkness. Keep logical positions fixed throughout the full window, including rounds without an eligible strike.
4. Resolve the admitted Blackout batch and commit its damage, defenses, Hospital placement and consequent eligibility changes before opening voting.
5. Start the full 60-second Jail vote from that authoritative state, followed by the full five-second vote-result interval.
6. Resolve the remaining queued actions, ordinary attacks, Rescue and normal finalization; then proceed to navigation under the existing rules.

## Consequences that must remain explicit

- An attack completed before voting cannot be canceled or refunded by that later Jail vote. Pre-window eligibility still governs admission; do not consume an ineligible untargeted request merely because the window opens.
- Blackout damage now precedes ordinary shots and the later Rescue stage. Preserve the existing defense rules and do not process the entire combined action resolver early.
- Every newly Injured player must be placed in Hospital at the Blackout checkpoint. Hospital still has four beds. If admission fails because all beds are occupied, apply the existing permanent elimination/offboard overflow rule immediately. A later queued Rescue cannot retroactively free a bed for that victim or revive an Eliminated player.
- Voting eligibility, targets and thresholds use the committed post-Blackout state. Living Injured/Jailed players retain their existing voting permissions. Evaluate Meet A/B at the actual voting opportunity after these forced transfers.
- Do not age injuries, resolve unrelated actions, expire Clone, or evaluate No survivors prematurely at this partial checkpoint. Preserve the full finalization and navigation rules.
- The shared board may show authorized completed Blackout consequences, while remaining actions and Rescue are still pending. Preserve room-only defensive feedback, hidden attacker identity, private roles/Code and all existing audience restrictions.

## Delivery responsibilities

Backend owns the focused successor specification/overlay, exact version tuple, split resolution and placement checkpoints, persisted completion markers, validation, projections and authoritative deadline scheduling. Preserve historical authority bytes and saved-match behavior. Supply Frontend the exact phase and checkpoint contract before consumer adoption.

Frontend owns the matching controls and presentation: server-owned five-plus-ten-second targeting, stable geometry, authorized post-Blackout outcomes, then a fresh full vote and result. Preserve reconnect, reduced motion, privacy concealment, and the living Hacker's existing pre-navigation Code permission. Animation completion must not advance phases.

Designer needs the sequence and authorized outcome boundary, not a new targeting mechanic. Existing fixed-position art remains applicable. New visual work is not required merely to approve the order.

Use a separately reviewable change, pin the new rules only for new matches, and run the relevant engine, projection, scheduling, retry and connected UI checks before merge or deployment. Human balance and physical-device validation must be reported separately from automated checks. This decision record itself changes no engine, runtime asset, deployment or creation default.
