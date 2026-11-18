# Screen Designer: first pre-game review

**18 November 2026 · for Integration and Frontend · [handover #311](https://github.com/Amirkianfar66/GameN/issues/311).**

I found no new blocking visual discrepancy in the five reviewed parts at **390 × 844** and **430 × 932**. Their existing canonical components can stay as released. This is the Screen Designer's assessment, **not the Claude Lead Designer's required acceptance** of [#314](https://github.com/Amirkianfar66/GameN/pull/314). The shared-reason change remains a proposal; the missing scrolled Host code evidence is supplied below.

## Candidate and evidence limits

- PR #314 head: `a5a6cdffa913c8a08248f7e02f5f48fc1944ced6`; runtime: `39961a807d811aa2efb177f888302da17f0c2431`.
- Base: #308 at `5f36e3f57561e967d1acdaa81f9ea0eccdec8d34`. The runtime-to-head diff adds evidence only. The canonical components, shared kit/shell, icons, tokens, films and release assets are unchanged from that base.
- Integrated artwork: `64e55516d2f0026842c5c2a675f2eccda20e0a9e`. The [original comparison record](../../../frontend/evidence/pregame-connection-311/comparison/compare.json) identifies both the pack and clean build at `39961a80`.
- The five original pack/build pairs are **390 × 844 only**, on the comparison server's own headers. Their `was` findings date from 11 November and their `now` values are null. [This review's findings](findings.json) are separate; historical findings have not been overwritten.
- The eight [guarded interaction captures](../../../frontend/evidence/pregame-connection-311/README.md) match all eight recorded SHA-256 values. The two Settings captures below come from Frontend's original phone-checker run on the **same clean runtime**, not the older `5d35f110` images committed under the design review directory. Both hashes match the original record.
- Guarded captures use the staging response headers, hash `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`. [Original values](../../../frontend/evidence/pregame-connection-311/checks.json) · [selected original Settings record](settings-check.json). The known caught Zod feature probe is classified in that record; no unexpected policy report or page problem is recorded for Settings.
- The pack includes 47 px/34 px safe areas; the integrated phone harness has none. Fixture seats, characters, rooms and role facts differ as documented in G1–G18 of [the existing connection handoff](../../components/pregame-connection.md). Those differences are not new screen designs.
- These are synthetic desktop Chromium sessions. Still captures do not establish motion readability, real-phone layout, Safari, VoiceOver, live multiplayer behavior or performance. I did not rerun Frontend's interaction journeys or the films.

**Rule reference:** no gameplay or version change. The standard phone checker uses `PLANET_PHONE_OFFER_PINS` (protocol 3, `planet-game-1.2.0`, `in-person-planet-private-feedback-2026-11-06`); Frontend's guarded journey uses the `blackout` fixture (`planet-game-1.3.0`, `in-person-planet-blackout-before-vote-2026-11-10`). The supplemental component preview retains its existing `PLANET_FOOD_TASK_PINS` (`planet-game-1.4.0`, `in-person-planet-food-task-2026-11-12`) and `design-0.9.0` fixture. These are review inputs, not a new admitted release combination. Their exact hashes remain in `packages/contracts/src/planet-game.ts` at the pinned candidate.

## Five-part assessment

| Part / pack state | At both phone sizes | Evidence |
| --- | --- | --- |
| `recover`, sheet 14, Seat recovered | Check tile, confirmation, subtitle and Continue follow the pack composition. Seat 6 is the fixture's verified seat. Continue remains separate from recovery settlement. The entry pair also shows the host/private-display note; no code-length hint is invented (G4). | [390](../../../frontend/evidence/pregame-connection-311/guarded/390x844-recovered.jpg) · [430](../../../frontend/evidence/pregame-connection-311/guarded/430x932-recovered.jpg) |
| `characters`, sheet 16, grid with refusal feedback | Header clock, 3 × 3 portraits and footer fit. The refusal uses the released toast; no duplicate error panel is added. The 430 capture catches its fade, so it supports placement, not a readability-duration claim. | [390](../../../frontend/evidence/pregame-connection-311/guarded/390x844-character-refusal.jpg) · [430](../../../frontend/evidence/pregame-connection-311/guarded/430x932-character-refusal.jpg) |
| `role-ready`, sheets 17–18, Ready pending | The existing back hides the role; the busy Ready control and privacy cue remain visible. Show role is refused via `interactive: false`. Its undimmed appearance follows the shared kit's explicit non-interactive policy; it is not evidence of an offered action. Facts remain null (G7). | [390](../../../frontend/evidence/pregame-connection-311/guarded/390x844-ready-pending.jpg) · [430](../../../frontend/evidence/pregame-connection-311/guarded/430x932-ready-pending.jpg) |
| `settings`, sheet 32, Settings · host | Switch, three text sizes, local-only note and Host controls row fit and align. The comparison's non-host state correctly omits the Host row; the reused host captures include it. | [390](settings/390x844-settings.jpg) · [430](settings/430x932-settings.jpg) |
| `host-controls`, sheet 15, list / Code · hidden | Separate sheet, privacy cue, code card, note and footer use the released source. Hidden code wraps only between groups: two lines at 390, one at 430. The missing expiry remains G4. Closing/concealing cleanup is supported by Frontend's recorded journey, not by a still alone. | [390](../../../frontend/evidence/pregame-connection-311/guarded/390x844-host-code.jpg) · [430](../../../frontend/evidence/pregame-connection-311/guarded/430x932-host-code.jpg) |

The reference sheets inspected are 14, 15, 16, 17, 18 and 32 under `design/phone-ui/review/sheets/`, together with all five original comparison pairs. The guarded captures at each size were inspected directly. No new artwork, wording or layout exception is proposed for these five changes.

## One file-specific handoff to Frontend

All paths in the second column start at `design/phone-ui/components/`; each module keeps its adjacent canonical CSS. The same module is already imported by its `preview/` and the game. **No adapter or component API change is requested by this review.**

| Surface / canonical version | Component files and interface to retain | Frontend-owned connection |
| --- | --- | --- |
| Recover 0.1.1 | `recover/recover.mjs`: `mountRecover`; `view`, `matchId`, `seat`, `recover: { enabled, busy, reason }`, errors and code-length input. `onMatchId`, length-only `onCode`, one-time `onRecover({ matchId, recoveryCode })`, `onContinue`, `onBack`. | `apps/game/hosted/planet/pregame-input.mjs` and `pregame-screens.mjs`: keep the requested match through uncertainty, use the verified seat, and enter the match only on Continue. Retain #314's exact-retry handling. |
| Character selection 0.1.0 | `character-select/character-select.mjs`: `mountCharacterSelect`; authorized `characters`, `holders`, `mine`, `choose`, `closed`, `timer`, `toast`; `onChoose(id)` and `onRetry`. | The same two adapter/controller files: keep refusal text in the supplied `toast`, derived from the session receipt. Do not derive availability or closure from the displayed clock. |
| Role stage/card 0.1.0 | `role-stage/role-stage.mjs`, `role-stage/role-card.mjs`: `mountRoleStage`; `card`, `ready`, `interactive`, `status`, server `clock`, `view`, `film`, `roster`; `onReady`, `onShowRole`, `onSkipFilm`, `onRetry`. The shared card stays unchanged. | `pregame-input.mjs`, `pregame-screens.mjs` and the existing film controller: preserve `interactive: false`, `card: null` and `ready.busy` during Ready. Frontend owns settlement, disclosure and film lifecycle; Animator supplies the film source. |
| Display Settings 0.1.1 | `display-settings/display-settings.mjs`: `mountDisplayPage` / `mountSettingsSheet`; `textScale`, `reducedMotion`, `motionLock`, `hostControls`, `interactive`; `onTextScale`, `onReducedMotion`, `onHostControls` (and `onBack` for the page). | `apps/game/hosted/planet/preferences.mjs`, `pregame-screens.mjs`, `match-settings.mjs`: retain local preference storage, one mounted sheet, focus and the host-only row. |
| Host controls 0.1.2 | `host-controls/host-controls.mjs`: `mountHostControls`, `hostControlsSheet`; `view`, per-command offers, `seats`, `retry`, `code: { seat, name, matchId, revealed, value, minutes }`. Row intents: `onDeadline`, `onBots`, `onIssueRecovery(seat)`, `onAbortAsk`; footer intents through shell `onSheetAction`: reveal/hide/copy/keep/abort/retry. | `apps/game/hosted/planet/match-settings.mjs`, `pregame-input.mjs`: retain #314's disposal on close/conceal, fresh list on reopening, private code only while revealed, original-request retry and `hostSettle`. Never manufacture expiry or the seat of a restored request. |

Each mount keeps its existing `update`/`dispose` contract. Frontend continues owning focus/input accessibility, navigation, recovery, trusted timing and runtime performance. Screen Designer owns canonical screen composition and film placement. Shared kit, shell, icons, tokens, stamps, frozen prototypes and `design/releases/**` remain with their existing owners.

## #295 notes and next owners

| Item | Result and next owner |
| --- | --- |
| Repeated shared reason | Still present in `host-controls.mjs` → `paintList()` / `paintCommand()`, including the existing `retry` preview. [Lead's prior acceptance](https://github.com/Amirkianfar66/GameN/pull/295#issuecomment-6946521004) explicitly calls this non-blocking. **Screen Designer** proposed one released-kit notice for an identical nonempty refusal shared by all supplied rows, keeping per-row accessible reasons and mixed reasons. [Proposal sent to Lead before implementation](https://github.com/Amirkianfar66/GameN/pull/295#issuecomment-6980393840). Await Lead's treatment decision; then use a separate canonical-source change and renewed integrated acceptance. No Frontend workaround or API addition is requested. |
| `real-largest` capture scrolled to code | **Supplied in this change**, without altering the released component or its original review. At 390 the code is three lines after 203 px of sheet scrolling; at 430 it is two lines after 64 px. Every group and both footer actions are visible, with no split group or horizontal overflow. [390](host-scroll/390x844-real-largest-scrolled.jpg) · [430](host-scroll/430x932-real-largest-scrolled.jpg) · [record, actual URLs and headers](host-scroll/scroll-check.json). Lead can close this evidence note after inspection. |
| #314 visual acceptance | **Claude Lead Designer**, independently, must accept the five integrated parts and candidate in #314. This report cannot substitute for that comment/review. |
| Guarded journey reproducibility | **Frontend** should preserve its existing journey script and the original run URLs/provenance with #314's packet. The eight image hashes and results are present, but that packet does not include the journey driver or exact original local origins. The source is currently `/private/tmp/gamen-pregame-311-candidate-proof.mjs`; its routes are `/?test=recover-normal`, `recover-retry`, `host`, `refused-choice` and `films`. I read it for provenance but did not copy or change Frontend's harness. The selected Settings record likewise does not retain its original ephemeral port; its route/steps are in `design/tools/pregame-connection-check.mjs`. **Integration** decides whether the supplemented packet meets the existing merge gate; do not treat still-image review as complete release evidence. |
| Food source admission | **Integration**, in the existing release work, owns the reviewed consumer registration and preserved historical pins. This review does not bypass the gate or authorize a deployment. |
| Physical-phone acceptance | **Frontend** owns remaining physical iPhone, Safari and screen-reader checks. No such result is claimed here. |

## Supplemental check and validation

`design/tools/host-controls-scroll-check.mjs` is the only new source tool. It bundles the existing Host controls preview, verifies the actual served headers, scrolls only the sheet body, asserts that the complete real-format code fits, and records source/tree identities, URLs, measurements and image hashes. Its clean capture source is `ab0d4dec`; only the tool differs from #314, and the recorded component/art trees remain the candidate's. The 47 px/34 px safe areas and synthetic 15-minute preview value are fixture inputs, not new game-side fields.

From a clean checkout with the workspace built:

```sh
node design/tools/host-controls-scroll-check.mjs --out /private/tmp/gamen-host-controls-scroll-review
```

The output directory must be outside the checkout during capture. The tool leaves historical review files unchanged. Its preview evidence supplements the real-app captures; it does not replace them.

Checks run for this change: Node 22.21.1 / npm 10.9.4; offline dependency install with lifecycle scripts skipped; workspace build; pure/browser typecheck; Host controls' nine existing tests; the new supplemental check (2/2); syntax and whitespace checks. The eight guarded hashes and both reused Settings hashes were independently checked. The 20-state phone checker and original session journeys were **reused, not rerun**. No film, gameplay, adapter, shared visual source, release registry or deployment was changed.
