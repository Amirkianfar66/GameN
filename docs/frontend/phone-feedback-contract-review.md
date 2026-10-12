# Frontend contract review for issues #119–#122

Issue: #122. Branch: `codex/frontend-phone-feedback`. Input baseline: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`. Input tuple: protocol 2, `full-game-1.3.0`, `in-person-v1-capacity-resolution-2026-10-12`, hash `aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e`. New match version allocation and historical compatibility belong to Backend/Integration.

The owner approved the bounded Hack flow on 12 October 2026: up to 15 seconds to declare, five seconds to show the declaration privately, then the full 60-second conversation. Missing input shows “No side declared”; bots declare their own side. The claim is the target's declaration. Undercover/Alien bluffing remains permitted. Backend records the decision in a new immutable overlay; this review is not a rule source.

## Minimal server contract

Vote results need an authoritative phase with a durable result ID, originating vote phase ID/kind/round, explicit aggregate outcome, selected/tied public seats where appropriate, and server `startedAt`/`endsAt`. Election/runoff, release, Jail, all-abstain and no-selection results must be distinguishable without deriving the outcome from counts. A skipped vote publishes no result. The last round's result precedes terminal role/Code disclosure. Results have no gameplay command offers; host abort remains available. Next gameplay starts with its full clock.

Hack needs audience-scoped declaration capability and private state identifying the interaction, viewer's participation, target's own submission receipt, and the initiator's declared-side/no-declaration result. Public/host/display/third-party projections remain neutral. All target phones use the same choices; Backend enforces truth obligations privately. The projection binds the result to the current interaction/phase and supplies authoritative deadlines. It must not carry actual faction, role, or a verified-truth flag.

## Consumer behavior

Use server phase/result identity; never compare `lastTally` structure to identify a new result. Countdown uses the existing trusted clock. Reconnect renders the remaining window in a settled state; no client timeout advances the game or restarts a result. Deadline expiry waits for the next authoritative view. Announcements identify equal successive tallies by result identity and do not replay obsolete results after reconnect.

Hack choice, partner, receipt and declaration are rendered only in the authorized private layer with current, unexpired facts. Blur, stale/unreadable state and audience changes conceal them. Concealment must leave unresolved command IDs and receipt recovery intact. Claim wording stays distinct from Hacker Scan. Private assets load uniformly.

Wardrobe selection uses public location only. Authoritative `jailed`, health, elimination and Captain markers remain independent. A released Injured occupant waiting in Jail wears the Jail variant without gaining a Jailed marker. The drawing port consumes reviewed Designer source pins and manifest changes; prototype controllers remain excluded.

## Dependencies

Connected result/declaration code depends on the exact reviewed Backend contract head. Drawing/token integration depends on the exact Designer export/source head and Integration's reviewed port guard. Independent short-phone layout measurements and development fixtures can proceed before those handoffs. No shared contract, canonical rule, root dependency, Designer source, deployment or IAM changes are owned by this Frontend patch.

## Early proposal review

The proposal in `/private/tmp/gamen-playtest-feedback-contract-proposal.md` uses protocol 2, separate 1.4 vote / 1.5 Hack tuples, `VOTE_RESULT`, `HACK_DECLARE`, `HACK_RESULT`, `HACK`, public `voteResult`, and participant-only `hackFeedback`. Its sequence, current-only feedback, aggregate outcomes, continuation barrier and historical compatibility match the requested consumer behavior. Source adoption still requires the exact schema head.

Concrete schema details requested: `legalTargets.DECLARE_HACK_SIDE` containing only the authorized target's own seat; uniform Blue/Red/Alien controls; explicit participant perspective or a stable invariant that `activeSeatId` is the initiator throughout the exchange; strict current-phase/exact-tuple binding of feedback. The result heading uses the originating `voteResult.round`, not an upcoming round. A release result shows supplied yes/eligible counts without fabricating No/abstention totals. No other blocking contract gap was found in this early proposal.

Integration clarified that the existing before-voting movement permission continues during the Hack prelude. The consumer keeps room-tag Move wherever the authoritative view offers it, without changing the fixed Hack partner. Code stays blocked in the prelude; `VOTE_RESULT` blocks all gameplay. Movement must not be disabled merely by a `HACK_DECLARE`/`HACK_RESULT` phase name.

## Visual adoption status

The early Codex-produced source at `44c25268a04debaa00d6a7ec3f02d254775704c8` and exact Root guard commits are preserved as provisional dependencies. The owner subsequently confirmed Motion/Graphic Design ownership in their Claude Code session. Further visual adoption is paused pending Integration's verified Claude-owned head. The preserved frame/wardrobe/compact wrapper is not claimed as the owner's current design or visually accepted. Its first whole-phone pass still had four short-phone confirmation overflow cases; subsequent wrapper edits are saved but final fit is not claimed. Backend consumer and compatibility logic can proceed independently.
