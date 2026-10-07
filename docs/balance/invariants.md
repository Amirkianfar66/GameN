# Invariants

An invariant is a statement that must hold in every match, whatever the players do. The scenarios in `tests/scenarios/v1/` each check one situation; the invariants are checked after every transition of every executed scenario and of every seeded playout.

They are implemented in [`tools/balance/src/invariants.ts`](../../tools/balance/src/invariants.ts) as assertions about what an engine exposes. They do not compute what a transition should produce, and they are not a second rules engine. Each one cites the rule in [game-rules.md](game-rules.md) that makes it true. Backend owns transaction, security-rule and scheduler tests; these invariants cover game rules and audience boundaries only.

A violation fails the scenario that produced it, even when every scripted expectation held.

## Legal mode setup

Checked once, on the first observation of a match.

| ID | Statement | Rules |
| --- | --- | --- |
| INV-SET-01 | The seats hold exactly the roles of the mode, one each, and every faction follows from its role. Roles and factions never change during a match. | R-SETUP-01 to R-SETUP-05 |
| INV-SET-02 | The Code is the recorded set of four different seats, contains Alien and does not contain Undercover. | R-SETUP-08 |
| INV-SET-04 | A match opens on a Round 1 ordinary turn of the first player in the recorded order. Every player starts Healthy, free, without the Captain title and in the room they chose. Only Undercover and Officer hold an ordinary weapon, Cracker has two Rescues, and nothing is spent. | R-SETUP-07, R-SETUP-13, R-SETUP-14, R-CAPT-01, R-FLOW-02 |

A setup the rules do not allow must be refused: the eight `V1-UX-SETUP` scenarios cover six and ten players, a wrong role set, an illegal Code, a starting location outside Room A and Room B, and an incomplete turn order.

## Resources

| ID | Statement | Rules |
| --- | --- | --- |
| INV-RES-01 | No weapon count is negative. Rescues stay between zero and two for Cracker and zero for everyone else. | R-SETUP-13 |
| INV-RES-02 | A spent resource never returns: Officer's shot, a Disabler, a Hack initiation, a Protection receipt, a Rescue, the Code attempt and the release request. | R-ACT-07, R-ROLE-11, R-HACK-01, R-PROT-05, R-ROLE-15, R-VOTE-05 |
| INV-RES-03 | Weapons held plus ordinary shots fired never exceed the starting grants plus Supplier's two. A weapon is gained only at Round 3 resolution. | R-SETUP-13, R-SETUP-14, R-ROLE-07 |
| INV-RES-04 | Per turn: at most one Main Action and one ordinary shot. Per round: at most one Scan and two Hack conversations. Per match: one Hack initiation per player, one use per Disabler, two Rescues, one Supplier distribution in Round 3, one Code attempt in Round 5, one special shot per participant. | R-ACT-01, R-HACK-01, R-ROLE-02, R-ROLE-05, R-ROLE-06, R-ROLE-07, R-ROLE-13, R-ROLE-15, R-SHOT-04, R-SHOW-02 |
| INV-RES-05 | A player receives Protection at most once in a match, and a used Protection never returns. | R-PROT-05 |
| INV-RES-06 | Officer registers at most one ordinary shot in a match. Nobody else fires an ordinary weapon before Round 4. | R-ROLE-11, R-SHOT-03 |

## Phase transitions

| ID | Statement | Rules |
| --- | --- | --- |
| INV-PH-01 | The round is between 1 and 5. | R-FLOW-01 |
| INV-PH-02 | The round never goes back and rises by one only at end-of-round resolution. Phases follow only the transitions in the table below. A command never changes the phase. One case is not judged: the Captain's own release choice closing the release-choice window, which is undecided (D17). | R-FLOW-03, R-FLOW-07, R-ACT-01 |
| INV-PH-03 | Every live window lasts exactly 60 seconds and never closes before its deadline. The next window starts at the actual moment of the transition. A finished or aborted match has no deadline. | R-FLOW-05, R-FLOW-06, R-FLOW-07 |
| INV-PH-04 | In every round each player who is not Eliminated takes exactly one ordinary turn, in the recorded order. | R-FLOW-02, R-FLOW-04, R-FLOW-11 |
| INV-PH-05 | The showdown happens at most once, only after Round 5's Jail vote and resolution. | R-SHOW-01 |
| INV-PH-06 | After a match has ended nothing changes and every command is refused as closed. | R-SHOW-08, R-OPS-02 |
| INV-PH-07 | A window opens only when someone can use it: a Captain election has at least one eligible candidate, and a release choice opens only with a Captain, an unused request and a prisoner. | R-FLOW-13 |

| From | May be followed by |
| --- | --- |
| Ordinary turn | Ordinary turn, Hack conversation, release choice, Jail vote |
| Hack conversation | Ordinary turn, release choice, Jail vote |
| Release choice | Release vote, Jail vote |
| Release vote | Jail vote |
| Jail vote | Captain election, ordinary turn, showdown, finished |
| Captain election | Captain election (runoff), ordinary turn |
| Showdown | Finished |
| Any live phase | Aborted, by the host only |

When no player can take a turn in the next round, a Jail vote or an election may be followed directly by the next release choice or Jail vote. The invariant allows this and INV-PH-04 still requires one turn for everyone who is not Eliminated.

## Elimination, health, Jail and location

| ID | Statement | Rules |
| --- | --- | --- |
| INV-EL-01 | An Eliminated player never becomes Healthy or Injured again. | R-STATE-02 |
| INV-EL-02 | Health changes only when a round or the showdown resolves. Nobody is healed during the showdown. | R-RES-01, R-SHOW-05 |
| INV-EL-03 | An Eliminated player is never Captain, never listed as a voter or a vote target, never has a command accepted, and holds no special shot when the showdown opens. | R-FLOW-11, R-CAPT-07, R-VOTE-02, R-SHOW-02 |
| INV-EL-04 | A player's faction is public exactly when that player is Eliminated, and it is their true faction. | R-VIEW-03, R-RES-05 |
| INV-JAIL-01 | A player becomes Jailed only when a Jail vote closes, and stops being Jailed only when a release vote closes. | R-VOTE-01, R-VOTE-06, R-VOTE-08 |
| INV-CAPT-01 | A player becomes Captain only when an election closes. | R-CAPT-01, R-CAPT-02 |
| INV-LOC-01 | There is at most one Captain. The Captain is Healthy and free. Only the Captain is in Command Room. | R-CAPT-07, R-MOVE-04 |
| INV-LOC-02 | Outside the showdown: a Jailed player is in Jail, an Injured free player is in Hospital, and a Healthy free player is in Room A, Room B or Command Room. During the showdown every player who is not Eliminated is in the Final Zone. | R-STATE-06, R-STATE-07, R-SHOW-02 |
| INV-LOC-03 | Nobody is in the Final Zone before Round 5. | R-STATE-05, R-SHOW-01 |
| INV-MOVE-01 | Between phase closures a player's location changes only through that player's own accepted move, and only to Room A, Room B or Command Room. | R-MOVE-02, R-MOVE-03, R-MOVE-04 |
| INV-MOVE-02 | A player has at most one move accepted per round. | R-MOVE-01 |

## Authorized views

| ID | Statement | Rules |
| --- | --- | --- |
| INV-VIEW-01 | Before the match is finished, the public payload names no role and carries no private field: role, faction, weapon, Protection, Code, ballot, pending registration or legal-target hint. The one exception is the revealed faction of an Eliminated player. | R-VIEW-02, R-VIEW-03 |
| INV-VIEW-02 | Each player's view shows their own true role and resources. Insider's candidates, the Undercover's identity, the Code, Scan results, Protection status and whom Supplier armed appear only in the view of the role entitled to them. A failed Scan carries no membership; a correct one carries the true membership. | R-VIEW-04, R-VIEW-05, R-ROLE-13, R-ROLE-14, R-PROT-06, R-ROLE-20 |
| INV-VIEW-03 | An accepted secret registration changes no view except the actor's: shot, Disabler, Protection, Rescue, Supplier's choice, Scan, Hack request, Code submission, ballot, release choice and special shot. A release choice that closes its own window is not judged (D17). | R-VIEW-07, R-ACT-08 |
| INV-VIEW-04 | An audience's revision never decreases and changes exactly when that audience's content changes. | R-VIEW-07 |
| INV-VIEW-05 | A refused command changes no state and no view. | R-ACT-09, R-VIEW-07 |
| INV-VIEW-06 | The public facts inside every player's view equal the public view, and the public status of each seat equals the authoritative state. | R-VIEW-01 |
| INV-VIEW-07 | Exact roles and the Code are not public while the match is live, and are public and correct once it is finished. An aborted match is not judged either way (D35). | R-VIEW-08 |

INV-VIEW-04 and INV-VIEW-06 restate the technical contract in `docs/integration-baseline.md`. They are checked here because a break in either would let a hidden action show.

"What an audience can see" means its view and anything else the engine binding lets it read beside the view. Since Backend's fix for finding G17 (draft PR #65) there is such a further read, of a seat's own acknowledgments, and the binding carries it whole. INV-VIEW-03, INV-VIEW-04 and INV-VIEW-05 cover it without a change, and so does every case that compares audiences. INV-VIEW-01 looks through a further public read as it looks through the public view. The receipt of a command is an answer to its sender and not part of a view, so these invariants leave it alone; a comparison of two runs includes it.

The invariants hold for every state a match passes through. They cannot say that something a rule requires is missing: an engine that told Supplier nothing broke none of them. A scenario has to ask for that, which is the lesson of the integration review's finding G17; the audit has the check that followed.

## Result

| ID | Statement | Rules |
| --- | --- | --- |
| INV-WIN-01 | A result exists exactly when the match is finished. An Alien co-win is recorded only with a Blue win. | R-WIN-07, R-SHOW-08 |
| INV-WIN-02 | Blue never wins without a Healthy Blue player, and Red never without a Healthy Red player. With a Blue win the Alien co-win is recorded exactly when Alien is not Eliminated. Alien wins alone only when every Blue and Red player is Eliminated and Alien is not. | R-WIN-02, R-WIN-07, R-WIN-08 |
| INV-WIN-03 | A Draw is recorded only after a showdown. Before the end of Round 5 the only possible results are the two elimination victories. | R-WIN-09, R-SHOW-08 |

INV-WIN-02 states necessary conditions only. It does not decide who should have won: that is what the `WIN` and `SHOW` scenarios do, case by case. It asks for a Healthy member, Jailed or free, so it holds under either answer to D14.

## Determinism

| ID | Statement | Rules |
| --- | --- | --- |
| INV-DET-01 | Replaying the same recorded setup and the same commands at the same times gives the same end state. Every passing scenario is executed twice and compared; every playout is run twice. | Technical contract, `docs/integration-baseline.md` |

## What the invariants do not cover

- Whether a particular command should have been accepted. The scenarios do that.
- Retry safety, duplicate delivery, security rules, seat recovery and scheduling. Backend owns those.
- Anything said aloud. The Hack truth rule and embargo are conduct rules (R-HACK-04, R-HACK-05).
- The open rule edges D11, D12, D16 to D20, D34 and D35. No invariant encodes an answer to one of them.

## Invariants that rest on a reading

A reading is a rule that follows from the approved sources when they are read closely, although no one sentence says it. If one is ever decided differently, the invariant named beside it changes with the rule.

| Invariant | Part that rests on a reading | Decision |
| --- | --- | --- |
| INV-SET-04, INV-RES-03 | Only Undercover and Officer start with an ordinary weapon | D22 |
| INV-VIEW-02 | Nobody but Hacker is told who Undercover is | D23 |
| INV-JAIL-01 | Only a release vote ends Jail, and it does so when that vote closes | D27, D38 |
| INV-PH-07 | No window opens that nobody could use | D37 |
| INV-RES-04 | A Scan counts as the turn's Main Action | D30 |
| INV-VIEW-03 | A Code submission, a Hack request and a release choice are secret registrations | D36 |
