# Insider investigation board

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) · branch `codex/frontend-insider-board` · 11 October 2026 · **interim treatment, pending the Designer's**

The owner commissioned the Designer to create artwork and interactive comic animation for every V1 role ability and shared action. This is the first Frontend piece of that integration. It draws the Insider's starting knowledge as a board inside the Insider's own card.

The Designer has not delivered a treatment of this board. The board is therefore built only from approved public crew cards and existing tokens, and it marks itself `data-treatment="interim"`. **It is not finished design.** The coordinator's mockup was not used as a design source.

## Baseline

| Reference | Value |
| --- | --- |
| Base | `1a92f3790e45622196014cc008544fc33c359c0a`, the head of `codex/v1-board-release` (staging release [#95](https://github.com/Amirkianfar66/GameN/pull/95), tracking [#94](https://github.com/Amirkianfar66/GameN/issues/94)) |
| Reviewed work in the base | Frontend #92 at `af291c1` (its recovery and OS-motion corrections included), Designer #88 at `93a7e32`, Designer copy #93 at `74ce6ee`, Backend #91 at `1051cca`, Backend #90 at `7f921f4` |
| Designer head when read | `08409392d1040f20d559a9f36a2a1d9bb23468c4` on `codex/designer-board-motion`, with proposal manifest `board-motion-0.3.0` outside the runtime. It has no Insider-board or role-ability delivery |
| Runtime assets / tokens | `design-0.2.0` / `0.4.0`, unchanged |
| Protocol | 2, unchanged |
| Gameplay | Current: `full-game-1.1.0` / `in-person-v1-pass-2026-10-08` / `a25cec29…7870183`. Legacy: `full-game-1.0.1` / `in-person-v1-2026-10-06` / `6ca355eb…2809a90` |
| Room capacity | Backend's `full-game-1.2.0` / `in-person-v1-capacity-2026-10-11` ([#98](https://github.com/Amirkianfar66/GameN/pull/98), not in the base) changes no field this board reads |
| Toolchain | Node `22.21.1`, npm `10.9.4` |

## The rule and the data

The rule is in `rules/sources/v2.1-decisions.json`, `roles.Insider`, and no overlay changes it: "At game start receives the unordered set of three players who are Undercover, Alien, and Cracker, without knowing which is which."

The board reads one field, `FullPlayerView.knowledge.insiderCandidates`. It holds three distinct seats and appears only in the Insider's own player view; the contract refuses a non-empty set for any other role. The staged-start setup view (`FullSetupPlayerViewSchema`, `staged-start-1`) has no knowledge field at all, so the reading period cannot show the set.

This change asks nothing new of Backend or the contracts.

## What the Insider sees

1. **The toggle.** In the Card view, an "Investigation board" button sits above the role card. It is closed every time the card opens.
2. **The players.** Opening the board shows three players in public seat order. Each player has:
   - a portrait, which is the character card that player chose (the seat number if no identity is known);
   - a seat-number badge;
   - the display name, as text.
3. **The roles.** Set apart from the players, a dashed group says "Between them, one each:", then shows three identical chips — Undercover, Alien, Cracker — in the rule's order. It ends with "Who holds which is not known."
4. **Opening.** Focus moves to the board's heading, and the board scrolls into view inside the card. Its top stays below the card's sticky heading even when, at large text, the board is taller than the card. The role card makes way while the board is open, so the board fits a 320×568 phone.
5. **Closing.** "Hide investigation board" or Escape closes the board and returns focus to the toggle.
6. **No repeated sentence.** In the comic shell the "What you know" list no longer repeats the set, because the board says it. The plain shell, which has no art, still says it in one sentence.

The interim words live in `en.investigation`. They say no more than the rule does.

## Privacy

| Case | What the phone shows | Enforced by |
| --- | --- | --- |
| Another player, the host or the shared display | No board, toggle or sentence. Their views carry no set, and the display renders the public view | Contract refinement, `renderComicTableShell`, presentation test, display capture |
| Setup reading period | No knowledge. The role card shows the role and character only | `FullSetupPlayerViewSchema`, `role-confirmation.js`, game test |
| Card closed, or the Board, Actions or Menu view | Nothing is drawn. A closed card's private content is null | Screen, `renderComicPlayerShell`, presentation test |
| Page hidden or window loses focus | The card closes and the board with it. Private content leaves the model. Returning shows a closed card with the board closed | `setPageVisible`, the host's blur handler, the host's reset, game test, capture |
| View the server no longer confirms (stale) | Board, toggle and sentence are all withheld | `connection !== 'live'` check, presentation test, capture |
| Seat bound to another device | The screen is `blocked`; nothing of the match stays | Screen refusal, game test |
| View of another match | It never becomes this phone's match | Screen match check, game test |
| Private-content epoch changes | The board's open state resets | Host `draw()` |

**Nothing pairs a player with a role.**

- No role is written on or beside a portrait.
- The model sorts the three seats into public seat order, whatever order the view gives.
- The roles always appear in the rule's order.
- The three chips are identical.
- No line, color, connector or motion joins a role to a player, and the board appears whole, at once.
- No accessible name on the board contains a role word.

All six orderings of the same set render byte-identical markup.

**Requests and text.**

- The portraits are the public crew cards from the board bundle (`--ms-asset-piece-crew-card-cN`), which every phone loads for the board. Opening the board fetches nothing new, so asset requests cannot reveal the deal.
- Names are escaped text nodes, never classes, identifiers or URLs.
- No URL, storage, log or analytics behavior changed.

## Interim treatment and missing Designer assets

The board uses only:

- the approved crew cards `piece-crew-card-c1`…`c9`;
- tokens: paper, ink, panel, paper-deep, steel-mid and the lettering font.

Recorded for the Designer's role-ability commission:

| Missing | Interim stand-in | Constraint for the delivery |
| --- | --- | --- |
| Board frame and layout | Paper panel with an ink border | Keep players and roles in separate groups |
| Role group art (badges or a slate) | Three identical text chips | All three must look the same, or appear as one picture. `device-insider` (a slate with three alike marks) already sets this direction |
| Open and close motion | None: the board appears whole | No sequence or order that could stand for a role. Reduced motion must give the same result |
| Final words for the toggle, heading and two lines | `en.investigation` | Say no more than the rule |

When the Designer delivers, the reviewed commit and manifest version replace the interim classes and stylesheet, `apps/game/hosted/private-card.css`. The model (`InsiderSetModel`), the toggle, the focus handling and the privacy lifecycle stay.

## Changed files

- `packages/presentation/src/model/knowledge.ts` and `types.ts`: `knowledge.insider` (an `InsiderSetModel`) gives the seats in public seat order, the three roles in fixed order and the existing sentence.
- `packages/presentation/src/markup/comic-shell.ts`: draws the toggle and board in the open card when the phone is in the Card view and the view is live. Removes the sentence from that card's knowledge list.
- `packages/presentation/src/copy/en.ts`: adds the interim words.
- `apps/game/hosted/browser-host.js`: owns the open state. Open only on a tap; reset whenever the card closes, the view leaves Card, the connection is not live or the private epoch changes. Also handles focus, Escape, and scrolling the board into view below the card's sticky heading.
- `apps/game/hosted/private-card.css`: the interim treatment. It is imported by the hosted entry and the board simulation.

Development only:

- `insider` and `insider-long-names` board-simulation scenarios;
- the `capture-insider-board.mjs` sentinel-labeled capture;
- an Escape key for the capture driver.

## Verification

All checks below ran locally with Node 22.21.1 and npm 10.9.4.

| Check | Actual result |
| --- | --- |
| Presentation suite | 179/179 passed. This includes 6 new Insider-board tests and an updated knowledge test |
| Game suite | 430/430 passed. This includes 3 new screen-lifecycle tests. The first run failed the production-exclusion test because a comment sat inside a capture script's page string; it was moved out, and the test then passed |
| Browser capture (simulation) | 18 steps, 0 problems. See [evidence/insider-board-2026-10-11/](evidence/insider-board-2026-10-11/README.md). Its board-heading check reproduced a defect at doubled text, where the sticky card heading covered the board's top. Without the fix, 2 steps fail; with it, none do |
| Full `npm run verify` on the clean commit | Recorded below, under the commit it ran on |

The presentation tests cover:

- seat order, names, characters and fixed role order;
- that the six orderings draw identical boards;
- no pairing hooks, identical chips and role-free accessible names;
- absence on a closed card, in the background, on a stale view, in the other phone views, for other roles and on the display;
- a closed board by default;
- number fallbacks and escaped names;
- the plain shell's sentence.

The game tests use the real screen with a fake transport. They cover backgrounding and return, refusal (`blocked`), a stale listener and recovery, another match, and the setup schema and role card.

## Reproduce

```sh
npm ci
npm run build
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
# Browser simulation, synthetic views only:
npx vite --config apps/game/dev/board/vite.config.mjs        # serves 127.0.0.1:5178
# then http://127.0.0.1:5178/?scenario=insider  →  Card  →  Investigation board
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-insider-board.mjs <output-directory>
```

## Limits

- Browser emulation (Chromium device metrics) only. No physical phone, deployed service or multiplayer run was tested.
- Screenshots do not establish multiplayer correctness or social-deduction balance.
- The treatment is interim and awaits the Designer's reviewed delivery.
- The board has no motion until the Designer specifies one.
