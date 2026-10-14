# Direct Captain commands and authorized outcomes — inactive 1.8 candidate

Actual clean starting SHA: `82998e6be14166a01d7fd60960c56cf3656be4e1` on the preserved `codex/backend-captain-contract` branch. Historical worktree directories were absent; the registered replacement is `backend-completion`. The primary checkout and its pre-existing local files were preserved.

This implements the reviewed [Captain proposal](captain-offboard-contract-proposal.md), issue #145, and the closed original owner sources preserved separately in `d021584d1032b3f1c37f050ef2a1fdd50760bc9b`. Integration reserved the 1.8 successor on #139. This candidate inherits the exact 1.7 board/medical/Hack behavior; 1.9 Blackout and 1.10 Clone are separately reserved companions.

| Pin | Exact value |
| --- | --- |
| Protocol | `2` |
| Engine | `full-game-1.8.0` |
| Ruleset | `in-person-v1-captain-outcomes-2026-10-14` |
| Overlay SHA-256 | `0f84f61cf9407c45ccef7e99c28556d7ede64f06f7dd3284ca6782bbf7a5f030` |
| Parent ruleset SHA-256 | `82be55c66a9925712d4cce1e1a56ff4f7aae001c363c2ba93e3267b6e6e70275` |

## Command and projection contract

Targetless intents are `{type:'CAPTAIN_RELEASE'}` and `{type:'CAPTAIN_EJECT'}` inside the existing authenticated protocol-2 command envelope. `legalTargets.CAPTAIN_RELEASE/EJECT=[self.seatId]` signals availability, following the targetless Pass convention. Eligibility requires the Healthy/free current Captain's own ordinary turn in Command, an unused relevant match-global allowance and at least one living physical Jail prisoner. Invalid empty/bodies-only or stale commands spend nothing. Each accepted command affects its complete committed set without spending Main Action, Shot, Hack or movement.

Future-only required `self.captainCommandUses:null|{releaseUsed:boolean,ejectUsed:boolean}` is non-null only for the current Captain. It distinguishes Used from temporary unavailability. Other players receive null. Office replacement cannot replenish either independent allowance.

RELEASE returns all living physical Jail prisoners using their actual remembered A/B room, other-room fallback and numeric competing-return ordering. Hospital detainees and Jail bodies are unaffected. EJECT eliminates living physical Jail prisoners and clears every physical Jail occupant, including old bodies, to `location:null,slotId:null`. Such seats remain in the complete roster and Code identity set, with no current detention, office or medical episode. Recorded history/resources are retained. Frontend supplied the exact nullable copy compatibility hunk (`location ?? 'Off board'`); accessible history/Code rendering is a separate Frontend consumer deliverable.

Fresh EJECT victims' public faction remains null until the full normal checkpoint. Old corpses keep their already-known faction. Private actor/command-scoped before/after EJECT evidence records that actual atomic elimination stage. At the later normal checkpoint, its both-factions-lost proof is considered independently of the complete normal-stage proof, with the unchanged final Alien survival condition. Losses across two separate stages are never combined. Registered actions are preserved, and victory is never evaluated mid-EJECT. Abort retains neutral consequences and pending private evidence without disclosing factions or awarding a winner.

## Authorized events

Historical event schemas, including non-null `PUBLIC_MOVE`, remain exact. New outcome envelopes require the exact outcome-capable tuple in `versions`, the existing audience/revision, opaque audience-scoped `eventId===outcomeId`, and `publishedAt/expiresAt`. The freshness interval is a fixed 30 seconds, a technical delivery bound which grants no decision time and controls no animation duration. Durable publication uses the committed transaction's opaque journal event seed and visible audience ordinal; private actor identities and global outcome sequence numbers are absent.

Facts carry the public checkpoint `phaseId` and `round`:

- `CAPTAIN_OUTCOME:{kind:'RELEASE'|'EJECT',seatIds}` identifies the authorized command consequence.
- `MEDICAL_OUTCOME:{kind:'INJURY'|'HEALED'|'DEATH',seatId,health,presentationAnchor}` records genuine clinical changes, including injury then successful Rescue in one batch whose final snapshot is Healthy.
- `BOARD_PLACEMENT_CHANGED:{seatId,location,slotId}` represents current physical or retained null off-board placement, without widening the historical movement fact.

Frontend and Integration reviewed the required clinical `presentationAnchor:{kind:'CLINICAL_VIGNETTE',batchId,anchorId:'HV1'..'HV9',slotCount:7|8|9}`. It is a transient presentation namespace, never a persisted bed, roster occupant or legal target. All starting Hospital places (including bodies) reserve their corresponding HV anchors; new clinical subjects take lowest unused HV in public numeric player order. The unique union fits within the starting roster. Same subject/batch retains one anchor through injury/heal; final1.7 placement remains exact even when its actual H slot differs. Batch identity is opaque and audience-scoped, validity follows the envelope freshness window. The receiver also checks slotCount against current match playerCount. A dedicated vignette cannot cover active real-board targets; if the reviewed film geometry is unavailable, only a neutral announcement is consumed.

Medical/Captain facts contain no attacker, healer, grantor, hidden role, cause or receipt ID. Clinical facts are buffered through the complete stage. Publication sorts subjects numerically and retains each subject's actual clinical chronology; hidden actor order cannot determine cross-subject movie order. Every audience gets only its authorized projection/events. Room-defense facts and their frozen recipients follow in 1.9.

Reconnect restores current snapshots and original uncertain receipts. Consumers establish an initial event baseline, deduplicate occurrence IDs, reject expired events and cancel stale/background films; they do not replay historical cinematics. Event delivery does not replace authoritative state. Existing private receipt lookup remains before phase validation and throttling.

## Verification and adoption

The engine and Auth/Firestore suites separately label native staged setup, legal synthetic initial SETUP followed by service decisions, and constructed defensive victory cases. Native EJECT-victim ordinary damaging queues are not claimed: physical Jail has no such registration route in this timetable. Accepted unrelated queues and any reachable Hacker Code evidence remain separate controls.

Focused local checks: full TypeScript/build/source integrity pass; historical1.7 medical/slots132/132; final Captain engine87/87; strict contracts8/8; presentation-only clinical anchors9/9; final isolated Auth/Firestore60/60 (18 Captain, including3 native complete admission/joint draw/staged setups, plus42 historical1.7 medical). Zero skips/failures in the final focused runs. The initial dotted engine-version validator failure was fixed and rerun. The off-board used-resource restore guard was demonstrated red for all7/8/9 before the fix and green afterward. Full verification, full emulator groups and exact-head CI are the next checks; their results will be recorded rather than inferred from this focused evidence. Independent Claude Balance remains the game audit owner; Backend helper/test agents do not substitute for that acceptance. Frontend contract adoption, subsequent companion mechanics, common art pairing and final Integration release review remain distinct gates. Historical 1.0–1.7 behavior, tuples, source bytes, replay, prepared deals, default creation profile and immutable art pins are unchanged. No cloud/IAM/billing/deployment or merge is included.
