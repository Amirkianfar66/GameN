# Phone interface pack

**A complete phone interface design for owner review**, made from the owner's latest playtest feedback (9 November 2026). Every screen, tab and important state of the Planet game has its own sheet, plus a flow map, a phase and action matrix, a component sheet and a clickable prototype. Since 11 November 2026 it is the specification Frontend builds the phone interface from, sheet by sheet, and a change from a sheet is an exception agreed by Designer and the owner ([owner-decisions.md](owner-decisions.md#11-november-2026-the-build-follows-the-pack)). It changes no game rule, contract or deadline.

- **Branch and base:** `claude/designer-phone-ui`, from `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. That is `main` after #204, the reviewed playable baseline.
- **Pins:** protocol 3, `planet-game-1.1.0`, `in-person-planet-private-feedback-2026-11-06`, art release `design-0.8.0`.
- **Worktree:** a separate one, `/home/user/GameN-worktrees/designer-phone-ui`.
- **Other work:** Designer's other worktrees and open PRs are untouched. That includes PR #197, the approved redrawn rooms, which stay a separate adoption, and PR #78's branch.

| | |
| --- | --- |
| Sheets | [`design/phone-ui/review/sheets/`](../../design/phone-ui/review/sheets/): 61 numbered sheets. [`contact-sheet.jpg`](../../design/phone-ui/review/contact-sheet.jpg) shows all of them. |
| Clickable prototype | [`design/phone-ui/prototype/index.html`](../../design/phone-ui/prototype/index.html). On a desktop it shows a phone and its flows; on a phone it fills the screen. `design/tools/phone-ui-clickable.mjs` exports it as rendered screens with each screen's own tap areas (297 states), which is how the owner's private review copy is made. |
| Frontend handoff | [phone-ui-handoff.md](phone-ui-handoff.md): each sheet mapped to components, states, assets, audiences and the data it needs. |
| Backend and Integration | [DSN-REQ-19 to DSN-REQ-22](integration-requests.md#dsn-req-19): the dependencies, kept separate from the visual decisions. [DSN-REQ-23](integration-requests.md#dsn-req-23) asks Frontend to build the rooms' ambient motion, which the native interface (#217) does not have yet. |
| Native review | [phone-ui-native-review.md](phone-ui-native-review.md): Designer's visual review of the native interface adopted in #217, against these sheets, part by part from the menu to the end, with pictures. Not accepted yet. |
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
| K–N | 27 each tab, opened · 27.1–27.5 each tab, tap by tap (Board, Actions, Pass and Vote, Card, Panels) · 27.6 the top bar's Promises and ⋮, tap by tap · 28 Actions · 29 targeting and registering · 29.1 registered: waiting for the end of the round · 29.2 accepted: what happens at once · 30 Blackout · 31 Card · 32 Panels and Settings · 33 Promises · 33.1 Promise results, one match moment each · 34 Windows |
| O–P | 35 Jail vote · 36 Captain election and stable placement · 37 Captain results · 38 Jail results |
| Q | 40 Captain and Officer · 41 navigation · 42 Scan and the final Code · 43 Hospital panel · 44 Blackhole, elimination and the end · 45 loading, reconnecting and the unexpected |
| Viewports and motion | 50 320 × 568 · 51 430 × 932 · 52 in Safari with its toolbars (390 × 664) · 53 larger text (150% and 200%) · 54 Reduce motion · 55 ambient motion in the rooms · 56 320 × 568 at the Largest text |
| Art | 60 approved art not yet in the playable build · 61 today's build beside this proposal |

## Design decisions

These are routine decisions, made by Designer under the brief. The owner can overrule any of them.

**One interface language around the comic.**
- The chrome is clean and dark, like iOS, with translucent bars, rounded controls, grouped lists and sheets.
- **Sheets are clear glass over the room**, at the level the owner chose on 9 November (the clearest of three).
  - A 20–34% tint, a 2 px blur, and the room behind darkened to 56%, with its colours raised to 130%. The room above a sheet isn't dimmed. The owner kept this level on 10 November.
  - Light words on glass carry a soft dark halo (three shadows with no offset, 1, 3 and 8 px). It darkens only what is right around each letter, so the glass stays clear while grey words keep 4.5:1 over the brightest art. Dark words on light fills (buttons, paper pills, stamps, badges, the comic cards) have none.
  - Boxes inside a sheet are a light dark layer (24%) with a thin light edge, and grey text on glass is brighter (`#DCE3EC`).
  - Text on glass was measured letter by letter against what is drawn behind it, in these renders (see "What was checked").
  - Where the phone asks for less transparency, or glass can't be drawn, sheets are solid again.
- The scenes, crew, role card, stamps and result window stay comic ink: hard ink outlines and offset shadows, halftone, captions.
- One icon family is used everywhere: 79 icons on a 24 px grid with 1.8 px round strokes. Each has an outline form and a filled form for selected.
- The interface font is the system font (SF Pro on iPhone). Condensed lettering is kept for stamps, room captions, role names and results.

**Layout.**
- The top bar and the tabs are fixed. The room scene fills the space between them.
- The scene uses the game's own positions and press areas, so every person stands where the game puts them.
- The room view is framed wider than the game's board panels: at the smallest scale that still fills that space with the room. The owner found the first draft too zoomed in on a phone (9 November).
- Nobody present is cut off (the owner's decision of 11 November, T1): not their press area, and no part of their figure as drawn. When the people present reach past the filled view, it zooms out just far enough to keep each of them whole. The bands above and below are the cost.
  - Where nobody needs more room, people at 390 × 844 are drawn 23% smaller than in the first draft, and 30% more of the room's width shows.
  - Across, the view holds the room's centre, as the game does. It moves only as far as it must to keep everyone present 48 px inside the edges and every figure 4 px inside. When they are spread wider than that, it centres on them.
  - **Each figure as drawn.** The frame uses each present figure's outline, not only its press point. Frontend and Integration found on #222 that press points alone cut A3's reach at the floor hatch in a full Room A.
    - `figure-extents.mjs` holds every gesture's outline (plain, Injured and still), measured from its pixels. Each is the union over the nine characters, three outfits and both layers, drawn by `design/tools/phone-ui-figure-extents.mjs`.
    - A margin covers the crew's own motion: the head's idle drift and tilt, and Mira's and Echo's hanging hair. It is 8 units across and 6 above. Where the same tool measured that motion reaching further, the measured reach applies instead. Only the hair of a figure lying on the Jail's cot does.
    - An Eliminated figure counts as its place's still pose.
  - Up and down, the view keeps every place's outline and press area, whoever is present. It may show the picture's own border where an outline reaches it.
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
- To keep its title whole beside them, the Officer appointment's bar now reads **New Officer**, with "Ben chooses" under it, and the Captain's own reads **Appoint Officer**.
- With larger text (the bar under 16 rem: 150% below 384 px, 200% below 512 px) the round leaves the bar, and a phase with a short title shows it: "Vote result" for "Jail vote · result" and "Election · result". With the Largest text on the smallest phones the title takes two lines instead of its subtitle. The full title stays for screen readers.
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
- **Other rooms** opens the board with everyone the action can reach pressable where they stand, the rest dimmed (Integration's review: the owner wants actions applied by selecting characters in their rooms). The board's **List** gives the same choice as text, room by room, for screen readers or by preference (sheet 29).
- After Register, each action says what the server's acceptance did, in Frontend's words where they exist (sheets 29.1 and 29.2; the [handoff](phone-ui-handoff.md#after-register) has the table):
  - **Waiting** (Rescue, Protection, Supply, a shot, Blackout): an outline REGISTERED stamp, "This is not a result", and a time line whose next step is still open. Protection says it is active from the next round. Nothing is drawn on the target.
  - **Accepted** (a private talk): it starts after the current turn; the top bar shows each step.
  - **At once:** a Clone is ACTIVE from acceptance through the following round's attacks (CLONE-01, P17); the Engineer's capture names who was in the other room, now (P14).

**Blackout.**
- It is position targeting, shown as marks on the bound room's positions while it is dark.
- Everyone sees the same lit and dark window.
- Only the requesting Disabler's phone shows the positions.

**Private talk.**
- The target declares a side on three claim cards, the same three for every role (HACK-DECLARE-02). A role that must declare its own side finds the other two disabled ("Not for your role"), on its own phone only; the Undercover and the Alien may choose any. The [handoff](phone-ui-handoff.md#hack-declaration-eligibility) maps each role and [DSN-REQ-22](integration-requests.md#dsn-req-22) asks for the sides in the offer.

**Promises.**
- A player gives at most one Promise and receives at most one in a match, so the results list holds two at most. Sheet 33.1 shows each result state as its own match moment: Pending, Fulfilled, Not fulfilled, Condition not met.
- Captain Support's terms: the giver votes for the recipient "in every ballot of that election in which the recipient is a candidate"; if the recipient is a candidate in none, the result is Condition not met (P23).

**Votes and results.**
- Both use one 3 × 3 roster in which seat *n* is always cell *n*.
- In a 7- or 8-player match the last cells stay empty; no player is invented to fill them.
- The result reuses the approved result art (star, tie burst, cell bars, empty cell and chair).
- It shows the permitted counts and the number of eligible voters. It never shows who voted for whom.
- **With the Largest text on a small phone** (sheet 56, 320 × 568 at 200%) the 3 × 3 becomes a list of whole names with their counts, the result's stamp and art step aside (its headline says the same), and the headline, the names and the foot scroll as one column. Seat badges grow with the text. In each row the portrait is the size of the seat number beside it and on the name's line, and the count matches them (the owner, 10 November). At 390 × 844 and 100% nothing changes.
- In the 3 × 3 results the count holds a cell's top-left corner and "You" its top-right one, so neither covers the other. Each count is shown once, by its badge: no "N votes" line under the name (the owner, 10 November); the cell's accessible name still says it.

**Larger text on a narrow phone** (the owner, 11 November: "Yes, apply the Actions fix to all screens").
- Words reflow instead of being cut off. At 100% text every screen is as before, pixel for pixel.
- The layouts follow the phone's width in em, the player's text size included: under 19 em is the Large or Largest text on any phone up to 456 px. The [handoff](phone-ui-handoff.md#larger-text-on-a-narrow-phone) has every threshold.
- **Action tiles** become rows: the icon on the left, the name and state beside it, REGISTERED under them, as ballots and results become rows.
- **A list's value** goes under its title: "Your quota", then "Given 0/1 · Received 1/1".
- **A segmented control** whose words no longer fit (Card · Knowledge · Resources; Standard · Large · Largest) stacks, one option per row.
- **Buttons** that no longer fit side by side take a row each. A label wraps inside its button.
- **Pills, chips and toasts** wrap onto two lines, 16 px clear of the phone's sides.
- **Sheets on short phones** (320 × 568, and 390 × 664 in Safari, at the Largest text): the title scrolls with the content, and the buttons at the foot stay in place.
- **The room code** takes the card's width, all six characters inside it, and Copy goes under it.
- **The end of a match** scrolls as one column, the poster, title and roles, above Return to lobby. The title stops growing where its longest word fits.
- **The board** is a map at a fixed scale: its tags and captions stop growing at the Large size, and your room's You badge keeps only its icon.
- Also: the main menu's actions scroll when offline, the role stage's card and foot share the height, the room-art fallback is one column, and the private talk's two buttons stack.
- Sheet 56 shows them at 320 × 568 with the Largest text.

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

- **Windows: one voyage for the whole ship.** The owner asked whether the windows were aligned, "because overall the complete spaceship passing space", then: "yes align them". So every window looks out at one sky on one clock:
  - **One sky.** The same things pass every window, right to left: a comet, a ringed gold giant, a far double star, a teal world, an asteroid belt, a ringed cream giant, a cream banded giant, a grey moon and two small moons. Each reaches the Command Room's window first, then Room A's, Room B's and the Hospital's, 6 s apart, in the order the board stacks the rooms.
  - **One home world.** At rest every window shows the same cream world low in the glass, as Room A's, the Command Room's and the ward's art draw it; Room B's new window shows it too. It sinks out of every window together and rises back together.
  - **One speed and one clock.** Stars at each depth, dust and every passer move at the same speed in every room. The 4-minute voyage runs on the ship's one clock (the match's server time in the game), so every room and every phone shows the same moment, and switching rooms carries on instead of starting again.
  - Stars drift at three depths, dust clouds and a far galaxy slower still, with now and then a shooting star.
  - Room B's middle screen is now a three-pane window in the room's own style; its atom diagram moved to the small screen on the right wall, where the slit window was.
- **Screens, keys and lights.** Screens retype, scroll, ping and beat (Room A's monitors and console, Room B's atom screen and readout, the Command Room's four consoles, the Hospital's heart monitor). Keys light in turn, small lights blink, bubbles rise in Room B's tank, the ward's ceiling vent turns. The Jail (no window) keeps a blinking cursor on its keypad, a standby scan on the door's display, light running along its pipes and dust in its lamp's light; the private-talk capsule's panel lamps blink and dust drifts in its lamp's light.
- **Never a game fact.** It is the same on every phone at every moment and is drawn from the room alone. No window shows a blue, red or lavender world or a black hole, and nothing follows the ship's course, which only the Captain and Officer know. No team colour is used. Nothing moves that the game uses to say something: the Command Room's chart table, the Hospital's berth monitors and lamps, the Jail's keypad keys and lamp, and the capsule's door light stay as drawn.
- **Lights out.** In the Blackout's dark pictures every screen and light is off. The windows keep moving, dimmed by the dark pictures' own rule for space (42% of the colour over the night's dark), and Room B keeps its window and moved screen in the dark.
- **Reduce motion** holds it still. The review sheets hold every room at the same moment (`amb=<seconds>`, otherwise 0 s); `live=1` runs it in the prototype on the ship's clock.

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

Its consequences for strike resolution, fixed targets and the cancellation when a Disabler is jailed are for Integration to settle ([DSN-REQ-20](integration-requests.md#dsn-req-20)). The screens are the same in either order. In both, Frontend freezes the camera's framing and every target's geometry for the whole Blackout, including the transition when the runtime hides the board.

**Opened in the dark** (#222; sheet 30's last two frames). A phone that opens or reloads during the dark window rebuilds its frame from the same window's public lit board, as Integration confirmed on #222. When it cannot, it does not guess:
- **When:** the same response's public PRE_BLACKOUT board is missing or fails any of Integration's checks, or the match runs a tuple before 1.3, which has no such board.
- **Framing:** the room is framed as if every one of its places were occupied, by the same `phoneFrame` (`paintRoom`'s `frameAll`). That depends only on the room, the match's player count and the phone's own view, all known without the board.
- **What shows:** exactly the dark room of sheet 30. There are no figures, names, tags or occupancy. For the Disabler, every position is a target, as in any dark room, with the list of positions as the text alternative. There is no new copy, and nothing says the frame was rebuilt.
- **Held:** for the rest of the window, as any dark frame.
- **The phone's view:** no earlier camera or view is ever restored, and the server keeps none. Every frame, the lit one too, is computed for the phone's current view. If the view changes in the dark (rotation, window size, text size), the frame is recomputed from the same inputs, and a picked position stays picked by its id.

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
# Measure every gesture's outline and the crew motion's reach (writes prototype/figure-extents.mjs)
node design/tools/phone-ui-figure-extents.mjs [--check]
# Count every figure's pixels inside the room view (writes review/framing-check.jpg and .json)
node design/tools/phone-ui-framing-check.mjs
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
- `node design/tools/phone-ui-render.mjs` drew the sheets in headless desktop Chromium. Each frame is an iframe at its exact CSS viewport (390 × 844, 320 × 568, 430 × 932 and 390 × 664) with simulated safe areas, at 100%, 150% and 200% text, with and without Reduce motion. Sheet 56 is the smallest phone with the Largest text (320 × 568 at 200%).
- While drawing, the tool measured every frame:
  - the page's horizontal overflow;
  - every control's box against 44 px (counting the declared hit-area extensions of small buttons and swatches);
  - visible text under 11 px, including text screen readers skip (a short title, a count badge);
  - **text cut off for good:** every character outside a box that clips without scrolling (an ellipsis, a line clamp, hidden overflow). Across, any part of a character's advance outside counts; down, its middle (a character's box is its font's full height, a pixel or two taller than a tight line). Text inside a scroller, which a player can scroll to, is counted separately and not as cut;
  - page errors;
  - **text contrast, letter by letter:**
    - every visible character of every text run, with its box, its run's colour (with its alpha and every ancestor's opacity) and its threshold: 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold);
    - four lossless captures of the page at 1 px per CSS px: as drawn, every letter filled black, every letter filled white (both without shadows), and every letter transparent. The transparent capture keeps a text's own halo, a shadow with no offset, as part of its background, as WCAG's Understanding of 1.4.3 counts a wide halo as background; drop shadows and decorations are removed;
    - white minus black is each pixel's glyph coverage. A letter's ink is the pixels it covers at least half; where letter boxes overlap, a pixel goes to the nearest letter, and a fully covered pixel whose drawn colour disagrees with its run's colour over the background is not counted as that letter's;
    - at every ink pixel and each pixel touching it, inside the letter's visible box, the WCAG 2 ratio between the run's colour (composited by its alpha) and the transparent-text capture. **A letter's ratio is its lowest pixel's; a run's is its lowest letter's;**
    - **moving backgrounds:** wherever a frame shows a room, its ambient motion was held at 16 moments of the 240-second voyage (every 15 s) besides the frame's own, the transparent-text capture repeated at each, and every letter kept its lowest ratio over all of them. A letter is counted as over a moving background where its background changed between moments;
    - not measured: characters under another element; visually hidden text; inactive controls (aria-disabled or disabled, which WCAG 1.4.3 exempts); text that is part of a picture (the rooms' art and ambient layer, a result's art); the simulated phone status bar; text inside the films (their own documents); and text in form fields (typed values, placeholders).
- The results are in `checks.json`, and the "Measured" section below summarises them.
- **The room view keeps everyone whole** (T1, corrected on #222).
  - **The outlines:** `node design/tools/phone-ui-figure-extents.mjs` measured every gesture's outline. It drew each gesture plain, Injured and still, with each of the nine characters in each outfit, both layers: 2,592 drawings in all.
  - **The crew's motion:** the tool read its range from `crew-drawing/motion.mjs` (the head's drift up to 1.3 and 0.35 units and its tilt up to 2.4°; the hanging hair up to 6). It then drew every gesture that moves at each corner of that range: 6,720 drawings. The motion reaches at most 8 units across, 1.7 above and nothing below, except the hair of a figure lying on the Jail's cot (9.4 across, 7.4 below).
  - **The pixel check:** `node design/tools/phone-ui-framing-check.mjs` counts each figure's pixels inside the room view, as Frontend's native check does.
    - It covers every room full, standing and with everyone Eliminated in place.
    - The nine characters are turned through the places, with 7, 8 and 9 players.
    - Each case is drawn on Frontend's native 386 × 712 panel and the pack's 390 × 844, 320 × 568, 320 × 568 at 200% text and 430 × 932, with Frontend's own failing case among them.
    - Each figure is counted as drawn and at every corner of the crew's motion.
  - **Result:** 452 cases, 1,810 figures, 2,350 figure layers, every one 100% visible (`review/framing-check.json`, with its picture).
  - **Against `main`:** the same check at `606537fe`, before the correction, run on 52 cases (each room's first turn of characters, and Frontend's case), finds someone cut in 33 of them, the worst at 55.6% visible.
- `packages/design-tokens/test/phone-ui.test.mjs` checks:
  - the catalog and every sheet's screens, kept in step with the registry;
  - the review files and their hashes, and every frame's measurements clean: no text cut off, every letter at its threshold at every moment, the moments recorded, and the result and ballot at 320 × 568 with 200% text among the frames;
  - each action's state after Register (no waiting action drawn as a result; a private talk, a Clone and the Engineer's capture as they happen), Other rooms chosen on the board with the list as its alternative, the declarable sides for every role, and Promise results that fit the lifetime quota, with Captain Support's terms;
  - the room view's framing, for every room's fixture: wider than the first draft, filling the space between the bars, with everyone present in view;
  - every present figure whole in over 500 framings (every room, 7 to 9 players, each place alone, each pair and everyone, standing and Eliminated, on five panels): its outline 4 px inside the view and its press area whole;
  - each outline holding its gesture standing and Injured, and the crew motion's measured reach, and the outlines measured from the modules as they are (their hashes);
  - a tap-by-tap sheet for each tab and for the top bar's Promises and ⋮, and every tap it draws landing on a control the prototype shows;
  - the ambient motion: every room and the capsule, no team colour, the same markup every time, only the dimmed windows with the lights out, and still under Reduce motion;
  - the kit's colours against tokens 0.5.0;
  - the icon family and its exports;
  - the fixture label kept out of the interface;
  - the dev-only markers;
  - that no game code imports the pack.

**What the contrast check does not establish:**
- It measures these renders: desktop Chromium's text rasterisation and its glass (`backdrop-filter`) at 1 device pixel per CSS pixel, in sRGB. A phone's screen, its brightness, glare, a different font rasteriser or 2× and 3× pixels were not measured.
- The ambient motion was sampled at moments, not continuously: a small passer can cross behind a letter between two samples. The live room changes continuously; the margins below are what was seen at the samples.
- The WCAG 2 ratio is a proxy for legibility. It says nothing about reading speed, colour vision or a screen reader.

**Not done:**
- No physical phone, no iOS Safari or Android Chrome, **no screen reader** and no performance measurement. The safe areas and Safari toolbars are simulated, not measured.
- The transitions were looked at in desktop Chromium's view transitions only.
- The ambient motion was looked at frame by frame and in recorded clips from desktop Chromium. Its smoothness, battery use and frame rate on a phone were not measured.
- None of this proves multiplayer correctness, pacing or balance.

### Measured

From `design/phone-ui/review/checks.json`, written by the render that produced the committed sheets (Google Chrome for Testing 153, headless, desktop):
- 61 sheets and 245 phone frames.
- Every one of the 19 taps drawn on the sheets lands on a control the prototype shows.
- **32,613 letters** measured; 381 of them over a moving background. Every letter is at least 4.5:1 at every pixel of its ink (3:1 for large text), at every sampled moment. The closest to its threshold: 4.71:1 against 4.5:1, the “n” of “Be in Room A when voting starts”, a Promise kind's small print on glass (sheets 25 and 33).
- 27 characters had no ink of their own to measure (marks too thin or too small to be half-covered); they are counted, not hidden.
- **No text is cut off** in any frame.
- The letter-by-letter check found what the earlier one (the 80th-percentile or median background behind a whole run) passed: 43 text runs below their threshold in 34 frames, the worst at 1:1. This pack fixed them all:
  - grey words on glass over the brightest art: a soft dark halo under light words on glass, with the glass kept at 56% (the owner, 10 November);
  - the amber target ring drawn across a name tag on the board: tags now sit above rings;
  - "You abstained", which sat at the foot of the roster under the sheet's footer: it is now above the roster;
  - a room-code letter's tail touching its box at 200% text: the boxes grow with their letter;
  - seat badges that stayed 22 px while their digits grew with the text.
- Found by eye and fixed: in the 3 × 3 results "You" covered the player's own vote count; in the large-text rows a portrait was smaller than the seat number beside it and sat between two lines (the owner, 10 November).
- Cut-off text found and fixed: the Captain's "Appoint an Officer" title (now "Appoint Officer"), top-bar titles at 150% on a 390 phone (the round now leaves the bar there), and the result's title and names at 320 × 568 with 200% text.
- Then, at 320 × 568 with 200% text, every state of the pack (195: every part of the native comparison and every review frame) was loaded and each character checked: words were cut off in 49 of them, from the action tiles to the end of a match (11 November). They now reflow ("Larger text on a narrow phone" above), and none is cut at 150% or 200% on the 320, 390 and 430 phones. At 100% text all 197 states drawn at 390 × 844, 320 × 568 and 430 × 932 are the same as before, pixel for pixel. Both were one-off checks in desktop Chromium, not kept as tools.
- No frame scrolls sideways. No control is under 44 px. No visible text is under 11 px. There are no page errors.

These are measurements of one desktop browser at each CSS size, not of a phone.

## Integration's review of `d52a8ae9` (10 November 2026)

| Finding | What changed | Where |
| --- | --- | --- |
| 1. Large-text voting results | The result window and the ballot respond to text size: a list of whole names, the stamp and art aside, one scrolling column; seat badges scale; top-bar titles shorten at larger text | Sheets 35–38, 50, 53; **56** (320 × 568 at 200%, measured) |
| 2. Action feedback | Each action's own state after Register, in Frontend's words where they exist | Sheets 27.2, 29, **29.1, 29.2**; [handoff](phone-ui-handoff.md#after-register) |
| 3. Cross-room targeting | Other rooms opens the board with the reachable people pressable; the list is its text alternative | Sheets 26, 27.1, **29** |
| 4. Hack declarations | Three identical side cards; the sides a role may not claim are disabled on its own phone | Sheet **25**; [handoff](phone-ui-handoff.md#hack-declaration-eligibility); [DSN-REQ-22](integration-requests.md#dsn-req-22) |
| 5. Contrast evidence | The letter-by-letter check over bright and moving backgrounds, described above with its limits | `sheet.mjs`, `phone-ui-render.mjs`, `checks.json` |
| 6. Promise examples | One match moment per result state, within the quota; Captain Support's P23 wording | Sheets 33, **33.1** |

Recorded from the review's coordination notes:
- **Blackout:** Frontend freezes the camera's framing and target geometry throughout, including the transition when the runtime hides the board ([handoff](phone-ui-handoff.md#motion)).
- **DSN-REQ-19:** a server-owned 20-second card and 10-second film; Ready stays manual.
- **DSN-REQ-20:** Blackout before voting waits for Integration's strike timing, target binding and cancellation.
- **DSN-REQ-21:** the Hospital keypad still receives an empty target list. The final Code's window is settled by P18 (Round 2 until navigation), as the matrix draws it; the October voting restriction is superseded.
- **PR #197's** redrawn rooms stay a separate adoption.

## Open questions for the owner

- **The main menu's hierarchy:** Join first and primary, as drawn, or Host first?
- **The film and the Ready button:** Ready opens at 30 s, when the film ends. Should the film be skippable before then on a player's own phone? Skip is drawn and is local only.
- **Pass in the centre outside your own turn:** it is drawn disabled, and it stays where it is so the bar never jumps.
