# Phone shell: Designer's runtime component

**Version:** `phone-shell-0.2.4`. **Status (16 November 2026):** built to the interface proposed on #4 ([6895584303](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6895584303)), ready for Frontend's review. It is not in the game yet. Integration first admits its two files to the hosted build. It is not a release. It is stacked on the room scene (#261), whose `icons.mjs` it shares and which its preview mounts in the stage.

**What it is:** the match's frame on a phone, as the phone pack draws it. The game imports it as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects data, actions, navigation and lifecycle, and does not rebuild, restyle or copy it.

**Covers:**
- **The top bar** (sheets 07, 08, 27.6 and 56):
  - a turn, your turn, a phase, a private talk, and the Blackout's dark;
  - Promises with its count, ⋮, the round, and the clock (amber in the last 10 s, a ring for the 5 s result and the 6 s presentation);
  - a place beside the clock for Food's gauge;
  - at larger text, the round leaves, a short title, and the two-line title with the clock and ⋮ beside it (#222 item 3).
- **The tabs** (sheets 08, 27 and 56):
  - Board or Room, Actions, Card and Panels;
  - the raised round button: Pass, Vote or Voted, usable or not, and busy;
  - the open tab amber with a filled icon, and badges;
  - whole labels capped at 14 px, with the large-content view on a long press (#222 item 2).
- **During a private talk** (sheet 25): its own two buttons, Promises and My card, in place of the tabs.
- **The stage:** the space between the bars, where Frontend mounts the room scene or the board.
- **Over the stage:**
  - the target bar with its Cancel (sheet 29; the owner's T2);
  - the floating chip ("Other rooms · n", "List");
  - the reconnecting banner, "Connection lost · Controls return when the match is current · Retry" (sheet 45, #222 item 33);
  - a toast.
- **The docked sheet's frame:** clear glass over the room (the owner's 56 %), solid under Reduce transparency, with its title, back, close, scrolling body and footer actions. "Pass your turn?" (27.3) is one.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `phone-shell/phone-shell.mjs` | `mountPhoneShell()`, `nextPhoneShellInput()`, `checkBar()`, `checkTabs()`, `clockText()`, `seatNumber()`, `PHONE_SHELL_DEFAULTS`, `PHONE_SHELL_VERSION`, `HERO_WORDS`, `RECONNECTING`, `TOAST_MS`, `GAME_TABS`, `TALK_BUTTONS` |
| `phone-shell/phone-shell.css` | Every style, scoped under `.ms-phone-shell`. It imports the kit's styles |
| `kit/kit.mjs`, `kit/kit.css` | The shared component kit (`component-kit-0.5.0`, [its page](kit.md)): the shell's buttons, icon buttons and control policy are the kit's, as every Designer component's are |
| `icons.mjs` | The phone interface's icon family (from #261) |
| `phone-shell/preview/` | Development only: the preview on the pack's synthetic fixtures with the room scene in the stage, the lifecycle probe (`probe.mjs`) and the agreement with the pack (`agree.mjs`) |
| `phone-shell/review/` | The check's captures and `check.json` |

**Used unchanged:** `apps/game/hosted/crew-runtime.mjs`'s `crewPortraitVariable`, for the turn's and the talk's portraits, through `@mothership/contracts`. The shell does not import the room scene: Frontend mounts that in the stage.

**One source:**
- The shell's looks are the pack's: `design/phone-ui/prototype/ui.mjs` (`topBar()`, `tabs()`, `sheet()`) and `kit.css`.
- Those two files are pinned byte for byte by the frozen Food release (`docs/integration/food-consumer-source-2026-11-13.json`), so they stay as they are. `phone-shell.test.mjs` checks they are unchanged.
- **The agreement:** the check draws the pinned `topBar()` and `tabs()` beside the shell in the same page, from the same inputs, and compares every part.
  - **What is compared:** the words, the states (open, unavailable, the round button's mode and name), and where each part sits.
  - **Cases:** five, plus two at 200 % text on 320 × 568.
  - **Result:** every part agrees to within half a pixel.
- When Integration moves those pins, the pack's two files can import the shell's.

## Mount, update and dispose

```js
import { mountPhoneShell } from '…/design/phone-ui/components/phone-shell/phone-shell.mjs';
import '…/design/phone-ui/components/phone-shell/phone-shell.css';

const shell = mountPhoneShell(host, input, handlers);
shell.stage;                 // the element between the bars: mount the room scene or the board here
shell.layout();              // { size, bars: { top, bottom }, stage: { width, height }, safe: { top, bottom }, covered: { bottom } }
shell.sheetBody;             // the open sheet's scrolling body (null with no sheet): mount its content here
shell.slot('clock');         // the place beside the clock: Food's gauge goes here
shell.slot('cover');         // the stage's cover: a layer over the stage, for a result window over the room
shell.update({ ...changes }); // each key given replaces that key; the rest stay
shell.suspend();             // backgrounded: a toast and a long press end
shell.resume();
shell.dispose();             // removes the element and its listeners
```

- **The host:** the element the match screen fills, positioned and sized by Frontend. The shell appends one child, `.ms-phone-shell`, which fills it.
- **The stage and the room scene:**
  - Mount the room scene in `shell.stage`, with `size: shell.layout().stage`.
  - On `onLayout(layout)`, pass `layout.stage` to the room scene's `update({ size })`.
  - The stage keeps its size when the shell is concealed.
- **On update:**
  - Every control is kept by its identity and changed in place: Promises, ⋮, each tab, the round button, the target bar's Cancel, the chip, Retry, and each sheet button by its id. A focused control keeps its element and the focus through clock ticks, counts and label changes.
  - A sheet is kept while its `id` stays. A new `id` is a new sheet, with an empty body.
  - `tabs: null`, `target: null`, `chip: null`, `banner: null`, `toast: null` and `sheet: null` remove what was there.
- **Lifecycle guarantees:**
  - `dispose()` is safe to call twice. After it, `update()`, `suspend()` and `resume()` do nothing, `layout()`, `slot()` and `sheetBody` are `null`, and no callback fires.
  - `slot('clock')`, `slot('cover')` and `stage` are the same elements for the shell's whole life, concealment included, so what Frontend mounts in them stays.
- **The cover** (`slot('cover')`): a layer exactly over the stage. It lies above everything the stage holds, including the room scene's tags, which stack inside the stage, and under the bars, the target bar, the chip, the banner, the toast and the sheet.
  - It takes no taps itself: content that should catch them sets `pointer-events: auto` on its root.
  - Mount the vote's result window there (#267). The shell leaves it as it is while concealed, as it does the stage: the component mounted there hides itself.
  - **Its reach (0.2.3), public.** The shell sets two lengths on its root, which a part in the cover can read: `--ms-ps-cover-top` and `--ms-ps-cover-bottom`, the cover's distance from the phone's top and bottom edges.
    - With the bars at 390 × 844 they are 99 and 92 px; with no bar the top one is 0; with the private talk's buttons the bottom one is 0; edge to edge both are 0.
    - The shell places its cover by them, so they always say where it is.
    - A part the pack draws over the whole phone reaches past the cover by them: `top: calc(0px - var(--ms-ps-cover-top, 0px)); bottom: calc(0px - var(--ms-ps-cover-bottom, 0px))`. The round stamp (#288) does this to centre on the phone, as the pack's frame does. Mounted outside the shell, both fall back to 0.
    - These two are the shell's only public custom properties. Its others are its own and may change.
- **Edge to edge** (`edge: true`): the stage and the cover fill the whole shell, from the top edge to the bottom edge, under the safe areas and under any bar or tabs. It is for a full-screen film or poster, which the pack draws at `inset: 0`.
  - The bar's glass lies over the stage, as over the pack's ship travel poster (sheet 41).
  - `layout().bars` is then `{ top: 0, bottom: 0 }`. `layout().safe` gives the safe areas, so the component keeps its own controls clear of them, as the pack's Skip film sits `safe.bottom + 14` px above the foot.
  - The room scene and the board stay between the bars: they are framed to the stage's box.
- **The overlays keep the bar's place.** The target bar, the banner, the toast and a large sheet start under where the top bar ends, with or without a bar. On its bar-less films the pack's `--top` keeps the bar's height, so "Rejoined" sits under the film's clock chip (sheet 18).
- **The layers, as the pack's:** a docked sheet lies over the cover, the target bar, the chip and the reconnecting banner. The toast stays above the sheet.
- **The sheet stays below the banner (0.2.0).** While the reconnecting banner shows, a docked sheet stays 8 px below it. So Retry and the sheet's Close are both in sight, and when the banner goes, the sheet docks at its place again. Before, a large sheet, such as the ballot, covered Retry; the Gameplay builder found it on the Vote test page. The banner keeps its layer, under the sheet.
- **A footer's actions (0.2.4).** A footer action stands for a command, so it is refused while reconnecting, with the banner's words.
  - **`local: true`** marks one that is this phone's own, as Back, Close and the head actions are: a recovery code's Reveal, Hide and Copy, or a confirm's Keep playing (Host controls, #295). It works while reconnecting, reports through the same `onSheetAction`, and stands for no command. Before 0.2.4, a revealed code's Hide was refused while reconnecting, so the private code stayed on screen.
  - **`kind: 'warn'`** draws the kit's warn button, the pack's `.btn-warn`: no fill, a 2 px ring in paper. The pack draws the confirm's Abort match with it (`screens-more.mjs`, sheet 15). `primary` and `secondary` are as before, and any other kind is drawn as secondary.
- **The bar's glyph (0.2.2).** Its icon is drawn at the pack's 24 px, which `.tb-glyph` leaves at the icons' default. 0.1.0–0.2.1 drew it at 22 px. The Pre-game builder's character selection agreement found it, and the shell's agreement now compares the glyph's icon too.
- **The sheet's footer at larger text (0.2.1).** Under 19 em across, footer buttons that no longer fit side by side take a row each, in order, at full width, and a label that still doesn't fit wraps inside its button. This is #228's `.sheet-foot` rule. Before, "Register Rescue" ran past the sheet's edge at 200 %; the Gameplay builder found it on Actions.
- **The phone container (0.2.0).** The root carries the kit's `ms-k-phone`, so the kit's rows and segmented controls in its sheets and cover take the larger-text rules ([the kit's page](kit.md#styling-a-component-that-uses-it)).
  - Each mount is independent. A new match or seat is a new mount, after disposing the old one.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `interactive` | Phone | `false`: every control refuses taps (a shared display, a film over the screen) |
| `reducedMotion` | Phone | The game's Reduce motion. The device's is honoured as well |
| `insets` | Phone | `null`: the safe areas from `env(safe-area-inset-*)`; or `{ top, right, bottom, left }` in CSS px |
| `viewer` | Phone | Whose phone this is (a seat id, or `null` for a shared display). When it changes, this viewer's inputs are dropped unless the same update gives the new viewer's |
| `versions` | Public | The match's art versions, for the portraits |
| `bar` | Public | The top bar's input, below. `null`: no top bar at all, as the role stage's film. The stage then runs to the top edge, and the target bar, the banner, the toast and a large sheet keep the bar's place |
| `edge` | Phone | `true`: the stage and the cover fill the whole shell, edge to edge, under the safe areas and any bar or tabs, for a full-screen film or poster. Default `false`: the stage between the bars |
| `backdrop` | Phone | What lies behind the bars' glass and wherever nothing is drawn. `'scene'` (default): the room view's space, `#07090F`, as the pack's `.scene` lies under its bars. `'canvas'`: the phone's canvas, `#10141C` (the pack's `.ph`), for a screen with no room: the role stage, boarding, the menu, the lobby |
| `bar.kind` | Public | `'turn'`, `'phase'` or `'pair'` |
| `bar.who` | Public | Turn: `{ seat, name, character }` of the active seat |
| `bar.self` | This viewer's | Turn: whether it is this viewer's turn: "Your turn", amber |
| `bar.pair` | Public | Pair: the two people talking, as the talk is public |
| `bar.title`, `short`, `icon`, `sub`, `tone` | Public | Phase: its name, an optional short form for narrow bars (the full one stays for screen readers), its icon, the line under it, and `'dark'` for the Blackout |
| `bar.round` | Public | A whole number, or `null` |
| `bar.timer` | Public | `null`, or `{ remainingMs, urgentAtMs = 10000, ring: null \| 0…1 }` |
| `bar.promises` | This viewer's | `null` (hidden), or `{ count, open, enabled, reason }` |
| `bar.menu` | Phone | `null` (hidden), or `{ open, enabled }` |
| `tabs` | This viewer's | `null` (no tab bar: a shared display); `{ variant: 'talk', open, enabled, reasons }`; or `{ variant: 'game', view: 'room' \| 'board', open: 'actions' \| 'card' \| 'panels' \| null, hero, enabled, reasons, badges }` |
| `tabs.hero` | This viewer's | `{ mode: 'pass' \| 'vote' \| 'voted', enabled, busy, reason }`. Left out, Pass is unavailable, as the pack's `pass-off` |
| `target` | This viewer's | `null`, or `{ icon, title, sub }`: the target bar, with Cancel |
| `chip` | This viewer's | `null`, or `{ id, label, icon, tone: 'paper' \| 'steel', enabled }` |
| `banner` | Phone | `null`, or `{ kind: 'reconnecting', busy }` |
| `toast` | This viewer's | `null`, or `{ id, text, icon }`: shown once per `id`, for `TOAST_MS` (2.4 s), then it fades |
| `sheet` | This viewer's | `null`, or `{ id, title, sub, back, close, detent: 'auto' \| 'large', head: [{ id, icon, label, enabled, reason }], actions: [{ id, label, kind: 'primary' \| 'secondary' \| 'warn', icon, local, enabled, busy, reason }] }`. Every id in `head` and `actions` is the sheet's own |
| `sheet.head` | This viewer's | Icon buttons in the sheet's head, after the title and before Close, as the pack's `sheet({ actions })` draws the Card's "Hide card" (sheet 31). They are this phone's own, as Back and Close are: they work while reconnecting and stand for no command, which belongs in `actions`, the footer |

- **Privacy:** concealed, the shell drops this viewer's inputs (the tabs, the target bar, the chip, the sheet, the toast and the Promises count). Shown again, they come back only when given again. Offers given while concealed are dropped too.
- **The tab bar's shape** (game, talk or none) is kept while concealed, so the stage keeps its size.
- **The shell decides nothing:**
  - `enabled: false` and `reason` come from Frontend: from the projection's offers and reasons, or its own words.
  - The shell never works out availability or a reason from the rules.
  - It shows the clock as given and never counts it down.

## Callbacks

Each reports a tap, and only that.

| Callback | When |
| --- | --- |
| `onTab(key)` | A tab: `'switch'`, `'actions'`, `'card'` or `'panels'`. During a talk: `'promises'` or `'my-card'`. Switching views is Frontend's local navigation, and never sends `MOVE` |
| `onHero(mode)` | The round button: `'pass'`, `'vote'` or `'voted'`. On `'pass'` Frontend opens the "Pass your turn?" sheet, whose Pass action then sends `PASS_TURN` |
| `onPromises()`, `onMenu()` | Promises and ⋮ in the top bar |
| `onCancelTarget()` | The target bar's Cancel |
| `onChip(id)` | The floating chip |
| `onRetry()` | The reconnecting banner's Retry |
| `onSheetAction(id, sheetId)`, `onSheetBack(sheetId)`, `onSheetClose(sheetId)` | A sheet's buttons: `onSheetAction` reports the footer's and the head's |
| `onLayout(layout)` | The bars or the stage changed size: text size, insets, a tab bar shown or hidden, the phone's size |
| `onFocusReturn({ intent, value })` | The focused control ended (a sheet closed, the target bar left): the focus is on the shell, for Frontend to move on |

**The controls, as in the room scene** (the kit's control policy, `createControlPolicy()`, which every Designer component shares):
- One delegated listener; pointer and keyboard both arrive as the button's `click`.
- **Refused:** a control that is unavailable (`enabled: false`), busy, or not taking taps now. It keeps its focus and carries `aria-disabled="true"` (or `aria-busy`).
- **Its reason** is its accessible description (`aria-describedby`).
- **Dimmed:** only an unavailable control, as the pack draws it.
- **Reconnecting** (`status: 'stale'`):
  - only Retry, ⋮ and a sheet's back, close and head actions, and its footer's local actions, take taps;
  - the rest are refused, described by "Controls return when the match is current";
  - they keep their look, as on sheet 45.
- **If Integration records the appearance/function split** ([6886927938](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6886927938)), these controls move into Frontend's shared functional module, with the same markup and classes, and the shell and its preview import that module.

## States

| State | Drawn |
| --- | --- |
| A turn | The active player's portrait, name and "Player n · Turn". Pass unavailable |
| Your turn | "Your turn" and, in amber, "Player n · Name". Pass amber |
| The last 10 s | The clock amber |
| Vote, Voted | A phase bar, the round button paper (Vote), or paper with a check (Voted) |
| The 5 s result, the 6 s presentation | The clock as a ring; no Promises (pass `promises: null`), ⋮ only |
| Blackout | The dark bar and the moon tile |
| Choosing a target | The target bar with Cancel; the round button stays (T2) |
| A sheet | Docked between the bars, glass. Pass the room scene `control: null` while one is open: the pack hides the room's own control under a sheet |
| Private talk | The pair bar; Promises and My card at the foot; the stage runs to the bottom, and `layout().covered.bottom` says how much the two buttons cover |
| A full-screen film | `bar: null`, `tabs: null`, `edge: true` (the role stage, #268): the stage edge to edge; the toast and the banner at the bar's place |
| A full-screen poster | A bar, `tabs: null`, `edge: true` (ship travel, #269): the stage edge to edge, the bar's glass over it |
| Reconnecting | The phase bar "Reconnecting…", the banner with Retry, the controls refused. The room scene dims itself (`status: 'stale'`) |
| Concealed | The bars' empty material only: no name, number, time or control, and nothing for a screen reader |
| Largest text | The pack's container queries: the handshake alone, no clock icon, the round out of the bar, a phase's short title, the two-line title |

**Motion:**
- A sheet slides in (220 ms) and a toast drops in.
- With Reduce motion, the game's or the device's, both fade in 80 ms, and the busy spinners stand still.
- Suspended, nothing runs.

## Frontend's connection

1. **Mount** the shell once for the match screen, mount the room scene in `shell.stage`, and connect `onLayout` to the room scene's `size`.
2. **Map the presentation model** (`PlanetScreenModel`):

   | Input | From |
   | --- | --- |
   | `status` | `concealed` → `'concealed'`; `connection` `'live'` → `'live'`; `'connecting'`, `'stale'` or `'error'` → `'stale'` |
   | `viewer` | `ownSeatId` (`null` on a shared display) |
   | `bar` | A turn when not `dark`, the phase is `ORDINARY_TURN` and `activeSeatId` is set, from `identities`. A pair on the two talking phones (`talk`). Otherwise the phase, with today's names (`render.mjs` `phaseNames`). `round`; `phase.remainingMs` while trusted, with `ring` for `VOTE_RESULT` and `BLACKHOLE_PRESENTATION`; `tone: 'dark'` while `dark` |
   | `bar.promises` | `{ count: promiseOfferCount, open: panel === 'promises' }` on a player's phone; `null` on a display and during the two fixed presentations |
   | `bar.menu` | `{ open: panel === 'settings' }` |
   | `tabs` | `null` on a shared display; `{ variant: 'talk' }` on the two talking phones; else the game's, with `view` the scene mode and `open` the panel |
   | `tabs.hero` | In `JAIL_VOTE` or `CAPTAIN_ELECTION`: `'voted'` when `ownBallot.phaseId` is the phase's, else `'vote'` with `enabled: canVote`. Otherwise `'pass'` with `enabled: canPass`, and `busy` while its request is sending |
   | `target` | While `action.step` is `targets` or `slots`: `action.label` and `action.prompt` |
   | `banner` | `{ kind: 'reconnecting', busy: recovery?.status === 'checking' }` while stale |
   | `sheet` | The open panel's frame; "Pass your turn? · The turn goes to Name · Player n", with Cancel and Pass |

3. **Leave none of the old renderer's header, nav or Pass button active** beside the shell.
4. **Food's gauge:** mount it in `shell.slot('clock')`, wrapped as today (`span.planet-food`). The frozen Food release keeps drawing it.
5. **Captures:** take them from the deployed candidate or under the production headers, at 390 × 844 and 430 × 932: a turn, your turn, the ballot, the result, the Blackout, a target, a sheet, reconnecting and concealed. Designer then gives visual acceptance in the PR.

## Integration's part

- **Admit the graph:** admit `phone-shell/phone-shell.mjs`, `phone-shell/phone-shell.css`, `kit/kit.mjs` and `kit/kit.css` with the room scene's graph (`icons.mjs` is already in it). The kit is admitted once, for every Designer component that uses it.
  - The shell has no pictures of its own.
  - `preview/` and `review/` stay out.
- **The pinned pack:** `prototype/ui.mjs` and `kit.css` stay pinned for the Food release. When their pins move, they can import the shell.

## Not in this version yet

Listed, not omitted:

| What | Waiting on |
| --- | --- |
| The sheets' contents: the Actions tiles, Card, Panels, Promises, Settings and the ballot | Their components, next |
| The private-talk capsule in the stage | Its component, next |
| The board in the stage, and its "List" | Its component, next |
| A shared display's own top bar | Its sheet; a display uses the bar without Promises or ⋮ today |
| The room scene's name tags at the largest text: they meet at 320 × 568 with 200 % text (the `large` capture) | The room scene, #228 |

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/phone-shell.test.mjs` | 8 of 8: the runtime-safe graph (the kit's files in it), every style scoped (a kit control styled only inside the shell's own parts), the pinned pack unchanged, the pack's words, the clock, the inputs' refusals, the privacy rules and the check's record |
  | `packages/design-tokens/test/kit.test.mjs` | 6 of 6, with the kit's own check: every builder agrees with the pinned pack's ([the kit's page](kit.md)) |
  | `npm run test:design` | 383 of 383 |
  | `npm run test:tooling` | 337 of 337 |
  | `npm run test:frontend` | Pass, with the production exclusion: no fixture, test or development module reachable |
  | `check:toolchain`, `check:workspace`, `check:sources`, `typecheck`, `check:browser-dependencies` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/phone-shell-check.mjs`:**
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy as on `main` after #260 (`design/tools/lib/component-check.mjs`, which every Designer component's check shares).
  - **Captures:** sixteen states at 390 × 844 and 430 × 932, and the Largest text at 320 × 568: 33 of 33 pass, each drawing what its state asks.
    - The 5 s result carries a stand-in for the vote's result window in the cover.
    - `film` draws no top bar and runs edge to edge, with the reconnecting banner at the bar's place (107 px at a 47 px safe area).
    - `poster` runs edge to edge under a phase bar, with no tabs.
    - `card` draws the Card sheet's "Hide card" in the head, before Close.
  - **The lifecycle probe** (`preview/probe.mjs`): 22 of 22 checks pass.
    - **As the page comes (21):** focus, refused taps, reconnecting, privacy, the clock, layout, the layers, larger text, no bar, edge to edge, the cover's reach, the backdrop, head actions, the footer's actions, the toast, the large-content view, dispose and motion.
      - **The backdrop:** the room view's space (`#07090F`) by default, the phone's canvas (`#10141C`) with `backdrop: 'canvas'`, and any other value refused.
      - **No bar:** the stage runs to the top edge, and the banner and the toast keep the bar's place (107 and 109 px at a 47 px safe area).
      - **Edge to edge:** the stage and the cover fill the shell, the bar's glass lies over the stage, `layout()` gives the safe areas (also when only they change), the overlays stay put, and `edge: 'yes'` is refused.
      - **The cover's reach (0.2.3):** a part in the cover that reaches past it by `--ms-ps-cover-top` and `--ms-ps-cover-bottom` fills the whole phone, 0 px from each edge, in all four cases. The cover itself lies 99 and 92 px from the edges with the bars, 0 and 92 with no bar, 99 and 0 with the private talk's buttons, and 0 and 0 edge to edge.
      - **Head actions:** "Hide card" sits after the title and before Close, keeps its element and the focus through updates, reports `onSheetAction('hide', 'card')`, is taken while reconnecting (a footer action is not), is refused with its reason when unavailable, and returns the focus when it goes.
      - **The footer's actions (0.2.4):** the confirm's Abort match (`warn`) draws the kit's warn button: no fill, a 2 px ring in its paper ink. Keep playing is secondary, and an unknown kind is drawn as secondary. While reconnecting, Keep playing and a code's Hide and Copy (`local`) are taken and Abort match is refused, described by the banner's words. `interactive: false` refuses a local action too, and live, Abort match is taken.
      - **The layers:** the cover is over the stage and above a z-index 3150 inside it; the target bar, the banner and the toast are each over the cover; over a large sheet the toast stays on top and the banner under.
        - While the banner shows, the large sheet docks 8.3 px below it: the banner, Retry and the sheet's Close each take a tap at their centre. Without the banner, the sheet docks back at its place.
      - **Larger text** (`large`), in the shell's sheet at 390 × 844, measured at 200 % (12.2 em across) and 100 % (24.4 em):
        - At 200 %, the two rows' values sit under their titles. The three word options stack, each label whole, and 7 · 8 · 9 stays a row.
        - At 200 %, the footer's "Cancel" and "Register Rescue" take a row each, inside the sheet, each label whole (0.2.1).
        - At 100 %, the values sit beside their titles, nothing overlaps, both controls are rows, and the two footer buttons share one row.
    - **With the device's Reduce motion emulated (1):** motion.
  - **The agreement with the pinned pack** (`preview/agree.mjs`): 7 of 7 cases.
    - The cases: a turn, your turn, the 5 s result, a private talk, the Blackout, and your turn and the result at 200 % text on 320 × 568.
    - In each case 10 to 15 parts sit in the same place, with the same words and states.
  - **Page health:** no page errors and no failed requests. The one policy report is the known one, Zod's eval probe, which Zod catches and which the live game's own bundle also has.
  - **Where the record is:** the captures and `check.json` are in `review/`, with each check and what it saw.
    - Recorded on `48e9c815`, with kit 0.5.1 and shell 0.2.3, and the source clean. Against `3dd75ce2`'s record (shell 0.2.2), 18 captures differ by at most 464 pixels, all inside the room's picture (its ambient motion), and three not at all; the cover's reach moves nothing, and the probe measures it.
    - Before: `3dd75ce2`, with kit 0.5.1 and shell 0.2.2. Before: `409fa496`, shell 0.2.1. Before: `4429def4`, with kit 0.5.0 and shell 0.2.0 (the sheet below the banner, the phone container). Earlier: `4e25b247`, with kit 0.3.0, the cover, no-bar mode with the overlays at the bar's place, `edge`, head actions and the backdrop.
    - Against `4e25b247`'s record, 18 captures differ by at most 809 pixels, all inside the room's picture (its ambient motion), and `430x932-card` not at all. No capture shows the banner with a sheet; the probe measures that.
    - Against `b51b715c`'s record, only `film` changed (edge to edge, the banner at the bar's place); `poster` and `card` are new. Every other capture differs by at most 325 pixels, in the room's ambient motion.
    - **At the game's text size:** the preview's root is now the browser's 16 px, as the game's. Until `10496d18` it forced 14 px, so every rem-sized word in the shell and the room scene drew an eighth small. The bars keep their pixel minimums (99 and 92 px at 390 × 844); the words and the room's tags are larger. The agreement with the pack, drawn in the same page, holds at 16 px.
    - Against `10496d18`, before these, the captures differ by the larger words, which is the fix, and by noise in the room's ambient motion.
    - **The room scene in the stage:** its name tags and its control measure exactly as in the room scene's own preview, all nine elements, with the same font, size, weight, line height and colour (checked on `aea6dab4`). The first record, on `82a1e189`, had the shell's resets reaching into the stage, and its tags were 8 px narrower; `cbd6ae89` scoped the resets to the shell's own parts.
    - The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the room scene's.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
