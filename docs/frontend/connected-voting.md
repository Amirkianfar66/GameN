# Connected flow: voting

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-votes`, stacked on `agent/frontend-connected-actions` (draft [PR #42](https://github.com/Amirkianfar66/GameN/pull/42)), which is on Integration's landing candidate `codex/v1-connected-merge-candidate` (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule is implemented or decided here.

The integration review of 6 October 2026 lists "elections/Jail/release voting" among the next work for the connected flow. This slice is that: a phone can cast a ballot in every vote the approved ruleset has, and every screen shows what is being voted on and the count the server publishes.

## What a phone can do now

| Ballot | Command | Offered when | Answers |
| --- | --- | --- | --- |
| Vote in a **Captain election** or a **Jail vote** | `VOTE` | The view lists seats under `VOTE` | Each seat the server lists, or **Abstain** |
| The Captain's **release choice** | `RELEASE_CHOICE` | The view lists seats under `RELEASE_CHOICE` | Each jailed seat the server lists, or **No release request** |
| Vote on the **release** | `RELEASE_VOTE` | The view's own flag `releaseVoteAvailable` | **Yes**, **No**, or **Abstain** |

Each is the command flow the other actions use, unchanged: one command at a time, identifiers kept before sending, lookup and identical re-send, nothing put aside while unresolved.

## What every screen shows

The phone and the shared display show the same public facts in the same words, from the public part of the view alone:

- **What is being voted on**: the candidates of an election, who can be voted into Jail, who may ask for a release and which players are jailed, or which jailed player a release vote is on; and how many players may vote.
- **The last count the server published**: the votes for each seat, how many could vote, how many abstained or did not vote, and the seat the count names: elected, sent to Jail, released or not.

A new count is spoken once. Nothing shown or spoken says who voted for whom.

## How it decides what to offer: it does not

- **A ballot is offered only while the player's own view opens it**, and with exactly the seats that view lists. A phase being a vote opens nothing by its name. So the phone does not decide who may vote or who may be voted for.
- **The answer that names nobody is always there** in an open ballot. It is the `null` the wire contract defines for these three commands, and the engine's tests exercise it. An abstention sent this way is a ballot: the server then offers that seat no second one.
- **One command for two votes.** The server uses `VOTE` for an election and for a Jail vote. Which one it is, the phone reads from the phase the server reports, and asks in those words.
- **The count is the server's.** The screens show its numbers and the seat it names. The one thing derived is arithmetic on published numbers: how many of those who could vote are not in the counts. Where the numbers do not add up, nothing is derived.

## What it says, and why in those words

| Moment | Words | From |
| --- | --- | --- |
| Before sending a vote | "This is your one ballot in this vote. You cannot change it once the server accepts it." | One final ballot for each player in each vote (V1-10) |
| Before asking for a release | "The Captain has one release request in a match. This uses it, whatever the vote decides." | One request in a match; a request that fails is still used up (V1-11) |
| Before declining | "The release request stays unused." | Declining does not use the request (V1-11) |
| A ballot is accepted | "Your vote for Player 3 is recorded. This is not a result. The count is shown to everyone when the vote closes." | Ballots stay private until the count is published at closure (V1-10); a vote closes at its deadline even if everyone has voted (V1-09) |
| The player's own ballot, afterwards | "Your ballot in this vote: Player 3." | The server's own view (`hasVoted`, `ownBallot`), inside the open private panel only |
| A count | "Sent to Jail: Player 3." "Nobody was elected." "Yes: 5 of 7. Player 3 was released." | The seat and the flag the server's count names |

The wording is **functional, not designed**, and is for the Designer and the owner to change.

## What was run

All on 6 October 2026, macOS, Node 22.21.1, npm 10.9.4, at the head of this branch.

| Check | Result |
| --- | --- |
| `npm run verify` | **586 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 11 tooling, 123 presentation (11 new), 302 game (7 new). Typecheck, build and source integrity passed. Production exclusion: 43 modules reachable from 2 production entries, 130 files scanned, 23 development files labeled |
| Mutation check | **26 of 26** deliberate faults caught by this slice's tests: candidates listed out of seat order; a count worded as another kind of count; released and not released swapped; the abstained figure wrong, or derived from numbers that do not add up; a ballot shown though the server does not say the seat voted; yes and no swapped, in what is shown and in what is sent; an open vote without an abstention; a release vote offered without the view's flag; one ballot reading another's list; a vote asked without regard to the phase; declining a release said to use the request; a count spoken on every update, or not spoken when it is like the one before; the last seconds announced to a seat that may not vote; an abstention sent as a vote for a seat. And 2 of 2 for the correction below: an old count spoken when the host ends a match during a vote; no count spoken when a vote closes with one like the one before |
| Browser journey, `MOTHERSHIP_JOURNEY=votes` | **Passed**, 1,222 s. Headless Chrome 155, one browser context for each device: a host, a shared display and seven players, against the local Auth, Firestore and Functions emulators. **Run before the correction below and not again on this branch**; the whole-match journey at the top of the stack casts ballots through the same card on the corrected code |
| Independent review | By a separate reviewing session with none of this work's context, reading this slice and the two above it at fixed commits. No hidden-information leak, no duplicate or unconfirmed command and no wrong payload found. One defect in this slice, corrected; see below |

What the journey established, in a throwaway seven-player match (its own words are in [`evidence/connected-v1/votes/`](evidence/connected-v1/votes/)):

- **A first round with nobody acting.** Seven turns, each on the display for between 60.4 and 60.7 seconds: no phase ended before its deadline. With no Captain, the Jail vote followed the last turn.
- **A Jail vote with real ballots.** Every phone was offered a vote and nothing else, with the seats the server listed (its own among them) and "Abstain". One player voted with Tab and Enter alone. Four ballots for Player 5, one player voting for its own seat, one abstention sent as a ballot, one player silent. The answer to one ballot was dropped in the browser (arranged): the phone asked the server, which had it; one `VOTE`, accepted once.
- **A ballot is private.** Each phone then showed its own ballot from the server's view, inside its open private panel, and was offered no second one. A reloaded phone showed it again after its panel was reopened, and nothing of a ballot was in any page's storage. Until the deadline the display's voting panel did not change, nothing of a ballot was on it or spoken by it, no phone heard of a ballot but its own, and the silent player could still vote.
- **The count.** When the vote closed the server's public view carried: Player 5 four votes, Player 6 one, 7 could vote, 2 abstained or did not vote, "Sent to Jail: Player 5." The display and all seven phones showed that in the same words, the display spoke it once, and its board showed Player 5 in Jail.
- **A Captain election that ties.** Six candidates (everyone but the jailed player), seven voters; the jailed player was offered the vote and was not on the list. Three ballots each for Players 1 and 7 and one abstention: "Nobody was elected." The server then opened a second election with those two as its only candidates, and every phone listed exactly those two and "Abstain". Four to one: "Elected Captain: Player 1.", shown in the Command Room and marked Captain.
- **The release choice.** After round 2's turns the server opened it. Only the Captain's phone was offered a choice: the jailed Player 5, or "No release request". It said what asking uses up, and sent one `RELEASE_CHOICE`. Nothing public changed until the phase ended.
- **The release vote.** All seven were offered yes, no and an abstention; the jailed player was asked "Release yourself from Jail?". Five yes, one no, one abstention: "Yes: 5 of 7. Player 5 was released.", back in a room and no longer marked.
- **A vote in which nobody votes.** All seven were offered a ballot in round 2's Jail vote and none cast one: every seat 0, "Abstained or did not vote: 7. Nobody was sent to Jail."
- Each phone sent exactly the ballots it confirmed and the display sent nothing. No ballot had to be started again and no command was sent twice. No page was loaded by anything but the script.

The journey passed on its fifth run. Of the four that stopped, one was a mistake in a check of the journey's own, one was a wait of the journey's own that was shorter than the server's answer, and two were a tab reloading itself in the middle of a ballot: the development server's own client reloads a page when its connection drops. That is fixed in the pull request under this one, and the journey now fails if any page is loaded by anything but the script.

**Corrected after the review: an old count was spoken when the host ended a match during a vote.** A count is announced when it differs from the one before or when the vote it counts has just closed, because two counts can be alike. A vote the host cuts short by ending the match is never counted, so the count still in the view is the one from an earlier round, and it was announced again as if new: "Jail vote counted. Sent to Jail: Player 3.", next to the news that the match had ended. Leaving a vote for an ended match no longer counts as that vote closing. This is a consequence of finding G15 below: nothing in a view says which vote a count belongs to, so the client has to work out whether a count is new.

**A caution about how these runs were made.** Two things I found only afterwards may have played a part in the runs that stopped. While the journey was run, six test processes of my own, left behind by an earlier check on another branch, were each using most of a processor core. And the journey's own request interception, which it then left on for a whole run, can leave a request waiting forever on Chrome 155; that is described in [connected-role-actions.md](connected-role-actions.md) and is now on only while a fault is arranged. The figures in finding G16 were taken again by a script that uses no browser, with those processes gone.

### Known limits, from the review

- **A screen that was not current when a count was published is not told it aloud.** It states where the match stands and replays nothing; the count is on screen under "Last vote counted".
- **"Abstained or did not vote" is arithmetic on published numbers** (those who could vote, less the votes counted for a seat). It is right while each voter has one ballot of weight one, which the engine does today and the contract does not promise. It is left out when the numbers do not add up.
- **The private panel is redrawn whole when the line with the player's own ballot appears**, which is usually just after the ballot was sent. Keyboard focus is kept, by the fallback the page gives it. What a screen reader makes of the redraw is not known and needs a device.

### Not run

- A vote with a phone offline, or reloaded while a ballot is unresolved; an injured or eliminated voter; a second release request; a declined release in a browser (it is unit-tested).
- Phones, people, a screen reader, a deployed project.

## Found while building it, for Integration and Game Balance

Reported as found. No contract change is proposed here.

| | Finding | What Frontend does meanwhile |
| --- | --- | --- |
| **G12** | **The count's fields are not described in the client handoff.** What `selectedSeatId` and `released` mean for each kind of vote was read from the engine source: the winner of an election, the seat sent to Jail, the jailed player a release vote was on and whether they were released | The screens word each kind of count that way. If the meaning is other than that, the words are wrong |
| **G13** | **Nothing in a view says a Captain election is a second one among tied candidates**, and two such phases have the same kind. | The word "runoff" is not used. The screen shows the last count ("Nobody was elected") and the candidates of the election that is open |
| **G14** | **The Captain's own view carries nothing about the release choice once it is made**, until the next phase. The page that sent it shows the acceptance; a reloaded page cannot say what was chosen | Nothing is claimed after a reload. The next phase the server reports says what follows |
| **G15** | **The last count stays in the view through every later phase**, with nothing saying which round it is from | It is labeled "Last vote counted" and shown as it is |
| **G16** | **Commands sent to one match at the same moment are slow on the local emulators, and some get no answer in time.** Measured with a script that is now in the repository (`apps/game/test-emulator/measure-simultaneous-commands.mjs`): seven seats each register a move in the same match at the same moment, through the client's own API functions and plain HTTP, in ten matches. In seven of the ten, every command was answered in 2.1 to 3.6 s. In one, in 2.1 to 7.2 s. In two, four and six of the seven had no answer when the client's own 8 s wait ran out. Sent one at a time in the same matches, 28 of 30 commands were answered in 17 to 45 ms. In the browser journey, seven ballots confirmed at the same moment were answered in 2.0 to 3.4 s, and in 2.3 to 7.1 s in an earlier run, on a machine that was then overloaded. A phone waits 8 s for an answer before it asks the server what became of its command and, if the server knows of none, sends the identical request again. Around a table, a vote is exactly when everyone presses at once | The flow is built for this and the journey passed with it. **The cause is not established here**, and whether a deployed backend behaves the same is not known. The script takes a minute to run against the emulators |

## Not in this slice

- A vote with a phone offline or reloaded mid-ballot beyond the one reload the journey makes; an injured or eliminated voter; a second release request.
- The remaining parts of the connected game are listed in [connected-role-actions.md](connected-role-actions.md).
