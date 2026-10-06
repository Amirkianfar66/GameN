# Slice 1 fixture evidence

**Every image here shows synthetic fixture data.** Each screen carries the "Fixture data" banner. None of this is backend-connected evidence, and none of it is a device measurement.

Captured on 6 October 2026 by `apps/game/dev/capture-evidence.mjs` with headless Chrome 154.0.8037.98 on macOS, against the loopback fixture server. Phone captures use a 390×844 CSS-pixel viewport at device scale 2; table captures use 1280×800 at scale 1. The role shown is the fixture's own synthetic assignment.

The visual treatment is a placeholder built from the Designer's token proposal. It is not finished or approved art.

| File | What it shows |
| --- | --- |
| `01-player-1-own-turn.png` | Player 1's phone on its own turn, whole page: phase and countdown, location, action card, closed role drawer, all players by location, settings |
| `02-table-display.png` | The table display at the same moment: board by location with neutral numbered tokens, and the roster. No role, no private control |
| `03-player-1-role-drawer-open.png` | The role drawer opened with the keyboard, with the focus ring on its toggle |
| `04-player-1-after-registration.png` | Player 1's action card after the authored `afterRegistration` step. This is the only thing that changed on any screen |
| `05-player-2-narrow-200-percent-text.png` | Player 2's phone at 320 px wide with text doubled: one column, no sideways scroll |
| `06-table-display-forced-colors.png` | The table display in forced-colors mode: every status keeps its text |
| `07-player-1-connection-lost.png` | The feed dropped: last known state kept and marked out of date, with a reconnect control |
| `08-player-1-update-required.png` | A payload in another protocol version: the match is replaced and focus moves to the heading |
| `09-table-display-resolution.png` | The frontend-authored round-resolution step: no timer and no outcome |

`facts.json` holds what the script measured in the pages: visibility state, focus order, target sizes, computed transition durations, what was spoken, whether the table and the target phone changed during the hidden registration, the browser's log, and every request the pages made.

Regenerate from the repository root:

```sh
npm run dev:capture --workspace @mothership/game -- ../../docs/frontend/evidence/slice-1
```
