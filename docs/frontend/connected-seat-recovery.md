# Connected flow: moving a seat to another device

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-seat-recovery`, stacked on `agent/frontend-connected-match-end` (draft [PR #49](https://github.com/Amirkianfar66/GameN/pull/49)) and the branches under it, on Integration's landing candidate (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)). All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule is implemented or decided here.

The integration review of 6 October 2026 lists "seat-recovery flows" among the next work for the connected flow. V1-21 approves the rule: a seat may be moved to a new authenticated identity with a one-time code the host authorizes, the old identity loses access at the same moment, and nothing is dealt again or reset. Integration's draft [#41](https://github.com/Amirkianfar66/GameN/pull/41) proposes how to operate it. This slice follows that proposal.

## What it adds

**For the device that lost the seat.** This is the part that was missing from the client core, and it does not depend on recovery:

- A transport now says when the server's rules **refused** a read, which is not a lost connection.
- A session that is refused its view lets go of it **at once**, in its state and in its store, shows a recovery screen ("No access to this match"), and takes nothing that arrives afterwards. Before, a refused phone kept showing the last private view it had, marked as a lost connection.
- **A command it had in hand is dropped with it**: the request and what was chosen, the checks still planned, and the identifiers kept for a reload. Nothing more is sent or asked about it.
- A listener that merely fails is still a lost connection: the last view is kept and marked stale, and a command stays accounted for, as before.
- The recovery screen states no cause as fact. The device is told that the server refused it, and when that happens.

**One rule for a request whose answer is lost**, in the client core and unit-tested (`apps/game/src/connected/lifecycle-requests.ts`). Before this slice it was written into the preview page, and a review found it wrong there in several ways.

- A request is made once, from what was entered at the first press, and kept until the server has settled it. Until then, pressing again sends that very request, with the same identifier, whatever the controls say by then.
- A refusal settles a request only if every earlier try of it was answered. After a try that got no answer, a refusal says nothing about that try: it may have been carried out, or may yet be. The request is kept, and giving it up is for the person to do.
- "Unavailable" and "slow down" settle nothing, and nothing is sent before the wait the server named is over.
- A request that is not settled can be kept across a reload only as identifiers. A request that carries anything else, a recovery code first of all, is never written down, whatever the caller asks for.

**For the host.** The client can send `v1IssueSeatRecovery`. The preview's host console issues a code for a taken seat:

- one request at a time for the whole console, sent again as it is until the server answers, also after a reload of the console;
- an answer that repeats an earlier one, which the service sends without the code, is reported as that, and only then is a new request made;
- a code is shown from the page's memory, labeled with its seat, and taken off the screen the moment a new one is asked for that seat, whether or not an answer comes back.

**For the device that takes the seat over.** The client can send `v1RedeemSeatRecovery`. The preview's player page takes a match identifier and a code:

- the code leaves the field as the request is made, and goes into the request and nowhere else;
- before anything is sent, the tab notes which match it asked for a seat in, and nothing more;
- **if the answer is lost, the page finds out from the server what happened.** Only a device in the match can read its lobby. So a device that asked for a seat and can read the lobby has it, and the page opens the match without the answer; a device the lobby is refused to does not have it, and is told so. This also works after a reload, when the request and the code in it are gone.

While a request is kept, a page does not let what was entered be changed, because that is no longer what would be sent, and it offers to give the request up.

## What was run

On 6 and 7 October 2026, macOS, Node 22.21.1, npm 10.9.4. `npm run verify` at the head of this branch.

| Check | Result |
| --- | --- |
| `npm run verify` | **630 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 11 tooling, 140 presentation (1 new), 329 game (19 new). Typecheck, build and source integrity passed. Production exclusion: 46 modules reachable from 2 production entries, 139 files scanned, 23 development files labeled |
| Mutation check | **42 of 42** deliberate faults caught by this slice's tests. Fourteen in what a refused device does: a refused session keeping its view, or showing what arrives later; the store keeping the view; a refusal not passed on by the feed; every listener failure taken for a refusal, in the session and in the web client; a refusal reported as a plain failure; the private panel staying open across the recovery screen; no recovery screen; that screen worded as an integrity failure, or announced as an update being required; a recovery code for another seat believed; any successful answer taken as the answer to this request. Twenty-three in the rule for requests: a request forgotten after no answer; a refusal settling one although an earlier try went unanswered; a refusal or a success not settling one; "unavailable" or "slow down" settling one; a press going out before the wait the server named; a second send while one is on its way; an invalid request kept; a request given up while it is on its way, or not given up at all; anything asked to be durable written down, a recovery code included; every kept request written down; a durable one not written before it is sent, or never, or left in the store once settled; what the store holds believed whatever it is; a request rebuilt from what is entered at every press. Five in the command a refused phone had in hand: left in memory; its identifiers left for a reload; a check left planned; the flow not told; the flow told on every problem and not only a refusal. One of these was not caught at first, and a test was added for it |
| Independent review | By a separate reviewing session with none of this work's context, reading this slice at fixed commits, the preview page in full. The client core's handling of a refusal stood: sticky across late payloads, reconnection and connection changes, only a rules refusal classed as one, a code believed only for its seat, the code never in storage, an address, the console or the status line. **Nine defects and a small one, in the preview's handling of lost answers and in what a refused device is told**, all corrected; see below |
| Frontend emulator tests | **6 of 6** passed, 70 s, **against emulators that were already running**: the five of the earlier slices and the one described below |
| Browser journey, `MOTHERSHIP_JOURNEY=recovery` | **Passed**, 14 s, at the head of this branch. Headless Chrome 155: a host, a shared display, seven players and two more devices against the local Auth, Firestore and Functions emulators |

**The emulator test** (`apps/game/test-emulator/connected-lifecycle.test.mjs`, second test) goes through the documented operations and the Security Rules. Only the host can ask for a code, and only for a taken seat. The code is 43 characters and the server says when it ends, within ten minutes of its own time. The same request again is answered without the code. Issuing changes nothing: the seat's identity still reads its view. A code with one character changed opens nothing, and a player already in the match cannot take a second seat with the real one. The new identity redeems it and has the seat as it stood: the same role, the same knowledge, the same holdings. The old identity's listeners end as **refused**, its reads are answered 403, including a read of the view under the new identity, and a command it sends is refused. A third identity cannot use the code again. Nothing public changed and the other seats were untouched. The new identity then moved the seat with a move the server offered it: a real receipt, and the public view showed it.

The web-client test of the first slice now also asserts that a listener the rules turn away reports "refused".

**The browser journey**, in a throwaway seven-player match (its own words are in [`evidence/connected-v1/recovery/`](evidence/connected-v1/recovery/)). Lost requests and lost answers were arranged in the browser, and are labeled as arranged:

- **The host asked for a code and the answer was dropped.** The console said no answer had come, kept the request, would not let the seat be changed, and kept the request's four identifiers, and nothing else, for a reload.
- **The console was reloaded.** It still had the request and sent the very same one again. The service answered that a code had been issued and did not give it out a second time; the console said so, and showed no code.
- **Only then was a new request made**: a new identifier, answered with a 43-character code good for ten minutes by the server's own time. The console showed it, labeled with its seat. It was not in the page's storage or address. Nothing changed for the seat's device.
- **A device that had never been in the match entered the match identifier and the code, and its request was dropped before it reached the server, twice.** The second was the very same request. The code left the field as the request was made and was in no storage; the tab noted only which match it had asked for a seat in. The server refused it the lobby, the page said the server had not given it a seat, and the seat stayed with its device.
- **That page was reloaded.** The request and the code were gone, the note was not, and it said the same. Starting over brought the form back.
- **The code was entered again, the request reached the server, and its answer was dropped.** Without anything more being pressed, the page found that the server now let it read the match, and opened it as that player. With its private panel opened it showed the role and everything else the old device had been told. It keeps its sign-in, the match and the seat's number, and not the code.
- **The device that had held the seat was refused its view by the server. It let go of everything at once and said so**: "No access to this match", with no role, nothing it had been told and no part of the match left in its page or its model. A reload did not bring the match back.
- Nothing public changed: the display's board was identical, and the six other phones stayed current with their own roles.
- A third device that tried the same code was refused and shown nothing. The code was not left in its field, and its tab kept nothing of the match.
- The new device then moved the seat: one `MOVE`, accepted, and the display showed it. The old device sent nothing at any point.
- No page was loaded by anything but the script.

**The code is in no evidence.** The pictures were taken before a code was on screen and after it was used, the log and the facts file do not record it, and I searched the folder for any string of that shape before committing it.

The evidence is from a run at the head of this branch, which passed at the first try. This journey arranges three faults through the browser's request interception, which can itself leave a request waiting ([connected-role-actions.md](connected-role-actions.md)): a run that stops on a wait just after a fault was arranged is to be run again. Before it, the journey as it is now passed once and stopped once in the common setup, for that reason.

## What the review found, and what was done

All of it was in the preview page or in what a refused device is told. Each is corrected, and the journey above now arranges the first three.

| What was wrong | What it could do | Now |
| --- | --- | --- |
| A lost answer to the request to take a seat over left nothing behind but a request in memory | The server had moved the seat; the tab did not know, and after a reload it asked again with a new request, which the server refuses because the identity already holds a seat. **The seat was left with nobody** until another identity redeemed another code | The tab notes which match it asked for a seat in before it sends, and asks the server what it can read |
| The control sent the request it remembered, not what was typed, and paired the answer with the match field as it read by then | A match identifier edited after a lost answer was saved with the seat of another match; a second code typed after a first that never arrived was not sent, and the first was | What was entered goes into a request once and cannot be changed while that request is kept; the answer is paired with the request that was answered |
| A request for a code was given up on any refusal, also after a try that got no answer, and on a reload | A newer request could be overtaken by the older one still on its way, leaving a dead code on screen | The rule above, in the client core, with the identifiers kept across a reload |
| The console had one place for a code and never took a code off the screen | A code that a newer request had replaced stayed up; an answer for one seat overwrote the code of another | One request at a time; a code is labeled with its seat and comes off the screen when a new one is asked for |
| The code stayed in its field after no answer and after a refusal | A valid code left readable on the screen of a device that was refused for another reason | It leaves the field as the request is made |
| A device that was refused was told it was "not admitted, or its seat has been moved", and that "the match itself is not affected" | Stated as fact what the device cannot know. With a match ended before it started, every phone would have said so | The screen says the server refused, and when that happens. A match ended while still a lobby is handled in the slice under this one |
| A refused phone kept its last command in memory and kept asking what became of it; the identifiers stayed in storage | Nothing reached a screen, but a device with no seat went on asking about that seat's command, and would again after a reload | The command is dropped with the view |
| While refused, the waiting page was redrawn every second and a half | Keyboard focus and a screen reader's place were lost each time | It is redrawn only when what it says changes |
| A label stayed visible when its control was hidden; a pasted code with a leading space lost its last character | Clutter; a code that could not be redeemed | Fixed |

**Left as it is, deliberately.** After a refusal the store keeps what a view was checked against, which includes the seat's role, in the page's memory until the page is closed or reloaded. It is what keeps a later view for another seat or role from being taken for this one. It is in no model, document or storage.

## Found while building it, for Integration and the owner

| | Finding | What Frontend does meanwhile |
| --- | --- | --- |
| **G20** | **The code is 43 characters and the new device also needs the match identifier.** Read aloud or typed by hand at a table, that is not workable; draft #41 rules out putting a code in a link or a QR code | The preview takes both in text fields. A shorter, supervised way to hand a code over needs a decision |
| **G21** | **A device that lost its seat is told only by being refused.** Nothing it can still read says the seat was moved. And a seat moved before the match starts changes nothing the old device can see: it goes on saying it is seated until the start | The recovery screen says what the server did and when that happens, and to ask the host |
| **G22** | **The host's own identity cannot be moved** (draft #41 says so). A host who loses their tab cannot seat, start, end or issue codes | Not addressed here. The preview keeps the host's sign-in for the tab |
| **G23** | **A refusal is read from the Security Rules' answer alone.** In a deployed project with App Check enforced on Firestore, the same answer may also mean that attestation failed, and this client would then drop the match for good | Nothing, on the emulators. It has to be settled when a production adapter is written |
| **G24** | **After a reload, a device cannot ask what became of its request to take a seat over.** The only way to ask is to send the identical request again, and that needs the code, which is not kept. There is no lookup for such a request as there is for a command | The page reads what the server lets it read instead, which settles it |

## Not run

- A code that has expired, against the backend. A request refused after an earlier try of it went unanswered, and giving a request up, in a browser. All three are unit-tested.
- Moving the host's own identity: the service has no operation for it (G22).
- Phones, people, a screen reader, a deployed project. Typing 43 characters on a phone keyboard in particular.

## Not in this slice

- The console that issues a code is the development preview's. A product screen for the host is later work, with the rest of the lobby.
- A listener that fails for a reason other than a refusal is not started again; the banner says "Reconnecting" and nothing does. That was so before this slice.
- Real devices. A phone, a second phone and a table are the first-phone rehearsal's to try (draft #41).
