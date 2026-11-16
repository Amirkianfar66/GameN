# Join and waiting: Designer's runtime components

**Version:** `join-form-0.1.0` and `join-wait-0.1.0`, with `entry-parts-0.3.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** a joining player's two screens before a match, as sheets 12 and 13 draw them. They are #222 items 23 (Join) and 24 (Waiting for the host), P3. The game imports them as they are, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**

| Sheet | State | Drawn |
| --- | --- | --- |
| 12 | Empty | "Menu" back and "Join"; "Join a room"; "Room code" over six boxes, the next one ringed amber while typing; "Your name" with "1–12 characters" and "0/12"; "This device": Player phone or Shared display; **Ask to join** at the foot, unavailable |
| 12 | No such room | The six boxes ringed in paper, and "No room has this code. Check it with the host." under them; Ask to join available |
| 12 | Name too long | "Devendra Kumar" with "14/12", the field ringed in paper, and "Use 1–12 characters." under it; Ask to join unavailable |
| 12 | Sending | Ask to join busy, with the spinner |
| 13 | Busy | The form, with "Too many requests right now. Try again in a moment." over the foot |
| 13 | Waiting for the host | "Cancel" back and "Join"; the hourglass tile; "Waiting for the host"; "Room K7Q2XM · as Dev"; **Check again**, a plain button |
| 13 | Admitted · lobby | "Leave" back and "Lobby"; the paper badge "4 · You're in · Seat 4"; "Room K7Q2XM · waiting for the host"; "Players · 5 of 9" over a row per seat, this phone's as "Dev (you)"; at the foot, the spinner and "Character selection starts when every seat is filled" |
| 13 | Room started without you | "Menu" back and "Join"; the lock tile; "This room started without you"; "Room K7Q2XM"; **Back to menu**, a secondary block button |

The sheets also draw "This room has already started." under the boxes, in the pack's code (`screens-entry.mjs`, `join`, state `started`).

**What changes from today:**
- **Today, the form:** a "Room code" text box, "Your name" with "0 / 12", a "Device" drop-down and "Request admission", under the menu's Join tab.
- **Today, waiting:** "Room K7Q2XM", "Requested player seat. Waiting for the server to confirm admission." and "Check admission"; then "Request closed." or "Request declined."; once admitted, "Waiting for admission or the next stage."
- **Drawn:** the two screens above, as sheets 12 and 13.

**Comparison parts:** `join` (sheet 12) and `join-wait` (sheet 13), in `design/tools/lib/phone-ui-native-parts.mjs`. They apply when Frontend's PR mounts these screens in the game; until then, the components' own captures are their evidence.

**Not in it:**
- **A shared display once admitted:** a phone admitted as the shared display shows the display's own screens, not the player lobby. The form and "Waiting for the host" are the same for both.
- **Character selection** (sheet 16), which the lobby leads to: its own component.
- **The rules:** whether a code can be sent, whether a name is valid, how its characters are counted, and why a request failed are Frontend's to give, from the contracts and the server. The screens never work them out.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/join-room/`:

| Path | What |
| --- | --- |
| `join-form.mjs` | `mountJoinForm()`, `nextJoinFormInput()`, `JOIN_FORM_DEFAULTS`, `JOIN_FORM_VERSION`, `JOIN_WORDS` |
| `join-wait.mjs` | `mountJoinWait()`, `nextJoinWaitInput()`, `JOIN_WAIT_DEFAULTS`, `JOIN_WAIT_VERSION`, `WAIT_WORDS` |
| `join-room.css` | Every style of both, under `.ms-join-form` and `.ms-join-wait`; starts with the kit's and the entry parts' stylesheets |
| `preview/` | Development only: the preview on the pack's fixtures (`ROOM_CODE`, the roster's names), `probe.mjs`, and `agree.mjs` (each screen beside the frozen pack's `ENTRY_SCREENS.join` and `ENTRY_SCREENS['join-wait']`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/join-room-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/join-room.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.0):**
  - `codeBoxes` for the six boxes; `field` for "Your name", with its count;
  - `seg` for "This device", with `stack: true`, so the two options stack at the Largest text (the Lead, #265);
  - `errorNote` for the three kinds of error; `wait` for the hourglass and the lock;
  - `list`, `row` and `num` for the seats; buttons: Ask to join (block primary, the join icon), Check again (plain), Back to menu (block secondary);
  - the spinner, and the control policy.
- **Entry parts** (0.2.0): `navBar`, `screen` and its foot, `largeTitle`.
- **Entry parts, to 0.3.0** (question 2): `seatBadge`, the paper badge with the seat number (`.seat-badge`), which only sheet 13 draws.
- **`ms-k-phone`** on both roots, with `ms-kit` and `ms-entry-parts`. No phone shell: neither screen has a bar, tabs or match status. Each fills its host with the pack's canvas, under the safe areas.

## Mount, update and dispose

```js
import { mountJoinForm } from '…/design/phone-ui/components/join-room/join-form.mjs';
import { mountJoinWait } from '…/design/phone-ui/components/join-room/join-wait.mjs';
import '…/design/phone-ui/components/join-room/join-room.css';

const form = mountJoinForm(host, input, handlers);
const wait = mountJoinWait(host, input, handlers);
screen.layout();               // { size, safe: { top, bottom } }
screen.update({ ...changes }); // each key given replaces that key; the rest stay
screen.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

- **The host:** the element the entry screen fills. Each screen appends one child, which fills it, edge to edge, and scrolls inside the safe areas.
- **On update,** every control keeps its element and the focus, and the two text boxes keep their caret.

## The form's typing

The form holds two real text boxes: the code and the name. Their typing is the form's, and their values are Frontend's.
- **The code:** one text box over the six boxes, labelled "Room code", with `autocapitalize="characters"`, `autocomplete="off"` and `maxlength="6"`. The boxes show Frontend's `code`, a character each, and are hidden from screen readers; the text box is what is read and typed. While it has the focus, the next empty box is ringed amber. A pasted code goes in whole.
- **The name:** the kit's field, with `autocomplete="nickname"`.
- **Each keystroke reports** `onCode(text)` or `onName(text)`, with what the box holds. Frontend gives back `code` and `name`. When they differ from what the box holds (Frontend upper-cases the code, or clears the form), the box takes Frontend's value, with the caret at its end.
- **Return** in either box is Ask to join, when it is available.

## Inputs

Nothing here is private to a seat: both screens are on the joining player's own phone. The names in the lobby are the names people gave to join.

**Both screens:** `interactive`, `reducedMotion` and `insets` (`null` for the browser's safe areas, or `{ top, bottom }` in px).

**The form:**

| Input | What |
| --- | --- |
| `code` | The code as Frontend keeps it, up to six characters |
| `codeError` | `null`, or words under the boxes, which are then ringed in paper: `JOIN_WORDS.noRoom` ("No room has this code. Check it with the host.") or `JOIN_WORDS.started` ("This room has already started.") |
| `name` | The name as Frontend keeps it |
| `nameCount`, `nameMax` | The characters as the contract counts them, and its most (12, `CREW_NAME_MAX_LENGTH`): "3/12", and "1–12 characters" while it is empty |
| `nameError` | `null`, or words under the field, which is then ringed in paper: `JOIN_WORDS.nameRule(12)` ("Use 1–12 characters.") |
| `device` | `'player'` or `'display'`: the chosen option |
| `ask` | `{ enabled, busy, reason }`: Ask to join. Busy reads "Sending…" to screen readers and shows the spinner, as sheet 12 draws it |
| `error` | `null`, or words over the foot: `JOIN_WORDS.busy` ("Too many requests right now. Try again in a moment."), or Frontend's for another failure (question 4) |

**Waiting:**

| Input | What |
| --- | --- |
| `view` | `'pending'`, `'admitted'` or `'closed'`, from the admission's status (question 3 for `'declined'`) |
| `roomCode` | The six characters |
| `name` | This phone's name: "as Dev" |
| `seat` | Admitted: this phone's seat, for the badge and "(you)" |
| `members` | Admitted: `[{ seat, name }]`, in seat order, a row each |
| `seats` | Admitted: `{ filled, total }`: "Players · 5 of 9" |
| `check` | `{ enabled, busy, reason }`: Check again |

**The screens decide nothing:** they never work out whether a code is complete, whether a name is valid, what a character is, or why a request failed. A refused control keeps its focus, with `aria-disabled` and Frontend's reason.

## Callbacks

| Callback | When |
| --- | --- |
| `onBack()` | The form's "Menu", and "Menu" or Back to menu after the room started. Frontend goes back to the menu |
| `onCode(text)`, `onName(text)` | Each keystroke, with what the box holds |
| `onDevice(kind)` | Player phone or Shared display is chosen |
| `onAsk()` | Ask to join, or Return in a box. Frontend sends today's `requestAdmission` with the code, the kind and the name |
| `onCancel()` | Waiting's "Cancel". Frontend decides what cancelling does |
| `onCheck()` | Check again. Frontend refreshes the session, as today's "Check admission" |
| `onLeave()` | The lobby's "Leave". Frontend decides what leaving does |
| `onLayout(layout)`, `onFocusReturn({ intent, value })` | As the other components' |

Each reports a tap or a keystroke, and only that.

## Drawn

| Part | Drawn (sheets 12 and 13) |
| --- | --- |
| The screen | The pack's `.screen`: 8 px under the top safe area, 16 px from the sides, 16 px over the bottom one; it scrolls, and the foot follows the content |
| Nav bar | The plain back link with the chevron ("Menu", "Cancel" or "Leave") and the centred title, "Join" or "Lobby" |
| The code | "Room code" over six 56 px boxes, 7 px apart, in the mono face; the next empty box ringed amber while the code has the focus; all six ringed in paper with a code error |
| The name | The kit's field: "Your name", the box, the count at its end; ringed in paper with a name error |
| This device | "This device" over the segmented control: the phone icon and "Player phone", the display icon and "Shared display"; the chosen option's icon filled (question 1) |
| Errors | The kit's inline error: under the boxes, under the name, or over the foot |
| Ask to join | Block primary with the join icon; unavailable, dimmed; busy, the spinner |
| Waiting | The kit's waiting block: the 76 px tile with the hourglass, "Waiting for the host", "Room K7Q2XM · as Dev", and Check again under it |
| The lobby | The badge (seat number in ink on paper, "You're in · Seat 4"), the line, "Players · 5 of 9", the rows with seat numbers, this phone's with "(you)"; the foot's spinner and words, centred |
| Started without you | The waiting block with the lock, "This room started without you", "Room K7Q2XM", and Back to menu at the foot |
| Larger text | Rows and controls grow with the text, the two device options stack at the Largest, and the screen scrolls |

**Motion:** only the spinners (Ask to join while busy, Check again while busy, the lobby's foot), the kit's; with Reduce motion they stand still. Nothing else moves.

## Frontend's connection

1. Mount the form when the menu's Join is tapped; the waiting screen once the request is sent; dispose each on leaving.
2. The form: keep the code and the name as today's `entryDraft`, give them back as `code` and `name`, with `nameCount` and `nameMax` from `CREW_NAME_MAX_LENGTH`. Give `nameError` from `CrewDisplayNameSchema`, `ask` from the draft and `model.busy`, and `codeError` or `error` from the server's answer, in the pack's words (`JOIN_WORDS`).
3. Waiting: map `pendingAdmission` (its `status`, `roomCode` and `kind`), the draft's name, and once admitted the session's `members`, `selfSeatId` and `playerCount`. Route `onCheck` to `session.refresh()`.
4. Today's Join tab form (its text boxes, the Device drop-down and "Request admission") and the waiting text ("Requested player seat…", "Check admission", "Request closed.") leave the joining phone's screen.

## Questions for the Lead

1. **The chosen device's icon:** sheet 12 fills the chosen option's icon (the phone, filled) and leaves the other plain (the display). The kit's `seg` draws every option's icon plain. Could the kit's `seg` fill the chosen option's icon? It is the kit's part, so it is yours to change; until then the form would draw both plain.
2. **The seat badge:** "You're in · Seat 4" is the pack's `.seat-badge`, which only sheet 13 draws. I propose it goes in my `entry-parts` (0.3.0), as decision 1 of #278 and question 1 of #287 placed the other entry parts.
3. **A declined request:** the contract's admission statuses are `pending`, `admitted`, `declined` and `closed`. The sheets draw `closed` ("This room started without you"), not `declined`. I propose the same lock layout, with the host's choice said plainly: "The host didn't admit you", "Room K7Q2XM", and Back to menu. These are new words, so they need your agreement, and the owner's if you think so.
4. **Connection lost:** neither sheet draws it. I propose the form's `error` slot, over the foot, with Frontend's words ("No connection. Ask to join returns when you are back online."), and on waiting the kit's inline error under the line ("No connection. Check again returns when you are back online."). Frontend refuses Ask to join and Check again with the same reason; as in the host lobby, the words alone refuse nothing.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the entry parts' badge, the two modules and their styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
