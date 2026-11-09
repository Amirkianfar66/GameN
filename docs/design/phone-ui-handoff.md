# Phone interface pack: Frontend handoff

**For:** Frontend, which owns the playable interface's integration. **From:** the Visual and Motion Designer, 9 November 2026. **Base:** `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. The pack itself is described in [phone-ui.md](phone-ui.md).

This maps each sheet to its components, states, assets, audience and the data it reads from today's models:
- the game model, `PlanetScreenModel`, in `packages/presentation/src/planet/model.ts`;
- the session model, in `apps/game/src/planet/session.ts`.

It is a design to build from, not an adoption:
- The pack's code (`design/phone-ui/prototype`) is a dev-only reference; port the look, not the modules.
- The server's offers still decide every control.
- What needs Backend or Integration first is in [DSN-REQ-19 to 21](integration-requests.md#dsn-req-19).

## The shell

| Component | States | Reads | Notes |
| --- | --- | --- | --- |
| **Top bar** (`.tb`) | Turn (portrait, name, "Player n · Turn"); your turn (amber); phase (an icon and the phase name, when there is no active player); pair (private talk); dark (Blackout); reconnecting | `activeSeatId` with `identities[]` (character, name); `phase.kind`; `phase.remainingMs` or `endsAt`; `round`; `talk` | It never shows a portrait when `activeSeatId` is null. The timer is tabular and turns amber in the last 10 s. The 5 s result and the 6 s presentation show a ring. Height 52 px plus the top safe area, growing with text |
| **Tabs** (`.tabs`) | First tab **Board** in room view, **Room** in board view; Actions, Card and More expanded; the hero **Pass** (enabled or not), **Vote** and **Voted**; disabled (`aria-disabled`, still focusable); a badge | `canPass`; the open ballot (`phase.kind` of `JAIL_VOTE` or `CAPTAIN_ELECTION` and an offered `VOTE`); `ownBallot` | Labels are capped at 14 px, as iOS caps tab labels: offer the large-content view on long press. The hero sits 20 px above the bar. Switching views is local and never sends `MOVE` |
| **Sheet** (`.sheet`) | Auto or large height; docked between the bars in the game; with header actions, a back arrow, close and a footer | — | It always leaves the top bar and the tabs visible. Its body scrolls, and so does the page at larger text |
| **Room scene** | Lit, dark, targets, a picked target, empty-position marks, a dimmed scene while reconnecting | `board.seats[]` (`location`, `slotId`, `health`, `jailed`); `offices`; `action.choices` and `action.selected` | Today's own framing (`frameScene`, `slotRects` from `board-v2-drawing/fit-four.mjs`), applied to the whole area between the bars. Name tags: number, name ("You" for self), office badge, "· Injured" or "· Out". Press areas are the game's own, at least 44 px |
| **Target bar** (`.target-bar`) | Choosing; chosen; Cancel | `action.type`, `action.prompt`, `action.step` | It replaces the sheet while picking on the scene. Board choices stay on the people |
| **Floating chip** (`.offroom`) | A room's own interaction; "Other rooms · n" | Offered targets outside your room | It is the one path to targets in other rooms, as a list or on the board |
| **Cell** (3 × 3) | Available, selected, confirmed, taken, ineligible (with its reason), empty, winner, faded; a "You" badge; a count | `identities`; ballot eligibility; `lastTally.counts` | **Seat n is always cell n.** Empty cells in a 7- or 8-player match are `aria-hidden` |
| **Tile** (Actions) | Available, selected, submitting, registered, unavailable (with its reason), spent; a count badge | `privateArea.offers`; `action.step` (`sending`, `accepted`); `privateArea.resources` and `abilities` | `accepted` shows a REGISTERED stamp and the words "Nothing happens yet": never an effect |
| **Role card** | Face; hidden (card back); art missing (text card); scales to its space (container units) | `privateArea.role` (name, faction, device); own `identities` `characterId` | The person is `card-cN` from `design/crew-drawing/assets/cards`, the device `device-*.held`. The Engineer's device is `--sw-asset-sw-device-engineer`. Team colours: Blue `#2979FF`, Red `#E8423F`, Alien `#9B5CFF`, own phone only |
| **Result window** | Elected, runoff, none; jailed, Jail full, none | `lastTally` (`kind`, `counts`, `eligibleVoterCount`, `selectedSeatId`, `tiedSeatIds`, `outcome`) | Its art is `RESULT_ART` in `scene-drawing/phone-kit-art.mjs`. `JAIL_FULL` uses the cell bars with the stamp "No room". It shows no ballots |
| **Toast, banner, error** | Copied; Registered; Connection lost; outcome unknown; an inline error | `message`, `connection`, `recovery` | Errors are paper and ink with a warning shape: never red |

The icons, from `design/phone-ui/assets/icons.svg` (`ic-<name>` and `ic-<name>-filled`, with the manifest in `icons.json`), draw in `currentColor`. A filled icon cuts its inner lines in `--ic-knock`. Use each icon's label wherever it stands without words.

## Sheet by sheet

| Sheets | Build | Audience | Data | Art |
| --- | --- | --- | --- | --- |
| 10 Intro and menu | The intro unchanged; a menu with Join (primary), Host and Recover (link) | Own phone | — | The brand film (`pregame-films/brand`) at 1.65 s as the menu's hero |
| 11 Host | Setup: a 7, 8 or 9 control. Lobby: the room code card with Copy and a "Copied" toast, requests with Admit, seats, a bots stepper, Start (disabled with "n more seats to fill") | Host | `roomCode`, `members[]`, `pendingAdmissions[]`, `playerCount` | — |
| 12–13 Join and lobby | Six code boxes and a name with a counter; errors in place; waiting; admitted ("You're in · Seat n"); closed | Own phone | `pendingAdmission.status`, `message` | — |
| 14–15 Recover | Match ID and code; one refusal for wrong, used or expired; the host's code hidden until revealed | Own phone and the host | `recoveryCode` (host only) | — |
| 16 Characters | One 3 × 3 grid with call signs; taken shows its seat; "Saving…", yours, automatic assignment; the timer in the top bar | Public grid; own choice | `members[].characterId`, `canChoose`, `remainingMs` | Portraits `portrait-cN` |
| 17–18 Role stage | See [the stage](#the-30-second-role-stage) | Own phone | DSN-REQ-19 | The card, and the role film `pregame-films/roles` |
| 19 Boarding | The film unchanged; a local Skip leads to a holding screen with the server's countdown; "Starting Round 1"; the Round 1 stamp | Public | `setup.startedAt`, `setup.endsAt` | `pregame-films/boarding` |
| 20–24 Rooms | Room view as the default; the room's own chip (window station, Captain console, Hospital panel, "Detained") | Own phone | As the room scene above | The scene layers of each room; for the four-bed ward, `hospital-ward-four.*` |
| 25 Private Talk | Declare (the target's three claim cards); the claim (the initiator); talk (the capsule, both seated) | Pair; the pair is public | `talk`, `hackFeedback`, the `DECLARE_HACK_SIDE` offer | `HACK_ART`; capsule `back`, `door-0` and `busy`; `sittingPose('sit')` |
| 26 Board | The whole ship with "You" on your room; move positions; targets in other rooms | Own phone | As the room scene | The same scene art in six panels |
| 27–29 Actions and targeting | Tiles, then the target bar on the scene, then "Other rooms", then confirm, then Registering… and Registered | Own phone | `action.*`, `privateArea.offers` | — |
| 30 Blackout | Lit for everyone; dark for everyone; the Disabler's position marks; "Position fixed" | Public window; private picker | `presentation.blackout`, `blackoutTargeting` | `lighting/*.dark.svg`; `hospital-ward-four.dark` |
| 31 Card | The card fitted to the sheet; Knowledge; Resources; hidden | Own phone | `privateArea.role`, `knowledge`, `resources`, `abilities` | As the role card |
| 32–34 More, Promises, Windows | Grouped rows; Promises (kinds, terms, offer, accept, results); Windows (view, draw, Show, none) | Own phone; pair; the window's rooms | `promiseQuota`, `promises`, `windows`, offers | — |
| 35–38 Vote and results | The ballot sheet with the grid; Abstain; Voted; closed; a runoff; can't vote; the result window for 5 s | Ballot private; totals public | `ballot`, `ownBallot`, `lastTally` | `RESULT_ART` |
| 40–45 Offices, navigation, Hacker, panel, the end, system | As drawn | As labelled on each sheet | `offices`, `privateNavigation`, `abilities`, `panelRequest`, `result`, `endReveal`, `recovery`, `connection` | Captain plates `plate-*`; posters `transit`, `blackhole` and `arrival-*` |

## The 30-second role stage

1. **0 to 20 s:** the card, large, on the player's own phone.
2. **At 20 s:** a 700 ms crossfade into the role film, which starts at its own 0.
3. **At 30 s:** the film ends and **Ready** opens, as the player's own tap.

Throughout the stage:
- A two-part strip under the top bar (20 s, then 10 s) and the time show the structure.
- **Server time.** Seek within one server interval (start and end from the server). Never run a local 30 s timer.
- **Concealing** (blur or the app hidden) hides the card. On return, the picture resumes at the current point.
- **Skip film** returns to the card on this phone only.
- **Missing film:** the card stays up.
- **Reduce motion** uses the film's reviewed stills.
- **A late join** at 25 s opens the film at 5 s.

## Motion

| Moment | Normal | Reduce motion |
| --- | --- | --- |
| Sheet up / down | 320 ms settle / 220 ms standard | 80 ms fade |
| Tab or state change | 220 ms crossfade | Direct |
| Room ↔ Board | 450 ms zoom from the current room's panel | Direct |
| Pass to Vote | The hero turns paper and its icon changes, in 220 ms | Direct |
| Registered | Stamp snap, 120 ms | Direct |
| Result | The window rises over the room in 320 ms, then holds for 5 s | 80 ms fade |
| Role card to film | 700 ms crossfade at 20 s | Stills with 80 ms fades |

None of these sets a deadline, and a missed animation never blocks a control.

## Accessibility

- Every control has words or an accessible name: the icon labels are in `icons.json`.
- Targets are 44 px or more. The render measured every frame; the results are in `design/phone-ui/review/checks.json`.
- Text is rem-based and follows the game's Large (150%) and Largest (200%) settings. Sheets scroll; nothing is clipped to fit.
- Faction colours are always paired with words, and never used on the public board. Errors are not red.
- The scene is decorative to a screen reader. Use the board's own text summary (`rosterText` today) and the target buttons' labels: "Ava, player 1".
