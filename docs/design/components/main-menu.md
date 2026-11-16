# Main menu: Designer's runtime component

**Version:** `main-menu-0.1.0`, with `entry-parts-0.1.0`. The host room (#287) extends the entry parts to 0.2.0: the entry choice is unchanged, and the entry screens' frame is added ([host-room.md](host-room.md), decision 1). **Status (16 November 2026):** the interface is approved by the Lead Designer, with the decisions below, and posted on #4 for Frontend. It is built on the kit 0.4.0 (`e6b4a385`), with its preview, probe, agreement with the pack, check and test, as the owner's 16 November decision has each part built without waiting for Frontend (docs/design/owner-decisions.md, #280). It is not in the game yet: Integration first admits its files with the kit's graph. It is not a release.

**What it is:** the phone's main menu after the intro, as sheet 10 draws it. It is #222 item 5 (P1). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 10):

| State | Drawn |
| --- | --- |
| Main menu | The brand film's frame at 1.65 s as the hero, in the top 58 %, fading into the canvas: "Game N · by Plan B". **Join** (primary, amber): "Enter a room code". **Host**: "Open a room for 7–9 players". **Recover my seat**: a quiet link. The display-settings button at the top right |
| Offline | The same, with "No connection. Join, Host and Recover return when you are back online." over the choices, and the three choices unavailable: Join and Host keep their look, and "Recover my seat" is dimmed |

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
| `main-menu.css` | Every style, under `.ms-main-menu`; starts with `@import url("../kit/kit.css");` and `@import url("../entry-parts/entry-parts.css");` |
| `../entry-parts/entry-parts.mjs`, `entry-parts.css` | `createEntryParts(doc)`, which gives `entry(props)` and `setEntry(node, props)`: the pack's two-line entry choice (`.entry`), `entry-parts-0.1.0`, under its own root class, `ms-entry-parts`, which a component adds beside `ms-kit`. Mine, not the kit's: the pack uses it only in `screens-entry.mjs` (sheets 10 and 12). The menu and the join screen both import it; it is checked through the menu's agreement |
| `preview/` | Development only: the preview (a still of the approved brand film at 1.65 s where the hero goes), `probe.mjs`, and `agree.mjs` (the menu beside the frozen pack's `ENTRY_SCREENS.menu`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/main-menu-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/main-menu.test.mjs`.

**Uses unchanged:**
- **The kit:** the display-settings icon button; "Recover my seat" as a plain button with the filled key icon; the offline note, `kit.errorNote(words, { icon: 'offline', filled: false })` (kit 0.4.0); the control policy.
- **Entry parts:** Join and Host are my `entry-parts` module's entry choice: `{ title, sub, icon, tone: null | 'primary', intent, value }`, the 48 px tile with the icon filled, the title over the line, and the chevron. The choice sets its hand cursor and `-webkit-tap-highlight-color: transparent` in the same rule, as the kit's rule asks.
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
- **An unavailable choice** (`enabled: false`) is refused with Frontend's reason as its description. Join and Host keep their look, as sheet 10 draws them offline; Recover, the kit's plain button, is dimmed as the pack's `.btn` is.
- **A busy choice** is refused and says so (`aria-busy`). The pack draws no busy entry choice, so Join and Host keep their look; Recover shows the kit's busy button.
- **`interactive: false`:** every control is refused, and nothing is dimmed.
- **Defaults:** each choice and the settings button are available until Frontend says otherwise; no notice.

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
| The choices | At the foot, 16 px from the sides and 18 px above the bottom safe area, 12 px apart: Join (the entry choice, primary: the person-plus icon on ink, amber), Host (the entry choice: the host icon), Recover my seat (the kit's plain button with the filled key, centred) |
| Offline | The kit's error note with the offline icon, unfilled, above Join, 8 px under the choices' top (the pack's `.error` margin); the three choices refused. Join and Host keep their look and Recover is dimmed, as sheet 10 draws them |
| Larger text | The choices grow with the text and take the space they need from the foot up. When they reach into the hero, the canvas covers it from 24 px above their top, so none of their words sits on the hero's (decision 5) |

**Motion:** none of its own. The intro is the brand film's.

## Frontend's connection

1. Mount the menu on the entry screen after the brand intro, when there is no match, admission or recovery under way; dispose it on leaving.
2. Draw the brand film's frame at 1.65 s in `menu.hero` with the existing player, held still.
3. Map the session: `notice: 'offline'` while the connection is down; `join`, `host` and `recover` from the session's own availability (today `model.busy` and the connection); `settings: { enabled: true }`.
4. Route `onJoin`, `onHost`, `onRecover` and `onSettings` to their screens. Today's Join, Host and Recover tabs, their open forms, the Device drop-down and the "Mothership" heading leave the entry screen.

## Decisions (the Lead Designer's review, 15 November 2026)

1. **The entry choice is mine, not the kit's:** a small module, `components/entry-parts/`, with its own version. The pack uses `.entry` only in `screens-entry.mjs` (sheets 10 and 12), both in my area; the kit holds what both screen builders draw. If another builder needs it, the Lead moves it into the kit.
2. **The offline note is the kit's:** kit 0.4.0 adds `errorNote(words, { icon, filled })`, defaulting to the filled warning, with the pack's offline note as a comparison case. The menu uses `kit.errorNote('No connection. Join, Host and Recover return when you are back online.', { icon: 'offline', filled: false })`.
3. **The hero:** Frontend's existing player draws the brand film's frame at 1.65 s, held still; the menu draws the fade to the canvas over it, as for the role and boarding films.
4. **Offline, as sheet 10 draws it** (the build; agreed by the Lead, 16 November): Join and Host keep their look, and only "Recover my seat" is dimmed. The interface said all three were dimmed; the sheet is the specification, so the build follows it. All three are refused alike, through the kit's policy, so assistive technology still hears the state.
5. **Nothing of the choices sits on the hero's words** (the Lead's review of the build, 16 November). At the Largest text offline, the frozen pack's menu puts the note over "by Plan B", which shows through the unfilled note, and the note's top touches "Game N". No approved sheet draws the menu at that size, and the pack's own rule is that nothing is cut or crowded at large text. So:
   - **When larger text raises the choices into the hero,** the canvas covers the hero from 24 px above the choices' top (the note's, or Join's), fading in over those 24 px, solid from their top down. It is the menu's own layer over the pack's fade (`.ms-mm-cover`), placed by `main-menu.mjs` from the choices' boxes and kept current as they grow.
   - **At the Standard text** the choices start below the hero at both sizes, so there is no cover and the menu is the pack's, to half a pixel.
   - **The note stays unfilled,** as sheet 10 has it: the cover leaves only canvas behind it.
   - **The trade-off,** for the Lead's eye: at 390 × 844 offline with the Largest text the note starts at 241 px, so the cover begins at 217 px and the lower part of "Game N" fades into it. At 430 × 932 the cover begins under "by Plan B".

## Checks run on this version

On `9aec5f4a`, clean (the kit 0.4.0 at `e6b4a385`; the check on the shared `component-check.mjs`):
- **Tests:** `packages/design-tokens/test/main-menu.test.mjs`:
  - the runtime-safe graph, with the kit and the entry parts and no phone shell;
  - styles scoped, placing kit and entry parts only through the menu's own parts;
  - the entry parts under their root class, a hand cursor never without the tap highlight off, and no dimming of a refused choice;
  - the pack's words; the inputs' refusals; the check's record.
  
  `check:toolchain`, `check:workspace`, `check:sources`, `typecheck`, `test:design`, `test:tooling` and `check-assets.mjs` run before every push.
- **`node design/tools/main-menu-check.mjs`:** the preview bundled by Vite and served with the hosted game's production headers (`lib/component-check.mjs`).
  - **Captures:** the menu, offline, and both with the Largest text (200 %), at 390 × 844 and 430 × 932: **8 of 8 pass**. Each asserts the pack's words, the canvas, the settings button 4 px under the top safe area and the choices 18 px over the bottom one; offline, the note, the three refusals, and Join and Host undimmed with Recover at 0.4; and the cover exactly where the choices reach into the hero, from 24 px above them (none at the Standard text; at the Largest text offline at both sizes, and online at 390 × 844).
  - **The lifecycle probe:** 14 of 14 (13 as the page comes, 1 with the device's Reduce motion): the parts and the hero's element, taps, offline and back, busy, not interactive, focus through updates, the safe areas (given and the browser's), layout and `onLayout`, the text at 100, 150 and 200 % (the cover none at 100 %, and from 24 px above the choices whenever they reach into the hero), malformed input, dispose and motion.
  - **The agreement with the frozen pack** (`ENTRY_SCREENS.menu` beside the menu): **6 of 6 cases**, the menu and offline at both sizes and with the Largest text, agree to within half a pixel in every part (the hero's place, the settings button and its icon, the choices, the note and its icon, each choice's tile, icon, title, line and chevron, Recover and its key), in their look (background, colour, opacity, radius, shadow, cursor, type) and the fade over the hero, and in their states (refused, the alert, the hero hidden from screen readers). A choice 2 px off fails every case. The cover is the one difference, at the Largest text only, and each case records it (none at the Standard text).
- **Not run:** physical phones, Safari, screen readers and the real app's connection.

**Again on `7da9945f`, clean, with `entry-parts-0.2.0`** (the host room's build, #287): 8 of 8 captures, 14 of 14 probe checks and 6 of 6 agreement cases pass, and the 8 captures are byte-identical to those on `9aec5f4a`. The entry parts' additions leave the menu's drawing unchanged.

## Not in this version

| What | Waiting on |
| --- | --- |
| Frontend's review and connection | #4; the game-side connections are sequenced after #284 |
| The hero's picture | Frontend's existing film player, unchanged |
| Host, Join, Recover and Settings | Their own components, my next parts |
