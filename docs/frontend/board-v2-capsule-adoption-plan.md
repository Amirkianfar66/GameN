# Board v2 and Private Capsule adoption — issue #139

Base: deployed `37f573afca9023e8e4a92375375cea96638d120f`. Worktree: `codex/frontend-board-v2-capsule`. Preserve the previous release/Frontend branches. The owner’s current instruction authorizes the scoped Board v2/capsule implementation; Integration owns final pins, common source/art review, acceptance and deployment.

Source: Claude #130 at `15e61f0bbd043930a578900862be9d5156b3b602`, drawing correction `ebf0263d92cbe66c67a4ce5c64b822a3658031e8`. All 61 hashes in `docs/design/board-v2-frontend-handoff.md` match that clean source. The source’s two later files are documentation changes. The owner’s reference is `design/board-v2/review/blackout-390x844-16300-double-r7.png`.

## Concrete gap and dependency split

| Item | Current release | Exact adoption input | Dependency |
| --- | --- | --- | --- |
| Room proportions | Occupancy/target-dependent `fitBoard` then `fitSceneBands`; Command/Hospital bands differ from the reference | Pure `design/board-v2/js/fit.mjs` and its revised capsule split | Viewport/insets and existing `playerCount`; command/private overlays need the revised fit, not a new server field |
| Captions/frame | Small move tags, gradients, rounded room frames from #127 adaptation | Component values from `.v2-cap`, `.v2-room` and navy/gold palette in `design/board-v2/css/page.css` | Presentation; preserve the real movement control/intents and ≥44 px hit area. Review page/CSS is excluded as a whole |
| Nameplates | Small gold seat number, truncated player label | `.v2-tag`: paper plate, dark number block, 10 px type/14 px line, 1.5 px border | Existing public identity/character facts; retain player-entered display names and an accessible full name. Prototype Crew signs supply reference fixtures, not replacement user names |
| PASS/nav | #127 icon row and gradient disc; disabled Pass becomes dashed navy | Solid gold raised circle and plain Board/Actions/Card/Menu treatment from `.v2-pass`/`.v2-nav` | Presentation; real button semantics, five targets, existing availability and receipt flow remain authoritative |
| Ward/patients | Historical two-bed sick bay and stateless five-place renderer | `hospital-ward.mjs`, 3 roster back SVGs + 9 berth fronts, existing approved gown/rig/gestures | Art ports can be reviewed now. Correct occupied berth binding needs stored slots; full-roster Hospital gameplay and patient routing remain Backend authority |
| Persistent positions | `placeSeats`/`placements` allocate from seat order and current occupancy | `slots.mjs`, pinned logical slot table, Backend public `slotId` | Minimal versioned persistent-slot contract/engine prerequisite. Browser caching/sorting is not an allocator |
| Capsule/public motion | Absent; partner association is private in 1.5 | Pending Claude capsule drawings/poses/film and revised fit; public `hackSession` proposal | Pair/phase data from #140; no additional clock/location/command. Art and layout need exact named hashes before adoption |
| Blackout/blocked films | Absent | Lighting/film/effect modules inventoried in #130 handoff | Separate authoritative lighting, slot-snapshot and audience-scoped event contracts. These do not block caption/nameplate/nav preparation |

## Named-file proposal

[board-v2-capsule-adoption-proposal.json](board-v2-capsule-adoption-proposal.json) names the exact source and proposed runtime bytes for four pure ports: slots, ward, fit and the approved scene-kit dependency. `apps/game/dev/prepare-board-v2-core.mjs` verifies each fixed source hash and creates an **unapplied** patch; it does not edit the runtime, manifest or fence. Transformations remove the first dev-only comment line and rewrite only listed imports to already approved scene-drawing dependencies/new ward/kit.

The temporary proposed graph was compared with Claude’s source: every slot for 7/8/9 rosters and layout outputs at 320×568, 390×844 and 430×601 were equal. All 12 ward SVGs are exact common-bundle candidates. The current fit hash is a baseline: Claude’s new half-width capsule fit must receive its own named hash. Capsule files/poses are pending, with no invented file or replacement art.

Integration review must approve these derivative names, the existing geometry import reuse, exact common assets and the eventual owned style adaptation. `page.js`, `blackout-view.mjs`, `blocked-view.mjs`, fixtures, review pages, generated proposal contracts and proposal manifest stay out of production. Historical scene ports, placement readers and manifests remain preserved.

## Owned consumer edits

- Add a Board v2 renderer/layout adapter and style adaptation under `apps/game/hosted/`, keeping historical `scene-board.mjs`/drawing ports available to historical tuples. Consume the approved pure layout/slot/ward ports; do not allocate an authoritative slot.
- `packages/presentation/src/model/types.ts`, `model/common.ts`, connected/table model builders: carry existing `playerCount`, sanctioned public session/stage/remaining time, and approved slot IDs once supplied by shared contracts.
- `packages/presentation/src/markup/comic-shell.ts`: source-matched captions/nameplates/nav, permanent adjacent capsule, one drawable actor per actual seat, and the original action controls/IDs while art travels. Logical room roster/readable facts remain the Backend facts.
- `apps/game/hosted/browser-host.js`, scene/capsule/motion adapters: use current authoritative placement for every exit tick, exclude active cinematic actors from duplicate world movement paint, cancel obsolete art, and preserve private blur plus sent-command recovery.
- `apps/game/hosted/ready-compatibility.mjs` and the SDK test helper: add only Integration’s eventual exact gameplay/art pairing; no guessed art pin or current default activation.
- Integration coordinates `art.mjs`, `comic-assets.mjs`, runtime inventory/fence and immutable versions. Frontend does not modify those shared gates independently.

## Capsule data and lifecycle

[Frontend review on PR #140](https://github.com/Amirkianfar66/GameN/pull/140#issuecomment-6166640523) accepts the proposed nullable `hackSession {hackId, actorSeatId, targetSeatId}` with current phase IDs/start/end and participant-only `hackFeedback`. No new consumer wire field is needed. Existing `playerCount` is the roster. The exact new capability reader and strict schema must be adopted before connected wiring; historical tuples retain absence of the field.

`apps/game/hosted/capsule-lifecycle.mjs` is independent, currently unwired preparation: it normalizes public-only stage facts, enters once on an observed live declaration-to-result transition, settles initial/recovered stages, retains the full server-owned 60 seconds, requests nonblocking exit on an authoritative next phase, and resolves latest seats instead of departure coordinates. Six focused tests cover those boundaries, reduced/hidden/stale/termination/superseding cancellation, original-seat target mapping and a changed return destination. This is lifecycle preparation, not a connected art/server acceptance claim.

The capsule’s 2:1 interior split (right default) is permanent scenery. Entry/door closure fits within the existing five-second claim stage. The conversation clock is never shortened or gated on animation. Private claim text is never a public art input. Existing current legal targets/movement offers still map to actual seat IDs; no capsule location, extra occupant, immunity, movement cost or audio service is added.

The new tuple’s approved G-09 cutoff is Backend-derived: final ordinary turn stays movable until Pass/deadline; its Hack is closed to movement; earlier Hack permits movement while a later non-Eliminated ordinary turn remains. Code during final Round 5 conversation remains independent. No Frontend reconstruction of hidden turn order.

## Fit facts and screenshot gate

The unmodified pure fit gives the reference’s normal 390×844 / roster 7 geometry: Command 193.68 px, middle 324.32 px, lower 190 px; boxes start at (5,57), (5/205,255.68), (5/205,585). Its 64 px Pass has centre (195,795), clear of every slot by at least 12.73 px. The capsule revision must preserve the owner’s composition while giving the Command/Capsule interiors exactly 2:1, gutter excluded, and C1 plus both cinematic targets ≥44 px.

320×568 with no insets fits the compact 36/48 px shell with bands 100/192/178 and **zero spare height**. With top/bottom insets 20/16, the current proposal returns `fits:false`, `too-short`, deficit 36 px. At 320×640 with those insets it fits short. A source `fits:false` board must not be drawn or scrolled. Claude’s new fit/acceptance must explicitly resolve the smallest safe-area screen and real action/private rows; consuming the current fit unchanged cannot prove playable inline controls fit. This is a concrete layout integration gap, not an extra Backend field or a reason to defer all visual work.

Required candidate comparison uses **the same roster, identities, public health/location/slot facts and phase**, rather than pixel-diffing unrelated live-bot and reference states. At 390×844 compare room boxes/crops, borders, captions, nameplate metrics, full ward layers, figure/blanket depth and solid raised PASS/nav with Claude’s reference; include the corresponding capsule revision and empty/entry/occupied/exit frames. Keep a reviewer-visible side-by-side screenshot with measured differences.

Repeat 7/8/9 rosters at 320×568, 390×844, safe-area insets, 600/601/640/641 shell boundaries, full rooms, long names, actual 200% text, open command selection/confirmation/uncertain receipt, Menu/current result, normal/reduced motion and every capsule stage. Real pointer hit tests must cover centre and four inner corners of C1, both capsule actors and every offered board target; targets stay ≥44 px, separate from captions, PASS and overlays. Normal gameplay requires no page/board scrolling; every fallback and enlarged-text surface must preserve reachable controls/text.

Connected acceptance must additionally show the two participants plus an observer/display: public pair motion; claims absent for outsiders; full server-owned 60 seconds; movement during conversation and latest-position return; late join/reload without entrance replay; private blur/stale concealment; same-ID lost-answer recovery; termination/disposal. Fixture screenshots or the six pure tests do not replace that server flow, required combined CI or physical-device/owner visual acceptance.
