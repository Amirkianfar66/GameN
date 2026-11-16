# Food surface: Designer's runtime component

**Version:** `food-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer posted on #4 for #213, with Frontend's four answers (relayed by Integration). It is the minimal extraction Integration asked for: the accepted native port's drawing, moved into Designer's folder with no change to the drawing. It is not in the game yet. Frontend adopts it by importing it in place of the port's drawing files, under Integration's source fence and version admission. It is not a release, and it does not replace the Designer's visual acceptance of the integrated result.

**What it is:** the Food surface as the game draws it today.

- Its own top bar and tabs.
- The Task screen, for the Winch and for the Panel.
- Every Food sheet and card: Start a Task, Choose your Partner, How it works, the request, its answers and its closures, the briefing and the outcomes.
- The shared display's notice.
- The ordinary header's Food gauge, as a node.

**What it is not:** a redesign. The baseline is the accepted port at `68000faa`, whose 16 files are the same bytes on `main`. Every copied file is held to its pinned source by a test, with each difference recorded. The class names stay (`.planet-food`, `.fs-…`, `.tb`, `.sheet`), so no style rule changes.

It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)): Designer builds the visual component once; Frontend connects the data, the intents and the lifecycle, and does not rebuild, restyle or copy it.

**Who keeps what:**

| Part | Whose |
| --- | --- |
| The drawing: geometry, ink, machine, scene, pose, display, kit, icons, gauge, tags, the scoped styles, the Task and sheets, the notice | This component |
| The controller (`createFoodTaskController`), the feed, envelopes, bindings, cursors and receipts | Frontend |
| The contact adapter (`createFoodHoldInput`) | Frontend |
| The picture loader (`food-assets.mjs`) and the 37 pictures' serving | Frontend |
| Entering and leaving Food, the host's inert state, blur, focus and visibility | Frontend |
| The ordinary header that holds the gauge, and the three host rules for `.planet-app` | Frontend |
| The source fence, the export surface of `@mothership/presentation`, version admission | Integration |
| The frozen port, for matches pinned to it | Stays as it is |

## Files

Designer's, runtime-safe, in `design/phone-ui/components/food/`:

| Path | What |
| --- | --- |
| `food.mjs` | The entry: `mountFood()`, `mountFoodNotice()`, `foodGauge()`, `FOOD_HANDLERS`, and the names below re-exported |
| `food-input.mjs` | The inputs, checked: `nextFoodInput()`, `nextFoodNoticeInput()`, `FOOD_DEFAULTS`, `FOOD_NOTICE_DEFAULTS`, `FOOD_VERSION`, `FOOD_STATUSES`, `FOOD_CAN`, `FOOD_VIEW_KEYS`, `FOOD_PRESSES`, `FOOD_ANSWERS`, `FOOD_NAVIGATION_TARGETS`. Pure: it imports nothing |
| `food-render.mjs`, `food-notice.mjs` | The port's drawing of the phone surface and of the display's notice, with the connector seams listed under The copies |
| `food-geometry.mjs`, `food-machine.mjs`, `food-scene.mjs`, `food-pose.mjs`, `food-display.mjs`, `food-ui.mjs`, `food-icons.mjs`, `food-gauge.mjs`, `food-tags.mjs`, `food-ink.mjs` | The port's files. Nine are byte for byte; `food-ink.mjs` differs by two import paths |
| `food-kit.css`, `food.css` | The port's scoped sheets, byte for byte. Every rule is under `.planet-food` |
| `food-surface.css` | The surface's own ten rules of the port's `food-host.css` |
| `sources.json` | Each copy, its pinned source and every difference |
| `preview/` | Development only. `index.html` and `preview.mjs`: the component on sample states. `port.html` and `port.mjs`: the frozen port on the same states, for the comparison. `stage.mjs`: what the two share. `probe.mjs`: the lifecycle probe. `compare.html` and `compare.mjs`: the picture comparisons. `food-component-preview-inputs.json`: Frontend's five inputs, unchanged. `provenance.json`: where the packet and #290's captures come from |
| `review/` | The check's pictures and `check.json` |

**Module graph:** `food.mjs` reaches the folder's other 16 runtime files, and from the hosted game `apps/game/hosted/crew-runtime.mjs` (the public crew portraits) and `apps/game/hosted/crew-drawing/ink.mjs` (the admitted crew ink), with what those two import. Two packages: `@mothership/contracts`, and `@mothership/presentation` for the nine pure Food functions (`foodPackageCount`, `foodPackagesText`, `foodPanelAt`, `foodCrateAt`, `foodGaugeLabel`, `foodGaugeLevel`, `foodTrajectoryAt`, `foodClamp`, `foodEase`), by name from its existing entry. It imports nothing from `@mothership/game`, `prototype/`, `preview/` or fixtures, and carries no development marker.

It sends nothing and keeps nothing: no request, no timer of its own, no storage.

## Mount, update and dispose

```js
import { mountFood } from '…/design/phone-ui/components/food/food.mjs';   // the styles come with it

const food = mountFood(host, {
  view,                 // the authorized Food player view: the twelve keys of FOOD_VIEW_KEYS, or null
  can,                  // { ask, answer, withdraw, hold, panelRelease, panelLock, key }: the controller's offers
  sending,              // { feedback, pendingCount, physicalHolding, needsContactOff }: this phone's own presses
  status,               // 'live' | 'stale' | 'concealed'
  clock,                // { now() }: the trusted server time in ms, or null
  people,               // [{ seatId, name, character }]: public
  board,                // { seats: [{ seatId, location }], activeSeatId, phase: { kind, remainingMs } }: public
  viewer,               // { promiseOfferCount }: this viewer's
  navigation,           // { openPanel, boardMode }: the app's own
  assets,               // Frontend's loader: { back, operator(station, character, out), subscribe? }, or null
  reducedMotion,        // the game's Reduce motion
  bars,                 // { top, bottom }: the ordinary bars as the app measures them, in CSS px
}, handlers);

food.update(changes);   // each key given replaces that key; the rest stay
food.openTasks();       // the app's Actions entry: opens "Start a Task"
food.close();           // closes whichever Food sheet is open
food.suspend();         // lets everything go, then stops the frames
food.resume();          // draws the current state at the current time, and starts the frames again
food.dispose();         // lets everything go, gives up what Food covered, removes the surface. Safe twice
```

`host` is an element inside the app's own screen, as the port's is today. The component adds the class `planet-food-host` to it, which lays it over its parent (absolute, edge to edge, taking no pointer of its own), and removes the class on dispose. The host must be inside the game's crew picture surface (`setCrewPictureSurface`), as the port's is: the top bar's portraits are the game's own.

An input the surface does not know is refused with a `TypeError`, at every level, and changes nothing.

## Inputs, by audience

| Input | Audience | What the surface does with it |
| --- | --- | --- |
| `people` | Public | Names, seat numbers and portraits |
| `board.seats`, `board.activeSeatId`, `board.phase` | Public | Where a player is, whose turn the top bar shows, the phase's time |
| `clock` | Public | The moment drawn. With no time, no Task is drawn |
| `assets` | Public | The Supply Room and the operators. They may arrive after the mount |
| `view` | This viewer's | The Task, the request, the choices. Twelve keys and no other: `seatId`, `round`, `versions`, `viewRevision`, `step`, `stock`, `ownAvailability`, `partnerChoices`, `offers`, `invitation`, `requestClosures`, `participantTask` |
| `can` | This viewer's | Which control is enabled. Nothing else enables one |
| `viewer.promiseOfferCount` | This viewer's | The Promises badge |
| `sending` | This phone's | The press on its way, the unknown answer, the refusal, the recovered press, the hold still held or owed |
| `status` | This phone's | See States |
| `navigation` | This phone's | Another open panel hides Food; `boardMode` marks the board's tab |
| `reducedMotion`, `bars` | This phone's | Motion; where a notice sits when Food draws no bar of its own |

`sending.feedback` is `{ key, name, status, recovered }`: the press's own key, its name (`Hold`, `let-go`, `LOCK`, `RELEASE`, `key`, `request`, `Join`, `Decline`, `Cancel`), `sending`, `unknown`, `accepted` or `rejected`, and whether it was found again after a lost answer. Two optional fields carry what the request cards read and nothing more: `request: { requestId, state }` on an accepted press, and `closure` (the request's closure, as the contract writes it) on a refused one. The envelopes, bindings, cursors and receipts stay with Frontend.

A recovered press is told on the original press's own feedback (`recovered: true`). It never replaces it.

## What the surface reports

Every handler is optional. A handler that throws is reported to the page and never stops the drawing.

| Handler | When |
| --- | --- |
| `onHold(contact)` | A pointer, a key or an assistive activation goes down on Hold. `contact` is `{ pointerId }`, `{ key, repeat }` or `{ assistive: true }` |
| `onLetGo(contact)` | Any pointer comes up or is cancelled, or any key comes up, anywhere on the page: `{ pointerId }` or `{ key }` |
| `onReleaseAll()` | Everything must be let go: on suspend, on entering or leaving a Task, on losing the view, when concealed, on dispose |
| `onPress(name)` | `PANEL_RELEASE`, `PANEL_LOCK` or `KEY`, once per press |
| `onAsk(seatId)`, `onAnswer(answer)`, `onWithdraw()` | Ask a Partner; `JOIN` or `DECLINE`; Cancel |
| `onNavigate(target)` | `settings`, `promises`, `switch`, `card` or `panels`: a tap on the surface's own bars |
| `onSurface({ active, exclusive })` | What Food covers changed: its bars (`active`), the whole screen during a Task (`exclusive`) |
| `onBars({ top, bottom })` | What its bars measure changed, in CSS px; `null` when it draws none |

`onSurface` and `onBars` are separate, each said once per change, and both are cleared on exit and on dispose.

## Contacts on Hold

The component reports contacts and matches none. Which contact holds, and whether a press becomes a DOWN at all, is `createFoodHoldInput`'s and the controller's.

- **One set of window listeners per mount:** `pointerup`, `pointercancel` and `keyup`. They stay through redraws and through the control being disabled.
- **Everything is let go** on suspend, on Task or scope exit, when concealed and on dispose, while Frontend's controller is still there. `onReleaseAll` may arrive when nothing is held; it is safe to run twice.
- **A disabled Hold reports nothing**, unless a contact is still held or owed (`physicalHolding` or `needsContactOff`). Then it still reports, so that the hold can be let go. Whether that becomes a new DOWN is the controller's to refuse, and it does: on Frontend's own fixture for that state, with Frontend's controller and adapter, a press sends no DOWN and its let-go sends the contact-off.
- **The surface never shows a hold the ship has not confirmed.** A press shows as on its way; "Holding" comes from the view.

## States

| `status` | What shows | What reports |
| --- | --- | --- |
| `live` | The state as given | Everything |
| `stale` | The view stays, with "Reconnecting…" during a Task. Every gameplay control is disabled | The tabs, Promises, Settings, Actions and Close go on working. No press, ask, answer or cancel |
| `concealed` | Nothing: the surface is taken down, its page, its listeners and everything it remembered of this viewer | Nothing. Shown again, it starts anew |

With `view: null` the surface is empty and covers nothing. With another panel open (`navigation.openPanel` not `board`) it is hidden; during a Task it still holds the screen.

## Focus and keys

- The same control stays focused across redraws.
- A new card or sheet takes focus.
- Escape closes the surface's own sheet and goes no further. During a Task or a pending request it is held and closes nothing. Otherwise it is left to the app.
- Space and Enter are taken on the surface's controls only.

## The shared display's notice, and the gauge

```js
const notice = mountFoodNotice(host, { step, stock, status, bars: { top } });
notice.update(changes); notice.dispose();

header.append(foodGauge(document, doses));   // null when there is nothing to show
```

The notice takes the finalized public stock (`{ doses }`) and step (it keeps its `kind` alone), this screen's status and the ordinary header's height. It takes no view, seat or viewer. It says who is away, then the stock's rise, and hides when stale or concealed.

`foodGauge` returns the header's gauge as the port draws it. The header and its wrapper (`.planet-food.fs-clock.food-native-clock`) stay Frontend's.

## Motion and text size

- **Reduce motion:** the game's (`reducedMotion`) or the device's. Either way the surface is drawn reduced: no spinner turns, and the pose steps where it would glide.
- **Text size:** the styles are in rem. The app scales the root, as today. After a change of text size, call `update({ reducedMotion })` with the current value: it lays the surface out again.

## Art

The component loads no picture. It draws with what `assets` gives: the Supply Room's back, and the nine characters at both stations, alive and out (37 pictures, `/art/food-supply/`). Frontend's loader fetches them, as today. If the loader offers `subscribe`, the surface listens once and lets go on dispose.

## The copies

`sources.json` lists fifteen copies. Eleven are their source byte for byte. Four differ, by 17 recorded differences, none of which touches a line that draws:

| File | From | Differences |
| --- | --- | --- |
| `food-ink.mjs` | `food-ink.mjs` | 2 import paths, to the hosted game's crew ink |
| `food-render.mjs` | `food-render.mjs` | 2 import paths. 7 connector seams: no import of `@mothership/game`; the contact reporter is given, not built; the app's four listeners (blur, focus, visibility, preferences) are gone, with their removal; the handle gains `relayout`, `suspend` and `resume` |
| `food-notice.mjs` | `food-app.mjs` | 4 connector seams: no import of the client package or of the renderer; `mountFoodApp` stays Frontend's; the header's height is given (`game.top()`) where the port read the app's page |
| `food-surface.css` | `food-host.css` | 2 host rules stay Frontend's: the gauge's place in the ordinary header, and hiding the ordinary bars |

A test re-derives each copy from its pinned source and its recorded differences, and fails on any other byte.

## Found while checking

Three things in the accepted port that a later version may want to change. The component keeps all three, since the port is the baseline; each would then be a recorded difference. The first two are differences from the approved package's own pages.

- **The Task top bar's two portraits are 36 px in the port, 32 px on the package's page.** The pack's rule holds its `<img width="36">` at 32 px; the port's portrait sets its size inline, which that rule does not reach. The title starts 8 px further right. It is in the captures accepted on #276 and #290.
- **With no instrument (the crate landed), the port's dock is 10 px taller than the package's.** The port keeps an empty slot for the instrument, and the dock's gap applies to it. Nothing is drawn there, and the control sits where the package puts it.
- **At the Large text (150 %) on 390 × 844, the Partner's label in the role row wraps inside a word** ("8 Hana · Winc/h"). At 430 × 932 it fits on one line, and at the Largest text (200 %) the port drops the row. See `review/390x844-food-panel-04-text150.jpg`.

## Not in this version yet

| Not here | Why |
| --- | --- |
| The shared kit and the shell's bars | The surface carries the port's own frozen copy of the pack's kit and icons. Moving it onto the shared kit would change pixels, so it is a later step with its own review |
| The small phone (320 × 568), as captures | The owner deferred that coverage. The styles are the port's, unchanged |
| A change to any word, layout or art | Out of scope for the extraction |

## Checks run on this version

`node design/tools/food-component-check.mjs` bundles the preview as the game bundles a component, adds the hosted game's own art as its build emits it (49 files: twelve art bundles and the 37 Food drawings), and serves both with the production response headers. Every page passed with no policy report but the known one (zod's eval probe, which the live game's bundle has too), no failed request and no page error.

- **Captures:** 33 synthetic states at 390 × 844 and 430 × 932, in full motion and with the device's Reduce motion: 132, each showing what its state must. The states are Frontend's five inputs, three variants of them (a refused, a recovered and an unknown press), nineteen of Frontend's native fixtures run on Frontend's own controller, three gauge states, and three notices.
- **The frozen port:** the same state drawn by the port's own renderer in the same phone gives the same DOM, the same boxes and the same pixels in all 132. A clock one second off is told apart.
- **Larger text:** eight states (the five parts, a briefing, a sheet and a request) at both sizes, at the game's Large (150 %) and Largest (200 %) text: the port draws the same DOM and the same pixels in all 32. The larger-text support is the port's own, unchanged.
- **The approved package's own pages** (`design/food-supply/phone.html`, served unchanged) for #290's five parts, at both sizes:
  - Every part lies where the package lays it, to half a pixel. The one exception is the dock's empty slot above.
  - The words differ only by the packet's own press state: "Sending…" on the RELEASE part, the "Checking your let-go…" notice on the Winch part. `food-panel-18` is another moment than the package's page (see below).
  - The scene outside the notices is the package's pixel for pixel on `food-panel-04` and `food-winch-12`. On `food-panel-03`, 512 of 106,860 pixels differ at 390 × 844 (558 of 129,860 at 430 × 932), around the moving crate and the two name tags. On `food-winch-03`, 624 of 55,380 differ by one level.
  - The instrument and the control are the package's pixel for pixel wherever the words agree.
- **Frontend's ten native captures from #290** (read from `3247fc3d`, each held to its SHA-256, none copied): for the four causal parts at both sizes, the scene outside the notices is within 1.41 to 1.61 levels on average, with 0.5 % to 0.7 % of its pixels more than 24 levels apart. The limit is 3 levels and 2 %. The same capture moved 3 px measures about 10 levels and 12 %.
- **The lifecycle probe:** 80 checks, once as the page comes and once with the device's Reduce motion: contacts, listeners, presses, offers, requests, stale, focus, lifecycle, exits, ownership, privacy, the notice, the gauge, motion, pictures, a handler's failure, and Frontend's own controller and contact adapter wired as the adapter will wire them.

`packages/design-tokens/test/food-component.test.mjs` (9 tests) holds the module graph, the copies, the styles' reach, the inputs and audiences, the view keys the drawing reads, the design's hint sentences, the packet's hash and the record. It reads only what is committed.

**What the comparisons do not show:**

- `food-panel-18` is a synthetic equivalent (a retained RELEASE-capable view marked stale), not a connected payload. #290's two captures of it are from a connected match, with other names, characters and stock and no synthetic safe areas, so they are recorded and not held. The component is held to what Frontend's packet expects of that frame instead.
- #290's captures were drawn by Chrome 157 on another machine with other fonts. Text differs by 4 to 10 levels on average and is reported, not held. On the RELEASE part the pressed control is tinted blue in #290's capture. The styles hold no such colour; it reads as the browser's own tap highlight from the touch that made the press.
- The preview's phone gives the review frames' safe areas (47 px and 34 px) through a preview style rule, and stands in for the ordinary app's bars and board.
- Each capture is of a page at rest: every fade is ended and the two spinners are held at one moment. With Reduce motion the kit fades every change over 80 ms, and text that takes its colour from its box starts its own fade when the box's ends, so the preview goes on holding until nothing new starts. A picture taken while anything still runs fails the check.

**Not looked at:** a phone, Safari, a screen reader, a server, and performance. Desktop Chromium at each phone's CSS size.

## For Frontend

The adapter is small. The preview writes it once, for its cases, in `preview/stage.mjs` (`inputsFromModel`) and `preview/preview.mjs`:

```js
const hold = createFoodHoldInput({ down: () => controller.holdDown(), up: () => controller.holdUp(),
  held: () => controller.getModel().physicalHolding || controller.getModel().needsContactOff });
const food = mountFood(host, inputsFromModel(controller.getModel(), publicFacts), {
  onHold: c => ('pointerId' in c ? hold.pointerDown(c.pointerId) : 'key' in c ? hold.keyDown(c.key, c.repeat) : hold.assistiveClick()),
  onLetGo: c => ('pointerId' in c ? hold.pointerUp(c.pointerId) : hold.keyUp(c.key)),
  onReleaseAll: () => hold.releaseAll(),
  onPress: name => controller.press(name), onAsk: seat => controller.ask(seat), onAnswer: answer => controller.answer(answer), onWithdraw: () => controller.withdraw(),
  onNavigate: target => renderer.navigate(target),
  onSurface: next => { /* hide the ordinary bars, make the host inert */ }, onBars: next => { /* lay the app out */ },
});
controller.subscribe(() => food.update(inputsFromModel(controller.getModel(), publicFacts)));
```

- Dispose the surface before the controller, so that the last `onReleaseAll` reaches it.
- On blur and on a hidden page, do as today: let the hold go and tell the controller it is not visible. Its model then says so, and the adapter sends `status: 'concealed'`, as it does when the viewer loses authorization.
- `suspend()` and `resume()` are for when the app stops showing the surface while the viewer stays authorized.
- Tell Designer what does not fit. The canonical source is changed here, not in a copy.
