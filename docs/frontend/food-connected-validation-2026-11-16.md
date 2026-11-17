# Food connected validation

The harness starts from the frozen [#286 draft](https://github.com/Amirkianfar66/GameN/pull/286), `76f06302e10d29b0b3598d87a41bf427e6e9135b). It mounts the existing Food controller, controls and Designer renderer under the approved Hosting headers and exact `design-0.9.0` art. The browser runs remain conditional on the Backend service gate for [#274](https://github.com/Amirkianfar66/GameN/issues/274).

## Launch

Use Node 22.21.1, npm 10.9.4 and a dedicated loopback Firestore emulator. Build the server and its dependencies from the reviewed Backend source `0d2969db3ad851cb489fd2e3ed5706e5d4ec9942` before launching. The launchers verify their server source paths against that commit and include the pin and variant in each report. The [original harness notes](food-coordinator-client-trial-2026-11-16.md) identify the reviewed #276 artwork directory and explain the local seat links.

```sh
npm ci
node_modules/.bin/tsc --build apps/game
node_modules/.bin/vite build \
  --config apps/game/dev/phone/food-coordinator/vite.config.mjs \
  --outDir /private/tmp/gamen-food-coordinator-connected-browser-20261116

FIRESTORE_EMULATOR_HOST=127.0.0.1:YOUR_PORT \
GAMEN_FOOD_COORDINATOR_BACKEND=/absolute/path/to/reviewed-backend-worktree \
node apps/game/dev/phone/food-coordinator/serve.mjs \
  --driver=apps/game/dev/phone/food-coordinator/invitation-pilot.mjs \
  --bundle=/private/tmp/gamen-food-coordinator-connected-browser-20261116 \
  --artwork=/absolute/path/to/reviewed-hosting-artifact \
  --links=/private/tmp/gamen-food-invitation-links.json
```

For the timed trial, use `pilot.mjs` as the driver and a fresh link-file path. Its coordinator passes `admissionMode: 'owner-fifo'` explicitly at creation. The link file and browser report identify the selected variant. Use the corrected reviewed Backend worktree when Integration clears it.

Open the two actor URLs from the private link file. Wait for the artwork preload and the local waiting screen on each page, then send one Enter to the launcher. Use 390 × 844 and 430 × 932. Capture actual focus and visibility for both desktop browser pages, including any browser focus emulation used to keep the two simulated phones in the foreground. Record reduced and full motion separately from physical-device evidence.

## Ordinary service invitation journey

The `ordinary-invitations` driver opens a seven-player match using the normal service helpers and advances from boarding to ASKING on Enter. Only the two participating browser pages send inputs during this journey. Use their mounted Actions and Tasks controls to send the first Ask from Crew 1 to Crew 2. Crew 2 declines, then asks Crew 1. Crew 1 joins. The original volunteer is barred from volunteering again in this round, and remains eligible to receive the second Ask.

Confirm the four original receipts in order as PENDING, DECLINED, PENDING and JOINED. Record the received invitation, the decline closure and the participant briefing seen after Join. This journey ends at the ordinary service's accepted Join and briefing. The timed trial uses a separate match.

## Timed owner-FIFO trial

The timed driver uses the Backend's normal service fixture and two assigned participants. One Enter begins real elapsed time for its existing authoritative interval. Use actual controls and record Winch Hold DOWN, Panel RELEASE and LOCK, Winch UP and each offered KEY. Preserve rejected, missed or unavailable controls in the result. The outcome and return follow the original Task interval.

For a lifecycle check, record a held Winch contact before hiding its page. Confirm the original causal UP route, concealment while hidden, and a fresh authorized view after restoring visibility. The report records focus and visibility events and local intentional Hold state. The exact receipt still establishes the server disposition of UP. The original actor binding is retained throughout reconnect. The pinned Backend checks the binding revision at publication, and the browser trial uses immutable synthetic actor capabilities. Same-seat UID recovery is outside this trial.

## Evidence

Read `window.foodCoordinatorTrial.report()` on each phone. Input, local pending DOM, exact verified receipt, authorized frame arrival, DOM change and a later visible rendering opportunity have separate fields. The bridge correlates a fresh per-player frame using the coordinator's publication event for that exact stream epoch and sequence. It only carries commands already issued by the fixed actor through that bridge. The browser requires the matching applied receipt and a changed control or outcome at the same Task and control session. A coalesced or superseded frame can leave the outcome timing null. A pending Hold intent and an actual held crate are distinct states.

Browser durations use the document's monotonic clock. Coordinator publication time is recorded in its separate Node process clock domain. The double animation callback records a rendering opportunity. Export report facts without local actor links, raw command IDs, private snapshots or Firestore documents.

## Focused local validation

```sh
node --test apps/game/test/food-coordinator-trial.test.mjs \
  apps/game/test/food-session.test.mjs apps/game/test/food-controller.test.mjs \
  apps/game/test/planet-read-lifetime.test.mjs
node apps/game/scripts/check-production-exclusion.mjs
```

The isolated harness checks exercise witness scope, exact receipt correlation, changed outcome predicates, visibility and revision fencing. The two connected journeys and their browser timing require separate run evidence.
