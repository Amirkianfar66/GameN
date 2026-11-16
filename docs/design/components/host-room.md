# Host setup and lobby: Designer's runtime components

**Version:** `host-setup-0.1.0` and `host-lobby-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built: the build starts when the Lead approves it and posts it on #4, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the host's two screens before a match, as sheet 11 draws them. They are #222 items 21 (host setup) and 22 (host lobby), P3. The game imports them as they are, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 11):

| State | Drawn |
| --- | --- |
| Setup | "Menu" back and "Host"; "New room"; Players: 7, 8, 9, with the team mix under them ("5 Blue · 3 Red · 1 Alien"); "After the room opens": "Players ask to join · You admit each one" and "Bots fill empty seats · Set them in the lobby"; **Open room** at the foot ("Opening…" while it opens) |
| Lobby | "Leave" back and "Lobby"; the room code card: "Room code", the code, **Copy**, "5 of 9 seats" with its bar; the seats, one row each (the host's "Host", a bot's "Bot" with the bot tile); Bots with − and + ("Up to 4"); **Start character selection** at the foot, with "4 more seats to fill" under it while it is unavailable |
| Lobby · requests | The same, with "Asking to join · 2" above the seats: a row each, the phone or display tile, the name, "Player phone" or "Shared display", and **Admit** |
| Copied | Copy turns to "✓ Copied", and the "✓ Copied" toast shows at the top |
| Full | Every seat filled (people and bots), Start available |

**What changes from today:**
- Today host setup is a "Players" drop-down and "Host a game" under the menu's tabs.
- Today the lobby is the room code with "Copy room code", then "Admit Gus (player)" buttons, a Bots drop-down with "Set bots", "Start", and the seats folded into "5 of 9 seats filled".
- Drawn: the two screens above, as sheet 11.

**Comparison parts:** none of their own today (`--list` has the menu and the join screens' parts). These components' captures are their evidence, as for the boarding's holding screens.

**Not in it:**
- **What the host does in a match** (sheet 15, #222 item 28): its own later component.
- **The character selection** (sheet 16) that Start opens: its own component.
- **The rules:** the team mix for each count, how many bots fit, whether Start is available and why not are Frontend's to give, from the server and the ruleset. The screens never work them out.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/host-room/`:

| Path | What |
| --- | --- |
| `host-setup.mjs` | `mountHostSetup()`, `nextHostSetupInput()`, `HOST_SETUP_DEFAULTS`, `HOST_SETUP_VERSION`, `SETUP_WORDS` |
| `host-lobby.mjs` | `mountHostLobby()`, `nextHostLobbyInput()`, `HOST_LOBBY_DEFAULTS`, `HOST_LOBBY_VERSION`, `LOBBY_WORDS` |
| `host-room.css` | Every style of both, under `.ms-host-setup` and `.ms-host-lobby`; starts with the kit's and the entry parts' stylesheets |
| `preview/` | Development only: the preview on the pack's fixtures (`ROOM_CODE`, the roster's names), `probe.mjs`, and `agree.mjs` (each screen beside the frozen pack's `ENTRY_SCREENS['host-setup']` and `ENTRY_SCREENS['host-lobby']`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/host-room-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/host-room.test.mjs`.

**Uses unchanged:**
- **The kit:** the segmented control (7, 8, 9), group labels and notes, lists and rows (with their icon tiles and seat numbers), the stepper, buttons (Open room and Start: block primary; Copy: small tinted; Admit: small primary), the inline error, the control policy.
- **Entry parts, extended to 0.2.0** (question 1): the entry screens' own frame, which only sheets 11–16 draw.
  - `navBar`: the back link and the centred title (the pack's `.nav-bar`).
  - `screen`: the scrolling screen inside the safe areas, with its foot (`.screen`, `.screen-foot`).
  - `largeTitle` (`.large-title`).
  - `codeCard`: the room code card (`.code-card`), which the join screen's lobby (sheet 13) shows too.
  - `toast`: the entry screens' toast (`.toast`), for "Copied" (question 3).
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
| `error` | `null`, or the words of a failed opening (question 2) |

**Host lobby:**

| Input | What |
| --- | --- |
| `roomCode` | The six characters |
| `copied` | `true` for the moment after a copy: Copy reads "✓ Copied", and the toast shows. Frontend clears it |
| `seats` | `{ filled, total }`: "5 of 9 seats" and its bar |
| `members` | `[{ seat, name, kind: 'host' \| 'person' \| 'bot' }]`, in seat order: one row each |
| `requests` | `[{ id, name, device: 'phone' \| 'display', admit: { enabled, busy, reason } }]`: "Asking to join · n", shown only when there are some |
| `bots` | `{ count, max, enabled, busy, reason }`: the stepper, "Up to {max}" |
| `start` | `{ enabled, busy, reason }`: Start character selection. When it is unavailable, the reason is the line under it ("4 more seats to fill", Frontend's) |
| `notice` | `null`, or `'offline'` (question 4) |

**The screens decide nothing:** they never work out the team mix, how many bots fit, whether a seat is free, or why Start is unavailable. A refused control keeps its focus, with `aria-disabled` and Frontend's reason.

## Callbacks

| Callback | When |
| --- | --- |
| `onBack()` | Setup's "Menu". Frontend goes back to the menu |
| `onCount(value)` | A count is chosen. Frontend gives it back as `count` |
| `onOpen(value)` | Open room, with the chosen count. Frontend sends today's `create` |
| `onLeave()` | The lobby's "Leave". Frontend decides what leaving does |
| `onCopy()` | Copy. Frontend writes the code to the clipboard and gives `copied` (question 3 for a refused clipboard) |
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
| Bots | "Bots": the steel bot tile, "Bots", "Up to n", and the stepper; − refused at 0, + at the most |
| Start | Block primary with the Pass icon; unavailable, dimmed with the reason centred under it |
| Copied toast | Paper and ink, the check, "Copied", at the top, for the moment `copied` is true |
| Larger text | Rows and controls grow with the text; the screen scrolls |

**Motion:** the toast's arrival and leaving, as the pack's; none else. With Reduce motion, the toast appears and leaves at once.

## Frontend's connection

1. Mount host setup when the menu's Host is tapped, and the lobby when the room is open and this phone is its host; dispose each on leaving.
2. Host setup: give `counts` from the ruleset (the mix per count), `count`, and `open` from today's `model.busy`. Route `onOpen` to `create` with the count.
3. Lobby: map `roomCode`, `members`, `pendingAdmissions` (as `requests`), `playerCount` (as `seats.total`), the bot range and Start's availability, with its reason. Route the callbacks to today's operations.
4. Today's lobby view (the "Copy room code" button, the Admit buttons, the Bots drop-down, "Set bots", "Start" and the folded roster) leaves the host's screen.

## Questions for the Lead

1. **The entry screens' frame:** the nav bar, the screen and its foot, the large title, the code card and the toast. Only sheets 11–16 draw them, all in my area. I propose adding them to my `entry-parts` module (0.2.0), not to the kit, as decision 1 of #278 placed the entry choice.
2. **A failed opening:** sheet 11 draws none. I propose the kit's inline error over the foot, as sheet 12 draws Join's errors, with Frontend's words.
3. **Copy and the toast:**
   - The pack's "Copied" toast sits under where a bar would be (`--top` + 10 px). The lobby has no bar, so I'd place it 10 px under the nav bar, over the code card, as the sheet shows it.
   - When the clipboard is refused, today's game selects the code and says "Select the room code to copy." I propose the same: the code is selectable text, and Frontend gives those words as the toast.
4. **Connection lost in the lobby:** sheet 11 draws none, and the entry screens have no shell banner. I propose `notice: 'offline'` as the kit's inline error under the code card ("No connection. Admit, Bots and Start return when you are back online."), with every control but Leave and Copy refused. Or should the lobby use another sheet's way?

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the entry parts' additions, the two modules and their styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
