# Corrected T1 framing and opened-in-dark fallback

This is the current review evidence for #227's framing portion of [#222 P1 item 1](https://github.com/Amirkianfar66/GameN/issues/222). Designer's #229 correction resolves the painted-figure clipping found in the earlier candidate and defines the cold-entry fallback. The implementation checks below pass. **Designer’s explicit visual approval in #227 and Integration’s production-source admission are still pending.**

## Behavior and authority

The native camera ports #229's `phoneFrame`, `paintedExtent`, measured `FIGURE_EXTENTS` and `FIGURE_MOTION_REACH`, `MOTION_ALLOWANCE` and `FIGURE_CLEAR`. It includes the mirrored and still poses, the standing/Injured union and the measured cot-hair reach. The [source pin and transformation record](port-source.json) preserves the exact original and owned-port hashes. A focused test checks the port, all eight measured rig/crew/motion source hashes, and exact numeric agreement over every occupancy subset, mirrored/down poses and five panels.

The only formula adapter permits the same arithmetic to consume frozen numeric bounds during dark viewport reflow. These bounds describe the already-shown lit frame; they are derived public framing data, not occupied markers or eligibility information. No occupied slot IDs, character, health, roster or identity is retained in that cache.

Cold entry first validates the admitted private/session context, supported tuple/art, match, round, count, BLACKOUT phase/window and 5/15-second interval against a synchronized unexpired clock. A valid same-response public FINALIZED/PRE_BLACKOUT publication under the exact 1.3/design-0.8 tuple supplies transient positions and a public down-pose flag. If its recoverable public data is missing or mismatched, or the tuple precedes 1.3, the camera uses every canonical slot, as #229's `frameAll` specifies. Structurally invalid whole responses, failed authorization, unsupported private context or expiry remain rejected. They cannot create an enabled target through the fallback.

The existing controller’s role, offer, room and selectable-slot guards remain the command authority. An added regression constructs canonical fallback geometry while withholding the offer and proves that no selection action or command becomes available. Dark `model.board`, identities and figures stay absent. The fallback adds no explanatory copy or occupancy hints.

For one window, camera bounds stay immutable. A supported viewport, text-size or bar-size change recomputes both Room and Board geometry from those same bounds and neutral canonical geometry. An active pointer and its delayed duplicate clicks are cancelled before the changed layout can select something. Server-accepted `selectedSlotId` and a pending local choice retain their IDs through reflow. Blur/conceal retires interrupted pointers and follows the existing private-session conceal/dispose/reauthorize flow. Rejected ownership, expired/replaced windows and controller errors retire the cached bounds. Physical targets require a validated scene frame. No game command, phase extension, shortened interval or animation wait is introduced by these operations.

## Exact inputs

| Input | Pin |
| --- | --- |
| Native/art baseline | main `8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d` (includes harness #225) |
| Authoritative framing source | #229 `835fcf73ea252dbafeaf4b7184edced29fdeac59`, merged at `8517f767` |
| Whole-pack comparison reference | reviewed #228 combined redraw `388cc052f2a608a3bdbbba457e53e8686abd54e6` |
| Captured native source and all source-equivalence proofs | [verification.json](verification.json) and each capture’s `review-provenance.json` |

The framing block and measured table in the newer comparison reference are byte-equivalent to the pinned #229 inputs. Its large-text redraw is used for the required small-phone comparisons. This reference selection does not admit a native build. Artwork remains the registered existing release: the #197 source merge is not room-art adoption; #230 activities and food visits are outside this implementation.

The two new owned runtime modules are `apps/game/hosted/planet/phone-framing.mjs` and `phone-figure-extents.mjs`. The existing session bridge in `apps/game/src/planet/blackout-framing.ts` now distinguishes trusted reconstruction, canonical fallback and rejected authority. Root/shared approval scripts, contracts and asset registrations are unchanged.

## Verification

| Check | Actual result |
| --- | --- |
| Typecheck/build | Passed |
| Frontend suite | **973 passed**: 219 presentation + 754 app |
| Corrected native room sweep, reduced motion | **54 room cases + 6 timed Blackout checks**, zero silhouette failures or runtime errors |
| Corrected native room sweep, normal motion | **54 room cases + 6 timed Blackout checks**, zero silhouette failures or runtime errors |
| Cold/reflow/control probe, reduced motion | **24 cases passed**: 7/8/9 players × both sizes × valid public PRE / missing / mismatch / legacy |
| Cold/reflow/control probe, normal motion | The same **24 cases passed** |
| Default pack/native comparison | 49 catalogued parts; 48 native images; zero page/request problems; unchanged Boarding remains explicitly pack-only |
| Small-phone comparison | All **34 affected IDs** paired at 320×568/200% text; the Board pair is an explicit supplement |
| Largest text at 390×844/200% | Paired supplement passed without page/request problems |
| Canonical package exclusion | Passed: 77 reachable modules, 229 source/shipped files, 122 labelled development files, no fixture/development leaks |
| Production source admission | Existing guard rejects the changed, unadmitted native consumer as expected; no approval fence was bypassed |

The ≥98% whole-silhouette assertion is unchanged. The room sweeps cover sparse/full Room A, Room B, Command Room, Hospital and Jail at 390×844/100% and 320×568/200%, with 7/8/9 players. Hospital measures the visible approved clinical replacement rather than its intentionally hidden base figure. The measured minimum visible ratios are recorded in the manifest.

The 48 cold/control probes verify both Room and dark Board reflow, all neutral positions, no figures/names/identities, preserved accepted A3 and pending local choice, cancelled real touch gestures and explicitly synthetic delayed duplicate clicks, blur/fresh authorization, removal of revoked controls and zero game commands. The initial failed blur-probe assumption was corrected to follow the app’s actual disposal/reauthorization lifecycle; it did not require a substitute screen.

These are desktop Chromium checks using explicit synthetic authority. No physical phone, Safari, VoiceOver, multiplayer or performance result is claimed. Other #222 sheet/control/wording differences remain; this PR reviews the framing, fallback and reflow delta, not whole-interface parity.

## Pictures and reproducible reports

- [Default paired comparison](comparison/index.html), [raw report](comparison/compare.json), [provenance](comparison/review-provenance.json).
- [33 paired small-phone states](comparison-320/index.html), plus the affected [Board at 320×568/200%](comparison-board-320/index.html). [Full 34-ID/sheet inventory](parts.md).
- [Largest text at 390×844/200%](comparison-largest-390/index.html).
- [Reduced-motion room facts/pictures](rooms-reduced/facts.json), [normal-motion room facts/pictures](rooms-normal/facts.json).
- [Reduced-motion cold/reflow facts/pictures](cold-reduced/facts.json), [normal-motion cold/reflow facts/pictures](cold-normal/facts.json).
- [Exact sheet 30 cold/cold-pick reference states](pack-cold/facts.json); the four reference images are beside the report.
- [Checks and command logs](checks/), [source/module equivalence](verification.json).

Every referenced image is committed beside its self-contained report/index. The original clipping and old missing-data candidate are preserved in the [historical evidence folder](../phone-room-framing-2026-11-11/README.md); those failed captures are superseded and are not current approval evidence.

Cold-probe filenames identify the starting viewport; the facts record each post-reflow viewport separately. The comparison tool records CSS phone dimensions and draws at its standard 1.5× pixel scale. The direct room screenshots also supply the requested viewport sizes at 1× pixels.

To reproduce, use the captured native candidate and Node 22.21.1. Keep clean worktrees at the exact design and artwork pins above, build with `GAMEN_PHONE_ART_BASE` pointing to the art worktree, and run the comparison from the design worktree:

```sh
npm run build
GAMEN_PHONE_ART_BASE=/private/tmp/gamen-phone-art-229-merged node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs --outDir /private/tmp/gamen-phone-t1-native
node apps/game/dev/phone/room-framing-capture.mjs /private/tmp/gamen-phone-t1-native /private/tmp/gamen-phone-t1-rooms-reduced
node apps/game/dev/phone/room-framing-capture.mjs /private/tmp/gamen-phone-t1-native /private/tmp/gamen-phone-t1-rooms-normal --motion
node apps/game/dev/phone/cold-framing-capture.mjs /private/tmp/gamen-phone-t1-native /private/tmp/gamen-phone-t1-cold-reduced
node apps/game/dev/phone/cold-framing-capture.mjs /private/tmp/gamen-phone-t1-native /private/tmp/gamen-phone-t1-cold-normal --motion
node apps/game/dev/phone/pack-cold-capture.mjs /private/tmp/gamen-phone-reference-388cc052 /private/tmp/gamen-phone-t1-pack-cold
```

From the clean reviewed design worktree, use `design/tools/phone-ui-native-compare.mjs --build /private/tmp/gamen-phone-t1-native --out <output-folder> --stage-sheets`, adding `--view 320x568@2` and the IDs in `parts.md` for the small-phone comparison. Designer’s explicit #227 approval must identify the candidate and these inputs. Integration then owns production-source admission, required CI and merge. Nothing in this evidence deploys or activates the interface.
