# Insider investigation board

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) · branch `codex/frontend-insider-board` · 11 October 2026 · **interim treatment, pending the Designer's**

> **Superseded on `codex/frontend-insider-file`.** There the Designer's Insider file replaces this interim board: see [insider-file.md](insider-file.md). This page records the interim board of [#100](https://github.com/Amirkianfar66/GameN/pull/100) as it was built.

The owner commissioned the Designer to create artwork and interactive comic animation for every V1 role ability and shared action. This is the first Frontend piece of that integration. It draws the Insider's starting knowledge as a board inside the Insider's own card.

When this board was built, the Designer had not delivered a treatment of it. The board is therefore built only from approved public crew cards and existing tokens, and it marks itself `data-treatment="interim"`. **It is not finished design.** The coordinator's mockup was not used as a design source.

The Designer has since delivered a first ability-art slice, **the Insider's file**: PR [#102](https://github.com/Amirkianfar66/GameN/pull/102) at `1453500a2c2313844903f037a948578052122d49`, proposal `abilities-0.1.0`, with a Frontend handoff in `docs/design/abilities-handoff.md`. It is a proposal awaiting two decisions:

- Integration adopting its kit into a reviewed export (DSN-D36);
- the owner's approval of its look and motion (DSN-D37).

This board already follows its never-show rules: see [The Designer's treatment](#the-designers-treatment).

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
3. **The roles.** Set apart from the players, a dashed group says "Between them, one each:". Below it is **one slip** with the three names stacked (Undercover, Alien, Cracker, in the rule's order), under all three players and beside none. Then: "Who holds which is not known." The slip is one picture with one accessible name: "Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known." The visible first line is hidden from assistive technology, because the slip's name says it.
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
- The three names are stacked in one slip. They are never a list a screen reader could pair item by item with the players, and never a row or column under a portrait. The first interim drew three chips in a row, which at 390 px stood one under each portrait ([before-role-chips-390x844-board.png](evidence/insider-board-2026-10-11/before-role-chips-390x844-board.png)). The Designer's rule replaced it.
- Every name in the slip is drawn the same way.
- No line, color, connector or motion joins a role to a player, and the board appears whole, at once.
- Only the slip's own accessible name says a role. Nothing on or around a player does, and no `aria-describedby`, `aria-labelledby`, `aria-controls` or `aria-owns` points from a player anywhere.

All six orderings of the same set render byte-identical markup.

**Requests and text.**

- The portraits are the public crew cards from the board bundle (`--ms-asset-piece-crew-card-cN`), which every phone loads for the board. Opening the board fetches nothing new, so asset requests cannot reveal the deal.
- Names are escaped text nodes, never classes, identifiers or URLs.
- No URL, storage, log or analytics behavior changed.

## The Designer's treatment

The interim board uses only:

- the approved crew cards `piece-crew-card-c1`…`c9`;
- tokens: paper, ink, panel, paper-deep, steel-mid and the lettering font.

The Designer's file (PR #102 at `1453500`, `abilities-0.1.0`) is what this board becomes once it is reviewed. Already the same here:

- the one field, sorted by seat on the client;
- three players built alike, in seat order;
- the roles as one picture with one name, below all three and beside none;
- no role-dependent loading;
- nothing before gameplay or while the card is closed;
- the knowledge sentence not repeated in the list.

What the file adds, and what it waits for:

| The Designer's file adds | Frontend's port | Waits for |
| --- | --- | --- |
| The kit: 11 neutral assets in one stylesheet, loaded **whole on every player phone** behind `[data-art~="abilities"]` | Load it with the player bundles. Never fetch on open | DSN-D36: the kit in a reviewed export and the runtime manifest pin. The fallback (paper, ink and words) needs no kit |
| The markup (`ab-file`, `ab-suspects`, `ab-photo`, `ab-roles`), the file under the role card when the card opens, and its words ("Insider file", "Who is which: unknown.") | Port its structure into `renderComicPlayerShell`. The toggle gives way to the file shown with the card | DSN-D37: the owner's look |
| **Inspect**: pressing a portrait shows that player's public facts. **Show on board** rings the character on the own board for 1.6 s | Public facts from the public seat model only | DSN-D37 |
| The assembly motion: 1,020 ms, once per page on the first deliberate open, never replayed. Reduced: an 80 ms fade. Cancelled at once by close, background, staleness or reduced motion | Ported onto the motion director's cancellation | DSN-D37 |
| **A closed folder, the same for every role**, when the card is pressed while it cannot be shown (stale view, time up) | Changes today's stale card for every role, which still shows the role card | DSN-D37, and Integration's agreement to the conceal change |

When those land, the reviewed commit and asset version replace `apps/game/hosted/private-card.css` and the interim classes. The model (`InsiderSetModel`) and the privacy lifecycle stay, and the tests here carry over.

## Changed files

- `packages/presentation/src/model/knowledge.ts` and `types.ts`: `knowledge.insider` (an `InsiderSetModel`) gives the seats in public seat order, the three roles in fixed order and the existing sentence.
- `packages/presentation/src/markup/comic-shell.ts`: draws the toggle and board in the open card when the phone is in the Card view and the view is live, with the roles as one stacked set. Removes the sentence from that card's knowledge list.
- `packages/presentation/src/copy/en.ts`: adds the interim words.
- `apps/game/hosted/browser-host.js`: owns the open state. Open only on a tap; reset whenever the card closes, the view leaves Card, the connection is not live or the private epoch changes. Also handles focus, Escape, and scrolling the board into view below the card's sticky heading.
- `apps/game/hosted/private-card.css`: the interim treatment, tightened on short phones. It is imported by the hosted entry and the board simulation.

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
| Full `npm run verify` on the clean commit `94f5939b5c44ae4f48b085bad287936bdf711ff6`, after the role-set change | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 179 presentation, 430 game, with no failures. Production exclusion and the full Balance gate passed, with provenance checked at this commit. See [verification.txt](evidence/insider-board-2026-10-11/verification.txt) |
| Full `npm run verify` on the earlier clean commit `1c3e8199860b8cbe1ebd093e1224cc8226f605cd` | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 179 presentation, 430 game. Production exclusion: 54 reachable modules, 39 labeled development files, no fixture or development code reachable. Balance: static 71/71; 522 scenarios (483 passed, 33 reviewed blocked, 6 manual, zero errors); 475 control baselines with 4,388 controls detected; 10 playouts in each of 7/8/9; provenance checked at this commit. See [verification.txt](evidence/insider-board-2026-10-11/verification.txt) |

The presentation tests cover:

- seat order, names, characters and fixed role order;
- that the six orderings draw identical boards;
- no pairing hooks;
- one role set with one accessible name, no list, and no role word on or pointing from a player;
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
- The treatment is interim. The Designer's file (#102) awaits DSN-D36 and DSN-D37.
- The board has no motion; the file's assembly motion arrives with it.
