# Slice 1 fixture evidence

**Every image here shows synthetic fixture data.** Each screen carries the "Fixture data" banner. None of this is backend-connected evidence, and none of it is a device measurement.

Captured on 6 October 2026 by `apps/game/dev/capture-evidence.mjs` with headless Chrome 154.0.8037.98 on macOS, against the loopback fixture server. Phone captures use a 390×844 CSS-pixel viewport at device scale 2; table captures use 1280×800 at scale 1. The role shown is the fixture's own synthetic assignment.

The visual treatment is a placeholder built from the Designer's token proposal. It is not finished or approved art.

| File | What it shows |
| --- | --- |
| `01-player-1-own-turn.png` | Player 1's phone on its own turn, whole page, as first drawn: phase and countdown, location, the private panel closed, all players by location, settings. Nothing private is in the document |
| `02-table-display.png` | The table display at the same moment: board by location with neutral numbered tokens, and the roster. No role, no private control |
| `03-player-1-private-panel-open.png` | The private panel opened with the keyboard: role and action status, with the focus ring on the toggle |
| `04-player-1-after-registration.png` | The same panel after the authored `afterRegistration` step. The action status is the only thing that changed on any screen, and it is visible only because the panel is open |
| `05-player-2-narrow-200-percent-text.png` | Player 2's phone at 320 px wide with text doubled: one column, no sideways scroll |
| `06-table-display-forced-colors.png` | The table display in forced-colors mode: every status keeps its text |
| `07-player-1-connection-lost.png` | The feed dropped: last known state kept and marked out of date, with a reconnect control |
| `08-player-1-update-required.png` | A payload in another protocol version: the match is replaced and focus moves to the heading |
| `09-table-display-resolution.png` | The frontend-authored round-resolution step: no timer and no outcome |

`facts.json` holds what the script measured in the pages: visibility state, focus order, target sizes, computed transition durations, what was spoken, what left the document when the tab was backgrounded with the private panel open, whether anything changed on the table, the target phone or the closed registering phone during the hidden registration, the browser's log, and every request the pages made.

Regenerate from the repository root:

```sh
npm run dev:capture --workspace @mothership/game -- ../../docs/frontend/evidence/slice-1
```
