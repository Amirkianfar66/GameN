# Native phone UI review evidence

These records distinguish source-specific synthetic checks, real local-emulator behavior and preserved failed visual evidence. Generated timestamps are UTC; follow-ups can fall on 11 November in Europe/Rome. No physical phone, Safari, VoiceOver, mobile frame-rate or memory acceptance is implied.

| Folder | Source | Scope |
| --- | --- | --- |
| `synthetic/` | `0af438bc5a2ef2b05ec84e49c2c35f09225adf48` | 62 passing native Chromium cases: 36 viewport/motion/7–9-player/text combinations, six entry cases, six private Clone/capsule cases, two worst-white contrast cases, six timed setup flows and six dark final-Code cases |
| `controls-follow-up/` | `838558bdc8d9eb3793d268375583260d8e4c4433` | Six passing native control/geometry cases: three sizes × both motion settings; Actions/Panels, action-specific states, four directly reachable Hospital targets at 200% text, and unchanged lit/dark geometry with unobstructed fixed slots |
| `reading-privacy-follow-up/` | `838558bdc8d9eb3793d268375583260d8e4c4433` | Twelve passing cases: six complete timed flows plus six deliberate Conceal/failed-read/foreground/reload/Reveal/new-context cases |
| `connected/` | `838558bdc8d9eb3793d268375583260d8e4c4433` | Thirteen passing real loopback Auth/Firestore/Functions/Tasks cases, including decoded artwork, timed setup, explicit concealment and seat recovery |
| `prior-dispatch-failure/` | Original provenance retained | Twelve interaction cases passed but portraits/crew were blank. Failed visual evidence, preserved unchanged; never final visual or performance acceptance |

Every current run includes `facts.json` and `provenance.json`. The excluded review harness executes the actual candidate app/controller/render modules with their current source hashes. Unchanged candidate asset plugins verify all art against the clean exact `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70` release tree. `candidate.dirty` honestly records uncommitted documentation/evidence; loaded code bytes belong to the recorded committed source and are checked unchanged throughout each run.

This setup is an excluded review harness. Ordinary current-tree production packaging/source checks still reject the changed native hashes until Integration approves a separate follow-up inventory. Historical source/asset approvals were not changed. See [requirements](../../phone-ui-requirements.md), [handoff](../../phone-ui-handoff.md), [consumer inventory](../../phone-ui-consumer-inventory.json) and [verification](../../phone-ui-verification.json).

`physical-devices.json` records the actual read-only device/tool access probe. Prior failed evidence is retained because visible artwork is a required check, beyond behavior assertions.

The final optional native abort was not observed (`status: null`, `abortAccepted: false`). Firebase CLI shut down every owned emulator without a persistence export, discarding the temporary room, and all seven canonical ports were verified free before handoff. The server log contains 18 early deadline-not-elapsed retries; actual server deadlines still progressed successfully. Browser exceptions were zero. These distinctions are recorded in `checks/connected-emulator-summary.json`; a successful interaction run does not mean the server log was error-free.

## Reproduction

Use Node 22.21.1 and the recorded Backend dependency. Set `GAMEN_PHONE_ART_BASE` to a clean worktree at exact `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. The build fails if that art tree or its verifying tooling differs. Keep the candidate sources fixed throughout each capture.

```sh
npm run typecheck
npm run test:frontend
GAMEN_PHONE_ART_BASE=/path/to/clean-fb33 node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
node apps/game/dev/phone/capture.mjs /path/to/control-evidence --controls-only
node apps/game/dev/phone/capture.mjs /path/to/privacy-evidence --privacy-only
```

The original 62-case run used the same capture harness at `0af438bc` without the follow-up flags. To reproduce the connected journey, first obtain the shared canonical-port reservation and make Java 21 available, then build the connected entry and run local demo emulators:

```sh
GAMEN_PHONE_CONNECTED=1 GAMEN_PHONE_ART_BASE=/path/to/clean-fb33 node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
MOTHERSHIP_PLANET_CREATION_ENABLED=true MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=3 MOTHERSHIP_PLANET_ENGINE_PROFILE=phone-private-choices-1.2 MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.8.0 MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --config infra/firebase/firebase.json --project demo-mothership --only auth,firestore,functions 'GAMEN_PHONE_CONNECTED=1 node apps/game/dev/planet-emulator/capture.mjs /path/to/connected-evidence'
```

No import/export or production target is part of that command. Do not overlap another agent's reservation. Ordinary `npm run check:sources` remains an expected refusal at this candidate until Integration's distinct source adoption; the review build is development-only.
