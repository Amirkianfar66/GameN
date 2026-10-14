# The specification of 13 October 2026: an independent audit and acceptance matrix

**Game Design and Balance, 14 October 2026.** For games of seven, eight and nine players separately, with Original Powers off.

**Status.** This is a reading of a specification and a preparation for testing it. Nothing of the next version has been run, because no engine plays it. This document changes no rule, proposes no ruleset and implements nothing.

## 1. What this is, and what it is not

On 13 October the owner approved a specification for the next version of the game: the Blackout Strike, the Private Chamber, the Alien's Phantom Clone, blocks that a room can see, a Hospital as large as the roster with a deadline of one round, the Captain's RELEASE and EJECT, and a cutoff for movement. Integration handed the packet to Game Balance on 14 October and asked for an independent audit and an acceptance matrix.

This document and the three matrices beside it give:

1. **An acceptance matrix** for each number of players: [seven](matrix-7.md), [eight](matrix-8.md), [nine](matrix-9.md). Each case says where everybody is, what is sent and when, and what must then be true, visible and timed, with the section and register entry of the packet it rests on. Section 3.
2. **Findings on the packet**: three places where two passages cannot both hold, six where neither the packet nor a kept rule says what an implementation needs, two where the rules do answer and the answer may not be the one that was meant, and a list of its rules that no legal play can reach. Section 4.
3. **What follows from the rules**, by counting and by logic, about how the game changes. Sections 6 and 7.
4. **Hypotheses** about play, kept apart from everything else and labelled as such. Section 8.3.
5. **Controls on the three versions that exist**, run under their own rulesets, which show what the game does today at each point where the next version will differ. Section 9.
6. **What Backend and Frontend have to provide** before a case can be run. Section 10.

It is not evidence that the next version works, and it is not evidence of balance. No human has played these rules. Nothing here is a win rate, and none could be: the only things run were short fixed lines through engines of earlier versions.

## 2. What was read, and where this stands

The cases are written against these six files. They were local and uncommitted on Integration's branch `codex/owner-motion-spec-2026-10-13` when they were read; they are not in this repository, so no test here can open them. `comparePacket` in `tests/scenarios/next-version/spec.mjs` compares a copy with these hashes, and did so on 14 October for the copy that was read: all six matched.

<!-- generated:provenance -->
| File of the packet | SHA-256 |
| --- | --- |
| `README.md` | `d434066f630f8c023b88d556f37b2ac80cbc0fda19acb9ba3471ba147ed0dd13` |
| `decision-register.md` | `ecbe6dd4fef8cb0a8534811a605615aaf01a1f312af7e9c2fa498c9815121fa4` |
| `game-design.md` | `002c5d9bcf5d1bcf2896533c34c5da277b3c0cdbc1dd555cad87816b08b026a2` |
| `motion-requirements.md` | `976eeee03c51a704e42fdfd8cb2d8384aaa82567b2e5190eb3a0af87cd381bba` |
| `motion-storyboards.md` | `1642ed84153e83443367bfd29bfdda3328786030199f7dd6804a14025f590d56` |
| `rules-contracts.md` | `6090fc0081b26b9426113db72c86d2651026a015a63e72e211aa270d13340f6b` |
| All six, as one digest | `fd90accca7c3e39d86e7f6ab6ac38a1804ac2877523b560fa0c03928bb9a1aca` |
<!-- /generated:provenance -->

The digest is the SHA-256 of the six lines `<hash>  <file name>`, in order of file name. The handoff that carried the packet is `GameN-Balance-follow-up-2026-10-14.txt`, 113,028 bytes, SHA-256 `eace479997f10f709c875ac28f0f1470d5cac18a1dae0d21c7b2aeeb307828ec`.

This branch, `agent/game-balance-next-version-audit`, starts from `abb6839524b6dc3e5225e600f2f067c3fa3f9501`, the head of the integration PR #114 and the source basis the packet names for itself. It adds files beside the earlier Balance work and changes none of it: the rulebook, the Version 1 catalogue, the capacity audit of PR #104 and its fixtures are byte for byte as Integration pins them.

**PR #104 stays what it was.** Its evidence of 11 October is against Backend's commit `dd04f68` and engine 1.2. The fifteen cases that fail there are history: one defect and four rules the owner decided after that engine was written. Backend's later commit implements them, the integration baseline carries its own capacity gate, and that gate passes at this branch's base. None of those fifteen is a finding against any engine of today, and nothing in this audit repeats them.

Four versions appear below. Only the first three can be run.

<!-- generated:versions -->
| Version | Ruleset | Engine | Where it is | What this audit did with it |
| --- | --- | --- | --- | --- |
| 1.3 | `in-person-v1-capacity-resolution-2026-10-12` | full-game-1.3.0 | the integration baseline, PR #114 | 10 controls for each number of players, run |
| 1.4 | `in-person-v1-vote-results-2026-10-12` | full-game-1.4.0 | Backend draft PR #125 | 6 controls for each number of players, run |
| 1.5 | `in-person-v1-declared-hack-2026-10-12` | full-game-1.5.0 | Backend draft PR #131 | 7 controls for each number of players, run |
| next | none allocated | none | the packet `owner-motion-2026-10-13`, not committed | Cases specified. None run |
<!-- /generated:versions -->

## 3. The matrix

A case is a specification of one situation. It is not a fixture in the executable format of the Version 1 catalogue, because the commands it needs do not exist, and it is not a result. The cases are generated from `tests/scenarios/next-version/catalog.mjs` into one file of cases for each number of players (`mode-7.acceptance.json` and its two siblings, for programs) and one readable matrix each. A test holds the files to the catalogue, every reference to the packet's own list of sections and entries, and every kept rule to the document it is in.

<!-- generated:counts -->
|  | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| BLK: The vote result, the Blackout window and the Blackout | 29 | 37 | 37 |
| MOV: Voluntary movement and its cutoff | 16 | 16 | 16 |
| SLOT: Positions | 6 | 6 | 6 |
| CLN: The Alien's Phantom Clone | 16 | 16 | 17 |
| CAP: The Captain's RELEASE and EJECT | 19 | 19 | 19 |
| HSP: Hospital, Rescue and death | 21 | 21 | 21 |
| DEF: What a room sees of a block | 13 | 13 | 13 |
| VOT: Votes and their results | 4 | 4 | 4 |
| HCK: The declared-side Hack and the Chamber | 9 | 9 | 9 |
| SHW: The showdown | 7 | 7 | 7 |
| INT: Whole lines | 3 | 3 | 3 |
| **All cases of the next version** | 143 | 151 | 152 |
| Specified, not run | 142 | 150 | 151 |
| Of them, reachable only from a constructed state | 2 | 2 | 2 |
| Not run, people or devices | 1 | 1 | 1 |
| Run | 0 | 0 | 0 |
| Expectation stated by the packet | 103 | 111 | 112 |
| Stated by an earlier rule that the packet keeps | 5 | 5 | 5 |
| Derived from the packet and the kept rules together | 27 | 27 | 27 |
| A reading, with the other outcome beside it and a finding that reports the point | 8 | 8 | 8 |
| Evidence must come from the rules engine | 132 | 139 | 140 |
| From the service | 8 | 9 | 9 |
| From the phone and the shared display | 2 | 2 | 2 |
| From people at a table | 1 | 1 | 1 |
<!-- /generated:counts -->

Seven players have one Disabler. The cases about two Blackouts in one round exist for eight and nine only, and the register entry about two Disablers (Q-B03c) has no case at seven; every other section and entry of the packet has at least one case with each number of players.

**How the expectations were derived.** From the packet first: its game design, its resolution schedule and validation tables, and its decision register. Where the packet keeps an earlier rule, from that rule's own source: the rulebook, the capacity decisions, and the three later overlays. No expectation was taken from an engine. Each case says which of four things its expectation is: stated by the packet; stated by an earlier rule the packet keeps; derived from the two together; or a reading, where neither settles the point or two passages disagree. A case that rests on a reading names the finding that reports the point and gives the other outcome beside its expectation, apart from it, so that a test asserts one outcome and not two. Where the packet or a kept rule gives an answer the case expects that answer, also where this audit asks whether it was meant (NV-F-04, NV-F-07).

**How the cases were checked.** After they were written, a separate Claude Code agent reviewed every case against the packet, the rulebook, the capacity decisions and the three later overlays, without editing anything, and replayed the long lines with its own record of rooms, positions, health, detention and resources. It found no illegal command and no wrong position, deadline, vote threshold, Power or winner. It found expectations marked as stated that were readings, two cases that led with an outcome a kept rule contradicts (CAP-17, VOT-03), a case that tested nothing with eight and nine players (HCK-05), and twelve situations the brief asks for that no case covered. These were corrected and seventeen cases added. A second pass over the changes found that the cases about bodies had been written to two different answers, so that only an engine following an unstated mix of the two could pass all of them, and several claims in this document that went further than the rules. A third pass found that one rewritten case contradicted a kept owner decision on a Captain's body, which also gives two of the packet's rules on bodies the legal cases they had seemed to lack. All of this is corrected. The corrections made after the third pass have not been reviewed again.

**Where the evidence for a case must come from** is recorded with it: most from the rules engine, some from the service (receipts, late deadlines, reconnection), some from the phone and the shared display, one from people at a table. A case that needs the service or a device is not covered by an engine test, however it comes out.

**When the cases can be run.** When Backend publishes an engine that names a ruleset for this specification (BE-01) and lets a test adapter read what the cases assert (BE-13), the engine cases are bound to executable fixtures one by one, the expectations stay as they are written here, and whatever fails is reported as failing. Until then every one of them is "specified, not run".

## 4. Findings on the packet

None of these stops the specification from being built, and none reopens a decision the owner took. Each says what the packet and the rules it keeps give, where they disagree or are silent, and what this audit recommends. A recommendation is not a decision. Where the rules do give an answer, the matrix expects that answer, whatever this audit thinks of it.

<!-- generated:findings -->
| Finding | Kind | What it is about | Cases that depend on it |
| --- | --- | --- | --- |
| NV-F-01 | Contradiction | Where a player lies who is eliminated by a second hit in the stage that first hurt them: in Hospital by the letter, in their last room for a Captain by a kept decision | BLK-11, BLK-24, BLK-33, CAP-19, HSP-06, HSP-20, DEF-09, SHW-06, BLK-19 (8, 9) |
| NV-F-02 | Contradiction | Who is in the room, for a block, when several attacks resolve in one stage | DEF-06 |
| NV-F-03 | Contradiction | Which Hospital position each of several players hurt in one stage takes | SLOT-03, HSP-04, BLK-18 (8, 9), BLK-23 (8, 9) |
| NV-F-04 | Consequence | An EJECT earlier in the round and the deaths at its end are not "at the same time": a Draw where the Alien might be thought to win alone | CAP-17 |
| NV-F-05 | Gap | Whether a player may move while a Captain election is held | MOV-14 |
| NV-F-06 | Gap | Which positions the players hold at the start | SLOT-01 |
| NV-F-07 | Consequence | The Code is refused during the vote result and accepted during the window that follows it | VOT-03 |
| NV-F-08 | Gap | What the table is shown of a player hurt and rescued in the same round | HSP-06, HSP-19 |
| NV-F-09 | Information | Rules of the packet that no legal play reaches | BLK-07, BLK-37, CLN-13, CAP-19 |
| NV-F-10 | Gap | Whether a Blackout request or a Clone activation is accepted from inside Command Room | CLN-15 |
| NV-F-11 | Gap | From which instant the pair of a Hack is public | HCK-01 |
| NV-F-12 | Gap | Whether a detained patient may take part in a Hack with a free patient | HSP-21 |
<!-- /generated:findings -->

**Three of them have one root** (NV-F-01, NV-F-02, NV-F-03): an injury moves a player at once. "The logical working state moves a newly Injured player directly into Hospital in the same damage transition" (rules contracts); "transfers the player directly to Hospital in the same authoritative step" (G-07); "Transfer directly to Hospital on injury" (Q-H04). Taken as a move inside the attack stage, between two effects, this decides where a body lies (NV-F-01: in Hospital, which a kept decision overrides for a Captain), who sees a later block in the room the player has just left (NV-F-02), and which Hospital position each casualty of a stage takes (NV-F-03). In the last two the outcome encodes the order in which hidden attackers acted, which the packet forbids elsewhere; there the matrix expects the reading recommended below. **One answer would settle all three: within a resolution stage nobody changes place. Places are assigned once, when the stage is complete, from the health each player ends it with; and a block is shown to the seats that were in the room when the stage began.** That is how the versions of today resolve a round (R-CAP-26). Bodies would lie where players fell, in any room, Jail included, and the expected outcome of several cases listed under NV-F-01 and NV-F-08 would change to the other outcome they give. It is a recommendation to Integration and the owner, nothing more.

### NV-F-01: where a player lies who is eliminated by a second hit in the stage that first hurt them

*What the rules give.* An injury moves the player to Hospital at once (the three passages above), and "A second unblocked damage eliminates an Injured player immediately". So, by the letter, a Healthy player who is hit twice in one stage dies in Hospital, and so does a player whose second hit comes later, by the Hospital's deadline or by a showdown shot on a patient. EJECT takes its victims off the board. One kept decision says otherwise for one case: a Captain who is hit after stepping into Command Room and Eliminated is seated after the resolution in "their last room, otherwise the other room" (BAL-OD-4, R-CAP-24). The packet replaces the Hospital overflow of that decision, not this half of it.

*Where they pull apart.* Under the letter that Captain dies in Hospital, so R-CAP-24 moves a body out of Hospital, where R-CAP-03, kept as well, says "An Eliminated player keeps their place". The matrix expects R-CAP-24, the decision made for exactly this case (HSP-20), and gives the Hospital as the other outcome.

*What follows.* Outside that one path no body lies in a room, and none ever lies in Jail. The owner's answer Q-B03e (a Blackout on "a position occupied by a player already Eliminated when the Blackout snapshot is captured" is a miss) and G-04's "Retained Eliminated occupants … retain the same room observation boundary" each have a legal case only through it (BLK-11, DEF-09). EJECT's clearing of "retained eliminated bodies" from Jail has none (CAP-19, NV-F-09). The entry Q-B03e leaves "Corpse placement" to Q-B03 and Q-P02, and neither says where a body lies.

*What the matrix does.* Hospital for every body but the Captain's (BLK-19, BLK-24, BLK-33, CAP-19, SHW-06), the Captain's last room in HSP-20, BLK-11 and DEF-09. Each case gives the other outcome beside its expectation.

*For the owner.* Whether bodies are meant to lie where players fell, as Q-B03e pictures. If so, the packet should say that a player eliminated in the stage that first hurt them keeps their position. R-CAP-24, decided for that model, then agrees with it again, and that is also the answer recommended above for NV-F-02 and NV-F-03. If not, it should say whether R-CAP-24 still moves a Captain's body out of Hospital.

### NV-F-02: who is in the room, for a block, when several attacks resolve in one stage

*What the packet says.* "Room recipient membership is frozen for the particular event, from authoritative physical location immediately before applying that effect." And, of the same events: "Public/room animation order and timestamps must not encode the hidden actor's resolution index or request arrival."

*Why they collide.* Two attacks resolve in one stage in Room A: one injures player O, one is blocked on player T. With the working-state sentence, O is in Hospital from the instant of the injury. If the injury resolves first, O is not in Room A when the block is applied and receives no event; if the block resolves first, O receives it. Which of the two happens is the stored turn order of the two hidden attackers. So what O received says which attacker acted earlier in the round, and the turn order of a round is known to the whole table. At a table people tell each other what they saw. That is the resolution index, encoded in who was told.

*Recommendation.* Fix who is in the room once for the whole stage, at its beginning. For the attack stage of a normal round that is the occupancy the Blackout snapshot already freezes; for the showdown it is the occupancy when the batch begins. It keeps Q-D01 as it is worded ("frozen at the authoritative effect checkpoint, including the subject and seats physically in that room") and removes the dependence on order.

*Cases.* DEF-05 and DEF-06 are the two orders. Under the recommendation no seat can tell them apart.

### NV-F-03: which Hospital position each of several players hurt in one stage takes

*What the packet says.* An entrant takes "the lowest free logical slot"; a newly Injured player enters Hospital "in the same damage transition"; and step 9 places "in player-number order where competing returns matter: admit all Injured to Hospital".

*Why they collide.* If the position is taken at the damage transition, two players hurt in one round stand in Hospital in the order in which their attackers resolved, and positions are public: the same resolution index as in NV-F-02, on the board. If it is taken in step 9, they stand in order of player number, which says nothing. The capacity audit met the same question for the Hospital of five, and the answer there was player number (R-CAP-18).

*Recommendation.* Say that players who enter a room in the same stage are given positions in order of player number, in Hospital as in Room A, Room B and Jail.

*Cases.* SLOT-03 is written to it and gives the other outcome. BLK-18, BLK-23 and HSP-04 put several players in Hospital in one stage and leave open who holds which position.

### NV-F-04: an EJECT earlier in the round and the deaths at its end are not "at the same time"

*What the rules give.* The Alien wins alone when Blue and Red are eliminated at the same time, and that means "both teams had a surviving member before one complete resolution stage and neither has one after it" (R-WIN-08, the owner's decision V1-19). The packet keeps that rule. It adds when victory is read: "after the full normal end-round resolution ... rather than ending on an intermediate EJECT victim" (G-06). It does not say that an EJECT belongs to the stage. An EJECT happens during the turns. So if it removes the last Red players, and the resolution of the same round removes the last Blue players, Red was gone before the stage began and nothing was simultaneous. No side can win; the match goes to the showdown, which has one participant and no shot; it is a Draw. The matrix expects the Draw (CAP-17).

*Why it is reported.* CAP-17 is a legal line with each number of players, and in it the choice belongs to the Alien, who is Captain: without the EJECT Red wins, with it the match is a Draw, and nothing lets the Alien win, although both sides are gone when victory is next read. INT-02 has the same deaths at the end of the round with the EJECT two rounds earlier, and there the Alien wins alone. If the same thing happens before Round 5, the match is played on to the showdown with one living player.

*For the owner.* Whether everything since the previous victory check should count as one stage for R-WIN-08. That would change the wording of an owner decision, so this audit asks and does not assume.

### NV-F-05: whether a player may move while a Captain election is held

The owner's answer Q-M01 puts the one move of a round in "the player-turn stage until the final player's turn ends". An election is held between two rounds, before the first turn. The rulebook leaves a move during it undecided (R-MOVE-08). The three engines of today accept it and charge it to the coming round (control V13-04, recorded and not judged). The packet does not say whether that stays. *Recommendation:* follow Q-M01 as written; the window opens with the round's first ordinary turn. MOV-14.

### NV-F-06: which positions the players hold at the start

The packet fixes how an entrant is placed and not how the starting players are. An order is needed for replay and for the map of Round 1. *Recommendation:* the lowest positions of the starting room, in order of player number, the order the packet uses wherever several players are placed at once. Every layout of the matrix assumes it. SLOT-01.

### NV-F-07: the Code is refused during the vote result and accepted during the window that follows it

*What the rules give.* The Code may be entered "at any time during Round 5 before that round's resolution closes" (R-ROLE-15, the owner's decision V1-08). Two later decisions take time out of that: the five seconds of a vote result (VOTE-RESULT-04) and the two preludes of a Hack (HACK-DECLARE-06); controls V14-02 and V15-07 show both. The packet closes its window to movement and the Captain's commands (Q-B02d) and to the Clone (Q-C02b). It does not close it to the Code. So in Round 5 a Hacker can enter the Code during the Jail vote, cannot during the five seconds after it, and can again during the fifteen seconds after those. The matrix expects exactly that (VOT-03).

*For Integration.* Say whether the window is meant to be closed to the Code as the result is. Either answer is simple to build.

### NV-F-08: what the table is shown of a player hurt and rescued in the same round

A Rescue can be registered on a Healthy player of the same room; it heals if that player has been hurt by the time the Rescue stage comes (R-ROLE-02, R-ACT-06). Today the table sees nothing of such a round. It sees "only the resulting changes of health and location, without a cause" (R-ACT-08), and nothing resulted.

By the letter of the packet the player now goes to Hospital at the hit and comes back as a healed player, to the lowest free position of the room they remember. Their position changes when a lower position of that room is free, as in HSP-06, where they come back to slot 1 after standing in slot 3; otherwise they come back to their own. What the packet does not settle is whether the recovery itself is shown. It makes medical recoveries public outcomes and shows two hits as two outcomes, and it says nothing of an injury that is undone in the same resolution.

*Recommendation:* show it, as the packet shows recoveries. When the recovery is shown, or the position changes, the table learns two things it could not learn before: that this player was attacked in this round, and that the Cracker stood in this player's room when the Rescue was registered. Under the answer suggested above for the three findings with one root the player never leaves their position, and whether the recovery is shown is the only question left. HSP-06; HSP-19 is the same for a Captain, who loses the title on the way.

### NV-F-09: rules of the packet that no legal play reaches

Not defects. They are listed so that nobody looks for a played scenario that cannot exist; a test of them needs a constructed state. The reasons are in section 6.

| Rule of the packet | Why no legal play reaches it |
| --- | --- |
| A Blackout request is cancelled because its Disabler is "no longer Healthy" before the window (G-01, schedule step 5) | Nothing deals damage between a request, made in the turns, and the window. Only the Jail vote of the round can make a requester ineligible. BLK-37 |
| A Blackout selects a position of Jail or of Hospital (Q-B03f gives both rooms positions) | A request is admitted only for a Healthy, free Disabler, who is in Room A, Room B or Command Room. The one position of Command Room is always the Disabler's own |
| A Blackout selects a position whose occupant is Injured at the snapshot | Every Injured player is in Hospital before the window opens. A Blackout can still hit a player who was hurt earlier in the same stage (BLK-19, BLK-33) |
| EJECT clears a body from Jail (G-06) | By the letter no body ever lies in Jail: the only body seated outside Hospital is a Captain's, in a room (NV-F-01). Reachable if a player eliminated in the stage that first hurt them keeps their position: CAP-19 gives the line |
| The Clone survives a later injury, and does not prevent Hospital deterioration (G-03) | Activation needs a Healthy Alien, and while the Clone is active everything that deals damage in a normal round is blocked. CLN-13 |
| A special showdown shot is fired at an active Clone and passes it (Q-C01b) | Every Clone has ended before the showdown opens (Q-H03). What can be played is a shot at an Alien whose Clone has ended: CLN-10, CLN-11 |
| A second hit on a player who was already Injured when the round began, in a normal round | Nobody who can attack is in Hospital, and no Blackout is bound there. A second hit comes in the same stage as the first, or in the showdown |
| A block on a patient in Hospital | A patient can hold an active, unused Protection only in the round after the one in which they were hurt: an active one would have blocked the hit, so it was pending then. No attack reaches Hospital in that round, and at its end the patient has died or has left, healed |

### NV-F-10: whether a Blackout request or a Clone activation is accepted from inside Command Room

G-01 says that "Command Room target immunity and existing action restrictions remain applicable". Today a Captain inside Command Room can aim nothing at anybody, themself included (R-CAPT-11, R-CAPT-15), and so a Disabler inside has no action at all. A Blackout request and a Clone activation name nobody. The packet lists the conditions of each, the player's own turn, Healthy and free, and location is not among them; it does not say whether "existing action restrictions" reaches them. *Recommendation:* accepted. CLN-15 is written to that. BLK-17 is written so as not to depend on it: the request is made in a room, and the Disabler then steps into Command Room.

### NV-F-11: from which instant the pair of a Hack is public

The packet makes the pair and the stage public and puts the entrance inside the five seconds of the private result (G-02). Today the table reads only the initiator through all three stages (HACK-DECLARE-06, control V15-04). The packet does not say whether the target is public from the declaration stage or from the entrance. *Recommendation:* from the opening of the declaration stage. The storyboard's first beat highlights both players, and at a table the target is the one who picks up a phone to declare. HCK-01.

### NV-F-12: whether a detained patient may take part in a Hack with a free patient

G-05 says "Medical detention does not create additional Hospital actions or movement." The kept rules let a Jailed player take part in a Hack where the other rules allow it, and a Hack needs its two players in one place (R-STATE-04, R-HACK-02, R-HACK-03). In Jail a prisoner reaches only prisoners; a detained patient shares Hospital with free patients. *Recommendation:* allowed, as the kept rules give it; the passage on detention then means that detention adds no new kind of action. HSP-21.

## 5. Assumptions of the matrix

<!-- generated:assumptions -->
| Assumption | What the matrix assumes |
| --- | --- |
| NV-A-01 | The players of a starting room hold its lowest positions in order of player number. The packet does not say (NV-F-06). |
| NV-A-02 | A voluntary move during the mover's own turn stays legal. G-09 names "another player's turn or after their own turn"; Q-M01 says "including", and the contracts say the cutoff is "independent of the mover's own turn". |
| NV-A-03 | A rule of the earlier versions applies wherever the packet does not replace it, as the packet's overview says: the rulebook, the capacity decisions except the Hospital of five, Pass, the five-second vote result and the declared-side Hack except who reads the pair. |
| NV-A-04 | The Jail vote, the elections and their thresholds are unchanged, and each keeps its window of sixty seconds. |
| NV-A-05 | The round of an injury is the round whose resolution caused it. A patient hurt when Round 2 resolves is "admitted in Round 2" and due at the end of Round 3. |
| NV-A-06 | The packet's "any other surviving participant" settles that nobody names themself in the showdown, which the rulebook had left open (R-SHOW-11). |
<!-- /generated:assumptions -->

## 6. What can and cannot happen

These follow from the packet and the kept rules by reasoning alone. They are not observations of play.

**Nobody who is a patient when a round's turns begin can be attacked in that round.** A shot needs its shooter in the target's location when it is registered, and a shooter is Healthy and free; a Blackout is bound to its Disabler's room. So a patient of an earlier round is out of reach of every attack until the showdown, and dies of the deadline instead. A second hit can still land on a player hurt earlier in the same stage, wherever the letter has moved them, because every attack of a stage is registered before the stage begins (BLK-19, BLK-33). Of the rulebook's "One hit injures; a second hit eliminates", the second hit now comes in the same stage as the first, or in the showdown.

**By the letter, every death happens in Hospital or in the airlock.** An attack injures first, and an injury moves the player to Hospital; only a Captain's body is then seated in a room (NV-F-01). Today a player is eliminated by a second hit, in the same stage as the first or in a later one. Now there are four ways: a second hit in the same stage; a showdown shot on a patient; the Hospital's deadline; EJECT.

**A match can end at the checkpoint of Round 2.** INT-01 gives one legal line for each number of players: a Blackout or the Officer's shot in Round 1 on all Red players but one, the vote of Round 1 on the last, an EJECT in Round 2, and the deaths at its end. No match can end earlier: Round 1 has no Captain and no Hospital death, its attacks can eliminate one player at most, and nothing but elimination ends a match before Round 5 (R-WIN-09). Under the rules of today a side is eliminated by two hits on each member and nothing else. With seven players that takes every attack of the match for the two Red players, three of them weapons that fire from Round 4; with nine the same for three Red players; with eight the five attacks cannot eliminate three. So today no side can be gone before Round 4, and with eight players not before the showdown.

**The Alien can win alone.** The Version 1 audit found that outcome unreachable by legal play. It is reachable now: INT-02 is a legal line for each number of players in which every remaining Blue and Red player is hurt in Round 4 and dies at the end of Round 5, in one stage. CAP-17 is the line in which an EJECT removes one side earlier in the same round; there the kept rule gives a Draw (NV-F-04).

**Everybody who can be hurt in one round fits in Hospital.** Four, five and six players can be hurt in one stage with seven, eight and nine players (HSP-04). The Hospital of five would have left the sixth outside at nine; the Hospital of the roster never does. Jail still cannot be asked for a sixth place: one vote a round, five rounds. Room A and Room B together have ten places for at most nine players, so a returning player always has one.

**A Captain who stays in Command Room is out of reach of every attack of a normal round**, as today, and now holds two commands that nothing blocks. Only a Jail vote takes the title from a Captain who does not step out.

**A Disabler who is Captain and sits in Command Room when the window opens has spent the Blackout for nothing** (BLK-17): the request is admitted, the room has one position, and it is the Disabler's own. The same happens to any Disabler whose room-mates all leave after the request (BLK-09). The use is kept only if the vote jails the Disabler.

**The player with the last turn decides when movement closes.** A Pass closes the final ordinary turn at once (MOV-06), and with it everybody's chance to change room before the window. Without a Pass it closes at that turn's deadline, also when the closure itself is late (MOV-15).

**After an EJECT the last turn of the round can be the Captain's own** (MOV-10), and the Jail vote of that round counts its voters without the ejected.

## 7. What follows by counting

<!-- generated:arithmetic -->
|  | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Blue, Red, Alien | 4, 2, 1 | 4, 3, 1 | 5, 3, 1 |
| Blackouts in a match | 1 | 2 | 2 |
| Ordinary weapons, usable in Rounds 4 and 5 | 3 | 3 | 3 |
| Officer's shot, usable from Round 1 | 0 | 0 | 1 |
| Attacks before the showdown | 4 | 5 | 6 |
| Of them, able to land in Rounds 1 to 3 | 1 | 2 | 3 |
| Rescues in a match, one a round | 2 | 2 | 2 |
| Hospital positions | 7 | 8 | 9 |
| Ballots that jail when everybody votes | 4 | 4 | 5 |
| Version 1.3: most players Eliminated before the showdown (two hits each, nothing else eliminates) | 2 | 2 | 3 |
| Specification: most players who can die of their injuries by the end of Round 5, nobody rescued | 4 | 5 | 6 |
| The same with both Rescues used on them | 2 | 3 | 4 |
| Specification: most players one EJECT can eliminate (Round 5, a prisoner from each earlier vote) | 4 | 4 | 4 |
| Specification: seconds between the closing of the Jail vote and the resolution (1.3: none; 1.4 and 1.5: five) | 20 | 20 | 20 |
<!-- /generated:arithmetic -->

The row for version 1.3 and the two rows after it are the heart of the change. Today an attack takes one of a player's two lives, and the four, five or six attacks of a match can eliminate at most two, two or three players before the showdown. Under the specification an attack that lands by Round 4 is lethal unless the Cracker spends one of two Rescues on it, and at most one Rescue resolves in a round. Ordinary weapons fire in Rounds 4 and 5 only: a hit in Round 4 is due at the end of Round 5; a hit in Round 5 has no deadline.

The EJECT row is separate from the attacks and adds to them. It needs no weapon and meets no defence; its limit is the number of living prisoners in Jail on the Captain's turn, which the votes of the earlier rounds set: none in Round 1, where there is no Captain; one in Round 2; four in Round 5.

The last row is time. Each round gains twenty seconds between its Jail vote and its resolution, five of which the vote result of 1.4 already has. Against that, the release choice of today is gone, a window of sixty seconds opened when there is a Captain, an unused request and a prisoner, and so is the release vote that follows it when the Captain names a prisoner, with its own five-second result from 1.4 on. Each election and runoff keeps the five-second result of 1.4, and a Hack takes up to twenty seconds more than in 1.3 before its sixty, as in 1.5. No total for a match is given: it depends on how often those windows open.

## 8. Risks to balance and to hidden information

### 8.1 The eight topics the packet asks Balance to assess

For each: what the rules give, with the cases that hold it, and where the risk lies. Whatever the last column calls a hypothesis is one, and is in 8.3.

| Topic | What the rules give | Where the risk lies |
| --- | --- | --- |
| Two attacks on one position | Apart from EJECT, the only way to eliminate a Healthy player within one round, before any Rescue. Two Blackouts on one position need eight or nine players (BLK-19 to BLK-21). With seven it takes a Blackout and a shot, or two shots, so Round 4 or 5 (BLK-24) | The two Disablers are on opposite sides, so a double Blackout on purpose needs an agreement across sides or a common enemy. A Rescue registered for the victim is spent for nothing. From Round 4 this is the cheap way to kill for whoever holds a weapon beside a Disabler: NV-H-05 |
| Clone and Protection | The Clone goes first and the Protection is kept for later (CLN-07, BLK-21); in the showdown only the Protection counts (CLN-11) | Not in the order, which changes nobody's health. In what a block now tells the room (8.2): NV-H-06, NV-H-07 |
| Missed, cancelled and late Blackouts | Every admitted request spends the use, whatever comes of it: an empty, own or dead position, no selection, a selection at the last instant (BLK-05, BLK-08 to BLK-11). Only a Disabler jailed by the vote keeps it (BLK-12, BLK-13) | Others can make a Disabler miss: by leaving the room after the request, or by filling the room the Disabler wants to follow into (BLK-09). A Disabler who is Captain wastes the use unless they leave Command Room before the window (BLK-17). And a phone that is slow for ten seconds loses the one use of a match: NV-H-09, NV-H-12 |
| Medical detention and capacity | A detained patient is out of reach of both commands and of every attack of a normal round, dies of the deadline unless rescued, and is a prisoner again if healed (CAP-08, CAP-09, HSP-09, HSP-10). Hospital is never short of a place and Jail is never asked for a sixth (section 6) | Detention shelters nobody for longer than a round. A detained Cracker cannot save themself (HSP-12). No risk was found in capacity itself; where bodies lie decides how often a room is full (NV-F-01) |
| The Captain's two powers | Each once in a match, whoever is Captain; all prisoners or none; no vote, no defence, at once (CAP-01 to CAP-07, CAP-10) | The largest single change to who can eliminate whom: NV-H-01 to NV-H-04 |
| Rescue or death in the following round | One Rescue resolves in a round, two exist in a match; every other patient of Rounds 1 to 4 dies at the end of the following round, unless the match has ended first (HSP-01, HSP-05, HSP-15, section 7) | The Cracker's two Rescues are now two lives, and a Cracker who is Jailed saves nobody, an Injured one only themself: NV-H-08 |
| The exceptions of Round 5 | A patient of Round 4 has Round 5 and dies at its end; a patient of Round 5 has no deadline; a Clone of Round 5 ends before the showdown (HSP-13, HSP-14, CLN-10, BLK-32) | A hit in Round 5 is worth less than the same hit in Round 4: NV-H-05. A patient of Round 5 cannot be killed by the clock, but one showdown shot does it |
| The showdown | Everybody stays in place; any other survivor can be named; one shot kills a patient (SHW-01 to SHW-07) | More players reach it Injured or do not reach it at all, so it has fewer shooters and more deaths by one shot than today: NV-H-11 |

### 8.2 What the rules let a player work out

These are consequences of the rules, not guesses about behaviour. The packet says that repeated blocks "may legitimately support deduction"; this is how far the deduction goes.

- **A block in Round 1 is the Clone, and the blocked player is the Alien.** A Protection is active from the round after its grant (R-PROT-02), so none is active when Round 1 resolves.
- **Two blocks on one player mean that one of them was the Clone**, and so that the player is the Alien, for anybody who saw both. A player receives Protection once in a match and it stops one attack (R-PROT-03, R-PROT-05). Which of the two was the Clone cannot always be told from the events (CLN-07): two blocks in one stage are both the Clone, a block in Round 1 is the Clone, and a block in the showdown is the Protection.
- **Undercover can tell every block they see.** Undercover reads which Protections they granted and whether each was used up. A block on a player who holds none of theirs, or one that leaves theirs unused because the Clone went first, is the Clone.
- **A blocked player who is not the Alien learns that Undercover protected them.** Until now a recipient was never told (R-PROT-06).
- **Whoever identifies the Alien knows one of the four numbers of the Code**, since the Alien's is always in it (R-SETUP-08).
- **The room learns that somebody in it was attacked**, which a blocked attack never showed before, and an attacker who is in the room learns that the attack was stopped, which an attacker was never told (R-VIEW-06).
- **The table votes in the round of an EJECT without knowing which sides the ejected were on.** Their factions are shown at the end of that round, after its Jail vote.
- **A Rescue registered before the hit may no longer be invisible.** By the letter the healed player comes back to another position when a lower one of their room is free, and if the recovery is shown the table learns that they were attacked and that the Cracker stood in their room (NV-F-08).

The event itself gives none of this away: the two defences look the same, as the packet requires (DEF-02). The rules around it do.

### 8.3 Hypotheses

Each of these is a hypothesis. None has been observed, none has been simulated, and no scripted player could show any of them: they are about what people choose to do. The third column says why the rules make it plausible; the fourth, what would test it.

| | Hypothesis | Why the rules make it plausible | What would test it |
| --- | --- | --- | --- |
| NV-H-01 | The Captaincy becomes the strongest position at the table, and elections turn on who is trusted with the airlock | Two commands that nothing blocks, effective at once, given from a room no attack reaches (section 6) | In play sessions: who is elected, how often each command is used and by a Captain of which side, and what it decided |
| NV-H-02 | The allowances are spent early so that a later Captain cannot have them | Each is one for the whole match and survives the Captain; a Captain loses the title to a single vote | The round of first use, and the reason the Captain gives afterwards |
| NV-H-03 | The Jail vote stops being a way to silence a player and becomes a death sentence with a delay; tables jail less, or bargain over it | A prisoner can be ejected from the next round on, with no defence | Successful Jail votes in a match, against sessions of Version 1; the questionnaire after the match |
| NV-H-04 | A side gains from having one of its own in Jail beside an enemy: a mixed Jail deters both commands | RELEASE and EJECT take every living prisoner in Jail and cannot choose | Who is in Jail when a command is used and when one is held back |
| NV-H-05 | Round 4 becomes the round to shoot | A hit in Round 4 kills at the end of Round 5 unless rescued; a hit in Round 5 only injures | The round of every ordinary shot, from the private research export |
| NV-H-06 | The Alien activates in Round 4 and is out of reach in both rounds in which weapons fire; an earlier activation happens only for fear of a Blackout | Activation covers its round and the next; the Alien has no other Main Action to give up for it | The round of activation, and whether the Alien was attacked while it was active |
| NV-H-07 | The Clone exposes the Alien more often than it saves them | The deductions of 8.2, and the Code number that comes with them | Whom players believed to be the Alien and why, asked after the match; whether Code attempts get better |
| NV-H-08 | The Cracker decides most deaths, and is hunted or jailed early | Two Rescues, one a round, against four to six attacks that are now lethal; an Injured Cracker must spend one on themself; a jailed one can spend none | Who is attacked and jailed first; on whom the Rescues are spent |
| NV-H-09 | Players learn to move early, because the last player's Pass can freeze the rooms at once; a Disabler with the last turn has a sure map | Movement closes when the final ordinary turn ends, and a Pass ends it (MOV-06) | When in a round moves are made; when last turns are passed |
| NV-H-10 | At a table, the one who taps a phone in the dark is the Disabler | Only an admitted Disabler has anything to tap in the window. The packet hides the request from every screen, but the players sit in one room | Observers at the table; asking players whom they saw; a build in which every phone shows the same dark board and takes the same tap |
| NV-H-11 | Matches get shorter and are decided by elimination more often; the showdown becomes rare | A side can be gone at the checkpoint of Round 2 (section 6), and every attack by Round 4 can kill | The round and the cause of every ending, for each number of players apart |
| NV-H-12 | Misses by timeout happen often enough on real phones to matter, and are felt as unfair because they spend the use | Ten seconds, one accepted tap, no second try, and a reconnection that shows no preview again | Requests, admissions, selections and timeouts, from the private research export |

NV-H-10 is the one this audit would raise first with the Designer and Frontend, because it costs little to prevent and nothing in the packet forbids preventing it. It is still a hypothesis.

### 8.4 What the first sessions should be asked

What the owner wants from these mechanics is not written as a target, and equal wins are not the obvious one for a game with unequal sides. Before any comparison between the three numbers of players: how long should a match be, how often should it reach the showdown, and how deadly should a jailing be? The sessions cannot be judged against an intention nobody has stated. The comparison of seven with eight players now also compares one Blackout with two, and the only way for two attacks to fall on one player before Round 4 exists from eight players on.

## 9. What exists today: the controls

No case of the next version can be run. What can be run is what the game does today at the same points. A control plays a short fixed line through a built engine, under one version's own ruleset and never under another, and holds the engine to what that ruleset's own sources say: rows of the rulebook, and the decisions of the vote-result and declared-Hack overlays. A control says something about that version only. A control whose rule is open holds the engine to nothing and is recorded, not passed.

The table and the paragraph under it are printed from the reports that are committed with this document.

<!-- generated:control-runs -->
| Ruleset | Build | What the build is | Controls run | Passed | Failed | Recorded, nothing expected | Not run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `in-person-v1-capacity-resolution-2026-10-12` | `abb6839` | full-game-1.3.0, the integration baseline, head of PR #114 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `bd4d77c` | full-game-1.4.0, Backend, head of draft PR #125 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `bd4d77c` | full-game-1.4.0, Backend, head of draft PR #125 | 18 | 18 | 0 | 0 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 18 | 18 | 0 | 0 | 0 |
| `in-person-v1-declared-hack-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 21 | 21 | 0 | 0 | 0 |
<!-- /generated:control-runs -->

<!-- generated:control-verdict -->
Run on 2026-10-14, in 6 runs: 147 control runs, 138 passed, 0 failed, 9 recorded with nothing expected, 0 not run. On the build that introduced each ruleset: 1.3, 27 of 27 passed; 1.4, 18 of 18 passed; 1.5, 21 of 21 passed. No control failed on any build, so nothing was found against the vote-result ruleset or the declared-Hack ruleset, nor against a later build playing an earlier ruleset.
<!-- /generated:control-verdict -->

Every control, every check with what was expected and what the engine did, and the controls of the controls are in [the evidence report](../evidence/2026-10-14-next-version.md). The matrices name, for each case, the control that shows today's behaviour at that point.

What each version is held to, for seven, eight and nine players each:

- **1.3:** a Jail vote closes straight into the resolution (V13-01). A Hack is one phase of sixty seconds, and the public view does not say who the partner is (V13-02). A move is accepted during the last player's Hack and refused in the Jail vote (V13-03). A Disabler names a player on their own turn, and an injury lasts without killing (V13-05). A Jailed and Injured player is in Jail (V13-06). A block changes no view but Undercover's (V13-07). A release takes the Captain's choice and a vote (V13-08). The showdown moves everybody to the Final Zone (V13-09). An Eliminated player's faction is public at once (V13-10). What the engine does with a move during an election is recorded (V13-04).
- **1.4:** every completed vote ends in a result of five seconds; what the vote decides applies when it closes and the round resolves when the result ends (V14-01, V14-04, V14-05, V14-06). Nothing is accepted during a result, a Code included (V14-02). A closure that comes late takes nothing from the phase after it (V14-03).
- **1.5:** a Hack is fifteen, five and sixty seconds; a declaration ends the first stage early, and without one the result says so (V15-01, V15-02). A player declares their own side, and Undercover and the Alien any (V15-03). The claim and the partner are read by the two only (V15-04). A move is accepted in all three stages, the last player's Hack included (V15-05). Late deadlines take nothing from the next stage (V15-06). A Code is refused in the two preludes and accepted in the conversation (V15-07).

The controls of 1.4 and 1.5 are the first independent runs of the two rulesets Backend published after the capacity audit. They are few and fixed. They are not an audit of those two versions in the sense of PR #104, and passing them is not acceptance of PR #125 or PR #131.

## 10. What Backend and Frontend have to provide

Each need is something a case waits for. None is a request to change a rule.

<!-- generated:needs-backend -->
| Need | What Backend provides | Cases that wait for it |
| --- | --- | --- |
| BE-01 | A new, immutable tuple of protocol, ruleset and engine version that every consumer adopts together, exported among the tuples the engine names, so that a run can ask for it by its ruleset. The five existing tuples keep playing exactly as they do. | every case |
| BE-02 | Positions in the authoritative state and in every view: a room and a position number for each player on the board; five, five, five, one and the roster count; the lowest free position for an entrant; players who enter in one step seated by player number; the starting positions; "off the board" for a player removed by EJECT. | BLK-09, BLK-11, BLK-15, BLK-16, MOV-01, MOV-02, MOV-03, MOV-12, MOV-13, SLOT-01, SLOT-02, SLOT-03, SLOT-04, SLOT-05, SLOT-06, CAP-01, CAP-02, CAP-16, CAP-19, HSP-02, HSP-03, HSP-04, HSP-10, HSP-18, HSP-19, HSP-20, HCK-05, BLK-18 (8, 9), BLK-23 (8, 9) |
| BE-03 | The movement window as server state: open from the round's first ordinary turn until its final ordinary turn ends, at that turn's deadline on the server's clock or at an accepted Pass, whenever the closure commits; destinations offered only while it is open; forced transfers independent of it. | MOV-01, MOV-02, MOV-03, MOV-04, MOV-05, MOV-06, MOV-07, MOV-08, MOV-09, MOV-10, MOV-11, MOV-12, MOV-13, MOV-14, MOV-15, MOV-16, CAP-15 |
| BE-04 | Phases and clocks: five seconds of result after every completed vote; the window after the Jail vote's result in every normal round, fifteen seconds, with the start of darkness as a server time and not as a second deadline task; every phase its full length from the commit that opens it; no phase waits for a client. | BLK-01, BLK-02, BLK-03, BLK-04, BLK-05, VOT-01, VOT-02, VOT-03, VOT-04, HCK-03, HCK-04, HCK-06, HCK-09, INT-03 |
| BE-05 | Commands and receipts: a Blackout request that names nobody; a selection that names a position and the snapshot; Clone activation; RELEASE; EJECT. Each is refused without effect when it is not allowed, with a reason a client can turn into "not now" or "used". The first valid selection is final. | BLK-01, BLK-02, BLK-03, BLK-04, BLK-05, BLK-06, BLK-07, BLK-08, BLK-09, BLK-10, BLK-11, BLK-12, BLK-13, BLK-14, BLK-15, BLK-16, BLK-17, BLK-24, BLK-25, BLK-29, BLK-30, BLK-31, BLK-32, BLK-33, BLK-34, BLK-35, BLK-37, CLN-01, CLN-02, CLN-03, CLN-04, CLN-05, CLN-15, CLN-16, CAP-01, CAP-02, CAP-03, CAP-04, HSP-17, HSP-21, VOT-03, HCK-08, BLK-18 (8, 9), BLK-19 (8, 9), BLK-20 (8, 9), BLK-21 (8, 9), BLK-22 (8, 9), BLK-23 (8, 9), BLK-26 (8, 9), BLK-36 (8, 9) |
| BE-06 | Private views: for a Disabler the state of the request (none, pending, cancelled with the use kept, admitted, selected, spent), and a stated answer to what the Disabler is told of the outcome beyond what the room and the table see; for the Alien the Clone (unused, active until the end of round n, ended); for an attacker "registered" and "completed" and never "blocked". | BLK-02, BLK-12, BLK-30, CLN-01, CLN-14, DEF-11, BLK-36 (8, 9) |
| BE-07 | Public view: the window and its stage; the Hack pair and stage; the two Captain allowances as used or unused; for each patient the round at whose end the episode is due; an Eliminated player whose faction is not yet shown, which today's schema forbids; reveals and victory at the end-of-round checkpoint only. The Clone appears nowhere but in the Alien's view. | CLN-01, CLN-04, CLN-05, CLN-06, CLN-07, CLN-08, CLN-09, CLN-10, CLN-11, CLN-12, CLN-13, CLN-14, CAP-02, CAP-12, CAP-17, HSP-01, HSP-05, HSP-06, HSP-13, HCK-01, HCK-02, INT-01, INT-02, BLK-21 (8, 9), CLN-17 (9) |
| BE-08 | Room events: one sanitized event for each block, for the seats in the target's room, delivered after the whole resolution, with an identity, an order and a time that carry no attacker, cause, grantor or resolution index. Nothing for other seats, the host or the display: no event, and no change of their view or of its revision. No history for a later entrant or on reconnection. The audience rule of NV-F-02 decided. | BLK-35, SLOT-03, CLN-06, CLN-07, CLN-08, CAP-10, HSP-06, HSP-16, DEF-01, DEF-02, DEF-03, DEF-04, DEF-05, DEF-06, DEF-07, DEF-08, DEF-09, DEF-10, DEF-11, DEF-12, DEF-13, SHW-07, BLK-20 (8, 9), BLK-21 (8, 9), BLK-26 (8, 9), CLN-17 (9) |
| BE-09 | Hospital: the injury episode in state, with its admission round and due round; death after the Rescue stage of the due round; the exceptions of Round 5 and the showdown; detention kept in Hospital; a healed detained patient to Jail; no Injured player published outside Hospital. Where a player eliminated by a second hit lies (NV-F-01). | BLK-02, BLK-11, BLK-24, BLK-32, BLK-33, SLOT-06, CAP-08, CAP-09, CAP-18, CAP-19, HSP-01, HSP-02, HSP-03, HSP-04, HSP-05, HSP-06, HSP-07, HSP-08, HSP-09, HSP-10, HSP-11, HSP-12, HSP-13, HSP-14, HSP-15, HSP-16, HSP-17, HSP-18, HSP-19, HSP-20, HSP-21, SHW-03, SHW-05, INT-01, INT-02, BLK-19 (8, 9) |
| BE-10 | Captain commands: validation (Captain, own ordinary turn, in Command Room, allowance unused, a living prisoner physically in Jail); effect atomic and at once; allowances for the whole match; the later turns of the ejected skipped and the vote of the same round counted without them. | BLK-13, MOV-07, MOV-10, MOV-16, SLOT-05, CLN-09, CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06, CAP-07, CAP-08, CAP-09, CAP-10, CAP-11, CAP-12, CAP-13, CAP-15, CAP-16, CAP-17, CAP-18, CAP-19, INT-01, INT-02 |
| BE-11 | Service behaviour: a repeated command returns the first receipt; two competing commands cannot spend one resource twice; a deadline task that comes late opens the next phase with its full time; reconnection gives the current state and the remaining time; an accepted selection survives a lost acknowledgement. | BLK-06, BLK-08, BLK-27, BLK-28, MOV-15, CLN-16, CAP-14, DEF-04, VOT-02, HCK-06 |
| BE-12 | The showdown without the Final Zone: nobody is moved; a special shot may name any other survivor; no Clone is active; Protection as today; a Healthy player who is hit goes to Hospital. | BLK-32, CLN-10, CLN-11, HSP-14, SHW-01, SHW-02, SHW-03, SHW-04, SHW-05, SHW-06, SHW-07, INT-03 |
| BE-13 | For the test binding: the pure engine keeps taking recorded turn orders, starting rooms and trusted times, and lets a test adapter read the server's truth for positions, the frozen snapshot, episodes, allowances, the Clone and the events each audience was given. | every case |
<!-- /generated:needs-backend -->

<!-- generated:needs-frontend -->
| Need | What Frontend provides | Cases that wait for it |
| --- | --- | --- |
| FE-01 | Adopt the new tuple together with Backend. A phase or command of a tuple the client does not know is refused, not guessed. | every case |
| FE-02 | Draw every player at the server's position. Nothing is reordered, compacted or re-seated on the client, and the same logical positions hold at every width. | MOV-01, SLOT-01, SLOT-02 |
| FE-03 | Offer movement only from the server's destinations; show that movement is closed after the final ordinary turn; animate a forced transfer whenever it comes. | MOV-01, MOV-04, MOV-05, MOV-06, MOV-08 |
| FE-04 | The window from server times: lit and dark stages; the remaining time on reconnection, without the preview again; numbered positions with no name, portrait, label, accessible name or highlight that identifies an occupant, the own position included; the first accepted selection final; no invented hit, miss or replacement. | BLK-01, BLK-02, BLK-08, BLK-09, BLK-10, BLK-17, BLK-27 |
| FE-05 | Room events from the seat's own feed only; one treatment whatever the cause; nothing on the shared display or a host screen; silent by default; nothing replayed on entering later or reconnecting. No asset fetched, no element rendered and no timing changed that tells the two causes apart or tells an outsider that anything happened. The same for the Clone: no public trace of activation, activity or end. | CLN-01, CLN-14, DEF-01, DEF-02, DEF-03, DEF-04, DEF-10, DEF-12 |
| FE-06 | The two command buttons in four states from the server (available, temporarily unavailable, accepted, used), the same on every screen and for every Captain. No success scene for a refused or unanswered command. | CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06, CAP-07, CAP-08 |
| FE-07 | Hospital from server state: the rescue opportunity in rounds; a detention marker on a patient. No client countdown that can show a death the server has not decided, or end the life of a patient of Round 5. | HSP-01, HSP-02, HSP-05, HSP-09, HSP-14 |
| FE-08 | The vote result for its five seconds without taking time from the next phase. The Hack's pair and stage for everyone, the claim for the two only, the entrance inside the five seconds, sixty seconds of conversation on the server's clock, and no microphone or recording sign. | VOT-01, VOT-02, VOT-04, HCK-01, HCK-02, HCK-03, HCK-04, HCK-05, HCK-07 |
| FE-09 | A player shown as Eliminated before their faction is shown, after an EJECT, and the reveal at the end of the round. | CAP-02 |
| FE-10 | The showdown over the unchanged board: targets in any room, in Hospital, in Jail and in Command Room. | SHW-01, SHW-02, SHW-03 |
| FE-11 | Tests that hold these for each audience (a seat in the room, a seat outside it, the shared display): that a block leaves no trace outside its room in the document, the accessibility tree, the network and the timing; that in darkness no position identifies its occupant; reduced motion; reconnection. | every case |
<!-- /generated:needs-frontend -->

The Designer's draft proposals PR #128 (fixed positions and a Hospital of seven, eight or nine beds), PR #129 (the window on those positions) and PR #130 (one ATTACK BLOCKED film for both defences) are the visual side of FE-02, FE-04 and FE-05. This audit has not reviewed them.

Two points for whoever writes the contract:

- **The public view of today cannot say "Eliminated, faction not yet shown".** Its schema requires a faction for every Eliminated player, and the engine shows it in the first phase after the resolution (control V13-10). After an EJECT the specification needs the opposite for the rest of the round (CAP-02).
- **The start of darkness should be a time in the phase and not a second deadline.** If the change from lit to dark waits for a task, a late task shortens or delays the darkness; a time that every phone and the server compute from the opening of the window cannot be late (BLK-04, BLK-05, VOT-02).

## 11. Requests to Integration

These are BAL-REQ-15 to BAL-REQ-18 in [integration-requests.md](../integration-requests.md): an answer to the findings; the packet committed, or its hashes pinned, so that a test in the repository can check the references; a seventh static test file, so that the checks of this suite need not be registered from another file; and pins for the acceptance files when a ruleset exists. Balance has changed no shared file and none of Integration's pins moves with this work.

## 12. What was not run

- Every case of the next version, with each number of players. The counts are in section 3.
- Any human play of these rules, and any measurement on a phone, a browser, the shared display or the hosted build.
- The service: receipts, retries, late tasks, reconnection. The controls drive the pure engine with trusted times; they do not show that a deadline task is delivered or repaired.
- Any simulation of the next version. A simulation needs rules to run, and writing them here would be a second engine. The random playouts of the earlier suites say nothing about these mechanics and were not rerun for this audit.
- The invariants, the research export and the playtest forms have nothing yet for the new mechanics. They are extended when a ruleset exists; until then the statements that should become invariants are cases (SLOT-02 among them).
- The two Backend drafts beyond the controls named above: their own test suites, their emulator runs and their consumers were not run again here.
