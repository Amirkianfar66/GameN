# Hosted V1 Backend readiness — 7 October 2026

[Issue #54](https://github.com/Amirkianfar66/GameN/issues/54) prepares the Backend side of the owner-requested hosted playtest. Base `40e47f060521276672c8ee6312e122ce37566d8a` is draft [#47](https://github.com/Amirkianfar66/GameN/pull/47), which preserves the #37 production runtime and requires real Balance engine evidence. The coordinator owns the hosted client and publication. This change is an offline proposal, not a deployment, cloud-resource audit or complete V1 acceptance.

Rules remain `in-person-v1-2026-10-06`, protocol 2, Original Powers off. Owner-overlay SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`; combined V1 manifest `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2`; historical source-manifest `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. No runtime, schema or canon changes are made here.

## Inputs that must be resolved

The actual isolated staging project, account, billing authorization, Hosting site/domain, Firebase web app and App Check registration are pending owner/coordinator selection. A syntactically valid project ID does not establish ownership or isolation. Do not substitute a Limenet/Project A project. This session did not query cloud accounts, provision resources or change IAM.

Pin Backend, hosted Frontend and assets to reviewed clean commits. Record the public web app ID/project number/API key, exact page origin and registered Enterprise site key from that selected project's metadata; source validation cannot establish their ownership. Select the Auth provider and preview access deliberately: the current hosted proposal uses anonymous session Auth, and `v1CreateMatch` allows any verified Auth UID with verified App Check. There is no tester/host allowlist. App Check is attestation, not a substitute for participant authorization.

## Packaged runtime and environment

Use the pinned Node `22.21.1` / npm `10.9.4` toolchain and `npm run package:backend -- --verify-install`. Deploy the standalone `dist/backend/` artifact: package main `dist/production.js`, Node 22, codebase `mothership-v1`, three vendored runtime packages and the copied Rules/indexes. Raw `infra/firebase/` uses an emulator/legacy entry and is not the cloud deployment source.

The last independently verified #47 production artifact is SHA-256 `ddce0f22c7b9c9dbd620f384a7e9ebd6cddb3b19c364f86c9d84fea16a4da4ba`, compiled runtime/source `d24c051049a212376239603a4286c360c176125475c3927239e65b6b4553592c`. Recompute both on the final clean source and verify isolated installation; matching metadata supplied by a caller is not attestation. Coordinator-reported hosted packaging at `731c7cc34450a3c6dde6d3d701a0f9470bf749b9` has these same hashes; this report alone is not a live import test.

Before Admin SDK initialization, `infra/firebase/src/runtime.ts` requires the runtime's `GCLOUD_PROJECT`, `GCP_PROJECT` and inline `FIREBASE_CONFIG.projectId` to agree when present, rejects demo/partial emulator configuration and requires an explicit asset manifest version. Remove emulator variables from the deployed runtime. Do not add reserved project/SDK overrides to a dotenv file.

Supply only these application variables in `backend/.env.PROJECT_ID` when using the proposed deployment-root layout:

```text
MOTHERSHIP_ASSET_MANIFEST_VERSION=REVIEWED_RELEASE_IDENTIFIER
MOTHERSHIP_ALLOWED_ORIGINS=["https://SELECTED_SITE.web.app"]
```

Replace both placeholders with reviewed values. The browser release manifest's asset version must equal the Backend pin; no placeholder assets. Origins are exact canonical HTTPS origins, without wildcard, path, credentials or alternate port. The default empty allowlist denies requests carrying browser Origin. Preview-channel/custom domains need their actual origin reviewed and explicitly pinned; a prefix or project ID is insufficient.

There are 12 public JSON POST operations in `docs/backend/v1-deployment.md`, hardcoded `us-central1`. Bodies are limited to 4,096 bytes. Every production operation verifies a revocation-checked Auth token and `X-Firebase-AppCheck`; caller identity comes from Auth, never request body. Retain private/no-store responses, exact CORS and redirect rejection. The current hosted client uses direct `https://us-central1-PROJECT.cloudfunctions.net/v1Operation` endpoints. Optional `/api/v1Operation` Hosting rewrites in the offline proposal are an alternate reviewed routing layout, not a dependency of that client. Task, trigger and repair handlers must never receive a public Hosting rewrite.

The existing backend uses the [Firebase custom-backend App Check verification flow](https://firebase.google.com/docs/app-check/custom-resource-backend). Configure and test enforcement for Auth and Firestore too; an HTTP verification path does not prove Firebase service enforcement is enabled.

## Rules, indexes and private deadlines

Copy the Rules/indexes from the same packaged source. Verify active reverse UID-to-seat binding for private reads, admission for public/display reads, host-only control documents and denied client writes. Journal, receipts, outbox and recovery records remain server-only. Deploy the outbox collection-group composite index on `protocolVersion`, `status`, `nextAttemptAt`, `__name__` and wait until it is ready. A local index JSON is not evidence of cloud index readiness.

All task/trigger/scheduler code is in `infra/firebase/src/v1.ts`, region `us-central1`:

- Queue `locations/us-central1/functions/v1DeadlineTask`; handler `invoker: 'private'`, retry up to 10 attempts, backoff 1–60 seconds, maximum 10 concurrent dispatches.
- Outbox-create trigger dispatches with retry; the once-per-minute repair handler checks a bounded batch of 100. Neither is a client API.
- Phase advancement is server-authoritative. The local development runner in #40 is not a production deadline service.

With installed Admin SDK `14.5.0`, enqueue selects its OIDC service-account email from explicit app `serviceAccountId`, credential `clientEmail`, or ADC credentials. Production initializes the app with project ID only. Resolve the actual dispatch/repair runtime principal **E** and task OIDC principal **D** after reviewing deployed configuration; do not assume an App Engine default account. Normally the current default selects D from E's credentials. E needs `cloudtasks.tasks.create` for the actual queue and `iam.serviceAccounts.actAs` on D. Firebase documents the [task enqueue and IAM requirements](https://firebase.google.com/docs/functions/task-functions). For this second-generation task function, D also needs `roles/run.invoker` on its underlying service, as specified by [Cloud Run functions authentication](https://docs.cloud.google.com/functions/docs/securing/authenticating).

The current SDK default target is the regional `cloudfunctions.net/v1DeadlineTask` URL and no explicit OIDC audience is supplied. Verify the actual service URL/audience and a private successful delivery. There is no proven target failure in source review. If deployment requires a `run.app` target/audience override, the existing enqueue path has no such runtime configuration; propose a focused reviewed change rather than making the task public. Review the actual scheduler, Eventarc, service-agent and deployer permissions, enabled APIs and default Firestore database separately on the selected destination. This handoff does not grant roles.

## Hosted client review at an immutable pin

Coordinator draft [#53](https://github.com/Amirkianfar66/GameN/pull/53), commit `731c7cc34450a3c6dde6d3d701a0f9470bf749b9`, follows full-match Frontend `4b6dc327104f099051a71bb9e71adbf71390a2a5`. Source review confirms session Auth restoration, memory-only Firestore cache, server-fresh snapshot checks, current-UID private paths, current tokens per request and no emulator connection. Coordinator reports 635 verification tests and a local bundle/origin-refusal check; this Backend session inspected source, not a successful cloud session.

The five new hosted tests cover configuration and mocked HTTP requests; they exercise neither generated CSP nor listener denial/reconciliation. Two blockers remain at this pin:

1. **CSP blocks the App Check exchange.** `scripts/prepare-hosted-preview.mjs:43` allows `firebaseappcheck.googleapis.com`; installed `@firebase/app-check/dist/esm/index.esm.js:65` calls `https://content-firebaseappcheck.googleapis.com/v1`. The exact host is absent. Permit it and cover generated CSP against the installed client exchange endpoint. A local wrong-origin refusal never reaches this exchange and cannot accept it.
2. **G23 loses unresolved intent on ambiguous denial.** `apps/game/src/browser/hosted-transport.ts:63,71` maps every Firestore permission denial to `refused`. The session then clears held facts/store and reports no-access; screen cleanup calls `flow.release()`, clearing unresolved command IDs. Auth/App Check failure does not prove seat binding was revoked; the earlier invocation may still commit. Reload cannot recover identifiers already discarded. Hide private data immediately, preserve nonsecret unresolved identifiers while authority is ambiguous, and keep definitive old-UID revocation denial. Add permanent reconciliation coverage for accepted-but-unanswered invocation plus attestation denial, refresh/reconnect and eventual lookup; also cover genuine revoked binding. The proposed guide's reload wording is insufficient.

Reviewed file SHA-256: hosted transport `936e78275b2f9a0408954dfb6783fe7a999ff15147724026d1c42dd1af93ce91`; packer `5054da2746a3f72371147dd683909949f2ebefb717cb57fcb3c5cf712c77802b`. These blockers belong to the hosted-client integration owner. No concurrent edits were made to that worktree.

## Offline configuration proposal

`infra/firebase/dev/staging-plan.mjs` is development-only. It imports no cloud SDK, spawns no process, writes no configuration, opens no listener and never marks readiness true. Its CLI reads one at-most-8-KiB JSON file and emits a planning-only JSON object; invalid input returns a generic error without echoing private values.

The exact input keys are `projectId`, `hostingSiteId`, `hostingOrigin`, `assetManifestVersion`, `sourceCommits` (`backend`, `frontend`, `assets`, each full lower-case 40-hex commit) and `backendArtifact` (the actual `dist/backend/backend-artifact.json`). It rejects unknown/secret fields, demo/local/mismatched default-site origins, unsafe versions and unverified/wrong-protocol artifact descriptors. Custom HTTPS domain identifiers still require independent DNS/ownership review. The generator validates metadata shape, not files or commits.

```sh
node infra/firebase/dev/staging-plan.mjs /absolute/path/to/reviewed-plan-input.json
```

The proposed deployment root contains `firebase.json`, `backend/` copied from the standalone artifact, `web/` copied from the reviewed hosted bundle, and `backend/.env.PROJECT_ID`. Rules/index paths share this anchor. The JSON also contains a nonexecuting explicit-project deploy command proposal. It is not ready to execute: combine the final hosted packer's security headers/CSP and source exclusion evidence with the layout, verify fingerprints before adding the environment file, and resolve all listed gates. No actual destination input/config/env is generated by this deliverable.

Nine permanent tests cover invalid destinations and input shapes, descriptor verification flags/package paths, configuration anchoring, environment exclusions, the exact 12 public rewrites, nonexecuting command data and CLI no-write/private-error behavior. The helper/test are excluded from the standalone production runtime. Required root verification also retains #47's real 7/8/9-player engine gate. Check the PR's exact final head and CI for executed totals; no emulator run from another session is claimed here.

## Before claiming a playable hosted preview

The coordinator must resolve destination/ownership/costs, fix both hosted blockers, select clean immutable source/assets, verify configuration/IAM and publish source-bound artifacts. On that destination, verify HTTPS headers/hashes and matching browser/Backend asset pins; missing/expired/invalid Auth and App Check refusal; admitted audience privacy and old-UID revocation; real host/admission/display flow and accepted command; reload/unknown-outcome reconciliation and seat recovery; and a real unattended 60-second phase with browsers closed, duplicate/stale task delivery and outbox repair. Do not substitute a client countdown for task delivery evidence.

[The acceptance plan](v1-adoption-and-acceptance-2026-10-07.md) distinguishes the inspected local full-match record from unexecuted human/phone/cloud acceptance. G17 is an approved-rule defect requiring private resolved Supplier disclosure before claiming complete V1. A limited playtest can disclose remaining product/gameplay limitations; it must not be represented as complete acceptance. All implementation branches remain reviewable and unmerged.
