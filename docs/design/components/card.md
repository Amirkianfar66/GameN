# The Card sheet: Designer's runtime component

**Version:** `card-sheet-0.1.0`. **Status (15 November 2026):** built to the interface the Lead Designer approved on #270 (posted for Frontend on #4), with the decisions below. It is not in the game yet. Integration first admits its files to the hosted build. It is not a release. It is stacked on the role stage (#268), whose role card it mounts as it is, and on the phone shell (#265): `c1b190ab` was merged in for the shell's sheet head (`sheet.head`, which draws "Hide card") and the shared kit (`component-kit-0.3.0`), and the role stage at `d1919d7` brings the shell to `05e2d1d0` (its `backdrop` input, default `'scene'`, which the Card does not set). The shell at `3fb12935` (`phone-shell-0.2.0`, with `component-kit-0.5.1`) is merged in as `45758c57`, for the kit's rows and segmented controls at the Largest text (the Lead, 16 November 2026).

**What it is:** the content of the Card tab's sheet during a match, as the phone pack draws it (sheet 31; #222 item 7). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 31):
- **The card,** fitted to the sheet: the Pre-game builder's role card (`role-stage/role-card.mjs`, `mountRoleCard`), face up, as the pack's `.card-fit` fits it.
- **The segmented control** under the card, or at the top in the other two views: Card, Knowledge and Resources (the kit's `seg`, with `stack: true`: at the Largest text, in the shell's phone root, its three words stack one per row).
- **Knowledge:** what this viewer knows about other players: the Undercover's seat ("Undercover · Player 6"), the Insider's trio ("Unmapped trio · Players 2, 6, 8"), and for the Hacker a "Scans" group ("Round 2 · Player 7", "Guess Blue · matched · in the Code"). With nothing known, one line saying so.
- **Resources:** Weapons, Role Action, Move, Shared injections and Promises, each with Frontend's value ("0", "Available", "Used this round", "2 of 2", "Given 0/1 · Received 1/1").
- **Hidden:** the card's back with "Hidden" and Show (the role card's `back: 'sheet'`), and nothing else: no segmented control, knowledge or resources.
- **The sheet's words** for the shell: "Your role", "Only on this phone", Close, and "Hide card" in the sheet's head (see [the shell's part](#the-shells-part)).

**Not covered here:**
- the sheet's frame (the shell);
- the role card itself (the role stage's component: imported unchanged, and any change to it goes through the Lead);
- the Hacker's Scan and Code flows (sheet 42, a later component);
- the Promises sheet (sheet 33).

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `card/card.mjs` | `mountCardSheet()`, `cardSheet()`, `checkCardSheet()`, `nextCardSheetInput()`, `knowledgeRows()`, `CARD_SHEET_VERSION`, `CARD_SHEET_WORDS`, `RESOURCE_KINDS` |
| `card/card.css` | Every style, under the component's root, `.ms-card-sheet` (the role card keeps its own `.ms-own-card`) |
| `card/preview/` | Development only: the preview on the pack's synthetic fixtures inside the shell, with the room scene in the stage; the probe and the agreement with the pack's `card()` frames |
| `card/review/` | The check's captures and `check.json` |

Elsewhere:
- **The check:** `design/tools/card-check.mjs` (development only), on the shared `design/tools/lib/component-check.mjs`.
- **The unit test:** `packages/design-tokens/test/card.test.mjs`.

**Used unchanged:**
- `role-stage/role-card.mjs` and `role-card.css` (`mountRoleCard`, `role-card-0.1.0`);
- the kit's `seg`, `list`, `row`, `groupLabel`, `groupNote` and its control policy;
- `icons.mjs`.

## Mount, update and dispose

```js
import { mountCardSheet, cardSheet } from '…/design/phone-ui/components/card/card.mjs';
import '…/design/phone-ui/components/card/card.css';   // it imports the kit's and the role card's CSS

shell.update({ sheet: cardSheet(input) });        // { id: 'card', title: 'Your role', sub: 'Only on this phone', close: true, detent: 'large', head, actions: [] }
const card = mountCardSheet(shell.sheetBody, input, { onView, onShow, onFocusReturn });
card.update({ ...changes });                      // each key given replaces that key; the rest stay
// Each change: card.update(changes) and shell.update({ sheet: cardSheet(next) }) (the head's Hide comes and goes).
card.dispose();                                   // when the sheet closes, the shell drops it, or the match ends
```

- **Synchronous, with no timers:** the component survives any number of updates.
- **Lives in the shell's sheet body:** when the shell drops the sheet (concealed, closed, or another opened), dispose it, and mount it again in the new `sheetBody` when the Card sheet comes back, as with the ballot (#267).

## Inputs

Everything on this sheet is this viewer's own private view. Nothing is public, and the component works none of it out.

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` or `'concealed'`, as the shell |
| `interactive` | Phone | `false`: no control takes taps |
| `reducedMotion` | Phone | The game's Reduce motion; the device's is honoured as well |
| `viewer` | Phone | This phone's seat, or `null`. A change drops every input below unless the same update gives the new viewer's |
| `versions` | Phone | The match's art versions, for the card's person and device |
| `view` | This viewer's | `'card'`, `'knowledge'` or `'resources'`: the open part. Frontend holds it; the component only draws it and reports a tap |
| `hidden` | This viewer's | `true`: the card's back only. Frontend holds it ("Hide card" sets it; Show clears it) |
| `card` | This viewer's | The role card's face-up input, as `mountRoleCard` takes it: `{ role, team, facts, character, device, art }`. The component passes it through unchanged, with `back: 'sheet'` |
| `knowledge` | This viewer's | The projection's `knowledge` exactly as it is: `{ insiderSeatIds, knownUndercoverSeatId, scanResults }`, with its `'seat-n'` ids. The component prints only what it holds |
| `resources` | This viewer's | `[{ kind, value }]` in the order to show: `kind` is one of `RESOURCE_KINDS` (`weapons`, `role-action`, `move`, `injections`, `promises`), and `value` is Frontend's words for it |

**What the component draws from these, and only these:**
- **Knowledge rows** (`knowledgeRows(knowledge)`):
  - "Undercover · Player 6" from `knownUndercoverSeatId`;
  - "Unmapped trio · Players 2, 6, 8" from `insiderSeatIds`;
  - under "Scans", one row per scan result: "Round 2 · Player 7", and "Guess Blue · matched · in the Code".
    - `matched: false` reads "not matched".
    - `inCode: false` reads "not in the Code"; `inCode: null` says nothing about the Code.
  - **With none of these:** "You have no knowledge of other players." (the Lead's decision, [confirmed by the owner on 15 November 2026](../owner-decisions.md#15-november-2026-the-cards-empty-knowledge-line) (#280); below).
  - **With `knowledge` not given:** nothing at all, not that line.
- **Resource rows:** each `kind`'s icon, tint and title are the pack's (Weapons, Role Action, Move, Shared injections, Promises). Each `value` is Frontend's.
  - **Why the component doesn't word the values:** "2 of 2" needs the role's total, and "Available" needs the offers. Those are the rules' and the projection's, not the component's.
  - **Frontend's words come from the projection:**

    | Kind | From |
    | --- | --- |
    | Weapons | `self.ordinaryWeapons` |
    | Role Action | `self.roleActionSpent` and the offers |
    | Move | `self.movementSpent` |
    | Shared injections | `abilities.injectionsRemaining` and the role's total |
    | Promises | `promiseQuota` |

  - **No row by itself:** the component draws a row only when Frontend gives it. The Doctor's Shared injections appear because Frontend lists them.

**Privacy:**
- **Concealed:** the component draws nothing, and drops `view`, `hidden`, `card`, `knowledge` and `resources`. None is kept for when the phone shows again; Frontend gives them again.
- **A change of `viewer`:** drops them too, unless the same update gives the new viewer's.
- **Hidden:** no private word stays in the page. The role card turns face down, which keeps none of its fields, and the knowledge and resources rows are removed, not hidden.

## The shell's part

The pack draws "Hide card" as an icon button in the sheet's head, between the title and Close (`ui.mjs sheet({ actions })`). The shell's `sheet.actions` are the footer's buttons (the pack's `foot`), so the head needs its own input.

**The shell's `sheet.head`** (the Lead's, `8cfebb68`): `[{ id, icon, label, enabled, reason }]`.
- **Drawing:** each is an icon button (the kit's `iconButton`) in the head, after the title and before Close, kept by its id, with `label` as its accessible name.
- **Taps:** reported by the same `onSheetAction(id, sheetId)` as the footer.
- **Concealed:** the head's buttons go with the sheet, as everything else does.
- **Local only:** like Back and Close, a head action is this phone's own. It is taken while reconnecting, where a footer action is not, and never stands for a command; commands belong in the footer (the Lead's rule).
- **Ids:** every id in the head and the footer is the sheet's own.

`cardSheet(input)` gives `head: [{ id: 'hide', icon: 'hide', label: 'Hide card' }]` while the card shows, and `[]` while it is hidden, as the pack draws it. On `onSheetAction('hide', 'card')`, Frontend sets `hidden: true`.

## Callbacks

| Callback | When |
| --- | --- |
| `onView(view)` | A part of the segmented control is tapped: `'card'`, `'knowledge'` or `'resources'`. Switching is Frontend's local navigation and sends nothing |
| `onShow()` | The card back's Show is tapped. Frontend sets `hidden: false` |
| `onFocusReturn(detail)` | The focused control ended (the view changed under it, the card was hidden or shown, or the phone was concealed): the focus is on the component's root, for Frontend to move on |

**The controls** are the kit's and follow its policy:
- **Local navigation:** the segmented control and Show are local, so they work while `stale`, as the shell's back and close do. Neither reaches the server.
- **When not `interactive`:** they refuse.
- **The rows** are information, not controls.

## States

| Sheet 31 frame | State | Drawn |
| --- | --- | --- |
| Card | `view: 'card'` | The card fitted, then the segmented control |
| Knowledge · Hacker | `view: 'knowledge'` | The segmented control, the knowledge rows, "Scans" |
| Resources | `view: 'resources'` | The segmented control, the resource rows |
| Hidden | `hidden: true` | The card's back, "Hidden" and Show; no head action |
| — | Knowledge with nothing known | The segmented control and the one line |
| — | Reconnecting | As live; the segmented control and Show still work (local) |
| — | Concealed | Nothing |
| 56-like | 200 % text at 320 × 568 | The card fitted smaller; the segmented control's three words stacked one per row (`stack: true`, kit 0.5.0); a row's value under its title where they don't fit side by side (kit 0.5.0) |

**Motion:** none of its own. The role card and the kit keep theirs, and the shell's sheet slides in.

## Frontend's connection (proposed)

| Input | From |
| --- | --- |
| Sheet shown | The Card tab, while the match is current |
| `card` | The private role (`self.role`, `self.faction`), the viewer's own character, the role's device and its short lines, as the role stage takes them |
| `knowledge` | `knowledge`, as it is |
| `resources` | The list above, worded by Frontend from `self`, `abilities` and `promiseQuota` |
| `view`, `hidden` | Frontend's own state for the sheet. Hide and Show are local |

## Decided by the Lead (review of #270)

1. **The empty Knowledge line** reads "You have no knowledge of other players."
   - **Why not the pack's:** "Your role starts with no knowledge of other players." states a rule about the role, which the phone can't know.
   - **Why no "yet":** it would claim the role learns something later, which is a rule too.
   - **Status:** a departure from sheet 31's words under T3's principle, [confirmed by the owner on 15 November 2026](../owner-decisions.md#15-november-2026-the-cards-empty-knowledge-line). It is `CARD_SHEET_WORDS.noKnowledge`.
   - **In the agreement:** it is the one accepted amendment, recorded with T3's principle and "confirmed by the owner on 15 November 2026".
2. **The head action:** the shell's `sheet.head` (above).
3. **The card back's 240 px:** the Card sheet's own layout, as the pack sets it in its `card()` screen only. The role card is unchanged.
4. **Resources:** the Lead asks Integration and Backend on #4 whether the projection should carry the injections' total ("2 of 2"). "Available" from the offers and "Used this round" from `self` stay Frontend's words.

## Not in this version yet

Listed, not omitted:

| What | Waiting on |
| --- | --- |
| The injections' total in the projection | Integration and Backend (through the Lead on #4) |

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/card.test.mjs` | 9 of 9 (also on `6c142c0d`, after the shell's merge): the runtime-safe graph, every style scoped (layout only, the role card's parts untouched), the pinned pack unchanged, the pack's words and the one amendment, the Knowledge rows, the sheet's words and head, the inputs' refusals, the privacy rules and the check's record |
  | `npm run test:design` | 400 of 400 (on `96bd1fe`, before the shell's merge; CI runs the suites on each push) |
  | `npm run test:tooling` | 337 of 337 (on `96bd1fe`) |
  | `npm run build`, `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/card-check.mjs`:** recorded on `6c142c0d` (the shell at `3fb12935` merged in as `45758c57`, and the switcher's `stack: true`), with the source clean. The same result as on `1679a0e`, `b1559cf` and `a35c414`, with three changes in the captures, all from the shell and the kit:
  - **The three 200 % captures at 320 × 568** show the kit's Largest-text forms: the switcher's three words one per row, and a row's value under its title. This is the fix for my Largest-text finding.
  - **Reconnecting:** the sheet stays 8 px below the shell's banner, so Retry is in sight.
  - **Found, for the Lead:** in the Card view at 200 % on 320 × 568, the stacked switcher leaves the card's place about 80 px tall, so the card shrinks to its corner (`review/320x568-large-card.jpg`). Before the fix the card was about 290 px tall, but the switcher clipped "Resources". A floor on the card's place, with the sheet's body scrolling, would keep the card readable. That layout change waits for the Lead's decision.
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the other components'. The page keeps the browser's 16 px root, as the game does.
  - **Captures:** 21 of 21 pass, each drawing what its state asks: the view, the card or its back, the open part, the rows, the label and the note, and the room's crew behind.
    - Nine states at 390 × 844 and 430 × 932.
    - Three at 320 × 568 with 200 % text.
    - Concealed, no private word is in the page.
  - **The lifecycle probe** (`preview/probe.mjs`): 10 of 10 checks pass.
    - **As the page comes (9):** view, hide, refused, private, knowledge, resources, fit, dispose and motion.
    - **With the device's Reduce motion emulated (1):** motion.
  - **The agreement with the pinned pack** (`preview/agree.mjs`): 6 of 6 frames agree, with no differing part.
    - **What is compared:** each frame drawn by the pack's own `screens-game.mjs` `card()` beside the component, from the same fixtures:
      - the top bar and the sheet's place;
      - the sheet's title, sub and head action;
      - the card's place and the card, or its back with its words and Show;
      - the segmented control, its words and the open part;
      - each row's words and place, the group label and the note.

      Every comparison is to within half a pixel, measured once the shell's sheet has finished sliding in.
    - **The one accepted amendment:** the empty Knowledge line, T3's principle, [confirmed by the owner on 15 November 2026](../owner-decisions.md#15-november-2026-the-cards-empty-knowledge-line).
    - **Agree:** all six: the card (Doctor and Hacker), Knowledge (Hacker, and empty), Resources and the hidden card. "Hide card" sits in the sheet's head where the pack draws it. `card.test.mjs` allows no differing part.
  - **Page health:** no page errors and no failed requests. The one policy report is the known one, Zod's eval probe.
  - **Where the record is:** the captures and `check.json` are in `review/`.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
