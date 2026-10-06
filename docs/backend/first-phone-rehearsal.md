# First-phone connected rehearsal proposal

Issue [#35](https://github.com/Amirkianfar66/GameN/issues/35). This change prepares two reviewable environment plans for the first real-phone transport/privacy rehearsal. **LAN is the working proposal assumption while the owner's optional preference is unanswered.** Reversible preparation is already authorized. Neither option is enabled, and neither plan authorizes a network listener, cloud deployment or group session.

The rehearsal scope is the current connected slice: admission, public/own-private views, `MOVE`, and `REGISTER_SHOT` when the server offers legal targets. The remaining role actions, Hack, Code, elections/Jail/release voting, showdown, result, host-abort UI and seat-recovery UI are later Frontend work. They limit complete-game acceptance; they do not require completing all V1 controls before a small supervised phone transport rehearsal. Review a minimal labeled page and visual bundle for that rehearsal; complete Designer asset adoption remains separate.

## Pinned baseline and dependencies

This proposal is based on `71dfd0277c6ccc4a5dd78b9702face98a46310b8`, the consolidated [PR #37 / issue #32](https://github.com/Amirkianfar66/GameN/pull/37) candidate. Its reviewed source pins are Backend `5adaf98f8412e2294f45e00f8fb7c4c515127226` and connected Frontend `8b97180038a37b798fbef345272a32e42c0d0853`. Balance review pin: `dedfe6929e65b22289ea427caba0ae9527e71e24`. The saved 6 October all-agents review supplies the phone/deadline gaps; its earlier desktop browser results are not phone evidence.

Rules remain `in-person-v1-2026-10-06`, approved V1-01 through V1-21, Original Powers off. Approved overlay SHA-256: `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`; historical source-manifest SHA-256: `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. This proposal changes no rule or protocol-2 payload.

Before adopting an enabled setup, review the actual integration head and current required checks, [issue #33 / PR #38 host-document schemas](https://github.com/Amirkianfar66/GameN/pull/38), and [issue #34 local deadline runner](https://github.com/Amirkianfar66/GameN/issues/34). Frontend reviews the browser adapter, HTTPS connection settings, credentials, privacy and partial rehearsal controls. Backend/Integration reviews the environment boundary, exact origins and eventual Tasks/IAM path. Balance reviews that the rehearsal and evidence preserve canon and do not claim social-deduction balance. Designer/Frontend review any asset pin used by an eventual staging build.

## Generate a local review artifact

[phone-rehearsal-plan.mjs](../../infra/firebase/dev/phone-rehearsal-plan.mjs) is a development-only pure generator plus a small file-to-stdout CLI. It imports no Firebase SDK, starts no listener, makes no network request and writes no active configuration. Every result has `planningOnly: true`, `readiness: false`, specific `blockers`, separate `scopeLimitations` and proposed/reference values under `reviewArtifacts`. Delete a redirected JSON result to discard it; the generator changes no runtime, Frontend, Firebase project or Git configuration.

Use Node `22.21.1` / npm `10.9.4`; run `npm ci` and `npm run build` at the root first. Save one of these synthetic examples to a small local JSON file. They are syntax examples, not selected addresses/projects/assets:

```json
{"mode":"local-network","lanIpv4":"192.168.1.42"}
```

```json
{"mode":"staging","projectId":"mothership-phone-stage","httpsOrigin":"https://stage.example.invalid","assetManifestVersion":"synthetic-assets-v1"}
```

Then generate only a review artifact:

```sh
node infra/firebase/dev/phone-rehearsal-plan.mjs /private/tmp/phone-plan-input.json > /private/tmp/phone-plan-review.json
```

The CLI accepts one JSON file, at most 4,096 bytes. LAN inputs must be canonical dotted RFC1918 IPv4 (`10/8`, `172.16/12`, `192.168/16`); loopback, public, CGNAT, link-local, IPv6 and padded octets are rejected. Staging inputs must have a canonical HTTPS origin (no path, query, fragment, credentials, wildcard or silent normalization), a lowercase 6–30 character non-demo project ID, and an explicit contract-valid asset version other than `0.0.0-no-assets`. Syntax does not prove address ownership/reachability, project isolation/access, asset availability or device compatibility. Tokens, private payloads, extra keys and readiness overrides are rejected. Diagnostics do not echo supplied values. No SDK configuration or credentials belong in these input files.

## Two concrete options

| Option | Proposed values/artifact | Work required before enabling |
| --- | --- | --- |
| Private LAN, working assumption | Phone page origin `https://<lanIpv4>` and certificate IP SAN `IP:<lanIpv4>`. Reference backend remains `demo-mothership`, Auth `127.0.0.1:9199`, Firestore `127.0.0.1:8180`, Functions `127.0.0.1:5101`, existing exact loopback origins. No phone adapter or listener configuration is generated. | Select an assigned host address on the intended private network; review a development boundary and the Frontend adapter; establish device-trusted HTTPS, every SDK/HTTP connection and exact origin handling; schedule ports and verify the issue #34 runner. |
| Isolated staging | Proposed `GCLOUD_PROJECT`, `MOTHERSHIP_ASSET_MANIFEST_VERSION`, and JSON `MOTHERSHIP_ALLOWED_ORIGINS` containing only the supplied HTTPS origin. No emulator variables, SDK client config or deployment is generated. | Select and verify an isolated nonproduction project and reviewed asset/build pin; review a production browser adapter and App Check; authorize deployment only after reviewing the concrete artifact and project/IAM/cost implications; verify actual device and scheduled-task delivery. |

### Private LAN proposal

The existing [preview server](../../apps/game/dev/connected/vite.config.mjs) binds `127.0.0.1:5173`. Its [browser transport](../../apps/game/src/browser/firebase-transport.ts) accepts only `demo-mothership`, HTTP loopback Auth/Functions origins and loopback Firestore hosts. On a phone, `127.0.0.1` refers to the phone. The [runtime guard](../../infra/firebase/src/runtime.ts) also permits only the complete loopback demo Emulator Suite, and its emulator origin allowlist rejects a LAN origin. Binding a server to `0.0.0.0` cannot resolve these barriers.

Propose keeping the backend emulators on loopback and reviewing a separate, explicitly limited development boundary for phone connections. Its listener, routing and exposure policy need a focused implementation review; this planner supplies none. Do not expose the existing source-serving preview or widen runtime/CORS guards as a quick workaround. Firebase documents distinct client emulator connections for [Auth](https://firebase.google.com/docs/emulator-suite/connect_auth), [Functions](https://firebase.google.com/docs/emulator-suite/connect_functions) and [Firestore](https://firebase.google.com/docs/emulator-suite/connect_firestore); all three must point at the intended test environment. This client sends Functions operations as plain JSON HTTP POSTs; the adapter review must preserve that transport instead of substituting callable semantics.

The phone page must have a device-trusted HTTPS context. Review the certificate chain and IP SAN, host routing, mixed-content behavior, Auth emulator origin handling, HTTP requests and Firestore SDK connection settings with Frontend. The current `connectFirestoreEmulator` call and HTTP-only adapter have no reviewed phone-facing TLS configuration. **A TLS reverse proxy alone does not prove this SDK path works.** Require actual iOS/Android browser evidence without bypassing certificate errors. Record the eventual exact configuration and reject unexpected endpoints/origins in tests before enabling any listener.

Local progression also needs the issue #34 runner: the current local Cloud Tasks emulator delivers future jobs immediately. The client `v1Advance` catch-up path only demonstrates progress when a client is present. Prove the proposed runner's due-time behavior while all browsers are closed before calling local progression unattended. A focused transport rehearsal may explicitly retain a present client and label this limitation; it cannot claim runner acceptance from that session.

### Staging alternative

The production runtime already supports explicit canonical HTTPS origins and an explicit asset pin. The generated proposed environment passes that pure guard; this does not initialize a project or prove a deployment. The current Frontend transport still rejects every non-demo project and supplies no production App Check token. The source-serving development preview is not a staging artifact; a reviewed production adapter/build is required.

Review the actual Firebase client configuration, anonymous Auth behavior, HTTPS Functions endpoints, exact CORS origin, Rules/indexes and artifact pin. Select an App Check provider appropriate to the staging web origin and test it on the actual devices. Firebase documents [web App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [sending App Check to a custom backend](https://firebase.google.com/docs/app-check/web/custom-resource) and [server verification](https://firebase.google.com/docs/app-check/custom-resource-backend). The existing production HTTP boundary requires Auth plus App Check; the adapter must obtain current tokens and send them as `Authorization: Bearer <ID token>` and `X-Firebase-AppCheck`, without putting tokens in URLs. Do not disable enforcement to make the rehearsal work.

Before group use, verify missing/invalid Auth and App Check are denied, the approved origin works, unexpected origins fail, and Rules protect player/display paths. Review private task invocation and scheduler/queue/service-account IAM, then prove a real due task and durable repair while clients are closed. Firebase project, indexes, Auth provider, App Check registration, Tasks and IAM are not created or modified here. Obtain deployment authorization for the reviewed concrete staging artifact; this preparation request is not cloud authorization.

## Credentials, uncertain commands and recovery

Preserve the current separation: Firebase Auth uses SDK-managed `browserSessionPersistence` in the connected preview; Firestore uses `memoryLocalCache()`. Session Auth can restore the same UID on reload, but tab/window closure or cleared session state can lose it. Firebase explicitly distinguishes [Auth state persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence) from Firestore caching. This is a proposed first-rehearsal policy, not approval to change persistence to durable local storage. Review mobile suspension/reload and the intended shared-display/session cleanup on actual devices.

Keep match/private views, roles, targets and exact command payloads in memory. The existing command resume journal stores only `(matchId, seatId, phaseId, commandId)`; the preview also keeps nonsecret device/match/admission context in session storage. Do not copy raw ID/refresh/App Check/recovery tokens into custom stores, logs, URLs or QR codes. The SDK's reviewed Auth credential persistence is distinct from those custom stores.

After a lost command response, reconcile the same command ID and identical in-memory payload while permitted; respect `retryAfterMs` across sends/lookups. After reload the payload is unavailable: while the original phase remains open, `unknown` receipt status stays unresolved. Once a fresh server view proves that phase closed, a receipt lookup requested **after** observing that view can settle `found`, or `unknown` can clear unresolved acceptance and permit a new valid current-phase intent with a new ID. A delayed rejection receipt may still appear. Cached snapshots/countdowns are not closure proof; never reconstruct a private target or reuse the old ID.

**Host-only credential loss is an open policy gap.** A new anonymous UID cannot become host just by knowing the match/room code. The service has no host-only identity transfer operation. Keeping the host tab/session alive is a rehearsal precaution, not a guarantee against mobile/browser loss. Agree the supervised abort/restart contingency before a session; do not invent a recovery endpoint or silently make another UID host. Host-abort and recovery UI remain Frontend follow-up work; any interim operator flow must be reviewed against the real service and authenticated host identity.

Player-seat recovery is different. The authenticated host can issue a ten-minute, single-use token for an occupied seat. Deliver it only through physically supervised recovery; keep it in memory and redeem with the intended new authenticated UID. The service revokes the old seat binding/view. If the recovered seat belonged to `hostUid`, it also transfers host control; this can help a host-player only when a usable grant was issued, not a host-only identity. A replacement UID cannot self-issue a host grant after the sole host credential is lost.

Issuance itself must be reconciled: after a lost/unparsed `v1IssueSeatRecovery` response, retain the original request ID and retry the identical operation until a parsed success, respecting retry delays. Use a returned token. If successful replay deliberately returns `recoveryToken: null`, **then** mint a fresh issuance request ID. Creating a new issuance while the original is unresolved lets the older in-flight operation overwrite the new grant. Tokens expire against server time and are consumed on redemption; replay does not return the original plaintext token.

## Shared display pairing

The display signs in independently and shows its UID on the physical screen. The host verifies the intended screen/person and submits `v1AdmitDisplay` with that `displayUid`, match ID and a stable request ID. UID/match context is nonsecret pairing metadata; the Auth credential proves the identity. Keep tokens out of display URLs and QR codes. A room code alone does not admit a display.

The display is a public audience: public projection and public event feed only. It gains neither player private views/events nor command/receipt access. Verify this with the real Rules and HTTP boundary, including a rejected display command and direct attempt to read a player view. Do not project a phone's private screen onto the shared display. Pairing improvements can be a later Frontend change without changing these permissions.

## Review and focused device acceptance

1. Select LAN or staging for the enabled experiment; review its generated nonsecret plan and exact candidate/build pins. Keep `readiness: false` in this planning artifact. Review implementation/exposure separately; do not infer permission from a generated origin or environment value.
2. Integrate/review the needed adapter and environment boundary in isolated focused work, with current-head checks and affected Frontend/Balance review. Include a reviewed minimal visual/bundle scope and an authenticated abort/restart contingency; leave the remaining complete-game controls explicitly out of this rehearsal.
3. When the selected setup is authorized and operational, use synthetic matches and independent host, player and display identities on actual phones. Record device/OS/browser, source/artifact/asset pins, exact origins and only nonsecret results. Do not commit private match payloads or credential exports.
4. Exercise create/admit/start; fresh own/public projections; one legal touch `MOVE`; a legal Officer `REGISTER_SHOT` without public/other-seat disclosure; lost response and receipt reconciliation; reload without target persistence; offline/reconnect with stale controls disabled; and enforced retry delay. Confirm role text is not exposed on public/shared screens. Record unavailable controls as scope limits.
5. Exercise session restoration/closure and the agreed supervised identity contingency. Verify physical display pairing, player/display read/write restrictions and teardown. Test real deadline/repair behavior according to the selected runner and distinguish present-client catch-up from unattended advancement. Evaluate touch, orientation, reduced motion and assistive technology on real devices; headless phone-sized desktop pages are not this evidence.

Passing this focused rehearsal establishes only the named transport/privacy/device behaviors. It does not establish all role actions, a complete playable V1, cloud delivery without explicit checks, or human social-deduction balance.

## Local verification for this proposal

Pinned `npm ci` installed 886 packages. `npm run build`, both pure/browser typechecks, workspace/source guards and `git diff --check` passed. `npm run test:backend` passed **54/54**, including the **8/8** new pure planner tests, with no failures, skips or todos. These tests cover RFC1918 boundaries, strict secret/unknown-field rejection, sanitized CLI failures, unchanged input files, explicit staging pins and the existing runtime's rejection of LAN emulator hosts/origins. Both new `.mjs` files passed `node --check`; all four relative document links resolve. A Firebase workspace-package `npm pack --dry-run` confirmed that neither the `dev/` planner nor tests are included; this is an exclusion check, not a deployment artifact acceptance run.

No emulators or phone listeners were started: the fixed ports are occupied by another agent's existing demo. No cloud SDK initialization, resource changes, deployment, device session or full-V1 acceptance is claimed. Runtime guards/CORS and Frontend-owned files are unchanged.
