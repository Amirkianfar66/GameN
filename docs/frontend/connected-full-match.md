# Connected flow: one whole match in browsers

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-full-match`, on top of the connected stack (draft pull requests [#42](https://github.com/Amirkianfar66/GameN/pull/42), [#44](https://github.com/Amirkianfar66/GameN/pull/44), [#48](https://github.com/Amirkianfar66/GameN/pull/48), [#49](https://github.com/Amirkianfar66/GameN/pull/49) and [#50](https://github.com/Amirkianfar66/GameN/pull/50)), on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged.

This adds no client code. It adds a browser journey that plays **one seven-player match from its lobby to its result** against the local emulators, and what that run wrote. It is the first time the connected client has been taken through a whole match, and the only browser run of a Supply, a Code attempt, a showdown and a finished match's result.

## What the journey does

A host, a shared display and seven players, each in a browser context of its own, in headless Chrome. Every phase is a real 60-second server window that ends only at its deadline, so the match takes about three quarters of an hour.

The script can see all seven phones, which no player can. It uses that for two things:

- **To steer the match somewhere worth looking at.** The Jail votes of rounds 1 to 3 jail three Blue players. After round 5 Blue's power then does not exceed Red's, which is what the engine's victory check asks for a Blue win there (`packages/engine/src/full-game/victory.ts`), and the Hacker's one Code attempt is wrong: it has the Undercover's seat in it, which the engine never puts in the Code (`packages/engine/src/full-game/roster.ts`). With no winner, the server opens a showdown. That is the script's reason for what it does, read from the engine; what the run itself shows is only that the showdown followed.
- **To check the screens against one another.** A Scan's result is checked against the scanned player's real faction and against the Code the Alien's phone lists. At the end, the role the reveal names for each seat is checked against the role that seat's own phone had shown its player in private at the start.

Nothing is decided by the script. What each action comes to is whatever the server says.

**How to read the run's sentences.** Each one is either something the script required, so that the run would have stopped there had it not held, or something the script read from a page and reports as read: a count the server published, a line a phone listed, how long a phase lasted, which phones offered a control. Where a sentence says what the script did ("cast no ballot", "each time the first player the card listed"), that is the script's own doing and not an observation.

## What was run

On 7 October 2026, macOS, Node 22.21.1, npm 10.9.4.

| Check | Result |
| --- | --- |
| `npm run verify`, clean, at the head of this branch | **630 passed**, 0 failed, 0 skipped, 0 todo: the same 630 as the slice under this one, since this adds no client code or test. Production exclusion: 46 modules reachable from 2 production entries, 139 files scanned, 23 development files labeled |
| `npm run check:browser-dependencies` | Passed |
| Browser journey, `MOTHERSHIP_JOURNEY=match` | **Passed**, 2,734 s (45 minutes 34 seconds), on the code of this branch. Headless Chrome 155, one browser context for each device: a host, a shared display and seven players, against the local Auth, Firestore and Functions emulators |
| The other journeys at the top of the stack | **All passed**, before the change to this scenario described below, which touches no other scenario: the default journey (seven players, a move) in 73 s at the first try; the nine-player shot journey in 133 s; the roles journey (nine players, a whole first round) in 433 s |
| The voting journey | **Not run again** on the final code. It passed on this stack before the corrections that followed the reviews of the slices below (1,222 s). The whole-match journey casts ballots through the same card on the final code |
| Emulator tests | Not run on this branch, which changes no client code or test. 6 of 6 passed on the code of the slice under this one |

### What the run established

In the journey's own words. They are also in [`evidence/connected-v1/match/`](evidence/connected-v1/match/), with every phase the display followed and how long each lasted.

- The display followed 46 phases, in this order: five rounds, each with one turn for each of the seven players and then a Jail vote; a Captain election before each of rounds 2 to 5; a showdown after round 5's Jail vote; and the end. The script met each of them. As the display saw them, each of the 44 phases after the first lasted more than 58.5 seconds: the shortest 60.5 s and the longest 60.7 s. The first, counted from when the display first showed it, lasted 59.4 s.
- In the Captain elections before rounds 2, 3, 4, 5 the script cast no ballot, and each count said so: no vote for anybody, and "Nobody was elected."
- Round 1: on its own turn the Hacker scanned Player 2 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 2 and guessed Alien. The guess was right, and that player is in the Code."
- Round 1, Jail vote: four players voted through their cards to send Player 6 (Insider) to Jail, and the script cast no other ballot. The count the server published: Player 6 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 6." The display then showed Player 6 in Jail, marked Jailed.
- Round 2: on its own turn the Hacker scanned Player 2 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 2 and guessed Blue. The guess was wrong."
- Round 2, Jail vote: four players voted through their cards to send Player 5 (Cracker) to Jail, and the script cast no other ballot. The count the server published: Player 5 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 5." The display then showed Player 5 in Jail, marked Jailed.
- Round 3: on its own turn the Supplier registered a Supply for Player 1 and Player 4: each time the first player the card listed. A second and a half later the board had not changed and no phone listed a weapon more.
- Round 3: on its own turn the Hacker scanned Player 2 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 2 and guessed Alien. The guess was right, and that player is in the Code."
- Round 3, Jail vote: four players voted through their cards to send Player 1 (Blue Disabler) to Jail, and the script cast no other ballot. The count the server published: Player 1 4 votes and nobody else any, 7 could vote, 3 abstained or did not vote, "Sent to Jail: Player 1." The display then showed Player 1 in Jail, marked Jailed.
- Round 4: the two players named in the Supply (Player 1 and Player 4) each hold one weapon more than before, and the other five hold what they held: each by the count on its own phone, read once that phone showed round 4. The display's text has nothing of weapons at any phase before the end.
- Round 4: on its own turn the Hacker scanned Player 2 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 2 and guessed Blue. The guess was wrong."
- Round 4, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- Round 5, during Player 5's turn: the Hacker (Player 3) submitted its one Code attempt: four seats with the Undercover's among them, which is not in the Code the Alien's phone lists, so the attempt is not that Code. Accepted; the phone said it is recorded and did not write it out again. Afterwards no Code attempt was offered, while a move still was, and straight after it the phone listed nothing new.
- Round 5: on its own turn the Hacker scanned Player 2 guessing Alien, that player’s real faction. The phone then listed: "you scanned Player 2 and guessed Alien. The guess was right, and that player is in the Code."
- Round 5, Jail vote: the script cast no ballot. The count the server published: 7 could vote, 7 abstained or did not vote, "Nobody was sent to Jail."
- The server opened a showdown after round 5's Jail vote. By then the Insider, the Cracker and the Blue Disabler (Player 6, Player 5, Player 1) were in Jail, as the display still marked them, and the one Code attempt was not the Code.
- At the showdown, with round 5 resolved, the Hacker's phone listed what it had listed before the attempt, apart from its Scans: nothing about the attempt.
- Showdown: the display showed all seven players in the Final Zone, the three jailed players among them and still marked Jailed. A showdown shot was offered on all seven phones. The Insider, the Cracker, the Blue Disabler and the Supplier registered one each, each from a list of the six other players: two at the Undercover (Player 4) and two at the Hacker (Player 3). A second and a half after the last was registered the board had not changed.
- The result, on the display and on all seven phones in the same words: "Blue wins. The Alien wins with Blue." The Undercover and the Hacker (Player 4 and Player 3) were shown Eliminated and revealed as Red; nobody else was shown Injured, Eliminated or revealed. The display said the result once.
- The end reveal names a role for each of the seven seats, on the display and on every phone. Each one is the role that seat’s own phone showed its player in private at the start and still showed at the end, and the Code it lists is the one the Alien’s phone had listed. At each of the 45 phases before the end, the display’s text named no role and had nothing of weapons, the Code or a winner, and each phone named its own role and no other, apart from what its own seat is told.
- Every phone said the match is over, and its action card had no control left; the host console read the match as "complete". The display sent no command in the whole match.
- The commands the seven phones sent in the whole match, by type, each counted once: SCAN 5, SHOWDOWN_SHOT 4, SUBMIT_CODE 1, SUPPLY 1, VOTE 12.
- At the end, what each device kept outside its page: each of the seven phones its sign-in, which match the tab is in and the Firebase SDK's own heartbeat record, and nothing else; in session storage the display kept mothership:connected-resume, the sign-in and the host console mothership:connected-resume, the sign-in. No role, Code, command type or target was in any of it.
- No page was loaded by anything but this script: each tab counted as many loads as the script made, and each refused the development server’s hot-reload connection.

The sentence about what was kept reads: in session storage the display kept two things, `mothership:connected-resume` (which match the tab is in) and its sign-in, and the host console the same two.

### The match was played to its end three times, and why

The first run was before the corrections that followed the independent reviews of the slices under this one, and passed in 2,720 s. The second, on the corrected code, passed in 2,737 s, and its log was the first evidence written for this slice.

**That log said more than the run had established.** Before publishing it I compared its sentences with the script and found several the script wrote without having checked them. A separate reviewing session with none of this work's context then went through the scenario clause by clause. Of the 70 clauses the scenario could write, it found **36 backed** by an assertion that would have stopped the run, **20 weaker than stated** (fewer devices than the sentence names, one moment where the sentence speaks of a span, something the script did written as something it saw) and **14 not backed at all**. The gravest:

- "Before the end, no screen but a phone's own open private panel had named a role." Nothing in this scenario checked it.
- The opening summary of the phases was fixed prose: nothing counted rounds, turns, elections or Jail votes, and nothing checked how long a phase lasted.
- Three inferences from the rules were written as findings: "neither side was stronger", "no Code had been right", and that the Code attempt "cannot be right".
- "Nobody else was marked" was contradicted by the run's own screenshot, in which three players are marked Jailed.
- The facts file recorded the result as a literal typed into the script.

No assertion of the first two runs failed, and this found no defect in the client. What was wrong was the record. **The scenario was changed so that each sentence is either required or read, and the match was played a third time.** The evidence in this branch is from that third run. What changed in the scenario:

- At every phase before the end, the display's text names no role and has nothing of weapons, the Code or a winner, and each phone names its own role and no other, apart from what its own seat is told.
- The phases are checked as the display's own page recorded them: five rounds, a turn for each of seven different players in each, a Captain election before rounds 2 to 5, a Jail vote after each round, a showdown, the end. None may end before its time.
- Each count is read in full: the votes for each seat, how many could vote, how many did not.
- The Code attempt is checked not to be the Code the Alien's phone lists.
- The result and the reveal are checked on the rendered pages as well as on the model the pages are rendered from, and the facts file records the words the display showed.
- Storage is checked on all nine devices at the end, where it had been checked on three phones.
- Where the script only saw something, the sentence says what it saw: which phones offered a showdown shot, what the Hacker's phone listed once round 5 was resolved, which commands were sent.
- Whose turn it is comes from the words the display shows for the phase, and the Supplier's phone is given ten seconds to show its own turn's offers before the script concludes there is no Supply to make.

Two more runs were started and stopped by me, and neither is evidence of anything: one after three minutes, when I found the journey's request interception at fault in other runs ([connected-role-actions.md](connected-role-actions.md); this scenario arranges no fault, so interception is never on in it), and one after twelve minutes, with the first half of the changes above, when the review came back with more.

**What the review pointed out and the scenario still does not do**, so that a reader can weigh the sentences:

- **Most of what a sentence says a screen "showed" is read from the page's presentation model**, the object the page is rendered from, and not from the rendered text: the board's places and markers, the lines of a count, the phase labels, the notice that the match is over. Read from the rendered page itself are the action card, the list of what a seat is told, the role card, every spoken line, the whole text of the display at each phase, and the result at the end. The screenshots show the rendered pages at thirteen moments.
- **"No second one is offered" means the control was not on the phone when the script looked**, whatever the reason. For the Code attempt the script also reads whether a move was still offered at that moment.
- **Which seat is Red or Blue is the script's knowledge of the roster**, applied to the role each phone showed its own player. The only place a page names another seat's faction is the "Revealed: Red" marker at the end.
- **A phase's length is when the display's page first showed the next phase, by that page's clock.** It is not the server's window.
- **One board comparison is one moment**: "had not changed" is the board a second and a half after a registration, not for the rest of the phase.

**The other journeys have not had this review.** The evidence index said of every folder that each statement in a log is an assertion that held. For this folder that is now checked clause by clause. For the others it is how the scripts are meant to be written, and it has not been checked the same way: a sentence in their logs may say more than its script required. The index now says so.

Three things a reader of the screenshots will meet:

- **The three jailed players stand in the Final Zone and are still marked Jailed**, and each registered a showdown shot. That is the public view as the server has it, and the confirmed showdown decision: all players who are not eliminated, the injured and the jailed included, are moved there and each has one special shot (`rules/overlays/final-showdown-decision.json`). The client shows what the view says and adds nothing.
- **`m5-phone-code-attempt-recorded.png` shows the Hacker's action card after the sentence had gone**: no Code attempt is offered any more, and nothing on the phone says one was made. The sentence "Your Code attempt is recorded. This is not a result." was read by the script when the server accepted the command. That the view carries nothing about an attempt once it is made is finding G18 ([connected-knowledge-actions.md](connected-knowledge-actions.md)).
- **The result screens still show the last Jail vote counted**, round 5's, in which no ballot was cast. The public view keeps the last count and does not say which round it belongs to (finding G15, [connected-voting.md](connected-voting.md)).

### Not run

- In this match: any command of a type not listed above (a move, an ordinary shot, a Disable, Protection, a Rescue, a Hack request; their registration is in the other journeys and their resolution in none), a Captain and a release, an injured player healing, a Code attempt that is the Code, a draw.
- What a Disable, Protection, a Rescue, a Hack or an ordinary shot resolves to. They are registered in the roles journey and followed no further anywhere.
- A match that takes any other course: this is one match, steered.
- Phones, people, a screen reader, a deployed project.

## What this is, and is not

- **A real backend on one machine**: the Firebase web client, Security Rules, the protocol-2 service and its 60-second phases, run locally. No deployed project.
- **One match, steered.** It shows that the screens can carry a whole match, and that what they say agrees with the server and with one another. It shows nothing about balance, about how people play, or about any other course a match can take.
- **Not phones, not people, not a screen reader.** Phone-sized pages in headless desktop Chrome.
- **Not everything.** A Disable, Protection, a Rescue, a Hack and an ordinary shot are in the roles journey, and are not followed to their resolution anywhere. A Captain's term, a release, an injured player healing, a right Code attempt and a draw were not run in a browser.
