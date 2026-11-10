# Phone interface pack

**A complete phone interface design for owner review**, made from the owner's latest playtest feedback (9 November 2026). Every screen, tab and important state of the Planet game has its own sheet, plus a flow map, a phase and action matrix, a component sheet and a clickable prototype. It is a design proposal: nothing here changes the game, a rule, a contract or a deadline.

- **Branch and base:** `claude/designer-phone-ui`, from `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. That is `main` after #204, the reviewed playable baseline.
- **Pins:** protocol 3, `planet-game-1.1.0`, `in-person-planet-private-feedback-2026-11-06`, art release `design-0.8.0`.
- **Worktree:** a separate one, `/home/user/GameN-worktrees/designer-phone-ui`.
- **Other work:** Designer's other worktrees and open PRs are untouched. That includes PR #197, the approved redrawn rooms, and PR #78's branch.

| | |
| --- | --- |
| Sheets | [`design/phone-ui/review/sheets/`](../../design/phone-ui/review/sheets/): 57 numbered sheets. [`contact-sheet.jpg`](../../design/phone-ui/review/contact-sheet.jpg) shows all of them. |
| Clickable prototype | [`design/phone-ui/prototype/index.html`](../../design/phone-ui/prototype/index.html). On a desktop it shows a phone and its flows; on a phone it fills the screen. `design/tools/phone-ui-clickable.mjs` exports it as rendered screens with each screen's own tap areas (261 states), which is how the owner's private review copy was made. |
| Frontend handoff | [phone-ui-handoff.md](phone-ui-handoff.md): each sheet mapped to components, states, assets, audiences and the data it needs. |
| Backend and Integration | [DSN-REQ-19 to DSN-REQ-21](integration-requests.md#dsn-req-19): the dependencies, kept separate from the visual decisions. |
| Measurements | [`design/phone-ui/review/checks.json`](../../design/phone-ui/review/checks.json): every frame measured as it was drawn. |

Every name, seat, role, ballot and result in the sheets is a **labelled synthetic fixture** (`design/phone-ui/prototype/fixtures.mjs`). The label sits beside each frame, never inside the proposed interface.

## What the owner asked for

The requirements came with the request of 9 November 2026, from the owner's playtest. They are recorded in [owner-decisions.md](owner-decisions.md#9-november-2026-the-phone-interface-after-the-playtest). In short:

- **The look.** A clean, intuitive interface that feels like an iPhone app, around the approved comic-noir art, crew, rooms, cards and animations.
- **Fewer words.** No introductory paragraphs, repeated headings or repeated status lines. Keep only the labels, errors and eligibility feedback that matter.
- **One screen.** The main screen fits the phone without scrolling, without shrinking text or targets.
- **Room and Board.** The player's room is the main full-screen scene. One switch shows the whole board: the tab says **Board** in room view and **Room** in board view. Switching never moves the player.
- **Navigation.** A bottom bar with Board/Room, Actions, Pass/Vote, Card and More, using one icon family. Later that day the owner renamed More **Panels** and moved Promises and a settings menu (⋮) into the top bar (see "Top bar" and "Tabs" below).
- **Voting.** Vote replaces Pass during a vote and opens a 3 × 3 grid of the real participants. Results use the same grid.
- **The role stage.** The private role stage lasts exactly 30 seconds: the role card for 20 seconds, then the role's existing ten-second film.
- **Blackout.** It must be usable before voting.
- **A ship that moves.** Then the owner asked for rooms that are not static: windows where the ship seems to move through space, live screens, and keys and lights going on and off (9 and 10 November; see "Ambient motion in the rooms" below).

## The sheets

| | Sheets |
| --- | --- |
| Flow and system | 01 flow map · 02 round order and the Blackout placement (**Integration proposal**) · 03 phase and action matrix |
| Components | 04 foundations · 05 icon family · 06 controls, lists, feedback and cards · 07 top bar · 08 bottom navigation |
| A–E | 10 intro and main menu · 11 host · 12 join · 13 waiting and the player lobby · 14 recover · 15 host controls and a recovery code · 16 character selection |
| F–G | 17 the 30-second role stage (timeline) · 18 role stage states · 19 boarding into Round 1 |
| H–I | 20 Room A · 21 Room B · 22 Command Room · 23 Hospital · 24 Jail · 25 Private Talk capsule · 26 the whole board and switching views |
| K–N | 27 each tab, opened · 27.1–27.5 each tab, tap by tap (Board, Actions, Pass and Vote, Card, Panels) · 27.6 the top bar's Promises and ⋮, tap by tap · 28 Actions · 29 targeting and registering · 30 Blackout · 31 Card · 32 Panels and Settings · 33 Promises · 34 Windows |
| O–P | 35 Jail vote · 36 Captain election and stable placement · 37 Captain results · 38 Jail results |
| Q | 40 Captain and Officer · 41 navigation · 42 Scan and the final Code · 43 Hospital panel · 44 Blackhole, elimination and the end · 45 loading, reconnecting and the unexpected |
| Viewports and motion | 50 320 × 568 · 51 430 × 932 · 52 in Safari with its toolbars (390 × 664) · 53 larger text (150% and 200%) · 54 Reduce motion · 55 ambient motion in the rooms |
| Art | 60 approved art not yet in the playable build · 61 today's build beside this proposal |

## Design decisions

These are routine decisions, made by Designer under the brief. The owner can overrule any of them.

**One interface language around the comic.**
- The chrome is clean and dark, like iOS, with translucent bars, rounded controls, grouped lists and sheets.
- **Sheets are clear glass over the room**, at the level the owner chose on 9 November (the clearest of three).
  - A 20–34% tint, a 2 px blur, and the room behind darkened to 56%, with its colours raised to 130%. The room above a sheet isn't dimmed.
  - Boxes inside a sheet are a light dark layer (24%) with a thin light edge, and grey text on glass is brighter (`#DCE3EC`).
  - Text on glass stays at least 4.5:1 against what is really behind it (measured; see "Measured").
  - Where the phone asks for less transparency, or glass can't be drawn, sheets are solid again.
- The scenes, crew, role card, stamps and result window stay comic ink: hard ink outlines and offset shadows, halftone, captions.
- One icon family is used everywhere: 79 icons on a 24 px grid with 1.8 px round strokes. Each has an outline form and a filled form for selected.
- The interface font is the system font (SF Pro on iPhone). Condensed lettering is kept for stamps, room captions, role names and results.

**Layout.**
- The top bar and the tabs are fixed. The room scene fills the space between them.
- The scene uses the game's own positions and press areas, so every person stands where the game puts them.
- The room view is framed wider than the game's board panels: at the smallest scale that still fills that space with the room. The owner found the first draft too zoomed in on a phone (9 November).
  - At 390 × 844, people are drawn 23% smaller than in the first draft, and 30% more of the room's width shows.
  - Across, the view holds the room's centre, as the game does. It moves only as far as it must to keep everyone present 48 px inside the edges. When they are spread wider than that, it centres on them.
  - A name tag near an edge moves inward to stay whole.
  - The board's six panels keep the game's own framing.
- Every in-game sheet docks between the bars, so the phase, the clock and Pass/Vote are always visible.
- Sheets scroll inside themselves. The page never scrolls sideways.

**Top bar.**
- On the left: the active player's portrait, name and seat. With no active player (votes, Blackout, navigation, setup), the phase takes that place instead of a stale portrait.
- After the name: **Promises**, a handshake button that opens the player's Promises, with a count when an offer is waiting (the owner, 9 November). The handshake is the same grey as the other icons and turns amber, with the button, only while Promises is open.
  - On a turn bar it shows its word between two hairlines, as the owner drew it.
  - On a phase or talk bar, on a 320-pixel phone and with larger text, it is the handshake alone, so the phase title and the names keep their room.
  - The 5-second result and the 6-second Ship synchronized have no Promises button: there is no time to use it.
- On the right: the round, the server's time and the settings menu **⋮** (the owner, 9 November). ⋮ opens Settings: Reduce motion and text size, which stay on the phone, and Host controls for the host.
- Promises and ⋮ are 44-pixel targets. On a narrow bar the clock drops its icon, a phase drops its icon tile and a talk's two portraits overlap more.
- To keep its title whole beside them, the Officer appointment's bar now reads **New Officer**, with "Ben chooses" under it.
- The last ten seconds turn amber, and the 5-second and 6-second stages show a ring.

**Tabs.**
- The first tab names the other view: **Board** in room view, **Room** in board view.
- The fifth tab is **Panels** (it was More), with a stacked-layers icon unlike Board's grid, in the same grey as the other tabs (the owner, 9 November). It holds Windows, Navigation, the Hospital panel, Players and Round order. Promises and Settings moved to the top bar.
- Moving is always a separate action: tap Move, then an empty position, then Register. "Uses this round's move" is said each time.
- Pass is a raised centre button. It is enabled only on your own turn.
- Tapping Pass asks once: **Pass your turn?**, naming whose turn is next, with Cancel and Pass. A turn can't be taken back, and passing never spends the round's move.
- During a ballot Pass becomes **Vote**, and after your ballot it becomes **Voted**.
- What each button opens, and the taps after it, is drawn tap by tap on sheets 27.1–27.5, and the top bar's Promises and ⋮ on 27.6 (the owner asked for this on 9 November).

**Actions.**
- Each action is a tile with an icon and a short name, and it states its own condition: "From Round 4", "Once a match", "Used".
- On another player's turn, Move stays open (once a round), and so does the Hacker's Final Code. Every other tile says "On your turn". The first draft showed Move closed there, which the engine does not do.
- Targeting happens on the people in the scene: tapping a person opens the check with them.
- An **Other rooms** chip reaches eligible people elsewhere, as a list or on the board.
- Registering shows a REGISTERED stamp and "Nothing happens yet". No effect is drawn before the server resolves it.

**Blackout.**
- It is position targeting, shown as marks on the bound room's positions while it is dark.
- Everyone sees the same lit and dark window.
- Only the requesting Disabler's phone shows the positions.

**Votes and results.**
- Both use one 3 × 3 roster in which seat *n* is always cell *n*.
- In a 7- or 8-player match the last cells stay empty; no player is invented to fill them.
- The result reuses the approved result art (star, tie burst, cell bars, empty cell and chair).
- It shows the permitted counts and the number of eligible voters. It never shows who voted for whom.

**Main menu.**
- **Join** is the primary entry, because most of the table joins.
- **Host** is secondary. **Recover my seat** is a quiet link.
- Errors appear in place, on paper with a warning shape, never in red. Red belongs to a team.

**Privacy.**
- Team colours appear only on a player's own card, the private claim cards and the end reveal, always with words.
- Recovery codes stay on the host's phone, hidden until revealed.
- A view or tab switch reveals nothing new.

## Ambient motion in the rooms (sheet 55)

The owner asked on 9 November: "The monitors and screens look not static. Windows of spaceship in any room not static feeling like the spaceship moving in space. Some color buttons and lights on/ off generally some dynamic environment". Room A was drawn first and approved, and its window was made a voyage; Room B got a window; then: "Yes i am happy you can go for all rooms". The source is `prototype/ambient.mjs` and `ambient.css`; the timings are in the [handoff](phone-ui-handoff.md#ambient-motion-in-the-rooms).

- **Windows: a voyage each.** Stars drift past at three depths, dust clouds and a far galaxy slower still, with now and then a shooting star. Over one loop the room's own planet leaves and comes back, and other things cross the glass:
  - Room A (90 s): a ringed gold giant, a grey moon, a comet and tumbling asteroids;
  - Room B (110 s): its middle screen is now a three-pane window in the room's own style, with a teal planet, a cream banded giant, two small moons, a comet and asteroids. Its atom diagram moved to the small screen on the right wall, where the slit window was;
  - Command Room (120 s): its vast cream world sinks out of sight and rises again; a comet, a ringed cream giant, a far double star, an asteroid belt and a moon pass;
  - Hospital (100 s): its cream world sinks and rises in the tall window; a comet, a small ringed giant, asteroids and a moon go by.
- **Screens, keys and lights.** Screens retype, scroll, ping and beat (Room A's monitors and console, Room B's atom screen and readout, the Command Room's four consoles, the Hospital's heart monitor). Keys light in turn, small lights blink, bubbles rise in Room B's tank, the ward's ceiling vent turns. The Jail (no window) keeps a blinking cursor on its keypad, a standby scan on the door's display, light running along its pipes and dust in its lamp's light; the private-talk capsule's panel lamps blink and dust drifts in its lamp's light.
- **Never a game fact.** It is the same on every phone at every moment and is drawn from the room alone. No window shows a blue, red or lavender world or a black hole, and nothing follows the ship's course, which only the Captain and Officer know. No team colour is used. Nothing moves that the game uses to say something: the Command Room's chart table, the Hospital's berth monitors and lamps, the Jail's keypad keys and lamp, and the capsule's door light stay as drawn.
- **Lights out.** In the Blackout's dark pictures every screen and light is off. The windows keep moving, dimmed by the dark pictures' own rule for space (42% of the colour over the night's dark), and Room B keeps its window and moved screen in the dark.
- **Reduce motion** holds it still. The review sheets hold it at a fixed moment (`amb=<seconds>`, otherwise 0 s); `live=1` lets it run in the prototype.

## The role stage (F): 30 seconds

1. **0 to 20 s:** the role card, large: the player's own character with the role's device, the role's name, the team and two facts.
2. **20 to 30 s:** the role's approved ten-second film, the reviewed `pregame-films` role film, unchanged.
3. **At 30 s:** Ready opens. Ready stays the player's own tap.

Rules for the stage:
- **One server interval.** The phone only seeks inside it. A late load, a return from the background or Reduce motion never restarts it.
- **Concealing** hides the card but keeps the clock running.
- **Skip** returns to the card, on that phone only.
- **Missing art** leaves a text card up until Ready.
- **The film** never confirms Ready and never starts the match.

This replaces today's film, which starts when the player taps Reveal. Backend and Integration reconcile it with the 30-second reading minimum and the human Ready ([DSN-REQ-19](integration-requests.md#dsn-req-19)).

## Blackout before voting (sheet 02)

Today's authoritative order is: turns and the final talk → Blackhole Sync and its 6-second presentation, when there is one → Jail vote → 5-second result → Blackout (5 s lit, 10 s dark) → resolution → navigation. The Disabler registers `REQUEST_BLACKOUT` as their Role Action on their own turn.

The owner's order is drawn on sheet 02 and labelled **Integration proposal, pending the rules and contract update**:

> Player turns and final private conversation → Blackhole Sync and its six-second presentation, when applicable → shared Blackout window: five seconds lit, ten seconds dark → Jail voting → five-second vote result → remaining resolution and navigation.

Its consequences for strike resolution, fixed targets and the cancellation when a Disabler is jailed are Backend's to settle ([DSN-REQ-20](integration-requests.md#dsn-req-20)). The screens are the same in either order.

## The current interface, audited

The playable build at `fb33cecb` already has:
- the Join, Host and Recover forms, the host lobby with admissions and bots, and the 30-second character grid;
- Reveal, Ready and the role card;
- the boarding;
- the whole board with room-name move buttons;
- the Board, Card, Actions and More tabs with a central Pass;
- Promises, Windows, Navigation, the Hospital panel and the vote result as text;
- the end banner with Return to lobby.

This pack keeps every one of these behaviours and redesigns their presentation. Sheet 61 sets today's board and reading screen beside the proposal.

Some documents describe as pending things that the code now does. Designer's own are listed here, so nobody plans from them:

| Document | Says | The code at `fb33cecb` |
| --- | --- | --- |
| `pregame-films.md`, lines 136 and 232; `owner-decisions.md` (8 November) | No client plays the films; the boarding has no stage | `apps/game/hosted/planet/app.mjs` mounts the intro, the role film and the boarding. Boarding is in the contract and server (setup flow 2 with `design-0.8.0`). Whether it is enabled in a deployment is not confirmed here |
| `pregame-films.md`, around line 145 | A tap skips to the card | Only the Skip film button and Escape skip; a tap on the picture does nothing |
| `README.md`, line 109 | The comic page on a phone and moving by pressing a room: not adopted | The whole board (board-v2) is on the phone, with room-name move buttons |
| `integration-requests.md`: the DSN-REQ-8 closed status, and the vote, Hack, Code and result that "wait for a protocol" | Pending | Done in Planet: "Request closed.", Vote with Abstain, private talk with Declare side, the Code and a result panel |
| `phone-kit-handoff.md`, lines 3 and 25 | The five-second result is a proposal | It runs as plain text with counts; the drawn result is not adopted |

Frontend's documents have similar stale lines (for example `docs/frontend/planet-service-draft-review-2026-11-06.md`). They are Frontend's to update.

## Approved art not yet in the playable build (sheet 60)

**In the build (`design-0.8.0`):**
- the restyled crew (`crew-drawing-1.0.0`);
- the Game N intro;
- the nine role films with team-colour titles;
- the boarding.

**Approved, not in the build:**
- **The five rooms redrawn in the crew's ink, and the films' room pieces with them** (`room-drawing-1.0.0`). The owner approved them on 8 November 2026. They are in PR #197 and DSN-REQ-18, which wait on Integration.
- This pack draws the build's rooms, so it can be checked against today's game. The room views frame each scene with the same boxes and positions, so they take the new rooms unchanged.

## How to view and render

```sh
# View: any static server at the repository root, then open the prototype
python3 -m http.server 8000   # http://localhost:8000/design/phone-ui/prototype/index.html
# One state: index.html?s=vote&kind=jail&state=selected&safe=47,34
# Ambient motion: …&live=1 lets it run; …&amb=45 holds it at 45 s (otherwise at 0 s)
# Render every sheet, the contact sheet and checks.json (needs a Chromium-based browser in CHROME_PATH)
node design/tools/phone-ui-render.mjs
# Regenerate (or check) the icon exports
node design/tools/phone-ui-assets.mjs [--check]
```

The prototype imports the game's own drawing modules and art, read-only:
- the four-bed slot tables and framing from `apps/game/hosted/board-v2-drawing` and `scene-drawing`;
- the crew drawing port, `apps/game/hosted/crew-drawing`;
- the scene, lighting and capsule art from `design/board-motion` and `design/board-v2`, and the four-bed ward art;
- the night rule for lights out, `design/board-v2/scenes/lighting.mjs`;
- the crew portraits, cards and devices from `design/crew-drawing/assets`;
- the result and claim art from `scene-drawing/phone-kit-art.mjs`;
- the posters from `apps/game/candidates/planet-library`;
- the pre-game films' review stage.

Nothing in `apps/` or `packages/` imports the pack.

## What was checked, and what was not

**Run:**
- `node design/tools/phone-ui-render.mjs` drew the sheets in headless desktop Chromium. Each frame is an iframe at its exact CSS viewport (390 × 844, 320 × 568, 430 × 932 and 390 × 664) with simulated safe areas, at 100%, 150% and 200% text, with and without Reduce motion.
- While drawing, the tool measured every frame:
  - the page's horizontal overflow;
  - every control's box against 44 px (counting the declared hit-area extensions of small buttons and swatches);
  - text under 11 px;
  - ellipsis-clipped text;
  - page errors;
  - every text's contrast against what is really drawn behind it, glass and art included:
    - first each text run's colour and place;
    - then the same page with all text made transparent, captured losslessly and read back pixel by pixel;
    - the ratio is taken against the 80th-percentile luminance behind light text, and the median behind dark text;
    - text under another element, inactive controls and hidden text are left out.
- The results are in `checks.json`, and the "Measured" section below summarises them.
- `packages/design-tokens/test/phone-ui.test.mjs` checks:
  - the catalog and every sheet's screens, kept in step with the registry;
  - the review files and their hashes, and every frame's measurements (contrast included) clean;
  - the room view's framing, for every room's fixture: wider than the first draft, filling the space between the bars, with everyone present in view;
  - a tap-by-tap sheet for each tab and for the top bar's Promises and ⋮, and every tap it draws landing on a control the prototype shows;
  - the ambient motion: every room and the capsule, no team colour, the same markup every time, only the dimmed windows with the lights out, and still under Reduce motion;
  - the kit's colours against tokens 0.5.0;
  - the icon family and its exports;
  - the fixture label kept out of the interface;
  - the dev-only markers;
  - that no game code imports the pack.

**Not done:**
- No physical phone, no iOS Safari or Android Chrome, no screen reader and no performance measurement. The safe areas and Safari toolbars are simulated, not measured.
- The transitions were looked at in desktop Chromium's view transitions only.
- The ambient motion was looked at frame by frame and in recorded clips from desktop Chromium. Its smoothness, battery use and frame rate on a phone were not measured.
- None of this proves multiplayer correctness, pacing or balance.

### Measured

From `design/phone-ui/review/checks.json`, written by the render that produced the committed sheets (Google Chrome for Testing 153, headless, desktop):
- 57 sheets and 220 phone frames.
- Every one of the 17 taps drawn on sheets 27.1–27.6 lands on a control the prototype shows.
- Every text run is at least 4.5:1 against what is drawn behind it (3:1 for large text). The lowest is 4.59:1, on sheet 43.
- Measuring contrast found, and this pack fixed:
  - the top bar and tab bar samples (07, 08), which were cut in half; each sheet now has two frames;
  - the board's "You" badge and the role stage's "Ready" mark, which were amber on light;
  - the status on the player's own tag ("· Injured", "· Out"), which was grey on paper;
  - dimmed name tags, which are now muted rather than faded;
  - the Officer's "Blocked" mark, which was hidden behind the room's art;
  - a picked person's note on the 3 × 3 grids;
  - the More badge at 200% text;
  - grey words over glass on the brightest rooms.
- No frame scrolls sideways.
- No control is under 44 px.
- No text is under 11 px.
- There are no page errors.
- One top-bar subtitle is shortened with an ellipsis, by design: "Player 7 · Turn" at 200% text (sheet 53). The full words stay in the accessible name. Before Promises and ⋮ joined the bar there were four.

These are measurements of one desktop browser at each CSS size, not of a phone.

## Open questions for the owner

- **The main menu's hierarchy:** Join first and primary, as drawn, or Host first?
- **The film and the Ready button:** Ready opens at 30 s, when the film ends. Should the film be skippable before then on a player's own phone? Skip is drawn and is local only.
- **Pass in the centre outside your own turn:** it is drawn disabled, and it stays where it is so the bar never jumps.
