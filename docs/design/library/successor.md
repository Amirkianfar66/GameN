# Library group 8: the successor sweep

Designer delivery, 5 November 2026. This group closes the motion bible's last successor gaps, each a small piece the earlier groups did not draw:

- the nine current roles under current names, with a held device for each, and the action overlay's successor entries;
- the lobby's compact host and join states at 320 × 568, from the candidate session snapshot;
- the Round 3 Supply's private receipt;
- the Hospital admission walk.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate at `79418e7` (not adopted):
  - `packages/contracts/src/planet-service.ts`: the session snapshot (`status`, `roomCode`, `playerCount`, `isHost`, `selfSeatId`, `members[]`, `pendingAdmissions[]`), the operations `create`, `requestAdmission`, `approveAdmission`, `setBots` and `beginSetup`, and `PlanetServiceFailure`'s codes;
  - `packages/contracts/src/planet-game.ts`: `self.ordinaryWeapons`, the `SUPPLY` offer, and the placement events.
- **Rules read:**
  - `designer-production-brief.md`: the current roles ("Doctor replaces Cracker and Engineer replaces Soldier Blue in current text … There is no secret Officer role"); the rows "Lobby and identity", "Turn and contextual action", "Ordinary shot and injury" and "Supplier and weapons";
  - `game-design.md` (the roster); `owner-decisions.md` (the round order: "Rescue, Round 3 Supply, medical deadlines/placement"; P03, P17);
  - `motion-requirements.md`.
- **Base:** stacked on library group 7.
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/successor/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=roles|lobby|supply|admission|motion`).
- **No film or video.** The receipts and the walk are short motions drawn live from `motion.mjs`.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Current roles only; Doctor replaces Cracker, Engineer replaces Soldier Blue; no secret Officer (brief) | `names.mjs` maps each of the nine roles to the picture that draws it. The Doctor keeps the reviewed injector (`device-cracker`, under its historical id and bytes). The Engineer gets a new device (below). The removed Officer's device and the Showdown's icon are listed as superseded and never drawn |
| Successor actions in the action overlay (brief, "Turn and contextual action") | Thirteen entries: each command, its current label ("Hack Spaceship", "Engineer capture", "Appoint an Officer", "Doctor's Rescue" …) and its mark, from library groups 1 to 6 or the ability kit's unchanged icon |
| Compact host/join states; 30-second character choice; randomized initial placement, no room picker (brief) | Every lobby state at 320 × 568 and at 200% text (below). The setup line says "Starting rooms are drawn at random." No word offers a room |
| The Supplier keeps the Round 3 opportunity; the grant reaches each recipient at Round 3's Supply stage, after the Rescue (round order; P17) | The Supplier's phone: "Registered. Deliveries happen at Round 3's Supply stage, after the Rescue. Nobody else sees them." Each recipient's own phone, once, from R15's delivery marker (never from the weapon count alone): a sealed crate and "You received one ordinary weapon. You can use it from Round 4." |
| Never publicly identify the Supplier, recipients or a transfer (brief); grants follow the selected reality (P03); "Restored weapons after Blackhole Sync must not be presented as a new Supply delivery" (the owner, 6 November 2026) | A weapon count that grows without R15's marker (a Blackhole Sync's restore, or any view before R15 exists) is drawn at rest: "Ordinary weapons: 1.", no crate, no stamp, no "received". Nothing is drawn on the board or the display. The Supplier's receipt never says the delivery happened, because the Sync may keep another reality. A recipient is never told who sent it |
| Authoritative Hospital admission; no hidden shooter or trajectory (brief) | When the server's placement newly puts a seat in the Hospital and the previous placement was a known room slot, the figure leaves that slot with an injured gait, crosses between the board's panels, walks to its berth and lies down. Without the origin it is drawn at the berth at once (R4). No shooter, line or direction from a cause is ever drawn |

## State maps (from `states.mjs` and `names.mjs`)

Every state reads the server's snapshot or view and the client's own memory; nothing decides a rule.

### `lobbyState(snapshot, { requested, acknowledged, error, kind, code })`

| State | When | Drawn |
| --- | --- | --- |
| `start` | no snapshot, nothing sent | "Host a match" (primary), "Join", the room code field (six characters, upper case), "Join as a player, or as the shared display." |
| `requesting` | `requestAdmission` sent, no answer | SENDING; "Asking the host to let you in…" |
| `waiting` | `requestAdmission` answered ok, not approved; or a snapshot with `selfSeatId` null for a player | the typed code on its plate; "The host has your request. You join when they approve it." (R14) |
| `host` | `isHost` | the code, "Share this code…", "3 of 7 seats filled · 0 bots", the members, each pending request with Approve, the bot stepper (− / +, 44 px), the hint, and Begin only when every seat is filled |
| `joined` | a member with a seat | the code, the seat count, the members, "You are in. The host begins the match." |
| `display` | the shared display (`selfSeatId` null, kind `display`) | the code, the seat count, the members, "This screen shows the shared board when the match begins." |
| `refused` | a failure code | one sentence per code (`NOT_FOUND`, `INVALID_REQUEST`, `FORBIDDEN`, `NOT_ALLOWED`, `RATE_LIMITED`, `UNAVAILABLE`) and a general fallback; Join again |
| `setup` | `status` choosing or reading | the existing character selection and role card (slice 8) take over |
| `none` | `running`, `finished`, `aborted` | nothing from the lobby |

- **The room code** is page text over the plate (`sw-code-plate`), one slot per character. At 200% text the code wraps to two rows of three, and each character gets its own slot instead.
- **Names:** members are "Player N, Name", never a role or side.

### `supplyReceipt(previous, view, { played })`

Returns `{ eventId, round, total }` only for a delivery marker (R15's proposed `SUPPLY_RECEIVED`, `SUPPLY_EVENT.kind`: audience the recipient, `seatIds` [recipient], `actorSeatId` null) that this screen's previous view did not carry and this screen has not played; else `null`. It never reads growth: a Blackhole Sync's restore (P03), a weapon used, or a count that changes without the marker is drawn at rest with `inventoryAtRest(view)` and the words `inventory(n)` ("Ordinary weapons: 1."). A reconnect (no previous view) draws the inventory at rest.

**Missing field:** the protocol 3 candidate has no such event, so today no receipt is drawn at all, which is the safe fallback. The review page shows the receipt as it will play once R15 exists, and the two at-rest cases (a Sync's restore; growth without the marker).

### `admissionPlan(previousSeat, seat)`

| Plan | When |
| --- | --- |
| `walk` | the seat is newly in the Hospital and its previous finalized placement was a slot in Room A, Room B or the Command Room: `{ from, to, end: 2400 }` |
| `snap` | newly in the Hospital without a known room slot (a reconnect without the previous snapshot: R4) |
| `none` | not an admission (already in the Hospital, or not moved there) |

### `names.mjs`

- `CURRENT_ROLES`, `ROLE_DEVICES` (each role's device and the custom property that draws it), `SUPERSEDED`, `OBSOLETE_NAMES`, `OVERLAY`, and `usesCurrentNames(text)`.
- A test runs `usesCurrentNames` over every library group's words: no group says Cracker, Soldier Blue, Showdown or Final Zone.

## Assets

`design/library/successor/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `successor.art.css` (`--sw-asset-<name>`), drawn only behind `[data-art~="successor"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `sw-device-engineer.svg` | 120×140 | `a58fbb9cc2ef2a4f…` | private: the Engineer's held device (role card and sheet) |
| `sw-crate.svg` | 64×64 | `9780e5f6fdca7a28…` | private: the Supply's receipt (each recipient) |
| `sw-code-plate.svg` | 248×64 | `4b353bf5412efa46…` | lobby: the room code's plate |
| `successor.art.css` | 5,081 bytes | `08a57bc05adbdf19…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **The Engineer's device** is drawn in the reviewed devices' exact family. It has the same sleeve, cuff, fist and grip as every `design/exports/roles/device-*.held` export (a test compares the arm's geometry). It uses only the reviewed Blue devices' colours, the Blue roles' private glow included. Its head is library group 1's signal clamp, with the wave and LED lit. It sits where the reviewed devices sit: 74% of the card's width, 9% past its right edge and 10% past its lower edge.
- **The crate and the plate** use the dossier's neutrals; a test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
- **The reviewed devices** are drawn from the reviewed bundle (`--ms-asset-device-<id>-held`); their files keep their historical ids and bytes. The overlay's marks come from each group's own sheet, and from the ability kit's sheet for Final Code, Rescue and Supply.
- **Words:** no picture holds a word.

## Mounting

- **Role card:** the device over the lower right of the character's card, as the reviewed devices are placed. The review page's figure is a labelled stand-in; Frontend uses the character's own art.
- **The overlay:** each entry is a 36 px mark on a paper chip, its label, and (review only) its command and source.
- **The lobby:** one column, no page scroll at 320 × 568 in the default text size. Buttons are at least 44 px. The code field is six characters wide (`size="6"`, `maxlength="6"`, `autocapitalize="characters"`) and never wider than the sheet.
- **The Supply receipt:** a strip in the recipient's own sheet, with "Only you see this."
- **The admission walk:** on the board, using the slot anchors (`design/board-v2/contract/slots.json`) for the origin and the berth. The review page's two panels and tokens are a schematic, labelled so.

## Motion (`motion.mjs`)

Each motion plays once, from the moment its cause first arrives in a view this screen has already drawn, and never on a reconnect.

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `supply` | 520 ms | the recipient's own phone: the crate drops in 0–360 (a small overshoot), its seal tag lights 300–520 | fade, 160 ms |
| `admission` | 2,400 ms | leave the room slot with an injured gait (a slow bob, at most 2.5 px) 0–900; cross between the panels, fading out and in, 900–1200; walk to the berth 1200–2000; lie down 2000–2400 | fade at the berth, 160 ms |
| `seat` | 240 ms | a lobby seat newly filled: its row slides in | fade, 160 ms |

## Sound and vibration

- **The Supply:** none. A sound or buzz would tell the table who received something.
- **The admission:** none of its own. The public injury already has its neutral impact.
- **The lobby:** none.

## Privacy-safe preload

`successor.art.css` (5.1 KB) loads whole on every phone with the ability art, before the first match view, whatever the seat's role. Which art arrives says nothing about who holds it.

## Contract requests

- **R14** (new, Integration): the lobby's join states.
  - **(a)** What can a requester read while its admission is pending?
  - **(b)** No operation declines an admission: what does an unapproved requester receive?
  - **(c)** An admitted display and a pending one both read `selfSeatId` null: add the requester's own standing, or confirm the client's remembered kind decides.
- **R4** (existing): the walk needs the previous finalized placement; without it, the admission snaps.
- **R15** (new, Backend): a recipient-private delivery marker for the Round 3 Supply, so a Blackhole Sync's restored weapons never read as a delivery. Proposed: a player-audience `PlanetEvent` kind `SUPPLY_RECEIVED` (the recipient's audience, `seatIds` [recipient], `actorSeatId` null, round 3, published with the Supply stage's view revision), or an equivalent own-view field. Until it exists, no receipt is drawn.

Both are in the motion bible's request table (`cinematic-catalogue-0.9.0`). Its "Lobby and identity", "Role reveal", "Turn and contextual action", "Ordinary shot and injury" and "Supplier and weapons" entries now point here, with no gap left.

## Checks

- `node --test packages/design-tokens/test/library-successor.test.mjs`, 11 tests:
  - the nine current roles, each with a device the reviewed bundle or this group defines; the removed Officer's device and the Showdown icon never drawn;
  - the overlay: every successor command, a current label, a mark its own sheet defines;
  - current names across every library group's words;
  - the lobby: every state from the snapshot and the request's answer, Begin only when every seat is filled;
  - the lobby's words: every failure code worded, a fallback, no room picker, no side named;
  - the Supply: a receipt only from R15's marker addressed to this seat, once, never on a reconnect, never from growth alone (a Blackhole Sync's restore is no delivery), never naming the sender, never claiming delivery on the Supplier's phone;
  - the admission: a walk only from a known room slot, a snap without one, no shooter in the words;
  - the art: the Engineer's device in the reviewed Blue devices' colours and geometry; the crate and plate off every faction accent; no words or links;
  - generated-asset drift;
  - motion bounds, the walk's beats in order, reduced fades;
  - the review report.
- `node design/tools/library-assets.mjs --check`: the generated files are current (all eight groups).
- `node design/tools/library-capture.mjs --group successor`: 93 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and the four state sections at 200% text, with a contact sheet each.
  - Every motion as six frames, full and reduced.
  - Measured: no sideways overflow, every sheet exactly its phone width, game buttons at least 44 px, no page error, and at 200% no visible sheet text under 24 px.

Not tested: real phones, screen readers, the runtime itself, the contract's adopted revision, and the walk on the real board (the review page draws a schematic).
