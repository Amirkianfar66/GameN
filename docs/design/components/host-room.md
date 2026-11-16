# Host setup and lobby: Designer's runtime components

**Version:** `host-setup-0.1.0` and `host-lobby-0.1.0`, with `entry-parts-0.2.0`. **Status (16 November 2026):** the interface is approved by the Lead Designer (#287 at `43e71d29`), with the decisions below, and posted on #4 for Frontend. It is built on the kit 0.4.0, with its preview, probe, agreement with the pack, check and test, as the owner's 16 November decision has each part built without waiting for Frontend (`docs/design/owner-decisions.md`, #280). It is not in the game yet: Integration first admits its files with the kit's graph. It is not a release.

**What it is:** the host's two screens before a match, as sheet 11 draws them. They are #222 items 21 (host setup) and 22 (host lobby), P3. The game imports them as they are, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 11):

| State | Drawn |
| --- | --- |
| Setup | "Menu" back and "Host"; "New room"; Players: 7, 8, 9, with the team mix under them ("5 Blue · 3 Red · 1 Alien"); "After the room opens": "Players ask to join · You admit each one" and "Bots fill empty seats · Set them in the lobby"; **Open room** at the foot ("Opening…" while it opens) |
| Lobby | "Leave" back and "Lobby"; the room code card: "Room code", the code, **Copy**, "5 of 9 seats" with its bar; the seats, one row each (the host's "Host", a bot's "Bot" with the bot tile); Bots with − and + ("Up to 4"); **Start character selection** at the foot, with "4 more seats to fill" under it while it is unavailable |
| Lobby · requests | The same, with "Asking to join · 2" above the seats: a row each, the phone or display tile, the name, "Player phone" or "Shared display", and **Admit** |
| Copied | Copy turns to "✓ Copied", and the "✓ Copied" toast shows 10 px under the nav bar |
| Full | Every seat filled (people and bots), Start available; + refused at the most bots |
| Around the sheet | Setup with 7; Opening…; a failed opening (decision 2); the lobby offline (decision 4); setup and the lobby with the Largest text |

**What changes from today:**
- Today host setup is a "Players" drop-down and "Host a game" under the menu's tabs.
- Today the lobby is the room code with "Copy room code", then "Admit Gus (player)" buttons, a Bots drop-down with "Set bots", "Start", and the seats folded into "5 of 9 seats filled".
- Drawn: the two screens above, as sheet 11.

**Comparison parts:** none of their own today (`--list` has the menu and the join screens' parts). These components' captures are their evidence, as for the boarding's holding screens.

**Not in it:**
- **What the host does in a match** (sheet 15, #222 item 28): its own later component.
- **The character selection** (sheet 16) that Start opens: its own component.
- **The rules:** the team mix for each count, how many bots fit, whether Start is available and why not are Frontend's to give, from the server and the ruleset. The screens never work them out.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/host-room/`:

| Path | What |
| --- | --- |
| `host-setup.mjs` | `mountHostSetup()`, `nextHostSetupInput()`, `HOST_SETUP_DEFAULTS`, `HOST_SETUP_VERSION`, `SETUP_WORDS` |
| `host-lobby.mjs` | `mountHostLobby()`, `nextHostLobbyInput()`, `HOST_LOBBY_DEFAULTS`, `HOST_LOBBY_VERSION`, `LOBBY_WORDS` |
| `host-room.css` | Every style of both, under `.ms-host-setup` and `.ms-host-lobby`; starts with the kit's and the entry parts' stylesheets |
| `../entry-parts/entry-parts.mjs`, `entry-parts.css` | `entry-parts-0.2.0`: the entry choice (0.1.0, unchanged), and now the entry screens' frame (decision 1): `navBar`/`setNavBar`, `screen`, `foot`, `largeTitle`, `codeCard`/`setCodeCard` with `CODE_WORDS`, and `createToast(host)` with `ENTRY_TOAST_MS` |
| `preview/` | Development only: eleven states on the pack's fixtures (`ROOM_CODE`, the roster's names; the mix per count, the bot range and Start's reason standing in for Frontend's), `probe.mjs`, and `agree.mjs` (each screen beside the frozen pack's `ENTRY_SCREENS['host-setup']` and `ENTRY_SCREENS['host-lobby']`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/host-room-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/host-room.test.mjs`.

**Uses unchanged:**
- **The kit:** the segmented control (7, 8, 9), group labels and notes, lists and rows (with their icon tiles and seat numbers), the stepper, buttons (Open room and Start: block primary; Copy: small tinted; Admit: small primary), the inline error, the control policy.
- **Entry parts, extended to 0.2.0** (decision 1): the entry screens' own frame, which only sheets 11–16 draw.
  - `navBar`: the back link and the centred title (the pack's `.nav-bar`).
  - `screen`: the scrolling screen inside the safe areas, with its foot (`.screen`, `.screen-foot`).
  - `largeTitle` (`.large-title`).
  - `codeCard`: the room code card (`.code-card`), which the join screen's lobby (sheet 13) shows too.
  - `createToast`: the entry screens' toast (`.toast`), for "Copied" (decision 3). It stands alone, so the Lead can fold it and the shell's into one kit part.
- **No phone shell:** neither screen has a bar, tabs or match status. Each fills its host with the pack's canvas, under the safe areas.

## Mount, update and dispose

```js
import { mountHostSetup } from '…/design/phone-ui/components/host-room/host-setup.mjs';
import { mountHostLobby } from '…/design/phone-ui/components/host-room/host-lobby.mjs';
import '…/design/phone-ui/components/host-room/host-room.css';

const setup = mountHostSetup(host, input, handlers);
const lobby = mountHostLobby(host, input, handlers);
screen.layout();               // { size, safe: { top, bottom } }
screen.update({ ...changes }); // each key given replaces that key; the rest stay
screen.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

- **The host:** the element the entry screen fills. Each screen appends one child, which fills it, edge to edge, and scrolls inside the safe areas.
- **On update,** every row and control keeps its element and the focus. A request or seat row is keyed by its `id` or seat: one that leaves takes the focus to the screen, and `onFocusReturn` says which.

## Inputs

Nothing here is private to a seat: both screens are on the host's own phone, before any role exists. The names in the lobby are the names people gave to join.

**Both screens:** `interactive`, `reducedMotion` and `insets` (`null` for the browser's safe areas, or `{ top, bottom }` in px).

**Host setup:**

| Input | What |
| --- | --- |
| `counts` | The choices, from the ruleset: `[{ value: 7, mix: '4 Blue · 2 Red · 1 Alien' }, …]`. The mix under the control is the chosen count's |
| `count` | The chosen count, or `null` |
| `open` | `{ enabled, busy, reason }`: Open room. Busy reads "Opening…" |
| `error` | `null`, or the words of a failed opening (decision 2) |

**Host lobby:**

| Input | What |
| --- | --- |
| `roomCode` | The six characters |
| `copied` | `true` for the moment after a copy: Copy reads "✓ Copied". Frontend clears it |
| `toast` | `null`, or `{ id, text, icon }`: "Copied" with the check after a copy, or Frontend's "Select the room code to copy." with `info` when the clipboard is refused. Each `id` shows once, for 2.4 s, then fades; a new `id` replaces it |
| `seats` | `{ filled, total }`: "5 of 9 seats" and its bar |
| `members` | `[{ seat, name, kind: 'host' \| 'person' \| 'bot' }]`, in seat order: one row each |
| `requests` | `[{ id, name, device: 'phone' \| 'display', admit: { enabled, busy, reason } }]`: "Asking to join · n", shown only when there are some |
| `bots` | `{ count, max, enabled, busy, reason }`: the stepper, "Up to {max}" |
| `start` | `{ enabled, busy, reason }`: Start character selection. When it is unavailable, the reason is the line under it ("4 more seats to fill", Frontend's) |
| `notice` | `null`, or `'offline'`: the note under the code card, and only that (decision 4) |

**The screens decide nothing:** they never work out the team mix, how many bots fit, whether a seat is free, or why Start is unavailable. A refused control keeps its focus, with `aria-disabled` and Frontend's reason.

**The notice refuses nothing.** `notice: 'offline'` draws the note. Which controls are refused stays Frontend's: offline, it gives `admit`, `bots`, `start` (and setup's `open`) as `{ enabled: false, reason }`. A notice with every control enabled refuses nothing; the test and the probe check it. Leave and Copy have no availability input, so they stay usable.

## Callbacks

| Callback | When |
| --- | --- |
| `onBack()` | Setup's "Menu". Frontend goes back to the menu |
| `onCount(value)` | A count is chosen. Frontend gives it back as `count` |
| `onOpen(value)` | Open room, with the chosen count. Frontend sends today's `create` |
| `onLeave()` | The lobby's "Leave". Frontend decides what leaving does |
| `onCopy()` | Copy. Frontend writes the code to the clipboard and gives `copied` and the "Copied" toast; when the clipboard is refused, the "Select the room code to copy." toast (decision 3). The code is selectable text |
| `onAdmit(id)` | Admit, for one request. Frontend sends today's `approveAdmission` |
| `onBots(count)` | − or +, with the count asked for. Frontend sends today's `setBots` |
| `onStart()` | Start character selection. Frontend sends today's `beginSetup` |
| `onLayout(layout)`, `onFocusReturn({ intent, value })` | As the other components' |

Each reports a tap, and only that.

## Drawn

| Part | Drawn (sheet 11) |
| --- | --- |
| The screen | The pack's `.screen`: 8 px under the top safe area, 16 px from the sides, 16 px over the bottom one; it scrolls, and the foot follows the content |
| Nav bar | The plain back link with the chevron ("Menu" or "Leave") and the centred title, 44 px |
| Setup | "New room" (the large title); "Players" over the 7, 8, 9 control and the mix as its note; "After the room opens" over the two rows (the paper join tile, the steel bot tile); Open room at the foot with the host icon |
| Code card | "Room code", the code in the mono face, Copy (small, tinted, the copy icon; "✓ Copied" after), "n of N seats" and the amber bar |
| Requests | "Asking to join · n": each row the phone tile (paper) or display tile (slate), the name, the device, and Admit (small primary) |
| Seats | "Seats": each row the seat number, the name, "Host" or "Bot" under it, and a bot's steel bot tile at the right |
| Bots | "Bots": the steel bot tile, "Bots", "Up to n", and the stepper; − refused at 0, + at Frontend's most (dimmed, as the kit's stepper is; see the difference below) |
| Start | Block primary with the Pass icon; unavailable, dimmed with the reason centred under it |
| Toast | The pack's `.toast`: paper and ink, the icon and the words, 10 px under the nav bar (decision 3), over the code card |
| Offline | The kit's inline error under the code card, with the offline icon: "No connection. Admit, Bots and Start return when you are back online." |
| A failed opening | The kit's inline error over the foot, with Frontend's words (decision 2) |
| Larger text | Rows and controls grow with the text; the screen scrolls and its foot is reached; the toast follows the nav bar. From the Large text, Copy goes under the code, inside the card (below) |

**Motion:** only the toast moves, with the shell's timing: in from 8 px above over 220 ms, then after 2.4 s a 180 ms fade. With Reduce motion (`reducedMotion`, or the device's), an 80 ms fade in, without the travel. Nothing else moves.

## Frontend's connection

1. Mount host setup when the menu's Host is tapped, and the lobby when the room is open and this phone is its host; dispose each on leaving.
2. Host setup: give `counts` from the ruleset (the mix per count), `count`, and `open` from today's `model.busy`. Route `onOpen` to `create` with the count.
3. Lobby: map `roomCode`, `members`, `pendingAdmissions` (as `requests`), `playerCount` (as `seats.total`), the bot range and Start's availability, with its reason. Route the callbacks to today's operations.
4. Today's lobby view (the "Copy room code" button, the Admit buttons, the Bots drop-down, "Set bots", "Start" and the folded roster) leaves the host's screen.

## Decisions (the Lead's review of #287)

1. **The entry screens' frame is mine:** the nav bar, the screen and its foot, the large title, the code card and the toast are in `entry-parts` 0.2.0, not the kit, as #278's decision 1 placed the entry choice. The toast matches the pack's `.toast` exactly (an agreement case compares it), keeps the shell's timing (`TOAST_MS` 2400, Reduce motion without travel, once per id), and stands alone so the Lead can fold it and the shell's into one kit part.
2. **A failed opening** is the kit's inline error over the foot, with Frontend's words.
3. **The toast** sits 10 px under the nav bar. A refused clipboard leaves the code selectable, and the toast shows Frontend's words, "Select the room code to copy.".
4. **Offline:** `notice: 'offline'` only draws the note under the code card. Frontend refuses the controls; the component never infers a refusal from the notice, as in the menu. Leave and Copy have no availability input, so they stay usable.

**Changed in the build, from the interface:** a `toast` input (`{ id, text, icon }`) carries the toast, so it shows once per id and can carry the refused clipboard's words; `copied` now only turns Copy to "✓ Copied". The interface's "with Reduce motion, the toast appears and leaves at once" is now the shell's: a plain fade, without the travel (decision 1).

## The difference from the pack

At the most bots, + is refused (`aria-disabled`, and dimmed as the kit's stepper is). Sheet 11's Full state leaves it as it is. The approved interface refuses it, as − is refused at 0 in both. The agreement records it in the Full case and compares everything else.

## With the larger text: Copy stays in the card (for the Lead's review)

The pack's code row keeps the code and Copy side by side at any text size. The code is 2.5 rem of a mono face, so with the larger text it pushes Copy past the card, and off the screen:

| Size | Large (150 %) | Largest (200 %) |
| --- | --- | --- |
| 390 × 844 | Copy ends at 411 px; the card's content at 358 | Copy at 388–517 px: off the screen, and the code itself past the card |
| 430 × 932 | Copy ends at 411 px; the card's content at 398 (into its padding) | Copy at 388–517 px: mostly off the screen |

In the entry parts' code card, the row wraps, so Copy goes under the code, and the code is never wider than about 91 % of the row (`min(2.5rem, 21cqi)`: six characters at 0.72 em). At the Standard text both rules give the pack's boxes, which the agreement's Standard cases confirm against the pack as it is. The join screen's lobby (sheet 13) shares the card, so it gets the same.

It is a change from what the pack draws at the larger text, not from a sheet (the sheets are at the Standard text). I made it because a control off the screen fails the approved "rows and controls grow with the text". It is in its own commit, for the Lead's agreement; if the owner's approval is needed as for a sheet, it waits for that.

## Checks

`node design/tools/host-room-check.mjs` bundles the preview with Vite, serves it with the production headers (SHA-256 `424e5dec…`, `lib/component-check.mjs`), and in desktop Chromium at 2× pixels:

- captures the eleven states at 390 × 844 and 430 × 932: 22 captures, each with no policy violation, failed request or page error, on the pack's canvas, drawing what its state asks;
- runs the probe as the page comes and with the device's Reduce motion: setup, the lobby, the stepper, keyed rows and focus, offline (a notice with every control enabled refuses nothing), the toast, not interactive, insets, the Largest text, input, dispose, motion;
- runs the agreement: twelve cases, each screen beside the frozen pack's, the same words, states (`aria-disabled`, `aria-busy`, `aria-checked`, names), look and boxes to within half a pixel, the toast's included. For the three lobby cases with the larger text, the pack is drawn with the code card's two rules, so everything else is compared, and each case records the improvement against the pack as it is.

`packages/design-tokens/test/host-room.test.mjs` checks the runtime-safe graph (the kit, the entry parts, no shell, no menu), that the styles are the two screen roots only, the pack's words, both inputs (a notice changes no control), and the check's record. The entry parts' styles are checked in `main-menu.test.mjs`: scoped in `:where()`, the hand cursor with the tap highlight off, no dimming of a refused choice, and only the toast's motion.

### Checks run on this version

On `7da9945f`, clean (the kit 0.4.0; `entry-parts-0.2.0`; the check on the shared `component-check.mjs`, headers SHA-256 `424e5dec…`):
- **Captures:** **22 of 22 pass.** Each asserts the pack's words, the chosen count and its mix, the canvas, and its state: Open room refused or busy ("Opening…"), the failed opening over the foot, "4 more seats to fill" under Start, the two requests and their Admits, "✓ Copied" with the toast at 109 px (10 px under the nav bar, at both sizes), Full with + refused and Start open, offline with the note and Frontend's refusals, and the Largest text (the lobby scrolls; setup fits).
- **The lifecycle probe:** 14 of 14 (13 as the page comes, 1 with the device's Reduce motion).
- **The agreement with the frozen pack:** **9 of 9 cases** agree to within half a pixel in every part compared, in their look and their states, the toast's included. The one difference, + refused at the most bots, is recorded in the Full case only.
- **The main menu**, whose entry parts these share, passes again on the same commit with byte-identical captures ([main-menu.md](main-menu.md)).
- **Not run:** physical phones, Safari, screen readers and the real app's connection.

## Not in this version

- The connection to the game (Frontend's): the four steps above.
- The host's controls in a match (sheet 15) and the character selection (sheet 16): their own components.
- A phone, Safari or a performance measure: the check is desktop Chromium at each phone's CSS size.
