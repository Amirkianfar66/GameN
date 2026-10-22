# Phone-first V1: Frontend review of PR #75 and handoff to Designer

For [issue #76](https://github.com/Amirkianfar66/GameN/issues/76) (Designer: phone-first V1 journey), reviewing draft
[PR #75](https://github.com/Amirkianfar66/GameN/pull/75) (staged start).

| | |
| --- | --- |
| Base | `87715a46dbd6a107e417bb6024d81c3fcb679049`, branch `codex/v1-start-sequence` (the issue's pinned design base; **not merged main**) |
| Pins | ruleset `in-person-v1-2026-10-06` (`6ca355eb…2809a90`), engine `full-game-1.0.1`, protocol 2, lifecycle `staged-start-1`, Original Powers off, asset manifest `design-0.2.0`, crew catalog `crew-0.1.0` |
| Author | Frontend role, Claude Code session (model reported to the owner in the session) |
| Stage | **Proposed** handoff. No runtime, visual, contract or rule change. Nothing merged or deployed |
| Evidence | Current runtime at 320/390/1280 CSS px on local emulators: [evidence/phone-first-v1-current/](evidence/phone-first-v1-current/README.md) |

Frontend implements the visual changes only after this handoff and the Designer's specification are reviewed.

## 1. What must not change

| Invariant | Enforced by | What the UI may do |
| --- | --- | --- |
| Selection lasts exactly 30 s from host Begin; confirmations and bots never shorten it | Server; `FullSetupDocument` refinement requires `choosingEndsAt − choosingStartedAt = 30000` (`packages/contracts/src/staged-start.ts:28-29`) | Show a countdown estimate. Reaching 0 changes words only |
| At expiry the server fills every unconfirmed seat (first free character, name `Player N` or `Player N-k`); confirmed choices are kept | `automaticIdentities` (`services/game-api/src/full-game.ts:361-385`) | Say what was assigned (missing today, M14) |
| Roles are dealt once, after selection; reading lasts at least 30 s from the actual deal | `readingStartedAt ≥ choosingEndsAt`, `readingEndsAt = readingStartedAt + 30000` (`staged-start.ts:31-32`) | Show reading countdown; Ready may be pressed early |
| Launch only when server time ≥ `readingEndsAt` **and** every current human is Ready; bots are Ready but wait both windows | `launchPrepared` (`full-game.ts:408-424`) | Show neutral progress; never start anything locally |
| First turn is a fresh 60 s from actual launch | engine phase at launch; `FullPhaseSchema` 60 s windows | Nothing to animate into a deadline |
| One deal through refresh, disconnect and recovery; a replacement binding must Ready again | `redeemSeatRecovery` (`full-game.ts:1022-1036`) | Fresh concealed card after recovery |
| Animation never gates a deadline or advances the match | client: motion is skipped when late (> 1 s) or reduced (`apps/game/hosted/comic-motion.mjs:28`) | Keep every transition skippable |

## 2. Review of PR #75 (setup contracts and frontend behavior)

**Result: no blocking defect.** At the base, `npm run verify` passed on Node 22.21.1 / npm 10.9.4 (section 9), and the local harness ran the whole sequence twice (7 and 9 seats) as specified: a 30 s selection, a deal after it, the reading minimum, an early Ready that did not launch, and launch with a fresh first-turn clock (0:59 when first drawn). The contracts carry everything the five screens need except two admission facts (section 7). The findings are UX gaps, listed as missing states in section 5.

What a client can read, by audience:

| Document | Audience | Content |
| --- | --- | --- |
| `matches/{id}/setup/public` | host, display, seated players | stage `lobby → choosing → awaiting-ready → running` (or `aborted`), windows, `dealId`, per-seat `confirmed`/`ready` only |
| `identities/public` | same | per seat `displayName` + `characterId` (bots included), `locked` after the deal |
| `setupPlayerViews/{uid}` | that human binding only, during `awaiting-ready` | own seat and **own role only** (no Code, targets, teammates or knowledge) (`firestore.rules:120-129`) |
| `practice/public` | same as public | bot seat IDs |
| `admissions/*` | host all; requester **only its own** | `pending` or `approved` + seat; there is no declined/closed state (`firestore.rules:91-95`) |
| `views/public`, `playerViews/{uid}` | after launch only | gameplay; the host identity is a display member and may read `views/public` |

Operations and refusals the UI must word (today shown as raw codes in the status line):

| Operation | Refusals besides `UNAUTHENTICATED`, `FORBIDDEN`, `INVALID_REQUEST`, `UNSUPPORTED_*`, `REQUEST_ID_CONFLICT`, `UNAVAILABLE`, `RATE_LIMITED`+`retryAfterMs` |
| --- | --- |
| `v1BeginSetup` (host) | `ROSTER_INCOMPLETE`, `SETUP_LOCKED` |
| `v1ConfirmSetupChoice` | `CHARACTER_TAKEN`, `NAME_TAKEN` (NFKC, trimmed, case-insensitive), `SETUP_LOCKED` (window over), `STALE_BINDING` |
| `v1ReadyForMatch` | `STALE_DEAL`, `STALE_BINDING`, `SETUP_LOCKED` |
| `v1RequestAdmission` (join) | **only `FORBIDDEN`** for an unknown code, a lobby that is no longer open, or a device already seated (`full-game.ts:276-281`); 20 requests/min. "Full" is not checked when asking |

Two server capabilities the UI does not use (decisions D2, D3): a confirmed player may confirm a different pair until the deadline (`full-game.ts:497-518`), and the role preview stays readable after Ready until launch (`setup-feed.ts:55-56` stops listening on Ready).

## 3. Existing components to reuse

Runtime is plain DOM (`apps/game/hosted/*.js`) plus the presentation package's string markup with region redraw; no React, R3F or GSAP is in the hosted bundle. IDs below are stable hooks; keep them or name their replacements. Short file names are in `apps/game/hosted/`, except `setup-feed.ts` (`apps/game/src/connected/`) and `comic-shell.ts` (`packages/presentation/src/markup/`).

| Area | Source | Hooks | States today |
| --- | --- | --- | --- |
| Entry | `main.js:298` | `#connected-as-{host,player,display}` → `?as=` | three links |
| Host console | `main.js:315-597` | `#connected-player-count`, `#connected-create`, facts `#connected-{uid,match-id,room-code,seated,match-status}`, `#connected-requests li[data-admission][data-status]` + seat `select` + `button[data-approve]`, `#connected-start`, `#connected-end{,-note,-cancel,-confirm}`, `#connected-display-uid`, `#connected-admit-display`, `#connected-recovery-{seat,issue,codes,note}` | create; request pending/seated; Start enabled/disabled; two-step end (focus to "No, keep the match"); recovery code issued (10 min, page memory only)/uncertain/lost |
| Practice bots | `practice-controls.js` | `#connected-bot-count`, `#connected-bots-{save,abandon,summary,roster}` | loading/unavailable, none, N bots, pending/uncertain |
| Unsettled request | `keeping()`, `main.js:152` | "Send the same request again", `[data-give-up]` | every lifecycle control: sending, no answer, refused, not now (+ wait), given up; inputs locked while unsettled |
| Status line | `say()`, `main.js:71` | `#connected-status[data-kind=info\|problem]`, `role=status` | last operation outcome |
| Join and wait | `main.js:624-831` | `#connected-room-code-input` (12 hex), `#connected-initial-room` (Room A/B), `#connected-join`, `#connected-waiting`, `#connected-seat`; recovery `#connected-recover-{match,code}`, `#connected-recover`, `-again`, `-start-over` | form; waiting for host; seated; taking over a seat (answer uncertain/settled by server) |
| Setup progress (host, display, player) | `createSetupProgress`, `setup-controls.js:3` | `#setup-progress-{heading,status}`, `#setup-countdown[role=timer][aria-live=off]`, `#setup-progress-seats li[data-setup-seat]` | lobby; n of N confirmed; n of N ready; started; ended by host; countdown syncing/running/ended |
| Character selection | `createPlayerSetup`, `setup-controls.js:37` | `#crew-name`, `.crew-picker[role=group]`, `button.crew-option[data-character][aria-pressed][aria-disabled]`, `#crew-status`, `#crew-save` | offered; taken ("Call sign · Player N", disabled); picked; sending/retry; confirmed (locked); refused taken; ended |
| Role reveal and Ready | `role-confirmation.js` | `#setup-role-{toggle,card,ready,status}`; card `.ms-role-card--full[data-device][data-character][data-team]` + `.setup-role-guide`, **only while revealed** | waiting; concealed (Ready disabled until revealed once); revealed; hidden; Ready sending/retry; ready (card removed, `#setup-ready-waiting`) |
| Game, phone | `renderComicPlayerShell` (`packages/presentation/src/markup/comic-shell.ts`) | `.ms-shell[data-screen][data-connection][data-motion]`, `#ms-title`, phase strip + `.ms-timer[data-state][data-final]`, `[data-region=comic-board]` `li.ms-zone[data-zone][data-current]` `li.ms-seat[data-seat][data-character]`, `#ms-private-toggle`/`#ms-private-panel`, `.ms-card__state[data-status][data-step]`, `[data-region=vote]`, `[data-region=result]`, `details.ms-readable-board`, `#ms-reduce-motion` | screen connecting/match/blocked (4 problems); live/stale banner + "Reconnect now"; action card idle → choosing → confirming (400 ms arm) → submitting/checking → accepted/not accepted/unknown ("Check again") |
| Table display | `renderComicTableShell` | same public regions + `#ms-roster` table | public only; no private panel |
| Art | `art.mjs`, `comic-assets.mjs` | `html[data-art]`, `--ms-asset-*`, `--ms-role-person/-device` | every phone requests public-board + player-ui + roles at page load; host/display public-board only |
| Motion | `comic-motion.mjs`, `comic-layout.css:34-37` | | public move 900 ms (≤ 4 seats); role-card turn 900 ms (CSS); both off under reduced motion |

Designer's existing contract (35 components in `design/contract/component-states.json`) covers the game shell (`phase-timer`, `seat-tag`, `private-dock`, `role-card`, `action-card`, `button`…) and `character-choice` (offered/taken/mine). It has **no** component, layout or copy for host, join/wait, setup countdowns, Reveal/Ready, votes or end screens.

## 4. Journey and state map

`✓` exists · `~` partial · `✗` missing. M-numbers refer to section 5.

| Screen | State | Source | Today |
| --- | --- | --- | --- |
| Entry | Host / Player / Display chooser | `?as=` | ✓ (links 20 px tall, M31) |
| 1 Host | Create 7/8/9 | `v1CreateMatch` | ✓ |
| | Room code to share | `control/session.roomCode` | ~ plain text; copy/QR would be new (M4) |
| | Incoming request, seat a human | `admissions/*`, `v1ApproveAdmission` | ✓ no decline (M2); device tag only (M3) |
| | Bots add/update/remove | `v1SetPracticeBots`, `practice/public` | ✓ |
| | Start setup | `v1BeginSetup` | ~ no reason when disabled (M6) |
| | Choosing / reading progress | `setup/public` | ✓ neutral; raw stage words (M5) |
| | Stuck waiting for a Ready | `setup/public` | ~ no next step (M9) |
| | Running status | `lobby/public`; host may read `views/public` | ~ "Status: running" only (M8) |
| | End match (two-step) | `v1AbortMatch` | ✓ |
| | Seat recovery, display admission | `v1IssueSeatRecovery`, `v1AdmitDisplay` | ✓ long typed identifiers (M10) |
| | Whole-page hierarchy | | ✗ one 2,168 px column (M7) |
| 2 Join | Code + Room A/B + Ask to join | `v1RequestAdmission` | ✓ |
| | Format error | client check | ✓ "A room code is twelve characters, 0 to 9 and A to F." |
| | Refused / unknown / started / full | `FORBIDDEN` only | ~ raw code (M1) |
| | Waiting for host | own admission | ✓ never ends if not seated (M2) |
| | Seated, waiting for setup | `setup/public` | ✓ |
| | Recover seat with host code | `v1RedeemSeatRecovery` | ✓ |
| 3 Select | Countdown syncing/running/ended | `setup/public` + `v1ServerTime` | ✓ scrolls out of view (M16) |
| | Available / taken / picked / confirmed | `identities/public`, `setup/public` | ✓ |
| | Picked character taken by someone else | `identities/public` | ~ (M11) |
| | Name invalid or too long | client + `CrewDisplayNameSchema` | ✗ (M12) |
| | Sending / uncertain / refused | operation | ✓ |
| | Ended, assigning | countdown | ✓ |
| | Assigned by the server | `identities/public` | ✗ (M14) |
| | Connection lost while choosing | feed | ~ picker vanishes (M17) |
| 4 Role | Waiting for the deal | `setup/public` | ✓ text only (M21) |
| | Concealed → revealed → hidden | own preview | ✓ |
| | Ready sending / uncertain / accepted | `v1ReadyForMatch` | ✓ focus lost (M19) |
| | Ready, reading time left / others pending | `setup/public` | ✓ card cannot be reopened (D3) |
| | Took over the seat, must Ready again | recovery | ✓ |
| | Stale deal or binding | refusal | ~ raw code (M5) |
| 5 Game | Connecting, blocked (update required, data check failed, no access, access unconfirmed), stale banner | session | ✓ |
| | Round, phase, whose turn, timer (running, final ≤ 10 s, syncing, expired, none) | `playerViews/{uid}` | ✓ turn named by seat number only (M26) |
| | Board, seat tags, Bot label, markers (You, Active turn, Healthy/Injured/Eliminated, Jailed, Captain, Revealed faction) | public facts | ✓ names truncated when crowded (M25) |
| | Private closed / open / concealed on background | local | ✓ no blur concealment in game (M30) |
| | Role card, What you know, Supply results | own view, own acknowledgments | ✓ |
| | Actions: move, shot, disable, protect, rescue, scan, supply, hack, Code, showdown shot, vote, release choice, release vote | server lists only | ✓ all inside the private panel (M24) |
| | Choice withdrawn by a newer view | own view | ~ silent reset (M28) |
| | Captain election (runoff is another `CAPTAIN_ELECTION` window), Jail vote, release choice/vote, Hack, Showdown | phase kinds | ✓ functional, not designed |
| | Eliminated, watching | public facts | ~ same screen (M27) |
| | Winner/draw/Alien co-win + role and Code reveal; ended by host, no winner | `result`, `endReveal` | ✓ no way to leave (M29) |
| Display | Waiting/progress; public board; roster table | public only | ✓ |

## 5. Missing states found early

**FE**: Frontend can build on existing contracts. **DEC**: owner/Designer decision. **BE**: needs a Backend/Integration contract change (section 7).

| ID | Gap (evidence) | Needs | Owner |
| --- | --- | --- | --- |
| M1 | Join refusals show "refused by the server (FORBIDDEN)" | One plain state: "Cannot join with this code: check it or ask the host"; distinct reasons only with BE-1 | FE (BE-1 optional) |
| M2 | A request never resolves if the host does not seat it, setup starts or the match ends; the requester can read nothing else, and the host cannot decline | "Still waiting" with leave/forget now; decline and closed states need BE-2 | FE + BE-2 |
| M3 | Host sees "Device rR1xoC"; the player sees a 28-character UID in a fact list | Show the same short tag prominently on the waiting screen | FE |
| M4 | 12-character hex code typed by hand | Grouped display, paste-tolerant input; copy/share/QR is a **proposal** | FE / DEC |
| M5 | Raw words: Status `choosing`, `awaiting-ready`, `aborted`; refusals `ROSTER_INCOMPLETE`, `STALE_DEAL` | Readable labels and refusal copy | FE |
| M6 | Start disabled without a reason (`main.js:541`) | Reason line: seats missing, bot update pending, settings unknown | FE |
| M7 | Host page is one long column; Start sits below bots and display admission (`03-host-ready-to-start`) | Hierarchy: frequent (requests, roster, Start, progress) vs rare (display, recovery, end) | Design |
| M8 | Running host shows only "Status: running" | Optional public round/phase/turn summary (no contract change) | DEC |
| M9 | A missing human Ready or a disconnected player blocks launch; host gets no prompt | Name the waiting seats and offer seat recovery or end match | FE |
| M10 | Display admission needs the display's UID typed on the host; recovery needs a 36-char match ID and a 43-char code typed on the new device | Copy/paste affordances; QR is a proposal; the code must stay out of URLs and storage | FE / DEC |
| M11 | A picked character taken by another seat stays pressed and Confirm stays enabled until `CHARACTER_TAKEN` (`setup-controls.js:93-103`) | Conflict state on the tile and the button | FE |
| M12 | Over 12 code points: Confirm silently disabled; input allows 24 UTF-16 units (`setup-controls.js:41,102`; `21-select-name-too-long-320`) | Live count and message | FE |
| M13 | Not confirming loses the pick and name at expiry | Keep as is, or save drafts with the existing `v1SetLobbyIdentity` (a tap then **publicly reserves** the character) | DEC |
| M14 | Server assignment is silent: the player became "Player 9" with Echo, shown nowhere before the reveal (`22-auto-assigned-no-notice`) and truncated to "Playe…" on the board (`23`) | "You were given Echo, named Player 9" before the role card | FE |
| M15 | Confirmed choice is locked though the server accepts a change until the deadline | Keep locked (simpler) or offer Change | DEC |
| M16 | Countdown sits above the picker/card and scrolls away (`08-select-open`); no "10 seconds left" announcement (the game has one) | Persistent countdown; one threshold announcement | Design / FE |
| M17 | A listener outage hides the picker ("Waiting for current setup progress…"); a fail-closed feed never recovers without reload | Reconnecting state that keeps the typed name; reload state | FE |
| M18 | Copy: player heading "Confirm your private roles" (plural) | Copy | FE |
| M19 | Focus falls to `<body>` when Confirm or Ready disappears (`facts.json`: `10-select-confirmed`, `15-ready-waiting`) | Focus target per stage change | FE |
| M20 | Role guide text: hosted `role-guide.js` vs Designer `copy.en.proposed.json`. The Supplier guide mentions the Officer in 7/8-seat matches (`13-role-revealed`); the Designer lines "At the start you are shown three players" (L26, also L102, L141) imply knowledge that arrives only at launch | One approved, mode-aware source; Balance review | Design + Balance |
| M21 | Long waits (deal delayed past the deadline, launch waiting for others) have one static line | "Still waiting for the server" / waiting-for seats, without guessing a cause | FE |
| M22 | Status line keeps old outcomes ("Asking to join: done." during selection; host "Starting character selection: done." while running) | Clear or scope per stage | FE |
| M23 | Lobby console has no safe-area insets (`preview.css:14-20`); the game shell has them | Insets | FE |
| M24 | Every action, including public Move and votes, exists only inside the open private panel; on phones it is inline below the board (`comic-layout.css:48-51`), so acting shows the large role card and puts actions ~1,900 px down (`24-game-private-open`) | Dock or sheet; whether public actions leave the private area; role card size (DSN-D04/D18/D19) | Design / DEC |
| M25 | Crowded rooms truncate names ("2 B…", "Playe…") at 320 px and on the 1280 px display (`16`, `23`, `25`) | Crowded-room tag rule with full names reachable | Design |
| M26 | "You are Player 7", "Player 6's turn", knowledge lines use seat numbers only | Name/character beside the number where public | Design / FE |
| M27 | Eliminated player sees the ordinary screen | Watching state (no new rule: offers stay server-driven) | Design |
| M28 | A choice the server stops offering in the same phase is reset silently | Short "That choice is no longer available" | FE |
| M29 | After the match ends, players have no in-page way to leave: the lobby console with "Forget this match" is hidden once the game mounts (`main.js:289`) | Leave and join another; host creates a **fresh** lobby | FE |
| M30 | The game private panel hides on background but not on window blur (the setup card does both) | Decide one concealment rule for both | DEC |
| M31 | Under 44 px measured: entry links (20 px tall), "Open a Player tab" (24 px), Reduce motion checkbox (24×24, label enlarges it) | Target size | FE |

## 6. Accessible interactions to keep, and privacy boundaries

Keep:

- A tap and a keyboard path for everything; no drag, hover or long-press. Controls use `--ms-target-min` (44 CSS px from tokens); exceptions in M31. No horizontal overflow was measured at 320, 390 or 1280 px in any captured state.
- Visible focus ring; the host's end confirmation focuses "No, keep the match"; after seating, focus moves to the next request or Start; game redraws keep focus by id or region fallback (`browser-host.js:99-127`); blocked screens focus their heading.
- Live regions: lobby status `role=status`; countdowns `role=timer` with `aria-live=off`; the game speaks one "N seconds left" to the active seat or eligible voters; private lines are removed from live regions when the panel closes (`privacyEpoch`).
- Text alongside color: taken characters name the holder; markers and zones are words; Ready is words; a readable players-and-locations list.
- Names are untrusted text: isolated direction (`unicode-bidi: isolate`), never markup, class or URL; always with the seat number.
- Reduced motion from the OS and the in-app checkbox (`data-motion`); forced-colors styles exist (`comic.css:1464`).

Privacy boundaries (hard rules for every design):

1. Before launch a player sees **only their own role**. No Code, targets, teammates or starting knowledge; copy must say "when play starts" (M20).
2. Host and display never receive or imply a role, device, team, Code or private target. The host is not a player; a host who plays uses a separate Player tab or device.
3. Closed or concealed surfaces contain no role name, device, team color or role-specific hook. `data-device`, `data-team`, role-card art and role-specific action IDs (`ms-action-open-<kind>`) exist only inside an open panel. Measured: no role name in the DOM in any concealed, host or display capture.
4. Every phone requests the same three art bundles at page load; revealing never fetches. No role-specific asset, sound, vibration, haptic or duration (`cue-role-card-turn` is the same 900 ms for every role).
5. Concealment: the setup card hides on blur and background; the game panel hides on background and never reopens by itself after foregrounding or reload; Ready removes the card.
6. Storage and URLs: per-tab `sessionStorage` holds only the device kind, match/admission/seat IDs, the identifiers of one unresolved command and of an unsettled recovery-code request, and the sign-in credential (`main.js:24-44`); URLs carry only `?as=`. Recovery codes live in the host page's memory only.
7. Public faction appears only after a server reveal (Revealed marker, end reveal table). A registration is never shown as an outcome ("This is not a result").

## 7. Implementation constraints and proposed contract changes

- **Timing is server-owned.** Countdowns come from one server-time sample (resynced every 15 s, invalidated on suspension, `setup-clock.js`); "0" only changes words. Setup ends and the game mounts when `lobby/public.status` leaves `lobby` (`main.js:229-233`); today there is no transition between them.
- **Every lifecycle control has an unsettled form** (same request resent, inputs locked, "Give this request up"); designs need a slot for it on join, seat, start, end, bots, display, recovery, Confirm and Ready.
- **DOM and CSS only** in the hosted build today; a canvas or 3D board would be a separate renderer decision. Comic art comes only through the three hashed `design-0.2.0` bundles (`comic-assets.mjs` refuses drift); new art means a new manifest version and integration review. Tokens 0.4.0 are a proposal (`nextDesignTokens`), adoption pending DSN-REQ-2.
- **Layout today:** hosted CSS breaks at 22, 34, 37.5, 48 and 80 em (the shell also at 600 and 960 px); the board is one column at ≤ 22 em; the phase strip is sticky (static at ≤ 30 em tall). The phone already shows the comic board plus a readable list (`comic-shell.ts:82-111`) and the large role card, unlike the DSN-D18/D19 interim in `docs/design/`.
- **Seats and names:** 7–9 seats; a room can hold all nine; names are 1–12 code points (can be wide), unique, and the server's fallback names look like seat labels ("9 · Player 9").

Proposed to Integration (not implemented; only if the owner wants these states):

- **BE-1** Requester-visible admission refusal reasons (unknown code, lobby closed); today all are `FORBIDDEN`.
- **BE-2** Admission closure visible to the requester (declined; closed when setup begins or the match ends) and a host decline operation.

Everything else in section 5 is possible on the current contracts.

## 8. Decisions requested

| ID | Question | Today |
| --- | --- | --- |
| D1 | Phone private area: docked sheet or inline; do public actions (Move, votes) leave the private panel? (M24) | Inline panel holds the large role card and every action |
| D2 | Allow changing a confirmed choice before the deadline? (M15) | Locked after Confirm |
| D3 | Allow reopening the role card after Ready until launch? | Not reopenable |
| D4 | Save selection drafts (public reservation on tap)? (M13) | Local pick until Confirm |
| D5 | Host running summary from the public view? (M8) | "Status: running" |
| D6 | Share affordances: copy room code; QR for join, display or recovery (proposals, no backend) (M4, M10) | None |
| D7 | One concealment rule for setup and game? (M30) | Setup: blur and background; game: background |

Stale statements the Designer should update: "name and character are in no contract" (`docs/design/README.md:11`, `component-states.json:2`, `visual-interaction-contract.md:8,118`, `owner-decisions.md:36`); selection "in the lobby, before the starting room" (`component-states.json:522`, DSN-D15 at `README.md:113`; the order is now room at admission → Begin → 30 s choosing → deal → reading + Ready); "chosen by its player" (the server may assign); bundles "before the first match view" (now before any setup view; the runtime loads them at page load); DSN-REQ-6/7 are resolved by `docs/decisions/2026-10-07-crew-identity.md` and the staged start.

## 9. Checks and integration preparation

Run in an isolated worktree at the base on Node 22.21.1 / npm 10.9.4:

- `npm ci`, then `npm run verify`: passed. Toolchain, workspace and source integrity; both typechecks and the build; **915 tests** (50 bootstrap/contracts, 97 engine, 118 backend, 99 tooling, 151 presentation, 400 frontend; 0 failed, skipped or todo); production exclusion (53 modules, 164 files, 29 dev files labeled); balance static 70/70; 483 catalogue passes, 33 reviewed blocked, 6 manual; 4,388 controls detected; 30 playouts (10 each for 7/8/9), zero mismatches.
- Local practice harness per [practice-bots.md](practice-bots.md) (isolated Auth/Firestore emulators, loopback service and tick, Vite on 5176), then `node apps/game/dev/capture-setup-flow.mjs <dir>`: both scenarios completed. This adds one dev-only capture tool, labeled for the production-exclusion check; no runtime file changed. The branch head's own `verify` run is reported in its pull request.

Not run: Backend/Frontend emulator suites (`npm run test:emulator`, `test:frontend:emulator`), staging, Cloud Tasks, physical phones, screen readers, 200% text, on-screen keyboards. Captures are simulated viewports, not device measurements.

Next Frontend steps after this handoff and the Designer's specification are reviewed, each a separate draft PR with browser evidence at 320/360/390/430 px, large text and reduced motion:

1. Split the hosted console into host, join and setup modules with the same hooks; fix FE-only gaps that need no design (M5, M6, M11, M12, M14, M18, M19, M22, M23, M29, M31).
2. Phone setup screens (selection, reveal, Ready, waits) to the Designer's specification.
3. Host phone hierarchy (M7–M10).
4. Phone game layout (D1, M24–M28, M30).
5. Recovery, system and end states.
