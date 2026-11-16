# Food surface: Designer's runtime component

**Version:** `food-0.1.0`. **Status (16 November 2026):** built for #274's adoption dependency, to the interface the Lead Designer posted on #4 ([6913141625](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6913141625)), with Frontend's four answers ([6916497706](https://github.com/Amirkianfar66/GameN/issues/4#issuecomment-6916497706), relayed by Integration), the Lead Designer's answers of 16 November on nine points of the built interface, the correction Integration asked for in its review of #303 (a concealed surface keeps nothing of the viewer), and the six [corrections to the port](#corrections-to-the-port) that the Lead Designer decided on 16 November are made here, before adoption. It is the minimal extraction Integration asked for: the accepted native port's drawing, moved into Designer's folder, with those six corrections and no other change to the drawing. It is not in the game yet. Frontend adopts it by importing it in place of the port's drawing files, under Integration's source fence and version admission. It is not a release, and it does not replace the Designer's visual acceptance of the integrated result.

**What it is:** the Food surface as the game draws it today, with six recorded corrections.

- Its own top bar and tabs.
- The Task screen, for the Winch and for the Panel.
- Every Food sheet and card: Start a Task, Choose your Partner, How it works, the request, its answers and its closures, the briefing and the outcomes.
- The shared display's notice.
- The ordinary header's Food gauge, as a node.

**What it is not:** a redesign. The baseline is the accepted port at `68000faa`, whose 16 files are the same bytes on `main`. Every copied file is held to its pinned source by a test, with each difference recorded. The class names stay (`.planet-food`, `.fs-…`, `.tb`, `.sheet`).

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
| `food-input.mjs` | The inputs, checked: `nextFoodInput()`, `nextFoodNoticeInput()`, `FOOD_DEFAULTS`, `FOOD_NOTICE_DEFAULTS`, `FOOD_VERSION`, `FOOD_STATUSES`, `FOOD_CAN`, `FOOD_VIEW_KEYS`, `FOOD_CLOSURE_KEYS`, `FOOD_PRIVATE_INPUTS`, `FOOD_PRESSES`, `FOOD_ANSWERS`, `FOOD_NAVIGATION_TARGETS`. Pure: it imports nothing |
| `food-render.mjs`, `food-notice.mjs` | The port's drawing of the phone surface and of the display's notice, with the connector seams and the corrections listed under The copies |
| `food-geometry.mjs`, `food-machine.mjs`, `food-scene.mjs`, `food-pose.mjs`, `food-display.mjs`, `food-ui.mjs`, `food-icons.mjs`, `food-gauge.mjs`, `food-tags.mjs`, `food-ink.mjs` | The port's files. Nine are byte for byte; `food-ink.mjs` differs by two import paths |
| `food-kit.css`, `food.css` | The port's scoped sheets. `food-kit.css` is byte for byte; `food.css` gains the role row's two rules (correction 3). Every rule is under `.planet-food` |
| `food-surface.css` | The surface's own ten rules of the port's `food-host.css` |
| `sources.json` | Each copy, its pinned source and every difference |
| `preview/` | Development only. `index.html` and `preview.mjs`: the component on sample states. `port.html` and `port.mjs`: the frozen port on the same states, for the comparison. `stage.mjs`: what the two share. `probe.mjs`: the lifecycle probe. `compare.html` and `compare.mjs`: the picture comparisons. `food-component-preview-inputs.json`: Frontend's five inputs, unchanged. `provenance.json`: where the packet and #290's captures come from |
| `review/` | The check's pictures, each correction before and after (`fix-<number>-…jpg`), and `check.json` |

**Module graph:** `food.mjs` reaches the folder's other 16 runtime files, and from the hosted game `apps/game/hosted/crew-runtime.mjs` (the public crew portraits, and whether a view's versions have the crew drawing) and `apps/game/hosted/crew-drawing/ink.mjs` (the admitted crew ink), with what those two import. They are the admitted crew release. Two packages: `@mothership/contracts`, and `@mothership/presentation` for the nine pure Food functions (`foodPackageCount`, `foodPackagesText`, `foodPanelAt`, `foodCrateAt`, `foodGaugeLabel`, `foodGaugeLevel`, `foodTrajectoryAt`, `foodClamp`, `foodEase`), by name from its existing entry. It imports nothing from `@mothership/game`, `prototype/`, `preview/` or fixtures, and carries no development marker.

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
food.relayout();        // lays the surface out again: call it after the game's text size changes
food.suspend();         // lets everything go, then stops the frames
food.resume();          // draws the current state at the current time, and starts the frames again
food.dispose();         // lets everything go, gives up what Food covered, removes the surface. Safe twice
```

An input the surface does not know is refused with a `TypeError`, at every level, and changes nothing.

### The host

`host` is an element inside the app's own screen, as the port's is today.

**What the component does to it.** It adds the class `planet-food-host`, and removes it on dispose. The rule is the port's own:

```css
.planet-food-host { position: absolute; inset: 0; z-index: 7000; pointer-events: none; }
```

- The host is laid over its nearest positioned ancestor, edge to edge.
- With `z-index: 7000` it sits above its neighbours in whatever stacking context holds it: the nearest ancestor that makes one, or else the page's.
- The host takes no pointer. The surface's own bars, sheets, cards and Task screen take theirs.

What Food covers in the app is Frontend's call: where the host is put, and what stacking context holds it.

**What the host has to provide.** The top bar's portraits are the game's own pictures, as in the port. For a view whose versions have the crew drawing, that takes two things:

1. **The crew picture surface around the host.** The host, or an ancestor of it, is the element the app marked with `setCrewPictureSurface(root, versions)` (`apps/game/hosted/crew-runtime.mjs`). The mark is `data-crew-art="crew-drawing-1.0.0"`.
2. **The game's crew art sheet in the page** (`art/crew-public-board.<hash>.css`). It gives that element the nine portraits, `--ms-asset-crew-portrait-c1` to `-c9`. It may load after the mount: the portraits show when it does.

`mountFood` checks the first, and `update` checks it too. The check looks for that mark on the host or on an ancestor of it: `host.closest('[data-crew-art="crew-drawing-1.0.0"]')`. A view whose versions have the crew drawing, on a host outside that surface, is refused with a `TypeError`, and nothing changes: no blank portraits are drawn. So mark the root before giving the surface a view, as the app does today. With no view, or concealed, nothing is drawn and nothing is asked of the host.

## Inputs, by audience

| Input | Audience | What the surface does with it |
| --- | --- | --- |
| `people` | Public | Names, seat numbers and portraits |
| `board.seats`, `board.activeSeatId`, `board.phase` | Public | Where a player is, whose turn the top bar shows, the phase's time |
| `clock` | Public | The moment drawn. With no time, no Task is drawn |
| `assets` | Public | The Supply Room and the operators. They may arrive after the mount |
| `view` | This viewer's | The Task, the request, the choices. Twelve keys and no other (see below) |
| `can` | This viewer's | Which control is enabled. Nothing else enables one |
| `viewer.promiseOfferCount` | This viewer's | The Promises badge. It follows a new count at the clock's next second, as in the port, which builds its top bar once a second |
| `sending` | This phone's | The press on its way, the unknown answer, the refusal, the recovered press, the hold still held or owed |
| `status` | This phone's | See States |
| `navigation` | This phone's | Another open panel hides Food; `boardMode` marks the board's tab |
| `reducedMotion`, `bars` | This phone's | Motion; where a notice sits when Food draws no bar of its own |

### The view's twelve keys

Of the contract's Food player view the surface takes the eleven keys the drawing reads (`seatId`, `round`, `versions`, `step`, `stock`, `ownAvailability`, `partnerChoices`, `offers`, `invitation`, `requestClosures`, `participantTask`) and a twelfth, `viewRevision`, which Frontend's inputs carry and the drawing does not read. Each is passed whole, `stock` too.

Any other key is refused, because it is not on that list. So `turnEnds` is refused, and `privateCursor` and `ownMeals`, and the view's other seven: `schemaVersion`, `audience`, `matchId`, `phaseId`, `serverNowMs`, `playerCount` and `rosterSeatIds`.

### This phone's press: `sending.feedback`

`null`, or the last press and how it went. Every field, and every value it may hold:

| Field | Values | What the surface does with it |
| --- | --- | --- |
| `key` | Any string that differs from press to press, and is the same press's again when that press is recovered | Tells one press's feedback from the next. Never drawn, never reported. It need not be the command's id: the preview's adapter numbers the presses |
| `name` | `Hold`, `let-go`, `LOCK`, `RELEASE`, `key`, `request`, `Join`, `Decline`, `Cancel` | Which control or card the feedback is told on |
| `status` | `sending`, `unknown`, `accepted`, `rejected` | The press on its way, the unknown answer, done, or not done |
| `recovered` | `true`, `false` | Whether the press was found again after a lost answer |
| `request` (optional, on an accepted press) | `{ requestId, state }`; `state` is `PENDING`, `JOINED`, `DECLINED` or `WITHDRAWN` | The request card's next step. `requestId` only matches the card to the view's request: it is never drawn or reported |
| `closure` (optional, on a refused press) | `{ requestId, state, round, foodStepId, volunteerSeatId, partnerSeatId }`; `state` is `JOINED`, `DECLINED`, `WITHDRAWN` or `EXPIRED` | Why the request is over, on the request card. These are the six fields the cards read of the request's closure; `FOOD_CLOSURE_KEYS` names them, for the adapter to pick |

Nothing more is taken: no envelope, no receipt, no command id, no binding and no cursor. Any other field is refused, in `request` and `closure` too.

A recovered press is told on the original press's own feedback (`recovered: true`, under the same `key`). It never replaces it.

## What the surface reports

Every handler is optional. A handler that throws is reported to the page and never stops the drawing.

| Handler | When |
| --- | --- |
| `onHold(contact)` | A pointer, a key or an assistive activation goes down on Hold. `contact` is `{ pointerId }`, `{ key, repeat }` or `{ assistive: true }` |
| `onLetGo(contact)` | Any pointer comes up or is cancelled, or any key comes up, anywhere on the page, as the port forwards them: `{ pointerId }` or `{ key }`. Matching it to a hold is the adapter's |
| `onReleaseAll()` | Everything must be let go: on suspend, each time a Task screen is built, on leaving a Task, on losing the view, when concealed, on dispose. It is safe with nothing held, and safe twice |
| `onPress(name)` | `PANEL_RELEASE`, `PANEL_LOCK` or `KEY`, once per press |
| `onAsk(seatId)`, `onAnswer(answer)`, `onWithdraw()` | Ask a Partner; `JOIN` or `DECLINE`; Cancel |
| `onNavigate(target)` | `settings`, `promises`, `switch`, `card` or `panels`: a tap on the surface's own bars |
| `onSurface({ active, exclusive })` | What Food covers changed: its bars (`active`), the whole screen during a Task (`exclusive`) |
| `onBars({ top, bottom })` | What its bars measure changed, in CSS px; `null` when it draws none |

`onSurface` and `onBars` are separate, each said once per change, and both are cleared on exit and on dispose.

**A contact is plain data and nothing else:** `{ pointerId }`, `{ key, repeat }` or `{ assistive: true }` going down, and `{ pointerId }` or `{ key }` coming up. It is never the event, its target, or where on the screen it was.

## Contacts on Hold

The component reports contacts and matches none. Which contact holds, and whether a press becomes a DOWN at all, is `createFoodHoldInput`'s and the controller's.

- **One set of window listeners per mount:** `pointerup`, `pointercancel` and `keyup`. They stay through redraws and through the control being disabled.
- **Everything is let go** on suspend, on Task or scope exit, when concealed and on dispose, while Frontend's controller is still there. `onReleaseAll` also arrives each time a Task screen is built, as the port lets go there, so it can come when nothing is held. It is safe then, and safe to run twice.
- **A disabled Hold reports nothing**, unless a contact is still held or owed (`physicalHolding` or `needsContactOff`). Then it still reports, so that the hold can be let go. Whether that becomes a new DOWN is the controller's to refuse, and it does: on Frontend's own fixture for that state, with Frontend's controller and adapter, a press sends no DOWN and its let-go sends the contact-off.
- **The surface never shows a hold the ship has not confirmed.** A press shows as on its way; "Holding" comes from the view.

## States

| `status` | What shows | What reports |
| --- | --- | --- |
| `live` | The state as given | Everything |
| `stale` | The view stays, with "Reconnecting…" during a Task. Every gameplay control is disabled | The tabs, Promises, Settings, Actions and Close go on working. No press, ask, answer or cancel |
| `concealed` | Nothing: the surface is taken down, with its page and its listeners, and it keeps nothing of the viewer (see below) | Nothing |

With `view: null` the surface is empty and covers nothing. With another panel open (`navigation.openPanel` not `board`) it is hidden; during a Task it still holds the screen.

### Concealed keeps nothing of the viewer

`concealed` means the viewer is not authorized, or the app has put the screen away. Then:

1. **Everything is let go first**, while the app can still be told (`onReleaseAll`, then what Food covered is given up).
2. **The surface is taken down:** its page, its listeners, and what the player had opened and chosen.
3. **The viewer's inputs are dropped:** `view`, `can`, `sending` and `viewer` go back to their defaults (`FOOD_PRIVATE_INPUTS`). That holds for what the surface held before, and for what comes with the same change. A mount that starts concealed keeps none of them either, and nor does a disposed surface.

So **a later change of status alone shows nothing again.** `update({ status: 'live' })` after `concealed` leaves the surface empty and offering nothing, until it is given fresh authorized inputs. It brings back only what it is given: a fresh `view` alone is drawn with every control disabled, no press and no Promises count. No offer is ever brought back or inferred.

`stale` is not concealed. The viewer is still authorized: the view and this phone's presses stay, and `live` again by status alone draws them as they were.

What is public or this phone's own stays through `concealed`: `people`, `board`, `clock`, `assets`, `navigation`, `reducedMotion` and `bars`.

## Focus and keys

- The same control stays focused across redraws.
- A new card or sheet takes focus.
- A sheet or card that is built again gives the focus back (correction 6). It is built again after `relayout()`, at the Largest text, and whenever what it shows changes.
  - The control that held the focus gets it back: Close, Back, a row, an answer, a tab.
  - The sheet or card takes it itself when it held it, or when that control is gone.
  - The top bar is drawn again once a second: Promises and Settings keep the focus through that.
  - Focus that is outside the surface is left where it is.
- Escape closes the surface's own sheet and goes no further. During a Task or a pending request it is held and closes nothing. Otherwise it is left to the app.
- Space and Enter are taken on the surface's controls only.

## The shared display's notice, and the gauge

```js
const notice = mountFoodNotice(host, { step, stock, status, bars: { top } });
notice.update(changes); notice.dispose();

header.append(foodGauge(document, doses));   // null when there is nothing to show
```

The notice takes the finalized public stock (`{ doses }`) and step (it keeps its `kind` alone), this screen's status and the ordinary header's height. It takes no view, seat or viewer. It says who is away, then the stock's rise, and hides when stale or concealed.

Its host takes the same `planet-food-host` class and rule as the phone surface's. The notice draws no portrait, so it asks for no crew picture surface.

`foodGauge` returns the header's gauge as the port draws it. The header and its wrapper (`.planet-food.fs-clock.food-native-clock`) stay Frontend's.

## Motion and text size

One meaning per call: `update({ reducedMotion })` changes motion, and `relayout()` lays the surface out again. Frontend calls each from its preferences handler, where the port heard the app's `mothership:preferences-change` event.

- **Reduce motion:** the game's (`reducedMotion`) or the device's. Either way the surface is drawn reduced: no spinner turns, and the pose steps where it would glide. `update({ reducedMotion })` changes that and lays nothing out.
- **Text size:** the styles are in rem. The app scales the root, as today. After the text size changes, call `relayout()`.
  - Most of the surface follows the new size on its own frames. What it measured when a part was built stays until that part is built again: the "away" banner's place under the top bar is one. `relayout()` builds the surface's parts again, as the port did on that event.
  - A sheet or card that is open is built again by it, and keeps the focus (correction 6).
  - Suspended, it waits for `resume()`. Concealed or disposed, it does nothing.

## Art

The component loads no picture. It draws with what `assets` gives: the Supply Room's back, and the nine characters at both stations, alive and out (37 pictures, `/art/food-supply/`). Frontend's loader fetches them, as today.

`assets.subscribe` is optional. If the loader has it, `subscribe(listener)` must return a function that ends the subscription. The surface subscribes once per loader, and calls that function when the loader is replaced and on dispose.

## The copies

`sources.json` lists fifteen copies. Ten are their source byte for byte. Five differ, by 25 recorded differences of four kinds:

- **4 import paths, 11 connector seams and 2 host rules.** None of them touches a line that draws.
- **8 corrections,** each with the number of the correction it belongs to. They are the only differences that change what is drawn or done, and they are listed under [Corrections to the port](#corrections-to-the-port).

| File | From | Differences |
| --- | --- | --- |
| `food.css` | `food.css` | 1 correction: the role row's two rules (3) |
| `food-ink.mjs` | `food-ink.mjs` | 2 import paths, to the hosted game's crew ink |
| `food-render.mjs` | `food-render.mjs` | 2 import paths. 7 connector seams: no import of `@mothership/game`; the contact reporter is given, not built; the app's four listeners (blur, focus, visibility, preferences) are gone, with their removal; the handle gains `relayout`, `suspend` and `resume`. 7 corrections: the portraits (1), the dock (2), the outcome card (4), the request card (5), and the focus (6: once in the top bar, twice where a sheet or card is built) |
| `food-notice.mjs` | `food-app.mjs` | 4 connector seams: no import of the client package or of the renderer; `mountFoodApp` stays Frontend's; the header's height is given (`game.top()`) where the port read the app's page |
| `food-surface.css` | `food-host.css` | 2 host rules stay Frontend's: the gauge's place in the ordinary header, and hiding the ordinary bars |

A test re-derives each copy from its pinned source and its recorded differences, and fails on any other byte.

## Corrections to the port

Six things in the accepted port are corrected in the component, before adoption. The Lead Designer decided so on 16 November 2026, on #303. None is a redesign or a departure from a sheet:

- **1 and 2** bring the port back to the approved package's own pages.
- **3, 4 and 5** are defects at the larger text sizes, in states no sheet draws.
- **6** is a defect in focus.

How they are kept honest:

- Each is a recorded difference in `sources.json` (kind `correction`, with its number), so the test still derives every copy from its pinned source.
- The check holds every capture to the frozen port everywhere outside the places a correction touches.
- Each is pictured before and after in `review/fix-<number>-….jpg`: the frozen port's page on the left, the component's on the right.
- The version stays `food-0.1.0`, since nothing has shipped.

### 1. The top bar's portraits

- **The port:** 36 px. It set each portrait's size inline, which the kit's rule (`.tb-who .pt`, 32 px) cannot reach. The package's `<img>` obeys that rule. The Task's title sat 8 px too far right. It is in the captures accepted on #276 and #290.
- **Now:** the inline size is gone, so the kit's rule sizes the portraits: 32 px. The title is 8 px further back. The ordinary turn bar, which shows over a Food sheet opened outside the step, has one portrait: it is 32 px too, and its title 4 px further back.
- **Held by:** the package's pages. The portraits are in the same places, and the bar's portraits and title are the package's to 3 levels (the bar's glass over the app's own background). The same picture 3 px off measures over 200.
- **Pictures:** `fix-1-390x844-food-panel-04.jpg`, `fix-1-430x932-food-panel-04.jpg`.

### 2. The dock with no instrument

- **The port:** with the crate landed or the Task over there is no instrument. The dock kept the instrument's empty slot, whose gap made the dock 10 px taller than the package's. Nothing was drawn there.
- **Now:** no slot and no gap: the dock is its controls. Nothing drawn moves.
- **Held by:** the package's pages: the dock lies where the package lays it, to half a pixel. Against the port, only the dock's box differs: the picture is the port's.
- **Picture:** `fix-2-390x844-food-winch-12.jpg`. Its two halves differ only in the top bar, by correction 1.

### 3. The role row at the Large text

- **The port:** at the Large text on 390 × 844 the row squeezed the Partner's label into a narrow column: "8 / Hana" and "· / Winc / h" on the Panel, "3 / Cleo" and "· / Panel" on the Winch.
- **Now:** the label is two whole pieces: the seat number with its name ("8 Hana"), and the rest ("· Winch", "· Winch · Out").
  - Side by side where they fit: at the Standard text, and for a label such as "8 Hana · Winch" at the Large text on 430 × 932. There the row is the port's, pixel for pixel.
  - One above the other, beside the pill, where they do not.
  - On a line of their own under the pill where a piece does not fit beside it: "· Winch · Out" at the Large text, or the longest names.
  - No word is broken, and the seat number stays with its name.
  - At the Largest text the row is dropped, as before.
- **Held by:** the probe, at the Standard and the Large text, on both phones, with the fixtures' names and with twelve-letter names.
- **Pictures:** `fix-3-390x844-food-panel-04-text150.jpg`, `fix-3-390x844-food-winch-03-text150.jpg`.

### 4. The outcome card at the larger text

- **The port:** at the Large text the card ran over the role row, by 40 px on 390 × 844 and by 12 px on 430 × 932. At the Largest text it covered the whole hint.
- **Now:** the card ends 12 px above the view's lower edge, as far inside the view as it is from its sides.
  - When its words need more room it scrolls, with the port's fade.
  - Its limit is set before it is shown, so it never shows taller, even for the 80 ms that Reduce motion gives every change.
  - At the Standard text it is the port's card.
- **Held by:** the probe and the check, at every text size on both phones: over no row and no control, and scrolling to its last line.
- **Pictures:** `fix-4-390x844-case-food-panel-16-text150.jpg` and `-text200.jpg`, and the same two at 430 × 932.

### 5. The request card at the larger text

- **The port:** the card ran over the surface's tab bar: by 17 px at the Large text on 390 × 844, and by 82 px at the Largest text on both phones.
- **Now:** the card ends 8 px above the Pass button, which stands 20 px above the tab bar.
  - Its words scroll, with the port's fade, above Decline, Join and "Answer within 15 s", which stay whole.
  - At the Standard text, and at the Large text on 430 × 932, it is the port's card.
- **Held by:** the probe and the check, at every text size on both phones.
- **Pictures:** `fix-5-390x844-case-food-flow-04-text150.jpg` and `-text200.jpg`, and `fix-5-430x932-case-food-flow-04-text200.jpg`.

### 6. Focus on what is built again

- **The port:** a sheet or card that was built again gave the focus back only to a control with an id. Close, Back, the rows of Start a Task and the tabs have none, and neither has the sheet or card itself: the focus went to the page.
  - It happened on the app's preferences event, at the Largest text, and when a Partner was chosen with the focus on the sheet.
  - In the top bar, drawn again once a second, only Settings kept the focus. Promises lost it.
- **Now:** what held the focus gets it back. See [Focus and keys](#focus-and-keys).
- **Held by:** the probe, with a sheet open and with a request card open, across `relayout()` and at the Largest text; and the check, against the port, which leaves the focus to the page.

### What the corrections leave as the port has it

Three things, measured by hand on the preview. They are not in the record.

- **The briefing card at the Largest text lies over the hint,** on both phones. By the package's rule the briefing never scrolls, so it has no limit. At the Large text it stays inside the view.
- **A request card keeps at least 13rem of height,** so that its words stay in sight. At the Largest text on a phone under about 700 px tall, ending above the Pass button would leave it less. There it keeps the port's reach:
  - 320 × 568: it is the port's card exactly.
  - 360 × 640: it runs 19 px over the tab bar, where the port's ran 82 px.
  - 375 × 667: it ends 8 px above the tab bar, and 11 px over the Pass button.
- **An outcome card keeps at least 6rem.** At the Largest text on 320 × 568 it lies over the hint's first 38 px, where the port's covered the hint and the control. At 360 × 640 and above it ends inside the view.

At 390 × 844 and 430 × 932 neither floor is reached.

## Not in this version yet

| Not here | Why |
| --- | --- |
| The shared kit and the shell's bars | The surface carries the port's own frozen copy of the pack's kit and icons. Moving it onto the shared kit would change pixels, so it is a later step with its own review |
| The small phone (320 × 568), as captures | The owner deferred that coverage. The styles are the port's, with the corrections above |
| A change to any word or art, or to any layout but the corrections above | Out of scope for the extraction |

## Checks run on this version

`node design/tools/food-component-check.mjs` bundles the preview as the game bundles a component, adds the hosted game's own art as its build emits it (49 files: twelve art bundles and the 37 Food drawings), and serves both with the production response headers. Every page passed with no policy report but the known one (zod's eval probe, which the live game's bundle has too), no failed request and no page error.

- **Captures:** 33 synthetic states at 390 × 844 and 430 × 932, in full motion and with the device's Reduce motion: 132, each showing what its state must. The states are Frontend's five inputs, three variants of them (a refused, a recovered and an unknown press), nineteen of Frontend's native fixtures run on Frontend's own controller, three gauge states, and three notices.
- **The frozen port:** the same state drawn by the port's own renderer in the same phone, read with the corrections that apply. All 132 agree. A clock one second off is told apart.
  - In 36 no correction applies: the DOM, the boxes and the pixels are the port's, byte for byte.
  - In the other 96 the DOM is the port's as corrected and nothing else, the boxes are the port's but for the dock's, and the pixels are the port's everywhere outside the top bar's portraits and title (and, where the How it works sheet's glass lies over the bar, the 48 px around them that the glass blurs). In 8 of them (the request card and the Partner sheet) nothing differs in the picture at all.
  - Which applies where: correction 1 in 88 (every Task screen, and the one turn bar), 2 in 28, 4 in 16, 5 in 4 and 6 in 4. At the Standard text a card's limit is given and changes nothing that shows.
- **Larger text:** nine states (the five parts, a briefing, a sheet, a request and an outcome card) at both sizes, at the game's Large (150 %) and Largest (200 %) text: 36. Each is the port's everywhere outside the places its corrections touch:
  - the bar's portraits and title, in 28;
  - the role row and the hint under it, in the 8 where the port breaks the label;
  - an outcome card held by its limit, in 4;
  - a request card held by its limit, in 3 of 4 (at the Large text on 430 × 932 the port's card fits);
  - the Partner sheet's focus, in 4 (correction 6: nothing in the picture).
- **Laid out again:** the text size changed under a mounted surface, at both sizes, on three states: 6.
  - Told by `relayout()`, the component draws what a new mount draws at that text size, DOM and pixels, in all six.
  - It is also what the port draws on the app's preferences event, read with the corrections that apply.
  - On the "away" banner (`case-food-flow-09`), not told, the banner stays where it was built, 18 px too high under the taller bar: the control.
  - On an open request card (`case-food-flow-04`) and an open sheet (`case-food-flow-01`), the component's has the focus again, and the port's has left it to the page: correction 6, and its control.
- **Before and after:** twelve pictures of the corrections, each with its numbers read from the two pages (`check.json`, `corrections.beforeAfter`). A picture counts only if its numbers show the correction.
- **The approved package's own pages** (`design/food-supply/phone.html`, served unchanged) for #290's five parts, at both sizes:
  - Every part lies where the package lays it, to half a pixel, the dock with no instrument too (correction 2).
  - The top bar's portraits are 32 px and in the package's places. The bar's portraits and title are the package's to 3 levels, which is the bar's glass over the app's own background (correction 1).
  - The words differ only by the packet's own press state: "Sending…" on the RELEASE part, the "Checking your let-go…" notice on the Winch part. `food-panel-18` is another moment than the package's page (see below).
  - The scene outside the notices is the package's pixel for pixel on `food-panel-04` and `food-winch-12`. On `food-panel-03`, 512 of 106,860 pixels differ at 390 × 844 (558 of 129,860 at 430 × 932), around the moving crate and the two name tags. On `food-winch-03`, 624 of 55,380 differ by one level.
  - The instrument and the control are the package's pixel for pixel wherever the words agree.
- **Frontend's ten native captures from #290** (read from `3247fc3d`, each held to its SHA-256, none copied): for the four causal parts at both sizes, the scene outside the notices is within 1.41 to 1.61 levels on average, with 0.5 % to 0.7 % of its pixels more than 24 levels apart. The limit is 3 levels and 2 %. The same capture moved 3 px measures about 10 levels and 12 %.
- **The lifecycle probe:** 113 checks, once as the page comes and once with the device's Reduce motion: contacts, listeners, presses, offers, requests, stale, focus, lifecycle, quiet (no request, timer or storage), exits, ownership, privacy, the notice, the gauge, the host, motion, layout, the corrections, pictures, a handler's failure, and Frontend's own controller and contact adapter wired as the adapter will wire them.
  - **The six corrections,** in 13 checks, at the Standard, the Large and the Largest text and on both phones where the text size matters: the portraits' size; the dock with and without an instrument; no word of the Partner's label broken, with twelve-letter names too; the role row dropped at the Largest text; no outcome card over a row or a control, and none cut short of its last line; no request card over the Pass button or the tab bar, with its answers whole; and the focus kept across `relayout()` with a sheet open and with a request card open, at the Largest text, and through the top bar's redraw, and never taken from outside the surface.
  - **Concealed, nothing of the viewer comes back:** a surface that held a view, an offer, a press on its way and a Promises count is concealed and then woken by status alone, and shows none of them; the same for a mount that starts concealed; a fresh view alone brings no offer, press or count; the whole of a fresh input restores it as a new mount draws it; stale keeps its view. With the correction taken out, five of these checks fail.

`packages/design-tokens/test/food-component.test.mjs` (10 tests) holds the module graph, the copies and the eight corrections among their differences, the styles' reach, the inputs and audiences (the contract's ten view keys that are refused, by name), that concealed keeps nothing of the viewer, the view keys the drawing reads, the design's hint sentences, the packet's hash and the record. It reads only what is committed.

**What the comparisons do not show:**

- `food-panel-18` is a synthetic equivalent (a retained RELEASE-capable view marked stale), not a connected payload. #290's two captures of it are from a connected match, with other names, characters and stock and no synthetic safe areas, so they are recorded and not held. The component is held to what Frontend's packet expects of that frame instead.
- #290's captures were drawn by Chrome 157 on another machine with other fonts. Text differs by 4 to 10 levels on average and is reported, not held. On the RELEASE part the pressed control is tinted blue in #290's capture. The styles hold no such colour; it reads as the browser's own tap highlight from the touch that made the press.
- The preview's phone gives the review frames' safe areas (47 px and 34 px) through a preview style rule, and stands in for the ordinary app's bars and board.
- Each capture is of a page at rest: every fade is ended and the two spinners are held at one moment. With Reduce motion the kit fades every change over 80 ms. When the surface is first drawn, the hint's text starts a fade of its own as the hint's ends, so the preview goes on holding until nothing new starts. A picture taken while anything still runs fails the check.
- A picture is kept only when two takes 150 ms apart are the same. For a moment after a page is first drawn, the browser may draw an edge that lies on a fraction of a pixel a little differently, with no animation to say so. I saw it on one capture (430 × 932, the Largest text, the ring around LOCK): twelve pixels of one row, by 8 levels at most, in about one load in ten, on the port's page as on the component's, and never 150 ms later. The record counts the pictures and how many were taken again.

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

// The app's preferences handler, where the port heard `mothership:preferences-change`:
food.update({ reducedMotion });   // motion
food.relayout();                  // after the text size changes
```

- Mark the app's root with `setCrewPictureSurface(root, versions)` before the surface is given a view, as the app does today. A view on a host outside that surface is refused.
- Give the surface all its inputs on each change, as the sketch does. Concealed, it keeps nothing of the viewer, so when the viewer is authorized again the surface needs the view, the offers, the presses and the viewer's facts afresh. A change of status alone shows nothing.
- `inputsFromModel` gives each press a key of its own and picks the closure's six fields (`FOOD_CLOSURE_KEYS`). The command's id, the receipt and the envelope stay in the controller.
- Dispose the surface before the controller, so that the last `onReleaseAll` reaches it.
- On blur and on a hidden page, do as today: let the hold go and tell the controller it is not visible. Its model then says so, and the adapter sends `status: 'concealed'`, as it does when the viewer loses authorization.
- `suspend()` and `resume()` are for when the app stops showing the surface while the viewer stays authorized.
- The corrections need nothing of the adapter. Two things to know:
  - The surface gives the focus back itself when it builds a sheet, a card or its top bar again. It needs no focus handling around it.
  - **One page, one of the two sheets.** The component's `food.css` and the port's use the same class names, and the component's has the role row's two rules more. In a page that loaded both, the frozen port's surface would take the corrected row too.
- Tell Designer what does not fit. The canonical source is changed here, not in a copy.
