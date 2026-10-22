# Handoff to Frontend

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Frontend (issue [#3](https://github.com/Amirkianfar66/GameN/issues/3)).
**Base:** `333c9e820f362a211352bc689372663f29b73ac4`. **Your branch as read:** `agent/frontend-motion-gallery` at `fccadf7`, read only. **Date:** 6 October 2026; revised 7 October 2026 for the comic board the owner approved that day.

Nothing under `apps/game/`, `packages/presentation/` or `docs/frontend/` is changed. Everything here is in Designer's paths and is yours to take, adapt or push back on. You own the runtime.

**What changed on 7 October, in one paragraph.** The owner approved a new look ([owner-decisions.md](owner-decisions.md)) and it is now in the sources, the exports, the tokens and the reference stylesheets, on the hooks you already have: five rooms, each in its own colors; playing pieces that are characters, with a tag of seat number and name; a role shown as a device on the player's own character, inside the private sheet; a move in which the piece is picked up, carried and set down. The rooms, their colors, the captions and the role devices need nothing new from anyone. The characters and names need two public facts that no contract carries yet ([Names and characters](#names-and-characters)); until then the same stylesheet draws numbered tokens and “Player N”. What is not adopted yet is at the [end of this page](#what-of-the-approved-direction-is-not-here-yet).

## The one thing to read first

**How art is loaded is part of the design, because it can leak.**

A stylesheet that names a picture by address makes the browser fetch that picture the first time a rule needs it. Drawn that way, a phone would ask for the “shot available” pip only when its seat has a shot, for the hatch only while a command is in flight, and for the Officer's picture only when that player is the Officer and opens the sheet. Anyone who can see a device's requests could read all three. An earlier draft of this work did exactly that, and an independent review caught it.

So:

1. **A bundle is one stylesheet.** `design/exports/<bundle>/<bundle>.art.<hash>.css` holds every picture of the bundle as a custom property, `--ms-asset-<id>-<variant>`, whose value is the picture itself. The manifest names it at `bundles.<name>.stylesheet`.
2. **A device loads its bundles once, whole, before the first match view**, whatever its seat, role, state or turn. Every phone: `public-board`, `player-ui`, `roles`. The table: `public-board`. Nothing is fetched after that.
3. **Art is drawn only once its bundle has arrived.** The client sets `data-art` on an ancestor of the shell (the review pages use `<html>`) to the space-separated names of the bundles whose stylesheet has loaded. Every rule that draws a picture is behind `[data-art~="<bundle>"]`. Before that, and for good if a bundle fails, the shell is complete without pictures. Nothing is ever hidden waiting for one.
4. **Private pictures are addressed only inside the private sheet.** The role card gets three custom properties, set by you inline on the card: `--ms-role-device` (the role's device, from the role bundle), `--ms-role-person` (the player's own character, which is public) and `--ms-team-accent`. No selector names a role, and no element outside the sheet ever carries any of the three.

`design/prototypes/js/bundles.js` is under 50 lines and does 2 and 3. `npm run check:shell` watches the review pages' requests in Chrome across every role and every picture of the Shot card and finds none that depends on private state. **That says this design can be loaded without a leak. It says nothing about your runtime**, which I have not seen load an asset; the same watch has to be run there. If you load textures for a scene instead, the rule is the same: all of a bundle or none, never a file because of something a view says.

## What you get

| | Where | State |
| --- | --- | --- |
| Finished art: five rooms, nine characters, nine role devices, the numbered token, markers, cue layers, icons, pips, tiles | `design/exports/`, listed in `asset-manifest.json` (`design-0.2.0`) | Finished. The owner approved the rooms, characters and devices as a direction; no illustrator has reviewed anything |
| A stylesheet for your shells as they are today | `design/prototypes/css/comic.css` | Reference. Part one is the whole skin without art; part two is the art |
| A stylesheet for the five cues your director issues and two local ones, to replace the placeholder motion | `design/prototypes/css/cues.css` | Reference. Uses `data-cue`, `data-cue-at`, `data-motion`, `data-effects` |
| Token revision 0.4.0 | `nextDesignTokens` from `@mothership/design-tokens` | Proposal. Additive over the pinned 0.2.0: your `ShellTokenSource` reads it unchanged |
| The contract as data | `design/contract/*.json` | Proposal. Components, states, cues, callouts, the crew catalog |
| Role-card copy for all nine roles | `design/contract/copy.en.proposed.json`, drawn at `states.html?sheet=roles` | Proposal, for you and the owner to review. Every line that states a rule cites its rule source |
| Review pages that play all of it | `npm run dev:review --workspace @mothership/design-tokens` | Development only |

`comic.css` is tested against your markup in one sense only: the review pages build the elements your `markup/` modules build at `fccadf7`, by hand, in `design/prototypes/js/kit.js`. It has not been loaded into your harness, and that copy can drift from your code. If a hook differs from what I read, the hook is right and the stylesheet is wrong.

## Start here

1. Open the review pages and look at [layouts.md](layouts.md), [component-states.md](component-states.md) and [motion-storyboards.md](motion-storyboards.md).
2. Load `comic.css` after your token variables in the fixture harness. With no markup change and no art you get the skin: disc tokens, chips, the phase caption, the comic-page board, the Shot card's ten statuses, buttons, the stale frame.
3. Load the three bundle stylesheets the way `bundles.js` does and set `data-art`. You then get the five rooms in their colors with standees in them, the room strip and caption icon on a phone, the token art, marker icons, the dock's eye, the card's icon.
4. Replace the rules in `apps/game/src/styles/cues.css` with those in the reference `cues.css`. They use the marks your renderer already sets.
5. Decide on the additions under [Structure requests](#structure-requests). Each is optional and each has a fallback, which is what you have today.
6. Tell me what does not survive a real phone. Nothing here has been on one.

## Tokens

`nextDesignTokens` is 0.4.0. Every 0.2.0 key keeps its name, shape and value; a test holds that, and another holds that every field `ShellTokenSource` names is still present with the same type. Every new color, font family and easing passes the character set your `cssValue()` allows. The prose fields it adds (`breakpointUnit`, the policy statuses, `compatibility`, `revisedFrom030`, `measuredColorDistances`) are not CSS values and are not meant for it.

0.4.0 follows 0.3.0, the revision of PR #45, and adds what the approved comic board needs: `color.room` (five rooms, five tones each, named as `color.steel` is), `color.crew` and `color.crewHair` (the nine characters), `color.caption`, the durations `pieceMove` and `roleCardTurn` with their beats, and the sizes of a piece and a tag. It changes one 0.3.0 entry, the sentence that said a location is never tinted, and lists it.

The names I use for the additions are a proposal for your `shellCssVariables()`. The list, generated from the token file, is `design/prototypes/css/tokens.css`: its first block is your names for the 0.2.0 tokens, and its second block is the proposed ones. The second block holds only names a reference stylesheet or the review kit reads; a check refuses one that nothing uses.

| Tokens | Proposed variables |
| --- | --- |
| `color.paperShade`, `color.paperDeep`, `color.steel.shadow`, `color.steel.mid` | `--ms-color-paper-shade`, `--ms-color-paper-deep`, `--ms-color-steel-shadow`, `--ms-color-steel-mid` |
| `color.caption` | `--ms-color-caption`. Room captions |
| `color.room.<room>.shadow` and `.mid`, for each of the five | `--ms-color-location-<zone id>-shadow` and `-mid`: the ground of a room panel whose picture has not arrived, and the bar beside a room's name in a list |
| `color.factionPrivateOrRevealed.blue`, `.red`, `.alien` | `--ms-color-faction-blue`, `-red`, `-alien`. Read only as the team swatch inside the private sheet |
| `type.letteringFamily`, `letteringWeight`, `letteringTrackingEm` | `--ms-font-lettering`, `--ms-weight-lettering`, `--ms-tracking-lettering` |
| `type.privateRoleNameMaxPx`, `tableTimerPx`, `tableHeadingPx` | `--ms-text-role-name`, `--ms-text-table-timer`, `--ms-text-table-heading` |
| `radiusPx.card`, `strokePx.inkFine`, `inkBold`, `panelBorder`, `selection` | `--ms-radius-card`, `--ms-stroke-ink-fine`, `--ms-stroke-ink-bold`, `--ms-stroke-panel`, `--ms-stroke-selection` |
| `motionEasing.standard`, `impact`, `settle`, `snap`, `sweep` | `--ms-ease-{standard,impact,settle,snap,sweep}` |
| `motionMs.pieceMove`, `roleCardTurn` | `--ms-motion-piece-move`, `--ms-motion-role-card-turn` |
| `comic.*` | `--ms-shadow-offset`, `--ms-shadow-offset-lifted`, `--ms-lift`, `--ms-gutter`, `--ms-stamp-rotation`, `--ms-caption-skew`, `--ms-caption-tilt` |
| `component.*` | `--ms-token-phone`, `--ms-marker-icon-phone`, `--ms-marker-min-phone`, `--ms-dock-min`, `--ms-roster-min`, `--ms-piece-min`, `--ms-piece-max`, `--ms-tag-text-min`, `--ms-tag-text-max` |
| `layer.*` | `--ms-layer-{panel-chrome,private-sheet,banner,cue-overlay,focus}` |

The remaining steel steps, the other three tones of each room, the characters' colors, one easing and four layers are in the token file and in the art, and no stylesheet reads them. `motionMs.publicMove` (450) keeps your name `--ms-motion-move`; the reference stylesheet no longer reads it, because the move it draws lasts `pieceMove`, of which 450 ms is the time in the air.

**Breakpoints.** The reference stylesheets write them in em: 600 px as `37.5em`, 1280 px as `80em`. A layout then answers to the reader's own text size. Your test that the stylesheet's numbers equal the tokens still holds if it divides by 16. Two more thresholds are layout judgments, not tokens: `22em` wide, below which the dock is its control alone, and `30em` tall, below which the phase caption stops holding the top edge.

**The roster breakpoint.** `wideTableLayout` stays 960, as pinned. A new `tableRosterBesideBoard` is 1280. Below it the roster's four columns do not fit beside the board without breaking words.

## Assets

`design/exports/asset-manifest.json` is the index: for every variant its path, size, viewBox, anchors, content hash and the surfaces it may be drawn on; for every bundle its stylesheet.

| Bundle | Holds | Loaded by |
| --- | --- | --- |
| `public-board` | The five rooms, the nine characters (standee and card), the numbered token and numerals, public markers, cue layers, tiles, room icons, the stale-connection icon | The table, and every phone |
| `player-ui` | The dock's two eyes, the Shot icon, the pips, the private token emphasis | Every phone, identically |
| `roles` | The nine role devices | Every phone, identically and whole |

The two synthetic studies are in none of them. They are in `design/studies/`, which a production build should leave out entirely; every file there carries your `mothership:dev-only` mark.

**Formats.** Everything is SVG. The bundle stylesheets are the form for a DOM client. The separate files are the same pictures for a renderer that wants one texture each; `token-neutral` therefore also has the nine numerals already laid on a badge and on a standee. Single-color layers are exported in ink and in paper, and as tintable symbols in two sprites that take the CSS `color` of the element using them. The contact sheet draws every sprite symbol through a same-document `<use>` after inlining the sprite, patterns included, and that works in desktop Chrome. An external `<use href="sprite.svg#…">` is not verified anywhere.

**A numbered token is two pictures.** The reference stylesheet lays the seat's numeral over one of three bodies (healthy, injured, eliminated), as two background layers. The numeral is chosen by `data-seat` and the body by the health marker inside the seat. That is nine numerals and six bodies instead of fifty-four pictures, and it is why Injured and Eliminated standees are drawn at all.

**A piece with a character is one picture**: `piece-crew:standee-cN` on the board, `piece-crew:card-cN` in a row. Its health is told by its markers and, on the board, by badges that ride on it; a face is not given a wound, and an eliminated seat's character loses its color.

**A room is one drawing printed in its own colors.** All five are drawn in steel. A room's recipe swaps the five steel values for the room's family in the tokens, so the files you load are already in color and a room can be printed in another family without being redrawn. Room A is also exported in eight layers; the other four are exported whole.

**Without art.** Every rule in part one of `comic.css` works alone. Add `&art=none` to a review page's shell to see it, or refuse `/exports/` in your browser's network panel. Forced colors keeps that skin on purpose: part two is inside `@media (forced-colors: none)`.

## Coordinates and anchors

All anchors are in the export's own viewBox, x right, y down.

- **Token badge**, 80 × 80: the body is 64 across and its face center is 38,38, because the offset shadow takes the rest. To draw a token at diameter *d*, draw the picture at `1.25 × d`. `comic.css` does this from `--ms-token-size`.
- **Token standee and character standee**, 96 × 120: origin at the floor contact, 48,104. Marker slots: turn 48,−2; Captain 78,18; health 78,70; Jail 18,70. A tag hangs from 48,116.
- **Character card**, 84 × 96: the standee without its stand, cut out of the same drawing at 8,0.
- **Numerals**, 40 × 48 cells, optical center 20,22.5. On a token they are drawn at 0.72: as a background layer, 36% by 43.2% of the badge at 46.1% 48%, and 30% by 28.8% of the standee at 50% 32.5%.
- **Every room**, 1024 × 768: panel box 20,20,984,728; caption corner 34,32. Pieces stand in **one row** along the lower edge, centered, each on its floor contact, with its tag under it (`pieceRow` in the manifest). A piece is at most a fifth of the room wide, never under 20 CSS px, and all of them fit side by side; from four pieces every second tag hangs a line lower. `comic.css` does this with container query units (`1cqw` is a hundredth of the room's width) and `:has()` quantity queries. It is a reflow, not a capacity, and no slot is drawn.
- **Role device**, 120 × 140, on a picture of 50 : 53. The character's card is 66.5% of the picture's width, 11.3% from its left edge and 6% from its top, turned 2.5 degrees. The device is 74% of the width and runs 9% past the right edge and 10% past the lower edge, where the picture cuts it.
- **Scene.** The Room A layers each have the full 1024 × 768 box, a stack order and a proposed depth. Pieces are order 6, between the back and front props. Depths are a starting point for your evaluation, not a measurement.

## Hooks

Used as they are, with no change to your markup:

| Your hook | What the reference stylesheet does with it |
| --- | --- |
| `[data-seat] > .ms-token`, `[data-target-seat] > .ms-token` | A disc with its live numeral; with art, a numeral picture over a body, or the seat's character where it has one |
| `.ms-seat:has(.ms-marker--health[data-variant])` | Injured and Eliminated tokens, as outlines without art and as bodies with it |
| `.ms-marker--{health,jail,captain,turn,self}[data-variant]` | Chips with their words; icons with art; badges on standees in a vignette panel |
| `.ms-phase`, `.ms-timer[data-state][data-final]` | Caption box and countdown |
| `.ms-shell--table .ms-zone[data-zone]` for the five rooms | Vignette in the room's colors, caption with icon, pieces in a row, tags |
| `.ms-roster .ms-zone[data-zone]` on a phone | A bar in the room's own color beside its name |
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
| FE-D3 | Inside `.ms-role-card`: `span.__art`, `.__text > .__name + .__team`, and a closed `details.__more` with the summary. A `div`, not a `p`. Set `--ms-role-device`, `--ms-role-person` and `--ms-team-accent` inline on the card, to `var(--ms-asset-device-<role>-held)`, `var(--ms-asset-piece-crew-card-cN)` and one of the three `--ms-color-faction-*` | The role as a device on the player's own character; the actions stay within reach | The role name on a paper card, as today. Please cap it at the heading size either way: at display size it can be read across a table |
| FE-D4 | `.ms-card__pips > .ms-pip[data-pip]` in the card title, with an accessible name. `registered` while the view lists the seat's own pending command, `available` while `self.shotAvailable` is true, and none while a command of this card is unaccounted for | The resource as a shape | The status word alone |
| FE-D5 | A local mark `data-cue="selection"` on `.ms-card` when the player picks it up | The lift's accent | The lift as a plain transition |
| FE-D6 | `data-art` on an ancestor of the shell, set to the bundles whose stylesheet has loaded | See the top of this page. It replaces the `data-assets="missing"` I asked for in an earlier draft, which failed open: a device that never set it hid its seat numbers behind pictures that were not there | The complete skin without art |
| FE-D7 | `data-character="c1"` to `"c9"` on `li.ms-seat` and `button.ms-target`, from the seat's public identity | The piece is the character its player chose | The numbered token |
| FE-D8 | Where a seat has a name, its name element (`.ms-seat__name`, `.ms-target__name`, the roster's row header) holds `.ms-seat__number` and `.ms-seat__player`, read aloud as “Player 7, Ada” | The tag of the approved pieces: the seat number in a chip, then the name | “Player N”, as today |
| FE-D9 | For a public move on a board panel, `--cue-from-x` and `--cue-from-y` on the seat's element: where its token stood, measured from where it stands now (First, Last, Invert) | The piece is carried from where it stood | The piece hops where it stands. It also hops, whatever the two say, in a list and on a panel that is still plain: there a row is words beside a token, and carrying it would drag them across other seats' words |
| FE-D10 | A local mark `data-cue="role-card-turn"` on `.ms-role-card` when the player opens the sheet, taken off when its 900 ms have run | The card comes up face down and turns over; the device is put into the character's hand | The card is simply there |

## Cues

The reference `cues.css` gives each kind your director issues one treatment, at exactly its token duration, and the same for two things a player does on their own device.

| Kind | Lands on | Treatment | Differs from the placeholder |
| --- | --- | --- | --- |
| `registration` | `[data-cue-at="registration"]` | The status word comes down as a stamp; halftone presses out and clears | Three beats; a press layer |
| `public-move`, **900 ms** | `li[data-cue-at="seat-N/place"]`, and the roster cell | The piece **is picked up, carried and set down**: 120 ms to leave the page, 450 ms in the air, 330 ms to land, with its shadow on the page under it, streaks as it comes down and a burst and dust where it lands. On the table the room it lands in takes the knock. The roster cell is underlined | The placeholder slides in from one side in 450 ms. This is the move the owner approved. It is carried over the page and no line is drawn, so the picture still says nothing about which rooms connect |
| `status-change` | `.ms-marker[data-cue-at="seat-N/health"]`, and the roster cell | A paper ring opens around the marker, inside the gap beside the name; the cell is underlined in paper | The placeholder lights the cell in amber. Amber on a health change reads as “hit” |
| `phase-change` | `[data-cue-at="phase"]` | A rule is ruled under the labels | Close to yours |
| `round-transition` | `[data-cue-at="phase"]` | An ink panel sweeps across the labels, the heading is struck with speed lines, the panel leaves | A panel instead of two rules. It covers the labels only, never the countdown |
| local: `selection` | `.ms-card` | The card lifts off its shadow | FE-D5 |
| local: `role-card-turn`, **900 ms** | `.ms-role-card`, inside the open sheet | The card comes up face down, turns over, the device is put into the character's hand and its color comes on | New. The same for all nine roles: an onlooker must not be able to tell a role by how its card turns |

**The carried move needs one thing from your renderer: where the piece stood.** Read the token's place before you apply the view, read it again after, and set the difference on the seat's element as `--cue-from-x` and `--cue-from-y` when you mark the cue (FE-D9). The stylesheet carries the row along the ground from there and lifts the token off it. Where you cannot measure (the seat was not on this screen before), leave them unset and the piece hops in place. **Only a piece on a board panel is carried.** In a phone's lists, and on a panel whose picture has not arrived, the stylesheet makes the piece hop where it stands even if you set the two properties: I saw a whole row, name and status word included, carried across other seats' words in the storyboard without art, and took the carry out there. Three things the reference does not do and your renderer may: raise the arc with the distance, as the approved page does (0.42 of the distance, between 46 and 130 CSS px); let the room the piece left close up only once it has gone; draw the ink trail along the arc. The stylesheet has every other piece in its new place from the first frame.

**It starts on the public fact.** Not on the player's own tap and not on the receipt: the same on every screen, the mover's included. A room panel must not clip (`overflow: hidden`), or the piece disappears at the gutter.

Five things to keep if you rewrite them:

- **No `animation` shorthand.** Each rule sets name, duration and timing only. One shared rule sets `animation-delay: var(--cue-at, 0s)` and `animation-play-state: var(--cue-play, running)`; the shorthand would reset both. That is how the storyboard page freezes a cue at an exact millisecond, and it is how you could test one.
- **Reduced motion replaces the cue with the 80 ms fade**, except selection, which does not fade a card that was already on screen. Nothing travels, turns or is knocked.
- **A rule that moves something must not outweigh the rule that stops it.** I made that mistake in the first draft of the role-card turn: its selector weighed more than the general reduced-motion rule, and the card kept turning. `check:shell` now plays every cue of the contract with motion reduced and refuses anything but the short fade. It is also why the carry is switched on by a custom property (`--ms-cue-row`) that one light rule reads, and not by a heavy selector.
- **Reduced effects removes the side layers and nothing else.** It never overrides the motion setting.
- **The pictures in a cue are optional.** The trail, the burst, the dust, the panel's halftone edge and the speed lines are behind `:where([data-art~="public-board"])`. `:where()` keeps those rules at the weight of the ones around them, so reduced motion and reduced effects still switch them off.

GSAP is not needed for any of these seven; they are CSS, and the carried move needs a measurement and no library. That is not an opinion on its license, which is the owner's question.

## Cue freshness

**Agreed between us, with two things new.** You agreed the windows and the rules of withdrawal on PR #45, and said on PR #57 that your director has them, with R6 fixed, in PR #30 at `24a5237`. I have read those comments and your cue vocabulary there; I have not run that code. `design/contract/motion-cues.json` now records your values as agreed, where it used to print the provisional 2000 and 5000.

| Point | Where it stands |
| --- | --- |
| Start window | **1000 ms, agreed.** A cue is for starting a treatment, not for holding it: once started, a treatment runs its own 120 to 900 ms and finishes |
| Event lateness | **1000 ms, agreed.** A piece that has stood in its new place for seconds and is then carried in reads as a second move |
| What withdraws a cue, and what never does | **Agreed, and R6 is fixed on your side**, as you report. A public cue belongs to one public fact; a private-only update never withdraws, restarts, renumbers or delays one |
| Several cues for one view | **Together, never in sequence. Agreed** |
| **Where the cap of four lives** (your open point) | **In your director, as you proposed. Agreed.** It issues no move cue for a view that moves more than four seats, counting from the two views themselves, so the count does not depend on the order events arrive in. The four was set for a 450 ms drop and is kept for the 900 ms carry; nobody has watched four pieces carried at once, so treat the number as a first guess |
| **“A move draws no origin”** (which you agreed, and offered to take `from` out of the vocabulary) | **I have to take this one back. Please keep `from`.** The move the owner approved carries the piece from where it stood, so the origin is used now: both places are public facts of the seat, the place it left is redrawn without it, and still no line or route is drawn between the two. Your cue's `from` names the room; the renderer measures where in it the piece stood (FE-D9). If you did not read the old place before applying the view, the middle of the `from` room's row is a fair origin |
| A cue can be missed and a fact cannot; a private cue is never played later; nothing is cued on a stale screen; a health change is a status change; public and private cues are numbered apart | Yours, accepted as they are |

**R6, for the record.** A public cue belongs to a public fact on the screen: the phase caption, the place of one seat, the health of one seat. It does not belong to a view as a whole, because a seat's view also changes when only something private does. Otherwise someone watching a phone's public layer could see a registration in a public animation that stopped short.

What is checked on my side is only the stylesheet's part: `check:shell` starts a move, a status change and a round transition, holds each of their thirteen animations halfway, redraws only the private section 26 times through every picture of the Shot card, and finds every animation where it was. You said you have not checked in a browser that a private-only redraw leaves a running public animation untouched in your harness; mine cannot stand in for that.

None of the numbers is measured. They are judgments from storyboards in desktop Chrome.

## Names and characters

The approved pieces need two public facts that no contract carries: the name a seat is shown with, and which of nine characters its player chose. Integration is preparing how they travel ([DSN-REQ-6](integration-requests.md#dsn-req-6)): a new wire version or a separately versioned identity record. You and Game Balance are its consumers.

Your comment on PR #57 lists what your client needs from that record: a listened public document per match; a seat id, a name and a character id from a catalog whose version the document names; set in the lobby and fixed at the start; uniqueness decided by the server; a fallback for a seat with neither; identity that stays with the seat through seat recovery; nothing of a role in it. I agree with all seven, and the catalog's rules now say the same from the drawing's side. You also wrote that spoken lines keep “Player N”: the tag here is read aloud as “Player 7, Ada” for that reason.

What is ready on my side, so that nothing waits for the drawing:

- **The catalog**, [`design/contract/crew-catalog.json`](../../design/contract/crew-catalog.json): ids `c1` to `c9`, the two exports of each, its colors, a proposed call sign.
- **Both looks in one stylesheet.** A seat with `data-character` is drawn as its character with a tag; a seat without it is drawn exactly as before. `shell.html?identity=none` shows any review page without the two facts, and `check:layout` measures both.
- **The pictures are already loaded.** All eighteen are in the public bundle. Choosing or changing a character fetches nothing.

What I need you to hold, whichever way the facts arrive:

1. **A character is public and says nothing of a role.** It is chosen before roles are dealt. Nothing in your model may derive it from, or feed it into, anything private.
2. **A name is untrusted text.** Set it as text, never as markup. It is at most 12 characters and is always with the seat number. A player may type “Hacker” as their name: that is not a leak, and nothing may style, check or act on what a name says.
3. **A tag may shorten a long name in one place only**: under a piece on a board panel that has the roster beside it, where the roster carries the name whole. The seat number is never shortened. Everywhere else a name wraps.
4. **Sentences that name a seat are yours to reword** once names exist (“Register a shot at Player 2?”). I have drawn only the tag.

In the review pages the names (Ada to Ivo) and the pairing of seat and character are synthetic. The pairing is deliberately not “seat N has character N”.

## What of the approved direction is not here yet

The owner approved a working page, [design/explorations/comic-board/](../../design/explorations/comic-board/README.md). Most of it is now in the sections above. Four things are not, and each waits for something of yours or of Integration's:

| In the approved page | Not here because | Meanwhile |
| --- | --- | --- |
| The whole board as a comic page **on a phone**, above a hand of cards | It replaces the phone's list of rooms with a picture. That needs your movement markup (protocol 2) and a reading path that still works at 200% text, where a picture cannot grow ([DSN-D18](README.md#open-decisions)) | The phone keeps its list, which is complete at any text size, with each room's strip, caption and color |
| Pressing a room to move there | The move card and the server's own list of destinations are in protocol 2, which is not in my base. In the page a room is pressable exactly when its name is among the card's choices, and the card keeps its list: the board is a second path and never the only one | No move control is drawn |
| A role card dealt face down into a hand, and a large card when it is turned up | Today's markup has a private sheet that holds the role and the actions together. I made the picture compact there, so that the actions stay in reach and a device in its team's color is not large on screen every time the sheet is opened. Whether the large card of the approved page comes back as its own view is the owner's to say ([DSN-D19](README.md#open-decisions)) | The closed dock stands for the face-down card; “About this role” shows the picture large |
| Motion while nothing happens: stars, lamps, a blink | `motionPolicy.loops` is false in the pinned tokens and the reference stylesheets refuse motion that repeats ([DSN-D16](README.md#open-decisions)) | None. The parts that would move are groups of their own in the sources |

The page is plain script written to be looked at. Please do not take its code; take its states, its order and its timings.

## What was and was not checked

Checked, in desktop Chrome 155 on one Mac, on the hand-built copy of your markup: the layout matrix and the request watch described in [verification.md](verification.md#checks-that-need-a-browser).

Not checked by anyone: a phone. A shared display at a real distance. iOS Safari or Android Chrome. Your runtime. A screen reader. `:has()`, container query units, CSS masks, nested `@media`, the `rotate: y` of the role-card turn and `filter` in an animation on the browsers you support. Motion comfort, and whether a 900 ms carry is too long when four seats move at once. Load, memory and frame time. Whether three stylesheets of about 231, 6 and 25 KB (20, 1.1 and 2.9 KB after gzip at its highest setting, measured here with Python's `gzip` and not on a server; a KB here is 1,024 bytes, as in the asset inventory) are the right way to ship 122 pictures to a phone, which is a measurement and yours to make. Whether people can tell nine faces apart at 32 CSS px. All of that I would like to see.

## Questions for your review

1. **FE-D6 and the loading rule.** Can your build serve each bundle as one stylesheet, and can you run the request watch on your own runtime? If you would rather inline pictures another way, the property that matters is that no request depends on a view.
2. **FE-D1.** Does a bottom dock survive iOS Safari's own bottom bar and a keyboard? Should the connection banner stay in view when the page is scrolled?
3. **The table display's scale.** Everything is in rem and the board in container units, so one root font size scales the whole display. I would try `clamp(16px, 1.25vw, 32px)` on the table route. Measured in desktop Chrome at 1280 px wide: the Room A panel is 365 px wide; six pieces in it are 47 by 59 px with tags set in 14 px; one piece alone is 73 by 91 with a 22 px tag; **nine in one room are 32 by 39 px with tags at the 10 px minimum**. At 1920 the same are 569, 74 by 93, 110 by 138 and 50 by 62 with a 15 px tag. Roster text is 18 px and the countdown 56 px at both. Nine faces at 32 px and a 10 px tag are small from across a table, and I have not seen them from one. The roster beside the board says everything in words.
4. **The closed dock is 146 px tall at 360 px wide** in the same render (a piece in a row there is 40 by 45 px, and the room strip 300 by 131), because the privacy reminder is shown under the control. Below 22em wide the dock is its control alone. At 320 by 568 with text doubled that control wraps to three lines and the dock is 216 px, 38% of the screen. A shorter visible label there would help; the wording is yours.
5. **Cue freshness.** Are a 1000 ms start window, 1000 ms of lateness and at most four drops per view workable in your director, and would you rather hold the window in the frame or in the renderer?
6. **Board markers are badges without words.** Their words are in the roster and, hidden from sight only, in the panel. Is that enough at a distance, or should the panel carry short labels when few tokens are in it?
7. **Amber twice.** The active-turn chip is not drawn inside the private sheet, but an amber control in an open sheet and an amber “Active turn” chip in the list behind it can be on one screen. Does that confuse anyone who plays it?
8. **`:has()` quantity queries** size the pieces of a room by how many stand in it. They are convenient and unusual. If you would rather compute the size in the view model, the rule is in the manifest (`pieceRow`) and in the comment above the rule.
9. **Target rows** draw the seat's character, or the idle badge, whatever the seat's health; the status is in the row's words. A `data-target-health` on the control would let the piece match the roster.
10. **The role-card copy.** You wrote on PR #57 that you will draft the eight cards that had none, from the approved rule sources and from what the connected client already says of each action. I had drafted all nine before I read that, so take mine as input to yours and not as a competing version: two or three lines each, at `states.html?sheet=roles`, each rule statement with the rule source it paraphrases. The wording is yours and the rule statements are the owner's; where yours differs, yours stands, and I will change the file to match. I used your client's names for things, as read on `agent/frontend-hosted-feedback` at `b31e957` (Rescue, Disable, Supply, Protection, Scan, Code attempt). Where an approved V1 decision on the landing candidate bears on a line, the line's `note` says which: that overlay is not in my base, so I could not cite it.
11. **The compact role card.** Does a 5.5 rem thumbnail of a character holding a device read on a phone, or is it too small to be worth drawing? The large picture is one tap away either way.

Your answers belong on the PR. I will change the design, not argue with the device.
