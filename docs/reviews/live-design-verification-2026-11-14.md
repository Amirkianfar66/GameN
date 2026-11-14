# Integration verification of Designer's live findings — 14 November 2026

Baseline: main `0d4fde64890deda546002e728f0b5d6005a5cd8d`. Live Hosting reports clean source `a4c0e68f23105b6a25c2d4f403342562628e7a5f`; the reviewed source and merge trees are identical. The bundle is `bc381ada656d211c9ba99cb67bedd5a4fa352a72701a6790fc850b4dcfda390b`, art `design-0.9.0`, engine `planet-game-1.4.0` and Food rules `in-person-planet-food-task-2026-11-12`.

Sources: [Designer entry review](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6883175136) and [owner iPhone evidence / missing art](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6883358473).

## Findings independently verified

| Finding | Evidence | Result / owner |
| --- | --- | --- |
| Food room and crew blocked by production CSP | Live response has `img-src 'self' data:`. `food-assets.mjs:14–18` loads the uniform catalogue into SVG object URLs, and `food-scene.mjs:15,24,26,56` embeds them as images. The unchanged native compositor under the exact published header block produces three image-policy violations. Adding only `blob:` restores the room and both operators, with zero image-policy violations at both required sizes. | Confirmed P1. Integration owns the narrow policy fix. |
| Approved room art absent | Live `art/scenes.art.0ff8b3c930.css` matches its published digest. Its decoded Room B property is byte-identical to the OLD source stylesheet's property (SHA-256 `dd227db8d2c25030227843fd13d7067d05062ce191973ba1f72892aa85034e8e`). The approved Room B asset is `1e64b95cc54f46cdb26da20e5bfac31b473f234cf66aad907f725de01c45520e`; `room-drawing-1.0.0` is not adopted in the live art selection. The live Room B screenshot shows the old atom screen and narrow window. | Confirmed P1. DSN-REQ-18 remains required Integration/Frontend adoption work even though source PR #197 is merged. |
| Ambient windows not integrated | The deployed source's native room renderer/import graph has no integration of the sheet-55 ambient source/voyage. DSN-REQ-23 records the unimplemented layer. Crew idle/other event films are separate and do not satisfy this request. | Confirmed source-level gap. Designer owns the canonical runtime-safe component; Frontend wires the server-clock input. No gameplay change is required by this motion handoff. |
| Framing / Pass / top bar / labels differ | Live 390x844 screenshots show the empty room bands, flat Pass tab, multi-line `Current board · shared:` wording, seconds-only clock and old tags. `phone-layout.mjs` still fits all rig slots rather than the approved visible-figure framing. #227 is not merged. | Confirmed against the phone pack. These are outstanding design-integration requirements, not silently approved omissions. |
| Harness misses production failures | Frontend's read-only audit found nine standalone Food capture servers with content-type only, no production headers. Runtime-exception-only assertions do not reliably detect CSP-blocked images. | Confirmed process defect. Production-header evidence is now required in this PR's proposed gate update. |

The earlier Food acceptance covered the supplied header-free captures; Designer has explicitly qualified it. Integration's earlier successful file-hash checks proved delivery, not whether the browser was permitted to draw those files. The previous setup-to-Round-1 smoke did not inspect the active Food participant scene. It should not have been used to imply full deployed visual acceptance.

## Actual checks and limits

- Read the current main identity and public Hosting metadata/headers; no private server records or credentials were inspected.
- Ran a labelled normal Chrome host/player match with six bots. Sign-in, lobby, setup and the Room B/player view were reachable. Captured live Room B and private-talk capsule at 390x844 with no secret role card in the captures. An invitation was accepted, but the active Food scene was not captured before its return; this is not claimed as an independent live Food screenshot.
- Captured the unchanged native Food compositor in a clearly labelled synthetic local fixture with production headers, at 390x844 and 430x932. Published policy: three image violations; candidate policy: zero, with the room and both operators visibly restored. This proves the policy/drawing incompatibility and correction, not a full game journey.
- `node --test tests/tooling/hosted-policy.test.mjs`: 3/3 pass. Source-integrity checks and `git diff --check` also passed. The candidate policy differs from the published policy only by `blob:` in `img-src`; script/default/media/object/frame policies are unchanged.
- Physical iPhones, Safari, screen readers, full motion playback and the other Designer entry-screen findings were not independently retested here.
- The Mac locked during review; native tab selection and final live recapture/cleanup require unlocking. No workaround weakens App Check or changes test-match authority.

## No contradiction to the core findings

The four reported visual problems are supported by the checks above. Two qualifications matter: Designer's first review explicitly stopped at App Check and was not its own gameplay review; the later gameplay findings used the owner's iPhone screenshots. Normal connected Chrome works in Integration's session, so the automation refusal does not establish that every user is unable to sign in. Also, the approved room source PR is merged, while production adoption is missing; those are different milestones.

## Corrective work and release gate

This candidate adds only the image scheme required by the existing Food renderer and a policy regression check. It also records the owner's stronger direct-component rule and the required production-header / two-size evidence in AGENTS.md, the architecture agreement, owner-decisions.md and the PR template. Existing art, rules, native renderers, historical approvals and pinned matches are untouched.

The production capture infrastructure correction should use one shared dev-only applicator reading the exact generated Hosting header block, fail when the artifact is missing, record actual navigation headers and detect CSP/asset failures. Its nine consumers are `food-compare`, `food-ordinary-compare`, `food-layout-audit`, `food-connected`, `food-smoke`, `food-app-smoke`, `food-chrome-regression`, `food-panel-touch-smoke` and `food-recovery-smoke`. Connected emulator captures need same-origin proxy routing or live capture; broadening production `connect-src` is not an equivalent test.

Designer must accept the new evidence in the correction PR before merge. Then Integration can publish the Hosting-only correction and recapture the active Food screen on staging. This report does not claim a deployment, renewed Designer acceptance or complete phone-pack parity. DSN-REQ-18, DSN-REQ-23 and #222 layout items remain explicit required work; their omission is not recorded as owner-approved deferral.
