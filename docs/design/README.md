# Visual and Motion Designer workstream

Issue [#4](https://github.com/Amirkianfar66/GameN/issues/4) · brief [agents/designer.md](../../agents/designer.md) · direction [art-direction.md](art-direction.md), [motion-direction.md](motion-direction.md)

Designer owns `design/`, `packages/design-tokens/` and this directory. Frontend owns the runtime in React, Three.js and GSAP. Codex owns shared contracts, rules, root manifests, the lockfile, CI and the integrity guards; nothing of theirs is changed here, and what Designer needs from them is in [integration-requests.md](integration-requests.md).

**This is the first V1 milestone, not V1.** The owner's goal for Version 1 is a complete game for people playing together in person, on private phones with a physical or shared board ([#9](https://github.com/Amirkianfar66/GameN/issues/9)). What is here is the visual and interaction contract for that phone-and-table experience, and the first finished pieces of it: one room, the token, the public markers, one private role card and the cues the contracts authorize. A finished Officer card does not make a complete game; what is still missing is listed in [asset-inventory.md](asset-inventory.md#not-produced).

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

Nothing here changes a rule, a contract, a lockfile or CI. The four pinned Designer files (`art-direction.md`, `motion-direction.md`, `design-tokens.json`, `agents/designer.md`) are untouched byte for byte; this work applies and extends them in new files.

## What is here

| Document | What it is |
| --- | --- |
| [visual-interaction-contract.md](visual-interaction-contract.md) | The contract: surfaces, the phone's two layers, the table's comic page, what may be shown where, how art is loaded, and the token revision |
| [layouts.md](layouts.md) | Annotated phone and table layouts, each number tied to a component and the fact it is drawn from. *Generated* |
| [component-states.md](component-states.md) | Every component and state: its source, how it looks, its words. *Generated* |
| [motion-storyboards.md](motion-storyboards.md) | Opening, accent and settled frames for every authorized cue, with reduced-motion and reduced-effects alternatives; then, fenced, the two synthetic studies. *Generated* |
| [asset-inventory.md](asset-inventory.md) | What is finished and what is not produced; sizes, anchors, rights; a contact sheet of every export. *Generated* |
| [frontend-handoff.md](frontend-handoff.md) | For Frontend: how art is loaded, formats, coordinates, hooks, token and asset adoption, structure requests and review questions |
| [integration-requests.md](integration-requests.md) | For Codex: check wiring, the token revision and its lock update, contract fields the design is waiting for |
| [verification.md](verification.md) | The checks that were actually run, what each asserts and does not, what an independent review found, and what was not run |

The generated pages are written by `design/tools/write-docs.mjs` from the JSON under `design/contract/` and from the two manifests. Change the source, not the page.

| Path | Contents |
| --- | --- |
| `design/source/` | The editable artwork: layered SVG, drawn by hand, no text in it. `export-recipes.json` says how each export is lifted out. `source/studies/` holds the two study drawings and nothing an export may read |
| `design/exports/` | The assets: one stylesheet per bundle holding every picture in it, the same pictures as content-hashed files, two sprites, and `asset-manifest.json`. Never edited by hand |
| `design/studies/` | The two synthetic disclosure studies and their own manifest. Not assets, in no bundle |
| `design/contract/` | The machine-readable contract: components and states, cues, the studies, layout callouts, planned assets, proposed copy |
| `design/prototypes/` | Reference stylesheets on Frontend's own hooks, the loader, and the review pages. Development only; not shipped |
| `design/review/` | Review renders of those pages, and the reports of the two browser checks |
| `design/tools/` | Build, check, document and render scripts. Node built-ins only |
| `packages/design-tokens/` | The pinned 0.2.0 proposal, unchanged, and the additive 0.3.0 revision beside it |

## Status

Three words are used throughout and they are not interchangeable.

- **Finished** is artwork that is complete for this slice: drawn, exported, listed in the manifest, and drawn on the contact sheet where it was looked at. It is not approved. Human art review is pending and none of it has been seen on a phone or a shared display.
- **Proposal** is a specification or a value offered for review: the 0.3.0 tokens, the layouts, the reference stylesheets, the loading rule, the beat splits, the copy for the Officer card, every hook marked PROPOSED.
- **Measured** is a number read from something that ran. The only measurements here are from desktop Chrome on one Mac laying out the Designer's own hand-built copy of the shell markup. **No device measurement exists.**

| Deliverable | State |
| --- | --- |
| Room A vignette, layered, with anchors | Finished |
| Neutral token: badge and standee, numerals 1 to 9, Injured and Eliminated bodies | Finished |
| Captain, health, Jail, active-turn and own-seat markers, as chips and as board badges | Finished |
| Private Officer role illustration | Finished |
| Cue layers, interface icons, resource pips, halftone and hatch tiles | Finished |
| Private token emphasis (two rings and a dimmed token); the struck-out pip | Finished as pictures, and **drawn by no rule**: no field authorizes them yet (DSN-D02, DSN-D03) |
| Two disclosure studies (resolved shot, blocked outcome) | Synthetic study. Not assets. No approved fact; never connected |
| Design tokens 0.3.0 | Proposal, additive over the pinned 0.2.0 |
| Phone and table layouts, component and state contract | Proposal, on Frontend's existing hooks |
| How art is loaded: one stylesheet per bundle, drawn only once it has arrived | Proposal. Shown to work in the review pages; Frontend's runtime is unchanged and unmeasured |
| Cue timing, easing, storyboards, reduced-motion and reduced-effects alternatives | Proposal. Durations are the 0.2.0 token values, unmeasured |
| Reference stylesheets and review pages | Proposal. Frontend owns the runtime |
| Layout check and shell check ([verification.md](verification.md#checks-that-need-a-browser)) | Measured, in desktop Chrome only |
| Text contrast of the color pairs the design uses | Computed from token values. Not measured in compositing |
| Readability, touch accuracy, motion comfort, load and memory on phones and a shared display | **Not run** |
| Sound | Specified. **No audio asset exists** |
| Everything in [asset-inventory.md](asset-inventory.md#not-produced) | **Not produced** |

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
| DSN-D08 | Amber marks both interaction focus and the public active turn. Does that confuse, or give anyone an edge? | Game Balance and Frontend review | The active-turn marker always carries its words and is not drawn inside the private sheet. The two can still be on one phone screen at once: an amber control in an open sheet, above an amber “Active turn” chip in the list behind it. That is why this is a question |
| DSN-D09 | Is there any sound, and from which device? | Game owner | None produced. Two table-display sounds are proposed; phones stay silent for anything secret |
| DSN-D10 | How is Captain immunity shown, if at all? | Game owner; Backend supplies the fact | The Captain marker is a rank star and the word “Captain”. It says nothing about immunity and is deliberately not a shield |
| DSN-D11 | Where does an eliminated player's token go? | Game owner | It is drawn where the view says the seat is, flat and hollow. No extra zone is invented |

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
