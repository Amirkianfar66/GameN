# Actions: Designer's runtime component (interface proposal)

**Version:** `actions-0.1.0`, proposed. **Status (15 November 2026):** the interface only, for the Lead Designer's review. Nothing is built yet. The ballot (#267) and the Card (#270) are both waiting for Frontend, and a builder has at most one component waiting, so the build starts when Frontend connects or reviews one of them. It is not in the game and not a release.

**What it is:** the phone's Actions during a match, as the phone pack draws them: sheets 27.2, 27.3, 28, 29, 29.1 and 29.2, and the Actions frames of 50 (320 × 568) and 53 (Large text). It is #222 items 9–13, with the owner's T2 and T3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**
- **The tiles** (28, 50, 53; item 10):
  - "Your turn" or "Not your turn", and the round;
  - every action of the viewer's role as a tile: its icon, its short name and one state line;
  - a count badge, such as Rescue's injections;
  - the tile's state: available, chosen, sending, registered (the REGISTERED mark), or unavailable with the server's reason, or "Not available now" (T3).
- **Choosing a target** (29; item 13, T2): the words of the shell's target bar ("Rescue · Choose a player", with the shell's Cancel) and of the floating chip ("Other rooms · 1", "List").
- **The list** (29): "Choose from a list · Rescue · everyone you can reach", room by room, each row going to the check.
- **The check before Register** (29, 27.2; item 11): the person, or the action when it has no person; what it costs and when it resolves; Cancel and "Register Rescue" in the shell's footer, the Register button busy while it sends.
- **After Register** (29, 29.1, 29.2; item 12): the action's own state once the server accepts it. Its stamp (REGISTERED, ACCEPTED, ACTIVE, CAPTURED), headline, detail, the Engineer's captured players, a time line, and Done.
- **Pass** (27.3; item 9): the "Pass your turn?" sheet, "The turn goes to Eli · Player 5", and the line "Your move stays open on the other turns this round."

**Built on, not redrawn:**
- **The phone shell** (#265): the docked sheet's frame (title, sub, back, close, footer actions with their busy state), the target bar with Cancel, the floating chip, the raised Pass. This component fills the sheet's body and gives the frame's words.
- **The room scene** (#261): the rings on the offered people, the picked one, the dimming (`targets: { seats, picked }`).
- **The board** (sheet 26): the same `targets` for people in other rooms. Its component is next in my area. Until then, Frontend's board view shows them.
- **The kit** (`component-kit-0.2.0`): rows, lists, group labels and notes for the list; the stamp; portraits; the inline error; the control policy. The shell draws the buttons.

**Not in this component:**
- Move's positions. The Move tile only starts it; the room scene's and the board's empty positions and the shell's target bar draw the rest (sheets 20, 26).
- Scan and the final Code (42; #222 items 14 and 15). The Hacker's tiles start them; their sheets are the next components.
- A private talk after it is accepted (25; item 20), Promises (33; item 19) and the office decisions (40–41; item 17).

## Files (planned)

Designer's, runtime-safe, in `design/phone-ui/components/actions/`:

| Path | What |
| --- | --- |
| `actions.mjs` | `ACTIONS_VERSION`, `ACTION_WORDS`, `ACTION_LOOKS`, `ACTIONS_DEFAULTS`, `checkActions()`, `nextActionsInput()`; the parts' frames `actionsSheet()`, `targetListSheet()`, `checkSheet()`, `afterSheet()`, `passSheet()`; the shell's words `targetBar()`, `targetChip()`; the mounts `mountActions()`, `mountTargetList()`, `mountActionCheck()`, `mountAfterRegister()`, `mountPassNote()` |
| `actions.css` | Every style, scoped under `.ms-actions`. It imports the kit's styles |
| `preview/` | Development only: the preview on the pack's synthetic fixtures, in the shell over the room scene; the lifecycle probe (`probe.mjs`); the agreement with the pack (`agree.mjs`) |
| `review/` | The check's captures and `check.json` |

Also `design/tools/actions-check.mjs` (on the shared `component-check.mjs`), `packages/design-tokens/test/actions.test.mjs`, and this page.

**Used unchanged:** `../icons.mjs`, `../kit/kit.mjs` and `kit.css`, and the crew portraits through the kit. It imports no prototype, preview, fixture or development module.

## The steps, and who draws what

Frontend's model already has the steps (`PlanetActionModel.step` in `packages/presentation/src/planet/model.ts`). Each row says what Frontend gives the shell, the scene and this component.

| Step | The shell | The room scene or the board | This component | Frontend's `action.step` |
| --- | --- | --- | --- | --- |
| The tiles | `sheet: actionsSheet(…)` (id `actions`); `tabs.open: 'actions'` | the scene's `control: null`, as under any sheet | `mountActions()` in `shell.sheetBody` | no action |
| A tile is tapped | | | `onTile(type)` | Frontend starts the action |
| Choosing in the room | `sheet: null`; `target: targetBar({ type, where: 'room' })`; `chip: targetChip({ kind: 'other-rooms', count })` when people it can reach are elsewhere. The round button stays (T2) | `targets: { seats, picked }`: the offered people in this room | | `targets` |
| Other rooms | the board view; `target: targetBar({ type, where: 'board' })`; `chip: targetChip({ kind: 'list' })` | the board's `targets`: every offered person, where they stand; the rest dimmed | | `targets` |
| The list | `sheet: targetListSheet(…)` (id `action-list`; back to the board, no close) | unchanged | `mountTargetList()`; a row calls `onPick(seat)` | `targets` |
| The check | `sheet: checkSheet({ type, phase: 'ready' })` (id `action-check`): Cancel and Register | the picked person ringed, when in this room | `mountActionCheck()` | `confirm` |
| Registering | `checkSheet({ type, phase: 'sending' })`: Register busy, named "Registering…" | unchanged | the check, unchanged | `sending` |
| The server accepted | `sheet: afterSheet({ type })` (id `action-after`): Done | `targets: null`. Nothing is drawn on the target (29.1) | `mountAfterRegister()` | `accepted` |
| Not accepted, or result unknown | the check stays; Register again if the server still offers it; "Check again" for unknown | unchanged | the check's `error` | `rejected`, `unknown` |
| Pass | `onHero('pass')`, then `sheet: passSheet({ next })` (id `pass`): Cancel and Pass, busy while sending | the scene's `control: null` | `mountPassNote()` | |

- **A person tapped in the room or on the board** goes to the check with that person, as a row of the list does (27.2, 29).
- **An action without a person** (Blackout, Suppress navigation, Clone; Hack Ship and Blackhole are not drawn, question L7) goes from its tile straight to the check. The check shows the action's icon, its verb ("Request Blackout") and "Only you see this".
- **Cancel** on the target bar or the check returns to the tiles. Done closes the sheet.

## Mount, update and dispose

Each part is mounted in the shell's `sheetBody` for its sheet, as the ballot and the Card are. A new sheet `id` is a new, empty body, so each step mounts its own part and disposes of the last.

```js
import { actionsSheet, mountActions } from '…/design/phone-ui/components/actions/actions.mjs';
import '…/design/phone-ui/components/actions/actions.css';

shell.update({ sheet: actionsSheet({ role: 'Doctor', room: 'Room A' }) });
const tiles = mountActions(shell.sheetBody, input, { onTile, onFocusReturn });
tiles.update(partialInput);  // only what changed; an unknown key is an error
tiles.dispose();
```

- Every part returns `{ element, update(partial), dispose() }`.
- **Kept in place:** each tile by its `type`, each row by its seat, each fact, step and captured person by its place. A focused control keeps its element and its focus through updates.
- **After `dispose()`:** the element is removed, nothing more is called, and `update()` does nothing.
- `checkActions(input)` checks a whole input and returns it normalized, so checking twice changes nothing. `nextActionsInput(current, partial)` merges as `update()` does.

## Inputs

### Every part

| Field | Audience | Default | What |
| --- | --- | --- | --- |
| `viewer` | This viewer | `null` | The viewer's seat (`'seat-4'`). A new viewer drops this viewer's inputs |
| `status` | Public | `'live'` | `'live'`, `'stale'` (reconnecting: shown as last seen, no taps) or `'concealed'` |
| `interactive` | This viewer | `true` | `false`: every control keeps its look and its focus, takes no tap, and says so (`aria-disabled`) |
| `versions` | Public | `null` | The crew bundle's versions, for the portraits |

### The tiles (`mountActions`, sheet 28)

| Field | Audience | What |
| --- | --- | --- |
| `turn` | Public | `'own'` or `'other'`: "Your turn" or "Not your turn" |
| `round` | Public | The round: "Round 3" |
| `tiles` | This viewer | In order: `[{ type, state, note, reason, badge }]` |
| `note` | This viewer | Text or `null`: the line under the tiles |

Each tile:

| Field | What |
| --- | --- |
| `type` | The command: `RESCUE`, `PROTECT`, `SUPPLY`, `REGISTER_SHOT`, `REQUEST_HACK`, `MOVE`, `SCAN`, `SUBMIT_CODE`, `ACTIVATE_SHIP_HACK`, `REQUEST_BLACKOUT`, `ENGINEER_SUPPRESS`, `ACTIVATE_CLONE` or `ACTIVATE_BLACKHOLE`. The component gives it its icon and short name (below). A type twice, or another type, is an error |
| `state` | `'available'` (offered: the tile is a button), `'selected'` (this action is being chosen or checked), `'sending'` (its command is with the server: a spinner in the icon), `'registered'` (accepted and waiting: the REGISTERED mark) or `'unavailable'` (greyed) |
| `note` | Text or `null`: the state line of an available, chosen, sending or registered tile ("2 injections", "Once a round", "Eli · end of round") |
| `reason` | Text or `null`: why an unavailable tile is unavailable, as the server gives it. Without one the tile says "Not available now" (T3). The pack's spent tile ("Private talk · Used") is an unavailable tile with the server's reason |
| `badge` | A whole number or `null`: the count on the icon's corner (Rescue's 2) |

The component works out none of these. It draws the state, note, reason and badge it is given.

**Each command's look and words** (`ACTION_LOOKS`, from the pack):

| Command | Icon | Tile | Title (target bar, After Register) | The check's verb | Register button | While sending |
| --- | --- | --- | --- | --- | --- | --- |
| `RESCUE` | `rescue` | Rescue | Rescue | Rescue *name* | Register Rescue | Registering… |
| `PROTECT` | `protect` | Protect | Grant Protection | Protect *name* | Register Protection | Registering… |
| `SUPPLY` | `supply` | Supply | Supply | Supply *names* (L4) | Register Supply | Registering… |
| `REGISTER_SHOT` | `shoot` | Shoot | Shoot | Shoot *name* | Register shot | Registering… |
| `REQUEST_HACK` | `talk` | Private talk | Private talk | Talk with *name* | Request private talk | Requesting… |
| `REQUEST_BLACKOUT` | `blackout` | Blackout | Blackout | Request Blackout | Request Blackout | Registering… |
| `ENGINEER_SUPPRESS` | `suppress` | Suppress | Suppress navigation | Suppress navigation | Suppress navigation | Registering… |
| `ACTIVATE_CLONE` | `clone` | Clone | Clone | Activate Clone | Activate Clone | Activating… |
| `MOVE` | `move` | Move | Move | (the room's positions) | | |
| `SCAN` | `scan` | Scan | Scan | (sheet 42) | | |
| `SUBMIT_CODE` | `code` | Final Code | Final Code | (sheet 42) | | |
| `ACTIVATE_SHIP_HACK` | `shipHack` | Hack Ship | Hack Ship | not drawn (L7) | | |
| `ACTIVATE_BLACKHOLE` | `blackhole` | Blackhole | Blackhole | not drawn (L7) | | |

**The pack's tiles for each role** (28), for Frontend's list: the role's own first, then Move, Private talk and Shoot.

| Role | Its own tiles |
| --- | --- |
| Doctor | Rescue |
| Hacker | Scan, Final Code, Hack Ship |
| Undercover | Protect |
| Blue Disabler, Red Disabler | Blackout |
| Supplier | Supply |
| Engineer | Suppress |
| Alien | Clone, Blackhole |
| Insider | none |

### The list (`mountTargetList`, sheet 29)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action: the sheet's sub, "Rescue · everyone you can reach" |
| `groups` | This viewer | `[{ room, people: [{ seat, name, character, health, you }] }]`: the people the offer reaches, by room as the public board has them, the viewer's room first |
| `picked` | This viewer | The seats chosen so far (Supply's first, L4) |

A row: the portrait, the name ("Dev (you)" for the viewer), "Player 4", and " · Injured" when not healthy, with a chevron.

### The check (`mountActionCheck`, sheets 27.2 and 29)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action |
| `targets` | This viewer | `[]`, one person or two (Supply, L4): `{ seat, name, character, room }`. One: "Rescue Eli" and "Player 5 · Hospital". None: the action's icon, its verb and "Only you see this" |
| `facts` | This viewer | Text lines: what it costs and when it resolves ("Uses 1 of 2 shared injections", "Resolved at the end of the round, after the attacks", "Does not revive an eliminated player") |
| `error` | This viewer | `null` or `{ text, detail }`: why it was not accepted, or that the result is unknown, as an inline note in paper and ink, never red |

### After Register (`mountAfterRegister`, sheets 29, 29.1 and 29.2)

| Field | Audience | What |
| --- | --- | --- |
| `type` | This viewer | The action: the sheet's title |
| `kind` | This viewer | `'registered'` (REGISTERED, an outline: waiting), `'accepted'` (ACCEPTED, an outline: a private talk set for after the turn), `'active'` (ACTIVE, amber: the Clone) or `'captured'` (CAPTURED, steel: the Engineer) |
| `title` | This viewer | The headline: "Rescue of Eli registered." |
| `detail` | This viewer | "This is not a result. Registered actions are resolved at the end of the round." |
| `people` | This viewer | `null`, or the Engineer's captured players: `[{ seat, name, character, sub }]` |
| `steps` | This viewer | The time line: `[{ state: 'done' \| 'next' \| 'later', title, sub }]`. Done is a filled amber check; next and later are a dashed hourglass |

The handoff's [After Register](../phone-ui-handoff.md#after-register) table gives each action's words, from Frontend's `en.ts` where it has them.

### Pass (`mountPassNote`, sheet 27.3)

| Field | Audience | What |
| --- | --- | --- |
| `note` | This viewer | Text or `null`: "Your move stays open on the other turns this round." |

### The frames and the shell's words

| Helper | Returns |
| --- | --- |
| `actionsSheet({ role, room })` | `{ id: 'actions', title: 'Actions', sub: 'Doctor · Room A', close: true }` |
| `targetListSheet({ type })` | `{ id: 'action-list', title: 'Choose from a list', sub: 'Rescue · everyone you can reach', back: true, close: false }` |
| `checkSheet({ type, phase, canRegister })` | `{ id: 'action-check', title: 'Check and register', close: false, actions: [Cancel, Register] }`. `phase`: `'ready'`, `'sending'` (Register busy, named "Registering…") or `'unknown'` ("Check again" in Register's place) |
| `afterSheet({ type })` | `{ id: 'action-after', title: 'Rescue', close: false, actions: [Done] }` |
| `passSheet({ next, busy })` | `{ id: 'pass', title: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', close: false, actions: [Cancel, Pass] }`. Without `next`, no sub (B5) |
| `targetBar({ type, where })` | `{ icon, title, sub }`: "Rescue · Choose a player" in the room; "Choose a player · every room" on the board; "Choose two players" for Supply |
| `targetChip({ kind, count })` | `{ id: 'other-rooms', label: 'Other rooms · 1', icon: 'board', tone: 'paper' }`, or `{ id: 'list', label: 'List', icon: 'players', tone: 'paper' }` |

`actionsSheet()`'s sub names the role: it is this viewer's, and the shell drops its sheet when concealed.

## Callbacks

| Callback | When |
| --- | --- |
| `onTile(type)` | An available tile. An unavailable, sending or registered tile takes no tap |
| `onPick(seat)` | A row of the list |
| `onFocusReturn({ intent, value })` | The focused tile or row ended (it left, or its sheet closed): the focus is on the part's root, for Frontend to move on |

The rest are the shell's and the scene's: `onSheetAction(id, sheetId)` for Cancel, Register, Check again, Done and Pass; `onSheetBack` for the list; `onCancelTarget()`; `onChip(id)`; the scene's `onSeat(seat)`.

## What each state draws

| State | Drawn |
| --- | --- |
| Your turn | "YOUR TURN · Round 3"; the tiles three to a row (28) |
| Not your turn | "NOT YOUR TURN"; the tiles the server still offers are open (Move; the Hacker's Final Code), the rest unavailable |
| Unavailable | The icon steel on slate, the name grey, the reason or "Not available now" |
| Sending | A spinner in place of the icon; the tile takes no tap |
| Registered | A paper outline, the icon ink on paper, the REGISTERED mark across the icon, the note under the name ("Eli · end of round") |
| The list | Group labels by room; rows with portraits |
| The check | The person at 64 px, or the action's icon; the facts with an amber "i" each |
| Registering | The check unchanged; the shell's Register busy |
| After Register | The stamp, the headline, the detail, the captured players, the time line |
| Stale | As last seen; nothing takes a tap, the focus stays |
| Concealed | Nothing: no tile, row, name, fact, stamp or step is left in the page |

**Motion:** the stamp snaps in over 120 ms when After Register opens; with Reduce motion it is there at once (the handoff's motion table). The sheet's slide is the shell's.

**Text size:** at Large (150 %, sheet 53) and on 320 × 568 (sheet 50) the tiles stay three to a row and their words wrap. Largest (200 %) is not drawn (L3).

## Privacy and audiences

- **Everything here is this viewer's own:** the role, the offers, the reasons, the targets, the check and what the server accepted. A shared display never mounts it, and a target never learns of an action (the Engineer's capture: "Only you are told").
- **Concealed:** every part empties itself, removing its tiles, rows, words, stamps and steps rather than hiding them, and drops this viewer's inputs. Shown again, they come back only when given again.
- **A new viewer** drops the same.
- **Nothing is an outcome.** No heal, hit, injury or protection is drawn on anyone until the server reports it (29.1). REGISTERED and ACCEPTED are outlines; only Clone's ACTIVE and the Engineer's CAPTURED are filled, because they happen when the server accepts them (CLONE-01, P14).

## Accessibility

- **Tiles are buttons, and unavailable ones keep the focus.** An unavailable, sending or registered tile has `aria-disabled` and says why: "Shoot, not available now", "Rescue, Eli · end of round, registered". A sending tile is `aria-busy`.
- **The badge** repeats the note's count, so it is hidden from screen readers when a note is given.
- **After Register's head** (the stamp and the headline) is a status, read when it opens.
- **The check's error** is an alert.
- **Targets stay 44 px** at every size (sheet 50).

## Frontend's connection (proposed)

| Input | From `PlanetScreenModel` |
| --- | --- |
| `turn` | `activeSeatId === ownSeatId` |
| `tiles` | Every action of the role (B2). The state: `available` when `privateArea.offers` has the type; `selected` while `action.type` is it and `action.step` is `targets`, `slots` or `confirm`; `sending` at `sending`; `registered` after `accepted`, for an action that waits for the round's end; otherwise `unavailable` |
| `tiles[].badge` | Rescue: `abilities.injectionsRemaining` |
| `tiles[].note` | Available: B3. Registered: who, and "end of round" |
| `tiles[].reason` | The server's reason (B1); until then `null` |
| The list's `groups` | The offer's `targetSeatIds`, with `identities` and the public board's `location` and `health` |
| The check's `targets` | `action.selected`, with the same |
| The check's `facts` | Frontend's copy, in the pack's words (B7); "1 of 2" from `abilities.injectionsRemaining` |
| The check's `error` | `en.ts`'s `rejected`, `notAccepted` and `unknown` lines |
| After Register | `acceptedTarget.*`, `acceptedDetail.*`, `compound.supplyAccepted`, and the handoff's drafts for Blackout, Clone and the Engineer; `abilities.clone`, `abilities.engineerCapture` |
| `passSheet`'s `next` | B5 |
| `mountPassNote`'s `note` | The pack's line while `self.movementSpent` is false (B6) |

## Questions

### For Backend and Integration (through the Lead, on #222)

The contract's offers (`PlanetOfferSchema`) list only what the viewer may do now: `{ type, targetSeatIds, slotIds, windowIds, promiseTargetSeatIds, declaredSides }`. Nothing says why an action is not offered.

- **B1. Why an action is unavailable (T3).** The pack's tiles say "On your turn", "From Round 4", "Used", "Needs the Code" and "Before turns, in office". T3 left open whether the projection carries them. Could the private view add one entry per role action it does not offer, such as `unavailable: [{ type, reason: 'NOT_YOUR_TURN' | 'FROM_ROUND' | 'SPENT' | 'NEEDS_CODE' | 'NEEDS_OFFICE' | …, round? }]`, which Frontend's copy turns into words? Until then, every such tile says "Not available now".
- **B2. Which actions a role has.** T3 shows every action of the role. Is that list a presentation table (the pack's, above), or should the private view carry it (`roleActions: [type]`)? Does every living role have Move, Private talk and Shoot?
- **B3. The state line of an offered tile.** "2 injections" is `abilities.injectionsRemaining`. "Once a round", "Once a match", "Your room", "One attempt" and "Round 3 only" describe the action, not why it is unavailable. May Frontend show them as copy, or should they come from the projection?
- **B4. What is registered.** After a reload the phone cannot show the REGISTERED tile ("Eli · end of round") or the After Register state: the view says an action is spent (`self.roleActionSpent`, `shotSpent`), not what was registered for whom. Could it carry this viewer's registered, unresolved actions, such as `registered: [{ type, targetSeatIds, round }]`? Until then, after a reload the tile is unavailable, and After Register uses Frontend's `acceptedAfterReload` words.
- **B5. Who is next, for Pass.** "The turn goes to Eli · Player 5" needs the next active seat. The public view has only `activeSeatId`, and the phone does not work out the turn order. Could it carry `nextActiveSeatId`? Until then, "Pass your turn?" has no sub.
- **B6. The move after a pass.** "Your move stays open on the other turns this round." is true only while the move is unspent. Is `self.movementSpent === false` enough to show it?
- **B7. The check's facts** are rule statements in the pack's words (each action's three lines are in the pack's `screens-game.mjs`). Frontend's copy has different lines (`planetConfirmation()`, `consequence`). The pack is the specification for words (11 November), so I propose Frontend adds the pack's lines to `en.ts`, reviewed against the rules, and passes them as `facts`.
- **B8. Where the Engineer's capture was.** "Player 3 · in Room B when accepted" and "the 3 players in Room B" need the capture's room. `abilities.engineerCapture` has `round` and `seatIds` only. Could it add `room`? Until then, the rows say "Player 3" and the detail names no room.

### For the Lead

- **L1. The pack's words in the agreement.** I propose the agreement draws the pack's frames with the reasons given as text, as the projection would give them (B1), so no word is amended. The T3 form ("Not available now", and no line under the tiles) is its own set of states, not drawn by the pack. Or amend the pack's words in the page, as for the ballot?
- **L2. The tile, the check's person and facts, and the time line.** The pack draws them in `screens.css`, not the kit. Promises (33), the Captain's Release and Eject (40), a private talk (25) and Scan (42) use the same person and facts, and the declaration (25) uses tiles. All are in my area. Should they go in the kit, or in a module of mine that those components import?
- **L3. Largest text (200 %).** Not drawn for Actions. I propose three to a row while each tile is at least 6.5 em wide, then two, and under 13 em of width one per row as a list row (icon, name, state line), as the kit's 3 × 3 does.
- **L4. Supply's two players.** Not drawn: the second pick, the list with one chosen, the check with two. I propose the target bar's sub turns from "Choose two players" to "Choose the second player" (Frontend's `compound.supplySecond`), the first stays ringed as picked, and the check shows two portraits with "Supply Ava and Gus" and "Players 1 and 7".
- **L5. Cancel while registering.** The pack draws it unchanged beside the busy Register. It cannot recall a sent command. I propose it stays as drawn and only closes the check; the outcome then arrives as the tile's state and the shell's toast. Or should it be unavailable while sending?
- **L6. Not accepted, result unknown, accepted after a reload.** Not drawn. I propose the check stays with the kit's inline error (paper and ink, the warning shape) and Frontend's words, Register again when the server still offers the action, and "Check again" for unknown. After a reload, After Register shows "The server accepted your action." with REGISTERED and no time line.
- **L7. Hack Ship and Blackhole.** Neither check nor After Register is drawn. I propose the target-less check (icon, "Hack Spaceship" or "Activate Blackhole", "Only you see this", Frontend's facts), and After Register when the projection says what follows.

## Checks planned

The same as the ballot's and the Card's:

- **The preview:** the pack's synthetic fixtures, in the shell over the room scene, at the game's 16 px root.
- **Captures** at 390 × 844 and 430 × 932 under the production headers, with the check tool's provenance.
- **The probe:** taps reach `onTile` and `onPick`; unavailable, sending and registered tiles refuse and keep the focus; concealment and a new viewer leave nothing private; update in place keeps the focus; `dispose()`; Reduce motion.
- **The agreement with the pinned pack:** 28 (four frames), 27.2 (the tiles, the check, registered, another player's turn), 27.3 (Pass), 29 (the list, the check, registering, registered), 29.1 (five), 29.2 (three), and the Actions frames of 50 and 53. The words, states and boxes are compared to within 0.5 px.
- **The unit test** in `packages/design-tokens/test/` and the repository's checks.
