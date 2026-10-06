# Connected flow: Scan, Supply, the Code attempt, and what a seat is told

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-knowledge-actions`, stacked on `agent/frontend-connected-votes` (draft [PR #44](https://github.com/Amirkianfar66/GameN/pull/44)), on `agent/frontend-connected-actions` (draft [PR #42](https://github.com/Amirkianfar66/GameN/pull/42)), on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule is implemented or decided here.

The integration review of 6 October 2026 lists the Code among the next work for the connected flow, and the role actions were not complete without the two whose choice has more than one part. This slice adds those three commands, and the one thing without which a Scan is useless: the phone showing its player what the server tells that seat alone.

## What a phone can do now

| Action | Command | Offered when | Parts, picked one after another |
| --- | --- | --- | --- |
| **Scan** | `SCAN` | The view lists seats under `SCAN` | A seat from that list, then a guess: Blue, Red or Alien |
| **Supply** | `SUPPLY` | The view lists seats under `SUPPLY` | Two different seats from that list |
| **Code attempt** | `SUBMIT_CODE` | The view's own flag `codeAttemptAvailable` | Four different seats of the match |

What is picked so far is listed in the order it was picked, and going back takes the last pick away and says which one ("Take back Player 5"). The whole choice is then asked about and sent as one command through the same command flow as every other action.

## What a seat is told

With its private panel open, a phone lists what the server's view tells that seat and nobody else, one sentence for each thing the view carries:

| The view carries | The phone says | The confirmed rule it words |
| --- | --- | --- |
| `knowledge.insiderCandidates` | "Player 2, Player 4, Player 6 hold the roles Undercover, Alien and Cracker, one each. You are not told which of them holds which." | The Insider knows those three players as a set |
| `knowledge.undercoverSeatId` | "The Undercover is Player 4." | The Hacker knows who the Undercover is |
| `knowledge.code` | "The Code is these four players: …" | The Alien knows the Code, a set of four |
| `knowledge.scanResults` | "Round 2: you scanned Player 5 and guessed Blue. The guess was right, and that player is in the Code." / "… is not in the Code." / "The guess was wrong." | A wrong guess gives no Code information; a right one gives only membership (V1-14) |
| `knowledge.protections` | "Protection for Player 2: active from round 4." / "Protection for Player 2: used up." | Only the Undercover knows of a Protection, that it became active and that it was used up (V1-17). The round is the one the view names; whether that round has come is not worked out on the phone |
| `self.ordinaryWeapons` | "Ordinary weapons you hold: 1." | A weapon is known to its holder; a Supply is disclosed to each recipient (V1-16) |
| `self.rescuesRemaining`, above zero | "Rescues you have left: 2." | |

A field the view leaves empty produces no sentence, so the panel never shows that a role lacks something, and the phone holds no table of which role knows what. Nothing in the markup varies with what is known. Closed or in the background, none of it is in the model or the document.

## How it decides what to offer: it does not

- **A Scan and a Supply are offered only while the player's own view lists seats** under that command's name, and each part is picked only from what the view offers next, given what is already picked.
- **A Supply the server lists fewer than two seats for** is said to have too few, with no control. Nothing is made up to fill it (open question D12 of Integration's reconciliation).
- **The Supplier's own seat is listed where the server lists it** (open question D11). The phone neither adds nor removes it.
- **A Code attempt names four seats of the match.** The contract puts no list on it and the server judges the attempt, so the phone lists every seat in the view, the player's own among them.

## What it says, and why in those words

| Moment | Words | From |
| --- | --- | --- |
| Before sending a Scan | "This uses your Scan for this round, whatever the result." | A Scan is used up at acceptance, right guess or wrong (V1-14) |
| A Scan is accepted | "Scan of Player 3, guessing Red, accepted. The result is listed under 'What you know', as the server gives it." | The result is returned at once, privately (V1-14); the phone shows it only once the server's view carries it |
| A Supply is accepted | "Supply for Player 5 and yourself registered. This is not a result. Registered actions are resolved at the end of the round." | The resolution order (V1-07) |
| Before sending a Code attempt | "This is your one Code attempt in this match." | One attempt (V1-08) |
| A Code attempt is accepted | "Your Code attempt is recorded. This is not a result. It is checked when the round is resolved, not now." | Checked with the other victory conditions after round 5's effects, not at submission (V1-08) |

Once it is sent, a Code attempt is not written out again: not on the card and not in what is spoken. The wording is **functional, not designed**; the sentences that word a rule are for Game Balance and the owner to confirm.

## What was run

All on 6 October 2026, macOS, Node 22.21.1, npm 10.9.4, at the head of this branch.

| Check | Result |
| --- | --- |
| `npm run verify` | **602 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 11 tooling, 133 presentation (10 new), 308 game (6 new). Typecheck, build and source integrity passed. Production exclusion: 44 modules reachable from 2 production entries, 133 files scanned, 23 development files labeled |
| Mutation check | **34 of 35** deliberate faults caught by this slice's tests: a Scan reading the Supply list and sent as a Supply; a Code attempt open whatever the view's flag says; a seat picked twice, or from outside the server's list; any word accepted as a guess; a Supply open with one seat listed; a picked seat offered again; the order of a Supply or a Code attempt making it another choice, or being sent in another order; a wrong guess reported as right; in the Code and not in the Code swapped; a used Protection not said to be used up; a Protection naming the present round instead of the round the view gives; weapons not shown; Rescues listed for a seat that has none; the Undercover sentence naming the player's own seat; scan results out of order; an accepted Code attempt written out again; what is picked not shown, or listed in seat order; going back naming the first pick, no pick, or saying Cancel; undoing one pick putting the whole action down; picks kept that the view no longer offers. **The one not caught** removes the check that a part can be picked only with the panel open and the clock trusted: a second check makes it unreachable, because the flow already leaves the choice when either stops being true, so the fault changes nothing a test could see |
| Independent review | By a separate reviewing session with none of this work's context, reading this slice with the one under it and the one above it at fixed commits. No hidden-information leak, no duplicate or unconfirmed command and no wrong payload found. Two things in this slice were corrected and two are recorded as limits; see below |
| Browser journey, `MOTHERSHIP_JOURNEY=knowledge` | **Passed**, 372 s, at the head of this branch. Headless Chrome 155, one browser context for each device: a host, a shared display and seven players, against the local Auth, Firestore and Functions emulators |

What the knowledge journey established, in a throwaway seven-player match (its own words are in [`evidence/connected-v1/knowledge/`](evidence/connected-v1/knowledge/)):

- **What each seat is told, checked against the other six phones.** With its private panel open each phone lists what the server's view tells that seat; closed, none of it is in the document. The Insider's phone names three seats, and the three phones that show Undercover, Alien and Cracker are exactly those seats. The Hacker's phone names the Undercover's seat, and the phone in that seat shows Undercover. The Alien's phone lists a Code of four different seats, its own among them and the Undercover's not. The Undercover is told it holds one weapon, the Cracker that it has two Rescues, every other seat that it holds no weapon and nothing else. No phone is told what belongs to another role, the display shows none of it, and none of it is in any page's storage.
- **A Scan on the Hacker's own turn.** On every turn before it, no other phone listed a Scan, a Supply or a Code attempt. On its own turn the Hacker's phone offered a Scan with the seats the server listed, its own among them, asked for the seat and then for a guess among Blue, Red and Alien, and sent nothing until the choice was confirmed. One confirmation made one `SCAN`, naming that seat and guessing that player's real faction as its own phone's role shows. Receipt accepted.
- **Its result.** The server's next view carried the result and the phone listed it: right, and in the Code or not, which agreed with the Code on the Alien's phone. The server offered no second Scan in the round. No other phone was told anything, the display's board did not change, nothing of a Scan was spoken anywhere but privately on the Hacker's phone, and nothing of it was in the page's storage.
- No page was loaded by anything but the script.

The evidence is from a run at the head of this branch, in which the Hacker was the seventh seat to have its turn. Before it:

- One run passed on the code as it was before the corrections below.
- One stopped at the Scan: the phone's one `SCAN` had gone out twice, as the identical request, and the second was answered "accepted" after 54 ms. The journey then failed on a check of its own that allowed no second send. An identical request sent again after no answer is what the command flow is built to do, and the server accepted the command once. The check now allows it and records each answer; it did not recur.
- Four stopped during the common setup, before anything of this slice ran.

I later found what the browser was doing in those: the journey's own request interception, which it then left on for a whole run, can leave a request waiting forever on Chrome 155. That is described in [connected-role-actions.md](connected-role-actions.md), and it is the likely cause of the unanswered first `SCAN` too. Interception is now on only while a fault is arranged, and this journey arranges none.

**Corrected after the review.**

- *Going back did not take away the pick shown last.* What was picked was listed in seat order, and going back removes the most recent pick: after picking Player 7 and then Player 1, the line read "Player 1 (you), Player 7" and going back removed Player 1. Picks are now listed in the order made, and the control names the one it takes away. No wrong command could result, because the confirmation lists the whole choice.
- *A Protection was said to be "active" by comparing rounds on the phone.* The view gives the round a Protection is active from and whether it is used up. The phone compared that round with the present one, which is working something out, and in a showdown after round 5 it would have read "active from round 6". It now says the round the view names and nothing more.

### Known limits, from the review

- **A choice the server withdraws in the same phase is dropped without a word.** If a seat the Hacker picked for a Scan leaves the server's list while the guess is being chosen, the card goes back to "Who do you scan?"; if a Supply's list shrinks below two, the card closes. Keyboard focus stays on the card, and nothing is sent. But nothing is spoken and nothing on the card says why. Saying so needs the command flow to mark a choice as withdrawn, which it does not do yet. The same silence already existed for a single choice the server withdraws.
- **A double tap can make the second pick.** The wait that keeps a control from being pressed by accident covers the confirmation, not the list that follows a pick. Tapping a seat twice can also pick whatever takes its place. Nothing is sent without the confirmation, which states the whole choice and has that wait.

### Not run

- A wrong guess against the backend.
- **A Supply and a Code attempt against the backend, in this slice.** A Supply is offered in round 3 only and a Code attempt in round 5 only; here they are unit-tested. The whole-match journey at the top of this stack plays both against the emulators.
- The default journey on this branch. One of its checks was changed here: that a phone names no role but its own now leaves out the list of what the seat is told, where the Insider's sentence names three roles. It is run with that change at the top of the stack.
- Phones, people, a screen reader, a deployed project.
- Game Balance's read of the "What you know" sentences.

## Found while building it, for Integration and Game Balance

| | Finding | What Frontend does meanwhile |
| --- | --- | --- |
| **G17** | **The Supplier's own view carries nothing about a Supply after it is resolved.** V1-16 says a successful grant is disclosed to each recipient and to the Supplier. A recipient sees its own weapon count; the Supplier's view has no field for whom it armed | The Supplier's phone says what it registered, on the page that sent it, and nothing afterwards |
| **G18** | **The Hacker's view carries nothing about a Code attempt once it is made**, except that no further one is offered | After a reload the phone can say only that the server offers no attempt |
| **G19** | **A Code attempt has no list of seats in the view.** Every other action that names seats has one | The phone lists every seat of the match |

## Not in this slice

- The remaining parts of the connected game are listed in [connected-role-actions.md](connected-role-actions.md).
