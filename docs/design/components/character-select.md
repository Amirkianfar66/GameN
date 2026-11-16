# Character selection: Designer's runtime component

**Version:** `character-select-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

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

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/character-select/`:

| Path | What |
| --- | --- |
| `character-select.mjs` | `mountCharacterSelect()`, `nextCharacterSelectInput()`, `CHARACTER_SELECT_DEFAULTS`, `CHARACTER_SELECT_VERSION`, `CHOOSE_WORDS` |
| `character-select.css` | Every style, under `.ms-char-select`; starts with the kit's and the shell's stylesheets. Only the foot (`.choose-foot`) is its own: only sheet 16 draws it |
| `preview/` | Development only: the preview on the pack's fixtures (the roster's seats and the nine characters), `probe.mjs`, and `agree.mjs` (the screen beside the frozen pack's `ENTRY_SCREENS.choose`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/character-select-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/character-select.test.mjs`.

**Uses unchanged:**
- **The phone shell (0.2.0),** mounted inside the component as the role stage mounts it: the phase bar (`bar: { kind: 'phase', icon: 'players', title, sub, timer }`), no tab bar, its reconnecting banner and its toast.
- **The kit (0.5.1):** `grid9` and `cell` for the nine (available, selected, confirmed, taken; the check mark; the note), `portrait` for the foot, `pill` for "Yours", the spinner and the control policy.

## Mount, update and dispose

```js
import { mountCharacterSelect } from '…/design/phone-ui/components/character-select/character-select.mjs';
import '…/design/phone-ui/components/character-select/character-select.css';

const choose = mountCharacterSelect(host, input, handlers);
choose.layout();               // { size, safe: { top, bottom } }, as the shell's
choose.update({ ...changes }); // each key given replaces that key; the rest stay; the clock is given each tick
choose.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

- **On update,** each character's cell keeps its element and the focus, by its id, through clock ticks and changes of holder.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `status`, `interactive`, `reducedMotion`, `insets`, `viewer`, `versions` | Phone | As the shell's and the role stage's; `versions` for the portraits |
| `characters` | Public | The nine, in the grid's order: `[{ id, name }]`, from Frontend's crew data (question 1) |
| `timer` | Public | `{ remainingMs }` from the server's setup clock, given each tick, or `null` when it is not trusted. Amber from 5 s, as sheet 16 draws it |
| `closed` | Public | `true` once the server's 30 seconds are over: "Time is up", and every character not this phone's dimmed (question 2) |
| `holders` | Public | `{ [characterId]: seat }`: who holds each character other than this phone, "Taken · 2" |
| `mine` | This viewer's | `null`, or `{ id, state: 'saving' \| 'confirmed' \| 'assigned' }`: this phone's character and how it stands |
| `choose` | This viewer's | `{ enabled, reason }`: whether this phone may choose now, the server's offer |
| `toast` | This viewer's | `null`, or `{ id, text, icon }`: "Assigned: Juno", in Frontend's words (`CHOOSE_WORDS.assigned(name)`), through the shell's toast |

**The screen decides nothing:** it never works out whether a character is free, when the time ends, or what is assigned. A refused character keeps its focus, with `aria-disabled` and Frontend's reason; a taken one is refused with "Taken by player 2" as its name says.

**When the viewer changes** (another person picks up the phone), this phone's choice and its toast are dropped until Frontend gives the new viewer's, as the role stage does.

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
| The grid | The kit's 3 × 3 grid, 12 px under the bar: each cell the portrait and the name in capitals; free, taken (dimmed, "Taken · 2"), saving (ringed amber, "Saving…"), yours (ringed, the check, "Yours") or assigned ("Assigned") |
| The foot | At the bottom: the 52 px portrait (or the empty tile with the players icon), the name in bold and the line under it ("Tap one to choose", the spinner and "Saving your choice", "Tap another to change" or "Assigned automatically"), and the amber "✓ Yours" pill once confirmed |
| The toast | The shell's toast, "Assigned: Juno", with the info icon |
| Larger text | The kit's grid at larger text (its names and notes under the portraits), and the foot's words wrap |

**Motion:** the spinner while saving, and the shell's toast; with Reduce motion they don't move.

## Frontend's connection

1. Mount the screen when the session's status is `choosing`; dispose it when the role stage starts.
2. Give `characters` from its crew data, `holders` from the session's members (each other seat's `characterId`), `mine` from this seat's (`saving` while `chooseCharacter` is in flight), `choose` from today's `model.canChoose`, and the setup clock's remaining time each tick.
3. Route `onChoose` to today's `chooseCharacter`.
4. Today's choosing grid and its line leave the screen.

## Questions for the Lead

1. **The characters' names:** I propose Frontend gives the nine as `[{ id, name }]`, from its crew data (today's `CREW[id].sign`), in the order the grid draws them, rather than the component importing the crew data. Or should the component take the order and names from the hosted crew runtime, as the kit's portraits take their pictures?
2. **Time is up:** sheet 16 dims every character but the assigned one, held or not. I propose `closed: true` does that, and refuses every cell, from the server's word only, never from the clock reaching 0:00.
3. **Changing your mind:** the sheet says "Tap another to change". I propose a tap on another free character while one is yours reports `onChoose(id)`, and a tap on your own reports nothing. Is that right?
4. **The foot's own styles:** `.choose-foot` and `.who` are drawn only on sheet 16, so I propose they are this component's own, not the kit's.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the module and its styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
