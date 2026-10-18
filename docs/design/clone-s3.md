# Board v2: the Phantom Clone, privately (storyboard S3)

**A proposal from the Visual and Motion Designer, 18 October 2026.** Integration's completion request on #144 (14 October) asks the Designer to finish S3, the Alien's Phantom Clone, its private activation and its expiry, from the owner's motion specification of 13 October (section 3; G-03, Q-C01 to Q-C02f, Q-H03). This is S3, as the Designer's approved plan has it (motion-review-2026-10-13.md, S3): a card that the Alien's own phone shows in its sheet while the Clone is active and after it ended, and two films on that card, the activation and the expiry. Nothing is drawn on the board, on any phone: the public figure is the ordinary one for everyone, the Alien's own phone included. A block by the Clone is S4's (#130), exactly as Protection's.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** the Clone's eligibility, its duration (through the following normal round's resolution, Round 5 its own), its blocks and its end are the owner's decisions as Backend implements them in `full-game-1.10.0`: the release source `6ca4b51`, which staging runs, from #149 and [#153](https://github.com/Amirkianfar66/GameN/pull/153) (whose head `a9dd543` has the same Clone code). The card reads the own view; it starts nothing and decides nothing.
- **The contract** is 1.10's: `self.cloneStatus { used, activatedRound, expiresAfterRound, active }` on the Alien's own view, null on every other seat's, and the targetless `ACTIVATE_CLONE`, as that release publishes them.
- **The words** are the hosted board's (Frontend's release at the 1.10 baseline `6ca4b51`), quoted. The films add none.
- **Adoption:** each new file needs Integration's approval by name and hash (section 11).

| | |
| --- | --- |
| Branch | `claude/designer-clone-s3`, stacked on #160 (`claude/designer-hospital-four`) at `90dcd58` (merged in after #160's fix for a fifth clinical anchor; first stacked at `a668c10`), itself on #159, #158, #144, #130, #129, #128, #127 and the integration baseline `abb6839` |
| Why stacked | The card is the sheet's private claim (#144's controls take turns); the board it leaves alone is #128's with #144's capsule; the block is #130's S4; the four-berth board (#160) draws the same card |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/fx/clone.mjs`, `films/clone.mjs`, `js/clone-view.mjs`, `js/clone-fixtures.mjs`, 21 SVGs under `assets/clone/`, `packages/design-tokens/test/clone.test.mjs`, this page |
| Changed | The review page (`js/page.js`, `css/page.css`, `contact.html`), the asset tool, the capture tool, the static check, `contract/films.json` and the manifest (now `board-v2-0.8.0`). No scene, slot table, layout, figure or earlier film module changes. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## 1. Private, and never on the board

- **Where.** The card is the private claim of the sheet over the Hospital and the Jail (the owner's "controls take turns" of 14 October, `js/turns.mjs`), on the Alien's own phone alone. It is drawn only while that phone's private area is open in the foreground (Frontend's privacy rules: revealed, not concealed, current).
- **Not on the board.** The board's figure keeps its drawing, clothes, place and movement on every phone and the display, the Alien's own phone included: no shimmer, outline or marker. The capture compares the Alien's page, without its sheet, with another player's page, character for character (section 10).
- **Nothing fetched.** Every phone's bundle ships the Clone's art, whatever its seat; nothing is fetched when the card appears. The capture compares the request logs of the Alien's page and another player's.
- **No role on it.** The card, its art and its stamps name no role, side or faction, and its colors are 35 or more from every faction accent (the Alien's violet included).
- **In-person glare.** It is low-luminance and contained in the card: a dark stage, a phosphor green kept dim, no glow outside it, no sound.

## 2. The card

`fx/clone.mjs` `cloneCardLayout()`, in the sheet's body: 100 px tall at normal text (taller when its words need it at enlarged text), as wide as the body.

```
+----------------------------------------------------------+
| [ :  :        ]   CLONE ACTIVE                            |
| [ : real :  duplicate ]   Clone active through Round 3.   |
| [ :  :        ]                                           |
+----------------------------------------------------------+
  the portrait window      the words: the stamp, the status line
```

- **The portrait window** (at the card's start, 1.3 to 1): a dark stage with a faint grid and two projector pads. On the left, the character's place; on the right, the duplicate's. The character is drawn by the board's own figure functions, standing, in the clothes of its current place: the crew's, the prison suit in the Jail, the gown in the Hospital.
- **The words:** a stamp, CLONE ACTIVE (phosphor green) or CLONE ENDED (grey), the page's text hidden from assistive technology; and the client's status line, which says it: today the hosted board's "Clone active through Round 3." and "Clone inactive; its once-only use is spent."
- **Its states,** from the own view alone (`films/clone.mjs` `cloneCard()`):

| The own view | The card |
| --- | --- |
| `cloneStatus` null (every seat but the Alien's) | None |
| Unused | None: the Actions tray offers the Clone, with its mark |
| Active | The dotted outline (the real character, hidden), the duplicate beside it in the ordinary drawing, CLONE ACTIVE, the status line |
| Ended (used, not active) | The character alone, CLONE ENDED, the status line |
| The Alien Eliminated | None: elimination ends the Clone with no art; the client's words alone |

- **The tray's mark** (`assets/clone/mark.svg`): a character's bust and its dashed double, one ink in a 32 x 32 cell, in the idiom of the kit's other marks (`design/abilities/source/actions.svg`), beside the action's English label ("Clone"). It names no role; every phone's kit has it.
- **Anchors** (`cloneCardLayout()`, CSS pixels): the card spans the sheet's body (`turnsLayout().sheet.body`), whose height is `cloneBodyHeight()`: from the body's top down to 6 px above the raised Pass, and never more than the sheet holds. The portrait window is 88 px tall at 1.3 to 1, 6 px in from the card's start and centred in its height. Each figure stands on a feet anchor at 95% of the window's height, the character's at 32% of its width and the duplicate's at 70%. The figure's frame (the board's own `FRAME`) is placed from those feet, scaled so that the figure spans 86% of the window's height. The words' column starts 10 px after the window and keeps 6 px from the card's end.
- **Layers,** back to front, in the portrait window: the stage (`stageSvg()`: the dark stage, its grid and the two pads), the character, its dotted outline (`outlineSvg()`), the halftone duplicate (`halftoneSvg()`), the duplicate in the ordinary drawing, and the scan band (`scanSvg()`) on top. The stamps and the status line are in the words' column, beside the window. All of it stays inside the sheet; nothing is drawn over the board.

## 3. The activation (1.8 s)

| Beat | ms | What the card draws |
| --- | --- | --- |
| Scan | 0–400 | Holographic scan lines sweep up the character, feet to head |
| Duplicate | 400–900 | A halftone duplicate silhouette forms beside it, on the second projector pad, which lights |
| Resolve | 900–1300 | The duplicate resolves into the same character: the same drawing, in the same clothes |
| Vanish | 1300–1800 | The real character fades to a dotted outline as the lines sweep back down it; CLONE ACTIVE is stamped (1640–1800) |

Reduced motion: the card as it was (the character alone), held 400 ms, then the active card, cross-faded over 80 ms. No scan, halftone, travel or pop.

## 4. The expiry (0.9 s)

| Beat | ms | What the card draws |
| --- | --- | --- |
| Scan | 0–300 | The scan lines sweep down the duplicate; CLONE ACTIVE fades |
| Dissolve | 300–600 | The duplicate breaks up into its halftone and is gone; its pad goes dark |
| Restore | 600–900 | The dotted outline fills back into the character; CLONE ENDED is stamped (740–900) |

Reduced motion: the active card, held 400 ms, then the ended card, cross-faded over 80 ms, the stamps taking turns (CLONE ACTIVE out in the fade's first half, CLONE ENDED in during its second).

## 5. When a film plays

`films/clone.mjs` `cloneFilmFor()`, from the own view alone:

1. **The activation** plays when a live view first says the Clone is active where the view before said it was unused: the accepted `ACTIVATE_CLONE`. It plays the first time the card is in the foreground, once.
2. **The expiry** plays when a live view says the Clone is no longer active where the view before said it was, the Alien not Eliminated and the match not over (the expiry after the last covered round's resolution). It plays the next time the card is in the foreground, once.
3. **Never on a reconnect, a baseline or a resumed page:** the card shows its state at rest. A missed film is not owed.
4. **It stops at once,** the card showing its state, when the private area closes or conceals, the page is hidden, or a newer view changes the Clone.
5. **Elimination** ends the Clone with no card and no film (Q-C02: elimination ends it; the client's words alone).
6. **The match's end** ends an active Clone too: 1.10 clears `active` when the match finishes or is aborted, its use kept (`stopCloneEffects()`). The view that ends the match plays no film (`matchEnded`): the match's result takes the screen.
7. **The Jail** changes nothing: an active Clone stays active after imprisonment until its original expiry (Q-C02f), and the card keeps its state, its portrait in the prison suit.
8. **A block** is S4's, the same as Protection's, for the room's occupants (#130). The card does not react to it and counts nothing.

## 6. The inputs

| Input | From |
| --- | --- |
| Which card | The own view's `self.cloneStatus` (and the own seat's health) |
| Which film | A live change of the own view's `cloneStatus`, and whether that view ends the match: its phase `FINISHED` or `ABORTED` (`cloneFilmFor()`) |
| `t` | Milliseconds from the film's start in the foreground |
| The portrait | The own seat's character and the clothes of its current place |
| The words | The client's status line for `cloneStatus` |
| `reduced` | The device's setting |

Not an input: an actor, a target, an attacker, a block, another seat's view, a role word, a side, a faction, a cause, or a clock of the client's own. `expiresAfterRound` reaches the screen only in the client's words; no countdown is drawn.

## 7. For Frontend

Frontend's consumer review (#162) covers this PR at `cb9386b`. Please review any later change before it is ported.

1. Draw the card as the sheet's private claim on the Alien's own phone alone, only while the private area is revealed in the foreground; remove it as the private area's rules remove private content.
2. Take its state from `cloneCard()` and its film from `cloneFilmFor()`, both from the own view, with `matchEnded` for the view that finishes or aborts the match. Play a film once, the first time the card is in the foreground after the live change; never on a reconnect, a baseline or a resumed page.
3. Ship the art in every phone's bundle; never fetch it on the Alien's phone alone.
4. Keep the board untouched: no marker, outline or shimmer on the Alien's figure, on any phone.
5. Show the status line in the client's own words; the stamps are decorative and hidden from assistive technology.
6. Keep the sheet's body clear of the raised Pass (`cloneBodyHeight()`): the card alone in the sheet has no actions row.
7. Put the tray's mark beside the Clone's action label in the Actions tray.

**Not to port:** `js/clone-view.mjs`, `js/clone-fixtures.mjs` and the other review controllers and fixtures.

**Review page options** (`design/board-v2/index.html?roster=9&film=clone&…`):

| Option | What it shows |
| --- | --- |
| `&case=activate\|expire\|jailed\|r5` | The synthetic cases: the activation in Room A, the expiry, the Clone active after a Jail vote, a Round 5 activation (synthetic: seat 3, Lyra, is the Alien) |
| `&t=<ms>` | The moment of the case's film (default 1000) |
| `&state=active\|ended` | The card at rest, as a reconnect shows it |
| `&viewer=own\|player\|display` | The Alien's own phone (default), another player's, the display |
| `&motion=reduced`, `&play=1`, `&text=2`, `&beds=4` | Reduced motion, a loop, enlarged text, the successor's board |
| `?sheet=clone` | The art on one sheet |

## 8. For Backend

No new field. The card needs `self.cloneStatus` alone, as 1.10 shapes it, with the own seat's health and the view's phase. The films rely on three things 1.10 does. Backend confirmed all three against the release source `6ca4b51` ([reconciliation](https://github.com/Amirkianfar66/GameN/blob/8e423a7d19b2df64e351b738ab37dae1e1ead854/docs/backend/designer-contract-reconciliation-2026-10-19.md), #157 `8e423a7`, answering the question on #153):

1. **The expiry.** The first view after the last covered round's resolution says `active: false` with `used: true` (`finishCloneCheckpoint()`, after the whole batch, before victory and the next phase); no view shows a half-finished checkpoint. The expiry film plays on that change.
2. **An elimination.** The view that publishes the Alien Eliminated also publishes its Clone inactive (`clearEliminatedCloneEffects()`), so no expiry film plays for it, and the card is removed.
3. **The match's end.** If the Clone is still active when the match finishes or is aborted, `active` clears in that same `FINISHED` or `ABORTED` view (`stopCloneEffects()`); the match's end publishes no earlier deactivation view of its own. A normal expiry or an elimination may already have cleared it. `matchEnded` keeps the expiry film from playing for that view. The showdown is live play, not the match's end: when Round 5's resolution ends a Clone and the match goes on to the showdown, the expiry plays; when it goes to `FINISHED`, it does not.

## 9. For Integration

1. **Approval by name and hash** of the two modules (`fx/clone.mjs`, `films/clone.mjs`) and the 21 SVGs (section 11).
2. **The film's contract** is `contract/films.json`'s entry 11 (`clone`), a proposal. It names no role: its audience is "its owner's own phone alone".
3. **The tray's mark** belongs with the ability art's Actions kit (`abilities-0.8.0`): placing it there is a separate, versioned change.
4. **No playable build** until 1.10 is adopted and Frontend has implemented the card. This page is not evidence that anything is implemented or deployed.

## 10. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **15 / 15.** #160's fourteen and the Clone's own. Its films are checked every 10 ms in both motion modes: the activation lasts 1.8 s and the expiry 0.9 s (0.48 s each reduced); the activation draws no card before its start; nothing but the moment, the film and the setting changes a frame (an attacker, a role, a side, a target or a block changes none); the character only fades out and the duplicate only in during the activation, and the reverse during the expiry; the reduced variants have no scan, halftone or pop and change only within their 80 ms cross-fade; each film ends exactly on the card at rest. The triggers: an activation only on a live change from unused to active, an expiry only on a live change from active to ended, none on a baseline, for an Eliminated Alien or for the view that ends the match; the card none, active or ended as the own view says. The words are the hosted board's, and the review's statuses have 1.10's shape. The card fits the sheet at every phone and roster the controls' layout fits, at normal and 200% text (42 layouts): its body clear of the raised Pass and tall enough for the card, the portrait whole, the duplicate beside the character, the words' column 150 px or wider. The palette is 35 or more from every faction accent, the card's styles use the palette alone, the shipped art names no role, and the controller never reaches a room, a figure or the board's surface. It also checks that the captures are current |
| `node design/tools/board-v2-capture.mjs` | **362 pictures and nine contact sheets, 0 with problems**, 31 of them the Clone's. Every Clone picture on the Alien's own phone is measured against its frame and its layout: the page at the film's stage; the card shown or not as the frame has it; its status line the client's words; the sheet's body where `turnsLayout()` and `cloneBodyHeight()` put it, clear of the raised Pass, the card whole in it and never scrolled; the portrait and the four figures where `cloneCardLayout()` puts them (to 0.6 px); each figure's opacity and the halftone's density as the frame has them; the scan band over its figure, its leading edge where the frame puts it (to 1 px); each stamp as the frame has it, whole in the card and clear of the portrait; a real pointer landing on every target outside the sheet. On another player's phone and the display: no card and no sheet, a pointer landing on every target, and no side or role word on any page |
| The same run: **412 whole-page comparisons, 0 differing** | #160's 403, and 9 for the Clone. The Alien's own page without its sheet and another player's page, character for character: during the activation at 390 × 844 and 320 × 568, during the expiry, in the Jail and on the four-berth board: 5. Another player's page and the display's: 1. The Alien's page without its sheet during the activation and after it: 1. The request logs of the Alien's page and another player's, during the activation and during the expiry: 2 |
| The same run: **230 pointer probes, 23 press tests (129 presses), 12 label placements** | 0 problems |
| Pictures byte for byte the same | Every review picture and contact sheet made before the Clone (326 pictures, eight sheets) re-rendered byte for byte the same; only `index.json` and `report.json` changed, with the new pictures. After the trigger's fix for the match's end (`matchEnded`, this PR's second commit), the whole capture was run again: all 357 pictures and nine sheets byte for byte the same as at `99c3ce3`; only the two records changed, with the inputs hash. After #160's fix was merged in (`90dcd58`, this PR's merge commit), the whole capture was run again: the same 357 pictures and eight of the nine sheets byte for byte as at `243a4f7`; the four-berth sheet gains #160's five new pictures, each byte for byte #160's, and the two records change with them |
| `node design/tools/board-v2-assets.mjs --check` | 148 files current |
| `npm test --workspace @mothership/design-tokens` | **317 / 317**, 11 of them in `clone.test.mjs` (and 13 in #160's `four.test.mjs`, with its fix) |
| `npm run verify` | Passed through `test:balance`'s static gate: toolchain, workspace and sources checks, both typechecks, bootstrap 55 / 55, engine 253 / 253, backend 187 / 187, tooling 130 / 130, frontend 194 / 194 and 448 / 448, design 317 / 317, balance static 103 / 103. `test:scenarios` refuses an uncommitted tree, so it was re-run on `243a4f7` in a clean checkout of that commit, clean before and after. Its catalogue passed (555 ids: 516 passed, 33 reviewed blocked, 6 explicit manual, zero errors), and its engine controls detected all 4490 (1419, 1418 and 1653 in modes 7, 8 and 9; none undetected), every listed leak caught. The gate then stopped at its 20-minute limit in this container, with no failure in its logs. `test:capacity` was not run here. Neither gate touches this PR's files; the PR's CI runs both. After the merge of #160's fix, `npm run verify` passed again through the same static gate; the scenario gate on the merge commit is the PR's CI's. On `99c3ce3`, CI's `verify` passed the whole scenario gate (catalogue, controls, playouts and report gate) and stopped only at `test:capacity`'s 600 s limit, in Integration's script |
| Two mutations (this session, not committed) | The films' clock: measuring each Clone picture against the frame 150 ms later than its query made 13 of the 23 pictures taken mid-film fail: on the stage, the figures' and the halftone's opacity and density, the scan band's place and the stamps. The trigger: without its match's-end guard, the static check failed on the Clone's triggers and `clone.test.mjs` failed 1 of its 11 tests |

The captures' inputs hash is `0c8b6661ecc7e1624c9a73f92b223c0cc50b6198bd19dde61fae47cb801e3787`.

**Not run:**

- Real phones, a screen reader, a phone's own text-size setting, or reduced motion set on a device: the review page takes `&motion=reduced` from its query.
- A match or any server: the views come from the review page's synthetic statuses, not from a 1.10 server.
- The private area's concealment (blur, a hidden page) and a film stopped by a newer view: specified (sections 5 and 7), not pictured.
- The owner's review.

Whether the Alien reads the dotted outline as "hidden" and the duplicate as "what the others see", and whether the card is discreet enough at a table, is for players, not a capture.

## 11. The exact files

Read every file at this PR's commit. Every file carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review; the Designer changes no fence and no pin.

**Proposed for import:** two pure modules and the 21 SVGs.

| Module | What it is | Exports |
| --- | --- | --- |
| `design/board-v2/fx/clone.mjs` | The Clone's private art, `board-v2-clone-0.1.0` | `CLONE_FX_VERSION`, `CLONE`, `CLONE_MIN_DISTANCE`, `cloneColorDistances`, `MIN_ACCENT_DISTANCE`, `CLONE_CARD`, `FIGURE_SPAN`, `cloneCardLayout`, `PASS_GAP`, `cloneBodyHeight`, `halftoneSvg`, `outlineSvg`, `scanSvg`, `stageSvg`, `markSvg` |
| `design/board-v2/films/clone.mjs` | The activation and the expiry, the card's state and the trigger, `board-v2-clone-films-0.1.0` | `CLONE_FILMS_VERSION`, `CLONE_FILM`, `CLONE_FILMS`, `cloneEnd`, `cloneFrame`, `cloneWords`, `cloneCard`, `cloneFilmFor`, `cloneContract` |

`fx/clone.mjs` imports the approved `design/board-motion/figures/body.mjs` and `scenes/kit.mjs`, unchanged, and #130's `fx/blocked.mjs` for its color measure; `films/clone.mjs` imports nothing. Nothing imports a controller, fixture or tool.

The 21 SVGs: the tray's mark (`assets/clone/mark.svg`, 32 x 32), the scan band and the stage at the card's size on a 390 px phone (`scan.svg`, `stage.svg`), and each character's dotted outline and halftone duplicate in the crew's clothes (`outline-c1.svg` to `-c9.svg`, `halftone-c1.svg` to `-c9.svg`, in the figure frame): samples of the functions, which draw the card from the Alien's character in the clothes of its place. The manifest's `clone` section lists each with its hash, the palette's distances, the card's measurements and the words' source.

To check every file proposed for import, and the generated contracts, run `sha256sum -c` on this block from the repository root:

```
c565f4301350c049534c8902b5780767522b1b3a7d8b330383462f4331460b7a  design/board-v2/fx/clone.mjs
34836d024ad992cde20e84dcaea3584b9c0c247ef7c5c5a2435c8df698187da0  design/board-v2/films/clone.mjs
08bec0ad1ef089a9b22cb42460953e6931572d25275a3068f764204f5830793f  design/board-v2/assets/clone/mark.svg
fe2585695051e696906172a99f2496cd6d864cb16875db121d8f998ad4eba860  design/board-v2/assets/clone/scan.svg
94e5828fa80ad510c9d7cfd917984a0ca8e17a192fd177cf5cbb3842db45999e  design/board-v2/assets/clone/stage.svg
54fcc39d7469cf012f7610e56e19a8dc7b9514592864321314250b9178fb34c9  design/board-v2/assets/clone/outline-c1.svg
56d449b476fb70c80571e1d28c72c307d7bc7e8547d608954845de22c2c7ca95  design/board-v2/assets/clone/halftone-c1.svg
82239d13d70238ae5b37407497fa592232f187f52c6504db40b2b3b546db8fce  design/board-v2/assets/clone/outline-c2.svg
7b44de68f8099f5397f4dc7db5741b97643bdc0d7df70f72740343d2b90c736c  design/board-v2/assets/clone/halftone-c2.svg
641923bea19bab4406a3136b1876e4d79ec3cc7acab626519d2095618fb54a7d  design/board-v2/assets/clone/outline-c3.svg
1f80abdc5262871015d6091329777ef9a251e3e24d2224b5f06d8e342cccbe32  design/board-v2/assets/clone/halftone-c3.svg
703dd63671072c701a263950e6c5a78fcbd02ff93569f8b76eb1bac48ef3dd79  design/board-v2/assets/clone/outline-c4.svg
870b6514c615e0ce0f8ee97178a8f4f2209d99109c9ec902a6b22bb00ef72cfa  design/board-v2/assets/clone/halftone-c4.svg
4878ef2cb12fb9a922d281155188bb83da5cb185fa1a79852c8bdc440a3e5676  design/board-v2/assets/clone/outline-c5.svg
ffcc0d8a0c5a1b801856fe0989ada0cad2e9cefa98c3ecfc188ffa4ef10d095f  design/board-v2/assets/clone/halftone-c5.svg
b2a75fcc2033da30e64733b0df6d7fb6bcf385a4b2ef71ad57e3975ff28b9b60  design/board-v2/assets/clone/outline-c6.svg
ddca6225c9cb57439df0ad217bbe40c01ba820d82ee363bcff388c76250ea1e6  design/board-v2/assets/clone/halftone-c6.svg
dcd2f4e32e6b26721de3a9725aca546431d3485116676e04231538fb6280a2ce  design/board-v2/assets/clone/outline-c7.svg
1cea176ffd4e58343974fb47ade271bb48f6cc9595af41efa7a213c8ccaf3c3b  design/board-v2/assets/clone/halftone-c7.svg
9adb6da5d702fd95bda3858296677fe84d65c3731a7d9af6349d75bfdf1b4dae  design/board-v2/assets/clone/outline-c8.svg
1cfb3a081f52f55665a55917c4d71f10cb0e4c88976c24f46fbcfebca5bb03e0  design/board-v2/assets/clone/halftone-c8.svg
7da28398ec36fabb15d5b744ac8f36964e8004049b14b57614710e6e71ff63ea  design/board-v2/assets/clone/outline-c9.svg
a1eb01b2acfe983cf6423ff55d3b5586de1b46159b5383993dff769f3ef7388e  design/board-v2/assets/clone/halftone-c9.svg
97f542eebed655d323c271f4074068a686a36508a2a81a607cc51f6d93959b7f  design/board-v2/contract/films.json
01608612e16b59626358d8d9b70b24e5cd8d0dc551313a58f36eba54af9131d6  design/board-v2/assets/manifest.json
```

**Review only, not to port:**

```
ea40454bb3e199dde122c1b4a487d38226adec67e14fac1ae6d79c1a99483cfe  design/board-v2/js/clone-view.mjs
2ae6ed2cf427c7d4882cf02408ab61dfb86ffd469490e235cab463034620c34d  design/board-v2/js/clone-fixtures.mjs
37d5235cc5ff19f8714efccdd0460dd356f7d2b667b4f76c2386001589c5e3c8  design/board-v2/js/page.js
877cbc6a296bb941c5db42837f948b665c741a44b9a929b91fbd5a293f289fdf  design/board-v2/css/page.css
1069aaffdeeec6dff5fbd1f71a939f7a936731a5ff96da0c5046324801e1a34f  design/board-v2/contact.html
805e8fba6f4740d1545adbfe89cc4a1363d1f0add7f60e0d3d23165e119ac981  design/tools/board-v2-assets.mjs
80e64e94a50af28cea3a20e65b8d7c3da794d411e972ac498c55f17cfcbc47a6  design/tools/board-v2-capture.mjs
5188ff632e7261178cc72c99fcba8c45758f553d48e57cff45fbd00022dcf583  design/tools/board-v2-check.mjs
871c8bb4b17f2f6daa2403e7526fa060909425333a94fb7defc15405179d785d  packages/design-tokens/test/clone.test.mjs
28cfdf0f6df564872faa44945cab5062c58759eefe3c7f90c1a96ac24cb2ecb6  design/board-v2/review/contact-clone.png
81cc9b09df3ac1be84d4274aba5cb4340f7f6128a7bc25e33c3d53f54697d73f  design/board-v2/review/index.json
5769735f3a97b7f47bd15b62a833674654d89c619c13c0648da48df2597a8409  design/board-v2/review/report.json
```

The complete list of every path this PR changes, its pictures included, with each SHA-256 at the head that delivered it, is in the [deliverables index](deliverables.md), version 8.

## 12. Unresolved

| Question | Owner | Meanwhile |
| --- | --- | --- |
| The status line's words | Frontend | The hosted board's, quoted |
| The tray's mark in the Actions kit | Integration, Frontend | `assets/clone/mark.svg`, beside the card |
| An idle shimmer while active | Owner, with the idle loops (step 7) | None: the card is still |
| A private sound | Owner | None: silent |
| Real phones, a screen reader, the owner's review | — | Not run |
