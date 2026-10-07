# Connected flow: one whole match in browsers

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-full-match`, on top of the connected stack (draft pull requests [#42](https://github.com/Amirkianfar66/GameN/pull/42), [#44](https://github.com/Amirkianfar66/GameN/pull/44), [#48](https://github.com/Amirkianfar66/GameN/pull/48), [#49](https://github.com/Amirkianfar66/GameN/pull/49) and [#50](https://github.com/Amirkianfar66/GameN/pull/50)), on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged.

This adds no client code. It adds a browser journey that plays **one seven-player match from its lobby to its result** against the local emulators, and what that run wrote. It is the first time the connected client has been taken through a whole match, and the only browser run of a Supply, a Code attempt, a showdown and a finished match's result.

## What the journey does

A host, a shared display and seven players, each in a browser context of its own, in headless Chrome. Every phase is a real 60-second server window that ends only at its deadline, so the match takes about three quarters of an hour.

The script can see all seven phones, which no player can. It uses that for two things:

- **To steer the match somewhere worth looking at.** The Jail votes of rounds 1 to 3 jail three Blue players, so that at the end of round 5 neither side is stronger and the server opens a showdown. The Hacker's Code attempt includes the Undercover's seat, which is never in the Code, so it cannot be right.
- **To check the screens against one another.** A Scan's result is checked against the Code the Alien's phone lists. At the end, the role the reveal names for each seat is checked against the role that seat's own phone had shown its player in private since the first turn.

Nothing is decided by the script. What each action comes to is whatever the server says, and every expectation is stated in the run's own log.

## What was run

On 7 October 2026, macOS, Node 22.21.1, npm 10.9.4.

| Check | Result |
| --- | --- |
| `npm run verify`, at the head of this branch | **630 passed**, 0 failed, 0 skipped, 0 todo: the same 630 as the slice under this one, since this adds no client code or test. Production exclusion: 46 modules reachable from 2 production entries, 139 files scanned, 23 development files labeled |
| Browser journey, `MOTHERSHIP_JOURNEY=match` | **Passed**, 2,737 s (45 minutes 37 seconds), on the code of this branch. Headless Chrome 155, one browser context for each device: a host, a shared display and seven players, against the local Auth, Firestore and Functions emulators |
| The other journeys, run again at the top of the stack after the whole match | **All passed**: the default journey (seven players, a move) in 73 s at the first try; the nine-player shot journey in 133 s; the roles journey (nine players, a whole first round) in 433 s. No page was loaded by anything but the script in any of them |
| The voting journey | **Not run again** on the final code. It passed on this stack before the corrections that followed the reviews (1,222 s). The whole-match journey casts ballots through the same card on the final code |

What the journey established, in its own words, in the order of the match (they are also in [`evidence/connected-v1/match/`](evidence/connected-v1/match/), with every phase the display followed and how long each lasted):

- The display followed 46 phases in the server's order, each a real 60-second window: five rounds of seven turns, a Captain election before rounds 2 to 5 in which nobody voted ("Nobody was elected", 4 times), a Jail vote in every round, a showdown, and the end.
- Round 1: on its own turn the Hacker scanned Player 1 guessing Red, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Red. The guess was right, and that player is not in the Code."
- Round 1, Jail vote: four players voted to send Player 3 (Insider) to Jail; three did not vote.
- Round 2: on its own turn the Hacker scanned Player 1 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was wrong."
- Round 2, Jail vote: four players voted to send Player 2 (Cracker) to Jail; three did not vote.
- Round 3: on its own turn the Supplier registered a Supply for Player 1 and Player 5, the first two the server listed. Nothing public changed and nobody held anything more yet.
- Round 3: on its own turn the Hacker scanned Player 1 guessing Red, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Red. The guess was right, and that player is not in the Code."
- Round 3, Jail vote: four players voted to send Player 4 (Blue Disabler) to Jail; three did not vote.
- Round 4: the two players named in the Supply (Player 1 and Player 5) each hold one weapon more than before; the other five hold what they held. Only their own phones say so.
- Round 4: on its own turn the Hacker scanned Player 1 guessing Blue, which is not that player’s faction. The phone then listed: "you scanned Player 1 and guessed Blue. The guess was wrong."
- Round 5, during Player 3's turn: the Hacker (Player 5) submitted its one Code attempt, four seats with the Undercover's among them, so it cannot be right. Accepted; the phone said it is recorded, did not write it out again, and learned nothing about whether it was right.
- Round 5: on its own turn the Hacker scanned Player 1 guessing Red, that player’s real faction. The phone then listed: "you scanned Player 1 and guessed Red. The guess was right, and that player is not in the Code."
- After round 5 neither side was stronger and no Code had been right, and the server opened a showdown: three of the four Blue players were in Jail by then (Player 3, Player 2, Player 4).
- Showdown: the server put all seven players in the Final Zone and offered each a showdown shot at any other player. Four Blue players registered one each, two at each Red player (Player 1 and Player 5). Nothing public changed until the showdown was resolved.
- The result, from the server's public view, on the display and on all seven phones in the same words: "Blue wins. The Alien wins with Blue." Both Red players were shown Eliminated and revealed as Red; nobody else was marked.
- The end reveal names a role for each of the seven seats. Each one is the role that seat’s own phone had shown its player in private since the first turn, and the Code it lists is the one the Alien’s phone had listed. Before the end, no screen but a phone’s own open private panel had named a role.
- Every phone said the match is over and had no control left; the host console read the match as "complete".
- No page was loaded by anything but the script.

**The whole match was played to its end twice.** The first time was before the corrections that followed the independent reviews of the slices under this one, and passed in 2,720 s. The evidence is from the second, on the corrected code. A third run was started in between and stopped by me after three minutes, when I found the journey's request interception at fault in other runs ([connected-role-actions.md](connected-role-actions.md)); this journey arranges no fault, so interception is never on in it.

Three things a reader of the screenshots will meet:

- **The three jailed players stand in the Final Zone and are still marked Jailed**, and each registered a showdown shot. That is the public view as the server has it, and the confirmed showdown decision: all players who are not eliminated, the injured and the jailed included, are moved there and each has one special shot (`rules/overlays/final-showdown-decision.json`). The client shows what the view says and adds nothing.
- **`m5-phone-code-attempt-recorded.png` shows the Hacker's action card after the sentence had gone**: no Code attempt is offered any more, and nothing on the phone says one was made. The sentence "Your Code attempt is recorded. This is not a result." was read by the script when the server accepted the command. That the view carries nothing about an attempt once it is made is finding G18 ([connected-knowledge-actions.md](connected-knowledge-actions.md)).
- **The result screens still show the last Jail vote counted**, round 5's, in which nobody voted. The public view keeps the last count and does not say which round it belongs to (finding G15, [connected-voting.md](connected-voting.md)).

### Not run

- In this match: a Disable, Protection, a Rescue, a Hack and an ordinary shot (they are in the roles journey), a Captain and a release, an injured player healing, a Code attempt that is right, a draw.
- What a Disable, Protection, a Rescue, a Hack or an ordinary shot resolves to. They are registered in the roles journey and followed no further anywhere.
- Phones, people, a screen reader, a deployed project.
- An independent review of the journey itself.

## What this is, and is not

- **A real backend on one machine**: the Firebase web client, Security Rules, the protocol-2 service and its 60-second phases, run locally. No deployed project.
- **One match, steered.** It shows that the screens can carry a whole match, and that what they say agrees with the server and with one another. It shows nothing about balance, about how people play, or about any other course a match can take.
- **Not phones, not people, not a screen reader.** Phone-sized pages in headless desktop Chrome.
- **Not everything.** A Disable, Protection, a Rescue, a Hack and an ordinary shot are in the roles journey, and are not followed to their resolution anywhere. A Captain's term, a release, an injured player healing, a right Code attempt and a draw were not run in a browser.
