# Game Balance review of the shared contracts, fixtures and draft engine

**Reviewer:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code, model `claude-opus-5-5`.
**For:** Codex Astra, Backend and Integration (INT-003, issues #2 and #13).
**Date:** 6 October 2026. Re-reviewed the same day, after the integration review, against the newer Backend and Frontend documents (Part C).

**Status: reviewed and re-reviewed. Balance requires no change to a shared contract. From the rules and disclosure side it has no objection to protocol 2 as it stands and as its handoff documents it. This is not an adoption approval: adoption is the integration owner's decision.** Two requests stay with Integration (BAL-C02 and BAL-C13). Nine open rule edges are the owner's, and none of them is an engine defect. Everything else is recorded for information. Nothing here changes a shared file. The matching requests are in [integration-requests.md](integration-requests.md).

Three things were reviewed, against the rulebook in [game-rules.md](game-rules.md):

| Part | Reviewed | At |
| --- | --- | --- |
| A | `packages/contracts/src/{protocol,views,presentation,fixtures}.ts`: wire protocol 1 and the Officer and Protection fixture | `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4` |
| B | `packages/contracts/src/full-game.ts` (wire protocol 2) and `packages/engine/src/full-game/` | Draft PR [#16](https://github.com/Amirkianfar66/GameN/pull/16), commit `8d4a2e5dc47eb827dbcbfd8382755db2fa3b0bde`, unmerged |
| C | Backend's `contract-refinements-proposal.md`, `protocol2-client-handoff.md`, `contract-review-response.md`, `v1-decision-register.md`, `v1-rule-decisions-proposal.md` and `v1-implementation.md`; Frontend's `contract-re-review.md`, `protocol2-adoption-assessment.md` and `connected-v1.md` | The candidates of the integration review: `5adaf98f8412e2294f45e00f8fb7c4c515127226` (PR [#28](https://github.com/Amirkianfar66/GameN/pull/28)) and `8b97180038a37b798fbef345272a32e42c0d0853` (PR [#29](https://github.com/Amirkianfar66/GameN/pull/29)). The engine source, the contracts and the rule files are identical to `8d4a2e5` in both |

Part B was requested by PR #16 ("Frontend and Game Balance review protocol/rule adoption"). It was reviewed in a throwaway copy of that commit made with `git archive`; no worktree or branch was touched. Findings about a draft may be out of date once the draft changes.

## Summary

The draft is careful about secrecy. No disclosure defect was found in either part, and every decided rule that the scenarios exercise is implemented as the rulebook states it. The evidence is in [evidence/2026-10-06-baseline.md](evidence/2026-10-06-baseline.md).

What needs attention is at the edges of what has been decided. V1-01 to V1-21 are approved and are not reopened here. Nine questions lie outside them: no approved source answers them. For seven the build already behaves one way (D11, D12, D16, D17, D20, D34 and D35); the other two are conduct at the table (D18 and D19). They are open rule edges for the owner, consolidated in [the audit](rules-audit-v1.md#open-rule-edges-consolidated). Sixteen further points are readings of the approved sources that the rulebook states and the engine implements. No decision is asked for those.

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
| [BAL-C12](#bal-c12) | The public Hack phase names only the initiator | Question | Table display |
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

## What this review did not cover

- Authentication, security rules, receipts, retries, scheduling and seat recovery. Backend owns them; Frontend reviewed the client contract.
- The Firebase service on PR #17, apart from the event-ordering reading above.
- Any device, any browser and any human.
