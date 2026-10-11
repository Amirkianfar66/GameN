# Frontend handoff: ability art

Slice 1, the Insider's file, is sections 1 to 13. Slice 2, the Hacker's file and Scan, the Code attempt and the Alien's Code, is section 14; it builds on slice 1's parts (the snapshot, the file, inspecting, the loading rule) and changes none of its rules. The kit is `abilities-0.2.0` since slice 2: four assets added, the slice 1 assets unchanged.

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
| [DSN-REQ-14](integration-requests.md#dsn-req-14) | State in the contract that `knowledge.insiderCandidates` and `knowledge.code` list seats in seat order | Integration | The engine sorts them; the file sorts them again |
| DSN-D36 | Adopt the ability kit into a reviewed export revision and the runtime manifest pin, loaded on every player phone | Integration | A proposal beside the kit (`design/abilities/assets/`, `abilities-0.1.0`) |
| DSN-D37 | The look and motion of the ability art (slices 1 and 2) | Game owner | The owner chose the Insider's content (portraits and role labels); the rest waits for the owner's look |

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

At the default text size both files fit 390 x 844 and 320 x 568 without scrolling with the fixtures' content (two Scans for the Hacker). In the strip the Code card stands under the question; on a short phone (640 px tall or less) it sits small at the start of the detail line, where progress dots would, its chips without their seat badges (the line names the seats), so the board keeps its height. With more Scans the card scrolls inside itself on a short phone; the newest result is the last. At large text both files reflow into one column: the Hacker's label leaves the frame and stands as words beside it; printouts put their stamp under the words; the Alien's four stand one under the other.

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
