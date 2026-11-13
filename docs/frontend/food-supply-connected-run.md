# Native Food connected journey

The prepared runner is `apps/game/dev/phone/food-connected.mjs`; its browser build
is `food-connected-vite.config.mjs`. Preparation is not a passing connected result.
The release's actual result and any blocker belong in #237 and the PR evidence.

Use the exclusive local slot handed off by Backend/Integration, after other
CPU-heavy checks have stopped. The accepted combined candidate must run Auth,
Firestore, Functions, private triggers and Tasks normally, with opt-in Food and
its technically registered `design-0.9.0` metadata. Do not change any cloud or
creation default for this test. Existing loopback ports are Auth9199,
Functions5101 and preview5173; the script rejects nonlocal endpoints/projects.

Build with Node22.21.1/npm10.9.4, using the existing clean frozen art worktree:

```
GAMEN_PHONE_ART_BASE=/private/tmp/gamen-food-art-base-1f795366 node_modules/.bin/vite build --config apps/game/dev/phone/food-connected-vite.config.mjs
GCLOUD_PROJECT=demo-mothership FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 GAMEN_FOOD_BACKEND_ROOT=/private/tmp/gamen-integration-food-test-1 node apps/game/dev/phone/food-connected.mjs
```

`GAMEN_FOOD_BACKEND_ROOT` supplies only the committed, compiled own-view test
policy. The browser imports neither that policy nor the prototype simulator.
`GAMEN_FOOD_CONNECTED_COUNTS=7` narrows a diagnostic run; the default is sequential
7/8/9. `GAMEN_FOOD_CONNECTED_OUT` selects the local evidence folder.

For each count, the runner creates a normal local host, requests/adopts one human
phone and a separate public display, adds the remaining seats as authoritative
bots, and follows normal character/role/Ready/boarding timers. Actual browser
controls join and play the Task from the own authorized Food view. A Winch run
keeps its real held contact through a short network interruption and verifies
that connection loss did not release it. The display must receive no private
Task controller/art/card, and both devices request the same37Food drawings.
The runner waits for the fixed authoritative return, then the human's ordinary
turn and authorized meal. It records actual control assignment/coverage.

No injected clock, seeded private history, direct worker call, manual advance or
runBots, private-state read or client outcome substitution is used. Failure
remains failure; the script does not slow or extend the Task. Host aborts clean
up only these generated emulator matches. Tokens, recovery secrets, complete
private snapshots and raw network headers are not written into its report.
Results establish desktop Chromium local-emulator behavior only; staging,
physical-device, screen-reader usability and Designer approval are separate.
