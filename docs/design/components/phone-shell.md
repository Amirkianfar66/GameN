# Phone shell: Designer's runtime component

**Version:** `phone-shell-0.2.10`, with `component-kit-0.8.0`. **Status (16 November 2026):** built to the interface proposed on #4 ([6895584303](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6895584303)), ready for Frontend's review. It is not in the game yet. Integration first admits its three files to the hosted build. It is not a release. It is stacked on the room scene (#261), whose `icons.mjs` it shares and which its preview mounts in the stage.

**What it is:** the match's frame on a phone, as the phone pack draws it. The game imports it as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects data, actions, navigation and lifecycle, and does not rebuild, restyle or copy it.

**Covers:**
- **The top bar** (sheets 07, 08, 27.6 and 56):
  - a turn, your turn, a phase, a private talk, and the Blackout's dark;
  - the words of each game step with no active player, from Before turns to "The ship moved" (0.2.10, [below](#the-phase-bars-words));
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
  - an eliminated player's banner, "You're out · You can watch. Your role stays private.", words only (sheet 44's Eliminated frame, 0.2.8);
  - a toast, the kit's (0.2.8), which takes no tap.
- **The docked sheet's frame:** clear glass over the room (the owner's 56 %), solid under Reduce transparency, with its title, back, close, scrolling body and footer actions. "Pass your turn?" (27.3) is one.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `phone-shell/phone-shell.mjs` | `mountPhoneShell()`, `nextPhoneShellInput()`, `checkBar()`, `checkTabs()`, `clockText()`, `seatNumber()`, `PHONE_SHELL_DEFAULTS`, `PHONE_SHELL_VERSION`, `HERO_WORDS`, `RECONNECTING`, `TOAST_MS`, `GAME_TABS`, `TALK_BUTTONS` |
| `phone-shell/phone-shell.css` | Every style, scoped under `.ms-phone-shell`. It imports the kit's styles |
| `phone-shell/phase-bars.mjs` | The phase bars' words (0.2.10): `phaseBar()`, `movedBar()`, `loadingBar()`, `reconnectingBar()`, `phaseClosedToast()`, `PHASE_WORDS`, `PHASE_BAR_PHASES`, `PHASE_BAR_REFUSED`. It imports the shell only for `clockText()`, and the shell does not import it |
| `kit/kit.mjs`, `kit/kit.css` | The shared component kit (`component-kit-0.8.0`, [its page](kit.md)): the shell's buttons, icon buttons, toast and control policy are the kit's, as every Designer component's are |
| `icons.mjs` | The phone interface's icon family (from #261) |
| `phone-shell/preview/` | Development only: the preview on the pack's synthetic fixtures with the room scene in the stage, the lifecycle probe (`probe.mjs`), the agreement with the pack (`agree.mjs`) and the pack's own bar for each game step (`phase-cases.mjs`) |
| `phone-shell/review/` | The check's captures and `check.json` |

**Used unchanged:** `apps/game/hosted/crew-runtime.mjs`'s `crewPortraitVariable`, for the turn's and the talk's portraits, through `@mothership/contracts`. The shell does not import the room scene: Frontend mounts that in the stage.

**One source:**
- The shell's looks are the pack's: `design/phone-ui/prototype/ui.mjs` (`topBar()`, `tabs()`, `sheet()`) and `kit.css`.
- Those two files are pinned byte for byte by the frozen Food release (`docs/integration/food-consumer-source-2026-11-13.json`), so they stay as they are. `phone-shell.test.mjs` checks they are unchanged.
- **The agreement:** the check draws the pinned `topBar()` and `tabs()` beside the shell in the same page, from the same inputs, and compares every part.
  - **What is compared:** the words, the states (open, unavailable, the round button's mode and name), and where each part sits.
  - **Cases:** five, plus two at 200 % text on 320 × 568.
  - **The phase bars (0.2.10):** each bar the pack draws for a game step, the pack's own input to `topBar()` beside the shell drawing what `phase-bars.mjs` returns: fifteen, two of them again at 200 % text. They also compare the clock: amber or not, a ring or not, and the ring's share.
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
- **The layers, as the pack's:** a docked sheet lies over the cover, the target bar, the chip and either banner. The toast stays above the sheet.
- **The sheet stays below the banner (0.2.0).** While the reconnecting banner shows, a docked sheet stays 8 px below it. So Retry and the sheet's Close are both in sight, and when the banner goes, the sheet docks at its place again. Before, a large sheet, such as the ballot, covered Retry; the Gameplay builder found it on the Vote test page. The banner keeps its layer, under the sheet.
- **An eliminated player's banner (0.2.8).** `banner: { kind: 'out' }` draws sheet 44's Eliminated frame: "You're out" over "You can watch. Your role stays private.", with the pack's eliminated icon and no action.
  - The pack draws both banners with one builder (`ui.mjs` `banner()`), so they share one look, place and layer, and a docked sheet stays below this one too. The agreement compares both with the pack's, and this one at the Largest text on 320 × 568, where its line wraps.
  - It changes no control. What an eliminated player can still open (the Card, Panels, the Board) and what they can't (Actions, Pass) is what Frontend gives in `tabs`, as the pack's frame draws it.
  - It is this viewer's: dropped while concealed and for a new viewer, unless the same update gives the new viewer's own. The reconnecting banner is the phone's, and a new viewer keeps it.
  - While reconnecting, Frontend gives the reconnecting banner in its place, since Retry is the way back. The shell draws the one kind it is given, and draws a new kind afresh.
- **The toast is the kit's (0.2.8, kit 0.8.0).** The shell draws its toast with `kit.toast` and sets `--ms-k-toast-top` to the overlays' place. It looks and moves as before. It now takes no tap: a tap where it lies reaches what is under it, such as a sheet's Close or a part in the cover. How long it shows (`TOAST_MS`) and once per `id` stay the shell's. The Pre-game builder wrote the patch, so the lobby's toast (#287) is the same one.
- **The phase bars' words (0.2.10).** `phase-bars.mjs` holds the pack's words for each game step with no active player, and returns the shell's `bar` from the facts Frontend gives ([the words and the inputs](#the-phase-bars-words)).
  - Before, the shell drew whatever words it was given, and only the votes had theirs (#267): every other phase showed the game's own names, such as "Round begins".
  - The shell draws as before, and does not import the words. Nothing of its looks, layout or inputs changed.
  - The preview's `dark`, `stale`, `target-stale` and `poster` states now call the functions. `dark` and its agreement case said "Lights out" at 18 s, which were the preview's own words and longer than the 15 s phase. They now draw the pack's specimen: "Dark · positions fixed" at 8 s, amber.
- **An unavailable Vote is paper (0.2.10).** The round button's mode rules now follow its unavailable rule, as the pack's cascade has them (`kit.css`: `.hero[data-mode="vote"]` after `.hero[aria-disabled="true"]`). So an unavailable Vote, the 5 s result's (sheet 38), is paper with dimmed words, as the pack draws it. Before, it was steel.
  - The shell connection (#307) found it in the real app. The agreement compared the round button's mode and state, not its colours.
  - It now compares the round button's fill and its words' colour in every case, and `phase-result` holds the unavailable Vote.
  - Pass, unavailable, stays steel, as the pack draws it.
- **⋮ on a shared display (0.2.10, the handoff only).** A display keeps ⋮: Settings is the one sheet a display opens, with its preferences and, when it hosts, the host's controls. The handoff said a display uses the bar "without Promises or ⋮ today", which would have left a hosting display without its controls in a match. The shell drew ⋮ whenever it was given, so nothing in it changes.
- **The target bar below a banner, and at the Largest text (0.2.9).** Two findings from the Gameplay builder's Move test page.
  - **Below a banner.** While a banner shows, the target bar stays 8 px below it, as a docked sheet does (0.2.0).
    - Before, the two sat at the same place with the banner over the bar, so Retry lay over the bar's Cancel.
    - Cancel works while reconnecting (0.2.7), so it has to stay in reach.
  - **At the Largest text.** Under 14 em across (200 % text on the 390 and 430 px phones), the bar's words keep the whole width beside its icon, and Cancel goes under them, lined up with the words.
    - Before, the words stood in a narrow column beside Cancel, many lines deep: the bar grew to about 290 px at 390 × 844.
    - Every word still shows, at its full size.
  - **The chip** wraps its label at that size instead of cutting it ("Other rooms on th…").
  - **Not solved yet:** a tall bar can still lie over an offered place near the top of the room, as Room A's A5 at 200 %. The same places stay offered on the Board. Keeping offered places clear of the overlays needs the room scene's framing to know what the overlays cover, which is the room scene's next change.
- **The target bar's Cancel while reconnecting (0.2.7).** It only ends the choosing on this phone, so it works while reconnecting, as Back and Close do. Before, it was refused with the banner's words, so a player who had started choosing a target couldn't leave the choosing until the match was current again. The Gameplay builder asked for it after making Actions' Cancel and Done local. The tabs, the chip and the hero stay refused while reconnecting, as sheet 45 draws them.
- **The private talk's two buttons at larger text (0.2.6).** Under 19 em across, Promises and My card take the sheet footer's rule: side by side in equal halves while their words fit, a row each when they don't. What docks above them, a sheet or the chip, stays 10 px clear by their measured height (`--ms-ps-talk-h`), and `layout().covered.bottom` says how much of the stage's foot they cover, so the capsule can keep its tags above them.
  - Before, at the Largest text on a 320 px phone, the two stayed on one row, "My card" ran past the phone's edge, and a docked sheet covered them by 21.6 px. The Gameplay builder found it on the private talk.
  - At the Standard text nothing changes: the pack's two equal columns, 50 px high.
- **The sheet's head with Back (0.2.5).** The title starts where the pack's does: the head keeps its 18 px left padding, then Back (44 px) and a 10 px gap, so the title and its line start at 72 px. 0.1.0–0.2.4 cut the padding to 8 px when Back led, so the title started at 62, and at the Largest text a line under it that the pack wraps stayed on one. The Pre-game builder's Host controls agreement found it. The shell's own agreement had no sheet; it now compares a docked sheet with Back (below).
- **A footer's actions (0.2.4).** A footer action stands for a command, so it is refused while reconnecting, with the banner's words.
  - **`local: true`** marks one that is this phone's own, as Back, Close and the head actions are: a recovery code's Reveal, Hide and Copy, or a confirm's Keep playing (Host controls, #295). It works while reconnecting, reports through the same `onSheetAction`, and stands for no command. Before 0.2.4, a revealed code's Hide was refused while reconnecting, so the private code stayed on screen.
  - **`kind: 'warn'`** draws the kit's warn button, the pack's `.btn-warn`: no fill, a 2 px ring in paper. The pack draws the confirm's Abort match with it (`screens-more.mjs`, sheet 15). `primary` and `secondary` are as before, and any other kind is drawn as secondary.
- **The bar's glyph (0.2.2).** Its icon is drawn at the pack's 24 px, which `.tb-glyph` leaves at the icons' default. 0.1.0–0.2.1 drew it at 22 px. The Pre-game builder's character selection agreement found it, and the shell's agreement now compares the glyph's icon too.
- **The sheet's footer at larger text (0.2.1).** Under 19 em across, footer buttons that no longer fit side by side take a row each, in order, at full width, and a label that still doesn't fit wraps inside its button. This is #228's `.sheet-foot` rule. Before, "Register Rescue" ran past the sheet's edge at 200 %; the Gameplay builder found it on Actions. Buttons that do fit side by side keep the pack's equal halves (0.2.5): 0.2.1–0.2.4 grew each from its own words, so Hide and Copy at 200 % were 169 and 179 px where the pack draws two 174 px halves.
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
| `banner` | Phone, or this viewer's | `null`; `{ kind: 'reconnecting', busy }`, the phone's; or `{ kind: 'out' }`, an eliminated player's, which is this viewer's (0.2.8) |
| `toast` | This viewer's | `null`, or `{ id, text, icon }`: shown once per `id`, for `TOAST_MS` (2.4 s), then it fades |
| `sheet` | This viewer's | `null`, or `{ id, title, sub, back, close, detent: 'auto' \| 'large', head: [{ id, icon, label, enabled, reason }], actions: [{ id, label, kind: 'primary' \| 'secondary' \| 'warn', icon, local, enabled, busy, reason }] }`. Every id in `head` and `actions` is the sheet's own |
| `sheet.head` | This viewer's | Icon buttons in the sheet's head, after the title and before Close, as the pack's `sheet({ actions })` draws the Card's "Hide card" (sheet 31). They are this phone's own, as Back and Close are: they work while reconnecting and stand for no command, which belongs in `actions`, the footer |

- **Privacy:** concealed, the shell drops this viewer's inputs (the tabs, the target bar, the chip, the sheet, the toast, an eliminated player's banner and the Promises count). Shown again, they come back only when given again. Offers given while concealed are dropped too.
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
  - only Retry, ⋮, the target bar's Cancel (0.2.7) and a sheet's back, close and head actions, and its footer's local actions, take taps;
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
| The 5 s result, the 6 s presentation | The clock as a ring; no Promises (pass `promises: null`; `phaseBar()` drops it for the 6 s presentation), ⋮ only |
| Blackout | Lit, the sun tile and "Lights out in 0:03"; dark, the dark bar and the moon tile (`phaseBar()`). The line counts down each second: the bar's left part is built again, and its height and its right side stay where they are |
| Choosing a target | The target bar with Cancel; the round button stays (T2) |
| A sheet | Docked between the bars, glass. Pass the room scene `control: null` while one is open: the pack hides the room's own control under a sheet |
| Private talk | The pair bar; Promises and My card at the foot; the stage runs to the bottom, and `layout().covered.bottom` says how much the two buttons cover |
| A full-screen film | `bar: null`, `tabs: null`, `edge: true` (the role stage, #268): the stage edge to edge; the toast and the banner at the bar's place |
| A full-screen poster | A bar, `tabs: null`, `edge: true` (ship travel, #269): the stage edge to edge, the bar's glass over it |
| Reconnecting | The phase bar "Reconnecting… · Showing Round n as last seen" from `reconnectingBar()`, the banner with Retry, the controls refused. The room scene dims itself (`status: 'stale'`) |
| Eliminated | `banner: { kind: 'out' }`: "You're out · You can watch. Your role stays private.", words only, over the room the player watches, where they lie down in their place. The controls are as Frontend gives them: Actions and Pass unavailable (sheet 44) |
| Concealed | The bars' empty material only: no name, number, time or control, and nothing for a screen reader |
| Largest text | The pack's container queries: the handshake alone, no clock icon, the round out of the bar, a phase's short title, the two-line title |

**Motion:**
- A sheet slides in (220 ms) and a toast drops in.
- With Reduce motion, the game's or the device's, both fade in 80 ms, and the busy spinners stand still.
- Suspended, nothing runs.

## The phase bars' words

`phase-bars.mjs` (0.2.10) gives the top bar its words for each game step with no active player, as the pack draws them: sheet 07's specimens, with the screens of sheets 21, 30, 40, 41, 44 and 45. Frontend gives the facts and passes the result to the shell as `bar`:

```js
import { phaseBar, movedBar, loadingBar, reconnectingBar, phaseClosedToast } from '…/design/phone-ui/components/phone-shell/phase-bars.mjs';

shell.update({ bar: phaseBar({ phase: view.phase.kind, round: view.round, remainingMs, hasOfficer, blocked, promises, menu }) });
shell.update({ toast: phaseClosedToast({ id: closedPhase.id }) });   // sheet 45, once per closed phase
```

- `phaseBar({ phase, round, remainingMs, durationMs, own, chooser, hasOfficer, blocked, dark, lightsOutMs, office, promises, menu })`: `phase` is the projection's `phase.kind`, as it is.
- `movedBar({ round, promises, menu })`, `loadingBar({ index, total })` and `reconnectingBar({ round, promises, menu })`: three bars the pack draws that are not a phase of the projection.
- `phaseClosedToast({ id })`: the shell's toast, "That phase closed · choices cleared", with the pack's info icon. The id is the closed phase's, so it shows once.

**The words:**

| `phase` | When | Title | Line under it | Icon | Clock | Drawn on |
| --- | --- | --- | --- | --- | --- | --- |
| `PRE_TURN` | An Officer, and no block shown yet | Before turns | Officer block · Blackhole | `hourglass` | Amber in the last 10 s | 07 |
| | A block is shown, or there is no Officer | Before turns | Turns start at 0:00 | `hourglass` | Amber in the last 10 s | 21, "Officer's block shown" |
| | The Officer's own phone | Block a move | Before turns · Officer | `officer` | Amber in the last 10 s | 40 |
| `OFFICER_APPOINTMENT` | Everyone else | New Officer | Ben chooses | `officer` | Never amber | 07, 40 |
| | The Captain's own phone | Appoint Officer | Random if time runs out | `officer` | Amber in the last 10 s | 40 |
| `BLACKOUT` | Lit | Blackout | Lights out in 0:03 | `lit` | Amber in the last 10 s | 07, 30 |
| | Dark | Blackout | Dark · positions fixed | `dark`, with `tone: 'dark'` | Amber in the last 10 s | 07, 30 |
| `BLACKHOLE_PRESENTATION` | | Ship synchronized | None | `blackhole` | A ring of the share of the phase gone. Never amber. No Promises | 07, 44 |
| `NAV_SETTING`, `NAV_TIE`, `NAV_CAPTAIN_CONFIRM`, `NAV_OFFICER_CONFIRM` | Everyone else | Setting course | The offices are setting it | `course` | Never amber | 41 |
| | An office's own phone | Setting course | Captain · private, or Officer · private | `course` | Amber in the last 10 s | 41 |
| `movedBar()` | | The ship moved | Round 3 complete | `course` | None | 41 |
| `loadingBar()` | | Loading the ship | Room 3 of 5 | `hourglass` | None. No round, Promises or ⋮ | 45 |
| `reconnectingBar()` | | Reconnecting… | Showing Round 3 as last seen | `retry` | None | 07, 45 |

- **Before turns, in order:** the Officer's own phone first; then a block shown; then whether there is an Officer.
  - Round 1 opens before turns with no Captain and no Officer, and a Blackhole needs its player to hold an office. So with no Officer the bar says "Turns start at 0:00", which is always true, and names no block or Blackhole that cannot happen.
  - The pack draws no round without an Officer. This fills that state with the pack's own line (the Lead's decision, 16 November 2026).
- **Amber means "act now".**
  - A bar under which someone may act keeps it: the deciding player's own bar, and everyone's bar before turns and in the Blackout. A hidden player may act under those two, the Alien's Blackhole and a Disabler's position, and their bar must be everyone's bar.
  - A public bar under which no one acts is never amber (`urgentAtMs: -1`): everyone else's New Officer and Setting course, and Ship synchronized.
- **No short title.** The pack gives one only to the vote results. At the Largest text these titles take two lines by the shell's bar rules, and the line under them stays for screen readers.
- **Promises and ⋮** pass through as given. They are dropped only where the pack's bar has none (`ui.mjs` `topBar()`): no Promises on Ship synchronized, and neither on Loading the ship.
- **Sheet 07's Navigation specimen is the one the functions do not reproduce.** It puts "Round 3 complete" under "Setting course". Sheet 41 is the navigation screen's own sheet: it draws "The offices are setting it" under that title, and "Round 3 complete" under "The ship moved" (the Lead's decision, 16 November 2026).

**The inputs, and where Frontend reads each:**

| Input | Audience | From |
| --- | --- | --- |
| `phase` | Public | `phase.kind` |
| `round` | Public | `round`. For `movedBar()`, `navigation.lastMovedRound`; for `reconnectingBar()`, the last round this phone saw |
| `remainingMs` | Public | `phase.endsAt` less the trusted server time. Left out, no clock |
| `durationMs` | Public | `phase.endsAt − phase.startedAt`. Only Ship synchronized uses it, for the ring |
| `own` | This viewer's office, which is public | `true` when this phone shows the deciding player's own sheet: the Captain's "Choose your Officer", or the Officer's "Block movement", choosing or done. The bar follows the sheet |
| `chooser` | Public | `{ name }`: the Captain (`offices.captainSeatId`), named from the roster as the turn bar's `who` is |
| `hasOfficer` | Public | `true` when `offices.officerSeatId` is set. It says only that the office is held, never that its holder can act: an Officer in Jail or Hospital still counts |
| `blocked` | Public | `true` when `offices.blockedSeatId` is set |
| `dark`, `lightsOutMs` | Public | `blackout.previewEndsAt` against the trusted time: `dark` once it has passed, the same fact that gives the room scene `lighting: 'dark'`; before that, the time until it |
| `office` | This viewer's office, which is public | `'captain'` or `'officer'` when this phone shows that office's private Navigation sheet |
| `index`, `total` | Phone | `loadingBar()`: the app's own count of the room pictures it loads. `index` counts from 1, so `{ index: 3, total: 5 }` is "Room 3 of 5" |
| `promises`, `menu` | This viewer's, and the phone's | The shell's own, passed through |

- **The functions decide nothing.** They read no offer, role or rule and work out no eligibility. Only `true` counts for `own`, `hasOfficer`, `blocked` and `dark`; left out, each reads as false.
- **A missing fact draws the title alone,** with no line under it: no `chooser`, no `lightsOutMs`, no count for Loading, no round for Reconnecting or "The ship moved". The bar is on every phone, so it never fails for a missing fact.
- **A phase that is another component's is refused by name,** with a `TypeError`: a turn (the shell's turn bar), the ballots and results (#267's `ballotBar()` and `resultBar()`), the private talk (`talkBar()`), Food Supply (its own bar) and the end of a match (no bar). A phase the file does not know throws too. `PHASE_BAR_PHASES` and `PHASE_BAR_REFUSED` list both, and the test holds them to the contract's phases.

**What the projection doesn't give:**

- **A time for "The ship moved".** The engine moves the ship and opens the next round's first phase in one step. The projection shows the move only as `navigation.lastMovedRound`, under the next phase. When "The ship moved" shows and for how long is Frontend's, and it has no clock, as the pack draws it.
- **"Room 3 of 5".** It is the app's own count, of the pictures it loads before the match.
- **Why an office can't act.** The projection carries only the missing offer. With no sheet, `own` is false and that phone shows everyone's bar. The pack draws nothing else for it.

## Frontend's connection

1. **Mount** the shell once for the match screen, mount the room scene in `shell.stage`, and connect `onLayout` to the room scene's `size`.
2. **Map the presentation model** (`PlanetScreenModel`):

   | Input | From |
   | --- | --- |
   | `status` | `concealed` → `'concealed'`; `connection` `'live'` → `'live'`; `'connecting'`, `'stale'` or `'error'` → `'stale'` |
   | `viewer` | `ownSeatId` (`null` on a shared display) |
   | `bar` | A turn when not `dark`, the phase is `ORDINARY_TURN` and `activeSeatId` is set, from `identities`. A pair on the two talking phones (`talk`). Otherwise the phase's own bar, by the function that holds its words: the ballots and results, #267's `ballotBar()` and `resultBar()`, with `round`, `phase.remainingMs` while trusted and the result's `ring`; Food Supply, its own bar; the end of a match, none (`bar: null`, sheet 44); every other phase, `phaseBar()`, which also gives the round, the clock, the ring and `tone: 'dark'` ([the inputs](#the-phase-bars-words)). While the phone is not live, `reconnectingBar()`; once the ship has moved, `movedBar()`; before the match, `loadingBar()` |
   | `bar.promises` | `{ count: promiseOfferCount, open: panel === 'promises' }` on a player's phone; `null` on a display and during the two fixed presentations |
   | `bar.menu` | `{ open: panel === 'settings' }` |
   | `tabs` | `null` on a shared display; `{ variant: 'talk' }` on the two talking phones; else the game's, with `view` the scene mode and `open` the panel |
   | `tabs.hero` | In `JAIL_VOTE` or `CAPTAIN_ELECTION`: `'voted'` when `ownBallot.phaseId` is the phase's, else `'vote'` with `enabled: canVote`. Otherwise `'pass'` with `enabled: canPass`, and `busy` while its request is sending |
   | `target` | While `action.step` is `targets` or `slots`: `action.label` and `action.prompt` |
   | `banner` | `{ kind: 'reconnecting', busy: recovery?.status === 'checking' }` while stale; otherwise `{ kind: 'out' }` while this viewer's own seat is Eliminated (public on the board); else `null` |
   | `sheet` | The open panel's frame; "Pass your turn? · The turn goes to Name · Player n", with Cancel and Pass |

3. **Leave none of the old renderer's header, nav or Pass button active** beside the shell.
4. **Food's gauge:** mount it in `shell.slot('clock')`, wrapped as today (`span.planet-food`). The frozen Food release keeps drawing it.
5. **Captures:** take them from the deployed candidate or under the production headers, at 390 × 844 and 430 × 932: a turn, your turn, the ballot, the result, the Blackout, a target, a sheet, reconnecting, an eliminated player's phone and concealed. Designer then gives visual acceptance in the PR.

## Integration's part

- **Admit the graph:** admit `phone-shell/phone-shell.mjs`, `phone-shell/phone-shell.css`, `phone-shell/phase-bars.mjs` (0.2.10), `kit/kit.mjs` and `kit/kit.css` with the room scene's graph (`icons.mjs` is already in it). The kit is admitted once, for every Designer component that uses it.
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
| A shared display's own top bar | Its sheet. Today a display uses the player's bar without Promises; its ⋮ opens Settings |
| A window for "The ship moved" | The projection, which opens the next round in the same step as the move. `movedBar()` holds the words; when it shows is Frontend's |

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/phone-shell.test.mjs` | 8 of 8: the runtime-safe graph (the kit's files in it), every style scoped (a kit control styled only inside the shell's own parts, and of the kit's properties only the toast's top), the pinned pack unchanged, the pack's words (both banners'), the clock, the inputs' refusals, the privacy rules (an eliminated player's banner this viewer's, the reconnecting one the phone's) and the check's record, with the phase bars' states, their agreement cases and the lit Blackout's steadiness (0.2.10) |
| `packages/design-tokens/test/phase-bars.test.mjs` | 11 of 11 (0.2.10): the runtime-safe graph, which adds no file to the shell's; every word found in the pack's own screens; each row of the words table, and the shell taking every bar; the round, the clock, Promises and ⋮ as given; the amber rule; the ring; a missing fact drawing the title alone; every phase of the contract drawn or refused by name; no offer, role or rule read; the toast; and each agreement case's pack input held to the pack's source |
  | `packages/design-tokens/test/kit.test.mjs` | 7 of 7, with the kit's own check: every builder agrees with the pinned pack's, the toast included ([the kit's page](kit.md)) |
  | `npm run test:design` | 397 of 397, after `npm run build`, with Node 22.21.1 and npm 10.9.4 (on 0.2.10's record) |
  | `npm run test:tooling` | 356 of 356 |
  | `npm run test:frontend` | Pass, with the production exclusion: no fixture, test or development module reachable |
  | `check:toolchain`, `check:workspace`, `check:sources`, `typecheck`, `check:browser-dependencies` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/phone-shell-check.mjs`:**
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy as on `main` after #260 (`design/tools/lib/component-check.mjs`, which every Designer component's check shares).
  - **Captures:** thirty states at 390 × 844 and 430 × 932, the target bar at the Largest text on both, and the Largest text at 320 × 568 for a turn and for a phase: 64 of 64 pass, each drawing what its state asks.
    - **The phase bars (0.2.10),** each bar from `phase-bars.mjs`, twelve new states: `before`, `before-start`, `block`, `appointment`, `appoint`, `lit`, `lit-next`, `synchronized`, `course-own`, `moved`, `loading` and `closed`. With `dark`, `poster` and `stale`, they draw every row of the words table.
      - Each draws the pack's title and line. `appointment` holds its clock at 0:09 and is not amber; `before-start`, `dark` and `course-own`, at 0:09 and 0:08, are.
      - `synchronized` draws the ring and ⋮ with no Promises. `loading` draws no round, Promises or ⋮. `moved` and `stale` draw no clock. `closed` draws the toast.
      - Under every one the bar is as tall as a turn's, 99 px at a 47 px safe area.
      - **The lit Blackout a second apart** (`lit`, "Lights out in 0:03" at 0:13; `lit-next`, "0:02" at 0:12): the bar, Promises, the round, the clock and ⋮ are at the same place and size in both, to a hundredth of a pixel, at both sizes. The check compares them and writes the result as `steady`.
      - `phase-large`, at 200 % text on 320 × 568: "Appoint Officer" whole on two lines, the bar inside the phone, the round out of the bar by the shell's rule.
    - `dark` (0.2.10) draws the pack's specimen: "Dark · positions fixed" at 0:08, amber, on the dark bar.
    - `target-stale` (0.2.9): the target bar 8 px under the reconnecting banner, with its Cancel the topmost thing at its centre.
    - `target-large` (0.2.9): at 200 % text, Cancel under the bar's words, the bar inside the phone, and the chip's label whole.
    - `out` (0.2.8) draws an eliminated player's phone: "You're out" without Retry, 107 px from the top at a 47 px safe area, the phone live, Actions not offered, and the viewer's figure down in its place.
    - The 5 s result carries a stand-in for the vote's result window in the cover.
    - `film` draws no top bar and runs edge to edge, with the reconnecting banner at the bar's place (107 px at a 47 px safe area).
    - `poster` runs edge to edge under a phase bar, with no tabs.
    - `card` draws the Card sheet's "Hide card" in the head, before Close.
  - **The lifecycle probe** (`preview/probe.mjs`): 26 of 26 checks pass.
    - **As the page comes (25):** focus, refused taps, reconnecting, an eliminated player's banner, privacy, the clock, layout, the layers, larger text, no bar, edge to edge, the cover's reach, the backdrop, head actions, the footer's actions, the private talk's buttons, the toast (twice), a phase bar's words, the large-content view, dispose and motion.
      - **A phase bar's words (0.2.10):** one mounted shell is given the lit Blackout's bar at each second, "Lights out in 0:03", "0:02" and "0:01", then the dark one. The bar's left part is built again each time, so no old line can stay. The bar stays 99 px, Promises, the round, the clock and ⋮ keep their elements and their places, Promises keeps the focus, and no layout is reported.
      - **An eliminated player's banner (0.2.8):** the pack's words and icon, `role="status"`, and no button. The phone is live: a tab Frontend offers takes a tap, and Actions, not offered, is described by its reason. A large docked sheet docks 8.6 px below it. Reconnecting takes its place, with Retry, and the eliminated player's comes back when given again. A new viewer drops it unless given again; concealment drops it, and it doesn't come back by itself. A new viewer keeps the reconnecting banner.
      - **The toast takes no tap (kit 0.8.0):** its computed `pointer-events` is `none`. With its pointer events on for that one measurement, it lies over a button in the cover; with them off, a tap at its centre reaches the button, once. The layers check reads the toast's paint order the same way. With `pointer-events: none` taken out, the Pre-game builder saw this check fail and the layers check still pass.
      - **The backdrop:** the room view's space (`#07090F`) by default, the phone's canvas (`#10141C`) with `backdrop: 'canvas'`, and any other value refused.
      - **No bar:** the stage runs to the top edge, and the banner and the toast keep the bar's place (107 and 109 px at a 47 px safe area).
      - **Edge to edge:** the stage and the cover fill the shell, the bar's glass lies over the stage, `layout()` gives the safe areas (also when only they change), the overlays stay put, and `edge: 'yes'` is refused.
      - **The cover's reach (0.2.3):** a part in the cover that reaches past it by `--ms-ps-cover-top` and `--ms-ps-cover-bottom` fills the whole phone, 0 px from each edge, in all four cases. The cover itself lies 99 and 92 px from the edges with the bars, 0 and 92 with no bar, 99 and 0 with the private talk's buttons, and 0 and 0 edge to edge.
      - **Head actions:** "Hide card" sits after the title and before Close, keeps its element and the focus through updates, reports `onSheetAction('hide', 'card')`, is taken while reconnecting (a footer action is not), is refused with its reason when unavailable, and returns the focus when it goes.
      - **The footer's actions (0.2.4):** the confirm's Abort match (`warn`) draws the kit's warn button: no fill, a 2 px ring in its paper ink. Keep playing is secondary, and an unknown kind is drawn as secondary. While reconnecting, Keep playing and a code's Hide and Copy (`local`) are taken and Abort match is refused, described by the banner's words. `interactive: false` refuses a local action too, and live, Abort match is taken.
      - **The private talk's buttons (0.2.6),** with a docked sheet: at the Standard text on 390 × 844, one row of two 174 px halves, the sheet 10 px above them, and `covered.bottom` 102 px. At the Largest text on 320 × 568, a row each at 288 px, inside the phone with each label whole, the sheet 10 px above them, and `covered.bottom` 128 px. Run against 0.2.5, it fails: one row of 216 and 138 px, My card past the phone's edge, and the sheet 21.6 px over them.
      - **The layers:** the cover is over the stage and above a z-index 3150 inside it; the target bar, the banner and the toast are each over the cover; over a large sheet the toast stays on top and the banner under.
        - While the banner shows, the large sheet docks 8.3 px below it: the banner, Retry and the sheet's Close each take a tap at their centre. Without the banner, the sheet docks back at its place.
      - **Larger text** (`large`), in the shell's sheet at 390 × 844, measured at 200 % (12.2 em across) and 100 % (24.4 em):
        - At 200 %, the two rows' values sit under their titles. The three word options stack, each label whole, and 7 · 8 · 9 stays a row.
        - At 200 %, the footer's "Cancel" and "Register Rescue" take a row each, inside the sheet, each label whole (0.2.1).
        - At 100 %, the values sit beside their titles, nothing overlaps, both controls are rows, and the two footer buttons share one row.
    - **With the device's Reduce motion emulated (1):** motion.
  - **The agreement with the pinned pack** (`preview/agree.mjs`): 29 of 29 cases.
    - **The phase bars (0.2.10),** in seventeen cases: the pack's own input to `topBar()` for each game step (`preview/phase-cases.mjs`) beside the shell drawing what `phase-bars.mjs` returns for it.
      - Before turns with an Officer, with a block shown, and the Officer's own; New Officer and the Captain's own; the Blackout lit and dark; Ship synchronized as sheets 07 and 44 draw it; Setting course for everyone, the Captain and the Officer; The ship moved; Loading the ship; and Reconnecting.
      - "Appoint Officer" and "Ship synchronized" again at 200 % text on 320 × 568.
      - They compare the bar, the glyph and its icon, the title, the line, Promises, the round, the clock and ⋮: boxes and words, and now the clock's state too, amber or not, a ring or not, and the ring's share to a hundredth. Every part agrees within half a pixel.
      - Nine of the pack's fifteen inputs are found in its source as one literal, `topBar({ … })`; the other six are built there from a screen's state, and each of their words is found there. The test holds both.
      - **Not compared:** sheet 07's Navigation specimen, "Setting course · Round 3 complete", which the functions do not reproduce ([why](#the-phase-bars-words)).
    - **Both banners (0.2.8),** the pack's `banner()` as sheets 45 and 44 draw them: reconnecting with Retry, and an eliminated player's, also at 200 % text on 320 × 568, where its line wraps. They compare the banner, its icon and its drawing, its two lines and Retry: boxes, words, Retry's kind and the role. All three agree, every part within half a pixel.
    - The cases: a turn, your turn, the 5 s result, a private talk, and your turn and the result at 200 % text on 320 × 568. The Blackout's dark, compared since 0.1.0 with the preview's own words, is now the pack's specimen among the phase bars.
    - **A docked sheet (0.2.5),** the pack's `sheet()` as sheet 15 draws it: a recovery code's view ("Recovery code", "Private to this phone", Back, Close, Hide · Copy), the abort's confirm (Keep playing · Abort match, `warn`), and the code's view at 200 % text on 390 × 844. They compare the sheet, its head, Back, the title and its line, Close, the footer and each footer button: boxes, words, Back's name and each button's kind.
      - Run against 0.2.4's stylesheet, all three fail: Back at 8 px where the pack's is at 18, the title and its line at 62 where the pack's are at 72, and at 200 % the line's wrap and the second footer button at 194.6 where the pack's is at 200.
    - In each case 10 to 20 parts sit in the same place, with the same words and states.
  - **Page health:** no page errors and no failed requests. The one policy report is the known one, Zod's eval probe, which Zod catches and which the live game's own bundle also has.
  - **Where the record is:** the captures and `check.json` are in `review/`, with each check and what it saw.
    - Recorded on `62c0bca4`, with kit 0.8.0 and shell 0.2.10, and the source clean. Against `97a7eebb`'s record (shell 0.2.9):
      - 25 captures are new: the twelve phase states at both sizes, and `phase-large` at 320 × 568.
      - `dark` changed at both sizes, in the bar only: its line and its clock, 10,307 pixels each, all between 57 and 90 px from the top. Before, "Lights out" at 0:18; now "Dark · positions fixed" at 0:08, amber.
      - `result` changed at both sizes, in the round button only: 12,078 and 12,076 pixels. The unavailable Vote is now paper with dimmed words, as the pack draws it.
      - 11 captures are unchanged: 8 byte for byte, and 3 with no pixel more than 32 of 255 apart. `poster` is among them, with its bar now from `phaseBar()`.
      - 24 differ in at most 316 pixels, all inside the room's picture (its ambient motion). `stale` and `target-stale`, whose bars now come from `reconnectingBar()`, are among them, in 1 to 8 pixels.
      - The in-game animation builder's run of `bb567d7e` unchanged differed from `97a7eebb`'s record the same way: 21 captures, in at most 290 pixels, all inside the room's picture.
    - Before: `97a7eebb`, with kit 0.8.0 and shell 0.2.9, and the source clean. Against `5ac3354f`'s record (shell 0.2.8):
      - 15 captures are unchanged: 13 byte for byte, and 2 with no pixel more than 32 of 255 apart.
      - 20 differ in at most 272 pixels, all inside the room's picture (its ambient motion). The target bar and the chip at the Standard text are unchanged.
      - `target-stale` and `target-large` are new at both sizes.
    - Before: `5ac3354f`, with kit 0.8.0 and shell 0.2.8, and the source clean. Against `344fcf91`'s record (shell 0.2.7):
      - 17 captures are unchanged: 12 byte for byte, and 5 with no pixel more than 32 of 255 apart.
      - 15 differ in at most 125 pixels, all inside the room's picture (its ambient motion).
      - `large` changed with room scene 0.5.0, which `bb6ef309` merged. At 200 % on 320 × 568 every name tag is now whole and apart, stacked over the people where they would meet. There the active player's tag lies over the turn mark, and its amber ring still marks the turn.
      - `out` is new at both sizes. No other capture shows a toast; the probe measures it.
    - Before: `344fcf91`, with kit 0.6.0 and shell 0.2.7, and the source clean. The target bar's Cancel taken while reconnecting moves nothing on screen; the probe's stale check measures it. Against `b5872a14`'s record, 17 captures differ by at most 161 pixels, inside the room's picture (its ambient motion), and four not at all.
    - Before: `b5872a14`, with kit 0.5.1 and shell 0.2.6. Against `239413d1`'s record (shell 0.2.5), 18 captures differ by at most 360 pixels, all inside the room's picture (its ambient motion), and three not at all, the private talk's two among them: at the Standard text its buttons are unchanged, and the probe's `talk` check measures the Largest.
    - Before: `239413d1`, with kit 0.5.1 and shell 0.2.5. Against `fa9ca980`'s record (shell 0.2.4), 19 captures differ by at most 174 pixels, all inside the room's picture (its ambient motion), and two not at all: no capture draws a sheet with Back or two footer buttons that fit at 200 %, which the agreement's sheet cases compare with the pack.
    - Before: `fa9ca980`, with kit 0.5.1 and shell 0.2.4. Against `48e9c815`'s record (shell 0.2.3), 16 captures differed by at most 199 pixels, all inside the room's picture, and five not at all. No capture shows a warn or local footer action; the probe's `footer` check measures them.
    - Before: `48e9c815`, with kit 0.5.1 and shell 0.2.3. Against `3dd75ce2`'s record (shell 0.2.2), 18 captures differed by at most 464 pixels, all inside the room's picture, and three not at all; the cover's reach moves nothing, and the probe measures it.
    - Before: `3dd75ce2`, with kit 0.5.1 and shell 0.2.2. Before: `409fa496`, shell 0.2.1. Before: `4429def4`, with kit 0.5.0 and shell 0.2.0 (the sheet below the banner, the phone container). Earlier: `4e25b247`, with kit 0.3.0, the cover, no-bar mode with the overlays at the bar's place, `edge`, head actions and the backdrop.
    - Against `4e25b247`'s record, 18 captures differ by at most 809 pixels, all inside the room's picture (its ambient motion), and `430x932-card` not at all. No capture shows the banner with a sheet; the probe measures that.
    - Against `b51b715c`'s record, only `film` changed (edge to edge, the banner at the bar's place); `poster` and `card` are new. Every other capture differs by at most 325 pixels, in the room's ambient motion.
    - **At the game's text size:** the preview's root is now the browser's 16 px, as the game's. Until `10496d18` it forced 14 px, so every rem-sized word in the shell and the room scene drew an eighth small. The bars keep their pixel minimums (99 and 92 px at 390 × 844); the words and the room's tags are larger. The agreement with the pack, drawn in the same page, holds at 16 px.
    - Against `10496d18`, before these, the captures differ by the larger words, which is the fix, and by noise in the room's ambient motion.
    - **The room scene in the stage:** its name tags and its control measure exactly as in the room scene's own preview, all nine elements, with the same font, size, weight, line height and colour (checked on `aea6dab4`). The first record, on `82a1e189`, had the shell's resets reaching into the stage, and its tags were 8 px narrower; `cbd6ae89` scoped the resets to the shell's own parts.
    - The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the room scene's.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
