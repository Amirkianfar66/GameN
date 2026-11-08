# R17 implementation and verification — 8 November 2026

Issue [#199](https://github.com/Amirkianfar66/GameN/issues/199), PR [#200](https://github.com/Amirkianfar66/GameN/pull/200), branch `codex/backend-planet-boarding`. Actual clean implementation start: `469b709b6689a1063ec36a10c70b8b6e2420c18c` in the isolated `/private/tmp/gamen-backend-boarding` worktree. The original Backend worktree remains clean at `82ea5aec787362dd6b66acfc4bcbae2fb64629ed`. Integration's checkout, Frontend, engine, rules, root tooling and all artwork manifests/fences are untouched.

The owner authorized implementation after the earlier planning-only #188/R17 review. PR #198's handoff was read at `e43d5e675cecf5a5a3c8afadea246f8c22cb8a7c`; its final merge/adoption remains Integration-owned. This service work is independently reviewable and does not import the design branch or enable its films.

## Commits and version impact

- `43f45b50095b932436195d3f4a3fd9f92e957aab`: early published contract checkpoint and seven focused contract cases.
- `ab496d9f6cc17f1e81e1e1df4f2be11b8d31c58b`: durable service lifecycle, strict saved-stage checks, 32 service cases and nine Firestore cases.
- `80d85a714f7e93879231b554530e3b468817c2ef`: runtime/factory setting and actual Functions acceptance for both setup flows.

Runtime and test code is the tree at `80d85a71`. Subsequent edits only record documentation/results. The new service setup version is an optional creation-pinned literal `setupFlowVersion: 2`; legacy JSON omits it and unknown explicit saved versions fail closed. Unset or `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=1` preserves historical creation. The new setting is never inferred from artwork. No engine/ruleset/protocol/art version changes: protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / ruleset hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`.

## Delivered behavior

After the existing 30000ms reading minimum and every human Ready, flow 2 enters one atomic `boarding` stage. Bots retain auto-Ready. Prepared roles, characters, public roster, initial rooms and turn order are preserved. The server publishes admitted-only `setup: {id, startedAt, endsAt}` with exactly 10000ms duration and keeps the token private. Role/public/player game views are null throughout boarding; pending/closed admissions receive no roster or interval.

The existing `kind: setup` task/outbox carries the stable stage ID/token. New predicates cover both publication and deadline processing. Early tasks retry; stale, duplicate and aborted jobs do not initialize twice. A delayed authoritative completion initializes the unchanged engine at actual processing time with a fresh full 15000ms PRE_TURN, then a full 60000ms first ordinary turn. Reads, local clock expiry, Skip, completion, asset loads and tab state never advance authority. Recovery retains the existing stage/time/deal and revokes the old UID. Abort before initialization leaves no running game.

Flow-2 journals record `BOARDING_STARTED`, its exact public stage description and the setup version; `INITIALIZE` retains explicit recorded setup and context. Canonical replay ignores the presentation record for pure engine execution and reconstructs exact state/all audiences from actual initialization onward. Legacy journal/snapshot shapes remain unchanged. A frozen copy of the pre-R17 strict snapshot parser accepts old lobby/choosing/reading/running snapshots before and after creation defaults change and rejects flow-2 packets.

## Actual checks

Node `22.21.1`, npm `10.9.4`; fresh `npm ci` completed (887 installed packages). Java 21 for the guarded loopback `demo-mothership` emulators. Passing suites below have no skipped/cancelled/todo cases.

| Check | Actual result |
| --- | --- |
| Build; pure and browser typechecks | Passed |
| Toolchain, workspace and immutable source checks; diff whitespace | Passed |
| Contract suites (`tests/bootstrap/*contract*.test.mjs`) | 152/152 passed, including seven new boarding cases |
| Backend unit/regression (`npm run test:backend`) | 345/345 passed, 25904.492375ms |
| New boarding service cases | 32/32 passed, 2351.297875ms |
| Genuine Auth/Firestore boarding suite | 9/9 passed, 24357ms (rounded) |
| Firebase unit/regression | 135/135 passed, including two new independent-setting cases |
| Actual Auth/Firestore/Functions/Tasks with explicit flow 2 | 2/2 passed, 101616.873167ms; all 7/8/9 rosters observed automatic 30s + 30s + 10s progression |
| Fresh actual Functions suite with explicit legacy flow 1 | 2/2 passed, 86272.890458ms; original initialization retained |
| Existing Frontend regression and production exclusion | 900/900 passed: 217 presentation + 683 game; 75 reachable production modules, no excluded development/fixture/test marker |
| Isolated Planet package install/import and forbidden-source scans | Passed with the existing unmodified packer |

Service unit/data coverage includes minimum/late Ready, duplicate/lost acknowledgements, cross-client Ready/deadline races, early/delayed/lost/stale/duplicate tasks, all-bot readiness, exact first-turn budget, current/expired-stage recovery, abort/privacy, original creation retries across flow/art configuration changes and legacy records. Corrupt active boarding saves (wrong duration, missing token, unsupported flow) reject without initializing or completing their outbox record.

Both real Functions runs used normal authenticated HTTP and automatic private Tasks/Firestore workers, without injected service time, manual advance/runBots, direct task invocation or private state mutation. Flow 2 also verifies an immutable shared host/display stage, no actual game state during boarding, one `BOARDING_STARTED` and one `INITIALIZE`, and the ordinary setup outbox shape. Emulators shut down successfully. One outstanding task logged connection refusal during flow-2 shutdown after all assertions passed; it was not a test failure.

Initial packaging attempted the nonwritable default npm cache, then an empty cache could not reach the package registry. Reusing the writable prepopulated task cache with `npm_config_offline=true` passed; no source check or install assertion was relaxed. The first Frontend run could not bind its loopback fixture servers under default permissions; the permitted local-server rerun passed all 900. No application failures were waived.

Verified artifact: `/private/tmp/gamen-boarding-verified-artifact`, artifact SHA-256 `b617dbe3824995f3e9eb70a2dfe99d30958d3fd14969663836847ab8b5ab0706`, source SHA-256 `ad87380b6deae1b9f8f3dad5c14f9053da2a01b085362c17053244fb30099cfb`. Its metadata records `verifiedStandaloneInstall: true`. Compiled service hash during both Functions runs was `a4ef2c85ff41ecd5993a95f809457c011d221bbd6f91a0e82dce1bbbfb054771`; contracts service module hash `49f71e46a7e6510727da31ed4676f6d0a0325dcc1c408090e9241166cb8cec75`.

The independent read-only audit found no confirmed source blocker. Its active-corruption test gap was closed before the final 345-case Backend run. No separate human Balance signoff, boarding UI/browser/physical-device acceptance, cloud IAM/load/soak, merge or deployment was performed here. Complete `npm run verify`, the full unchanged engine/balance/capacity suites and combined release CI are not claimed from these local results. The normal CI emulator runner continues to select legacy creation; flow-2 actual Functions evidence is the separately recorded explicit-setting run above.

## Release and rollback checklist for Integration

1. Review the exact shared [contract checkpoint](planet-boarding-contract.md) with Frontend and integrate its version/status/interval consumer. Use `setup.startedAt` consistently (Designer `startsAt` is the same value). Keep pending/display boundaries and host abort/recovery controls. At an expired cinematic end, hide pictures and await the authoritative running snapshot.
2. Keep new creation on legacy flow while deploying the new code to **all five** existing Planet functions. Do not enable the API first: old deadline/repair workers can mark a boarding task complete without initializing it. No new queue, endpoint or IAM identity is needed; read back existing private queue/task grants after the final worker deployment.
3. Publish a consumer supporting both legacy and flow 2 and retain each saved artwork inventory. Verify all workers run capable code. Only then set `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2` on `planetApi`, independently of artwork and the authorized creation switch. This PR leaves it off by default and changes no deployed configuration.
4. Use controlled 7/8/9 rosters with separate host/player/display identities. Verify new creation pins 2, saved legacy sessions remain omitted/legacy, normal Ready leads to one ten-second interval, and private workers start fresh PRE_TURN/ordinary-turn time. Reload/recover mid-stage and after expiry, check identity/privacy and abort with no manual timer/bot advancement. Do not record private match payloads or recovery secrets in public evidence.
5. Rollback selects API creation flow 1 (or removes this one setting) and may pause new creation if needed. Keep capable workers/consumers for sessions already pinned to 2; never relabel saved sessions or revert to a worker that discards boarding jobs. Exact retries of earlier creations continue returning their original session. Recheck fresh legacy creation plus progress/recovery for both cohorts.

Owner gameplay decisions are settled; no new gameplay choice is requested. Frontend/Integration adoption and successful release checks remain required before activation. No cloud, IAM, artwork or deployment change was made by this work.
