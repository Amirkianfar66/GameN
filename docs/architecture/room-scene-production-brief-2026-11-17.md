# Seven-room cyber-comic-noir production brief

**Owner request and ownership clarification: 17 November 2026.** Repository: `Amirkianfar66/GameN`. Integration review baseline: `64e55516d2f0026842c5c2a675f2eccda20e0a9e`. Delivery tracking stays in [#222](https://github.com/Amirkianfar66/GameN/issues/222), with the Designer workstream in [#4](https://github.com/Amirkianfar66/GameN/issues/4).

This is the shared production reference for Claude Designer and Frontend. The owner requires seven consistently finished, layered, animated rooms: **Room A, Room B, Command Room, Hospital, Jail, Supply Room and Private Room**. The owner also requires Designer to deliver working visual components and specifically assigned game-side connections, rather than artwork that Frontend must rebuild.

The requirements and boundaries below record that request. The item compositions, suggested loops and asset organization are **Integration's production recommendations for Designer to develop**, not approved finished artwork or new gameplay rules. Designer makes routine creative choices, replaces recommendations with measured geometry and demonstrates the result. Changes to existing approved interface behavior follow the existing owner/Designer exception process. This document creates no gameplay phase, room permission, command, resource, voice feature or deployed release.

## 1. Preserve and build on the actual work

Read `AGENTS.md`, `CODEX_START_HERE.md`, [project context](../project-context.md), the current [ownership agreement](visual-component-ownership.md), [phone handoff](../design/phone-ui-handoff.md), and the applicable current rules. Historical art/motion briefs inform style; their superseded gameplay and renderer proposals are not authority.

| Existing source, inspected reference | What the redesign must account for |
| --- | --- |
| [#197](https://github.com/Amirkianfar66/GameN/pull/197), `4bf93ac57444cb2fcd5e269a9ddc8e41d206ff4d`; [room-drawing release](../design/room-drawing-release.md) | Approved `room-drawing-1.0.0` architecture, four-bed ward and capsule. The design PR is merged; that alone does not prove its art is in a playable release. Preserve it as predecessor evidence and identify replacement assets explicitly. |
| [#261](https://github.com/Amirkianfar66/GameN/pull/261), `bdfe90eee22c0d32b840ebc22336d166dd700cbb`; `docs/design/components/room-scene.md` on that head | Canonical `room-scene-0.5.0`: framing, windows, tags, targets, film layers, stale/concealed states and lifecycle. Extend this source, not a new competing room renderer. |
| [#284](https://github.com/Amirkianfar66/GameN/pull/284), `5f1b1c83f506ea9338dcfc6fdf52954a0967a52c` | Designer's existing game-side connection for all five ordinary Room views. Reuse its integration work. Board, capsule and shared display are outside that connection's current scope. Its source admission remains separate from design acceptance. |
| [#230](https://github.com/Amirkianfar66/GameN/pull/230), `f60c6e80974822eba05c8aee1195e67bc73fb703`; `docs/design/ship-life.md` | Owner-approved activities at all 20 ordinary positions, room view a fifth wider, food dispensers and eating-visit concepts. Preserve the activities; reconcile food visibility with current contracts before connecting visits. Not yet a delivered feature. |
| [#293](https://github.com/Amirkianfar66/GameN/pull/293), `7f034bf41d61a56a022a0b76b009826c63f5fbca`; `docs/design/components/private-talk.md` | Canonical private-talk component and authorized declaration/claim/talk states. Its handoff explicitly leaves walk-in/out films for a later connection; do not mark those complete. |
| [#298](https://github.com/Amirkianfar66/GameN/pull/298), `4a318fc78204ba541b170bfd2643918211e20c18` | Shared Board tags and Room/Board transition. Reuse it; do not create a second camera or label-layout implementation. |
| [#303](https://github.com/Amirkianfar66/GameN/pull/303), `714edac976867dafb2e4ba1a2e35b02d93aec39b` inspected as the current candidate | Canonical Food visual component, being reviewed separately with the Food coordinator/adapter. Supply art must attach to this component without changing its mechanics or delaying that reliability release. The earlier practice simulator is not a runtime dependency. |

These are source pins for this brief, not assertions that all open PRs are admitted, merged or deployed. Refresh affected heads when implementation starts and record the exact consumed graph. Do not merge old stacks wholesale or overwrite historical release bundles.

Relevant authority: [Planet specification index](../specifications/planet-successor/README.md), [rules contracts](../specifications/planet-successor/rules-contracts.md), [Blackout-before-vote decision](../specifications/planet-successor/blackout-before-vote-owner-decision-2026-11-10.md), [Food decisions](../specifications/planet-successor/food-task-owner-decision-2026-11-12.md), [Food return decision](../specifications/planet-successor/food-task-captain-return-owner-decision-2026-11-13.md), [Planet contracts](../../packages/contracts/src/planet-game.ts), [Food contracts](../../packages/contracts/src/planet-food-task.ts), and [window permissions](../../packages/engine/src/planet-game/social.ts).

## 2. One implementer per task

Apply the [existing ownership agreement](visual-component-ownership.md#assigned-game-side-connections-owner-clarification-17-november-2026); this is its work allocation, not a second policy.

| Work | Implementation owner | Reviewer and boundary |
| --- | --- | --- |
| Artwork, layers, masks, prop construction, room layouts, rigs/acting, exterior animation, mechanisms, light, finish and visual states | **Claude Designer** | Frontend reviews feasibility/performance; Integration reviews audience and asset admission. Visual code is Designer work. |
| Canonical scene composition and visual mounting for the room redesign, including assigned game-side connections | **Claude Designer** | Frontend reviews lifecycle, input, recovery and app behavior. Reuse #284. Before touching a game-side file, name it in the task and coordinate with Frontend; no concurrent controller edits. |
| Authorized view-to-component adapters, request/receipt handling, communication, navigation state, recovery, accessibility behavior and runtime performance instrumentation | **Frontend** | Designer reviews rendered output; Backend/Integration review authority. Frontend supplies inputs/callbacks rather than rebuilding visual markup, CSS, rigs or motion. |
| Missing projection fields, eligibility, results, deadlines, persistence and disclosure | **Backend** | Integration owns shared contracts; affected consumers review. Art does not add a command or disclose additional state. |
| Compatible art/component/gameplay combinations, source admission, native review, merge and deployment | **Integration** | Designer's native visual acceptance remains required. Existing matches retain their pinned releases. |

For the first slice, Designer owns the Room B scene and the narrowly assigned mount inside the existing #284 connection; Frontend owns its data adapter and reviews that mount. Record precise file lists before editing. If an existing controller mixes both jobs, assign its change to one person and have the other review it; do not build two controllers.

The preview and game import the **same runtime-safe Designer source**. Review fixtures and simulators stay in development-only directories. Ordinary bundling is allowed; a copied visual implementation in `apps/game/` is not. When a visual correction is needed, Designer changes the canonical source, and both consumers receive it.

## 3. Shared visual construction

### Layer grammar

Every room supplies an exploded layer map and a composed reference. Use the following semantic ordering, with local interleaving at each station rather than one global foreground slab:

```text
FAR       sky / distant planet / nearer stars or dust
          clipped to that room's exterior-window aperture(s)
MIDDLE    rear shell: wall, ceiling, deck, recesses, window frame
          fixed-equipment back / seat back / rear prop parts
          character body and rear arm
          work surface / prop being handled
          character forearm and hand at the registered contact
FOREGROUND furniture lip / lower cabinet / rail / near pipe / door jamb
           restrained light or glass overlay, clipped as appropriate
SEMANTIC  names, targets, controls, focus, timers, authorized status
          outside environmental grading and decorative occlusion
```

Characters remain independent scene instances. A character may occupy several interleaved draw layers while remaining one logical person and one target. Neither a table lip nor a film duplicate may create a second target. A foreground edge may intentionally hide legs/torso, but cannot hide a face, name, required hand contact, offered target or important outcome. Camera fitting includes the approved full painted extent; intended desk/bed occlusion is not accidental cropping.

Use the current room coordinate system as the starting registration space: ordinary rooms `1024 × 768`, Private capsule `512 × 768`. Keep logical slot IDs separate from pixel coordinates. Designer may change art registration only with an explicit transform and corresponding anchors/masks; no silent slot reassignment. Supply retains the Food machine's existing authoritative geometry, translated/scaled only for display.

### Style and room atmosphere

Use a consistent perspective, human/prop scale, lens/cutaway convention and key-light logic. Cyber-comic-noir means ink contours, graphic shadow shapes, selective halftone and luminous machinery within restrained values; it does not require photorealism or a renderer replacement.

| Room | Recommended atmosphere, preserving its identity |
| --- | --- |
| A | Cool blue industrial workspace; warm task lights, functional computers and cargo. |
| B | Violet laboratory; pale specimen glass and controlled cream/cyan instrument light. |
| Command | Amber/gold bridge; dark console silhouettes and a broad exterior view. |
| Hospital | Teal/cyan clinical equipment; legible warm patient faces, restrained medical alerts. |
| Jail | Rust/red industrial confinement; heavy frames and controlled amber security light. |
| Supply | Steel/navy machinery with amber safety paint; clear crane, rail and delivery geometry. |
| Private | Dark navy/violet acoustic enclosure; warm table light and two readable faces. |

These are environmental palettes, never secret faction encodings. Retain approved crew appearance and public hospital/prison clothing. The request permits generated character appearance **references**, not an unrequested replacement of the accepted nine-character release.

### What image generation and code each produce

- Image generation supplies room plates, separated prop parts, material/shadow studies and appearance references. Generate clean plates without people, private facts, authoritative status, baked controls or legible game text. Keep editable source and provenance. Moving parts need hidden/overlap margins, not just the visible front silhouette.
- Designer's code assembles those assets and controls rigs, faces, hands, mechanisms, screens, exterior views, light, environmental finishing, visual states and hit-area presentation. Text and changing indicators are separate semantic layers. Code may move generated parts; it does not invent game outcomes.
- Split anything that needs independent movement, occlusion or state. A desk has back, top and front; a door has jamb, left/right leaves and visible recess; a monitor has housing, screen aperture and code-drawn content; a crane has rail, carriage, cable, hook, crate and safety blade. Avoid redrawing whole room images for each frame.
- Keep visual rigs/contact maps in Designer's canonical modules. Frontend does not recreate hand positions, motion curves, sprite selection, window clipping or filter logic.

### Finishing pipeline

Designer delivers one shared finishing treatment with room and depth parameters, used in both preview and game. Bake static exposure/contrast/color, ink shading and halftone into artwork when practical. Record which finishing is baked so it is not applied twice. Match moving parts and crew with light-touch runtime adjustments; avoid stacking expensive full-screen SVG/CSS filters over every figure.

Recommended layer treatment: far elements have lower contrast; middle establishes room color and light; foreground has stronger ink edges without crushing detail. Protect faces, hands and interaction silhouettes with local masks. Apply no environmental grade to UI, team emblems/colors, meaningful status colors, text, focus rings or target outlines. Decorative monitor glow may be graded; its authorized status indicator remains in the semantic pass. Keep halftone out of small text and suppress aliasing in Board-scale assets.

Provide a neutral-grade fallback, full and Reduce Motion compositions, and a low-effects option that changes decoration only. Low effects cannot hide an authorized danger or change the meaning of a state. Select the runtime technique after measuring the representative scene; no new graphics framework is required by this brief.

## 4. Inventory conventions

The IDs below are **planned production item IDs**, not registered exports or fabricated asset hashes. Their position descriptions are the blockout; Designer supplies measured rectangles, pivots, contact points and hit areas in the final registry. Existing slot and machine geometry constrains them.

Depth: **F** far, **M** middle, **G** foreground. A multi-part item may span more than one. Drivers:

- **D — decorative:** start only while the authorized scene is visible, fresh and motion-enabled; loop or finite gesture as specified; stop on conceal, suspend, dispose, scene exit or Reduce Motion. No input, role, inventory, pending command or microphone inference.
- **A — automatic presentation:** follows a supplied public/current phase or visible scene state. It does not create a timer or mutate gameplay.
- **E — authorized event/state:** run only for an audience-authorized current state/result. Submission/pending is not resolution. Deduplicate, cancel on superseding state and do not replay historical effects on reconnect.
- **I — input presentation:** local press/focus/selection feedback is immediate; the callback goes to Frontend. Only an authorized receipt/result changes the represented gameplay state.

Every row inherits those start/stop rules. “Loop” always means a bounded, subtle visible-scene loop under D, never a background timer that continues offscreen. “No input” means decorative even when a character appears to operate it. Supplied eligibility governs all interactive items. Unavailable reasons come from the server or the existing neutral fallback.

## 5. Room A — industrial operations

**Layer map:** shared sky → round exterior aperture → rear wall/window rim/ceiling/deck → PC, locker and crate backs → A1–A5 bodies → workstation surfaces and handled props → hands → desktop lip/crate fronts/near pipes → semantic overlays. Interior communication windows have their own masks and never render the exterior sky.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| A01 Shell: full M, floor behind all five slots | Wall, ceiling, floor and recess plates; frames separated from their openings | Still; only separately clipped light changes | No input | Lit/dim/dark; A/E lighting only |
| A02 Exterior porthole: upper rear M rim around F | Static rim/glass highlights; separate aperture, far planet/stars/dust | Shared decorative voyage inside aperture; loop while visible; static sample in Reduce Motion | No input; never a navigation selector | Lit/dim; D, no route or faction data |
| A03 PC at A1: M back and top, G front lip | Monitor/desk/chair backs; keyboard, display mask, hand contacts, chair/arm rig | Short typing/read/glance gestures with rests; neutral code-drawn screen cycle; stop for player event/targeting | PC activity is decorative; A1 remains its ordinary character target | Rest/working/interrupted; D |
| A04 A↔B communication window beside A1: M opening/frame | Glass/frame plus separate drawing surface and permission affordance | Published drawings appear after authorized Show; no live-stroke animation or automatic clearing before round expiry | Endpoint viewer opens 2D view; A1 occupant may draw only if offered; tap/focus and Show receipt | View-only/draw-enabled/draft/sending/published/expired; I/E, endpoint audience |
| A05 Clipboard station at A2, near A↔Hospital window: M | Clip/table rest; separate clipboard and pen, hand grips | Read/check/put away, then rest; interruptible | Clipboard decorative; no inventory gained | Rest/reading; D |
| A06 A↔Hospital communication window at A2: M | Frame/aperture/drawing plane separated from nearby clipboard | Same published-drawing lifecycle as A04 | Viewing for endpoints; drawing only eligible A2 occupant; no Hospital drawing station | View/draw/pending/published/expired; I/E |
| A07 Service hatch at A3: low M, G rim | Hatch cavity, rim, seated support; separate tool and small fitting | Wrench/fitting/sit-back loop; hatch does not become a movement route | No input; actual player target remains A3 | Rest/working; D |
| A08 Cargo at A4: M stack backs, G crate fronts | Fixed safe stack; separate small parcel/strap/labeling prop | Lift a small prop, inspect strap and replace; fixed start/end registration | No input; decorative parcels are not Food or weapon supplies | Rest/handling; D |
| A09 Electrical work at A5: M wall panel | Housing/backplate; separate connector/tool/hand contact, neutral display | Plug/check/wrench gesture with rests; no power loss from idle acting | No input; it is not a Blackout activation control | Rest/working; D |
| A10 Ration dispenser: M wall recess between pillar/lockers | Housing, opening, sliding hatch, tray, portion/wrapper and hand target | Hatch/portion/meal visit only for authorized meal/stock view; one shot, then settle | No new Eat button; existing meal rules govern it | Stocked/empty/unknown/visit; E, no inferred private meal |
| A11 Near utilities and light: G perimeter pipes, M fixtures | Static pipe fronts; separate lamp cone/vent louver | Gentle vent/lamp variation; off/held under supplied blackout treatment | No input; cannot obscure targets or draw attention to secret actions | Idle/dim/dark; D/A/E |

## 6. Room B — laboratory

**Layer map:** shared sky → central rear window mask → lab shell/frame/right instrument screen → tank and bench backs → B1–B5 bodies → stool/laptop/bench tops/flasks → hands → bench front and near tank rim → semantic overlays. Preserve B's approved exterior window; the atom diagram belongs on the separate small instrument screen.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| B01 Shell: M lab walls/ceiling/deck | Clean plates, shelves and window frame; no people baked into bench | Still; grade/light states follow supplied scene | No input | Lit/dim/dark; A/E |
| B02 Exterior window: central upper wall, F behind M panes | Aperture, frame/glass; shared sky elements separate | Same voyage clock as A/Command/Hospital with approved view offsets; clipped loop | No input; no actual ship-direction cue | Lit/dim; D |
| B03 Small instrument screen: right wall M | Static housing, separate code-rendered aperture/content | Neutral atom/instrument loop with pauses; freeze under Reduce Motion | No input; cannot depict Scan, Code, hidden roles or real system status | Idle/off; D/A |
| B04 Tablet at B1: M near deck/front workstation | Separate tablet, supporting arm and fingers; surface/back independently layered | Scroll/tap/look up then rest; no real messages displayed | Tablet decorative; its character remains targetable | Rest/working; D |
| B05 B↔A window beside B1: M | Communication aperture/frame and published drawing plane | Authorized append and same-round expiry; no live draft broadcast | Endpoint view; B1 drawing only when offered; local draft/Show feedback | View/draw/pending/published/expired; I/E |
| B06 Laptop at B2: M stool/top, G desk/stool lip | Laptop base/lid hinge, display mask, separate hands/chair | Type/lean/tilt; lid has bounded pivot; return to settled pose when interrupted | Decorative laptop, not Hack Spaceship or final Code input | Rest/working; D |
| B07 B↔Jail window beside B2: M | Separate frame, drawing plane, authorized view affordance | Same authorized drawing lifecycle | B2 may draw when offered; Jail may view but not draw | View/draw/pending/published/expired; I/E |
| B08 Specimen tank at B3: M glass/back, G lower/front rim | Tank/back, glass/reflection mask, separate cloth and hands | Wipe/look; optional slow neutral bubbles within liquid; stop when suspended | No input; contents are not Alien clues | Rest/wiping; D |
| B09 Sample station at B4: M bench back/top, G edge | Shelves/tubes/tray; separate flask/hand grips; bench front separately occludes body | Lift/check/replace flask with rests; no resource change | No input; flasks are not Doctor injections | Rest/handling; D |
| B10 Microscope at B5: M bench top | Base/stage static; separate focus knob/head/arms and small flask | Lean, focus, sit back; bounded contact points | No input; activity does not imply Scan or investigation | Rest/working; D |
| B11 Ration dispenser: right bench end M, G bench lip | Housing, hatch, portion/tray/wrapper and approach/contact anchors | Authorized finite visit; return visually to original slot, keep logical target | No new Eat action; no stock inferred from decoration | Stocked/empty/unknown/visit; E |
| B12 Foreground bench/lighting: G and M fixtures | Counter lip/cabinet fronts, ceiling fixtures; separate light masks | Static occlusion; gentle decorative light while lit, no secret-action flicker | No input; hands and targets stay legible | Lit/dim/dark; D/A/E |

## 7. Command Room — public office, private navigation

**Layer map:** sky → wide exterior aperture → bridge shell/window ribs/rear console → C1 chair back/body → table surface and console buttons → hands → table front/near chair edge → semantic overlays. Attach Private capsule beside the bridge at half its width; it is not a second Command seat.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| C01 Shell and bridge glazing: M | Floor/ceiling/wall/console recesses and thick window ribs | Still; supplied room lighting only | No input | Lit/dim/dark; A/E |
| C02 Exterior panorama: F behind wide rear mask | Distant scene parts and clipped stars/planet; separate glass sheen | Shared voyage loop; no secret navigation direction or tie indication | No input | Lit/dim/static reduced; D |
| C03 Captain station at C1: M chair/back/table top, G table lip | Chair, table back/top/front; separate tablet/arms/fingers | Neutral instrument check and hands-at-rest; stop for actual console event | C1 remains public player/office target as authorized; idle never points Blue/Red | Rest/working/command cue; D/E |
| C04 RELEASE console: M at C1 reach | Housing/button face; separate depression/light, clear label in semantic layer | Immediate press feedback; command sequence only on accepted resolved authority; settle to used state | Existing Captain offer only; intent callback and pending/receipt feedback | Available/unavailable/pending/used; I/E, public outcome only |
| C05 EJECT console: M protected adjacent control | Housing, hinged safety cover/pivot, separate red button/light | Cover/press staging follows existing interaction; authorized alert one shot; never cover active controls | Existing eligibility/confirmation behavior retained; no new extra confirmation step invented by art | Covered/available/pending/used/unavailable; I/E |
| C06 Navigation instrument: M console aperture | Neutral physical panel; dynamic content separate | Ambient public idle; private final direction/office prompts only in authorized own-phone layer | Captain/Officer receive existing offered controls; others see neutral instrument | Idle/private-offer/pending/confirmed; D/I/E by viewer |
| C07 Ration dispenser: M right console near window | Housing/hatch/tray/portion and reach contacts | Finite authorized visit/meal, no implied contribution or route information | No new Eat input | Stocked/empty/unknown/visit; E |
| C08 Capsule connection: M side junction, G door jamb | Bulkhead seam/threshold, separate door leaves and route anchors | Public authorized pair walk/entry/exit; no voluntary movement command from this door | Existing Private Talk flow only; no new adjacency | Closed/entry/occupied/exit; E |
| C09 Near rail and lamps: G lower rail, M ceiling | Static safe-edge occluders, separate light pools | Subtle loop while lit; event alerts only when permitted | No input; preserve readable C1/body/hands | Rest/lit/dim/alert; D/A/E |

## 8. Hospital — exactly four beds for the current rules

**Layer map:** sky through actual ward window → clinic shell/window frame → four bed backs and monitor housings → patient bodies → mattress/blanket/contact props → hands → bed lips/rails/near equipment → semantic medical state and private panel controls. Do not revive the historical seven/nine-bed layout for current matches.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| H01 Shell and exterior window: M frame, F aperture | Clinic plates/frame; sky clipped to existing rear window | Shared decorative voyage, never a patient's hidden survival information | No input | Lit/dim; D/A/E |
| H02 Bed H1: M head/back/mattress, G lower rail | Independent bed pieces, blanket, patient pose, hand/head contacts | Authorized occupied patient rests/breathes; event overrides; static rest under Reduce Motion | Patient target only if offered; bed is not selectable treatment by itself | Empty/occupied/rescue cue/vacated; D/E |
| H03 Bed H2: separate registered slot, same depth split | Its own bed/frame/masks/contacts; no shared SVG IDs | Same H02 lifecycle, independent patient instance | Same authorized target policy | Empty/occupied/rescue cue/vacated; D/E |
| H04 Bed H3: separate registered slot, same depth split | Its own bed/frame/masks/contacts | Same H02 lifecycle; preserve its visible face/tag | Same authorized target policy | Empty/occupied/rescue cue/vacated; D/E |
| H05 Bed H4: separate registered slot, same depth split | Its own bed/frame/masks/contacts | Same H02 lifecycle; no fifth bed or hidden overflow occupant | Same authorized target policy | Empty/occupied/rescue cue/vacated; D/E |
| H06 Medical monitors: M at each bed's rear | Static housings, separate waveform and status zones | Generic life-sign loop from disclosed health; flatline only after authorized elimination; no predicted death | No input; countdown/status remains semantic and server-driven | Idle/critical/stabilizing/inactive; D/E |
| H07 Hospital panel: M wall/in-reach visual, own-phone semantic input | Static housing, screen mask, keypad art; actual keys/content drawn separately | Local focus/press/pending; accepted request is queued, not an immediate healing animation | Existing patient-only panel offer; number input emits intent, private receipt; never expose Doctor number or code digits publicly | Unavailable/available/editing/sending/accepted/rejected/spent; I/E private |
| H08 Medical drone: M ceiling dock through near bed working plane | Dock/static cables; separate body, lens, articulated arms, scan mask and pivots | Alert → descend → scan → revival pulse → stabilize → dock, once for an authorized Rescue outcome; stop on newer state | No player drone button; never show a beam from the Doctor/initiator | Docked/working/returning; E, permitted rescue audience |
| H09 A↔Hospital window: M wall opening | Interior frame and published drawing plane, distinct from exterior window | Authorized drawings and same-round expiry | Endpoint view only in Hospital; no drawing position/keypad shortcut | View/empty/published/expired; I/E |
| H10 Life-support/near cart: G cart/bed equipment, M cables/lights | Static cart/front; separate monitor lights/medical effect masks | Quiet ambient; authorized flatline/shutdown one shot, then current state | No input; patient departure/removal comes from supplied placement, not end of film | Idle/critical/shutdown; D/E |

Keep a rescued person's identity/figure visible through the result; use the authoritative post-Rescue location/slot rather than assuming they stay in bed or choosing an exit. No food dispenser in Hospital. A full Hospital or permanent elimination is decided by the engine; artwork cannot allocate another bed or retain a phantom target.

## 9. Jail — five positions, confinement without new powers

**Layer map:** rear wall/security door → bench/cot backs and security fixtures → J1–J5 bodies → seat surfaces/hand props → hands → bench fronts, door jamb and safe near bars → semantic overlays. No exterior layer is required: retain the windowless cell. The B↔Jail interior window is not a space window.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| J01 Cell shell: M walls/deck/ceiling | Industrial plate, seams and recesses | Still; automatic ambient light only | No input | Lit/dim/authorized alert; A/E |
| J02 Bench J1: M back/top, G front | Bench pieces and hand/elbow contacts | Lean/look/hands at rest; subtle bounded loop | Character target only if offered | Rest/idle; D |
| J03 Door-side J2: M | Static standing area/door slit, separate person rig | Rise on toes, glance at slit, settle; never pick lock or imply escape | No escape input; character target policy unchanged | Rest/look; D |
| J04 Wall-side J3: M | Wall contact/footrest, independent arms/legs | Shift weight/arms, pause | No input beyond authorized player target | Rest/idle; D |
| J05 Floor J4: M deck | Sitting support/contact/shadow | Straighten/finger tap, rest | No resource or escape action | Rest/idle; D |
| J06 Cot J5: M back/top, G edge | Cot pieces/blanket and head/hand contacts | Head turn/stretch/settle | Authorized player target only | Rest/idle; D |
| J07 Security door/airlock: M leaves, G jamb | Door recess, independently moving leaves, locks, warning light; exterior void only during authorized EJECT | RELEASE unlock/open/exit/close or EJECT alert/open/removal/close; no idle opening | No local unlock keypad action; Captain outcomes come from server | Closed/releasing/ejecting/empty; E |
| J08 B↔Jail window: M interior aperture | Frame/glass/drawing plane | Authorized appended images until same-round expiry | Endpoint viewing; no Jail drawing station | View/empty/published/expired; I/E |
| J09 Ration hatch: M between door frame/keypad | Housing/sliding hatch/tray/portion | Finite authorized meal visit; no visit during superseding transfer/EJECT | No new Eat action | Stocked/empty/unknown/visit; E |
| J10 Keypad, lights and near rails: M fixtures/G edges | Static unused security keypad and pipes; separate indicator/lamp overlays | Neutral standby, then authorized alert; no fake key presses or role-specific flashes | Keypad decorative; no false usable affordance | Standby/alert/off; D/E |

Only supplied physical Jail occupants participate in a RELEASE/EJECT scene. Hospital detention reservations do not become visible prisoners. Jail capacity and reserved places stay authoritative; no reflow creates a sixth slot.

## 10. Supply Room — the existing two-person Food Task

**Layer map:** windowless rear bay → machine frame/rail/supports/cab backs/intake cavity → operators → machine working parts and operator hands → controlled crate/cable/blade layers according to actual geometry → platform front/guardrails/cab edge → task controls and authorized warnings. Do not add space through a fake window or redraw the physical machine to change its hit geometry.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| S01 Bay shell: M rear wall/deck/ceiling | Clean industrial plate with visible working envelope | Still; decorative small machinery only outside hazard envelope | No input | Lit/inactive; D/A |
| S02 Rail and stops: upper M, behind moving carriage | Static registered rail/stops/supports, semantic stop markers | Stationary geometry; authorized current position indicator | No direct tap-to-teleport crane control | Ready/running/locked; E |
| S03 Panel carriage and blade: M working plane | Separate carriage, safety blade, pivot/translation anchors and light mask | Render authoritative motion/lock/cut state; visual interpolation cannot choose a stop or outcome | Existing RELEASE/LOCK intents through canonical controls; immediate pressed state, receipt reconciliation | Moving/locked/pending/unsafe/disabled; I/E |
| S04 Winch and cable: M from carriage to crate | Motor housing, spool, extensible cable, hook and brake pieces | Draw supplied lift/hold/drop/brake state; never infer a successful catch from finger-up alone | Existing Hold press/release lifecycle; Frontend owns communication/session recovery | Idle/waiting hold/lifting/held/dropping/braked; I/E |
| S05 Intake: lower M under approved stop 1 | Hatch rim/cavity, separate platform/crate appearance and masking | Crate rises only as authorized; intact return/new crate use supplied state | No extra Fetch button; preserve early-Hold behavior | Empty/available/rising/returned; E |
| S06 Cargo crate: M/G as machine geometry requires | Intact box, suspension attachment, separate broken pieces/effect mask | Swing/drop/land/break from authorized machine clock and result; finite debris disappears without obscuring controls | No dragging or client-side outcome; broken crate does not reduce food by visual inference | Suspended/swinging/landed/broken; E |
| S07 Delivery platform: M top/G lip at approved stop 6 | Platform back/top/front, key station and package placement anchors | Settled delivery/key sequence only when accepted; no celebration while pending | Existing key action when offered | Empty/landed/key pending/delivered; I/E |
| S08 Winch operator cab: M back/G rail at approved stop 7 | Cab back, seat/control support, individual crew rig and hand contact | Operator press/hold reactions and authorized danger/reaction; no speculative death | Only assigned operator's current controls; other participant can see permitted machine facts | Active/offline/unsafe/resolved; I/E |
| S09 Panel operator station: M console/G front | Housing, controls, rig/hand contacts; no person in background | Press/release/look and authorized reactions, synchronized with accepted state | Assigned Panel controls only | Active/pending/offline/unsafe/resolved; I/E |
| S10 Safety lights and result effects: M light/G constrained effect | Warning lens/static stripes, separate semantic warning and impact pieces | Supplied hazard cue/result only; Reduce Motion preserves danger without decorative flashing | No confirmation delay or extra control invented; warnings readable during touch | Neutral/warning/known result/unknown receipt; E |
| S11 Near pipes, guardrails and bay threshold: G perimeter | Static occluders with safe margins; separate entry/exit pieces if existing flow uses them | Decorative ventilation; authorized arrival/common return only, no timer extension | No manual Supply-room movement door | Idle/arrival/return; D/E |

Retain the Food Task's existing Hold/release commands, safety rules, stop geometry, 50/200/150 ms panel timing parameters and server-owned outcome. This redesign is **not** a second real-time simulation or a reason to roll back the coordinator work. Cosmetic controls can acknowledge touch immediately but cannot display a confirmed lift, hit, meal or delivery without the approved state. Reuse the canonical Food component and its corrected private-state lifecycle.

Supply is a participant-only task surface, not a sixth ordinary destination. Other phones/shared display get the approved public absence/common-return information, not the machine state, private waiting Hold, outcome or participants' private defenses. A Board-scale Supply composition is a design reference for authorized surfaces; it does not add a public live task feed or a new navigation control.

## 11. Private Room — two-person conversation capsule

**Layer map:** rear acoustic wall/ceiling → chair backs/table support → two participant bodies → table top/held neutral props → hands → table lip/chair fronts/door jamb → public pair labels or pair-private overlays according to audience. No exterior layer is required.

| ID / position and depth | Static artwork / separate moving pieces | Animation and lifecycle | Interaction and feedback | States / driver |
| --- | --- | --- | --- | --- |
| P01 Capsule shell: M beside Command, half its width | Back/floor/ceiling/acoustic panels; no characters baked in | Still; restrained light atmosphere | No voluntary movement input | Empty/occupied; A/E |
| P02 Sliding door: M leaves/G jamb | Static opening/recess, separate left/right leaves and door pivots | Open for authorized pair entry, close, open/exit/close; one sequence per event, no obsolete replay | Existing Hack flow only; no door button | Closed/entering/occupied/exiting; E |
| P03 Left chair/body anchor P1: M back/G front | Chair pieces, independent selected crew rig, seated hands/feet | Walk-in then subtle listen/head/hand gesture/rest; stop on phase end, conceal or Reduce Motion | Participant target remains its authorized logical game placement; no extra occupant | Empty/entering/seated/exiting; E plus D acting |
| P04 Right chair/body anchor P2: opposite P1, same split | Independently registered chair/rig/contacts | Same neutral rhythm with variation not linked to voice or role | Same logical-placement rule | Empty/entering/seated/exiting; E/D |
| P05 Table: central M top/G front lip | Back/support, surface, front edge; independent hand contact points | Still; hands may rest/gesture above surface | No tabletop Code/claim artifact displayed publicly | Empty/in use; A/D |
| P06 Overhead lamp/dust: M fixture and clipped light volume | Housing, separate light cone and sparse dust | Gentle neutral loop while occupied; static safe lighting in Reduce Motion | No input; never driven by microphone, confession or selected Promise | Off/occupied/static; D/A |
| P07 Busy indicator/pair display: M hardware plus semantic labels | Static indicator housing; public pair names/timer supplied separately | Indicates authorized session only, same timing for all roles | Existing participant Promises/My card controls remain private in canonical UI | Available/in session/ending; E/I as existing flow permits |
| P08 Threshold/routes: M floor/G near edge | Registered entry/exit routes, door thresholds and occlusion masks | Both visibly walk to capsule and return to supplied placements; no gameplay movement spent | No tap-to-travel control; existing talk access only | Entering/talking/returning; E |

Keep the approved position beside Command and width ratio **1:2**. It is a presentation annex, not a new playable location, capacity or targeting exception. Walks are public where the authorized pair is public; conversation/declared side/Promises remain pair-private. Use the existing full **60-second conversation**, separate from declaration and claim stages. Entrance cannot consume that time; wire it to an approved presentation boundary. If a boundary/input is missing, report it before runtime adoption rather than adding client delay. Reconnect restores the current stage without replaying entry. No new voice/network feature is implied by animated talking.

## 12. Cross-room characters, events and interaction rules

The 20 ordinary station activities above preserve the approved #230 concepts. An activity belongs to the **slot**, not a secret role. A supplied seat keeps its identity, slot target, name and permitted status when decorative body movement temporarily leaves its resting pose. Rig layers require unique instance ID prefixes for SVG masks/gradients and reuse of mounted geometry, not whole-figure reconstruction every frame.

Visual priority is: conceal/dispose → newest authoritative placement/health/phase → required targeting/controls → authorized result cue → decorative acting. Targeting may locally settle an idle pose without implying any gameplay change. Use supplied frozen geometry throughout Blackout, including resize and Room/Board switches. Opening in the dark uses the approved PRE_BLACKOUT snapshot or the existing all-slots fallback; never infer occupants from silhouettes, occluders, shadows or private targets.

The 5-second lit preview and 10-second dark interval retain their current authority and sequencing. Exterior windows may retain the approved dim voyage under the dark layer; room lights/screens/characters must not leak silhouettes. Do not replace all blackout artwork with an arbitrary full-screen effect that erases approved behavior. Clone/Protection blocked impacts remain identical for their permitted room audience and reveal no cause or grantor. Rescue originates in Hospital, not from the Doctor's figure. EJECT/RELEASE depict supplied prisoners only. Private activation cannot change public light, asset loading, sound, camera or idle animation.

### Data and lifecycle surface

Extend existing component contracts rather than inventing a parallel API. The following describes required inputs, not a new production schema:

| Input/output | Owner and permitted use |
| --- | --- |
| Exact component/art/gameplay versions; room/surface kind | Integration admits compatible combinations. Unknown/mixed combinations fail safely; older matches keep old sources. |
| Current viewer/audience, fresh/stale/concealed status | Frontend supplies only authorized information. A viewer change/conceal clears private caches, pending visual choices and labels; a partial update cannot resurrect them. |
| Visible occupants, stable slot IDs, selected public crew appearance, health/office/clothing facts | Backend projection through Frontend adapter; no full private engine state in a scene. |
| Approved timing/lighting window; current visual event IDs and permitted recipients | Server clock via Frontend. Local animation completion never advances phases. Duplicate delivery does not repeat a cue. |
| Scene geometry, masks, anchors, camera bounds and finish presets | Designer's versioned production data, not inferred gameplay. |
| Own offered targets/controls and supplied unavailable reason | Private adapter input; public surfaces never receive it. Press areas map through the same camera transform as the art. |
| Published window drawings and viewing/drawing offers | Endpoint-scoped projection only. Local draft is private; Show is a command; expired images disappear from current state. |
| Food stock/turn/meal inputs | Preserve public finalized stock versus player-current stock and `ownMeals`. Current public `turnEnds` deliberately have null placement: do not turn them into public eating paths by guessing a location. See the dependency below. |
| `onSeat`, `onSlot`, `onControl`, focus return and existing lifecycle methods | Designer implements the visual callback/mount; Frontend validates current offers, constructs commands, handles receipts/navigation/recovery. Preserve existing callback names wherever possible. |

Use the existing mount/update/suspend/resume/dispose semantics. New private input must be supplied after conceal/viewer change. A stale room is visibly stale and has no active controls. Offscreen/suspended views release animation work; resumed views reconcile current state. No late response or event callback may revive a disposed screen. Mechanism prediction/interpolation follows the existing Food contract, not an invented decorative clock.

### Two distinct window systems

Exterior apertures show one shared decorative space voyage with room-specific framing/offsets. They reveal no real navigation totals, hidden direction, tie, branch/reality or game result.

Interior gameplay windows remain exactly **A↔B, A↔Hospital, B↔Jail**. Current drawing stations are **A1/B1 for A↔B, A2 for A↔Hospital, B2 for B↔Jail**, as implemented in `planet-game/social.ts`. Endpoint occupants may view when permitted; Hospital/Jail have no drawing station. Drawings are attributed player claims, appended in chronological order and expired with their round. They are not verified facts or a new voice channel. Keep the exterior and interior aperture IDs/masks separate.

## 13. Required asset and component handoff

Designer delivers the registry with the artwork, not placeholder files represented as ready. Each item row above maps to one or more actual assets and component parts. Use the current release/catalog mechanism; propose any registry extension to Integration instead of creating a competing release selector.

For every registered asset/part, include:

1. Stable room/item/part ID; source path; exported path; content hash; dimensions/viewBox; format/alpha; source/provenance; exact component version; export recipe; replacement/predecessor ID.
2. Registration origin, room-to-local transform, depth group and local draw order. State what occludes it and what it occludes. Every mask and SVG reference has an instance-safe prefix strategy.
3. Exterior aperture masks, interior-window masks, screen-content masks, foreground occlusion masks, face/readability protection masks, lighting masks and any silhouette/contact shadow.
4. Feet/seat/bed anchors, left/right hand contacts, grip orientation, reach range, prop sockets and eye/look targets. Keep frame-independent slot/press/badge anchors separate from acting offsets.
5. Mechanism pivot/axis, translation bounds, rest/open/closed positions, easing or authoritative interpolation source, safe overlap and hidden-backside artwork.
6. Interaction geometry and accessible label/role; current offer key; callback; local press/focus/pending feedback; known unavailable/stale/concealed behavior. A noninteractive prop explicitly says none.
7. Full state list and transitions; start trigger, loop/rest duration, stop/interruption policy, final settled pose, Reduce Motion variant and allowed audience for each effect.
8. Finish preset and baked-vs-runtime adjustments, protected semantic layers, quality/LOD variants and camera-safe extents.
9. Exact dependency graph: runtime-safe imports/assets versus review-only fixtures, captures and videos. No fixture simulator or synthetic result becomes a runtime source.

Provide source layers plus fully composed reference images, an exploded layer image, anchor/mask/hit-area overlays, and a short live preview per room. The preview must mount the final reusable components. Flattened beauty shots and videos alone do not complete the handoff.

## 14. Room/Board composition and camera margins

Review at **390 × 844** and **430 × 932**, within the existing top/bottom bars and phone safe areas. Broader screen coverage stays deferred; honor current text-size settings, focus visibility and Reduce Motion at these sizes. The screen does not scroll to expose the room; functional sheets retain their existing accessible scrolling where needed.

| Composition | Required reference |
| --- | --- |
| A/B Room | Empty, one person, all five positions, interactive-window permission, targeting, lit/dark and stale. Match whole-figure framing and a fifth-wider approved view without shrinking semantic targets. |
| Command Room | C1 occupied, visible console controls, private navigation on an authorized phone, neutral public panel; Private capsule beside it at half width. |
| Hospital Room | Zero/four beds occupied, patient panel private, rescue and removal states; all four faces/statuses legible. |
| Jail Room | All five figures whole, window view, release/eject aftermath; no inferred Hospital reservation body. |
| Supply participant view | Both stations, hold/moving/locked/braked/drop, waiting/recovery and known result; retain authoritative machine geometry and usable controls. Supply Board-size reference must not expose the participant-only task to other viewers. |
| Private Room | Empty, entering, two seated, exiting; public pair versus private controls/claim; no private content in a public composition. |
| Board | Existing five-room arrangement plus the approved Private annex; stable slot/target registration and readable tags. Supply is rendered only in its authorized existing flow; a miniature art reference is not permission to add a destination or public task feed. |

Designer specifies the **permitted camera envelope before exporting**. Supply enough real image beyond every permitted crop for the widest zoom, pan and parallax: include the approved ceiling/deck extension approach where applicable, not stretched edge pixels. A useful starting recommendation is a 10% reserve around the computed maximum visible bounds; the measured envelope, including the 0.8 room scale, takes precedence. No fixed 10% claim is a substitute for checking all camera endpoints. Mark safe areas for faces, hands, tags and mechanisms.

The normal gameplay camera remains stable and readable. Use the existing Room/Board transition; no new roaming camera or motion during Blackout. Reduce Motion uses a stable composition without decorative parallax, travel, idle drift, shake or zoom; essential state changes and controls remain visible. Gameplay-timed machinery must still show its current position and danger accurately in Reduce Motion, without added bounce, flash or camera movement.

## 15. Build in small, reviewable deliveries

1. **Designer: map and representative Room B.** Inventory all seven rooms using this brief, reconcile existing assets, and implement Room B with its exterior window, split bench, two hand contacts, one activity, one interior-window control and shared finish. Preview uses the canonical source. Reuse the current #261/#284 work.
2. **Designer + Frontend: early native connection.** Designer implements its assigned mount; Frontend implements/reviews the adapter and functional lifecycle. Show the actual room with current public/private data, dark fallback, stale/concealed state and Reduce Motion under production headers. Resolve source/interface constraints here before multiplying assets.
3. **Designer: remaining six scenes.** Expand the approved component grammar and the per-room inventory. Supply/Private reuse their canonical components and existing permissions. Deliver each room's registry, maps, compositions and working visual states; no Frontend reconstruction stage.
4. **Backend + Integration: only real input gaps.** Audit food-dispenser availability and authorized eating placements: public finalized stock and neutral turn events alone are insufficient to broadcast private meals. Verify public capsule entry/exit timing and allowed viewers against the actual match version. Supply missing inputs through a focused contract change if required; do not infer them in a scene. Complete independent artwork while this is resolved.
5. **Integration: exact adoption.** Register the new room/component/art combination after review, including all inherited capabilities. Do not guess a release number or broaden `>=` version acceptance. Preserve previous matches, Role/Boarding films, crew, phone shell, targets and Food capabilities. Track each included item through #222; approved omissions need an explicit owner decision.
6. **Frontend review + Designer acceptance + Integration release.** Verify the real component under production policy, gather native acceptance and publish the reviewed artifact only after the relevant gates pass. Verify release identity and visible affected journeys after publication.

The room redesign is a separate deliverable from the current Food coordinator/input-latency correction. It does not invalidate independent unchanged Food evidence or add seven new rooms to that release's merge gate. Conversely, completing Food does not mark these rooms delivered. Existing approved room, ship-life, capsule and window work stays tracked; this brief does not silently cancel or defer it.

## 16. Acceptance and actual evidence

For this documentation change, verify referenced paths/pins, inventory coverage and the diff. Do not run gameplay simulations or the full suite merely for prose.

For subsequent implementation, require evidence proportional to each change:

- Each of the seven scenes has a real layer map, all item rows resolved to assets/code, mask/contact/pivot/hit-area overlays, Room/Board reference and full/reduced live preview. Every item has explicit state, input and start/stop behavior.
- One canonical visual dependency graph is consumed by preview and actual game; the native bundle contains no review fixtures, practice simulator or duplicate maintained visual implementation.
- Captures and short motion recordings identify exact source/art/configuration at both phone sizes, from deployed code or a production-header harness. Show room/crew/props actually rendering, not just a file existing or a phase being reached.
- Native tests/checks cover only changed lifecycle, data mapping, audience boundaries and interactions: private panel/claims do not reach public surfaces; input cannot fabricate a result; targets stay aligned with camera and Blackout; conceal/reconnect/suspend/dispose do not revive private or obsolete content.
- Inspect lighting/halftone/readability, complete figures, hand/prop alignment, slot stability, focus/accessibility and Reduce Motion. Ambient animation stops offscreen. Food inputs remain responsive and separate from decorative work. Measure first paint, frame time, retained nodes/memory and sustained animation on named devices before making performance claims; desktop emulation is labeled as such.
- Designer's explicit native acceptance is in each phone-interface PR. Frontend's connection review identifies the exact code. Integration records approved includes/exclusions, checks, actual deployment identity and remaining limitations in the existing delivery record.

**Evidence for this brief:** repository source and named Designer handoffs were inspected. No new artwork, room animation, native visual acceptance, phone performance, game behavior test or deployment is established by this document. Designer finalizes creative geometry; Backend/Integration return only material missing gameplay/disclosure decisions to the owner. No routine art decision needs a new approval questionnaire.
