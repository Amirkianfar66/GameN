# The private talk: Designer's runtime component (interface)

**Version:** `private-talk-0.1.0`, with `play-parts-0.2.0`, proposed. **Status (16 November 2026):** the interface, for the Lead Designer's review. Nothing is built. Once the Lead posts it on #4, I build it without waiting for Frontend (the owner, 16 November). It is stacked on Actions (#273), whose parts module it extends. It is not in the game and not a release.

**What it is:** sheet 25, the private talk on the two talking phones. The game's name for it is the Standard Hack (`REQUEST_HACK`, `DECLARE_HACK_SIDE`); the pack's word is "Private talk", and the pack is the specification for words (11 November). It is #222 item 20. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**The three steps** (the confirmed overlay `rules/overlays/declared-hack-owner-decision-2026-10-12.json`, HACK-DECLARE-01 to 07):

| Step | Phase | Time | The target's phone | The initiator's phone |
| --- | --- | --- | --- | --- |
| Declare | `HACK_DECLARE` | up to 15 s | "Declare your side" (frames 1 and 2) | Waiting for the claim (not drawn: D1) |
| The claim | `HACK_RESULT` | 5 s | "Ava sees your claim" (frame 3) | The claim as the initiator sees it (not drawn: D2) |
| Talk | `HACK` | 60 s | The capsule, both seated (frame 4) | The same |

Every other phone and the shared display see only who is talking: the shell's pair bar (HACK-DECLARE-04).

**Covers:**
- **Declare** (the target's phone):
  - who asked: the initiator's portrait at 56 px, "Ava asked to talk", "Declare a side. It is a claim, not a check.";
  - three side cards, the same for every role, as one radio group: Blue, Red and Alien, each the side card's art and its word;
  - the sides the server does not offer this phone disabled, with a lock and "Not for your role", on this phone only (HACK-DECLARE-02);
  - the line under them: "Your role declares its own side: Blue. Only you see this." or "Your role may claim any side. Only you see this.";
  - "Declare Blue" in the shell's footer, busy while it sends.
- **The claim** (5 s, both phones): the declarer's portrait at 56 px, "Dev claims Blue", "Unverified · only Ava sees this", and the side card. With no declaration, "No side declared" and the blank card, never an invented side (HACK-DECLARE-03).
- **Talk** (60 s, both phones): the capsule in the shell's stage, both people seated at its table, its lamps and the dust in the lamp's light. The shell draws the pair bar ("Private talk", the time left) and the talk's own foot, Promises and My card.

**Built on, not redrawn:**
- **The phone shell** (#265):
  - the pair bar (`bar.kind: 'pair'`), with this component's words for its sub;
  - the docked sheet and its footer;
  - the tab bar's talk variant (Promises and My card).
- **The kit** (`component-kit-0.5.1`): portraits, the group note, the control policy; the waiting block, if D1 takes it.
- **My parts module** (`play-parts/`, L2), at 0.2.0:
  - **who**, at 56 px as well as 64 (the pack draws the talk's at 56);
  - **the tile**, with a card's art in place of its icon. The pack's side cards are its `.tile`.
- **The hosted capsule drawing,** used as it is:
  - `apps/game/hosted/board-v2-drawing/capsule-scene.mjs`: the capsule's layers, its framing in a panel, the two seats and the name tags' places;
  - `capsule-figures.mjs`: the seated pose;
  - the crew drawing, for the people.
- **The room scene's ambient** (`room-scene/ambient.mjs`): the capsule's lamps, keys and dust. It is already drawn for the capsule.
- **The side cards' art:** `HACK_ART` in `apps/game/hosted/scene-drawing/phone-kit-art.mjs` (`hack-side-blue`, `-red`, `-alien`, and `-none` for no declaration).

**Not in this component:**
- Asking for the talk: Actions (#273, `REQUEST_HACK`).
- Promises during the talk: sheet 33, a later component of mine. The Promises tab only reports the tap.
- My card during the talk: the Card sheet (#270).
- The pair bar on the other phones: the shell's.
- The capsule's film (walking in and out): see D5.

## Files (planned)

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `private-talk/private-talk.mjs` | `PRIVATE_TALK_VERSION`, `TALK_WORDS`, the inputs' defaults and checks; the frames `declareSheet()` and `claimSheet()`; the bar's words `talkBar()`; the mounts `mountDeclare()`, `mountClaim()`, `mountCapsule()` (and `mountTalkWait()`, if D1 takes it) |
| `private-talk/private-talk.css` | Its layout, scoped under `.ms-private-talk`. It imports the kit's and the parts' styles |
| `play-parts/play-parts.mjs` and `.css` | 0.2.0: the tile's `art` and who's `size` |
| `private-talk/preview/` | Development only: the preview in the shell over the room scene and in the capsule; the probe; the agreement with the pack |
| `private-talk/review/` | The check's captures and `check.json` |

Also `design/tools/private-talk-check.mjs`, `packages/design-tokens/test/private-talk.test.mjs`, and this page.

## The steps, and who draws what

| Step | The shell | The stage | This component |
| --- | --- | --- | --- |
| Declare, the target | `bar: talkBar({ phase: 'declare', … })`: the pair, "Private talk · declare", the time left. `sheet: declareSheet(…)` (id `talk-declare`), no close. The game's tabs, with Pass off | the room scene, as in the room (HACK-DECLARE-06: moving stays legal) | `mountDeclare()` in `shell.sheetBody`; a card calls `onSide(side)` |
| Declare, sending | `declareSheet({ …, phase: 'sending' })`: "Declare Blue" busy | unchanged | unchanged |
| Declare, the initiator | the same bar | the room scene | D1 |
| The claim, both | `bar: talkBar({ phase: 'claim', … })`: "Private talk · claim". `sheet: claimSheet(…)` (id `talk-claim`), no footer, no close | the room scene | `mountClaim()` |
| Talk, both | `bar: talkBar({ phase: 'talk', … })`: "Private talk". `tabs: { variant: 'talk' }`. No sheet | `mountCapsule()` in `shell.stage`, in place of the room scene | the capsule |
| The talk ends or aborts | the room again | the room scene again | every part disposed; nothing kept (HACK-DECLARE-04) |

## Inputs (proposed)

### Every part

As Actions': `viewer`, `status` (`'live'`, `'stale'` or `'concealed'`), `interactive`, `reducedMotion`, `versions`. Concealed, or for a new viewer, a part drops this viewer's inputs and empties itself.

### Declare (`mountDeclare`)

| Field | Audience | What |
| --- | --- | --- |
| `partner` | This viewer | The initiator: `{ seat, name, character }` |
| `sides` | This viewer | The sides this phone may declare: the `DECLARE_HACK_SIDE` offer's `declaredSides`, as given (`['Blue']`, or all three). The other cards are disabled. The component never works them out from the role (T3; D6) |
| `selected` | This viewer | `'Blue'`, `'Red'`, `'Alien'` or `null`: Frontend's choice so far. With one side offered, Frontend passes it |

The line under the cards follows from `sides`: one side offered, "Your role declares its own side: Blue. Only you see this."; all three, "Your role may claim any side. Only you see this."

`declareSheet({ selected, phase })` gives the shell `{ id: 'talk-declare', title: 'Declare your side', close: false, actions: [{ id: 'declare', label: 'Declare Blue', icon: 'declare', kind: 'primary', busy, enabled }] }`. Declare is off until a side is chosen.

Callback: `onSide(side)`, for an offered card.

### The claim (`mountClaim`)

| Field | Audience | What |
| --- | --- | --- |
| `view` | This viewer | `'declarer'` (the target's own claim) or `'initiator'` (the partner's claim) |
| `declarer` | This viewer | `{ seat, name, character }`: whose claim it is |
| `partner` | This viewer | The other person: whose eyes the claim is for |
| `claim` | This viewer | `'Blue'`, `'Red'`, `'Alien'`, or `null` for no declaration: `hackFeedback.declaredSide` with its `status` (`DECLARED` or `NO_DECLARATION`) |

`claimSheet({ view, partner, declarer })` gives the title: "Ava sees your claim" for the declarer; D2 for the initiator.

### The capsule (`mountCapsule`)

| Field | Audience | What |
| --- | --- | --- |
| `pair` | Public | `[initiator, target]` from `hackSession` (`actorSeatId`, `targetSeatId`), each `{ seat, name, character, health, jailed }` from the public board |
| `self` | This viewer | This phone's seat, for "You" on its tag |
| `size` | — | The stage's size, from the shell's layout, as the room scene takes it |
| `clock` | — | The game's clock, for the ambient; `null` holds it still |

Lifecycle, as every part: `{ element, update(partial), suspend(), resume(), dispose() }`.

### The bar's words

`talkBar({ phase, pair, endsAt })` gives the shell's pair bar: the pair, and the sub "Private talk · declare", "Private talk · claim" or "Private talk", with the time left from the phase's deadline.

## Privacy and audiences

- **Only the two phones** draw the declaration, the claim and the capsule. Every other phone, the host and the shared display get the shell's pair bar only: no claim, no side, no art (HACK-DECLARE-04).
- **The disabled cards and the line under them** are the target's own phone's (HACK-DECLARE-02).
- **A claim is never a check:** it says "Unverified", and nothing in the component treats it as a role.
- **When the talk ends or aborts,** every part is disposed and nothing of the claim stays in the page.

## Accessibility

- The three cards are one radio group, "Side to declare", as the pack marks them. A disabled card keeps its place and its focus, and says "Not for your role".
- The claim is a status, read when it opens.
- The capsule's people are named on their tags, as the room's are.

## Decisions for the Lead

- **D1. The initiator while the target declares** (`HACK_DECLARE`, up to 15 s; not drawn). The pack's code has a `waiting` stage that draws the capsule, but no frame, and moving stays legal in this phase (HACK-DECLARE-06), so the room should stay. I propose the room, the pair bar's "Private talk · declare", and a small sheet with the kit's waiting block: the partner's portrait and "Dev is choosing a side". No sheet at all is the other option.
- **D2. The initiator's claim** (not drawn). The pack's frame 3 is the declarer's ("Ava sees your claim", "Dev claims Blue", "Unverified · only Ava sees this"). I propose the same parts for the initiator: the title "Dev's claim", Dev's portrait, "Dev claims Blue", "Unverified · only you see this", and the side card.
- **D3. No declaration:** "No side declared" with the blank card, on both phones; the title stays (HACK-DECLARE-03).
- **D4. The words** are the pack's, not Frontend's current "Hack" copy, which `en.ts` would take on:
  - "Declare your side", "Ava asked to talk", "Declare a side. It is a claim, not a check.";
  - "Declare Blue", "Not for your role";
  - "Ava sees your claim", "Dev claims Blue", "Unverified · only Ava sees this";
  - "Private talk · declare", "Private talk · claim", "Private talk".
- **D5. The capsule's motion.** The pack draws the pair seated, with the ambient. The game's board already has a capsule film (walking in, declaring, the result, talking, walking out: `capsule-film.mjs`). I propose the seated capsule and its ambient now, and the film with the motion handoff later, as its own step.
- **D6. The sides come from the offer.** The contract's `DECLARE_HACK_SIDE` offer already carries `declaredSides` for the phone's pins (DSN-REQ-22 is met), so the handoff's "Frontend derives the sides from the role" can go.
- **D7. The tabs:** the game's tabs, with Pass off, while declaring and during the claim (the pack's frame); the talk's own foot only in the 60 s talk.
- **D8. The parts:** play-parts 0.2.0 adds the tile's `art` and who's `size`, both in my module (L2), checked with this component's agreement.

## Questions for Backend and Integration (through the Lead on #4)

- **Q1.** During `HACK_DECLARE`, does the initiator's own view carry `hackFeedback` with `AWAITING_DECLARATION`, so D1 can show the wait without guessing?
- **Q2.** During `HACK_RESULT`, does the declarer's own view carry `hackFeedback` with its accepted side, so its claim view shows what the server accepted rather than what the phone sent?
- **Q3.** The pair bar's time left: is the phase's deadline in the public view for all three phases, as for the others?

## Checks planned

The same as Actions' and the Card's:
- **The preview:** the pack's synthetic fixtures, in the shell over the room scene, and in the capsule.
- **Captures** at 390 × 844 and 430 × 932 under the production headers, and the Largest text at 320 × 568.
- **The probe:** a card reaches `onSide`; disabled cards refuse and keep the focus; the claim's words for both views and for no declaration; concealment and a new viewer leave nothing; `dispose()`; Reduce motion stills the ambient.
- **The agreement with the pinned pack:** sheet 25's declare (own side only, and any side), the claim, and the talk, with every word, card, state and box compared to within half a pixel.
- **The unit tests**, and the repository's checks.
