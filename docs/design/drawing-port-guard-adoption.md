# Reviewed drawing-port fence, 12 October 2026

Focused issue [#115](https://github.com/Amirkianfar66/GameN/issues/115). Separate checker-only follow-up to motion correction [PR #113](https://github.com/Amirkianfar66/GameN/pull/113). Worktree `/Users/amirkianfar/.codex/worktrees/c739/GameN`, branch `codex/designer-runtime-port-guard`, base `859580c80514d7c8280a803b8933ccd164653c79`. No drawing, artwork, visual input, runtime file, root manifest, rule or shared contract changes.

## Approved boundary

Integration explicitly authorized production ports of the frozen slice-7 drawing primitives and the existing build-only full-kit asset plugin. The old board checker treated every `board-motion` substring as a prototype dependency, including `FIGURE_VERSION = 'board-motion-0.3.0'` and historical prose in the copied pure modules. This prevented the approved adoption.

The new development-only fence retains the original diagnostic and all negative controls. It permits only exact reviewed content at ten named `apps/game/hosted/scene-drawing/*.mjs` paths, one named stylesheet derivative (`ability-drawing.css`) and the build-only `comic-assets.mjs` snapshot. It validates sixteen immutable drawing-source hashes against the frozen source `49f0db4d34d2a2a418f669a13bed660fc665b1b6`. The plugin additionally binds the exact two asset manifests and two generated bundle stylesheets. Source identifier/prose can remain in those reviewed bytes; a new file, altered module, moved plugin, asset drift or self-issued Frontend provenance cannot authorize an exception.

Every actual prototype path remains forbidden, including direct/dynamic imports, re-exports, URLs, fetches and stored references into its app, fixtures, director or any other prototype code. The already-pinned TypeScript 5.9.3 parser decodes literal escapes and static concatenations without executing production code. Exact asset literals are allowed only in the hash-matched build-only plugin; injecting an import changes its hash and loses that exception. The directory is not exempted. Runtime entry-graph exclusion remains an independent Integration gate.

Trusted review data is `design/tools/lib/reviewed-drawing-ports.json`, outside all visual-input hash trees. It does not read Frontend's editable provenance to grant permission. A port/style/plugin/source change needs a focused review and updated approved hashes. Geometry and generated assets stay frozen at `49f0db4d34d2a2a418f669a13bed660fc665b1b6`. The stylesheet has a separate `styleSourceCommit`, `d87163358ea85878fd3e9e4ffb347c4e71d6de5d`, with corrected source SHA-256 `cfcc1e29239840a22210df26a8c09439101f658f1e11f5fd7ab89f21b2e6b808`. Its slice-2-onward derivative body is unchanged because the paused-photo correction is in slice 1; its header/provenance and exact output hash now name PR #113. The fence also validates that corrected source so PR #113 cannot silently revert.

At the final readback, PR #111's head was `8f1f356f2208ff49bcaef3f501f9778da19ccab0`. That newer head is not the adopted drawing pin: this guard deliberately keeps `49f0db4d34d2a2a418f669a13bed660fc665b1b6` and does not import the later source or captures.

## Read-only review and evidence

Read Frontend's `fc13` checkout: `apps/game/dev/port-scene-primitives.mjs`, `hosted/scene-drawing`, `hosted/comic-assets.mjs`, `hosted/ability-drawing.css` and `docs/frontend/scene-drawing-provenance.json`. Its final observed HEAD was `b4f1fea75dec1694bce060709d6b24f54b75fd81`; the reviewed ports/style/generator/provenance were untracked and the plugin modified. No Frontend file was edited. Independently compared the drawing sources with `git show 49f0db4…`, reproduced the pure-port recipe in portable tests, and checked all recorded port/asset bytes. The guarded production scan passes on that observed working snapshot; this is not a claim of its later committed state, build, runtime acceptance or deployment.

The reviewed build plugin hash is `89b48e78c88c2cfbe7e9f507a16b580989d123b0d417385c2a417598973a5cb0`; reviewed stylesheet derivative hash is `639cf452ddfd0edd37f859aab2ffb64a91812204f673db32c16e8161a01a5d10`. Pure-port hashes and individual source/asset inputs are in the review data. Test fixture text snapshots reproduce the approved plugin/stylesheet; they are not shipped package exports.

## Actual checks

Node `22.21.1`, npm `10.9.4`. Checker-only work uses no browser or production data.

| Check | Result |
| --- | --- |
| `node --test packages/design-tokens/test/drawing-port-fence.test.mjs packages/design-tokens/test/board-motion-check.test.mjs` | 37/37 passed, zero cancelled/skipped/todo; original controls retained |
| `npm run check:board-motion --workspace @mothership/design-tokens` | 13/13 passed |
| `npm run check:abilities --workspace @mothership/design-tokens` | 12/12 passed |
| `npm run check:assets --workspace @mothership/design-tokens` | 15/15 passed |
| `npm run check:workspace`, `npm run check:sources`, `git diff --check` | Passed |
| `npm run test --workspace @mothership/design-tokens` | 203/204 passed; sole unchanged historical phone-check failure (13 quote mismatches), already fixed in the combined release; zero cancelled/skipped/todo |
| Production fence scanned against the Frontend working snapshot | Zero problems; read-only |

Tests prove acceptance of all exact reviewed ports/inputs; refusal of app/fixture/director imports, dynamic/escaped/encoded/concatenated paths, arbitrary files, altered approved bytes, copied build-plugin exceptions, source/manifest/CSS drift and spoofed provenance. No existing refusal was removed or reworded to hide a failure.

No new captures: board input hash remains `7ab30422ce4bc75401e51d294cce4946b468390c58e98558f5950607dc4422ed`, ability hash remains `3ddda09979a560b5edde7430d6fa4204fa6500b9ba4e75f38bda13e58baee6cc`. Motion/layout evidence and PR #93's already integrated phone-copy fix are untouched. The frozen branch's historical phone mismatch remains separate; the combined release has the correction and its own strict Designer gate.

Integration owns review of the exact Frontend commit, runtime graph exclusion, combined checks and deployment. This change grants only the explicitly approved drawing/build-asset boundary, with no new art, kept-card behavior, rule-version change, merge, deployment, IAM/billing operation or access expansion. Per Integration's explicit instruction, long Balance/emulator runs are not duplicated for this checker-only change. The inherited motion code/evidence checkpoint `d87163358ea85878fd3e9e4ffb347c4e71d6de5d` passed full repository verification separately in PR #113.
