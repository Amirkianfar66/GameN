# Crew runtime adoption handoff

Frontend branch `codex/frontend-crew-runtime-adoption` is based on main's registration merge `a1ad3e541f3b7ea0789b4ec2f2dd777c7764f414` (PR #195). Designer source is exact `8cee39d89798390d03c2a4a9fe457fa6de387bda`. The 17 drawing copies already incorporated in registration remain unchanged. The consumer implementation and desktop review evidence are ready for Integration and Designer review; publication and activation remain pending.

## Consumer behavior

`design-0.7.0` selects the reviewed crew only with the existing exact Planet gameplay pins: protocol 3, engine `planet-game-1.1.0`, ruleset `in-person-planet-private-feedback-2026-11-06`, hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. Mixed 0.7 tuples are rejected. `design-0.6.0` retains its historical factory, variables and drawing behavior.

The consumer uses stable SVG nodes, continuous body updates, fixed-pose blink/hair updates, reference-counted shared heads, unique instance prefixes and a bounded cache for named static templates. Continuous motion samples are not cached. Visibility, focus, reduced-motion and disposal handling release or suspend owned work. The effective app-or-device Reduced preference reaches board/capsule, Hospital/film, private Clone, scene-board, phone-kit and travel scopes; toggles reset follow and update mounted head attributes immediately. The reviewed reduced mode retains blinks and meaningful poses. Picture surfaces use all nine baked square app icons. The three scoped crew bundles load uniformly with the other common art before private data; opening the own card makes no additional asset request.

The old rig, gestures, walk sampling, easing, slots, phase clocks, gameplay, history, service defaults and 17 reviewed copies are unchanged. The inherited current tuple retains its dedicated six-second `BLACKHOLE_PRESENTATION` followed by a full Jail vote, uniform 15-second navigation setting and S7 EJECT drawing. Shared registration, source/port pins, token exports, catalogs, release manifests and the hosted build plugin remain Integration-owned.

## Validation

| Check | Result and scope |
| --- | --- |
| Frontend suite | 900 passed before the preference correction; final rerun also passed all 900: 217 presentation and 683 game tests, no failures. |
| Type checks | Pure and browser checks passed; TypeScript build passed. |
| Designer source | 16 tests passed. 420 independent desktop comparisons passed: 120 continuous walk, 288 exit/arrival blend and 12 rear-hair/reset comparisons. No walking remounts or browser errors. |
| Source and assets | All 17 ports verified again. Three scoped bundle hashes and manifest hash `5cd0a792c780a937fee6aee918c133567ecdf2a1ef801251d209209c24e49cc0` reproduce. |
| Mount lifecycle | 121 continuous updates kept one mount, zero cached samples and stable nodes. Two named static instances reused one template. 201 unique IDs, no unresolved references. Blur/focus, historical switch and final shared-head cleanup passed. |
| App preference regression | Six real-consumer browser cases passed with OS full motion: native board, capsule entrance, private Clone, Hospital film, cached phone result and travel. Drift/hair stopped under app Reduced; fixed instances stayed mounted; capsule/travel settled without replay, phase mutation or leaving the playable figure hidden. |
| Viewport matrix | 320×568, 390×844 and 430×932, each full and reduced motion. Board, nine offered targets, own card, nine-icon selector and capsule captured in every combination. Historical/current body, slot and name rectangles matched. Target rectangles measured at least 43.5 CSS px; no document overflow or browser errors recorded. |
| Additional effects | Hospital gowns, the incoming overflow victim's grey memorial and private Clone captured at 390×844. The four occupied beds remain in place. Clone and capsule duplicate instances have unique IDs and valid references. |
| Production exclusion | Passed after adding the review scripts: 75 reachable production modules, 223 scanned files, 94 labeled development files; no fixture, test, development import or marker found. Review video and screenshots are documentation only. |
| Guarded Vite build | Blocked as expected by the unapproved consumer inventory: `Runtime art release: content differs: apps/game/hosted/planet/app.mjs`. This is an outstanding Integration gate. |

Evidence: [source comparisons](evidence/crew-runtime-adoption/source-readiness.json), [mount lifecycle](evidence/crew-runtime-adoption/mount-lifecycle.json), [app preference regression](evidence/crew-runtime-adoption/app-motion-checks.json), [viewport checks](evidence/crew-runtime-adoption/viewport-checks.json), [effects checks](evidence/crew-runtime-adoption/effects-checks.json), [video metadata](evidence/crew-runtime-adoption/video.json), [verification record](evidence/crew-runtime-adoption/verification.json).

The [35-second review video](evidence/crew-runtime-adoption/crew-runtime-review.mp4) shows the board, all-nine selector, own reading card and Mira/Echo in native capsule poses under full and reduced motion. It is 390×844 at 15 fps, 525 frames, without audio. Scenes are independently initialized synthetic fixtures; this video does not establish gameplay timing or physical-device performance. Browser: desktop Google Chrome 156.0.8078.80. Designer visual acceptance remains pending.

The Clone ACTIVE stamp overlaps its status line at 390×844 in both the [historical capture](evidence/crew-runtime-adoption/390-844-historical-private-clone.png) and [candidate capture](evidence/crew-runtime-adoption/390-844-full-private-clone.png). This pre-existing layout is recorded for review and was not changed in the drawing adoption.

## Reproduce the excluded desktop review

The normal Planet Vite config uses the complete production release guard. `crew-review-vite.config.mjs` is a separate, excluded review harness with synthetic authority. It independently verifies the pinned manifest, all 17 drawing ports and exact approved scoped bundle bytes. It does not approve or validate the new consumer inventory. Production configs retain their full guard.

From the repository root with the pinned Node/npm toolchain and local Chrome/ffmpeg available:

```sh
npm run build
./node_modules/.bin/vite build --config apps/game/dev/planet/crew-review-vite.config.mjs
node apps/game/dev/planet/capture-crew-adoption.mjs
node apps/game/dev/planet/capture-crew-adoption.mjs docs/frontend/evidence/crew-runtime-adoption --effects
node apps/game/dev/planet/capture-crew-video.mjs
node apps/game/dev/planet/capture-crew-mounts.mjs
node apps/game/dev/planet/capture-crew-motion.mjs
```

The review build writes only to `/private/tmp/gamen-crew-consumer-review-build`. `tuple=crew` explicitly selects the new synthetic tuple; the optional `crewPair=hair` swaps public character assignments for the hair review video. Existing harness defaults are preserved. Final captures use the corrected consumer on merged registration `a1ad3e54`. The app-preference regression supplies synthetic consumer models carrying the existing shared `motion` preference; it adds no settings control or gameplay behavior to the current Planet app.

## Remaining Integration and device gates

[crew-consumer-checkpoint.json](crew-consumer-checkpoint.json) provides final changed-source hashes and the three overlaps with strict 0.6/0.7 release inventories: Planet app, Planet renderer and presentation library policy. Integration must review this diff, provide an additive historical policy and finalize the unpublished 0.7 consumer inventory while retaining the immutable 0.6 manifest/evidence. The guarded build and final release checks must then pass. Frontend has not changed the shared inventory or weakened the guard.

Physical Android/iPhone startup, frame-time, input, memory and long-run measurements were not run: no physical phone is accessible in this session. The accepted [phone budget at 6bac4554](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-performance-budget.md) remains engineering targets; desktop viewport emulation does not accept those targets. Baseline measurements must precede the candidate measurements. No independent merge, deployment or default activation is performed by this handoff.
