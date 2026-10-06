# Game Balance review of the shared contracts, fixtures and draft engine

**Reviewer:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code, model `claude-opus-5-5`.
**For:** Codex Astra, Backend and Integration (INT-003, issues #2 and #13).
**Date:** 6 October 2026.

**Status: reviewed, with one required change, eleven questions that only the owner can answer and eighteen working readings for the owner to confirm. This is not an adoption approval.** Nothing here changes a shared file. Every change is a request to the integration owner, and every rule question goes to the game owner. The matching requests are in [integration-requests.md](integration-requests.md).

Two things were reviewed, against the rulebook in [game-rules.md](game-rules.md):

| Part | Reviewed | At |
| --- | --- | --- |
| A | `packages/contracts/src/{protocol,views,presentation,fixtures}.ts`: wire protocol 1 and the Officer and Protection fixture | `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4` |
| B | `packages/contracts/src/full-game.ts` (wire protocol 2) and `packages/engine/src/full-game/` | Draft PR [#16](https://github.com/Amirkianfar66/GameN/pull/16), commit `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde`, unmerged |

Part B was requested by PR #16 ("Frontend and Game Balance review protocol/rule adoption"). It was reviewed in a throwaway copy of that commit made with `git archive`; no worktree or branch was touched. Findings about a draft may be out of date once the draft changes.

## Summary

The draft is careful about secrecy. No disclosure defect was found in either part, and every decided rule that the scenarios exercise is implemented as the rulebook states it. The evidence is in [evidence/2026-10-06-baseline.md](evidence/2026-10-06-baseline.md).

What needs attention is at the edges of what has been decided. PR #16 says that no Version 1 rule decision remains unapproved. That is true of V1-01 to V1-21. It is not true of the game. Eleven questions have no answer in any source, and the draft engine already answers eight of them in code: D11, D12, D15, D16, D17, D20, D34 and D35. Eighteen further points are answered only by reading the sources closely. The engine agrees with every one of those readings that a scenario exercises, and the owner has not been asked to confirm them.

| ID | Topic | Kind | Needed by |
| --- | --- | --- | --- |
| [BAL-C01](#bal-c01) | `shotAvailable` means two different things | **Required** | Adoption of protocol 2 |
| [BAL-C02](#bal-c02) | Both public schemas accept states the rules make impossible | Needed | Engine and projection tests |
| [BAL-C03](#bal-c03) | The ruleset hash does not bind the baseline rule sources | Needed | Any evidence that cites the pin |
| [BAL-C04](#bal-c04) | The engine lets Supplier name themself | Owner decision D11 | Complete Version 1 |
| [BAL-C05](#bal-c05) | A Supplier with one neighbour | Owner decision D12 | Complete Version 1 |
| [BAL-C06](#bal-c06) | Captain runoffs repeat without limit | Owner confirmation D13 | In-person playtests |
| [BAL-C07](#bal-c07) | A Healthy but Jailed player satisfies the Healthy-member requirement | Owner confirmation D14 | Complete Version 1 |
| [BAL-C08](#bal-c08) | Nothing ends a match that can no longer be won | Owner decision D15 | Complete Version 1 |
| [BAL-C09](#bal-c09) | Movement is accepted during a Captain election | Owner decision D16 | Complete Version 1 |
| [BAL-C10](#bal-c10) | No window closes early, ordinary turns included | Owner decision D17 | In-person playtests |
| [BAL-C11](#bal-c11) | The public view has no turn order | Owner decision D20 | Table display |
| [BAL-C12](#bal-c12) | The public Hack phase names only the initiator | Question | Table display |
| [BAL-C13](#bal-c13) | The result carries no cause; no private post-match export exists | Needed | Playtest records |
| [BAL-C14](#bal-c14) | Sixteen further working readings are implemented without confirmation | Owner confirmation D21 to D33 and D36 to D38 | Complete Version 1 |
| [BAL-C15](#bal-c15) | The fixture expectation omits Protection consumption | Advisory | None |
| [BAL-C16](#bal-c16) | The first election is labelled Round 2 | Advisory | Display copy |
| [BAL-C17](#bal-c17) | Fixture provenance labels | Advisory | None |
| [BAL-C18](#bal-c18) | A special shot cannot be aimed at the shooter | Owner decision D34 | Complete Version 1 |
| [BAL-C19](#bal-c19) | An aborted match reveals neither roles nor the Code | Owner decision D35 | In-person sessions |

"Required" means Balance will not treat the contract as adoptable until it is answered. "Needed" has a workable interim, stated under the item. An owner decision is a question no source answers; it is not Backend's to make and not Balance's either. An owner confirmation is a reading of the sources that the rulebook states and the engine implements, and that the owner has not yet been asked about.

## Part A: protocol 1 and the Officer and Protection fixture

### Accepted as written

Each item was checked against the rule named.

- **The command is a direct shot.** `RegisterShotSchema` carries a target and nothing else. It is a strict object, so a request with an identification, a faction guess or a damage value does not parse (R-SHOT-01, R-SHOT-06).
- **The fixture is a legal nine-player deal with powers off.** Five Blue roles with Officer, three Red, one Alien (R-SETUP-04, R-SETUP-15).
- **The Officer's Round 2 shot is legal.** Own turn, one shot, target in the same room and not in Command Room (R-ROLE-11, R-SHOT-02).
- **The Protection is legal.** Granted by Undercover in Round 1, active from Round 2, one receipt for life (R-PROT-01, R-PROT-02, R-PROT-05).
- **The expected outcomes are right.** Protected target stays Healthy; unprotected target becomes Injured; the Officer's shot is spent either way (R-PROT-03, R-SHOT-05).
- **Registration is invisible to everyone but the Officer.** Public view, target view and their event lists are identical before and after (R-VIEW-07).
- **Protection never appears in the target's view.** When the fixture was written this was a cautious default. V1-17 has since made it the rule (R-PROT-06).
- **Only confirmed durations are encoded.** Sixty seconds for an ordinary turn and no deadline for resolution.

### BAL-C01

**`shotAvailable` means two different things.**

In protocol 1 the field is the remaining resource. The slice engine sets it to `true` for an Officer whose turn it is not, and its README says so: "`shotAvailable` means remaining resource, not current eligibility". In protocol 2 the same name means "a shot can be registered right now": it is `false` for the same Officer outside their own turn.

Measured on 6 October: with Officer not the active player, the protocol-1 projection gives `shotAvailable: true` and the protocol-2 projection gives `shotAvailable: false` with `ordinaryWeapons: 1`.

The rules keep these apart. Holding a weapon is a resource (R-SETUP-13). Being allowed to fire needs the own turn, the round window, a Healthy and free shooter and a legal target (R-SHOT-02 to R-SHOT-04). The two come apart visibly for an Officer who has fired and then receives Supplier's weapon: one weapon held, and no shot for the rest of the match (R-ROLE-11).

**Required:** one documented meaning per field name across protocols. Either rename (`ordinaryShotsRemaining` for the resource, `canRegisterShotNow` for eligibility) or state the protocol-2 meaning in the contract and retire the protocol-1 one. Frontend raised the same field as FE-C05.

**Interim:** the scenarios read `ordinaryWeapons` for the resource and the legal-target list for eligibility, and never `shotAvailable`.

### BAL-C02

**Both public schemas accept states the rules make impossible.**

Each of these was accepted by `PublicViewSchema` (protocol 1) and by `FullPublicViewSchema` (protocol 2) when applied to an otherwise valid view:

| State | Rule it breaks |
| --- | --- |
| Two Captains | R-CAPT-02, R-CAPT-07 |
| An Injured Captain | R-CAPT-07 |
| A Jailed player located in Room A | R-STATE-06 |
| A player who is not Captain inside Command Room | R-MOVE-04 |
| A player in the Final Zone in Round 2 | R-SHOW-01 |

Protocol 1 also accepts an Eliminated active player and an ordinary turn with no active player. Protocol 2 correctly refuses a faction revealed for a living player.

A schema does not have to carry every rule. But the audience views are the only thing a client sees, and Frontend has no way to know these combinations cannot occur.

**Needed:** adopt the cross-field statements INV-LOC-01, INV-LOC-02, INV-LOC-03 and INV-EL-03 in [invariants.md](invariants.md), either as schema refinements or as a required projection test in Backend's suite. Balance's `checkState` already implements them and found no violation in the draft engine. Frontend's FE-C13 is the same gap seen from the client.

### BAL-C15

**The fixture's server-only expectation omits Protection consumption.** `resolutionExpectation` records the target's health and the Officer's remaining shots. R-PROT-03 also uses up the Protection. An engine that left it active would satisfy the fixture and block a second attack that should land. Adding `protectionConsumed: true` to the protected variant closes that. Advisory: Backend's own engine tests already assert it.

### BAL-C17

**Provenance labels.** `fixtureProvenance.baseCommit` is the commit the bootstrap task started from, `0a4ff9a…`, not `BASE_SHA`. The fixture's `rulesetHash` is the source-manifest hash under a name that suggests a compiled ruleset. Both are documented in the baseline and harmless in a fixture. Evidence from a real run must state the engine commit and both hashes itself, as the reports under [evidence/](evidence/) do.

## Part B: protocol 2 and the draft engine

### What was run

- Backend's own 79 engine tests, rerun in the copy: 79 passed, 0 failed.
- The scenarios of `tests/scenarios/v1/`: every `ready` case that an engine can execute passed, in each of the three modes separately; none failed. Blocked and manual cases were not counted as passed.
- Seeded random playouts with the invariants checked after every transition: no violation, and the engine's legal-target hints agreed with what it accepted in every case.

Exact counts, commands and pins are in the evidence report. These runs show agreement between the draft engine and the rulebook on the cases exercised. They do not show that the engine is correct in general, and they say nothing about balance.

### Disclosure checks that found nothing

| Checked | How |
| --- | --- |
| A secret registration changes only the actor's view | INV-VIEW-03 on every accepted command; twelve command types |
| A refused command changes nothing | INV-VIEW-05 on every refusal |
| Revisions move only with content | INV-VIEW-04 |
| The public payload carries no role, faction, weapon, Protection, Code, ballot or hint | INV-VIEW-01 structural scan on every observation |
| Role knowledge reaches only its role | INV-VIEW-02; scenarios `SETUP-03`, `SCAN-06`, `PROT-06`, `SUP-01` |
| A faction is public exactly when its player is Eliminated | INV-EL-04; `DIS-03`, `VIEW-02` |
| Roles and the Code appear only when the match is finished | INV-VIEW-07; `WIN-01`, `SHOW-07`, `CODE-08` |
| Ballots are private until the totals | `VOTE-05`; no per-voter field exists in any view |
| A refusal reveals nothing hidden | By reading: every refusal depends on public facts or the actor's own state. The one exception is a second Protection for the same player, which only Undercover can attempt and already knows |
| Public health events do not reveal the order of attackers | By reading `services/game-api/src/full-game.ts` at `230cc39`: events are derived from the net difference of the view, in seat order |

The last row is a property of the Firebase branch, not of the engine. It is worth writing into the contract: events for one transition are emitted in an order that does not depend on resolution order.

### BAL-C03

**The ruleset hash does not bind the baseline rule sources.**

`FULL_RULESET_HASH` is `6ca355eb…`, the SHA-256 of the owner-decision overlay alone. `rules/in-person-v1-manifest.json` records that hash twice, as `owner_decision.sha256` and as `ruleset_hash`, and lists the baseline manifest hash beside them. `scripts/check-sources.mjs` asserts that the two are equal. Only `ruleset_hash` travels with a match.

The Version 1 rules are the baseline, six overlays and the owner decision together. If any of the seven baseline files changed, the source manifest hash would change and the match pin would not. Two matches under different rules could carry the same `rulesetHash`.

**Needed:** pin a value that commits to both, for example the SHA-256 of `rules/in-person-v1-manifest.json` itself (`451fc57e…` at `8d4a2e5`), which already contains both hashes.

**Interim:** every Balance report records the source manifest hash and the overlay hash separately.

### BAL-C04

**The engine lets Supplier name themself.** Probe `SUP-08`, all three modes: `SUPPLY` naming Supplier and one other player was accepted.

V1-13 lists the actions that may target the actor (Scan, Protection, Rescue) and those that may not (shots, Disabler, Hack). Supplier is in neither list. V1-16 requires two different same-location recipients and does not exclude Supplier. This is D11. It matters: self-supply guarantees Blue one weapon.

### BAL-C05

**A Supplier with one neighbour.** Probe `SUP-09`: with one other player in the room, naming that player and someone in another room was refused, and naming that player and Supplier was accepted. The command needs exactly two recipients. If D11 is answered "no", such a Supplier can distribute nothing and Blue has no ordinary weapon for the match. This is D12.

### BAL-C06

**Captain runoffs repeat without limit.** Scenario `CAPT-09` passes in all three modes: three tied ballots each led to another runoff among the tied pair, and a runoff in which nobody voted elected nobody. That is what the sources say. The baseline repeats the runoff "until one candidate has the highest vote", and V1-04 adds that "an all-abstain ballot elects nobody". Each runoff is a 60-second window, and nothing but the table ends a tie. D13 asks the owner to confirm that no limit and no tie-break is wanted. It is a real risk at a table.

### BAL-C07

**A Healthy but Jailed player satisfies the Healthy-member requirement.** Scenarios `WIN-06` and `SHOW-16` pass in all three modes. With every Blue player Healthy and Jailed, Alien free and no Red player Healthy and free, the engine gives Blue the Power win at the Round 5 check. With every Red player Eliminated and the only Healthy Blue players in Jail, it gives Blue the showdown. The engine's source says this is deliberate.

It is also what the sources say when read closely. The requirement is "at least one Healthy member of that actual team"; Jail "is separate from health"; and Jailed players are set to zero only in the Power formula. The rulebook states this as R-WIN-11. D14 asks the owner to confirm it, because the reading decides matches. No other executed scenario ends with a winner whose only Healthy players are Jailed.

### BAL-C08

**Nothing ends a match that can no longer be won.** By reading, not executed: when no victory condition can still be met, including when nobody is left, the engine runs the remaining phases to Round 5, opens the showdown and records a Draw. No source says otherwise, and no source says this either. This is D15. The damage arithmetic in the audit makes it rare before the showdown.

### BAL-C09

**Movement is accepted during a Captain election.** Probe `MOVE-05`: accepted. The rule allows a move "at any time before voting begins"; the election is a vote at the start of the round. This is D16.

### BAL-C10

**No window closes early, ordinary turns included.** V1-09 keeps vote windows open to the deadline. No decision covers an ordinary turn or a Hack conversation, and the engine holds both for the full minute. By the clock alone a nine-player match with nobody eliminated lasts at least 51 minutes. This is D17: a pacing question for the owner, to be informed by the first playtests.

The other part of D17 was probed. `FLOW-10`: after the Captain had chosen a prisoner, the release-choice window stayed open to its deadline. No source says whether it should.

### BAL-C11

**The public view has no turn order.** It names the active player only. The architecture document says the table shows turn order. With powers off the order cannot change any resolution (R-RES-04), but it decides who can still claim one of a round's two Hack conversations. Whether the order is announced is D20.

### BAL-C12

**The public Hack phase names only the initiator.** The partner is visible to the two participants and to nobody else. At a table the pair is in plain sight, so a shared display that cannot name them looks broken. Either add the partner to the public facts of that phase or record that it is private on purpose, and whether that is meant to hold for remote play.

### BAL-C13

**The result carries no cause, and no private post-match export exists.** `result` is the winner and the Alien co-win flag. The playtest record needs the victory cause and checkpoint, one row per attack with its defence, and counts for Scans, Hacks, Protection and the Code. All of it is in the server journal and none of it is exported. Request BAL-REQ-2 lists the fields. Until it exists the facilitator records what the table can see and the rest stays empty.

### BAL-C14

**Sixteen further working readings are implemented without confirmation.** The engine agrees with the rulebook's readings D21 to D33 and D36 to D38:

- D21 to D29: the Code extras are drawn at random; only Undercover and Officer start armed; Red players do not know each other apart from Hacker knowing Undercover; Disablers work from Round 1; Protection may be granted every round; a Round 5 Protection never activates; Jail has no time limit and continues into the Final Zone; a correct Code with no Healthy Red wins nothing and removes Blue's Power win; a cast ballot is final.
- D30 to D33: a Scan is Hacker's Main Action, so it needs Hacker's own turn and a Healthy, free Hacker; an ordinary weapon is spent when its shot is registered; a Captain inside Command Room cannot Scan, protect or Rescue themself; a Captain may leave Command Room to either room.
- D36: a Code submission and a Hack request change no other player's view. The Captain's release choice changed no other view in any run either; that part cannot be told apart from D17.
- D37 and D38: no window opens that nobody could use, so there is no election while nobody is an eligible candidate and no release choice without a Captain, an unused request and a prisoner; and a release takes effect when the release vote closes, so the freed player can be voted back into Jail in the same round.

Each follows from the sources and each is a choice the owner has not been asked to confirm. D21 is the exception in one respect: a selection method cannot be shown by single cases, and no scenario exercises it. The scenarios that assert each reading, and the number of further scenarios that use it on the way, are in [scenario-traceability.md](scenario-traceability.md#working-readings-and-the-scenarios-that-touch-them).

### BAL-C16

**The first election is labelled Round 2.** The engine advances the round before the election, so the public view reads "Round 2, Captain election" for what the baseline calls the end of Round 1. Advisory. It affects display copy and D16.

### BAL-C18

**A special shot cannot be aimed at the shooter.** Probe `SHOW-15`: a `SHOWDOWN_SHOT` naming the shooter was refused. V1-13 excludes self-targeting for ordinary shots, Disabler attacks and Hack, and does not mention the showdown's special shot. This is D34. It matters at the edges: a player who must not help either side has no way to waste the shot except by not shooting, which the rules already allow.

### BAL-C19

**An aborted match reveals neither roles nor the Code.** Probe `OPS-03`: after a host abort the public view carried no end reveal. V1-18 discloses roles and the Code "only at match end", and V1-12 calls an abort a recorded result without a winner. Whether an abort is a match end for this purpose is D35. At a table the players will simply tell each other; the question is what the app and the record show.

### Checked, no change requested

- Protocol 2's commands are strict objects, like protocol 1's shot command: a `REGISTER_SHOT` that carries an identification, a faction guess or a damage value does not parse. The first version of the fixtures had a scenario for this. It was withdrawn because it tests the wire contract and not a rule; the property is recorded here instead.
- Protocol 2's schema allows a ballot with no target and a release ballot with no answer: an explicit abstention. The rules name only the missing ballot (R-FLOW-08), so the scenarios send none. If a client offers an explicit abstention, the rulebook's reading is that it is a ballot and therefore final (R-VOTE-09). That is worth a line in the contract.

- A participant eliminated during the showdown keeps an unused special-shot flag in server state after the match is finished. No audience sees it. Balance's first version of INV-EL-03 flagged it; the invariant was over-broad and was corrected, as recorded in the evidence report.
- A Protection grant is held as a queued command until its round resolves, so Undercover's Protection list shows it from the next round. Undercover still sees their own pending registration. Consistent with V1-17.
- Under V1-06 a Captain who is targeted outside Command Room and then walks in is still hit. `LOCK-03` passes. It is the decided rule and likely to surprise players; see the audit.

## What this review did not cover

- Authentication, security rules, receipts, retries, scheduling and seat recovery. Backend owns them; Frontend reviewed the client contract.
- The Firebase service on PR #17, apart from the event-ordering reading above.
- Any device, any browser and any human.
