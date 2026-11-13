# Food Supply native integration map

Issue #235. Prepared 13 November 2026. This is integration preparation, not a native implementation or production contract acceptance.

- Design: #231, `9bb497948861521030c37a8d2c60a6318f1745c9`.
- Candidate: #233, `262f35a63f2afa8dc0918ca86507c00edefabcf8`.
- Merged implementation base: `1f795366a27b17f46ac195debe491954a27d8ae0`.
- Isolated branch: `codex/frontend-food-supply`. The #227 worktree remains clean at `9c70512f067592bae895b478ab71d2536fccdfc8`.
- Planned tuple: protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12`; authority hash and artwork registration belong to Integration. No new-match default change.

The owner has now approved all four Hold continuations at https://github.com/Amirkianfar66/GameN/pull/233#issuecomment-6849280539: intact intake return, platform landing only with Panel locked, a finger already held picking up when eligible, and a stopped drop remaining on the brake until the next Hold. Earlier proposal labels in the pinned design/candidate are superseded by that answer. The blanket stale-lower exception is not accepted production behavior.

## Native surfaces and wiring

| Surface | Drawn source | Required authorized input | Native seam |
| --- | --- | --- | --- |
| Food step header and countdown | `phone.mjs` step bar and volunteer flow | Food-step ID, stage, asking boundary, server clock; ordinary commands unavailable | `planet/render.mjs` header, new Food presentation model |
| Tasks: available, closed, another request waiting, last-round cooldown | `volunteer()` | Server offers/status and permitted unavailability reasons; anonymous busy status | Food sheet mounted from the existing Actions destination; instructions remain available outside the step |
| Instructions | `howto()` | Approved static words, context for return/back navigation | Scoped pack sheet, outside timed Task; no state simulation |
| Partner list | `volunteer(step=partner)` | Canonical public identities, offered SeatIds, server-provided row state/reason | Native rows use SeatIds as values and public numbers only as labels |
| Asking, Cancel, decline, Join, expiry/withdraw races | `volunteer()` and `called()` | Private request ID/revision, actor identity, full answer deadline, durable receipt and server result | Task/request controller; no optimistic Joined or inferred refusal |
| Participant briefing | `briefingCard()` | Randomly assigned control, partner, runningAt and active deadline | Dedicated non-scrolling reminder; focus moves to the card then returns to the actual control |
| Winch Hold and key | `control()`, `swingMeter()` | Approved offers, current holder, accepted gesture/control session, crate generation and anchors | Dedicated Hold input controller; one visible Hold, later key |
| Panel RELEASE/LOCK, key and strip | `control()`, `sweepStrip()` | Safe panel anchors, explicit offered act, key state and approved display parameters | One stable DOM button across RELEASE/LOCK; preserve the act captured by the gesture |
| Room/machinery, two operators and tags | `scene.mjs`, `machine.mjs`, `layout.mjs` | Safe pose anchors, public character IDs/names and participant-visible online/out state | New render-only SVG compositor; crop `[16,40,992,696]`; preserve layer order and right-anchored Winch tag |
| Pending, refused, unknown and recovered press | `pressState()` / `states` sheet | Presser-only receipts plus current authorized view | Pending is separate from an authoritative crane effect; rejection never reaches the partner |
| Broken/replacement crate, brake, warning and STOPPED | Winch/Panel sheets and motion sheet | Current crate generation, wreck anchors, holder and timestamped participant cues | Draw breakage/CLANK without food deduction or defense cause; no old Winch salvage path |
| Death, lost/cancelled/delivered and common return | `endCard()` and flow | Participant-only result and authoritative `returnsAt`; public final facts only when authorized | Cards remain within the fixed server interval; seek present on late arrival/recovery |
| Other phones while participants are away | `away()` | Canonical roster plus explicit public presence/away metadata and public step boundary | Hide drawn figures while retaining identity records; never expose an early private death/ending |
| Public stock and low-food warning | `stock()` and public return | Integer authoritative doses/public revision, approved change identity | Display packages/half-packages from doses; never infer Task success from a private event |
| Turn-end meal/stock feedback | Authoritative meal evidence; #230 is a separate visual dependency | Selected-world meal ID, actor, ordinary-turn completion, availability/result and public stock | No polling or activeSeatId inference; a skipped/reduced-motion visit never changes consumption or hunger |

Current native files to integrate after contract acceptance:

- `apps/game/src/planet/transport.ts`: strict shared-schema parsing, tuple checks and request/receipt binding.
- `apps/game/src/planet/controller.ts`: expose the accepted Food state while preserving ordinary command behavior; the existing ordinary phase gate does not authorize Task timing.
- New `apps/game/src/planet/food.ts` and `food-input.ts`: request/Task state, accepted input identity, durable receipt recovery and Hold input lifecycle.
- `apps/game/src/planet/session.ts` and `apps/game/hosted/planet/app.mjs`: authentication, transport, conceal/background/disposal, storage and common uniform art loading.
- `packages/presentation/src/planet/model.ts` plus a Food presentation module: typed render model and safe time-based presentation from accepted anchors. No rule resolution, target eligibility inference, hidden-state reads or RNG.
- `apps/game/hosted/planet/render.mjs` plus scoped `food-render.mjs` / `food.css`: Food screens, stable controls, focus and accessibility. The current native kit is an older selector adaptation, not the pack's `ui.mjs`/`kit.css`; adopt the necessary pack component structure and tokens only within the Food scope, with pinned provenance.
- Excluded review tooling under `apps/game/dev/phone/`: accepted packet scenarios, side-by-side states, pointer/keyboard/motion/recovery captures and source provenance. No fixture helpers enter the playable graph.

This work does not copy #227's unmerged files or repair unrelated phone-parity debt. Ordinary room framing/art remains a separate reviewed dependency.

## Contract review requirements

| Packet or operation | Required contents and invariants | Examples required before adoption |
| --- | --- | --- |
| Version admission | Exact candidate tuple, strict schemas, opt-in new matches and agreed asset manifest | Historical protocol 2/3 payloads unchanged; unknown tuple rejected; supported old matches render without Food |
| Food-step/public status | Stable step ID, stage/asking deadline, anonymous request-waiting state and approved away metadata | Opening, no eligible pair, pending answer spanning the asking boundary, closed outside step, active Task, fixed return |
| Private request | Request ID/revision, Volunteer/Partner SeatIds, answer deadline, actor-specific permitted actions and reasons | Ask accepted/duplicate/rejected; Join versus withdrawal; Join versus expiry; decline/no answer; refused Volunteer still available as Partner |
| Participant Task | Task ID/revision, observedAt, both assigned controls, alive/online/keys, start/running/deadline/return times, permitted return label | Briefing, running, terminal early result held until common return, cancellation/death, reconnect before/after grace |
| Safe motion | Panel locked stop or click from/dir/since; swing since/amplitude/direction; crate generation/state/x/from/since/holder; ordered wreck anchors; approved mechanic parameters | Same scene/strip/meter/hazard words from one sample and clock; missing/reordered updates; reduced motion preserves physical x and all interlocks |
| Hold down/up | Authenticated Task/control-session/gesture identity and ordering; expected Task revision; crate generation when known; bounded payload | Up before down durably closes gesture; delayed A cancel cannot release B; same-ID retry does not reroll; down/up while reply pending; release during changing crane revision |
| Recovery | Durable per-command receipt context plus current accepted input identity; distinguish unknown from rejected | Lost down reply, lost up reply, both replies lost, reload, receipt unavailable, stale snapshot/late receipt, changed Task/seat/authentication |
| Panel/key press | Explicit act bound to original gesture and revision; no generic toggle command | Double click/held key cannot become the opposite act; simultaneous keys remain valid; outdated receipt cannot regress current revision |
| Participant cues | Audience-scoped identity/cursor, authoritative event time, safe effect parameters | Other participant's hidden refusals do not change any visible IDs/counts/gaps; same Protection/luck shape and metadata |
| Stock/meal evidence | Integer doses, public stock identity/revision, exactly one meal per ordinary-turn completion and selected-world evidence | Pass/timeout eat; private-talk continuation does not create another meal; discarded-reality meal not shown as retained; skipped cinematic has no rule effect |

Canonical roster must remain complete. The existing `readPlanetView()` uses `board.seats` to validate self, offices, actors and targets; removing away seats from that array would invalidate the view. Integration has confirmed canonical identity plus explicit away/presence as the contract direction.

The current controller's single unsettled command gate cannot hold back an up/cancel. Hold input needs at most the bounded down/up records for its active gesture, each with a stable command ID. Persist only the identifiers/recovery metadata approved by the contract, never a private view, target roster, role or arbitrary queued command payload. A fresh gesture must not start while an earlier gesture has an unresolved effect unless the accepted protocol explicitly makes that safe.

Pointer-up/cancel is followed at window scope, including a finger sliding off the control. Capture the explicit input identity before rendering changes. Blur/background requests closure while still authenticated; a stale authentication or disposed Task never authorizes a command. Pure connection loss is not a physical release. Recovery can close only the current accepted gesture under the agreed protocol, never an arbitrary newer crate or obsolete queued Hold. Keyboard and assistive-toggle activation need equivalent identity/order rules without synthesized duplicate clicks.

Task timers are server-owned. Browser rendering seeks to current time after tab suspension; it does not restart impacts, pause the deadline, shorten a new window or advance common return. Invalid/stale clocks close interactive controls while receipt recovery remains available.

## Art adoption request

Exact source hashes and the 21-file offline operator/ink export closure are in `food-supply-art-adoption.json`. All six Food core source files match the pinned handoff hashes. That JSON is not a runtime release manifest.

- Copy the still room back byte-for-byte: `design/food-supply/art/supply-room.back.svg`, 255763 bytes, SHA-256 `d993437538cd046625d712c21664fa6895c82a0be98540de70e8962f93ba20d1`.
- Bake 36 operator SVGs: `c1` through `c9`, each at `panel`/`winch`, `alive`/`out`. Use the source's exact standing/seated/slumped poses, crew outfit, station placement and cab clipping. Proposed output names are `apps/game/hosted/food-supply/operators/cN-STATION-STATE.svg`.
- Extract only pure drawing helpers and the scene composition into `food-scene.mjs`, `food-machine.mjs`, `food-geometry.mjs`, `food-ink.mjs`. `layout.mjs` imports Task constants; `machine.mjs` imports `STOPS`; `scene.mjs` imports the dev-only crew graph. These imports cannot enter production. Fix drawing coordinates from the approved handoff, and draw physics from accepted packet parameters/anchors only.
- Reuse the nine existing approved app-icon portraits. All nine are byte-identical to the pinned Designer tree and the frozen `design-0.8.0` source hashes (`food-supply-art-adoption.json`); no new portrait artwork is needed. Exact Food tuple dispatch must be reviewed: current `crew-runtime.mjs` deliberately rejects unknown game pins.
- Port the pure icon paths from `design/phone-ui/prototype/icons.mjs` into scoped `food-icons.mjs` with a source pin; do not import `ui.mjs` through `art.mjs`, which would pull the whole prototype/ambient graph.
- `phone.mjs`/`phone.css`/`ui.mjs`/`kit.css` are layout/component evidence. Port the needed DOM/styles with exact source pins; do not import the prototype's controller or fixture navigation.
- Export-only design dependencies may run in a deterministic offline art preparation command after the merged base; only named outputs and isolated approved helpers enter the shipped graph. Drawing jitter is deterministic artwork, never gameplay randomness.
- Integration allocated `design-0.9.0` (tokens `0.5.0`) for additive Food art. The 37 offline static candidates have now been generated and pinned in `food-supply-art-adoption.json`: 3,613,319 uncompressed bytes, 1,032,017 bytes summed gzip size. XML/safe-content/hash checks and deterministic regeneration passed; all 36 nested operator drawings are byte-equal to the source `drawOperator` result. This is offline asset verification, not native visual acceptance or a transfer/performance measurement. Native drawing-helper/UI module hashes will follow implementation; they do not exist yet. Candidates live under `apps/game/candidates/food-supply/assets/` and are not imported or packaged. Integration owns art-manifest allocation, named-file source admission, packager/CI registry and the final test-release gate. Frozen historical art stays unchanged.

Excluded from runtime: `task.mjs`, `stage.mjs`, `rules.mjs`, `boards.mjs`, `scenarios.mjs`, prototype fixtures, synthetic phone/live wiring, practice bots, review sheets/films and any game RNG. No asset failure can grant an action, pause a phase or disclose another audience.

## Evidence and Designer review

Existing comparison IDs affected by common surfaces may include `actions`, `panels`, `board`, `round-order`, `reconnecting` and `largest-text`, according to the final scope. The #223 catalogue has no Food-specific entries. Designer/Integration should add or agree Food sheet IDs before native review; do not claim that the old 49 IDs cover a new Task scene.

Capture all drawn flow, control, pending/refused/unknown/recovery, breakage/brake, death/end and public states at 390x844 and 320x568/200% text, normal and reduced motion. Include maximum permitted names, real safe-area configurations, controls whole on screen, a non-scrolling briefing, simultaneous hazard/offline information, focus restoration and correct role-specific keyboard behavior. Pair each native capture with the pinned Designer state and record source/packet/art hashes.

Meaningful interaction checks include changed-delay/reordered down/up/cancel, double activation, pointer off-control, pointercancel, blur/background, replacement DOM, resize/text reflow during Hold, loss/recovery of both receipts, wrong auth/Task/gesture/crate binding, common return after early loss/cancellation/delivery, and private-audience noninterference. Connected tests use the accepted backend and durable receipts, not the design simulator. Old-match regression and production-graph exclusion remain mandatory.

Physical-phone, real-network, motor-access and real screen-reader/timing-usability evidence must be reported separately from desktop Chromium captures and automated tests. Native merge requires Designer's explicit PR-specific acceptance under #224. This thread does not merge or deploy.

Integration confirmed this delivery consumes authoritative stock/meal evidence and the #231 stock UI. Full #230 ship-life eating visits remain an unadmitted visual dependency; neither their scheduler nor room redraws are adopted here.

## Preliminary contract review

Read the compiling Backend scratch contract at source SHA-256 `e40c6a7c7fc476a80931a23cc82235e08ee309ba70b53536714c2009062aa45c`, without editing it. Integration forwarded seven consumer findings: same-snapshot command context and clock/revision consistency; render-complete motion and mechanism cues; Partner row reasons; durable Join/Cancel closure reasons; bounded and consistent DTOs; canonical public away ordering; and explicit Hold offer/release permissions. These are preliminary draft findings, not final PR acceptance or runtime exploit claims.

The final review also covers holder A / pending intent B recovery: closing only the highest gesture must not leave A held, and releasing A must not let an obsolete B automatically acquire. Recovery needs an atomic or otherwise proven protocol for closing the actual holder and pending intents; no client-invented outcome.
