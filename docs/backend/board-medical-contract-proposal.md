# Board-v2 slots and medical lifecycle — issue #142

Status: concrete provisional contract for affected Frontend, Claude Balance and Integration review. Reversible draft implementation/tests may proceed; no shared adoption, creation profile/default/art activation, merge or deployment is authorized by this document.

Branch `codex/backend-board-medical` starts clean at `9d23adb14a30227984720c459891d00510451475` (#140), preserving that worktree. Deployed ancestor is `37f573afca9023e8e4a92375375cea96638d120f`. Rule authority is the final owner packet `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743`, G-05/G-07/G-09 and rules-contracts, with implementation authorized by #139/#142. No owner decision is reopened.

## Proposed separate version

Propose protocol 2 / engine `full-game-1.7.0` / ruleset `in-person-v1-board-medical-2026-10-14`, parent exact 1.6 capsule tuple. Integration must confirm this allocation and final immutable overlay/hash/art binding. Pinned 1.6 behavior is unchanged. The tuple binds logical layout `board-v2-0.1.1`; the future reviewed immutable manifest maps that identity to geometry, with no mutable layout or pixel authority in a view.

## Public and player snapshots

Add exactly two required, new-tuple-only properties to each public seat:

```ts
slotId: 'A1' /* A1..A5, B1..B5, J1..J5, C1, H1..H{playerCount} */;
medical: null | {
  admittedRound: 1 | 2 | 3 | 4 | 5;
  rescueDueAfterRound: 2 | 3 | 4 | 5 | null;
  rescueOpportunity: 'NEXT_NORMAL_ROUND' | 'CURRENT_NORMAL_ROUND'
    | 'NO_ADDITIONAL_ROUND' | 'CLOSED';
};
```

Public/player projections contain identical authorized placement/medical facts. Slots match the physical `location`, are unique, and never change for an unchanged occupant. Existing `playerCount` supplies starting capacity. Existing `jailed` supplies detention; no extra detention flag. Hospital capacity is starting roster size; A/B/Jail remain five and Captain-only Command one. Retained bodies count. No Final Zone location is valid on this tuple.

`medical` is non-null exactly while Injured; every Injured player is in Hospital, including detainees. `admittedRound` is the authoritative current episode's admission, not the client's first observation. Admissions R1–R4 have `rescueDueAfterRound = admittedRound + 1`; new R5/showdown injuries have null, with no sixth round or extra Rescue window. `CURRENT_NORMAL_ROUND` means the due normal round is in progress, `NEXT_NORMAL_ROUND` a later normal round remains, `NO_ADDITIONAL_ROUND` the terminal exception/showdown, and `CLOSED` an ended/aborted match. The server computes the indicator from the episode, round and phase. Reconnect receives the same current deadline/indicator; clients do not invent age or a wall-clock countdown. This expresses a rescue opportunity, not a guaranteed rescue or revival.

Healthy and Eliminated seats have `medical: null`; Hospital bodies keep their numbered place. Healing atomically returns a detainee to Jail or a free patient to last actual A/B with fallback. Match-end/recovery views retain actual positions and settle presentation without historical animation replay. No medical field identifies an attacker, Cracker, protection source, role, private command or event ordering.

Legacy tuples through 1.6 omit both properties, including null-valued forms. Strict schemas reject absent new fields, wrong room/slot, out-of-roster H slots, duplicates, invalid medical round/indicator combinations, injury outside Hospital and impossible detention-return capacity. The public capacity helper will accept an optional starting `playerCount`; new-tuple Hospital labels require it, with no guessed five-bed fallback. Existing callers/tuples retain their existing behavior.

## Private authoritative state

Each new-tuple seat stores `slotId`, `medicalEpisodeCount` (starts zero), and nullable `medicalEpisode: { number, admittedRound, deathDueAfterRound }`. Healthy-to-Injured increments the count, creates the episode and changes logical location to Hospital in the same damage step. Successful Rescue clears the active episode; later fresh injury creates a new number/deadline. No-op Rescue, detention or reload cannot extend an episode. Second unblocked damage eliminates before Rescue; it clears the active episode and keeps the body in Hospital. Lifetime count and episode number remain server-only.

During one unprojected atomic resolution the engine may stage slot assignments as health/room changes occur. At the final checkpoint it frees departing beds, retains unchanged valid slots, allocates Hospital entrants and healed Jail returns, then places ordinary returners in ascending player number. New final assignments commit together. This preserves immediate logical Hospital injury and canonical entry/return ordering without exposing an incomplete room/slot snapshot. Immediate MOVE, detention and election transfers allocate their lowest free slot transactionally.

All persisted states have one compatible slot per on-board seat. Physical Jail occupants plus detained Hospital patients awaiting return cannot exceed five places. Invalid restored states fail invariants. Forced transfers consume no voluntary move; accepted moves and all G-09 boundaries inherit exact 1.6 behavior.

## Medical and showdown order

Keep stored actor order, role Main Action then ordinary Shot, followed by Rescue and existing R3 Supply. Apply due episode deaths only afterward, bypassing defenses, then finalize placement and evaluate full-stage victory. R2 injuries are due after R3 Rescue, R4 after R5 Rescue; fresh R5/showdown injuries have no aging deadline. No extra normal round, treatment window or aging tick follows showdown.

Showdown keeps actual rooms/slots/detention. All living participants retain the existing special shot; only those shots bypass room/Command and ordinary injury/Jail restrictions. Register all before resolution in stored R5 order, including shots from a shooter eliminated earlier in the batch. Protection retains its approved showdown behavior. Clone remains a separate companion implementation; no new Clone claim is made here.

## Captain/off-board companion boundary

The final rules require direct physical-Jail RELEASE/EJECT and deferred EJECT faction reveal. This medical prerequisite cannot enable the old remote selected-prisoner release ballot. On the inactive 1.7 candidate, legacy `RELEASE_CHOICE`/`RELEASE_VOTE` phases and commands are unavailable. The dependent Captain PR must provide the approved commands before combined activation; this is not a complete standalone new ruleset release.

Proposed companion schema for review: retained eliminated seat with `location: null` and `slotId: null` explicitly means off-board (never a fake room); `health: Eliminated`, no Captain, and faction may remain null until the normal reveal checkpoint. Match-wide independent RELEASE/EJECT used flags survive Captain replacement. Commands target the committed living detained physical-Jail set; EJECT then clears all physical Jail bodies/slots. Medical detainees are excluded. Review these fields separately before adopting them; this PR adds no off-board representation or Captain command yet. Blackout, Clone and sanitized room outcomes remain separate dependencies.

## Review and acceptance

Frontend: review `slotId`, medical names/statuses and capacity-helper starting-count input; bind existing Designer anchors without allocating/caching slots; use the authoritative opportunity after reconnect and latest slot for capsule return. Claude Balance: independently audit 7/8/9 initial allocation, bodies/holes, competing moves, atomic forced returns, Hospital-only injury, detained vote/heal/return, episodes/no-op/second hit, Rescue-before-death, R2/R3/R4/R5/showdown, full-batch victory and exact historical controls. No claims about human social balance.

Backend will run meaningful contract/engine and real Auth/Firestore journal/recovery/receipt/competition tests, production exclusion/package checks, full verification and CI on a clean candidate. Report actual results, not planned/manual cases as passed. Keep the #140 candidate and all existing creation/deal/match/art pins intact.
