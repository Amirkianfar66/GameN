# Display settings: Designer's runtime component

**Version:** `display-settings-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** this phone's display settings, as sheet 32 and the pack's settings screen draw them: the Reduce motion switch with its explanation, and the text size as Standard, Large and Largest, with the line that they stay on this phone. It is #222 item 27, P3: "a Display page … before and during a match". The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

It comes in two places, from one module:

| Where | Drawn | Opened from |
| --- | --- | --- |
| **Before a match: the Display page** | A full screen: the nav bar ("Menu" back, the title "Display"), then the options | The main menu's Display settings button (sheet 10, #278's `onSettings`) |
| **In a match: the Settings sheet's content** | Inside the phone shell's sheet "Settings" (its title and ✕ are the shell's): "Display", the options, and for the host "Host" with the Host controls row | The top bar's ⋮ (sheet 32, "Settings (⋮)" and "Settings · host") |

**Covers:**

| State | Drawn |
| --- | --- |
| The options | A row: the motion icon on steel, "Reduce motion", "Films become stills; no shake or travel", and the switch. Then "Text size" and the three: Standard, Large, Largest, the current one chosen. Then "These stay on this phone. They never change the match." |
| The Display page | The nav bar ("Menu", "Display"), then the options, on the phone's canvas (the pack's `settings` with `from=menu`) |
| Settings in a match | "Display" over the options, on the sheet's glass (sheet 32, "Settings (⋮)") |
| Settings · host | The same, then "Host" and its row: the host icon on amber, "Host controls", "Bots, deadlines, recovery, abort", and the chevron (sheet 32, "Settings · host") |

**What changes from today:**
- **Today:** a folded "Display settings" line (on the join page before a match; inside Settings in a match), opening a "Reduce motion" checkbox and a "Text size" drop-down. In a match, the host's controls sit in the same panel ("Check server deadline", "Run eligible bots", "Issue recovery for Player 6").
- **Drawn:** a Display page before a match; in a match, the Settings sheet with the switch and its explanation, the three sizes, and Host controls as a row that opens their own sheet (#222 items 27 and 28).

**Comparison parts:** `settings-entry` ("Settings before a match") and `settings` ("Settings (⋮)"), both sheet 32, in `design/tools/lib/phone-ui-native-parts.mjs`. They apply when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **Keeping and applying the settings:** storing them on the phone and setting the text size and the motion across the game are Frontend's (today's `preferences.mjs`). The component shows what it is given and reports a tap.
- **The Settings sheet's frame:** its title, ✕ and glass are the phone shell's (#265). Frontend opens the sheet `{ id: 'settings', title: 'Settings' }` and mounts this content in `shell.sheetBody`.
- **Host controls themselves** (sheet 15, #222 item 28): their own sheet, the next part. Here only the row that opens it.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/display-settings/`:

| Path | What |
| --- | --- |
| `display-settings.mjs` | `mountDisplayPage()`, `mountSettingsSheet()`, `nextDisplaySettingsInput()`, `DISPLAY_SETTINGS_DEFAULTS`, `DISPLAY_SETTINGS_VERSION`, `SETTINGS_WORDS`, `TEXT_SCALES` |
| `display-settings.css` | Every style, under `.ms-display-settings` (the page) and `.ms-settings-sheet` (the sheet's content); starts with the kit's and the entry parts' stylesheets. Little of its own: where the parts sit |
| `preview/` | Development only: the preview (the page; the sheet's content in the phone shell's sheet over the room), `probe.mjs`, and `agree.mjs` (both beside the frozen pack's `settings`, with and without `from=menu` and `host=1`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/display-settings-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/display-settings.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `list` and `row` (with the icon tile and a trailing switch, or the chevron), `switchControl`, `seg` (`stack` at the Largest text, question 5), `groupLabel`, `groupNote`, and the control policy.
- **The entry parts (0.3.0), for the page:** `screen` and `navBar`.
- **The phone shell (0.2.x), for the sheet:** its sheet and `sheetBody`, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountDisplayPage, mountSettingsSheet } from '…/design/phone-ui/components/display-settings/display-settings.mjs';
import '…/design/phone-ui/components/display-settings/display-settings.css';

// Before a match: the page fills `host`.
const page = mountDisplayPage(host, input, handlers);
// In a match: the content of the shell's open "Settings" sheet.
const sheet = mountSettingsSheet(shell.sheetBody, input, handlers);

page.update({ ...changes }); // each key given replaces that key; the rest stay
page.layout();               // the page's { size }; the sheet's content has none of its own
page.dispose();              // safe twice; afterwards nothing fires
```

- **On update,** the switch, the three sizes and the Host controls row keep their elements and the focus. A change of text size reflows the screen under the finger, and the chosen size keeps the focus.

## Inputs

| Input | For | What |
| --- | --- | --- |
| `reducedMotion` | Both | Whether Reduce motion is on for this phone: the switch's position, and the component's own motion (the switch's thumb) |
| `motionLock` | Both | `null`, or `{ reason }` when the phone's own Reduce Motion forces it on: the switch on, dimmed and refused, with Frontend's reason (question 3) |
| `textScale` | Both | `1`, `1.5` or `2`, as the game keeps it: Standard, Large or Largest (`TEXT_SCALES`) |
| `interactive` | Both | `false`: every control refused, nothing dimmed |
| `hostControls` | The sheet | `null` (no Host group), or `{ enabled, reason }`: the Host controls row, for the host only |
| `insets` | The page | As the other entry screens: the safe areas, or `null` for the browser's |

**The settings never change the match,** so they take their taps while the match is reconnecting, as the shell's ⋮ does; only `interactive: false` refuses them (question 4). The component never stores or applies a setting: Frontend applies it and gives it back.

## Callbacks

| Callback | When |
| --- | --- |
| `onReducedMotion(on)` | The switch is tapped: the setting it asks for, `true` or `false` |
| `onTextScale(scale)` | A size is tapped that is not the current one: `1`, `1.5` or `2` |
| `onBack()` | The page's "Menu" |
| `onHostControls()` | The sheet's Host controls row: Frontend opens the Host controls sheet (#222 item 28) |
| `onFocusReturn({ intent, value })`, `onLayout` | As the other components' |

Each reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| The page | The entry screen on the phone's canvas: the nav bar ("Menu" with the chevron, "Display" centred), then the options, from the top; it scrolls with larger text |
| The sheet's content | On the sheet's glass: "Display", the options; for the host, "Host" and the Host controls row |
| Reduce motion | The kit's row: the motion icon on a steel tile, the title and its explanation, and the switch at its end (`role="switch"`, named "Reduce motion") |
| Text size | "Text size", then the kit's three-way choice (`role="radiogroup"`, named "Text size"): Standard, Large, Largest |
| The note | "These stay on this phone. They never change the match." |
| Host controls | The kit's row with the host icon on amber, "Host controls", "Bots, deadlines, recovery, abort", and the chevron |
| Larger text | The rows' words wrap; at the Largest text the three sizes stack, one a row (question 5) |

**Motion:** the switch's thumb slides (the kit's); with Reduce motion it does not.

## Frontend's connection

1. **Before a match:** route the main menu's `onSettings` to the Display page; `onBack` returns to the menu.
2. **In a match:** on ⋮, open the shell's sheet `{ id: 'settings', title: 'Settings' }` and mount `mountSettingsSheet` in `shell.sheetBody`; dispose it when the sheet closes. Give `hostControls` to the host only.
3. Give `reducedMotion`, `motionLock` and `textScale` from the phone's preferences (today's `preferences.mjs`), and apply each change as today: the root's text size, and the game's motion.
4. Today's folded "Display settings" and the host's controls in it leave the screen.

## Questions for the Lead

1. **One module, two mounts:** the Display page before a match (`mountDisplayPage`, with the entry parts' nav bar), and the Settings sheet's content in a match (`mountSettingsSheet`, in the shell's `sheetBody`; the sheet's title and ✕ stay the shell's). Is that the split you want, rather than one mount with a `form`?
2. **The values:** `textScale` `1 | 1.5 | 2` and `reducedMotion`, as the game keeps them today; `onTextScale(scale)` and `onReducedMotion(on)` report the asked value, and storing and applying stay Frontend's?
3. **The phone's own Reduce Motion:** today's game shows the box checked and disabled when the phone's Reduce Motion is on; the pack doesn't draw it. I propose `motionLock: { reason }`: the switch on, dimmed and refused, Frontend's reason as its accessible description, and no new words on screen. Or should the switch stay usable?
4. **Reconnecting:** the settings never change the match, so I propose they keep taking taps while reconnecting, as the shell's ⋮ does; the Host controls row too (it only opens a sheet on this phone). Only `interactive: false` refuses.
5. **The Largest text:** the three sizes stack, one a row (the kit's `stack`), as Join's device choice does (#289). Accepted again here, or keep them side by side?
6. **The Host group:** shown only when Frontend gives `hostControls`; its row reports `onHostControls()`. The Host controls sheet is the next part (sheet 15, item 28).

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the module and its styles, the preview's states (the page; the sheet, with and without the host; Large and Largest; locked; reconnecting), the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
