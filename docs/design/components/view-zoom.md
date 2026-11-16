# The Room ↔ Board zoom: Designer's runtime component

**Version:** `view-zoom-0.1.0`, proposed. **Status (16 November 2026):** the interface the Lead Designer approved for the board's option B, with the Lead's changes (below). It is for Frontend's review on #4 before it is built. Nothing here is built yet; it is not in the game, and it is not a release.

**What it is:** the switch between the room view and the board, as the handoff's motion table gives it. The board's other open item is the board's name tags ([board-tags.md](board-tags.md)).

| Moment | Normal | Reduce motion |
| --- | --- | --- |
| Room ↔ Board | 450 ms zoom from the current room's panel | Direct |
| Tab or state change | 220 ms crossfade | Direct |

"None of these sets a deadline, and a missed animation never blocks a control" (the handoff). Switching views is Frontend's local navigation and never sends `MOVE` (sheet 26: "Switching never moves you or spends your move").

## Interface

```js
import { zoomRoomBoard, VIEW_ZOOM_VERSION } from 'design/phone-ui/components/view-zoom/view-zoom.mjs';
const zoom = zoomRoomBoard({ room, board, panel, to, reducedMotion, hold });
// → { finished: Promise<'done' | 'direct' | 'cancelled'>, cancel() }
```

| Input | Meaning |
| --- | --- |
| `room`, `board` | The two view elements: the room view (the room scene, or the capsule while talking) and Board V2's board. Each fills the stage. |
| `panel` | The viewer's own room's panel on the board, as `{ left, top, width, height }` in the stage's coordinates: the capsule's panel while they talk. `null` when the viewer has no room. |
| `to` | `'board'` (Room → Board) or `'room'` (Board → Room) |
| `reducedMotion` | The game's Reduce motion. The device's setting is read as well. |
| `hold` | What the room scene's `hold` means: `null` or `false`, or a held Blackout window (`true`, or the window's id) |

**Frontend's part:**
- It shows the incoming view before the call, and hides the outgoing one when `finished` settles, whatever its value.
- It works nothing out from the zoom: the views keep their own layout, framing and targets throughout.

## The motion

- **Room → Board** (`to: 'board'`):
  - The board grows out of the panel. It starts scaled about the panel so that the panel covers the stage, centred, and settles to its own layout in 450 ms on the kit's ease, `cubic-bezier(0.2, 0, 0, 1)` (`--ms-k-ease`).
  - The room view shrinks with it, into the panel, and fades out in the first 180 ms.
- **Board → Room** (`to: 'room'`): the reverse.
  - The board zooms into the panel in 450 ms.
  - The room view grows from the panel's size, fading in over the last 180 ms.
- **No room** (`panel: null`): the 220 ms crossfade of a tab change.
- **Direct,** with no animation and `finished` resolving to `'direct'`:
  - with Reduce motion, the game's or the device's (the handoff);
  - while a Blackout window is held (`hold`): nothing re-centres, zooms or moves a press area while a Disabler may be choosing. This is the handoff's Blackout rule, from Integration's review of `d52a8ae9`.
- **During a switch the room view is drawn over the board.**

## Taps

- **The outgoing view takes no taps from the start of the switch.** After its 180 ms fade it is invisible, but it would still catch taps over the panel.
- **The incoming view takes taps throughout,** wherever it is drawn. Hit-testing follows the drawn positions, so nothing waits for the animation.
- **A switch partway through** cancels the running zoom and starts the new one from where the views are: their current transform and opacity.

## What it leaves behind

- It animates only `transform` and `opacity` on the two elements, with the Web Animations API, and sets the outgoing view's `pointer-events` and the room view's stacking for the switch.
- When `finished` settles, or on `cancel()`, it removes all of these, so neither element keeps a style from the zoom.
- It never reads the game state and never sends a command.

## Checks, when built

The preview puts the room scene and the pack's own `paintBoard` in one stage, under the hosted game's production headers.

- **The frames:**
  - Room → Board starts with the panel covering the stage and ends at the board's own layout; Board → Room is the reverse;
  - 450 ms on the kit's ease, and the room view's 180 ms fade;
  - with no room, the 220 ms crossfade.
- **Direct** with the game's Reduce motion, with the device's, and with `hold`.
- **Taps:** the outgoing view takes none from the start of the switch, and the incoming view takes them throughout.
- **Partway:** `cancel()` resolves `'cancelled'`, and a new switch starts from where the views are.
- **Nothing left behind** after it settles, or after a cancel: transform, opacity, `pointer-events` and stacking are the elements' own again.

## The Lead's decisions (16 November)

- **Option B:** this piece and the board's name tags are the board's two open items; Board V2 stays as built.
- **Q3:** with a held Blackout window the switch is direct. `hold` means what the room scene's `hold` means.
- **The change:** the outgoing view takes no taps from the start of the switch. The incoming view takes taps throughout. `pointer-events` is removed with the rest of the styles when `finished` settles or on cancel, and the checks test it.
- **As proposed:** 450 ms on the kit's ease, the 220 ms crossfade with no room, direct with Reduce motion, and no `MOVE`.
