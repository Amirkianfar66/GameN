# Slice 1: player and table shells, snapshot and transport adapter

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-tabletop` · **Base:** `333c9e820f362a211352bc689372663f29b73ac4`
**Status: fixture-tested.** Not integrated with a backend and not measured on a device. See [verification.md](verification.md) for what was actually run.

This is the first of the reviewable Frontend slices: the accessible English player and table shells, and the adapter that lets an authorized audience view into client state. It adds no dependency and changes no shared file.

## What exists after this slice

| Package | Contents | Runs where |
| --- | --- | --- |
| `packages/presentation` | English copy, shell view-models built from one audience view, renderer-neutral semantic markup, announcement rules | Anywhere; pure functions |
| `apps/game/src` | Transport boundary, validated API client, snapshot store, server clock, session, headless screen controllers, token-driven stylesheet | Anywhere; no browser global |
| `apps/game/dev` | Scripted fixture scenario, loopback server, interim browser host, operator console | Development only |
| `apps/game/scripts` | Production-exclusion check | After a build |

The shells are drawn today by a small interim host in the development harness. The controllers they are drawn from are the durable part: each exposes `subscribe` and `getFrame`, which is what a React component reads through `useSyncExternalStore`. React itself is a requested dependency ([integration-requests.md](integration-requests.md), stage A), not something this slice assumes.

```text
transport  ──unvalidated payload──▶  snapshot store  ──view──▶  session  ──▶  screen controller  ──frame──▶  host
(fixture | emulator | production)    strict schema, pins,       connecting      model + announcement         draws, forwards
                                     forward-only revisions     live | stale    + focus request              input
                                                                    ▲
                                              server clock ─────────┘   (server timestamp carried by a monotonic clock)
```

## Boundaries this slice enforces

**Only an approved audience view enters client state.** A transport hands over unvalidated payloads and one store validates them against the strict schema for that route. A field the contract does not list is refused. A player's view fails the public schema, so it cannot enter table state even if it is delivered there.

**The table display cannot act for a player.** Its transport type has no command or receipt method, its screen has no role or action region, and the only control it renders is the reduce-motion setting.

**Presentation never adjudicates.** Nothing in either package computes eligibility, damage or an outcome. Inside the private panel the Shot card shows the server's `shotAvailable` and nothing else. There is no target list, no command and no receipt handling in this slice; those arrive with the next one.

**The client never advances a phase.** Reaching zero on the countdown changes the display to "Waiting for phase update" and pauses the actions region. The same phase stays on screen until an authoritative view replaces it. This slice calls no endpoint except server time.

**Registration is not damage.** Nothing here renders an outcome. A health change that arrives in a view is announced as a status ("Player 2 is now Injured.") and never as an attack, because the view carries no cause.

## Connection and screen states

| Connection | Meaning | What the shell does |
| --- | --- | --- |
| connecting | No readable view yet | "Connecting to the match…" |
| live | Feed is up and has delivered the current view | Normal |
| stale | Feed is down, or back up but not yet re-delivered | Keeps the last view readable, says it may be out of date, pauses actions, offers "Reconnect now" |

After a reconnect the view stays stale until the feed delivers the current view again, even an unchanged one. Being connected does not prove a view is current. The same seat and role are restored; another seat, another role, another match or different pinned versions is an integrity failure.

| Problem | Screen |
| --- | --- |
| Payload in another protocol version | "Update required" replaces the match. Clears when a readable view arrives |
| Seat, role, match or pinned versions changed; or one revision with two contents | "Match data check failed" replaces the match, permanently for the session. None of the offending data is shown |
| Payload that fails the schema | The last view stays, marked out of date. Clears on the next readable view |

Revisions only move forward. The store uses their order and nothing else: it exposes no revision arithmetic, so no code can read meaning into the size of a step.

## Time

The countdown is an estimate of server time for display only. A server timestamp is taken as the midpoint of a request's round trip and carried forward by a monotonic clock. The device's wall clock is never read, so a wrong or changed device time cannot move a countdown; the fixture's server time is months away from the real date specifically so that a client using its own clock would be visibly wrong.

Time is re-measured when the feed connects, when it reconnects, and when the page returns to the foreground. Until the new measurement arrives the timer says it is syncing rather than showing a number that may be stale. A sample that contradicts the current estimate beyond both error bars replaces it, which covers a device that slept.

The estimate is capped at the phase's own length, redrawn once per displayed second, and not redrawn at all while the page is hidden.

## Privacy

- A phone has one private panel, holding the role and the action status, and it is closed by default. While it is closed neither is in the model or the document; they are not hidden by style.
- Action status is treated as private as the role. Before Round 4 only one role can have a shot, so a visible "Available" would identify that role to anyone who glimpses the phone. A closed phone is the same document whatever role it holds and whatever it can do.
- When the page is backgrounded the panel closes, and returning does not reopen it. This is best-effort screen privacy, not screenshot protection.
- The panel also closes whenever the match leaves the screen, so it never reappears by itself after a recovery screen.
- Every phone renders the same set of action cards. Only the server-supplied status differs. Identifiers, classes and data attributes never contain a role name.
- Nothing is persisted. This slice writes to no storage, cache or analytics.
- No audience payload, role or target is logged by the client or by the development server.

## Accessibility

Built in and tested structurally; assistive-technology testing with real screen readers has **not** been run.

- A complete keyboard and tap path. Focus order is skip link, private-panel toggle, reduce-motion, match details. Nothing in this slice needs a drag or a pointer.
- One `main` landmark, one `h1`, heading levels that do not skip, named regions, a real table with caption and header cells for the roster, and a DOM list equivalent of the board.
- Status is never carried by color alone. Health, Jail, Captain and turn are separate text markers with distinct border treatments. Amber marks focus of attention and nothing else.
- The countdown is a `timer` that is not a live region. Meaningful changes are spoken through a live log: connection, phase, expiry, public seat changes, and one last-seconds notice to the player whose turn it is. Expiry and the last-seconds notice are each given once per phase, however often the clock is re-measured. Many simultaneous changes are summarized. After a reconnect the present is stated; the past is not replayed.
- When a recovery screen replaces the match, focus moves to its heading. Elsewhere a redraw puts focus back on the element with the same id.
- Reduced motion follows the device setting until the player chooses, and both paths reduce transitions to the 80 ms token with no travel or scale. After that the player's own choice wins in either direction.
- Touch targets meet the 44 px token. Type sizes follow the reader's font setting. Display lettering is capped to the viewport so one word still fits a narrow screen; body text is never capped.
- Safe-area insets, forced-colors mode, and a two-tone focus ring that stays visible on dark panels and on paper.

## Styling

`apps/game/src/styles/shell.css` reads every color, size, radius, stroke and duration from custom properties generated from the Designer's token proposal (`0.2.0`, unchanged). A test rejects a literal color or duration in the stylesheet and keeps the two layout breakpoints equal to the tokens. The look is a placeholder that respects the art direction's constraints — ink and paper, restrained halftone away from small text, neutral identical tokens — and is not a finished or approved treatment.

## Fixture mode and what it is not

Every screen fed by a fixture or emulator transport says so in a banner that cannot be dismissed. The development harness is described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md).

The scripted scenario replays the authored contract fixture for its first two steps. Its last two steps are frontend-authored variations so the shells can be seen in another turn and in round resolution; they show no outcome and are not a claim about how the server sequences a match. **None of this is emulator integration.** Authentication, Security Rules, transactions, receipts and scheduled deadlines are not exercised and are reported as *not run*.

`npm run check:exclusion --workspace @mothership/game` checks that the harness and the contract fixture cannot reach the client's production entry points: each package has exactly one way in, the module graph from the entries reaches nothing fixture or development, no shipped file contains a fixture-only identifier, and every development file carries its label in code so that it survives bundling. It was added and committed before the harness. It follows static references only; scanning a real bundle with `--bundle` is the backstop once a bundler exists.

## Choices made inside Frontend's ownership

These are interface decisions, not rules. Each can be changed in review.

| Choice | Reason | Who should look |
| --- | --- | --- |
| Role **and** action status sit in one private panel, closed by default; the art direction's layout shows the action hand outside the role drawer | Before Round 4 only one role can have a shot, so a visible status identifies it. The cost is one tap at the start of a turn | Designer, Game Balance, game owner |
| Every phone shows the same Shot card, with only its status differing | A phone's layout must not reveal the role dealt to it | Designer, Game Balance |
| Announce "N seconds left" once per phase, at ten seconds or on first sight below that, only to the player whose turn it is | A screen-reader user gets the warning a sighted player reads off the clock | Game Balance (equal access to time) |
| The table roster has one Status column naming turn, Jail and Captain | Fits beside the board from 960 px without breaking words; each stays a separately named fact | Designer |
| Display lettering is capped to the viewport width | At 200% text on a 320 px phone a single display-size word overflowed | Designer |
| A failed integrity check is permanent for the session | A feed that delivered another seat's data is not trusted again without a reload | Codex Integration |
| Client timing values (8 s request timeout, up to three time samples, 2–30 s retry) | Technical parameters only; none is a game rule or a deadline | Codex Integration |

## Open items carried by this slice

- The interim host replaces whole regions of the page. Focus is restored by id, but a screen reader's reading position inside a replaced region is not preserved. A React host removes this.
- There is no production bundle. `npm run build` emits package JavaScript and declarations; the stylesheet is not yet packaged. Both arrive with a bundler.
- Sound, the reduced-effects setting and the mute control are not built. The preference type keeps all three dimensions separate.
- The contract questions in [contract-review.md](contract-review.md) are unanswered.
