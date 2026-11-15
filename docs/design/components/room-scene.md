# Room scene: Designer's runtime component

**Version:** `room-scene-0.2.0`. **Status (15 November 2026):** revised for Frontend's source review of `03029b34` on #261, and ready for Frontend to connect. It is not in the game yet. Integration first admits its module graph to the hosted build and registers the room art's version. It is not a release.

**What it is:** the room surface of the phone's room view, as the phone pack draws it. The game imports it as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects data, actions, navigation and lifecycle, and does not rebuild, restyle or copy it.

**Covers:**
- the rooms on sheets 20–24;
- the Blackout on sheet 30, with the frame held for the whole window and the opened-in-the-dark fallback;
- the room picture unavailable on sheet 45;
- the ambient motion on sheet 55 (DSN-REQ-23);
- the framing, the room's own control and the name tags of #222 items 1 and 34;
- the approved room pictures, `room-drawing-1.0.0` (DSN-REQ-18), through the art bundles.

## What changed in 0.2.0

Frontend's four findings on `03029b34`, and what each now does:

| Finding | Now |
| --- | --- |
| P1: the held frame reset on a resize | A Blackout window keeps one frame, and the size it was made for, through any change of size, insets, people or lights, lit and dark. The frame and every press square stay put until the window ends or a differently named one begins. `hold` takes the window's id |
| P1: `layout()` gave who was where in the dark and concealed | `layout().people` is empty unless the lit room shows them. The offers and the room's control are dropped when the scene is concealed or its viewer changes. Concealed, the scene's name is "Room hidden". After `dispose()`, `layout()` is `null` |
| P2: a still voyage was re-timed on every update | A still voyage samples its moment once and no update moves it, whatever the clock does. It goes back on the clock when it runs again. With no trusted clock ever given, it stands at 0 s |
| P2: the control and the positions were rebuilt on every update | Every control, position, press square and card is kept by its id and changed in place, so the focus stays with it. Unavailable ones use `aria-disabled` and stay focusable. Only an offer that ends moves the focus: to the scene, then `onFocusReturn` says which one ended |

The browser probe in `preview/probe.mjs` covers each one under the production headers, as listed below. On `03029b34` the same probe fails 15 of its 19 checks.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `room-scene/room-scene.mjs` | `mountRoomScene()`, `nextRoomSceneInput()`, `roomSceneFrame()`, `roomScenePlaces()`, `seatNumber()`, `ROOM_NAMES`, `ROOM_SCENE_DEFAULTS`, `ROOM_SCENE_VERSION` |
| `room-scene/room-scene.css` | Every style, scoped under `.ms-room-scene`; it imports `ambient.css` |
| `room-scene/framing.mjs` | `phoneFrame`, `paintedExtent`, `pressRects`: the pack's framing (T1 as corrected in #229) |
| `room-scene/figure-extents.mjs` | The measured outlines the framing needs, written by `design/tools/phone-ui-figure-extents.mjs` |
| `room-scene/ambient.mjs`, `ambient.css` | The ambient layer and its keyframes |
| `room-scene/room-art.mjs` | `ROOM_ART` and `roomLayers()`: each room's pictures by the CSS property its bundle defines |
| `icons.mjs` | The phone interface's icon family |
| `room-scene/preview/` | Development only: the preview on the pack's synthetic fixtures, and the lifecycle probe (`probe.mjs`) |
| `room-scene/review/` | The check's captures and `check.json` |

**Used unchanged**, already in the hosted graph:
- `apps/game/hosted/board-v2-drawing/slots-four.mjs`, `fit-four.mjs` and `lighting.mjs`;
- `apps/game/hosted/scene-drawing/frame.mjs`, `body.mjs` and `gestures.mjs`;
- `apps/game/hosted/crew-runtime.mjs`: the crew figures, their idle motion and each match's art pins, through `@mothership/contracts`.

**One source:**
- The pack's prototype re-exports the component's ambient layer and outlines.
- The pack's `art.mjs` and `icons.mjs` are pinned byte for byte by the frozen Food release (`docs/integration/food-consumer-source-2026-11-13.json`), so they stay as they are for now. The component holds the runtime copy of their framing and icons, and `room-scene.test.mjs` checks that both give exactly the same results: every frame for every room, roster, size and number of people, every outline and every icon.
- When Integration moves those pins, the pack's two files re-export the component's too.

## Mount, update and dispose

```js
import { mountRoomScene } from '…/design/phone-ui/components/room-scene/room-scene.mjs';
import '…/design/phone-ui/components/room-scene/room-scene.css';

const scene = mountRoomScene(host, input, { onSeat, onSlot, onControl, onFocusReturn });
scene.update({ ...changes });  // any inputs; the rest stay
scene.suspend();               // backgrounded: every animation stands still
scene.resume();                // foregrounded: back on the clock
scene.layout();                // { frame, places, people }: see below
scene.dispose();               // removes the element, its listener and the crew's mounts
```

- **The host:** an element Frontend places between the app's bars. The component appends one child, `.ms-room-scene`, of exactly `size`.
- **On update:**
  - People are kept by seat, so a figure's idle motion carries on. Controls, positions, press squares and cards are kept by their id and changed in place.
  - The frame is worked out again only when the room, the roster, the size or the people the lit room shows change, and never during a hold.
- **To resize:** `update({ size })`. During a hold, see below.

### The hold: one frame for a whole Blackout window

- **Pass** `hold` as the Blackout window's id, from the app's own Blackout state, for the whole window: its lit seconds and its dark ones. No gameplay field or phase timing is needed. `hold: true` holds a window Frontend does not name. The lights out with no `hold` also holds.
- **Held:** the frame, the size it was made for and every press square stay exactly where they are, whatever the size, the insets, the people or the lights do. A hold that begins lit frames the room as it is then; one that begins in the dark keeps the last lit frame.
- **During a resize in a hold:** the scene's element takes the new size at once. The room, the people's places and the press squares keep their pixel positions from the scene's top left. A larger space shows the scene's background at its far edges, and a smaller one clips them, until the window ends. The room's name and its control follow the new size: they are not geometry.
- **The hold ends**, and the room is framed again in the current size, when `hold` is cleared with the lights on, or when a window with a different id begins. A different room or roster frames afresh.
- **Opened in the dark** with no frame to keep, it frames the `people` given (Frontend's public pre-Blackout board) or, with none, every place as if occupied: the fallback depends only on the room and the phone.
- `roomSceneFrame(state, previous)` is the same rule as a plain function, for Frontend's own tests.

### `layout()`

```js
{
  frame: { k, tx, ty, panel: { width, height }, held, window, cold },
  places: [{ slot, left, top, side }],   // each place's press square: the room's neutral geometry
  people: [{ seat, slot, left, top, side }],  // who is where: only while the lit room shows them
}
```

- **Coordinates:** CSS pixels from the scene's top left. `panel` is the size the frame was made for; during a hold it can differ from `size`.
- **Who is where:** only while the room is lit and not concealed. In the dark and concealed, `people` is empty and the rest is geometry alone: no seat and no person.
- **After `dispose()`:** `null`.
- **The text alternative** (the list of people, #222 R3) is Frontend's, built from `layout().people`, so in the dark and concealed it lists nobody.

## Inputs

There are two audiences:

- **The public board:** the room, its art and who is in it, the same for every phone.
- **This viewer's own:** `self`, `targets` and `control`. These are viewer-authorized: give a phone only its own player's current offers and control. A shared display gets `self: null`, no `targets` and no `control`, and never another player's targeting state.
  - The component drops `targets` and `control` when the scene is concealed, and does not keep them for when it shows again.
  - It also drops them when `self` changes, unless the same update gives the new viewer's own.

No input carries a role, a team or any other private fact.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `room` | Public | `'room-a'` | `'room-a'`, `'room-b'`, `'command-room'`, `'hospital'` or `'jail'` |
| `roster` | Public | `9` | 7, 8 or 9: which table of places |
| `size` | Phone | 390 × 640 | `{ width, height }`: the room area between the app's bars, in CSS pixels |
| `insets` | Phone | `{ top: 46, bottom: 8 }` | The room's name sits in the top inset; the bottom inset keeps the last press square off the tabs |
| `people` | Public | `[]` | `[{ seat, number?, slot, character, name, health, office }]`: who the lit room shows. `health` is `'Healthy'`, `'Injured'` or `'Eliminated'`; `office` is `'captain'`, `'officer'` or `null`; `number` defaults to the digits of `seat` |
| `active` | Public | `null` | The seat whose turn it is: the turn mark |
| `self` | This viewer | `null` | This phone's seat: the tag that reads "You". `null` for a shared display |
| `lighting` | Public | `'lit'` | `'lit'` or `'dark'` |
| `hold` | Public | `null` | The Blackout window's id, `true` for one not named, or `null`: see the hold |
| `targets` | This viewer | `null` | `{ seats, picked }` (people) or `{ slots, picked, icon }` (empty positions): only this viewer's current offers |
| `control` | This viewer | `null` | `{ id, label, icon, enabled, kind }`: the room's own control, such as "Windows · 2" (`kind: 'button'`), or the Jail's "Detained · you can still vote" (`kind: 'status'`) |
| `status` | Phone | `'live'` | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `artReady` | Phone | `true` | `false` once the room pictures failed to load: sheet 45 |
| `clock` | Public | `null` | `{ now }`: the match's trusted server time, for the voyage. `null` means no trusted clock |
| `reducedMotion` | Phone | `false` | The player's Reduce motion; the device's setting is honoured as well |
| `interactive` | Phone | `true` | Whether this surface takes taps now |
| `versions` | Public | `null` | The match's pinned art versions, passed to the crew runtime |
| `label` | Phone | `true` | Show the room's name |

## Callbacks

- `onSeat(seat)`: a tap on an offered person.
- `onSlot(slotId)`: a tap on an offered empty position.
- `onControl(id)`: a tap on the room's own control.
- `onFocusReturn({ intent, value })`: the focused offer or control ended (`intent` is `'seat'`, `'slot'` or `'control'`), and the focus is now on the scene itself. It is called after the update has finished, and only if the focus is still on the scene. Frontend may move the focus on, for example to the next step's control.

The first three report intent only, and only while `interactive` and `status: 'live'`. Frontend checks the current offer and sends the command. The component never decides eligibility, spends anything, resolves anything or advances the game.

## States

| State | What shows |
| --- | --- |
| Lit | The room filling the space, with every present figure whole (T1): the crew, the tags, the turn mark, the room's name and its control |
| Targets | A ring on each offered person and a stronger one on the picked person; everyone else is dimmed |
| Empty positions | A dashed square on each offered position; the picked one turns solid amber |
| Dark | The dark picture, with nobody and no tags. The frame and the press squares are held from the last lit frame, through any resize. Only the windows move, dimmed, and offered positions still show |
| Opened in the dark | With no lit frame and no `people`, the room is framed as if every place were occupied. With Frontend's public pre-Blackout board as `people`, it is framed from that board |
| Stale | The last room, dimmed, with no control. Offered people and positions stay where they are but take no taps (`aria-disabled`), so the focus stays on them. The banner belongs to the shell |
| Concealed | A plain cover. Nothing of the room is drawn or named, no picture is requested, every animation stops, and the offers and control are dropped |
| Reduce motion | The voyage and the crew stand still where they are |
| No clock | The voyage stands still at 0 s, the same on every phone |
| Room picture unavailable | Sheet 45's notice, with each person as a portrait card (number, name, place). Taps and the control still work |

## Art and versions

- **The room pictures:** each is reached by the CSS property its art bundle defines, for example `--bm-scene-room-b-back`, as listed in `room-art.mjs` and in the release manifest. So a phone draws the art its match's bundles carry.
  - Today's bundles carry the old pictures.
  - DSN-REQ-18 builds `room-drawing-1.0.0` into new bundles, and a new match then shows the approved rooms, while a pinned match keeps its own.
  - The preview sets the properties from the release's files.
- **The crew:** drawn by the game's `crew-runtime.mjs` with `versions`. A match pinned to the crew release gets the approved crew, with its idle motion.

## The ambient clock

- **One clock for every phone:** the time since `SKY_EPOCH` (1 November 2026, UTC). In the game, `clock.now()` is the match's server time, so every phone shows the same moment of the voyage.
- **Running:** while the scene is live, not suspended, in motion (neither the game's nor the device's Reduce motion) and has a trusted clock. It is set to the clock when it starts running and when the room's pictures are rebuilt, and then runs on its own. Frontend's model updates every 250 ms never re-time it.
- **Standing still:** reduced, reconnecting, suspended or concealed. It samples one moment when it stops: where it stood, or the clock's moment if it was not running. No update moves it, whatever the clock does. It goes back on the clock when it runs again.
- **No trusted clock:** with none ever given, it stands still at 0 s. A clock withdrawn while it runs leaves it standing where it was, with no jump.
- **Purely decorative:** it shows no game fact, takes no taps, never moves a press square and never times anything in the game.

## Privacy

- **Public inputs:** the room, its art and who is in it; every picture is the same for every phone, and no request depends on a role, a team or an offer.
- **This viewer's inputs:** `self`, `targets` and `control`, as above. They are dropped when concealed and when the viewer changes.
- **`layout()`:** who is where only while the lit room shows them; geometry alone in the dark and concealed; `null` after `dispose()`.
- **Concealed:** nothing is requested, drawn or named. The scene is a group named "Room hidden", with no room in its attributes.

## Accessibility

- **Names:**
  - Each person's press square is a button named "<name>, player <number>", or "You, player <number>".
  - Each position is "Position <id>".
  - The control is named by its own label.
  - The scene is a group named after the room, or "Room hidden" when concealed.
- **Unavailable controls** (reconnecting, `interactive: false`, a control with `enabled: false`) carry `aria-disabled="true"`. They stay focusable and announce themselves as unavailable; a tap or a key does nothing.
- **The focus:**
  - Every control keeps its element across updates, so the focus stays on it.
  - Only an offer or control that ends moves it: to the scene (`tabindex="-1"`), then `onFocusReturn`.
  - `dispose()` removes the scene; if the focus was inside, Frontend's next screen places it.
- **Decorative:** figures and the room's pictures are hidden from assistive technology.
- **The text alternative** (#222 R3) is Frontend's, built from `layout()`.

## Frontend's first connection: Room B

1. Measure the room area between the app's bars, and pass it as `size`.
2. Map the presentation model:

   | Input | From |
   | --- | --- |
   | `people` | The board's seats in this room, with the public offices |
   | `self` | This phone's own seat; `null` on a shared display |
   | `active` | The active seat |
   | `targets` | This viewer's current offers only |
   | `control` | This viewer's room interaction |
   | `hold` | The Blackout window's id, for its lit and dark seconds |
   | `status` | The connection and concealment |
   | `artReady` | The art loader |
   | `clock` | The trusted server clock |
   | `reducedMotion` | The preference |
   | `versions` | The match's versions |

3. Mount it through the renderer's existing hooks, and dispose of it on exit. Leave none of the old renderer's room targets active.
4. Capture Room B lit, stale, concealed and with reduced motion, from the deployed candidate or under the production headers, at 390 × 844 and 430 × 932. Designer then gives visual acceptance in the PR.

## Integration's part

- **Admit the graph:** admit the component's files above, the room pictures and `@mothership/contracts` to the hosted build's source boundary (`apps/game/hosted/vite.config.mjs`). `preview/` and `review/` stay out.
- **Register the room art (DSN-REQ-18):** build `room-drawing-1.0.0` into new art bundles, and name the art version that selects them.
- **Merge #230:** it carries the owner's "a fifth wider" framing.

## Not in this version yet

These are listed, not omitted:

| What | Waiting on |
| --- | --- |
| The owner's "a fifth wider" framing, with extension bands (approved 11 November) | #230; it goes into `framing.mjs` once #230 is on `main` |
| The name tags' larger-text behaviour | #228; outside the two sizes now in scope |
| The private-talk capsule (sheet 25) | Its component, next |
| The board's panels (sheet 26) | Its component, next |
| The Officer's "Blocked" pill (sheet 21) | Its component, next |
| The room films: rescue, attack, eject, Blackhole | The next components |
| Ship life (#230) | The gameplay contract |
| The top bar, the tabs and Pass | The shell component, next |
| Captures of the other rooms | Not taken yet; the component draws all five rooms |

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/room-scene.test.mjs` | 8 of 8 |
  | `npm run test:design` | 367 of 367 |
  | `npm run test:tooling` | 337 of 337 |
  | `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |
  | `node design/tools/phone-ui-figure-extents.mjs --check` | Current |

- **`node design/tools/room-scene-check.mjs`:**
  - The preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy as it is on `main` after #260.
  - **Captures:** ten states at 390 × 844 and 430 × 932: 20 of 20 pass.
  - **The lifecycle probe** (`preview/probe.mjs`), in the same bundle under the same headers: 19 of 19 checks pass.
    - Held: one window through 390 × 653 → 430 × 741, lit and dark, and new insets, then its end.
    - Private: `layout()` lit, dark and concealed; the offers and the control after concealment and after a change of viewer; after `dispose()`.
    - Time: Reduce motion with the clock moving from 1 s to 9 s, as in Frontend's review; eight 250 ms model updates; reconnecting; running again; suspended and resumed; the clock withdrawn; no clock.
    - Focus: the control, a position and a press square across updates, reconnecting and their end.
    - The device's Reduce motion, emulated.
  - **The same probe on `03029b34`:** 4 of 19 pass. It fails on each of the four findings.
  - There are no page errors and no failed requests.
  - The one policy report is the known one: Zod's eval probe, which Zod catches and which the live game's own bundle also has.
  - The captures and `check.json`, with each probe check and what it saw, are in `review/`. They were recorded on `1ef10a22` (this version merged with `main` after #260), with the source clean. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`.
  - Against 0.1.0's captures, the still states are byte-identical. The five with moving crew differ by at most 20 pixels: the crew's idle motion at the moment of capture.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
