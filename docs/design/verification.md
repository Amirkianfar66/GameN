# Verification of the Designer slice

Issue [#4](https://github.com/Amirkianfar66/GameN/issues/4) · branch `agent/designer-art-direction` · base `333c9e820f362a211352bc689372663f29b73ac4`.
Date: 6 October 2026. Environment: macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4`, Google Chrome `155.0.8059.39` for the scripts that need a browser.

Everything in the tables below was run on the tree this document is committed with, after `npm ci` and `npm run clean`. The commit it was run at is in the pull request description.

This page says what was run, what each check asserts, and what it does not. An earlier draft of it claimed more than its checks held; [the independent review](#independent-review) found that, and the tables here were rewritten from the code.

## Checks that need no browser

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed: 12 packages, toolchain hook passed. No dependency was added by this work |
| `npm run verify` | Passed, unchanged from the base: toolchain; 8 workspaces within their boundaries; source integrity (119 Canvas files and 1 example, 7 rule sources, 24 pinned files, 0.2.0 token proposal unchanged); typecheck; build; **16 tests**, 0 failed, skipped or todo |
| `npm run test --workspace @mothership/design-tokens` | Passed: **52 tests**, 0 failed, skipped or todo. 10 on the tokens, 1 that the design files pass every check, 41 that the checks refuse a named mistake |
| `npm run check:assets --workspace @mothership/design-tokens` | Passed: **13 of 13 checks**, over 20 assets, 88 exported files, 3 bundle stylesheets, 33 components, 6 cues and 2 fenced studies |
| The command line asked for in [DSN-REQ-1](integration-requests.md#dsn-req-1): build, then those two | Passed in 5 to 6 seconds on this machine, over three runs |
| `git diff --cached --check` against the base, with every new file staged | Clean |
| The four pinned Designer files and `packages/design-tokens/src/tokens.json` against the base | Unchanged, byte for byte: `check:sources` passes |

`verify` does not run the Designer tests or checks. They pass locally and are **not run in CI** until [DSN-REQ-1](integration-requests.md#dsn-req-1) lands.

### What the thirteen checks assert

Each is a statement about files in the repository. None says anything about a phone, a display or how the art looks.

| Check | It refuses | It does not tell |
| --- | --- | --- |
| Exports and studies match their sources | An export, a study, a bundle stylesheet or a manifest that is not byte for byte what the sources and recipes produce; a missing file; a file no recipe produces | Whether the sources are good drawings |
| Manifests match the files | A wrong hash or size; a file name without its content hash; a stale source hash; a missing rights field; a bundle stylesheet that holds anything but its own variants, each exactly as its file; a bundle stylesheet that would fetch anything | Whether a client loads the stylesheet rather than the files |
| Provenance pins agree | A rule-source hash that is not the hash of `rules/source-manifest.json`; a token, manifest or study-manifest version that differs between files; a manifest version that would not fit `assetManifestVersion` | Whether the rule sources themselves changed meaning |
| Sources, exports and sprites use only the drawing vocabulary | Any element outside ten (`svg`, `defs`, `g`, `path`, `circle`, `ellipse`, `rect`, `polygon`, `pattern`, `clipPath`) and, in sprites, `symbol`; any attribute outside a short list; any paint that is not `none`, a six-digit hex color or a reference inside the file; a shape that would default to black. So: no text, title, image, style, link, filter, named color, `rgb()`, eight-digit hex or outside reference | Whether a shape drawn with those elements looks like a letter. No word is drawn in any file; that was checked by eye on the contact sheet |
| Every color is in its palette | A color that is not a token value in the palette the asset is allowed; a faction color on anything that may be drawn publicly, or in the public sprite; amber on a public asset other than the active-turn marker | Contrast in compositing |
| Bundles, surfaces and names disclose nothing | A variant drawn where its bundle does not reach; private-only art in the bundle the table loads; role art allowed outside the private sheet; a sprite symbol taken from another bundle; outside the role bundle, an asset id, variant name, file name, sprite symbol, layer label or definition id that contains, as a whole name part, a role name, `blue`, `red`, `faction…`, `protect…`, `shield…`, `immun…`, `weapon…` or `code…`; a role bundle that does not expect the nine roles in `rules/overlays/player-modes-officer.json` | Whether a picture's *shape* suggests something private. The Captain marker was a shield until a reviewer saw it; a name check cannot see that |
| The synthetic studies are fenced | A study in the asset manifest, in a bundle or among the exports; an asset drawn from `source/studies/`; a study file without the development-only mark; a study with a surface, without a gate, or for connected use; anything in the cue list that is not an authorized cue; any file of the review kit other than the four study files that names the study stylesheet, module, index, properties, directory or contract; a study duration that is not `motionMs.publicImpact` | Whether someone copies a study into a shell on purpose. It is a fence against accident |
| Reference stylesheets | In `comic.css` and `cues.css`: a picture drawn without waiting for its own bundle, outside `@media (forced-colors: none)`, on the table when its manifest entry does not allow the table, or outside `.ms-private__panel` when it is private-only; a picture asked for by address; a rule that styles something outside the private sheet by what is inside it; a private hook on the table; a selector keyed on a role, a team or a private word; a literal, named or functional color; a system color outside forced colors; the `animation` shorthand; a repeating animation; an animation in `comic.css`; a duration that is not a motion token; a director cue with no treatment; a variable read and defined nowhere; a proposed token variable that nothing reads; the retired `data-assets` hook; generated review files that are out of date | Anything about a stylesheet other than these two. It reads selectors as text: a rule written in a way it does not anticipate could pass, which is why `check:shell` asks the same questions of a running page |
| Motion contract | A duration that is not its token value; beats that do not add up or differ from the tokens; a cue the director does not issue; a public registration cue; a split of `publicImpact` in the tokens; a cue that does not say what it belongs to; a rule that lets any newer view replace a cue; freshness windows that are missing or looser than Frontend's provisional ones; a freshness rule that no longer says a private-only update withdraws no public cue | Whether a cue feels right, whether the proposed windows are good, and whether Frontend's director follows any of it |
| Component, state and layout contracts | A state with no source, no description of its look or no words; a private component on a public surface; a component drawn where its asset may not be drawn; private-only art listed by a public component; a required state that does not exist or that nothing draws; a Shot card contract whose states are not exactly the pictures the review kit draws, or a kit that does not draw exactly Frontend's ten statuses; a Shot card picture that draws the spent pip; a layout board that asks for a picture that does not exist; a callout naming an unknown component | **Whether a state really differs from its neighbors other than by color.** It requires the three fields to be filled in. Whether the look they describe is real was judged by eye on the state sheets, and two pairs of statuses do share an outline |
| Proposed copy | A rule-source reference that does not resolve; copy that mentions the archived identification step; a role name on the pip or the private handle; a proposed card for a role with no illustration | Whether the copy states the rule correctly. That is a reader's job; one line was wrong until a reviewer read it against the showdown overlay |
| Tokens only add | Any 0.2.0 key removed or changed in 0.3.0; a stale hash in the lock-update request | Whether the new values are good |
| Generated documents, review images and browser reports | A generated page edited by hand or out of date; an embedded image that does not exist; a review image no render made; review images, a layout report or a shell report made from pages, exports, studies or contracts that have since changed; a report that records failures or covers only part of its matrix | What is in an image. That an image is current does not mean anyone looked at it |

### The checks can fail

A check that has only ever passed proves little. 41 tests each copy the design files to a scratch directory, make one or more mistakes the way a person would, and expect the export build or the check to refuse each by name. They cover every row of the table above: a hand-edited export, manifest and stylesheet; a contract that pins another rule-source manifest; text, a title, a named color, `rgb()`, eight-digit hex, a `style` attribute, an unfilled shape, an image and an outside link in a source; a faction color on the token; amber in the room; a role word in an asset id, a variant name and a layer label; role art allowed on the table; private-only art in the public bundle; a sprite reaching into another bundle; a study read by an export recipe, linked from a shell page, imported by the review kit, drawn by a cue stylesheet, put back among the cues or given a token; art drawn without waiting for its bundle, for the wrong bundle, outside the private sheet, or on the table; the public layer styled by private state; a role-keyed selector; a picture asked for by address; literal, named and functional colors; a looping animation; a cue that belongs to nothing and a rule that lets any newer view replace a cue; a contract that does not match the review kit; a spent pip; stale renders and stale reports. The repository is not touched: the copies are made in the system temporary directory and removed.

### Token tests

The ten token tests hold that 0.3.0 only adds to 0.2.0; that every field Frontend's `ShellTokenSource` names is present with the same type; that every new color, font family and easing is a plain CSS value its token writer accepts; that each cue's opening, accent and settle add up to the unchanged token total and that the studies have no split of their own; that the policy flags are still off; and these computed contrast ratios.

| Pair | Ratio is at least |
| --- | --- |
| Ink on paper, paperShade, paperDeep, amber and the token body; paper on canvas, panel, ink and steel.shadow; secondary text on canvas and panel | 4.5:1 |
| Focus ring on canvas and panel; amber outline on panel; paper keyline on panel; token body on canvas; steel.mid edge on canvas | 3:1 |
| Amber on paper, and the focus ring on paper | **Below** 3:1, asserted: this is why paper surfaces use ink for both |

These are computed from token values with the WCAG formula. They are not measurements of the composited screen.

## Checks that need a browser

Run on the same tree, in desktop Chrome on this machine. They are not part of `verify`. Each writes a report under `design/review/` that records what it was run on; `check:assets` refuses a report made before a later edit.

| Command | Actual result |
| --- | --- |
| `npm run check:layout --workspace @mothership/design-tokens` | Passed: **360 cases, 0 failures**. Report: `design/review/layout-check.json` |
| `npm run check:shell --workspace @mothership/design-tokens` | Passed: **51 page loads, 468 redraws, 1,368 comparisons of the public layer, 26 private-only updates under 11 held public cue animations, 0 failures**. Report: `design/review/shell-check.json` |
| `npm run prove:checks --workspace @mothership/design-tokens` | **15 of 15** deliberate mistakes refused by name |
| `npm run render:review --workspace @mothership/design-tokens` | 27 images written to `design/review/`, no page error. Index: `design/review/index.json` |

**What all of these are and are not.** They are desktop Chrome laying out and loading the Designer's hand-built copy of Frontend's markup, with the Designer's reference stylesheets and loader. They are not a phone, not iOS Safari, not Android Chrome, not Frontend's runtime, and not a device measurement.

### The layout check

It lays out a shell at every combination of:

- player phone at 320, 360, 414, 599, 600 and 768 CSS px wide and 760 tall, and at 320 by 568 and 360 by 640; table display at 600, 960, 1279, 1280, 1440 and 1920;
- the browser's default text size at 16 and at 32 px, set as a browser setting, not as a zoom or a page style;
- on a phone: the public layer with the usual seating, with a jailed and injured seat, with a stress seating in which every seat carries every marker, with a stale connection, and without art; the open sheet in each of the thirteen pictures of the Shot card, with the role card expanded, with seven targets in the stress seating, with a role that has no card yet, and without art;
- on the table: four seatings, a stale connection, and two seatings without art.

and asserts in each:

1. nothing scrolls sideways and nothing is drawn past either side of the screen;
2. no token, name, marker, status word, caption, card line, roster cell or control is cut off, by a box that clips or by its own box;
3. the table roster is never wider than its panel;
4. every control is at least 44 by 44 CSS px;
5. with art, every seat token is a numeral picture over a body picture; without art, every token shows its numeral as text and no name or marker is hidden;
6. with the sheet closed on a docked phone layout, the phase caption and the dock leave at least half of the screen height free. The least measured was 62%, at 320 by 568 with 32 px text;
7. on a docked phone layout the control that opens and closes the sheet is inside the screen and on top: closed, open, and open with the cards scrolled to their end;
8. outside the private panel there is no private hook, no role or team word and no role or team style, whatever the sheet holds;
9. nothing is in the private panel while the sheet is closed;
10. the table display has no private sheet, command control, private hook or role word;
11. no page error, failed request or refused request.

### The shell check

It asks whether someone who sees a device's requests, or its screen with the sheet closed, can learn anything about the seat. It asserts:

1. a freshly loaded phone asks for its three bundle stylesheets and for no other art, in each of the thirteen pictures of the Shot card with the sheet open and closed, and for each of the nine roles;
2. every one of those phones makes exactly the same requests;
3. the table asks for the public bundle stylesheet and for no other art;
4. no shell asks for a synthetic study, its stylesheet or its module;
5. one phone, redrawn in place through two seats, nine roles, thirteen pictures and the open and closed sheet, makes no request at all;
6. everything outside the private panel is painted identically (33 painted properties of every element and of its two pseudo-elements, with every attribute and every word) for every role and every picture that can occur in the same public state, with the sheet open and with it closed;
7. with a public move, a status change and a round transition started and each of their eleven animations held halfway, redrawing only the private section (every picture of the Shot card that can occur in that public state, two roles, the role card opening, the sheet closing and reopening) cancels, restarts, shifts or adds no animation outside it, and the public layer is painted as before;
8. every picture that is drawn is drawn on a surface its manifest entry allows: nothing private outside the private panel, nothing phone-only on the table;
9. with every art request refused, the page marks no bundle as arrived, every token shows its numeral and no name or marker is hidden; with only the role bundle refused, the public art is still drawn and the role card makes no room for a picture;
10. the same holds with forced colors although the art has arrived;
11. the watcher sees a single role file and a study when a review page does fetch one, so that seeing none from a shell means something.

Assertion 6 compares what a page paints, not its geometry: the sheet's own height is not a fact about the public layer, and an open sheet is as tall as what it holds. Someone who can see how tall an open sheet is can already see the sheet.

Assertion 7 is about the reference stylesheet and nothing else: it shows that no rule ties a public cue to private state. Which cues a client issues, and when it withdraws them, is decided by Frontend's director and frame contract, which this does not run.

### The browser checks can fail

`prove:checks` copies the design to a scratch directory fifteen times, makes one mistake each time, runs the check and expects a refusal that names the mistake. For the shell check: the dealt role's picture fetched as a file when the sheet opens; the dock's control styled by what the sheet holds; a private picture drawn on the dock; a phone-only picture drawn on the table; a bundle marked as arrived although its request failed; a shell page linking the study stylesheet; a public cue cut short when the seat registers something privately. For the layout check: roster cells that no longer wrap; seat names hidden before the art has arrived; a status chip cut off by a clipping panel; the phase caption holding the top edge on a short phone at large text; the control that hides the sheet scrolling away; a control under 44 px; the role written into the page title; a token that keeps its numeral hidden without art. All fifteen were refused. It takes a few minutes and is run by hand.

## Looking at it

Checks do not look. All 27 review images were opened and looked at after the last change to anything they draw from, the tallest two in slices at full size, and the contact sheet shows every one of the 86 exported pictures and all 35 sprite symbols drawn from the files themselves. Looking found things no check did. Each of these was seen in a render and fixed before this commit:

| Seen | Fixed by |
| --- | --- |
| The numerals 1 and 4 had a spike above the cap height | Drawing the stem and the stroke that meets it separately |
| 6 and 9 were smaller than the other numerals and their baseline bar touched the bowl | Redrawing all nine to one body height with the bar clear of it |
| A stack of crates covered the wall console in Room A | Moving the console up and shrinking the upper crate |
| The Officer card's lower band was empty and the sidearm's shadow filled its trigger guard | Rank stripes, a larger insignia, a hole in the shadow |
| The eliminated marker read as a plain cross | A solid hollow heart under a lighter cross |
| Standees grew when fewer stood in a row | Sizing them in the room's own units, not the row's |
| Halftone ran behind seat names on plain panels | Halftone only in the far corner of a panel with no seats in it |
| Callout numbers covered the first letters of what they pointed at | Placing them outside a corner of their box |
| At 320 px with 200% text the header, the dock's control, the role name, the card head and the banner were clipped, and the page scrolled sideways | Wrapping rows, an explicit single column, headings that give way, fixed-size decoration. This became the layout check |
| Every storyboard frame showed the same moment | The `animation` shorthand was resetting the delay that freezes a frame; cues now set longhands only, and a check refuses the shorthand |
| Picking a card up under reduced motion faded the whole card | No animation for selection under reduced motion |
| Speed lines struck through the round heading | Moving them to its right |
| A stale view showed “Syncing time with the server” | It keeps its last estimate, in a dashed outline. Syncing is a different state |
| In the roster, “Eliminated” broke as “Eliminat-ed” and “Player 1” wrapped, with room to spare beside them | Cells wrap between words and break inside one only on a display too narrow for whole words |
| On a plain panel an “Eliminated” chip broke in the middle of the word to keep two seats side by side | Seats share a row while their words fit and take a row each when they do not |
| Status words, the room caption and the paused notice sat tight against their own outlines | A reset rule outweighed every component's padding on paragraphs and headings. It now carries no weight |
| The status-change ring covered the last character of the name beside it for an instant | The marker grows away from the name and the ring stays inside the gap |
| At 320 by 568 with 200% text an open sheet fills the screen, so the control that hides it would scroll away with the cards | It is pinned at the top of the sheet; the layout check holds that, and `prove:checks` shows it fails without the pin |
| The palette sheet showed three empty swatches | It read colors from generated variables that had been pruned. It now reads every color token |

## Independent review

Before anything was pushed, the whole slice was given to a second Claude Code session with no part in making it, with the instruction to find what was wrong and to trust nothing in this document. It was a review by a model, not by a person, and not a substitute for Codex's or Frontend's. It found one blocker and nine things that should be fixed. All ten were judged right.

| Found | Done |
| --- | --- |
| **Blocker.** The reference stylesheet named pictures by address, so a phone fetched the “available” pip only when its seat had a shot, the hatch only while a command was in flight, and the Officer's picture only when an Officer opened the sheet. Private state was readable from requests | A bundle is now one stylesheet holding its pictures; the review pages load bundles whole and first; `check:shell` watches requests across every private state, and `prove:checks` shows it catches the old behavior |
| Without a flag that nothing set by default, seat numbers were hidden behind pictures that were not there | The skin is complete without art, and art is drawn only once a bundle has arrived. The old flag is gone and a check refuses it |
| This document said more than its checks asserted: named colors, `rgb()`, a `style` attribute, a title, role words in variant and layer names, private art in public places, stylesheet rules and several contract claims were all unchecked | The checks were rewritten around allow-lists, a stylesheet reader and cross-checks, each with a test that makes the mistake, and this page now lists what each does not tell |
| The Shot card contract described “Available” and “Not available” differently from what Frontend's model produces | The contract and the review kit follow the model: three pictures of Available, no reason under Not available, no control on a stale view. A check ties the contract to the kit and the kit to the ten statuses |
| At 320 by 568 with 200% text the sticky caption and the dock left 64 px of screen | The caption stops holding the top edge on short screens; the dock is its control alone; the layout check holds half the screen and measured 62% |
| The roster was clipped at its own breakpoint with the widest words | The breakpoint is 1280, the column is wider, cells wrap, and the layout check holds it with a stress seating |
| Injured and Eliminated were never drawn on a standee | A token is a numeral over a body, and the standee has all three bodies. They are in a review image and on the state sheet |
| The studies were fenced by name only: in the exports directory, in the generated stylesheet every shell loaded, with a token of their own, and described as “not connectable” | Their own drawings, directory, manifest, contract file and page; no token; a fence check and a request check. The documents now say it is a fence against accident, not an impossibility |
| The Captain marker was a shield, the same shape as the Officer's insignia and as the “blocked” study | A rank star. The Officer's insignia is a chevron roundel. “Shield” is now a word no public name may carry |
| “Every delivered visual was rendered and looked at” was untrue for 18 of 90 exports | The contact sheet draws every export and every sprite symbol, and it was looked at |

It also found smaller things, each fixed: studies drawn beside one token, which implied who; a role card that worked only for the Officer; a team color hard-coded outside the tokens; proposed copy that read as if the Officer had no shot in the final showdown; a planned asset named after an unmerged decision; no caption for an ordinary turn with no active seat; a focus ring and a notice outline below 3:1 on their ground; small text straight over the vignette; a Healthy marker removed from the accessibility tree on the vignette; a primary control told apart by color alone; variables nothing read; a sprite missing an icon; and several sentences in these documents that said more than was true.

The fixes were not given back to it. What stands behind them is the checks, the tests that make each mistake again, and the renders, all described above.

What it could not find, because nobody has looked: anything about a real device, a second browser, assistive technology, or Frontend's runtime.

## Integration review follow-up

The follow-up integration review of 6 October 2026, relayed by the game owner as Codex's (its file is not in the repository at this commit), looked at this pull request at `5553ea9`. It ran the 51 tests and the 13 checks from a fresh archive and they passed there too; it inspected selected table and phone renders. It raised nothing against Designer. The first review that day had seen only seven uncommitted draft files. What it says is still needed is not Designer's to do alone: Frontend's adoption, the token and asset-loading decisions, and running these checks in CI.

Its one new finding, R6, is Frontend's: the frame contract clears every public cue whenever a seat's view object changes, so a private registration can stop public emphasis. Reading it showed the same mistake in one sentence of this work. The motion contract said of a cue that “a newer view replaces it”, and on a phone a newer view can be a private-only one. That sentence is corrected. The contract now says what each cue belongs to and what may withdraw it ([cue freshness](motion-storyboards.md#cue-freshness)), which also answers the cue-timing questions Frontend's slice 3 document left for the Designer. A check refuses the old wording, and the shell check gained assertion 7 above.

The freshness windows and the cap on token drops are proposals for Frontend to agree or change. Nothing here shows that Frontend's director follows them, and R6 is fixed only when it does.

## Not run, not measured, not produced

- **Any device.** No phone, no tablet, no shared display at a real distance. Readability, touch accuracy, token size across a table, motion comfort, load, memory and frame time are all unmeasured.
- **Any browser but desktop Chrome 155.** Not iOS Safari, not Android Chrome, not Firefox. `:has()`, container query units, CSS masks, nested `@media`, `:where()` and individual transform properties are used by the reference stylesheets and are unverified elsewhere.
- **Frontend's runtime.** The reference stylesheets and the loader have not been in its harness. The review pages rebuild its markup by hand from a read of its branch at `fccadf7`, and that copy can drift. **What its client requests is unwatched.**
- **Assistive technology.** No screen reader, switch or voice control was used. Forced colors was emulated in Chrome for the shell check's two cases and not looked at by a person.
- **Contrast in compositing.** Computed from token values only.
- **Sound.** None exists. Nothing was listened to.
- **Human art review.** None yet. “Finished” means complete for this slice, not approved.
- **A person's review of any of it.** The independent review above was by a model.
- **External `<use>` of a sprite symbol.** Same-document `<use>` after inlining is drawn on the contact sheet; an external reference is not verified in any browser.
- **The Three.js scene.** No geometry, no depth tuning, no renderer evaluation. That is Frontend's, and the layer depths are a starting point.
- **CI.** The Designer tests and checks do not run there yet.

Nothing in this document, in a render or in a storyboard shows that multiplayer behavior is correct or that the game is balanced.
