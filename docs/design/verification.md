# Verification of the Designer slice

Issue [#4](https://github.com/Amirkianfar66/GameN/issues/4) · branches `agent/designer-art-direction` (PR #45), `agent/designer-comic-board` (PR #57) and `agent/designer-comic-adoption` · base `333c9e820f362a211352bc689372663f29b73ac4`.
Dates: 6 and 7 October 2026. Environment: macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4`, Google Chrome `155.0.8059.39` for the scripts that need a browser.

**The numbers in the tables below are those of the latest change, [the adoption of the comic board](#adopting-the-comic-board) on 7 October 2026**, for which every command here was run again after `npm ci`. The commit they were run at is in that pull request's description. The numbers of the two earlier changes are kept where they differ, so that a reader can see what grew.

This page says what was run, what each check asserts, and what it does not. An earlier draft of it claimed more than its checks held; [the independent review](#independent-review) found that, and the tables here were rewritten from the code.

## Checks that need no browser

| Command | Actual result |
| --- | --- |
| `npm ci` | Passed: 12 packages, toolchain hook passed. No dependency was added by this work |
| `npm run verify` | Passed, unchanged from the base: toolchain; 8 workspaces within their boundaries; source integrity (119 Canvas files and 1 example, 7 rule sources, 24 pinned files, 0.2.0 token proposal unchanged); typecheck; build; **16 tests**, 0 failed, skipped or todo |
| `npm run test --workspace @mothership/design-tokens` | Passed: **66 tests**, 0 failed, skipped or todo. 13 on the tokens, 1 that the design files pass every check, 52 that the checks refuse a named mistake. (52 tests in PR #45, 54 in PR #57) |
| `npm run check:assets --workspace @mothership/design-tokens` | Passed: **15 of 15 checks**, over 35 assets, 124 exported files, 3 bundle stylesheets, 35 components, 7 cues and 2 fenced studies. (13 checks over 20 assets in PR #45, 14 in PR #57) |
| The command line asked for in [DSN-REQ-1](integration-requests.md#dsn-req-1): build, then those two | Passed in 14 to 15 seconds on this machine, over three runs. It took 5 to 6 seconds in PR #45: there are more mutation tests, and each copies more files |
| `git diff --cached --check` against the base, with every new file staged | Clean |
| The four pinned Designer files and `packages/design-tokens/src/tokens.json` against the base | Unchanged, byte for byte: `check:sources` passes |

`verify` does not run the Designer tests or checks. They pass locally and are **not run in CI** until [DSN-REQ-1](integration-requests.md#dsn-req-1) lands.

### What the fifteen checks assert

Each is a statement about files in the repository. None says anything about a phone, a display or how the art looks.

| Check | It refuses | It does not tell |
| --- | --- | --- |
| Exports and studies match their sources | An export, a study, a bundle stylesheet or a manifest that is not byte for byte what the sources and recipes produce; a missing file; a file no recipe produces | Whether the sources are good drawings |
| Manifests match the files | A wrong hash or size; a file name without its content hash; a stale source hash; a missing rights field; a bundle stylesheet that holds anything but its own variants, each exactly as its file; a bundle stylesheet that would fetch anything | Whether a client loads the stylesheet rather than the files |
| Provenance pins agree | A rule-source hash that is not the hash of `rules/source-manifest.json`; a token, manifest or study-manifest version that differs between files; a manifest version that would not fit `assetManifestVersion` | Whether the rule sources themselves changed meaning |
| Sources, exports and sprites use only the drawing vocabulary | Any element outside ten (`svg`, `defs`, `g`, `path`, `circle`, `ellipse`, `rect`, `polygon`, `pattern`, `clipPath`) and, in sprites, `symbol`; any attribute outside a short list; any paint that is not `none`, a six-digit hex color or a reference inside the file; a shape that would default to black. So: no text, title, image, style, link, filter, named color, `rgb()`, eight-digit hex or outside reference | Whether a shape drawn with those elements looks like a letter. No word is drawn in any file; that was checked by eye on the contact sheet |
| Every color is in its palette | A color that is not a token value in the palette the asset is allowed; a faction color on anything that may be drawn publicly, or in the public sprite; amber on a public asset other than the active-turn marker; a room whose recipe does not print it in its own token family, tone for tone, or that is left in steel; a color of one room in another room; a character drawn in another character's color, or without one of its own; a role's device in another team's accent | Contrast in compositing. Whether a room's color is taken for a team's: three approved families share a hue with the three team accents, and the check holds only that none *is* one |
| Bundles, surfaces and names disclose nothing | A variant drawn where its bundle does not reach; private-only art in the bundle the table loads; role art allowed outside the private sheet; a sprite symbol taken from another bundle; outside the role bundle, an asset id, variant name, file name, sprite symbol, layer label or definition id that contains, as a whole name part, a role name, `blue`, `red`, `faction…`, `protect…`, `shield…`, `immun…`, `weapon…` or `code…`; a role bundle that does not expect the nine roles in `rules/overlays/player-modes-officer.json` | Whether a picture's *shape* suggests something private. The Captain marker was a shield until a reviewer saw it; a name check cannot see that |
| The synthetic studies are fenced | A study in the asset manifest, in a bundle or among the exports; an asset drawn from `source/studies/`; a study file without the development-only mark; a study with a surface, without a gate, or for connected use; anything in the cue list that is not an authorized cue; any file of the review kit other than the four study files that names the study stylesheet, module, index, properties, directory or contract; a study duration that is not `motionMs.publicImpact` | Whether someone copies a study into a shell on purpose. It is a fence against accident |
| Explorations are fenced | Under `design/explorations/`: a file without the development-only mark; a drawing outside the drawing vocabulary; an exploration with no README; a file that is not a page, a stylesheet, a script, a drawing, a note or a review picture. Anywhere under sources, exports, studies, the contract, the review pages or the token package: a file that reaches into `explorations/` | Whether an exploration is good, or what the owner made of it. Its colors are not checked: trying colors that are not tokens is what it is for. The other direction is allowed: the comic-board page reads its drawings from `design/source/` |
| Reference stylesheets | In `comic.css` and `cues.css`: a picture drawn without waiting for its own bundle, outside `@media (forced-colors: none)`, on the table when its manifest entry does not allow the table, or outside `.ms-private__panel` when it is private-only; a picture asked for by address; a rule that styles something outside the private sheet by what is inside it; a private hook on the table; a selector keyed on a role, a team or a private word; a literal, named or functional color; a system color outside forced colors; the `animation` shorthand; a repeating animation; an animation in `comic.css`; a duration that is not a motion token; a director cue with no treatment; a variable read and defined nowhere; a proposed token variable that nothing reads; the retired `data-assets` hook; generated review files that are out of date | Anything about a stylesheet other than these two. It reads selectors as text: a rule written in a way it does not anticipate could pass, which is why `check:shell` asks the same questions of a running page |
| Motion contract | A duration that is not its token value; beats that do not add up or differ from the tokens; a cue the director does not issue; a public registration cue; a split of `publicImpact` in the tokens; a cue that does not say what it belongs to; a storyboard of fewer than three frames or one that does not rise to the full duration; a cue with no rule in `cues.css` that plays its `data-cue` value for its own duration token; a rule that lets any newer view replace a cue; freshness windows that are missing or looser than the ones Frontend's director uses; a freshness rule that no longer says a private-only update withdraws no public cue | Whether a cue feels right, whether the proposed windows are good, and whether Frontend's director follows any of it. It reads the stylesheet as text; `check:shell` times the cues in a running page |
| Component, state and layout contracts | A state with no source, no description of its look or no words; a private component on a public surface; a component drawn where its asset may not be drawn; private-only art listed by a public component; a required state that does not exist or that nothing draws; a Shot card contract whose states are not exactly the pictures the review kit draws, or a kit that does not draw exactly Frontend's ten statuses; a Shot card picture that draws the spent pip; a layout board that asks for a picture that does not exist; a callout naming an unknown component | **Whether a state really differs from its neighbors other than by color.** It requires the three fields to be filled in. Whether the look they describe is real was judged by eye on the state sheets, and two pairs of statuses do share an outline |
| The crew catalog | A catalog whose characters are not the nine of `color.crew`, in order; a repeated or malformed id; a character whose standee, card or colors are not its own; a picture the manifest does not hold or that may not be drawn publicly; a call sign that differs from the proposed copy; a character given a role, a team or a faction; a role named anywhere in it; a pinned manifest or token version that is not the current one | Whether Integration's identity record will look like it. It is a proposal and no shared contract |
| Proposed copy | A rule-source reference that does not resolve; copy that mentions the archived identification step for a shot, or a guess anywhere but on a card that cites the Scan's own rule; a card on a team the rule source does not put its role on; a card that uses one of a few phrases that state an outcome (“was blocked”, “you hit”, “succeeded”, “failed”); a role with no card; a role name on the pip or the private handle; a proposed card for a role with no device | **Whether the copy states the rule correctly.** That is a reader's job; one line was wrong in PR #45 until a reviewer read it against the showdown overlay, and eight of the nine cards here have been read by nobody but their author. A citation that resolves shows that the sentence it points at exists, not that the card paraphrases it rightly |
| Tokens only add | Any 0.2.0 key removed or changed in 0.4.0; any 0.3.0 entry removed, or changed without being listed in `revisedFrom030`; a listed revision that misquotes 0.3.0 or names an entry it did not have; a stale hash in the lock-update request | Whether the new values are good |
| Generated documents, review images and browser reports | A generated page edited by hand or out of date; an embedded image that does not exist; a review image no render made; review images, a layout report or a shell report made from pages, exports, studies or contracts that have since changed; a report that records failures or covers only part of its matrix | What is in an image. That an image is current does not mean anyone looked at it |

### The checks can fail

A check that has only ever passed proves little. 52 tests each copy the design files to a scratch directory, make one or more mistakes the way a person would, and expect the export build or the check to refuse each by name. Added with the comic board: a room printed in another room's colors, and one left in steel; a character in another character's color, and one in a team accent; a device in another team's accent; a device moved into the bundle the table loads; a device drawn on a playing piece; a stylesheet that plays a cue for another time than its contract; a storyboard of two frames; a role card on the wrong team, one that states an outcome, a guess that is not the Scan's, and a role with no card; a crew catalog that gives a character a role, lists a tenth, or names a picture that does not exist; a 0.3.0 token entry changed without being listed, and a listed revision that misquotes 0.3.0. They cover every row of the table above: a hand-edited export, manifest and stylesheet; a contract that pins another rule-source manifest; text, a title, a named color, `rgb()`, eight-digit hex, a `style` attribute, an unfilled shape, an image and an outside link in a source; a faction color on the token; amber in the room; a role word in an asset id, a variant name and a layer label; role art allowed on the table; private-only art in the public bundle; a sprite reaching into another bundle; a study read by an export recipe, linked from a shell page, imported by the review kit, drawn by a cue stylesheet, put back among the cues or given a token; art drawn without waiting for its bundle, for the wrong bundle, outside the private sheet, or on the table; the public layer styled by private state; a role-keyed selector; a picture asked for by address; literal, named and functional colors; a looping animation; a cue that belongs to nothing and a rule that lets any newer view replace a cue; a contract that does not match the review kit; a spent pip; stale renders and stale reports. The repository is not touched: the copies are made in the system temporary directory and removed.

### Token tests

The thirteen token tests hold that 0.4.0 only adds to the pinned 0.2.0; that over 0.3.0 it changes exactly the one entry it lists, quoting what it was; that every field Frontend's `ShellTokenSource` names is present with the same type; that every new color, font family and easing is a plain CSS value its token writer accepts; that there are five rooms of five tones each, running dark to light, and nine characters with nine different fields; that each cue's opening, accent and settle add up to its token total, that no 0.2.0 total changed, and that a carried piece is in the air for exactly the 450 ms of `publicMove`; that the studies have no split of their own; that the policy flags are still off; the distances below; and these computed contrast ratios.

| Pair | Ratio is at least |
| --- | --- |
| Ink on paper, paperShade, paperDeep, amber, the caption yellow and the token body; paper on canvas, panel, ink, steel.shadow and the shadow tone of each of the five rooms; secondary text on canvas and panel | 4.5:1 |
| Focus ring on canvas and panel; amber outline on panel; paper keyline on panel; token body on canvas; steel.mid edge on canvas | 3:1 |
| Amber on paper, and the focus ring on paper | **Below** 3:1, asserted: this is why paper surfaces use ink for both |

These are computed from token values with the WCAG formula. They are not measurements of the composited screen.

**How near the new public colors come to a color that means something.** The token file states these numbers (`measuredColorDistances`) and a test recomputes them from its values, so none can move without the test failing. They are CIE76 distances, rounded: a coarse measure, enough to tell 16 from 50, and no measure at all of what people at a table confuse.

| From | To | Distance |
| --- | --- | --- |
| Room A, its nearest tone | The Blue accent | 16 |
| Room B, its nearest tone | The Alien accent | 20 |
| The Jail, its nearest tone | The Red accent | 18 |
| The Command Room and the Hospital, every tone | Any team accent | 54 and 55 or more |
| The nearest character field, the pink of `c6` | The Red accent | 26. Every other field is further from every accent |
| The caption yellow | The amber of interaction and of the active turn | 16 |
| The Command Room, its nearest tone | The same amber | 15 |
| The nearest character field, the yellow of `c2` | The same amber | 14 |

The first three and the last three are the look the owner approved, and they are open decisions DSN-D13 and DSN-D08. The pink was measured after the approval; an earlier note of mine said the characters' colors were “kept away from” the team hues, which claimed more than had been measured.

## Checks that need a browser

Run on the same tree, in desktop Chrome on this machine. They are not part of `verify`. Each writes a report under `design/review/` that records what it was run on; `check:assets` refuses a report made before a later edit.

| Command | Actual result |
| --- | --- |
| `npm run check:layout --workspace @mothership/design-tokens` | Passed: **456 cases, 0 failures** (360 in PR #45). Report: `design/review/layout-check.json` |
| `npm run check:shell --workspace @mothership/design-tokens` | Passed: **54 page loads, 468 redraws, 1,368 comparisons of the public layer, 26 private-only updates under 13 held public cue animations (11 in PR #45), 21 timed plays of the 7 cues, 0 failures**. Report: `design/review/shell-check.json` |
| `npm run prove:checks --workspace @mothership/design-tokens` | **21 of 21** deliberate mistakes refused by name (15 in PR #45), **in two runs**: the first full run refused 20 and showed one of the new assertions to be too weak; with that assertion tightened, the nine mistakes against the shell check were run again and all nine were refused. The twelve against the layout check stand from the first run, in which that check was already as it is now. [What the first run found](#the-browser-checks-can-fail) |
| `npm run render:review --workspace @mothership/design-tokens` | 32 images written to `design/review/`, no page error (27 in PR #45). Index: `design/review/index.json` |

**What all of these are and are not.** They are desktop Chrome laying out and loading the Designer's hand-built copy of Frontend's markup, with the Designer's reference stylesheets and loader. They are not a phone, not iOS Safari, not Android Chrome, not Frontend's runtime, and not a device measurement.

### The layout check

It lays out a shell at every combination of:

- player phone at 320, 360, 414, 599, 600 and 768 CSS px wide and 760 tall, and at 320 by 568 and 360 by 640; table display at 600, 960, 1279, 1280, 1440 and 1920;
- the browser's default text size at 16 and at 32 px, set as a browser setting, not as a zoom or a page style;
- on a phone: the public layer with the usual seating, with a jailed and injured seat, with a stress seating in which every seat carries every marker and a name of twelve of the widest letter, with nine in one room, with a stale connection, without art, and without names and characters, with art and without it; the open sheet in each of the thirteen pictures of the Shot card, with the role card expanded for two roles, with seven targets in the stress seating, without names and characters, and without art;
- on the table: five seatings, among them the stress seating and nine in one room; a stale connection; two seatings without art; and two without names and characters.

and asserts in each:

1. nothing scrolls sideways and nothing is drawn past either side of the screen;
2. no token, name, marker, status word, caption, card line, roster cell or control is cut off, by a box that clips or by its own box;
3. the table roster is never wider than its panel, and no roster cell holds anything wider than itself;
4. every control is at least 44 by 44 CSS px;
5. with art, every seat with a character is drawn as one picture of that character and every seat without one as a numeral picture over a body picture; without art, every token shows its numeral as text and no name or marker is hidden;
5a. on a board panel every piece and every tag is inside its room, no piece is under the 20 CSS px the tokens give as the smallest, no two tags lie on each other, every tag shows its seat number whole and is set in at least 10 px, and a name a tag shortens is whole in the roster; nowhere else is a name shortened;
5b. a page asked for without names and characters draws none, and every other page draws one for every seat;
6. with the sheet closed on a docked phone layout, the phase caption and the dock leave at least half of the screen height free. The least measured was 62%, at 320 by 568 with 32 px text;
7. on a docked phone layout the control that opens and closes the sheet is inside the screen and on top: closed, open, and open with the cards scrolled to their end;
8. outside the private panel there is no private hook, no role or team word (now including “Independent”), no role or team style and no device, whatever the sheet holds;
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
7. with a public move, a status change and a round transition started and each of their thirteen animations held halfway, redrawing only the private section (every picture of the Shot card that can occur in that public state, two roles, the role card opening, the sheet closing and reopening) cancels, restarts, shifts or adds no animation outside it, and the public layer is painted as before;
7a. every cue of the motion contract, played on the motion page from the reference stylesheet, runs, and every animation it runs lasts exactly its contract duration: its element, its layers and whatever moves inside it; with motion reduced nothing runs but the 80 ms fade; with motion or with effects reduced no layer beside the element is animated. Seven cues, three settings, 21 plays;
8. every picture that is drawn is drawn on a surface its manifest entry allows: nothing private outside the private panel, nothing phone-only on the table;
9. with every art request refused, the page marks no bundle as arrived, every token shows its numeral and no name or marker is hidden; with only the role bundle refused, the public art is still drawn and the role card makes no room for a picture;
10. the same holds with forced colors although the art has arrived;
11. the watcher sees a single role file and a study when a review page does fetch one, so that seeing none from a shell means something.

Assertion 6 compares what a page paints, not its geometry: the sheet's own height is not a fact about the public layer, and an open sheet is as tall as what it holds. Someone who can see how tall an open sheet is can already see the sheet.

Assertion 7 is about the reference stylesheet and nothing else: it shows that no rule ties a public cue to private state. Which cues a client issues, and when it withdraws them, is decided by Frontend's director and frame contract, which this does not run.

### The browser checks can fail

`prove:checks` copies the design to a scratch directory once for each mistake, makes the mistake, runs the check and expects a refusal that names the mistake. For the shell check: the dealt role's device fetched as a file when the sheet opens; the dock's control styled by what the sheet holds; a private picture drawn on the dock; a phone-only picture drawn on the table; a bundle marked as arrived although its request failed; a shell page linking the study stylesheet; a cue that keeps travelling when the player has asked for reduced motion; the role card turning for a different time than the contract states; a public cue cut short when the seat registers something privately. For the layout check: roster cells that no longer wrap; a long name running out of its roster cell into the next column; seat names hidden before the art has arrived; a status chip cut off by a clipping panel; the phase caption holding the top edge on a short phone at large text; the control that hides the sheet scrolling away; a control under 44 px; the role written into the page title; a tag on the board losing its seat number; tags on the board no longer hanging on two lines where a room is crowded; a device written into the public layer of a phone; a token that keeps its numeral hidden without art. It takes more than twenty minutes and is run by hand.

**The first full run for this change refused 20 of the 21, and the one it did not refuse was the point of running it.** The mistake shortens the role card's own turn to 700 ms. The shell check passed it: assertion 7a asked only that *some* animation of a cue last the contract's time, and the card's back and its device still lasted 900 ms. The assertion now asks it of every animation a cue runs. With that change the shell check was run on the real tree again and passed, and the nine mistakes against it were run again: nine of nine refused. The twelve mistakes against the layout check were refused in the first run and were not run again, because nothing they depend on changed.

## Looking at it

Checks do not look. For PR #45 all 27 review images were opened and looked at after the last change to anything they draw from. For the adoption of the comic board, which redrew most of them, see [what was looked at there](#adopting-the-comic-board): not every image was opened again, and that section says which. The contact sheet shows every one of the 122 exported pictures and all 40 sprite symbols drawn from the files themselves. Looking found things no check did. Each of these was seen in a render and fixed before its commit:

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

The freshness windows and the cap on token drops were proposals for Frontend to agree or change. Frontend has since agreed both windows and the rules of withdrawal (its comments on PR #45 and PR #57), and reports them, with R6 fixed, in PR #30 at `24a5237`; the cap is agreed to live in the director and is not implemented. Designer has read those comments and has not run that code: nothing here shows that Frontend's director follows any of it.

## The comic-board exploration

On 7 October 2026 the owner approved a new direction ([owner-decisions.md](owner-decisions.md)), built as an exploration in `design/explorations/comic-board/`. This section says what was run for it. `npm ci`, `npm run verify`, the package tests and `check:assets` were run again on the tree with it in, and the first table above carries their numbers: 54 tests and 14 checks where PR #45 had 52 and 13.

**What changed outside the exploration.** A fourteenth check and two tests that fence the directory; a refusal in the export build of any recipe that reads outside `design/source/`, found while proving the fence (a recipe could climb out with `../` and lift an export from anywhere); and documents. No source, recipe, export, contract file, token, reference stylesheet or review page changed, so the review images and the two browser reports are the ones committed with PR #45: `check:assets` works their inputs' hash out again and finds them current. The layout check, the shell check and `prove:checks` were therefore not run again for this change.

| Run | Actual result |
| --- | --- |
| `npm run verify` | Passed: **16 tests**, 0 failed, skipped or todo |
| `npm run test --workspace @mothership/design-tokens` | Passed: **54 tests** |
| `npm run check:assets --workspace @mothership/design-tokens` | Passed: **14 of 14** |
| The drawings against the drawing vocabulary: 4 rooms, 9 characters, 9 devices | 0 problems, held by the fourteenth check. The rooms and the devices use token colors only; the characters use 29 that are not tokens, on purpose |
| `node design/explorations/comic-board/try.mjs`: a scripted walk through the page in Google Chrome 155.0.8059.39, on a phone, on the Captain's phone, under reduced motion and on the shared display | **43 things looked for, 0 not found**, and no page problem. The rows below are what it looks for |
| Choosing | Nine characters, four taken and not choosable; Join waits for a choice; every seat ends with a different character; the tag carries the seat number and the name as text, with markup in a typed name left as text |
| Moving | From Room A, not Captain, only Room B is offered; the Hospital cannot be chosen; pressing a room asks before anything is sent and moves nothing; after the move the piece is in Room B, nothing more is offered that round, every piece stands inside its room, no name tag touches another and the cue has left nothing on the page; a refused move moves nothing; with the connection lost nothing can be chosen. The Captain is offered Room A and Room B from the Command Room, and the Command Room again the next round |
| The role, in public | No role word or role key anywhere in the markup of the page, the caption, the hand or the banner, and no device drawing outside the private sheet: checked after the deal and again with each of the nine roles turned up. The shared display is never dealt a role and has no hand |
| Requests | All nine devices and all nine characters are asked for at load; **0** requests when the card is turned up; **0** across dealing and turning up all nine roles |
| The role card | Shows the viewer's own character without its stand and the device of the role dealt; turns face down when the page goes to the background |
| Reduced motion | Nothing is animating, with the role card up; after a move the piece is simply in the room |
| The walk can fail | Two deliberate mistakes, each restored afterwards. With the devices not loaded up front it reported the three request findings. With the role written into an attribute of the viewer's own piece it reported the leak for the card dealt and for each of the nine |
| All nine role cards, each on a different character | Rendered and looked at |
| The move and the card being turned up, held at six and at five moments | Rendered from the page itself (`?still`, `&peekstill`) and looked at: `storyboard-move.png`, `storyboard-role-card.png` |

Looking found these while it was being built, and each was corrected before the pictures that are kept:

| Seen | Fixed by |
| --- | --- |
| The landing star flew in from the corner of the page | It was placed with a transform and then scaled; it is placed by its left and top |
| Neighbours shuffled sideways before the piece had left the room | The room it leaves closes up after lift-off; the room it lands in makes space at once |
| On a dark room the star and the puff could not be seen | Paper with an inked edge |
| The bottom row of rooms was hidden under the hand | The page takes the height the card at rest leaves, and does not resize when the card is picked up |
| Pieces slid in from the corner of the page at load | The first placement is made without a transition |
| The role card would have fetched its device when turned up | Every device and every character is asked for at the start, whatever is dealt |

The walk is run by hand and is in no check. Not established: anything on a phone or a shared display; any browser but desktop Chrome; a screen reader; whether the nine characters can be told apart, or a room's color mistaken for a team's, by people at a table; motion comfort and frame time. The page is an exploration on a fixture: nothing in it was run against the engine or the backend.

## Adopting the comic board

On 7 October 2026, after the all-agents review of that date, the approved exploration was brought into the design system: the drawings as sources, the colors as tokens 0.4.0, the exports as `design-0.2.0`, the contract, the reference stylesheets and the review pages. This section says what was run for it and what was found.

**Every command in the tables at the top of this page was run again for this change**, after `npm ci`, and those tables carry its numbers.

| Run | Actual result |
| --- | --- |
| `npm ci` | Passed: 12 packages. No dependency added |
| `npm run verify` | Passed: **16 tests**, as on the base. The four pinned Designer files and the pinned token file are unchanged, byte for byte |
| The 22 drawings moved from the exploration to `design/source/` | Each compared with what the scratch generators produce and with the drawing the owner approved: **22 of 22 bodies identical**, after the Command Room's layer ids were renamed from `command-` to `command-room-`. Only header comments differ |
| Every color in those drawings | Each is a value of tokens 0.4.0. None is a team accent on anything public |
| `node design/explorations/comic-board/try.mjs`, the scripted walk through the approved page, now reading its drawings from the sources | **43 things looked for, 0 not found** |
| Bundle stylesheets | `public-board` 236,171 bytes, `player-ui` 6,090, `roles` 25,212 (95,672, 6,090 and 8,039 in PR #45). Compressed with Python's `gzip` at level 9, not by a server: 20,433, 1,155 and 2,963 bytes |
| Sizes on the table display, read in desktop Chrome | At 1280 CSS px wide a room of the top row is 365 px wide. Six pieces in it are 47 by 59 px with 14 px tags; one alone is 73 by 91 with a 22 px tag; nine are 32 by 39 with tags at the 10 px minimum. At 1920: 74 by 93, 110 by 138 and 50 by 62 with a 15 px tag. At 600, nine are 22 by 27 px |

**Found while building it, and fixed before this commit.** Eight were found by looking at a render and by nothing else; four of those are now held by a check. Two were found by the layout check as it already was.

| Seen | Found by | Fixed by | Now held by |
| --- | --- | --- | --- |
| **The role card kept turning under reduced motion.** Its storyboard showed an empty stage at 0 ms and the card's back at 80 ms: the rule that turns the card weighed more than the general rule that replaces a cue with a fade | Looking | Rules that name the card and its parts outright under reduced motion and under reduced effects | `check:shell` assertion 7a, which plays every cue with motion reduced; `prove:checks` makes the mistake again for the move |
| **Without art, a whole row was carried across the board**, its name and its status word with it, over other seats' words | Looking | A seat is carried only where it is a piece on a room panel whose picture has arrived. In a list and on a plain panel the piece hops where it stands | `check:shell` refuses a carried row in a phone's list |
| In the roster with the longest names, a name ran into the next column and covered “Room A” | Looking | The name's box is never wider than what the number leaves of the cell | A new clause of assertion 3; `prove:checks` |
| With the longest names the first and last tag of a crowded room stuck out past the room's edge | Looking | The first and the last tag start and end with their own column | Assertion 5a |
| In the roster a short name dropped under its seat number in some rows and not others | Looking | The number and the name stay on one line; the name has a box of its own | Nothing. No check tells one line from two |
| Without art, the hop's shadow fell on the status word under the token, and then dimmed the name | Looking | The shadow lies under the token's own foot, measured from the top of the row, behind everything else in the row | Nothing |
| The two lines of a role card's summary ran together | Looking | A space between them | Nothing |
| The landing burst was barely visible in the storyboard frame chosen for the landing | Looking | The frame is taken 50 ms later, at the burst | Nothing |
| At 320 px with 200% text the slanted caption “Command Room” ran 20 px past the screen | The layout check, assertion 1 | The slant turns about the caption's far top corner, so a tall caption leans into its panel's margin | As before |
| At 320 px with 200% text “UNDERCOVER” ran 3 px out of its role card | The layout check, assertion 1 | The role name is set a little smaller on the narrowest phone, and breaks only as a last resort | As before |

Two more, which were mine and not the design's: one of the new mutation tests deleted a token the check needs in order to start, so the check crashed instead of refusing; and the first version of the cue-timing assertion failed a cue that is only a layer when its layer was, rightly, gone. Both were corrected before the run recorded here.

**What was looked at.** The table display with the usual seating, with every health state, with nine in one room, with the stress seating, without art and without names; a phone's first screen in the Jail, its whole page, its open sheet with the role card expanded; all nine role cards, compact and opened; the three asset sheets for rooms, characters and devices; the storyboards of the carried move, with art and without it, and of the role-card turn, each frame. **Not opened again after the last change to what they draw from:** the storyboards of the five unchanged cues, the Shot-card sheet, the controls sheet, the kit sheet, the contact sheet, the two study pages, the two large-text boards, the wide player board, the narrow table board and the reconnect board. They were re-rendered without a page error, and the layout and shell checks ran over the pages they are pictures of; nobody looked at the pictures.

**Not established by any of this**, beyond the list that closes this page: whether nine faces of 32 CSS px and tags of 10 px can be read from across a table; whether people take a room's color for a team's, or the pink character for the Red team, or a yellow caption for something to press; whether a 900 ms carry is comfortable, alone or four at once; whether the nine role cards state their rules correctly, which only a reader of the rules can say; whether the role card's thumbnail reads on a phone. The owner has not looked at the adopted pages. The carried move was seen with a synthetic origin measured in the review page, not with Frontend's director.

## Not run, not measured, not produced

- **Any device.** No phone, no tablet, no shared display at a real distance. Readability, touch accuracy, token size across a table, motion comfort, load, memory and frame time are all unmeasured.
- **Any browser but desktop Chrome 155.** Not iOS Safari, not Android Chrome, not Firefox. `:has()`, container query units, CSS masks, nested `@media`, `:where()`, individual transform properties, `rotate: y`, `filter` inside an animation and `max()` inside `calc()` are used by the reference stylesheets and are unverified elsewhere.
- **Frontend's runtime.** The reference stylesheets and the loader have not been in its harness. The review pages rebuild its markup by hand from a read of its branch at `fccadf7`, and that copy can drift. **What its client requests is unwatched.**
- **Assistive technology.** No screen reader, switch or voice control was used. Forced colors was emulated in Chrome for the shell check's two cases and not looked at by a person.
- **Contrast in compositing.** Computed from token values only.
- **Sound.** None exists. Nothing was listened to.
- **Human art review.** The owner looked at the rooms, the characters and the devices on a working page and approved the direction. No illustrator or art director has reviewed anything. “Finished” means complete for this slice.
- **A reader of the rules for the role-card copy.** Eight of the nine cards are new and have been read against the rule sources by their author alone.
- **Names and characters in a connected match.** No contract carries either. Every picture of them here is drawn from a synthetic table in the review kit.
- **A person's review of any of it.** The independent review above was by a model.
- **External `<use>` of a sprite symbol.** Same-document `<use>` after inlining is drawn on the contact sheet; an external reference is not verified in any browser.
- **The Three.js scene.** No geometry, no depth tuning, no renderer evaluation. That is Frontend's, and the layer depths are a starting point.
- **CI.** The Designer tests and checks do not run there yet.

Nothing in this document, in a render or in a storyboard shows that multiplayer behavior is correct or that the game is balanced.
