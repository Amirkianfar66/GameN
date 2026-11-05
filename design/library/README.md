<!-- mothership:dev-only -->

# design/library/: the role, action and environment library

Focused asset groups for the scenes the motion bible (`docs/design/cinematic/motion-bible.md`) lists
as missing, delivered one group per pull request after the cinematic pilots. Each group has its art
source, its generated exports, a state map from the candidate contract's views, its motion, its
proposed words, a review page, review captures, tests and a Frontend handoff. Nothing here is a rule,
a contract or runtime code; Integration adopts named files and hashes.

| Group | Scenes | Status | Handoff |
| --- | --- | --- | --- |
| 1 · `hack-engineer/` | Hacker final Code and unlock, Hack Spaceship, Engineer capture | proposal | [docs/design/library/hack-engineer.md](../../docs/design/library/hack-engineer.md) |
| 2 · `navigation/` | The offices' route panel, the public transit, the arrival at either planet | proposal | [docs/design/library/navigation.md](../../docs/design/library/navigation.md) |
| 3 · `hospital-panel/` | A Hospital patient's own code console: keypad, registration, R12 results, the deadline line | proposal | [docs/design/library/hospital-panel.md](../../docs/design/library/hospital-panel.md) |
| 4 · `promises/` | The six Promise cards, the giver's composer, the recipient's inbox, the ledger and the four results | proposal | [docs/design/library/promises.md](../../docs/design/library/promises.md) |
| 5 · `windows/` | The three windows, the four drawing stations, the drawing pad and Show, the feed, the Blackout's shade | proposal | [docs/design/library/windows.md](../../docs/design/library/windows.md) |
| 6 · `offices/` | The Captain's Officer appointment, the Officer badge, the movement block, its marker and expiry | proposal | [docs/design/library/offices.md](../../docs/design/library/offices.md) |
| 7 · `end/` | The end reveal over the arrival, no survivors, the abort, reconnect, stale and failed-asset states | proposal | [docs/design/library/end.md](../../docs/design/library/end.md) |

From group 2 on, the review pages share their frame: `review.mjs` (parameters, state cards, motion players, controls, art
loader) and `review.css`. Group 1's page keeps its own copy. `design/tools/library-assets.mjs` and
`design/tools/library-capture.mjs` take `--group <name>`, every group by default.
