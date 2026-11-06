# Planet successor staging release

Integration issue: [#185](https://github.com/Amirkianfar66/GameN/issues/185). This is a release procedure, not a claim of deployment or activation.

## Version and publication boundary

New matches use protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06`, authority hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. New artwork is `design-0.6.0`, adopted from the exact Designer PR #184 head `0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878` through the immutable 18-file Integration approval. The unpublished candidate registry is finalized with reviewed consumer hashes before its first publication. Its original Frontend proposal remains evidence.

The playable successor is `/planet/`. The existing root protocol-2 game and `/development/design-studio/` remain available. Existing games retain their saved rules, role assignment and artwork; Studio edits do not activate or migrate games. No optional Original Powers or online voice service is enabled.

Only approved runtime art enters Hosting. Review videos, synthetic review pages and stills are excluded. Withdrawn EJECT video/poster files stay excluded. Rescue retains the visible patient figure. Supply remains static inventory without a server-authorized delivery marker. These are deliberate approved fallbacks, not missing publication of the Designer repository.

## Required checks before publication

Use Node 22.21.1 and npm 10.9.4. On the final clean committed candidate:

1. Run `npm run verify`, browser dependency/exclusion checks, and both legacy and Planet `package:backend -- --verify-install` variants.
2. Run required Backend and Frontend emulator suites. Include actual `planetApi`, private Tasks/Firestore workers, 7/8/9 setup and requester-bound admission/recovery. Complete native player/host/display service acceptance with no synthetic snapshots. Record individual evidence and any transient failures; passing emulators are not evidence of live IAM or real-device behavior.
3. Review the exact PR head and require every CI gate. Record the source commit and manifest/artifact hashes. Never publish an unreviewed dirty build.
4. Build combined Hosting with `node scripts/prepare-hosted-preview.mjs PUBLIC_CONFIG_JSON`. This checks legacy and Planet CSS/media hashes, includes the independently built Studio and preserves its API rewrite. The public Firebase configuration contains no credentials; do not commit account tokens, service account files or test match payloads.

## Isolated Backend deployment

`node scripts/package-backend.mjs --planet --verify-install` creates `dist/backend-planet`, Firebase codebase `mothership-planet`. Its five exports are `planetApi`, `planetDeadlineTask`, `planetDispatchDeadline`, `planetRunBots` and `planetRepairDeadlines`. Its isolated entrypoint excludes legacy endpoints and Designer fixtures.

Target only `gamen-mothership-staging`, using the already authorized publishing account. Set the generated artifact environment, not tracked source:

- `MOTHERSHIP_PLANET_CREATION_ENABLED=false` during initial worker verification.
- `MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.6.0`.
- `MOTHERSHIP_ALLOWED_ORIGINS=["https://gamen-mothership-staging.web.app"]`.

Deploy only that Functions codebase. Preserve `mothership-v1`, Studio, existing database rules/indexes, Auth settings and unrelated resources. Do not use a project-wide `--force` deletion or change endpoint privacy.

Verify the deployed runtime identity before granting any access. Expected existing staging identity is `742846764120-compute@developer.gserviceaccount.com`. The specific new queue needs `roles/cloudtasks.enqueuer` for this runtime identity; the private task service needs `roles/run.invoker` for its task identity. Bindings must be scoped to queue `projects/gamen-mothership-staging/locations/us-central1/queues/planetDeadlineTask` and service `projects/gamen-mothership-staging/locations/us-central1/services/planetdeadlinetask`. Preserve other policy bindings/etag and read back the result. No public task invoker is permitted. Verify Eventarc delivery and the one-minute repair scheduler, without expanding unrelated access.

Publish the reviewed Hosting artifact and enable Planet creation only once client and private worker configuration are ready. Verify the authenticated hosted API with actual App Check, automatic setup/deadline progression, admitted display isolation and recovery. Clean up only the synthetic smoke session through its authorized host abort; never reset user games.

## Recovery and limits

If new-match creation is unhealthy, disable only `MOTHERSHIP_PLANET_CREATION_ENABLED`; this does not disable saved sessions or migrate their tuples. Hosting can restore the previous recorded release. Do not remove or downgrade workers required by saved Planet games. Preserve logs/artifact hashes without storing tokens or private role payloads.

Desktop browser emulation is not physical-phone, Safari, screen-reader, network-load or human social-deduction evidence. List those limits explicitly in the release receipt. A staging playtest is not a claim that the game is balanced.
