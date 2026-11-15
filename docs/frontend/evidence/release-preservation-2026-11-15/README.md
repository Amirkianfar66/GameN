# Restored Food films: native review package

Candidate **de6126dcb00fb1c7875de5396c8ab8783c55465e**, clean. Feature record: [PRESERVE-FILMS in #222](https://github.com/Amirkianfar66/GameN/issues/222). Integration supplied the shared exact release registry in #264; Frontend connected the existing films, crew and library consumers. No artwork, motion source, timing, rules or saved match pins changed.

The [report](report.json) is the original capture output, with hashes, candidate/artwork identities, response headers, browser version, fixture bundle identities and seven observed browser checks. Its absolute paths name the capture location; the same hash-verified images are alongside this file. [Review inputs](review-inputs.json) identify the changed runtime gates and shared capability data; this inventory is **not** source admission or Designer approval.

## Captures for Designer

The affected comparison parts are **role-card**, **role-film**, **role-ready** (sheet 17; role-card also 31) and **boarding** (sheet 19). The restored visuals use the previously accepted film renderer and byte-identical art. Compare against the approved pregame films/phone sheets; the full production-side comparison and explicit visual acceptance remain pending. These captures establish actual native rendering under production headers, not a new design approval.

| State | 390 × 844 | 430 × 932 |
| --- | --- | --- |
| Card before film | [Card](390x844-food-role-card.jpg) | [Card](430x932-food-role-card.jpg) |
| Role, full motion | [Role film](390x844-food-role-full.jpg) | [Role film](430x932-food-role-full.jpg) |
| Role, reduced motion | [Still role](390x844-food-role-reduced.jpg) | [Still role](430x932-food-role-reduced.jpg) |
| Ready after reading | [Ready](390x844-food-role-ready.jpg) | [Ready](430x932-food-role-ready.jpg) |
| Boarding, full motion | [Boarding](390x844-food-boarding-full.jpg) | [Boarding](430x932-food-boarding-full.jpg) |
| Boarding, reduced motion | [Still boarding](390x844-food-boarding-reduced.jpg) | [Still boarding](430x932-food-boarding-reduced.jpg) |

## What ran

- Pinned Node 22.21.1/npm 10.9.4, locked install, workspace build and typecheck passed on this candidate.
- [117 focused checks](focused-tests.txt) passed: pregame timing, crew dispatch, sessions, pre-vote/Food consumers, library presentation and the exact release matrix. Frontend also reported all 1,046 Frontend tests passing on original consumer commit a629fb66; that broader suite was not repeated after the shared data-only registry correction.
- Seven desktop Chromium journeys passed with the actual Planet app and SVG renderer, synthetic session transport, exact production response headers and 67 unchanged art files verified against the deployed #260 inventory. The first Food Role SVG appeared at 20,069.75 ms; Ready became enabled at 30,013.35 ms while still in reading. Boarding rendered within its saved 10-second interval. Local Skip did not advance authority; expiry waited for an engine-projected subsequent Food snapshot.
- Recovery sought the saved interval, explicit concealment survived reload, authorization loss cleared private pixels, and the shared display received no role. Historical 0.8 rendered; mixed/forged tuples rejected. Reduced motion held a still Role beat and rendered Boarding.
- All 12 JPEG hashes were rechecked. Integration visually inspected representative full/reduced Role and Boarding captures. This is technical review, not Designer acceptance.

No page/request failures occurred. Chromium recorded Zod's caught `eval` capability probe, identified by its exact expression; no policy relaxation was made. The fixture build emits the existing large-chunk warning. Physical phones, Safari, low-end performance, connected Firebase sessions and live deployment were **not run** for this correction.

## Reproduce and remaining adoption

After `npm ci` and `npm run build`, run `node apps/game/dev/pregame/capture-preservation.mjs --baseline-hosted-output=PATH --published-release=PATH --output=PATH` with loopback/browser permission. The baseline directory must be a clean checkout's verified hosted output; the published release inventory must identify its exact artwork. The script checks all supplied art hashes and builds the changed native consumer with the fixture transport. It does not bypass or produce the production Hosting build.

The production source fence correctly rejects the changed consumer pending new exact-file admission. Integration must register the three changed consumer files and shared registry dependency without editing historical approval records, and complete the ordinary candidate Hosting build after Designer acceptance. Until then this is a review package, not a publishable release. Designer's verdict must be posted in the consumer PR against these inputs. Documentation/evidence-only follow-up commits do not alter the captured renderer.

Room artwork/ambient components #261/#262 and ship-life #230 remain separate tracked work in #222. This correction neither adopts nor silently excludes those features from their own planned releases.
