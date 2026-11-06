# Library group 4: Promises

Designer delivery, 5 November 2026. This group covers the brief's "Promises" row, drawn from the candidate contract's views:

- six distinct fixed cards, each with its exact term, recipient, target and deadline;
- offer, accept and decline, with an explicit Accept and a Decline of equal weight;
- the lifetime quota: one accepted Promise given and one received in the match;
- the four result states (Pending, Fulfilled, Not fulfilled and Condition not met), never shown as proof of lying;
- the ledger of a seat's two Promises, and the Actions tray entry.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted):
  - `PlanetPromise`;
  - the commands `OFFER_PROMISE`, `ACCEPT_PROMISE` and `DECLINE_PROMISE`;
  - `offers[].promiseTargetSeatIds`, `promises[]` and `promiseQuota`.
- **Rules read:**
  - successor `game-design.md` ("Promises and windows");
  - `owner-decisions.md` P04, P16, P23, P24 and P25, and the examples under them;
  - `rules-contracts.md` (Promise records and quotas);
  - `implementation.md`;
  - `motion-requirements.md` (Promises);
  - `designer-production-brief.md` (the Promises row; Promises survive Sync).
- **Base:** stacked on library group 3 (#177).
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/promises/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=composer|inbox|ledger|others|motion`).
- **No film or video:** Promises are pair-private and play only short motions on the pair's own phones, so this group adds nothing to the cinematic stage, gallery or exports.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Six types: Captain Support, Officer Selection, Jail Vote, No Jail Vote, Meet in A, Meet in B (game design) | Six cards, each with its own picture and silhouette, so no kind depends on a colour: a ballot with a star, the office's shield, a barred window with a ballot going in, the same window refused, an arched door and a square door |
| Exact terms; the recipient must accept them explicitly during permitted private talk (game design; motion requirements) | The composer exists only while `OFFER_PROMISE` is offered. The full card (term, From, To, Jail vote for, Decided) is reviewed before "Offer Promise". The recipient sees the same card with Accept and Decline side by side, the same size and colour, and neither is a default |
| One accepted Promise given and one received per player in the whole match; draft, declined and expired offers use neither slot (game design; P04) | The ledger has two slots, given and received. Every ask says "an offer that is declined or not answered uses nothing". A declined or unanswered offer is a note, never a record |
| No coercion (game design) | Accepting is always an action. The inbox explains what Accept uses before it is pressed. Decline is never smaller, later or greyer than Accept |
| Records are pair-private and survive Sync; the app never broadcasts a Promise (P04, P25) | Cards appear only on the giver's and the recipient's own phones, with "Only the two of you see this Promise." No public cue, sound or vibration |
| Actual ballots count, not the outcome or the admission (game design; P16; P23) | Results name the ballot and add "Who won does not count" or "Whether Player 5, Eli was jailed does not count" |
| Captain Support: every ballot of the specified election in which the recipient is a candidate; never a candidate gives Condition not met (P23) | The term says "in every ballot … in which Player 3, Cleo is a candidate". Its Condition not met reads "… was not a candidate in that election" |
| Officer Selection is conditional on the giver winning the specified election (game design) | "… will appoint you as Officer if they win the next Captain election". Its Condition not met reads "… was not elected Captain in that election" |
| A meeting is evaluated at voting start after Sync; same-round Promises finalize at their opportunity in that round; election Promises may wait for their election; a speculative scene never decides (P04; P24) | Each card's Decided line names its opportunity. The result appears only when the server's status changes, and its stamp plays once (R6) |
| An absent opportunity gives Condition not met; one that occurs but is prevented gives Not fulfilled; failure is not proof of lying (P24) | Not fulfilled is a plain grey seal with a bar (no red, no cross) and reads "This records what happened, not why, and it is not proof of a lie." No word says lie, betray or broken, as a test holds |

## State maps (from `states.mjs`)

Every state is a pure function of the seat's own view and of the client's own command memory. The memory holds a command still pending, a refusal with its phase, and the draft picked on this phone. `offers[]` is the only authority on what may be sent; `promises[]` is the only record.

### The giver's composer: `composerState(view, { pending, rejected, draft })`

| State | When | Drawn |
| --- | --- | --- |
| `closed` | no `OFFER_PROMISE` offered (outside permitted private talk) | "Promises are offered and answered during private talk." and the quota line |
| `choose` | offered, no complete draft | the ask ("Pick a Promise to offer Player 3, Cleo. It is made only if Player 3, Cleo accepts it."), the six cards (title, picture, one line each) and the quota line. With several recipients in the offer, the ask is "Pick who to offer it to." |
| `target` | Jail Vote picked, no target from `promiseTargetSeatIds` yet | the offer's targets as buttons of the same weight, and Back |
| `review` | a complete draft | "Offer this Promise to Player 3, Cleo?", the full card, Offer Promise and Back |
| `sending` | `OFFER_PROMISE` sent, no receipt | SENDING, the envelope |
| `waiting` | this seat's offer awaits its answer (`offerStatus: offered`) | OFFERED, the envelope, "Offered to Player 3, Cleo. Waiting for their answer." and the card |
| `refused` | refused in this phase | "The server did not accept the offer. Nothing was used." |
| `given` | this seat's one given Promise is accepted | "You have given your one Promise in this match." |

A declined or unanswered offer of this round adds a note under `choose` or `closed` ("Player 3, Cleo declined your offer. Nothing was used."). The note lasts until a later offer exists.

### The recipient's inbox: `inboxState(view, { pending })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | no offer awaits this seat's answer | nothing, or the note of an offer declined or unanswered this round |
| `incoming` | an offer awaits, and both `ACCEPT_PROMISE` and `DECLINE_PROMISE` are offered | "Player 8, Hana offers you a Promise.", the card, "Accepting uses your one received Promise in the match. Declining uses nothing.", then Accept and Decline |
| `decline-only` | only `DECLINE_PROMISE` is offered (this seat's received slot is used) | the card, the reason, and Decline |
| `answering` | an answer sent, no receipt | SENDING and the card |
| `locked` | neither is offered (the talk has closed; the server expires the offer) | "This offer can no longer be answered." and the card |

### The ledger: `ledger(view)` and `quota(view)`

The ledger holds this seat's accepted Promise given and accepted Promise received, each a card with its seal and result words.

The slots are read from the accepted records: a slot is used only by an accepted Promise. `promiseQuota` is never read, because its booleans have no stated sense (R13). A test holds the state maps unchanged whatever it holds.

### What a view brings once: `changes(previous, view)`

`changes()` compares the view with the previous one this screen drew, and never with nothing, so a reconnect draws everything at rest. It returns four lists:
- `arrived`: offers newly waiting for this seat's answer;
- `accepted`: Promises newly accepted;
- `declined`: offers newly declined or not answered;
- `results`: Promises whose status moved from Pending to a result.

A Promise accepted and decided in the same view plays the accept only.

## Words (`copy.mjs`, proposals)

The term, as each side reads it (a giver's phone; a recipient's phone):

| Card | Term |
| --- | --- |
| Captain Support | "You will vote for Player 3, Cleo in every ballot of the next Captain election in which Player 3, Cleo is a candidate." / "Player 8, Hana will vote for you in every ballot of the next Captain election in which you are a candidate." |
| Officer Selection | "You will appoint Player 3, Cleo as Officer if you win the next Captain election." / "Player 8, Hana will appoint you as Officer if they win the next Captain election." |
| Jail Vote | "You will vote to jail Player 5, Eli in Round 4's Jail vote." |
| No Jail Vote (R13) | "You will not vote to jail Player 3, Cleo in Round 4's Jail vote." |
| Meet in A / B (R13) | "You will be in Room A when Round 4's voting begins." |

Each card's Decided line names its opportunity:
- **Captain Support:** "By the next Captain election, runoffs included."
- **Officer Selection:** "By the next Captain election and its Officer appointment."
- **Jail Vote and No Jail Vote:** "When Round 4's Jail vote closes."
- **Meetings:** "When Round 4's voting begins, after Sync."

Results:
- **Pending:** "Pending: not decided yet."
- **Fulfilled:** specific to the kind, naming the ballot or the place and never the outcome.
- **Not fulfilled:** "Not fulfilled. This records what happened, not why, and it is not proof of a lie."
- **Condition not met:** for Captain Support, the recipient was not a candidate. For Officer Selection, the giver was not elected Captain. For the others, "the opportunity it named did not happen."

## Assets

`design/library/promises/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `promises.art.css` (`--pr-asset-<name>`), drawn only behind `[data-art~="promises"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `pr-band.svg` | 320×56 | `57056855858bc48c…` | the card's header band (stretches to the band) |
| `pr-envelope.svg` | 64×64 | `d70449cedea6b288…` | the offer in transit (sending, waiting, arriving) |
| `pr-icon-promise.svg` | 48×48 | `6b8eda45e400ae4a…` | the Actions tray mark |
| `pr-kind-captain-support.svg` | 64×64 | `bcb272b142ee6f66…` | Captain Support: a ballot with a star |
| `pr-kind-officer-selection.svg` | 64×64 | `9d587a113353d42a…` | Officer Selection: the office's shield |
| `pr-kind-jail-vote.svg` | 64×64 | `202e9c5023612877…` | Jail Vote: the barred window, a ballot going in |
| `pr-kind-no-jail-vote.svg` | 64×64 | `b75e6a3d1318995c…` | No Jail Vote: the barred window refused |
| `pr-kind-meet-a.svg` | 64×64 | `5de9dd2e0cfae5c1…` | Meet in A: an arched door (letter: page text) |
| `pr-kind-meet-b.svg` | 64×64 | `7d0eecd729311465…` | Meet in B: a square door (letter: page text) |
| `pr-seal-pending.svg` | 64×64 | `f4a8728fc77dbcdf…` | Pending: an amber ring, an hourglass |
| `pr-seal-fulfilled.svg` | 64×64 | `19f897520d500049…` | Fulfilled: a green seal, a check |
| `pr-seal-not-fulfilled.svg` | 64×64 | `456ecd3e6e283177…` | Not fulfilled: a grey seal, a bar |
| `pr-seal-condition-not-met.svg` | 64×64 | `b0d70afd20691134…` | Condition not met: a dashed, empty ring |
| `promises.art.css` | 10,716 bytes | `2c10c7d93df13543…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **Palette:** the dossier's ink, paper and caption yellow, the console navy and steel, a plate grey, amber for Pending and green for Fulfilled. A test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
- **Seals:** the four differ in shape as well as colour: an open ring with an hourglass, a check, a bar, and a dashed empty ring.
- **Pictures:** no picture holds a word, name or number. The room letters on the doors are page text at `DOOR_PLATE` (`platePercent()`).

## Mounting

- **Where:**
  - The composer and the inbox mount inside the private-talk sheet, on the pair's own phones only, concealed on window blur like every private sheet.
  - The ledger lives in the seat's private sheet, behind the tray entry "Promises · One to give and one to receive".
  - No other seat, the display and no host view gets any of it.
- **The card:**
  - A box of the dossier's paper with an ink edge and the band on top, holding the kind's picture and its title.
  - Below the band: the term, a field list (From, To, Jail vote for, Decided) and, once accepted, the status row (its seal and the result's words).
  - The pictures beside words (icons, seals, envelope) grow with the reader's text size.
  - The band stretches to its box. At 200% text the fields stack, each value under its name.
- **The chooser:** six tiles of one frame and weight, each with its picture, title and one line, in one column on narrow sheets. No tile is preselected and none is drawn apart.
- **Buttons:**
  - Accept and Decline share a row, size and colour; the dossier's first-button yellow is outranked, so neither is suggested.
  - Offer Promise is the composer's primary button: it is the giver's own action.
- **Accessible names:** each card is an `article` named with its kind, and its fields are a definition list. A room letter on a door is part of that door's picture, and the title carries it in words.

## Motion (`motion.mjs`)

Each motion plays once, from the moment its cause first arrives in a view this screen has already drawn (`changes()`). It plays on the pair's two phones only. It never plays while a command is pending, after a refusal, or on a reconnect.

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `offer` | 720 ms | on the giver's accepted receipt: the card folds up into the envelope 0–360; the envelope shows 240–560 and settles 520–720 | fades, 160 ms |
| `arrive` | 760 ms | when an offer to this seat first appears: the envelope drops in 0–300 and opens 260–440; the card rises out 380–760 | fades, 160 ms |
| `accept` | 560 ms | when first seen accepted (both phones): the Pending seal presses into the status row 0–360; an ink ring spreads and fades 300–560 | fades, 160 ms |
| `decline` | 600 ms | when first seen declined or not answered (both phones): the card dims and tips back at most 3° 0–420; DECLINED or NOT ANSWERED lands 300–600 | fades, 160 ms |
| `result` | 720 ms | when first seen with a result, as that Promise's own opportunity closes (R6): the Pending seal turns edge-on 0–240 and the result's seal turns face-on in its place 240–480; its stamp lands 420–720 | fades, 160 ms |

There is no shake, flash or particle.

## Sound and vibration

None, for any state. A Promise is pair-private, and a sound would tell the table that one was offered, made or decided.

## Privacy-safe preload

`promises.art.css` (10.7 KB) loads whole on every player phone with the ability art, whatever the seat's role or Promises. Its arrival tells nobody who has one.

## Contract requests

- **R13** (new, Integration). A card must state exact terms, but three terms and one field have no stated sense:
  - **(a) No Jail Vote:** it has no target. Does it rule out voting to jail the recipient, or any Jail ballot at all? The cards read "not against the recipient".
  - **(b) Meet in A and Meet in B:** whose place decides at voting start, the giver's alone or both players'? The cards read the giver's.
  - **(c) Election names:** `electionId` is opaque. Add the election's round so a card can name "Round 5's Captain election" rather than "the next Captain election".
  - **(d) `promiseQuota`:** does `true` mean used, or open? Until defined, the ledger reads the slots from the accepted records.
- **R6** (existing, corrected after the owner's review of 6 November 2026): each Promise is evaluated at its own opportunity, not all at voting start. A meeting is decided when its round's voting begins after Sync. A Jail Vote or No Jail Vote is decided when its round's Jail vote closes. Captain Support is decided at the specified election, runoffs included. Officer Selection is decided at that election and its Officer appointment. Each status change must arrive with the view revision that closes its own opportunity, so the result plays once, then.

Both are in the motion bible's request table (`cinematic-catalogue-0.5.0`), whose Promises entry now points here.

## Checks

- `node --test packages/design-tokens/test/library-promises.test.mjs`, 9 tests:
  - records pair-private, one given and one received at most; declined and unanswered offers never records or slots; `promiseQuota` never read;
  - the composer: offers as the authority, a Jail Vote target only from the offer, the exact draft reviewed, the given slot ending the composer, notes for unaccepted offers;
  - the inbox: Accept only with both answers offered, decline-only, locked;
  - `changes()`: nothing on a reconnect, arrivals only for this seat, a result only from Pending;
  - the words: every kind and result from all four sides in grammar; no lie, betrayal, broken word or public claim; ballots, not outcomes;
  - the art: one palette off every faction accent, six distinct kind pictures, four distinct seals, Not fulfilled grey with a bar, no words or links;
  - generated-asset drift;
  - motion bounds, reduced as fades without movement, the decline's tilt at most 3°;
  - the review report (each capture once, every hash the file's).
- `node design/tools/library-assets.mjs --check`: the generated files are current (all four groups).
- `node design/tools/library-capture.mjs --group promises`: 165 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and the four state sections at 200% text (32 px default text size, phone-width viewport), with a contact sheet each.
  - Every motion as six frames, full and reduced.
  - Measured: no sideways overflow, every sheet exactly its phone width, game buttons at least 44 px, no page error, and at 200% no visible sheet text under 24 px.

Not tested: real phones, screen readers, the runtime itself (no Frontend integration yet), the contract's adopted revision, and how the private-talk sheet places the composer beside the conversation (S2 and pilot 3).
