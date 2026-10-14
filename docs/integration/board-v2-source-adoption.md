# Board V2 source adoption for the native consumer

Base: Frontend #150 at `be9859442c631b73e262cb29a652ba78128fe705`, which depends on
common-art #147 `d3594f2a5723c69a4a7b01e0547ee95fce81e717` and Backend #143.
This focused Integration change registers reviewed drawing sources and their
runtime derivatives. It does not activate a creation profile, Ready path, gameplay
tuple or final art pairing, and does not claim the consumer is release-ready.

## Exact source evidence

`design/releases/board-v2-runtime-ports.json` is the eight-file catalog supplied by
Frontend, SHA-256 `b44c9ef74fff41b5409949b628b360b1f12e736cc88d8321d58ed3c2226f78ac`.
Integration independently read each source blob from the recorded Designer Git
commit, verified its SHA-256, removed only the leading development marker and
applied the enumerated import substitutions. All eight results match the actual
runtime bytes. The original sources are preserved in this checkout, with their
development markers intact; no original was redrawn or edited.

The exact commits are #130 `15e61f0bbd043930a578900862be9d5156b3b602` for slots,
ward and scene kit, and #144 `f15782aa39d7e84cff305ef5eaa60d8768e2b71c` for the
capsule scene, poses, film and fit/turn geometry. The JSON evidence file alongside
this document records the independently verified paths and method.

## Validation boundary

The source check verifies original hashes, exact transformations, derivative
hashes and the complete directory inventory. Missing files and extra controllers
fail. The existing drawing fence now applies to both drawing directories and
retains the frozen historical sources and derivatives.

The capsule film retains one explanatory string naming its prototype handoff;
three native consumer files use `board-v2` as a DOM metadata value. Only those
exact literals at those exact reviewed paths and file hashes are permitted.
Copying a file, changing it or injecting a prototype import removes the exception.
This registers source provenance and native metadata; it is not functional or
accessibility acceptance of the corresponding consumer files.

The build adapter is pinned with all existing historical art inputs plus the
common-art generator/catalog and all twenty ward/capsule SVGs. The old
`design-0.3.0` manifest and ART_BUNDLES remain unchanged. The new bundle is uniform
across audiences; no private role selects a request. Prototype controllers,
fixtures, review stylesheets and independent gameplay timers remain excluded.

## Verification and remaining release gates

Actual local checks used Node 22.21.1/npm 10.9.4 after an offline installation with
install scripts disabled. The workspace build and source-integrity check passed;
all eight original/derivative reconstructions passed; the drawing-fence suite
passed 35/35 and the historical board-motion checker controls passed 20/20, with
no skips or failures. The latter includes the committed prototype checker itself
and its existing negative controls. `git diff --check` passed. The historical art
manifest, ART_BUNDLES, rules and Canvas bytes have no diff from the recorded base.

Full `npm run verify` and exact-commit GitHub CI have not run for this focused
change yet. No service/emulator, new browser, physical-device or screen-reader
acceptance is claimed by these source checks.

Historical coverage validation, native service/browser journeys, accessibility,
the separate #116 setup/reveal artwork, successor command/film consumers, final
immutable art pairing and staging acceptance remain separately tracked. No
merge, cloud change or deployment is performed by this source-adoption change.
