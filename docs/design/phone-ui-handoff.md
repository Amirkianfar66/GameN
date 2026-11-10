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
| **Top bar** (`.tb`, `data-kind` turn, phase or pair) | Turn (portrait, name, "Player n · Turn"); your turn (amber); phase (an icon and the phase name, when there is no active player); pair (private talk); dark (Blackout); reconnecting. In a match: **Promises** (`.tb-promises`) after the name, a handshake in the icons' grey (`--text-secondary`) with its word on a turn bar and alone on a phase or talk bar, with a count when an offer waits and amber while its sheet is open; the settings menu **⋮** (`.tb-menu`) beside the clock, which opens Settings (the owner, 9 November) | `activeSeatId` with `identities[]` (character, name); `phase.kind`; `phase.remainingMs` or `endsAt`; `round`; `talk`; offers waiting for the player (`promises`) | It never shows a portrait when `activeSeatId` is null. The timer is tabular and turns amber in the last 10 s. The 5 s result and the 6 s presentation show a ring and keep only ⋮. Promises and ⋮ are 44 px targets. Under 22.5 rem of bar width (a container query: 320 px phones, larger text) Promises is the handshake alone, the clock drops its icon, a phase drops its icon tile and a pair's portraits overlap more. Height 52 px plus the top safe area, growing with text |
| **Tabs** (`.tabs`) | First tab **Board** in room view, **Room** in board view; Actions, Card and Panels expanded; the hero **Pass** (enabled or not), **Vote** and **Voted**; disabled (`aria-disabled`, still focusable); a badge | `canPass`; the open ballot (`phase.kind` of `JAIL_VOTE` or `CAPTAIN_ELECTION` and an offered `VOTE`); `ownBallot` | Labels are capped at 14 px, as iOS caps tab labels: offer the large-content view on long press. The hero sits 20 px above the bar. Switching views is local and never sends `MOVE`. Pass asks once ("Pass your turn?", naming whose turn is next; Cancel and Pass) before it sends `PASS_TURN`, the client step the runtime already treats as confirm-only. Sheets 27.1–27.5 draw each tab tap by tap, and 27.6 the top bar's Promises and ⋮. Panels (was More) uses the stacked-layers icon, in the same grey as the other tabs |
| **Sheet** (`.sheet`) | Auto or large height; docked between the bars in the game; with header actions, a back arrow, close and a footer | — | It always leaves the top bar and the tabs visible. Its body scrolls, and so does the page at larger text. **Clear glass over the room** (the owner's choice): background `linear-gradient(180deg, rgba(30,37,52,.20), rgba(14,18,26,.34))`, `backdrop-filter: blur(2px) saturate(1.3) brightness(.56)`, a top edge of `rgba(255,255,255,.2)`. Boxes inside are `rgba(8,11,18,.24)` with a 1 px `rgba(255,255,255,.1)` line, secondary buttons `rgba(8,11,18,.3)` with a light edge, and grey text `#DCE3EC`. The room isn't dimmed behind a docked sheet. Sheets are solid `#202837` under `prefers-reduced-transparency` or without `backdrop-filter`. Tokens: `--glass-*` in `kit.css` |
| **Room scene** | Lit, dark, targets, a picked target, empty-position marks, a dimmed scene while reconnecting | `board.seats[]` (`location`, `slotId`, `health`, `jailed`); `offices`; `action.choices` and `action.selected` | The space between the bars, framed by `phoneFrame` in `design/phone-ui/prototype/art.mjs`: the smallest scale that still fills it with the room's picture. Across, it holds the room's centre and moves only to keep everyone present 48 px inside the edges; when they span wider, it centres on them. The positions, press areas (at least 44 px) and vertical band are the game's own (`frameScene`, `slotRects` from `board-v2-drawing/fit-four.mjs`). The board's panels keep the game's framing. Name tags: number, name ("You" for self), office badge, "· Injured" or "· Out"; a tag near an edge moves inward to stay whole |
| **Target bar** (`.target-bar`) | Choosing; chosen; Cancel | `action.type`, `action.prompt`, `action.step` | It replaces the sheet while picking on the scene. Board choices stay on the people |
| **Floating chip** (`.offroom`) | A room's own interaction; "Other rooms · n" | Offered targets outside your room | It is the one path to targets in other rooms, as a list or on the board |
| **Cell** (3 × 3) | Available, selected, confirmed, taken, ineligible (with its reason), empty, winner, faded; a "You" badge; a count | `identities`; ballot eligibility; `lastTally.counts` | **Seat n is always cell n.** Empty cells in a 7- or 8-player match are `aria-hidden` |
| **Tile** (Actions) | Available, selected, submitting, registered, unavailable (with its reason), spent; a count badge | `privateArea.offers`; `action.step` (`sending`, `accepted`); `privateArea.resources` and `abilities` | `accepted` shows a REGISTERED stamp and the words "Nothing happens yet": never an effect. Off the player's own turn, the offers still include `MOVE` (any ordinary turn, once a round) and, for the Hacker, `SUBMIT_CODE`: those tiles stay open, the rest say "On your turn". Tapping a person while targeting opens the check with that person |
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
| 27.1–27.6 Each tab and top-bar button, tap by tap | Storyboards of the tabs: Board and back; Actions → a tile → a person → Register; Pass → "Pass your turn?" → the next turn, and Vote when a ballot opens; Card → Knowledge → Resources → Hide; Panels → Windows. Then the top bar: Promises → its list; ⋮ → Settings, with Host controls for the host. A ring marks each tap; the ring and arrows are review marks, not interface | Own phone | As the tabs, tiles and sheets they open | As those screens |
| 27–29 Actions and targeting | Tiles, then the target bar on the scene, then "Other rooms", then confirm, then Registering… and Registered | Own phone | `action.*`, `privateArea.offers` | — |
| 30 Blackout | Lit for everyone; dark for everyone; the Disabler's position marks; "Position fixed" | Public window; private picker | `presentation.blackout`, `blackoutTargeting` | `lighting/*.dark.svg`; `hospital-ward-four.dark` |
| 31 Card | The card fitted to the sheet; Knowledge; Resources; hidden | Own phone | `privateArea.role`, `knowledge`, `resources`, `abilities` | As the role card |
| 32–34 Panels and Settings, Promises, Windows | Panels: grouped rows (Windows, Navigation, the Hospital panel, Players, Round order); Settings, from ⋮ (Reduce motion, text size; Host controls for the host); Promises, from the top bar (kinds, terms, offer, accept, results); Windows (view, draw, Show, none) | Own phone; pair; the window's rooms | `promiseQuota`, `promises`, `windows`, offers; Settings are local to the phone | — |
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
| The room view re-centres (someone enters or leaves) | A 450 ms pan, with the public move | Direct |
| Pass to Vote | The hero turns paper and its icon changes, in 220 ms | Direct |
| Registered | Stamp snap, 120 ms | Direct |
| Result | The window rises over the room in 320 ms, then holds for 5 s | 80 ms fade |
| Role card to film | 700 ms crossfade at 20 s | Stills with 80 ms fades |

None of these sets a deadline, and a missed animation never blocks a control.

### Ambient motion in the rooms

Source: `design/phone-ui/prototype/ambient.mjs` (what is drawn, per room) and `ambient.css` (the keyframes). One SVG per room, in the scene's own coordinates, placed with the art's frame just above the back picture (z −1998; the capsule's z 1) and under every person. It takes no taps and reads nothing but the room's name and whether the lights are out.

| What | Motion | Pace |
| --- | --- | --- |
| Window stars | Three depths drift right to left, a tile each | 84 s, 42 s and 20 s per tile |
| Dust clouds and the galaxy | Drift with the far stars, slower | One voyage per tile |
| Shooting stars | Two, each now and then | Every 12 s and 17 s |
| A window's voyage | The room's planet leaves and returns; other things cross once a loop | Room A 90 s · Room B 110 s · Command Room 120 s · Hospital 100 s |
| Lines on a screen | Retype | 6.4 s |
| A cursor | Blinks | 1.1 s |
| A trace, a heartbeat | Scroll | 2.8 s; a beat every 1.2 s |
| Console readouts | Change length in steps | 3.6–5.4 s |
| A sonar ping | Rings out | 2.4 s |
| Keys | Light one after another | 0.9 s apart (the capsule 1.6 s) |
| Small lights | Blink: slow, fast, flicker | 2.2 s, 1.3 s, 3.1 s |
| Bubbles, a vent, pipes, a display, dust | Rise, turn, glint, scan, drift | 4.2–6.9 s, 5 s, 7 s, 5 s, 9–16 s |

- Only transforms, opacity, fills and stroke offsets animate. Everything starts at 0 s when the room is shown, so a still taken at a given time (`amb=<seconds>`) is the same picture everywhere.
- **Lights out:** with the dark picture, only the windows are drawn, over it (z 2802): the same voyage under a #0C1018 layer at 58% (the night rule's space mix). Every screen and light is off. Room B's window and moved screen are drawn in the night colours.
- **Reduce motion** pauses every animation where it stands (the system's setting and the game's).
- It must stay decorative: no game state, role, team, route or timer may drive it, and no team colour may enter it.
- Its cost on phones was not measured. If it costs too much there, slow the far layers first; a still frame at 0 s is always correct.

## Accessibility

- Every control has words or an accessible name: the icon labels are in `icons.json`.
- Targets are 44 px or more. The render measured every frame; the results are in `design/phone-ui/review/checks.json`.
- Text is rem-based and follows the game's Large (150%) and Largest (200%) settings. Sheets scroll; nothing is clipped to fit.
- Faction colours are always paired with words, and never used on the public board. Errors are not red.
- Text on glass and over the art: every run measured at least 4.5:1 (3:1 large) against what is really drawn behind it (`checks.json`, "contrast"). Over a live room the backdrop changes, so keep the glass values above or measure again with the same method (`textRuns` and `contrastOf` in `design/phone-ui/sheets/sheet.mjs`).
- Reduce Transparency (iOS) and `prefers-reduced-transparency` make sheets solid.
- The scene is decorative to a screen reader. Use the board's own text summary (`rosterText` today) and the target buttons' labels: "Ava, player 1".
