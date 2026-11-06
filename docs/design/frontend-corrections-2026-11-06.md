# Frontend handoff: the owner's corrections of 6 November 2026

Designer delivery, 6 November 2026, on the branch `claude/designer-owner-corrections`, stacked on
PR [Amirkianfar66/GameN#183](https://github.com/Amirkianfar66/GameN/pull/183) at `ff7b689`. It turns
the owner's two timing decisions (P27, P28) and six focused corrections into source modules, mounts,
audiences, motion variants and safe fallbacks for Frontend. The owner's words are quoted in
[owner-decisions.md](owner-decisions.md).

- **Contract:** the protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not
  adopted). Two fields these corrections need are missing (R15, R16), and one phase keeps a name that
  no longer fits (`NAV_TIE`). Each has a safe fallback below. Backend owns those fields.
- **Ownership:** Backend owns gameplay and contract fields. Frontend owns the runtime. The modules
  named here are pure, dependency-free reference implementations marked `mothership:dev-only`: port
  their logic into `packages/presentation`, or adopt named files and hashes through Integration.
  Nothing here is a rule or runtime code.
- **No animation pauses the engine.** Nothing below waits for, extends or takes time from a phase.
- **Runtime assets and review videos are different things.** Section 9 lists both. Every file under
  a `review/` folder draws a synthetic fixture (names, seats, outcomes) and must never enter the game.

## 1. At a glance

| # | Correction | Source module | Mount and audience | Full / reduced | Missing field and fallback |
| --- | --- | --- | --- | --- | --- |
| P27 | After an actual Blackhole Sync, a separate six-second presentation stage, then the full 60-second Jail vote | `design/cinematic/lib/visibility.mjs`: `presentationIn()`, `PRESENTATION_STAGES` | Public. The display plays the stage cut over the board, in the stage only. Phones play the board treatment from the stage's start | Stage cut 5200 ms (display); board 2400 ms (phones). Reduced: the still blackhole, 1440 ms, every surface | No phase kind for the stage (R16): every surface plays the board treatment at the Jail vote's start. The vote's `endsAt` is unchanged |
| P28 | From Round 2, the same full 15-second route-setting window at every navigation opportunity; nothing public reveals a tie | `design/library/navigation/states.mjs`: `ROUTE_WINDOW`, `routeWindowEnds()`, `officePanelState()` | Public strip and the Captain's panel: "The course is being set." for the whole window. The eligible Officer's own phone: tie controls only while `CHOOSE_NAV_DIRECTION` is offered | No new motion. No sound or vibration on any office's phone | The window's phase is still `NAV_TIE`: read it as the route window, never as a tie |
| 1 | Windows stay lit for the Blackout's first five seconds; darkness starts at the authoritative preview deadline | `design/library/windows/states.mjs`: `darkSpan()`, `isDark()`, `padState()`, `darkChange()` | Each window's two ends. The shade lowers at `blackout.previewEndsAt` | Shade lowers 420 ms, rises 320 ms. Reduced: 160 ms fades | No `previewEndsAt`, or no clock: dark from the Blackout's start (fail closed) |
| 2 | Weapons restored by a Blackhole Sync are not a Supply delivery | `design/library/successor/states.mjs`: `supplyReceipt()`, `inventoryAtRest()`, `SUPPLY_EVENT` | Private: the recipient's own phone only. Nothing on the board or the display | Crate 520 ms. Reduced: a 160 ms fade | No delivery marker (R15): no receipt at all; the count is drawn at rest |
| 3 | Keypads show player numbers; commands keep canonical ids | `design/library/seats.mjs`; the state maps of groups 1, 3, 4, 6 and 7 | Each picker's own audience (the Hospital keypad stays the patient's) | No motion change | None: the ids are in the contract |
| 4 | The Rescue leaves the player's authoritative figure and press area usable; free returns to A/B, detained to the Jail | `design/cinematic/pilots/hospital-rescue/compose.mjs`: `filmItems()` (`drawPatient`); `film.mjs`: `rescueCinematicFrame()` | Public. The board treatment on every surface, the display included | Full 6200 ms, short 1600 ms, reduced 1760 ms (unchanged) | None |
| 5 | The capsule exit stays on the board; no covering EJECT stage | `visibility.mjs`: `NO_RUNTIME_COVER`; S2's `capsuleFrame()`; S7's `ejectFrame()` | Public, on the board, every surface | Capsule exit 2230 + 300 ms (reduced 400 + 300 ms); S7 7200 ms (reduced 2560 ms). Unchanged | None |
| 6 | The giver-only "Meet in A/B" wording is correct | `design/library/promises/copy.mjs` (words unchanged) | The giver's and the recipient's own sheets | No change | None: Backend and Frontend align to the giver's place |

## 2. P27: the Blackhole's presentation stage

The trigger is the public `BLACKHOLE_SYNCED` event of an actual Sync (`actorSeatId` null). The board
under it is already the selected reality's checkpoint. Play once per event id and never replay on a
reconnect.

```js
import { presentationIn } from '…/design/cinematic/lib/visibility.mjs';
const mode = presentationIn(view.phase.kind, {
  film: 'blackhole',
  stageKind: STAGE_KIND_FROM_BACKEND, // undefined until R16 is answered
  surface: isSharedDisplay ? 'display' : 'phone',
});
// 'stage': the display alone, the 5.2 s stage cut over the board, inside the six-second stage
// 'board': the board treatment, behind the crew, under every press area, label and timer
```

- **In the stage:** the display plays the stage cut from the stage's start. It is 5200 ms and ends
  0.8 s before the vote. Phones play the 2400 ms board treatment from the same moment. Reduced
  motion: the still blackhole in the walls for 1440 ms, with 120 ms fades, on every surface.
- **Then the full 60-second Jail vote.** No film plays into it. Its controls appear at its start.
- **`surface`:** the stage cut belongs to the shared display. `surface: 'phone'` gives `board`, and
  so does a call that names no surface (fail closed).
- **Missing field (R16):** the candidate has no phase kind for the stage. The proposed name is
  `BLACKHOLE_PRESENTATION`, but it is never matched until Backend publishes a name. Until then
  `presentationIn()` never answers `stage`, and every surface plays the board treatment at the Jail
  vote's start. That covers nothing and takes no time.
- **Runtime video:** `blackhole/runtime/space-insert-textless.*` (preferred, with the vector title)
  or `space-insert-titled.*`, 3.63 s, in the stage only, never over the vote. Unchanged (section 9).
- **Source:** `design/cinematic/pilots/blackhole/{film,compose,stage}.mjs`. The comments now describe
  P27; the frames and exports are unchanged.

## 3. P28: the route-setting window

`ROUTE_WINDOW = { kind: 'NAV_TIE', durationMs: 15000, fromRound: 2, decision: 'P28' }`. The window now
runs at every navigation opportunity from Round 2, tie or not, so neither its kind nor its length
tells anyone anything.

- **Every screen except the eligible Officer's:** the strip and the Captain's panel read only
  `phase.kind`. For the whole window they say "The course is being set." Any timer counts to
  `routeWindowEnds(view)`, which is `phase.endsAt` and never earlier.
- **The eligible Officer:** `officePanelState()` returns `tie` only while `CHOOSE_NAV_DIRECTION` is
  offered (a genuine tie). It returns `chosen` after this client's choice is accepted, until the window
  ends; an early choice never ends it. With no tie, the Officer's panel is `setting`, like the Captain's.
- **Never:** read `offers`, `privateNavigation.tieChoice` or a choice for anything public; vary
  words, animation, sound, vibration or timing with a tie; end the window early.
- **Naming:** `NAV_TIE` no longer means a tie. Backend may rename it; change only
  `ROUTE_WINDOW.kind`. R11 (the meaning of `tieChoice` and `confirmation`) stays open.
- **Test:** four worlds (no tie, a tie open, a tie chosen early, a tie unanswered) give one public
  strip and one Captain's panel (`library-navigation.test.mjs`).

## 4. Correction 1: windows lit for five seconds

- `darkSpan(view)` returns `{ from: blackout.previewEndsAt, until: blackout.endsAt, timed: true }` in
  `BLACKOUT`, and null in any other phase. `until` falls back to `phase.endsAt`.
- `isDark(view, now)` needs the server-corrected clock, the one Frontend already uses for phase
  timers. During the five lit seconds every pane keeps its usual state: drawings shown, the pad as
  before. From `previewEndsAt` to the Blackout's end, the shade covers every pane and no pad is drawn.
- `padState(view, windowId, { now, … })` returns `dark` only inside that span.
- `darkChange(previous, view, { previousNow, now })` returns `dark` when the clock passes
  `previewEndsAt`, with no new view needed. It returns `light` when the Blackout ends. A screen with no
  earlier moment (a reconnect, a late join) draws the shade at rest.
- **Motion:** the shade lowers over 0–320 ms, and "Lights out: the Blackout darkens every window until
  the lights return." shows over 240–420 ms. It rises over 320 ms. Reduced: 160 ms fades.
- **Fallback (fail closed):** with no clock, a Blackout reads dark. A Blackout whose view has no
  `previewEndsAt` is dark from the phase's start. A window never shows what the server has not timed
  as lit. The candidate does carry `blackout { windowId, previewEndsAt, endsAt }`, so this is for a
  malformed or older view only.

## 5. Correction 2: Supply versus a Sync's restore

- `supplyReceipt(previous, view, { played })` returns `{ eventId, round, total }` only for a
  `SUPPLY_RECEIVED` event addressed to this seat. The event must have a player audience and
  `seatIds: [self]`, be absent from the previous view, and not be in `played`. Otherwise it returns
  null. It never reads the weapon count. With no previous view (a reconnect) it returns null.
- `inventoryAtRest(view)` covers every other change: a Sync's restore, a weapon used, a reconnect. It
  draws "Ordinary weapons: N." with no crate, no stamp and no "received".
- **The receipt:** a sealed crate and "You received one ordinary weapon. You can use it from Round 4.",
  then "Only you see this." The crate drops in 0–360 ms with a small overshoot, and its seal lights
  300–520 ms. Reduced: a 160 ms fade. It never names the Supplier.
- **Audience:** the recipient's own phone only, never the board or the display. The Supplier's phone
  says only that the command was registered and when deliveries happen. The Sync may keep another
  reality.
- **Missing field (R15):** the candidate's event kinds have no Supply marker. The proposal is a
  player-audience `PlanetEvent` of kind `SUPPLY_RECEIVED` (the recipient's audience, `seatIds`
  [recipient], `actorSeatId` null, round 3, published with the Supply stage's view revision), or an
  equivalent own-view field. Until it exists **no receipt plays at all**. Do not substitute a count
  difference.

## 6. Correction 3: numbers on keys, ids in commands

`design/library/seats.mjs`: `SEAT_IDS`, `isSeatId()`, `seatNumber()`, `seatIdOf()`, `bySeat()` and
`seatKey()`. The table is the reviewed Frontend's own `seatNumber()`
(`packages/presentation/src/model/common.ts`). It sets display order only and implies no adjacency.

- Every picker key or button is `{ seatId, number }`. Draw `number`, and keep `seatId` on the control
  (the review pages use `data-seat-id`). Send the id. Never parse a label back into an id.
- **Commands:**
  - `PANEL_CODE { doctorSeatId }`: `panelCommand(seatId)`, Hospital panel (group 3);
  - `SUBMIT_CODE { seatIds }`: the final Code (group 1);
  - `APPOINT_OFFICER` and `BLOCK_MOVE { targetSeatId }`: offices (group 6);
  - `OFFER_PROMISE { recipientSeatId, kind, targetSeatId }`: promises (group 4).
- **Sorting:** every list a player reads is in player-number order, through `bySeat`. That covers the
  capture preview and record (group 1), the keypad (group 3), Promise targets and the ledger (group
  4), the appointment's choices (group 6), and the end reveal's roles and Code plates (group 7). An
  unknown value sorts last.
- **Words:** "Send 6? This is your one attempt in the match." stays the same. Only the stored value
  changed, from 6 to `seat-6`.
- The drawn UI of every review capture is unchanged. Only the review cards' fixture lines now show
  canonical ids.

## 7. Correction 4: the Rescue leaves the figure usable

- **The board's figure is never hidden, greyed, dimmed, moved or disabled.** The board draws the
  healed player at its snapshot place throughout, with its name tag and press area live:
  - Room A or B, in crew clothes, if free;
  - the Jail, in prison clothes, if still detained.

  S5's review page greys the subject as away (`v2-fig--away`). That is superseded for the Rescue and
  must not be copied.
- **The film's patient is a performance in the ward.** It lies on the berth through the treatment,
  stands at 4800–5120 ms, walks out by the nearer side at 5120–5800 ms and fades at the panel's
  edge. The berth is left empty. For that time the subject is drawn twice: the playable figure, and
  the film's performance, which has no press area and is not selectable. The berth's own name tag
  shows only while the performance is on the bed.
- **`filmItems(frame, { …, drawPatient })`:** pass `drawPatient: false` when the snapshot itself
  places the patient at this berth. The film then draws no second figure and plays its effects
  around the board's. `leaves` is true when the snapshot places the patient outside the Hospital.
- **Mount:** unchanged. Every layer is `pointer-events: none`, in the room's art. All of them sit
  under the name tags (z 3500), press areas (4000), slot hits (4200) and the room label (5000). The
  table is in [cinematic/frontend-handoff.md](cinematic/frontend-handoff.md).
- **Variants:** unchanged. Full 6200 ms; short 1600 ms (nonblocking; the patient stands and leaves at
  1080–1460 ms); reduced 1760 ms (S5's two stills, then the empty berth at 1300 ms, 80 ms fades).
- **The display cut** still plays only where `presentationIn()` says `cover`. No current Rescue
  moment is one, so the display plays the board treatment.
- **Re-rendered review videos:** nine board-treatment renders with the board's figure in colour
  (section 9). They draw synthetic fixtures (Rigel, seat 2; Mira, seat 8) and are review only. The
  runtime drone insert is unchanged.

## 8. Corrections 5 and 6: the capsule exit, the EJECT, and the meeting Promise

- **The capsule exit:** S2's approved exit, on the board, on every surface including the display. It
  plays over whatever phase comes next and covers nothing: 2230 ms plus a 300 ms settle, or 400 +
  300 ms reduced (`exitEnd()`). Unchanged since #174's review.
- **The EJECT:** S7 on the board is the only runtime EJECT, on every surface including the display.
  `presentationIn(kind, { film: 'eject' })` is `board` in every phase, whatever `stageKind` or
  `surface` is passed. No covering EJECT stage is approved.
  - The display cut (`eject/review/cut-*.mp4`) and the exterior insert are review studies. Nothing
    mounts or bundles them.
  - The insert moved from `eject/runtime/` to `eject/review/` with the same bytes. Only its render
    record changed, because it records its own paths.
  - #183 described the insert as runtime-eligible. That is withdrawn.
- **Meet in A / Meet in B:** the giver's place alone decides; the recipient's place is never checked.
  R13(b) is answered and the words are unchanged:
  - the card: "Meet in A";
  - the terms, on the giver's sheet: "You will be in Room A when Round 4's voting begins.";
  - the terms, on the recipient's sheet: "Player 8, Hana will be in Room A when Round 4's voting
    begins.";
  - the result: "Fulfilled: Player 8, Hana was in Room A when voting began."

  Backend and Frontend are correcting their own mismatch to match.

## 9. Runtime assets and review-only files

Runtime-eligible files are identity-free: no name, character, role, outcome or control text. Review
files draw synthetic fixtures. **Never ship a path containing `/review/` or `/stills/`.** A bundle check
can reject both. Hashes are SHA-256, as recorded in `design/cinematic/exports/manifest.json` and each
group's `design/library/<group>/assets/manifest.json`.

### Runtime assets these corrections use (all unchanged)

| File | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| `design/cinematic/exports/blackhole/runtime/space-insert-textless.mp4` | 1,065,335 | `1f1aa0ee1a3b227bd09bd62496178a28e9aeee18b617863943ceae3f32047c57` | P27: the display, in the stage only (preferred, with the vector title) |
| `design/cinematic/exports/blackhole/runtime/space-insert-textless.webm` | 469,509 | `752e910a301277c106da42ec34642f40802da101d79fc4988477384fd8a60779` | the same, WebM |
| `design/cinematic/exports/blackhole/runtime/space-insert-titled.mp4` | 1,239,011 | `3d4a14c81aaf1888bcf90732cc1c01e7faa3515d2f764486015c54c93fbbca53` | P27: the display, in the stage only (baked title) |
| `design/cinematic/exports/blackhole/runtime/space-insert-titled.webm` | 594,145 | `127273efe597068a2eb6aec536ba7c41503d11e863370c61c68b410ed580da52` | the same, WebM |
| `design/cinematic/exports/hospital-rescue/runtime/drone-insert.mp4` | 412,513 | `eccab99be11d1696a90d7a81270006819c05ccd218623df6e3f105cc743cc097` | correction 4: the identity-free drone insert |
| `design/cinematic/exports/hospital-rescue/runtime/drone-insert.webm` | 185,954 | `077fe9dbb27b2d06684858273bbb34a0bff49d4a6f6754824f5aac5ac87b71a5` | the same, WebM |
| `design/library/windows/assets/wn-shade.svg` | 1,111 | `1abd18df9fd8421d743a87d4d17d4d4c33b8021b0cc3aa42fba83d9385c48c94` | correction 1: the Blackout's shade (window audience) |
| `design/library/windows/assets/windows.art.css` | 6,600 | `c94a85643f8a5b8d780b930786fcefd1fdf9bfb29e6cb7c8d3d6cb83069b4795` | correction 1: group 5's art stylesheet |
| `design/library/successor/assets/sw-crate.svg` | 1,307 | `9780e5f6fdca7a2808e0414c92aa6025c091d7e6670e1a9599ec761a5b3b53fa` | correction 2: the Supply receipt's crate (the recipient only) |
| `design/library/successor/assets/successor.art.css` | 5,081 | `08a57bc05adbdf1994316666d9fe4bedbbb63f9e53709b6388d23305347ce45e` | correction 2: group 8's art stylesheet |
| `design/library/hospital-panel/assets/hp-key-plain.svg` | 722 | `57dedc1d816775cd95417f551b3124e7189856a69ada03950b065f8c73025bba` | correction 3: a keypad key |
| `design/library/hospital-panel/assets/hp-key-picked.svg` | 849 | `c06592e1806442c228dbbf6e74f5a4cd0d880aa7430d788d2c1ec98b5188fa66` | correction 3: the picked key |
| `design/library/hospital-panel/assets/hospital-panel.art.css` | 10,056 | `fb5b43380259d397e0c702eb211f6be21483ebc5eee16553b024df5ac37dee27` | correction 3: group 3's art stylesheet |
| `design/library/promises/assets/pr-kind-meet-a.svg` | 1,187 | `5de9dd2e0cfae5c1337fe1a597866566bd037f19a74906431b8b3f528bc1719b` | correction 6: Meet in A (an arched door) |
| `design/library/promises/assets/pr-kind-meet-b.svg` | 1,255 | `7d0eecd729311465a35b46b6980ad0e3244f1f37daca38d7c77e4bf9d4fb34c5` | correction 6: Meet in B (a square door) |

The Rescue's and the Blackhole's cue mixes (`exports/*/audio/`) are unchanged.

### Review only: never mounted, never bundled

The nine Rescue board-treatment renders were redone for correction 4: the board's figure stays in
colour throughout.

| File | Bytes | SHA-256 now | Before (at `ff7b689`) | What it draws |
| --- | ---: | --- | --- | --- |
| `design/cinematic/exports/hospital-rescue/review/display-full.mp4` | 450,012 | `aa6eca1b14858133f595547e3b29fb650d7a543addcfc90ec4952640f370132f` | `f01cb3dfe33abb11…` | the display's board treatment, full; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/display-detained-full.mp4` | 423,664 | `ffacb31d3bf08cb3ecd07bfb239f06c43ad394ef53f3ae4002075ef5711b3402` | `26d1b58322d8a25b…` | the display's board treatment, full; Mira, seat 8, detained: back to the Jail |
| `design/cinematic/exports/hospital-rescue/review/display-short.mp4` | 231,504 | `3c1d26a4d36cbefbc5a018fd2133447ad04036c31ad63b70e39687c88162fb00` | `b0e406cbc6eee80e…` | the display's board treatment, short; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/display-reduced.mp4` | 151,902 | `c646e562839cdbcf9723dcb99199e034e12708100120eeada309fdcf3970bd96` | `d90b79298099f0d4…` | the display's board treatment, reduced; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/phone390-full.mp4` | 347,411 | `6a2c74ef064ac4f22aa4a436cf349bf53730e95ed45db06324b7582e2795d63e` | `c2ae2dded5d013c1…` | a 390 px phone, full; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/phone390-detained-full.mp4` | 337,355 | `72479f1e4e1fd7d0292059a102ab9d4bc94ad07eb5637d26c83b144936232637` | `2d49e6d53dd818b9…` | a 390 px phone, full; Mira, seat 8, detained: back to the Jail |
| `design/cinematic/exports/hospital-rescue/review/phone390-short.mp4` | 191,437 | `dfbbb7f8e0d27b43db9af686b1d6ac78ec83e76897b87f4af935dad91d4f3ac5` | `9b97c54c3100b926…` | a 390 px phone, short; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/phone390-reduced.mp4` | 153,210 | `edcff5bd57737edc2686623460dc12eb1d9739acf948b979325825f29a93833a` | `40eecad659d3cfd6…` | a 390 px phone, reduced; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/hospital-rescue/review/phone320-full.mp4` | 275,103 | `027263141aa7e5a02902010fa58ccd4196b7f0fbf174f516c965528544717119` | `1ba3a170e05602f2…` | a 320 px phone, full; Rigel, seat 2, free: Room A |
| `design/cinematic/exports/eject/review/exterior-insert.mp4` | 1,051,102 | `8ea644529b362f9e4a9ece89114095d68018e308e61a359162241804ffbc3a53` | the same bytes, at `eject/runtime/` | the EJECT's exterior study: no approved mount (correction 5) |
| `design/cinematic/exports/eject/review/exterior-insert.webm` | 319,605 | `061c1e0c2b40255de0ab317396d3658a7a05921dad1b1ecc8859415dd373955e` | the same bytes, at `eject/runtime/` | the EJECT's exterior study: no approved mount (correction 5) |
| `design/cinematic/exports/eject/review/exterior-insert.poster.png` | 1,521,559 | `3bb81d79918fac63fa31c28ca540c059cbaa98fe04e5ec06a3aed460b2941294` | the same bytes, at `eject/runtime/` | the EJECT's exterior study: no approved mount (correction 5) |
| `design/cinematic/exports/eject/review/exterior-insert.poster.webp` | 54,288 | `37e657000651d198ef93433cdcefd35cf8359569cf3645c4c2c3c0f82fb9ed86` | the same bytes, at `eject/runtime/` | the EJECT's exterior study: no approved mount (correction 5) |
| `design/cinematic/exports/eject/review/exterior-insert.preview.webp` | 183,460 | `98b3fc346686f1f1d1b1ee9672d841ea6f75d41163e350dff5990e74f69a82c7` | the same bytes, at `eject/runtime/` | the EJECT's exterior study: no approved mount (correction 5) |

Each Rescue video's poster, animated preview and render record changed with it (36 files in all, every one re-hashed in `manifest.json`). The EJECT insert's render record changed only in its own paths. The covering cuts (`hospital-rescue/review/cut-*`, `eject/review/cut-*`), the stills and every other export are unchanged.

The library review captures (`design/library/<group>/review/`) were re-captured for groups 1, 3, 4, 5,
6, 7 and 8. They are synthetic fixtures too. Their drawn UI is unchanged except for:
- the new Blackout and Supply cards;
- the Supply card's review note, which moved out of the strip into the fixture line.

## 10. Source modules at this head

The files to port or adopt, with their SHA-256 at this head. Each module that implements a
correction quotes the owner's words in its header. The sort-only changes in groups 1, 6 and 7 rely
on `seats.mjs`, which quotes them.

| Module | SHA-256 | What changed |
| --- | --- | --- |
| `design/library/seats.mjs` | `48797326b6ba19f9630b181b79af72a971ef0783ebc1a9af3240072a5a25da11` | new: canonical ids in, player numbers out (`SEAT_IDS`, `seatNumber`, `seatIdOf`, `bySeat`, `seatKey`) |
| `design/cinematic/lib/visibility.mjs` | `296a4ea4755fed194b3db1e61be1eb8283d2a2da7490e01d9bce99639b282dae` | P27's stage (`PRESENTATION_STAGES`, display only), `NO_RUNTIME_COVER` (the EJECT), `presentationIn(kind, { film, stageKind, surface })` |
| `design/cinematic/pilots/hospital-rescue/compose.mjs` | `028a4127d7cea7d476f93e02a003811644191f5e6482e6a18fdfb77c8ac5a0d8` | `filmItems(..., { drawPatient })` |
| `design/cinematic/pilots/hospital-rescue/film.mjs` | `91bee899982d3d1afd777d2df46c452d248b489d1b0673f9860c3be82f267daf` | comments: the board's figure is untouched; `arrive` drives only the cut's closing panel |
| `design/cinematic/pilots/hospital-rescue/stage.mjs` | `71d9e1c44a2cf877363e5e091bc7cecedcc92e4a5ccd8eb1458edc0dc4a96969` | review stage: never hides, greys or moves the snapshot figure; `drawPatient: !ownBerth` |
| `design/cinematic/pilots/blackhole/film.mjs` | `b500ee1b3ba5a20d28b25a060a40f57f524b4e3ca2c1a10f8455fd63b5bec12a` | comments: P27 (frames unchanged) |
| `design/cinematic/pilots/blackhole/compose.mjs` | `c1ff7879a3db07482cc4512cea2256de98caae74ecbbb256b30138f5d88aad2b` | comments: P27 (frames unchanged) |
| `design/cinematic/pilots/blackhole/stage.mjs` | `d2944416d8a9109a7fda2218dddb5f9e2d86b2692c2bb6da1d75eebd6f0c2e66` | comments: P27 (frames unchanged) |
| `design/cinematic/pilots/eject/film.mjs` | `ff8c73743ece5366cff3ec6d2a6a8a1876da225e0e8c6f099be243b886e22cf2` | comments: the cut is a review study, never mounted |
| `design/cinematic/pilots/eject/stage.mjs` | `cf3925a8e8e3ad6b5f71cbae76085def5be4170f1bfa641e36e140efa8be402f` | comments: the cut is a review study, never mounted |
| `design/cinematic/catalogue/catalogue.mjs` | `a59d89f3bf81c511e98cf1e1f4c1ef8655b864028cf29bef2426e7b6804ee44b` | motion bible `cinematic-catalogue-0.11.0`: R1, R10, R13(b) answered; R15, R16 added |
| `design/library/navigation/states.mjs` | `1e8288861f5a4cdf7d43fcd11b75f8d9dbd40b4bd0fa279c5b8a0273a19b2ca1` | P28: `ROUTE_WINDOW`, `routeWindowEnds()`, the `setting` and `chosen` states |
| `design/library/windows/states.mjs` | `15cf17b8eefd93d2ee1be13c5ce8e4ec554cb6739e793eb5850c80d3557b15ce` | correction 1: `darkSpan()`, `isDark(view, now)`, `padState(..., { now })`, `darkChange()` |
| `design/library/successor/states.mjs` | `231cf627b010332abef414e7f7f69a63156cc5f6326af071cb3f592fcbeeb3f0` | correction 2: `SUPPLY_EVENT`, `supplyReceipt()`, `inventoryAtRest()` |
| `design/library/successor/copy.mjs` | `0c7f3e94863699b9795aa2d0400442a98f47a48519f5ab363718e26b9f229fc1` | correction 2: `inventory(n)` ("Ordinary weapons: N.") |
| `design/library/hospital-panel/states.mjs` | `a1b2444821279283dde21dbfca4e6b81f7622e6befac4821de400d7ff2796bb8` | correction 3: `keypad()` keys `{ seatId, number }`, `panelCommand()` |
| `design/library/hack-engineer/states.mjs` | `41e0cbda304bf4b39688046032ab4b4f2b534cecf2bdaed77df1655dfb3853d3` | correction 3: seat lists through `bySeat` |
| `design/library/promises/states.mjs` | `c4e08438c4879df32524601c309516294a6d77fa22246566d257191806ddba2b` | correction 3: seat lists through `bySeat` |
| `design/library/promises/copy.mjs` | `58d60e1d43e8b4b20a51fdb5b31bf291b50fda5a3cf5042fbf7f1c7ee3d8c61c` | correction 3: labels through `seatNumber`; correction 6: the meeting kinds no longer wait on R13 |
| `design/library/offices/states.mjs` | `eb45a5b6dce616ade4a92e736429000e65a9524977c5221212136cb5405707b8` | correction 3: choices through `bySeat` |
| `design/library/end/states.mjs` | `2079f093440738e013ee408b3cf7763a3b0153422ab80f6ef85672f0a281d439` | correction 3: roles and Code plates through `bySeat` |

The review pages (`design/library/*/page.mjs`) changed too, to draw canonical fixtures and the new cards; they are review tools, not modules to port.

## 11. Checks performed

Every check below ran on `572d1eb`, this delivery's first commit, with Node 22.21.1 and npm 10.9.4 in
a 4-core container. The second commit only fills in this section.

- **`npm run verify`, every step except the capacity gate:** passed in 976 s.
  - toolchain, workspace, sources and typecheck;
  - `npm test`: bootstrap 55, engine 253, backend 187, tooling 130, frontend 194 and 448, and design 428;
  - balance static 103 of 103;
  - scenarios: 555 IDs, 516 passed, 33 reviewed blocked, 6 explicit manual, zero errors;
  - 4,490 balance controls detected;
  - playouts clean in modes 7, 8 and 9.
- **The capacity playouts:** `test:capacity`'s 600 playouts (200 per mode) were run without the
  gate's 600 s limit. They finished in 672 s and passed the gate's own assertions. The stock limit is
  shorter than this container needs; raising it is Integration's. This diff touches none of the code
  the playouts run.
- **The design tests:** 428, of which 6 are new and 1 is rewritten:
  - P27: the stage only in its own phase, on the display only, and never before Backend names it;
  - no covering EJECT, in any phase, whatever stage kind or surface is passed;
  - the Rescue never hides, greys or moves the board's figure;
  - P28: four worlds (no tie, a tie open, a tie chosen early, a tie unanswered) give one public strip
    and one Captain's panel;
  - the meeting Promises are the giver's place alone;
  - the Blackout's windows are lit for five seconds, dark from `previewEndsAt`, and fail closed;
  - the Supply receipt (rewritten): only from R15's marker, and never from a Sync's restore or from
    growth alone.

  The fixtures of groups 1, 3, 4, 6 and 7 now use canonical seat ids.
- **The library review captures:** `library-capture.mjs` gave every group 0 problems:
  - hack-engineer 137;
  - hospital-panel 109;
  - promises 165;
  - windows 123;
  - offices 117;
  - end 89;
  - successor 99.

  A before-and-after pixel comparison found the drawn UI unchanged except for the new cards. The
  other differences are the review cards' fixture lines, which now show canonical ids.
  `library-assets.mjs --check`: 96 assets, every hash matching its manifest.
- **The Rescue renders:** `cinematic-exports.mjs` re-rendered the nine board-treatment videos in
  Chromium 141.0.7390.37 with ffmpeg 6.1.1.
  - A frame-by-frame scan finds no one- or two-frame dropout in any of them.
  - Frames pulled at 0.5, 2.0, 3.2, 4.6 and 6.1 s were checked by eye. They show the healed player's
    board figure in colour throughout; the earlier renders greyed it.
- **The manifests:**
  - `cinematic-manifest.mjs`: 36 sources and 252 exports, each render record's hash matching its file;
  - the audio sheets match their 48 files;
  - `cinematic-docs.mjs`: `cinematic-catalogue-0.11.0`, 23 scenes and 16 requests.
- **Hygiene:** `git diff --check` is clean. A scan of the 77 changed text files for credentials, local
  paths and model names found none.

## 12. Limitations

- **No phone validation.** Every capture, render and probe is desktop Chromium with software
  rendering. None was run on a phone, a shared display, a GPU, or a screen reader.
- **Missing fields:** R15 (the Supply marker) and R16 (the stage's phase kind) are Backend's.
  `NAV_TIE` may be renamed. R11 stays open.
- **The Rescue draws the subject twice** while its film plays: the playable figure and the ward's
  performance. A walk between rooms would need the previous placement (R4).
- **S5's review page** (`design/board-v2/js/medical-view.mjs`) still greys the subject. It is a
  reviewed artifact, left unchanged and documented as superseded for the Rescue. The board-v2
  captures are not redone.
- **The capacity gate's 600 s limit** is too short for this container. Raising it is Integration's.
