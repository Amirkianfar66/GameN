# Frontend handoff: the phone-first V1 journey

Issue [#76](https://github.com/Amirkianfar66/GameN/issues/76) · for Frontend, with Integration for the items marked so · **a proposal, not owner-approved, not integrated**

Historical design base `87715a46dbd6a107e417bb6024d81c3fcb679049` (`codex/v1-start-sequence`, [PR #75](https://github.com/Amirkianfar66/GameN/pull/75), unmerged). Protocol 2, `staged-start-1`, ruleset `in-person-v1-2026-10-06` and engine `full-game-1.0.1` unchanged. Tokens 0.4.0, assets `design-0.2.0`, crew `crew-0.1.0`.

**What this hands over:** a reviewed-ready design for every screen and state of the V1 phone journey, as a working prototype (`design/v1-phone/`), its machine-readable inventory (`design/v1-phone/contract/journey.json`), screenshots, storyboards made from the prototype's own CSS, and this page. **What it is not:** runtime code. Nothing under `apps/game/` or `packages/presentation/` was changed. The prototype is plain script written to be looked at; take its rules, not its code.

Setup/join examples were refreshed on 9 October from source `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02`, based on the [compact-phone decision](../decisions/2026-10-08-compact-phone-ui.md) and [random-starting-rooms decision](../decisions/2026-10-08-random-starting-rooms.md). Character tiles confirm on tap, joining asks for the code only, and setup uses the role-card surface plus Ready. Original verification remains historical; current evidence is in [v1-phone-copy-refresh.md](v1-phone-copy-refresh.md). The original main-game study remains here for history; current board direction and gates are in [board-motion-handoff.md](board-motion-handoff.md).

## 1. Build order

The journey's runtime levels ([inventory](v1-phone-inventory.md)): of 109 states, 102 have corresponding source states (the design changes presentation and, where marked, wording), 6 need Frontend work only (`host.running`, `host.ended`, `reveal.reconnecting`, `game.choose-room`, `phase.resolution`, `end.next`), and 1 needs an Integration decision (`host.share`). A sensible order, each slice reviewable on its own:

1. **Shell and shared parts**: `masthead`, `screen-caption`, `action-dock`, `notice`, `status-chip`, `window-timer`, `sheet`, `disclosure-row`, the button variants. Everything else is built from these.
2. **Setup on a phone** (the owner's priorities 3 and 4 first, since they are the newest flow): `character-choice` (tap confirms), `role-card-back` (tap reveals), `role-card`, `ready-control`. Public `setup-progress` with `seat-slots` belongs on Host and Display. The `role-guide` remains on the manual reference sheet.
3. **Joining**: `code-field`, `waiting-card`, `recover-form`; starting-room assignment is a persisted server fact.
4. **Host**: `seat-count-picker`, `room-code`, `admission-request`, `bot-stepper`, `confirm-sheet`, `recovery-code`, `display-admit`, `host-status` (subscribes to the public view: see §9).
5. **Game**: `phase-strip`, `phone-board`, `room-panel`, `piece`, `self-status`, `turn-banner`, `private-dock` and `private-sheet` (bottom sheet; peek while picking a room; drawer on desktop), then the votes (`vote-panel`, `tally`), `round-summary`, `result-panel`, `reveal-table`.
6. **Motion** last, behind the director, with reduced motion from the first cue.

## 2. Components: reused and new

`reuse` names the component of `design/contract/component-states.json` (contract 0.2.0) or the runtime hook the state is drawn on today. A hook marked PROPOSED is new; Frontend owns the final class names. Every state that uses each component is in the [inventory](v1-phone-inventory.md#components).

### Shell and shared

| ID | Reuse / new | Hook (proposed where new) | Specification |
| --- | --- | --- | --- |
| `masthead` | reuse `shell-header` | `header.j-mast` | ≤ 44 CSS px. Wordmark, surface word in an ink tag (HOST, PLAYER, SHARED DISPLAY), a connection chip only when not live. Omitted on the game screen and the two timed setup screens, where the strip or the caption row is the top |
| `screen-caption` | new | `h1.j-cap` | Caption yellow (`color.caption`), ink 3 px, 3 px offset shadow, `skewX(--ms-caption-skew) rotate(--ms-caption-tilt)`, lettering 800 uppercase, 1.375rem (1.1875rem under 22.5em). Wraps; never truncated |
| `banner-data-source` | reuse | `.ms-banner--data-source` | Fixture or emulator only. The prototype's own “Synthetic fixture” strip stands in for it |
| `banner-connection` | reuse | `.ms-banner--connection` | Problem notice style (thick border, “!” glyph), above the content; the board gets a dashed inner frame; the strip's box a dashed border |
| `action-dock` | new | `.j-dock > .j-dock__in` | Sticky bottom; `min-block-size: --ms-dock-min` (4rem); padding `--ms-space-3` plus `env(safe-area-inset-bottom)`; panel color with a 4 px steel top rule. One primary control (≥ 3rem tall). A note under it at label size. **Static** (in the flow) while a text field has focus, and at large text |
| `button` | reuse `button` | `.ms-button`, `--primary`; PROPOSED `--danger`, `--quiet` | Primary: accent amber, ink 4 px. Danger: paper with an ink hatch, never red. Quiet: dashed outline. Disabled: paper-deep, dashed, no shadow, `aria-disabled` and still focusable. All ≥ 44 × 44 |
| `status-chip` | reuse marker shapes | `.j-chip[data-kind]` | done = solid ink + ✓; wait = dashed; out = double border; square = Jailed, Captain, Revealed; you = caption yellow square. Words always present |
| `window-timer` | reuse `phase-timer` | `.j-timer[data-state]` + `.j-bar` | Seconds in an ink box (tabular numerals) and a label; a bar that empties (paper fill over a steel hatch). States: running, final (≤ 10 s: inverted box), expired (dashed, “waiting for the server”), syncing (`–:––`). `role="timer"`, `aria-live="off"` |
| `notice` | new | `p.j-notice[data-kind]` | info (i), ok (✓), problem (!, 4 px solid), uncertain (?, 4 px dashed). One line about this device's own request |
| `sheet` | new | `dialog.j-sheet` | Bottom sheet, modal, focus inside, grip, title, Close. Rises in 220 ms. Never holds anything private |
| `disclosure-row` | new | `details.j-more` | 3rem summary row with its current state at the end (“Practice bots · 3 bots”) |

### Entry and host

| ID | Reuse / new | Hook | Specification |
| --- | --- | --- | --- |
| `route-door` | new | `a.j-door[href="?as=…"]` | Three ≥ 5.5rem tiles: Join a game (caption yellow, first), Host a game, Shared display. Room art thumbnails from the public bundle. Maps to the existing routes; no new route |
| `seat-count-picker` | new | `fieldset.j-count` | Three radio tiles 7, 8, 9; selected = caption yellow, lifted, “✓ seats” |
| `room-code` | new | `.j-code` | 1.875rem monospace, three groups of four, `aria-label` spelling the 12 characters. Copy (clipboard) and Share (PROPOSAL) |
| `seat-slots` | new | `ol.j-slots > li.j-slot` | Auto-fill grid, min 6.75rem (two columns when a state chip is shown, one at large text). Face = character card once it is a fact, else the numbered token. Name, device tag before setup, starting room, Bot, state chip, You |
| `admission-request` | new | `li.j-request` | Paper panel: “Device H8dNs2 · starts in Room B”, seat select with the next free seat, Seat (primary). Kept request: “Send the same request again” + Give this request up. No free seat: a notice instead of the select |
| `bot-stepper` | new | `.j-stepper` | − count + with 3rem buttons; Add / Update / Remove bots; the release's solo-test sentence |
| `setup-progress` | reuse runtime `section.connected-setup-progress` | `#setup-progress-*` | “5 of 9 confirmed” in lettering, pips (filled square = done, ring = waiting), seat slots with chips. Names and characters from the public identity document only |
| `host-status` | new | `section.j-hoststatus` | The strip box inside a dark panel: round, phase, turn, timer from the public view |
| `recovery-code` | reuse runtime `#connected-recovery-codes` | `.j-recovery` | Code in groups of four (monospace, wraps), expiry time, match identifier as a tag, Copy, Take it off this page |
| `display-admit` | reuse runtime `#connected-display-uid` | `.j-admit` | Inside the Shared display fold: field + Admit the display |
| `confirm-sheet` | reuse runtime end controls | `dialog.j-sheet[data-kind=confirm]` | `role=alertdialog`; title, the release's sentence; “No, keep the match” primary and focused; a 1.5rem gap; “Yes, end the match now” danger, apart |

### Joining

| ID | Reuse / new | Hook | Specification |
| --- | --- | --- | --- |
| `code-field` | reuse `#connected-room-code-input` | `.j-input--code` | 3rem, monospace 1.375rem, uppercase as typed, groups of four shown, `enterkeyhint="go"` inside a form so Go submits, counter n/12, format help below, `aria-invalid` with a dashed 4 px border |
| `waiting-card` | reuse `#connected-waiting` | `section.j-wait[data-state]` | Large token (dashed ? while waiting, solid number when seated), the state in lettering, the release's sentence, device tag and starting room as facts |
| `recover-form` | reuse runtime recovery fields | `.j-recover` | Two fields, the 43-character caveat, “Take over the seat” in the dock |

### Setup

| ID | Reuse / new | Hook | Specification |
| --- | --- | --- | --- |
| `character-choice` | reuse `character-choice` + runtime `button.crew-option` | `[data-character][aria-pressed][aria-disabled]` | 3 × 3 (2 × at large text); art 4.25rem max; selected = caption yellow, 4 px ink, lifted 5 px, “✓”; taken = paper-deep, dashed, greyed art, holder's seat-number tag, `aria-disabled`, still focusable and named (“Vega, taken by Player 1”); tap confirms the existing name or call sign; frozen while submitting/retrying and after confirmation; the selected tile keeps its look |
| `role-card-back` | new | `.j-rolecard[data-face=back]` | Ink with a steel hatch, inner paper rule, closed-eye icon (player-ui bundle), “Tap to reveal”. Identical for every role and seat; Ready acceptance replaces it with a public ✓ and an accessible waiting status. Nothing role-specific in its markup or classes |
| `role-card` | reuse `role-card` + runtime `.ms-role-card--full` | inside `.j-private` / the open panel only | Setup: large (17.5rem). Art 5:4.6: the player's own character card (`--ms-asset-piece-crew-card-cN`) at 62% width, 9% / 7% inset, −2.5°; the device (`--ms-asset-device-*-held`) 66% width, bottom-right −10% / −6%. Plate: role name ≤ `--ms-text-role-name`, team word beside a 0.9em swatch of `--ms-color-faction-*`. In-game: compact 5rem thumbnail row |
| `role-guide` | reuse `p.setup-role-guide` | — | The release's `ROLE_GUIDE` text unchanged on the manual card reference sheet; the current setup card has no separate guide paragraph |
| `ready-control` | reuse `#setup-role-ready`, `#setup-ready-waiting` | — | Visible after revealing the current deal; busy “Confirming…”; uncertain “Retry Ready”. Acceptance shows ✓ with aria-label “Ready. Waiting for the timer and other players.”; the card surface has accessible Reveal/Hide names |

### Game

| ID | Reuse / new | Hook | Specification |
| --- | --- | --- | --- |
| `phase-strip` | reuse `phase-strip` | `.ms-phase` | Sticky top, z above the private sheet. Paper box, ink 3 px, offset shadow; “ROUND 2” small, then the phase or “2 BEN’S TURN” (ink number tag + name). Flex-wraps: at large text the timer drops below; words never break mid-word |
| `phase-timer` | reuse `phase-timer` | `.ms-timer` | Inside the strip; final seconds in accent amber; a 4 px progress bar under the box |
| `phone-board` | reuse `board-page` concept; runtime `section.ms-board` | `.ms-zones` | Grid areas `command command / room-a room-a / room-b room-b / hospital jail`, 8 px gaps, paper page with 4 px ink border and inner shade. From 60em the approved two-row page (`room-a×3 room-b×3 / command×2 hospital×2 jail×2`). Fits the width; never pans |
| `room-panel` | reuse `board-panel` | `li.ms-zone[data-zone]` | Room art as `cover` at 72% vertical, room shadow color behind; caption top-left over the edge; “You are here” top-right on the viewer's room; pieces at the bottom. `container-type: inline-size`. While choosing a move: offered rooms lifted with a paper ring and a 44 px **Move here** button; others grayscale(0.85) brightness(0.62) |
| `piece` | reuse `seat-token` + `seat-tag` + markers | `li.ms-seat[data-character]` | Standee (96:120), width `clamp(1.75rem, (100cqi − gaps) / min(n, 5), 3.6rem)` (3rem in the Hospital and Jail); rows of ≤ 5; markers top-right (two at most); turn float top-left; tag under it: ink number + name, ellipsis, max piece + 1.4rem; every second tag a line lower when crowded; own piece flagged YOU, tag in caption yellow |
| `self-status` | reuse location status | `.ms-location` | Own character face 2rem, number tag, name, location chip, health and status chips |
| `turn-banner` | new | `.j-turn[data-mine]` | Dock left: “BEN’S TURN” / “YOUR TURN” (caption yellow slab when it is the player's) / phase name; one supporting line. Says nothing about what the seat can do |
| `private-dock` | reuse `private-dock` | `#ms-private-toggle` | “Private card” with the closed-eye glyph; identical on every phone: no badge, count or highlight |
| `private-sheet` | reuse `.ms-private__panel` | PROPOSED `.ms-private--docked` | Phone: bottom sheet below the sticky strip, scrim 78%, Hide at the top, the release's hint. Peek variant (≤ 48dvh, no scrim) while a room is picked on the board. From 60em: a 26rem drawer on the right; the board stays in view |
| `knowledge-list` | reuse “What you know” | — | One sentence per fact, 4 px paper rule; nothing for what a role lacks |
| `acknowledgments` | reuse `[data-region=own-acknowledgments]` | — | “Supply results” heading; each line an ok notice |
| `action-card` | reuse `action-card` | the connected card | Paper card; title + status tag (plain, dashed, stamped); selected (amber ring) from choosing until settled; one primary control |
| `offer-row` | reuse idle offers | — | Name in lettering, Available (solid) / Not available (dashed) chip, the open control full width under it |
| `choice-list` | reuse `target-row` | `button.ms-target` | 3rem rows: face, number + name (“(you)” where the server lists the player), public status; plain rows for rooms and answers (Abstain, No release request, Yes/No) |
| `vote-panel` | reuse `VotePanelModel` | `.ms-vote` | Paper panel: phase kicker, candidates as number tags with names, how many may vote, ballots private |
| `tally` | reuse lastTally | `.ms-vote__tally` | “Last vote counted · Jail vote”, the result line in bold, a row per seat with an ink bar (share of voters) and the number, “Abstained or did not vote” only where the numbers add up |
| `round-summary` | new (runtime sentences exist) | `section.j-summary` | “What changed since the last phase”: one line per public change with the marker glyph. Frontend proposal; see §9 |
| `readable-board` | reuse `details.ms-readable-board` | — | Collapsed by default; table of seat, where, status; one block per seat at large text with “Where:” / “Status:” labels |

### System, end, display

| ID | Reuse / new | Hook | Specification |
| --- | --- | --- | --- |
| `system-panel` | reuse shell connecting/blocked | `.ms-blocked` | Paper panel with an ink glyph disc (…, ?, !, ↻, ✓), heading in lettering, the release's paragraphs, one action in the dock |
| `result-panel` | reuse `ResultModel` | `.ms-result` | A comic cover: halftone paper, 4 px ink, the winner line at `--ms-text-display` with the team swatch, “The Alien wins with Blue.” with the Alien swatch; host-ended: “No winner” |
| `reveal-table` | reuse `ResultModel.reveal` | `.ms-result__reveal` | Character face, “3 · Cleo (you)” (own row caption yellow), role with team swatch; the Code as “Player 1, Player 5, Player 7, Player 9”. Only when the finished view carries it |
| `display-id` | reuse the display's identifier | `.j-displayid` | Monospace, `clamp(1.25rem, 4.5vw, 2.5rem)` |
| `table-board` | reuse `board-page` + `board-panel` | `.ms-shell--table .ms-board` | The approved two-row page from 48em, the phone page below it; tally and readable list beside it |

## 3. Assets

**No new asset.** Everything drawn comes from `design/exports/` (`design-0.2.0`) through the bundle custom properties, loaded exactly as the release does it (`apps/game/hosted/art.mjs`): every phone loads `public-board`, `player-ui` and `roles` before any view; host, display and entry load `public-board` only. A picture is drawn only behind `[data-art~="<bundle>"]`, so every screen is complete in words before the art arrives. Measured on every capture: no single picture requested; host and display never request a phone-only bundle.

| Used for | Custom property |
| --- | --- |
| Rooms on the board, the room tiles, the entry doors | `--ms-asset-board-{room-a,room-b,command-room,hospital,jail}-full` |
| Pieces; character tiles, slots, rows, the role card's person | `--ms-asset-piece-crew-standee-cN`, `--ms-asset-piece-crew-card-cN` |
| A seat with no character yet | `--ms-asset-token-neutral-badge-nN`, `--ms-asset-token-neutral-standee-blank` |
| Markers | `--ms-asset-marker-{captain,jail}-badge`, `--ms-asset-marker-health-{injured,eliminated}-badge`, `--ms-asset-marker-turn-float`, and the `-glyph` variants in the round summary |
| Private card, card back | `--ms-asset-icon-private-{closed,open}-{ink,paper}` |
| Devices (inside `.j-private` only) | `--ms-asset-device-{officer,insider,cracker,blue-disabler,supplier,undercover,hacker,red-disabler,alien}-held` |
| Stale connection | `--ms-asset-icon-connection-stale-paper` |

Not produced, and not needed by this design: a QR code (a proposal; the prototype draws a labeled stand-in, not a code), any sound.

## 4. Tokens

All color, type, spacing, radius, stroke, motion and layer values are 0.4.0 tokens (`design/prototypes/css/tokens.css` names). Values the journey needed that are not tokens are local properties, candidates for a later revision:

| Local property | Value | Proposed token |
| --- | --- | --- |
| `--j-col` | 30rem | `layout.formColumn`: the column of a form or setup screen on a wide screen |
| `--j-game` | 64rem | `layout.gamePage`: the game page on a wide screen |
| `--j-control` | 3rem | `interaction.primaryControl`: primary control height, above the 44 px minimum |
| `--j-motion-deal` | 420ms | exists as `motionMs.roleDeal`; needs a CSS name |
| `--j-motion-room-pick` | 200ms | exists as `motionMs.roomPick`; needs a CSS name |

Color use: caption yellow for captions, the viewer's own tag and a selected tile; accent amber for primary controls and the final seconds; team colors only inside `.j-private` and in the end reveal. DSN-D08 and DSN-D13 stand as recorded.

## 5. Layout rules

- **Phone base, 320–430 CSS px.** Single column, 16 px side padding (12 px under 22.5em), `viewport-fit=cover` and safe-area insets on the screen and the dock. Measured: no horizontal overflow at 320, 360, 390 and 430.
- **The screen root clips horizontal overflow** (`overflow-x: clip`). Chromium keeps a finished transform animation's largest bounds in the scrollable width until the next layout; without the clip the caption's entrance made the page scroll sideways (found by the capture probe, then fixed in both the keyframes and the root).
- **Large text and zoom**: `@media (max-width: 19.5em)` (312 CSS px at the default size; any phone at 200% text) makes everything static but the phase strip, stacks paired controls, turns the readable table into one block per seat, makes slots one column and the character grid two, and lets room captions wrap.
- **Desktop**, the same hierarchy: forms and setup at `--j-col` centered; the game at `--j-game`; from 60em the board takes the approved two-row page and the private card becomes a right drawer; the shared display uses the two-row page from 48em with the tally and the readable list beside it.
- **The dock** is sticky and in the thumb zone; while a text field has focus it joins the flow under the form, and Go on the keyboard submits (`enterkeyhint="go"` in a `<form>`). On Android, `interactive-widget=resizes-content` in the viewport meta keeps a sticky dock above the keyboard; on iOS Safari the in-flow dock is the robust choice.
- **Sticky elements**: the phase strip (game), the caption row with the timer (setup, not at large text), the dock. Nothing else.
- **Targets**: every control ≥ 44 × 44 CSS px (measured on every capture), primary controls 48. Board rooms are never the only way to act: the list in the card is complete.
- **Focus**: 3 px `--ms-color-focus` outline, 3 px offset, on every control; the end confirmation focuses the way back; after a step change focus goes to the card title.
- **Forced colors**: borders become CanvasText; meaning is in words and shapes already.

## 6. State mappings

How each authorized fact becomes what is drawn. The per-state list, with gaps, is the [inventory](v1-phone-inventory.md).

| Fact | Drawn as |
| --- | --- |
| `session.roomCode`, `playerCount`, `status` | `room-code`; `seat-slots` count; host screen by status (lobby → `host.lobby-*`, running → `host.running`, aborted → `host.ended`) |
| `admissions[]` pending / approved | `admission-request` rows, oldest first; an approved one becomes a filled slot with its device tag |
| `lobby.seats[].initialRoom`, `practice.botSeatIds` | slot room word; Bot chip |
| `setup.stage` | lobby → waiting/seated; choosing → `select.*` (player) / `host.choosing`; awaiting-ready → `reveal.*` / `host.reading`; running → the game; aborted → ended |
| `setup.choosingEndsAt` / `readingEndsAt` + server time | `window-timer` and bar; zero changes words only |
| `setup.seats[].confirmed` / `.ready` | host/display chips and pips; the compact player view uses a public Ready checkmark and accessible waiting status |
| `identities.seats[].displayName`, `characterId` | every tag, face and piece; holder of a taken tile |
| `setupPreview.self.role` (own, current deal and binding) | `role-card` inside the private container after explicit Reveal |
| Receipts of the setup operations | `select.submitting` / `retry` / `conflict` / `unavailable`, `reveal.ready-*` |
| `publicView.round`, `phase.kind`, `activeSeatId`, `phase.endsAt` | `phase-strip`; `turn-banner`; turn float on the piece |
| `seats[].location`, `health`, `jailed`, `captain`, `revealedFaction` | room of the piece; markers; status chips; readable list |
| `ballot`, `lastTally` | `vote-panel`; `tally` |
| `self.movementDestinations`, `legalTargets[...]`, the flags | offers, choices and offered rooms, exactly as listed |
| `knowledge.*`, `self.ordinaryWeapons`, `rescuesRemaining`, acknowledgments | `knowledge-list`, `acknowledgments` (private) |
| `ownBallot`, `hasVoted`, `hackPartnerSeatId` | private lines in the sheet |
| `result`, `endReveal`, phase `ABORTED` | `result-panel`, `reveal-table` (only with `endReveal`) |
| Connection, clock, problem | `banner-connection`, `window-timer` syncing, `system-panel` |

## 7. Motion

Storyboards are frames of the prototype's own CSS, held at moments of each cue and clipped to what moves ([contact sheet](../../design/v1-phone/review/contact-motion.png), frames in `design/v1-phone/review/motion/`). The seven existing cues keep their contract; seven new cues are proposals.

| Cue | Status | Trigger (an authorized fact or the player's own press) | Duration | Treatment | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| `cue-stage-change` | new | Setup stage changes | 220 ms, snap | Caption drops in from −5° and 0.92 | Direct |
| `cue-role-deal` | new | Own preview first arrives for this deal (not after a reload) | 420 ms (`roleDeal`), settle | Card arrives face down from above, settles | Direct |
| `cue-role-card-turn` | existing | Reveal pressed (local, private) | 900 ms | Turn on Y, device slides into the hand from 45% | 80 ms fade |
| `cue-registration` | existing | The seat's own accepted command/ballot receipt | 120 ms, impact | Stamp from 1.7× and −9° to −4° | 80 ms fade |
| Ready accepted | current compact source | The seat's own accepted Ready receipt | Direct | Public ✓ and accessible waiting status; retired Ready stamp has no active storyboard | Direct |
| `cue-sheet-open` | new | Private card / a host sheet opened | 220 ms, settle | Rises 24 px | 80 ms fade |
| `cue-public-move` | existing | Public location change | 900 ms | Lifted, carried in an arc over the panels (its room raised), set down | Direct |
| `cue-phase-change` | existing | New phase | 220 ms | Phase words slide in 12 px | Direct |
| `cue-round-transition` | existing | New round | 700 ms, sweep | A 5 px ink hatch band sweeps under the strip, then fades; words and timer stay readable | Direct |
| `cue-request-arrives` | new | New pending admission (host) | 220 ms | Request drops in 10 px | Direct |
| `cue-choice-taken` | new | `CHARACTER_TAKEN` and the identity shows the holder | 220 ms, impact | One short nudge of the tile, which is already drawn taken | Direct |
| `cue-result-cover` | new | View first carries a finished or aborted match | ≤ 900 ms | Cover scales from 0.94 and −1.2° | 80 ms fade |
| room pick | existing token | Pressing an offered room | 200 ms (`roomPick`) | Offered rooms lift; others step back | Direct |
| status change | existing | Public health / Jail / Captain change | 220 ms | As contracted | Direct |

Rules: entrances use `animation-fill-mode: backwards` (never `both`), so nothing stays in effect; nothing repeats (`motionPolicy.loops` is false; DSN-D16 stays open); no cue gates a control, a timer or a step; a cue for a private fact plays only inside the open private container; a newer authoritative state cancels an unfinished cue (cue freshness as agreed in DSN-D12).

## 8. Copy

**Words reused from the release, verbatim**, are listed with their files in `design/v1-phone/js/fixtures.js` (`RELEASE_COPY`, `ROLE_GUIDE`), and the check finds each one in its file. **New words**, all proposals for Frontend and the owner:

| Where | Proposed words |
| --- | --- |
| Entry | “Welcome aboard”, “A table game for 7 to 9 players. Everyone plays on their own phone.”, the door titles and lines |
| Host | “Your lobby”, “Players open Join a game and type this code.”, “No free seat. Lower the bot count to make room, or leave the request waiting.”, “Locks the seats. Everyone gets 30 seconds to choose a character.”, “Fill all N seats to start: K open.”, “Match running”, the share sheet's caution |
| Join | “Type the room code from the host.”, “12 characters: 0–9 and A–F.”, the refused sentence (one for the server's one answer), “The server is busy. Wait N s, then press again.”, “Moving to a new phone? Take over your seat” |
| Setup | Reconnect banner; recovered/backgrounded explanation is screen-reader status. Separate selection-success, name-entry, steps and waiting paragraphs are retired from the visible compact setup |
| Game | “Your card stays closed until you open it.”, “Open your private card to act.”, “You may vote. Your ballot is private.”, “A Hack conversation is in progress.”, “Every player still in has one showdown shot.”, “You are out · You can keep watching the match.”, the vote panel's privacy line, “What changed since the last phase” |
| End | “No winner”, “Nothing was revealed: a match the host ends shows no roles and no Code.”, “A new game is a new match …”, “Join a new game”, “Start a new game” |

The inventory records retired `name-field`, `room-choice`, `crew-preview` and `select.name-taken` explicitly. Six changed quotes were refreshed and seven obsolete quote keys retired; required current copy and exact source matching remain checked. Historical screenshots are recoverable in the original Git commit, rather than kept as active examples.

## 9. Dependencies

**Frontend only, no contract change:**

- `host.running`: subscribe the host page to `views/public`. The host identity is created as a `display` member (`createMatch`), and the Rules let a display read the public view once gameplay is available. Integration should confirm this is intended before it is relied on.
- `phase.resolution`: show the public-change sentences the shell already announces (`announce.health`, `jailed`, `released`, `location`, `captain`, and `Revealed: <faction>`) as a visible panel at the start of the next phase. Derived from two public views only; never from a registration, a pending command or a private result.
- `host.ended`, `end.next`: one control that forgets the tab's match and opens Create or Join. A new game is always a fresh match.
- `reveal.reconnecting`: the connection banner in setup, the card forced face down.
- The room pick on the board (DSN-D18), the bottom sheet / peek / drawer (DSN-D04), the large text rules, the dock with a focused field, `interactive-widget=resizes-content`.

**For Integration** ([integration-requests.md](integration-requests.md)), none implemented here:

- [DSN-REQ-8](integration-requests.md#dsn-req-8): close a pending admission when setup starts, so a waiting phone learns it was not seated.
- [DSN-REQ-9](integration-requests.md#dsn-req-9): decide whether a join link or QR may carry the room code.
- [DSN-REQ-10](integration-requests.md#dsn-req-10): a shorter, supervised seat hand-over than 43 characters plus a match identifier (finding G20).
- [DSN-REQ-11](integration-requests.md#dsn-req-11): say in the view that an election is a second one among tied candidates (G13), and which vote a tally belongs to (G15).

**Considered and not requested:** distinct refusal reasons for a join request. One `FORBIDDEN` for an unknown room, a started room and a device already in it means a stranger guessing codes learns nothing; the design words that single answer honestly.

## 10. Privacy checklist for the implementation

- [ ] The closed private card and the card back are byte-identical across roles, seats and states; no role-derived class, attribute, id or variable outside the open private container.
- [ ] Host, display and entry load the public bundle only; phones load all three before any view; nothing is fetched because of a role.
- [ ] The private sheet closes on `visibilitychange` and `blur`; the setup card turns face down; Ready hides it.
- [ ] No role, Code, target, ballot or knowledge in URLs, storage, titles, notifications or announcements outside the open panel.
- [ ] The private dock has no badge or highlight that depends on offers or knowledge.
- [ ] Vote panels and tallies never say who voted for whom; a ballot is shown to its voter only, in the private card.
- [ ] The round summary is computed from public views only.
- [ ] Screenshots for evidence are of synthetic fixtures or the emulator; never of a real player's private card.

## 11. Questions for review

1. Board targeting is approved under the later compact-phone decision. Readability on physical phones and at enlarged text still requires device review; the current implementation handoff is `board-motion-handoff.md`.
2. The large role card in setup and the compact one in the game (DSN-D21): right split?
3. Ready conceals the role in the current release. Preserve that behavior; private content requires a deliberate authorized reopen.
4. Is the round summary helpful, or does it change the table's social game (DSN-D24, with Game Balance)?
5. The seven new cues (DSN-D26): too much, too little?
