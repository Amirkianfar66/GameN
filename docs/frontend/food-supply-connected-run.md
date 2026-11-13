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

The first native attempt at source `6321ac77` stopped before setup: the host read
one pending admission immediately after the display's asynchronous Join tap.
No Food Task ran. Its complete local record is retained at
`/private/tmp/gamen-food-native-connected-6321`, with the runner log alongside it.
The runner now waits for each original admission's actual successful response
before the host reads the pending list. It also retains both devices' sanitized
operation summaries and failure screenshots. It does not retry admission, change
phase timing or alter native/Backend source. This preparation is not a passing
connected result; each rerun uses a new evidence directory.

The second attempt (`14682e85`, same native 703 and frozen Backend) admitted both
devices and reached reading, but no Ready operation was emitted by its tap.
The invitation wait timed out with 6/7 players ready; no Food command ran and 8/9
were not attempted. Its evidence remains at
`/private/tmp/gamen-food-native-connected-14682e85`. The cause is **unclassified**:
that attempt did not capture disabled state, hit testing or viewport offsets at
the tap, so a runner timing issue and a real onboarding obstacle are not yet
distinguished.

The prepared runner now records the actual Ready button's enabled state, rect,
layout and visual viewport, scroll offsets, focus and `elementFromPoint` target.
It waits for the rendered enabled control, scrolls normally into view, lets
layout settle and uses physical touch input only when the hit target is that
visible button. It requires the original successful Ready response before
calling a run Ready. It does not use `element.click()`, a direct Ready request,
a hidden control or an automatic retry. Any blocked/reachable-state failure
remains evidence, not a bypass. These new diagnostics have not run yet.
