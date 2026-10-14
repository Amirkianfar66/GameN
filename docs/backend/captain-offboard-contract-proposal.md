# Direct Captain powers and off-board companion — issue #145

Status: concrete documentation-only proposal for Integration, Frontend and Claude Balance review. This PR prepares the dependent contract required by #142 item 5. It implements no command/schema/runtime, reserves no version and enables no creation/default/art profile. The direct-power implementation and executed acceptance remain outstanding.

Actual clean start is #143 candidate `f953c1565acc13c7cbe8c00c3b1c90cc67818881`, parent capsule #140 `9d23adb14a30227984720c459891d00510451475`, deployed ancestor `37f573afca9023e8e4a92375375cea96638d120f`. Preserve those worktrees and exact tuples. The final closed owner packet is `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743`, especially Q-P01a/Q-P01/Q-P02, G-06 and rules-contracts Captain/detention/disclosure sections. These decisions are settled; this proposal supplies implementation details rather than reopening gameplay.

## Commands and availability

Propose targetless intents in the existing command envelope:

```ts
{ type: 'CAPTAIN_RELEASE' }
{ type: 'CAPTAIN_EJECT' }
```

Only the current Healthy/free Captain, physically in Command, during their own ORDINARY_TURN and before its authoritative deadline may use a command. At least one living detained physical-Jail occupant must exist and the relevant global allowance must be unused. Role Main Action, ordinary Shot, Hack and movement resources are independent. Main Action use does not disable an otherwise legal office command. Other turns, Hack, elections/votes, Blackout, showdown and terminal phases do not admit these commands. Revalidate against committed state after any preceding move/command.

Reuse `legalTargets.CAPTAIN_RELEASE = [self.seatId]` and `legalTargets.CAPTAIN_EJECT = [self.seatId]` as availability, following targetless PASS_TURN's existing convention. The command carries no client-selected prisoner/list, location, effect or resource result. Availability is not sufficient to distinguish Used from temporarily unavailable. Propose one required future-tuple-only player-private field:

```ts
self.captainCommandUses: null | { releaseUsed: boolean; ejectUsed: boolean }
```

It is non-null for the current Captain, null otherwise, and survives reconnect/title replacement through server flags. Used treatment is distinct from temporary unavailability. No extra match-wide public allowance field is needed. Frontend must review this exact reader field before shared adoption.

## Private authoritative state

Propose future-tuple-only required fields:

```ts
captainPowersUsed: { releaseUsed: boolean; ejectUsed: boolean };
pendingCaptainReveal: null | { round: number; seatIds: SeatId[] };
```

Both uses start false; neither resets on round/title change. Keep legacy release-ballot state/semantics exact on old tuples. New direct powers use the dedicated flags, never manufacture a selected-prisoner ballot. `pendingCaptainReveal` contains only fresh living EJECT victims, without roles/factions in the public record. Its round is the current normal round; IDs are unique retained off-board Eliminated seats. It clears at the complete normal resolution reveal checkpoint, before victory/next round/showdown. A match aborted before that checkpoint retains its existing no-end-reveal behavior and never reveals the pending factions merely due to reload.

The existing private journal records the exact captured set, result and predecessor through deterministic replay; no new public source/attacker identifier or mutable client list is authoritative. Final state validation rejects a pending reveal that has survived into a later round/showdown/finished state. Terminal FINISHED still reveals exact roles/Code under existing rules.

## Retained off-board seats

Propose only the future tuple widen per-seat placement to:

```ts
location: ExistingOnBoardLocation | null;
slotId: CompatibleSlotId | null;
```

`location:null` and `slotId:null` together mean off-board. That seat is retained in the starting roster and identity/Code/history, is Eliminated, is not Captain, has no current detention and has medical:null/no active episode. Its private episode count and accepted action/resource history remain intact. Normal bodies keep their actual room/slot until explicitly cleared by EJECT. No Final Zone, fake room, hidden tombstone player or replacement seat is introduced. Historical 1.0.1–1.7 continue to reject null placement; new slot assertions explicitly version-gate off-board seats.

The public faction is null for a fresh EJECT victim until the normal reveal checkpoint; an already revealed corpse cleared off-board keeps its known faction. On-board Eliminated seats retain existing reveal requirements. Off-board placement never grants early role/Code disclosure. The private pending set, not a client inference, controls deferral. Public schemas permit an unrevealed off-board Eliminated seat on this future tuple; private checkpoint invariants guarantee timely clearing.

Existing Code validation retains all original seat identities, including an off-board seat. Frontend needs an accessible retained-identity/history target for Code without drawing an eliminated person in a fake playable room. Other living-target commands, movement, room capacity, room-event recipient sets and showdown eligibility exclude off-board seats. Already registered actions from an EJECT victim remain in the queue and resolve under registration-time locks, including effects that can change full-stage victory.

## Atomic results

RELEASE captures all living detained physical-Jail occupants. Clear detention, then return the complete set by ascending player number to last actual A/B with other-room fallback and lowest free slots. Remember actual fallback; preserve existing occupants/bodies/holes and each voluntary move allowance. Hospital detainees and physical Jail bodies are excluded and retain their places/obligations.

EJECT requires at least one living detained physical-Jail occupant, then eliminates that living set and clears every physical-Jail occupant, including previously Eliminated bodies, into explicit off-board placement. Clear current detention for removed seats; never remove a Hospital patient or Hospital body. Bypass defenses and clear active medical episodes only for eliminated victims. Leave previously registered actions in the batch. Fresh factions stay private until the normal reveal checkpoint; no immediate/intermediate victory evaluation occurs.

Empty Jail, bodies-only Jail, only medical detainees, invalid timing/title/location and already-used commands reject without changing state or spending the allowance. An accepted command spends exactly its own global allowance atomically. After RELEASE, a subsequent EJECT normally finds no eligible living target and spends no use; reverse order is analogous. Competing new IDs observe transaction order; exact retries recover the same receipt before phase/eligibility checks, and conflicting ID reuse cannot change intent.

## Preserve the existing victory formula

Deferring victory does not itself broaden Alien's simultaneous-elimination condition. The historical owner overlay `in-person-v1-owner-decisions-2026-10-06.json` defines both actual factions losing their final survivor in the same complete resolution stage/checkpoint. Current `resolveRound` captures faction survivors at entry; `evaluateVictory` explicitly refuses to infer simultaneity merely because both factions are absent. Do not silently move that baseline to round start or add an Alien-last-survivor shortcut.

Independent Balance/Integration review must bind direct-command stage accounting before implementation: compare one atomic EJECT that removes both actual factions' last survivors against EJECT removing one faction followed by a later registered effect/due Hospital death removing the other. Record actual complete-stage before/after evidence under the existing formula, including deferred evaluation; identify any needed private journal/state evidence rather than inventing a public fact or gameplay exception. This proposal does not assign an unreviewed winner to those companion cases. They are an explicit implementation/audit dependency, not an unresolved owner rule or a change to frozen 1.7.

## Event and consumer boundary

Publish neutral current health/placement facts atomically. Existing PUBLIC_MOVE has non-null locations and no gameplay tuple; widening it globally would change legacy event contracts. Proposed companion implementation must avoid emitting a physical-room PUBLIC_MOVE for an off-board transition. A strict current snapshot supplies nullable placement; existing authorized neutral health facts may still be emitted. Do not replace null with a fake destination to satisfy an old event schema.

Sanitized authoritative Captain/medical outcome events and their version/audience/recovery semantics remain the explicit event companion before cinematic adoption. Snapshot differences cannot manufacture an EJECT, attack, defense or Rescue film, or reveal a hidden cause. No new event type is adopted by this document. Source/publication ordering must not disclose pending EJECT factions or hidden registered effects. Reconnect settles current off-board/room facts, use state and receipts without replaying historical animation.

## Version and acceptance gate

Integration must allocate a new exact gameplay tuple and immutable overlay/hash after this contract review. Do not silently add these powers/null fields to frozen 1.7, mutate its hash or activate its incomplete rule slice. Preserve default/profile/deal/asset pins and all historical snapshots/receipts/journals. Blackout, Clone, event delivery, common art and connected renderer/phone acceptance remain separately inventoried dependencies.

Planned, not executed by this documentation PR: separate legal 7/8/9 engine and real Auth/Firestore histories for full/bodies-only/empty physical Jail, medical exclusion, independent global uses across Captain replacement, after-Main-Action timing, canonical multi-return/capacity fallback, unchanged voluntary allowance, concurrent commands/move/title races, accepted EJECT victims firing registered actions, deferred faction reveal, normal full-stage victory, Code identities, seat recovery/receipt lookup/restart and complete journal replay. Include strict old-null/old-field rejection and actual event-publication guards. Require affected Frontend and independent Claude Balance expected-outcome review, complete verification/CI and final Integration adoption.

No cloud configuration, IAM/access change, deployment, merge or new-match/profile/art activation is included.
