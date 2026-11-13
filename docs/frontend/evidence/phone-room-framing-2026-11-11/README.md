# P1 room framing: draft implementation and failing rendered checks

**Historical failed candidate, superseded by the [corrected #229 implementation and current evidence](../phone-room-framing-229-2026-11-11/README.md).** The original reports and hashes below are retained as evidence of the defect; their source-equivalence statements refer to their recorded historical heads.

This is a review candidate for the framing portion of [#222 P1 item 1](https://github.com/Amirkianfar66/GameN/issues/222). **It is not ready for visual acceptance or production admission.** The authoritative pack's current camera calculation clips painted figures in crowded rooms. Frontend reproduced that defect using the pack itself and raised it with Designer before changing the calculation. The room's own interaction chips are still another piece of item 1.

The candidate ports the owner's T1 `phoneFrame`, using the positions already shown in the lit room. It retains the latest lit numeric camera and every canonical target rectangle through darkness. Cold entry under the exact 1.3/design-0.8 tuple derives the same geometry from the public FINALIZED/PRE_BLACKOUT board in the same fresh authorized response. The bridge validates audience, tuple, match/round/count, checkpoint, phase/window IDs and the 5/15-second boundaries. Public and private revisions remain independent. Only `{location, slotId}` pairs reach the immediate geometry calculation; only numeric frames and all neutral canonical positions are retained. Dark `model.board`, identities, figures and target guards retain their existing concealment.

## Blocking findings

1. **The pack calculation does not enclose the painted silhouettes.** Its horizontal fit uses occupied press centers and PRESS. In full Room A at 390×844, native A3 has painted x271.51–446.88 and only 67.56% of its silhouette remains in view. The exact pack reproduces the visible crop with the same characters/positions. [Frontend question](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6796114279), [Integration source confirmation and requested Designer correction](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6796157347). This is a defect in the implementation of the already-approved T1; it is not a new trade-off for the owner. No alternative zoom or slot placement has been implemented.
2. **Unrecoverable cold-entry presentation needs Designer's answer.** A missing/inconsistent public PRE_BLACKOUT source, a historical tuple without that checkpoint, or an unrecoverable prior viewport cannot reconstruct the approved camera. The default #223 `blackout` fixture uses the older phone1.2 tuple, so its captured blank scene is an unresolved candidate state, not a successful dark-state result. The successful 1.3 supplements below are separate. [Initial question](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6795355854), [validated 1.3 technical path](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6795506035), [missing-data follow-up](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6795999005). No substitute screen/copy has been added or accepted.
3. Designer's explicit approval of the eventual corrected candidate in its PR and Integration's exact production-consumer admission remain outstanding. `check:sources` currently rejects the changed native bytes as intended. No production approval file, shared script, drawing or contract changed.

## Provenance and affected parts

The base is main `606537fe3e0e5437d41c2905d8d4dce21da12e64`, including the mandatory visual gate from #224. Review pack and immutable artwork use clean main-history snapshot `89935bd6c0a37abfbe6da8130205d6d8a16e80e1`, combining normative #221 `82a94d67713324831c85e749c151ae2420f98787` and #223 `d51bb06ff77036967cff0aa3978c4c4677cadeb5`.

The [verification manifest](verification.json) identifies all captured candidate commits and hashes. All captured module bytes, including 113 tracked sources for each capture, match evidence-preparation commit `4de97327e34faa4a10ded30071e2b5844e38e08b`. Later code commits changed only excluded diagnostic tools; the rebase added repository instructions. Generated module bytes were checked separately. Subsequent evidence files are documentation only. This equivalence is supplied for Integration review; it is not Designer approval of a later head.

The completed size supplements capture PR head `e68cdcb987743b74c16538631fac5879a7bfe1e4` using Designer's #226 tool/pack head `39aafaa31f0c060ff432cdb4a0fdf38e20116512`, which was unmerged when used. The manifest records its separate identity and proves that the `design/phone-ui`, approved board/motion/crew art, hosted artwork/geometry and design-token source trees are identical to normative `89935bd6`. Only four tool/documentation/test files differ. The supplement does not introduce a new camera or grant visual approval.

Primary comparison IDs: `room-a`, `room-b`, `command-room`, `hospital`, `blackout`. Camera changes also affect the room visible behind existing sheets; the full 33-ID inventory, with sheet IDs, is in [parts.md](parts.md). A full-Jail state has no dedicated #223 ID and is explicitly supplemental. Existing sheet/control/wording differences remain in #222.

## Completed diagnostics

| Check | Result |
| --- | --- |
| Typecheck/build | Passed |
| Frontend suite | 966 passed: 219 presentation + 747 app |
| Production exclusion | Passed; 77 reachable modules, 229 shipped/source files, 120 labelled development files, no leaks |
| Production source integrity | Rejected unadmitted changed `apps/game/hosted/planet/app.mjs`; approval fence preserved |
| Exact merged-main #223 comparison | 49 parts captured, 48 native images, zero page/request problems; Boarding explicitly pack-only; legacy dark-state limitation above |
| #226 size supplements | All 33 affected IDs captured on both sides at 320×568/200%, plus Largest text at 390×844/200%; zero page/request problems |
| Reduced-motion room diagnostic | All 54 cases completed; **12 whole-silhouette failures**, so command exits 1 |
| Normal-motion room diagnostic | All 54 cases completed; **15 whole-silhouette failures**, so command exits 1 |
| Cold 1.3 dark entry / reconnect / freeze / targets | Six cases per motion setting passed: 7/8/9 players × 390×844 at 100% and 320×568 at 200% text |

Each room sweep covers sparse/full Room A, Room B, Command Room, Hospital and Jail. Both completed runs retain actual painted-silhouette measurements, the ≥98% visible assertion and the nonzero failing result. Full rooms at 390×844 fail in A, B, Hospital and Jail. Normal motion additionally crosses the threshold in the full Hospital at the smaller size. No threshold has been reduced for acceptance.

Hospital measurements use the visible, already-approved clinical patient replacement (`critical-seat-…-body`), rather than the intentionally hidden base figure. SVG content, shared references, unique instances and the silhouette requirement still apply. The two earlier reports are preserved in [original-failures](original-failures/) and are explicitly incomplete; their Hospital “Expected visible crew SVG content” failure was a diagnostic selector problem, distinct from clipping.

The twelve completed cold-entry cases confirm no figures/names/identities, all five neutral Room A positions, ≥44px independently reachable offered targets, no command sent by view/selection/reconnect checks, identical numeric coordinates through the actual dark boundary, and no camera change from later synthetic dark packets. All completed runs recorded zero runtime exceptions. These are desktop Chromium synthetic checks; no physical phone, Safari, VoiceOver, live multiplayer, timing-performance or deployment result is claimed.

## Pictures and reports

- [Full default pack/build comparison](comparison/index.html), [room stage](comparison/stages/03-rooms.jpg), [raw comparison report](comparison/compare.json), [comparison provenance](comparison/review-provenance.json). All per-part images and eight stage sheets are committed beside the self-contained index.
- [All affected parts at 320×568/200%](comparison-320/index.html), [supplement report](comparison-320/compare.json), [exact candidate provenance](comparison-320/review-provenance.json); [Largest text at 390×844/200%](comparison-largest-390/index.html). Every paired image is committed. The known pack Actions-grid crop at the smallest size is acknowledged in #226; these captures do not claim that unrelated sheet defect is fixed.
- [Original full Room A native failure](original-failures/native-full-room-a.jpg) and [the exact pack reproduction](pack-reproduction/pack-full-room-a.png), with [pack reproduction facts](pack-reproduction/facts.json).
- [Reduced-motion facts and captures](reduced/facts.json), [normal-motion facts and captures](normal/facts.json). Every referenced diagnostic capture is included beside its report. File names state width, height, text percentage, player count, room and occupancy. They include 390×844 and 320×568/200% versions and both cold/frozen dark states.
- [All command logs](checks/), including both original failed partial runs, completed failing room runs, passing suite/typecheck/exclusion and the preserved source-integrity rejection.

## Reproduce

Use Node 22.21.1 and a desktop Chromium. Keep the exact original pack snapshot clean in its own worktree. The harness repair is a dependency on #225 until that PR merges; it does not admit the candidate to production.

```sh
git worktree add --detach /private/tmp/gamen-phone-t1-pack 89935bd6c0a37abfbe6da8130205d6d8a16e80e1
npm run build
GAMEN_PHONE_ART_BASE=/private/tmp/gamen-phone-t1-pack node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
node design/tools/phone-ui-native-compare.mjs --build /private/tmp/gamen-phone-preview --out /private/tmp/gamen-phone-t1-comparison --stage-sheets
node apps/game/dev/phone/room-framing-capture.mjs /private/tmp/gamen-phone-preview /private/tmp/gamen-phone-t1-reduced
node apps/game/dev/phone/room-framing-capture.mjs /private/tmp/gamen-phone-preview /private/tmp/gamen-phone-t1-normal --motion
node apps/game/dev/phone/pack-framing-reproduce.mjs /private/tmp/gamen-phone-t1-pack /private/tmp/gamen-phone-t1-pack-reproduction
```

For the all-part size supplements, run the exact #226 tool from its own clean worktree against the candidate's build, with the 33 IDs in `parts.md`:

```sh
node design/tools/phone-ui-native-compare.mjs --build /private/tmp/gamen-phone-preview --out /private/tmp/gamen-phone-t1-small --only room-b,room-a,command-room,hospital,largest-text,pass,actions,targeting,target-check,registered,scan,code,clone,card,panels,settings,players,round-order,windows,hospital-panel,promise-offer,promise-incoming,promise-results,jail-ballot,jail-result,appointment,block,tie,nav-public,blackout,host-controls,reconnecting,end --view 320x568@2 --stage-sheets
node design/tools/phone-ui-native-compare.mjs --build /private/tmp/gamen-phone-preview --out /private/tmp/gamen-phone-t1-largest --only largest-text --view 390x844@2 --stage-sheets
```

The room commands intentionally remain failing until Designer's corrected authoritative camera passes the unchanged whole-figure requirement. The camera candidate must remain draft meanwhile.
