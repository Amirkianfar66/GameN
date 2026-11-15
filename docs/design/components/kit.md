# Component kit: the controls every Designer component shares

**Version:** `component-kit-0.2.0` (not the #121 phone kit, `phone-kit-0.1.0`, which the hosted app stamps on its root). **Status (15 November 2026):** built, used by the phone shell (#265), and drawn beside the pinned pack in a browser, where every builder agrees with the pack's. It is not in the game yet: Integration admits its two files with the shell's graph, once for every component that uses it. It is not a release.

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
| `row`, `setRow`, `list(...rows)`, `groupLabel`, `groupNote` | `row()`, `list()`, `groupLabel()`, `groupNote()` | `title`, `sub`, `value` (the words at the right), `icon` with `tint` (`amber`, `paper`, `steel`, `teal`, `slate`), or `lead` (a node, such as a portrait), `trail` (a node at the end: a switch, a stepper), `chevron`, `tag` (`'button'` or `'div'`), `intent`, `data` (what a tap reports). A row keeps a lead or trail node, and its focus, while the same node is given |
| `pill`, `setPill` | `pill()` | `text`, `icon`, `tone` (`amber`, `paper`, `accent`) |
| `stamp`, `setStamp` | `stamp()` | `text`, `tone` (`amber`, `pending`, `gold`, `steel`). `pending` is an outline: waiting, not a result |
| `caption(words)` | `caption()` | The comic caption tag |
| `num(n)` | `b.num` | The seat number in its paper circle, sized in its own em so it grows with the text |
| `portrait`, `setPortrait` | `pt()` | `(person, versions)`: the crew portrait, or without a character the empty tile with the players mark |
| `cell`, `setCell`, `grid9()` | `cell()` | `person` (`{ seat, name, character }`), `state` (below), `note`, `count`, `mark` (an icon), `you`, `label`, `tag`, `intent`, `versions` |
| `field(props)`, `setField` | `field()` | `label`, `value`, `placeholder`, `maxLength`, `autocomplete`, `secret`, `mono`, `invalid`, `count` ("3/12"), `icon`. Returns `{ field, input }`: the pack's box around a real `input`. `setField(field, props)` changes the label, placeholder, icon, count and invalid state; the typing, and so the value, is the component's |
| `codeBoxes`, `setCodeBoxes` | `codeBoxes()` | `code`, `focusAt`, `invalid`, `length` (6), `label` ("Room code"). The typing itself is the component's |
| `errorNote(words)` | `errorNote()` | Paper and ink with a warning shape, never red |
| `seg`, `setSeg` | `.seg` | `options` (`[{ id, label, icon }]`), `value`, `label`, `intent`. A radio group |
| `stepper`, `setStepper` | `.stepper` | `value`, `label`, `intent`. Its two buttons report `down` and `up`; each side's availability is the component's (`policy.control`) |
| `switchControl`, `setSwitch` | `.switch` | `checked`, `label`, `intent` |

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

## Styling a component that uses it

- **Your own parts, your own classes.** Place and size the kit's controls through your parts, as the shell does: `.ms-ps-sheet-foot .ms-k-btn { flex: 1 }`. A component's test checks that each selector naming a kit class sits inside one of the component's own parts.
- **Any rule of yours outranks the kit, whatever the load order.** Every kit rule weighs one class (`.ms-kit :where(…)`) and its root nothing (`:where(.ms-kit)`). Each component's stylesheet imports `kit.css`, so the game's bundle holds a copy per component, and a later copy must never undo an earlier component's rule. Two classes of your own (your part and the kit's class) is enough. The game's bare element rules still lose to the kit. `kit.test.mjs` holds every kit selector to that weight.
- **Never restyle the kit's colours, type or states** from a component, and never redeclare an `--ms-k-` property. If a screen needs something the kit doesn't draw, ask the Lead Designer: it goes into the kit, for every component.
- **Pass `extra`** to add your part's class to a kit button (the shell's chip is `extra: ['ms-ps-chip-btn']`).

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
  - **The cases:** 33 at 390 px wide: every builder and its states, including the busy spinners, an unavailable button and row, the seven row kinds, the four fields, both code boxes, the switch on and off, every pill, stamp, caption and portrait, the 3 × 3 in all eight states with a count, "You" and a mark, and the 3 × 3 on the result's paper card.
    - Each is drawn on a plain surface. 31 are also drawn on glass: in the pack's sheet, and in the shell's docked sheet inside a component's own `.ms-kit` root, as a sheet's content will be.
    - Everything is drawn at 100 % and at 200 % text: 128 comparisons in all.
  - **What is compared, part by part:** the box to within half a pixel, the computed type, colours, spacing and shape, the `::before` and `::after`, each icon's drawing and knock-out colour, and the words.
  - **Result:** all 128 agree, 857 parts. The only remaining differences are the four kinds the kit has on purpose (above), 62 instances in all. All four pages are clean: no page error, no failed request, and no policy report but the known Zod probe.
  - **It catches drift:** three changes injected one at a time each fail it: one pixel of a button's padding, one pill tone's alpha, and a glass grey by 1/255.
  - **What it found, fixed before 0.1.0's record:**
    - a busy spinner 5 px small, and turning faster;
    - icons forced to blocks;
    - two cut-out colours the pack doesn't have;
    - the browser's button padding, a portrait's clipping, and the error's box sizing;
    - a component's own root resetting the glass greys;
    - the field's input losing the glass halo.
  - **0.2.0 against 0.1.0:** moving every rule to one class's weight changed no comparison; the 126 earlier comparisons agree as before.
  - **Where the record is:** `review/check.json` (each case, part and difference) and a picture of each half at each text size. Recorded on `b51b715c`, with the source clean.
- **In the shell:** the shell's check draws the kit's buttons and icon buttons in its 29 captures, and its probe drives the control policy (focus kept, refused taps, reasons, reconnecting, focus return). Recorded on `b51b715c` ([the shell's page](phone-shell.md)).
- **Not run:** physical phones, Safari, screen readers.
