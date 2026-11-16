# Sheet 44's Roles list and "Return to lobby": Designer's runtime component

**Version:** `end-roles-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on 16 November, with the answers below; the Lead posted the interface on #4 for Frontend ([6914394607](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6914394607)). The owner approved its branch on 16 November, through the Lead Designer. Built without waiting for Frontend, as the owner decided on 16 November (recorded on #280). Frontend has not connected it: it is not in the game yet, and Integration first admits its files to the hosted build. It is not a release.

**What it is:** the bottom of sheet 44, the end of a match, as the phone pack draws it in its own `end()` (`design/phone-ui/prototype/screens-more.mjs`): "Roles", a row per seat with its portrait, "4 · Dev (you)" and the role's chip with its team's colour, "Original Code: Players 2, 5, 6, 9", and "Return to lobby". It is the last open part of #222 item 8; the top of the sheet, the planet, the stamp and the title, is the end scene (#271).

**Stacked on the end scene (#271),** at `e72f7244` (`end-scene-0.1.1`: the title block holds at a 20 px root, and `layout()` says where it ends), with the phone shell's branch (#265) at `0e5a0b8a` merged (`phone-shell-0.2.8`, `component-kit-0.8.0`: the teams' colours). The list sits in the shell's cover, over the scene in its stage.

## Built on, not redrawn

- **The phone shell** (#265): `shell.slot('cover')`, a layer exactly over the stage and under the bars, banner, toast and sheet. With `bar: null, tabs: null, edge: true`, as the end scene asks, it is the whole phone. The shell draws the reconnecting banner.
- **The end scene** (#271): the planet, the stamp, the title and its line, in the shell's stage. The list takes the scene's moment (`showAt`, from its `END_BEATS`) and where its title block ends (`clear.top`) as inputs: neither component imports the other.
- **The kit** (`component-kit-0.8.0`): the group label ("Roles"), the group note (the Code), the portrait, the button ("Return to lobby": block, secondary, the `leave` icon), the control policy, and the teams' colours.
- **Its own:** the rows and chips, the pack's `.reveal-row` and `.team-chip` (the Lead's answer: the kit's row is the pack's grouped `.row`, 52 px with a 36 px portrait; `.reveal-row` has a hairline under each row, 4 px padding, a 34 px portrait and a 600 15 px name; the kit's pill is not `.team-chip`, 26 px with a colour square).

## Interface

```js
import { mountEndRoles, checkEndRoles, END_ROLES_VERSION } from 'design/phone-ui/components/end-roles/end-roles.mjs';
// with design/phone-ui/components/end-roles/end-roles.css, which imports the kit's styles
const roles = mountEndRoles(shell.slot('cover'), input, { onReturnToLobby, onFocusReturn });
// → { element, update(partial), suspend(), resume(), dispose() }
```

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `reveal` | Public | `null` | The projection's `endReveal` as projected: `{ roles: [{ seatId, role }] (7 to 9), code: [four seats] }`. Non-null only once the match is FINISHED; `null` for an aborted match |
| `roster` | Public | `[]` | `[{ seat, name, character }]`, each revealed seat's name and portrait. A seat is its number or its id |
| `teams` | Public | `null` | `{ [seatId]: 'Blue' \| 'Red' \| 'Alien' }`: **only from the projection's faction data; never mapped from the role.** No team means no colour square (Q1). Open: see "The team question" below |
| `window`, `clock` | Public | `null` | The end phase `{ id, startedAt }` and the match's trusted clock `{ now() }`, as the end scene takes them |
| `showAt` | Public | `0` | When the list comes, in ms after the end phase starts: the scene's words, `END_BEATS.arrival.words` (3.9 s) or `END_BEATS.none.words` (0.6 s) (Q2) |
| `viewer` | Phone | `null` | This phone's seat, for "(you)" and the button. `null` on the shared display |
| `safe` | Phone | `{ bottom: 0 }` | `shell.layout().safe.bottom`: the cover is edge to edge |
| `clear` | Phone | `{ top: null }` | Where the end scene's title block ends, in the cover's CSS px: the scene's `layout().titleBottom` (end-scene 0.1.1; Q3) |
| `status`, `interactive`, `reducedMotion`, `versions` | Phone | `'live'`, `true`, `false`, `null` | As every component's |

- **Callbacks:** `onReturnToLobby()` only, and it is local, as Close and Done are: no navigation and no lobby logic. `onFocusReturn(detail)` when the focused button goes (the kit's control policy).
- **Checks:** `checkEndRoles(input)` checks a whole input. Anything it does not know, at any level, is an error, and so is a reveal that does not hold together: a seat outside 1–9 or twice, fewer than 7 or more than 9, a revealed seat not in the roster, a Code that is not four distinct revealed seats, a team that is not Blue, Red or Alien, or a team for a seat not revealed. `update(partial)` changes only what it is given; `dispose()` removes everything, and afterwards nothing runs.

## What it draws

The pack's words (`end()`), in the pack's places:

- **"Roles"**, the kit's group label, with no space above it, as the pack's `marginTop: 0`.
- **A row per seat, in seat order** whatever the projection's order: the 34 px portrait, "4 · Dev" with "(you)" on the viewer's own, and the chip: the role exactly as projected, after a 10 px square in its team's colour. The square's colour is said in words beside it, visually hidden: **", Blue team"**. A screen reader hears "4 · Dev (you), Supplier, Blue team".
- **"Original Code: Players 2, 5, 6, 9"**, from `reveal.code`, in ascending order, the kit's group note. Sheet 44 crops it; the pack's `end()` draws it, and the Lead kept it.
- **"Return to lobby"**, pinned 16 px from each side and 18 px above the bottom safe area.

The list starts 58 % down the phone, or 13 px under the title block when that ends lower (Q3), and ends 82 px above the bottom safe area. It scrolls; the button stays.

**The colours** are the kit's `--ms-k-faction-blue`, `--ms-k-faction-red` and `--ms-k-faction-alien` (`component-kit-0.8.0`): the tokens' `color.factionPrivateOrRevealed` (blue `#70AFFF`, red `#FF8C8C`, alien `#C4A4FF`; `tokens-0.5.0`), the pack's `--faction-blue`, `--faction-red` and `--faction-alien`. The kit keeps them for a view that may show a team, such as the roles once the match has ended. The component declares no colour of its own, and draws a team only in a revealed row: a reveal exists only once the match is FINISHED.

## States

1. **FINISHED, any result** (Blue, Red, Blue with the Alien, no survivors): "Roles", the rows, the Code and the button.
2. **Aborted** (`reveal` null): the button only. The scene says "Match aborted".
3. **Before the words:** nothing yet; they come with the scene's words.
4. **Reconnecting** (`stale`): as last seen, and the button still works (it is local). Before the words, they wait, as the scene stands still, and come when it is live again.
5. **Concealed:** nothing is drawn or named: no name, role, team or Code stays in the page, and the root is `aria-hidden`. The public inputs are kept and drawn again when live.
6. **The shared display** (`viewer` null): no "(you)", and no button (the Lead flagged it for Frontend, should the display have a lobby flow).
7. **No team data** (`teams` null, or a seat missing): no colour square and no team said for that seat.
8. **Not interactive, or suspended:** the button is refused, with its focus kept (the control policy).

## Privacy and audiences

Everything it shows is public at the end of a match: the projection's `endReveal` exists only once the match is FINISHED, and the end reveal is the explicit reveal the tokens' usage rule asks for before a faction's colour is shown. The component works nothing out: the roles, the Code and each seat's team are the projection's, and its code names no role, so no team can be mapped from one.

## The team question (open, on #4)

`endReveal` gives each seat's role, not its team. The Lead asked Integration and Backend on #4 ([6914394607](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6914394607), question 1) whether it could carry each seat's faction, or whether the board's `revealedFaction` is set for every seat once the match is FINISHED. Until the projection carries a team, Frontend passes no `teams`, and the chips show the role with no colour square. The phone never maps a role to a team. The preview and the owner's test page draw the pack's teams, from its synthetic fixtures, to show the squares; each also shows the state with no team data.

## Accessibility

- The rows are a list named "Roles" (`aria-labelledby`).
- A chip's colour is never the only signal: its team is said in words.
- The button is refused with `aria-disabled`, never `disabled`, so its focus stays. When it goes while focused, the focus moves to the component's root and `onFocusReturn` says which ended.
- **Larger text.** Three differences from the pack, each for text the pack lets spill out or push off its row (the Lead kept them):
  - **The list's place** (Q3): it starts 13 px under the end scene's title block when that ends below 58 %, so the title is never under the list. The pack's stays at 58 % under its own.
  - **The chip** keeps its role on one line and keeps its width, and grows with its text (`min-height` 26 px, not `height`). The pack's chip may shrink, wrap its role inside its 26 px, and hold text taller than itself above 200 %.
  - **A name** too long for its line wraps, inside a word if it must, rather than pushing the chip off the row.

  The chip's and the name's rules change nothing at the Standard text, Large or Largest on these phones with the pack's names and roles: the agreement holds every box there to the pack's. They act only for a longer name or role, or text above 200 %.

## Motion

- **They come with the scene's words** (Q2): at `showAt` on the trusted clock (3.9 s for an arrival, 0.6 s for no winner), rising 8 px and fading in over 400 ms, as the words do (`END_BEATS.rise`, easeOutCubic: `cubic-bezier(0.33, 1, 0.68, 1)`). A phone that opens late, or has no clock or no end phase, shows them at once, with nothing moving. A new end phase is a new appearance, from the top of the list.
- **With Reduce motion,** the game's (`reducedMotion`, which sets `data-motion="reduced"` on the root) or the device's: at once, with one 80 ms fade, as the scene's still comes in.
- Nothing else moves.

## The Lead's answers (16 November)

- **The rows and chips stay this component's own,** `.reveal-row` and `.team-chip` (above).
- **The Original Code note:** yes.
- **Q1. `teams`** is Frontend's input, documented as "only from the projection's faction data; never mapped from the role". No team means no colour square.
- **Q2. The timing:** the list and the button come with the scene's words (3.9 s for an arrival, 0.6 s for none), on the server clock, rising 8 px over 400 ms. Late phones and phones with no clock show them at once. `showAt` stays an input, so neither component imports the other.
- **Q3. Larger text:** the end scene (#271, 0.1.1, the Motion builder) lets its title block grow with the text up to a 20 px root (125 %) and no further, for every result, and reports `layout().titleBottom`. The list starts at max(58 %, `clear.top` + 13 px): the pack's own gap at the Standard text is 13.88 px, so 13 keeps the list exactly at 58 % there. It scrolls, with the button pinned. The probe checks it: the list never overlaps the title block, and at 150 % and 200 %, for every result on both phones, its region holds "Roles" and two one-line rows (128 and 140 px). This fills an undrawn state (sheet 56 has no sheet 44 frame). Measured by the probe over end-scene 0.1.1, the scene's `layout().titleBottom` equal to its title block's box, with the pack's review frames' safe areas (47 px and 34 px), at 150 % and at 200 % alike:

  | The list's height (px) | 390 × 844 | 430 × 932 |
  | --- | --- | --- |
  | Blue or Red wins | 212.17 | 270.25 |
  | Blue wins, the Alien too | 184.67 | 270.25 |
  | No survivors | 238.48 | 275.45 |

  "Roles" and two one-line rows need 128.39 px at 150 % and 140.19 px at 200 %.
- **The faction colours:** the kit's, from kit 0.8.0 (above), with no colour declared in the component, and only once the match has ended.
- **The larger-text rules for the chip and the name:** kept, and listed with the other larger-text differences from the pack (above). The agreement accepts a difference only where one applies.
- **The shared display:** the button is hidden.

## Found while building

For the Lead. Nothing here changes the agreed interface:

- **Two rows at the larger text.** With the title block capped at 150 %, Blue with the Alien on 390 × 844 left 71 px, about 1.4 rows, because its stamp ("BLUE WINS · ALIEN TOO") and its Alien line each take two lines. The Lead had the cap lowered to 125 % for every result (Q3, above).
- **The chip's 28 px at 200 %** was its text's ink, not its line box: the pack's 26 px chip lays out its role in 26 px at 200 %, and its glyphs draw 2 px beyond. Nothing is clipped, and the chip's `min-height` only acts above 200 %.
- **A timer that wakes early.** The words' moment is a timer on the phone's clock, read against the trusted one. A timer that woke a fraction of a millisecond before the moment showed the list at once, without its rise. It now waits out the rest, and the probe checks it on a clock that runs slow.

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/end-roles.test.mjs` | 8 of 8: the runtime-safe graph on the kit alone (no other component, not even the end scene); every style scoped under the root, with no colour of its own, the kit's faction colours, its two motions (the rise, 400 ms, and the 80 ms fade, with the game's and the device's Reduce motion) and the Q3 place; the kit's three faction colours pinned to the tokens' and the pack's; the pinned pack unchanged; the pack's words, and the team said beside the colour, with no role named in its code; the inputs' checks and normalization; every preview state a valid input, and the pack's five end screens; and the check's record, with the one accepted difference |
  | `npm run test:design` | 413 of 413 |
  | `npm run test:tooling` | 356 of 356 |
  | `npm run build`, `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/end-roles-check.mjs`:** recorded on `be3ef7ce`, with the source clean.
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the other components'. The list is mounted in the shell's cover over the real end scene (`end-scene-0.1.1`), with the scene's `layout().titleBottom`, as Frontend would.
  - **Captures:** 64 of 64 pass.
    - 13 states at 390 × 844 and 430 × 932, in full motion and with the device's Reduce motion emulated (52);
    - Blue, Blue with the Alien, and no survivors, at 150 % and 200 % (12).

    Each draws what its state asks: the words, the rows in order with their teams, the squares, the Code, the button and the banner. The list lies where the pack lays it at the Standard text, and 13 px under the title block at every size; the button is 18 px above the safe area. Concealed, nothing of the reveal is in the page.
  - **The lifecycle probe** (`preview/probe.mjs`): 48 of 48 checks pass.
    - **As the page comes (45):** words (6), teams (4), time (9), reduced (3), lifecycle (6), button (7), layout (7), larger (2) and refusal (1). "larger" holds Q3 at 150 % and 200 % on both phones for every result with a list (the table above).
    - **With the device's Reduce motion (3):** the list and the button at once with the fade, nothing else moving, and a rise met by the device's setting becomes the fade.
  - **Agreement with the pinned pack's own end screen** (`preview/agree.mjs`): 30 of 30: five results, both phones, at the Standard, Large and Largest text. It compares the words, boxes (to half a pixel) and looks of "Roles", each row, its portrait, name and chip (the role, the team and the square), the Code's line, the list's place and scrolled height, and the button. One difference is accepted, in the 12 larger-text cases where the title block ends below 58 %, and recorded with its reason: the list's top, 13 px under the title block (Q3).
  - **The checks bite:**
    - a 1 px change to the rows' padding, and "Original code" for "Original Code", each fail the agreement;
    - a 300 ms rise fails the time check;
    - the old 14 px gap fails the layout check;
    - the names kept when concealed fail the lifecycle check;
    - a team taken from the role (the Alien's) fails the teams checks.

    Each was tried, then undone.
- **Not run:** physical phones, Safari, screen readers, frame rate, the real app's connection, and 320 × 568 (deferred by the owner, as for every component).

## Files

Designer's, runtime-safe, in `design/phone-ui/components/end-roles/`:

| Path | What |
| --- | --- |
| `end-roles.mjs` | `END_ROLES_VERSION`, `TEAMS`, `END_ROLES_WORDS`, `END_ROLES_MOTION`, `END_ROLES_DEFAULTS`, `checkEndRoles()` and `mountEndRoles()` |
| `end-roles.css` | The list's, the rows', the chips' and the button's places, each team's square in the kit's colour, and the appearance, scoped under `.ms-end-roles`. It imports the kit's styles |
| `preview/` | Development only: the preview on the pack's synthetic fixtures (`states.mjs`: 13 states) in the shell's cover over the real end scene; the lifecycle probe (`probe.mjs`); the agreement with the pack (`agree.mjs`) |
| `review/` | The check's captures (JPEG at 2× pixels) and `check.json` |

Also `design/tools/end-roles-check.mjs` (on the shared `component-check.mjs`), `packages/design-tokens/test/end-roles.test.mjs`, and this page.

**Used unchanged:** `icons.mjs`, `kit/kit.mjs` and `kit.css`, and the crew portraits through the kit. Nothing imports a prototype, preview, fixture or development module.
