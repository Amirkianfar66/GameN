# Component kit: the controls every Designer component shares

**Version:** `component-kit-0.1.0` (not the #121 phone kit, `phone-kit-0.1.0`, which the hosted app stamps on its root). **Status (15 November 2026):** built and used by the phone shell (#265). It is not in the game yet: Integration admits its two files with the shell's graph, once for every component that uses it. It is not a release.

**What it is:** one look and one behaviour for the controls in every Designer component: the shell, and the screens the Designer team builds next (the role card and Ready, the ballot and results, the sheets' contents, the lobby).
- It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds each visual component once, and Frontend connects it without rebuilding, restyling or copying it.
- A component that draws its own buttons or cells would drift from the others. So every component draws them from here.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/kit/`:

| Path | What |
| --- | --- |
| `kit.mjs` | `createKit(doc)`, `createControlPolicy()`, `seatNumber()`, `COMPONENT_KIT_VERSION`, `BUTTON_KINDS`, `CELL_STATES`, `STAMP_TONES`, `PILL_TONES`, `ROW_TINTS` |
| `kit.css` | Every style, applied only inside an `.ms-kit` root and only to elements with an `ms-k-` class |

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
- **A glass surface** (the shell's docked sheet) carries `data-ms-surface="glass"`. Inside it, the kit's controls take the pack's glass forms: lists and cells solid, fields and steppers a thin dark layer, lighter greys. Content mounted in the shell's `sheetBody` is inside the glass already.
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
| `row`, `setRow`, `list(...rows)`, `groupLabel`, `groupNote` | `row()`, `list()`, `groupLabel()`, `groupNote()` | `title`, `sub`, `value` (the words at the right), `icon` with `tint` (`amber`, `paper`, `steel`, `teal`, `slate`), or `lead` (a node, such as a portrait), `chevron`, `tag` (`'button'` or `'div'`), `intent`, `data` (what a tap reports) |
| `pill`, `setPill` | `pill()` | `text`, `icon`, `tone` (`amber`, `paper`, `accent`) |
| `stamp`, `setStamp` | `stamp()` | `text`, `tone` (`amber`, `pending`, `gold`, `steel`). `pending` is an outline: waiting, not a result |
| `caption(words)` | `caption()` | The comic caption tag |
| `num(n)` | `b.num` | The seat number in its paper circle, sized in its own em so it grows with the text |
| `portrait`, `setPortrait` | `pt()` | `(person, versions)`: the crew portrait, or an empty tile without a character |
| `cell`, `setCell`, `grid9()` | `cell()` | `person` (`{ seat, name, character }`), `state` (below), `note`, `count`, `mark` (an icon), `you`, `label`, `tag`, `intent`, `versions` |
| `field(props)` | `field()` | `label`, `value`, `placeholder`, `maxLength`, `autocomplete`, `secret`, `invalid`. Returns `{ field, input }`, with a real `input` |
| `codeBoxes`, `setCodeBoxes` | `codeBoxes()` | `code`, `focusAt`, `invalid`, `length` (6), `label` ("Room code"). The typing itself is the component's |
| `errorNote(words)` | `errorNote()` | Paper and ink with a warning shape, never red |
| `seg`, `setSeg` | `.seg` | `options` (`[{ id, label, icon }]`), `value`, `label`, `intent`. A radio group |
| `stepper`, `setStepper` | `.stepper` | `value`, `label`, `intent`. Its two buttons report `down` and `up`; each side's availability is the component's (`policy.control`) |
| `switchControl`, `setSwitch` | `.switch` | `checked`, `label`, `intent` |

**The cells' states:** `available`, `selected`, `confirmed`, `taken`, `ineligible`, `empty`, `winner`, `faded`.
- Seat *n* is always cell *n*. An empty seat (a 7- or 8-player match) is an empty frame, hidden from screen readers.
- In results, the count holds the top-left corner and "You" the top-right.
- A cell's accessible name says the seat, the name, the count and the note ("Player 4, Nova, 2 votes").
- A button cell says whether it is the one picked (`aria-pressed`). Whether it can be picked is the policy's.
- In `grid9()`'s container, a 3 × 3 under 13 of its em across (200 % text, or 150 % on the smallest phone) becomes a list in seat order, every name whole, and empty seats drop out.

**Where it differs from the pack's builders, on purpose:** the pack's builders draw review pictures; the kit's are the game's.
- `field()` holds a real `input` where the pack draws one.
- A cell's tag is the component's choice, and its availability is the policy's, where the pack infers both from the state.
- The seat number comes from `number`, or from the digits at the end of the seat's id (`seat-4` → 4).

## Styling a component that uses it

- **Your own parts, your own classes.** Place and size the kit's controls through your parts, as the shell does: `.ms-ps-sheet-foot .ms-k-btn { flex: 1 }`. A component's test checks that each selector naming a kit class sits inside one of the component's own parts.
- **Never restyle the kit's colours, type or states** from a component, and never redeclare an `--ms-k-` property. If a screen needs something the kit doesn't draw, ask the Lead Designer: it goes into the kit, for every component.
- **Pass `extra`** to add your part's class to a kit button (the shell's chip is `extra: ['ms-ps-chip-btn']`).

## Checks run on this version

- **`packages/design-tokens/test/kit.test.mjs`:** 3 of 3.
  - **The graph:** runtime-safe, with no development marker; one package import, `@mothership/contracts`, through `crew-runtime.mjs`.
  - **The scope:** every rule is under `.ms-kit`, styles only `ms-k-` elements, uses no universal selector, and declares only `--ms-k-` properties (and `--ic-knock`, which the icons read). Its keyframes are `ms-k-`.
    - Proven by injecting six bad rules one at a time (a bare element, a universal selector, an element under `.ms-kit`, a rule outside `.ms-kit`, a foreign property, an unprefixed keyframe). Each fails the test.
  - **The values:** every token is the pinned pack's. Every button kind, cell state, stamp tone, pill tone and row tint is one the pack draws. On glass, the pack's lighter greys.
- **In the shell:** the shell's check under the production headers draws the kit's buttons and icon buttons in 27 captures, and its probe drives the control policy (focus kept, refused taps, reasons, reconnecting, focus return). Recorded on `aea6dab4` ([the shell's page](phone-shell.md)).
- **Not run yet:** the kit's own page, drawing every builder beside the pack's in the same page and comparing them, in and out of glass and at 200 % text. It is next. Until then, the elements the shell doesn't use (rows, cells, fields, code boxes, the segmented control, the stepper, the switch, pills, stamps) are checked by their values, not drawn.
- **Not run:** physical phones, Safari, screen readers.
