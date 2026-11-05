# Library group 1: Hack Spaceship and Engineer

Designer delivery, 5 November 2026. Private ability art and motion for the Hacker's final Code and
ship hack and the Engineer's capture, in the ability dossier's language (`design/abilities/`), with
an exact state map from the candidate contract's player view. A proposal: nothing is adopted until
Integration review; words are proposals for Frontend.

- Contract: protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted).
- Rules read: successor `game-design.md` (Hacker, Engineer, navigation), `owner-decisions.md` P01,
  P03, P12, P14, P18 to P20, `motion-requirements.md`, `rules-contracts.md`.
- Base: stacked on the cinematic pilots (#174); the reviewed dossier kit (`abilities-0.7.0`) is
  reused unchanged.
- Review page: `npm run dev:review --workspace @mothership/design-tokens` (or any static server on
  `design/`), then `/library/hack-engineer/index.html` (`?w=320`, `&text=2`, `&motion=reduced`).

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| One final Code from Round 2, alive, anywhere, before navigation, no Role Action (P18); spent either way (P01) | The dossier's Code card with four picks; a punch on acceptance; UNLOCKED or WRONG CODE |
| A correct Code unlocks the ship hack; unlocking is not activation (brief §3) | The sealed cartridge's bag torn open: the cartridge armed, nothing moves |
| A wrong Code leaves Scan; no retry; the hack stays locked (P20) | WRONG CODE, the cartridge still sealed, Scan still in the tray |
| The ship hack: own turn, Healthy, free, in A or B, Role Action unused; consumes it (P19); forces Red at navigation | Eligible only when the view offers it; the cartridge seats in the navigation port: RETAINED, then USED |
| The hack's effect is visible only through the office direction view | No public, display or office cue is drawn: the offices' panel shows the final direction alone |
| Engineer: once a match, from A or B, on its own Role Action, captures the opposite room's occupants by identity (P12) | A viewfinder over the opposite room as it is now, the occupants' chips under it; the whole room, never one target |
| Engineer gets a private confirmation of the fixed identities; targets, offices and the display get nothing (P14) | The developed print pinned in the Engineer file, the captured chips on it; nothing anywhere else |
| Effects and costs follow the selected world after Sync (P03) | Every state reads the current view only; no history is replayed |

## State map (from `states.mjs`)

Every state is a pure function of the seat's own `PlanetPlayerView` and the client's pending command.
`offers[]` is the only authority on what may be done now: no state enables an action the view does not
offer. Blockers only word why an offer is absent, from the seat's own facts.

### Final Code: `finalCodeState(view, { pending })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | not the Hacker, or Eliminated before attempting | nothing |
| `round1` | `round < 2` | tape and words |
| `available` | `offers` has `SUBMIT_CODE` | Code card, picks in seat order, Submit / Choose again |
| `closed` | not attempted and not offered (after navigation, another stage) | tape and words |
| `sending` | pending `SUBMIT_CODE`, no receipt | card + SENDING |
| `correct` | `codeAttempted` and `shipHackUnlocked` | punched card + UNLOCKED; motion `unlock` once |
| `wrong` | `codeAttempted` and not `shipHackUnlocked` | punched card + WRONG CODE; motion `wrong` once |

### Ship hack: `shipHackState(view, { pending })`

| State | When | Drawn |
| --- | --- | --- |
| `sealed` | not `shipHackUnlocked` | sealed cartridge in the Hacker file |
| `eligible` | unlocked, not spent, `offers` has `ACTIVATE_SHIP_HACK` | armed cartridge; strip with the port, Hack the ship / Not now; tray mark |
| `armed` | unlocked, not spent, not offered | armed cartridge, the rule, the first blockers |
| `sending` | pending `ACTIVATE_SHIP_HACK` | port + cartridge + SENDING |
| `retained` | spent, `shipHackRound === round`, this round's navigation not yet done (`navigation.lastMovedRound < round`) | seated port + RETAINED; motion `insert` once |
| `used` | spent otherwise, or the round unknown (R9) | scorched cartridge + USED |

### Engineer: `engineerState(view, { pending })` (nine players)

| State | When | Drawn |
| --- | --- | --- |
| `available` | `offers` has `ENGINEER_SUPPRESS` | viewfinder over the opposite room; its occupants in seat order (preview); Capture / Not now |
| `unavailable` | not spent, not offered | clamp, the rule, the first blockers |
| `sending` | pending `ENGINEER_SUPPRESS` | viewfinder + SENDING |
| `captured` | spent, `engineerCapture.round === round` (R8) | the print with the server's fixed identities + CAPTURED; motion `capture` once |
| `used` | spent otherwise; without the record (R8) no identities are drawn | the print in the file, or the closed clamp alone + USED |

Blockers, in this order: `eliminated`, `notYourTurn`, `injured`, `jailed`, `notInAB`, `actionUsed`;
`notNow` when the view withholds an offer for none of these.

## Assets

`design/library/hack-engineer/assets/` (generated by `node design/tools/library-assets.mjs` from
`art.mjs`; `--check` fails on drift). Each picture is also a custom property in `library.art.css`
(`--lib-asset-<name>`), drawn only behind `[data-art~="library"]`, as `abilities.art.css` does.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `lib-ship-cartridge.svg` | 128×76 | `ff73904c25aca152…` | armed (unlocked, unused) |
| `lib-ship-cartridge-sealed.svg` | 136×96 | `4725e1844d8c7f8f…` | locked |
| `lib-ship-cartridge-used.svg` | 128×76 | `0de6ec9383836e61…` | used |
| `lib-ship-jack.svg` | 176×108 | `82f7cf70990d6b84…` | the navigation port, empty |
| `lib-ship-jack-seated.svg` | 176×108 | `8a193ce144eba682…` | retained |
| `lib-breach-spark.svg` | 64×64 | `76a861e155640a31…` | the insert's sparks |
| `lib-icon-ship-hack.svg` | 48×48 | `d649a9cd9da4d3e8…` | tray mark |
| `lib-code-punch.svg` | 40×40 | `d938bfc0bba31d78…` | the final Code's punch over the dossier's Code card |
| `lib-viewfinder.svg` | 240×160 | `87708e32fe14914a…` | the capture's viewfinder (transparent inside) |
| `lib-capture-print.svg` | 140×168 | `b3ffe9c45812b9be…` | the developed print (window open over the picture) |
| `lib-clamp.svg` | 64×64 | `7463949cccbbdd10…` | Engineer file, unused |
| `lib-clamp-used.svg` | 64×64 | `49d03dcdcf7448cd…` | Engineer file, used |
| `lib-icon-capture.svg` | 48×48 | `e5329b9799b0d4d7…` | tray mark |
| `library.art.css` | 20,632 bytes | `b42b84198a4d23e3…` | all of the above as custom properties |

Full hashes and bytes: `assets/manifest.json`. The palette is the dossier's own nine neutrals and
caption yellow; a test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
No picture holds a word, an image link or a side's colour. The rooms in the Engineer's viewfinder and
print are the public room art (`design/board-motion/assets/scenes/room-a|b.back.svg`); the chips are
the dossier's (`design/abilities/js/intel.js chip()`), from the public-board bundle's crew cards.

## Mounting

- **Where:** only inside the seat's own open private sheet (the card and the action strip), never on
  the board, the shared display or a host view; concealed on window blur like every private sheet.
- **Parts reused:** `.ab-file` (the cork file, for the Hacker file and Engineer file), `.ab-kit` (the
  paper strip), `.ab-stamp`, `.ab-button` (44 px), `.ab-chip`, `.ab-code-card` from `abilities.css`.
- **New parts:** `lib-tape` (the label tape), `lib-prop` with `data-art` (each picture), the port
  layout (port 150 px; the cartridge rests 6 px right of it and travels 81 px into the slot), the
  viewfinder (picture 240:160, chips in a row under it, never over a person), the print (140:168,
  window at 8.6% / 7.1%, 82.9% × 66.7%). See `page.css` for exact rules.
- **Text** stays in the DOM (`copy.mjs`); every picture is `aria-hidden`; the viewfinder and the
  print carry an accessible name listing the players in words.
- **Pointer:** pictures take no pointer events; only the strip's buttons do.

## Motion (`motion.mjs`)

Played once, on the accepted receipt (`REGISTERED`), from the receipt's arrival; never while pending
and never for a refused command. No sound and no vibration by default (private).

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `unlock` | 1000 ms | punch 0-160, seal 200-520, bag 320-620, lift 520-800, UNLOCKED 780-1000 | sealed → armed, 80 + 80 ms fades |
| `wrong` | 600 ms | punch 0-160, WRONG CODE 300-600 (no shake) | 160 ms |
| `insert` | 900 ms | slide 0-380, seat 380-460, sparks 420-640, lamps 560-720, RETAINED 700-900 | port → seated port, 160 ms |
| `capture` | 1200 ms | brackets 0-220, dark shutter 220-300 (ink, never a light flash), print 300-700, develop 620-1080, CAPTURED 1000-1200 | viewfinder → print, 160 ms |

Reconnect or late load: draw the current state at rest; never replay a motion for a receipt the page
did not see arrive. Hidden tab: no motion plays; the state is drawn on return.

## Words (`copy.mjs`, proposals)

Tapes: Final Code, Ship hack, Capture Room A/B, Engineer file. Stamps: Sending, Unlocked, Wrong
Code, Retained, Used, Captured. Key sentences: "Your final Code is correct. The ship hack is
unlocked." / "Unlocking does not move the ship. Use the ship hack on an eligible turn." / "Hack the
ship now? At this round's navigation the route goes to Red. It uses your Role Action, and it works
once in the match." / "Capture everyone in Room B now: Player 5, Eli and Player 6, Fay. Their
navigation input is set to zero through this round. Votes are not affected." Full set in `copy.mjs`.

Seat lists (`listSeats`) name each player as the dossier does ("Player 5, Eli"), so labels are never
joined by a bare comma: "Player 5, Eli and Player 6, Fay"; three or more take semicolons ("Player 1,
Ada; Player 2, Ben and Player 3, Cy"). The page's accessible names use the same list. The dossier's
own `seatList` (`design/abilities/js/dossier.js`, the Insider file's screen-reader summary) replaces
the last comma with "and", which splits the last label ("Player 1, Ada, Player 2 and Ben"); that is
a separate fix to the reviewed kit, not made here.

## Privacy-safe preload

`library.art.css` (20.6 KB) loads whole on every player phone, with the ability art, before the first
match view, whatever the role: which art arrives says nothing about who is the Hacker or the Engineer.

## Contract requests

- **R8** (Engineer): `abilities.engineerCapture { round, seatIds }`, Engineer only, so the confirmation
  shows the identities the server fixed (P14), not the client's preview.
- **R9** (Hacker): `abilities.shipHackRound`, Hacker only, to tell "applies at this round's navigation"
  from "used in Round N".

Both are in the motion bible's request table. Until answered, the states fall back as above.

## Checks

- `node --test packages/design-tokens/test/library-hack-engineer.test.mjs`: 8 tests (every state
  branch, offers as the authority, the server's identities over the preview, seat lists that never
  split a label, palette distance from the faction accents, generated-asset drift, motion bounds, a
  dark shutter, reduced as fades only).
- `node design/tools/library-assets.mjs --check`: generated files current.
- `node design/tools/library-capture.mjs`: review captures (`review/`), every state at 390 and 320 px
  sheets, 200% text, motion strips full and reduced; measured: no sideways overflow on the page or a
  sheet, game buttons at least 44 px, no page error (`review/report.json`).

Not tested: real phones, screen readers, the runtime itself (no Frontend integration yet), the
contract's adopted revision.
