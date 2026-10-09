# Fixture harness (development only)

<!-- mothership:dev-only -->

**This page describes the fixture harness: a scripted, synthetic scenario and no backend.** The emulator-connected preview, which talks to the local Firebase emulators, is a different thing with its own page, port and instructions: see [`connected/README.md`](connected/README.md).

Everything in this directory is a development tool. None of it is part of the game client, none of it is imported from `apps/game/src`, and none of it may be deployed. `npm run check:exclusion --workspace @mothership/game` enforces that. Every file here carries the `mothership:dev-only` sentinel the check looks for, as a statement in modules, a `meta` element in pages and a declaration in CSS, so the label survives bundling and minification. A new file here needs it too.

## What it is

A scripted stand-in for the backend plus pages that host the real client core against it:

| Path | Role |
| --- | --- |
| `fixture/scenario.mjs` | Replays the authored contract fixture, and two frontend-authored variations, in a fixed order, and answers command and receipt requests at a scripted command desk. It is not an engine and applies no game rule. |
| `fixture/fixture-transport.mjs` | In-process transport over the scenario, for tests. |
| `serve.mjs` | Loopback-only server: built client modules, harness pages, a server-sent-event feed per audience, command and receipt endpoints, and operator endpoints. |
| `harness/host.js` | Interim browser renderer: draws a controller's frames, forwards input and platform signals. |
| `harness/player.html`, `table.html` | Audience screens. |
| `harness/operator.html` | Debug controls: step the script, run the phase clock out, drop feeds, send bad payloads, arrange what happens to the next command. |
| `capture/browser.mjs`, `capture-evidence.mjs`, `capture-shot-flow.mjs` | Optional evidence capture: drive a local Chromium-based browser with real key and touch input and write screenshots and measured facts. Not part of any check. |

## Run it

From the repository root, with the pinned toolchain:

```sh
npm ci
npm run dev:fixture --workspace @mothership/game
```

Open <http://127.0.0.1:4310/>. Set `PORT` to use another port. Open Player 1, Player 2 and the table display in separate tabs or windows on the same machine, and drive them from the operator console.

Each open screen holds one feed connection, and a browser allows six connections per origin over HTTP/1.1. Keep to five harness tabs per browser profile or later requests will queue. This is a property of the harness's plain HTTP feed, not of the game client.

## What it does and does not show

- **Fixture mode, always labeled.** Every screen states that it shows synthetic data. Naming a seat in the URL selects an authored view; it is not authentication.
- **Two authored steps, two synthetic ones.** `officer-turn` and `registered` are the contract fixture's `before` and `afterRegistration` views. `next-turn` and `resolution` are frontend-authored so the shells can be seen in other phases; they show no outcome and are not a claim about how the server sequences a match.
- **Server time is virtual.** It starts at the authored phase start (a date far from today) and runs in real time, so a client that read its own clock would be visibly wrong.
- **Nothing is resolved.** No damage, block or Protection fact exists here; RULE-003/D09 is undecided.
- **Commands go to a scripted desk, not to an engine.** See below.
- **This is not emulator integration.** No Firebase emulator, authentication, Security Rules or Cloud Tasks behavior is exercised. Those checks are *not run* against a backend from this harness.

The browser is never served `packages/contracts/dist/fixtures.js`, under any spelling or letter case, so server-only fixture truth does not reach a page even in development. The operator can misdeliver one seat's view to the other seat to test the client's defence; that is refused for the public feed, which never carries anything private.

## The command desk

Player phones can send a shot and look a receipt up. The desk that answers follows the command contract as the integration owner has stated it for wire protocol 1 (`docs/backend/contract-review-response.md` on the backend branch, items FE-C01 to FE-C03), and nothing else:

- One receipt per seat and command identifier, kept for accepted and rejected commands alike.
- The identical command again gets its original receipt, before phase or time is looked at. The same identifier with another payload gets `COMMAND_ID_CONFLICT` and leaves the original alone.
- A command for a phase that is not open, or past its deadline on the fixture's server clock, is rejected `PHASE_CLOSED`, and that rejection is stored.
- Requests that are malformed, in another protocol version, for another match or from the table display get the contract's own safe errors and store nothing.

**It is not an engine.** It holds one scripted registration: by the seat whose own authored view calls a shot available, on its own turn. It accepts that registration whatever the target, because it judges no target, and rejects everything else `NOT_ALLOWED`. An acceptance changes only the actor's own view, to the authored `afterRegistration` view with the client's command identifier. Nothing is resolved afterwards.

The operator console can arrange what happens to the next command request, once:

| Arrangement | What the desk does |
| --- | --- |
| Answer as scripted | The default, described above |
| Slow request, then as scripted | The request takes 2.5 s to arrive; nothing is decided or shown until it does |
| Reject: not allowed / phase closed | Stores and returns that rejection |
| Register, then lose the answer | Decides and stores as scripted; the answer never arrives |
| Lose the request | The desk never sees it; nothing is stored |
| Answer “unavailable” | The contract's `UNAVAILABLE` error. This double then stores nothing, though a real server giving that answer may have |

“Fail every command and receipt request” keeps doing so until switched back, while the feeds carry on. “End Player 1's turn without the scripted registration” opens the next turn directly, to see what a phone does when the turn it acted in is over.

## What a harness page keeps

One thing, in the tab's session storage, under `mothership:unresolved-command`: the match, seat, phase and command identifiers of a command whose outcome is not yet known. The client core writes it when the command is sent and removes it as soon as the outcome is known. It never holds a target, a role or a payload. It is what lets a reloaded page ask what became of its command instead of offering the shot again. Nothing else is stored: no local storage, cookie, cache or database.

A request that gets no answer fails at once with an empty `504`. A real one could also hang until the client gives up; the client's eight-second limit is covered by tests, not by this harness. The connection is deliberately not cut instead: Chrome 154 re-sent a single `fetch` six times, once per idle connection, when the server closed the connection before any response. That is worth knowing in itself — a command can be delivered more than once without any client code retrying it — and it is why the identical command must always get its original receipt back.

## Board simulation (issue #87)

`board/` is a separate page, not part of the fixture harness above. It mounts the release's own connected player screen (or, with `?as=display`, the shared display): the real command controller, host, stylesheets and art. A scripted in-page command desk replaces the backend and feeds it schema-checked synthetic protocol-2 views (`board/scenarios.mjs`). The desk answers every command as registered, after a delay, or as `?answer=reject` / `?answer=hang` say. A move it accepts is followed by a view that has the player in the room asked for. What each scenario offers follows the Designer's reviewed scenario list and stays within what the engine can offer. It is not an engine, and it is labeled as the local emulator mode.

```sh
npx vite --config apps/game/dev/board/vite.config.mjs        # http://127.0.0.1:5178/?scenario=shot
CHROME_PATH=/path/to/chrome node apps/game/dev/capture-board-play.mjs <output-directory> [--all-sizes]
```

`capture-board-play.mjs` plays every action through touch and key input at 320 × 568, 360 × 740, 390 × 844 and 430 × 932. After each step it measures, through `capture/board-measure.mjs`:

- page scroll;
- press areas: size, containment in the room, hit at the centre, overlap;
- controls under 44 px;
- status-bar clipping;
- private hooks.

`capture-board-emulator.mjs` plays the same board against the local practice harness (`docs/frontend/practice-bots.md`): a host, one player among bots and an admitted shared display. Both scripts are evidence tools, not checks.
