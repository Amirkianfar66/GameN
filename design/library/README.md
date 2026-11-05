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

From group 2 on, the review pages share their frame: `review.mjs` (parameters, state cards, motion players, controls, art
loader) and `review.css`. Group 1's page keeps its own copy. `design/tools/library-assets.mjs` and
`design/tools/library-capture.mjs` take `--group <name>`, every group by default.
