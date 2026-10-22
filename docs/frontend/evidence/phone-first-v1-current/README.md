# Current phone journey at `87715a4` (before the phone-first redesign)

Reference for [the Designer handoff](../../phone-first-v1-handoff.md). The real hosted client, unchanged,
on the local practice harness of [practice-bots.md](../../practice-bots.md): isolated Auth/Firestore
emulators, the loopback service with its local tick, and Vite on 5176. Captured on 8 October 2026 with
`node apps/game/dev/capture-setup-flow.mjs <this directory>` in headless Chromium 1194.

**Simulated viewports** (390×844 unless named; 320 and 1280 where marked), device scale 1, touch emulation.
Not a physical device, Cloud Tasks, App Check or staging measurement. Matches are disposable, all
identifiers are emulator values, and every match was ended by the host afterwards. Captures 13, 14 and 24
show a role on purpose: they are the revealed private states of a synthetic match.

`facts.json` holds, per capture: viewport, page height, horizontal overflow, focused element, role names
present anywhere in the DOM, visible controls under 44 CSS px, and the lobby status line.

| File | Screen and state | Observed |
| --- | --- | --- |
| `00-entry.png` | Entry: choose Host, Player or Display | links 20 px tall |
| `01-host-create.png` | Host: create a 7/8/9 lobby | |
| `02-host-request-pending.png` | Host: one request, six bots | "Device rR1xoC asks to join"; seat select; no decline |
| `03-host-ready-to-start.png` | Host: full roster | 2,168 px tall; Start below bots and display admission |
| `04-join-form.png` | Join: room code and starting room | |
| `05-join-waiting-admission.png` | Join: waiting for the host | |
| `06-seated-waiting-setup.png` | Seated, before host Begin | |
| `07-host-choosing.png` | Host: selection progress and countdown | Status shows raw `choosing` |
| `08-select-open.png` | Selection open, three characters free | countdown above the picker |
| `09-select-picked-320.png` | Picked and named, 320 px | |
| `10-select-confirmed.png` | Confirmed, locked | focus fell to `<body>` |
| `11-select-ended.png` | Window over, server assigning | short-lived on this harness |
| `12-role-concealed.png` | Role dealt, concealed; Ready disabled | no role name in the DOM |
| `13-role-revealed.png` | Revealed card and reminder | Supplier reminder names the Officer in a 7-seat match |
| `14-role-revealed-320.png` | Same at 320 px | Ready below the fold |
| `15-ready-waiting.png` | Ready accepted, reading time left | card removed; focus on `<body>` |
| `16-game-first-turn.png` | Launch: fresh first turn | crowded room truncates names |
| `17-host-running-end-confirm.png` | Host while running, end confirmation | focus on "No, keep the match"; stale status line |
| `18-game-host-ended.png` | Player after the host ended the match | no way to leave |
| `19-display-entry.png` | Display: identifier for the host | |
| `20-display-waiting.png` | Display admitted, lobby progress | |
| `21-select-name-too-long-320.png` | 17-character name, 320 px | Confirm disabled, no message |
| `22-auto-assigned-no-notice.png` | Never confirmed; server assigned | assignment not shown |
| `23-game-nine-seats-320.png` | Nine seats, 320 px | "Playe…", "B…" truncation |
| `24-game-private-open.png` | Private panel open | role card, knowledge, actions at the bottom |
| `25-display-board-1280.png` | Display at 1280×800 | names truncated in crowded rooms |

No capture had horizontal overflow. Role names appear in the DOM only in captures 13, 14 and 24.
