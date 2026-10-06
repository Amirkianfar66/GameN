# Slice 2: shot target and confirm flow, receipts and recovery

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-shot-flow`, stacked on `agent/frontend-tabletop` ([PR #15](https://github.com/Amirkianfar66/GameN/pull/15)) at `e64016e` · **Bootstrap base:** `333c9e820f362a211352bc689372663f29b73ac4`
**Status: fixture-tested.** Not integrated with a backend or an emulator, and not measured on a device. See [verification-slice-2.md](verification-slice-2.md) for what was actually run.

This slice adds the first thing a player can *do*: register a shot from their own phone, and find out reliably what the server did with it. It adds no dependency and changes no shared file.

## What exists after this slice

| Package | Added | Runs where |
| --- | --- | --- |
| `packages/presentation` | The Shot card's steps as a view-model, its markup, its English copy, what is spoken about a command, the gate and the target hints, an intent parser for hosts, nested redraw regions with focus fallbacks, a pure redraw planner | Anywhere; pure functions |
| `apps/game/src` | `command/shot-flow.ts`, the headless flow from picking the card up to knowing the server's answer; ports for command identifiers and for the one record kept across a reload; private speech on its own channel and step focus in the screen controller | Anywhere; no browser global |
| `apps/game/dev` | A scripted command desk in the fixture scenario, command and receipt endpoints, operator arrangements, an evidence script that drives a browser with real key and touch input | Development only |

## The flow

The specification names the states *Available → Selected → Targeting → Confirming → Submitting → Registered*, with explicit rejected and unknown-result states. In a DOM flow with one card, picking the card up and starting to choose a target are one tap, so *Selected* is the card's highlighted state from that tap until the command is settled, and the card names its step in words at every point.

| Card says | What it means | What the player can do |
| --- | --- | --- |
| **Available** | The server's own view says a shot is available. A "Choose a target" control is offered only on the player's own ordinary turn, on current, unexpired facts | Choose a target |
| **Not available** | The server's view says so. No reason is given: the screen does not know whether a shot was spent or never held | Nothing |
| **Choosing a target** | A local choice. Nothing has been sent | Pick a listed player, or cancel |
| **Not sent yet** | The confirm step, naming the target. Nothing has been sent | Register the shot, or choose someone else |
| **Submitting** | One command has been sent and no answer has arrived | Wait |
| **Registered** | The server said so, by a receipt or by listing the command in the player's own view. **Not an outcome** | Acknowledge |
| **Was registered** | The same report, not yet acknowledged, after the view has stopped listing the command as waiting | Acknowledge |
| **Not registered** | The server rejected it, or the command is known to have committed nothing | Acknowledge; choose again if it is still the player's turn |
| **Checking** | No usable answer arrived. The client is finding out | Wait |
| **Result unknown** | The automatic checks could not find out. Nothing is assumed either way | Check again; leave it, once that turn is over |

From *Submitting* until the command is settled the card is locked. There is no way to start over or pick someone else: a changed target would be a second command while the first might still land. The lock ends when the server answers, or when the command's phase is over and it can no longer be newly accepted.

## What happens to a command that gets no answer

A request that times out, fails in transit or comes back unreadable has an **unknown** outcome. The flow never treats it as failed and never replaces it with a new command.

```text
confirm ──▶ send command C (id k) ──▶ receipt? ──yes──▶ Registered / Not registered
                                         │
                                         no usable answer
                                         ▼
                              look receipt k up ──found──▶ Registered / Not registered
                                         │
                                  no receipt yet            could not ask
                                         ▼                        │
                              send C again, same id k             │
                                         │                        ▼
                               receipt ──┘            wait 1 s, 2 s, 4 s; then "Result unknown"
```

- The command sent again is byte-for-byte the first one: same identifier, same phase, same target. One choice has one identifier however often it travels.
- If the lookup itself cannot be answered, nothing is sent. The flow waits and asks again, three times, then says the result is unknown.
- Reconnecting, returning to the foreground, a new phase in the player's view, and the "Check again" control each start the checking again at once. A check that is stuck waiting on a dead connection does not hold a newer one back; its late answer is ignored.
- The player's own view settles the matter whenever it lists the command, even against this device's own earlier conclusion. A late answer about a settled command is ignored.
- Only the first answer to a command can settle it as "not registered" on a safe error. Once any attempt has gone unanswered, a later safe error settles nothing, because an earlier copy may have landed.

This rests on the command contract as the integration owner has stated it for wire protocol 1, in `docs/backend/contract-review-response.md` on the backend branch (commit `fd303a7`): receipts are durable for accepted and rejected commands alike; the identical command gets its original receipt back before phase or time is looked at; a command for a phase that is no longer open is rejected and that rejection is stored; and of the safe errors only `UNAVAILABLE` leaves an attempt's outcome unknown. Those statements are a proposal awaiting adoption, and the backend that makes them is unmerged. Frontend's reading of each is in [contract-re-review.md](contract-re-review.md). **If any of them changes, this flow must change with it.**

One consequence is deliberate. When the turn ends while an outcome is unknown, the client does not conclude "not registered" from the phase having changed. It sends the same command once more and shows the server's stored rejection. The answer is the server's, not an inference.

## Across a page reload

The specification allows a client to keep a non-secret reconciliation identifier across a refresh, and forbids keeping a target or a role. The flow keeps exactly that: the match, seat, phase and command identifiers of a command whose outcome is not yet known. It is written when the command is sent and removed as soon as the outcome is known. A host backs it with the tab's session storage.

A reloaded page that finds such a record asks about the command before it offers anything:

| What it finds | What it shows |
| --- | --- |
| The player's view lists the command, or a receipt says accepted | "Your shot is registered." It cannot say at whom: it kept no target, and the view does not carry one (FE-C09) |
| A receipt says rejected | "Not registered", with the server's code |
| No receipt, and the command's phase is still open | "Checking…", then "Result unknown". **The card stays locked.** The earlier request may still land, and the page cannot send it again, so a new choice could only race it |
| No receipt, asked after the command's phase was seen to be over | "Not registered. The turn ended before the server received your shot." This is the one place the client concludes something itself, and it follows from the contract: a command for a phase that is no longer open is rejected whenever it arrives |
| The server will not answer, and the phase is over | "Result unknown", which can now be left |

A reload when nothing was unresolved finds no record. The card then follows the view: "A shot is registered." if the view lists one.

The cost of the lock is real and is listed below for review: a player who reloads while a request is genuinely lost cannot shoot for the rest of that turn.

## Boundaries this slice enforces

**Nothing private is on screen, in the document or in a spoken line unless the private panel is open in the foreground.** Every step of the flow lives inside that panel. A closed or backgrounded phone is byte-for-byte the same document whatever its command is doing. What is spoken about a command travels on a channel of its own, separate from what anyone at the table could be told; when the panel closes that channel is emptied in the screen's frame, a focus request made inside the panel is dropped with it, and the host removes the spoken line from the document. A result that arrives while the panel is closed is said, once, when the player next opens it.

**A hidden registration moves nothing else.** In the fixture, the table display and the target's phone are not even redrawn. This is a property of the server writing only the actor's view; the client adds no public cue of any kind.

**Registration is not damage.** "Registered" is reported as a registration, with the sentence "This is not a result." No step names a hit, a block, a defense or a health change, and a later health change in a view is still announced only as a public status.

**The client decides nothing about the game.** The gate that offers the control uses the server's availability flag, whose turn it is, and whether this device is looking at current facts. The server's answer to the command is what decides, and a rejection is shown with the server's code and no invented reason.

**One confirmation, one command.** Only the confirm step can send, and it leaves that step before sending.

**A control that has just appeared does nothing for 400 ms.** The second tap of a double tap lands wherever the screen has drawn the next control: the confirm control under a tapped target, or the acknowledging control under a tapped "Register shot". Such a control is drawn as not yet active, stays reachable, and becomes active by itself. Without this a double tap could send an unintended shot or take a rejection off the screen before it was read.

**Almost nothing is kept.** One record of identifiers while an outcome is unknown, as described above. No target, role or payload, no local storage, cookie, cache or log. The registered target is remembered in memory for the page's lifetime only.

**Disconnect and deadline.** A stale connection or an expired local countdown removes the control and drops a choice that was not sent; so does a new phase. A command already sent is still reconciled. An intent is judged against the present, not against the last frame drawn. The client never advances a phase.

## Provisional, and why

These are the places where protocol 1 gives the client less than it needs. Each is isolated in one function and marked in code.

| What | Now | Why it is provisional |
| --- | --- | --- |
| Target list | Other players in the viewer's own location (`shotTargetCandidates`), with their public status in words. The list states that the server decides | Protocol 1 carries no legal-target set. Same location is the one targeting requirement the current rule source states outright; no health, Jail, Captain or Command Room inference is applied, and offering oneself is left out because no source settles it. The draft protocol 2 supplies `legalTargets`, which replaces this function |
| "Available" | The server's `shotAvailable`, which in protocol 1 means an unspent shot, plus the client's own-turn gate | Stated by the backend owner (FE-C05). In draft protocol 2 the flag means "may register now" and the extra gate goes away |
| "A shot is registered" after a reload | Shown when the view lists a pending command | True in protocol 1, where a shot is the only command. Draft protocol 2 allows two pending commands of different kinds and lists identifiers only |
| Copy that describes the game | "You can register a shot during your own turn." and "…resolved at the end of the round." | Taken from `turn_timing` and `end_of_round_order` in the current overlay. All flow wording is interface copy awaiting review |

## Accessibility

Built in and tested structurally; assistive technology was **not** run.

- The whole flow works with Tab, Enter and Space, and with taps. Nothing needs a drag, a hover or a pointer.
- When the player moves a step, focus goes to the line that asks or reports, never to the control that would send. Pressing Enter again there does nothing.
- While a command is in flight, focus rests on the card's title, which is not redrawn. What the server then does is spoken through the live region: sending, checking, registered, not registered, unknown. A rejection and an unknown result interrupt; a registration does not.
- A choice taken away by a lost connection, an expired clock or an ended turn is said to be unsent. One the player put down is not announced.
- If the element holding focus is redrawn away, focus stays with the card rather than jumping to the top of the page; when the panel closes under the player it returns to the control that opens it.
- A control that is not active yet is marked `aria-disabled`, not removed or disabled, so it keeps its place in the tab order and any focus put on it.
- Targets are full-width buttons naming the player and their public status in words; the numeral is decoration. Status chips carry their meaning as text; shape only reinforces it. The picked-up card is marked with ink, not with a ring that could be taken for keyboard focus.
- A step redraws the card alone, and a control becoming active redraws only the row of controls. The role card and the panel around them are not rebuilt.
- No new motion. The "Registered" mark is static; the stamp cue belongs to the event director slice.

## The fixture command desk

`apps/game/dev/fixture/scenario.mjs` now answers commands. It follows the stated command contract and applies no game rule: it holds one scripted registration and **never judges a target**. Its behavior and the operator's arrangements are described in [`apps/game/dev/README.md`](../../apps/game/dev/README.md). It is a double for development and tests. A journey passing against it shows that the client behaves as designed when the server behaves as stated; it shows nothing about the server.

## Choices made inside Frontend's ownership

Interface decisions, not rules. Each can be changed in review.

| Choice | Reason | Who should look |
| --- | --- | --- |
| Every step of the flow lives in the private panel, and its results are spoken only while the panel is open | A visible "Registered" or a spoken target would identify the actor. The cost is that a result arriving behind a closed panel waits to be seen | Designer, Game Balance, game owner |
| A reloaded page with an unresolved command keeps the card locked until a receipt is found or that turn is over | It cannot re-send what it did not keep, so a new choice could only race the earlier request. The cost: a reload during a genuinely lost request forfeits the rest of that turn. The alternative is to let the player choose again and accept that either target may be the one registered | **Game Balance, game owner** |
| Only identifiers are kept across a reload, in per-tab session storage | The specification's own line: an identifier may be kept, a target or role may not | Codex Integration |
| A control that sends or acknowledges is inactive for 400 ms after it appears | A registered shot cannot be withdrawn, and an unread rejection misleads; both are worse than a short wait | Designer |
| An unanswered command is re-sent automatically with the same identifier while its outcome is unknown | The player confirmed it; re-sending adds no possible outcome, only a durable answer. Bounded to three automatic checks | Codex Integration, Game Balance |
| A rejection stays on the card until the player acknowledges it, even into a later turn | Being told a shot did not register matters more than one saved tap | Designer |
| No reason is shown for "Not available", and none beyond the server's code for a rejection | The client does not know, and guessing could reveal a hidden fact | Game Balance |
| The target list infers nothing beyond location | See [Provisional](#provisional-and-why) | Game Balance, Codex Integration |
| Side padding is capped by the screen's width where boxes nest | At 320 px with text doubled, four nested boxes left 50 px for a button label | Designer |
| Timing values: 400 ms for a new control; checks after 1, 2 and 4 s; 8 s request limit | Technical parameters; none is a rule or a deadline | Codex Integration |

## Open items carried by this slice

- Emulator integration is **not run**. The backend's protocol 1 emulator exists on an unmerged branch; connecting to it needs a transport built on the Firebase client, which is REQ-7.
- The interim host has no automated test of its own. The order in which it redraws is now a tested pure function, but removing a spoken line and restoring focus are exercised only by the optional browser script. A React host replaces it.
- The interim host still redraws regions by replacing them. Nesting keeps that local, but a screen reader's position inside a replaced part is not preserved.
- A request limit is honored only as "no usable answer". Draft protocol 2 adds a rate-limit error with a retry delay, which the checks should then follow.
- Server time carried by command answers is not yet fed to the countdown.
- The 120 ms registration stamp and card-selection motion from the motion direction are not built. They arrive with the event director, which de-duplicates a registration announced by both a receipt and an event.
