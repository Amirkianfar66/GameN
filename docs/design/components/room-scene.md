# Room scene: Designer's runtime component

**Version:** `room-scene-0.1.0`. **Status (15 November 2026):** ready for Frontend to connect. It is not in the game yet. Integration first admits its module graph to the hosted build and registers the room art's version. It is not a release.

**What it is:** the room surface of the phone's room view, as the phone pack draws it. The game imports it as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects data, actions, navigation and lifecycle, and does not rebuild, restyle or copy it.

**Covers:**
- the rooms on sheets 20–24;
- the Blackout on sheet 30, with the frame held and the opened-in-the-dark fallback;
- the room picture unavailable on sheet 45;
- the ambient motion on sheet 55 (DSN-REQ-23);
- the framing, the room's own control and the name tags of #222 items 1 and 34;
- the approved room pictures, `room-drawing-1.0.0` (DSN-REQ-18), through the art bundles.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `room-scene/room-scene.mjs` | `mountRoomScene()`, `roomSceneFrame()`, `roomScenePlaces()`, `seatNumber()`, `ROOM_NAMES`, `ROOM_SCENE_DEFAULTS`, `ROOM_SCENE_VERSION` |
| `room-scene/room-scene.css` | Every style, scoped under `.ms-room-scene`; it imports `ambient.css` |
| `room-scene/framing.mjs` | `phoneFrame`, `paintedExtent`, `pressRects`: the pack's framing (T1 as corrected in #229) |
| `room-scene/figure-extents.mjs` | The measured outlines the framing needs, written by `design/tools/phone-ui-figure-extents.mjs` |
| `room-scene/ambient.mjs`, `ambient.css` | The ambient layer and its keyframes |
| `room-scene/room-art.mjs` | `ROOM_ART` and `roomLayers()`: each room's pictures by the CSS property its bundle defines |
| `icons.mjs` | The phone interface's icon family |
| `room-scene/preview/` | Development only: the preview on the pack's synthetic fixtures |
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

const scene = mountRoomScene(host, input, { onSeat, onSlot, onControl });
scene.update({ ...changes });  // any inputs; the rest stay
scene.suspend();               // backgrounded: every animation holds still
scene.resume();                // foregrounded: back on the clock
scene.layout();                // { frame, places, people }: press squares for text alternatives and hit tests
scene.dispose();               // removes the element, its listener and the crew's mounts
```

- **The host:** an element Frontend places between the app's bars. The component appends one child, `.ms-room-scene`, of exactly `size`.
- **On update:**
  - People are kept by seat, so a figure's idle motion carries on.
  - The frame is worked out again only when the room, the roster, the size or the people the lit room shows change.
  - While `hold` is set or the lights are out, the frame stays where it is.
- **To resize:** `update({ size })`.

## Inputs

All public. Nothing private, no role and no team.

| Input | Default | What |
| --- | --- | --- |
| `room` | `'room-a'` | `'room-a'`, `'room-b'`, `'command-room'`, `'hospital'` or `'jail'` |
| `roster` | `9` | 7, 8 or 9: which table of places |
| `size` | 390 × 640 | `{ width, height }`: the room area between the app's bars, in CSS pixels |
| `insets` | `{ top: 46, bottom: 8 }` | The room's name sits in the top inset; the bottom inset keeps the last press square off the tabs |
| `people` | `[]` | `[{ seat, number?, slot, character, name, health, office }]`: who the lit room shows. `health` is `'Healthy'`, `'Injured'` or `'Eliminated'`; `office` is `'captain'`, `'officer'` or `null`; `number` defaults to the digits of `seat` |
| `self`, `active` | `null` | Seats: the tag that reads "You", and the turn mark |
| `lighting` | `'lit'` | `'lit'` or `'dark'` |
| `hold` | `false` | Hold the frame, for the whole Blackout including its lit 5 s |
| `targets` | `null` | `{ seats, picked }` (people) or `{ slots, picked, icon }` (empty positions): only the current offers |
| `control` | `null` | `{ id, label, icon, enabled, kind }`: the room's own control, such as "Windows · 2" (`kind: 'button'`), or the Jail's "Detained · you can still vote" (`kind: 'status'`) |
| `status` | `'live'` | `'live'`, `'stale'` (reconnecting) or `'concealed'` |
| `artReady` | `true` | `false` once the room pictures failed to load: sheet 45 |
| `clock` | `null` | `{ now }`: the match's trusted server time, for the voyage. `null` means no trusted clock |
| `reducedMotion` | `false` | The player's Reduce motion; the system setting is honoured as well |
| `interactive` | `true` | Whether this surface takes taps now |
| `versions` | `null` | The match's pinned art versions, passed to the crew runtime |
| `label` | `true` | Show the room's name |

## Callbacks

- `onSeat(seat)`: a tap on an offered person.
- `onSlot(slotId)`: a tap on an offered empty position.
- `onControl(id)`: a tap on the room's own control.

Each reports intent only, and only while `interactive` and `status: 'live'`. Frontend checks the current offer and sends the command. The component never decides eligibility, spends anything, resolves anything or advances the game.

## States

| State | What shows |
| --- | --- |
| Lit | The room filling the space, with every present figure whole (T1): the crew, the tags, the turn mark, the room's name and its control |
| Targets | A ring on each offered person and a stronger one on the picked person; everyone else is dimmed |
| Empty positions | A dashed square on each offered position; the picked one turns solid amber |
| Dark | The dark picture, with nobody and no tags. The frame and the press squares are held from the last lit frame. Only the windows move, dimmed, and offered positions still show |
| Opened in the dark | With no lit frame and no `people`, the room is framed as if every place were occupied. With Frontend's public pre-Blackout board as `people`, it is framed from that board |
| Stale | The last room, dimmed, with no control and no input. The banner belongs to the shell |
| Concealed | A plain cover. Nothing of the room is drawn, no picture is requested, and every animation stops |
| Reduce motion | The voyage and the crew stand still where they are |
| No clock | The voyage stands still at 0 s, which is always correct |
| Room picture unavailable | Sheet 45's notice, with each person as a portrait card (number, name, place). Taps and the control still work |

## Art and versions

- **The room pictures:** each is reached by the CSS property its art bundle defines, for example `--bm-scene-room-b-back`, as listed in `room-art.mjs` and in the release manifest. So a phone draws the art its match's bundles carry.
  - Today's bundles carry the old pictures.
  - DSN-REQ-18 builds `room-drawing-1.0.0` into new bundles, and a new match then shows the approved rooms, while a pinned match keeps its own.
  - The preview sets the properties from the release's files.
- **The crew:** drawn by the game's `crew-runtime.mjs` with `versions`. A match pinned to the crew release gets the approved crew, with its idle motion.

## The ambient clock

- **One clock for every phone:** the time since `SKY_EPOCH` (1 November 2026, UTC). In the game, `clock.now()` is the match's server time, so every phone shows the same moment of the voyage.
- **No trusted clock:** the voyage stands still at 0 s.
- **Reduce motion:** it holds where it stands.
- **Purely decorative:** it shows no game fact, takes no taps, never moves a press square and never times anything in the game.

## Privacy

- **Inputs:** public data only. The component reads no role, team or private fact.
- **Requests:** none depends on one. Every picture is public and the same for every phone.
- **Concealed:** nothing is requested and nothing is drawn.

## Accessibility

- **Names:**
  - Each person's press square is a button named "<name>, player <number>", or "You, player <number>".
  - Each position is "Position <id>".
  - The control is named by its own label.
- **Disabled and decorative:** controls are disabled when the surface takes no input. Figures are hidden from assistive technology. The root is a group named after the room.
- **Text alternative:** the list of people (#222 R3) is Frontend's, built from `layout()`.

## Frontend's first connection: Room B

1. Measure the room area between the app's bars, and pass it as `size`.
2. Map the presentation model:

   | Input | From |
   | --- | --- |
   | `people` | The board's seats in this room, with the public offices |
   | `self`, `active` | The own and active seats |
   | `targets` | The current offers |
   | `control` | The room's own interaction |
   | `status` | The connection and concealment |
   | `artReady` | The art loader |
   | `clock` | The trusted server clock |
   | `reducedMotion` | The preference |
   | `versions` | The match's versions |

3. Mount it through the renderer's existing hooks, and dispose of it on exit.
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
  | `packages/design-tokens/test/room-scene.test.mjs` | 6 of 6 |
  | `npm run test:design` | 365 of 365 |
  | `npm run test:tooling` | 336 of 336 |
  | `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |
  | `node design/tools/phone-ui-figure-extents.mjs --check` | Current |

- **`node design/tools/room-scene-check.mjs`:**
  - The preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy.
  - Ten states at 390 × 844 and 430 × 932: 20 of 20 pass.
  - There are no page errors and no failed requests.
  - The one policy report is the known one: Zod's eval probe, which Zod catches and which the live game's own bundle also has.
  - The captures and `check.json` are in `review/`.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
