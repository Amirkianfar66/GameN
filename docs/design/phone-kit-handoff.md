# Phone kit handoff: shell, vote result, room clothes, private Hack (issue #121)

**A proposal, not owner-approved, not a game rule, and not in the reviewed manifest `design-0.2.0`.** Issue
[#121](https://github.com/Amirkianfar66/GameN/issues/121) (Designer), with [#119](https://github.com/Amirkianfar66/GameN/issues/119)
(vote result), [#120](https://github.com/Amirkianfar66/GameN/issues/120) (Hack) and the Frontend consumer
[#122](https://github.com/Amirkianfar66/GameN/issues/122). Designed by the Visual and Motion Designer (Claude Code) on the
integration baseline `abb6839524b6dc3e5225e600f2f067c3fa3f9501` (`codex/v1-ability-art-release`): protocol 2, engine
`full-game-1.3.0`, ruleset `in-person-v1-capacity-resolution-2026-10-12` (hash `aef28826…bdf2b1e`). Branch
`claude/designer-phone-polish`; the pull request records the commit to pin. **Review correction** (after the reviewed
`ca78625`): the Hack is concealed on a window blur and draws only feedback bound to the current phase; source commit
`3784057ceb52c00ddc27e201b631f2769796525a`, section 11. It is a corrected design prototype and specification, not a verified production integration.

The prototype is the board-motion page with the kit loaded (`design/board-motion/index.html` + `design/phone-kit/`); how to
open, run, check and capture it is in [design/phone-kit/README.md](../../design/phone-kit/README.md). The specification
Frontend implements from is [design/phone-kit/contract/phone-kit.json](../../design/phone-kit/contract/phone-kit.json); the
exports and their hashes are [design/phone-kit/assets/manifest.json](../../design/phone-kit/assets/manifest.json); the measured
captures are under `design/phone-kit/review/` (`report.json`, `contact-*.png`).

## 1. What changes for a player

- **A · the shell.** The board sits in navy framing with a gold keyline round every room; room names are struck gold plates
  drawn above the figures; the top bar shows the round, the face of whoever plays, the phase and the timer; the bottom bar is
  Board / Actions / a raised gold **Pass** / Card / Menu. A move is still a tap on a room's tag, a target a tap on a character,
  and every confirmation stays in the strip on the board. The kit draws no phone OS indicators.
- **B · the vote result.** When a vote closes, every screen shows its result for exactly the five seconds of `VOTE_RESULT`:
  the vote and its own round, the outcome on a ribbon (Captain!, Tie!, No Captain, Jailed!, No one jailed, Released!, Denied),
  the subject drawn in the clothes of the room it is now in with the outcome's piece (the Captain's star, bars dropping or bent
  open, a tie's burst, an empty chair or cell), and the count as one cell per player who could vote. A release shows only
  "Yes: Y of V". A screen that joins late draws it settled; reduced motion fades it.
- **C · the room clothes.** Everyone in the Hospital wears a patient's gown, everyone in the Jail a prisoner's striped suit,
  everyone elsewhere the crew suit. Only the public location decides. A released, Injured player still waiting in the Jail
  (the Hospital full) wears the striped suit and has no Jailed badge.
- **D · the private Hack.** After the turn with a pending Hack, the target has up to 15 s to declare Blue, Red or Alien (three
  equal buttons, then confirm); both participants see the claim for five seconds ("Player 5 claims RED · A claim, not a verified
  side."; "No side declared" if none came); then the full 60-second talk with the claim beside it. Only the two participants'
  own phones show any of it, never the other phones, the host or the display.

## 2. Who changes what

| Owner | What |
| --- | --- |
| Frontend (Codex "Continue GameN frontend") | `apps/game/`, `packages/presentation/`: the production markup, styles, wiring and motion of sections 3 to 6, from the contract |
| Backend | The exact `voteResult` contract ([playtest-feedback-contract.md](https://github.com/Amirkianfar66/GameN/blob/codex/backend-vote-results/docs/backend/playtest-feedback-contract.md) at `bd4d77c`), the `hackFeedback` and `DECLARE_HACK_SIDE` contract as Frontend reviewed it at `ba1842f` (not on the remote: section 11.5), deadlines and continuation; nothing here invents a field |
| Integration (main Codex reviewer) | Reviewed drawing-port pins for `wardrobe.mjs` and `art.mjs` (section 7), a new art version for Ready (`acceptedVersions` names `design-0.2.0` today), the token revision, and adoption/deployment |
| Visual and Motion Designer (this work) | `design/`, `packages/design-tokens/` (scripts and tests only here), `docs/design/` |

Nothing outside the Designer's paths was edited. The frozen drawing-port sources, the frozen ability stylesheet and the hashed
build inputs are byte for byte as reviewed (`npm run check:phone-kit` proves it); `design/tools/lib/reviewed-drawing-ports.json`
is unchanged.

## 3. Components (ids, inputs, anchors, layers)

Full detail, with every state, is in the contract. Layers inside the phone, bottom to top: the board (its own stacking context:
scenes, figures by depth, targets 2200, room tags 2300, move flyers 2500) · strip 70 · **Hack panel 71** · **vote result 74**
(the end's sheet uses 74 too and never coexists) · tray 75 · sheets 76 · notice 78 · banner 79 · bottom bar 80.

| Component | Prototype element | Inputs | Anchor and size | Interaction |
| --- | --- | --- | --- | --- |
| `shell.status` | `header.bm-status` with `.pk-who` | phase kind and deadline, round, active seat's public character; for `VOTE_RESULT` `voteResult.kind` and `voteResult.round` | top, 52 px (44 px on a short phone ≤ 640 px) | none |
| `shell.roomTag` | `.bm-tag` | room, `movementDestinations`, public occupancy | top-left of its room, z 2300; press area ≥ 44 × 44 (unchanged) | tap = the release's move confirmation; allowed in `HACK_DECLARE`/`HACK_RESULT` where offered |
| `shell.nav` | `nav.bm-nav`, `#bm-pass` | view, Pass offered, match ended | bottom, 64 px (56 px); Pass a 64 px disc (58 px) raised 20 px (16 px) | unchanged from the release |
| `board.frame` | `.bm-board`, `.bm-room`, `.bm-spine` | none | 5 px gutter, 2 px ink border, radius 8, 1.5 px gold keyline | none |
| `figure.wardrobe` | every figure, both boards | `seat.location` only | the figure frame (`-90 -40 300 300`, floor y 233) | none |
| `voteResult.panel` | `#pk-vote-result` | `voteResult` (all eleven fields) + public seats | absolute over the lower board: 8 px sides, bottom = nav + 8 px; stage 150 px (112 px) | none: pointer-events none, nothing offered in `VOTE_RESULT` |
| `hack.panel` | `#pk-hack` | phase (`kind`, `id`, `startedAt`/`endsAt`), `activeSeatId` (initiator), own seat, `hackFeedback` (`hackId`, `phaseId`, `status`, `declaredSide`; drawn only when bound, section 11.2), `hackPartnerSeatId`, `legalTargets.DECLARE_HACK_SIDE`, public seats | its own grid row between the board and the strip, 6 px sides | `declare:Blue|Red|Alien` (≥ 52 px, 46 px short), `declare-confirm`, `declare-back` (≥ 44 px) |
| tray chip | `#bm-open-declare` | the self-only declare offer | in the Actions tray | closes the tray, focuses `#pk-hack-heading` |

## 4. Motion

| What | Timing (ms from the phase's `startedAt`) | Easing | Reduced motion | Settled / interrupted |
| --- | --- | --- | --- | --- |
| Vote result | enter 0–320, ribbon 80–440, subject 200–760 (+60 per extra subject), piece 360–620, count 760–1260, exit 4720–5000 | enter `cubic-bezier(0.16,0.84,0.3,1)`; pops `cubic-bezier(0.2,0.9,0.3,1.2)`; drop/exit `cubic-bezier(0.55,0,1,0.45)` | 80 ms fade in (live only) and out | joined after 1260 ms: at rest, exit only; same id again: nothing replays; another phase: removed at once; reduced switched on: at rest |
| Hack claim | enter 0–300, balloon 160–520, card flip 380–800, exit 4720–5000 | as above | 80 ms fade in/out | joined after 800 ms: at rest, exit only; said once per `hackId`; concealed (blur, background, stale): removed with its animations and timers; reopened by the player's tap: at rest, not said again |
| Hack stage change | `--bm-motion-tray` rise | `--ms-ease-settle` | none | a stage arriving on reopen does not rise |
| Waiting dots | three fades, staggered 0.6 × `--bm-motion-tray`, once | `--ms-ease-settle` | drawn at once | never repeats |
| Clothes on a move | the leaving room's outfit while walking; the landing room's from the arrival frames | the move's own | the new outfit at once | a withdrawn move restores the current room's outfit |

Every timeline runs on the phase's own `startedAt`/`endsAt` (the trusted clock); none sets or waits for a deadline.

## 5. Privacy and uniformity

- The vote result draws only `voteResult` and public seats: no ballot, no voter, no side, no role. The release's tally sentence
  is said once per result id; the panel closes the card and tray and clears private live lines (Frontend's consumer review), and a
  sent command keeps its recovery.
- The Hack panel exists only in a participant's own view while the window has focus, the page is visible and the view is
  current, and only from `hackFeedback` bound to the current phase (section 11.2). It is removed from the document at once on a
  window blur (the page still visible), the background, a stale or unreadable view, a passed deadline, refused feedback, an
  audience change (no `hackFeedback`) or the match's end, with its animations, its timers and its private live lines, and comes
  back only on the player's own tap (Actions or Card) on a current view, settled (section 11.1). An unsent choice is dropped and
  said so; a sent declaration keeps its recovery hidden, and nothing is resent or checked again by itself. A blur leaves the
  public board and the other screens playing. The model reads no role: every target's panel is byte-identical whatever its role
  (`npm run flows:phone-kit` compares an Officer's and an Undercover's). "Accepted" is shown only on the server's answer.
- Every picture (the three side cards, the blank card, the tail, the dots, the vote pieces) is built into every phone alike; a
  participant's phone requests exactly the files of any other phone (`flows:phone-kit` and `capture:phone-kit` compare them).
- Faction colors appear only on the three side cards, in a participant's own panel.
- Clothes come from the public location alone; badges stay independent.

## 6. Words

Release words, quoted exactly and checked: `en.vote.tally` (the result's sentences), `en.phase.kind`, `en.action.consequence.move`
and `en.action.chooseAgain`. The owner's: "No side declared". **Proposed** (no release words exist): the phase names "Vote result"
and "Hack" (for `VOTE_RESULT`, `HACK_DECLARE`, `HACK_RESULT`), the result's tag, tie and runoff lines and its lettering, and every
other word of the Hack panel (`HACK_WORDS` in `design/phone-kit/js/hack.js`).

## 7. For Codex Frontend

Pin the commit named in the pull request (section 11 names the review correction's); the source hashes below are in
`design/phone-kit/assets/manifest.json` (`sources`). The correction changes no drawing source: the two derivatives proposed in
Frontend's `docs/frontend/claude-phone-kit-adoption-proposal.json` (at `bc92e58`) stay exact (section 11.3).

1. **Figures (interface change).** Port `design/board-motion/figures/wardrobe.mjs` beside the reviewed scene-drawing ports (it imports
   only `rig.mjs`, `body.mjs`, `parts.mjs`, whose ports already export what it needs) and draw every figure with
   `dressedFigureSvg(character, skeleton, { outfit: outfitFor(seat.location), prefix, layer })` instead of `figureSvg(...)`.
   For `outfit: 'crew'` it returns `figureSvg`'s string byte for byte. The port needs Integration's reviewed pin; this branch does not
   edit `reviewed-drawing-ports.json`.
2. **Moves (interface change).** The event director passes the leaving room's outfit to the walk and the landing room's from the
   arrival frames (`design/board-motion/js/director.js` shows where); a hit in place keeps the current outfit.
3. **Shell styles.** Take the `--pk-*` tokens and the shell rules of `design/phone-kit/css/phone-kit.css` (sections "top bar" to
   "bottom bar"); room tags above figures (z 2300); the who-plays portrait (`.pk-who`, the crew card art behind `public-board`).
4. **Layout (interface change).** One more auto row between the board and the strip for the Hack panel
   (`grid-template-rows: status 1fr hack strip nav`). The board refits as it does for the strip.
5. **Vote result.** Implement `voteResult.panel` from `vote-result.js` (model, DOM, timeline) on every screen (player phones and
   the display), keyed by `voteResult.id`, on the trusted clock; the status detail uses `voteResult.round`.
6. **Hack.** Implement `hack.panel` from `hack.js` in the private layer only: draw it only when `hackFeedbackProblem(phase,
   feedback)` is null and the participant checks pass (section 11.2), and conceal it as section 11.1 says (window blur included);
   send `DECLARE_HACK_SIDE { declaredSide }` through the existing command flow (receipt recovery as for any command); compact while
   another command is open; add the tray chip. `hack.js` itself is a prototype controller and stays out of production.
7. **Art.** Port `design/phone-kit/source/art.mjs` as a drawing module, or bundle the SVGs of `design/phone-kit/assets/art/` into
   one stylesheet loaded with the other bundles; either way all of them, alike, on every phone. A new art version for Ready is
   Integration's (today's pin is `design-0.2.0`).
8. **Words.** Use the proposed words as listed until the owner approves them; keep the release's where they are quoted.
9. **Verify.** 320 × 568 and 390 × 844, 200 % text, five in a room, nine players, long names (section 8 for what the prototype
   measured; production needs its own measurements).

Not handed over: the prototype controllers (`design/board-motion/js/app.js`, `director.js`, `dress.js`, `fixtures.js`), the
fixtures and the stand-in server. The drawing-port fence forbids importing them into production.

## 8. Verification

What was run, with results, is in [phone-kit-verification.md](phone-kit-verification.md).

## 9. Relation to other work

- **Preserved Claude work.** All figure, scene and ability art at `abb6839` is the Designer's latest (`body.mjs` since `70d66ce`);
  nothing of it is changed. Ability-art slice 8 (draft PR #116: character selection and role-card reveal) is not carried: it is out
  of this request's scope and its stylesheet and asset manifest are frozen inputs at this baseline.
- **Draft PR #124** (`44c2526`, the stopped Codex design attempt). Inspected for reuse. Reused, credited: the idea of a check that
  the crew outfit is byte-identical to the existing figure (implemented anew in `phone-kit-check.mjs`). Not adopted: its wardrobe,
  its compact hit/nameplate rows (they move targets off the characters, against "select targets on characters"), its icons, tokens
  and manifest. This pull request is the Designer's delivery for #121; #124 stays preserved as provisional.
- **Frontend's provisional consumer** (`codex/frontend-phone-feedback`, `2460f54`) is built on #124's sources; section 7 replaces
  those inputs.

## 10. Unresolved

- The owner's reference picture (`/Users/amirkianfar/Downloads/2dd36c8c-….png`, SHA-256 `0fb3f325…f1dab9`) is on the owner's
  computer and was not attached here; the look follows the written request. It needs the owner's review against that picture.
- Backend's exact #120 schema head: Frontend reviewed `ba1842f` read-only; it is not on the remote (section 11.5). The Hack's
  fields follow that reviewed contract as described (stable `hackId`, `phaseId` equal to the current `phase.id`, participant-only,
  consistent status and side), not Backend's code; nothing here claims compatibility with it.
- The declaration asks to confirm (as every command does in the release); in a 15-second window an owner may prefer one tap.
- The claim stays beside the talk for its 60 s for both participants; an owner may prefer it to leave after its five seconds.
- The proposed words (section 6) and the token revision (the `--pk-*` set as `@mothership/design-tokens` 0.5.0).
- Integration: the two drawing-port pins and the art version for Ready.

## 11. Review correction (PR #127, after `ca78625`)

Two review findings on the reviewed commit `ca78625bf9f97629cf7cfd8c40a2f97d7cc078ca`, corrected in source commit
`3784057ceb52c00ddc27e201b631f2769796525a` on `claude/designer-phone-polish` (the pull request's later commits add only this
record). The artwork, the phone layout, the timing (15 s at most to declare, the five-second claim, the full 60-second talk), the confirmation step and
every other open design choice are unchanged. The claim is still a claim, never a verified side; no response is still "No side
declared"; nothing private reaches an uninvolved phone, the host or the display. **This corrects the design prototype and its
specification; it is not a verified production integration.**

1. **Window blur.** `design/board-motion/js/app.js` concealed private content on `visibilitychange` and `pagehide` but not on a
   window `blur`: with `hack.claim-red` open and the document still visible, the private `#pk-hack` panel and the declared side
   stayed in the page. It now conceals on `blur` as on the background, and reopens only on the player's own tap.
2. **Obsolete phase.** `hackModel` in `design/phone-kit/js/hack.js` checked the phase kind but not the feedback's phase:
   `HACK_RESULT` with `phase.id = "phase-current"` and `feedback.phaseId = "phase-obsolete"` still produced a claim, and a
   `DECLARED` feedback without one of the three sides was drawn as "No side declared". It now draws only feedback bound to the
   current phase (`hackFeedbackProblem`).

### 11.1 The private lifecycle (Frontend's consumer requirements)

| # | Requirement | Prototype | Checked by |
| --- | --- | --- | --- |
| L1 | A window `blur` (its target the window) conceals the private surfaces at once, even while `document.visibilityState` stays `visible`; so do `visibilitychange` to hidden, `pagehide`, a stale or unreadable view, a passed deadline, refused feedback, an audience change and the match's end | `onBlur` → `conceal({ settlePublic: false })` | `flows:phone-kit` hack/blur, `capture:phone-kit` `d320-blur-claim`, `d390-blur-claim` |
| L2 | Concealing removes the Hack panel from the document (no hidden node), clears the private live lines, and stops its animations and timers (the claim's play and settle, the stage's rise): nothing scheduled can put it back | `clearHack()` cancels `play` and `enterTimer`; private surfaces' animations cancelled | hack/blur: mid-play blur, after the settle, through the server's next phase |
| L3 | A blur leaves the public board and the other screens playing (they are still in sight); the background still settles them at once | `settlePublic: false` on blur only | hack/blur: public motion plays on; hack/background: settles |
| L4 | Focus or visibility coming back opens nothing. Only an explicit player action (Actions or Card here) reopens, only on a current view (not stale or unreadable, deadline not passed), and the Hack panel then only from feedback that passes 11.2; reopened, it is drawn settled and the claim is not said again (once per `hackId`) | `reopen()`, `drawHack`, `claimsSaid` | hack/blur: focus back, out-of-date tap refused, reopened settled; captures `*-blur-reopened` |
| L5 | An unsent side (confirming) is discarded on concealment or refused feedback, and the player is told ("Your choice was not sent."). A sent declaration keeps its command and receipt recovery: an answer arriving while concealed updates its state (accepted, not accepted, unknown) without drawing or announcing it; nothing is resent or checked again by itself | `dropUnsent`, `render`'s refused-feedback rule, `answerDeclaration` | hack/blur: sending, unknown; hack/phase: sending; `d320-blur-sending` |
| L6 | Disposal removes the listeners: a later blur or focus changes nothing | `pagehide` handler | hack/blur: after disposal |
| L7 | Reduced motion: the same lifecycle; a reopened claim only fades | `playClaim(..., reduced)` | hack/blur reduced; `d390-reduced-blur-reopened` |

### 11.2 Binding Hack feedback to the current phase

`hackFeedbackProblem(phase, feedback)` returns `null` only when all of these hold; otherwise the reason, and nothing is drawn.

| # | Rule | Refused example |
| --- | --- | --- |
| B1 | `phase.id` and `feedback.phaseId` are non-empty and equal | the claim's phase holding the declaration window's feedback (same `hackId`); the talk holding the claim's; another exchange's feedback (another `hackId` and `phaseId`), even a consistent "claims Blue" |
| B2 | `feedback.hackId` is non-empty: the exchange, the same through its three phases (keys the claim's play-once and say-once) | `hackId` missing or empty |
| B3 | The status belongs to the stage: `HACK_DECLARE` → `AWAITING_DECLARATION`; `HACK_RESULT` and `HACK` → `DECLARED` or `NO_DECLARATION` | `AWAITING_DECLARATION` in `HACK_RESULT`; `DECLARED` in `HACK_DECLARE`; an unknown or missing status |
| B4 | `declaredSide` is `Blue`, `Red` or `Alien` exactly when the status is `DECLARED`, and null otherwise | `DECLARED` with no side or `Purple`; `NO_DECLARATION` with `Blue` |
| B5 | Then the participant checks, as before: the partner is in the view and is not the viewer; for the target, the partner is the initiator (the active seat) | a third party's view; a target whose partner is not the active seat |
| B6 | Refused feedback draws nothing at all (no panel, no word, no live line): never another stage, never "No side declared" in its place | (all of the above) |

The fixtures follow the same shape: `hackFeedbackFixture` gives `hackId` `fixture-hack-exchange-r<round>` and the phase's own
`fixture-phase-hack-{declare,result,talk}-r<round>` as `phaseId`; the stand-in server rebinds the feedback at each phase change.
The fixture panel's private facts **Out of order: this Hack's feedback from its previous phase**, **Out of order: another Hack's
feedback** and **This phase's own Hack feedback again** play the stale cases on the page.

### 11.3 Drawing interfaces, hashes and adoption impact

| File | Role | SHA-256 at `ca78625` | SHA-256 now |
| --- | --- | --- | --- |
| `design/board-motion/figures/wardrobe.mjs` | drawing source, proposed port | `1c30862d77ce7fa94275934467c5b596e68dbe0d41f3d102bd0c040bc5feca6f` | unchanged |
| `design/phone-kit/source/art.mjs` | drawing source, proposed port | `c86770765e06f487b5fa0f3b2be57c824d114a796a5930f96ff35c7358f95761` | unchanged |
| `design/phone-kit/assets/art/*.svg` (17) | exports | as in `manifest.json` | byte-identical |
| `design/phone-kit/js/hack.js` | prototype model and DOM (not ported) | `b29435f31de37fffadf7ed0e513c862ff41a6668112e8e26e39bf55c7dd2fc72` | `1aea4d111bf536adc44b6f79ce371e5bf60c9446fb291ad08edecd41f61e8e00` |
| `design/phone-kit/assets/manifest.json` | export manifest | (records `hack.js`'s hash) | only `sources["design/phone-kit/js/hack.js"]` changes |

- `dressedFigureSvg(character, skeleton, { outfit, prefix, layer })`, `outfitFor(location)`, `RESULT_ART` and `HACK_ART` are
  unchanged, so the two runtime derivatives Frontend proposed (`312c4cda…` and `713b860f…`, the sources minus their first line)
  stay exact. The kit version (`phone-kit-0.1.0`), the art version (`phone-kit-art-0.1.0`) and the wardrobe version
  (`wardrobe-0.1.0`) are unchanged: no picture changed, so no new art version is needed for this correction (Ready's art version
  stays Integration's, as before).
- Adoption impact is behavioural: Frontend's consumer meets 11.1 and 11.2 in `apps/game` and `packages/presentation`. The
  prototype controllers (`app.js`, `director.js`, `dress.js`, `fixtures.js`, `hack.js`, `vote-result.js`) and the stand-in server
  stay out of production, as Frontend's proposal already lists.

### 11.4 Regression results

Run on the content of `3784057` in this container (Node 22.21.1, npm 10.9.4, headless Chromium 141 with simulated viewports
and text sizes: not a device, not assistive technology, not a match across phones). Full record:
[phone-kit-verification.md](phone-kit-verification.md).

- Both findings reproduced on `ca78625` first, and fixed on `3784057` (the same scratch probes).
- `@mothership/design-tokens` tests **219 / 219** (eight new model tests); `check:phone-kit` **7 / 7**; `flows:phone-kit`
  **109 / 109** three times (52 new checks); `capture:phone-kit` **124** pictures at 320 x 568 and 390 x 844, 200 % text and
  reduced motion, **0 with problems** (six new: concealed by a blur, reopened, in reduced motion).
- Board-motion: 333 captures, 13 / 13, 366 / 366, 52 / 52. Ability art: 235 pictures, 12 / 12. `check-assets` 15 / 15,
  `check-shell` 0 failures, `v1-phone-check` 7 / 7.
- `npm run verify`: exit 1 at its last stage only, `test:capacity` (the balance runner's 600 s child limit), in this
  container and on CI for `3784057`, with every earlier stage passing (design 219 / 219 among them). The gate reads nothing
  this branch changes and passed on `ca78625`'s CI in 502 s; its limit is Integration's (the pull request proposes the patch).

### 11.5 Remaining dependencies

- **Backend's Hack schema.** Frontend's review cites `ba1842ff991dfb53207cbef110940016cc8d533d`; it is not on the remote (a fetch
  by that SHA is refused, "not our ref", 12 October 2026; no remote branch or pull request head carries it). The fields used
  here are the reviewed contract as described to the Designer (a stable `hackId` per exchange, `phaseId` equal to the current
  authoritative `phase.id` at each stage, participant-only feedback with consistent status and side), not a checked schema. The
  older proposal `bd4d77c` (no `phaseId`) is not used for the Hack. No compatibility with Backend's final code is claimed.
- **Integration:** the two drawing-port pins (unchanged by this correction), the Ready art version, the token revision, the
  shared drawing fence, and adoption and deployment.
- **Frontend:** the production consumer (11.1, 11.2) with its own measurements; Frontend reports the Menu and vote-result
  overlap already fixed on PR #126 (`bc92e58`), which this correction does not touch.
- **Owner:** the open choices of section 10 (the reference picture, the proposed words, the confirmation step, the claim beside
  the talk).
