# Board-v2 position and medical prerequisite — issue #142

This draft implements the reviewed position/medical proposal on branch `codex/backend-board-medical`, starting clean at actual SHA `9d23adb14a30227984720c459891d00510451475`. The pinned capsule worktree remains at that SHA. The deployed ancestor is `37f573afca9023e8e4a92375375cea96638d120f`. The PR identifies the final tested candidate and executed results.

## Rule and version authority

The final closed owner packet SHA-256 is `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743`; G-05/G-07/G-09 and its rules-contracts take precedence. Implementation is authorized by #139/#142. Integration confirmed the separate protocol 2 / `full-game-1.7.0` / `in-person-v1-board-medical-2026-10-14` allocation on #143. The immutable overlay is `rules/overlays/board-medical-owner-decision-2026-10-14.json`, SHA-256 `82be55c66a9925712d4cce1e1a56ff4f7aae001c363c2ba93e3267b6e6e70275`, parent exact 1.6. Logical layout identity is `board-v2-0.1.1`; no mutable layout authority or art is added.

All executable historical tuples 1.0.1 through 1.6 retain their pins, placement, medical persistence, release ballot, Final Zone, snapshots and replay behavior. Their public/player seats omit `slotId` and `medical`. The historical 1.0.0 contract-only snapshot remains supported as before. The default engine tuple stays 1.3; the existing explicit runtime profile stays 1.5 with its existing assets. No new runtime profile is accepted.

## Authoritative checkpoints

`slots.ts` validates complete rosters, compatible unique slots and retained bodies. It preserves existing occupants and holes; an entrant takes the lowest free place. Initial and simultaneous assignments use ascending player number without sorting the stored roster. A/B/Jail have five places, Command one for a Healthy free Captain, Hospital the starting roster count. The public capacity helper requires the starting count for this tuple's Hospital label. No Final Zone is valid on 1.7.

A fresh unblocked injury creates a private numbered episode and immediately changes logical location to Hospital, including a detained player. The old slot is invalidated at actual departure even when Rescue later returns that player to the same room in the same batch. The final atomic checkpoint frees healed beds, assigns Hospital/Jail entrants and places ordinary returners numerically. Unchanged occupants/bodies retain slots. A free returner uses the last actual A/B room, falls back to the other when full and remembers that actual fallback. Forced transfers spend no move.

An active episode admitted R1–R4 is due after the following normal round's Rescue and R3 Supply stages. A successful Rescue clears it; later injury creates a fresh episode. No-op Rescue, detention, retries and reload do not extend it. Second damage eliminates before Rescue. Due death bypasses protection. R4 injury receives R5 Rescue; fresh R5/showdown injury has no new death round or Rescue window. The engine preserves actor order, Main Action then Shot, Rescue, R3 Supply, due death, placement and full-stage victory.

Detention remains `jailed`. Voting against an Injured patient changes detention without removing them from Hospital; healing sends that detainee to Jail. Physical Jail occupants plus detained Injured Hospital patients awaiting return cannot exceed five. Restored missing/duplicate/wrong-room slots, impossible detention obligations, missing/invalid episodes, a Healthy free player stranded in Jail/Hospital and invalid rounds fail before projection, command, deadline or abort processing. Internal incomplete placement exists only inside an atomic resolution.

Showdown keeps actual rooms/slots and detention. Every living participant may register the existing special shot, bypassing room/Command and ordinary injury/detention restrictions. Stored R5 order resolves the entire registered batch, including shots from already-Eliminated shooters. Existing protection and full-stage victory apply. There is no extra aging or Rescue stage afterward.

The reviewed public fields are only per-seat `slotId` and `medical: null | { admittedRound, rescueDueAfterRound, rescueOpportunity }`. Public/player placement facts are identical. The server computes NEXT_NORMAL_ROUND, CURRENT_NORMAL_ROUND, NO_ADDITIONAL_ROUND or CLOSED from the current episode/round/phase. Recovery does not start a client age timer or replay a prior transition. Private episode count/number and action/source identities never enter these fields. A final Healthy snapshot cannot convey transient injury plus Rescue; authoritative sanitized outcome events remain companion work.

## Verification boundary

The PR reports actual commands, counts, failures repaired and limits at its exact candidate. Relevant commands include `npm run verify`, `npm run check:browser-dependencies` and `npm run package:backend -- --verify-install`. New tests are automatically included by existing engine and Auth/Firestore globs; no suite or timeout is removed or weakened.

The engine tests use legal 7/8/9 command/deadline histories, deterministic replay and explicitly labeled synthetic malformed-state/slot edges. Service cases use real loopback Auth/Firestore and transactions: native create/admission/joint placement/staged setup with injected randomness/clock, then immutable pins across restart; separately labeled synthetic initial SETUP fixtures followed only by actual service commands/deadlines. They exercise contention, receipts/recovery, public/private Rules, medical/detention histories, due death, full Hospital showdown and replay. Synthetic initialization is not native randomness evidence. Direct service UIDs and Auth/Firestore Rules are not HTTP token validation or automatic Tasks/Functions delivery proof; CI retains those separate historical suites.

## Adoption dependencies

Frontend and Claude Balance received the exact early proposal on #143/#142/#5. Frontend accepted the reader boundary at [comment 6168098225](https://github.com/Amirkianfar66/GameN/pull/143#issuecomment-6168098225), including truthful Hospital-detention result copy and snapshot-only static status; no extra field was requested. Integration reviewed the fields/version allocation at [comment 6167993044](https://github.com/Amirkianfar66/GameN/pull/143#issuecomment-6167993044) and requested the same-batch departure/earlier-hole regression, now present. Independent Claude Balance and executed-code/integration review remain final gates; local tests do not replace Claude Balance's audit or prove human social balance.

This inactive prerequisite cannot expose the incompatible legacy remote RELEASE ballot. Only 1.7 omits those phases/commands. The approved direct physical-Jail Captain RELEASE/EJECT commands, independent global usage flags and real off-board nullable placement require a focused companion before combined activation. No substitute power or fake room is introduced here. Blackout, Clone, sanitized outcome events, immutable art pairing and connected Board-v2 consumer/phone acceptance remain separate dependencies. No owner decision is reopened or unresolved ordering invented.

No creation profile/default/art activation, cloud configuration, IAM change, deployment or merge is included.
