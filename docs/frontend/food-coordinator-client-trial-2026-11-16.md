# Food coordinator client trial

The [#274 prototype](https://github.com/Amirkianfar66/GameN/issues/274#issuecomment-6904292863) uses main commit `64e55516d2f0026842c5c2a675f2eccda20e0a9e`, the merge of #283. Both arms mount the current Planet board and Food app with the same controller, controls, Designer renderer, and motion preferences. The Food profile is protocol 3, `planet-game-1.4.0`, `in-person-planet-food-task-2026-11-12` and `design-0.9.0`.

The READ arm takes a callable local baseline service. It uses the shipped session coalescer, presence fallback and hosted request lifetime. The push arm takes the reviewed Backend coordinator. The first browser pilot opens the two participant seats of a seven-player session created by Backend's normal service fixture in real loopback Firestore. The fixture runs setup and the invitation before the browser pilot. Browser Ask, Join and Decline, other audience loads, and the paired comparison are pending. [#281](https://github.com/Amirkianfar66/GameN/pull/281) remains a separate review.

## Run the representative push pilot

Use Node 22.21.1 and npm 10.9.4. Use a dedicated loopback Firestore emulator and a built Backend worktree containing `services/game-api/dev/food-task-coordinator/`. Its `seedTwoHumanTask` fixture must forward the requested `assetManifestVersion` into ordinary match creation. The browser requires the exact approved Food tuple. The pilot checks the stored pin before opening the trial. The artwork directory is the reviewed #276 Hosting artifact rooted at `055eb2f4dc39129bac63cfde5ff5d65f791c2c4d`. The bridge verifies each served art file against its inventory and uses the normal Hosting response headers.

```sh
npm ci
node_modules/.bin/tsc --build apps/game
node_modules/.bin/vite build \
  --config apps/game/dev/phone/food-coordinator/vite.config.mjs \
  --outDir /private/tmp/gamen-food-coordinator-browser-20261116

FIRESTORE_EMULATOR_HOST=127.0.0.1:YOUR_PORT \
GAMEN_FOOD_COORDINATOR_BACKEND=/absolute/path/to/backend-worktree \
node apps/game/dev/phone/food-coordinator/serve.mjs \
  --driver=apps/game/dev/phone/food-coordinator/pilot.mjs \
  --bundle=/private/tmp/gamen-food-coordinator-browser-20261116 \
  --artwork=/absolute/path/to/reviewed-hosting-artifact \
  --links=/private/tmp/gamen-food-pilot-browser-links.json
```

Run the launcher in a TTY with a fresh link-file path. Open both labeled actor URLs from that file and wait for each `foodCoordinatorTrial.artReady` while the screens say they are waiting. At that point the local fixture is durably seeded and the Task clock is held at its synthetic origin. One Enter in the launcher starts elapsed time and the Backend owner loop. The unchanged 30-second Task, 4-second briefing, 32.5-second common return and presence boundaries run from there. Stop the terminal when the sample finishes. A failed gesture belongs to that attempt.

Only the enclosing experiment supplies the allowed synthetic seat bindings. The bridge listens on `127.0.0.1`, checks Host and Origin, and keeps per-seat capabilities in the local mode-0600 link file. It uses the same-origin HTTP/SSE path for authored browser frames. Frame backpressure can coalesce complete views. An original input uses an independent request. The applied notification wakes an exact durable receipt lookup, and a pending admission maps to unknown at the current controller boundary.

The READ arm can be launched by supplying a driver that implements `prepareFoodTrial` with a `baseline(uid, request)` callable and actors with `arm: 'read'`. Use the corresponding baseline normal service setup and deadline drivers from the comparison, with matched seeds and browser traffic. The bundled entry has no fixture authority or immediate acknowledgement path.

## Evidence from this entry

- Each browser reports `window.foodCoordinatorTrial.report()`. Export timing facts only. The report uses per-tab command ordinals and omits raw packets, auth capabilities and command IDs.
- The input event, local pending DOM observation, subsequent rendering opportunity, exact verified original receipt and correlated authoritative render are independent fields. A missing value stays null. The two animation callbacks mark a visible rendering opportunity, with desktop browser timing resolution.
- The bridge currently exposes no exact command-to-frame application witness. Consequently the browser can report observed frame delivery and DOM projection, and leaves command-to-authoritative-render latency null. Collect server receive, durable admission, apply and publish evidence through Backend's separate local trace with its clock domain. Do not subtract server stamps from client monotonic time.
- Blur and hide send the native causal Hold UP before stopping delivery. Reconnect discards earlier subscription callbacks and clock samples, and requires a full authorized same-response packet plus a new paired sample. Manual refresh uses a same-scope complete snapshot and accepts a current freshness change at the same view revision. Liveness continues on its own request lane while the visible Task is open.
- For browser review use the actual 390 × 844 and 430 × 932 viewports and exercise full and reduced motion. Record each tab's focus, visibility and clock uncertainty. One Task runs per sample, including missed and rejected inputs. Integration owns the planned browser checks.

Run focused checks with `node --test apps/game/test/food-coordinator-trial.test.mjs apps/game/test/food-session.test.mjs apps/game/test/food-controller.test.mjs apps/game/test/planet-read-lifetime.test.mjs` after the app build. Fixture checks only verify the adapter and trace fences. The durable comparison, browser input timing, actual motion and device performance require separate evidence.

Integration stopped at the server comparison on 16 November after one owner-routed FIFO run exceeded the presence lease. The bridge and browser pilot were left unrun. The focused Node regressions and Vite build are development evidence.
