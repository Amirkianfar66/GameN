# Emulator-connected preview

<!-- mothership:dev-only -->

**Development only. Local emulators only. Never deploy any file in this directory.**

This is the first Firebase-connected flow of the game client, runnable on one machine:
a host creates a lobby, players join and are seated, a shared display is admitted, the
match starts, and each device then shows the real client screens on protocol-2 views
from the real local backend.

It is **not** the fixture harness (`../harness/`, `npm run dev:fixture`). The fixture
harness plays a scripted, synthetic scenario and talks to no backend. This preview talks
to the Firebase Auth, Firestore and Functions emulators and to nothing else. Every match
screen here carries the banner "Local emulator. A development backend, not a live match."

## What is real and what is not

| Real | Not real, or not here |
| --- | --- |
| The Firebase web client (Auth, Firestore), anonymous identities, Security Rules | A deployed project. The transport refuses any host that is not loopback and any project but `demo-mothership` |
| The protocol-2 service, its receipts and its 60-second phases | A designed lobby. The lobby is a plain development console in `main.js` |
| The client core: validation, sessions, the command flow, deadline catch-up | The complete game. A phone offers a move and, when the server's view opens them, an ordinary shot, a Disable, Protection, a Rescue, a Hack request, a showdown shot, a Scan, a Supply, a Code attempt, and a ballot in a Captain election, a Jail vote, the Captain's release choice and the vote on it. Phones and the display show what is being voted on and the count the server publishes, and a phone's private panel lists what the server tells that seat alone. The result screens are not built |
| The phone and table screens the fixture harness also shows | Phones at a table. Everything listens on loopback, so only browsers on this machine can reach it |

## Run it

Node `22.21.1`, npm `10.9.4`, and Java 21 on the `PATH` for the emulators. Two terminals,
from the repository root:

```sh
npm ci

# 1. The emulators, on the fixed loopback ports of infra/firebase/firebase.json:
#    Auth 9199, Firestore 8180, Functions 5101, hub 4500, logging 4600.
npm run dev:emulators --workspace @mothership/game

# 2. The page. The port is fixed: the local Functions accept requests from
#    http://127.0.0.1:5173 and http://localhost:5173 and from no other origin.
npm run dev:connected --workspace @mothership/game
```

Then open <http://127.0.0.1:5173/>. Each **tab** is one device with its own identity:

1. One tab as **Host**: create a lobby (7, 8 or 9 players). It shows a room code.
2. One tab per **Player**: enter the room code, choose a starting room, ask to join.
3. Back on the host tab: seat each request. Hosting shows nobody's role.
4. Optionally one tab as **Shared display**: it shows an identifier; paste it into the
   host tab and admit it, and give the display the match identifier from the host tab.
5. Start the match on the host tab. Player and display tabs switch to the game screens.

A reload keeps a tab's identity, seat and match. Closing the tab ends them. "Forget this
match on this tab" clears which match the tab was in.

**After restarting the emulators, open new tabs.** The emulators keep nothing between
runs, so an old tab's identity and match no longer exist: it waits for a match that is
gone, and the server refuses what it sends.

Saving a file does not reload the tabs (hot reload is off, because every tab is a device
in a running match). Reload a tab by hand to pick up a change.

**A tab is never reloaded for you.** The development server adds a client of its own to
every page it serves, and that client reloads the page when its connection to the server
drops, which under load it does. In a running match that would take a player's choice
away mid-ballot. The server is started without that connection, and the page refuses it
as well. Reload a tab by hand to pick up a change.

**More than five tabs in one browser.** A browser opens at most six connections to one
host, and every tab keeps one open to the Firestore emulator. Open some of the tabs on
`http://127.0.0.1:5173/` and the others on `http://localhost:5173/` (each then reaches the
emulators under the same name it was opened with), or use separate browser profiles.

Stop both terminals when finished: the emulator ports are shared with the backend's own
emulator tests, which cannot run while they are taken.

## The browser journeys

```sh
# All in one: builds, starts the emulators, serves the page, runs the journey, stops everything.
npm run dev:connected:journey --workspace @mothership/game

# Keep the screenshots, the log and the facts it established:
MOTHERSHIP_EVIDENCE_DIR=../../docs/frontend/evidence/connected-v1 npm run dev:connected:journey --workspace @mothership/game

# The nine-player scenario: the Officer registers a shot on its own turn. It waits for
# that turn in real 60-second phases, so it can take about ten minutes.
MOTHERSHIP_JOURNEY=shot npm run dev:connected:journey --workspace @mothership/game

# A whole first round with nine players: on its own turn each role that has an action
# naming one seat registers it, and one player requests a Hack. About eleven minutes.
MOTHERSHIP_JOURNEY=roles npm run dev:connected:journey --workspace @mothership/game

# Seven players, from the start to the end of the second round's Jail vote: a Jail vote, a
# Captain election that ties and is run again, the release choice and the vote on it.
# Nobody acts on a turn, and every phase is still a real minute: about twenty-one minutes.
MOTHERSHIP_JOURNEY=votes npm run dev:connected:journey --workspace @mothership/game

# Seven players: what each phone is told in private, checked against the other phones, and a
# Scan on the Hacker's own turn. Up to about eight minutes.
MOTHERSHIP_JOURNEY=knowledge npm run dev:connected:journey --workspace @mothership/game
```

`journey.mjs` drives headless Chrome over the DevTools protocol: a host, a display and
seven (or nine) players, each in a browser context of its own. Every step is asserted and
the run stops at the first one that does not hold. With the emulators already running it
can also be run directly: `node dev/connected/journey.mjs [evidence directory]`.

Where it arranges a fault (an answer dropped, a request dropped, the network taken away),
it does so in the browser's network layer and says so. One answer is injected and labeled
as such: a "slow down" answer, which the backend cannot be made to give here. Nothing else
the backend says is invented. It is headless desktop Chrome with phone-sized pages: not a
phone, not a screen reader, not people.

## What a tab keeps

Session storage, per tab, ending with the tab:

- the Firebase sign-in for this tab (provisional: the policy per kind of device is undecided);
- which kind of device the tab is, the match identifier and its own admission request;
- while a command's outcome is unknown, four identifiers for it: match, seat, phase, command.

No role, location, target, view or payload is stored anywhere. Firestore runs with its
in-memory cache. The journey checks this in the browser after every step that could change it.
