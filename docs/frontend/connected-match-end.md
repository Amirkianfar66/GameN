# Connected flow: the end of a match, and the host ending one

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-match-end`, stacked on `agent/frontend-connected-knowledge-actions` (draft [PR #48](https://github.com/Amirkianfar66/GameN/pull/48)) and the branches under it, on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule is implemented or decided here.

The integration review of 6 October 2026 lists "result" and "host abort" among the next work for the connected flow. This slice is both.

## What every screen shows when a match is over

| The server's view says | Every screen says | From |
| --- | --- | --- |
| Phase `FINISHED`, `result.winner` | "Blue wins." / "Red wins." / "The Alien wins." / "Nobody wins. The match is a draw." | The winner the server names. Nothing on the client decides one |
| `result.alienCoWinner` | "The Alien wins with Blue." | The server's flag |
| `endReveal` | A table of every seat and its role, and "The Code was: …" | Exact roles and the Code are disclosed only at the end of a match (V1-18). They are shown only when the view carries them |
| Phase `ABORTED` | "The host ended this match. There is no winner." | A match the host ends is recorded without a winner (V1-12) |

The phone and the shared display use the same words; a phone marks its own seat as its own. The end is spoken once, when the view first carries it; a screen that connects or comes back after the match is over is told how it ended with where the match stands, once. Once the match is over a phone says so and offers nothing.

**A match the host ended reveals nothing**, because its view carries no reveal. Whether it should is the owner's open question (D35 in Integration's reconciliation); the screens follow the view either way.

## The host ending a match

- The client can send `v1AbortMatch`, with the same request checking and answer checking as every other lifecycle operation.
- The preview's host console ends a match in two presses. The first only asks, puts focus on the way back, and sends nothing; the control that ends the match is not where the first one was.
- Only the host can end a match and nobody can end one twice: that is the service's rule, exercised here against the real service.
- **A match can be ended while it is still a lobby.** Nothing was dealt and no view was ever written, so there is no match to show: every device then says "The host ended this match before it started. There is nothing of it to show." and opens nothing.

## What was run

All on 6 October 2026, macOS, Node 22.21.1, npm 10.9.4, at the head of this branch.

| Check | Result |
| --- | --- |
| `npm run verify` | **610 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 11 tooling, 139 presentation (6 new), 310 game (2 new). Typecheck, build and source integrity passed. Production exclusion: 45 modules reachable from 2 production entries, 136 files scanned, 23 development files labeled |
| Mutation check | **18 of 18** deliberate faults caught by this slice's tests: a match the host ended with no result on screen; Blue and Red swapped; the Alien always, or never, said to win with the winner; a draw called a win; the player's own seat not marked in the reveal; roles or the Code listed in the order the view happens to carry them; each seat shown with its neighbor's role; the phone not saying the match is over; the end spoken on every update, or never; the display without a result, without the roles, or without the Code; a phone's own seat marked on the shared display; any successful answer taken as the answer to this request; a request that is not valid sent anyway. And 3 of 3 for the correction made after the review: a screen that connects late, or comes back, not told how the match ended; the end said without who won with whom |
| Independent review | By a separate reviewing session with none of this work's context, reading this slice and the two under it at fixed commits. No hidden-information leak, no duplicate or unconfirmed command, no wrong payload; nothing revealed without the view's reveal; no winner derived. One gap in this slice corrected, and a second review, of the slice above, found one more here; see below |
| Frontend emulator tests | **5 of 5** passed, 75 s, **against emulators that were already running** (the suite's own command with the emulator hosts in the environment, not through `firebase emulators:exec`): the four of the earlier slices and the one described below |
| Browser journey, `MOTHERSHIP_JOURNEY=end` | **Passed**, 8 s, at the head of this branch. Headless Chrome 155: a host, a shared display and seven players against the local Auth, Firestore and Functions emulators |
| Browser journey, `MOTHERSHIP_JOURNEY=lobby-end` | **Passed**, 9 s, at the head of this branch, the same way |

**The emulator test** (`apps/game/test-emulator/connected-lifecycle.test.mjs`) goes through the documented operations and the Security Rules with nine identities: a host, a display and seven players. A player and the display are each refused when they try to end the match, and the match goes on. The host ends it. The public view then says `ABORTED` with no deadline, no winner, no reveal and no revealed faction, and the shared display's model names no role. Each of the seven players' views says the same, offers no move and no target, and still carries that seat's own role. A command sent afterwards is answered with a receipt that rejects it (`PHASE_CLOSED`). The host's session document and the lobby both read "aborted", and the match can be neither ended again nor started.

**The browser journey**, in a throwaway seven-player match (its own words are in [`evidence/connected-v1/end/`](evidence/connected-v1/end/)):

- The host console asks before ending: the first press only asks, puts focus on the way back, and sends nothing. Declining left the match running on all eight screens.
- With the keyboard alone the host then confirmed: one `v1AbortMatch` carrying the match and a request identifier and nothing else; the answer was "aborted". The console read the match as "aborted" from its own session document and offered no way to end or start it again.
- Within 0.1 s the display and all seven phones showed, from the server's own views: "Match ended by the host", no countdown, and "The host ended this match. There is no winner." The display said it once.
- Nothing was revealed: the display named no role and no Code, and each phone showed its own role in its own private panel and no other, apart from what its own seat had been told since the start. Every phone said the match is over and had no control left; none had sent a command.
- A reloaded phone and a reloaded display showed the same ended match.
- No page was loaded by anything but the script.

**The second journey**: the host ends a match that is still a lobby, with seven players seated and a display admitted (its own words are in [`evidence/connected-v1/lobby-end/`](evidence/connected-v1/lobby-end/)). The console offers it with the same two presses; one `v1AbortMatch`; the console then read "aborted" and offered neither to start the match nor to end it again. The display and all seven phones said "The host ended this match before it started. There is nothing of it to show." None of them opened a match screen, went on waiting, or said it had lost access, and nothing of a match was in any page or its storage. A reloaded phone and a reloaded display said the same.

**Corrected after two reviews.**

- *The winner was never spoken to a screen that was not current when the match finished.* The end was announced only on a view-to-view change. A screen that connected afterwards, or came back from a lost connection, heard "Match finished" without who won. How the match ended is now part of the present it is told, once.
- *A match ended while still a lobby left every phone on "Connecting".* The preview opened the match screen as soon as the lobby was no longer open, and for a match that never started there is no view to open: the rules refuse a read of a view that is not there. With the slice above this one, which tells a refusal from a lost connection, the phones would have said "No access to this match", which is not what happened. The preview now reads the lobby's status and, for an ended match, asks whether there is a view before it opens anything.

The evidence of both journeys is from runs at the head of this branch. Earlier runs of them stopped several times during the common setup, before anything of this slice ran. The cause was the journey's own request interception, which is described in [connected-role-actions.md](connected-role-actions.md); these two journeys arrange no fault, and with interception off outside such steps they have not stopped again.

### Not run

- **A finished match with a winner, and its end reveal, in this slice.** It needs a whole match. Here the result and the reveal are unit-tested from synthetic views; the whole-match journey at the top of this stack plays one against the emulators.
- A lost answer to the request to end a match, against the backend (unit-tested).
- Phones, people, a screen reader, a deployed project.

## Not in this slice

- The result is **functional, not designed**: the end of a match is the Designer's to shape.
- The remaining parts of the connected game are listed in [connected-role-actions.md](connected-role-actions.md).
