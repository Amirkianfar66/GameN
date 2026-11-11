# Native phone and pre-vote Blackout release

Integration issue: [#215](https://github.com/Amirkianfar66/GameN/issues/215). Status: preparation and review; not deployed. The owner has authorized finishing the integrated release and publishing to the existing staging project after all checks pass.

## Intended behavior

The native phone interface adds compact Host/Join/Recover flows, one-tap room-code copy, the 3-by-3 character grid, icon controls, a current-room view with Board/Room navigation, direct room-tag movement, and character-grid voting/results. Setup flow 3 presents the private card for 20 seconds and its role film for 10 seconds. Human Ready remains explicit after the reading minimum; all participants then share the separate full 10-second boarding stage. Animation completion does not advance authority.

For newly selected engine 1.3 matches, the shared Blackout remains five seconds lit and ten seconds dark. Its admitted attacks, defenses and immediate Hospital/overflow consequences settle before a fresh full 60-second Jail vote and five-second result. Remaining ordinary resolution and Rescue follow the result; navigation follows finalization. Publication labels distinguish the partial post-Blackout board from a completed round. Existing matches retain their saved gameplay, setup and artwork tuples.

The artwork remains the immutable `design-0.8.0` release. Designer PR #207 is the interface reference; its prototype and the separate room redraw in #197 are not shipped by this change. Source admission is an exact native-consumer extension, with unchanged historical approvals, ports and original drawing sources.

## Explicit creation selection

The intended staging selection, supplied only to generated release artifacts, is:

```text
MOTHERSHIP_PLANET_ENGINE_PROFILE=blackout-before-vote-1.3
MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=3
MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.8.0
```

The corresponding gameplay tuple is protocol 3, `planet-game-1.3.0`, `in-person-planet-blackout-before-vote-2026-11-10`, authority hash `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`. Creation enablement is separate. None of these values changes an already saved session.

Pass the same explicit engine-profile environment to `scripts/prepare-hosted-preview.mjs` when building the final reviewed Hosting artifact. Its nested `planetRelease` metadata records the intended new-match profile; it neither configures the server nor rewrites artwork pins. Omission retains historical 1.1 metadata. Root protocol-2 Hosting and `/development/design-studio/` remain available.

## Acceptance before publication

Use the final clean committed combined candidate and pinned Node 22.21.1/npm 10.9.4. Record actual results and source identities:

1. Exact native-consumer approval/fence and preserved source checks; no local-review override in production.
2. `npm run verify`, browser dependency/exclusion checks, and both classic and Planet backend package verification installs.
3. All required GitHub checks, including the dedicated `blackout-before-vote-1.3` HTTP/Functions/Tasks test. Historical-profile emulator results cannot substitute for it.
4. Source-specific native browser review and real connected acceptance, including authoritative receipt recovery and usable post-Rescue room views. Keep failed attempts and distinguish constructed/native-prefix history from a full lobby-to-round journey.
5. Production Hosting/Studio build, immutable artwork output validation and final artifact provenance.

The existing intermittent Firestore emulator duplicate-command issue [#206](https://github.com/Amirkianfar66/GameN/issues/206) remains a separate diagnostic follow-up. PR #212's backend data job reproduced its exact signature on the nine-player case. That failure is retained; it is neither a green dependency check nor permission to weaken an assertion. Final combined CI must pass.

## Staging publication and readback

Use only `gamen-mothership-staging` and the approved publishing account `amir.kianfar.social@gmail.com`. Deploy only the five `mothership-planet` workers through the isolated Planet artifact. Preserve classic/Studio functions, rules, Auth, and existing access policies.

Backend's bounded read-only preflight on 11 November Europe/Rome found all five workers active on Node 22, using `742846764120-compute@developer.gserviceaccount.com`. API currently selects creation enabled, setup 2 and artwork 0.8; the other workers have creation disabled, setup unset and artwork 0.6. Engine profile is unset on all five. These are creation selections, not evidence that a worker cannot process saved versions.

The running `planetDeadlineTask` queue already grants that identity queue-scoped `roles/cloudtasks.enqueuer`. The private `planetdeadlinetask` service already grants it `roles/run.invoker` with no public principal. The enabled one-minute repair scheduler uses the same OIDC identity and matching audience. Existing Eventarc/Cloud Tasks/Scheduler service-agent permissions are present. No new grant is requested by this preflight. It does not prove deployed delivery; repeat the scoped readback after release.

Deploy capable workers with Planet creation disabled while validating the new release. Check queue-scoped enqueue permission and private task invocation after every Functions deployment; preserve etags and unrelated bindings. Do not make the task endpoint public. Publish the reviewed Hosting artifact, then enable the explicit new-match selection after client/worker compatibility is established. This document does not grant new IAM scope.

Read back the live release metadata and selected new-match tuple. Perform one labelled staging smoke through actual authenticated host/player/display controls, with automatic setup/deadlines and original-session recovery. Use the authorized host abort to clean up only that smoke session. Never reset real user games. Record actual observed state, timings, source/artifact hashes, cleanup and any transient failures without credentials or private match payloads.

If new creation is unhealthy, disable only Planet creation. Keep the workers and client capable of processing every already saved tuple. Do not roll back to an old client/worker that cannot recover a newly created 1.3 session.

## Remaining evidence limits

Desktop Chromium emulation is not physical iPhone/Android, Safari, VoiceOver, low-end-device performance, network load or human balance evidence. These limits remain explicit in the final release receipt. A staging playtest does not establish that the game is balanced.
