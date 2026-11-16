# The private talk: Designer's runtime component

**Version:** `private-talk-0.1.0`, with its parts module at `play-parts-0.2.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #293 at `7e068512` with the decisions D1–D8 below, and posted on #4 with Q1–Q3 for Backend and Integration. Built without waiting for Frontend, as the owner decided on 16 November (Designer builds each part once the Lead approves its interface; recorded on #280). Frontend has not connected it: it is not in the game yet, and Integration first admits its files to the hosted build. It is not a release. It is stacked on Actions (#273) at `6d67dd2f`, whose parts module it extends, on the phone shell at `67989624` (`phone-shell-0.2.1`, `component-kit-0.5.1`). What changed from the approved interface while building is under [As built](#as-built-what-changed-from-the-interface), for the Lead.

**What it is:** sheet 25, the private talk on the two talking phones. The game's name for it is the Standard Hack (`REQUEST_HACK`, `DECLARE_HACK_SIDE`); the pack's word is "Private talk", and the pack is the specification for words (11 November). It is #222 item 20. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**The three steps** (the confirmed overlay `rules/overlays/declared-hack-owner-decision-2026-10-12.json`, HACK-DECLARE-01 to 07):

| Step | Phase | Time | The target's phone (the declarer) | The initiator's phone (the partner) |
| --- | --- | --- | --- | --- |
| Declare | `HACK_DECLARE` | up to 15 s | "Declare your side" (frames 1 and 2) | "Dev is choosing a side", only while its view says it waits (D1) |
| The claim | `HACK_RESULT` | 5 s | "Ava sees your claim" (frame 3) | "Dev’s claim" (D2) |
| Talk | `HACK` | 60 s | The capsule, both seated (frame 4) | The same |

Every other phone and the shared display see only who is talking: the shell's pair bar (HACK-DECLARE-04).

**Covers:**
- **Declare** (the declarer's phone):
  - who asked: the partner's portrait, "Ava asked to talk", "Declare a side. It is a claim, not a check.";
  - three side cards, the same for every role, as one radio group: Blue, Red and Alien, each the side card's art and its word;
  - the sides the offer leaves out locked, with a lock and "Not for your role", on this phone only (HACK-DECLARE-02);
  - the line under them: "Your role declares its own side: Blue. Only you see this." or "Your role may claim any side. Only you see this.";
  - "Declare Blue" in the shell's footer ("Declare a side", off, before a choice), busy while it sends.
- **The wait** (the partner's phone, D1): the declarer's portrait and "Dev is choosing a side", in the kit's waiting block, only while the view says it waits (Q1). Without that, no sheet: the bar's "Private talk · declare" carries it.
- **The claim** (5 s, both phones): the declarer's portrait, "Dev claims Blue", "Unverified · only Ava sees this" on the declarer's phone or "Unverified · only you see this" on the partner's (D2), and the side card. With no declaration, "No side declared" and the blank card, never an invented side (D3, HACK-DECLARE-03).
- **Talk** (60 s, both phones): the capsule in the shell's stage, both people seated at its table, its door shut and its light lit, its lamps and the dust in the lamp's light, and each one's name tag, "You" on this phone's. The shell draws the pair bar ("Private talk", the time left) and the talk's own foot, Promises and My card (D7).

**Built on, not redrawn:**
- **The phone shell** (#265): the pair bar (`bar.kind: 'pair'`), with this component's words for its sub; the docked sheet and its footer; the tab bar's talk variant (Promises and My card).
- **The kit** (`component-kit-0.5.1`): portraits, the group note, the waiting block, the control policy.
- **My parts module** (`play-parts/`, L2), at 0.2.0: **the tile**, with a card's art in place of its icon (the pack's side cards are its `.tile`), a note led by an icon (the lock), and no accessible name of its own when asked (`label: false`), so a card is named by its words; and **who**, as it is (64 px).
- **The hosted capsule drawing,** used as it is: `apps/game/hosted/board-v2-drawing/capsule-scene.mjs` (the capsule's framing in a panel, the two seats and the name tags' places), `capsule-figures.mjs` (the seated pose, Injured and Jailed), and the crew drawing (`crew-runtime.mjs`), for the people.
- **The capsule's pictures:** the board's `board-v2-art` bundle properties (`--board-v2-art-capsule-back`, `-door-0`, `-busy`), as the room-drawing release (`room-drawing-1.0.0`) redraws them. A phone draws the pictures its match's bundles carry; the component fetches nothing.
- **The room scene's ambient** (`room-scene/ambient.mjs` and `.css`): the capsule's lamps, keys and dust, on the game's clock, as the room scene runs it.
- **The side cards' art:** `HACK_ART` in `apps/game/hosted/scene-drawing/phone-kit-art.mjs` (`hack-side-blue`, `-red`, `-alien`, and `-none` for no declaration).

**Not in this component:**
- Asking for the talk: Actions (#273, `REQUEST_HACK`).
- Promises during the talk: sheet 33, a later component of mine. The Promises button only reports the tap (the shell's).
- My card during the talk: the Card sheet (#270).
- The pair bar on the other phones: the shell's.
- The capsule's film (walking in and out): later, as its own step (D5).

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `private-talk/private-talk.mjs` | `PRIVATE_TALK_VERSION`, `SIDES`, `TALK_WORDS`, `CAPSULE_LAYERS`; the inputs' defaults and checks (`checkDeclare`, `nextDeclareInput`, `checkClaim`, `checkWait`, `checkCapsule`); the frames `declareSheet()`, `claimSheet()`, `waitSheet()`; the bar's words `talkBar()`; the mounts `mountDeclare()`, `mountTalkWait()`, `mountClaim()`, `mountCapsule()` |
| `private-talk/private-talk.css` | Its layout, scoped under `.ms-private-talk`. It imports the kit's, the parts' and the ambient's styles |
| `play-parts/play-parts.mjs` and `.css` | 0.2.0: the tile's `art`, `noteIcon` and `label: false` |
| `private-talk/preview/` | Development only: the preview in the shell over the room scene and in the capsule (`states.mjs`, `preview.mjs`), the probe (`probe.mjs`), the agreement with the pack (`agree.mjs`) |
| `private-talk/review/` | The check's captures and `check.json` |

Also `design/tools/private-talk-check.mjs` (development only), `packages/design-tokens/test/private-talk.test.mjs`, and this page.

## The steps, and who draws what

| Step | The shell | The stage | This component |
| --- | --- | --- | --- |
| Declare, the declarer | `bar: talkBar({ phase: 'declare', … })`: the pair, "Private talk · declare", the time left. `sheet: declareSheet({ selected })` (id `talk-declare`), no close. The game's tabs, with Pass off (D7) | the room scene, as in the room (HACK-DECLARE-06: moving stays legal) | `mountDeclare()` in `shell.sheetBody`; a card calls `onSide(side)` |
| Declare, sending | `declareSheet({ selected, phase: 'sending' })`: "Declare Blue" busy | unchanged | `update({ interactive: false })`: the cards take no tap |
| Declare, the partner | the same bar; `sheet: waitSheet()` (id `talk-wait`, "Private talk") only while its view says it waits (Q1), else no sheet | the room scene | `mountTalkWait()`, with that sheet only |
| The claim, both | `bar: talkBar({ phase: 'claim', … })`: "Private talk · claim". `sheet: claimSheet({ view, partner, declarer })` (id `talk-claim`), no footer, no close | the room scene | `mountClaim()` |
| Talk, both | `bar: talkBar({ phase: 'talk', … })`: "Private talk". `tabs: { variant: 'talk' }`. No sheet | `mountCapsule()` in `shell.stage`, in place of the room scene, sized by the shell's `onLayout` | the capsule |
| Any other phone, the shared display | the same pair bar, every step | the room scene | nothing |
| The talk ends or aborts | the room again | the room scene again | every part disposed; nothing kept (HACK-DECLARE-04) |

## Mount, update and dispose

Every part returns `{ element, update(partial), suspend(), resume(), dispose() }`, as Actions' parts do:
- `update(partial)` replaces each key given; an unknown key is an error, and nothing changes.
- `suspend()`: the part takes no tap and the capsule stands still (its ambient and its crew), until `resume()`.
- `dispose()` removes the part and its listeners and releases the capsule's crew; after it, nothing fires and `update()` does nothing.
- Synchronous; no timers of its own. The capsule's ambient runs on the clock it is given.

## Inputs

### Every part

As Actions': `viewer`, `status` (`'live'`, `'stale'` or `'concealed'`), `interactive`, `reducedMotion`, `versions`. Concealed, or for a new viewer, a part drops this viewer's inputs and empties itself, and nothing comes back until they are given again.

The two people, for the private parts (declare, the wait, the claim), from the public `hackSession` and the board's names:

| Field | What |
| --- | --- |
| `partner` | The initiator, who asked (`actorSeatId`): `{ seat, name, character }` |
| `declarer` | The target, who declares (`targetSeatId`): `{ seat, name, character }` |

Each part draws only for its own viewer among them: declare for the declarer, the wait for the partner, the claim for the one its `view` names. For anyone else, or with either person missing, it draws nothing.

### Declare (`mountDeclare`)

| Field | Audience | What |
| --- | --- | --- |
| `partner`, `declarer` | This viewer | As above |
| `sides` | This viewer | The sides this phone may declare: the `DECLARE_HACK_SIDE` offer's `declaredSides`, as given (`['Blue']`, or all three). The other cards are locked. The component never works them out from the role (T3; D6). With no sides, nothing is drawn |
| `selected` | This viewer | `'Blue'`, `'Red'`, `'Alien'` or `null`: Frontend's choice so far, one of `sides`. With one side offered, Frontend passes it |

The line under the cards follows from `sides`: one side, "Your role declares its own side: Blue. Only you see this."; all three, "Your role may claim any side. Only you see this."; two, no line (neither is true).

`declareSheet({ selected, phase })` gives the shell `{ id: 'talk-declare', title: 'Declare your side', close: false, actions: [{ id: 'declare', label: 'Declare Blue', icon: 'declare', kind: 'primary', busy, enabled }] }`. Before a choice it reads "Declare a side", off; `phase: 'sending'` makes it busy.

Callback: `onSide(side)`, for an offered card. While the declaration sends, Frontend passes `interactive: false`, so the cards take no tap.

### The wait (`mountTalkWait`, D1)

`partner` and `declarer`, as above. Drawn on the partner's phone only, with `waitSheet()` (`{ id: 'talk-wait', title: 'Private talk', close: false, actions: [] }`): the declarer's portrait in the waiting block's 76 px place, and "Dev is choosing a side". Frontend mounts it only while the partner's view says it waits (`hackFeedback` `AWAITING_DECLARATION`, Q1).

### The claim (`mountClaim`)

| Field | Audience | What |
| --- | --- | --- |
| `view` | This viewer | `'declarer'` (the declarer's own claim) or `'initiator'` (the partner's phone) |
| `partner`, `declarer` | This viewer | As above |
| `claim` | This viewer | `'Blue'`, `'Red'`, `'Alien'`, or `null` for no declaration: `hackFeedback.declaredSide` with its `status` (`DECLARED` or `NO_DECLARATION`) |

`claimSheet({ view, partner, declarer })` gives the title: "Ava sees your claim" on the declarer's phone, "Dev’s claim" on the partner's (D2); no footer, no close.

### The capsule (`mountCapsule`)

| Field | Audience | What |
| --- | --- | --- |
| `pair` | Public | `[initiator, target]` from `hackSession`, each `{ seat, name, character, health, location, jailed }` from the public board. The lower seat sits on the left, as the board seats them; `location` dresses them (`'Hospital'`, the gown; `'Jail'`, the prisoner's suit); Injured and Jailed change the seated pose, as on the board |
| `size` | — | The stage's size, from the shell's layout, as the room scene takes it |
| `clock` | — | The game's clock (`{ now() }`), for the ambient; `null` holds it still at 0 s |

"You" goes on the tag of this phone's `viewer`.

### The bar's words

`talkBar({ phase, pair, remainingMs, round, promises, menu })` gives the shell's pair bar: the pair, initiator first, and the sub "Private talk · declare", "Private talk · claim" or "Private talk", with `timer: { remainingMs }`, the time left, which Frontend works out from the phase's deadline as for every bar (Q3).

## Callbacks

| Callback | When | What it carries |
| --- | --- | --- |
| `onSide(side)` | An offered card is tapped (the chosen one too) | `'Blue'`, `'Red'` or `'Alien'`: the only callback that carries a side |
| `onFocusReturn({ intent, value })` | A focused card is removed (concealed, a new viewer, the step ends) | `{ intent: 'side', value: '2' }`: the card's place, never its side |
| The shell's `onSheetAction('declare', 'talk-declare')` | "Declare Blue" | The action's id; Frontend sends `DECLARE_HACK_SIDE` with its own `selected` |

## What each state draws

The preview's states (`preview/states.mjs`), on the pack's synthetic fixtures (Ava, seat 1, asked Dev, seat 4; Gus, seat 7, is a third phone):

| State | Phone | Draws |
| --- | --- | --- |
| `declare-own` (frame 1), `declare-any` (frame 2) | Dev's | The three cards, Blue chosen; the role's own side (Red and Alien locked) or any side |
| `declare-unchosen`, `declare-red`, `declare-sending` | Dev's | Nothing chosen ("Declare a side", off); Red chosen; sending (busy, the cards refuse) |
| `wait` | Ava's | "Dev is choosing a side" (D1) |
| `declare-other`, `talk-other` | Gus's | The pair bar and the room; nothing of this component |
| `claim-declarer` (frame 3), `claim-initiator`, `claim-alien` | Dev's, Ava's | The claim on both phones (D2) |
| `claim-none-declarer`, `claim-none-initiator` | Dev's, Ava's | "No side declared" and the blank card (D3) |
| `talk` (frame 4), `talk-initiator`, `talk-status` | Dev's, Ava's | The capsule; "You" on each phone's own tag; Ava from the Jail and Dev Injured from the Hospital |
| `stale`, `concealed` | Dev's | Reconnecting, as last seen, no taps; concealed, nothing |
| `small-declare`, `small-talk`, `largest-declare`, `largest-claim`, `largest-wait`, `largest-talk` | — | 320 × 568, and the Largest text (200 %) there |

## Privacy and audiences

The Lead's five points (16 November), each a check of the probe and asserted on the record by the unit test:
- **Only the two talking phones ever get the declare or claim parts.** Each private part checks its own viewer against the two people and draws nothing for anyone else (`audience`).
- **Any other viewer, the shared display and a concealed phone get only the pair bar** (`audience`: every part on the declarer's, the partner's, a third phone and no viewer, and each concealed; and a third phone's whole screen in each step).
- **A viewer change drops everything** (`private`: each part handed to another viewer is empty, and stays empty when handed back, until given its inputs again).
- **The locked sides' "Not for your role" exists only on the declarer's own phone** (`private`: every state's whole phone, and the declarer's phone after a viewer change).
- **No side or claim reaches an attribute, the log or `onLayout`** (`leaks`: every attribute of every state's whole phone, through every card tapped, every side chosen and every claim shown; the console; every `onLayout` and every callback but `onSide`). A card is told apart by its place (`data-value` 1 to 3); the cards' and the claim's art is hidden from assistive technology, so a card is named by its own words.

Also:
- **A claim is never a check:** it says "Unverified", and nothing in the component treats it as a role.
- **When the talk ends or aborts,** every part is disposed and nothing of the claim stays in the page.

## Accessibility

- The three cards are one radio group, "Side to declare", each a radio with `aria-checked`, as the pack marks them. A locked card keeps its place and its focus, is `aria-disabled`, and its name says "Not for your role".
- Reconnecting, the cards take no tap and say why: "Controls return when the match is current", as Actions'.
- The claim is a status (`role="status"`), read when it opens.
- The capsule is decorative (`aria-hidden`): the pair bar names the two, and nothing in it is a control.
- The ambient and the crew stand still with Reduce motion (the game's `reducedMotion` or the device's), suspended, or while reconnecting.

## Frontend's connection (proposed)

- Declare: mount when this viewer's `DECLARE_HACK_SIDE` offer exists, with its `declaredSides`; keep `selected`; on `onSheetAction('declare', 'talk-declare')`, send `DECLARE_HACK_SIDE` with it, and pass `interactive: false` until the server answers.
- The wait: mount on the partner's phone while its view's `hackFeedback.status` is `AWAITING_DECLARATION` (Q1).
- The claim: mount on either phone during `HACK_RESULT` from that phone's `hackFeedback` (Q2).
- The capsule: mount in `shell.stage` in place of the room scene during `HACK`, with the pair from `hackSession` and the board, and the game's clock; update `size` from `onLayout`.
- On any other phone, mount nothing: the pair bar is the shell's.
- Replace the current "Hack" copy with these words (D4).

## As built: what changed from the interface

For the Lead; each follows the pack or makes a privacy point provable, and none changes a rule:
1. **Who stays at 64 px** (D8 smaller). The pack's code asks `pt(…, 56)`, but its own `.confirm-who .pt` rule draws every portrait there at 64 px, and the agreement measures 64 in sheet 25's frames. So who has no `size`, and play-parts 0.2.0 adds only the tile's art, its note's icon and `label: false`.
2. **Every private part takes both people.** Declare takes `declarer` as well as `partner`, and the wait `partner` and `declarer`, so each part checks its own viewer and the probe proves "only the two talking phones" in the component itself.
3. **The capsule's "You" is the `viewer`** every part has: the interface also listed `self`, the same seat, so it is not a second input.
4. **The capsule's people take `location`,** from the public board, for their outfit (the pack's `outfitFor(seat.location)`), with `health` and `jailed` for the pose.
5. **`talkBar()` takes `remainingMs`,** the shell's timer, which Frontend works out from the phase's deadline (the interface said `endsAt`).
6. **Two sides offered: no line** under the cards, since neither of the pack's lines would be true.
7. **The wait's sheet** is titled "Private talk", with the declarer's portrait in the waiting block's 76 px place.
8. **Under "No side declared"** the sub stays "Unverified · only Ava sees this" (or "only you"): D3 changed the headline and the card only. A different line would be the Lead's to choose.

## Decisions and questions

### The Lead's decisions (16 November, #293 at `7e068512`, posted on #4)

- **D1:** the initiator's waiting sheet shows only when the view says so (Q1). Without that, no sheet, and the bar's "Private talk · declare" carries it.
- **D2:** "Dev’s claim", "Unverified · only you see this".
- **D3:** "No side declared" and the blank card, on both phones.
- **D4:** the pack's words. Frontend's "Hack" copy goes when it connects.
- **D5:** the capsule seated, with its ambient, now; the walking film later, as its own step.
- **D6:** the sides come from the offer's `declaredSides`; the Lead drops "Frontend derives the sides from the role" from the handoff.
- **D7:** the game's tabs, with Pass off, while declaring and during the claim; the talk's own foot only in the 60 s talk.
- **D8:** `play-parts-0.2.0` (as built, item 1 above).

### For Backend and Integration (asked by the Lead on #4)

- **Q1.** During `HACK_DECLARE`, does the initiator's own view carry `hackFeedback` with `AWAITING_DECLARATION`, so the wait shows without guessing?
- **Q2.** During `HACK_RESULT`, does the declarer's own view carry `hackFeedback` with its accepted side, so its claim shows what the server accepted rather than what the phone sent?
- **Q3.** The pair bar's time left: is the phase's deadline in the public view for all three phases, as for the others?

## Not in this version yet

| What | Why |
| --- | --- |
| The capsule's film (walking in, declaring, the result, walking out) | D5: its own step, with the motion handoff |
| Promises during the talk (sheet 33) | A later component of mine; the shell's Promises button reports the tap |
| Lights out in the capsule | Sheet 25 draws the capsule lit |

## Checks run on this version

Recorded after the source commit; see the PR (#293) and `review/check.json`.
