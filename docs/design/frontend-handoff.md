# Handoff to Frontend

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Frontend (issue [#3](https://github.com/Amirkianfar66/GameN/issues/3)).
**Base:** `333c9e820f362a211352bc689372663f29b73ac4`. **Your branch as read:** `agent/frontend-motion-gallery` at `fccadf7`, read only. **Date:** 6 October 2026.

Nothing under `apps/game/`, `packages/presentation/` or `docs/frontend/` is changed. Everything here is in Designer's paths and is yours to take, adapt or push back on. You own the runtime.

## The one thing to read first

**How art is loaded is part of the design, because it can leak.**

A stylesheet that names a picture by address makes the browser fetch that picture the first time a rule needs it. Drawn that way, a phone would ask for the “shot available” pip only when its seat has a shot, for the hatch only while a command is in flight, and for the Officer's picture only when that player is the Officer and opens the sheet. Anyone who can see a device's requests could read all three. An earlier draft of this work did exactly that, and an independent review caught it.

So:

1. **A bundle is one stylesheet.** `design/exports/<bundle>/<bundle>.art.<hash>.css` holds every picture of the bundle as a custom property, `--ms-asset-<id>-<variant>`, whose value is the picture itself. The manifest names it at `bundles.<name>.stylesheet`.
2. **A device loads its bundles once, whole, before the first match view**, whatever its seat, role, state or turn. Every phone: `public-board`, `player-ui`, `roles`. The table: `public-board`. Nothing is fetched after that.
3. **Art is drawn only once its bundle has arrived.** The client sets `data-art` on an ancestor of the shell (the review pages use `<html>`) to the space-separated names of the bundles whose stylesheet has loaded. Every rule that draws a picture is behind `[data-art~="<bundle>"]`. Before that, and for good if a bundle fails, the shell is complete without pictures. Nothing is ever hidden waiting for one.
4. **Private pictures are addressed only inside the private sheet.** The role card gets two custom properties, set by you inline on the card: `--ms-role-art` and `--ms-team-accent`. No selector names a role.

`design/prototypes/js/bundles.js` is under 50 lines and does 2 and 3. `npm run check:shell` watches the review pages' requests in Chrome across every role and every picture of the Shot card and finds none that depends on private state. **That says this design can be loaded without a leak. It says nothing about your runtime**, which I have not seen load an asset; the same watch has to be run there. If you load textures for a scene instead, the rule is the same: all of a bundle or none, never a file because of something a view says.

## What you get

| | Where | State |
| --- | --- | --- |
| Finished art: Room A, token, markers, Officer card, cue layers, icons, pips, tiles | `design/exports/`, listed in `asset-manifest.json` | Finished, human art review pending |
| A stylesheet for your shells as they are today | `design/prototypes/css/comic.css` | Reference. Part one is the whole skin without art; part two is the art |
| A stylesheet for the five cues your director issues, to replace the placeholder motion | `design/prototypes/css/cues.css` | Reference. Uses `data-cue`, `data-cue-at`, `data-motion`, `data-effects` |
| Token revision 0.3.0 | `nextDesignTokens` from `@mothership/design-tokens` | Proposal. Additive: your `ShellTokenSource` reads it unchanged |
| The contract as data | `design/contract/*.json` | Proposal. Components, states, cues, callouts |
| Review pages that play all of it | `npm run dev:review --workspace @mothership/design-tokens` | Development only |

`comic.css` is tested against your markup in one sense only: the review pages build the elements your `markup/` modules build at `fccadf7`, by hand, in `design/prototypes/js/kit.js`. It has not been loaded into your harness, and that copy can drift from your code. If a hook differs from what I read, the hook is right and the stylesheet is wrong.

## Start here

1. Open the review pages and look at [layouts.md](layouts.md), [component-states.md](component-states.md) and [motion-storyboards.md](motion-storyboards.md).
2. Load `comic.css` after your token variables in the fixture harness. With no markup change and no art you get the skin: disc tokens, chips, the phase caption, the comic-page board, the Shot card's ten statuses, buttons, the stale frame.
3. Load the three bundle stylesheets the way `bundles.js` does and set `data-art`. You then get the token art, marker icons, standees in Room A, the dock's eye, the card's icon.
4. Replace the rules in `apps/game/src/styles/cues.css` with those in the reference `cues.css`. They use the marks your renderer already sets.
5. Decide on the additions under [Structure requests](#structure-requests). Each is optional and each has a fallback, which is what you have today.
6. Tell me what does not survive a real phone. Nothing here has been on one.

## Tokens

`nextDesignTokens` is 0.3.0. Every 0.2.0 key keeps its name, shape and value; a test holds that, and another holds that every field `ShellTokenSource` names is still present with the same type. Every new color, font family and easing passes the character set your `cssValue()` allows. The prose fields 0.3.0 adds (`breakpointUnit`, the policy statuses, `compatibility`) are not CSS values and are not meant for it.

The names I use for the additions are a proposal for your `shellCssVariables()`. The list, generated from the token file, is `design/prototypes/css/tokens.css`: its first block is your names for the 0.2.0 tokens, and its second block is the proposed ones. The second block holds only names a reference stylesheet or the review kit reads; a check refuses one that nothing uses.

| Tokens | Proposed variables |
| --- | --- |
| `color.paperShade`, `color.paperDeep`, `color.steel.shadow`, `color.steel.mid` | `--ms-color-paper-shade`, `--ms-color-paper-deep`, `--ms-color-steel-shadow`, `--ms-color-steel-mid` |
| `color.factionPrivateOrRevealed.blue` | `--ms-color-faction-blue`. Read only as the team swatch inside the private sheet |
| `type.letteringFamily`, `letteringWeight`, `letteringTrackingEm` | `--ms-font-lettering`, `--ms-weight-lettering`, `--ms-tracking-lettering` |
| `type.privateRoleNameMaxPx`, `tableTimerPx`, `tableHeadingPx` | `--ms-text-role-name`, `--ms-text-table-timer`, `--ms-text-table-heading` |
| `radiusPx.card`, `strokePx.inkFine`, `inkBold`, `panelBorder`, `selection` | `--ms-radius-card`, `--ms-stroke-ink-fine`, `--ms-stroke-ink-bold`, `--ms-stroke-panel`, `--ms-stroke-selection` |
| `motionEasing.impact`, `settle`, `snap`, `sweep` | `--ms-ease-{impact,settle,snap,sweep}` |
| `comic.*` | `--ms-shadow-offset`, `--ms-shadow-offset-lifted`, `--ms-lift`, `--ms-gutter`, `--ms-stamp-rotation` |
| `component.*` | `--ms-token-phone`, `--ms-marker-icon-phone`, `--ms-marker-min-phone`, `--ms-dock-min`, `--ms-roster-min` |
| `layer.*` | `--ms-layer-{panel-chrome,private-sheet,banner,cue-overlay,focus}` |

The remaining steel steps, the other two faction colors, two easings and four layers are in the token file and in the art, and no stylesheet reads them yet.

**Breakpoints.** The reference stylesheets write them in em: 600 px as `37.5em`, 1280 px as `80em`. A layout then answers to the reader's own text size. Your test that the stylesheet's numbers equal the tokens still holds if it divides by 16. Two more thresholds are layout judgments, not tokens: `22em` wide, below which the dock is its control alone, and `30em` tall, below which the phase caption stops holding the top edge.

**The roster breakpoint.** `wideTableLayout` stays 960, as pinned. A new `tableRosterBesideBoard` is 1280. Below it the roster's four columns do not fit beside the board without breaking words.

## Assets

`design/exports/asset-manifest.json` is the index: for every variant its path, size, viewBox, anchors, content hash and the surfaces it may be drawn on; for every bundle its stylesheet.

| Bundle | Holds | Loaded by |
| --- | --- | --- |
| `public-board` | Room A, tokens, numerals, public markers, cue layers, tiles, the stale-connection icon | The table, and every phone |
| `player-ui` | The dock's two eyes, the Shot icon, the pips, the private token emphasis | Every phone, identically |
| `roles` | Role illustrations: one of nine today | Every phone, identically and whole |

The two synthetic studies are in none of them. They are in `design/studies/`, which a production build should leave out entirely; every file there carries your `mothership:dev-only` mark.

**Formats.** Everything is SVG. The bundle stylesheets are the form for a DOM client. The separate files are the same pictures for a renderer that wants one texture each; `token-neutral` therefore also has the nine numerals already laid on a badge and on a standee. Single-color layers are exported in ink and in paper, and as tintable symbols in two sprites that take the CSS `color` of the element using them. The contact sheet draws every sprite symbol through a same-document `<use>` after inlining the sprite, patterns included, and that works in desktop Chrome. An external `<use href="sprite.svg#…">` is not verified anywhere.

**A token is two pictures.** The reference stylesheet lays the seat's numeral over one of three bodies (healthy, injured, eliminated), as two background layers. The numeral is chosen by `data-seat` and the body by the health marker inside the seat. That is nine numerals and six bodies instead of fifty-four pictures, and it is why Injured and Eliminated standees are drawn at all.

**Without art.** Every rule in part one of `comic.css` works alone. Add `&art=none` to a review page's shell to see it, or refuse `/exports/` in your browser's network panel. Forced colors keeps that skin on purpose: part two is inside `@media (forced-colors: none)`.

## Coordinates and anchors

All anchors are in the export's own viewBox, x right, y down.

- **Token badge**, 80 × 80: the body is 64 across and its face center is 38,38, because the offset shadow takes the rest. To draw a token at diameter *d*, draw the picture at `1.25 × d`. `comic.css` does this from `--ms-token-size`.
- **Token standee**, 96 × 120: origin at the floor contact, 48,104. Face center 48,44. Marker slots: turn 48,−2; Captain 78,18; health 78,70; Jail 18,70.
- **Numerals**, 40 × 48 cells, optical center 20,22.5. On a token they are drawn at 0.72: as a background layer, 36% by 43.2% of the badge at 46.1% 48%, and 30% by 28.8% of the standee at 50% 32.5%.
- **Room A**, 1024 × 768: panel box 20,20,984,728; caption corner 34,32. Standees are drawn at 1.45 of their art and stand every 148 units around x 512, on y 649 (near) and y 475 (far). Up to five stand in the near row; six stand 3 and 3, seven 4 and 3, eight 4 and 4, nine 5 and 4. `comic.css` does this in the panel's own units with container query units (`1cqw` is 10.24 room units) and `:has()` quantity queries. It is a reflow, not a capacity, and no slot is drawn.
- **Scene.** The Room A layers each have the full 1024 × 768 box, a stack order and a proposed depth. Tokens are order 6, between the back and front props. Depths are a starting point for your evaluation, not a measurement.

## Hooks

Used as they are, with no change to your markup:

| Your hook | What the reference stylesheet does with it |
| --- | --- |
| `[data-seat] > .ms-token`, `[data-target-seat] > .ms-token` | A disc with its live numeral; with art, a numeral picture over a body |
| `.ms-seat:has(.ms-marker--health[data-variant])` | Injured and Eliminated tokens, as outlines without art and as bodies with it |
| `.ms-marker--{health,jail,captain,turn,self}[data-variant]` | Chips with their words; icons with art; badges on standees in a vignette panel |
| `.ms-phase`, `.ms-timer[data-state][data-final]` | Caption box and countdown |
| `.ms-shell--table .ms-zone[data-zone="room-a"]` | Vignette, caption, standees |
| `.ms-card__state[data-status][data-step][data-selected]` | The ten statuses, the lift, the pending band, the stamp |
| `.ms-shell[data-connection="stale"]` | Hatched frame, dashed countdown |
| `[data-cue]`, `[data-cue-at]`, `[data-motion]`, `[data-effects]` | Every cue |
| `a.ms-skip`, `.ms-details__list`, `.ms-timer[data-state="none"]`, `.ms-phase__detail` | Styled as your markup has them |

The Shot card is drawn exactly as your model produces it. “Available” has three pictures, because your idle step can say three things under that one status: a control on the seat's own turn, the line “You can register a shot during your own turn.” on another seat's, and nothing while the view is stale. “Not available” carries no reason, because your model gives none. “Registered” is drawn both as the report with its Done control and at rest in the idle step.

## Structure requests

Each is marked PROPOSED in the stylesheets and carries `data-design-proposal` in the review pages' markup. Without any of them the shells look like the fallback in the last column, which is complete.

| ID | Request | Why | Without it |
| --- | --- | --- | --- |
| FE-D1 | Make the private section the last one in `main` and give it `ms-private--docked`. On opening, bring the phase caption to the top edge and set `--ms-phase-block-size` to its measured height | One tap from anywhere during a 60-second turn. The control that hides the sheet stays pinned at its top | Your in-flow panel, restyled |
| FE-D2 | `<span class="ms-location__art" data-location="<zone id>" aria-hidden="true">` in the location panel | The room's silhouette names it at a glance. A span, not an image: nothing is fetched when a seat moves | The caption alone |
| FE-D3 | Inside `.ms-role-card`: `span.__art`, `.__text > .__name + .__team`, and a closed `details.__more` with the summary. A `div`, not a `p`. Set `--ms-role-art` and `--ms-team-accent` inline on the card | The role card as a card; the actions stay within reach | The role name on a paper card, as today. Please cap it at the heading size either way: at display size it can be read across a table |
| FE-D4 | `.ms-card__pips > .ms-pip[data-pip]` in the card title, with an accessible name. `registered` while the view lists the seat's own pending command, `available` while `self.shotAvailable` is true, and none while a command of this card is unaccounted for | The resource as a shape | The status word alone |
| FE-D5 | A local mark `data-cue="selection"` on `.ms-card` when the player picks it up | The lift's accent | The lift as a plain transition |
| FE-D6 | `data-art` on an ancestor of the shell, set to the bundles whose stylesheet has loaded | See the top of this page. It replaces the `data-assets="missing"` I asked for in an earlier draft, which failed open: a device that never set it hid its seat numbers behind pictures that were not there | The complete skin without art |

## Cues

The reference `cues.css` gives each kind your director issues one treatment, at exactly its token duration.

| Director kind | Lands on | Treatment | Differs from the placeholder |
| --- | --- | --- | --- |
| `registration` | `[data-cue-at="registration"]` | The status word comes down as a stamp; halftone presses out and clears | Three beats; a press layer |
| `public-move` | `li[data-cue-at="seat-N/place"]`, and the roster cell | The token **drops in from above** with an ink trail and a puff; the cell is underlined | The placeholder slides in from one side. On a spatial board a sideways arrival reads as a route |
| `status-change` | `.ms-marker[data-cue-at="seat-N/health"]`, and the roster cell | A paper ring opens around the marker, inside the gap beside the name; the cell is underlined in paper | The placeholder lights the cell in amber. Amber on a health change reads as “hit” |
| `phase-change` | `[data-cue-at="phase"]` | A rule is ruled under the labels | Close to yours |
| `round-transition` | `[data-cue-at="phase"]` | An ink panel sweeps across the labels, the heading is struck with speed lines, the panel leaves | A panel instead of two rules. It covers the labels only, never the countdown |

Four things to keep if you rewrite them:

- **No `animation` shorthand.** Each rule sets name, duration and timing only. One shared rule sets `animation-delay: var(--cue-at, 0s)` and `animation-play-state: var(--cue-play, running)`; the shorthand would reset both. That is how the storyboard page freezes a cue at an exact millisecond, and it is how you could test one.
- **Reduced motion replaces the cue with the 80 ms fade**, except selection, which does not fade a card that was already on screen.
- **Reduced effects removes the side layers and nothing else.** It never overrides the motion setting.
- **The pictures in a cue are optional.** The trail, the dust, the panel's halftone edge and the speed lines are behind `:where([data-art~="public-board"])`. `:where()` keeps those rules at the weight of the ones around them, so reduced motion and reduced effects still switch them off.

GSAP is not needed for any of these five; they are CSS. That is not an opinion on its license, which is the owner's question.

## What was and was not checked

Checked, in desktop Chrome 155 on one Mac, on the hand-built copy of your markup: the layout matrix and the request watch described in [verification.md](verification.md#checks-that-need-a-browser).

Not checked by anyone: a phone. A shared display at a real distance. iOS Safari or Android Chrome. Your runtime. A screen reader. `:has()`, container query units, CSS masks and nested `@media` on the browsers you support. Motion comfort. Load, memory and frame time. Whether three stylesheets of about 96, 6 and 8 KB are the right way to ship 86 small pictures to a phone, which is a measurement and yours to make. All of that I would like to see.

## Questions for your review

1. **FE-D6 and the loading rule.** Can your build serve each bundle as one stylesheet, and can you run the request watch on your own runtime? If you would rather inline pictures another way, the property that matters is that no request depends on a view.
2. **FE-D1.** Does a bottom dock survive iOS Safari's own bottom bar and a keyboard? Should the connection banner stay in view when the page is scrolled?
3. **The table display's scale.** Everything is in rem and the board in container units, so one root font size scales the whole display. I would try `clamp(16px, 1.25vw, 32px)` on the table route. In desktop Chrome at 1280 px wide the Room A panel is 365 px wide and a standee is 50 by 62 px, so its numeral's box is 18 px tall; at 1920 they are 569, 77 by 97 and 28. Roster text is 18 px and the countdown 56 px at both, and names and chips on a plain panel are 14 px. That is small from across a table, and I have not seen it from one.
4. **The closed dock is 146 px tall at 360 px wide** in the same render, because the privacy reminder is shown under the control. Below 22em wide the dock is its control alone. At 320 by 568 with text doubled that control wraps to three lines and the dock is 216 px, 38% of the screen. A shorter visible label there would help; the wording is yours.
5. **Board markers are badges without words.** Their words are in the roster and, hidden from sight only, in the panel. Is that enough at a distance, or should the panel carry short labels when few tokens are in it?
6. **Amber twice.** The active-turn chip is not drawn inside the private sheet, but an amber control in an open sheet and an amber “Active turn” chip in the list behind it can be on one screen. Does that confuse anyone who plays it?
7. **`:has()` quantity queries** for the standee rows are convenient and unusual. If you would rather compute the row split in the view model, the rule is in the manifest.
8. **Target rows** draw the idle badge whatever the seat's health; the status is in the row's words. A `data-target-health` on the control would let the token match the roster.

Your answers belong on the PR. I will change the design, not argue with the device.
