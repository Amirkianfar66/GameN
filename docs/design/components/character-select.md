# Character selection: Designer's runtime component

**Version:** `character-select-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #292, with the Lead's four decisions below; accepted by the Lead, with the foot's words once time is up (below) and the phone shell 0.2.2. Built without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). It does not activate a native interface: that is Frontend's PR, under the phone merge gate.

**What it is:** the 30-second screen where each player chooses one of the nine characters, as sheet 16 draws it: one screen, the nine in a 3 × 3 grid, the timer in the header, no introduction. It is #222 item 26, P3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 16):

| State | Drawn |
| --- | --- |
| Open | The shell's phase bar: the players icon, "Choose a character", "Assigned for you if time runs out", and the clock (0:21). The grid: each character's portrait and name; a character another player holds is dimmed with "Taken · 2". The foot: the empty tile with the players icon, "No character yet", "Tap one to choose" |
| Selected · saving | The chosen one ringed amber with "Saving…"; the foot: its portrait, its name, the spinner and "Saving your choice" |
| Confirmed · taken | The chosen one ringed with the check and "Yours"; the foot: "Tap another to change" and the amber "✓ Yours" pill |
| Last seconds | The same, the clock amber from 0:05 |
| Assigned automatically | "Time is up" in the bar at 0:00; every other character dimmed; the one assigned ringed with the check and "Assigned"; the foot: "Assigned automatically"; the toast "Assigned: Juno" |

**What changes from today:**
- **Today:** a grid of nine buttons with each character's name and "Player 2", "Yours", "Saving…" or "Available", and the line "An available character is assigned when time ends." There is no timer in the header.
- **Drawn:** the screen above, with the timer in the header (#222 item 26).

**Comparison part:** `characters` (sheet 16), in `design/tools/lib/phone-ui-native-parts.mjs`. It applies when Frontend's PR mounts this screen; until then, the component's own captures are its evidence.

**Not in it:**
- **The rules:** who may take which character, when the 30 seconds end, and who is assigned what are the server's. The screen never works them out: Frontend gives each character's holder and this phone's choice.
- **The role stage** that follows (sheets 17–18, #268): its own component.

## The Lead's decisions (#292)

1. **Names:** Frontend gives the nine as `[{ id, name }]` from the game's own character data, as the ballot and the lobby are given names. The component takes only the pictures from the crew runtime, by id (through the kit's portraits). A name it isn't given is refused, never looked up.
2. **Time is up:** `closed: true` comes from the server's word only, never from the clock reaching 0:00. It dims every character but this phone's and refuses every cell. The timer only shows what it's given.
3. **Changing your mind:** a tap on another free character reports `onChoose(id)` while `choose` allows it. A tap on your own reports nothing. A taken or closed cell is refused with its reason.
4. **The foot:** the component's own styles, as only sheet 16 draws it.

And the viewer rule: a new viewer drops this phone's choice, its saving state and the toast (and the offer). The test and the probe check it.

**On the build (the Lead's review):**
- **Time is up after a choice:** the foot must not invite a tap the screen refuses. Once `closed` is true, "Tap another to change" and "Tap one to choose" read "Time is up", sheet 16's own words for the closed state. The character, its portrait and "✓ Yours" stay. "Assigned automatically" (as sheet 16 draws it at 0:00) and "Saving your choice" keep their words, as neither invites a tap.
- **The list at the Largest text:** accepted, and kept recorded as the one difference (below).
- **The bar's glyph:** the phone shell 0.2.2 draws its icon at the pack's 24 px (it was 22 px), merged here; the agreement compares it box for box.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/character-select/`:

| Path | What |
| --- | --- |
| `character-select.mjs` | `mountCharacterSelect()`, `nextCharacterSelectInput()`, `characterCell()`, `chooseFoot()`, `CHARACTER_SELECT_DEFAULTS`, `CHARACTER_SELECT_VERSION`, `CHOOSE_WORDS`, `CHOOSE_URGENT_MS`, `CHARACTER_COUNT` |
| `character-select.css` | Every style, under `.ms-char-select`; starts with the phone shell's stylesheet, which starts with the kit's. Its own: the screen's padding, the grid's portraits (to 100 px) and names (capitals, the letter face, no seat number), and the foot |
| `preview/` | Development only: the preview on the pack's fixtures (the nine in the pack's order, its holders, Player 4's choice), `probe.mjs`, and `agree.mjs` (the screen beside the frozen pack's `ENTRY_SCREENS.choose`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/character-select-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/character-select.test.mjs`.

**Uses unchanged:**
- **The phone shell (0.2.2),** mounted inside the component as the role stage mounts it: the phase bar (`bar: { kind: 'phase', icon: 'players', title, sub, timer: { remainingMs, urgentAtMs: 5000 } }`), no tab bar, the phone's canvas behind it (`backdrop: 'canvas'`), its reconnecting banner and its toast.
- **The kit (0.5.1):** `grid9` and `cell` for the nine (available, selected, confirmed, taken; the check mark; the note), `portrait` for the foot, `pill` for "Yours", the spinner and the control policy.

## Mount, update and dispose

```js
import { mountCharacterSelect } from '…/design/phone-ui/components/character-select/character-select.mjs';
import '…/design/phone-ui/components/character-select/character-select.css';

const choose = mountCharacterSelect(host, input, handlers);
choose.layout();               // { size, bars, safe }, the shell's
choose.update({ ...changes }); // each key given replaces that key; the rest stay; the clock is given each tick
choose.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

- **On update,** each character's cell keeps its element and the focus, by its id, through clock ticks, changes of holder, this phone's own choice and a new order. A focused cell that ends moves the focus to the screen, and `onFocusReturn({ intent: 'choose', value })` says which, once.
- `host` is filled by the screen: position it and give it the phone's size.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `status`, `interactive`, `reducedMotion`, `insets`, `viewer`, `versions` | Phone | As the shell's and the role stage's (`live`, `stale` or `concealed`); `versions` for the portraits |
| `characters` | Public | The nine, in the grid's order: `[{ id, name }]`, from Frontend's crew data (decision 1). Nine, or none yet; a missing name is refused |
| `timer` | Public | `{ remainingMs }` from the server's setup clock, given each tick, or `null` when it is not trusted (no clock). Amber from 5 s, as sheet 16 draws it |
| `closed` | Public | `true` once the server's 30 seconds are over: "Time is up", and every character not this phone's dimmed and refused (decision 2) |
| `holders` | Public | `{ [characterId]: seat }`: who holds each character other than this phone, "Taken · 2" |
| `mine` | This viewer's | `null`, or `{ id, state: 'saving' \| 'confirmed' \| 'assigned' }`: this phone's character and how it stands. Drawn as this phone's even if a holder is given for it |
| `choose` | This viewer's | `{ enabled, reason }`: whether this phone may choose now, the server's offer. Off by default |
| `toast` | This viewer's | `null`, or `{ id, text, icon }`: "Assigned: Juno", in Frontend's words (`CHOOSE_WORDS.assigned(name)`), through the shell's toast; the info icon by default |

**The screen decides nothing:** it never works out whether a character is free, when the time ends, or what is assigned.

| A cell | Drawn | A tap |
| --- | --- | --- |
| Free, offered | Available | `onChoose(id)` |
| Free, not offered | Available (not dimmed) | Refused, with Frontend's `choose.reason` as its description |
| Held by another seat | Taken: dimmed, "Taken · 2" | Refused: "Taken by player 2" |
| Not this phone's, `closed` | Taken: dimmed (with "Taken · 2" if held) | Refused: "Time is up" (or who holds it) |
| This phone's, saving | Selected: ringed amber, "Saving…"; busy | Refused (busy) |
| This phone's, confirmed or assigned | Confirmed: ringed, the check, "Yours" or "Assigned" | Nothing: not refused, not dimmed, no report |
| Any, while reconnecting, concealed or not interactive | As above | Refused (reconnecting: the banner's words) |

Each refused cell keeps its focus (`aria-disabled`, never `disabled`). Each cell's accessible name is the pack's: "Vega", "Atlas, taken by player 2", "Nova, yours"; this phone's own is `aria-pressed`. The grid is a group named "Characters". The foot's line is said as it changes (`aria-live="polite"`).

**When the viewer changes** (another person picks up the phone), this phone's choice, its saving state, the offer and the toast are dropped until Frontend gives the new viewer's in the same update. While concealed they are dropped too, refused if given, and come back only when given again.

## Callbacks

| Callback | When |
| --- | --- |
| `onChoose(characterId)` | A character is tapped that this phone may choose: a free one, or another while one is already this phone's. Frontend sends today's `chooseCharacter` |
| `onRetry()` | The shell's reconnecting banner's Retry |
| `onLayout(layout)`, `onFocusReturn({ intent, value })` | As the other components' |

Each reports a tap, and only that.

## Drawn

| Part | Drawn (sheet 16) |
| --- | --- |
| Top bar | The shell's phase bar: the players icon, "Choose a character" and its line ("Assigned for you if time runs out", or "Time is up"), the clock, amber from 0:05 |
| The grid | The kit's 3 × 3, 12 px under the bar and 16 px in: each cell the portrait (to 100 px) and the name in capitals, no seat number; free, taken (dimmed, "Taken · 2"), saving (ringed amber, "Saving…"), yours (ringed, the check, "Yours") or assigned ("Assigned") |
| The foot | 16 px above the bottom safe area: the 52 px portrait (or the empty tile with the players icon), the name in bold and the line under it ("Tap one to choose", the spinner on its own line and "Saving your choice", "Tap another to change" or "Assigned automatically"; once time is up, "Time is up" in place of a line that invites a tap), and the amber "✓ Yours" pill once confirmed |
| The toast | The shell's toast, "Assigned: Juno", with the info icon |
| Larger text | At the Large text (150 %) the 3 × 3 with every name whole; at the Largest (200 %) the kit's list, every name whole; the screen scrolls to the foot |

**Motion:** the spinner while saving, and the shell's toast; with Reduce motion (the game's or the device's) the spinner stands still.

### Against the pack

The agreement draws the frozen pack's `ENTRY_SCREENS.choose` beside the screen and compares, to within half a pixel, the bar, the grid, every cell, its portrait, name, note and mark, the foot, the spinner, the pill and the toast: their boxes, words, looks, states (`aria-disabled`, `aria-busy`, `aria-pressed`, `aria-label`, `data-state`, `data-urgent`), icon drawings and the portrait files.

- **Accepted, at the Largest text only:** the kit's 3 × 3 sits in its container (`.ms-k-grid-wrap`, the pack's own `.grid-wrap` rule), so where it has under 13 of its em across it becomes a list, every name whole, as the pack's rosters do. The pack's choose grid is not in a `.grid-wrap`, so it keeps the 3 × 3 with each name cut to a letter or two. The case puts the pack's grid in a `.grid-wrap`, compares everything else as usual, and records the list against the pack as it is.

## Check

`node design/tools/character-select-check.mjs` bundles the preview with Vite and serves it with the production headers. It captures 10 states at 390 × 844 and 430 × 932: the five of sheet 16, time up after a choice, choosing not offered, reconnecting, and the Large and Largest text. Then it runs the probe (as the page comes and with the device's Reduce motion) and the agreement.

**Recorded against `16cfc34e` (clean, with the shell 0.2.2):** 20 of 20 captures, the probe 22 of 22 checks (21 as the page comes, the motion check with the device's Reduce motion), and the agreement 10 of 10, with no unexpected policy report and no page problem. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.

## Frontend's connection

1. Mount the screen when the session's status is `choosing`; dispose it when the role stage starts.
2. Give `characters` from its crew data (`CREW[id].sign`), `holders` from the session's members (each other seat's `characterId`), `mine` from this seat's (`saving` while `chooseCharacter` is in flight), `choose` from today's `model.canChoose`, `closed` from the server, and the setup clock's remaining time each tick.
3. Route `onChoose` to today's `chooseCharacter`.
4. Today's choosing grid and its line leave the screen.

## Not in this version

The comparison through Frontend's native build (the `characters` part) waits for Frontend's PR that mounts the screen.
