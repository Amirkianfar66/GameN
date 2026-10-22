# Reviewed Board-v2 common art candidate

This records the exact Claude Hospital ward and adjacent Private Capsule artwork
prepared in #147 for playable integration in issue #139. Frontend #150 now consumes
the candidate through its native board adapter. The deployed 1.5 / `design-0.3.0`
release, historical manifests and creation profiles remain unchanged.

Base: Backend #143 at `f953c1565acc13c7cbe8c00c3b1c90cc67818881`.
The twelve ward SVGs are byte-identical to Designer #130 at
`15e61f0bbd043930a578900862be9d5156b3b602`. The eight capsule SVGs are
byte-identical to Designer #144 at `4f3d25bb356e0652188dfb880c3a9248ea7d55ef`.
The source catalog records every path, source commit, SHA-256 and viewBox.

Integration reviewed the source drawings in #141 comment 6167856709 and #144
comment 6168298233. The capsule targeting/layout follow-ups were subsequently
reviewed at #144 `f15782aa39d7e84cff305ef5eaa60d8768e2b71c`; its drawing bytes are
unchanged from `3599cfe`. The common SVGs remain byte-identical to the earlier
catalog attribution above. The separate source-port adoption records the exact
native derivatives. Prototype controllers, fixtures and review-page stylesheets
remain excluded. Phone/device acceptance is separate from source review.

## Common bundle

`scripts/board-v2-art-candidate.mjs` verifies the fixed catalog digest and all twenty
source digests before generating one deterministic stylesheet. It strips only the
XML declaration/comment before `<svg`; the embedded SVG document is byte-identical.
Every audience receives the same complete ward/capsule set. No private role, claim,
participant or roster selects a network request.

- Catalog SHA-256: `0412d616c0b6ab37d9f6f80fb34115aad4db6275b042697af1b58634289f577c`.
- Stylesheet SHA-256: `5dedbf2450adca159480d3ba448501ce6957595f1a018c5ced4d9d17f5031cd2`.
- Candidate URL: `/art/board-v2.art.5dedbf2450.css`.
- Size: 206,831 bytes; 15,839 bytes with Node's default gzip in the local check.
  This is a build measurement, not a measured network transfer.

Frontend variables are `--board-v2-art-ward-{7,8,9}-back`,
`--board-v2-art-ward-berth-h1` through `h9`, and
`--board-v2-art-capsule-{back,door-0,door-1,door-2,door-3,busy,badge,dark}`.
The catalog distinguishes source `sceneDepth` from `paintZIndex`: ward fronts use
`2 * round(sceneDepth) + 1` between the Designer's body and foreground figure layers.
These values do not allocate or move a gameplay slot.

Call `prepareBoardV2Art(repositoryRoot)` from a reviewed build adapter to obtain the
stylesheet, URL and digest. Frontend #150 calls it from the build adapter and emits
the same reviewed stylesheet. Final activation still needs a complete immutable
art manifest, exact gameplay pairing and connected Frontend evidence. Original source files retain their development
headers; the browser must receive only the verified generated stylesheet and
separately reviewed pure drawing ports.

## Actual verification

- All twenty original files matched their recorded Git commit bytes and parsed as
  SVG XML, with the recorded viewBoxes.
- Five focused tooling tests passed: complete deterministic embedding without
  geometry changes; altered source rejection; missing file rejection; edited catalog
  rejection; correct ward roster/depth metadata.
- The tests are included by the existing `npm run test:tooling` glob.
- `git diff --check` passed.

Full verification, combined browser tests, real-phone/screen-reader checks and
deployment have not been performed by the original common-art candidate.
The later source-port checks are recorded in `board-v2-source-adoption.md`.
The pending Backend and Frontend PRs keep their own verification evidence. This
source bundle introduces no gameplay decision, new deadline, permission or service.
