# Three phone defects found while capturing the Insider board

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) (found there) · branch `codex/frontend-phone-polish` · base `1a92f3790e45622196014cc008544fc33c359c0a` (`codex/v1-board-release`, [#95](https://github.com/Amirkianfar66/GameN/pull/95)) · 11 October 2026

All three defects are in the base release. The first two are also visible in Integration's own [9 October evidence](evidence/board-recovery-2026-10-09/README.md). The third is the runtime counterpart of the fault the Designer fixed in the proposal at `0840939` ("Keep the board's figures under the card, tray, strip and menu"). They are fixed here separately from the feature work in #100 and #101, so the fix can be reviewed on its own.

## 1. The connection banner's icon lay over its words

**The defect.** On a phone, a stale view's banner ("Connection lost. Showing the last known state…") drew its connection icon on top of the third line of text, at 320×568 and 390×844 alike.

**Why.** `comic.css` draws the icon (public-board art) at the start of the banner and reserves `calc(var(--ms-space-3) + 36px)` of padding for it. The phone's own banner rule in `compact-phone.css` sets `padding: .5rem` with a more specific selector, which took that room away. The icon ended at 36 px (44 px at doubled text), while the words began at 8 px (16 px).

**The fix.** `compact-phone.css` gives the connection banner back its start padding, but only while the public-board art (and so the icon) is present: `[data-art~="public-board"]`.

## 2. At doubled text, navigation labels ran into each other

**The defect.** At doubled reader text on a 320 px phone, "Actions" was 74 px wide in a 64 px fifth of the navigation, and touched "Board" (a gap of −2 px).

**The fix.** The large-text block of `board-play.css` (`max-width: 18em`, the same block that already fits the Pass button's word) changes the four labels beside Pass:

- their side padding is dropped;
- their size becomes `0.5rem`.

They still grow with the reader's text, from 10.4 px at normal size to 16 px at doubled size, but each stays inside its own button. At 390 px they already fitted; they now keep a wider gap.

## 3. A public move flew over the open card

**The defect.** The layer that carries a moving character (`.phone-fx`, created by the host outside the redrawn shell) was at `z-index: 85`. Everything laid over the board was lower: the card, tray and menu at 5, the status bar at 24 and the strip at 70. A public move during an open card therefore drew the character over the card, the role art included. The board's own figures were already isolated (`isolation: isolate` on the own board); only the flight layer escaped.

**The fix.** `board-play.css` puts the layer at 1. That is over the board, which is its own stacking context at 0, and under every overlay; all of them share the same stacking context. A flight still crosses room panels unclipped, as the layer was made to.

## Confirmation keeps the board steady

The owner's phone rule says confirmation never shrinks the board until rooms disappear, and never grows it cumulatively. The board journey now checks this. Each run makes three rounds of confirming and going back, for a one-pick Shot and a two-pick Supply. Board heights are in pixels:

| Phone | Choosing | Confirming | Rooms while confirming |
| --- | --- | --- | --- |
| 320×568 | Shot 396 · Supply 373, the same in all three rounds | Shot 349 · Supply 335, the same in all three rounds | All five wholly in view |
| 390×844 | Shot 654 · Supply 643 | Shot 616 · Supply 602 | All five wholly in view |
| 320×568, doubled text | Shot 274 · Supply 153 | Shot 146 · Supply 143 | Hospital and Jail scrolled out of view, inside a board that scrolls |

At normal text nothing grows or shrinks from round to round, and no room leaves the view.

At doubled reader text on the smallest phone, the confirmation's words and its two controls take about 240 px, so the board keeps about 145 px. As at every enlarged-text step, the board then scrolls inside itself, and Hospital and Jail are out of view while confirming. They are reachable by scrolling, and nothing is chosen on the board at that step. This is recorded as a large-text trade-off for Designer and Integration review, not changed here. The alternatives (a capped strip that scrolls, or a more compact confirmation) change the confirmation's hierarchy.

## Checks added

**Capture checks.** The shared capture measurements (`apps/game/dev/capture/board-measure.mjs`, used by the board, recovery and emulator captures) now report three things:

- a connection banner whose icon lies over its words;
- any navigation label that runs past its button;
- any positioned overlay that a flight would be drawn over.

The board journey also gains the confirmation check above.

On the unchanged base stylesheets, the board journey reports:

- 3 problems from the first two checks: `320x568-stale-pauses` and `390x844-stale-pauses` (the icon), and `320x568-enlarged-text` ("Actions");
- with only the first two fixes in place, a flight drawn over an overlay at every step: over the status bar everywhere, and over any open card, tray, menu or strip.

With all three fixes it reports none.

**Style tests.** `apps/game/test/board-play-style.test.mjs` asserts the banner padding, the label rules and the layer order. Each fails without its fix and passes with it.

## Verification

All checks ran locally with Node 22.21.1 and npm 10.9.4.

| Check | Actual result |
| --- | --- |
| Full `npm run verify` on the clean commit `42a61bb5c9a771220d340190ac888312859f46b1` | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 173 presentation, 429 game, with no failures; the game count includes the two new style tests. Production exclusion: 54 reachable modules and 38 labeled development files, with no fixture or development code reachable. Balance: static 71/71; 522 scenarios (483 passed, 33 reviewed blocked, 6 manual, zero errors); 475 baselines with 4,388 controls detected; 10 playouts in each of 7/8/9. See [verification.txt](evidence/phone-polish-2026-10-11/verification.txt) |
| Board journey (simulation) | 130 measured steps, all clean. See [evidence/phone-polish-2026-10-11/](evidence/phone-polish-2026-10-11/README.md) |
| This branch merged locally with #101 (and so #100) and Backend #98 | Clean merge. Frontend 186 presentation and 432 game, engine 212 and Backend 145 tests passed. Not pushed; Integration owns the combined result |

No change touches contracts, tokens, Designer sources, root manifests or the lockfile. Browser emulation only; no physical device was tested.
