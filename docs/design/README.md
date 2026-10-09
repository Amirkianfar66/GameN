# Visual and Motion Designer workstream

Issue [#4](https://github.com/Amirkianfar66/GameN/issues/4) · brief [agents/designer.md](../../agents/designer.md) · direction [art-direction.md](art-direction.md), [motion-direction.md](motion-direction.md)

Designer owns `design/`, `packages/design-tokens/` and this directory. Frontend owns the runtime in React, Three.js and GSAP. Codex owns shared contracts, rules, root manifests, the lockfile, CI and the integrity guards; nothing of theirs is changed here, and what Designer needs from them is in [integration-requests.md](integration-requests.md).

**This is a milestone on the way to V1, not V1.** The owner's goal for Version 1 is a complete game for people playing together in person, on private phones with a physical or shared board ([#9](https://github.com/Amirkianfar66/GameN/issues/9)). What is here is the visual and interaction contract for that phone-and-table experience, and the finished pieces of it so far: five rooms, nine characters, the public markers, nine private role devices and the cues the contracts authorize. Art for nine roles does not make a complete game; what is still missing is listed in [asset-inventory.md](asset-inventory.md#not-produced).

**The look is the one the owner approved on 7 October 2026**: the board as a page of a comic book with rooms in color, nine crew characters as the playing pieces, and the role as a private card on which a device is added to the player's own character ([owner-decisions.md](owner-decisions.md)). It was approved as a working page, [design/explorations/comic-board/](../../design/explorations/comic-board/README.md), and has since been brought into the sources, the tokens, the exports, the contract and the reference stylesheets. Four parts of that page are not here yet, and each says what it waits for: [frontend-handoff.md](frontend-handoff.md#what-of-the-approved-direction-is-not-here-yet). **The owner has not looked at the adopted result**; what was approved and what was built from it are told apart in [owner-decisions.md](owner-decisions.md#adopted-since-and-what-the-owner-has-not-seen).

**Two facts the approved pieces need are in no contract**: a seat's display name and the character its player chose ([integration-requests.md](integration-requests.md#dsn-req-6)). Until they are, every seat is drawn as a numbered token and “Player N”, and the same stylesheet draws both.

## Provenance

| | |
| --- | --- |
| Runner | A Claude Code session, model `claude-opus-5-5`, acting as Visual and Motion Designer |
| Branch | `agent/designer-art-direction`, in its own worktree |
| Base commit | `333c9e820f362a211352bc689372663f29b73ac4` (merged bootstrap, PR #7). The worktree was clean and exactly at it when work began |
| Rule-source manifest | `rules/source-manifest.json`, SHA-256 `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`, hashed again here and found unchanged |
| Wire protocol | 1, as in `packages/contracts` at the base commit. Every state names the field of those views it is drawn from |
| Frontend reference | `agent/frontend-motion-gallery` at `fccadf7`, read only, for the hooks its markup has and the states its Shot card model produces. Unmerged. The review pages rebuild that markup by hand; they do not run Frontend's code |
| `docs/version-roadmap.md` | Not in this baseline, as expected. Read from issue #9 and from the unmerged `docs/v1-in-person-priority` (PR #10) |
| Date | 6 October 2026 |
| Stacked on it | `agent/designer-comic-board` (PR #57), on top of PR #45 at `6017c61`, 7 October 2026: the comic-board direction the owner approved, as an exploration, with its fence. Same runner and model |
| Stacked on that | `agent/designer-comic-adoption`, on top of PR #57 at `4fa2ff3`, 7 October 2026: the approved direction brought into the sources, tokens 0.4.0, the exports (`design-0.2.0`), the contract and the reference stylesheets, after the all-agents review of that date. Same runner and model |
| Read for it, and not in this base | `codex/v1-connected-merge-candidate` at `71dfd02`: the approved in-person V1 decisions V1-01 to V1-21, for the notes on the role-card copy. Nothing was built on it |

Nothing here changes a rule, a contract, a lockfile or CI. The four pinned Designer files (`art-direction.md`, `motion-direction.md`, `design-tokens.json`, `agents/designer.md`) are untouched byte for byte; this work applies and extends them in new files.

## What is here

| Document | What it is |
| --- | --- |
| [visual-interaction-contract.md](visual-interaction-contract.md) | The contract: surfaces, the phone's two layers, the table's comic page, what may be shown where, how art is loaded, and the token revision |
| [layouts.md](layouts.md) | Annotated phone and table layouts, each number tied to a component and the fact it is drawn from. *Generated* |
| [component-states.md](component-states.md) | Every component and state: its source, how it looks, its words. *Generated* |
| [motion-storyboards.md](motion-storyboards.md) | Frames from the opening to the settled state for every authorized cue, with reduced-motion and reduced-effects alternatives; then, fenced, the two synthetic studies. *Generated* |
| [asset-inventory.md](asset-inventory.md) | What is finished and what is not produced; sizes, anchors, rights; a contact sheet of every export. *Generated* |
| [frontend-handoff.md](frontend-handoff.md) | For Frontend: how art is loaded, formats, coordinates, hooks, token and asset adoption, structure requests and review questions |
| [integration-requests.md](integration-requests.md) | For Codex: check wiring, the token revision and its lock update, contract fields the design is waiting for |
| [verification.md](verification.md) | The checks that were actually run, what each asserts and does not, what an independent review found, and what was not run |
| [owner-decisions.md](owner-decisions.md) | What the game owner decided with Designer, in the owner's words: on 7 October 2026, the comic-board direction, approved; on 8 October 2026, phones first for V1, and the board as the game (issue #87). And what was built from them since, which the owner has not seen |
| [v1-phone-journey.md](v1-phone-journey.md) | **Issue #76.** The phone-first V1 journey: the journey map, the five priority screens and every supporting state, on the release candidate `87715a46` (PR #75). A proposal |
| [v1-phone-inventory.md](v1-phone-inventory.md) | Every state of that journey: the authorized data it is drawn from, what the release already does, and the gap. *Generated* from `design/v1-phone/contract/journey.json` |
| [v1-phone-handoff.md](v1-phone-handoff.md) | For Frontend: the components reused and new, assets, tokens, layout rules, state mappings, motion, copy, dependencies, and what goes to Integration (DSN-REQ-8 to 11) |
| [v1-phone-verification.md](v1-phone-verification.md) | The checks run for issue #76, with their results, and what was not run |
| [board-motion-handoff.md](board-motion-handoff.md) | **Issue #87.** The board as the game: every action chosen from a compact tray and played by tapping characters in their rooms, moving by room tags, Pass in the middle. For Frontend: components and release hooks, controller, layout, strip, motion, secrets, assets, tests, gaps. On the release candidate `94a49ce0` (PR #86). A proposal |
| [board-motion-coverage.md](board-motion-coverage.md) | Every action, every action with every character, every cue, the eleven states of all nine characters, the facts and their sources, the components and the gaps. *Generated* from `design/board-motion/contract/` |
| [board-motion-verification.md](board-motion-verification.md) | The checks run for issue #87, with their results, and what was not run |

The generated pages are written by `design/tools/write-docs.mjs` from the JSON under `design/contract/` and from the two manifests. Change the source, not the page.

| Path | Contents |
| --- | --- |
| `design/source/` | The editable artwork: layered SVG, drawn by hand, no text in it. `export-recipes.json` says how each export is lifted out. `source/studies/` holds the two study drawings and nothing an export may read |
| `design/exports/` | The assets: one stylesheet per bundle holding every picture in it, the same pictures as content-hashed files, two sprites, and `asset-manifest.json`. Never edited by hand |
| `design/studies/` | The two synthetic disclosure studies and their own manifest. Not assets, in no bundle |
| `design/contract/` | The machine-readable contract: components and states, cues, the studies, layout callouts, planned assets, proposed copy, and the catalog of the nine characters |
| `design/prototypes/` | Reference stylesheets on Frontend's own hooks, the loader, and the review pages. Development only; not shipped |
| `design/review/` | Review renders of those pages, and the reports of the two browser checks |
| `design/v1-phone/` | **Issue #76.** The working, navigable prototype of the phone-first V1 journey: 109 states from labeled synthetic fixtures, drawn with the reviewed tokens, bundles and loader, which it reads and does not change; its contract (`contract/journey.json`), screenshots, viewport matrix, storyboards and contact sheets (`review/`). Development only; not assets, not shells, and outside the review kit's inputs |
| `design/board-motion/` | **Issue #87.** The working prototype of the board as the game: 65 scenarios from labeled synthetic fixtures, every action played on the comic board, an observer pane drawing what every other screen sees; its contracts (`contract/`: stations, cues, coverage), three proposed prop layers lifted from the approved sources and the nine characters as full-body figures (owner's decision of 9 October 2026, drawn by `figures/`), in `assets/`, `board-motion-0.2.0`, outside the reviewed manifest, and its screenshots, viewport matrix, storyboards, secrecy pairs, character sheet and contact sheets (`review/`). Development only, except the prop layers and the figures, which are art proposed for a later export revision |
| `design/explorations/` | Looks tried with the owner, kept apart from everything above: `comic-board/` is the working page approved on 7 October 2026, which still shows the parts of that direction that are not adopted yet; `comic-figures/` is the pilot of full-body comic figures posed in the rooms (9 October 2026), which the owner said to try; the figures themselves are now the board-motion prototype's. It draws from the sources; nothing reviewed draws from it. Development only; not assets, not contract, not shells |
| `design/tools/` | Build, check, document and render scripts. Node built-ins only |
| `packages/design-tokens/` | The pinned 0.2.0 proposal, unchanged; the 0.4.0 revision beside it, additive over 0.2.0; and 0.3.0, kept so that a test can hold 0.4.0 to it |

## Status

Three words are used throughout and they are not interchangeable.

- **Finished** is artwork that is complete for this slice: drawn, exported, listed in the manifest, and drawn on the contact sheet where it was looked at. The owner approved the rooms, the characters and the devices as a direction, on a working page. No illustrator or art director has reviewed any of it, and none of it has been seen on a phone or a shared display.
- **Proposal** is a specification or a value offered for review: the 0.4.0 tokens, the layouts, the reference stylesheets, the loading rule, the beat splits, the copy for the nine role cards, the crew catalog, every hook marked PROPOSED, and the two facts no contract carries yet.
- **Measured** is a number read from something that ran. The only measurements here are from desktop Chrome on one Mac laying out the Designer's own hand-built copy of the shell markup. **No device measurement exists.**

| Deliverable | State |
| --- | --- |
| Five room vignettes, each printed in its own color family: Room A (layered), Room B, Command Room, Hospital, Jail | Finished. Approved by the owner as a direction |
| Nine crew characters, each as a standee and as a card | Finished. Approved by the owner as a direction. **Drawn in a connected match only once a seat's character is a fact** (DSN-REQ-6) |
| Nine private role devices | Finished. Approved by the owner as a direction |
| Neutral token: badge and standee, numerals 1 to 9, Injured and Eliminated bodies | Finished. It is the piece of every seat that has no character |
| Captain, health, Jail, active-turn and own-seat markers, as chips and as board badges | Finished |
| Cue layers (now with a landing burst), room caption icons, interface icons, resource pips, halftone and hatch tiles | Finished |
| The Officer role illustration of PR #45 (a sidearm on a card) | **Removed.** Superseded by the Officer's device: the owner dropped a separate picture per role |
| Private token emphasis (two rings and a dimmed token); the struck-out pip | Finished as pictures, and **drawn by no rule**: no field authorizes them yet (DSN-D02, DSN-D03) |
| Two disclosure studies (resolved shot, blocked outcome) | Synthetic study. Not assets. No approved fact; never connected |
| Design tokens 0.4.0 | Proposal, additive over the pinned 0.2.0; one listed revision of 0.3.0 |
| Phone and table layouts, component and state contract | Proposal, on Frontend's existing hooks and four PROPOSED ones for names, characters and the role card |
| Role-card copy for all nine roles | Proposal, for Frontend and the owner. Each rule statement cites a rule source in this branch |
| The crew catalog for Integration's identity record | Proposal. No shared contract |
| How art is loaded: one stylesheet per bundle, drawn only once it has arrived | Proposal. Shown to work in the review pages; Frontend's runtime is unchanged and unmeasured |
| Cue timing, easing, storyboards, reduced-motion and reduced-effects alternatives, for seven cues | Proposal. Unmeasured. The carried move and the role-card turn are the owner-approved ones, at 900 ms each; the other five keep their 0.2.0 durations |
| Reference stylesheets and review pages | Proposal. Frontend owns the runtime |
| Layout check and shell check ([verification.md](verification.md#checks-that-need-a-browser)) | Measured, in desktop Chrome only |
| Text contrast of the color pairs the design uses | Computed from token values. Not measured in compositing |
| Readability, touch accuracy, motion comfort, load and memory on phones and a shared display | **Not run** |
| Sound | Specified. **No audio asset exists** |
| Everything in [asset-inventory.md](asset-inventory.md#not-produced) | **Not produced** |
| The comic-board direction: five rooms in color, nine character pieces with number and name, the move and role-card motion, nine private role devices | **Approved by the owner** as the direction, 7 October 2026, on a working page. **Adopted** into sources, tokens, exports, contract and reference stylesheets, and seen in desktop Chrome only. The owner has not seen the adopted result |
| Of that direction: the comic page on a phone, moving by pressing a room, a card dealt into a hand, motion while nothing happens | **Not adopted** in the reviewed kit. The V1 journey below now designs the first three as proposals (DSN-D20, DSN-D26); motion while nothing happens stays out (DSN-D16) |
| The phone-first V1 journey (issue #76): host, joining, character selection, role reveal and Ready, the game, and every supporting state | **Proposal**, designed on the release candidate `87715a46`: a working prototype of 109 states; 136 screenshots and matrix captures; 12 storyboards from the real CSS; a generated inventory; a Frontend handoff. Measured in desktop Chromium only. **The owner has not seen it** |

## Open decisions

None of these is decided here. Each says who decides and what the design does meanwhile.

| ID | Question | Decided by | Meanwhile |
| --- | --- | --- | --- |
| DSN-D01 | May any audience be shown that a shot was resolved, what kind of attack it was, or that one was blocked? ([RULE-003](../decisions.md), D09) | Game owner; Backend enforces | No cue exists for any of it. The two treatments from the motion direction are synthetic studies: not assets, in no bundle, on one review page. An owner-approved V1 sheet on the unmerged integration branches (V1-17) keeps Protection and causes undisclosed; if it is adopted the studies stay studies |
| DSN-D02 | How does a phone know a shot is spent? Protocol 1 says only whether one is available | Codex, with Frontend | Nothing is drawn as spent. The nearest authorized state is the device's own report that its registration is no longer pending, which lasts until the player presses Done; after that the card shows whatever `self.shotAvailable` says, and “Not available” gives no reason. A struck-out pip is finished and waits |
| DSN-D03 | Which seats may be targeted? Protocol 1 carries no server list | Codex | Target rows are Frontend's provisional same-location hint. Two rings and a dimmed token are finished and drawn by no rule: a ring would claim a list that does not exist |
| DSN-D04 | Should the private sheet dock at the bottom edge, and should the connection banner stay in view? | Frontend, after device review | Proposed and shown in the review pages; the in-flow panel Frontend has today remains a complete fallback |
| DSN-D05 | Which lettering typeface, under which license? | Game owner | System condensed stack from the tokens. No font file is included |
| DSN-D06 | What rights statement and license apply to this artwork? It is original SVG drawn by a Claude Code session; the repository has no license | Game owner | The manifest says so plainly and grants nothing. Human art review is pending |
| DSN-D07 | How is the shared board shown in the room: an upright screen, or a device lying on the table, at what size and distance? | Game owner, with Frontend's device evidence | Designed for an upright screen at 1280 CSS px and up. 6 and 9 carry a bar so a token read from the far side is not mistaken. Token size at distance is unmeasured, and small: see [frontend-handoff.md](frontend-handoff.md#questions-for-your-review) |
| DSN-D08 | Amber marks both interaction focus and the public active turn. Does that confuse, or give anyone an edge? And now: the approved caption yellow, the Command Room's gold and one character's yellow are close to it | Game Balance and Frontend review | The active-turn marker always carries its words and is not drawn inside the private sheet. The two can still be on one phone screen at once: an amber control in an open sheet, above an amber “Active turn” chip in the list behind it. The caption yellow is 16 from amber in CIE76, the Command Room's gold 15, the yellow of character `c2` 14; none of the three means “press this” or “active turn”. That is why this is a question |
| DSN-D09 | Is there any sound, and from which device? | Game owner | None produced. Two table-display sounds are proposed; phones stay silent for anything secret |
| DSN-D10 | How is Captain immunity shown, if at all? | Game owner; Backend supplies the fact | The Captain marker is a rank star and the word “Captain”. It says nothing about immunity and is deliberately not a shield |
| DSN-D11 | Where does an eliminated player's token go? | Game owner | It is drawn where the view says the seat is, flat and hollow. No extra zone is invented |
| DSN-D12 | When may a cue start, and what may take it away? | Frontend, with Designer | **Agreed** ([cue freshness](motion-storyboards.md#cue-freshness)): start within 1000 ms, an event at most 1000 ms late, a public cue belongs to a public fact and never to a view, so nothing private can cut one. Frontend reports both windows and the fix for review finding R6 in PR #30 at `24a5237`; Designer has not run that code. The cap of four carried pieces for one view lives in the director, as Frontend proposed; it is not implemented. New since the agreement: the carried move uses the cue's origin, which the earlier answer said it would not |
| DSN-D13 | The approved comic board prints rooms in red, blue and violet, which are also the three team colors. Is a room then read as a team's? And one character's pink is the nearest of the nine to the Red accent | Game owner approved the look as shown; Game Balance and the reviewer may weigh it | The approved set is what the tokens and the exports hold. Measured in CIE76: Room A is 16 from the Blue accent, Room B 20 from the Alien accent, the Jail 18 from the Red accent, and the pink of `c6` 26 from the Red accent. A room's color is one recipe line and five token values; a second set that avoids those hues is in the exploration, one control away. A test fails if any of these numbers moves |
| DSN-D14 | Do the rooms keep the rules' names, or take the names of the owner's reference (Medical Room, Lockdown Room, Laboratory, Crew Meeting Room)? | Game owner; a rename is a rules and contract change | The rules' names: Hospital, Jail, Room A, Room B. Captions are live text |
| DSN-D15 | A player's name and chosen character are public facts no contract carries. How do they travel, where are they set, and in which order with the starting room (V1-01) and the role deal? | Codex, with Frontend and Game Balance ([DSN-REQ-6](integration-requests.md#dsn-req-6)) | A catalog of the nine characters is proposed. The reference draws a seat with them and a seat without them; the review pages use synthetic names. Assumed order: character and name, then the starting room, then roles |
| DSN-D16 | May anything move while nothing happens? The approved page has stars, lamps and a blink. `motionPolicy.loops` is `false` in the pinned 0.2.0 tokens, and the pinned motion direction allows only that “ambient light may breathe gently on the shared display” | Game owner, then Codex for the pinned value, then Designer with Frontend | None in the tokens, the contract or the reference stylesheets, which refuse an animation that repeats. Only in the exploration, and off there under reduced motion |
| DSN-D17 | The lines on the nine role cards, the call signs, and the words a tag is read aloud with | Frontend for interface wording, the owner for rule statements | Designer's draft for all nine, each rule statement citing its rule source; a check holds each card to its role's team and refuses a line that states an outcome. Frontend said on PR #57 that it will draft the eight new cards itself: these are offered to that draft, and Frontend's wording stands where the two differ. Where an approved V1 decision that is not in this base bears on a line, the line's note names it |
| DSN-D18 | The comic page on a phone, with rooms to press and a hand of cards, as the approved page has it. How is it read at 200% text, where a picture cannot grow, and what is the list then? | Frontend, with Designer; needs the movement markup of protocol 2 | A phone keeps its list of rooms, complete at any text size, with each room's strip, caption and color. The comic page is on the shared display |
| DSN-D19 | On a phone, is the role's picture a thumbnail in the private sheet that opens large, or the large card of the approved page whenever the card is turned up? | Game owner | A thumbnail, large behind “About this role”: the sheet holds the actions too, and a device in its team's color is then not large on screen every time the sheet is opened. This is Designer's choice in adoption, not what the owner looked at |
| DSN-D20 | Is the comic page a phone's primary game view, with offered rooms pressed on the board and the readable list as the complete path at large text? | Game owner for the look; Frontend for devices | Interaction approved by the owner in the compact-phone decision and issue #87: room-tag movement and character board targeting. Production adoption/device evidence remains Frontend/Integration work; DSN-D30/D31/D32 are separate gates |
| DSN-D21 | The role card large during setup, where there are no actions, and compact in the game's private sheet? | Game owner | Designed that way; the release already shows the large card in setup |
| DSN-D22 | On a phone, is the private card a bottom sheet under the sticky phase strip (low while a room is picked), and on a wide screen a drawer beside the board? | Frontend, after device review | Proposed; relates to DSN-D04 |
| DSN-D23 | May a join link or QR code carry the room code? | Integration ([DSN-REQ-9](integration-requests.md#dsn-req-9)) | Drawn as a labeled PROPOSAL; Copy code only |
| DSN-D24 | Does a visible “What changed since the last phase” panel, from public facts only, help the table, or change its social game? | Game Balance, then the owner | A Frontend proposal; the release already speaks the same sentences for screen readers |
| DSN-D25 | After Ready, should a player be able to turn the card up again until play starts? | Game owner | The release hides it after Ready; the design follows the release |
| DSN-D26 | Seven new cues: stage change, role deal, private card opening, request arriving, choice taken, result cover, and the room pick on the board | Game owner for the look; Frontend for cost | In the V1 prototype only, with reduced-motion alternatives; none added to the reviewed kit's cue contract |
| DSN-D27 | The owner's reference asks for at most five players in a room. The rules have no room capacity. Is five a rule, or only how a room is drawn? | Game owner with Game Balance; a capacity is a rule change | Five comic positions per room; six to nine in one room stand in a 3 x 3 crowd, everyone reachable ([board-motion-handoff.md](board-motion-handoff.md#12-gaps-and-open-decisions), GAP-2) |
| DSN-D28 | The reference draws arrows and lights along a corridor between rooms. The rules give no adjacency | Game owner | A steel spine with four lamps between the columns; no arrow, door or path (GAP-3) |
| DSN-D29 | Room subtitles from the reference: Captain, Engineering, Laboratory | Game owner | Shown, `aria-hidden`; the room's name is what is read and pressed (GAP-4) |
| DSN-D30 | Adopting the three prop layers (chart table, laboratory counter, Hospital bed) into a reviewed export revision | Integration | Proposals beside the kit (`design/board-motion/assets/`); without them, characters behind a prop stand in front of it (GAP-5) |
| DSN-D31 | Fourteen proposed board cues: the tray, the strip, eligible and picked characters, sending, not accepted, unknown, the room press, the tentative move, the sheet, the turn accent, the tally, the ballot subject, and the co-occupants' reflow | Game owner for the look; Frontend for cost | In the board-motion prototype only, each with its reduced-motion form; the six reviewed cues are unchanged |
| DSN-D32 | Full-body comic figures instead of the bust standees on the board: the owner said "lets try full body comic" (9 October 2026). Adopting the figures into a reviewed export revision, and drawing them in the game | Integration for the export revision; Frontend for the runtime; the game owner for the look | Drawn on the board-motion prototype as a proposal asset set (`design/board-motion/assets/figures/`, `board-motion.figures.css`, manifest `board-motion-0.2.0`); the approved standees stay in the kit, the exports and the runtime |
| DSN-D33 | A figure's pose follows public facts (the Captain at the chart table, Injured in the bed, Jailed on the bench, Eliminated on the floor). The crew catalog says a character never changes with health, Jail or the Captain, and that those are markers. May a pose say what a marker says? | Game owner, with Integration for the catalog | The character (face, skin, hair, colors, suit) never changes; the pose does, from public facts only, and every marker is still drawn |

The gameplay and disclosure questions in [decisions.md](../decisions.md) and [integration-baseline.md](../integration-baseline.md#decisions-and-adoption-gates) stay open exactly as recorded. No layout here settles one by drawing it: no route, exit, adjacency, capacity or default is implied by any picture.

## Run it

```sh
npm ci
npm run verify                                            # the workspace's own checks; unchanged by this work
npm run test --workspace @mothership/design-tokens        # token tests, and the tests proving the design checks can fail
npm run check:assets --workspace @mothership/design-tokens
```

After an edit to a source, a recipe, a contract file, a stylesheet or a review page, in this order:

```sh
npm run build:assets --workspace @mothership/design-tokens    # design/exports/, design/studies/, the review pages' generated files
npm run build:docs --workspace @mothership/design-tokens      # the four generated pages
npm run render:review --workspace @mothership/design-tokens   # design/review/*.png
npm run check:layout --workspace @mothership/design-tokens    # the layout matrix
npm run check:shell --workspace @mothership/design-tokens     # requests and the public layer, across every private state
npm run check:assets --workspace @mothership/design-tokens    # refuses renders and reports made before the edit
```

The middle three need a Chromium-based browser on the machine (`CHROME_PATH` overrides the search) and are not part of `verify`. So does `npm run prove:checks`, which shows that the two browser checks refuse known mistakes, and `npm run dev:review`, which serves the review pages at `http://127.0.0.1:4320/prototypes/`.

Everything the review pages show is synthetic: authored for looking at layout and motion, the outcome of no rule and no match. None of it is shipped.

The V1 phone journey (issue #76) has its own commands. It changes none of the reviewed kit's inputs, so the commands above are not affected:

```sh
npm run dev:review --workspace @mothership/design-tokens          # then http://127.0.0.1:4320/v1-phone/
npm run capture:v1-phone --workspace @mothership/design-tokens    # screenshots, matrix, storyboards, contact sheets; needs a browser
npm run docs:v1-phone --workspace @mothership/design-tokens       # writes docs/design/v1-phone-inventory.md
npm run check:v1-phone --workspace @mothership/design-tokens      # no browser; refuses captures and docs made before an edit
npm run flows:v1-phone --workspace @mothership/design-tokens      # presses the prototype's own buttons; needs a browser
```

`npm run test --workspace @mothership/design-tokens` includes the tests that show `check:v1-phone` refusing named mistakes. What was run, and what was not, is in [v1-phone-verification.md](v1-phone-verification.md).

The board-motion prototype (issue #87) has its own commands too. It changes none of the reviewed kit's inputs either:

```sh
npm run dev:review --workspace @mothership/design-tokens              # then http://127.0.0.1:4320/board-motion/
npm run assets:board-motion --workspace @mothership/design-tokens     # the prop layers, from the approved sources (--check to compare)
npm run capture:board-motion --workspace @mothership/design-tokens    # screenshots, matrix, storyboards, secrecy pairs, contact sheets; needs a browser
npm run docs:board-motion --workspace @mothership/design-tokens       # writes docs/design/board-motion-coverage.md
npm run check:board-motion --workspace @mothership/design-tokens      # no browser; needs npm run build; refuses captures and docs made before an edit
npm run flows:board-motion --workspace @mothership/design-tokens      # presses the prototype's own controls; needs a browser
```

What was run, and what was not, is in [board-motion-verification.md](board-motion-verification.md).
