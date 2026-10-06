# Evidence: the first connected flow in a browser

Written by `apps/game/dev/connected/journey.mjs`, run through
`npm run dev:connected:journey --workspace @mothership/game` on 6 October 2026: headless
Chrome 154 on macOS, one browser context per device, against the local Firebase Auth,
Firestore and Functions emulators (firebase-tools 15.0.0) started by that command.

| Folder | Scenario | Contents |
| --- | --- | --- |
| [`movement/`](movement/) | A host, a shared display and seven players | `journey-log.txt`: the run in its own words. `facts.json`: every step and what it established, where each seat started and ended, the phases the display showed, and how many times each device called each operation. Screenshots `01` to `14` |
| [`shot/`](shot/) | A host, a shared display and nine players; the Officer registers a shot on its own turn | The same two files, and screenshots `01` to `04` and `s1` to `s6` |
| [`roles/`](roles/) | A host, a shared display and nine players, through a whole first round: each role with an action naming one seat registers it on its own turn, and one player requests a Hack | The same two files, and screenshots `01` to `04` and `r1` to `r5`. Written by a later commit than the other two, on the branch `agent/frontend-connected-actions`, with the emulators and the page already running (`npm run dev:emulators`, `npm run dev:connected`) |
| [`votes/`](votes/) | A host, a shared display and seven players, from the start of a match to the end of its second round's Jail vote: a Jail vote, a Captain election that ties and is run again, the Captain's release choice, the vote on it, and a vote in which nobody votes | The same two files, and screenshots `01` to `04` and `v1` to `v11`. Run on the branch `agent/frontend-connected-votes`, in headless Chrome 155, with the emulators and the page already running |
| [`knowledge/`](knowledge/) | A host, a shared display and seven players: what each phone is told in private, checked against the other six, and a Scan on the Hacker's own turn with its result | The same two files, and screenshots `01` to `04` and `k1` to `k3`. Run on the branch `agent/frontend-connected-knowledge-actions`, in headless Chrome 155, with the emulators and the page already running. The screenshots show one phone's private panel in a throwaway match |

Every statement in a log or a facts file is an assertion in the script that held in that
run. If one had not held, the run would have stopped there and written nothing after it.

## What these are, and are not

- **Throwaway emulator matches.** The identities are anonymous emulator identities and the
  match identifiers, room codes and roles on the screenshots belong to matches that ceased
  to exist when the emulators stopped. Nothing here is a real match or a real person.
- **A real backend on one machine.** The Firebase web client, Security Rules, the
  protocol-2 service and its 60-second phases are the real ones, run locally. No deployed
  project was involved.
- **Arranged faults, labeled.** Dropped answers and requests and the offline phone were
  arranged in the browser's network layer. One answer was injected by the script: the
  "slow down, retry after 3000 ms" in the seven-player run. Nothing else the backend said
  was invented.
- **Not phones, not people, not a screen reader.** The pages are phone-sized pages in
  headless desktop Chrome. A screenshot shows that a state was reached and how it looked
  there. It does not show that a real device, a real network or a real player would fare
  the same, and it proves nothing about multiplayer correctness or balance.
- **Not designed.** The lobby is a development console, and the action card has functional
  placement only.
