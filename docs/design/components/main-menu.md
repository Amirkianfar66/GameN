# Main menu: Designer's runtime component

**Version:** `main-menu-0.1.0`, **proposed interface only**. **Status (15 November 2026):** the interface, for the Lead Designer's review, then Frontend's on #4. Nothing is built yet.

**What it is:** the phone's main menu after the intro, as sheet 10 draws it. It is #222 item 5 (P1). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 10):

| State | Drawn |
| --- | --- |
| Main menu | The brand film's frame at 1.65 s as the hero, in the top 58 %, fading into the canvas: "Game N · by Plan B". **Join** (primary, amber): "Enter a room code". **Host**: "Open a room for 7–9 players". **Recover my seat**: a quiet link. The display-settings button at the top right |
| Offline | The same, with "No connection. Join, Host and Recover return when you are back online." over the choices, and the three choices unavailable |

**What changes from today:**
- Today the screen is titled "Mothership", and Join, Host and Recover are tabs over an open form with a Device choice, and a "Settings" text button.
- Drawn: "Game N", the name in the owner's approved intro. Join comes first and largest, then Host; Recover is a quiet link. Each opens its own screen (sheets 11, 12 and 14), which are my later items.

**Comparison parts:** `menu` (sheet 10; differs today). `intro` (sheet 10; "same") is the brand film, unchanged.

**Not in it:**
- **The intro** (sheet 10's first two frames): the approved two-second brand film, unchanged, which Frontend's existing player plays on entry (`createPlanetPregame`'s `brand` film). The menu mounts after it.
- **The hero's picture:** the brand film's frame at 1.65 s, drawn by Frontend's existing film player (as the role and boarding films are, #268 and #272), mounted in `menu.hero` and held still. The menu draws the fade into the canvas over it.
- **Host, Join, Recover and Settings themselves:** their own screens and components. The menu reports which was chosen.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/main-menu/`:

| Path | What |
| --- | --- |
| `main-menu.mjs` | `mountMainMenu()`, `nextMainMenuInput()`, `MAIN_MENU_DEFAULTS`, `MAIN_MENU_VERSION`, `MENU_WORDS` |
| `main-menu.css` | Every style, under `.ms-main-menu ms-kit`; starts with `@import url("../kit/kit.css");` |
| `preview/` | Development only: the preview on the pack's fixtures (a still of the approved brand film where the hero goes), `probe.mjs`, and `agree.mjs` (the menu beside the frozen pack's `ENTRY_SCREENS.menu`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/main-menu-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/main-menu.test.mjs`.

**Uses unchanged:**
- **The kit:** the display-settings icon button; "Recover my seat" as a plain button with the key icon; the error note; the control policy. The Join and Host choices need the kit's **entry** (question 1).
- **No phone shell:** the menu has no bar, tabs or match status. It fills its host with the pack's canvas (`--ms-k-canvas`), under the safe areas.

## Mount, update and dispose

```js
import { mountMainMenu } from '…/design/phone-ui/components/main-menu/main-menu.mjs';
import '…/design/phone-ui/components/main-menu/main-menu.css';

const menu = mountMainMenu(host, input, handlers);
menu.hero;                   // the element the brand film's frame is drawn in (stays for the menu's life)
menu.layout();               // { size, safe: { top, bottom }, hero: { width, height } }
menu.update({ ...changes }); // each key given replaces that key; the rest stay
menu.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

- **The host:** the element the entry screen fills. The menu appends one child, `.ms-main-menu`, which fills it, edge to edge.
- On update, the three choices and the settings button keep their elements and the focus.

## Inputs

Nothing here is private: the menu is the same for everyone, before any match.

| Input | Audience | What |
| --- | --- | --- |
| `interactive`, `reducedMotion`, `insets` | Phone | As the shell's: `insets` `null` for the browser's safe areas, or `{ top, bottom }` in px |
| `notice` | Phone | `null`, or `'offline'`: "No connection. Join, Host and Recover return when you are back online." |
| `join`, `host`, `recover` | Phone | Each `{ enabled, busy, reason }`. Frontend gives them: offline, all three unavailable with the notice as their reason; busy while a choice's own request is starting, if it has one |
| `settings` | Phone | `{ enabled }`: the display-settings button, which stays usable offline |

**The menu decides nothing:** it never works out whether the phone is online or a choice can start. A refused choice keeps its focus, with `aria-disabled` and Frontend's reason.

## Callbacks

| Callback | When |
| --- | --- |
| `onJoin()` | Join. Frontend opens Join (sheet 12) |
| `onHost()` | Host. Frontend opens host setup (sheet 11) |
| `onRecover()` | Recover my seat. Frontend opens Recover (sheet 14) |
| `onSettings()` | The display-settings button. Frontend opens Settings' Display page (sheet 32) |
| `onLayout(layout)` | The menu's size or safe areas changed |

Each reports a tap, and only that.

## Drawn

| Part | Drawn (sheet 10) |
| --- | --- |
| The hero | `menu.hero`, the top 58 % of the screen, with the canvas fading over its lower 40 % (the pack's `.menu-hero`) |
| Display settings | The kit's 44 px icon button with the settings icon, at the top right, under the top safe area; its name "Display settings" |
| The choices | At the foot, 16 px from the sides and 18 px above the bottom safe area, 12 px apart: Join (the kit's entry, primary: the person-plus icon on ink, amber), Host (the kit's entry: the host icon), Recover my seat (the kit's plain button with the filled key, centred) |
| Offline | The kit's error note with the offline icon, above Join; the three choices dimmed and refused |
| Larger text | The choices grow with the text and take the space they need from the foot up; the hero stays behind them |

**Motion:** none of its own. The intro is the brand film's.

## Frontend's connection

1. Mount the menu on the entry screen after the brand intro, when there is no match, admission or recovery under way; dispose it on leaving.
2. Draw the brand film's frame at 1.65 s in `menu.hero` with the existing player, held still.
3. Map the session: `notice: 'offline'` while the connection is down; `join`, `host` and `recover` from the session's own availability (today `model.busy` and the connection); `settings: { enabled: true }`.
4. Route `onJoin`, `onHost`, `onRecover` and `onSettings` to their screens. Today's Join, Host and Recover tabs, their open forms, the Device drop-down and the "Mothership" heading leave the entry screen.

## Questions for the Lead

1. **The entry choice** (the pack's `.entry`: a 76 px two-line button with a 48 px icon tile, a chevron, and a primary amber tone) is a control the kit doesn't draw. Sheet 12's "Player phone / Shared display" may use the same shape. Could the kit add `kit.entry({ title, sub, icon, tone })`?
2. **The offline note** is the pack's `.error` with the offline icon. The kit's `errorNote(words)` always draws the warning icon. Could it take an icon (`errorNote(words, { icon: 'offline' })`)?
3. **The hero:** Frontend's existing player draws the brand film's frame, as for the role and boarding films. Agreed?

## Not in this version

Everything: this is the interface. Next, after the Lead's review and Frontend's on #4: the module and styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack and the test.
