# Crew drawing registration: DSN-REQ-17

The owner-approved nine-character drawing is registered as **design-0.7.0** with **tokens 0.5.0**. This prepares immutable art and exact runtime source copies for Frontend. The current game continues selecting its existing art release until the consumer port is reviewed and activated.

## Source acceptance

- Designer PR: [#193](https://github.com/Amirkianfar66/GameN/pull/193).
- Exact reviewed head: `8cee39d89798390d03c2a4a9fe457fa6de387bda`.
- Source merge on main: `732fe95a7e077ab8eb6e86198d1d1de5616e08cc`.
- Frontend's mechanical port: `1b530c370441b6cc49c5266c41f1bbe5dd7d7fdc`; only 17 exact copies, incorporated here.
- Frozen rig tree: `61c5a888dc59dbed4827338eb13008b5206c71eb`, unchanged from the approved baseline.

The two prior adoption blockers and smaller cache-key correction are resolved. Continuous movement updates mounted body attributes, preserving nodes, IDs and traced heads. The walk is not quantized or cached by sampled pose. A structural change at an exit/arrival blend may remount once, as the existing rig requires. Mira and Echo's rear hair has live path updates, including return to neutral under reduced motion. Static motion and exact skeleton numbers now distinguish pose keys. Portraits have their own head updater.

Exact-head evidence: clean installation under Node 22.21.1/npm 10.9.4, build, 277/277 design tests, 51/51 focused source/fence tests, and the deterministic export check all passed. GitHub's nine checks passed. An independent Chromium 156 probe passed 360 continuous pose comparisons, 12 head/hair full-to-reduced comparisons and two cache-key distinctions. Walking retained the same nodes and IDs. Six sampled full/reduced preview states were captured; the walking and outfit states were visually inspected. No browser errors were recorded. These are desktop checks, not physical-phone measurements.

## Registration and compatibility

`docs/integration/crew-drawing-art-approval-2026-11-07.json` pins the source head, 17 source/port pairs, 36 exports, two frozen rig dependencies, token bytes, and the exact 27 film properties to retire.

`design/releases/crew-drawing-approval.json` extends the independently pinned historical drawing policies. It does not edit their JSON. `drawing-port-fence.mjs` validates the supplement and fences every file under `apps/game/hosted/crew-drawing/`, including `heads/`. Unknown, missing or altered files fail validation. The only port recipe is removal of the first development-only line and the two documented rig import rewrites. A source or port cannot approve itself by changing its own manifest.

`design/releases/design-0.7.0.json` retains the existing Planet protocol/engine/ruleset compatibility, all five media pairs and 14 unchanged stylesheet bundles. It replaces three bundles:

| Bundle | New complete contents | URL |
| --- | --- | --- |
| public-board | 110 properties, including all nine cards, standees and app-icon portraits | `/art/crew-public-board.332a656b4b.css` |
| roles | All nine held devices, loaded uniformly | `/art/crew-roles.9bfc1dc3b2.css` |
| board-v2-films-art | 73 environment properties; the 27 unused memorial/outline/halftone crew drawings omitted | `/art/crew-board-v2-films-art.b30ecdebc3.css` |

The existing film catalog, SVGs, release manifests, CSS and hashes remain intact. The builder emits the new bundles alongside the historical bundles. New declarations are scoped to `[data-crew-art="crew-drawing-1.0.0"]`, so uniformly preloading them cannot restyle a historical match. Frontend sets this attribute only after exact-release/tuple selection, and clears it when that match view is disposed. It does not load a bundle by role, character or hidden state. Review videos, synthetic fixtures, source crops and the character-pilot prototype are not runtime inputs.

The explicit `crewDesignTokens` export supplies 0.5.0. `nextDesignTokens` continues exporting 0.4.0 for existing consumers; changing an old export globally would change pinned matches. The Designer's original token candidate bytes are preserved, with adoption status recorded in the release manifest.

## Frontend handoff

Use the corrected [Designer guide](../design/crew-drawing-release.md) and the published [surface inventory](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-adoption-inventory.md) and [performance budget](https://github.com/Amirkianfar66/GameN/blob/6bac45545b428de60f060c6dcbeccb9a3dcc8ef5/docs/frontend/character-restyle-performance-budget.md).

- Select the new drawing and three bundle URLs only for the exact approved release/tuple. Existing design-0.6.0 matches retain their original art and tokens.
- Mount each figure/layer with a unique prefix. Use `crewFrame`/`applyCrewFrame` for a fixed pose and `crewPoseFrame`/`applyCrewPose` for continuous movement. Bound caches and clear them on disposal. Preserve the existing rig and gameplay timers.
- Use the baked app-icon portraits for picture UI. Cards and standees remain available for their respective formats.
- Do not edit the pinned drawing modules. Request reviewed corrections from Designer if necessary.
- Return captures at 320×568, 390×844 and 430×932 in both motion settings, plus a 30–45 second runtime video for Designer review.
- Measure the named physical low-end Android and iPhone against the agreed budget. Desktop captures and byte counts do not satisfy device acceptance.

The new manifest currently records the registration baseline, not a completed consumer implementation. Frontend's later runtime changes require a focused integration review, preservation of historical evidence and finalization of the unpublished candidate inventory. No existing release manifest should be repinned to accommodate a changed consumer.

## Validation and remaining gates

Registration validation covers exact port derivation, source/port/asset tampering, unknown and missing files, independent approval hashes, complete uniform bundles, preserved historical output, and explicit token selection. `npm run check:sources` now verifies the registered crew release; the ordinary hosted build emits its three bundles.

Frontend's affected-consumer review identified the need to scope preloaded CSS. The correction is included. A Chromium check loaded old and new bundles together and confirmed six conditions: both unselected views retain old cards; new portraits are initially absent; selecting the crew root changes only that view; the historical view is unchanged; portraits appear only on the selected root; clearing selection restores the original variables. A separate tooling fixture was updated to include the new approval supplement, without weakening its rejection checks.

Local registration checks passed: source integrity, workspace/typechecks, bootstrap (179), engine (1,378), backend (311), tooling (221), presentation/game Frontend (216 + 679), and design (277). The historical design scratch fixture now copies the 17 newly pinned sources as well as the approval policies. Frontend's loopback tests initially failed with sandbox `listen EPERM`; the complete Frontend stage passed with loopback access. The hosted build passed and exact output validation accepted 9 files for design-0.5.0 and 27 each for design-0.6.0/design-0.7.0. Full CI, including balance/capacity and emulator jobs, remains the merge gate; no complete local single-invocation `npm run verify` pass is claimed.

Frontend runtime adoption, real Android/iPhone measurements and Designer review of the runtime captures remain outstanding. No gameplay rules, backend scheduler, current match-creation default, Firebase configuration or deployed site are changed by this registration.
