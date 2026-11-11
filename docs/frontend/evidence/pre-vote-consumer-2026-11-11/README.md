# Pre-vote consumer evidence

Final presentation source: `b63403e6a8d1b5f68f48ec13f4a392a79870bfcd`. Behavioral/room-camera and real connected source: `c5a70b7eea1c3f755f655d37ac729e5f78d24efc`. Only native roster DOM/styles changed after that behavioral freeze. Backend is exact final PR #213 head `1900566f7237bc5a8032acdfb09208f95e68e2c0`, runtime `c492523845567c7e4e672991e11c058e88ccea27`. The thirteen-file closure is in [the inventory](../../pre-vote-consumer-inventory.json); actual results are in [verification](../../pre-vote-consumer-verification.json).

| Folder | Scope |
| --- | --- |
| `synthetic/` | Native Chromium projections/controls at 320×568, 390×844 and 430×932, both motion settings. Each case checks all five rooms at normal/200% text, painted figure bounds and reachable 44 px targets. It also checks direct room-tag movement, complete Blackout-window geometry, visible public publication labels, a lit post-damage Hospital patient, and numeric-only dark Code |
| `presentation/` | Fourteen final-source ballot/result/glass/focus cases: 7/8/9 players, 320×568 at 200% and ordinary 390×844, both motions, solid fallback; explicit longest-name and scrolled representative-name captures |
| `connected/` | Real local Auth/Firestore/HTTP/Functions/Tasks and nine-player native UI after a labelled native-history prefix. Actual timers, both strikes, independently read own ballot after a dropped successful response, original receipt, later Rescue, on-screen Jail figure and abort cleanup |
| `checks/` | Typecheck/Frontend logs and the unmodified source guard's expected refusal pending Integration adoption; emulator summaries distinguish browser results from server retry/shutdown logs |
| `connected-first-attempt/` | Failed assertion ordering after receipt settlement. Original records retained; fresh authoritative ballot readback was required for the replacement |
| `connected-cropped-room-attempt/` | Nine interaction cases passed but the player's Jail figure was clipped. Failed visual acceptance at superseded native source, retained unchanged |
| `synthetic-first-timing-attempt/` | Six logic/label checks passed but an impossible early phase transition left a dark post-Blackout image. Failed visual acceptance, retained unchanged |

The connected provenance scope wording was corrected after review; its original candidate head, inputs and hashes were preserved. Presentation evidence explicitly pins the newer source. Each current capture folder has its own `facts.json` and `provenance.json`. The excluded harness runs actual native app/controller/render modules and verifies their loaded hashes before and after. It uses unchanged verifying asset plugins against the clean exact `fb33cecb` art release; no drawing, historical approval or production source fence is relaxed. Dirty metadata represents uncommitted evidence/documentation, not changed loaded native inputs.

Synthetic projections are explicitly fixtures. They wait for the complete declared Blackout interval before evaluating the restored board; other phase screens are projection/metadata cases, not proof of real Jail/result durations. Actual complete sixty/five-second timing is established by the separate real Tasks journey. Pure tests also consume native Backend projections for 7/8/9 players, with and without Sync. Original PR #212 evidence remains attributed to 1.2.

Room visibility is measured from the actual native SVG paint, including its masks and referenced definitions, then mapped to screen coordinates and intersected with the room/stage. Raw SVG `getBBox()` can include large invisible mask rectangles and is recorded separately. Plain room figures must be at least 98% within the viewport; targeted figures retain at least 80% above the prompt, with their own reachable target centre on their painted bounds. This is stronger than testing path existence alone. No mobile performance or physical-device claim follows from these desktop measurements.

The real test creates/adopts only an admitted local demo lobby before any role disclosure. Its recorded legal native prefix reaches Round 2, allowing the offered final Code check. Every later input, timer and projection is real; the browser clock and snapshots are not injected. The deliberate network failure occurs at the successful ballot HTTP response boundary, after server processing, and original receipt recovery is followed by a fresh authenticated own-ballot read. No replacement ballot, manual advance or bot-run call is allowed.

Physical iPhone/Android startup/frame/input/memory, Safari, VoiceOver and human balance testing remain unrun. These records do not approve a merge, source adoption, activation or deployment.

## Reproduction

Use Node 22.21.1, Java 21 for emulators and the pinned Backend dependency. `GAMEN_PHONE_ART_BASE` must point to a clean worktree at exact `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. Builds fail if the art tree or verifying tooling differs.

```sh
npm run typecheck
npm run test:frontend
GAMEN_PHONE_BLACKOUT=1 GAMEN_PHONE_ART_BASE=/path/to/clean-fb33 node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
node apps/game/dev/phone/blackout-capture.mjs /path/to/synthetic-evidence
node apps/game/dev/phone/presentation-capture.mjs /path/to/presentation-evidence
```

The focused room-only variant is `--rooms-only`; `--quick --rooms-only` covers all rooms at 320×568 with both text sizes. Keep native inputs fixed during capture. Before the connected run, obtain the canonical emulator-port reservation (including 9150 and UI 5173):

```sh
GAMEN_PHONE_BLACKOUT=1 GAMEN_PHONE_CONNECTED=1 GAMEN_PHONE_ART_BASE=/path/to/clean-fb33 node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
MOTHERSHIP_PLANET_CREATION_ENABLED=true MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=3 MOTHERSHIP_PLANET_ENGINE_PROFILE=blackout-before-vote-1.3 MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.8.0 MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --config infra/firebase/firebase.json --project demo-mothership --only auth,firestore,functions 'node apps/game/dev/phone/blackout-connected.mjs /path/to/connected-evidence'
```

The command requests no persistence import/export or production target. Abort the room and stop all owned emulators before explicitly releasing the reservation. Server retry/shutdown messages are recorded honestly in the summaries; zero browser exceptions does not mean an error-free server log.
