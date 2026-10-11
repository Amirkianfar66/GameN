# Room capacity of five: Game Balance audit

An independent audit of the capacity rule of issue [#96](https://github.com/Amirkianfar66/GameN/issues/96), for games of seven, eight and nine players separately, and of Backend's implementation of it in PR [#98](https://github.com/Amirkianfar66/GameN/pull/98).

**What this establishes.** What the rule can and cannot do in a match, from the rules themselves; which of its consequences the decided cases leave open; and where the implementation does and does not do what the decided cases say. It does in every case written here but one: a healed player is sent to the wrong room when a Captain is hurt in the same round after entering Command Room (finding F1).

**What it does not establish.** That the rule is good for the game. Nothing here was played by people. Scripted cases and random playouts show what an engine does and what can be reached; they say nothing about how people move, bluff or vote. The service that draws starting rooms and orders two phones' moves was read, not run.

Every command, commit and report is in [evidence/2026-10-11-capacity.md](evidence/2026-10-11-capacity.md).

## 1. The rule and where it is recorded

The owner's words, 9 and 11 October 2026: "lets say the maximum capacity of each room is 5"; "yes enforce 5 as a hard rule"; "yes go with your recommendations for all six".

| Record | Where | Pin |
| --- | --- | --- |
| The rule and its six decided cases | Issue #96 | Opened and decided 11 October 2026 |
| The owner's words, verbatim | `docs/design/owner-decisions.md` in Designer's PR #88 | Commit `e01bbd7daf873a514948021b89098c8459bae19d`, SHA-256 `28addfef446053a74b7047a361fad77fa925abd3125e0a7e7ef34d222bdaa682` |
| Two further decisions, as Backend records them from its own assignment | `docs/decisions/2026-10-11-room-capacity.md` and `rules/overlays/room-capacity-owner-decision-2026-10-11.json` in Backend's PR #98 | Commit `b0ab7796b1157e3acc33d4dcee93ba5fdad6da66`; overlay SHA-256 `e4f72a7990c84dddb35d5b5416e33a33ad114394da7b6db2890fcb2d0d561468`, which is the ruleset hash |

The two further decisions are `CAP-ORDER-01`, quoted there as the owner's "Free healed Hospital places first, then use existing seat order", and the part of `CAPACITY-04` that leaves a prisoner released while Injured standing in Jail. This audit could read them only in Backend's record. They are taken as decided, and each row that rests on them says so.

Backend's record and PR speak of "the independent Balance audit" and "the Balance-role auditor". That was not this workstream: Game Balance had published nothing on capacity before this document. PR #98 says that audit "found no rule-correctness ... findings" and that "no capacity gameplay decision remains unresolved". This audit finds one defect and three open questions, in sections 6 and 7.

### The rows

The rulebook (`game-rules.md`, revision 4) describes the rulesets before this rule and is left as it is: matches of those rulesets go on being played under it. Its row R-STATE-09, "No rule limits how many players Room A, Room B, Hospital, Jail or the Final Zone may hold", holds for them and is replaced by the rows below for the ruleset that carries the rule. R-SETUP-07, the choice of a starting room, was already replaced on 8 October by a draw. The rows below are to be folded into the rulebook when the capacity ruleset is the reviewed one.

`OWNER`: the owner's decision, cited by where it is recorded. `DERIVED`: follows from the rows named. `OPEN`: not decided; no fixture asserts it. `ACCEPTANCE`: a condition of issue #96 on the implementation, not a rule of play.

| ID | Rule | Status | Sources |
| --- | --- | --- | --- |
| R-CAP-01 | At most five players are in Room A, Room B, Hospital and Jail at any time. Command Room keeps its one, the Captain. The Final Zone of the showdown is not a room and holds everyone left. | OWNER | `#96`, the rule |
| R-CAP-02 | A move into a room that holds five players is not offered, and is refused by the server if it is sent. | OWNER | `#96`, case 1 |
| R-CAP-03 | An Eliminated player keeps their place. | OWNER | `#96`, case 2 |
| R-CAP-04 | A sixth Injured player at the end of a round, with Hospital full, stays Injured where they are, and goes to Hospital at the next end of round that has a free place. | OWNER | `#96`, case 3 |
| R-CAP-05 | Jail holds five, and that is never exceeded. | OWNER | `#96`, case 4 |
| R-CAP-06 | Starting rooms are random, with at most five players in a room (nine players: five and four), and unrelated to role, character, faction and seat. | OWNER | `#96`, case 5 |
| R-CAP-07 | A player who is to return to their last room (healed, released, a Captain who lost the title) and finds it full goes to the other of Room A and Room B. | OWNER | `#96`, case 6 |
| R-CAP-08 | A refused move changes nothing for anyone and does not use the round's one move. | DERIVED | `R-ACT-09`, `R-CAP-02`, `R-MOVE-01` |
| R-CAP-09 | A move takes effect when the server accepts it. Of two moves for one last place, the first to arrive is accepted and the second is refused. | DERIVED | `R-MOVE-01`, `R-MOVE-07`, `R-CAP-02` |
| R-CAP-10 | A place is free from the moment the player who held it is located somewhere else: after their own move, in Command Room after an election, in Hospital or in Jail. | DERIVED | `R-CAP-01`, `R-STATE-06`, `R-CAPT-05` |
| R-CAP-11 | The other room always has a place for a returning player: Room A and Room B have ten places and a match has at most nine players. | DERIVED | `R-CAP-01`, `R-CAP-07`, `R-SETUP-01` |
| R-CAP-12 | The Jail limit never refuses anyone: a match has five Jail votes and each sends at most one player. | DERIVED | `R-VOTE-01`, `R-VOTE-03`, `R-FLOW-01`, `R-CAP-05` |
| R-CAP-13 | At most four, five and six players are Injured at once with seven, eight and nine players. Hospital can be short of a place only with nine players, and only when Round 4 or Round 5 resolves. | DERIVED | `R-SETUP-13`, `R-ROLE-05`, `R-ROLE-06`, `R-ROLE-07`, `R-ROLE-11`, `R-ROLE-17`, `R-SHOT-03`, `R-SHOT-05` |
| R-CAP-14 | When at most five players are Injured and free after a resolution, all of them are in Hospital. Nobody waits while Hospital has a place: the place a healed player leaves is free in that same resolution. | DERIVED | `R-CAP-04`, `R-CAP-18`, `R-STATE-06` |
| R-CAP-15 | A player in Hospital keeps their place until they are healed or sent to Jail. | DERIVED | `R-MOVE-02`, `R-STATE-06`, `R-STATE-07`, `R-STATE-08` |
| R-CAP-16 | A match under this ruleset does not start with six players in a room. | DERIVED | `R-CAP-01`, `R-CAP-06` |
| R-CAP-17 | Capacity adds no exception to the same-location rule: who may be named by an action is decided as before. | DERIVED | `R-ACT-02`, `R-ROLE-04`, `R-CAP-01` |
| R-CAP-18 | When a round has resolved, healed players leave Hospital first. Injured players are then placed in order of player number: where Hospital has fewer places than players hurt, the lower numbers get them and the others wait where they are. | OWNER | `CAP-ORDER-01`, in Backend's record |
| R-CAP-19 | Whether a healed player returns to a last room that a room-mate is leaving for Hospital in the same resolution is not decided. | OPEN | `CAP-D2` |
| R-CAP-20 | A prisoner released while Injured, with Hospital full, stays in Jail as a free player and is placed again at the next end of round. | OWNER | `CAPACITY-04`, in Backend's record; `#96`, case 3 |
| R-CAP-21 | A match keeps the ruleset it was created under. Matches, lobbies and replays of an earlier ruleset are not held to this rule. | ACCEPTANCE | `#96`, acceptance |
| R-CAP-22 | Which room is a player's last room after they were sent to the other one is not decided. | OPEN | `CAP-D4` |
| R-CAP-23 | A Captain who is hurt after entering Command Room goes to Hospital like any other Injured player. They hold no place in Room A or Room B on the way. | DERIVED | `R-CAPT-14`, `R-CAPT-07`, `R-STATE-06`, `R-ACT-06` |
| R-CAP-24 | Where a Captain lies who is Eliminated after entering Command Room, and where a Captain hurt there waits when Hospital is full, is not decided. | OPEN | `CAP-D5` |

### The questions

Three were open when the fixtures were written, before Backend's implementation was read (commit `ce4d9d0` of this branch holds the fixtures as they stood). Backend's record answers two. Two more came from reading and reviewing the implementation.

| ID | Question | Status | Answer, or what the implementation does |
| --- | --- | --- | --- |
| CAP-D1 | Which of several players hurt in one round gets the last place in Hospital | RESOLVED | The lower player number (`CAP-ORDER-01`, R-CAP-18). Nine players only. It follows no attack, so it tells the table nothing about who attacked whom |
| CAP-D2 | Whether a healed player returns to a last room that a room-mate is leaving for Hospital in the same resolution | OPEN | The implementation sends them to the other room: it seats healed players before the newly Injured leave. The owner's sentence is about Hospital places and does not speak of this. Seven, eight and nine players |
| CAP-D3 | Where a prisoner released while Injured goes when Hospital is full | RESOLVED | They stay in Jail, free (`CAPACITY-04`, R-CAP-20). Nine players only, Round 5 only |
| CAP-D4 | Which room is a player's last room after they were sent to the other one | OPEN | The implementation keeps the room of the player's last move of their own, so the next return goes back to the room they could not enter, not to the one they stood in. Seven, eight and nine players |
| CAP-D5 | Where a Captain lies who is Eliminated after entering Command Room, and where one hurt there waits when Hospital is full | OPEN | The implementation puts them in their last room, or in the other one if it is full, at the moment they are hit. An Eliminated Captain then holds one of that room's five places for the rest of the match. Seven, eight and nine players; the waiting half, nine only |

## 2. What was tested

| | Commit | Engine | Ruleset | Ruleset hash |
| --- | --- | --- | --- | --- |
| Backend's implementation, head of PR #98 | `dd04f68ee5af887b01761a03eca644f7a67e84dd` | `full-game-1.2.0` | `in-person-v1-capacity-2026-10-11` | `e4f72a7990c84dddb35d5b5416e33a33ad114394da7b6db2890fcb2d0d561468` |
| The same build, asked for the two earlier rulesets | `dd04f68ee5af887b01761a03eca644f7a67e84dd` | `full-game-1.1.0`, `full-game-1.0.1` | `in-person-v1-pass-2026-10-08`, `in-person-v1-2026-10-06` | `a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183`, `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| The engine before the rule, as a control | `1a92f3790e45622196014cc008544fc33c359c0a` | `full-game-1.1.0`, `full-game-1.0.1` | `in-person-v1-pass-2026-10-08`, `in-person-v1-2026-10-06` | as above |

`dd04f68` is `b0ab779`, the implementation, with one document changed.

<!-- results -->

| Run | Engine | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- | --- |
| The capacity fixtures under `in-person-v1-capacity-2026-10-11`, on the implementation | `dd04f68` | 85 | 3 | 10 | 15 |
| Control: the same fixtures under `in-person-v1-pass-2026-10-08`, on the engine before the rule | `1a92f37` | 2 | 86 | 10 | 15 |
| The Version 1 catalogue under `in-person-v1-pass-2026-10-08`, on the implementation | `dd04f68` | 516 | 0 | 33 | 6 |
| The same, on the engine before the rule | `1a92f37` | 516 | 0 | 33 | 6 |
| The Version 1 catalogue under `in-person-v1-2026-10-06`, on the implementation | `dd04f68` | 516 | 0 | 33 | 6 |
| The same, on the engine before the rule | `1a92f37` | 516 | 0 | 33 | 6 |
| The Version 1 catalogue under `in-person-v1-capacity-2026-10-11`, the implementation's own default | `dd04f68` | 24 | 492 | 33 | 6 |

The first row is the result of this audit: every case that an engine run decides passes but three, which are one case with each number of players and are finding F1. The second is the control: without the rule the cases fail, all but two that assert a return to a room with a place and hold either way. The next four show that the two earlier rulesets play on the new build as they did on the build before it. The last is finding F6. By number of players, the failing cases, the controls, the playouts, what the engine does in the blocked cases, and the commands: [evidence/2026-10-11-capacity.md](evidence/2026-10-11-capacity.md).

<!-- /results -->

## 3. Where the rule can bind

This table is arithmetic on the rulebook's resource and vote rows. A test holds it to the computed values.

| | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Places in Room A and Room B together that nobody holds when everyone is in a room | 3 | 2 | 1 |
| Damage a match has before the showdown | 4 | 5 | 6 |
| Of it, damage that can fall before Round 4 resolves | 1 | 2 | 3 |
| Most players Injured at once | 4 | 5 | 6 |
| First round whose resolution can leave a sixth Injured player | none | none | Round 4 |
| Most players waiting for Hospital at once | 0 | 0 | 1 |
| Most players Eliminated before the showdown | 2 | 2 | 3 |
| Most players sent to Jail in a match | 5 | 5 | 5 |

Three things follow, and they are the frame for everything else.

1. **Jail never refuses anyone**, with any number of players. A match has five Jail votes and each sends at most one player (R-VOTE-01, R-VOTE-03, R-FLOW-01); a release only lowers the number. The limit of five is reached only by five successful votes and no release, that is after the Round 5 vote. This confirms the fourth decided case, which asked Balance to confirm it from the vote rules.
2. **Hospital can be short of a place only with nine players, and only in one kind of match**: every damage the match has, six in all, has fallen on a different player, and none of them was healed. With seven players Hospital never fills (four at most). With eight it can be exactly full and never short. With nine the sixth player is hurt when Round 4 resolves, and then waits through Round 5, or when Round 5 resolves, and then the match is over or the showdown takes everyone. The next end of round after a wait is always the last one. So the third decided case puts a waiting player into Hospital only at the end of Round 5, where it can be seen if the match ends at the Round 5 check. By the time anyone waits, no damage is left to give: a waiting player cannot be attacked before the showdown.
3. **The rule is felt in Room A and Room B**, in every match, from the first moment: where players start, who can move, and where a healed or released player is put. With nine players one room is always full at the start and one place is free in the whole of the two rooms.

## 4. The nine areas, for seven, eight and nine players

The fixtures are in `tests/scenarios/capacity/`, one file per mode, numbered CAP-01 to CAP-43. A test holds this table to the files.

| | 7 players | 8 players | 9 players | All |
| --- | --- | --- | --- | --- |
| Fixtures | 35 | 35 | 43 | 113 |
| Ready: an engine run decides them | 27 | 27 | 34 | 88 |
| Blocked: a question is open, the case records what an engine does | 3 | 3 | 4 | 10 |
| Manual: not an engine run | 5 | 5 | 5 | 15 |

65 of the ready cases were written before the implementation was read. Two were then made ready on Backend's record of the owner's further decisions: cases 24 and 26, nine players only. An independent review of the fixtures then showed what they had missed, and 21 ready cases were added for it: cases 28, 29, 35, 39, 40 and 41 for each number of players, and cases 36, 37 and 38 for nine. The nine-player Hospital cases 21 to 26 were rebuilt in that review so that they tell the decided order from others, and one check that could not fail was dropped from case 13. No other expectation of the first 65 was changed.

### 4.1 Starting rooms

**The rule.** Random, at most five in a room, unrelated to role, character, faction and seat (R-CAP-06). The legal splits are 5/2 and 4/3 with seven players, 5/3 and 4/4 with eight, and only 5/4 with nine.

**The engine** takes the rooms it is given. CAP-01 and CAP-02 start a match at the fullest legal split, each room in turn. CAP-03 and CAP-04 give it six players in one room. The rule holds from the first moment, so no match under it begins that way (R-CAP-16); that the engine itself refuses is how the fixtures check it, and the six cases do not say which part of the system must.

**The service** draws the rooms. It was read, not run. Each player who asks to join is given an even draw of Room A or Room B, which is stored with their request. When the host approves the request, the player keeps that room if it has a place among the players already approved, and is given the other room if it holds five (`allocatedInitialRoom` in `services/game-api/src/full-game.ts`). No room can exceed five that way, and each player's own chance of Room A is one half. But whose draw counts depends on the order of approval, and the host chooses that order, chooses each player's number, and can read the stored room of every request before approving it (`infra/firebase/firestore.rules`, the rule for `admissions`). The table compares that method with two that do not depend on any order. It is exact arithmetic, held to the computed values by a test; it is not a measurement of the service.

| | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| **An independent, even draw for each player** (the rule of 8 October): six or more land in one room | 12.5% | 28.9% | 50.8% |
| **Every legal assignment equally likely**: splits | 5/2 37.5%, 4/3 62.5% | 5/3 61.5%, 4/4 38.5% | 5/4 100.0% |
| a room starts full | 37.5% | 61.5% | 100.0% |
| two given players start in the same room | 46.4% | 45.1% | 44.4% |
| **An even draw for each player, kept in the order they are approved; once a room holds five, the rest get the other**: splits | 5/2 45.3%, 4/3 54.7% | 5/3 72.7%, 4/4 27.3% | 5/4 100.0% |
| a room starts full | 45.3% | 72.7% | 100.0% |
| two given players start in the same room, from the least to the most likely pair of places in the order | 42.2% to 50.0% | 38.3% to 50.0% | 36.3% to 59.0% |
| the first two players approved start in the same room | 50.0% | 50.0% | 50.0% |
| the last two players approved start in the same room | 45.3% | 49.2% | 59.0% |
| the draw of the last player approved does not count: their room is settled by the others | 21.9% | 45.3% | 72.7% |
| **The most even split, in a random order**: splits | 4/3 100.0% | 4/4 100.0% | 5/4 100.0% |
| a room starts full | 0.0% | 0.0% | 100.0% |
| two given players start in the same room | 42.9% | 42.9% | 44.4% |

The third block is the service's method. With nine players the draw of the ninth player approved does not count in 72.7% of lobbies, that of the eighth in 45.3%, of the seventh in 21.9% and of the sixth in 6.3%; the first five always keep theirs. With nine players the last two approved start together in 59.0% of lobbies, against 44.4% for any two players under a draw that ignores the order and 50.0% for the first two approved. With eight it is 49.2%, and with seven the last two are together less often than the first two.

The first row says how often the order matters at all when everyone has asked to join before the host approves anyone: six or more players drew the same room in 12.5%, 28.9% and 50.8% of lobbies. In those lobbies the five who keep that room are the first five of them to be approved, and the host, who can read the draws, decides who they are. The lobby also shows each approved player's room at once, so once a room holds five anyone who sees the lobby knows which room the next player will be given.

One thing more, which is not new with this rule: a player who has not been approved yet can ask again, and each new request is given a new draw (`requestAdmission` keys a request by the player and the request's own identifier, and allows twenty). The player can read their own request's room. Finding F2.

**Not tested:** the service's draw itself, over many lobbies (CAP-30).

### 4.2 Moving into a full room

**The rule.** Not offered; refused if sent (R-CAP-02). Refused means nothing changes and the round's one move is not used (R-CAP-08, from R-ACT-09).

- CAP-05: with Room B full, nobody in Room A is offered it, and everybody in Room B is offered Room A.
- CAP-06: a move into it is refused; no audience's view changes; the mover has not moved.
- CAP-07: when a player leaves the full room, the place can be taken at once, also by the player who was refused. With nine players the full room is then the other one.
- CAP-08: two moves for one last place, one after the other. The first is accepted and the second refused (R-CAP-09).
- CAP-09: a Blue Disabler outside a full room can neither enter it nor name anyone in it.
- CAP-40: the same refusal during a Hack conversation, which is a moment before voting like any other, and while a Captain is elected. Whether a player may move at all during an election is not decided (D16); a move into a full room is refused under either answer.

In every playout each player's offers were also held against the engine's answers: a move that was offered must be accepted, and one that was not must be refused.

| Places free in the two rooms at the start | 7 players | 8 players | 9 players |
| --- | --- | --- | --- |
| Who can move before anyone leaves a room | Anyone, unless they are outside a room of five (5/2 start) | Anyone, unless they are outside a room of five (5/3 start) | Only the five of the full room, one at a time; each move makes the other room the full one |

**Not tested:** two phones sending at the same moment through the service (CAP-32); what a refused mover is shown (CAP-34).

### 4.3 Eliminated players

**The rule.** An Eliminated player keeps their place (R-CAP-03).

- CAP-10: two attacks eliminate a player in a full room; the room still counts five and still cannot be entered. With seven players the earliest two attacks can meet is Round 4; with eight and nine, Round 1.
- CAP-39: the place counts against a forced return as well. A released player whose last room holds four living players and one Eliminated goes to the other room.

Where an Eliminated player lies:

- A player hit twice in a room lies in that room.
- A player voted into Jail in the round in which two attacks on them resolve lies in Jail, and holds one of its places. The Jail vote comes before the attacks in the resolution (R-RES-01). The bound on Jail still holds, because it is a bound on how many are ever sent.
- A Captain who was named twice in a room and then entered Command Room is hit inside it (R-ACT-06). Where they lie is not decided (CAP-D5). The implementation puts them in their last room, or in the other one if it is full, and they hold a place there. CAP-42 records it at 7, 8 and 9.

A match has at most two, two and three Eliminated players before the showdown with seven, eight and nine. Each closes one place for the rest of the match. With nine players three Eliminated players in one room leave it two places for the living.

### 4.4 Hospital

**The rule.** R-CAP-04, R-CAP-13, R-CAP-14, R-CAP-15, R-CAP-18.

- CAP-21, seven players: all four damage fall on four players; Hospital holds four. There is no fifth damage.
- CAP-21, eight players: all five fall on five players; Hospital is exactly full and nobody waits. There is no sixth.
- CAP-21, nine players: all six fall on six players by the end of Round 4. Five are in Hospital, the sixth waits in their room, and the three who were there before keep their places, player 9 among them.
- CAP-22, nine players: the same with player 9 healed in Round 4. Five players are Injured afterwards and all five are in Hospital: the place the healed player leaves is free in that resolution (R-CAP-14). An engine that placed everyone in one pass by number would leave player 7 waiting.
- CAP-24, nine players: of the three hurt in Round 4, players 2 and 4 get the two places and player 7 waits. The order of the attacks, and the order of that round's turns, would each have left player 4 waiting, and an order by number over patients and newcomers alike would have put player 9 out. The case tells all four apart.
- CAP-36, nine players: **a place that becomes free.** The waiting player waits through Round 5; Cracker heals a patient in Round 5; when the round resolves the waiting player is in Hospital. The match ends at the Round 5 check, so the placement can be seen.
- CAP-37, nine players: **what waiting changes for the player who waits.** Cracker reaches into Hospital from either room (R-ROLE-04), and a waiting player is not in Hospital. From the other room Cracker cannot name them; having moved into their room, Cracker can, and heals them.

A patient in Hospital can be named from outside only by Cracker's Rescue; patients can still ask each other for a Hack. A player waiting in a room can be named by whoever shares the room: a Scan, a Hack request, Protection, a Rescue. They cannot be attacked, because no damage is left.

### 4.5 Transfers at the same moment, and their order

| Transfer | What settles the order | Fixture |
| --- | --- | --- |
| Two moves for the last place | The order in which the server takes them (R-CAP-09). Within a resolution the order of arrival never matters (R-RES-02). Before it, who acts first already decided whether a target had left before an attacker named them; now it also decides who gets a last place | CAP-08; through the service, CAP-32 |
| Several players hurt in one round, fewer places in Hospital | Healed players leave first, then player number (R-CAP-18) | CAP-22, CAP-24 |
| A released player and a healed player, one last place, one round | The release, which takes effect when its vote closes, before the round resolves (R-VOTE-10) | CAP-41 |
| A healed player returning while a room-mate leaves for Hospital | Not decided (CAP-D2). The implementation seats the healed player first, so they find the room full | CAP-25, at 7, 8 and 9 |
| A healed player returning while a Captain is hurt inside Command Room | The hurt Captain goes to Hospital and is never in a room (R-CAP-23). The implementation sets them down in their last room for a moment, and the healed player is turned away from a room that had a place before and has one after. **Finding F1** | CAP-28, at 7, 8 and 9: fails |

At most one player is healed in a round, because Cracker has one Main Action a turn (R-ACT-01). So two healed players never compete for one place.

### 4.6 Jail

CAP-19: one player is sent to Jail in each of the five rounds, with seven, eight and nine players. Jail holds one more after each round and five at the end; the players sent include every Red player, so Blue wins at the Round 5 check and the match ends with the five in Jail. There is no sixth vote.

A released prisoner who is Injured and finds Hospital full stays in Jail as a free player (R-CAP-20). CAP-23 holds that Hospital does not take a sixth, CAP-26 that the player is free, stands in Jail and may be voted for again, and CAP-38 that they go to Hospital when a place comes free.

### 4.7 Where healed and released players go, and a Captain who loses the title

**The rule.** The last room; the other one if it is full (R-CAP-07). The other room always has a place (R-CAP-11): nobody can be left without one.

- CAP-12 and CAP-13: healed, last room with a place and without.
- CAP-14 and CAP-15: released, the same two.
- CAP-18: a Captain is voted into Jail from Command Room and released later. Their last room is the room they were elected from; it was filled meanwhile, and they go to the other.
- CAP-29 and CAP-35: **a Captain who loses the title and reaches a room at once.** A Captain is named by an attack and by a Rescue while in a room, then enters Command Room. The attack resolves first and takes the title (R-RES-01, R-CAPT-07); the Rescue heals; a player who is no longer Captain and is Healthy returns to their last room (R-CAPT-14), or to the other if it is full. This is the sixth decided case's "a Captain who loses the title", reached directly.
- CAP-28: a Captain hurt the same way and not healed goes to Hospital, and must not keep a healed player out of the room on the way. Finding F1.
- CAP-25 (CAP-D2), CAP-27 (CAP-D4), CAP-42 and CAP-43 (CAP-D5) are blocked and record what the implementation does where no decision reaches.

That a forced return uses none of the player's movement (R-MOVE-06) cannot be seen in a run: a release comes after the last moment for moving, and a healing at the end of the round.

### 4.8 Command Room and the Final Zone

- CAP-16: the elected Captain is placed in Command Room, which frees their place in the room; Command Room holds one; the Captain can leave for either room that has a place and can always come back.
- CAP-17: a Captain in Command Room is offered only a room with a place, a refused move leaves them inside with their move unused, and from a room they are offered Command Room whatever the rooms hold.
- CAP-20: Power is equal at the Round 5 check and the showdown begins. All seven, eight or nine players are in the Final Zone, Injured and Jailed players included.

Command Room does not shelter a Captain who was named before entering it (R-ACT-06). That is the rule as it was; with capacity it decides who holds which place, in CAP-28, CAP-29, CAP-35, CAP-42 and CAP-43.

### 4.9 Matches that already exist, and whether anything can lock

**Earlier rulesets.** The whole Version 1 catalogue of Balance, 555 fixtures, was run under each of the two earlier rulesets on the new build and on the build before it. Every fixture has the same result on both builds, and seeded playouts under each earlier ruleset end in the same states on both. The numbers are in the results above. The cases in which a sixth player enters a room are among them: under an earlier ruleset the new build still lets that happen.

**Lobbies.** A lobby records its ruleset when it is created (`engine/gameplayPins`), and a lobby without that record is taken as the oldest ruleset. So a lobby that drew six players into one room before the rule starts under its own ruleset, and a lobby created after it never draws six. Read in the service; not run (CAP-31, CAP-33).

**Can anything lock?**

| Could it happen | Answer |
| --- | --- |
| A healed or released player with no room to go to | No. Ten places, at most nine players (R-CAP-11) |
| A player shut inside a full room | No. If a room holds five, the other holds at most four, so anyone inside can leave. Players are shut out, never in |
| Nobody able to move at all | No. Moving is never required, and at least one room always has a place |
| A sixth player for Jail | No (section 3) |
| A sixth player for Hospital | With nine players only. They wait (R-CAP-04, R-CAP-20). The engine places nobody as a sixth |
| A match that cannot go on | None found in the scripted cases or in the playouts of the evidence; the independent review reports none in some ten thousand further playouts of its own. The engine stops with an error only for a state the rules cannot produce: six in a room at the start, a sixth in Jail, no room for a return |

## 5. What capacity does to targeting, Rescue, movement and victory

**Targeting.** The same-location rule is unchanged (R-CAP-17). What changes is who can come to share a location. Every action that names another player needs it: both Disablers, ordinary shots, Protection, Supplier's weapons, a Scan, a Hack request, and Rescue outside Hospital (R-ACT-02). A room of five cannot be joined, so nobody outside can do any of these to the five inside until one of them leaves (CAP-09). Once an action is registered, where its target goes afterwards does not matter (R-ACT-06): moving away saves a player only from those who have not yet had their turn, and entering Command Room does not save a Captain who was already named.

**Rescue.** Cracker's reach into Hospital from either room is unchanged. A healed player may now come back to the other room (CAP-13). A player waiting for Hospital is out of that reach and can be healed only from their own room (CAP-37). A prisoner released while Injured who stands in Jail cannot be healed at all while they stand there, because nobody free and Healthy is ever in Jail.

**Movement.** One move a round, at any moment before voting, as before; now only into a room with a place. Three structural facts:

- With nine players and everyone in a room, exactly one place is free. Only someone in the full room can move, and their move makes the other room the full one. Two players can change rooms in a round only by one going each way.
- A place goes to whoever's move arrives first. A move is not tied to a turn, so this is decided by who acts first at the table.
- Places come free as the match goes on, when players go to Jail, to Hospital or to Command Room, and are lost for good where a player is Eliminated.

**Victory.** No victory condition reads a location: Power counts Healthy, free players wherever they are (R-WIN-01), and the Code and the eliminations do not depend on rooms. Capacity cannot change who has won a given position. It changes which actions could be taken on the way there.

## 6. Findings

Three kinds, kept apart: what a run or the code shows; what may follow for balance and is a hypothesis; what only people at a table can answer.

### 6.1 Shown by a run, by the code or by arithmetic

| | Finding | Shown by | For |
| --- | --- | --- | --- |
| F1 | **A defect.** A healed player is sent to the other room although their last room had a place before the round resolved and has one after it. It happens when a Captain who was attacked in that room, and then entered Command Room, is hurt in the same resolution: the implementation sets the hurt Captain down in their last room at the moment of the hit, counts them there when it seats the healed player, and only then takes them to Hospital. By the rules an Injured Captain goes to Hospital and is in no room on the way (R-CAPT-14, R-STATE-06), so the sixth decided case does not apply: the room is not full | CAP-28 fails with 7, 8 and 9 players: Insider is in Room A, and Room B, their last room, holds four. The capacity invariant INV-CAP-03 names the same thing. On the engine before the rule the case's own checks hold | Backend |
| F2 | **Starting rooms depend on the order in which the host approves players, and the host can see the draws.** Each player's own room is an even draw. But when six or more drew the same room (12.5%, 28.9% and 50.8% of lobbies with seven, eight and nine players, if all have asked before anyone is approved), the first five approved keep it and the rest are moved, and the host chooses the order, chooses the numbers and can read each request's room first. The draw of the last player approved does not count in 72.7% of nine-player lobbies. A room also starts full more often than under an order-free draw (45.3% against 37.5% with seven, 72.7% against 61.5% with eight). A player not yet approved can also ask again and be given a new draw; that was so before this rule. The decision says "unrelated to ... seat", and the decision of 8 October says players do not choose their room. Drawing all rooms at once when the roster is complete removes all of it | The code of the service and the database rules, read; the arithmetic of section 4.1. Not run against the service | Backend; the owner, for when rooms are drawn |
| F3 | **A healed player can be sent to the other room although their last room has a place when the round is over** (CAP-D2). The implementation seats healed players before the newly Injured leave their rooms. It is the same mechanism as F1, with one difference: here the room really holds five before the round resolves, so the decided case can be read either way | CAP-25 at 7, 8 and 9: Insider is placed in Room A; Room B, their last room, ends the resolution with four. Random play reaches such returns too: the playout table of the evidence counts them | The owner |
| F4 | **After being sent to the other room, a player's last room is still the one they could not enter** (CAP-D4). Their next return goes there if it has a place, not to the room they stood in. The owner's decision V1-02 says "their last A/B room" | CAP-27 at 7, 8 and 9: Supplier, hurt in Room A after being sent there, is returned to Room B | The owner |
| F5 | **Where a Captain goes who is hit after entering Command Room is not decided when they are Eliminated, or hurt with Hospital full** (CAP-D5). The implementation uses their last room, or the other one if it is full. An Eliminated Captain then holds a place in a room they were not in when they were hit | CAP-42 at 7, 8 and 9: the Captain lies in Room B. CAP-43 at 9: the Captain waits in Room A | The owner |
| F6 | **The Version 1 catalogue cannot run under the new ruleset.** 510 of its 526 fixtures with a setup start with more than five players in one room, as the earlier rules allowed. Under the new ruleset the engine refuses those starts. So the catalogue's cases on who is told what, on the order of resolution, on votes and on victory have not been run under the ruleset new matches will use. They pass, unchanged, under the two earlier rulesets on the new build | The catalogue under the new ruleset: the last row of the results | Balance, to re-seat the catalogue; Integration, to keep its gate on the earlier ruleset until then |
| F7 | **A free player can stand in Jail** (R-CAP-20): a prisoner released while Injured when Hospital is full. The public facts then show `jailed: false` with location Jail, and no Cracker can heal them there. Nine players, Round 5 only | CAP-26, CAP-38 | Designer and Frontend, to show it; the owner, to confirm |
| F8 | The Jail bound of the fourth decided case is confirmed from the vote rules (R-CAP-12) | Section 3; CAP-19 at 7, 8 and 9 | Closed |
| F9 | The clause "the next end of round that has a free Hospital place" can only mean the end of Round 5 | Section 3; CAP-36 | Note |
| F10 | Nothing can lock (section 4.9) | R-CAP-11; playouts | Closed |

Apart from F1, every case that an engine run decides passes; the capacity invariants held at every step of every playout; and the earlier rulesets play as before.

### 6.2 Hypotheses about balance

None of these is shown. Each says what to look for.

- **H1. The rule weighs most with nine players, less with eight, least with seven.** One, two and three places are free at the start. If capacity changes how matches go, the nine-player game should show it first.
- **H2. It favours whoever is already where they want to be.** A player in a room of five cannot be reached from outside; a pursuer who is shut out loses the round. If attacks fall less often before Round 4, more matches reach the Round 5 comparison of Power, where Blue starts with more players. Which side that helps is not known.
- **H3. The random start matters more than before.** With nine players a player's room-mates in Round 1 are given by the draw and can change by one player at a time. Blue Disabler, Red Disabler and Officer can act from Round 1, and whom they can reach is decided by the draw.
- **H4. Holding a place is a new move.** A player can take the last place in a room to keep someone else out, to shield a room-mate or to isolate one. It is public, so it is also a signal.
- **H5. Hacker's Scans are slowed.** One Scan a round, on a player in the same room. With rooms of five Hacker reaches fewer players without moving, and cannot always move.
- **H6. Speed at the phone becomes part of the game.** The last place goes to the first move to arrive.
- **H7. With seven and eight players, an even split at the start (4/3, 4/4) would leave no room full at the start**, against 45.3% and 72.7% of lobbies under the present method. The owner chose a random start; this is a lever, not a proposal.
- **H8. Command Room becomes a way to hold a place for later, and a way to lose one.** A Captain's last room is remembered while they are inside, and the place they left can be taken.

### 6.3 Questions for human playtests

1. Do players understand why a room is not offered, and why a move that was offered a moment ago is refused?
2. Is the contest for the last place felt as fair? Does it draw eyes to the phones and away from the talk?
3. With nine players, does Round 1 feel fixed? Do players use the one free place, and do they block?
4. Does the draw of starting rooms produce first rounds that players call unfair? Does the host notice that the order of approval settles who is moved?
5. Does an Eliminated player's place surprise anyone?
6. Does anyone ever wait for Hospital? (Expected: almost never. It needs all six damage on six players.)

Random playouts cannot answer any of these, and are not offered as an answer.

## 7. What is left for the owner

| | Decision | What the implementation does now | Stakes |
| --- | --- | --- | --- |
| 1 | **When starting rooms are drawn** (F2): for each player as they join, which lets the order of approval, and so the host, settle who is moved from a room that six or more drew; or all at once when everyone has joined | For each player as they ask to join, settled as they are approved | Every match. Recommended: all at once, every legal assignment equally likely |
| 2 | **CAP-D2** (F3): a healed player's last room has a place only because a room-mate is leaving for Hospital in the same resolution. Do they return to it? | No: the other room | Any mode, uncommon. Recommended: yes, seat returning players after the Injured have left. The same change mends F1 |
| 3 | **CAP-D4** (F4): after being sent to the other room, which is a player's last room? | The room they could not enter | Any mode, rare. Recommended: the room they were last in |
| 4 | **CAP-D5** (F5): a Captain who is hit after entering Command Room. Where do they lie if Eliminated, and where do they wait if Hospital is full? | Their last room, or the other if it is full | Any mode, rare; the waiting half, nine players only |
| 5 | **Confirm R-CAP-20** (F7): a prisoner released while Injured, with Hospital full, stands in Jail as a free player | As recorded by Backend from the owner's words | Nine players, Round 5 only |

None of the five blocks play. The first changes every match a little; the others change rare moments. F1 is not on this list: it is a defect against a decided case, and needs no decision.

## 8. For Integration and Backend

The requests are in [integration-requests.md](integration-requests.md) as BAL-REQ-10 to BAL-REQ-13. In short: this suite and its invariants as the Balance gate for the capacity ruleset; the Version 1 gate kept on the earlier ruleset by asking for it by name; the starting rooms (F2); and the defect (F1).

Backend's PR changed the Balance engine binding so that the Version 1 catalogue is always created under the Pass ruleset. This branch does the same by a named ruleset (`--ruleset`), and records the build beside the ruleset under the same three names Backend's change uses, so that Integration's gate reads them as it does now.

## 9. How this was checked, and its limits

**An independent review.** After the first version of this audit (commit `8eb5cef`) a separate Claude Code agent, not a person, was given its own clone and asked to break it. It found that no expectation was wrong, and that the audit had missed a whole situation: a Captain hit after entering Command Room, which this document had called impossible. That is where F1, F5 and cases 28, 29, 35, 42 and 43 come from. It also showed, by changing a copy of the engine, that the first nine-player Hospital cases passed on an engine without the decided order, that nothing checked a waiting player was ever admitted, and that an Eliminated player's place and a full room outside ordinary turns were checked only by playouts. Each has a case now. Three invariants were added (INV-CAP-04 to 06) for a player moved who should have stayed. The changes made after that review have not themselves been reviewed independently.

**Limits.**

- No human played. No balance claim is made.
- The service was read, not run: the draw of starting rooms, the order of two phones' moves, lobbies and matches of earlier rulesets, replays. Backend reports its own tests of these in PR #98.
- Random playouts start from every legal split, try full rooms often and check the invariants at every step. They reach a full Hospital seldom and a waiting player never; those are reached by the scripted cases.
- The deliberate leaks of the Version 1 gate were not run against the new build, and its mutation controls only for the capacity fixtures.
- The catalogue's own cases have not run under the new ruleset (F6).
- INV-CAP-03 takes the engine's own record of a player's last room. Which room that should be after a forced move is CAP-D4.
- The changes made after reading Backend's record (cases 24 and 26, R-CAP-18 and R-CAP-20) rest on that record of the owner's words, which this audit could not check against the owner.
