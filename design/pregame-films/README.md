# Pre-game films

The three films a player sees before the game, made again for the owner's "AAA animation" (8 November 2026): the Game N brand intro (2 s), a ten-second film for each role (the Doctor's first, the pilot) and the ten-second boarding. The handoff, with every beat, rule and limit, is [docs/design/pregame-films.md](../../docs/design/pregame-films.md).

| Path | What it is | Runtime? |
| --- | --- | --- |
| `kit/` | The films' kit: easing and seeded noise, light and particles, lettering, the crew lit | No (development code a port could take) |
| `brand/`, `roles/`, `boarding/` | The three films, each a pure function of time | No, until Frontend adopts them |
| `stage.html`, `stage.mjs`, `films.mjs` | The review stage: `stage.html?film=brand|role|boarding&variant=full|reduced&t=<ms>&play=1` (the role film takes `role`, `character` and `seat`; the boarding `roster=7|8|9`) | No (dev-only) |
| `renders.mjs` | The review renders, drawn by `design/tools/pregame-films-render.mjs` | No |
| `review/` | Review videos (60 frames a second), contact sheets and `records/` | **No**: review media, never imported or bundled |

Everything here imports the crew drawing and the rig unchanged. The review rosters and characters are synthetic fixtures.
