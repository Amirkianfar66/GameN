# Food test 1 publication plan

This is the publication plan for the fixed scope in #237 and combined release
PR #240. It is not a deployment receipt or a new authorization request.

## Current live baseline

Integration read the public Hosting metadata and the five Planet function
configurations on 13 November 2026 through the approved publishing account.
Hosting is clean source `23c291db4aad63b2e1ba9d27caa3a4fce7997c38`, bundle
`0984ed08dd42d3a49a85ada3435080968d502c1d5f4398965d3aac7f75d2ab08`.

All five Planet functions are active on Node 22 with service identity
`742846764120-compute@developer.gserviceaccount.com`, setup flow 3, art
`design-0.8.0` and `blackout-before-vote-1.3`. Creation is enabled on
`planetApi` and disabled on the four workers. This readback did not change
configuration or inspect private match records. It does not establish current
queue/service IAM; those scoped policies must be read back at publication.

## Final release selection

After the existing review and validation gates pass, the new-match selection is:

```text
MOTHERSHIP_PLANET_ENGINE_PROFILE=food-task-1.4
MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=3
MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.9.0
```

Protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12` uses authority hash
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`.
The explicit selection applies only to new matches. Saved matches keep their
gameplay, setup and artwork pins. The root protocol-2 game and Design Studio
remain available; the playable Food successor is `/planet/`.

The hosted selector now recognizes the explicit Food profile but refuses it
until a separately pinned native-acceptance record exists. That record must
bind the exact source and art identities, Designer’s review of PR #240, visual
captures and connected evidence. No acceptance record is present at this
checkpoint, and historical/default selections remain unchanged.

Technical source registration alone does not enable this profile. The final
consumer-approval record must bind Designer's actual PR verdict, the reviewed
source/art identities and the native comparison evidence. Hosting selection
must reject missing or mismatched approval. Required connected evidence and
exact-head CI remain separate checks, as recorded in the source checkpoint.

## Package and publish

Use Node 22.21.1 / npm 10.9.4 and a clean, final committed tree. Verify the
standalone classic and Planet backend packages, then build combined Hosting
with the explicit profile and existing public Firebase configuration. Record
the exact source and artifact hashes. Food SVGs must come from the pinned
static set; no prototype, synthetic review page or simulator ships.

The Planet package must include its two new service dependencies,
`planet-food-service` and `food-bot-policy`, and export its four engine Food
ports plus the read-only `hasOnlyDuePlanetFoodWarnings` classifier. The
standalone verification imports that isolated package, constructs
the disabled Food-profile service without reading state, and checks all five
Firebase exports and private task invocation. A workspace import cannot
substitute for this packaging check.

Publish only to `gamen-mothership-staging`, as
`amir.kianfar.social@gmail.com`, under the owner's standing release instruction.
Use the isolated `mothership-planet` codebase for `planetApi`,
`planetDeadlineTask`, `planetDispatchDeadline`, `planetRunBots` and
`planetRepairDeadlines`. Preserve classic and Studio functions, database rules,
Auth, indexes and unrelated access policies.

Keep new Planet creation disabled while replacing and checking the compatible
workers. Verify existing queue-scoped enqueue permission and private task
invocation after deployment, preserving unrelated bindings and etags. Publish
the reviewed client before enabling the new creation selection. No new IAM
scope or public task endpoint is part of this plan.

Read back live Hosting metadata and the new-match tuple. Through the normal
authenticated host/player/display controls, verify setup, a Food invitation,
Task controls, fixed common return, public/private separation, an ordinary
meal and original-session recovery. Record observed outcomes and timing;
do not substitute a seeded state, manual advance or direct worker call. Clean
up only the labelled smoke match through its authorized host abort.

If new creation fails, disable that switch while retaining client and workers
capable of recovering every saved tuple, including any newly created Food
match. Do not migrate or reset user games or restore an incompatible worker.

## Limits

The current evidence is desktop Chromium and emulator evidence. Physical
iPhone/Android, Safari, screen-reader, low-end-device performance, real-network
load and human social-deduction balance are not claimed. Record the eventual
staging smoke separately from those remaining limits.
