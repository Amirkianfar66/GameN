# Character restyle adoption inventory

7 November 2026. Frontend planning only, prepared for Integration in response to the owner's all-nine approval. This inventory changes no drawing, runtime, token, catalog or release pin. The separate #188 openings and private role-film timing work has its own handoff.

## Reviewed inputs and adoption dependencies

The source inventory below is taken from main commit `5f1a1ce97570ddc3304b7b286ddd8ebbc3d8b0be` (merge of #191). The all-nine proposal was inspected at #192 head `7668b370c7dbd4282dc48997e4d5b7553f8d0455`. Its merge status is deliberately not an adoption pin.

| Input | Status and consequence |
| --- | --- |
| [Pilot #191](https://github.com/Amirkianfar66/GameN/pull/191), source `a0523d8c463252a7118fbc6be6044b8e2a38d074` | Owner approved Mira, Nova and Atlas; merged as the inventory baseline above. |
| [Other six #192](https://github.com/Amirkianfar66/GameN/pull/192), source `7668b370c7dbd4282dc48997e4d5b7553f8d0455` | Owner approved the remaining six. Integration owns retargeting, CI review and merge. |
| Public art crops | The owner explicitly permits `design/character-pilot/faces/source/` to remain public. Further consent is not an adoption dependency. |
| DSN-REQ-17 drawing release | Required, not supplied by these prototype PRs. Designer must name an exact source commit, file/dependency inventory and SHA-256 values for the adoptable drawings. |
| Art version | Integration must register a new immutable art release after `design-0.6.0`, including compatibility and catalog pins. This plan does not assign its number. |
| Crew tokens | `0.5.0` is required for approved crew colors. The inspected runtime/export inputs still use `0.4.0`; exact replacement bytes/hash await the release. |
| Runtime copies and portraits | Source and runtime hashes, the permitted import rewrites, all nine app-icon portrait hashes and source provenance must be included. No placeholder digest qualifies. |
| Performance and visual review | See the [budget proposal](character-restyle-performance-budget.md). Physical phones, Integration acceptance and Designer review of runtime screenshots/video are still required. |

`design/character-pilot` is reference evidence. It must not be imported, copied as a substitute drawing release, bundled, or deployed. Its tracing tools and source crops are not runtime dependencies. Existing releases and matches keep their immutable pins; adoption needs an explicit compatible release selection rather than a global replacement of historical art.

## Nine-character coverage

Keep character IDs, public identity and selection behavior stable. These appearance details come from the approved prototype; final geometry, colors and motion channels must come from DSN-REQ-17.

| ID | Character | Distinctive acceptance points |
| --- | --- | --- |
| c1 | Vega | Curls and headband; round glasses; blink lids stay inside glasses. |
| c2 | Rigel | Knitted beanie, ginger hair and full beard; include beard geometry in memory/performance cases. |
| c3 | Lyra | Bun with lime tie, loose strands and earring; slim build. |
| c4 | Atlas | Broad, heavy build, neck and limbs; mustache/stubble; distinguish from Juno. |
| c5 | Orion | Bald crown, white side hair and full beard; back view retains that silhouette. |
| c6 | Nova | Slim, blunt bob and headphones; approved magenta-pink palette from new tokens. |
| c7 | Juno | Messy hair, goggles and stubble; slimmer than Atlas. |
| c8 | Mira | Long, wavy side-parted hair with articulated hanging hair. |
| c9 | Echo | Visor and locs, approved violet palette; loc motion. Eyes are hidden: a blink channel must not draw visible eyelids through the visor. |

All nine need front, looking-down and back views, crew suit, Hospital gown, Jail outfit, injured and eliminated poses where the public state authorizes them. Neck/hands match the approved skin. New portraits retain the approved app-icon superellipse, rim and shadow and remain legible at 44 and 64 CSS pixels. Do not recolor by secret role, faction, private Hack content or ability availability.

## Consumer map

Paths are repository-relative. The current Planet renderer actively consumes the shared Board V2 scene and film code even where old module comments call those adapters dormant. Historical scene-board consumers also need deliberate compatibility coverage.

| Surface | Verified entry points | Adoption work and review |
| --- | --- | --- |
| Shared drawing core | `apps/game/hosted/scene-drawing/{crew,body,parts,rig,gestures,motion,wardrobe}.mjs` | Port only the published replacements/dependencies. Preserve rig measurements, gesture skeletons, easing, walk and wardrobe semantics; derive view from the existing skeleton. Keep exact copies except the fence's reviewed import rewrites/provenance header. |
| Scene board and move ghost | `apps/game/hosted/scene-board.mjs` → `dressedFigureSvg`; body/front and ghost mounts | Replace visuals for all nine while keeping public placement, gesture, press geometry and front-over-prop layering. Current figure key caches character/gesture/outfit, but seat-only prefixes do not guarantee uniqueness across simultaneous boards. |
| Board V2, current Planet board | `apps/game/hosted/board-v2-scene.mjs` (`boardV2FigureSvg`, `paintBoardV2`), called by `apps/game/hosted/planet/render.mjs` and `board-v2-host.mjs` | Cover body/front, room and capsule actors, alternate health, shared display and phone. Keep stored slots, frame, scale, mirror, depth, labels and offered targets. The current pose-JSON key avoids unchanged redraws but changes throughout animated blends. |
| Capsule poses and transitions | `apps/game/hosted/board-v2-capsule.mjs`; `board-v2-drawing/{capsule-figures,capsule-film,capsule-scene}.mjs` | Shared new head/body in sitting, listening, down/back, walk, entry, talk and return. Retain `walkingPose`, `capsuleLoop`, statuses and timing. Validate a character concurrently mounted at home/capsule/film without SVG reference collisions. |
| Native films | `apps/game/hosted/board-v2-films.mjs`; `board-v2-drawing/{captain-figures,clone-fx}.mjs` and film callers | Rescue, clinical, release/eject, overflow, captain and clone appearances use the shared drawing. The current film helper constructs SVG before comparing it with the previous string; optimize the caller/mount path rather than treating that comparison as a geometry cache. Recheck memorial/silhouette and body/front layers. |
| Phone kit | `apps/game/hosted/phone-kit.mjs`, `scene-drawing/phone-kit-art.mjs`, `claude-phone-kit.css` | Result subjects call the shared figure factory; `.pk-who` uses crew-card portrait variables. Update both. Preserve public result composition and private panel ownership. |
| Character selection | `apps/game/hosted/planet/app.mjs`, `planet/planet.css`; historical `setup-controls.js`, `.crew-option` in `comic-layout.css` | All nine `--crew-picture` / `--ms-role-person` bindings use new app-icon portraits. Keep selection IDs, taken/selected states, automatic assignment and the existing selection window. |
| Crew lists and own role cards | `planet/app.mjs` own card; `planet/render.mjs` roster snapshots; `packages/presentation/src/markup/comic-shell.ts` | Replace every `--ms-asset-piece-crew-card-c1` through `c9` consumer. Preserve semantic names, seat stickers, own-role concealment and missing-identity fallback. No invented character. |
| Ability portraits and chips | `packages/presentation/src/markup/ability-art.ts`, `apps/game/hosted/{ability-art,ability-drawing,private-card,comic-layout}.css` | Include `.ab-chip__art`, `.ab-photo__art`, `.trial-cast__portrait`, private snapshots and selection chips. Fit the app icon inside existing frames without obscuring seat numbers or changing controls/layout slots. |
| Static portrait exports and bundles | `design/source/export-recipes.json` (`piece-crew` / `card-c{n}`), `design/tools/lib/exports.mjs`, `apps/game/hosted/comic-assets.mjs` | Current card exports are lifted from the old standee sources. Designer must supply approved app-icon export sources/recipes in the new release; changing inline crew drawing alone leaves these portraits stale. Rebuild and hash the complete uniform bundle. |
| Character-bearing baked art/media | `design/releases/design-0.6.0.json`, film/art catalogs and release source inventories | Designer identifies/rerenders every character-bearing static frame or asset in the adoption release; Frontend checks the resulting catalog against this map. A restyle cannot be achieved by replacing only live figures. Review movies remain excluded from shipping. |

Historical compatibility must be tested by tuple, not by an assumption that a shared filename automatically selects the right art. A version-aware factory/asset registry or preserved exact modules may be needed. Integration chooses the approved dispatch and release registration; never rewrite `design-0.6.0` or older manifests to make a new port pass.

## Existing pin and fence inventory

The current shared port registry is [reviewed-drawing-ports.json](../../design/tools/lib/reviewed-drawing-ports.json), version `drawing-port-adoption-6`, base drawing source `49f0db4d34d2a2a418f669a13bed660fc665b1b6`. Individual Board V2/style ports have their own source commits; the base commit is not a replacement for those pins. Existing source and port SHA-256 values are already recorded there and in [scene-drawing-provenance.json](scene-drawing-provenance.json).

The adoption review must reconcile these records, adding only the explicitly reviewed changes:

| Record or check | Required treatment |
| --- | --- |
| `design/tools/lib/reviewed-drawing-ports.json` | Designer/Integration approval of source hashes, runtime hashes, import rewrites and any added drawing modules; retain unchanged rig hashes. |
| `design/releases/{board-v2-runtime-ports,board-v2-motion-ports,board-v2-films-ports,board-v2-four-drawing-approval,planet-drawing-approval}.json` | Identify which current records cover a changed consumer or port and provide a reviewed successor/snapshot consistent with immutable historical releases. Do not blanket refresh all hashes. |
| `docs/frontend/{scene-drawing,claude-phone-kit,designer-films-runtime,private-capsule-runtime}-provenance.json` | Keep applicable consumer provenance consistent with the reviewed source/port dependency closure. |
| `design/releases/design-<next>.json`, `scripts/runtime-art-release.mjs`, film/art catalogs, `comic-assets.mjs` | Integration registers the approved release, token dependency, exact asset bytes, compatibility and uniform loading. Existing release inventories remain verifiable. |
| `packages/design-tokens/src/index.ts`, new `tokens-0.5.0.json`, `design/tools/lib/inputs.mjs` and export recipes | Use the pinned new crew colors at each selected-release consumer. Preserve other token behavior and historical lookups. |
| `packages/design-tokens/test/drawing-port-fence.test.mjs`, `design/tools/lib/drawing-port-fence.mjs`, `scripts/check-sources.mjs` | Exact-copy/import-rewrite checks, dependency allowlist, source integrity and prototype exclusion must remain green. Add new sources to the fence only with Integration approval. |

Source provenance must describe the owner-provided traced artwork accurately. Do not retain an old blanket “no traced image” claim for newly traced assets. The public source-crop permission is already granted; retain its provenance in the release without shipping crops to the game.

## Rendering strategy to review with DSN-REQ-17

The Designer reports 93–124 KB per new complete SVG versus approximately 21 KB today, and 30–62 KB for the traced head geometry. These are source/output-size observations, not phone timing measurements.

1. Cache immutable head/view geometry once per art release and character, with reusable named-pose templates keyed by character, view, outfit, health and body/front layer. Share immutable definitions within a well-defined SVG scope where the approved drawing supports it. Portraits are generated once at build time from the same approved art. Do not cache arbitrary timestamps or every continuously sampled skeleton.
2. Mount each figure once. Reuse its DOM and referenced geometry. During frozen walk/blend sampling, update only changing skeleton paths/transforms, eyelids and articulated hair groups. The heavy face paths must not be serialized, parsed or remounted every animation frame. Static geometry and poses can be reused while continuous motion remains continuous.
3. Keep this mounting/caching adapter outside the exact drawing copies. DSN-REQ-17 must expose a reviewed part/definition contract sufficient for head, eyelids, hair and pose updates, or Designer must publish an exact-copy-compatible implementation. A monolithic SVG-only API that forces full serialization each frame is an unresolved dependency, not permission to rewrite frozen source locally. No path simplification, retracing, raster substitution, new renderer, pose quantization or changed walk to meet the budget without Designer/Integration review.
4. Allocate a fresh mount prefix for every inline figure, front layer, capsule, portrait and film instance. Include renderer-instance and mount counters rather than only seat/character/event. Namespace `id`, fragment URLs, `href`/`xlink:href` and ID-reference lists together. Shared immutable definitions have a separately unique owner; references never point into another live instance accidentally. Cache canonical geometry without a live instance's prefix, then namespace at mount time, outside the frame loop.
5. Per-character blink scheduling uses only public/non-secret identity seeds and approved motion inputs. Mira/Echo hair follows the reviewed attachment channels. Reduced motion retains gesture/view and meaningful pose, stops idle drift and hair swing, and works when switched at runtime. Do not infer health, role or team from private animation inputs.
6. Dispose instance nodes, observers, subscriptions, animation handles and private-surface state on unmount/identity change. Bound release/template caches; do not retain one cache entry per rendered frame. Concealment, blur/background and snapshot placement/timing remain authoritative.

The prototype's `anim.mjs` imports the frozen easing/walk but extends stride from 17 to 22 and supplies its own wave/idle showcase. Do not port that module wholesale. The existing skeletons, gestures, walk curves/easing, slots and phase clocks remain the movement contract; only separately reviewed blink/hair channels are additions.

## Runtime acceptance evidence required later

- Exact source/runtime SHA-256 inventory, permitted import rewrites, dependency closure, updated source/port tests and a build proving prototype/review-video exclusion. A cache adapter must have meaningful tests for mount reuse, no full-head rebuild per frame, bounded lifetime and SVG references.
- All nine on selection, crew list, own card, ability chips, board, capsule and films; front/down/back, three outfits, injury/elimination, Mira/Echo hair, blink/visor handling. Include simultaneous duplicate-character mounts, every local `url(#id)`/href resolution, body/front layering and a clean mount/dispose/remount cycle.
- Phone-width board/list captures at 320×568, 390×844 and 430×932, normal and reduced motion; shared display and 7/8/9 rosters. Preserve labels, timers, bars, slot hits, minimum target areas, long names and 200% text. Browser captures are visual regression evidence, not physical-phone performance acceptance.
- Existing privacy checks plus role/faction permutation checks: same public character/state gives identical public geometry, colors, cache keys and network request sets. No private-role/team inputs or role-dependent asset fetch in shared drawing. Own-role card visibility follows existing concealment.
- Keep the cinematic board z-list/keep-clear mask and snapshot placement rules. Rescue ends in the snapshot's Room A/B or Jail; no hidden playable figure. Capsule exit remains S2 on board. Blackhole remains behind the crew for 2.4 seconds inside the Jail vote. A covering form remains limited to HACK_RESULT, VOTE_RESULT, FINISHED or ABORTED within the existing phase time. S7 on-board EJECT remains the default; #183's display cut remains a proposal. No phase waiting, extension or shortening.
- Run relevant existing scene/film/capsule/phone-kit, Planet art/motion/private-feedback and presentation tests; update pinned-port and board/list screenshot checks. The prototype's unit tests are not evidence of runtime adoption.
- Provide physical-phone results using the paired-baseline [performance protocol](character-restyle-performance-budget.md), screenshots and a short runtime video for Claude Designer and Integration before merge. Review media is evidence only. No deployment is included.

No runtime build, gameplay test, benchmark or phone test was run for this planning change. Validation of this document is limited to source inspection, path/reference checks and `git diff --check`.
