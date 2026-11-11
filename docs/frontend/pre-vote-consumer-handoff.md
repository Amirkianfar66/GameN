# Pre-vote Blackout consumer candidate

Issue #214. This follows phone PR #212 at `bd5042a15b630ed270c8147f7c0d3f9694e4a3ac`, with its native source `838558bdc8d9eb3793d268375583260d8e4c4433` and 1.2 evidence preserved unchanged. Backend dependency is PR #213 at `1900566f7237bc5a8032acdfb09208f95e68e2c0`, frozen runtime `c492523845567c7e4e672991e11c058e88ccea27`. The reviewed contract is `44d008df0f1cc6fbb2d6c4c0b4b9c95f50c752c3`.

Final native presentation is frozen at **`b63403e6a8d1b5f68f48ec13f4a392a79870bfcd`**. Gameplay, room-camera and real Tasks evidence remain frozen at **`c5a70b7eea1c3f755f655d37ac729e5f78d24efc`**; only phone styles and roster DOM differ between those commits. Seven of the thirteen phone consumer files differ from the 1.2 candidate: board scene caption lifecycle, crew dispatch, room-camera fitting, phone styles, renderer, controller and presentation library. Exact bytes and unchanged dependencies are in [the inventory](pre-vote-consumer-inventory.json). Integration owns the separate approval records/readers; none are edited here.

## Exact dispatch and authority

The consumer explicitly accepts protocol 3, engine `planet-game-1.3.0`, ruleset `in-person-planet-blackout-before-vote-2026-11-10`, authority hash `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`. The released artwork remains `design-0.8.0`. Crew drawing checks every gameplay pin plus its allowed saved art release; mixed and near-match tuples are rejected. No art bytes, drawing ports or prototype sources are adopted.

Presentation helpers explicitly inherit 1.2 private declaration permissions and 1.1 private feedback. The controller uses the actual `declaredSides` subset, retains panel-only `NO_INJECTION` evidence, and leaves offered final Code available in darkness to a living healthy, injured or detained Hacker. The Code keypad carries original player numbers, without current identities, portraits or positions. Navigation retains the existing setting/confirmation stages and full server deadlines. Saved 1.1/1.2 assets and setup flow 3 behavior remain supported; older saved tuples and absent/2 setup paths retain their existing rules.

No client timer starts voting or publishes an effect. Optional Sync remains six seconds, Blackout five lit plus ten dark seconds, Jail voting a fresh sixty seconds and its result five seconds. The next authoritative projection determines later resolution/navigation; there is no client-created second Blackout after the result. Registration and receipt recovery never imply a hit, treatment or completed round.

## Physical publication labels

The contract schema validates candidate-only checkpoint/phase/publication-round pairs before a view reaches the controller. Older tuples omit checkpoint metadata. `finalizedRound` on 1.3 identifies a physical publication, including partial checkpoints.

| Checkpoint | Visible shared-display label | Meaning |
| --- | --- | --- |
| `INITIAL`, publication 0 | Initial board | Dealt physical board, including active first-round turns |
| `PRE_BLACKOUT`, current round | Before Blackout · Round n | Selected post-turn/Sync targeting board; damage and other resolution pending |
| `AFTER_BLACKOUT`, current round | After Blackout · Round n | Blackout batch settled. Full physical snapshots still republish actual Jail transfers, reservations and offices through vote/result; remaining actions and Rescue await finalization |
| `ROUND_FINALIZED`, completed round | Round n complete | Remaining resolution is complete. That publication can remain during the next round's election/turns |

The display has a dedicated visible, wrapping publication line, including during active turns. Darkness replaces it with neutral **Blackout**, with no names or positions, while preserving the targeting geometry. The player model labels its authorized current board separately as `Current board · shared: …`; that shared metadata never certifies the actor's current/speculative board as the complete shared resolution. Partial labels never say that the round is complete.

## Restored movement entry

The owner's confirmed full-board room-tag interaction is restored. Board/Room navigation changes only the view and sends no movement command. Eligible A/B/Command name tags directly open the authoritative MOVE room/empty-slot flow. Unavailable destinations are disabled, visibly dimmed and dashed, and have an accessible unavailable label. Offered same-room repositioning is retained. A slot choice still requires explicit confirmation before sending the stable destination/slot command. Move is absent from Actions. Room-view headings remain headings; darkness disables movement and preserves fixed geometry.

The room camera fits the complete shared rig canvas at every fixed public place, keeping the authoritative anchors intact. A cover-only camera could leave a clamped hitbox on screen while its person was cropped away; the corrected camera uses consistent fixed-place bounds instead. Tall phones retain deliberate vertical room margins. Geometry never depends on occupants, health or private eligibility. Pure tests cover all fixed canvases and target centres, and browser checks measure actual painted SVG pixels and reachable target centres at normal and 200% text, including all J1–J5.

## Owner presentation corrections

Designer PR #207 at exact `e4fd047fec2cde1d6534b3276a2ae39d5ca10a9b` supplies the owner’s three presentation decisions. The native sheet/result keeps the 20–34% tint and `blur(2px) saturate(1.3) brightness(.56)`. Light text inherits exactly `0 0 1px rgba(8,11,18,.85), 0 0 3px rgba(8,11,18,.7), 0 0 8px rgba(8,11,18,.45)`. Primary controls, paper/amber seat/count/You badges and role/comic cards explicitly remove that halo. The solid reduced-transparency fallback is retained.

Under 13 em of roster width, each player becomes an aligned row. The portrait, seat number and result count are all 1.375rem high on the name’s first line; notes and You follow the name. Ordinary three-column results keep the count top-left and You top-right. Every count appears once, while the accessible group names the player number, full name and vote total. Missing counts retain a dash and “count not published”; they do not become zero.

Fourteen focused Chromium cases at the final source cover 7/8/9 players, 320×568 with 200% text and ordinary 390×844, both motions and solid fallback. They include longest names, accessible result groups, scrolled own rows, visible keyboard focus and a single registered ballot. This presentation follow-up does not relabel the earlier c5a real Tasks journey as final screenshots or rerun its gameplay for CSS-only changes.

## Evidence and limits

[Verification](pre-vote-consumer-verification.json) records the actual results and [the evidence folder](evidence/pre-vote-consumer-2026-11-11/) contains separate synthetic/native-projection/real-emulator evidence. Original #212 captures remain attributed to 1.2.

Pure boundary tests consume native Backend projections for 7/8/9 players, with and without Sync: Blackout damage and Hospital placement appear before a full Jail vote; the five-second result still carries `AFTER_BLACKOUT`; queued Rescue appears only after finalization. Receipt tests cover a slot registration settling after reconnect into the vote and original-ballot recovery without replacement commands. Dispatcher checks retain every released portrait/figure across outfits and reject mixed tuples.

The six synthetic Chromium cases pair all three sizes with both motion settings at 200% text. They assert direct room-tag movement and command counts; actual visible/unclipped checkpoint bounds through INITIAL, pre/post-Blackout and active next-round carry; frozen dark slots/privacy; original-number dark Code; decoded/nonempty/unique crew drawings, and all-room painted-body/target checks at normal and 200% text. Synthetic authority does not establish real timer or multiplayer behavior.

The real connected script uses local Auth/Firestore/HTTP/Functions/Tasks and native UI. A labelled native command/deadline prefix is adopted once from a real admitted lobby before role disclosure. Every later deadline, choice and projection is real; no browser snapshot or clock is injected. Its nine-player path checks both Disablers, full vote/result, a successful ballot response deliberately dropped at the browser network boundary, original receipt recovery, and later Rescue ending in the still-detained patient's actual Jail placement. Actual results, cleanup and server-log limits belong to its facts, not a blanket error-free claim.

This is desktop Chromium emulation. Physical iPhone/Android startup, frame/input/memory measurements, Safari and VoiceOver remain unrun. Human balance acceptance is separate. Historical review videos are not shipped. No Designer #207/#197 sources, ambient/new-room art, historical source approvals, creation defaults, cloud configuration, merge or deployment are changed by Frontend.
