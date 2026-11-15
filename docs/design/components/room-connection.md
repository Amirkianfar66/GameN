# Room connection: the room view on the room scene

**Status (15 November 2026):** a draft for the Lead Designer's review, then Frontend's. It is not in the game yet.
- Integration first approves the source fence's marked hunk and the frozen releases' consumer pins, which refuse the changed Planet files (see [The gates](#the-gates)).
- This is not a release.

**What it is:**
- On a player's phone, the Planet app's room view draws all five rooms through Designer's [room scene](room-scene.md) (`room-scene-0.4.0`):
  - Room A, Room B, the Command Room, the Hospital and the Jail.
  - The scene replaces the app's own picture, framing, places, tags, targets and Blackout darkness.
- The owner decided this on 15 November 2026: "Yes lets do it for all 5 rooms nothing related to design should be inside of frontend".
  - The Lead's plan is on #222.
  - The decision is recorded in `owner-decisions.md` by #280.
- The look and the motion come only from `design/`. The app keeps the data, the commands and the lifecycle.
- The board view, the private-talk capsule and the shared display are unchanged. They stay on the board renderer.

## Files

| Path | What |
| --- | --- |
| `apps/game/hosted/planet/room-scene-input.mjs` | New, pure. It maps the presentation model to the scene's inputs, the scene's callbacks and the lifecycle step (`roomSceneInput`, `roomSceneHandlers`, `roomSceneLifecycle`) |
| `apps/game/hosted/planet/render.mjs` | Mounts, updates, suspends and disposes the scene in the room view. It paints today's films and effects in the scene's films container, framed by its `layout()`, and passes their stand-ins and recoil. It no longer draws those rooms itself |
| `apps/game/hosted/planet/app.mjs` | Imports `room-scene.css` beside the app's other styles |
| `apps/game/hosted/vite.config.mjs` | One marked hunk: the scene's directory and `design/phone-ui/components/icons.mjs` join the hosted build's `allowedSources` |
| `apps/game/test/planet-room-scene.test.mjs` | The mapping, privacy, the callbacks and the lifecycle |
| `design/tools/room-connection-check.mjs` | The check: the real app, under the production headers, at both phone sizes |
| `design/phone-ui/review/room-connection/` | Its captures and `check.json` |

The room scene's own files are used as they are.

## The room view

- **When:**
  - The scene draws the room view on a player's phone, in one of the five rooms.
  - In the board view, the capsule or on a shared display, the board renderer draws as before.
  - Switching between them retires the other's drawing, so nothing of the board's room, people or targets stays in the room view.
- **Where:** the scene's host fills the room area between the app's bars. That is the stage the board renderer laid its rooms in.
- **Mount:**
  - A new match, seat or art version is a new mount.
  - While the model withholds the room (the app hidden, or reconnecting), the mounted scene stays and takes only its status, so a Blackout window's held frame survives. The board renderer's coordinate cache did the same.
  - Leaving the room view, the five rooms or the match disposes it, as does the renderer's own `dispose()`.
- **Suspend and resume:**
  - The scene is suspended when the page is hidden, the window is blurred, the model is concealed or the Food task covers the screen.
  - It resumes when none of these holds.

### Inputs

| Input | From |
| --- | --- |
| `room` | The room view's room (`currentRoom`) |
| `roster` | `model.playerCount` |
| `size` | The room area: the window's width × the stage's height between the bars |
| `insets` | The scene's defaults |
| `people` | This room's board seats, without anyone away on the Food Supply Task. Each person has the crew character, the display name ("You" for this phone's seat), the health and the public office (captain or officer) |
| `active` | The active seat, in an ordinary turn and lit, as the header's rule |
| `self` | This phone's seat; `null` on a display |
| `lighting` | `'dark'` when `model.dark`, or when the Blackout film's own sample is dark |
| `hold` | The Blackout window's id for its lit and dark seconds (`true` for a window the model does not name); `null` otherwise |
| `targets` | From this viewer's current action only, as either people or positions (below) |
| `control` | Room B's "Windows" (below) |
| `status` | `concealed`; `stale` while reconnecting, or when the phase has run out and the next has not come; otherwise `live` |
| `artReady` | `false` only once the art has settled without the scene's bundles (`scene-art`, `board-v2-motion-art`, `board-v2-films-art`) |
| `clock` | The match's trusted server time (`presentation.nowMs`, advanced locally), only while trusted and live; otherwise `null` |
| `reducedMotion` | The app's Reduce motion, with the device's |
| `interactive` | A player's phone, while the Food task is not over the screen |
| `versions` | `model.versions` |
| `roomArt` | `roomArtFor(versions)`: `null` until Integration registers `room-drawing-1.0.0` for a match's art version (DSN-REQ-18). Then that version maps to it |

**Targets:**
- **People:** the action's seat choices, with `picked` set to the action's selection.
- **Positions:** a move's empty positions (`icon: 'move'`) or the Blackout's fixed positions (`icon: 'position'`), each in this room only. Choosing a move's room offers none here.

**The control:**
- Room B's control opens the Windows panel (sheet 34), through the controller's own `openPanel('windows')`.
- It shows only in the viewer's own room, while lit and live, and not while an action is open, as in the pack's targeting states.
- Its label is "Windows" with no number, because the windows that panel lists are in the model only while the panel is open.
- No other room has a control. The Jail's "Detained · you can still vote" states a rule, which the phone never works out for itself.
- This waits on the Lead's call.

### Callbacks

- `onSeat` and `onSlot` call `controller.choose(id)`, whose own check of the current offer decides whether anything happens.
- `onControl('windows')` opens the Windows panel.
- `onFocusReturn` moves the focus to the next step's Register control, when there is one.
- The scene reports intent only. Nothing in the connection decides who may act.

## Today's films and effects

The scene does not draw the films yet; they are its next components. Until it does, the game paints them in the scene's films container (`scene.films`, room-scene 0.4.0).
- **The container.** It makes no stacking context, so each film's z-index interleaves with the room's pictures and people exactly as on the board: both use z = 2 × depth.
- **The sections.** One per room. The current room is framed by the scene's `layout()`. The other rooms are framed by the scene's pure `roomSceneFrame()` and hidden, as the board's other rooms were, so a two-room film (the Captain's: Command Room and Jail) plays its other half there.

| Part | In the room view |
| --- | --- |
| A figure a film draws itself: the Hospital's gowned, breathing patients; the injury and heal patients; the Captain's walk; the Jail's released and ejected people | Drawn by the film in the scene. The scene leaves that person's own figure out (`standIns`) and keeps their tag, turn mark and press square. Each person has a detached stub standing in for the board's actor, so the films' own `hide()` names the seats, and nothing in the films changed |
| "ATTACK BLOCKED": the effect, its label and the recoil | The effect and label sit in the scene, on the person's press square. The recoil is the scene's `brace` |
| The Hospital: RESCUE/DETAINED tags, monitors, bed lights, vitals inset, drone, scan, hologram, pulse; HOSPITAL FULL; the off-board plaque | In the scene, at the board's depths. The monitors sit under the berths' head pictures, as on the board (checked against the board view in the same harness) |
| The Captain's console inset; the Jail's door, airlock, suction, debris, emergency light and exterior | In the scene, at the board's depths |
| The cinematic field (transit, Blackhole, arrival) | In the scene, just above the back picture and under the furniture and people, as on the board. Not captured: it needs the films' media and their phases |
| The window stations | In the scene, under the feet |
| The Officer's move block | In the scene, on the person's press square |
| Office badges | The scene's tags show each office's icon, so the old "Captain · Officer" text badge is not drawn |
| The Blackout | As sheet 30. The lit seconds are the ordinary room: the game's film (S1) draws its darkness over the lit scene at the board's depth (z 3000) for the flicker, and again for the lights' return. In the dark, everyone sees the scene's own lights-out picture, which is that darkness, so no layer is drawn over it and its windows still move (z 2802). The lights cut out at the same instant in both (`previewEndsAt`), so the hand-over has no jump. The film's position markers are not drawn in the room view, since sheet 30 has none: the Disabler's positions are the scene's own offered positions. The board view keeps its markers |

**Why 0.4.0.** The connection's first version laid the films over the scene, which is its own stacking context. The check's first run showed the problem: the Hospital patient's film figure covered the scene's own figure and its "3 Crew 3 · Injured" tag. The room scene's 0.4.0 (`72c1ae8`) added `standIns`, `brace` and `scene.films` for it.

## The boundary

- **The hunk.** Marked `BEGIN room connection` / `END room connection` in `apps/game/hosted/vite.config.mjs`. It adds two entries to `allowedSources`:
  - `design/phone-ui/components/room-scene/`;
  - `design/phone-ui/components/icons.mjs`.
- **Nothing else.** The fence's other rules are unchanged. The scene's `preview/` and `review/` are never imported.
- **How it was checked.** The hosted config was built with its own fence plugin and Firebase registry plugin, and without the release plugins, which refuse first (see below):
  - with the hunk, the build passes;
  - without it, the fence refuses `design/phone-ui/components/room-scene/room-scene.mjs`.
- **What the production bundle holds.** `test:frontend`'s production-exclusion check scans the bundle's module graph, scene included: "85 modules reachable from 2 production entries … no fixture, test or development module or marker found".

## The gates

These refuse the changed Planet files until Integration approves. Each was found by reverting the changed files one at a time on this tree. The gates themselves are untouched.

| Gate | Refuses |
| --- | --- |
| `npm run check:sources`, through `scripts/food-consumer-source.mjs`, which reads the frozen Food release `docs/integration/food-consumer-source-2026-11-13.json` | `apps/game/hosted/planet/app.mjs` ("Food consumer source: content differs"). With that reverted, `apps/game/hosted/planet/render.mjs`. With both reverted it passes, so the `vite.config.mjs` hunk alone is accepted |
| The hosted Vite build, plugin `reviewed-crew-drawing-release` (`readHostAbortConsumerApproval` → `readFoodConsumerSource`) | The same file first: `app.mjs` |
| `npm run test:design` | 25 of 370 fail, every one on that same refusal (`board-motion` checks, `pregame-films` runtime ports) |
| `npm run test:tooling` | 68 of 356 fail, every one on that same refusal (release adoption, crew and pregame fences, the hosted Firebase registry builds) |

**Also pinned:** `app.mjs` and `render.mjs` are pinned by `phone-ui-production-consumer-approval.json`, `crew-consumer-approval-2026-11-07.json` and `pregame-production-consumer-approval-2026-11-08.json`. The Food record also pins `vite.config.mjs`.

**These pass:**
- `test:frontend` (226 + 845 tests and the production-exclusion check);
- `typecheck`, `build`, `check:toolchain`, `check:workspace` and `node design/tools/check-assets.mjs`.

## Evidence

### Tests

`apps/game/test/planet-room-scene.test.mjs` passes 10 of 10. It covers:
- the inputs for each room, including the Food Task's absences and the turn mark;
- the targets from the viewer's own action;
- privacy:
  - a display gets no `self`, offers, control or taps;
  - a concealed phone gets no people, offers or control;
  - the authoritative dark passes nobody and no name;
- the Blackout hold;
- the status and the clock;
- Room B's control;
- art readiness;
- the callbacks;
- the lifecycle: mount, dispose, kept while the model withholds the room, and a remount for a new match, seat or art version.

### The check

`GAMEN_PHONE_ART_BASE=<clean worktree of origin/main> node design/tools/room-connection-check.mjs`:
- It builds Frontend's phone harness (`apps/game/dev/phone`: the real Planet app, controller and renderer over its synthetic connection) from this tree, with art from origin/main.
- It serves the harness with the hosted game's production headers (`createHostedPreviewHeaders`, headers SHA-256 `424e5dec…`, the same as the room scene's check).
- It drives the app at 390 × 844 and 430 × 932.

**Result:** 32 of 32 captures pass. Each has no unexpected policy report (only zod's known, caught eval probe), no failed request, no page error and none of the board renderer's rooms, people, targets or night layers in the room view.

| State | What it shows and checks |
| --- | --- |
| `room-a`, `room-b`, `command-room`, `hospital`, `jail` | Each room lit, as its occupant sees it. The windows' motion runs on today's pictures in all five. Room B shows its Windows control |
| `blackout-lit`, `blackout-dark` | Room A is opened in the dark, which frames every place. A new window's lit seconds then frame the four people present, which differs from the dark-open frame. The dark keeps exactly that frame |
| `blackout-slots` | The four fixed positions are offered in the dark, in the held frame. A tap on A2 reaches the controller's confirmation |
| `seats` | The Officer's block offers Players 1–3 in Room A, and everyone else is dimmed. A tap on Player 2 reaches "Block movement — Player 2?" |
| `slots` | A move offers B5 in Room B. A tap reaches the confirmation for B5 |
| `expired` | The phase runs out: the room stands dimmed, and the controller's withdrawn action takes the offers with it |
| `reconnecting` | The model withholds the room. The scene keeps the last room, dimmed, with no control (sheet 45) |
| `concealed` | The page is hidden: a plain cover, with nothing of the room drawn or named |
| `reduced` | The device's Reduce motion: the voyage and the crew stand still |
| `hospital` | The injured occupant's own view. The film's breathing patient stands in for the scene's figure, whose "You · Injured" tag stays |
| `blocked` | "ATTACK BLOCKED" is drawn in the scene and lands on Crew 7, the person it names |
| `hospital-films` | The Doctor's Rescue offers Crew 3 in the Hospital. The RESCUE tag and the monitor lie on that patient. The film's patient stands in for the scene's figure only; the tag and the offer's ring stay, and every film part is inside the scene |

### Differences from the room scene's own captures

- **The bars.** The app's top bar and tabs are today's: about 60 px and 70 px high, where the scene's preview stood in the pack's 98 px and 93 px. So the room area is taller: 390 × 716 and 430 × 804, where the preview had 390 × 653 and 430 × 741.
- **The bands.**
  - With today's art, the scene zooms out only enough for the people present (T1). In the taller area, that leaves its background above and below the picture.
  - The bands are thin in Room B and widest in the Jail, where the picture is 457 px of 716 at 390 × 844.
  - The approved pictures' extension (`room-drawing-1.0.0`) fills those bands; it comes with `roomArt`.
  - The shell component's bars would also bring the area back to the preview's.
- **Reconnecting** now shows the last room, dimmed (sheet 45). The board renderer showed no room, because the model withholds the board then.
- **Hidden**, the scene's plain cover replaces an empty stage.

### Not run

- Physical phones, Safari, screen readers, the frame rate and a live match.
### The merge gate's comparison

`design/tools/phone-ui-native-compare.mjs --only room-a,room-b,command-room,hospital,targeting,blackout,reconnecting,block`:
- It sets the pack beside this build, part by part. Its `compare.json` is in `design/phone-ui/review/room-connection/`; its pictures stay outside the repository.
- The build is the check's own bundle, so it names the same candidate and art commits.
- **The room surfaces agree:** the pack's prototype and the game now draw the same component.
- **The differences are elsewhere:**
  - the shell's bars and its targeting bar with Cancel, which the app does not have yet;
  - Room B's control label (no number, see above);
  - the harness's sample names and rooms;
  - the bands described above.

## Open

- **For the Lead:**
  - Room B's control;
  - the bands with today's art.
- **For Integration:**
  - the fence hunk;
  - the frozen releases' pins on `app.mjs` and `render.mjs`;
  - `roomArtFor` once `room-drawing-1.0.0` is registered;
  - **the phone harness on `main`:** since 1abbd43 its own config stops with "Unsupported asset-tooling import: scripts/runtime-art-release.mjs → ../packages/contracts/src/planet-art-capabilities.json".
    - `review-base.mjs` refuses the JSON import that `runtime-art-release.mjs` gained.
    - The check builds the same harness entry with the same art plugins over origin/main, after checking the tooling is byte for byte that commit's.
- **For Frontend:** the review. Two behaviour changes need it:
  - reconnecting now shows the last room, dimmed;
  - the scene stays mounted through a hidden or reconnecting model.
