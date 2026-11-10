# Blackout successor verification

Issue [#211](https://github.com/Amirkianfar66/GameN/issues/211), branch `codex/backend-blackout-before-vote`, stacked on PR #210. This is local implementation evidence, not a deployment or activation record. The owner decision is dated 10 November 2026; acceptance runs continued on 11 November in Europe/Rome.

## Identity and version impact

Actual clean start: `19564d0c618dae9995bbd92979d248e82dba0a8f`. The prior phone Backend branch/PR remains separately reviewable. Integration's owner record `8685e5fb12bfa64c609442d6cd7acb6e5052d54e` was adopted as `7958c9f590b2bf0e074cd32c67ce0bf0202b6279`.

Exact shared contract checkpoint `44d008df0f1cc6fbb2d6c4c0b4b9c95f50c752c3` received Integration and Frontend acknowledgement. The new protocol-3 tuple is `planet-game-1.3.0` / `in-person-planet-blackout-before-vote-2026-11-10` / SHA-256 `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`. Its focused overlay hash is `a92bcf32199124aa6883bd404adb6a39733741232e685a929d9b5f58fca61d09`. All 25 bound source hashes and three preserved authorities match. No old authority/overlay/approval bytes were rewritten.

Runtime source freeze: **`c492523845567c7e4e672991e11c058e88ccea27`**, tree `6c515b8c8c6ef5ab56c9f2696ee11ecca533c90d`. This includes core `6a49af53554acd57f60722605b605812696498ce` (root `ea32a05c7b45e1681e12a7b11536354427abba4c`), explicit inactive creation profile `66b51aab67b1214ccc9312b48a44e03a4aba8cff`, and bounded restore guard `ac83316f34ff0c91778e5b22d1400354c0e67eb7` (root `c4925238`). Subsequent commits add tests/audit or handoff documentation only. The PR head supplies their exact final identity without a self-referential commit SHA in this file.

Profile `blackout-before-vote-1.3` is an independent explicit new-creation selection. Existing defaults remain engine 1.1, with saved setup/asset/profile behavior unchanged. Saved 1.0/1.0.1/1.1/1.2 matches retain their exact old behavior and omit new checkpoint metadata. The candidate inherits the 1.2 private offers, P27/P28 and private feedback. No new command, receipt, duration, shooting/role/Promise/window rule or consumer field beyond the reviewed checkpoint is introduced. See [the contract](planet-blackout-before-vote-contract.md).

## Actual executed evidence

Node `22.21.1`, npm `10.9.4`; Java `21.0.13` for local emulators. The paired checkout used fresh offline `npm ci`, installing 887 pinned packages from the existing cache. Suites below overlap and must not be added into a unique-test total.

| Check | Source and actual result | Local evidence |
| --- | --- | --- |
| New/historical schema, source-hash, phase/round and inherited-offer controls | Shared `44d008df`: 25/25, zero failures/skips | `/private/tmp/gamen-blackout-contract-tests.log` |
| Independent replay of captured 1.2 predecessor against the shared contract build | Before engine edits: 10/10, 41,443.83 ms | `/private/tmp/gamen-blackout-root-predecessor.log` |
| Complete engine plus Blackout contract suite | Core `6a49af53`: 1,458/1,458, zero failures/skips, 378,158.50 ms under concurrent CPU load | `/private/tmp/gamen-blackout-engine-all-tests.log` |
| Original/Sync/1.1/1.2 historical goldens | Core: 45/45; independent 1.1/1.2 subset: 20/20, 97,218.79 ms | `/private/tmp/gamen-blackout-independent-history.log`; engine suite above |
| Independently authored outcome/publication cases | Fixed source `ac83316f`: 81/81, zero failures/skips/cancellations, 164,396.28 ms; initial core pass: 81/81, 154,881.99 ms | `/private/tmp/gamen-blackout-independent-post-guard.log`; initial `/private/tmp/gamen-blackout-independent-final.log` |
| Focused restore/ledger/abort controls | Fixed source `ac83316f`: 20/20; independently authored restore matrix: 3/3, 9,569.87 ms | `/private/tmp/gamen-blackout-restore-after-guard.log`; independent audit |
| Integration's independently assembled outcome/restore/abort/ledger/predecessor selection | Fixed runtime, isolated `0478c962`: 114/114, zero failures/skips, 140,799 ms; pinned install and contracts/engine build passed | `/private/tmp/gamen-root-blackout-acceptance.log` |
| Complete game-api and Firebase unit suites | Fixed runtime `c4925238`: 395/395, zero failures/skips, 34,881.23 ms | `/private/tmp/gamen-blackout-final-backend-unit.log` |
| Genuine Firestore service transactions on isolated private ports | Pre-guard runtime `5edd79fe`: 9/9, zero failures/skips, 30,497.44 ms | `/private/tmp/gamen-blackout-data.log` |
| Real HTTP/Functions/Tasks connected acceptance | Fixed runtime `c4925238`: 1/1 covering all 7/8/9 journeys, zero failures/skips, 96,829.38 ms | `/private/tmp/gamen-blackout-final-functions-connected.log` |
| Isolated paired full workspace build and typecheck | Passed at `3a68b108` (Backend tests/audit head `0478c962` plus reviewed Frontend compatibility `eec7a5f8`) | `/private/tmp/gamen-blackout-paired-{build,typecheck}.log` |
| Backend source/workspace integrity and diff whitespace | Passed; final handoff repeats integrity/whitespace checks | `/private/tmp/gamen-blackout-current-{sources,workspace}.log` |

The final independent 81-case rerun executed fixed source `ac83316f` at audit head `9b6402c16bb1d36ec4ea63112e4023ad026f5c4c`, tree `cba606dd02d79dc96ded6da61a816d417ee771dd`. Its later documentation-only update preserves the earlier evidence. The complete engine and historical results are explicitly the pre-guard core; the bounded guard changed only candidate saved-marker consistency. Fixed-source full outcome, service, restore and connected checks exercise that change directly.

Commands: build the contracts/engine/game-api/Firebase workspaces, then `node --test services/game-api/test/*.test.mjs infra/firebase/test/*.test.mjs`; engine owner ran `node --test packages/engine/test/*.test.mjs tests/bootstrap/planet-blackout-contract.test.mjs`. Independent files are `planet-blackout-before-vote-independent.test.mjs` and `planet-blackout-before-vote-restore-audit.test.mjs`. The genuine Firestore file is `services/game-api/test-emulator/planet-blackout-before-vote.test.mjs`, run with only local Auth/Firestore and an explicit service clock. These are labelled native-prefix/constructed service controls, not real elapsed gameplay acceptance.

The separate real-time command uses the unchanged repository emulator configuration, demo project and canonical guards:

```sh
MOTHERSHIP_PLANET_CREATION_ENABLED=true \
MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.8.0 \
MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=3 \
MOTHERSHIP_PLANET_ENGINE_PROFILE=blackout-before-vote-1.3 \
MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 \
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
  --config infra/firebase/firebase.json --project demo-mothership \
  --only auth,firestore,functions \
  'node --test infra/firebase/test-emulator/planet-blackout/connected.test.mjs'
```

Use the pinned Node/Java paths described above. This is a dedicated inactive-profile suite outside the historical flat Functions catalogue; no root gate/timeout/required historical suite was altered. Process-local emulator settings are not cloud configuration changes.

## Covered behavior and limits

Seven/eight/nine-player cases separately exercise optional Sync, full shared five-lit/ten-dark targeting, admission/target freezing, consuming misses/timeouts, private first choice, late/duplicate/recovered work and one completed batch. Eight/nine-player cases include both Disablers, mutual incapacity and same-target strikes; seven players has only Blue Disabler. Damage respects Clone before Protection, existing Command immunity, stored actor ordering, numeric last-bed competition and retained bodies. Early overflow remains permanent before either later Doctor or reserved panel healing. Ordinary actions, Rescue, Supply, aging, reveals, Clone expiry and No survivors remain deferred. Empty-electorate/no-survivor controls retain full voting/result time. Forced Hospital movement changes giver-only Meet at its actual opportunity; P18 remains available to a living Hacker during the window until navigation.

The real connected test first creates actual demo Auth identities and admitted human/display seats. It seeds one explicitly labelled native pure-engine prefix at Blackout, with real-time-aligned recorded contexts. It does **not** claim a fresh lobby-to-Blackout human journey. After that seed, only real HTTP commands and private Functions/Tasks advance state; no client advance/runBots call, injected service clock, manual task callback or further private-state mutation is used. It observes the actual dark boundary, private choices, both admitted mutual strikes where present, committed Hospital injuries, a fresh full 60-second vote, all living ballots, five-second result with real Hospital detention/reservation, later reserved Rescue, next-round carry and unchanged earlier injury occurrences. This is connected API/server acceptance, not a browser/phone consumer test.

Abort/reconnect coverage preserves the last shared board, offices, events, category and publication round at every checkpoint, including deliberately divergent speculative worlds. Full snapshots include actual Jail changes while retaining AFTER_BLACKOUT as their partial-resolution category. Generic block cues stay room-only; public/bystander packets do not reveal request count, actor, choice, defense source, Code or branch. Later finalization cannot restamp earlier clinical events.

The independent audit distinguishes an interrupted first draft, the initial 78/81 comparator error involving the Protection donor's legitimate private consumption ledger, the corrected cue/whole-packet boundaries, and the genuine restore inconsistency. The inconsistency was reproduced as 0/3 before the guard and closed by positive/negative restored-stage tests. No ordinary player-command exploit or human-balance conclusion is claimed. See [the independent audit](planet-blackout-before-vote-audit.md).

The immutable 1.1 fixture remains SHA-256 `2bc5d5c9360b712b1d790e014675eed58e7c2b463c11a3defd7e89127a17d086`. A separate compact 1.2 fixture was captured on unchanged `7958c9f5` before any engine edit, SHA-256 `79c839089ee686173e9951e9fd699eb46b4b4dc734da7e4932570d13914201b3`. Its legal input histories originate in the 1.1 corpus but were executed again under original 1.2 pins; expectations were not generated with the new engine. Both compare full authority, public/all-player hashes and command receipts. No historical artifact was regenerated to match new behavior.

Both successful connected runs exited 0: initial core acceptance passed 1/1 in 100,072.68 ms, followed by the final fixed-runtime run above. Early task deliveries were refused/retried rather than shortening phases. The first run logged a pending availability error during shutdown; the final run logged a pending request's connection refusal during shutdown after successful assertions. No error-free log claim is made. All owned private and canonical emulators stopped; listener readback confirmed ports released to Integration/Frontend. Abort cleanup requests were best-effort and not independently read back; these were ephemeral demo rooms with no import/export persistence, discarded on shutdown.

## Remaining integration gates

Backend alone reproduces the existing native `session.ts:85` TS2322 (`2 | 3 | null` versus `2 | null`), logged in `/private/tmp/gamen-blackout-alone-build.log`. Pairing exact reviewed compatibility `eec7a5f83598324a4653839b808ed4afdb1c2461` in a separate checkout fixes full build/typecheck, but `check:sources` correctly rejects its changed native session bytes. That paired compile is not engine-1.3 UI acceptance. Historical source/art approvals and fences are untouched.

Integration's scoped source review found no further valid-path blocker and accepted the bounded restore fix after its independent 114-test run. This does not establish final consumer or release acceptance. Frontend's 1.2 PR #212 and its browser evidence do not establish 1.3 presentation. Its separate exact 1.3 dispatch/checkpoint labels, connected consumer evidence and Integration's exact native source adoption remain pending. Required combined CI, final runtime/consumer adoption and merge/release acceptance are not claimed complete; full `npm run verify` is not claimed passing. Backend did not run browser captures, physical devices, human balance, hosted/cloud/IAM/load acceptance or a new capacity suite. Capacity timeout/source evidence is unchanged from the parent work.

No gameplay decision remains open in this approved package. Release dependencies remain. Existing match pins, creation defaults and setup/art selection are unchanged. All capable workers and the reviewed consumer must precede any separately authorized activation; rollback of creation selection must retain saved-session capability. No Frontend/Designer/source-approval/root-CI/cloud/IAM/configuration edit, issue #206 retry change, merge, deployment or public asset publication is part of this Backend change.
