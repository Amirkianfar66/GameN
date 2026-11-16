# Component kit: the controls every Designer component shares

**Version:** `component-kit-0.7.0` (not the #121 phone kit, `phone-kit-0.1.0`, which the hosted app stamps on its root). **Status (16 November 2026):** built, used by the phone shell (#265), and drawn beside the pinned pack in a browser, where every builder agrees with the pack's. It is not in the game yet: Integration admits its two files with the shell's graph, once for every component that uses it. It is not a release.

**What it is:** one look and one behaviour for the controls in every Designer component: the shell, and the screens the Designer team builds next (the role card and Ready, the ballot and results, the sheets' contents, the lobby).
- It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds each visual component once, and Frontend connects it without rebuilding, restyling or copying it.
- A component that draws its own buttons or cells would drift from the others. So every component draws them from here.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/kit/`:

| Path | What |
| --- | --- |
| `kit.mjs` | `createKit(doc)`, `createControlPolicy()`, `seatNumber()`, `COMPONENT_KIT_VERSION`, `BUTTON_KINDS`, `CELL_STATES`, `STAMP_TONES`, `PILL_TONES`, `ROW_TINTS` |
| `kit.css` | Every style, applied only inside an `.ms-kit` root and only to elements with an `ms-k-` class |
| `preview/` | Development only: the comparison with the pack. `cases.mjs` (every builder, from the same inputs as the pack's), `pack.html` and `kit.html` (one half each, with only its own styles), `page.mjs` (draws and measures a half) and `compare.mjs` (how two halves are compared, and the differences the kit has on purpose) |
| `review/` | The check's pictures of each half and `check.json` |

**Its check:** `node design/tools/kit-check.mjs`, built on `design/tools/lib/component-check.mjs`, which every Designer component's check shares (below).

**Used unchanged:** `../icons.mjs` (the phone interface's icons) and `apps/game/hosted/crew-runtime.mjs`'s `crewPortraitVariable` (the portraits, from the match's crew bundle).

**One source:** the kit's values are the phone pack's, `design/phone-ui/prototype/kit.css` and the builders of `ui.mjs`. The frozen Food release pins those two files byte for byte, so they stay as they are and the kit carries their values. `kit.test.mjs` checks every token against the pack's.

## Using it in a component

```js
import { createControlPolicy, createKit } from '../kit/kit.mjs';
// the component's own CSS starts with: @import url("../kit/kit.css");

const root = doc.createElement('div');
root.className = 'ms-ballot ms-kit';          // the kit applies inside .ms-kit
const kit = createKit(doc);
const policy = createControlPolicy({
  root,
  accepts: intent => live && interactive,      // what the component takes now
  defaultReason: intent => (stale ? 'Controls return when the match is current' : null),
  onFocusReturn: detail => handlers.onFocusReturn?.(detail),
});

const send = kit.button({ label: 'Vote', kind: 'primary', icon: 'vote', intent: 'vote' });
policy.control(send, { off: !input.canVote, busy: input.sending, reason: input.reason });

root.addEventListener('click', event => {      // one delegated listener
  const target = event.target.closest?.('[data-intent]');
  if (!target || !root.contains(target) || policy.refused(target)) return;
  handlers.onVote?.(target.dataset.value);     // intent only
});

// On update: change the same elements in place.
kit.setButton(send, { label: 'Vote', kind: 'primary', icon: 'vote', intent: 'vote' });
policy.control(send, { off: !next.canVote, busy: next.sending, reason: next.reason });

// On dispose:
policy.dispose();
```

- **Keep elements, change them in place.** Each `set*()` changes an element that a builder made. A focused control then keeps its element and its focus through updates.
- **Remove a control with `policy.remove(node)`**, not `node.remove()`. If it held the focus, the focus moves to the component's root, and then `onFocusReturn({ intent, value })` tells Frontend which control ended, once.
- **A glass surface** (the shell's docked sheet) carries `data-ms-surface="glass"`. Inside it, the kit's controls take the pack's glass forms: lists and cells solid, fields and steppers a thin dark layer, lighter greys, and the dark halo under light words. Content mounted in the shell's `sheetBody` is inside the glass already, and a component's own `.ms-kit` root there keeps the glass greys.
- **A paper card** (a result's body, the pack's `.result-body`) carries `data-ms-surface="paper"`. Inside it, the 3 × 3 takes the pack's paper forms: paper-shade cells with ink words and seat numbers, 74 px portraits, the chosen cell gold, "You" top-right beside a count, a seat that was not a candidate faded, and an 8 px gap in both forms. The card's own box (its padding, its paper) is the component's.
- **Reduce motion:** put `data-motion="reduced"` on the `.ms-kit` root for the game's setting. The device's is honoured as well.

## The control policy

The same for every component, as Frontend reviewed it for the room scene and the shell (#4, #261):

| Case | Markup | Looks |
| --- | --- | --- |
| Unavailable (`off`) | `aria-disabled="true"`, `data-off`. Never `disabled`, which would drop the focus | Dimmed, as the pack draws it |
| Not taken now (`accepts(intent)` is false: reconnecting, not interactive) | `aria-disabled="true"` | Unchanged |
| Busy | `aria-busy="true"` | A spinner in the button |
| A reason | `aria-describedby`, pointing at the reason's words in a hidden note in the root | Not shown |

- `policy.refused(target)` says whether a tap is refused now. A component asks it before reporting a tap.
- **The policy decides nothing.** `off`, `busy` and `reason` are what the component is given, from the projection's offers and reasons or Frontend's own words. Nothing in the kit works out availability, spends anything or resolves anything.

## The builders

Each `x(props)` makes an element; each `setX(node, props)` changes it in place.

| Builder | The pack's | Props |
| --- | --- | --- |
| `button`, `setButton` | `button()` | `label`, `kind` (`primary`, `secondary`, `tinted`, `plain`, `outline`, `warn`), `icon`, `filled` (default: primary's icon is filled), `block`, `small`, `aria`, `pressed`, `expanded`, `intent`, `value`, `extra` (your own part's class) |
| `iconButton`, `setIconButton` | `iconButton()` | `label` (its accessible name, required), `icon`, `intent`, `value` |
| `row`, `setRow`, `list(...rows)`, `groupLabel`, `groupNote` | `row()`, `list()`, `groupLabel()`, `groupNote()` | `title`, `sub`, `value` (the words at the right, or a node such as a pill, 0.6.1), `icon` with `tint` (`amber`, `paper`, `steel`, `teal`, `slate`), or `lead` (a node, such as a portrait), `trail` (a node at the end: a switch, a stepper), `chevron`, `tag` (`'button'` or `'div'`), `intent`, `data` (what a tap reports). A row keeps a lead, value or trail node, and its focus, while the same node is given |
| `sectionHead`, `setSectionHead` | `screens.css` `.section-head` | `title` (drawn in capitals) and `aside` (the line at the right, or none). Sheet 34 heads each window with it ("Room A ↔ Hospital", "Your station · A2"), and sheet 28 the turn (0.7.0) |
| `notice`, `setNotice` | `screens.css` `.registered` | `icon` (with `filled`) or `stamp: { text, tone }` over its `lines`, centred; `extra`, a node after the lines inside the notice (the Scan result's row); `status` (default true) reads it as it opens. Moved in from play-parts with its props (0.7.0) |
| `pill`, `setPill` | `pill()` | `text`, `icon`, `tone` (`amber`, `paper`, `accent`) |
| `stamp`, `setStamp` | `stamp()` | `text`, `tone` (`amber`, `pending`, `gold`, `steel`). `pending` is an outline: waiting, not a result |
| `caption(words)` | `caption()` | The comic caption tag |
| `num(n)` | `b.num` | The seat number in its paper circle, sized in its own em so it grows with the text |
| `portrait`, `setPortrait` | `pt()` | `(person, versions)`: the crew portrait, or without a character the empty tile with the players mark |
| `cell`, `setCell`, `grid9()` | `cell()` | `person` (`{ seat, name, character }`), `state` (below), `note`, `count`, `mark` (an icon), `you`, `label`, `tag`, `intent`, `versions` |
| `field(props)`, `setField` | `field()` | `label`, `value`, `placeholder`, `maxLength`, `autocomplete`, `secret`, `mono`, `invalid`, `count` ("3/12"), `icon`. Returns `{ field, input }`: the pack's box around a real `input`. `setField(field, props)` changes the label, placeholder, icon, count and invalid state; the typing, and so the value, is the component's |
| `codeBoxes`, `setCodeBoxes` | `codeBoxes()` | `code`, `focusAt`, `invalid`, `length` (6), `label` ("Room code"). The typing itself is the component's |
| `errorNote(words, { icon, filled })` | `errorNote()`, and the menu's offline note | Paper and ink with the filled warning shape, never red. `icon` and `filled` change only the shape: the menu's offline note (sheet 10) is `{ icon: 'offline', filled: false }` |
| `seg`, `setSeg` | `.seg` | `options` (`[{ id, label, icon }]`), `value`, `label`, `intent`. A radio group |
| `stepper`, `setStepper` | `.stepper` | `value`, `label`, `intent`. Its two buttons report `down` and `up`; each side's availability is the component's (`policy.control`) |
| `switchControl`, `setSwitch` | `.switch` | `checked`, `label`, `intent` |
| `wait`, `setWait` | `screens.css` `.wait`, `.big-icon`, `.spinner` | The waiting block: `icon` (+ `filled`) in the 76 px tile, or `lead`, a node in its place (a portrait); `title`; `line`, with the 16 px spinner before it when `busy`; `size: 'small'` for the 1.25rem title the pack uses in sheets. Boarding's "Starting Round 1 · Waiting for the ship" (sheet 19), "Waiting for the host" (13), "No window here" and "Ben is choosing an Officer". The spinner stands still with Reduce motion |
| `tile`, `setTile`, `tiles(...tiles)` | `screens-game.mjs` `tile()`, `screens.css` `.tile`, `.tiles` | `icon`, `name`, `note` (the line under the name; an unavailable tile's reason), `state` (`available`, `selected`, `sending`, `registered`, `unavailable`), `badge` (a whole number on the icon's corner), `label` (default: the name, the note and "registered"; `false` leaves the tile named by its own words, 0.7.0), `intent`, `value`; `art`, a card's art (the game's own art markup, never words or a player's data) at the tile's width in place of the icon, faded to grey when unavailable (0.7.0); `noteIcon`, an icon before the note, as sheet 25's lock (0.7.0). Always a button; `tiles()` lays them three to a row (0.6.0) |
| `who`, `setWho` | `screens.css` `.confirm-who` | `people` (none, one or two `{ seat, character }`), or without people an `icon` on its 64 px paper tile; `title` ("Rescue Eli", "Offer to Ava"); `sub`; `versions` (0.6.0) |
| `facts`, `setFacts` | `screens.css` `.facts` | `[line, …]`: each text, with the amber "i", or `{ icon, text }` (Promises' lock). Each line kept by its place (0.6.0) |
| `comic(...children)` | `kit.css` `.comic` | The paper card: paper, an ink border and the ink shadow. The caller fills and pads it, as the pack's screens do (0.6.0) |

**The cells' states:** `available`, `selected`, `confirmed`, `taken`, `ineligible`, `empty`, `winner`, `faded`.
- Seat *n* is always cell *n*. An empty seat (a 7- or 8-player match) is an empty frame, hidden from screen readers.
- On a paper card (results), the count holds the top-left corner and "You" the top-right; elsewhere "You" is top-left.
- A cell's accessible name says the seat, the name, the count and the note ("Player 4, Nova, 2 votes").
- A button cell says whether it is the one picked (`aria-pressed`). Whether it can be picked is the policy's.
- In `grid9()`'s container, a 3 × 3 under 13 of its em across (200 % text, or 150 % on the smallest phone) becomes a list in seat order, every name whole, and empty seats drop out.

**Where it differs from the pack's builders, on purpose:** the pack's builders draw review pictures; the kit's are the game's.
- `field()` holds a real `input` where the pack draws the words in a span. So, and only so, the check accepts four differences, each with its reason in `preview/compare.mjs`:
  - the input runs to the count, shows the text cursor and keeps its words inside its box;
  - the count's automatic margin resolves to nothing beside it (the count sits where the pack's does);
  - at 200 % text a long name stays on one line and scrolls, where the pack's span wraps to a second;
  - on glass the count keeps the halo under its light words. The pack's reset for the cell's dark vote count (`.sheet .count`) also catches the field's count, which shares its class.
- A cell's tag is the component's choice, and its availability is the policy's, where the pack infers both from the state.
- The seat number comes from `number`, or from the digits at the end of the seat's id (`seat-4` → 4).
- A tile is always a button, so a focused tile keeps its element and its focus through every state; its availability is the policy's. The pack makes a tile that can't be chosen now (`sending`, `registered`, `unavailable`) a `div`, so the kit gives those the `div`'s look: no hand cursor, and on glass the sheet's halo under their words, which a button's own styles drop. `sending` is the pack's `submitting`.

## Styling a component that uses it

- **Your own parts, your own classes.** Place and size the kit's controls through your parts, as the shell does: `.ms-ps-sheet-foot .ms-k-btn { flex: 1 }`. A component's test checks that each selector naming a kit class sits inside one of the component's own parts.
- **Any rule of yours outranks the kit, whatever the load order.** Every kit rule weighs one class (`.ms-kit :where(…)`) and its root nothing (`:where(.ms-kit)`). Each component's stylesheet imports `kit.css`, so the game's bundle holds a copy per component, and a later copy must never undo an earlier component's rule. Two classes of your own (your part and the kit's class) is enough. The game's bare element rules still lose to the kit. `kit.test.mjs` holds every kit selector to that weight.
- **Never restyle the kit's colours, type or states** from a component, and never redeclare an `--ms-k-` property. If a screen needs something the kit doesn't draw, ask the Lead Designer: it goes into the kit, for every component.
- **Pass `extra`** to add your part's class to a kit button (the shell's chip is `extra: ['ms-ps-chip-btn']`).
- **A part you can tap turns off the browser's tap highlight.** Chrome highlights a tap only on an element with the hand cursor. Its default, `rgba(51, 181, 229, 0.4)`, stays about a quarter of a second over the pressed and in-flight looks, which should be a press's only feedback. The native Food Panel's RELEASE showed it in [#276](https://github.com/Amirkianfar66/GameN/pull/276#issuecomment-6899774350).
  - The kit's controls set `-webkit-tap-highlight-color: transparent` in the same rule that gives the hand cursor.
  - The property is inherited, so the shell and the room scene set it once, on their roots.
  - If a part of yours sets `cursor: pointer`, it must either inherit the transparent colour from your root or set it in the same rule.
- **Larger text on a narrow phone (0.5.0).** A component that fills the phone puts `ms-k-phone` on its root, as the shell does. It is the container the kit's two larger-text rules ask, the pack's own rules for these parts (#228). They fix text that overlapped or was cut at the Largest text, found on the Card sheet's Resources. Nothing changes at the Standard text: every phone 320 px or wider is 20 em or more across there.
  - **Rows:** under 19 em across (the Large or Largest text on any phone up to 456 px wide), a row's value goes under its title instead of beside it, so "Promises" and "Given 0/1 · Received 1/1" no longer run into each other. A long value wraps. The icon or portrait and the chevron, switch or stepper keep their places at the sides.
  - **Segmented controls:** `seg({ …, stack: true })` for options that are words, which may not fit side by side ("Card · Knowledge · Resources"). Under 15 em across (the Largest text on any phone, or Large on the smallest) they stack, one per row, each still 44 px. Leave `stack` off for short options ("7 · 8 · 9"), which stay a row.
  - A component inside the shell (its sheets, its cover) is already in the shell's container and needs nothing more.
- **A segmented control's chosen icon (0.5.1).** The chosen option's icon is filled and the others plain, as sheet 12 draws Join's device choice ("Player phone" filled, "Shared display" plain). Options without icons are unchanged.
- **The tile, who, the facts and the paper card (0.6.0).** The Gameplay builder's play-parts drew the first three for Actions and the private talk. When Promises needed them too, they moved into the kit, with the same props, states and behaviour (the Lead's L2: a part another builder needs goes into the kit). The kit also takes the pack's tiles grid and its paper card (`.comic`).
  - play-parts delegates its `tile`, `who` and `facts` to the kit and keeps its own API, so Actions and the private talk don't change. Its notice and time line stay in play-parts until another builder needs them.
- **The tile's card art (0.7.0).** Sheet 25's side cards are tiles with a card's art in place of the icon, a lock before "Not for your role", and no label of their own (their words name them). The private talk's play-parts drew them; they're the kit tile's `art`, `noteIcon` and `label: false` now, so play-parts stays a pass-through. Sheet 25 draws its unavailable sides as disabled buttons; the kit draws them as every tile that takes no tap (no hand cursor, the glass halo), a difference accepted with its reason.
- **The notice (0.7.0).** An icon or a stamp centred over its lines, the pack's `.registered`: sheet 45's "Outcome unknown", the Officer's BLOCKED (sheet 40) and the Scan's MATCHED (sheet 42). The Gameplay builder's play-parts drew it; with the office decisions (#300) as its second user it moved into the kit, with the same props, and play-parts delegates to it. It takes one more prop, `extra`, for the node the pack keeps inside the notice after the lines (the Scan result's row).
- **The section head (0.7.0).** Sheet 34 heads each window with the pack's `.section-head`, and Actions draws the same head for its turn (sheet 28). With Windows (#299) as its second user, it moved into the kit (L2); Actions delegates its own head to it.
- **A row's value as a node (0.6.1).** Sheets 33 and 33.1 put a Promise's status in the row's value as a pill, as the pack's `promiseRow` does (`row({ …, value: pill(status) })`). A row's `value` now takes words or a node. A node takes the value's place, so at the Larger text in a phone root the pill goes under the title as words do. Before, a pill could only go in the trail, where at 200 % it kept its place beside the title and "Captain Support" was cut. The Pre-game builder found it on Promises (#297).
  - Size and place them through your own parts, as with every kit control.

## Writing your component's check

Every Designer component ships with a check like the shell's (`design/tools/phone-shell-check.mjs`). `design/tools/lib/component-check.mjs` holds what they share:
- `bundlePreview()`: the preview bundled as the game bundles a component;
- `serve()`: the bundle served with the hosted game's production headers;
- `POLICY_LISTENER` and `classify()`: the policy reports, with the known Zod probe told apart;
- `sourceState()`: the commit and whether the source is clean, with every component's `review/` left out;
- `recordedHeaders()`: the headers and their digest for the record.

The component's own check draws its states, runs its probe and writes its record with these.

## Checks run on this version

- **`packages/design-tokens/test/kit.test.mjs`:** 6 of 6.
  - **The graph:** runtime-safe, with no development marker; one package import, `@mothership/contracts`, through `crew-runtime.mjs`.
  - **The scope:** every rule is under `.ms-kit`, styles only `ms-k-` elements (or a component's own `.ms-kit` root on glass), uses no universal selector, and declares only `--ms-k-` properties (and `--ic-knock`, which the icons read). Its keyframes are `ms-k-`.
    - Proven by injecting six bad rules one at a time (a bare element, a universal selector, an element under `.ms-kit`, a rule outside `.ms-kit`, a foreign property, an unprefixed keyframe). Each fails the test.
  - **The weight:** every selector is `.ms-kit` and `:where(…)` alone, and the root `:where(.ms-kit)`. An injected `.ms-kit .ms-k-btn` fails it.
  - **The values:** every token is the pinned pack's, `--ms-k-paper-shade` included. Every button kind, cell state, stamp tone, pill tone and row tint is one the pack draws. On glass, the pack's lighter greys, in a component's root too.
  - **The comparison is development only:** the pages, cases, rules and tools carry the development marker, and each half loads only its own styles.
  - **The check's record**, below.
- **`node design/tools/kit-check.mjs`:**
  - **The setup:** the two halves are bundled by Vite and served with the hosted game's production headers (the same SHA-256 as the shell's check). They are drawn in two separate pages, so neither half's styles can stand in for the other's. The pack's half loads its `kit.css` and, for the result's paper card, its `screens.css`, whose rules are all contextual.
  - **The cases:** 49 at 390 px wide: every builder and its states, including the busy spinners, an unavailable button and row, the seven row kinds, the four fields, both code boxes, the switch on and off, every pill, stamp, caption and portrait, the 3 × 3 in all eight states with a count, "You" and a mark, the 3 × 3 on the result's paper card, the waiting block with its spinner, in a sheet's small form and with a portrait, the menu's offline note, the device choice (0.5.1), the tiles, who with a person and with an icon, the facts and the paper card (0.6.0), the Promise rows with a pill as their value (0.6.1), two section heads, three notices and sheet 25's three side cards (0.7.0).
    - Each is drawn on a plain surface. 44 are also drawn on glass: in the pack's sheet, and in the shell's docked sheet inside a component's own `.ms-kit` root, as a sheet's content will be.
    - Everything is drawn at 100 % and at 200 % text: 186 comparisons in all.
  - **What is compared, part by part:** the box to within half a pixel, the computed type, colours, spacing and shape, the `::before` and `::after`, each icon's drawing and knock-out colour, and the words.
  - **0.7.0 against 0.6.1:** five new cases, 20 comparisons and 156 parts.
    - Two section heads, as sheet 34 heads a window and sheet 28 the turn. All four comparisons agree with the pack, plain and on glass, at 100 % and at 200 %.
    - Three notices: sheet 40's BLOCKED, sheet 43's spent attempt (an icon) and sheet 42's MATCHED with its row inside. They agree with the pack everywhere but one: at 200 % on glass, in the shell's phone root, the Scan result's row puts its value under its title (the 0.5.0 row rule), and the notice centres the narrower list. That is accepted with its reason (one entry in `ACCEPTED`, 18 instances).
    - Sheet 25's three side cards, with the private talk's grid and colours given as its own styles: their boxes, art, names, notes and locks agree. The unavailable cards' cursor, and on glass their halo, are accepted with their reason (one entry in `ACCEPTED`, 72 instances): sheet 25 draws them as disabled buttons, the kit as every tile that takes no tap.
    - The other 166 comparisons agree as before.
  - **0.6.1 against 0.6.0:** one new case, four comparisons and 92 parts: three Promise rows, each with a portrait, a title, a line and its status pill (Offered; Fulfilled, amber with its check; Not fulfilled).
    - At 100 %, and at 200 % plain, it agrees with the pack.
    - At 200 % on glass, inside the shell's phone root, each row puts its pill under its title, the 0.5.0 row rule. In the pinned pack the pill keeps its place and squeezes the title onto narrow lines. That reflow is accepted with its reason (one entry in `ACCEPTED`, 60 instances). The other 162 comparisons agree as before.
  - **0.6.0 against 0.5.1:** five new cases, 18 comparisons and 162 parts. The other 144 comparisons agree as before.
    - The cases: every tile state with a note, a badge and the registered mark, in the pack's three-to-a-row grid; who with a person and with an action's icon; the facts with the "i" and the lock; the paper card.
    - **Found and fixed before the record:** the three tiles that can't be chosen (sending, registered, unavailable) had the hand cursor and, on glass, no halo under their words. The pack draws those as a `div`, which has neither difference. The kit now gives them the `div`'s look, and every comparison agrees.
  - **0.5.1 against 0.5.0:** the device choice is a new case (four comparisons, 5 parts each), drawn as sheet 12 draws it: the chosen icon filled.
    - At 100 % it agrees with the pack, plain and on glass.
    - At 200 %, plain, the pack squeezes its two long options' icons to 12.8 and 11.4 px. The kit's keep their 18 px.
    - At 200 % on glass, inside the shell's phone root, the kit stacks the two options, the 0.5.0 rule.
    - Both are accepted with their reason. The other 140 comparisons agree as before.
  - **Result:** all 186 agree, 1341 parts. The only remaining differences are the twelve kinds the kit has on purpose (above, and the larger-text forms), 274 instances in all. All four pages are clean: no page error, no failed request, and no policy report but the known Zod probe.
  - **It catches drift:** three changes injected one at a time each fail it: one pixel of a button's padding, one pill tone's alpha, and a glass grey by 1/255.
  - **What it found, fixed before 0.1.0's record:**
    - a busy spinner 5 px small, and turning faster;
    - icons forced to blocks;
    - two cut-out colours the pack doesn't have;
    - the browser's button padding, a portrait's clipping, and the error's box sizing;
    - a component's own root resetting the glass greys;
    - the field's input losing the glass halo.
  - **0.2.0 against 0.1.0:** moving every rule to one class's weight changed no comparison; the 126 earlier comparisons agree as before.
  - **0.4.0 against 0.3.0:** the inline error takes an icon (two comparisons, the menu's offline note, 6 parts); the 138 earlier comparisons agree as before.
  - **0.5.0 against 0.4.0:** the glass cases sit in the shell, whose root is now the phone container. So at 200 % two of them, the list and the group, take the larger-text row rule: the rows with a value put it under their title, and what follows moves down. Those 47 differences are accepted with their reason (three entries in `ACCEPTED`), where the pinned pack's title and value run into each other. The other 138 comparisons agree as before. The rule itself, and the stacking segmented control, are measured in the shell's probe (`large`: under its title at 200 %, beside it at 100 %; three stacked options at 200 %, one row of short ones at both).
  - **0.3.0 against 0.2.0:** the waiting block is new (ten comparisons, 48 parts). The 128 earlier comparisons agree as before. In the pack, its portrait is the 44 px `.pt` even where a screen asks `pt(…, 76)`, because the CSS sizes every `.pt`; the kit's portrait agrees.
  - **Where the record is:** `review/check.json` (each case, part and difference) and a picture of each half at each text size. Recorded on `15fe53cb`, with the source clean (0.7.0's section head on `39778572`, its notice on `15fe53cb`). Before: `50888f35` (0.6.1).
- **In the shell:** the shell's check draws the kit's buttons and icon buttons in its 29 captures, and its probe drives the control policy (focus kept, refused taps, reasons, reconnecting, focus return). Recorded on `b51b715c` ([the shell's page](phone-shell.md)).
- **Not run:** physical phones, Safari, screen readers.
