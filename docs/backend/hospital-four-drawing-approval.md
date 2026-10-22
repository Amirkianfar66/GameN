# Exact Hospital-four drawing adoption

This focused integration change follows issue #155 and the current-policy failures
reported by Frontend after its historical fixture repair. Its reviewed Frontend base is
`f35a8ff04dcef066e72125bd3efb3e19b59cc858`, on
`codex/frontend-hospital-four-playable-review`. The separate shared dependency base
is `c6814df98242a72bf702362d253aab0a8ca6048a`.

## Reviewed boundary

The original `design/tools/lib/reviewed-drawing-ports.json` remains byte-identical.
The new `design/releases/board-v2-four-drawing-approval.json` is independently
hash-pinned by the checker at
`5ef70aa1da1f78b81ca945485b08083aa70856bb9b482df9b3b4e131c23869a0`.
It binds the exact original policy, 14 previously source-reconstructed new ports,
their frozen source snapshots, three current native metadata files, one
build-time source catalog, and the current common-art build adapter and its inputs.
The latter include all 100 film assets and the exact generator/catalog/art release.
Nineteen required runtime paths must exist with the reviewed hashes.

The native host, scene and CSS use the existing `board-v2` data/class vocabulary.
Their reviewed literal is not a prototype import. The build-time JSON catalog
records 100 original source paths; those are provenance values, not executable
imports. The common-art adapter validates and emits the complete nine-bundle
candidate uniformly. This approval does not exempt their directories or copied
files: every exception requires its exact path and digest.

The Clone helper's reference to the ability-kit source is retained comment prose.
Only that exact pure port and the historical lighting port may retain this prose.
Actual ability-prototype references are refused, including static split, escaped
and encoded paths. Source bytes, existing runtime ports, artwork and historical
art manifests are unchanged by this PR.

A checkout without the supplement uses the historical policy. A present but
modified supplement fails without fallback. Removing it cannot authorize the
new ports through the old policy. Historical fixture tests still exercise their
original bytes, while the current tree exercises the separate candidate policy.

## Actual checks

Against the initial Frontend `2346c12` plus this approval, pinned Node
22.21.1/npm 10.9.4 clean `npm ci` and workspace build passed.
`npm run test:design` passed all 252 cases, including the four previously failing
current-tree cases and all 35 historical drawing-fence cases.
`npm run test:tooling` passed all 209 cases, including ten new candidate-policy
controls for unchanged baseline approval, missing/altered files, self-issued
approval, copied metadata/ports, source/art drift and prototype-import attempts.
Workspace/source checks and authored whitespace checks passed.

The candidate approval and test fixtures are local build/review tooling. This PR
does not change the game's rules, runtime UI, release profile, default tuple or
deployment. No new browser, emulator, physical-device or live-cloud acceptance
was performed for this focused fix. Full combined verification, affected-role
review, independent Balance acceptance and final release checks remain separate.

The preceding approval bound Frontend `530532d`, whose only runtime delta above the
originally tested `2346c12` is readable Captain button labels and paper-colored
text. The host, scene, build adapter, catalog and all 27 drawing ports are unchanged.
The source correction was reviewed directly. After rebinding the CSS digest,
all 45 candidate/historical fence controls passed, the actual ability-art check
passed 12/12 and the actual board-motion check passed 13/13. The full 252/209
suites above were not repeated for this one-line CSS and button-label refinement;
Frontend's final combined verification remains required.

The preceding approval bound the nameplate correction at Frontend `ceb8bdd`. Its
only production changes are scene label bounds and CSS sizing/translation. The
host, source artwork, logical character positions, command identities and target
allocation are unchanged. Integration verified the committed scene and CSS bytes
against the supplied SHA-256 values and inspected the smallest capsule picture.
The supplied Chromium report contains 30 synthetic records and 120 fixed-slot
measurements with zero exceptions. Independently checking that report confirmed
336 label/number bounds, 216 five-point target hit records and unchanged body and
target geometry across 12 short/long-name pairs. This report uses the renderer
and CSS over explicit synthetic views; it does not establish physical-device,
native-service or multiplayer behavior.

After rebinding the final scene/CSS hashes, Integration ran all 78 focused
consumer and candidate/historical approval tests successfully. A separate fresh
Chromium run passed six cases at 320x568 with nine players and 390x844 with seven
players, covering short names, maximum-length wide names and capsule labels.
All 52 labels/seat numbers remained inside their rooms; all 52 interactive
targets retained at least 44 pixels and passed center/four-corner hit checks.
There were zero browser exceptions. The owned browser and loopback server were
closed after the run. Authored whitespace checks passed.

Frontend separately completed full combined verification at `eb3f8ceb` before
the nameplate correction, including 600 capacity playouts; Integration inspected
that saved log. Its reported 734 Frontend cases and build also passed after the
label correction. Integration did not rerun the full combined suite or emulator
tests for this narrow approval refresh. Affected final Design/build checks, CI,
Designer visual acceptance, independent Balance acceptance and release checks
remain separate.

## Release integration refresh

The current supplement binds Frontend correction source `f35a8ff04dcef066e72125bd3efb3e19b59cc858`, delivered with evidence at `e3789a5981e6a94b8c10e1dd24f89dd74339d885`. Integration compared the six production source digests with the frozen report, reviewed the changed lifecycle/controller code and inspected the overflow, reduced-motion, Captain and private Clone pictures. The exact host/CSS metadata exceptions are refreshed; the scene, source artwork and pure drawing ports are unchanged.

The common-art build input now pins the release-selector module from `124e9a5f7813d5ca45d04b1432ff1a46e37caab3`, which selects the already-reviewed design-0.5.0 artifact for release metadata. Its strict current and historical validators are unchanged. No new path exemption, prototype import or art mutation is permitted.

The Frontend report contains 64 rendered records and zero runtime exceptions, with its actual and unrun scope recorded in `docs/frontend/hospital-four-seven-corrections.md`. Integration's separate release preparation passed 37 profile/art tests, both typechecks, the hosted build, standalone Backend package verification and two native local 1.11 Functions smoke cases (setup/Ready/receipt/Hack and automatic bots). Final combined verification and the hosted release remain pending. Under the owner's 19 October direction in issue #155 comment6258573661, Balance saves the approved four-bed decision and verifies its implementation; a separate Balance design sign-off is no longer required. Earlier pending-review descriptions above are historical.

After assembly and the exact approval refresh, Integration passed 91 focused
controller/lifecycle/art/approval checks and all 252 Design checks. This includes
the changed own-only Clone authority and admission behavior, current candidate
fence checks and preserved historical policy controls. The full final CI run
provides the separate complete-suite gate; no deployed behavior is claimed here.

## Card panel sizing correction — 19 October 2026

Integration reviewed the scoped Card-panel CSS change against published base `ac95c65614e0d10c50d6ed46b9845cafac962ddf`. Intrinsic grid rows preserve the role picture and labels inside the bounded scrolling body. The body fills its sheet width and clips decorative horizontal overflow. Only the existing `apps/game/hosted/board-v2.css` metadata/source digest changes to `0566d024c1a4b396f38e6a4af38140137be713ea1828b95c785777138f8a0171`. All drawing ports, artwork, other file approvals, gameplay pins and historical approval bytes are unchanged. This refresh adds no path or literal exemption.
