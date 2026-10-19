# Exact Hospital-four drawing adoption

This focused integration change follows issue #155 and the current-policy failures
reported by Frontend after its historical fixture repair. Its exact base is
`530532dd9588fcaff6c6f89ec7db1832c94825a6`, on
`codex/frontend-hospital-four-playable-review`. The separate shared dependency base
is `c6814df98242a72bf702362d253aab0a8ca6048a`.

## Reviewed boundary

The original `design/tools/lib/reviewed-drawing-ports.json` remains byte-identical.
The new `design/releases/board-v2-four-drawing-approval.json` is independently
hash-pinned by the checker at
`7bd6ac72049a5ce33799a6fd439358be1c8e0e8d160dc340c0870883a8d5608b`.
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

The final approval binds Frontend `530532d`, whose only runtime delta above the
originally tested `2346c12` is readable Captain button labels and paper-colored
text. The host, scene, build adapter, catalog and all 27 drawing ports are unchanged.
The source correction was reviewed directly. After rebinding the CSS digest,
all 45 candidate/historical fence controls passed, the actual ability-art check
passed 12/12 and the actual board-motion check passed 13/13. The full 252/209
suites above were not repeated for this one-line CSS and button-label refinement;
Frontend's final combined verification remains required.
