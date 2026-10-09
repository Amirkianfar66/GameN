# Board-play evidence (issue #87)

There are two kinds of evidence here, and they are kept apart:

- **Browser simulation** (`simulation/`). The release's own player and display screens, command controller, host, stylesheets and art run in headless Chromium against schema-checked synthetic views and a scripted command desk (`apps/game/dev/board/`). Every action is played through real touch and key input at four phone sizes.
- **Local emulator flow** (`emulator/`). The hosted client runs on the local practice harness: isolated Auth/Firestore emulators and the loopback service, with its local deadline and bot tick. A host, one player among bots and an admitted shared display take part.

**Physical devices: none were tested.** Neither kind of evidence says anything about real phones, deployed services, App Check or Cloud Tasks. Neither proves multiplayer correctness or social-deduction balance. Every name in `simulation/` is synthetic.

## Browser simulation

Command (with `npx vite --config apps/game/dev/board/vite.config.mjs` running):

```sh
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-board-play.mjs docs/frontend/evidence/board-play/simulation --all-sizes
```

`simulation/facts.json` holds every measured step, and `simulation/capture-log.txt` gives one line per step. A step is "clean" when all of these hold:

- the page does not scroll, vertically or sideways;
- every press area is at least 44 × 44, inside its own room, on screen, hit at its centre by itself, and overlaps no other press area and no room tag;
- every visible control is at least 44 px;
- the status bar clips nothing.

**Results of the run kept here (2026-10-09, headless Chromium 141.0.7390.37 via the DevTools protocol):**

- **236 measured steps, all clean.** 234 are on phones: 58 each at 320 × 568, 360 × 740 and 430 × 932, and 60 at 390 × 844, which adds the keyboard and reduced-motion runs. 2 are on the shared display at 1280 × 720.
- **491 press areas measured**, every one at least 44 × 44, inside its room, hit at its centre, and overlapping no other press area and no room tag. The crowds include nine in one room in Room A, Room B, the Command Room and Jail, and eight in the Hospital.
- **Keyboard.** From the strip's question, 3 Tab presses reach the first offered character. Enter picks it, and focus lands on the strip's next question. Escape steps back from confirming to choosing.
- **Reduced motion** (in-app setting). A move lands with no flight, no trail and no effects-layer node.
- **Robustness.** Losing focus mid-choice drops the choice: no mark, press area, strip or private hook remains. A stale (unconfirmed) view pauses actions and removes every mark.
- **Shared display.** It has no private hook and no role word, and the public move flies there as on the phone.
- **Pass.** It is available on the player's own turn, unavailable on another's, and absent in a legacy match. The middle slot is kept.

`simulation/facts.json` is not a test oracle: it records one run. The scenarios are synthetic and say nothing about who could be offered what in a real match beyond what the engine permits.

Only a curated set of screenshots is kept. The log and facts cover every step at every size.

| Screenshot | What it shows |
| --- | --- |
| [390x844-board.png](simulation/390x844-board.png) | Your turn: the board, nothing open |
| [390x844-tray-many.png](simulation/390x844-tray-many.png) | Actions: the compact tray over the lower board |
| [390x844-tray-empty.png](simulation/390x844-tray-empty.png) | Actions with nothing open |
| [390x844-shot-choose.png](simulation/390x844-shot-choose.png) | Shot: the offered characters ringed, everyone else faint |
| [390x844-shot-confirm.png](simulation/390x844-shot-confirm.png) | Shot: one chosen (checked, lifted), confirm in the strip |
| [390x844-shot-pending.png](simulation/390x844-shot-pending.png) | Shot: on its way (dotted ring, status stamp) |
| [390x844-shot-registered.png](simulation/390x844-shot-registered.png) | Shot: the neutral receipt; nothing drawn on the target |
| [390x844-disable-choose.png](simulation/390x844-disable-choose.png) | Disable |
| [390x844-protect-confirm-self.png](simulation/390x844-protect-confirm-self.png) | Protection for yourself |
| [390x844-rescue-choose.png](simulation/390x844-rescue-choose.png) | Rescue: a character in the Hospital |
| [390x844-hack-choose.png](simulation/390x844-hack-choose.png) | Hack request |
| [390x844-scan-choose.png](simulation/390x844-scan-choose.png) | Scan: choose a character |
| [390x844-scan-faction.png](simulation/390x844-scan-faction.png) | Scan: the faction inline in the strip |
| [390x844-scan-confirm.png](simulation/390x844-scan-confirm.png) | Scan: confirm |
| [390x844-supply-first.png](simulation/390x844-supply-first.png) | Supply: the first of two |
| [390x844-supply-second.png](simulation/390x844-supply-second.png) | Supply: one numbered, choose the second |
| [390x844-supply-registered.png](simulation/390x844-supply-registered.png) | Supply: the neutral receipt |
| [390x844-code-two.png](simulation/390x844-code-two.png) | Code attempt: two of four numbered |
| [390x844-code-confirm.png](simulation/390x844-code-confirm.png) | Code attempt: four chosen, confirm |
| [390x844-showdown-choose.png](simulation/390x844-showdown-choose.png) | Showdown shot in the Final Zone |
| [390x844-election-choose.png](simulation/390x844-election-choose.png) | Captain election: candidates and Abstain |
| [390x844-election-recorded.png](simulation/390x844-election-recorded.png) | Ballot recorded |
| [390x844-jail-choose.png](simulation/390x844-jail-choose.png) | Jail vote |
| [390x844-release-choice.png](simulation/390x844-release-choice.png) | The Captain's release request: a jailed character |
| [390x844-release-vote.png](simulation/390x844-release-vote.png) | Release vote: Yes, No, Abstain inline |
| [390x844-move-confirm.png](simulation/390x844-move-confirm.png) | Room tag pressed: the tentative "You?" place, confirm |
| [390x844-move-flight.png](simulation/390x844-move-flight.png) | The public move: the character carried between rooms |
| [390x844-move-landed.png](simulation/390x844-move-landed.png) | Landed; co-occupants re-stationed |
| [390x844-pass-receipt.png](simulation/390x844-pass-receipt.png) | Pass: the neutral receipt above navigation |
| [390x844-legacy.png](simulation/390x844-legacy.png) | Legacy ruleset: no Pass, the slot kept |
| [390x844-crowd-vote.png](simulation/390x844-crowd-vote.png) | Nine in Room A, nine candidates |
| [390x844-card.png](simulation/390x844-card.png) | The private card sheet, unchanged |
| [390x844-menu.png](simulation/390x844-menu.png) | Menu and the readable list, unchanged |
| [390x844-background-drops-choice.png](simulation/390x844-background-drops-choice.png) | Focus lost mid-choice: the choice and its marks are gone |
| [390x844-stale-pauses.png](simulation/390x844-stale-pauses.png) | A stale view: actions paused, marks gone |
| [320x568-board.png](simulation/320x568-board.png) | 320 x 568: the board |
| [320x568-tray-many.png](simulation/320x568-tray-many.png) | 320 x 568: the tray |
| [320x568-supply-second.png](simulation/320x568-supply-second.png) | 320 x 568: Supply |
| [320x568-code-two.png](simulation/320x568-code-two.png) | 320 x 568: Code attempt |
| [320x568-crowd-vote.png](simulation/320x568-crowd-vote.png) | 320 x 568: nine in Room A |
| [320x568-crowd-hospital.png](simulation/320x568-crowd-hospital.png) | 320 x 568: eight in the Hospital |
| [320x568-crowd-jail.png](simulation/320x568-crowd-jail.png) | 320 x 568: nine in Jail |
| [320x568-crowd-command.png](simulation/320x568-crowd-command.png) | 320 x 568: nine in the Command Room |
| [320x568-release-vote.png](simulation/320x568-release-vote.png) | 320 x 568: release vote |
| [320x568-long-names.png](simulation/320x568-long-names.png) | 320 x 568: twelve-character names |
| [320x568-move-flight.png](simulation/320x568-move-flight.png) | 320 x 568: a public move in flight |
| [430x932-crowd-room-b-supply.png](simulation/430x932-crowd-room-b-supply.png) | 430 x 932: nine in Room B, Supply |
| [360x740-election-choose.png](simulation/360x740-election-choose.png) | 360 x 740: Captain election |
| [keyboard-focus-target.png](simulation/keyboard-focus-target.png) | Keyboard: a character focused after three Tabs from the strip |
| [reduced-motion-move.png](simulation/reduced-motion-move.png) | Reduced motion: the move lands without a flight |
| [display-public.png](simulation/display-public.png) | Shared display: public facts only |
| [display-move-flight.png](simulation/display-move-flight.png) | Shared display: the same public move in flight |

## Local emulator flow

Command (with the three practice processes of `docs/frontend/practice-bots.md` running):

```sh
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-board-emulator.mjs docs/frontend/evidence/board-play/emulator 7
```

**Results of the run kept here (2026-10-09, 7 seats: 6 bots, one player, one admitted display, local emulators only).** `emulator/capture-log.txt` is the step log and `emulator/facts.json` holds the measurements.

- **Setup.** The staged start ran unchanged: the player chose a character, revealed the role, pressed Ready, and the match opened on the phone and the display.
- **The player's turn** came after 297 s of bot turns (each bot holds its full minute; practice bots never Pass).
  - The tray offered Hack. Choosing it ringed exactly the offered characters and drew everyone else faint. A character was picked and then put down unsent.
  - **Move by keyboard.** Tab reached the Room B tag, Enter opened the move, the tentative "You?" place appeared, and Tab then Enter confirmed. The move flew **on the phone and on the display at the same time**, and the receipt was neutral.
  - **Pass** gave the neutral receipt, and the next turn began at once.
- **Jail vote** (end of round 1). The player tapped a character on the board and confirmed; the receipt said "Your vote for Player 1 is recorded. This is not a result." The display then drew the count and the new phase (Round 2, Captain election), with the round-transition cue caught mid-sweep in `emulator-19-display-after-vote.png`.
- **Display privacy.** The display was checked at five points (start, Hack choosing, after the move, vote choosing, vote recorded). It never held a private hook (marks, press areas, the strip, the private panel, a role device or team) and never showed a role word.
- **Measurements.** Every measured phone step was clean, with the same checks as the simulation at 390 × 844.
- **Ending.** The host ended the match.

**Seen but not caused by this change.** On the shared display at 1280 × 720 with the vote panel open, the release's table layout lets the Jail panel overrun the board's edge (`emulator-18`, `emulator-19`). The display's panel geometry is the same with and without this branch's stylesheet. The table layout is not part of this change.

| Screenshot | What it shows |
| --- | --- |
| [emulator-01-board.png](emulator/emulator-01-board.png) | The phone at the first turn (a bot's) |
| [emulator-02-display.png](emulator/emulator-02-display.png) | The shared display, public facts only |
| [emulator-04-your-turn.png](emulator/emulator-04-your-turn.png) | The player's turn: Pass available in the middle of navigation |
| [emulator-05-tray.png](emulator/emulator-05-tray.png) | Actions: the tray over the board |
| [emulator-06-hack-choose.png](emulator/emulator-06-hack-choose.png) | Hack: the offered characters ringed in their room |
| [emulator-07-hack-picked.png](emulator/emulator-07-hack-picked.png) | One chosen, confirm in the strip (then put down unsent) |
| [emulator-09-move-confirm.png](emulator/emulator-09-move-confirm.png) | The room tag pressed by keyboard: tentative place, confirmation focused |
| [emulator-10-move-flight-phone.png](emulator/emulator-10-move-flight-phone.png) | The move in flight on the phone |
| [emulator-11-move-flight-display.png](emulator/emulator-11-move-flight-display.png) | The same move in flight on the display |
| [emulator-12-move-accepted.png](emulator/emulator-12-move-accepted.png) | Landed; the neutral receipt |
| [emulator-13-pass-receipt.png](emulator/emulator-13-pass-receipt.png) | Pass accepted; the next turn under way |
| [emulator-14-jail-vote-board.png](emulator/emulator-14-jail-vote-board.png) | The Jail vote opens |
| [emulator-15-jail-vote-choose.png](emulator/emulator-15-jail-vote-choose.png) | Every candidate tappable on the board; Abstain inline |
| [emulator-16-jail-vote-confirm.png](emulator/emulator-16-jail-vote-confirm.png) | One chosen; confirm |
| [emulator-17-jail-vote-recorded.png](emulator/emulator-17-jail-vote-recorded.png) | Ballot recorded (not a result) |
| [emulator-18-display-during-vote.png](emulator/emulator-18-display-during-vote.png) | The display during the vote |
| [emulator-19-display-after-vote.png](emulator/emulator-19-display-after-vote.png) | The display as the count and the new round arrive |
| [emulator-20-after-vote.png](emulator/emulator-20-after-vote.png) | The phone in the next phase |
