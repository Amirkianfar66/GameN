# Slice 3a: the event director

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-event-director`, stacked on `agent/frontend-shot-flow` ([PR #18](https://github.com/Amirkianfar66/GameN/pull/18)) at `ba716d7` · **Bootstrap base:** `333c9e820f362a211352bc689372663f29b73ac4`
**Status: fixture-tested, with open findings from an independent review.** Not integrated with a backend or an emulator. The review found no hidden-information leak in production code, and five things that should be fixed before this slice is merged; they are listed, unfixed, in [verification-slice-3.md](verification-slice-3.md#independent-review). The slice was parked there when the Firebase-connected prototype became the priority.

This slice decides **which authorized presentation events become a moment of emphasis on a screen, and when**. It draws nothing: no animation, style or sound is added, and a page looks exactly as it did after slice 2. Drawing the cues, and the development-only motion gallery, are the next slice. It adds no dependency and changes no shared file.

The specification asks for the gallery first and for its *approved* cues to be connected to the director afterwards. This slice keeps to that order where it matters: it connects nothing. It issues cues that no page draws, so that the gallery has a real vocabulary to show and the Designer has something exact to approve or change.

## What exists after this slice

| Package | Added | Runs where |
| --- | --- | --- |
| `packages/presentation` | `director/director.ts`: a pure director for the table and one for a seat. Views and events in, cues out | Anywhere; pure functions |
| `apps/game/src` | An event stream on the transport boundary; `events/event-reader.ts`, the one place an event enters client state; checked events handed on by the session in step with its views; cues carried in screen frames | Anywhere; no browser global |
| `apps/game/dev` | Scripted event streams in the fixture scenario, delivered on each page's existing connection; operator controls for order, repeats and bad events | Development only |

## What a cue is

A cue is a moment of emphasis for something the screen already shows. An event authorizes it; what it shows is taken from the audience's own views.

- It **states nothing new.** Every fact a cue points at is in the document in words, and is spoken, whether or not the cue is ever drawn. A page that ignores cues loses nothing.
- It **changes nothing.** No health, resource, turn, phase or deadline depends on one. No timer belongs to one.
- It **holds nothing up.** There is no queue. Input is taken in the same instant a cue is issued, and the turn clock keeps its seconds.
- It is **shown at the moment its fact reaches the screen, or never.** A cue is not kept for a page that was in the background, a panel that was closed or a screen that was reconnecting.

The whole vocabulary:

| Cue | From | Carries | Is not |
| --- | --- | --- | --- |
| `phase-change` | `PHASE_CHANGED`, when the phase on screen changed | Nothing | A cinematic. The motion direction lists no cue for an ordinary turn change; whether this one is drawn at all is the Designer's call |
| `round-transition` | `PHASE_CHANGED`, when the round number went up with it | The round number | Shown after a reconnect. Only a device that saw the round go up gets it |
| `public-move` | `PUBLIC_MOVE` | The seat, and the place it was and is **on this screen** | A route. Nothing between the two places is implied |
| `status-change` | `PUBLIC_HEALTH_CHANGED` | The seat and its public health | An impact. The contract gives no cause, so none is shown: no attack, shooter, block or lettering |
| `registration` | `COMMAND_REGISTERED`, or this device's own accepted receipt | Nothing | An outcome, or a public event. It is private to the seat |

No cue carries an identifier: not the command's, the phase's, the event's or the match's. There is no cue kind for an attack, a block or a result, because no approved fact says one happened (RULE-003).

## The director's rules

Delivery is as the integration owner proposed for wire protocol 1 in `docs/backend/contract-review-response.md` on the backend branch (items FE-C04, FE-C10, FE-C11 and the section "Event subscription and reconnect"): each audience has an event stream of its own, ordered by view revision and then ordinal, with no promise about whether an event or the view it belongs to arrives first.

| Rule | In the backend's words |
| --- | --- |
| An event is played only when the view it names is the one on screen. One that arrives early waits for that view | "Buffer a live event until its corresponding authorized view revision is present" |
| An event the view has moved past is not played, whether it was waiting or arrives late, even if what it says is still true | "If a newer snapshot has overtaken an event, update facts and skip obsolete cinematic playback" |
| When a feed becomes current, whatever its first view already reflects is history | "establish a replay cutoff at its revision; retained older events are history, not instructions to replay animations" |
| An event delivered twice is played once | "Dedupe by match/audience/event ID" |
| A registration is one cue however this device hears of it: receipt, view or event | "registration by command ID; do not count a receipt and its event as two actions" |
| A round sweep needs the round before it. Without that context the change is a plain phase change, or nothing | "skip a cinematic when its context is unavailable" |

Three more are Frontend's own, and are stricter than the proposal requires:

- **A cue shows only what the screen states.** An event whose fact disagrees with the view of its own revision is dropped: a phase that is not the one on screen, a token that is not where the event says, a status the view does not show, a command the seat's own view does not list.
- **Only a change this device itself showed is emphasized.** The view before did not state the fact and the view on screen does. This is also what makes a first view history: with nothing shown before it, nothing in it is a change.
- **An event must belong to the view it is judged against:** same match, same kind of audience, same seat. Another seat's event is never a cue, whatever it says.

While a feed is not current (connecting, stale, an unreadable update, a recovery screen) nothing is played, not even for the view still on screen.

## From the server to a page

```text
transport ──unvalidated──▶ event reader ──checked──▶ session ──in step with views──▶ screen
                           strict schema,                                             │
                           protocol, match                                            ▼
                                                              director: view + event ─▶ cue
                                                                                      │
                                              shown now, or dropped ◀── privacy and visibility
                                                                                      ▼
                                                                      frame.cues / frame.privateCues
```

- **The transport** delivers events as it delivers views: unvalidated, in the stream's order, and does nothing else with them. It does not match them to views, drop repeats or decide what is old. One subscription carries both.
- **The event reader** is the single place an event enters client state. It parses strictly against the audience's own schema, so a fact the contract does not list, a field it does not name, or a seat's event on the table's stream never gets past it. An event that fails is dropped and nothing else happens: the screen takes its facts from views alone, so a bad event is not a reason for a recovery screen.
- **The session** hands checked events on in feed order and in step with its state. After an integrity failure it trusts the feed's events no more than its views.
- **The screen** tells the director where it stands on every redraw, and suspends it whenever the view is not known to be current.
- **A frame** carries `cues` and `privateCues`. Each cue has a number that only goes up; a new number means show it once. A frame keeps its latest cues until newer ones replace them, so a page that redraws for another reason does not play them again.

Privacy and visibility are the screen's own rules, enforced whatever a director returns:

| Situation | Public cue | Private cue |
| --- | --- | --- |
| Match on screen, in the foreground, private panel open | Shown | Shown |
| Private panel closed | Shown | **Dropped.** Opening the panel later does not play it |
| Page in the background | Dropped | Dropped |
| Connecting, or a recovery screen | Dropped | Dropped |
| Private panel closes while a private cue is in the frame | Kept | **Removed from the frame at once** |

## A registration, end to end

1. The player confirms inside the open private panel. The server answers with an accepted receipt, or the player's view lists the command first, or the `COMMAND_REGISTERED` event and its view arrive first. Whichever comes first produces the one `registration` cue, in `privateCues`.
2. The same frame already shows "Registered" on the Shot card, and the private line is spoken. The cue adds emphasis and no information.
3. Nothing is issued for any other audience. The table and the other phones are not handed a cue, a frame or a changed document; their streams receive nothing at all. This is tested with the real client core for three audiences, and separately with the event misdelivered on purpose.
4. A rejection, and a result that stays unknown, are not cues.

## What this relies on

Statements 9 to 14 in [contract-re-review.md](contract-re-review.md#what-the-client-now-relies-on), added with this slice. In short: an event names the revision of its own audience's view; that view states the event's fact; identifiers are stable and unique within a stream; a registration's event is written at the revision at which the actor's view first lists the command, on the actor's stream only.

**None of it has been exercised against the backend.** The backend that makes these statements is on an unmerged branch, and a transport to its emulator needs [REQ-7](integration-requests.md). The fixture streams were written from the response, not from running the handler.

Events are not needed for correctness. If the stream is late, missing or wrong, the cost is a cue, never a fact.

## Boundaries this slice enforces

- **Hidden information.** A registration is a private cue and is never issued outside the open private panel. No cue names a role, a target, a shooter or a cause. Event identifiers in the fixture are counted within one audience's stream, so no audience can see from a gap that something was written for another.
- **Registration is not damage.** `registration` has the same neutral shape for any secret command. Nothing about it reaches a public surface.
- **The client adjudicates nothing.** The director compares views and never derives an outcome. A health change is a status that changed.
- **Server-controlled deadlines.** A cue has no timer and no say in the countdown.
- **Reduced motion.** The cues issued are the same; how little is drawn for them is the renderer's part, keyed on the model's motion setting, which changes with the very next frame.
- **Fixture truth stays out of production.** Event streams, operator controls and synthetic facts live under `apps/game/dev`; the exclusion check covers them.

## The fixture event streams (development only)

The scripted scenario now keeps a stream per audience, writes each event together with the view it belongs to, and hands the whole stream over again to any feed that comes up, as the proposal says a stream is retained. Details are in [`apps/game/dev/README.md`](../../apps/game/dev/README.md).

- **Authored:** the one event the contract fixture authors, the Officer's `COMMAND_REGISTERED`, with the client's own command identifier when a phone sends the command.
- **Frontend-authored and synthetic:** a `PHASE_CHANGED` for each of the two synthetic steps, and two facts the operator can ask for at any time, a move by Player 8 and a status change of Player 9. They follow no rule and are the outcome of nothing. Two bystanders are used, never the scripted shot's actor or target. **Movement is not implemented by the backend, and this is not a claim that it is.**
- **To test the client:** events before their view, the whole stream again, an unreadable event, one in another protocol version, and an event shaped like the other seat's registration. The last is refused for the public stream.

## Choices made inside Frontend's ownership

Each is reversible and is listed so the owning role can overrule it.

| Choice | Why | For |
| --- | --- | --- |
| A cue can be missed; a fact cannot | A device that skips a revision, or receives an event late, drops that event's cue as the proposal says. The fact is on screen and spoken regardless | Designer, Game Balance: no meaning may ever rest on a cue alone |
| A private cue is never played later | It is for the moment itself. Playing it when the panel is next opened would be a private effect at a time the player chose to hide the panel, and the result is there to read and is spoken | Designer |
| Nothing is cued on a stale screen | "Showing the last known state" and emphasis for something new do not go together | Designer |
| `phase-change` exists as a kind | An authorized public fact with nothing to draw for it would be a gap for a renderer to fill by guessing. Whether it is drawn is open | Designer |
| A health change is `status-change`; the `publicImpact` token is unused | The token's name implies an impact. No fact says there was one | Designer; RULE-003 |
| A move is drawn from where the token was on this screen | After a skipped revision the event's own origin was never shown here | Designer |
| No cue carries an identifier | A renderer needs none, and a command identifier in a frame is one more place it could leak from | Codex Integration |
| Memory is bounded: 64 events waiting, 256 identifiers remembered | A correct feed stays far below both. A flood costs old entries, not growth | Codex Integration |
| An event that fails a check is dropped silently | Facts come from views. A bad event is not worth a recovery screen | Codex Integration: if such events should be reported, a diagnostics port is needed; none exists |

## Not in this slice

- Any drawing of a cue: no CSS, no animation, no overlay, no lettering, no sound. **The harness pages look the same as after slice 2.**
- The development-only motion gallery, with normal, reduced-motion and reduced-effects variants. Next slice.
- Coordinated timelines. They wait on the GSAP decision ([REQ-4](integration-requests.md), stage C).
- A cue for a resolved shot, a block, Final Zone entry or a match result. No approved fact exists for any of them.
- A real transport. The event stream is defined at the transport boundary and implemented only by the fixture.

## Open items carried by this slice

- **For Codex Integration:** requests E to G in [contract-re-review.md](contract-re-review.md#requests): confirm the two statements about revisions; say where the ordinal lives; say how many revisions one round resolution writes.
- **For the Designer:** the choices above; and whether several cues issued together should play together, in sequence or capped. They are issued in stream order and nothing here sequences them.
- **For Game Balance:** whether any cue, as specified here, gives one player information or time another does not have. The director's position is that it cannot, because every cue restates a fact on the same screen at the same moment.
- **Unchanged and still open:** RULE-001 to RULE-010; the reload lock and the private-result questions from slice 2.
