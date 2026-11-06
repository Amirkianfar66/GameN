# Library group 6: offices

Designer delivery, 5 November 2026. This group covers the three gaps in the brief's "Captain and Officer" row. The election, ballot and five-second vote-result panels already exist (the phone kit), as does the Captain's badge (the reviewed board art). This group adds:

- the Captain's Officer appointment, in its 30 seconds;
- the Officer's badge, distinct from every secret role and from the Captain's;
- the Officer's movement block in the 15-second pre-turn window, the public block marker, and its expiry with the round.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted):
  - `offices { captainSeatId, officerSeatId, blockedSeatId }`, public;
  - the seats' `captain` and `officer` flags;
  - the commands `APPOINT_OFFICER` and `BLOCK_MOVE`;
  - the phases `OFFICER_APPOINTMENT` (30 s) and `PRE_TURN` (15 s).
- **Rules read:**
  - `owner-decisions.md` P07;
  - the Officer public-office overlay (`officer-public-office-owner-decision-2026-10-25.json`);
  - successor `game-design.md` (the pre-turn block);
  - `motion-requirements.md` (Movement);
  - `designer-production-brief.md` (the Captain and Officer row).
- **Base:** stacked on library group 5.
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/offices/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=captain|officer|public|badges|motion`).
- **No film or video.** These are short, public presentations on the board and name tags, plus two office panels.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| The Captain appoints another Healthy, non-Jailed player outside the Hospital within 30 seconds; a timeout picks an eligible player at random; no eligible player leaves the office vacant (P07) | The Captain's panel lists exactly the offer's players, every button the same, and says the rule. If time runs out the view simply names the Officer, and nothing says whether the Captain or the clock chose. With no eligible player: "The office stays empty for this Captain's term." |
| The Officer is a public office held alongside a secret role, never a role, a side or a setup card (the 25 October overlay) | The Officer badge is the reviewed Captain badge's paper disc with two chevrons instead of a star. It is in the offices' family, unlike any role art (the removed Blue Officer's device art is not reused). Wherever it explains itself: "The Officer is a public office, appointed by the Captain. It says nothing about a player's secret role." |
| Every round has a fixed 15-second pre-turn window for the Officer's block and the Alien's secret Blackhole; early submissions do not shorten it (P07) | The public strip reads "Before the turns: the Officer may block one player's move." with an Officer, and "Before the turns." without one. Both are the same whoever acts, and the Blackhole is never mentioned. No sound plays in the window |
| The block is public and stops voluntary movement for the round; forced Hospital and Jail moves, votes, actions and windows are unaffected; the same player cannot be blocked in consecutive rounds (game design; P26) | The Officer's panel offers exactly the offer's players. Blocking is optional ("If you choose no one, nobody is blocked."). The public sees the block's dashed badge on the name tag and hazard tape at the figure's feet. The blocked player reads what still works. The tape rolls back when the round ends |

## State maps (from `states.mjs`)

### The Captain's appointment: `appointState(view, { pending, accepted, rejected, picked })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | not the Captain, or another phase | nothing |
| `choose` | `APPOINT_OFFICER` offered with players | the rule and the players, every button the same |
| `confirm` | a listed player picked here | "Appoint Player 3, Cleo as Officer? Everyone sees the office.", Appoint and Back |
| `sending` | sent, no receipt | SENDING |
| `appointed` | the view names an Officer (or this phone's receipt) | APPOINTED, the badge, "Player 3, Cleo is your Officer for this term." |
| `refused` | refused in this phase | "Choose again while time remains." and the players |
| `vacant` | offered with no eligible player | the vacancy words |
| `closed` | no offer | "The appointment is closing." |

### The Officer's block: `blockState(view, { pending, accepted, rejected, picked })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | not the Officer, or not `PRE_TURN` | nothing |
| `choose` | `BLOCK_MOVE` offered | "Block one player's move this round, if you want to. If you choose no one, nobody is blocked." and the offer's players |
| `confirm` | a listed player picked here | "Block Player 5, Eli from moving this round? Everyone sees the block.", Block and Back |
| `sending` | sent, no receipt | SENDING |
| `blocked` | the view names the blocked seat | BLOCKED, the badge, "… cannot move this round. The block ends with the round." |
| `refused` | refused in this phase | "Nothing changed." |
| `closed` | no offer | "The block is closed for this round." |

### Public

- **`publicStage(view)`:** `appointing` (`OFFICER_APPOINTMENT`), `pre-turn` (with an Officer), `quiet` (pre-turn with none), or none. It reads only public fields; a test holds it equal whatever else the view carries.
- **`badges(view, seatId)`:** offices first (Captain, Officer), then the block for this round.
- **`selfBlocked(view)`:** the blocked player's own note.
- **`officeChanges(previous, view)`:** the seat newly appointed, newly blocked, or whose block expired. Each plays once, never on a reconnect.

## Assets

`design/library/offices/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `offices.art.css` (`--of-asset-<name>`), drawn only behind `[data-art~="offices"]`. The Captain's badge is the reviewed board art, unchanged: `--ms-asset-marker-captain-badge` and `-glyph`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `of-glyph-officer.svg` | 32×32 | `d784a0d7ef69ab57…` | public: the Officer's glyph |
| `of-badge-officer.svg` | 36×36 | `09dd0dced21d97c7…` | public: the Officer's badge |
| `of-glyph-blocked.svg` | 32×32 | `616386c018781862…` | public: the block's glyph |
| `of-badge-blocked.svg` | 36×36 | `3dae1ca91bd6d584…` | public: the block's badge |
| `of-tape-blocked.svg` | 96×24 | `368c8814fbb5500c…` | public: the board's block marker |
| `of-icon-appoint.svg` | 48×48 | `d0fda7e2eb73da7b…` | Captain-private: tray mark |
| `of-icon-block.svg` | 48×48 | `825665dde5bf59a8…` | Officer-private: tray mark |
| `offices.art.css` | 7,551 bytes | `db5d3cdadca9bad1…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **The badge family.** The Officer and block badges repeat the Captain badge's construction exactly (a test holds it): the ink shadow disc at (19.5, 19.5), the paper disc r 14.5 with a 2.5 ink rim, and the glyph at 0.66.
- **What differs:**
  - **Captain:** a star.
  - **Officer:** two chevrons.
  - **Block:** an arrow stopped by a wall, on a dashed rim, because it is a state that ends with the round, not an office. The first draft used a barred boot print, which read as a division sign at 24 px, and was replaced.
- **Colours:** monochrome ink and paper like the Captain's. The tape adds the dossier's caption yellow. A test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
- **Words:** no picture holds a word. Every badge is named in words beside it on name tags.

## Mounting

- **Badges:**
  - On a name tag, after the name, each with its name in words ("Captain", "Officer", "No move this round").
  - On the board, the office badge floats at the figure's `badge` anchor, as the Captain's does.
  - At 24 px and above the three remain distinct; they grow with the reader's text size beside words.
- **Block tape:** across the blocked figure's feet, at the slot's `feet` anchor (`design/board-v2/contract/slots.json`), about 70 px wide. It shows only while the view's `blockedSeatId` names the seat.
- **Panels:**
  - The appointment mounts on the Captain's own phone during `OFFICER_APPOINTMENT`.
  - The block mounts on the Officer's own phone during `PRE_TURN`.
  - Each lists the offer's players, every button the same (the dossier's first-button yellow is outranked), and asks for a confirmation.
- **Public strip:** one line per stage, and a block line with its badge when a block holds.
- **The blocked player's own phone:** the note "You cannot move this round. You can still vote, act and use the windows; a move the game makes for you, to the Hospital or the Jail, still happens."

## Motion (`motion.mjs`)

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `appoint` | 560 ms | a seat newly holds the office: the badge pins on (scale 1.8 to 1, a turn of −20° to 0) 0–420; an ink ring spreads and fades 300–560 | fade, 160 ms |
| `block` | 480 ms | a seat is newly blocked: the tape unrolls from the left 0–360 and settles 300–480 | fade, 160 ms |
| `expire` | 360 ms | the block ends with its round: the tape rolls back 0–360 | fade, 160 ms |

Each plays once, from `officeChanges()`, never on a reconnect. Nothing holds or shortens the server's 30-second or 15-second windows.

## Sound and vibration

None. A sound in the pre-turn window would be heard by everyone at once, and the window also hides the secret Blackhole.

## Privacy-safe preload

`offices.art.css` (7.6 KB) loads whole on every player phone, whatever the seat's office.

## Contract requests

None new. The view says everything the offices need.

## Checks

- `node --test packages/design-tokens/test/library-offices.test.mjs`, 9 tests:
  - the appointment: only the Captain in its window, the offer's players, vacant with none;
  - the block: only the Officer in the pre-turn window, optional, the offer's players;
  - the public stage: public fields only, no word of anything secret;
  - badges, the blocked player's note, and changes played once;
  - words: an office, never a role or side, and nothing about whether the clock chose;
  - the art: the Captain badge's exact family, dashed only for the block, one palette off the accents;
  - generated-asset drift;
  - motion bounds and reduced fades;
  - the review report.
- `node design/tools/library-assets.mjs --check`: the generated files are current (all six groups).
- `node design/tools/library-capture.mjs --group offices`: 117 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and the four state sections at 200% text, with a contact sheet each.
  - Every motion as six frames, full and reduced.
  - Measured as in the earlier groups: no sideways overflow, sheets exactly their phone width, game buttons at least 44 px, no page error, and no 200% text under 24 px.

Not tested: real phones, screen readers, the runtime itself, the contract's adopted revision, and the board's real figures (the review page uses labelled stand-ins).
