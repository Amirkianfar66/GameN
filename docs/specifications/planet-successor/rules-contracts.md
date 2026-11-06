# Planet successor state and disclosure contract

The new protocol is separate from historical protocol 2. Integration owns shared schemas. Backend and Frontend review the actual exported types before adoption. The following boundaries are mandatory implementation invariants.

## State ownership

| State | Scope and Sync behavior |
| --- | --- |
| Original roster, secret roles/factions, fixed Code, identities | Immutable match authority. Never redeal on a fork, retry, reconnect or Sync. |
| Current round, server phases/deadlines, saved turn/election order | Global. Generate and persist new round orders as needed; no five-element save or max-round validation. |
| Movement spent, accepted Officer block/history | Global round bookkeeping; block fixed before branches. Voluntary location/slot changes belong to the actor's world. |
| Blackhole lifetime use and activation-round Role Action consumption | Global; inherited by every world. Never restore by discarding a world. |
| Scan knowledge/use/cooldown, final Code attempt, Code unlock | Global private Hacker progression. Do not expose guesses, Code membership or cooldown to others. |
| Health, detention, location/slots, injury episodes, bodies, admission/reservations, pending physical actions | Full per-world state. No target-world join, origin-filter reconstruction or per-field cherry-picking at Sync. |
| Weapons, damage, Protection, Clone, Engineer, Supply, Captain command flags, Hack Spaceship override/use, ordinary action costs | Per-world; copy complete current values/reservations, retain selected state's effects and costs together. Pre-fork consumption stays consumed in descendants. |
| Healing inventory and reservations | Two initial injections shared by Doctor and panel within each world; no cross-world summation, refill or extra panel pool. |
| Patient panel attempt | Global per-player lifetime flag; retained even if its queued heal/cost are not selected. |
| Standard Hack use/count, conversations and accepted Promise records/quotas | Global with their original audiences. Promise resolution uses final state at the relevant opportunity, not speculative fulfillment. |
| Shown window images | Global append-only records through this round; viewers still need that window's endpoint permission. |
| Finalized public board | Global snapshot with explicit finalized-round/checkpoint label. Live clock/turn/talk are separate. No projected reality IDs. |

Each player has one private assigned-reality pointer while Blackhole is active; everybody starts in Original. A/B crossing creates a new world copied from the world the actor leaves and assigns only that actor to it. Other assigned players are unchanged. One voluntary movement per round bounds crossing count. Same-room repositioning changes no reality. At Sync sample a uniformly distributed world index from recorded authoritative randomness, replace active physical state with that entire world and collapse pointers. Do not weight by population or deduplicate identical worlds.

All commands authenticate seat ownership server-side. Registration validates against the actor world; never grant a cross-room exception from differing reality membership. Fixed target registrations survive later actor injury/Jail/death and target movement, subject to the approved Blackout cancellation and final target-health/defense checks. Responses and audience events never disclose a speculative effect to a target in another world.

## Audience contract

Public: version/match/phase/clock, live active seat, public offices and accepted block, globally public private-talk pair, last finalized neutral board, published aggregate ballots, authorized resolved public outcomes, movement-completed round and terminal result. No arm/direction/weights, hidden actors, branch IDs/counts, role-linked timing or resource deltas.

Player: authorized board for their own world without reality labels, own role/faction/information/resources and exact legal command offers; own navigation view only when currently entitled as Captain/Officer; own Promise pairs and permitted windows. Never attach the entire authoritative state, other player packets, secret grants or alternate worlds.

Reveal only resolved outcomes. Command acceptance means registration, not damage/heal/block. On reconnect use current views/deadlines without replaying completed cinematics or resetting availability.

## Post-Sync presentation timing

After an actual Blackhole Sync, publish `BLACKHOLE_PRESENTATION` for exactly 6000 milliseconds, using the normal authoritative phase ID and timestamps. The selected board is already current and the Sync outcome remains anonymous; publish no chosen-world identifier or branch count. No Jail ballots are offered or accepted in this phase. Ordinary non-Blackhole rounds go directly to voting.

On its deadline, open a separate `JAIL_VOTE` with 60000 milliseconds from its actual authoritative start and settle meeting Promises at that voting opportunity. Persist the presentation phase and deadline intent atomically with the Sync state. Duplicate, stale and delayed tasks must not resample Sync, repeat effects, reopen submissions or reduce the vote's duration. Reconnection consumes the existing phase interval; it never creates a new six-second wait.

## API and persistence

Commands use match ID, unique command ID, phase ID and exact protocol; UID is taken only from authentication. Deduplicate the same actor/command and reject ID reuse with different input. Journal, authoritative state, audience views and deadline outbox update atomically. Stale/early/retried tasks cannot advance the wrong phase or double-spend. Sampling is an explicit trusted recorded input, never client randomness or recomputation on replay.

Existing games and saved states dispatch through their pinned historical tuple. Candidate profile is opt-in for new matches until combined release verification. Never widen an old tuple's accepted roles, rounds or payloads. Studio/private-authoring APIs do not write runtime authority.

Technical choices such as stable internal IDs, schema validation, bounded drawing payload size and transaction ordering do not add gameplay powers. Any real semantic contradiction discovered during implementation must be reported with a concrete example, without reopening already-settled choices.

