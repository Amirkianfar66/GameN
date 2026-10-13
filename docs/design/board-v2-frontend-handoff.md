# Board v2: handoff to Frontend after the Integration review

**From the Visual and Motion Designer to Codex Frontend, 13 October 2026.** The Integration review of PRs #127 to #129 requested six corrections; they are made in the same stacked PRs. This page lists what changed for a client since the reviewed heads, where each change is specified, and what stays Backend's. It is a proposal: nothing here is adopted, and nothing is a rule or a server contract.

| PR | Branch | Reviewed head | Corrected at | What |
| --- | --- | --- | --- | --- |
| #127 | `claude/designer-phone-polish` | `5c9a151` | unchanged | The phone kit. No change requested |
| #128 | `claude/designer-board-slots-ward` | `e970eaa` | `a864f1f` | Fixed slots, the 7, 8 or 9-berth ward, the layout and its shell ([board-v2-slots.md](board-v2-slots.md)) |
| #129 | `claude/designer-blackout-window` | `1995d58` | `6154166` (after the merge `5a3c864` of #128's corrections) | The Blackout's lighting window ([blackout-window.md](blackout-window.md)) |

PR #130 (`claude/designer-attack-blocked`, ATTACK BLOCKED) is stacked on #129 and carries these corrections too; its own handoff is `docs/design/attack-blocked.md` on that branch.

The specification packet (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`) controls. [motion-spec-crosswalk.md](motion-spec-crosswalk.md) maps the Designer's earlier notes and each finding to its G and Q identifiers.

## What changed for a client

### Slots (#128, finding 3)

- **The drawing module allocates nothing.** `entrySlot()` is gone. A seat's slot is Backend's stored `slotId`, given by the lowest-free rule (rules contracts, Blackout validation and resolution). Draw the stored slot; never compute one, and never reflow a room when someone arrives or leaves.
- The slot table is now `board-v2-0.1.1` (`contract/slots.json`). Its geometry and its numbering are unchanged: the numbering is the order the rule fills a room in and the Blackout position number.

### Shell and layout (#128, finding 4)

- **`fitBoardV2(viewport, roster, { insets })` chooses the shell by what fits** the usable height: the viewport less its safe-area insets. It draws the phone kit's shell for that height at most, a smaller one where the rooms would not fit, a narrower centred board (`fallback: 'narrow'`) where no shell fits the width, and no board where nothing fits (`'too-short'`, `'too-narrow'`).
- It returns `boardLeft`, `boardTop`, `boardWidth`, `boardHeight`, every room's box in viewport pixels, `navTop`, the Pass's circle and `fallback`. `fits` is true only for a board that is drawn.
- **Never draw `fits: false` as a board**, never scroll the board and never shrink a target. Measure again on resize, rotation and when the browser's bars show or hide ([board-v2-slots.md](board-v2-slots.md#4-the-layout-from-the-phone-and-the-roster-never-from-who-is-where), rules 1 to 5).
- Nothing may lie over a press area: the review page's caption margin was one such case (section 7 of that page).

### The Blackout (#129)

| | Was | Now | Specified in |
| --- | --- | --- | --- |
| **The dark's boundary** (finding 1) | People faded over 5 000 to 5 200 ms (reduced: from 4 920) | At `previewEndsAt` exactly, in both motion modes, every figure, name tag and name leaves the page and its accessibility tree, in the instant the selection opens. `blackoutFrame().people` is `gone` for all of `[previewEndsAt, R+120)` | [blackout-window.md](blackout-window.md#1-what-every-phone-shows), section 5 rule 1 |
| **The window's text** (finding 2) | A strip over the Command band, covering C1 | A second row of the top bar while `line` is true, the same box on every screen; the bar never changes height during a match. Nothing is drawn over the board. The Disabler's own position is pressable and drawn like any other (Q-B03d) | section 1, section 5 layer L10 and rule 10 |
| **Choosing** (finding 2) | Strike and Choose again buttons in the strip | A tap chooses (nothing sent); a tap on another position chooses that one; a second tap on the chosen position sends **one command with one stable id**, and the press areas unmount | section 1, section 5 rule 5 |
| **After the deadline** (finding 6) | A pending send read "Time is up: no position was registered." | A sent position stays "waiting" until the server's answer or a receipt recovered with the same id says registered or not. The deadline alone never says either. Never a second command id or a resend of an accepted action | section 1, section 5 rule 6 |
| **The settled hit** (finding 5) | The patient redrawn Injured at B2 | The impact stays at the frozen slot; when the lights return, the patient is drawn at the stored Hospital slot, in the gown. The drawing layer never infers a berth | section 5 rule 7 |

The words, all proposals: "Remember who is where.", "Wait for the lights.", "Remember Room B: you choose there.", "Tap a position in Room B.", "Position 2: tap it again to strike.", "Sending position 2…", "Registered: position 2.", "Position 2 sent. Waiting for the answer.", "Position 2 was not registered." and "Time is up: no position was sent." Each fits the 320 px top bar at the default text size.

## What the Designer's tools prove, and what a client must prove again

The review page is not a client. These are the cases its tools check in desktop Chromium; a client needs the same cases in its own tests, on its own markup:

1. **Boundaries:** at 4 999, 5 000, 5 100, 14 999 and 15 000 ms, in both motion modes, people and names on the page only before 5 000, and a real press choosing only in `[5 000, 15 000)`.
2. **Real pointer hit-testing**, not the presence of a button: the centre and four inner corners of every position's press area, every room a Disabler can be bound to (C1 included), at 320 × 568 and 390 × 844; every slot of every room at every shell boundary, with and without safe-area insets.
3. **Receipts:** a late answer, a lost answer recovered with the same id, a lost answer never recovered, a rejection, and a choice never sent; one command and one id throughout.
4. **Equal screens:** a missed strike and no strike, a Blue Disabler and a Red one, the display and a player, the top bar's box on every screen.
5. **The settled board:** every seat at its slot, the hit patients in the Hospital, nobody else moved.

## What stays Backend's and Integration's

- **Backend:** the stored `slotId` and its lowest-free allocation; the starting roster and the Hospital's capacity; the public window `{windowId, previewEndsAt, endsAt}` every normal round; the eligible Disabler's binding, selection command, receipt and its recovery by command id; the sanitized batch with each hit's `slotId` and its checkpoint, two accepted attacks kept as two; room facts for blocks, to the authorized room observers (G-04).
- **Backend and Frontend together:** the 1.5 s hold for a late outcome is a presentation proposal. It needs an agreed publication checkpoint and stale-event handling; it is not a game phase and never extends the selection.
- **Integration:** exact-file review of the new bytes of `slots.mjs`, `fit.mjs` and `films/blackout.mjs` (the review withheld acceptance of their earlier bytes); the capacity gate's time limit (`scripts/test-capacity.mjs`). The accepted drawing candidates (`hospital-ward.mjs`, `lighting.mjs` and their 29 files) are unchanged.
- **The owner and Frontend:** phones whose usable height is under 568 px get the `too-short` message rather than a board (board-v2-slots.md, section 8).

**Not to port:** `design/board-v2/js/page.js`, `blackout-view.mjs` and `fixtures.mjs`. They are a review page and synthetic fixtures; their "sends" are a counter.
