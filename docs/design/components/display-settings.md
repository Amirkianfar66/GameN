# Display settings: Designer's runtime component

**Version:** `display-settings-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #294, with the Lead's decisions below. Built without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). It does not activate a native interface: that is Frontend's PR, under the phone merge gate.

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

## The Lead's decisions (#294)

1. **One module, two mounts:** the Display page before a match, and the Settings sheet's content in a match. The sheet's title and ✕ stay the shell's.
2. **The values:** `textScale` `1 | 1.5 | 2` and `reducedMotion`, as the game keeps them. The component reports what is asked and stores nothing.
3. **The phone's own Reduce Motion:** `motionLock: { reason }`. The switch is on, dimmed and refused, and the reason is shown too: while locked, the row's line under "Reduce motion" reads Frontend's reason (for example "On, because this phone asks for less motion") in place of the usual line, and it is also the switch's accessible description. A sighted player is never left with an unexplained greyed switch; the words are Frontend's, so the component adds none.
4. **Reconnecting:** the settings and the Host controls row keep taking taps. Only `interactive: false` refuses.
5. **The Largest text:** the three sizes stack, one a row (`stack: true`).
6. **The Host group:** shown only when Frontend gives `hostControls`. The Host controls sheet (sheet 15) is the next part.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/display-settings/`:

| Path | What |
| --- | --- |
| `display-settings.mjs` | `mountDisplayPage()`, `mountSettingsSheet()`, `nextDisplaySettingsInput()`, `motionOn()`, `DISPLAY_SETTINGS_DEFAULTS`, `DISPLAY_SETTINGS_VERSION`, `SETTINGS_WORDS`, `TEXT_SCALES` |
| `display-settings.css` | Every style, under `.ms-display-settings` (the page) and `.ms-settings-sheet` (the sheet's content); starts with the kit's and the entry parts' stylesheets. Of its own, only the page's canvas: everything else is the kit's and the entry parts' |
| `preview/` | Development only: the preview (the page; the sheet's content in the phone shell's sheet over Room A, as sheet 32 draws it), `probe.mjs`, and `agree.mjs` (both beside the frozen pack's `settings`, with and without `from=menu` and `host=1`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/display-settings-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/display-settings.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `list` and `row` (with the icon tile and a trailing switch, or the chevron), `switchControl`, `seg` (`stack` at the Largest text, decision 5), `groupLabel`, `groupNote`, and the control policy.
- **The entry parts (0.3.0), for the page:** `screen` and `navBar`.
- **The phone shell (0.2.x), for the sheet:** its sheet and `sheetBody`, opened by Frontend; the component does not import the shell (the preview and the agreement mount 0.2.0, whose sheet is 0.2.2's).

## Mount, update and dispose

```js
import { mountDisplayPage, mountSettingsSheet } from '…/design/phone-ui/components/display-settings/display-settings.mjs';
import '…/design/phone-ui/components/display-settings/display-settings.css';

// Before a match: the page fills `host`.
const page = mountDisplayPage(host, input, handlers);
// In a match: the content of the shell's open "Settings" sheet.
const sheet = mountSettingsSheet(shell.sheetBody, input, handlers);

page.update({ ...changes }); // each key given replaces that key; the rest stay
page.layout();               // the page's { size, safe }; the sheet's content has none of its own
page.dispose();              // safe twice; afterwards nothing fires
```

- **On update,** the switch, the three sizes and the Host controls row keep their elements and the focus. A change of text size reflows the screen under the finger, and the chosen size keeps the focus.

## Inputs

| Input | For | What |
| --- | --- | --- |
| `reducedMotion` | Both | Whether Reduce motion is on for this phone: the switch's position, and the component's own motion (the switch's thumb) |
| `motionLock` | Both | `null`, or `{ reason }` when the phone's own Reduce Motion forces it on: the switch on, dimmed and refused; Frontend's reason as the row's line, in place of the usual one, and as the switch's description (decision 3) |
| `textScale` | Both | `1`, `1.5` or `2`, as the game keeps it: Standard, Large or Largest (`TEXT_SCALES`) |
| `interactive` | Both | `false`: every control refused, nothing dimmed |
| `hostControls` | The sheet | `null` (no Host group), or `{ enabled, reason }`: the Host controls row, for the host only |
| `insets` | The page | As the other entry screens: the safe areas, or `null` for the browser's |

**The settings never change the match,** so they take their taps while the match is reconnecting, as the shell's ⋮ does; only `interactive: false` refuses them, without dimming (decision 4). The component never stores or applies a setting: Frontend applies it and gives it back, and until then the switch and the sizes show what they were given.

## Callbacks

| Callback | When |
| --- | --- |
| `onReducedMotion(on)` | The switch is tapped: the setting it asks for, `true` or `false` |
| `onTextScale(scale)` | A size is tapped that is not the current one: `1`, `1.5` or `2`. The current one reports nothing |
| `onBack()` | The page's "Menu" |
| `onHostControls()` | The sheet's Host controls row: Frontend opens the Host controls sheet (#222 item 28) |
| `onFocusReturn({ intent, value })`, `onLayout` | As the other components' (`onLayout`, the page's only); a focus in the Host controls row returns to the content when the row goes |

Each reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| The page | The entry screen on the phone's canvas: the nav bar ("Menu" with the chevron, "Display" centred), then the options, from the top; it scrolls with larger text |
| The sheet's content | On the sheet's glass: "Display", the options; for the host, "Host" and the Host controls row |
| Reduce motion | The kit's row: the motion icon on a steel tile, the title and its explanation (or, while locked, Frontend's reason), and the switch at its end (`role="switch"`, named "Reduce motion"; locked, on and dimmed) |
| Text size | "Text size", then the kit's three-way choice (`role="radiogroup"`, named "Text size"): Standard, Large, Largest |
| The note | "These stay on this phone. They never change the match." |
| Host controls | The kit's row with the host icon on amber, "Host controls", "Bots, deadlines, recovery, abort", and the chevron |
| Larger text | The rows' words wrap; at the Largest text the three sizes stack, one a row (decision 5); the page and the sheet scroll, every word whole |

**Motion:** the switch's thumb slides in 220 ms (the kit's); with Reduce motion (the game's or the device's) in 80 ms.

## Frontend's connection

1. **Before a match:** route the main menu's `onSettings` to the Display page; `onBack` returns to the menu.
2. **In a match:** on ⋮, open the shell's sheet `{ id: 'settings', title: 'Settings' }` and mount `mountSettingsSheet` in `shell.sheetBody`; dispose it when the sheet closes. Give `hostControls` to the host only.
3. Give `reducedMotion`, `motionLock` and `textScale` from the phone's preferences (today's `preferences.mjs`), and apply each change as today: the root's text size, and the game's motion.
4. Today's folded "Display settings" and the host's controls in it leave the screen.

### Against the pack

The agreement draws the frozen pack's `settings` screen beside each mount and compares, to within half a pixel: the page's screen, nav bar, Menu and title; the sheet, its title and body; the group labels, the list, the rows, their icon tiles and drawings, titles, lines and chevron, the switch (and where its thumb rests), the three sizes and the note: their boxes, words, looks, states (`aria-checked`, `aria-disabled`, `aria-busy`, names, roles) and icon drawings. The room behind the sheet, the top bar and the tabs are the room scene's and the shell's own agreements'; the lock's line is Frontend's words, checked by the probe.

- **Accepted, at the Largest text only (decision 5):** the three sizes stack, one a row (kit 0.5.0's `stack`); the frozen pack keeps them side by side. Those cases draw the pack with the same rule, compare everything else as usual, and record the stacking against the pack as it is.

## Check

`node design/tools/display-settings-check.mjs` bundles the preview with Vite and serves it with the production headers. It captures 10 states at 390 × 844 and 430 × 932: the page (off, on, locked, Large, Largest) and Settings in a match (as sheet 32, host, locked, reconnecting, Largest). Then it runs the probe (as the page comes and with the device's Reduce motion) and the agreement.

**Recorded against `3b29786f` (clean):** 20 of 20 captures, the probe 18 of 18 checks (17 as the page comes, the motion check with the device's Reduce motion), and the agreement 8 of 8, with no unexpected policy report and no page problem. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.

## Not in this version

The comparison through Frontend's native build (the `settings-entry` and `settings` parts) waits for Frontend's PR that mounts it. The Host controls sheet is the next part (sheet 15, #222 item 28).
