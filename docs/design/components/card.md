# The Card sheet: Designer's runtime component

**Version:** `card-sheet-0.1.0`. **Status (15 November 2026):** interface proposal, for review by the Lead Designer and then Frontend on #4. Nothing is built yet. It is stacked on the role stage (#268), whose role card it mounts as it is, and so on the phone shell (#265) and the shared kit.

**What it is:** the content of the Card tab's sheet during a match, as the phone pack draws it (sheet 31; #222 item 7). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 31):
- **The card,** fitted to the sheet: the Pre-game builder's role card (`role-stage/role-card.mjs`, `mountRoleCard`), face up, as the pack's `.card-fit` fits it.
- **The segmented control** under the card, or at the top in the other two views: Card, Knowledge and Resources (the kit's `seg`).
- **Knowledge:** what this viewer knows about other players: the Undercover's seat ("Undercover · Player 6"), the Insider's trio ("Unmapped trio · Players 2, 6, 8"), and for the Hacker a "Scans" group ("Round 2 · Player 7", "Guess Blue · matched · in the Code"). With nothing known, one line saying so.
- **Resources:** Weapons, Role Action, Move, Shared injections and Promises, each with Frontend's value ("0", "Available", "Used this round", "2 of 2", "Given 0/1 · Received 1/1").
- **Hidden:** the card's back with "Hidden" and Show (the role card's `back: 'sheet'`), and nothing else: no segmented control, knowledge or resources.
- **The sheet's words** for the shell: "Your role", "Only on this phone", Close, and "Hide card" in the sheet's head (see [the shell's part](#the-shells-part)).

**Not covered here:**
- the sheet's frame (the shell);
- the role card itself (the role stage's component: imported unchanged, and any change to it goes through the Lead);
- the Hacker's Scan and Code flows (sheet 42, a later component);
- the Promises sheet (sheet 33).

## Files (proposed)

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
  - **With none of these:** the pack's "Your role starts with no knowledge of other players." (question 1 below).
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

**Proposed for the shell:** `sheet.head: [{ id, icon, label, enabled, reason }]`.
- **Drawing:** each is an icon button (the kit's `iconButton`) in the head, before Close, with `label` as its accessible name.
- **Taps:** reported by the same `onSheetAction(id, sheetId)` as the footer.
- **Concealed:** the head's buttons go with the sheet, as everything else does.

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
| 56-like | 200 % text at 320 × 568 | The card fitted smaller; the segmented control's words whole; rows wrap |

**Motion:** none of its own. The role card and the kit keep theirs, and the shell's sheet slides in.

## Frontend's connection (proposed)

| Input | From |
| --- | --- |
| Sheet shown | The Card tab, while the match is current |
| `card` | The private role (`self.role`, `self.faction`), the viewer's own character, the role's device and its short lines, as the role stage takes them |
| `knowledge` | `knowledge`, as it is |
| `resources` | The list above, worded by Frontend from `self`, `abilities` and `promiseQuota` |
| `view`, `hidden` | Frontend's own state for the sheet. Hide and Show are local |

## Questions

1. **For the Lead: the empty Knowledge line.** The pack's "Your role starts with no knowledge of other players." states a rule about the role's start. With an empty `knowledge`, the component only knows that nothing is known now. Keep the pack's words, or a neutral "You know nothing about other players yet."?
2. **For the Lead: the shell's head action** (above): `sheet.head`, reported by `onSheetAction`.
3. **For the Lead: the role card's fit in the sheet.**
   - **Shown:** the card fills its host's height at 5 : 7, as the pack's `.card-fit`. This component gives it the sheet's space above the segmented control.
   - **Hidden:** the pack draws the back at most 240 px wide (`.cardback { max-width: 240px }`). This component gives the role card a host that wide. If the role card should size its back itself, that is its change.
4. **For Integration and Backend (through the Lead):** the resources' totals ("2 of 2") and the Role Action's availability are the projection's and the rules'. Frontend words them today. If the projection is to carry them as such, say so, and the component's `value` stays Frontend's words either way.

## Evidence planned

As the room scene's, the shell's and the ballot's:
- the preview inside the shell, with the room scene in its stage, in each state above;
- the probe: the view taps, Show, focus, the policy, privacy on concealment, a change of viewer and hiding, and dispose;
- `card-check.mjs`, capturing each state at 390 × 844 and 430 × 932, and 320 × 568 with 200 % text, under the production headers;
- the agreement with the pinned pack's own `screens-game.mjs` `card()` frames (sheet 31's four), words and boxes to within half a pixel;
- `card.test.mjs`.
