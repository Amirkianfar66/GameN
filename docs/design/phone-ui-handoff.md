# Phone interface pack: Frontend handoff

**For:** Frontend, which owns the playable interface's integration. **From:** the Visual and Motion Designer, 9 November 2026. **Base:** `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. The pack itself is described in [phone-ui.md](phone-ui.md).

This maps each sheet to its components, states, assets, audience and the data it reads from today's models:
- the game model, `PlanetScreenModel`, in `packages/presentation/src/planet/model.ts`;
- the session model, in `apps/game/src/planet/session.ts`.

It is a design to build from, not an adoption:
- The pack's code (`design/phone-ui/prototype`) is a dev-only reference; port the look, not the modules.
- The server's offers still decide every control.
- What needs Backend or Integration first is in [DSN-REQ-19 to 22](integration-requests.md#dsn-req-19). The rooms' ambient motion, not yet in the native interface, is requested from Frontend as [DSN-REQ-23](integration-requests.md#dsn-req-23).

## The shell

| Component | States | Reads | Notes |
| --- | --- | --- | --- |
| **Top bar** (`.tb`, `data-kind` turn, phase or pair) | Turn (portrait, name, "Player n · Turn"); your turn (amber); phase (an icon and the phase name, when there is no active player); pair (private talk); dark (Blackout); reconnecting. In a match: **Promises** (`.tb-promises`) after the name, a handshake in the icons' grey (`--text-secondary`) with its word on a turn bar and alone on a phase or talk bar, with a count when an offer waits and amber while its sheet is open; the settings menu **⋮** (`.tb-menu`) beside the clock, which opens Settings (the owner, 9 November) | `activeSeatId` with `identities[]` (character, name); `phase.kind`; `phase.remainingMs` or `endsAt`; `round`; `talk`; offers waiting for the player (`promises`) | It never shows a portrait when `activeSeatId` is null. The timer is tabular and turns amber in the last 10 s. The 5 s result and the 6 s presentation show a ring and keep only ⋮. Promises and ⋮ are 44 px targets. Under 22.5 rem of bar width (a container query: 320 px phones, larger text) Promises is the handshake alone, the clock drops its icon, a phase drops its icon tile and a pair's portraits overlap more. Under 16 rem (150% text below 384 px, 200% below 512 px) the round leaves the bar and a phase with a short title shows it ("Vote result" for "Jail vote · result"), the full title kept for screen readers. Under 12 rem (200% text below 384 px) the title takes two lines in place of the subtitle and the time stops growing at 22 px. Height 52 px plus the top safe area, growing with text |
| **Tabs** (`.tabs`) | First tab **Board** in room view, **Room** in board view; Actions, Card and Panels expanded; the hero **Pass** (enabled or not), **Vote** and **Voted**; disabled (`aria-disabled`, still focusable); a badge | `canPass`; the open ballot (`phase.kind` of `JAIL_VOTE` or `CAPTAIN_ELECTION` and an offered `VOTE`); `ownBallot` | Labels are capped at 14 px, as iOS caps tab labels: offer the large-content view on long press. The hero sits 20 px above the bar. Switching views is local and never sends `MOVE`. Pass asks once ("Pass your turn?", naming whose turn is next; Cancel and Pass) before it sends `PASS_TURN`, the client step the runtime already treats as confirm-only. Sheets 27.1–27.5 draw each tab tap by tap, and 27.6 the top bar's Promises and ⋮. Panels (was More) uses the stacked-layers icon, in the same grey as the other tabs |
| **Sheet** (`.sheet`) | Auto or large height; docked between the bars in the game; with header actions, a back arrow, close and a footer | — | It always leaves the top bar and the tabs visible. Its body scrolls, and so does the page at larger text. **Clear glass over the room** (the owner's choice): background `linear-gradient(180deg, rgba(30,37,52,.20), rgba(14,18,26,.34))`, `backdrop-filter: blur(2px) saturate(1.3) brightness(.56)` (the owner kept it, 10 November), a top edge of `rgba(255,255,255,.2)`. Light words on glass carry `--glass-halo`: `text-shadow: 0 0 1px rgba(8,11,18,.85), 0 0 3px rgba(8,11,18,.7), 0 0 8px rgba(8,11,18,.45)`, set on the sheet and inherited, and off (`none`) on dark words over light fills: primary buttons, paper and amber pills, stamps other than the outline one, seat and count badges, "You", the comic cards and the role card. Without it, grey words over the brightest art (cream rims, light walls, a name badge behind the sheet) measured 3.7–4.5:1. Boxes inside are `rgba(8,11,18,.24)` with a 1 px `rgba(255,255,255,.1)` line, secondary buttons `rgba(8,11,18,.3)` with a light edge, and grey text `#DCE3EC`. The room isn't dimmed behind a docked sheet. Sheets are solid `#202837` under `prefers-reduced-transparency` or without `backdrop-filter`. Tokens: `--glass-*` in `kit.css` |
| **Room scene** | Lit, dark, targets, a picked target, empty-position marks, a dimmed scene while reconnecting | `board.seats[]` (`location`, `slotId`, `health`, `jailed`); `offices`; `action.choices` and `action.selected` | The space between the bars, framed by `phoneFrame` in `design/phone-ui/prototype/art.mjs`: the smallest scale that still fills it with the room's picture. Across, it holds the room's centre and moves only to keep everyone present 48 px inside the edges; when they span wider, it centres on them. Nobody present is cut off (the owner's decision of 11 November 2026, T1), as drawn: each present figure's outline stays 4 px inside the view and each press area whole. Where they cannot, it zooms out just far enough and accepts bands above and below. The outline is `paintedExtent(slot)`: its gesture's measured `FIGURE_EXTENTS` (`figure-extents.mjs`, Injured included, so an injury never moves the camera), mirrored with the place, plus a margin for the crew's own motion (`MOTION_ALLOWANCE`, or the gesture's measured `FIGURE_MOTION_REACH` where that is further). An Eliminated figure counts as its still pose (#222: press points alone cut A3 at the floor hatch). Up and down, the band runs from the top of every place's outline or head to the bottom of every place's outline or press area, whoever is present, and may show the picture's own border. The framing follows only who the lit room shows and is held still from lights-out to lights-on. Opened in the dark with no lit frame to recover, it frames every place as occupied (`paintRoom`'s `frameAll`; see [Opened in the dark](phone-ui.md#blackout-before-voting-sheet-02)). **Next, a fifth wider** (the owner, 11 November): 0.8 of the filled view's scale with the ceiling and deck extended, from `design/ship-life/framing.mjs` (`roomFrame`, `zoom: 0.8`). It comes with the approved room pictures (#197); see [ship-life.md](ship-life.md#wider-rooms). The positions and press areas (at least 44 px) are the game's own (`slotRects` from `board-v2-drawing/fit-four.mjs`). The board's panels keep the game's framing. Name tags: number, name ("You" for self), office badge, "· Injured" or "· Out"; a tag near an edge moves inward to stay whole. Tags sit above a target's ring (z 3150 over 3100) and let taps through, so a ring never crosses a name |
| **Target bar** (`.target-bar`) | Choosing; chosen; Cancel | `action.type`, `action.prompt`, `action.step` | It replaces the sheet while picking on the scene. Board choices stay on the people. Cancel is in this bar; the centre button is not turned into Cancel (the owner's decision of 11 November 2026, T2) |
| **Floating chip** (`.offroom`) | A room's own interaction; "Other rooms · n"; the board's "List" | Offered targets outside your room | "Other rooms · n" opens the **board** with everyone the action can reach pressable where they stand and the rest dimmed (sheet 29). The board's **List** gives the same choice as text, room by room, for screen readers or by preference. A tap in either goes to the same check |
| **Cell** (3 × 3) | Available, selected, confirmed, taken, ineligible (with its reason), empty, winner, faded; a "You" badge; a count | `identities`; ballot eligibility; `lastTally.counts` | **Seat n is always cell n.** Empty cells in a 7- or 8-player match are `aria-hidden`. In results the count holds the top-left corner and "You" the top-right. **As a row** (the grid's container under 13 em: larger text on small phones): the portrait is the size of the seat number (`1.375rem`, the `.num` badge's height) and on the name's line, the note under the name, the count the same size as the seat number |
| **Tile** (Actions) | Available, selected, submitting, registered, unavailable (with its reason), spent; a count badge | `privateArea.offers`; `action.step` (`sending`, `accepted`); `privateArea.resources` and `abilities` | Every action of the role is a tile; only an offered one can be used. An unavailable tile shows the reason the projection gives, and where it gives none, says only that it is not available now: the phone never works out a reason from the rules (the owner's decision of 11 November 2026, T3). `accepted` opens the action's own state ([After Register](#after-register)): never an effect. Off the player's own turn, the offers still include `MOVE` (any ordinary turn, once a round) and, for the Hacker, `SUBMIT_CODE`: those tiles stay open, the rest say "On your turn". Tapping a person while targeting opens the check with that person |
| **Role card** | Face; hidden (card back); art missing (text card); scales to its space (container units) | `privateArea.role` (name, faction, device); own `identities` `characterId` | The person is `card-cN` from `design/crew-drawing/assets/cards`, the device `device-*.held`. The Engineer's device is `--sw-asset-sw-device-engineer`. Team colours: Blue `#2979FF`, Red `#E8423F`, Alien `#9B5CFF`, own phone only |
| **Result window** | Elected, runoff, none; jailed, Jail full, none; compact | `lastTally` (`kind`, `counts`, `eligibleVoterCount`, `selectedSeatId`, `tiedSeatIds`, `outcome`) | Its art is `RESULT_ART` in `scene-drawing/phone-kit-art.mjs`. `JAIL_FULL` uses the cell bars with the stamp "No room". It shows no ballots. Each count is shown once, as the cell's badge (no "N votes" line, the owner, 10 November); the cell's accessible name says "Player n, Name, N votes". The headline and the roster scroll together above the foot. **Compact** (the window under 14 of its own em, a container query: 320 px at 150% and 200%, 390 px at 200%): the art and the stamp step aside (the headline says the same), the headline stops growing at 30 px, the whole window scrolls as one column with the foot, and the roster becomes a list of whole names (the grid's container under 13 em). Sheet 56 is 320 × 568 at 200% |
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
| 25 Private Talk | Declare: the same three claim cards for every role, with the sides a role may not claim disabled on its own phone ([eligibility](#hack-declaration-eligibility)); the claim (the initiator); talk (the capsule, both seated) | Pair; the pair is public | `talk`, `hackFeedback`, the `DECLARE_HACK_SIDE` offer, `self.role` | `HACK_ART`; capsule `back`, `door-0` and `busy`; `sittingPose('sit')` |
| 26 Board | The whole ship with "You" on your room; move positions; targets in other rooms | Own phone | As the room scene | The same scene art in six panels |
| 27.1–27.6 Each tab and top-bar button, tap by tap | Storyboards of the tabs: Board and back; Actions → a tile → a person → Register; Pass → "Pass your turn?" → the next turn, and Vote when a ballot opens; Card → Knowledge → Resources → Hide; Panels → Windows. Then the top bar: Promises → its list; ⋮ → Settings, with Host controls for the host. A ring marks each tap; the ring and arrows are review marks, not interface | Own phone | As the tabs, tiles and sheets they open | As those screens |
| 27–29 Actions and targeting | Tiles, then the target bar on the scene; "Other rooms" opens the board, its List the same choice as text; then the check, Registering… and the action's own state | Own phone | `action.*`, `privateArea.offers` | — |
| 29.1–29.2 After Register | Each action's state once the server accepts it: waiting for the end of the round (Rescue, Protection, Supply, a shot, Blackout), or what happens at once (a private talk set for after the turn, Clone active, the Engineer's capture). See [After Register](#after-register) | Own phone | `action.step`, `privateArea.knowledge`, `abilities.clone`, `abilities.engineerCapture` | — |
| 30 Blackout | Lit for everyone; dark for everyone; the Disabler's position marks; "Position fixed"; opened in the dark with no lit frame to recover (every place framed, for everyone and for the Disabler) | Public window; private picker | `presentation.blackout`, `blackoutTargeting` | `lighting/*.dark.svg`; `hospital-ward-four.dark` |
| 31 Card | The card fitted to the sheet; Knowledge; Resources; hidden | Own phone | `privateArea.role`, `knowledge`, `resources`, `abilities` | As the role card |
| 32–34 Panels and Settings, Promises, Windows | Panels: grouped rows (Windows, Navigation, the Hospital panel, Players, Round order); Settings, from ⋮ (Reduce motion, text size; Host controls for the host); Promises, from the top bar (kinds, terms, offer, accept); Windows (view, draw, Show, none) | Own phone; pair; the window's rooms | `promiseQuota`, `promises`, `windows`, offers; Settings are local to the phone | — |
| 33.1 Promise results | One match moment per result state (Pending, Fulfilled, Not fulfilled, Condition not met), each within the lifetime quota of one given and one received: a phone never lists more than two. Captain Support's terms: "in every ballot of that election in which the recipient is a candidate" (P23); never a candidate gives Condition not met | Pair | `promiseQuota`, `promises` | — |
| 35–38, 56 Vote and results | The ballot sheet with the grid; Abstain ("You abstained" above the roster); Voted; closed; a runoff; can't vote; the result window for 5 s. Sheet 56: both at 320 × 568 with 200% text | Ballot private; totals public | `ballot`, `ownBallot`, `lastTally` | `RESULT_ART` |
| 40–45 Offices, navigation, Hacker, panel, the end, system | As drawn | As labelled on each sheet | `offices`, `privateNavigation`, `abilities`, `panelRequest`, `result`, `endReveal`, `recovery`, `connection` | Captain plates `plate-*`; posters `transit`, `blackhole` and `arrival-*` |

## After Register

What a player sees once the server accepts an action, in Frontend's words where `packages/presentation/src/copy/en.ts` has them (base `fb33cecb`). A waiting action has an outline stamp and a time line whose next step is still open: no heal, hit, injury or protection is drawn on anyone until the server reports the outcome. Sheets 29.1 and 29.2.

| Action (command) | After acceptance | Stamp | Headline | Detail | Time line | Reads |
| --- | --- | --- | --- | --- | --- | --- |
| Rescue (`RESCUE`) | Waits for the end of the round, after the attacks | REGISTERED, outline | `acceptedTarget.rescue`: "Rescue of Eli registered." | `acceptedDetail.rescue`: "This is not a result. Registered actions are resolved at the end of the round." | Registered → End of Round 3: resolved after the attacks | `action.step` |
| Protection (`PROTECT`) | Resolved at the end of the round; active from the next | REGISTERED, outline | `acceptedTarget.protect`: "Protection for Gus registered." | "This is not a result. It is resolved at the end of this round and is active from Round 4." | Registered → End of Round 3 → Round 4: active | `knowledge.protectionFrom` ("Protection for Gus: active from round 4.") |
| Supply (`SUPPLY`, Round 3) | Each gets a weapon at the end of the round | REGISTERED, outline | `supplyAccepted`: "Supply for Ava and Gus registered." | `supplyDetail` (as Rescue) | Registered → End of Round 3: one weapon each | `action.step` |
| Shot (`REGISTER_SHOT`, Round 4 on) | Resolved at the end of the round; Protection and Clone are checked then | REGISTERED, outline | `acceptedTarget.shot`: "Shot at Gus registered." | `acceptedDetail.shot`: "This is not a result. Registered shots are resolved at the end of the round." | Registered → End of Round 4 | `action.step` |
| Blackout (`REQUEST_BLACKOUT`) | Waits for the window | REGISTERED, outline | "Blackout registered." (Frontend has no accepted line yet) | "This is not a result. Nothing changes until the lights go out later this round." | Registered → later this round: 5 s lit, 10 s dark → while dark: a frozen position | The window's timing is [DSN-REQ-20](integration-requests.md#dsn-req-20) |
| Private talk (`REQUEST_HACK`) | Set for after the turn | ACCEPTED, outline | `acceptedTarget.hack`, in the pack's name: "Private talk with Ava accepted." | "It starts after this turn. The top bar shows each step." (Frontend: "The phase shown at the top of this screen says what happens next.") | Accepted → after this turn: up to 15 s to declare → 5 s claim, 60 s talk | `phase.kind`, `talk` |
| Clone (`ACTIVATE_CLONE`) | **Active at once** (CLONE-01), through the following round's attacks (P17) | ACTIVE, amber | "Clone active." (Frontend has the consequence line only) | "Active from now, through the attacks at the end of Round 4. It used your main action for this round." | Active now → End of Round 4: ends after the attacks | `abilities.clone` (`active`, `expiresAfterRound`) |
| Engineer (`ENGINEER_SUPPRESS`) | **Captures at once** who is in the other room (P14); their navigation weight is removed this round (P12) | CAPTURED, steel | "Navigation suppressed." (no Frontend line yet) | "Captured now: the 3 players in Room B. Their navigation weight is removed this round. Only you are told." Then the captured players, by name | Captured → this round's navigation | `abilities.engineerCapture` (`round`, `seatIds`) |

**For Frontend's copy:** Blackout, Clone and the Engineer have no accepted lines in `en.ts`; the pack's are offered as drafts. The data they need is already in the private view (`abilities.clone`, `abilities.engineerCapture`). A target never learns of a suppression (P14), and nothing in these states is shown to anyone but the actor.

## Hack declaration eligibility

HACK-DECLARE-02 (`rules/overlays/declared-hack-owner-decision-2026-10-12.json`): normal roles must declare their own side; Undercover and Alien may bluff; the controls are identical for every role. So every target sees the same three cards, and on its own phone a role that may not bluff finds the other two disabled ("Not for your role", with a lock) and its own side chosen. Sheet 25.

The roles' factions are the engine's (`planetFaction`, `packages/engine/src/planet-game/model.ts`):

| Role (`self.role`) | Sides it may declare |
| --- | --- |
| Doctor, Insider, Blue Disabler, Supplier, Engineer | Blue only |
| Red Disabler, Hacker | Red only |
| Undercover | Blue, Red or Alien |
| Alien | Blue, Red or Alien |

- **Private.** The disabled cards and the note under them ("Your role declares its own side: Blue. Only you see this.") are on the target's own phone only. The initiator, the host and the shared display see neither the choices nor which were open (HACK-DECLARE-04).
- **Frontend** derives the sides from the player's own role, as above: one rule, own faction unless Undercover or Alien.
- **Backend already enforces it:** the engine rejects any other side with `NOT_ALLOWED` (`packages/engine/src/full-game/lifecycle.ts`, the `DECLARE_HACK_SIDE` case; `packages/engine/src/planet-game/commands.ts`, likewise). Its offer (`packages/engine/src/planet-game/offers.ts`) says only that the seat may declare, not which sides: [DSN-REQ-22](integration-requests.md#dsn-req-22) asks for the sides in the offer, so the phone needs no role table.
- A declaration is a claim, never a check: the initiator's card says "Unverified".

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

**Blackout (Integration, review of `d52a8ae9`):** Frontend freezes the camera's framing and every target's geometry for the whole Blackout: the lit 5 s, the dark 10 s and the transition when the runtime hides the board. Nothing re-centres, zooms or moves a press area while a Disabler may be choosing a position, so a position chosen in the dark is the one drawn.

**Opened in the dark (#222):** a phone that opens or reloads in the dark rebuilds the frame from the same response's public PRE_BLACKOUT board, as Integration confirmed. The fallback applies when that board is missing or fails Integration's checks, or when the match runs a tuple before 1.3. Then the phone frames the room as if every place were occupied (`paintRoom(..., { frameAll: true })`: `phoneFrame` over all the room's places). That needs only the room, the player count and the phone's current view. The phone shows sheet 30's dark room unchanged, with no new copy, and holds the frame for the window. No earlier camera or view is restored; a view that changes in the dark recomputes the frame from the same inputs. Sheet 30, "Opened in the dark", draws it for everyone and for the Disabler.

### Ambient motion in the rooms

**Status (11 November 2026):** not yet in the native interface adopted in #217, whose rooms are still. Requested from Frontend as [DSN-REQ-23](integration-requests.md#dsn-req-23).

Source: `design/phone-ui/prototype/ambient.mjs` (what is drawn, per room) and `ambient.css` (the keyframes). One SVG per room, in the scene's own coordinates, placed with the art's frame just above the back picture (z −1998; the capsule's z 1) and under every person. It takes no taps and reads nothing but the room's name and whether the lights are out.

| What | Motion | Pace |
| --- | --- | --- |
| Window stars | Three depths drift right to left, at the same speed in every window | 2.3, 4.6 and 9.6 scene units a second |
| Dust clouds and the galaxy | Drift slower than the near stars, the same in every window | 2.9 scene units a second |
| Shooting stars | Two, each now and then | Every 12 s and 17 s |
| The ship's voyage | One sky for every window: the cream world sinks from every window together (0–24 s) and rises back together (216–240 s); nine passers cross each window once a loop, reaching the Command Room first, then Room A, Room B and the Hospital, 6 s apart | 240 s; passers 6–28 scene units a second |
| Lines on a screen | Retype | 6.4 s |
| A cursor | Blinks | 1.1 s |
| A trace, a heartbeat | Scroll | 2.8 s; a beat every 1.2 s |
| Console readouts | Change length in steps | 3.6–5.4 s |
| A sonar ping | Rings out | 2.4 s |
| Keys | Light one after another | 0.9 s apart (the capsule 1.6 s) |
| Small lights | Blink: slow, fast, flicker | 2.2 s, 1.3 s, 3.1 s |
| Bubbles, a vent, pipes, a display, dust | Rise, turn, glint, scan, drift | 4.2–6.9 s, 5 s, 7 s, 5 s, 9–16 s |

- Only transforms, opacity, fills and stroke offsets animate.
- **One clock.** Every animation's time is the ship's one clock: the time since `SKY_EPOCH` (1 November 2026, UTC), taken in the game from the match's server time. Every room and every phone is then at the same moment of the voyage, and a room shown again carries on rather than starting over. A still taken at a given time (`amb=<seconds>`) is the same picture in every room.
- **Lights out:** with the dark picture, only the windows are drawn, over it (z 2802): the same voyage under a #0C1018 layer at 58% (the night rule's space mix). Every screen and light is off. Room B's window and moved screen are drawn in the night colours.
- **Reduce motion** pauses every animation where it stands (the system's setting and the game's).
- It must stay decorative: no game state, role, team, route or timer may drive it, and no team colour may enter it.
- Its cost on phones was not measured. If it costs too much there, slow the far layers first; a still frame at 0 s is always correct.

## Accessibility

- Every control has words or an accessible name: the icon labels are in `icons.json`.
- Targets are 44 px or more. The render measured every frame; the results are in `design/phone-ui/review/checks.json`.
- Text is rem-based and follows the game's Large (150%) and Largest (200%) settings. Sheets scroll. The render counts every letter cut off by an ellipsis, a line clamp or hidden overflow (`clipped` in `checks.json`); text a player can scroll to is not counted as cut.
- Faction colours are always paired with words, and never used on the public board. Errors are not red.
- Text on glass and over the art is measured **letter by letter** against what is drawn behind it (a text's own halo counted as background), in desktop Chromium (`textLetters`, `letterInk` and `letterContrast` in `design/phone-ui/sheets/sheet.mjs`; the method and its limits are in [phone-ui.md](phone-ui.md#what-was-checked-and-what-was-not)). It is a measurement of these renders, not a claim about every phone, screen or moment. Over a live room the backdrop changes: keep the glass values above, or measure again with the same method.
- Reduce Transparency (iOS) and `prefers-reduced-transparency` make sheets solid.
- The scene is decorative to a screen reader. Use the board's own text summary (`rosterText` today) and the target buttons' labels: "Ava, player 1".
