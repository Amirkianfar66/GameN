# Connected flow, next slice: the actions that name one seat

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-actions`, based on Integration's landing candidate `codex/v1-connected-merge-candidate` (draft [PR #37](https://github.com/Amirkianfar66/GameN/pull/37)) at `71dfd0277c6ccc4a5dd78b9702face98a46310b8`. That candidate contains the reviewed connected flow (draft [PR #29](https://github.com/Amirkianfar66/GameN/pull/29) at `8b97180038a37b798fbef345272a32e42c0d0853`) with every Frontend-owned file unchanged. All unmerged.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`**, V1-01 to V1-21 approved, unchanged. No rule is implemented or decided here.

The integration review of 6 October 2026 lists, as the next work for the connected flow, the remaining role actions, Hack, Code, the votes, the showdown, the result, host abort and seat recovery. This slice is the first part of that: **every action that names one seat**. It is one focused change because all of these are the same flow the phone already had for an ordinary shot.

**It is still not the complete game.** What is left is listed at the end, with what blocks each part.

## What a phone can do now

| Action | Command | Offered when |
| --- | --- | --- |
| Move | `MOVE` | The view lists destinations (unchanged) |
| Shot | `REGISTER_SHOT` | The view opens an ordinary shot and lists targets (unchanged) |
| **Disable** | `DISABLE` | The view lists seats under `DISABLE` |
| **Protection** | `PROTECT` | The view lists seats under `PROTECT` |
| **Rescue** | `RESCUE` | The view lists seats under `RESCUE` |
| **Hack** (a request) | `REQUEST_HACK` | The view lists seats under `REQUEST_HACK` |
| **Showdown shot** | `SHOWDOWN_SHOT` | The view lists seats under `SHOWDOWN_SHOT` |

While the server says a seat is in a Hack (`hackPartnerSeatId`), that seat's open private panel says who with. No other phone and not the display is told.

## How it decides what to offer: it does not

- **The phone holds no table of which role has which action.** A move and an ordinary shot are always listed, open or not, as before. Every other action is listed only while the player's own view lists seats for it under that command's name, and with exactly those seats. A Disabler's phone shows "Disable" on its own turn because the server's view says so, and shows nothing about it at any other time. A phone therefore cannot reveal a role by listing an action the server did not open, and cannot offer one the rules do not allow.
- **An open action with nobody to choose is said as it is**: "No one you can target right now", with no control.
- **Where the server lists the player's own seat** (the approved self-target exceptions for Protection and Rescue, V1-13), the list names it as theirs and the sentences say "yourself".
- **The gates are the ones the first slice has**: a view the server confirmed, a trusted and running countdown, the private panel open in the foreground. Otherwise an offer is "Paused" and has no control.
- **The command flow is unchanged**: one command at a time, identifiers stored before sending, lookup and identical re-send, waits the server names, nothing put aside while unresolved. A test runs the whole flow once per action.

## What it says, and why in those words

Nothing a phone says is an outcome. The wording follows the approved rules where it states anything about the game:

| Moment | Words | From |
| --- | --- | --- |
| A Disable, Protection or Rescue is accepted | "Disable at Player 3 registered." and so on, then "This is not a result. Registered actions are resolved at the end of the round." | The approved resolution order (V1-07); uses reserved at acceptance (V1-15) |
| A Hack request is accepted | "Hack request with Player 3 accepted. The phase shown at the top of this screen says what happens next." | It is a request. The phone does not say a Hack will happen; the server's phase does |
| A showdown shot is accepted | "Showdown shot at Player 3 registered. This is not a result." | A showdown is not a round, so nothing is said about a round |
| Before confirming | "You cannot change or withdraw it here once it is registered." | A statement about this screen: it has no control that takes a command back |

Protection is granted secretly (V1-17: known only to the Undercover, never shown to the recipient or the public). The phone that registers it says so only inside its own open private panel; nothing is put on the public spoken channel; the journey checks that the display's board is identical before and after and that no other phone is told anything.

The names "Disable", "Protection", "Rescue" and "Hack" are the rule sources' own. They and the rest of the wording are **functional, not designed**, and are for the Designer and the owner to change.

## What was run

All on 6 October 2026, macOS, Node 22.21.1, npm 10.9.4, at the head of this branch.

| Check | Result |
| --- | --- |
| `npm run verify` | **567 passed**, 0 failed, 0 skipped, 0 todo: 25 bootstrap and contracts, 79 engine, 46 backend, 11 tooling, 111 presentation (5 new), 295 game (4 new). Typecheck, build and source integrity passed. Production exclusion: 42 modules reachable from 2 production entries, 127 files scanned, 23 development files labeled |
| Mutation check | **16 of 16** deliberate faults caught by this slice's tests: a shot opened by its list alone; one action reading another's list; an action listed that the view does not open; a shot not listed while closed; "nobody to choose" called unavailable; the player's own seat not named as theirs, or every seat called "yourself"; a Hack shown to nobody, or naming the wrong seat; every command sent as a shot; a Hack request or a showdown shot worded as an end-of-round registration |
| Frontend emulator tests | **4 of 4** passed, 71 s, **against emulators that were already running**: the suite's own command (`node --test --test-concurrency=1 test-emulator/*.test.mjs`) with the emulator hosts in the environment, not through `firebase emulators:exec`, because the fixed ports were in use. They cover the first slice's flow. None of them exercises a role action |
| Browser journey, `MOTHERSHIP_JOURNEY=roles` | **Passed**, 552 s. Headless Chrome 154, one browser context for each device: a host, a shared display and nine players, against the local Auth, Firestore and Functions emulators |
| Browser journey, the default one (seven players, a move) | **Passed**, 72 s, after a correction to the journey. **It had failed on this branch until then**, and that was not noticed when the branch was first pushed, because only the roles journey was run. See below |

What the journey established, in a throwaway nine-player match (its own words are in [`evidence/connected-v1/roles/`](evidence/connected-v1/roles/)):

- It followed all ten phases of the first round in the server's own order: nine turns and one Hack.
- On their own turns the Officer registered a shot, the Blue and the Red Disabler a Disable, the Undercover Protection and the Cracker a Rescue. For each one: the phone had a control for it; the seats listed were the server's (for Protection and the Rescue, the player's own among them); one confirmation sent one command of that type naming the first seat listed; the receipt was accepted, `REGISTERED`.
- After each registration the shared display's board was identical to before, no other phone was told anything, the acting phone's card said one action was registered and waiting (from the server's own view) and offered no second one, and nothing of the role, the target or the command was in the page's storage.
- On every ordinary turn, every other phone's card was on screen and idle, listed a move and a shot and nothing else, and had a control for nothing but a move.
- The first seat in turn order with no planned action (the Supplier, in this run) requested a Hack: accepted. When that turn ended the server opened a Hack phase. The two players' phones each said who with. No other phone did, and the display did not.

The journey was run twice. The first run passed too, but one of its checks (what the other phones list) would also have passed with nothing on screen. The check now requires the idle card to be on screen, and the evidence is from the second run.

**The default journey, corrected.** The seven-player journey of the first connected slice expected each phone to list a move and a shot and nothing else. Since this slice a phone also lists the action its role has, so that check failed on the first phone holding one, and with it `npm run dev:connected:journey`. The check now reads the first two rows, which are the move and the shot; the roles journey checks the rest. No product code changed. Its nine steps then passed on Chrome 155, with no page loaded by anything but the script. The evidence of the first slice in `evidence/connected-v1/movement/` is from that slice's own run and was left as it is.

### Not run

- What any of these registrations resolves to at the end of the round, and anything after it.
- A showdown shot against the backend. A showdown is the end of a match and no journey plays one; it is unit-tested only.
- The nine-player `shot` journey of the first slice, on this branch.
- Phones, people, a screen reader, a deployed project.
- An independent review of this slice.

## Not in this slice, and what each part waits for

| Remaining part of the connected game | What it needs | Blocked by |
| --- | --- | --- |
| **Votes**: Captain election and runoff, Jail vote, release choice and release vote | A ballot card for `VOTE`, `RELEASE_CHOICE` and `RELEASE_VOTE` (a seat or an abstention; yes, no or abstain); the tally and the ballot on the shared display | Nothing. Next slice. Until then these phases are named and timed and say that the screen cannot take part yet |
| **Scan, Supply, Code** | Choices with more than one part: a seat and a faction guess; two seats; four seats. And the private knowledge they produce (scan results, the Code) on the phone | Nothing technical. The private knowledge display should be read by Game Balance before it ships: which hints may sit next to one another |
| **The result**: Finished and Aborted, the end reveal | Result screens for phone and display | The Designer for the screens; nothing technical |
| **Host abort** | `v1AbortMatch` in the lobby console | Nothing. Small |
| **Seat recovery** | `v1IssueSeatRecovery` and `v1RedeemSeatRecovery`: a one-time token shown by the host, entered on the replacement device, kept in memory only | Nothing technical. The policy to follow is the host-supervised one Integration proposes in draft [#41](https://github.com/Amirkianfar66/GameN/pull/41), which is not adopted yet |
| **Host and display pairing** | The display shows its identifier and the host enters it (it does today). Anything shorter is a later change within the same permissions | Entering the full identifier is the stated interim (Integration's drafts [#39](https://github.com/Amirkianfar66/GameN/pull/39) and #41) |
| **Device acceptance** | Real phones against a backend they can reach | The first-phone environment (draft #41): everything is loopback-only today |
| **Cues in the connected flow** | The event director on protocol-2 events and a real event listener | The director's fixes are in draft #30 and await re-review; cue freshness awaits the Designer |

## Unchanged, and still true

Everything in [connected-v1.md](connected-v1.md) about what the connected flow is and is not: emulators on one machine, headless desktop Chrome, no phone, no person, no deployed project. The lobby is a development console. Nothing here is designed.
