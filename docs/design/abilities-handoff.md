# Frontend handoff: ability art

Slice 1, the Insider's file, is sections 1 to 13. Slice 2, the Hacker's file and Scan, the Code attempt and the Alien's Code, is section 14; slice 3, the Rescue, the Disable and the Supply, section 15; slice 4, the shot (every seat that shoots, the Officer's one shot, an Alien's supplied weapon) and the Undercover's Protection, section 16; slice 5, the ballots, the Captain's release request, a Hack and Pass, section 17; slice 6, the showdown's special shot and the match's end, section 18; slice 7, the marks in the tray, the failure states (out of date, unreadable, Reconnect now) and the card kept out of date, with movement and health recorded from PR #88, section 19; slice 8, choosing a character and the role card's reveal, on the release's setup steps, section 20. Each builds on slice 1's parts (the snapshot, the file, inspecting, the loading rule) and changes none of the rules before it. The kit is `abilities-0.8.0` since slice 8: each slice added assets and changed none of the earlier ones.

## Slice 1: the Insider's file

**A proposal.** Ability art `abilities-0.1.0`, slice 1 of the inventory in [abilities-inventory.md](abilities-inventory.md). Designed on the board-motion prototype at `08409392d1040f20d559a9f36a2a1d9bb23468c4` (PR [#88](https://github.com/Amirkianfar66/GameN/pull/88), branch `codex/designer-board-motion`, unmerged): protocol 2, engine `full-game-1.1.0`, ruleset `in-person-v1-pass-2026-10-08` (parent `in-person-v1-2026-10-06`), Original Powers off. Tokens 0.4.0 and the reviewed manifest `design-0.2.0` are unchanged; the kit is outside it. The owner chose this treatment's content, **character portraits and role labels** ([owner-decisions.md](owner-decisions.md#11-october-2026-the-insiders-file-portraits-and-role-labels)); the look and motion are the Designer's proposal.

The reference behaviour is `design/abilities/js/dossier.js` and `design/abilities/css/abilities.css`, wired into the prototype in `design/board-motion/js/app.js` (`drawCard`, `fileFor`, `spotOnBoard`, `loadArt`). Open it with `npm run dev:review --workspace @mothership/design-tokens`, then `http://127.0.0.1:4320/board-motion/index.html?scenario=file.insider`. Review pictures: `design/abilities/review/` (`contact-insider.png` shows them all).

## 1. What changes for the Insider

Opening the card during gameplay shows the role card, then **the Insider's file** under it: a cork board with three snapshots of the candidates' own crew cards pinned on a string in seat order, an envelope holding the three role names as one set, stamped ONE EACH, and **Who is which: unknown.** The first open in a page assembles the file in about one second; every later open shows it at rest.

Pressing a snapshot lifts it from its pin; the rest of the file dims and a card lies over the envelope with that player's public facts and two buttons, **Show on board** (closes the card and rings that character on the player's own board for 1.6 s) and **Back** (Escape too). Nothing else changes for anyone: no other phone, the shared display and the host view see nothing of it.

## 2. Who changes what

| Owner | What |
| --- | --- |
| Frontend | `apps/game/`, `packages/presentation/`: the file's markup, styles, motion and wiring, sections 3 to 9 |
| Integration (Codex Astra) | Adopting the kit into a reviewed export revision and the runtime manifest pin (DSN-D36); the contract statement of DSN-REQ-14; anything in `packages/contracts/`, the engine, Firebase, root manifests, lockfiles or CI |
| Game Design and Balance | The disclosure review of section 8: that the file says no more than the rule (v2.1 `roles.Insider`) |
| Visual and Motion Designer | This design, its art and checks: `design/`, `packages/design-tokens/`, `docs/design/` |

## 3. When it is drawn, and from what

**Audience:** the Insider's own phone, inside its own open private card. Never the table display, never a host view, never another phone, never the public board.

**Trigger:** the player opens the card during gameplay and the view carries three candidates. The staged-start preview (`packages/contracts/src/staged-start.ts`) carries the role and no knowledge, so the 30-second reading stage shows the role card only, and the file first appears in the first gameplay view. Build the file only while the card is open and remove it when the card closes or is concealed: closed, there is no private word in the document (the release's private-area rule).

| Field | From | Used for |
| --- | --- | --- |
| `knowledge.insiderCandidates` (three `SeatId`) | `FullPlayerView` | Which three snapshots. Draw nothing unless it holds exactly three |
| `displayName`, `characterId` of those seats | the lobby identity record (`packages/contracts/src/lobby-identity.ts`) | The name on the frame and the crew card in the window (`c1` to `c9`) |
| `seats[].location`, `health`, `captain`, `jailed` | the public view | The inspect card's public facts, the same words every screen can show |

**Order.** Sort the three by seat number, ascending, on the client, whatever order the view lists them in (the release's `buildKnowledge` already sorts by seat). Never draw in the view's order and never in any order derived from a role. The engine lists them in seat order today (`packages/engine/src/full-game/roster.ts`); [DSN-REQ-14](integration-requests.md#dsn-req-14) asks the contract to say so.

Nothing in the file reads a role other than the viewer's own, and nothing is worked out: the file is the one field, drawn.

## 4. Markup and hooks

`insiderFile(candidates, { describe, onShow })` in `dossier.js` builds this; port its structure, not necessarily its code:

```html
<section class="ab-file" data-file="insider" aria-labelledby="ab-file-title">
  <header class="ab-file__tab"><h3 class="ab-file__title" id="ab-file-title">Insider file</h3><span class="ab-stamp" data-stamp="classified" aria-hidden="true">Classified</span></header>
  <p class="ab-vh"><!-- the release's sentence, en.knowledge.insider(…) --></p>
  <div class="ab-file__field">
    <span class="ab-corner-pin" data-corner="tl|tr|br|bl" aria-hidden="true"></span> ×4
    <ol class="ab-suspects" aria-label="The three players">
      <li class="ab-suspect"><button type="button" class="ab-photo" data-seat="2" aria-pressed="false" aria-label="Player 2, Ben. Inspect">
        <span class="ab-photo__frame" aria-hidden="true">
          <span class="ab-photo__art" data-character="c7"></span><span class="ab-photo__numeral">2</span>
          <span class="ab-photo__pin"></span><span class="ab-photo__query"></span><span class="ab-seat ab-photo__seat">2</span>
        </span>
        <span class="ab-photo__caption" aria-hidden="true"><span class="ab-seat ab-photo__caption-seat">2</span><span class="ab-photo__name">Ben</span></span>
      </button></li> ×3, in seat order
    </ol>
    <div class="ab-roles" role="img" aria-label="Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.">
      <span class="ab-roles__back"></span>
      <span class="ab-roles__slip"><span class="ab-roles__name">Undercover</span><span class="ab-roles__name">Alien</span><span class="ab-roles__name">Cracker</span></span>
      <span class="ab-roles__front"></span><span class="ab-roles__clip"></span><span class="ab-stamp" data-stamp="one-each">One each</span>
    </div>
  </div>
  <svg class="ab-thread" aria-hidden="true">…</svg>
  <p class="ab-file__note">Who is which: unknown.</p>
  <div class="ab-inspect" hidden aria-live="polite">…</div>
</section>
```

- Every snapshot is built identically: the same elements, classes and attributes, only the seat, name and character differ. No `data-role`, no `aria-describedby`/`aria-controls` toward the role names, no per-seat class.
- The role names are **one picture with one accessible name**, never a list a screen reader could pair with the three players.
- The thread is redrawn from the four corner pins whenever the file resizes (`drawThread`, a `ResizeObserver`).
- `aria-pressed` marks the inspected snapshot; `data-inspect` on the file holds its seat (empty when none). Focus stays on the pressed snapshot; Back and Escape return focus to it.

## 5. Art and loading

The kit is 11 neutral assets in one stylesheet, `design/abilities/assets/abilities.art.css` (9,451 bytes), each a custom property `--ab-asset-<id>`; `manifest.json` beside it has ids, versions, boxes, anchors, sizes and hashes.

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-cork` | 96 x 96 | tile 96 | The file's background, tiled |
| `dossier-tape` | 64 x 22 | center (32, 11) | The file's two top corners, turned 38 degrees |
| `dossier-pin` | 26 x 28 | point (12, 10) | Every snapshot and the four corners |
| `dossier-photo` | 104 x 134 | window (10, 10, 80 x 92), pin (50, 4), caption (6, 104, 92 x 20) | Every snapshot's frame; the crew card fills the window |
| `dossier-query` | 30 x 38 | hole (15, 10.5) | Every snapshot's top right |
| `dossier-lens` | 30 x 30 | center (12, 12) | The inspect card's heading |
| `dossier-clip` | 18 x 46 | grip (10, 4) | The slip in the envelope |
| `dossier-stamp` | 132 x 40 | text (8.5, 8.5, 115 x 23) | Around CLASSIFIED and ONE EACH (live text) |
| `dossier-envelope-back`, `-front` | 224 x 88 | mouth y 44 | Behind and in front of the slip |
| `dossier-folder` | 228 x 156 | label (62, 76, 100 x 36) | The hidden card, for every role |

The portraits are the approved crew cards (`--ms-asset-piece-crew-card-c1` to `c9`, bundle `public-board`, `design-0.2.0`).

**Loading rule.** Load the kit **whole, once, on every player phone**, with the player bundles (`public-board`, `player-ui`, `roles`) and before the first match view, **whatever the seat's role, state or turn**; the table display does not load it. Which requests a phone makes then says nothing about its role. Mark it arrived on the root (`data-art~="abilities"`) and draw an asset only behind that mark; draw a crew card only behind `data-art~="public-board"`. Never fetch an asset when a file opens.

**Fallback.** Without the kit the file is complete in paper, ink and words: plain frames, a plain envelope, round pins, a `?` tag, the stamps as double-ruled text. Without the crew cards each window shows the seat number large and the corner sticker is not drawn. Nothing is cut and no control is lost (`insider-w390-no-art.png`).

## 6. Layout

The card takes the height it needs, up to the whole space between the status bar and the dock (`#bm-card:has(.ab-file)` in the reference). At the default text size the role card and the whole file fit **without scrolling** at 390 x 844 and at 320 x 568, the inspect card included; on a short phone (640 px tall or less) the role card becomes a row and the file tightens (`.bm-app[data-short="true"]` rules, which apply only at the default text size).

- **Names.** Up to 12 characters (`CREW_NAME_MAX_LENGTH`). On a small snapshot a long name ends in an ellipsis; the button's accessible name and the inspect card always say it whole (`insider-w320-long-names.png`).
- **Large text** (the board's own query, `max-width: 18em`): every word grows with the reader's text size and the file reflows into one column, each snapshot with its number and whole name beside it, the envelope below the three; the card scrolls and the inspect card is scrolled into view. Nothing is clipped or shrunk (`insider-w320-text200.png`).
- **Positions.** The tilt of a snapshot is by position (first, second, third), the same whatever the candidates. The role names stand below all three snapshots, beside none, in every layout.

## 7. Motion

| Form | Behaviour |
| --- | --- |
| Normal | The first deliberate open in a page assembles the file in 1020 ms (`FILE_MOTION`): the board rises (0 to 180 ms); the snapshots drop and are pinned in seat order (from 120 ms, 70 ms apart, 260 ms each, the pin 120 ms); the envelope rises (300, 200 ms) and its slip slides up with the three names together (520, 240 ms); the query tags swing on all at once (540, 280 ms); the corner pins pop and the string draws round the whole set (640, 380 ms); CLASSIFIED lands at 220 ms and ONE EACH at 860 ms (140 ms each). Inspecting lifts the snapshot from its pin toward the middle (200 ms, scale 1.42, origin at the pin) while the rest dims to 30 %; Show on board rings the character on the own board for 1.6 s |
| Reduced | The file appears at rest with an 80 ms fade; inspecting rings the snapshot instead of lifting it; Show on board rings without the zoom |
| Static | Without motion support the file is simply at rest; every state is drawn without animation |
| Cancel | Closing the card, the page going to the background, the view going out of date or reduced motion being switched on finishes every animation at once (`cancelMotion`) and leaves the file at rest |
| Replay | The assembly is a reveal the player asked for, not a game event: once per page, on the first deliberate open; never on an update, a duplicate event, a receipt recovery or a reconnect |

Nothing waits on the motion: every control works from the first frame, and the motion never decides or delays game state. No sound and no vibration.

## 8. What the file must never show (review with Balance)

- No pairing of a role name with a player: no color, position, line, animation order, accessible name, asset or class differs between the three snapshots, and nothing about a snapshot names a role.
- No order but seat order, whatever the view's order.
- No evidence beyond the field: inspecting says only public facts.
- Nothing before gameplay (the reading stage), nothing on a public surface, nothing in a public live region, nothing in the page while the card is closed.
- No role-dependent loading, sound or vibration.

## 9. Hidden and background states

The release's conceal rule stays as it is: when the page goes to the background or the view goes out of date, an open card closes at once and every private animation is cancelled; coming back shows the board, and foregrounding never opens private content. The file is then built afresh when the player presses Card, at rest (`hidden-w390-reopened.png`).

When Card is pressed while the card cannot be shown (the view is out of date or the turn's time is up), the card opens on **a closed folder**, the same for every role and seat, with **Your card stays hidden until your view is up to date.** and no control (`hidden-w390-stale.png`). A page that opens in the background with its card open shows the folder with **Your card is hidden.** and **Show my card**, a deliberate open.

## 10. Words

| Where | Words |
| --- | --- |
| Visible | Insider file · Classified · One each · Who is which: unknown. · Show on board · Back |
| Accessible | The release's sentence, `en.knowledge.insider(names)`: “… hold the roles Undercover, Alien and Cracker, one each. You are not told which of them holds which.” · “Player 2, Ben. Inspect” · the role group: “Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.” |
| Hidden card (proposed) | Your card is hidden. · Your card stays hidden until your view is up to date. · Show my card |

For the Insider the file carries the release's knowledge sentence as its summary; the card's knowledge list does not repeat it.

## 11. Tests to port

`design/tools/abilities-capture.mjs` measures every review picture in the page; port its assertions to the runtime's own tests: three snapshots in seat order, built and sized alike; no role word in a snapshot or its accessible name; no `aria-describedby`/`aria-labelledby`/`aria-controls`/`aria-owns` on a snapshot; one role group with `role="img"` and the one accessible name; the role names below all three snapshots; every snapshot showing its seat number; no sideways scroll; no vertical scroll at the default text size at 390 x 844 and 320 x 568; controls at least 44 px; a name cut only with an ellipsis and said whole by its button, never cut at large text; and with the card hidden, no file and no private word in the page.

## 12. Provenance and rights

Original vector artwork made for this repository by the Visual and Motion Designer (Claude Code session). No third-party artwork, font, photograph or generated raster image. The editable source is `design/abilities/source/dossier.svg`; the recipes, palette and rights are in `design/abilities/recipes.json`.

## 13. Dependencies and open decisions

| ID | What | Who | Meanwhile |
| --- | --- | --- | --- |
| [DSN-REQ-14](integration-requests.md#dsn-req-14) | State in the contract that `knowledge.insiderCandidates`, `knowledge.code` and a Supplier's `successfulRecipientSeatIds` list seats in seat order | Integration | The engine sorts them; the treatments sort them again |
| [DSN-REQ-15](integration-requests.md#dsn-req-15) | Carry a Disabler's spent Disable, and the Officer's spent shot, in the seat's own view | Integration, Backend | The receipt shows the charge or the round spent; no lasting mark, and a weapon supplied after the Officer's shot is drawn as held |
| [DSN-REQ-16](integration-requests.md#dsn-req-16) | Whether a stale or timed-out view hides the private card (raised by Frontend on PR #102) | Integration | The prototype shows the closed folder (PR #88's conceal rule); recommended: keep the release's card, the folder only after the background |
| DSN-D36 | Adopt the ability kit into a reviewed export revision and the runtime manifest pin, loaded on every player phone | Integration | A proposal beside the kit (`design/abilities/assets/`, now `abilities-0.8.0`) |
| DSN-D37 | The look and motion of the ability art (slices 1 to 8) | Game owner | The owner chose the Insider's content (portraits and role labels); the rest waits for the owner's look |

Browser emulation only: desktop Chromium at simulated phone viewports. No real phone, screen reader or touch test has been run.

## 14. Slice 2: the Hacker and the Alien

**A proposal**, on the same base and tuple as slice 1. Review pictures: `design/abilities/review/contact-hacker-alien.png`. Scenarios: `file.hacker`, `file.hacker-start`, `scan.result`, `scan.faction`, `scan.sending`, `scan.fresh`, `code.two`, `code.four`, `code.registered`, `file.alien`. Reference code: `design/abilities/js/intel.js` (`hackerFile`, `printout`, `printFresh`, `alienFile`, `codeCard`, `scanTarget`), its styles in `abilities.css` (the slice 2 block), wired in `app.js` (`fileFor`, `stripContent`) and `board.js` (`applyCues`).

### 14.1 What changes for a player

- **The Hacker's card** shows the Hacker's file: the known Undercover's own crew card, the label tape UNDERCOVER on its frame, and beside it the Code's mark struck out, "Not in the Code". Under it, **Scans**: one torn printout per result the view carries, in the view's order: the player's chip, "Round 2 · Eli", "Guess: Blue", and a stamp: WRONG, or RIGHT with the Code's mark (plain: in the Code; struck: not in the Code).
- **A Scan in the strip**: once a player is picked, their chip stands beside the question; while the Scan is on its way a scanner line sweeps the chip; the receipt is the same neutral Registered stamp as every action. The result appears only in the Hacker's file, printed once the first time the card shows it.
- **A Code attempt in the strip**: a punch card with four windows; each pick clips its portrait chip into a window, **the windows filled in seat order** whatever the picking order; registration punches the card once. On the board every pick wears the same check, never a number; the strip names the picks in seat order.
- **The Alien's card** shows the Alien's file: the Code's four players two by two, in seat order, one string round the four, the Code's tag on the string, the Alien's own snapshot marked YOU, and "Four players, in no order."

### 14.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| Hacker's file | `knowledge.undercoverSeatId`, `knowledge.scanResults[]` (`round`, `targetSeatId`, `guess`, `matched`, `inCode`), the lobby identity of those seats, the public facts for inspecting | The view's order of `scanResults`, never sorted or filtered. A result is never worked out from a receipt: V1-14 returns it with the acceptance, in the next view |
| "Not in the Code" | none: the rule | v2.1 `roles.Hacker.starting_knowledge` ("therefore knows that player's number is excluded from Code") and `code.undercover_number_always_excluded`. Proposed words: the release's sentence names only the Undercover |
| Scan strip | `legalTargets` for Scan, the picked seat, the guess, the receipt | The chip is the picked player's public identity; the sweep only while `submitting` or `checking` |
| Code card | the picks (`SUBMIT_CODE.seatIds`), the receipt | Sort by seat number before drawing; the command's own order carries no meaning (the Code is a set) |
| Alien's file | `knowledge.code` (four seats, the Alien's own among them), the lobby identity, the public facts | Sort by seat number before drawing (DSN-REQ-14 asks the contract to say so); mark the own seat |

### 14.3 Markup and hooks

- Hacker's file: `section.ab-file[data-file="hacker"]` with the tab, a visually hidden summary (the release's sentence and "That player is not in the Code."), `.ab-known` (the snapshot, with `.ab-photo__tape` on its frame, and `.ab-known__words`), then `section.ab-scans` holding `ol.ab-scans__list > li.ab-printout[data-scan="<round>:<seat>"][data-result="wrong|in-code|not-in-code"]`. Each printout carries its sentence, in the release's words, as visually hidden text; its paper is `aria-hidden`.
- Alien's file: `section.ab-file[data-file="alien"]` with the summary (the release's sentence, seats in seat order, the own marked "(you)"), `ul.ab-code-set` (an unordered list) of four snapshots, `.ab-code-tag`, the note.
- Strip: `.ab-code-card` (aria-hidden: the strip's words name the picks) with four `.ab-code-card__window[data-filled]`, each holding an `.ab-chip[data-seat]`; `.ab-scan-target[data-sweeping]` floated beside the question.
- Board: `.bm-piece__pick` holds the same check (✓) on every pick of a set (Supply's two, the Code's four); it was a number.

### 14.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-printout` | 240 x 56 | text (16, 8, 208 x 40) | A Scan result's paper. Nine-sliced (`border-image` 12 14 fill), so its torn ends keep their teeth at any width |
| `dossier-chip` | 48 x 48 | window circle (24, 24), r 17 | A small portrait: a printout's player, a pick in the Code card |
| `dossier-code-mark` | 40 x 30 | center (20, 15) | The Code's mark, four holes two by two: a set, not a row. Struck through by CSS for "not in the Code" |
| `dossier-code-card` | 240 x 76 | windows at (38, 44), (92, 44), (148, 44), (202, 44), r 20 | Behind a Code attempt's picks; the element keeps the art's aspect so the windows line up |

The stamp frame (`dossier-stamp`) is nine-sliced since `1453500` (slice 1's fix). Same loading rule as slice 1: the whole kit on every player phone, whatever its role.

### 14.5 Layout

At the default text size both files fit 390 x 844 and 320 x 568 without scrolling with the fixtures' content (two Scans for the Hacker). In the strip the Code card stands under the question; on a short phone (640 px tall or less) it sits small at the start of the detail line (where Supply's tags sit since slice 3), its chips without their seat badges (the line names the seats), so the board keeps its height. With more Scans the card scrolls inside itself on a short phone; the newest result is the last. At large text both files reflow into one column: the Hacker's label leaves the frame and stands as words beside it; printouts put their stamp under the words; the Alien's four stand one under the other.

### 14.6 Motion

| | Hacker's file | Scan strip | Code card | Alien's file |
| --- | --- | --- | --- | --- |
| Normal | Assembles on the first open in a page (about 1.1 s): snapshot, tape (380, 180), struck mark (520), printouts fed in the view's order (from 600, 90 apart), string, stamp. A result that arrived since is printed once (420) with its stamp (140) | Sweep, 900 ms back and forth, only while on its way | The new pick's chip clips in (160); registration punches the card (220); an update that changes nothing in the strip plays neither again | Assembles: the four drop in seat order, the string (520, 380), the tag swings on (820, 260) |
| Reduced | An 80 ms fade; a new result fades in once | No sweep; the chip ringed while on its way | No clip, no punch | An 80 ms fade |
| Cancel | Closing, the background, a stale view or reduced motion finishes everything at rest | Ends with the step | Ends with the step | As the Hacker's |
| Replay | Never again on an update, a recovery or a reconnect: keep the keys of the results already shown | Never | Never | Never |

### 14.7 What it must never show (review with Balance)

- A wrong Scan: nothing of the Code, not even an empty mark. A right one: membership only, never a position.
- The Alien's Code and a Code attempt: never numbered, never an order but seat order; never "first", a position or a list a reader would count.
- The Hacker's pairing is the only label on a portrait in any file; the Insider's file still pairs nothing.
- Nothing on the board, the shared display or a host view; no sound, no vibration; the same kit loaded on every phone.

### 14.8 Words

| Where | Words |
| --- | --- |
| Hacker's file | Hacker file · Classified · Undercover · Not in the Code (proposed) · Scans · Round N · Guess: Red · Wrong · Right · In the Code |
| Hacker's file, accessible | "The Undercover is Player 4." (the release) · "That player is not in the Code." (proposed) · each Scan: "Round 2: you scanned Player 5 and guessed Blue." with "The guess was right, and that player is in the Code." (the release) |
| Alien's file | Alien file · Classified · The Code · You · Four players, in no order. Accessible: "The Code is these four players: Player 1, Player 3 (you), Player 5, Player 9." (the release, in seat order) |
| Strip | Unchanged release words; the picks named in seat order |

The release's Scan detail says the result "is listed under 'What you know'". With the file, the result is in the Hacker's file: Frontend words it with the copy owner.

### 14.9 Tests to port

The slice 2 rules in `design/tools/abilities-capture.mjs` and `abilities-check.mjs`: one snapshot in the Hacker's file, labelled; a wrong Scan with no Code mark and no "Code"; at most one mark on a right one; each printout said in the release's words; Scans in the view's order; the Alien's four in seat order, one marked as the viewer's, no ordinal words, an unordered list; the Code card filled in seat order; no number on any pick of a set; the strip naming a set's picks in seat order; the sweep only while sending and never in reduced motion. The flows (`board-motion-flows.mjs`) add a live Scan whose result is printed once and not again after reopening.

## 15. Slice 3: the Rescue, the Disable and the Supply

**A proposal**, on the same base and tuple as slices 1 and 2. Review pictures: `design/abilities/review/contact-rescue-disable-supply.png`. Scenarios: `rescue.choose`, `rescue.self`, `rescue.confirm`, `rescue.registered`, `rescue.kit`, `disable.confirm`, `disable.registered`, `disable.red-confirm`, `disable.red-registered`, `supply.first`, `supply.second`, `supply.confirm`, `supply.registered`, `supply.ack`, `supply.ack-one`, `supply.ack-none`, `supply.self`, `supply.received`, `supply.history`; the panel's **Player 6 is now Healthy** plays the public recovery. Reference code: `design/abilities/js/tools.js`, its styles in `abilities.css` (the slice 3 block), wired in `app.js` (`stripContent`, `stripBeats`, `drawCard`, `deliveriesFor`).

### 15.1 What changes for a player

- **A Rescue.** In the Cracker's strip the picked player's chip stands in a **medical cross ring** beside the question, and **two vials** sit at the start of the detail line: as many full as the Rescues left. On the receipt (the neutral **Registered** stamp and the release's words, "This is not a result.") the vial the count gave up drains once. Nothing says the target is or will be healed. At the end of the round a recovery, if there is one, is the public health change every screen draws the same way (the bandage comes off, the player leaves the Hospital), naming no rescuer and no Rescue. In the card, while one is left: a note with the vials and **Rescues you have left: 1.**
- **A Disable.** The picked player's chip in a **charged reticle**, a dashed ring with sparks at its four corners, never across the face; **one charge cell** at the start of the detail line, full while the Disable is offered, **spent on the receipt**. The Blue and the Red Disabler see **the same strip, part for part**.
- **A Supply.** Two **shipping tags** at the start of the detail line; each pick's chip goes into a tag, **in seat order** whatever the picking order; the receipt **ties the two tags together**, and is not a delivery. After Round 3 the card shows **Supply results**: the Supplier's **slip** naming the players who received a weapon, and, for any player who received one, a slip that says so and names no Supplier. A slip that says a weapon arrived is stamped **DELIVERED**.

### 15.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| Rescue's target | the picked seat (`RESCUE.targetSeatId`), its lobby identity | Only while a Rescue is chosen, confirmed, sent or its receipt shows. The board keeps the neutral marks every action has |
| Vials | `self.rescuesRemaining`, of the two a match gives (v2.1 `roles.Cracker.rescues_per_match`) | Full ones first. **A vial empties when the count falls**, never on the receipt by itself: the use is reserved at acceptance and kept whatever the round brings (V1-15), and the next view says so. A Rescue that heals no one still spends its vial |
| The Cracker's note | `self.rescuesRemaining > 0` | The release's sentence (`en.knowledge.rescues`), with the vials. At none the release says nothing, and neither does the card. It is a picture of the knowledge line: the card's list need not repeat it |
| Disable's target and cell | the picked seat, the offer (`legalTargets.DISABLE`, given only while the Disable is unspent), the receipt | Full while offered; spent on an accepted receipt (V1-15). **No lasting spent mark**: `self.disablerAvailable` means a legal target now, so a card cannot tell spent from not-your-turn ([DSN-REQ-15](integration-requests.md#dsn-req-15)) |
| Supply's tags | the picks (`SUPPLY.targetSeatIds`), the receipt | Sort by seat number before drawing; the command's own order carries no meaning (a set of two). Tied only on an accepted receipt |
| The Supplier's slip | own acknowledgments: `supplierResults[].successfulRecipientSeatIds` (sorted by the engine, DSN-REQ-14) | The release's sentence, one or two players, or "No players received a weapon from your Round 3 Supply."; a tag per player it names, seat order; DELIVERED only with a tag |
| A recipient's slip | own acknowledgments: `receivedSupply[]` (its round) | "You received one ordinary weapon from Supply in Round 3." and one tag, the recipient's own. **Names no Supplier**: the acknowledgment carries none (V1-16). Any role, the Supplier included when it supplied itself |
| History unavailable | `historyAvailable === false`, the Supplier only (as the release) | "Supply result history is unavailable for this match." No tag, no stamp |

### 15.3 Markup and hooks

- Strip: `.ab-target[data-mark="cross"|"spark"]` (aria-hidden) floated beside the question, holding an `.ab-chip[data-seat]` and `.ab-target__mark`; at the start of `.bm-strip__detail` one of `.ab-vials[data-remaining] > .ab-vial[data-full]`, `.ab-cell[data-spent]`, `.ab-tags[data-count][data-tied] > .ab-tag[data-filled]` (each holding a chip) and `.ab-tags__string`. All aria-hidden: the strip's words carry every fact (the release's prompts, the picks named in seat order).
- A vial's liquid and a cell's charge are their `::after`, so that draining and discharging are beats of their own on an element already drawn at its rest.
- Card: `.ab-kit[data-kit="rescue"]` (vials and `.ab-kit__words`, visible text) after the role card; then `section.ab-deliveries` (`h3` **Supply results**) with `ul.ab-deliveries__list > li.ab-slip[data-slip="supplied:3"|"received:3"|"unavailable"]`, each with `.ab-slip__tags` (aria-hidden), `p.ab-slip__words` (visible, the release's words) and `.ab-slip__stamp[data-stamp="delivered"]` (aria-hidden).
- Nothing in the kit or the strip carries `data-device`, `data-team` or a role's name; the role card keeps the approved device art.

### 15.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-vial` / `dossier-vial-empty` | 22 x 36 | base (11, 34) | A Rescue left / used. Same silhouette, so the full one lies exactly over the empty one |
| `dossier-cross` | 48 x 48 | ring (24, 26), r 20 | Round a Rescue's target chip, a medical cross on its top |
| `dossier-cell` / `dossier-cell-empty` | 24 x 36 | base (12, 34) | The one Disable, ready / spent |
| `dossier-spark` | 56 x 56 | center (28, 28), clear within r 20 | A dashed ring and four sparks round a Disable's target, outside the chip |
| `dossier-tag` | 70 x 40 | eyelet (12, 20), chip (42, 20) | One of Supply's two picks; the strip and the slips |
| `dossier-slip` | 200 x 64 | slice 18 34 10 10; text (10, 18, 156 x 36) | The paper of a note in the card. Nine-sliced (`border-image` 18 34 10 10 fill, `round stretch`): the perforation in the top band, the shading in the right band |

All neutral: no team, room or crew color; the same assets for both Disablers. Same loading rule as slices 1 and 2: the whole kit on every player phone, whatever its role.

### 15.5 Layout

The art sits where the strip already had room: the target floated beside the question (as the Scan's), what the action uses at the start of the detail line (where Supply's progress dots were). All of it fits 390 x 844 and 320 x 568 with the board keeping its height. The stamp on the strip's top edge keeps clear of the words: the first line wraps short of its corner (the prototype reserves 38, 60 and 80 px for Registered, Not accepted and Sending, measured; Unknown needs none). The card's notes fit both phones without scrolling; at large text every word grows, the slips put their tags under their words, and the card scrolls.

### 15.6 Motion

| | Rescue | Disable | Supply |
| --- | --- | --- | --- |
| Normal | When the view's count falls while the receipt shows, the emptied vial drains (240) | On the receipt the cell discharges (200) | A pick clips into its tag (160); the receipt ties the tags (200); a slip shown for the first time drops in (260) |
| Reduced | The vial is simply empty | The cell is simply spent | Tags and slips at rest |
| Static | The ring, the vials, the words | The reticle, the cell, the words | The tags, the slips, the words |
| Cancel | As every strip; reduced motion finishes a beat at once | As the Rescue | As the Rescue |
| Replay | Never: only a fall of the count drains | Never: only the receipt discharges | Never: a slip already shown in this page is drawn at rest |

### 15.7 What it must never show (review with Balance)

- A Rescue's receipt that reads as a recovery: no healed, healthy or recovered; no change to the target's chip. The recovery is the public health change, which names no one.
- A vial emptied ahead of the view's count; a Rescue drawn as refunded (a canceled or non-live target gets no refund, V1-15).
- Anything that tells the Blue Disabler from the Red in the strip: no color, class, asset or word. A Disable drawn as a hit.
- Supply's picks in an order; a delivery before the acknowledgment; a recipient told who supplied it; any public weapon marker.

### 15.8 Words

| Where | Words |
| --- | --- |
| Strip | The release's, unchanged: "Who is the Rescue for?", "Register a Rescue of Player 6?", "Rescue of Player 6 registered.", "Register a Disable at Player 5?", "Two players get a weapon each. Choose the first.", "Register a weapon each for Player 1 and Player 8?", "Supply for Player 1 and Player 8 registered.", and "This is not a result. Registered actions are resolved at the end of the round." |
| Card | The release's: "Rescues you have left: 1."; **Supply results**; "Your Round 3 Supply granted one weapon each to Player 1 and Player 8."; "No players received a weapon from your Round 3 Supply."; "You received one ordinary weapon from Supply in Round 3."; "Supply result history is unavailable for this match." Proposed: the stamp **Delivered** |

### 15.9 Tests to port

The slice 3 rules in `abilities-capture.mjs` and `abilities-check.mjs`: two vials, as many full as the count, full first; nothing of a recovery on a Rescue's receipt; the cross only on a Rescue; the cell spent exactly on the receipt; nothing that tells the Disablers apart in the strip, and the Blue and Red strips identical; Supply's tags and the strip's words in seat order, tied exactly on the receipt; every slip in the release's words, its tags in seat order and matching the players it names, a recipient's tag the recipient's own, DELIVERED exactly with a tag; the release's words quoted from `en.ts` and `comic-shell.ts`. The flows (`board-motion-flows.mjs`) add a live Rescue whose vial drains once and whose recovery is the same public cue on both boards, the Blue and Red Disablers compared, a Supply picked out of seat order, and a slip that drops in once and is at rest when the card opens again. In the board capture, no stamp covers the strip's words.

## 16. Slice 4: the shot and Protection

**A proposal**, on the same base and tuple as slices 1 to 3. Review pictures: `design/abilities/review/contact-shot-protection.png`. Scenarios: `shot.choose`, `shot.confirm`, `shot.pending`, `shot.registered`, `shot.officer`, `shot.undercover-confirm`, `shot.alien-confirm`, `protect.choose`, `protect.confirm`, `protect.registered`, `guard.card`, `guard.used`, `guard.self`, `weapons.officer-spent`, `weapons.officer-supplied`, `alien.weapon`; the panel's **Private facts, to this seat alone** grants Player 5's Protection and then uses it up. Reference code: `design/abilities/js/guard.js`, its styles in `abilities.css` (the slice 4 block), wired in `app.js` (`stripContent`, `stripBeats`, `drawCard`, `deliverPrivate`).

### 16.1 What changes for a player

- **A shot.** In the strip of any seat that shoots, the picked player's chip in a **reticle** beside the question, and at the start of the detail line **the rounds the seat holds**, as many as the view counts. On the receipt (the neutral **Registered** stamp and "This is not a result. Registered shots are resolved at the end of the round.") the round the shot used **leaves the rack** once, when the view's count falls. Nothing says the target is hit. **The Officer's shot from Round 1, the Undercover's, and an Alien's (or anyone's) supplied weapon use the same strip, part for part.** A hit, if there is one, is the public health change at the end of the round, the same for every cause and from no direction.
- **The weapons note.** In every seat's card: the rounds it holds and the release's sentence, **Ordinary weapons you hold: 1.** At 0 the sentence stands alone.
- **Protection.** In the Undercover's strip the picked player's chip **on a shield**; the receipt is the neutral Registered stamp and **not a grant**. Once the view carries it, the Undercover's card shows **a note per Protection** on slip paper: the chip on a whole shield, **Protection for Player 5: active from round 3.**; when the view says it was used, the chip **drawn whole before a shield split in two**, **Protection for Player 5: used up.** The shield shakes once as it splits. The seat's own is "yourself". Nobody else's phone shows any of it.

### 16.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| Shot's target | the picked seat (`REGISTER_SHOT.targetSeatId`), its lobby identity | Only while a shot is chosen, confirmed, sent or its receipt shows. Direct targeting: the shooter and the target, no third player (direct-shot-2026-09-26) |
| Rounds in the strip | `self.ordinaryWeapons` | Full ones first. The weapon is used when the shot is accepted (the engine spends it at acceptance; v2.1 consumes a shot's resources whatever its outcome, `protection.on_block`); **a round is drawn spent when the count falls**, never on the receipt by itself. Keep the count the seat held when it sent the shot (`weaponsAtSend` in the prototype) and, on an accepted receipt, draw that many minus the view's count as spent |
| The strip itself | the offer (`legalTargets.REGISTER_SHOT`, `self.shotAvailable`) | Opens only when the view offers a shot: the Officer's from Round 1 in nine-player mode, others' from Round 4. **Never read the role**: the Officer's, the Undercover's and every supplied weapon's strip is one component |
| Weapons note | `self.ordinaryWeapons`, every seat | The release's sentence (`en.knowledge.weapons`) for every seat, whatever the count, and as many rounds. A picture of the knowledge line: the card's list need not repeat it |
| Protection's target | the picked seat (`PROTECT.targetSeatId`) | The shield behind the chip, only while Protection is chosen, confirmed, sent or its receipt shows. The receipt is not a grant: the round's resolution grants it only if the player is still in the game |
| Protection notes | `knowledge.protections[]`: `seatId`, `activeFromRound`, `consumed` | **Only the Undercover's view carries it** (V1-17); a player can be given one only once a match, reserved when it is registered (V1-15): draw the notes from the field, never from the role. In the view's order. `consumed` gives used up; otherwise "active from round N", **N as the view says**: never compare it with the present round (the release does not). The seat's own as "yourself" (`en.action.who`) |

### 16.3 Markup and hooks

- Strip: `.ab-target[data-mark="reticle"|"shield"]` (aria-hidden) floated beside the question, holding an `.ab-chip[data-seat]` and `.ab-target__mark`; for a shot, at the start of `.bm-strip__detail`, `.ab-rounds[data-count] > .ab-round[data-spent]` (aria-hidden; the full ones first, then the spent). A round's full look is its `::after`, so that spending is a beat of its own on an element already drawn spent.
- Card: `.ab-kit[data-kit="weapons"]` (the rounds and `.ab-kit__words`, visible text) after the role card and the Cracker's note; then `ul.ab-guards > li.ab-guard[data-guard][data-used]`, each with `.ab-target.ab-guard__mark[data-mark="shield"|"shield-used"]` (aria-hidden, the player's chip in it) and `p.ab-guard__words` (visible, the release's words).
- Nothing in the kit or the strip carries `data-device`, `data-team` or a role's name.

### 16.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-reticle` | 56 x 56 | center (28, 28), clear within r 19 | Round a shot's target chip: a ring and four ticks, outside the face |
| `dossier-shield` | 48 x 56 | window (24, 25), r 17 | Behind a Protection's target chip, in the strip and on a note |
| `dossier-shield-used` | 48 x 56 | window (24, 25), r 17 | A Protection used up: the shield split in two and parted behind the chip, which is drawn whole (the shield was spent, not the player) |
| `dossier-round` / `dossier-round-spent` | 14 x 30 | base (7, 28) | An ordinary weapon held / used. Same silhouette, so the full one lies exactly over the spent |

All neutral, the same for every seat that shoots. Same loading rule as before: the whole kit on every player phone, whatever its role.

### 16.5 Layout

Where the strip already had room: the target beside the question, the rounds at the start of the detail line, the board keeping its height at 390 x 844 and 320 x 568. In the card the notes come after the role card. Without a file the card fits both phones without scrolling at the default text size; with one (the Alien's Code and a received weapon) the card may scroll, the file whole in its first view. At large text the notes' words grow with the reader's text and the card scrolls.

### 16.6 Motion

| | Shot | Protection |
| --- | --- | --- |
| Normal | When the view's count falls while the receipt shows, the round used leaves the rack (220) | When the view first says a Protection is used up, the split shield shakes and settles (260) |
| Reduced | The round is simply spent | The note is simply used up |
| Static | The reticle, the rounds, the words | The shields, the words |
| Cancel | As every strip; reduced motion finishes a beat at once | As the shot |
| Replay | Never: only a fall of the count spends a round | Never: a Protection this page has shown used up is drawn at rest, and a fresh page, a reconnect or a duplicate snapshot draws it at rest |

### 16.7 What it must never show (review with Balance)

- Who shoots: no role, team, device, color or word in the strip. The Officer's, the Undercover's and an Alien's strips are compared part for part.
- A shot's receipt that reads as a hit; a round spent ahead of the count; a third player in a shot.
- A Protection anywhere but the Undercover's own strip and card. The recipient, the public, and a shooter or Disabler whose attack it stopped see nothing of it: their receipts are the same as for any other, and nothing public changes when it is granted or used. No "active now" worked out from the round; no "blocked", "saved" or "stopped".

### 16.8 Words

| Where | Words |
| --- | --- |
| Strip | The release's, unchanged: "Choose a target", "Register a shot at Player 5?", "Shot at Player 5 registered.", "This is not a result. Registered shots are resolved at the end of the round.", "Who is the Protection for?", "Register Protection for Player 5?", "Protection for Player 5 registered.", "This is not a result. Registered actions are resolved at the end of the round." |
| Card | The release's: "Ordinary weapons you hold: 1."; "Protection for Player 5: active from round 3."; "Protection for Player 5: used up."; "Protection for yourself: active from round 4." |

### 16.9 Tests to port

The slice 4 rules in `abilities-capture.mjs` and `abilities-check.mjs`: as many full rounds as the count, a spent one only on a shot's receipt; the reticle only on a shot and the shield only on a Protection; nothing in a shot's strip that says who shoots, and the Officer's, the Undercover's and an Alien's strips identical; every Protection note in the release's words, in the view's order, its shield as the view says; the weapons note in the release's words with as many rounds; the words quoted from `en.ts`; the notes drawn from `knowledge.protections`, never the role; nothing in the kit that works out whether a Protection is active or speaks of an attack stopped. The flows (`board-motion-flows.mjs`) add the Officer's Round 1 shot from the pick to the empty card, the three shooters compared, a round spent once (and at rest with reduced motion), and a Protection registered, granted and used up with no cue on any screen and a shake that plays once.

### 16.10 Open: the Officer's one shot

The view counts the Officer's weapons as it counts anyone's, and a weapon supplied after the Officer's shot counts too (V1-16: received, never a second shot). The card then says, as the release does, **Ordinary weapons you hold: 1.**, with one round, and the server offers no shot. Nothing in the view says the Officer's one shot is spent (`self.shotAvailable` means a legal target now), so the card cannot show that weapon as one that cannot be used. [DSN-REQ-15](integration-requests.md#dsn-req-15) asks for a lasting own field; until then the scenario `weapons.officer-supplied` shows the gap. Nothing else on the phone says it today: the role card names the role, its team and its device, and no rule.

## 17. Slice 5: the ballots, the release request, a Hack and Pass

**A proposal**, on the same base and tuple as slices 1 to 4. Review pictures: `design/abilities/review/contact-ballots-hack-pass.png`. Scenarios: `vote.election`, `vote.confirm`, `vote.recorded`, `vote.jail`, `vote.abstain`, `vote.abstained`, `vote.runoff`, `release.choice`, `release.confirm`, `release.requested`, `release.vote`, `release.vote-yes`, `release.vote-no`, `release.voted`, `hack.choose`, `hack.confirm`, `hack.requested`, `hack.phase`, `hack.partner`, `pass.confirm`, `pass.passed`. Reference code: `design/abilities/js/ballot.js`, its styles in `abilities.css` (the slice 5 block), wired in `app.js` (`stripContent`, `stripBeats`, `drawCard`).

### 17.1 What changes for a player

- **A ballot.** In the strip of a Captain election, its runoff or a Jail vote, a **ballot box** at the start of the detail line; once a player is picked, **the seat's own slip** beside the question: the pick's chip in the box, **ticked**. An abstention is **a blank slip with a dash**. On the receipt (the neutral **Registered** stamp, "This is not a result. The count is shown to everyone when the vote closes.") the slip **drops into the box**, its edge left standing in the slot. No count and nobody else's ballot is ever drawn on a phone: the count is public as the board's tally (PR #88), the same on every screen.
- **A release vote.** The same slip carries the jailed player's chip, **ticked** for Yes or **crossed** for No; Abstain is the blank slip.
- **The Captain's release request.** The jailed player's chip in a **key ring**, small at the start of the detail line (the long label "Release request" leaves the question too little room beside it). "No release request" draws nothing.
- **A Hack.** The request: the asked player's chip in a **comms ring** beside the question; the receipt says the request is accepted, not the Hack. While the server says two players are in one, **each of them sees the same note** in the card: its own chip and the other's **joined by a coiled cord**, and the release's words, **Hack: you and Player 5.** The cord runs once, the first time the card shows that Hack.
- **Pass.** The speaking turn's **microphone** at the start of the Pass strip, held while the seat confirms, **handed on** once the server accepts Pass (its dashed outline stays). The turn moving on is the board's public turn cue.

### 17.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| The ballot box | the ballot's offer (`legalTargets.VOTE`, `self.releaseVoteAvailable`), the receipt | Empty while the seat chooses and confirms; posted only on an accepted ballot |
| The seat's own slip | its own choice (the command it is about to send: `VOTE.targetSeatId`, or `RELEASE_VOTE.approve`) and the release vote's subject (`ballot.releaseTargetSeatId`) | Names one player at most: the pick, or the subject; nobody for an abstention (`targetSeatId: null`, `approve: null`). **Never `lastTally`, never `ownBallot` from another phase, never anyone else's choice** (V1-10) |
| The key ring | the Captain's choice (`RELEASE_CHOICE.targetSeatId`) | The Captain's own strip only. "No release request" (`null`) draws nothing |
| The comms ring | the asked seat (`REQUEST_HACK.targetSeatId`) | The receipt is the request accepted, not the Hack (the Hack phase opens when the turn closes, PASS-02) |
| A Hack's note | `hackPartnerSeatId`, the seat's own and the partner's lobby identities | **Each partner's view carries the other**, and both draw the same note. Never read who is active or who asked, and never the role: what a player may say in a Hack depends on its role (v2.1 `standard_hack.truth_rule`), and nothing in the note may hint at it |
| The microphone | the Pass offer (`legalTargets.PASS_TURN`), the receipt | The same for every seat (PASS-01); handed on only on the accepted receipt |

### 17.3 Markup and hooks

- Strip: `.ab-target.ab-ballot[data-mark="ballot"][data-vote="for"|"yes"|"no"|"abstain"]` (aria-hidden) floated beside the question, holding the chip (none for an abstention), `.ab-target__mark` and `.ab-ballot__pencil[data-pencil="tick"|"x-mark"|"dash"]`; at the start of `.bm-strip__detail`, `.ab-box[data-posted]` for a ballot, `.ab-target[data-mark="key"]` for the release request (small; its seat badge hidden, the words name the player), `.ab-mic[data-passed]` for Pass; beside the question `.ab-target[data-mark="comms"]` for a Hack's request.
- The box's posted slip edge and the held microphone are their `::after`, so that posting and handing on are beats of their own on elements already drawn at rest.
- Card: `.ab-kit[data-kit="hack"][data-partner]` with `.ab-link` (aria-hidden: the seat's own `.ab-chip`, `.ab-link__cord`, the partner's `.ab-chip`) and `p.ab-kit__words` (visible, the release's words). It replaces the plain line the prototype listed under "What you know".
- Nothing carries `data-device`, `data-team`, a role's name, or who asked.

### 17.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-ballot` | 48 x 56 | window (24, 25), r 15 | The seat's own ballot slip, a chip in its box |
| `dossier-ballot-edge` | 18 x 12 | slot (9, 11) | The slip's top edge standing in the box's slot |
| `dossier-tick` / `dossier-x-mark` | 24 x 24 | center (12, 12) | The pencil on a slip: a vote or Yes / No. Haloed in paper, so that they read over a chip |
| `dossier-ballot-box` | 36 x 34 | slot (17, 9) | The ballot box at the start of the detail line |
| `dossier-key-ring` | 48 x 48 | ring (24, 26), r 20 | Round the jailed player's chip in the Captain's release request |
| `dossier-comms` | 56 x 56 | center (28, 28), clear within r 17 | Round the asked player's chip in a Hack's request |
| `dossier-cord` | 64 x 24 | from (2, 12) to (62, 12) | Between the two partners' chips in a Hack's note |
| `dossier-mic` / `dossier-mic-passed` | 22 x 36 | base (11, 34) | The speaking turn, held / handed on. Same silhouette, so the held one lies over the outline |

All neutral. Same loading rule as before: the whole kit on every player phone, whatever its role.

### 17.5 Layout

Where the strip already had room: the slip and the comms ring beside the question, as every target; the box, the key ring and the microphone at the start of the detail line. All of it fits 390 x 844 and 320 x 568 with the board keeping its height. The Hack's note is one row in the card (two chips, the cord, the words), the card unscrolled at the default text size; at large text the words grow and the card scrolls.

### 17.6 Motion

| | Ballot | Hack's note | Pass |
| --- | --- | --- | --- |
| Normal | On the receipt the slip drops into the slot (240) | The first time the card shows a Hack, the cord runs from chip to chip (320) | On the receipt the microphone is handed on (240) |
| Reduced | The slip stands in the slot | The cord is whole | The outline is drawn |
| Static | The slip, the box, the words | The chips, the cord, the words | The microphone, the words |
| Cancel | As every strip; reduced motion finishes a beat at once | As the ballot | As the ballot |
| Replay | Never: once, for its receipt | Never: once a Hack in a page; a duplicate snapshot, a second opening or a reconnect draws it at rest | Never: once, for its receipt |

### 17.7 What it must never show (review with Balance)

- Anyone else's ballot, a running count, or a count on a phone at all: the tally is the board's, published when the vote closes (V1-10).
- A ballot posted before the server accepts it; a slip naming more than one player.
- Who asked for a Hack on a partner's note (both partners' notes are compared), and any word about truth or lies in it: whether a player may lie depends on its role.
- A Hack's partner anywhere but the two partners' own cards: the public sees the Hack phase and whose turn it is, nothing more.
- Anything role-dependent in a ballot, a Hack or Pass.

### 17.8 Words

| Where | Words |
| --- | --- |
| Strip | The release's, unchanged: "Who do you vote for as Captain?", "Vote for Player 5 as Captain?", "Abstain from this vote?", "Your vote for Player 4 is recorded.", "Your abstention is recorded.", "Vote yes to releasing Player 9?", "Vote no to releasing Player 9?", "Ask for a vote on releasing Player 9 from Jail?", "Release vote for Player 9 requested.", "Request a Hack with Player 5?", "Hack request with Player 5 accepted.", "End your turn now?", "Turn passed.", and the details "This is not a result. The count is shown to everyone when the vote closes.", "Your turn ends when the server accepts Pass." |
| Card | The release's: "Hack: you and Player 5." |

### 17.9 Tests to port

The slice 5 rules in `abilities-capture.mjs` and `abilities-check.mjs`: a slip names the seat's own pick, a release vote's subject or nobody, its pencil its answer; the box posted exactly on an accepted ballot; no count in a ballot's strip; the key ring only on a release request and the comms ring only on a Hack's request; the microphone only on Pass, handed on exactly on its receipt; a Hack's note in the release's words, the seat's own chip joined to its partner's, nothing of who asked or of what may be said, and the two partners' notes identical; the words quoted from `en.ts`; nothing in `ballot.js` of a role, a count or of truth and lies. The flows (`board-motion-flows.mjs`) add a ballot picked, abstained, posted once and unseen by the other screens; a release vote's Yes and No; the Captain's release request; a Hack's request and its note, the cord run once and never again, the same on the asked partner's phone; Pass handed on once, and with no beat in reduced motion.

## 18. Slice 6: the showdown and the match's end

**A proposal**, on the same base and tuple as slices 1 to 5. Review pictures: `design/abilities/review/contact-showdown-end.png`, and the board's storyboards of `cue-end-reveal` in `design/board-motion/review/motion/`. Scenarios: `showdown.choose`, `showdown.confirm`, `showdown.registered`, `end.blue`, `end.alien-co`, `end.red`, `end.alien`, `end.draw`, `end.aborted`, and the fixture panel's public facts "The match ends: Blue wins" and "The host ends the match" (`?play=finish`, `?play=abort`). Reference code: `design/abilities/js/finale.js` and its styles in `abilities.css` (the slice 6 block) for the showdown, wired in `app.js` (`stripContent`, `stripBeats`); the match's end is public, so it is the board's: `drawResult()` and `drawStatus()` in `app.js`, the end's cue in `director.js`, its styles in `board.css` (the result sheet), its contract in `design/board-motion/contract/` (`cue-end-reveal`, the fact `match-end`, the component `result-sheet`).

### 18.1 What changes for a player

- **The showdown.** In the Final Zone every player still in the match registers one special shot (final-showdown-decision, option 1). Its strip draws the target **in the same reticle as an ordinary shot** and, at the start of the detail line, **the special shot**: a round in caption yellow with a double band, full while the server offers it, **spent** (the ordinary round's dashed outline) on the receipt, which is the neutral **Registered** stamp and "This is not a result." Every target stays secret until the shots resolve, one at a time, as the board's public health changes. **Every seat in the Final Zone sees the same strip**, whatever its role.
- **The match's end, on every screen alike.** A **result sheet** over the lower board, on this phone, every other phone and the shared display: **the winner struck on a ribbon** in its side's colour (striped paper for a draw), the Alien's co-win beneath it, then **the cast list**: the release's table of roles drawn in two columns (one at large text), each seat's character, its label ("Player 3 (you)" on its own phone, as the release labels it) and **its role in its side's colour**, in seat order; the Code's four rows **pinned** with a punched card, and **the Code's sentence in seat order**. A match **the host ended** shows its sentence alone, on plain paper: no winner, nothing revealed.
- **The status bar at the end** says "Match finished" or "Match ended by the host" (both lines if it needs them) and, where the timer was, a dash in a dashed box, read as the release's "This phase has no timer".
- **As in the release, the card and the actions close for good**: their buttons stay in place, marked unavailable (the prototype keeps them focusable with `aria-disabled`, a proposal; the release disables them), a choice in progress or a receipt leaves with the match, and an open card or tray closes. Pass is not offered. The menu stays, and covers the sheet on this phone as the release hides its result behind the menu.

### 18.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| The showdown's reticle | the picked seat (`SHOWDOWN_SHOT.targetSeatId`) | The seat's own strip only; the same mark as an ordinary shot |
| The special shot | the offer (`legalTargets.SHOWDOWN_SHOT`), the receipt | Full while offered; spent only on the accepted receipt: used then, with no refund or redirect (V1-20). The view carries no lasting spent shot (the offer simply ends), so nothing outside the receipt draws it |
| The result sheet | `phase.kind` (`FINISHED` or `ABORTED`), `result.winner`, `result.alienCoWinner` | The release's `buildResult()` words. Shown at a terminal phase only; `ABORTED` has no `result` |
| The cast list and the Code | `endReveal.roles`, `endReveal.code`, the seats' lobby identities | **Only at `FINISHED`, only from the public view** (the contract carries `endReveal` then and only then; V1-18), in seat order whatever order the view lists them in. A row's side is `data-end-faction`, worked out from the role the end reveal names. **Never from `self.role` or `knowledge`, never on the board's pieces, never device art** |
| The terminal status | `phase.kind`, `phase.endsAt: null` | The release's `timer.none` words; no `role="timer"` |

### 18.3 Markup and hooks

- Strip: beside the question `.ab-target[data-mark="reticle"]` (as slice 4); at the start of `.bm-strip__detail`, `.ab-special[data-spent]` (aria-hidden). The full round is its `::after`, so that spending is the slice 4 beat (`spend()`) on an element already drawn spent.
- The result sheet (the board's, public): `section.bm-result[data-ended="finished"|"aborted"][data-winner]` (a labeled region, `tabindex="0"` because it scrolls at large text) with `h2.bm-result__heading`, `p.bm-result__outcome` (the ribbon), `p.bm-result__line` (the co-win), `table.bm-cast` (explicit table roles, so that its meaning survives the cards' layout: `caption` "Roles", a visually hidden header row "Player" / "Role", `tr.bm-cast__row[data-seat][data-end-faction][data-code][data-self]` with `th.bm-cast__who` (`.bm-cast__chip[data-character]`, aria-hidden, and `.bm-cast__label`) and `td.bm-cast__role` (`.bm-cast__name`, and `.bm-cast__pin` on the Code's rows, aria-hidden)), and `p.bm-result__code` with its pin. It maps onto the release's `renderResult()` (`.ms-result`, `.ms-result__outcome`, `.ms-result__line`, `table.ms-result__roles > tr[data-seat]`).
- Status: `header.bm-status[data-over]`, `.bm-timer[data-state="none"]` holding an aria-hidden dash and the visually hidden words.
- Navigation at the end: `#bm-nav-card` and `#bm-nav-actions` with `aria-disabled="true"`.
- Nothing in the showdown strip carries `data-device`, `data-team` or a role's name; nothing in the result sheet comes from the ability kit (`ab-` classes), the private card or the seat's own view.

### 18.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `dossier-round-special` | 14 x 30 | base (7, 28) | The showdown's special shot, full. Spent, it is `dossier-round-spent` (slice 4): the same silhouette, so the full round lies over the outline |

Neutral, in the kit's one stylesheet, loaded on every player phone whatever its role. **The result sheet uses no ability art**: it is public and drawn on the shared display too, which does not load the kit. Its pictures are the public board's approved crew cards (`piece-crew-card-c1` to `c9`, behind `[data-art~="public-board"]`); its ribbon, cast cards and the Code's pin are CSS in the tokens' colours (the faction colours `--ms-color-faction-blue`, `-red`, `-alien` for the winner and each role's side). **No device art at the end**: the roles are words in their side's colour. The planned "every character's card flips to show its device" of the inventory is not used: it would put device art outside the private card, where the board check refuses it, and require the roles bundle on the shared display. The owner may ask for it (DSN-D37).

### 18.5 Layout

The showdown strip is slice 4's: it fits 390 x 844 and 320 x 568 with the board keeping its height. The result sheet lies over the lower board like the card and the tray, above navigation, at most 62% of the phone's height (70% on a short phone and in the other screens' frame, where its parts are tighter); the board keeps its size and the Command Room stays in view. At 390 x 844 and 320 x 568 everything fits without scrolling; at twice the text size the cast list takes one column and the sheet scrolls inside itself. In a sheet whose content is under 300 px wide (the 320 px phone's, and the other screens' frame) a container query takes the character and the role down a step, so that every role's longest word fits its card on one line.

### 18.6 Motion

| | The special shot | The end (`cue-end-reveal`, public) |
| --- | --- | --- |
| Normal | On the receipt the round leaves the strip (220, slice 4's `spend()`) | 900 ms, `motionMs.comicBeatMaximum` (240 / 260 / 400): the sheet rises; the winner is struck; the rows turn up one after another (20 ms apart, 200 ms each), each Code pin stamped on its row; the Code's sentence last. An ended match: the rise alone |
| Reduced | No beat: the spent outline is drawn | The whole sheet with the 80 ms fade |
| Static | The reticle, the round, the words | The sheet, every word |
| Cancel | As every strip; reduced motion finishes the beat at once | A reconnect, the page going to the background, or reduced motion switched on mid-reveal: the sheet stands as it is at once |
| Replay | Never: spent once, for its receipt | Never: not on a page that loads at the end, a duplicate snapshot, a reconnect or the menu closing |

The end's cue is a proposal with its own entry in `design/board-motion/contract/cues.json`: public, started only by the view's phase turning terminal on a page that drew the match before, marking only what the sheet already says (every word is in the document, and said once by the public live region, from the first frame), changing nothing and delaying nothing.

### 18.7 What it must never show (review with Balance)

- A showdown target anywhere but the shooter's own strip, or the shot spent before the server accepts it; anything role-dependent in the showdown strip (the check compares, the capture measures).
- A role, a side or the Code before the match finished, or at a match the host ended; a role drawn from the seat's own view rather than the end reveal; an end hook or a role word on the board's pieces (the capture measures every screen; the flows compare both boards).
- A winner the view does not name, or a result when the host ended the match: at `ABORTED` the contract carries no result and no end reveal, and the release says only the host's sentence.
- Device art, team colours or role hooks outside the result sheet.

### 18.8 Words

| Where | Words |
| --- | --- |
| Strip | The release's, unchanged: "Choose a target", "Register a showdown shot at Player 5?", "You cannot change or withdraw it here once it is registered.", "Register shot", "Sending your shot to the server…", "Showdown shot at Player 5 registered.", "This is not a result." |
| Result | The release's (`en.result`), unchanged: "Result", "Blue wins.", "Red wins.", "The Alien wins.", "Nobody wins. The match is a draw.", "The Alien wins with Blue.", "The host ended this match. There is no winner.", "Roles", "Player", "Role", "The Code was: Player 1, Player 4, Player 6, Player 8.", the labels "Player N" and "Player N (you)" |
| Status | The release's: "Match finished", "Match ended by the host", "This phase has no timer" |

No new words: the ribbon, the cast cards and the pins say nothing the words do not.

### 18.9 Tests to port

The slice 6 rules in `abilities-capture.mjs` and `abilities-check.mjs`: the special shot only in the showdown's strip, spent exactly on its receipt, the strip the same whoever shoots; the reticle for a shot or a showdown shot only; nothing of the ability kit in the result sheet; no role drawn before a finished match; nothing in `finale.js` of a role, a hit or the end. The board's (`board-motion-check.mjs`, `board-motion-capture.mjs`): the fixtures' result and end reveal only at `FINISHED`, every seat's role once, the viewer's its own, the Code with the Alien and without the Undercover, a revealed faction its role's; an end hook only in the result sheet; a role word or an end hook nowhere else on any screen; the sheet clear of the status bar and navigation, nothing in it cut off. The flows (`board-motion-flows.mjs`) add the showdown picked, registered, spent once and unseen by the other screens, and with no beat in reduced motion; the end: the winner, the roles in seat order in their sides' colours, the Code in seat order, the same on the other screens but for "(you)", one reveal cue on each, the timer's words, Card and Actions closed with nothing private in the page, a choice, a receipt and an open card leaving with the match, nothing played again on a duplicate, a reconnect, a load at the end or the menu closing, the host's ending with nothing revealed, and reduced motion, also switched on mid-reveal.

### 18.10 Open

- **A Final Zone scene.** The board draws the Final Zone on the page's paper with the approved halftone and speed lines (board-motion GAP-6). A scene of its own, two rows of places facing each other as the inventory planned, is design work for a later slice; it needs no contract change.
- **Card and Actions at the end.** The release disables them; the prototype marks them `aria-disabled` so that focus stays where it was when the match ends. Frontend's call.

## 19. Slice 7: the marks in the tray, the failure states, movement and health

**A proposal**, on the same base and tuple as slices 1 to 6. Review pictures: `design/abilities/review/contact-icons-failure.png`. Scenarios: `tray.open`, `tray.undercover`, `tray.cracker`, `tray.disabler`, `tray.supplier`, `tray.showdown`, `tray.vote`, `tray.release`, `tray.release-vote`, `robust.stale`, `robust.unreadable`, `stale.card`, `stale.card-notes`, `file.hidden`, and the fixture panel's "An update could not be read" and "Keep the card on an out-of-date view (DSN-REQ-16)". Reference code: the icons in `abilities.css` (the slice 7 block) and `source/actions.svg`; the banner, its clearance and the card kept out of date in `app.js` (`drawBanner`, `goStale`, `restoreView`, `reconnectNow`, `cardVisible`, `pausePrivate`, `drawCard`) and `board.css`; `pauseFile()` in `dossier.js`.

### 19.1 What changes for a player

- **The tray.** Each action the seat's own view opens has its chip's caption-yellow disc hold **its own mark, the strip's**: the reticle (the reviewed `icon-action-shot`), the Disable's charged ring, the shield, the cross, the lens, the tag, the comms, the punch card, the special round, the ballot box (every ballot, a release vote too) and the key. **The same for every role**: both Disablers see the same ring, and nothing in a mark names a role. Without the art, the glyph stays, and the label beside it says the action in words.
- **Out of date.** When the connection is lost, or the latest update could not be read, **the release's banner** says so in its words, with its one control, **Reconnect now**, and the reviewed **stale-connection icon**. The change is said once, as the release says it ("Connection lost. Showing the last known state." / "The latest update could not be read."). The actions pause ("Actions are paused until the connection is restored."), and a choice not sent is dropped and said so. Pressed, Reconnect now waits (pressed again, nothing more is asked); the fresh view arrives, the banner leaves, and it is said once: **"Reconnected. Round 2. Your turn."** (or "Up to date again. …" after an unreadable update). **Nothing plays** on that reconnect.
- **Every sheet keeps clear of the banner.** The menu, the tray, the card and the end's result sheet open below it, so that their heading and Close stay in view on a 320 x 568 phone, where Frontend found the release's banner covering an open card's heading and Close.
- **The card on an out-of-date view: both behaviours, for DSN-REQ-16.** By default, PR #88's rule: the **closed folder**, the same for every role. Where the release's behaviour is asked for (DSN-REQ-16, recommended), the card **stays**: its file **at rest** (whatever moved finishes; the card is not drawn again, so focus stays where it is; an inspected snapshot is put back, and focus in its card goes back to the snapshot, as Back does; no snapshot can be pressed, its facts would be the stale view's; a first open does not assemble) and, while the view **may be out of date**, one mark at its top: **May be out of date** (proposed words), the same for every role, with the stale-connection icon. When only a turn's time is up, the card stays at rest **without the mark**: the view is not out of date. The background still conceals it, as the release does.
- **Movement and health** are PR #88's board, recorded in the inventory as delivered: the room tags, the walk, the hit, the bandage, the fall, the markers. **No door slam and no hatch**: the walk into the Jail or the Command Room is the public move, and the Jailed and Captain markers are the status change. A cue adds no fact.
- The other failure states were already drawn and are recorded here: the **Not accepted** stamp (hatched, no red) with the receipt's own reason, the **Unknown** stamp with Check again, an unavailable Pass or room said in words, and paper-and-ink fallbacks for every picture.

### 19.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| A chip's mark | the tray's offers (`legalTargets`, the availability flags) | One per action kind; the tray is the seat's own. A mark never depends on the role |
| The banner | the client's own connection (`ShellEnvironment.connection` stale, `env.problem` `unreadable-update`), as the release's `buildBanners` reads it | Local to the device; never a game fact. The words and the control are the release's |
| The announcements | the same, and the view's round and phase | The release's `announcements.ts`: once per change, in the public live region |
| The card kept | the release's private area (`open = revealed && !concealed`), DSN-REQ-16 | Kept only where asked; PR #88's folder by default |
| The out-of-date mark | the connection state above | Only while the view may be out of date; never for a turn's time up |

### 19.3 Markup and hooks

- Tray: `.bm-chip__icon[data-kind="<kind>"]` (aria-hidden), the kit drawing `--ab-asset-icon-action-<mark>` behind `[data-art~="abilities"]` and the Shot the reviewed `--ms-asset-icon-action-shot-ink` behind `[data-art~="player-ui"]`, its glyph then transparent.
- Banner: `div.bm-banner[role=note][data-variant="stale"|"unreadable"]` with `.bm-banner__icon` (aria-hidden; the reviewed `--ms-asset-icon-connection-stale-ink` behind `[data-art~="public-board"]`), `p.bm-banner__text` and `button.bm-banner__act[data-act="reconnect"][aria-disabled]`. It maps onto the release's `.ms-banner--connection` and its `session/reconnect` button. Drawn again only when it changes, so that focus on its button survives an update.
- Clearance: the phone's `--bm-banner-clear` (the banner's bottom edge, measured as it is drawn and again whenever its height changes: its words wrap with the width and grow with the reader's text, so the prototype observes the banner's size), and every sheet's `max-height: min(…, var(--bm-sheet-room))`. The banner's words and its button are sized in `rem`, as the release's `.ms-banner` is.
- The card kept: `p.bm-card-stale[role=note]` under the card's heading (its icon aria-hidden), put in and taken out in place: going out of date or current again never draws the card again, so focus stays; the file's `data-paused`, its snapshots `aria-disabled`.

### 19.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `icon-action-disable`, `-protect`, `-rescue`, `-scan`, `-supply`, `-hack`, `-code`, `-showdown`, `-ballot`, `-key` | 32 x 32 | center (16, 16) | A tray chip's mark, drawn at 20 px in its 26 px disc. One ink, a 2.6 stroke with round ends, in the reviewed `icon-action-shot`'s idiom |

Neutral, in the kit's one stylesheet, loaded on every player phone whatever its role. The Shot keeps the reviewed `icon-action-shot`; the banner and the mark use the reviewed `icon-connection-stale`. Named `icon-action-*`, ready for a reviewed export revision (DSN-D36).

### 19.5 Layout

The marks fill the existing disc; nothing in the tray moves. The banner is the prototype's, now a grid (its icon, its words, its button beneath them); it is about 100 px tall at 320 px wide, and every sheet's room is what is left below it. With the card kept, the banner leaves it less room, at 390 x 844 as at 320 x 568: its first view holds its heading, Close, the mark, the hint and the role card, and it scrolls to the file (the only card that scrolls at the default text size without notes; the capture measures that first view). At twice the text size the banner grows and the sheets with it.

### 19.6 Motion

| | The marks | The banner | The card kept |
| --- | --- | --- | --- |
| Normal | None: the tray's own rise (PR #88) | None; its change is said once | None: at rest, nothing assembles, drops in, cracks or runs |
| Reduced | The same | The same | The same |
| Static | The mark, or the glyph without the art | The banner | The card at rest, marked |
| Cancel | As the tray | A reconnect settles at once | Whatever moved finishes when the view goes out of date |
| Replay | Never | Never: a reconnect plays nothing | Never: a file first opened on such a view does not assemble later |

### 19.7 What it must never show (review with Balance)

- A tray mark that tells a role: the same ring for both Disablers, Supply's tag not the Supplier's, a Hack's comms not the Hacker's.
- A card marked out of date when the view is only timed out, or a kept file that can be pressed (its inspected facts would be the stale view's).
- A guessed reason for a rejection: only the receipt's codes.
- A banner over an open sheet's heading or Close.

### 19.8 Words

| Where | Words |
| --- | --- |
| Banner | The release's: "Connection lost. Showing the last known state, which may be out of date. Reconnecting…", "The latest update could not be read. Showing the last known state, which may be out of date.", "Reconnect now" |
| Said | The release's: "Connection lost. Showing the last known state.", "The latest update could not be read.", "Reconnected. Round 2. Your turn.", "Up to date again. Round 2. Your turn." |
| Card | **Proposed:** "May be out of date" (the release says it only in its banner) |

### 19.9 Tests to port

The slice 7 rules in `abilities-capture.mjs` and `abilities-check.mjs`: every tray kind has its mark, drawn only behind its art, the Shot the reviewed icon, nothing of a role in the marks; a mark drawn exactly when its art has arrived, its glyph then hidden; the card kept on an out-of-date view only where asked, marked only while the view may be out of date, its file not pressable, an inspected snapshot put back, and its heading, Close and the mark in its first view, and the role card too at the default text size. The board's capture now measures that the banner covers no open sheet's heading (a probe proves it fails with the clearance off). The flows (`board-motion-flows.mjs`) add each tray's marks, every ballot's one mark, eleven marks for eleven actions; the banner's words, Reconnect now waiting and then the fresh view said once with nothing played; the unreadable update and its own words; the menu and the paused tray below the banner at 320 x 568, and still below it when the reader's text doubles with a sheet open; and the card kept: marked, at rest, not pressable, the mark gone when current, an inspected snapshot put back on going out of date with focus going to it, focus elsewhere in the card staying where it was, no mark when only timed out, concealed by the background, and PR #88's folder by default.

### 19.10 Open

- **DSN-REQ-16** (Integration): which behaviour the release keeps. Both are drawn; the mark's words are proposed.
- **The banner's height at 320 px** (about a sixth of the screen) is the release's long sentence; a shorter one is the release's to choose.

## 20. Slice 8: choosing a character, and the role card's reveal

**A proposal**, on the same base and tuple as slices 1 to 7. The setup steps are not on the board, so they have their own prototype: `design/abilities/setup.html` (`js/setup.js`, `css/setup.css`), **a replica of the release's compact setup** (`apps/game/hosted/setup-controls.js`, `role-confirmation.js`, `compact-phone.css`, `phone.css`, `comic-layout.css`): the same markup, ids, classes, attributes and words, with the treatment in `css/abilities.css` (the slice 8 block) and its beats in `js/setup.js`. Review pictures: `design/abilities/review/contact-setup.png`. Scenarios: `select.open`, `select.sending`, `select.confirmed`, `select.crowded`, `select.refused`, `select.retry`, `select.expired`, `role.back`, `role.face`, `role.face-red`, `role.face-alien`, `role.seen`, `role.confirming`, `role.ready`, `role.retry`, `role.assigned`; the panel's public facts (another player takes a character, time runs out, the roles are dealt, a fresh view, the background) and the stand-in server's answer (accept, refuse, lose, slowly).

### 20.1 What changes for a player

- **Choosing.** The release's nine crew cards, three by three. **A taken card is stamped with its taker's seat, PLAYER 4**, in the kit's stamp frame, over the release's grey: who has taken which character is public, and every phone draws it alike, the card's name saying the same ("Vega, taken by Player 4"). A card too narrow for the word at the reader's text size keeps the number alone, larger. **The seat's own pick**: the release's caption ring, **dashed while it is on its way** (and kept dashed after a lost answer, until Retry selection); once the server confirms it, **it pops on the approved landing burst and its check lands**, the release's check drawn as the kit's tick in a caption disc. The timer's end settles every card at once. Nothing of a role exists in the page.
- **The role card, face down.** The reading stage deals the card face down: **the kit's back, the same for every role**: the closed eye of the reviewed `icon-private` on a paper seal over a caption-yellow burst, and the release's words, Tap to reveal, on a band below it. It comes up from the lower edge when the stage begins (the reviewed cue's opening).
- **Turned up by the player**: the reviewed **`cue-role-card-turn`**: the back turns away and the face turns in, **the role's device is put into the hand of the player's own character**, still without its colour, and its colour comes on. The face is the release's card (the role's name, its side, the device in the hand). **Hiding is at once**: face down, the card's face leaves the page; the page going to the background hides it too, and nothing but the player turns it up. Turning it up again turns it again: it is the player's own act.
- **Ready.** Pressed, the card is put away face down at once (as in the release) while Ready is on its way; accepted, **READY is stamped across the seal** of the put-away card: the release's Ready note, with its words. A lost answer: Retry Ready; a refusal: the release's words.
- **Assigned when time ran out**: the server's character on the face, the same back; no new words.

### 20.2 When they are drawn, and from what

| Treatment | Fields | Notes |
| --- | --- | --- |
| A taken card's stamp | lobby identity `seats[].characterId` of another seat | Public. The stamp says the seat; the card's name already says it (the release's `aria-label`) |
| The own pick on its way | the release's own pick while `confirmSetupChoice` is unsettled (`busy`, or kept after a lost answer) | Proposed hook `data-sending` (`true`, or `kept`) |
| The own check and its pop | `seats[].confirmed` of the seat's own seat and its identity's `characterId` | The pop once, for the change this page saw |
| The back | nothing of the seat: the same picture for every role and seat | Also the release's Ready note, which is a `.phone-role-back` |
| The face | the own preview's `self.role`; the seat's own `characterId` | Built only while turned up, as the release does |
| READY | the seat's own `seats[].ready`, or the accepted answer | The stamp once, for the change this page saw |

### 20.3 Markup and hooks

The release's hooks are kept as they are. Proposed additions, all `aria-hidden` (the release's accessible names already say everything):

- `button.crew-option > span.ab-taken[data-seat] > span.ab-taken__word ("Player") + " " + span.ab-taken__seat ("4")`: the stamp. The card is a size container (`container-type: inline-size`); below 6.5 em the word is hidden.
- `button.crew-option[data-sending="true"|"kept"]`: the own pick on its way, or kept after a lost answer.
- `button.crew-option > span.ab-burst`: the pop's burst, there only for its 220 ms (`[data-art~="public-board"]`: the approved `fx-landing-burst.paper`). The picker is `isolation: isolate`, so the burst sits behind the card and above the page.
- `.phone-role-back > span.ab-back-words`: the release's words, wrapped, so that their band grows with them at large text. The release's `::before` icon stands down while the picture is there (the seal carries the closed eye).
- `#setup-ready-waiting > span.ab-ready-stamp ("Ready")`: READY; while the art is there the note's ✓ is transparent, and without it the release's ✓ stays.

### 20.4 Art

| Asset | Box | Anchors | Use |
| --- | --- | --- | --- |
| `setup-back` | 240 x 400 | center (120, 200), seal (120, 200) | The card's back, and the put-away card's: `background: var(--ms-color-steel-shadow) var(--ab-asset-setup-back) center / cover`, inside the release's border. Everything that matters is in the middle 200 x 240, so `cover` may crop the edges at any card height |

Reused: `dossier-stamp` (the taken stamp's frame), `dossier-tick` (the check, READY), the approved `fx-landing-burst.paper`, `piece-crew.card-c*` and `device-*.held`. Neutral, in the kit's one stylesheet, loaded on every player phone whatever its role.

### 20.5 Layout

Nothing in the release's layout moves: the stamps, the check and READY sit over what is there. The taken stamp keeps inside its card (measured); at twice the text size a narrow card keeps the number. The back's words sit on their band 2.4 rem above the card's lower edge, wrapping with the band at large text. **Found while measuring** (the release's, not the treatment's): at twice the text size the release's setup header, a 52 px grid row, cuts "Choose your character" on a 390 px phone; it should take `minmax(52px, auto)`.

### 20.6 Motion

| | Choosing | The card | Ready |
| --- | --- | --- | --- |
| Normal | The own pick confirmed: the pop (`cardTransition`, 220 ms) on the burst, its check landing (`registrationStamp`, 120 ms); another seat's stamp landing (120 ms) | `cue-role-card-turn`, 900 ms: opening 220 (the card comes up face down, at the stage's start), accent 520 (the back to 90°, then the face from −90°, with the device sliding into the hand in grey), settle 160 (its colour) | READY lands (120 ms) |
| Reduced | No pop, no burst: the stamps and the check with the 80 ms fade | The face at once with the 80 ms fade: nothing rises, turns or is put anywhere | The fade |
| Static | The stamps, the ring, the check | The back; the face | READY |
| Cancel | The timer's end settles every card; reduced motion switched on, the panel's or the system's, finishes the pop and the stamps at once | Hiding, the background or a new deal ends the turn at once, face down; reduced motion switched on, the panel's or the system's, finishes it, face up | Reduced motion switched on finishes READY |
| Replay | Never: a load or a fresh view draws everything at rest; the server's assignments at the deal land no stamp (the cards are no longer shown) | Never on a load or a fresh view. Turning it up again turns it again | Never |

The device's slide and colour are animations of the card picture's `::after` (Web Animations' `pseudoElement`), the release's own device layer.

**Reduced motion is the player's or the system's** (`prefers-reduced-motion`). Either, switched on mid-beat with no new fact, finishes everything moving at once (`settleAll()`, from the media query's `change` as from the panel's switch); switched off, nothing plays again, since a beat is only ever for a change the page saw. **The page put away** (`pagehide`): the card concealed and everything at rest, so a page brought back from the back-forward cache resumes nothing; put away for good, the countdown and the stand-in server's answers stop, and the media query's listener is removed. The release's own teardown should do the same. The board prototype's equivalents are Integration's correction on frozen slice 7 (issue #112, PR #113), which is not in this stack.

### 20.7 What it must never show (review with Balance)

- Anything of a role while the card is face down or put away: no word, hook, colour or asset. The back is one picture, the same for every role and seat.
- A taken stamp that says more than its seat, or a card's taker drawn differently on different phones.
- A beat for a fact the page did not see change (a load, a fresh view, a duplicate), or a stamp landing on cards no longer shown.
- A card turned up by anything but the player, or still in the page after Hide.

### 20.8 Words

All the release's (`setup-controls.js`, `role-confirmation.js`), checked verbatim: "Choose your character", "Your role", "Taken. Choose another character.", "Connection interrupted. Retry your selection.", "Retry selection", "Tap to reveal", "Reveal my role", "Hide my role", "Ready", "Confirming…", "Retry Ready", "Ready not confirmed. Try again.", "Ready. Waiting for the timer and other players.", and the card's name "Vega, taken by Player 4". The stamps say "Player 4" and "Ready": the release's own words, `aria-hidden`.

### 20.9 Tests to port

`abilities-check.mjs` (the slice 8 group): the release's words verbatim; the turn's beats the reviewed cue's; the role card built only while turned up and emptied when hidden; the back with no role hook, its picture the kit's; a device only inside the seat's own panel; the stamp from the public holders; beats only for an observed change; the turn only by the player's tap, none in reduced motion; the system's reduced motion settling the page at once; the page put away concealing the card and settling, and, for good, no longer counting down or listening. `abilities-capture.mjs` (`SETUP_MEASURE`): every card at least 44 px, a taken card's stamp naming the seat its name says and whole inside it, one check and only on the own pick, no role word or hook while face down (each text and accessible name on its own), the back's picture behind its art, its words on their band, the face's name, side and device, READY whole, every control at least 44 px; a probe proves seven of its rules fail on broken pages. The flows (`abilities-flows.mjs`, 49): each journey above, the same back for two roles, nothing replayed on a fresh view, reduced motion (the panel's, and the system's switched on mid-turn and mid-pop, and off again with nothing replayed), and the page put away (into the back-forward cache mid-turn: concealed, at rest, still counting down and listening; for good: the countdown stopped, an answer on its way dropped, the listener removed).

### 20.10 Open

- **DSN-D37** (owner): the back, the stamps and READY are the Designer's proposal.
- PR #93 refreshes the issue #76 study's setup examples (code-only join, the nine tiles, Reveal and Hide, Ready); this slice draws on the release itself and does not depend on it.
