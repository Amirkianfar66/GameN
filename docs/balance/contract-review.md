# Game Balance review of the shared contracts, fixtures and draft engine

**Reviewer:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code, model `claude-opus-5-5`.
**For:** Codex Astra, Backend and Integration (INT-003, issues #2 and #13).
**Date:** 6 October 2026. Re-reviewed the same day, after the integration review, against the newer Backend and Frontend documents (Part C). Extended on 7 October 2026, after the next integration review, with the conditions for two contracts that are still to be written (Part D).

**Status: reviewed and re-reviewed. Balance requires no change to a shared contract. From the rules and disclosure side it has no objection to protocol 2 as it stands and as its handoff documents it. This is not an adoption approval: adoption is the integration owner's decision.** Two requests stay with Integration (BAL-C02 and BAL-C13). Nine open rule edges are the owner's, and none of them is an engine defect. Everything else is recorded for information. Nothing here changes a shared file. The matching requests are in [integration-requests.md](integration-requests.md).

Three things were reviewed, against the rulebook in [game-rules.md](game-rules.md):

| Part | Reviewed | At |
| --- | --- | --- |
| A | `packages/contracts/src/{protocol,views,presentation,fixtures}.ts`: wire protocol 1 and the Officer and Protection fixture | `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4` |
| B | `packages/contracts/src/full-game.ts` (wire protocol 2) and `packages/engine/src/full-game/` | Draft PR [#16](https://github.com/Amirkianfar66/GameN/pull/16), commit `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde`, unmerged |
| C | Backend's `contract-refinements-proposal.md`, `protocol2-client-handoff.md`, `contract-review-response.md`, `v1-decision-register.md`, `v1-rule-decisions-proposal.md` and `v1-implementation.md`; Frontend's `contract-re-review.md`, `protocol2-adoption-assessment.md` and `connected-v1.md` | The candidates of the integration review: `5adaf98f8412e2294f45e00f8fb7c4c515127226` (PR [#28](https://github.com/Amirkianfar66/GameN/pull/28)) and `8b97180038a37b798fbef345272a32e42c0d0853` (PR [#29](https://github.com/Amirkianfar66/GameN/pull/29)). The engine source, the contracts and the rule files are identical to `8d4a2e5` in both |
| D | The two contracts the integration review of 7 October asks for: Supplier's private result, and names and characters in the lobby | Backend's handoff at `a265c39` (PR [#55](https://github.com/Amirkianfar66/GameN/pull/55)), the hosted branch at `c8856242` (PR [#53](https://github.com/Amirkianfar66/GameN/pull/53)) and Designer's record at `4fa2ff3` (PR [#57](https://github.com/Amirkianfar66/GameN/pull/57)) |

Part B was requested by PR #16 ("Frontend and Game Balance review protocol/rule adoption"). It was reviewed in a throwaway copy of that commit made with `git archive`; no worktree or branch was touched. Findings about a draft may be out of date once the draft changes.

## Summary

The draft is careful about secrecy. No disclosure defect was found in either part, and every decided rule that the scenarios exercise is implemented as the rulebook states it. The evidence is in [evidence/2026-10-06-baseline.md](evidence/2026-10-06-baseline.md).

What needs attention is at the edges of what has been decided. V1-01 to V1-21 are approved and are not reopened here. Nine questions lie outside them: no approved source answers them. For seven the build already behaves one way (D11, D12, D16, D17, D20, D34 and D35); the other two are conduct at the table (D18 and D19). They are open rule edges for the owner, consolidated in [the audit](rules-audit-v1.md#open-rule-edges-consolidated). Sixteen further points are readings of the approved sources that the rulebook states and the engine implements. No decision is asked for those. Two more readings were added on 7 October with the finding that the engine tells Supplier nothing about the weapons they gave. D39 says when Supplier is told, and that a Supplier who has since been Injured, Jailed or Eliminated is told all the same. D40 says that a recipient is told of their own weapon and not of the other recipient's. Part D has the rest.

| ID | Topic | Kind | Needed by |
| --- | --- | --- | --- |
| [BAL-C01](#bal-c01) | `shotAvailable` means two different things | Closed on re-review: each protocol's meaning is now documented. Advisory for the next protocol | None |
| [BAL-C02](#bal-c02) | Both public schemas accept states the rules make impossible | Needed | Engine and projection tests |
| [BAL-C03](#bal-c03) | The ruleset hash does not bind the baseline rule sources | Withdrawn: the two hashes stay separate pins | None |
| [BAL-C04](#bal-c04) | The engine lets Supplier name themself | Open rule edge D11 | The owner, when they choose |
| [BAL-C05](#bal-c05) | A Supplier with one neighbour | Open rule edge D12 | The owner, when they choose |
| [BAL-C06](#bal-c06) | Captain runoffs repeat without limit | Approved rule, V1-04. An observation for playtests | None |
| [BAL-C07](#bal-c07) | A Healthy but Jailed player satisfies the Healthy-member requirement | Reading D14. No decision asked | None |
| [BAL-C08](#bal-c08) | Nothing ends a match that can no longer be won | The existing five-round and showdown structure. No change asked | None |
| [BAL-C09](#bal-c09) | Movement is accepted during a Captain election | Open rule edge D16 | The owner, when they choose |
| [BAL-C10](#bal-c10) | No window closes early, ordinary turns included | Open rule edge D17 | The owner, when they choose |
| [BAL-C11](#bal-c11) | The public view has no turn order | Open rule edge D20 | The owner, when they choose |
| [BAL-C12](#bal-c12) | The public Hack phase names only the initiator | Answered: private on purpose | None |
| [BAL-C13](#bal-c13) | The result carries no cause; no private post-match export exists | Needed | Playtest records |
| [BAL-C14](#bal-c14) | Fifteen further readings are implemented | Readings. No decision asked | None |
| [BAL-C15](#bal-c15) | The fixture expectation omits Protection consumption | Advisory | None |
| [BAL-C16](#bal-c16) | The first election is labelled Round 2 | Advisory | Display copy |
| [BAL-C17](#bal-c17) | Fixture provenance labels | Advisory | None |
| [BAL-C18](#bal-c18) | A special shot cannot be aimed at the shooter | Open rule edge D34 | The owner, when they choose |
| [BAL-C19](#bal-c19) | An aborted match reveals neither roles nor the Code | Open rule edge D35 | The owner, when they choose |

"Needed" has a workable interim, stated under the item. An open rule edge is a question that no approved source answers. It is not an engine defect and it is not Backend's or Balance's to decide: the build's present behaviour is an implementation choice, recorded here and not adopted as canon. A reading is what the approved sources say when read closely; the rulebook states it, the engine implements it, and no decision is asked.

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

**Asked at first review:** one documented meaning per field name across protocols: either rename, or state the protocol-2 meaning and retire the protocol-1 one. Frontend raised the same field as FE-C05.

**Closed on re-review.** This finding was written against the first handoff. Backend's `contract-refinements-proposal.md`, item CR-P2-02, now states both meanings: in protocol 1 the field is the unspent shot, and in protocol 2 it says that the ordinary-shot category is open now, which is true even when the list of legal targets is empty and false in the showdown. It tells a client to require `shotAvailable` together with a non-empty `legalTargets.REGISTER_SHOT`, and Frontend's connected flow does exactly that. Part C records what the engine was seen to do in each case. No rule and no audience boundary is involved: the field is in the player's own view, and the server decides every registration. Balance asks for no versioned schema change. If the field is ever renamed for another reason, two names that keep the resource and the eligibility apart would be clearer.

**Unchanged:** the scenarios read `ordinaryWeapons` for the resource and the legal-target list for eligibility, and never `shotAvailable`.

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

**Asked at first review:** pin a value that commits to both, for example the SHA-256 of `rules/in-person-v1-manifest.json` itself.

**Withdrawn.** The integration review decided to keep the overlay hash and the historical source-manifest hash as two separate pins. That answers the concern as long as both are always quoted together, which Backend's documents do and every Balance report does. The request for a combined pin (BAL-REQ-5) is withdrawn with it.

### BAL-C04

**The engine lets Supplier name themself.** Probe `SUP-08`, all three modes: `SUPPLY` naming Supplier and one other player was accepted.

V1-13 lists the actions that may target the actor (Scan, Protection, Rescue) and those that may not (shots, Disabler, Hack). Supplier is in neither list. V1-16 requires two different same-location recipients and does not exclude Supplier. This is D11. It matters: self-supply guarantees Blue one weapon.

### BAL-C05

**A Supplier with one neighbour.** Probe `SUP-09`: with one other player in the room, naming that player and someone in another room was refused, and naming that player and Supplier was accepted. The command needs exactly two recipients. If D11 is answered "no", such a Supplier can distribute nothing and Blue has no ordinary weapon for the match. This is D12.

### BAL-C06

**Captain runoffs repeat without limit.** Scenario `CAPT-09` passes in all three modes: three tied ballots each led to another runoff among the tied pair, and a runoff in which nobody voted elected nobody. That is what the sources say. The baseline repeats the runoff "until one candidate has the highest vote", and V1-04 adds that "an all-abstain ballot elects nobody". Each runoff is a 60-second window, and nothing but the table ends a tie.

This is the approved rule and not a question: the integration review confirms that repeated runoffs are explicit in V1-04 and the baseline, and that a limit would be a new rule. Balance proposes none. It stays on this list as something a playtest should time (audit, S-16).

### BAL-C07

**A Healthy but Jailed player satisfies the Healthy-member requirement.** Scenarios `WIN-06` and `SHOW-16` pass in all three modes. With every Blue player Healthy and Jailed, Alien free and no Red player Healthy and free, the engine gives Blue the Power win at the Round 5 check. With every Red player Eliminated and the only Healthy Blue players in Jail, it gives Blue the showdown. The engine's source says this is deliberate.

It is also what the sources say when read closely. The requirement is "at least one Healthy member of that actual team"; Jail "is separate from health", in the baseline and again in V1-02; and Jailed players are set to zero only in the Power formula. The rulebook states this as R-WIN-11. It is a reading (D14) and no decision is asked. Because it decides matches, the audit spells it out as consequence S-14, so that nobody meets it for the first time at a table. No other executed scenario ends with a winner whose only Healthy players are Jailed.

### BAL-C08

**Nothing ends a match that can no longer be won.** By reading, not executed: when no victory condition can still be met, the engine runs the remaining phases to Round 5, opens the showdown and records a Draw.

That is the existing structure, and the first review was wrong to list it as an open question. Five rounds, then the showdown, then a result or a Draw: nothing in the approved rules ends a match early except a victory or a host abort (R-WIN-12). A rule that ended an unwinnable match early would be a new rule; Balance does not propose one. The counting in the audit also shows that such a state cannot arise before the showdown with powers off (S-15). D15 is resolved, and the blocked case that waited on it is withdrawn.

### BAL-C09

**Movement is accepted during a Captain election.** Probe `MOVE-05`: accepted. The rule allows a move "at any time before voting begins"; the election is a vote at the start of the round. This is D16.

### BAL-C10

**No window closes early, ordinary turns included.** V1-09 keeps vote windows open to the deadline. No decision covers an ordinary turn or a Hack conversation, and the engine holds both for the full minute. By the clock alone a nine-player match with nobody eliminated lasts at least 51 minutes. This is D17: a pacing question for the owner, to be informed by the first playtests.

The other part of D17 was probed. `FLOW-10`: after the Captain had chosen a prisoner, the release-choice window stayed open to its deadline. No source says whether it should.

### BAL-C11

**The public view has no turn order.** It names the active player only. The architecture document says the table shows turn order. With powers off the order cannot change any resolution (R-RES-04), but it decides who can still claim one of a round's two Hack conversations. Whether the order is announced is D20. Backend's response to Frontend (FE-C17) defers a public turn-order field to a later versioned contract, so the present behaviour is a deliberate default and not an oversight.

### BAL-C12

**The public Hack phase names only the initiator.** The partner is visible to the two participants and to nobody else. At a table the pair is in plain sight, so a shared display that cannot name them looks broken. Either add the partner to the public facts of that phase or record that it is private on purpose, and whether that is meant to hold for remote play.

*Answered on 7 October 2026.* Backend's reconciliation (PR [#39](https://github.com/Amirkianfar66/GameN/pull/39) at `e6923b3`) records it: the partner is private to the two participants on the wire, plain sight at a table does not by itself authorize a public field, and a public shape would need an approved disclosure and a protocol review. Balance asks for no change.

### BAL-C13

**The result carries no cause, and no private post-match export exists.** `result` is the winner and the Alien co-win flag. The playtest record needs the victory cause and checkpoint, one row per attack with its defence, and counts for Scans, Hacks, Protection and the Code. All of it is in the server journal and none of it is exported. Request BAL-REQ-2 lists the fields. Until it exists the facilitator records what the table can see and the rest stays empty.

### BAL-C14

**Fifteen further readings are implemented.** The engine agrees with the rulebook's readings D21 to D28, D30 to D33 and D36 to D38:

- D21 to D28: the Code extras are drawn at random; only Undercover and Officer start armed; Red players do not know each other apart from Hacker knowing Undercover; Disablers work from Round 1; Protection may be granted every round; a Round 5 Protection never activates; Jail has no time limit and continues into the Final Zone; a correct Code with no Healthy Red wins nothing and removes Blue's Power win. That a cast ballot is final was listed here as a reading; it is V1-10, and D29 is resolved.
- D30 to D33: a Scan is Hacker's Main Action, so it needs Hacker's own turn and a Healthy, free Hacker; an ordinary weapon is spent when its shot is registered; a Captain inside Command Room cannot Scan, protect or Rescue themself; a Captain may leave Command Room to either room.
- D36: a Code submission and a Hack request change no other player's view. The Captain's release choice changed no other view in any run either; that part cannot be told apart from D17.
- D37 and D38: no window opens that nobody could use, so there is no election while nobody is an eligible candidate and no release choice without a Captain, an unused request and a prisoner; and a release takes effect when the release vote closes, so the freed player can be voted back into Jail in the same round.

Each follows from the approved sources, and several are stated in the same words by Backend's own handoff: that only sourced starting weapons are initialized, that Protection activates at the next normal round, that a Captain with an unused release opportunity selects one prisoner, and that a private registration leaves other views unchanged. No decision is asked for any of them. They are listed so that a different reading can be raised. D21 is the exception in one respect: a selection method cannot be shown by single cases, and no scenario exercises it. The scenarios that assert each reading, and the number of further scenarios that use it on the way, are in [scenario-traceability.md](scenario-traceability.md#readings-and-the-scenarios-that-touch-them).

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

## Part C: re-review against the current Backend and Frontend documents

The integration review of 6 October asked Balance to read the newer documents before anyone decides on a versioned schema change. Backend's refinement proposal also keeps a gate open for Balance: "Targeting/queued-kind categories and no new rule/disclosure". This part answers both. It looks at rules and at who may see what, and at nothing else.

### What was read and run

- The documents named in the table at the top, at the two candidate commits.
- `git diff` of the engine source, the contracts and the rule files between `8d4a2e5` and each candidate: no difference. The scenario evidence in [evidence/2026-10-06-baseline.md](evidence/2026-10-06-baseline.md) therefore applies to both candidates unchanged. The integration review ran the same fixtures against the engine in the Frontend candidate and reports the same result.
- One probe of a player's own view in the draft engine, for the field that BAL-C01 was about.

| Situation: nine players, the Officer's view | `shotAvailable` | `ordinaryWeapons` | `legalTargets.REGISTER_SHOT` |
| --- | --- | --- | --- |
| Round 1, another player's turn | `false` | 1 | Key absent |
| Round 1, own turn, nobody else in the room | `true` | 1 | Present and empty |
| Round 1, own turn, others in the room | `true` | 1 | 8 seats |
| The same turn, after registering the shot | `false` | 0 | Key absent |
| Round 4, own turn, having fired earlier and holding Supplier's weapon | `false` | 1 | Key absent |
| Showdown | `false` | 1 | Key absent; `SHOWDOWN_SHOT` lists 8 seats |

Every line is what CR-P2-02 says the field does. The field answers "is the ordinary-shot category open for me now", the weapon count answers "what do I hold", and neither is a licence to fire without a target.

### Positions on the four proposed refinements

| Proposal | Balance's position | Why |
| --- | --- | --- |
| CR-P2-01: restrict the keys of `legalTargets` | Supported. No rule is touched | Its ten keys are exactly the commands that name a seat in the rulebook: ordinary shot, Hack, Disabler, Protection, Supplier's two recipients, Scan, Rescue, special shot, a ballot and the Captain's release choice. Movement, the Code and a release ballot name no seat and have their own fields |
| CR-P2-02: `shotAvailable` with an empty target list | Keep the documented protocol-2 meaning. No versioned change is asked by Balance | See BAL-C01. Frontend's assessment reaches the same answer |
| CR-P2-03: `ownPendingCommands` with a kind and no target | Supported for the next protocol. No rule is touched, and nothing new is disclosed | A player may see their own registered actions (R-VIEW-04). The six kinds are the registrations that wait for a resolution stage: the attack stage, the Rescue stage, Supplier's stage and the showdown (R-RES-01, R-SHOW-05). Two conditions come from the rules and the proposal already states both: the entry disappears at resolution whatever happened, so that it never tells an attacker that a shot was blocked (R-VIEW-06); and it never reaches the public view or another player (R-VIEW-07) |
| CR-P2-04: one label for a lifecycle conflict | No position | It has no rule content |

So the gate can be closed from Balance's side: the targeting and queued-kind categories match the rulebook, and none of the three proposals adds a rule or a disclosure.

One question was left to Balance by Frontend's assessment: whether any hint in a private view is safe to show beside another. It is. Every legal-target hint depends on public facts and on the viewer's own state; no hint depends on another player's Protection, weapon, role or ballot. The one hint that reflects something secret is Undercover's own list for Protection, which leaves out players Undercover has already protected, and Undercover knows those. In 600 seeded playouts the hints equalled what the engine then accepted, with no mismatch.

### Statements in the handoff that touch a rule

| Handoff statement | Rule | Checked how |
| --- | --- | --- |
| A secret registration leaves the public view and other players' views unchanged | R-VIEW-07 | INV-VIEW-03 after every accepted command, in every executed scenario and playout |
| An accepted receipt says only that the command is registered: no hit, no defence, no cause | R-VIEW-06 | By reading the receipt schema; `PROT-06` for the attacker's view |
| No event carries a private target, a Protection, a role, the Code or a cause | R-VIEW-02, R-VIEW-06 | By reading only. The scenario adapter reads views, not the event stream |
| A finished match reveals exact roles and the Code; an aborted match does not | R-VIEW-08 for the first half. The second half is open rule edge D35 | `WIN-01`, `SHOW-07`, `CODE-08`; probe `OPS-03` |
| Windows close only at server expiry | R-FLOW-07 for votes and the showdown. For turns, Hack conversations and the release choice it is open rule edge D17 | `FLOW-03`; probe `FLOW-10` |

Nothing in the handoff, in the refinement proposal or in Frontend's three documents contradicts a rule in the rulebook.

### The two registers

Backend's `v1-decision-register.md` records RULE-001 to RULE-009 as confirmed by V1-01 to V1-21 and leaves RULE-010, Original Powers, for a later audit. Balance's register agrees row for row: D01 to D09 are resolved by the same decisions and D10 is deferred as outside Version 1. The crosswalk is in [the audit](rules-audit-v1.md#crosswalk-to-the-integration-register). Backend's register has no row for the nine open rule edges; request BAL-REQ-3 asks for them to be carried there or linked.

## Part D: the two contracts of 7 October

The integration review of 7 October names two shared contracts to be written, each "with Frontend and Balance review": a private result for Supplier, which its finding G17 requires, and public names and characters for the lobby, which the comic-board direction approved by the owner needs. This part was first written before either existed. It states what the rules require of each and which case checks it, so that the conditions were known in advance and not found in review.

Both contracts were published as drafts later the same day: the read of a seat's own acknowledgments in PR [#65](https://github.com/Amirkianfar66/GameN/pull/65), and the lobby identities in PR [#64](https://github.com/Amirkianfar66/GameN/pull/64). Each asks for Balance's review. The conditions below are unchanged from before the drafts; under each table is what the draft does with them. **The first holds every condition, by reading and by running. The second holds every condition by reading, and no case here can run against it.** It asks for no particular shape: the shape is Integration's.

### What was read and run

- The review itself, `docs/reviews/2026-10-07-all-agents.md` in the coordinator's checkout.
- Backend's handoff of 7 October, `docs/backend/v1-adoption-and-acceptance-2026-10-07.md` at `a265c39ba81be4805900e5c66c0f5c8e39ee5c64` (PR [#55](https://github.com/Amirkianfar66/GameN/pull/55)), which proposes the fix for G17.
- Frontend's records of the gaps it met, `docs/frontend/connected-knowledge-actions.md` and `connected-voting.md` at `c8856242caea349b620345349f6b59c7a87b6d7f` (PR [#53](https://github.com/Amirkianfar66/GameN/pull/53)).
- Designer's record of the owner's decisions, `docs/design/owner-decisions.md` at `4fa2ff3db5edff97feefa7bc12b7f2b627275c34` (PR [#57](https://github.com/Amirkianfar66/GameN/pull/57)).
- Designer's adoption of the approved direction, opened while this part was being written: the proposed crew catalog `design/contract/crew-catalog.json` and the proposed role-card text `design/contract/copy.en.proposed.json` at `ecbc0d703fa5e8b6b576e0b9eff6dc972761d3ea` (PR [#59](https://github.com/Amirkianfar66/GameN/pull/59), a draft). Read, not run.
- The engine of the hosted branch at `c8856242`, before the fix, against the scenario catalogue with its new cases. [The record of that run](evidence/2026-10-07-supplier-disclosure.md) has it.
- Backend's fix for G17 at `096bfa08ea6808977639e21fbdb93353c8b3d6cf` (draft PR #65): the contract `packages/contracts/src/own-acknowledgments.ts`, the projector `packages/engine/src/full-game/own-acknowledgments.ts` and the handoff `docs/backend/own-acknowledgments.md`. Read, and its built engine run against the whole catalogue: [the evidence report on the fix](evidence/2026-10-07-supplier-fix.md).
- Integration's adoption of the Balance gates for that fix at `f28d3e4ed5e9a582f70f52391b5449d2f89bb02e` (draft PR [#67](https://github.com/Amirkianfar66/GameN/pull/67)). It took the Balance directories as they stood at commit `7d63089` and patched the engine binding to the real read; that patch is taken over here.
- The lobby identities at `d9f49d9693f871ed3db26082be80e1d1879bf78e` (draft PR #64): the contract `packages/contracts/src/lobby-identity.ts`, the decision record `docs/decisions/2026-10-07-crew-identity.md`, and the places in `services/game-api/src/full-game.ts` where the identity document is written. Read, not run.

### Supplier's result (G17)

V1-16 says that Supplier's successful grants "are disclosed only to each recipient and Supplier". The engine of the hosted branch gave the weapons and told Supplier nothing, at any time. Balance confirmed the finding: seventeen new fixtures failed for that reason and no other. It also records its own part in it. The catalogue cited the rule and tested half of it; [the audit](rules-audit-v1.md#revision-4) says how, and checks the other disclosure rules for the same fault.

Backend proposed, and has now built, a durable record of the successful grants, made when Round 3 resolves, and a new read of a seat's own acknowledgments beside the protocol-2 view, which strict readers would otherwise reject. No rule decision is needed for it. What the rules require of it:

| # | Required of the contract | Rule | Checked by |
| --- | --- | --- | --- |
| 1 | When the Supplier stage has resolved, Supplier is told exactly which of the players they named were given a weapon: nobody before that stage, and not a player who was already Eliminated at it. Before the stage the list is empty, not absent | R-ROLE-20, R-ACT-06; the moment is reading D39 | `SUP-11`, `SUP-12`, `SUP-14` |
| 2 | Supplier is told whatever has happened to them since they registered: Injured, Jailed or Eliminated. V1-16 makes no exception, and the weapons are given all the same | R-ROLE-20, R-ACT-05; that V1-16 excepts nobody is part of reading D39 | `SUP-13`, `SUP-25`, `SUP-24`. That the weapons are given all the same is held apart, by cases that pass today: `SUP-10`, `SUP-19`, `SUP-18` |
| 3 | What a recipient is told is that they hold a weapon, and nothing more. **It must not carry the seat that armed them**: that tells another player who Supplier is. It must not carry the other recipient, whichever of the two was named first (reading D40) | R-ROLE-21, R-SETUP-05 | `SUP-17` and `SUP-26`, in every phase from the Supplier stage to the last vote of Round 5, for a Blue, a Red and the Alien recipient, and for a recipient who fires. `SUP-15`, `SUP-20` for the other recipient |
| 4 | Supplier is told that a player was armed and nothing about that player | R-ROLE-21, R-ROLE-07 | Four things are varied, and what Supplier is given must not change with any of them: the player's team (`SUP-22`), whether the weapon is of use to them, which would give away an Officer who has fired (`SUP-23`), the weapons they already held (`SUP-27`), and which of the armed players has fired (`SUP-29`). The receipt of Supplier's command is compared with the rest |
| 5 | Nothing that the table or any other player can read changes with whom Supplier armed, or with whether Supplier armed anyone: no marker, no count, no flag, no revision number, at any moment up to the last vote of Round 5, and not when an armed player is hurt or sent to Jail | R-ROLE-08, R-ROLE-21, R-VIEW-07 | `SUP-15`, `SUP-20`, `SUP-21`, `SUP-28`; INV-VIEW-03 on every accepted command |
| 6 | An Officer who has fired is still given the weapon, and Supplier is told of the Officer like anyone else. The weapon gives no second shot | R-ROLE-11, R-ROLE-20 | `SUP-14`, `OFF-02` |

**Held against the draft of PR #65.** The read gives Supplier one entry, `supplierResults`, with the seats that were armed and the identifier of Supplier's own command; it gives a recipient one entry, `receivedSupply`, that says a weapon was received in Round 3 and nothing else; it gives everyone else two empty lists. The binding now takes whom Supplier armed from that read and from nowhere else, and every comparison includes the whole read.

| # | In the contract | By running the catalogue against its engine |
| --- | --- | --- |
| 1 | The list is there and empty before the Supplier stage, and holds exactly the armed seats after it. A result with an empty list is kept apart from no result yet | `SUP-11`, `SUP-12`, `SUP-14` pass |
| 2 | The projector asks nothing about Supplier's health or Jail | `SUP-13`, `SUP-24`, `SUP-25` pass |
| 3 | A recipient's entry has no seat and no command identifier in it | `SUP-17`, `SUP-26`, `SUP-15`, `SUP-20` pass in every phase compared |
| 4 | Supplier's entry has seats and nothing about them. The handoff says so of failure reasons, timestamps and echoes of the request | `SUP-22`, `SUP-23`, `SUP-27`, `SUP-29` pass, receipts included |
| 5 | Another seat's read does not change, its own revision number included, and the handoff says an unchanged document is not rewritten | `SUP-15`, `SUP-20`, `SUP-21`, `SUP-28` pass |
| 6 | Nothing in the read says whether a weapon is of use | `SUP-14`, `SUP-23`, `OFF-02` pass |

All 516 ready fixtures pass against that engine, and each of the twenty-seven deliberate leaks, laid beside this real read, is caught. Balance has no objection to the contract and asks for no change to it. What Balance did not run is everything the service adds: who may read the document, its survival of reload, retry and seat recovery, and the refusal of an old or another identity. Backend reports its own emulator tests for those, and they are its evidence.

Condition 3 is the one a natural design gets wrong. A receipt that reads "you were armed by seat 4" is the obvious thing to write, and it reveals a role. `SUP-17` is there for it: the same two players are armed in two runs in which Supplier sits in different seats, and each recipient must be told the same in both, at the Supplier stage and on their own later turns. Condition 4 is the same mistake from the other side.

**A requirement the review makes that is not a rule: the result must last.** The integration review asks for "a durable private result", and Backend has built a record that it reports to survive reload and recovery. Balance agrees that it should. But no source says how long a disclosure is kept, so no rule row states it and no case here asserts it. A first draft of the rulebook revision had such a row as a reading; an independent reading judged it a new requirement, and it was withdrawn. Backend's tests for reload, replay and recovery are where it is shown.

What the cases reach, and what they do not:

- **Receipts are covered.** The binding keeps the receipt of every command for the player who sent it, and a comparison of two runs includes them. A first version did not, and an independent reading showed that a receipt saying more than "registered" passed every case.
- **Events are not.** The binding reads what each audience can read as views, any further read beside them once it is bound, and receipts. It does not read the event stream. That no event carries a grant has to be shown by Backend's own tests.
- **Seat recovery and a device that has lost its seat are not.** These are service behaviour. Backend lists them in its acceptance for G17, and they are its to test.
- **A fault that shows only in a state no case reaches is not.** The cases vary what is listed above. They were shown to catch twenty-seven deliberate leaks, and that is a list, not a proof; [the audit](rules-audit-v1.md#revision-4) says what a comparison cannot show.

If the owner decides that Supplier may name themself (open rule edge D11), condition 1 covers it without a change: Supplier was given a weapon and is told of themself among the armed.

### Names and characters in the lobby

The owner approved the comic-board direction on 7 October: the playing pieces are nine characters, each shown with its seat number and the player's name; a character "not related to role"; and the role as a device on the player's own character, "visible for that person alone". No contract carries a name or a character yet. The rules bear on one in these ways:

| # | Required of the contract | Rule or decision | Checked by |
| --- | --- | --- | --- |
| 1 | A seat's name and character are public facts of the seat, like its number. They are fixed before roles are dealt and never change with the role | R-SETUP-05; the owner's decisions 2 and 5 in Designer's record | `VIEW-04` to `VIEW-06` and `VIEW-08` to `VIEW-10`: two players change roles, and nothing the table or a player who may not know can read may change, in any phase of the first two rounds |
| 2 | Nothing about a role may ride on them: no character kept for or from a role or a team, and no order, default or refusal that depends on a role, a team or the Code | R-VIEW-02, R-SETUP-05 | The same cases: every role is one of the two in at least one swap, among them Alien and Undercover. `VIEW-07`, in which the Code is another |
| 3 | The role device is in the player's own view and nowhere else | R-VIEW-02, R-VIEW-04; the owner's decision 6 | The same cases; INV-VIEW-01 on every state |
| 4 | The seat number stays. Votes, targets and the Code name players by number | R-SETUP-06, R-SETUP-08; the owner's decision 3 | By reading the contract when it exists |
| 5 | The choice of a starting room still comes before the deal. The approved order is character, then role; V1-01 puts the room choice before the deal too | R-SETUP-07 | `SETUP-05` |
| 6 | A name is free text typed by a person. It must not reach a research record. The record validator now refuses `displayName`, `playerName` and `nickname` | The collection limits in [telemetry-spec.md](telemetry-spec.md) | The static check |

The seven cases pass, and they watch everything the engine projects for the table and for each player. A mark on each seat that follows the player's team, a mark that follows the Code, and a mark that always sits on one role's seat are among the deliberate leaks the cases are shown to catch. In the swaps with Alien or Undercover, the players to whom the rules give knowledge of them are left out of the comparison; `VIEW-10` keeps Insider in, and so holds that Insider is not shown which of the three players is which.

**Held against the draft of PR #64, by reading only.** The identities are a document of their own, `matches/{matchId}/identities/public`, written by the service and not projected by the engine. So the engine binding cannot read it, and **no paired case watches names or characters**: an earlier version of this part said they would, and that was wrong for the shape Integration chose.

| # | In the draft |
| --- | --- |
| 1 | The document holds, for each seat, its number, a name and a character, or neither. It may change in the lobby and is locked in the transaction that starts the match |
| 2 | A character is refused only because another seat holds it, and claims are taken in the order they arrive. The start passes the engine the setup and the starting rooms and nothing of this document, so the deal cannot read it; and it is locked before any role exists to follow |
| 3 | The document has no role, team or device in it |
| 4 | Seats are named by their number in it, and the game's commands are unchanged |
| 5 | The room choice of V1-01 is unchanged. Which comes first on a screen, the room or the character, is left to the consumer |
| 6 | The name is public free text of one to twelve characters, under the field name `displayName`. The record validator of the research export refuses that name |

Balance has no objection to it. Two things for whoever adopts it. A name may read like a role, as the decision record says; that is talk and no rule forbids it, and the playtest protocol now has the facilitator note it. And since no case can watch this document, that nothing in it follows a role rests on its construction and on Backend's own tests, which Balance read about and did not run.

Two cautions that Designer put on record for a reviewer and for Balance to weigh. Neither reopens the approval.

- **The rooms' colors include a red, a blue and a violet, which are also the teams' colors.** No rule is touched: a room's color is the same in every match and depends on nothing hidden, so it cannot disclose anything. What it can do is mislead, if a player takes the blue room for Blue's room. That is a question for people at a table, and the playtest protocol now asks it.
- **A private card can be seen over a shoulder, and the role device is large and carries the team color.** The rules already put secrets on the player's own phone. The risk is physical, and the protocol now has the facilitator record how the table sat and any time a screen was seen.

The rulebook has no row for names and characters yet. It says that each player has a public number "shown by a numbered seat card and a neutral numbered token" (R-SETUP-06), which the approved direction replaces with a character piece. Integration has now written the decision record that such a row can cite, `docs/decisions/2026-10-07-crew-identity.md` in PR #64. Balance will add the row when that record is on a branch the rulebook's sources are read from; until then a row would cite a file its own checks cannot find.

Designer's proposed catalog, `crew-0.1.0` in PR #59, states the same conditions from its side: a character is chosen before roles are dealt, is tied to no role, team, seat number or starting room, and is fixed when the match starts; a name is text a person typed. Balance read it and found nothing in it that a condition above forbids. One of its rules is new to this list and touches condition 2: a character that another seat holds is refused by the server. That is before any role exists, so it cannot follow one, and the cases will show it if a later change makes it do so.

### The role cards of the approved direction

The same PR proposes the text of all nine role cards and says that only a reader of the rules can tell whether they state the rules correctly. Balance read them against the rulebook at revision 4. This is a reading of nine short texts and not an approval, and the cards are Designer's and Frontend's to word.

**No card states something that a rule contradicts.** The team, the resources and the limits are right on all nine. Three remarks on what is there:

| Card | Its text | Against the rules |
| --- | --- | --- |
| Blue Disabler, Red Disabler | "choose a player in your location" | A Disabler names another player (R-ACT-04, from V1-13). The sentence can be read as allowing oneself; "another player" would settle it. The card's own note knows the decision, and its branch does not hold that file yet |
| Supplier | "Each receives one ordinary weapon, usable in Round 4 or 5" | True of every recipient who is still in the match when Round 3 resolves, and of use to every one of them except an Officer who has fired (R-ACT-06, R-ROLE-11). Fair as a summary. When the fix for G17 exists the card can add what Supplier is then told, and should promise no more than R-ROLE-20 does |
| Hacker | "In Round 5 you have one Code attempt: four players, in any order" | Right. The card promises no word on whether the attempt was right, and should not come to promise one (R-WIN-06, `CODE-11`) |

Left out, and worth a line where there is room, because each changes how the role is played:

- A Disabler may be used from Round 1; only ordinary weapons wait for Round 4 (R-ROLE-17, which rests on reading D24).
- Hacker's Code attempt may be made at any moment of Round 5, also when Injured or in Jail (R-ROLE-15).
- An Injured Cracker may still Rescue themself (R-ROLE-03).
- Alien adds one to Blue's Power while Healthy (R-ROLE-16).

### Three related gaps, for the record

Frontend's G14 and G18 and the review's G15 are the same kind of thing as G17 and are not rule defects. After a Captain's release choice, and after a Code attempt, the player's own view carries nothing that says what was entered; the last vote count stays in the public view without saying which round it is from. No approved source says that a player must be shown again what they entered, or that a count must name its round, so no case asserts either. Backend treats them as follow-ups inside decisions already made, and Balance agrees. One caution, if the read built for G17 later carries a Code attempt as well. It should say that the attempt was recorded, and not whether it was right. V1-08 has the Code evaluated with the other victory conditions after Round 5's effects, so there is no verdict to show before then, and Backend's own paired check found that no view tells a right attempt from a wrong one at the time. `CODE-08` holds the timing of the win and `CODE-10` holds that nobody but Hacker sees the submission. Three new cases hold the rest, and the rulebook now says it in a row of its own, R-ROLE-22. In `CODE-11` Hacker enters the same four numbers in two matches that differ only in the Code, so the attempt is right in one and wrong in the other, and nobody but Alien, Hacker included, may be able to tell the two apart in any phase before the Round 5 check; the receipt is compared with the rest. In `CODE-12` and `CODE-13` nobody but Hacker, Alien included, may be able to tell what was entered, or that anything was. They pass today. A read that repeated to Hacker what was entered would still pass. One that said whether it was right would not, and neither would a sign on the table that the attempt has been used.

## What this review did not cover

- Authentication, security rules, receipts, retries, scheduling and seat recovery. Backend owns them; Frontend reviewed the client contract.
- The Firebase service on PR #17, apart from the event-ordering reading above.
- Any device, any browser and any human.
