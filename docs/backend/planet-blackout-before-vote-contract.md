# Blackout before voting: successor contract

Status: technical contract prepared for affected-role review. Integration accepted the minimal shape for implementation with the publication-round invariants below; Frontend review and exact checkpoint adoption are pending. Gameplay order is owner-confirmed in [the recorded decision](../specifications/planet-successor/blackout-before-vote-owner-decision-2026-11-10.md); this document does not activate it. Implementation starts from `19564d0c618dae9995bbd92979d248e82dba0a8f` on `codex/backend-blackout-before-vote`, stacked on PR #210. The exact owner record was adopted as `7958c9f590b2bf0e074cd32c67ce0bf0202b6279` from Integration's `8685e5fb12bfa64c609442d6cd7acb6e5052d54e`.

## Minimal wire change

Use a separate exact protocol-3 tuple: engine `planet-game-1.3.0`, ruleset `in-person-planet-blackout-before-vote-2026-11-10`, authority/ruleset SHA-256 `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`. Export `PLANET_BLACKOUT_PINS` and independent creation profile `blackout-before-vote-1.3` as `PLANET_BLACKOUT_ENGINE_PROFILE`. Inherit the 1.2 private offers and the 1.1/P27/P28/private-feedback semantics explicitly. Preserve all predecessor tuple registration, saved packets, source bytes, creation defaults, setup versions and asset selection.

No new phase, duration, input command, receipt code or targeting geometry is needed. `BLACKOUT` remains a server-owned 15,000 ms phase with its existing `blackout.windowId`, `previewEndsAt = startedAt + 5,000` and `endsAt = startedAt + 15,000`. Selection uses the existing `SELECT_BLACKOUT_SLOT` command during the half-open dark interval; an accepted receipt is registration/choice acknowledgement, not a published hit or resolved round.

Only the new tuple adds required `board.checkpoint` metadata to public and player board packets. Historical tuples omit the property entirely. For this tuple, existing `board.finalizedRound` is explicitly the round of that shared physical publication, including partial checkpoints; it does not mean that the round's queued actions have all resolved. Old tuples retain their existing bytes and meaning. Values identify the latest shared physical publication:

| Value | Meaning |
| --- | --- |
| `INITIAL` | Initial dealt board, finalizedRound 0. |
| `PRE_BLACKOUT` | Publication round equals the current round. Selected post-turn/Sync physical board used by the targeting preview; damage and ordinary resolution are pending. It is already present during actual Sync presentation, and otherwise is published when the lit window opens. |
| `AFTER_BLACKOUT` | Publication round equals the current round. Blackout damage/defenses and actual physical admission/offices are committed; ordinary queued actions, Rescue and normal finalization remain pending. This remains the resolution category through Jail voting/result. The full public physical snapshot is republished with actual Jail transfers/reservations and office consequences when those commit; it is not an immutable pre-vote roster. |
| `ROUND_FINALIZED` | Publication round is the completed round. Remaining attacks/actions, Rescue and normal finalization have completed; navigation can proceed. That completed publication round is carried forward through the next round's election/turns until its pre-Blackout publication. |

`PLAYER_CURRENT` still means the actor's authorized current world. Its checkpoint metadata identifies the last shared publication, just as `finalizedRound` already does; it does not certify a speculative/current actor board as the completed shared resolution. The public board remains the complete authorized physical snapshot, with no duplicate slot/seat patches. A checkpoint is not a new cinematic deadline or permission to auto-advance.

`planetCheckpointMatchesPhase` binds the checkpoint/publication-round pair to the exact phase. Initial publication persists through first-round turns/talk; PRE_BLACKOUT belongs to Sync presentation/Blackout; AFTER_BLACKOUT belongs to Jail voting/result; completed-round publication belongs to navigation/end or the subsequent election/turns/talk. Abort preserves the last authorized category and publication round. Tests enumerate these pairs and reject partial metadata mislabeled as full completion or carried into the wrong phase.

## Authoritative phase sequence

Turns and final private talk close movement/Captain/panel submission at existing boundaries. Optional whole-reality Sync selects costs and actions together, followed by its full six-second presentation. Then open the same complete Blackout window whether or not any request is admitted. Publish its neutral targeting board before the lit preview. No Jail ballot is open yet.

At the Blackout deadline, one atomic transition commits only the complete Blackout batch, four-bed placement/overflow and resulting office/eligibility changes, publishes `AFTER_BLACKOUT`, evaluates giver-only Meet at the actual vote-opening opportunity, and opens a fresh full 60,000 ms `JAIL_VOTE` from actual processing time. Late delivery must not shorten that vote. Jail ballot closure retains its separate full 5,000 ms result. The result deadline calls the remaining resolver once, then ordinary navigation. There is no second Blackout window after that result.

Private state records round/window identity, the frozen logical occupancy/health snapshot, admitted request identities in existing stored actor order, each first choice or timeout/miss, lifetime consumption and completion. It is never a public/private-view field. Ineligible untargeted requests cancel before admission without lifetime spending. Both admitted strikes survive actor changes caused by this batch; both choices are captured before damage. Retain every valid target/miss against the snapshot, rather than acquiring a later live occupant. Stale/duplicate deadlines and accepted command retries cannot repeat costs, damage, defenses, publication or vote creation.

Do not call the full physical resolver twice. Partial settlement cannot resolve queued Protection grants, ordinary shots, Rescue/panel reservations, Supply, due-death aging, faction reveal, Clone expiry or No survivors. Earlier Hospital admission is final: bodies retain beds, new candidates compete in canonical numeric seat order, and a full four-bed Hospital causes immediate permanent offboard overflow before any later reserved Rescue. Later finalization retains accepted actions even if actors were incapacitated.

## Audience and eligibility preservation

Blackout timing/checkpoint categories are common, independent of hidden requester count, selections or misses. Only an admitted Disabler sees its existing private picker and own use/choice. Room defense cues remain cause-neutral and use the target's actual physical room immediately before impact, including retained bodies and excluding later entrants, outsiders, the nonparticipating host and shared display. Use canonical subject publication and common checkpoint timestamps; expose no attacker, defense source, inventory, faction, Code, branch or route.

Living Injured/Jailed players retain voting and pre-navigation final-Code permissions under the existing rules; Eliminated players are excluded from ballots. Actual forced Hospital transfer can change giver-only Meet at vote opening. Jail/election/appointment Promise scopes and window permissions do not change. In seven-player mode there is only one Disabler; dual-Disabler cases apply to eight/nine players.

## Review and adoption

Integration and Frontend review the exact tuple/checkpoint contract before implementation depends on it. Frontend owns exact tuple dispatch, presentation/loaded-art assertions, checkpoints, reconnect and connected consumer acceptance. Integration owns native source approvals/fences. Backend does not edit those files or enable this profile. All relevant workers and the reviewed consumer must support already-saved sessions before any separately authorized new-match activation; rollback of creation selection must retain that capability.

Engine/projection/service tests will cover seven/eight/nine players, native and constructed controls separately, frozen admission, both strikes where applicable, defense order/audiences, full Hospital before later Rescue, competition for the last bed, Meet after forced movement, P18 during the window, no premature finalization, retry/deadline scheduling and historical replay. Connected/emulator evidence is required in addition to pure tests; human balance and physical-device checks are distinct and must be reported as actually run or not run.
