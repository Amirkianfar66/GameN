# Connected flow: what actions come to, and two more ends of a match

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-outcomes`, on top of the whole-match slice (draft [PR #56](https://github.com/Amirkianfar66/GameN/pull/56)) and the connected stack under it, on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged.

This adds no client code. The review of 7 October lists the outcomes that no browser run had followed: what a Disable, Protection, a Rescue, a Hack and an ordinary shot resolve to, an injured player healing, a Code attempt that is right, and a draw. This adds the journeys that follow them against the local emulators, and what those runs wrote.

## What the journeys do

**`MOTHERSHIP_JOURNEY=outcomes`**: nine players, two rounds, about 23 minutes. The script first has everybody stand in Room A, so that every seat can be named by every other. Then:

| Round | On its own turn | Registers |
| --- | --- | --- |
| 1 | the Officer | a shot at the Supplier |
| 1 | the Red Disabler | a Disable at the Insider |
| 1 | the Cracker | a Rescue of the Insider |
| 1 | the Undercover | Protection for the Alien |
| 1 | the first of the other four whose phone offers it | a Hack request with the first player its card lists |
| 2 | the Blue Disabler | a Disable at the Alien |
| 2 | the Cracker | a Rescue of the Supplier |

Nobody votes. At the first phase after each round's Jail vote the script reads every seat's public facts from each of the ten screens, the display's list of players from its page, what the display put in its live region, and what the phones concerned list in private.

**`MOTHERSHIP_JOURNEY=match-code`** and **`match-draw`**: the whole-match journey of the slice under this one, steered to two other ends. In the first, nobody is voted into Jail and the Hacker submits the Code the Alien's phone lists. In the second, three players are voted into Jail as before, the Code attempt is not the Code, and in the showdown the script has nobody shoot. About 45 minutes each.

**How to read the sentences.** Each one is either something the script required, so that the run would have stopped there had it not held, or something it read from a page and reports as read, or something the script itself did. In the first journey a sentence says an action was *registered at* a player, never that the player was shot or disabled: the registration is what the script required, and what became of it is in what was read afterwards. Which seat is Red or Blue is nowhere in these sentences except where a page says it.

## What was run

On 7 October 2026, macOS, Node 22.21.1, npm 10.9.4, headless Chrome 155 against the local Auth, Firestore and Functions emulators.

| Check | Result |
| --- | --- |
| `npm run verify`, clean, at the head of this branch | **630 passed**, 0 failed, 0 skipped, 0 todo: the same 630 as the slice under this one, since this adds no client code or test. Production exclusion: 46 modules reachable from 2 production entries, 139 files scanned, 23 development files labeled |
| `npm run check:browser-dependencies` | Passed |
| Browser journey, `MOTHERSHIP_JOURNEY=outcomes` | **Passed**, 1,345 s (22 minutes 25 seconds), at the first try with the corrected scenario. A trial of the scenario before its review had also passed (1,376 s); it is not the evidence |
| Browser journey, `MOTHERSHIP_JOURNEY=match-code` | **Passed at the second try**, 2,683 s (44 minutes 43 seconds). The match ended after round 5 without a showdown. The first try stopped ten minutes in, during round 2, with no error and nothing written after the setup: see below |
| Browser journey, `MOTHERSHIP_JOURNEY=match-draw` | **Passed**, 2,734 s (45 minutes 34 seconds). The match went to the showdown and ended there |
| The other journeys | **Not run again.** This changes no client code and, of the other scenarios, only the whole-match one, by giving it a parameter |

**A run that stops without saying so.** The first run to the Code ended ten minutes in with exit code 0, no error, and no result: its log has the three setup steps and nothing more, and two screenshots from round 1. Nothing had failed that the script could see. Its browser seems to have gone away, and a script waiting on a browser that is gone waits on nothing, so the process simply ended. I did not find out what took the browser; the machine was under heavy load from other sessions at the time. The second run passed and is the evidence. The lesson for anybody running these: **a run counts only if its log has the scenario's own "ESTABLISHED" line**; the exit code alone does not say so. Making the script notice a lost browser is a small change to the capture harness that this slice does not make.

### What the outcomes run established

In the journey's own words. They are also in [`evidence/connected-v1/outcomes/`](evidence/connected-v1/outcomes/).

- The journey followed 23 phases as the display showed them: "Round 1, Player 9’s turn", "Round 1, Player 4’s turn", "Round 1, Hack", "Round 1, Player 1’s turn", "Round 1, Player 6’s turn", "Round 1, Player 3’s turn", "Round 1, Player 5’s turn", "Round 1, Player 7’s turn", "Round 1, Player 2’s turn", "Round 1, Player 8’s turn", "Round 1, Jail vote", "Round 2, Captain election", "Round 2, Player 7’s turn", "Round 2, Player 1’s turn", "Round 2, Player 8’s turn", "Round 2, Player 4’s turn", "Round 2, Player 5’s turn", "Round 2, Player 2’s turn", "Round 2, Player 9’s turn", "Round 2, Player 3’s turn", "Round 2, Player 6’s turn", "Round 2, Jail vote", "Round 3, Captain election". That is every phase the display’s own page recorded.
- Before anything else the 4 players who were not in Room A (Player 2, Player 3, Player 6, Player 8) each moved there through their own cards, so that all nine stood in one room. The display then showed all nine in Room A.
- Round 1, on its own turn: Player 9 (the Cracker) registered a Rescue of Player 2 (the Insider). The phone said: "Rescue of Player 2 registered. This is not a result. Registered actions are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- Round 1, on its own turn: Player 4 (the Alien) requested a Hack with Player 1 (the Red Disabler), the first player its card listed. The phone said: "Hack request with Player 1 accepted. The phase shown at the top of this screen says what happens next."
- Round 1, on its own turn: Player 1 (the Red Disabler) registered a Disable at Player 2 (the Insider). The phone said: "Disable at Player 2 registered. This is not a result. Registered actions are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- Round 1, on its own turn: Player 3 (the Undercover) registered Protection for Player 4 (the Alien). The phone said: "Protection for Player 4 registered. This is not a result. Registered actions are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- Round 1, on its own turn: Player 8 (the Officer) registered a shot at Player 6 (the Supplier). The phone said: "Shot at Player 6 registered. This is not a result. Registered shots are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- Round 2, on its own turn: Player 7 (the Blue Disabler) registered a Disable at Player 4 (the Alien). The phone said: "Disable at Player 4 registered. This is not a result. Registered actions are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- Round 2, on its own turn: Player 9 (the Cracker) registered a Rescue of Player 6 (the Supplier). The phone said: "Rescue of Player 6 registered. This is not a result. Registered actions are resolved at the end of the round." A second and a half later every seat's public facts on the display were what they had been, and the phone's card said one action of its own was registered and waiting.
- The Hack: the server opened a phase called "Hack" straight after Player 4's turn. In it the two players' phones each said who with ("Hack: you and Player N."), no other phone had that line in its open private panel, and the display's text had no "you and Player". At the next turn, once both phones showed a phase that was not the Hack, neither phone had that line any more. Nothing else was read to have come of it.
- When "Round 2, Captain election" opened, straight after round 1's Jail vote, in which the script cast no ballot: all nine phones had every seat's place, health, Jail, Captain and reveal as the display had them, and the display's page worded each seat's place and health as its model had them. Player 6 (the Supplier), at whom the Officer's shot was registered: Injured in Hospital. Player 2 (the Insider), at whom the Red Disabler's Disable and the Cracker's Rescue were registered: Healthy in Room A. Player 4 (the Alien), for whom the Undercover's Protection was registered: Healthy in Room A. The other six: each Healthy in Room A, none jailed, Captain or revealed.
- What the display had put in its live region for that phase: "Round 2. Captain election. Jail vote counted. Nobody was sent to Jail. Player 6 is now Injured. Player 6 is now in Hospital.".
- On their own phones then, each compared with what it listed at round 1's first turn: the player the shot was registered at read "Hospital" "Your public status: Injured", and its list of what it is told had nothing new; the player the Disable and the Rescue were registered at read "Room A" "Your public status: Healthy", with nothing new; the player Protection was registered for read "Room A" "Your public status: Healthy", with nothing new.
- On the phones of those who acted, at the same moment and against the same first turn: the Undercover's list had "Protection for Player 4: active from round 2." new, and at that first turn, before anything was registered, it had listed nothing about Protection; the Officer's list had "Ordinary weapons you hold: 0." new and no longer had "Ordinary weapons you hold: 1."; the Cracker's had "Rescues you have left: 1." new and no longer had "Rescues you have left: 2."; the Red Disabler's had nothing new. No phone listed anything of its own as registered and waiting any more.
- When "Round 3, Captain election" opened, straight after round 2's Jail vote, again with no ballot from the script: all nine phones had every seat as the display had it. Player 4 (the Alien), at whom the Blue Disabler's Disable was registered in round 2, after the Undercover's phone had listed "Protection for Player 4: active from round 2." when round 2 opened: Healthy in Room A. Player 6 (the Supplier), of whom the Cracker's Rescue was registered in round 2 (when round 2 opened: Injured in Hospital): Healthy in Room A. Player 2 (the Insider): Healthy in Room A. The other six: each Healthy in Room A, none jailed, Captain or revealed.
- What the display had put in its live region for that phase: "Round 3. Captain election. Jail vote counted. Nobody was sent to Jail. Player 6 is now Healthy. Player 6 is now in Room A.".
- On the phones then, each compared with what it listed at round 2's first turn: the Undercover's list now had "Protection for Player 4: used up." about Protection; the list of the player Protection was registered for had nothing new; the player the round-2 Rescue was registered of read "Room A" "Your public status: Healthy", with nothing new; the Cracker's list had nothing new and no longer had "Rescues you have left: 1."; the Blue Disabler's had nothing new.
- The commands the nine phones sent, by type, each counted once: DISABLE 2, MOVE 4, PROTECT 1, REGISTER_SHOT 1, REQUEST_HACK 1, RESCUE 2. The display sent none. At the end each phone kept its sign-in, which match the tab is in and the Firebase SDK's own heartbeat record, and nothing else; no role, command type or seat identifier was in any of it.
- No page was loaded by anything but this script: each tab counted as many loads as the script made, and each refused the development server’s hot-reload connection.

**What this reading amounts to, in my words and not the journey's.** It is what the engine does with these seven registrations (`packages/engine/src/full-game/lifecycle.ts`, `resolveRound`): a shot or a Disable takes a Healthy player to Injured, and an Injured player who is free is placed in Hospital; a Rescue registered in the same round is applied after every hit of that round, so the player it was registered of ends the round as it began, with nothing public having changed; Protection registered in round 1 is in force from round 2 and takes the next hit in place of the player, after which the Undercover's phone lists it as used up; a Rescue of a player in Hospital makes that player Healthy and puts it back in its room. Every screen showed that and none showed more: the player a hit was registered at is told nothing in private, and neither is the player Protection was registered for.

### A match that ends by the Code

In the journey's own words. They are also in [`evidence/connected-v1/match-code/`](evidence/connected-v1/match-code/).

- The display followed 45 phases, in this order: five rounds, each with one turn for each of the seven players and then a Jail vote; a Captain election before each of rounds 2 to 5; no showdown; and the end. The script met each of them. As the display saw them, each of the 43 phases after the first lasted more than 58.5 seconds: the shortest 60.3 s and the longest 61.5 s. The first, counted from when the display first showed it, lasted 59.5 s.
- In the Captain elections before rounds 2, 3, 4, 5 the script cast no ballot, and each count said so: no vote for anybody, and "Nobody was elected."
- Round 1: on its own turn the Hacker scanned Player 1 guessing Blue, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was right, and that player is in the Code."
- Round 1, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 2: on its own turn the Hacker scanned Player 1 guessing Red, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Red. The guess was wrong."
- Round 2, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 3: on its own turn the Supplier registered a Supply for Player 1 and Player 2: each time the first player the card listed. A second and a half later the board had not changed and no phone listed a weapon more.
- Round 3: on its own turn the Hacker scanned Player 1 guessing Blue, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was right, and that player is in the Code."
- Round 3, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 4: the two players named in the Supply (Player 1 and Player 2) each hold one weapon more than before, and the other five hold what they held: each by the count on its own phone, read once that phone showed round 4. The display's text has nothing of weapons at any phase before the end.
- Round 4: on its own turn the Hacker scanned Player 1 guessing Red, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Red. The guess was wrong."
- Round 4, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 5, during Player 4's turn: the Hacker (Player 4) submitted its one Code attempt: the four seats the Alien’s phone lists as the Code. Accepted; the phone said it is recorded and did not write it out again. Afterwards no Code attempt was offered, while a move still was, and straight after it the phone listed nothing new.
- Round 5: on its own turn the Hacker scanned Player 1 guessing Blue, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was right, and that player is in the Code."
- The result, on the display and on all seven phones in the same words: "Red wins." Nobody was shown Injured, Eliminated or revealed. The display said the result once.
- The end reveal names a role for each of the seven seats, on the display and on every phone. Each one is the role that seat’s own phone showed its player in private at the start and still showed at the end, and the Code it lists is the one the Alien’s phone had listed. At each of the 44 phases before the end, the display’s text named no role and had nothing of weapons, the Code or a winner, and each phone named its own role and no other, apart from what its own seat is told.
- Every phone said the match is over, and its action card had no control left; the host console read the match as "complete". The display sent no command in the whole match.
- The commands the seven phones sent in the whole match, by type, each counted once: SCAN 5, SUBMIT_CODE 1, SUPPLY 1.
- At the end, what each device kept outside its page: each of the seven phones its sign-in, which match the tab is in and the Firebase SDK's own heartbeat record, and nothing else; in session storage the display kept mothership:connected-resume, the sign-in and the host console mothership:connected-resume, the sign-in. No role, Code, command type or target was in any of it.
- No page was loaded by anything but this script: each tab counted as many loads as the script made, and each refused the development server’s hot-reload connection.

### A match that ends in a draw

In the journey's own words. They are also in [`evidence/connected-v1/match-draw/`](evidence/connected-v1/match-draw/).

- The display followed 46 phases, in this order: five rounds, each with one turn for each of the seven players and then a Jail vote; a Captain election before each of rounds 2 to 5; a showdown after round 5’s Jail vote; and the end. The script met each of them. As the display saw them, each of the 44 phases after the first lasted more than 58.5 seconds: the shortest 60.3 s and the longest 60.8 s. The first, counted from when the display first showed it, lasted 59.6 s.
- In the Captain elections before rounds 2, 3, 4, 5 the script cast no ballot, and each count said so: no vote for anybody, and "Nobody was elected."
- Round 1: on its own turn the Hacker scanned Player 1 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Alien. The guess was right, and that player is in the Code."
- Round 1, Jail vote: four players voted through their cards to send Player 3 (Insider) to Jail, and the script cast no other ballot. The count the server published: Player 3 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 3." The display then showed Player 3 in Jail, marked Jailed.
- Round 2: on its own turn the Hacker scanned Player 1 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was wrong."
- Round 2, Jail vote: four players voted through their cards to send Player 5 (Cracker) to Jail, and the script cast no other ballot. The count the server published: Player 5 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 5." The display then showed Player 5 in Jail, marked Jailed.
- Round 3: on its own turn the Hacker scanned Player 1 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Alien. The guess was right, and that player is in the Code."
- Round 3: on its own turn the Supplier registered a Supply for Player 2 and Player 4: each time the first player the card listed. A second and a half later the board had not changed and no phone listed a weapon more.
- Round 3, Jail vote: four players voted through their cards to send Player 2 (Blue Disabler) to Jail, and the script cast no other ballot. The count the server published: Player 2 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 2." The display then showed Player 2 in Jail, marked Jailed.
- Round 4: the two players named in the Supply (Player 2 and Player 4) each hold one weapon more than before, and the other five hold what they held: each by the count on its own phone, read once that phone showed round 4. The display's text has nothing of weapons at any phase before the end.
- Round 4: on its own turn the Hacker scanned Player 1 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was wrong."
- Round 4, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 5, during Player 3's turn: the Hacker (Player 6) submitted its one Code attempt: four seats with the Undercover’s among them, which is not in the Code the Alien’s phone lists, so the attempt is not that Code. Accepted; the phone said it is recorded and did not write it out again. Afterwards no Code attempt was offered, while a move still was, and straight after it the phone listed nothing new.
- Round 5: on its own turn the Hacker scanned Player 1 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Alien. The guess was right, and that player is in the Code."
- Round 5, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- The server opened a showdown after round 5's Jail vote. By then the Insider, the Cracker and the Blue Disabler (Player 3, Player 5, Player 2) were in Jail, as the display still marked them, and the one Code attempt was not the Code.
- At the showdown, with round 5 resolved, the Hacker's phone listed what it had listed before the attempt, apart from its Scans: nothing about the attempt.
- Showdown: the display showed all seven players in the Final Zone, the three jailed players among them and still marked Jailed. A showdown shot was offered on all seven phones. The script had nobody register one. A second and a half later the board had not changed.
- The result, on the display and on all seven phones in the same words: "Nobody wins. The match is a draw." Nobody was shown Injured, Eliminated or revealed. The display said the result once.
- The end reveal names a role for each of the seven seats, on the display and on every phone. Each one is the role that seat’s own phone showed its player in private at the start and still showed at the end, and the Code it lists is the one the Alien’s phone had listed. At each of the 45 phases before the end, the display’s text named no role and had nothing of weapons, the Code or a winner, and each phone named its own role and no other, apart from what its own seat is told.
- Every phone said the match is over, and its action card had no control left; the host console read the match as "complete". The display sent no command in the whole match.
- The commands the seven phones sent in the whole match, by type, each counted once: SCAN 5, SUBMIT_CODE 1, SUPPLY 1, VOTE 12.
- At the end, what each device kept outside its page: each of the seven phones its sign-in, which match the tab is in and the Firebase SDK's own heartbeat record, and nothing else; in session storage the display kept mothership:connected-resume, the sign-in and the host console mothership:connected-resume, the sign-in. No role, Code, command type or target was in any of it.
- No page was loaded by anything but this script: each tab counted as many loads as the script made, and each refused the development server’s hot-reload connection.

### The review of the new scenario

Following the lesson of the slice under this one, the scenario was reviewed clause by clause by a separate session, with none of this work's context, **before** the run that is kept as evidence. A trial run was made at the same time and passed.

- The reviewer found **no selector, model field, command shape or rule that would stop the run**, and played the plan against the built engine over 3,000 random deals of roles, rooms and turn orders: every planned target was legal each time, and the run is always 23 phases.
- Of the 107 clauses the scenario could write, **81 were backed, 23 said more than was checked or read, and 3 were not backed**. Eleven of the 23 were one habit: calling a player "shot", "disabled", "rescued" or "protected" where the script had required only the registration. In this very run that would have printed "whom the Blue Disabler disabled" of a player whom Protection had kept unharmed.
- All of it is corrected in the scenario as committed: the sentences say "registered"; two claims about when something was listed now name the moment it was read; the order of phases is required where a sentence leans on it; what the display "said" is what it put in its live region; a phone's private panel is open when a line's absence is read from it; and what round 1 was to have is required when round 2 opens, not twenty minutes later.
- The two endings of the whole-match scenario were not given a second clause-by-clause review. They vary a scenario that had one, in the lines that name the ending.

### Seen on the way, for others

| | Seen | For |
| --- | --- | --- |
| **G25** | **During a Hack phase the public view names the player who requested it**: `activeSeatId` is the requester, in every view, the display's included. No page words it, and the two players' pairing is private. The rule sources do not say whether the requester is public | Game Balance and the owner |
| **G26** | **A Hack is a pairing and sixty seconds, and nothing else**: protocol 2 has no command for the question the v2.1 source describes, and nothing of the Hack is left on either phone afterwards. If the question is asked, it is asked at the table | Game Balance, to confirm that this is the in-person rule |
| **G27** | **A player a hit is registered at learns of it only from the public change**, and a player who is hit and rescued in the same round, or protected, learns nothing at all. That is how the engine has it, and I found no decision that says otherwise; it is listed because a person at the table will ask the app what happened | Game Balance, for the rulebook's wording |

### Not run

- In the outcomes journey: a hit that eliminates a player and the reveal that follows; a Scan, a Supply or a Code attempt (for these see the whole-match journey); a Captain, a release, a jailing; anything after the first phase of round 3.
- In the match that ends by the Code: any command of a type not listed above (a move, an ordinary shot, a Disable, Protection, a Rescue, a Hack request; their registration is in the other journeys), a Captain and a release, an injured player healing, a jailing, a showdown, a draw, a player being eliminated.
- In the match that ends in a draw: any command of a type not listed above (a move, an ordinary shot, a Disable, Protection, a Rescue, a Hack request; their registration is in the other journeys), a Captain and a release, an injured player healing, a showdown shot, a Code attempt that is the Code, a player being eliminated.
- A hit that eliminates a player in an ordinary round, and the reveal that follows it. The whole-match journey has an elimination and its reveal by showdown shots.
- A Captain's term, a release, and the Captain's immunity in the Command Room, in a browser on this branch. The voting journey of [#44](https://github.com/Amirkianfar66/GameN/pull/44) elects a Captain and holds a release vote; it has not had the clause-by-clause review.
- Eight-player matches, and anything on a hosted project.
- Phones, people, a screen reader.

## What this is, and is not

- **A real backend on one machine**: the Firebase web client, Security Rules, the protocol-2 service and its 60-second phases, run locally. No deployed project.
- **Steered runs.** Each shows that the screens carry one course of a match and agree with the server and with one another along it. None shows anything about balance or about how people play.
- **Not phones, not people, not a screen reader.** Phone-sized pages in headless desktop Chrome.
