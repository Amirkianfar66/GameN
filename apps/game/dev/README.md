# Fixture harness (development only)

<!-- mothership:dev-only -->

Everything in this directory is a development tool. None of it is part of the game client, none of it is imported from `apps/game/src`, and none of it may be deployed. `npm run check:exclusion --workspace @mothership/game` enforces that. Every file here carries the `mothership:dev-only` sentinel the check looks for, as a statement in modules, a `meta` element in pages and a declaration in CSS, so the label survives bundling and minification. A new file here needs it too.

## What it is

A scripted stand-in for the backend plus pages that host the real client core against it:

| Path | Role |
| --- | --- |
| `fixture/scenario.mjs` | Replays the authored contract fixture, and two frontend-authored variations, in a fixed order. It is not an engine and decides nothing. |
| `fixture/fixture-transport.mjs` | In-process transport over the scenario, for tests. |
| `serve.mjs` | Loopback-only server: built client modules, harness pages, a server-sent-event feed per audience, and operator endpoints. |
| `harness/host.js` | Interim browser renderer: draws a controller's frames, forwards input and platform signals. |
| `harness/player.html`, `table.html` | Audience screens. |
| `harness/operator.html` | Debug controls: step the script, run the phase clock out, drop feeds, send bad payloads. |

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
- **Commands are not scripted yet.** The command endpoints answer `UNAVAILABLE`. The shot flow arrives with the next slice.
- **This is not emulator integration.** No Firebase emulator, authentication, Security Rules or Cloud Tasks behavior is exercised. Those checks are *not run* until Backend #2 provides an emulator.

The browser is never served `packages/contracts/dist/fixtures.js`, under any spelling or letter case, so server-only fixture truth does not reach a page even in development. The operator can misdeliver one seat's view to the other seat to test the client's defence; that is refused for the public feed, which never carries anything private.
