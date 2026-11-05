# Library group 3: Hospital panel

Designer delivery, 5 November 2026. This group covers the patient-private code console: the Hospital panel's part of the brief's "Hospital panel and death" row. It draws from the candidate contract's views:

- the console on a living Hospital patient's own phone, whatever their secret role;
- an exact state map, including the pending reservation and the wrong, exhausted and no-effect feedback the brief asks for;
- the medical deadline in words, matching the berth's rescue tag;
- the Actions tray entry.

The flatline and shutdown (S10) and the critical loop (S9) already exist (`design/board-v2/films/medical.mjs`) and are unchanged.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted).
- **Rules read:**
  - successor `game-design.md` ("Doctor and panel");
  - `owner-decisions.md` P21 and P22, and the round order;
  - `rules-contracts.md` (healing inventory, patient panel attempt);
  - `implementation.md` ("no empty-pool code oracle");
  - `motion-requirements.md` (Hospital);
  - `designer-production-brief.md` (Hospital rows).
- **Base:** stacked on library group 2 (#176). The rescue tag's cross is the medical module's (`design/board-v2/fx/medical.mjs`, `rescueCrossSvg`), unchanged.
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/hospital-panel/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=patient|others|motion`).
- **No film or video:** the console is private and plays only short motions on the patient's own phone, so this group adds nothing to the cinematic stage, gallery or exports.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Each living Hospital patient has one code attempt in the whole match, spent globally (game design; rules contracts) | The console only for a living seat placed in the Hospital. The ask names the one attempt, and so does the confirmation before sending. After that the console says "used" for the rest of the match |
| The code is the Doctor's original player number (game design) | A keypad of player numbers only (1 to 7, 8 or 9), never faces or names. Every key is the same picture, so none is suggested |
| A correct number reserves one of the two shared injections and queues self-Rescue at this round's Rescue stage. Registering is not a heal (game design; brief; motion requirements) | Accepted: "registered", never "healed". With R12: "reserved", plus "Until then nothing is healed: an attack before the Rescue stage still counts." |
| A wrong number spends only the attempt (game design) | With R12: "Not the Doctor's number. Your one attempt is used; no injection was spent." A strike across the blank screen, with no shake |
| With no injection available, the request is refused before the number is checked: nothing spent, no correctness revealed (P21; "no empty-pool code oracle") | Only with R12's explicit reason: "The panel has no injection left. Your number was not checked, and your attempt is not used." The words are the same for every number. Without the reason: "The server did not accept the number. Nothing was used." |
| Submissions close when the turns and private talk finish, before Sync and voting (P22) | The keypad exists only while `PANEL_CODE` is offered. Otherwise an unused attempt reads "The panel takes a number during the turns of a round you spend in the Hospital." |
| Attacks resolve before Rescue; no revival; no refund on no effect (game design) | With R12: "treated", "no effect" ("used at the Rescue stage, without effect"), or "not kept" (the Blackhole's Sync did not select it). Nothing is drawn for an eliminated seat |
| The injection count belongs to the Doctor; panel feedback is patient-private (contract; motion requirements) | `injectionsRemaining` is never read, even on the Doctor's own phone, so the Doctor as a patient sees what anyone sees. No sound or vibration |

## State map (from `states.mjs`)

`panelState(view, { pending, accepted, rejected, picked })` is a pure function of the seat's own view and the client's own command memory:

- `pending`: a command sent, with no receipt yet;
- `accepted`: the phase in which this client saw `PANEL_CODE` accepted;
- `rejected`: the phase and code of a refusal;
- `picked`: the number chosen on this phone.

`offers[]` is the only authority on whether a number may be sent.

| State | When | Drawn |
| --- | --- | --- |
| `none` | not a living seat placed in the Hospital | nothing |
| `available` | `PANEL_CODE` offered, no number picked | the console (screen "– –", lamp ready), the ask, the keypad |
| `choosing` | offered, a number from the keypad picked on this phone | the number on the screen and its key lit; "Send 6? This is your one attempt in the match."; Send number, Clear |
| `sending` | `PANEL_CODE` sent, no receipt | SENDING; the number on the screen; lamp busy |
| `registered` | accepted in this phase, and the view carries no R12 result | REGISTERED; the screen blank; "Your number is registered. Your one attempt is used." and "The server has not told this phone whether the number was right." |
| `reserved` | R12 `result: RESERVED, status: QUEUED` | RESERVED; the vial seated and lit; lamp ok; the reserved words and the "nothing is healed" note |
| `wrong` | R12 `result: WRONG` | WRONG NUMBER; the strike; lamp warn |
| `treated` | R12 `status: TREATED` | TREATED; the spent vial |
| `no-effect` | R12 `status: NO_EFFECT` | NO EFFECT; the spent vial |
| `discarded` | R12 `status: DISCARDED` | NOT KEPT |
| `exhausted` | refused in this phase with R12's `NO_INJECTION` | no stamp; the exhausted words |
| `refused` | refused in this phase with any other code (`NOT_ALLOWED`, `PHASE_CLOSED`) | no stamp; "The server did not accept the number. Nothing was used." |
| `used` | the attempt was spent earlier, and the view says no more | USED; "You have used your one panel attempt." |
| `closed` | unused, with no offer now (outside the turns, P22) | the closed words |

Every state but `none` carries the deadline line and "Only you see this panel."

Two rules keep the console from saying more than the view:

- **Results need R12.** No state reads correctness from anything but R12's `abilities.panelRequest`, and "no injection" comes from nothing but R12's `NO_INJECTION`. Without them, the console says registered, used or refused, and never guesses.
- **The number leaves the screen.** It shows only while it is chosen or being sent, then disappears, so a glance at the phone later shows no number.

**Placement after Rescue (R3).** The `treated` and `no-effect` states reach the console only while the healed seat is still placed in the Hospital, which is the open half of R3. The review page's two cards for them say so. If a rescued patient goes back to a room or the Jail, the console is gone and the board's rescue film (S5) is the outcome.

### The deadline line: `deadline(view)`

The deadline comes from the seat's own `medical { rescueDueAfterRound, rescueOpportunity }`, the same facts as the berth's rescue tag. It uses the badge wording from the 13 October review:

- "Rescue by the end of Round 5." (`NEXT_NORMAL_ROUND`)
- "This is the last round for Rescue (Round 4)." (`CURRENT_NORMAL_ROUND`)
- "No rescue round is left." (`CLOSED`)

The line has the tag's cross beside it. It is never a countdown.

## Assets

`design/library/hospital-panel/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `hospital-panel.art.css` (`--hp-asset-<name>`), drawn only behind `[data-art~="hospital-panel"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `hp-console.svg` | 320×150 | `2d7c64f660a30512…` | patient-private: the console (screen, cradle, lamp socket, cross) |
| `hp-vial-reserved.svg` | 320×150 | `e234c3bdf7321e5b…` | R12 reserved: the vial seated and lit in the cradle |
| `hp-vial-spent.svg` | 320×150 | `7a9df85d028ff5b9…` | R12 treated or no effect: the spent vial |
| `hp-strike.svg` | 320×150 | `17c1495a3ebc264a…` | R12 wrong: the strike across the screen |
| `hp-scan.svg` | 320×150 | `ab6dd5f1a6af3268…` | the register motion's scan bar |
| `hp-key-plain.svg` | 56×58 | `57dedc1d816775cd…` | every key cap (one picture for every number) |
| `hp-key-picked.svg` | 56×58 | `c06592e1806442c2…` | the key picked on this phone |
| `hp-icon-panel.svg` | 48×48 | `df0c22f84b6bd534…` | the Actions tray mark |
| `hp-lamp-ready.svg` | 320×150 | `3d5664b133b8fbf4…` | lamp: a number may be sent |
| `hp-lamp-busy.svg` | 320×150 | `4aa96aeb65c311a1…` | lamp: sending, or registered (result unknown) |
| `hp-lamp-ok.svg` | 320×150 | `2b8e16b14813b393…` | lamp: R12 reserved or treated |
| `hp-lamp-warn.svg` | 320×150 | `11eb1a079d1a131e…` | lamp: R12 wrong |
| `hp-lamp-off.svg` | 320×150 | `f85a72bfc22ca1c5…` | lamp: no number taken now |
| `hospital-panel.art.css` | 10,056 bytes | `fb5b43380259d397…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **Palette:** the medical module's (`MEDICAL`) plus ink, paper, a plate grey and a shade. A test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
- **Lamp:** its hue only repeats what the stamp and the words already say.
- **Pictures:** no picture holds a word or a number.
- **Keypad digits:** page text, in `KEY_DIGIT` on `KEY_FACE`. Paper on the steel cap is 7.5:1 and ink on the lit cap is 11.1:1, held by a test.

## Mounting

- **Where:**
  - The console mounts only inside the patient's own open private sheet, concealed on window blur like every private sheet.
  - The tray entry ("Hospital panel · One attempt in the match") shows only while the seat is a living Hospital patient.
  - No other seat, the display and no host view gets the console.
- **Layers:** the console (`hp-console`) at `aspect-ratio: 320 / 150`, at most 360 px wide. Over it, at the same box:
  - the lamp of the state;
  - the vial (reserved, or spent);
  - the strike (wrong);
  - during the register motion, the scan.
- **The screen:** the digits are page text at `PARTS.screen` (given as percentages by `partPercent('screen')`) and are aria-hidden. The console is `role="img"`, named with its lamp, the reserved vial, and the number while it is chosen or sent.
- **Keypad:** a group named "Player numbers", three columns, each key at least 52 px high.
  - Every key uses `hp-key-plain`. The picked key uses `hp-key-picked` and `aria-pressed="true"`.
  - The keypad's rules outrank the dossier's first-button yellow, and no rule singles out a key by its position.
- **Buttons:** "Send number" is the dossier's primary button; "Clear" returns to `available`.
- **Sending:** sending is the only command. The client keeps the picked number only until the receipt.
- **Large text:** every word follows the reader's text size. At 200% the words wrap, the keys keep three columns, and nothing is clipped or wider than the phone.

## Motion (`motion.mjs`)

Each motion plays once, from the moment its cause arrives, and never while a command is pending or after a refusal. A reconnect draws the state at rest. When the view brings R12's result with the receipt, the result plays alone, without the scan first.

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `press` | 180 ms | local feedback for a key picked on this phone (no server fact): the cap presses in and lights 0–120; the digit lands on the screen 40–180 | the digit fades in, 160 ms |
| `register` | 600 ms | on the accepted receipt: the scan crosses the screen 0–480; the number fades out 300–480; REGISTERED 420–600 | fades, 160 ms |
| `reserve` | 820 ms | when the view first carries R12 RESERVED: the vial rises into the cradle 0–420 and lights 380–700; RESERVED 560–820 | fades, the vial seated, 160 ms |
| `wrong` | 560 ms | when the view first carries R12 WRONG: the strike draws 0–260, no shake; WRONG NUMBER 260–560 | fades, the strike whole, 160 ms |

## Sound and vibration

There is no sound and no vibration for any state. The panel is private, and a sound would tell the ward that a number was tried. Results stay silent too, so nothing distinguishes right from wrong across the table.

## Words (`copy.mjs`, proposals)

- **The ask:** "Enter the Doctor's player number. You have one attempt in the match. A correct number reserves a shared injection for you; you are treated at this round's Rescue stage."
- **Before sending:** "Send 6? This is your one attempt in the match."
- **Registered (no R12):** "Your number is registered. Your one attempt is used." and "The server has not told this phone whether the number was right."
- **Reserved:** "Correct. A shared injection is reserved for you. You are treated at the end of this round, at the Rescue stage." and "Until then nothing is healed: an attack before the Rescue stage still counts."
- **Wrong:** "Not the Doctor's number. Your one attempt is used; no injection was spent."
- **Exhausted:** "The panel has no injection left. Your number was not checked, and your attempt is not used."
- **Not kept:** "The Blackhole did not keep your request. Your one attempt stays used."

No word gives an injection count or says who the Doctor is. Registering is never called a heal. Only the exhausted refusal, shown only with R12's explicit reason, mentions the empty pool.

## Privacy-safe preload

`hospital-panel.art.css` (10.1 KB) loads whole on every player phone with the ability art, whatever the seat's role, health or place. Its arrival tells nobody who is a patient, and the result pictures arrive everywhere whether or not anyone has a result.

## Contract requests

- **R12** (new, Integration, patient-private):
  - **The gap:** an accepted `PANEL_CODE` is only `REGISTERED`, and `abilities.panelAttemptSpent` turns true for a right and a wrong number alike. So the view never says whether an injection was reserved, treated, spent without effect, or not kept at Sync. No rejection code says that no injection was available.
  - **Ask:** the patient's own `abilities.panelRequest { round, result: RESERVED | WRONG, status: QUEUED | TREATED | NO_EFFECT | DISCARDED }`, never the Doctor's count. Add a rejection code `NO_INJECTION` that is the same whatever number was sent.
  - **If the owner prefers** the patient not to learn the result before the Rescue stage, the server sends no result and the console keeps "registered".
- **R3** (existing): where a rescued patient is placed decides whether `treated` and `no-effect` are ever drawn on the console (see the state map).

Both are in the motion bible's request table (`cinematic-catalogue-0.4.0`), whose "Hospital panel and death" entry now points here.

## Checks

- `node --test packages/design-tokens/test/library-hospital-panel.test.mjs`, 11 tests:
  - the console only for a living Hospital patient, the offer deciding the keypad, the keypad's numbers;
  - no result without R12, and each R12 result and fate;
  - "exhausted" only from `NO_INJECTION`, the same for every number;
  - `injectionsRemaining` and the role never read: the Doctor as a patient sees what anyone sees;
  - the deadline line;
  - words without a count or a heal, the empty pool named only by the explicit refusal;
  - palette distance from the faction accents, and no words or links in pictures;
  - key digit contrast and the page's key colours, with no key singled out by position;
  - generated-asset drift;
  - motion bounds and reduced fades;
  - the review report (each capture once, every hash the file's).
- `node design/tools/library-assets.mjs --check`: the generated files are current (all three groups).
- `node design/tools/library-capture.mjs --group hospital-panel`: 109 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and the state sections at 200% text (32 px default text size, phone-width viewport), with one contact sheet per 200% section.
  - Every motion as six frames, full and reduced.
  - Measured: no sideways overflow, every sheet exactly its phone width, game buttons at least 44 px, no page error, and at 200% no visible sheet text under 24 px.

Not tested: real phones, screen readers, the runtime itself (no Frontend integration yet), and the contract's adopted revision.
