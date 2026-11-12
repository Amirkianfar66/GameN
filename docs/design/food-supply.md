# The Food Supply Task

A two-player Task in the Supply Room, designed from the owner's confirmed highlights of 11 November 2026, the owner's answers the same day and after midnight, and the owner's crane, which replaced the first design that evening ([owner-decisions.md](owner-decisions.md#11-november-2026-the-food-supply-task)). **A design proposal on synthetic fixtures. It activates no gameplay and is in no release.** Every choice of the design's own is marked PROPOSED; the rest follows the owner's decisions.

| | |
| --- | --- |
| Base commit | `8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d` (`main`, after PR #225), in its own worktree on `claude/designer-food-supply` |
| Ruleset in force there | `in-person-planet-blackout-before-vote-2026-11-10` (engine `planet-game-1.3.0`, protocol 3): `rules/planet-successor-blackout-before-vote-authority-2026-11-10.json` and `rules/overlays/planet-blackout-before-vote-owner-decision-2026-11-10.json`, over the successor authority `in-person-planet-2026-11-05` |
| Rule source for this Task | The owner's decisions of 11 and 12 November 2026 only. No Task, Food or Supply Room rule exists under `rules/` at the base commit |
| The owner's detailed handoff | `docs/design/food-supply-requirements-2026-11-11.md` and `food-supply-concepts/` are on the owner's computer and were not available to this session. This design follows the owner's decisions; it will be reconciled with that file when it is shared |
| Fixtures | The phone pack's invented roster: Hana (seat 8) runs the Winch, Cleo (seat 3) the Panel, both from Room B. In the flow, Ava (seat 1) and Gus (seat 7) went for food last round, and the stock is 1 package before the Task |
| Runner | A Claude Code session acting as Visual and Motion Designer |

## The concept

**A crane on a ceiling rail, seen from the side, that two people must time together and either can turn on the other.** The Supply Room is a cargo bay with a rail across the top and seven stops painted on it, 1 to 7:

- **Stop 1:** the intake hatch, where the ration crate rises from the supply pod under the hull.
- **Stop 5:** the console, where **Cleo runs the Panel** (horizontal), standing under the rail.
- **Stop 6:** the galley lift's landing platform, where the crate should land.
- **Stop 7:** **Hana's cab**, hung under the rail's right end, right of the platform. Hana runs the **Winch** (vertical) from it.

The **locking panel** rides the rail with the crate's hoist on it. Delivering takes four presses and two keys:

1. **Hana: Raise.** The crate rises out of the intake.
2. **Cleo: RELEASE.** The panel's blade lifts and the panel runs along the rail, fast, end to end and back: a stop every 0.22 s (PROPOSED).
3. **Cleo: LOCK** as it passes stop 6. The blade drops and the panel stops there. The sudden stop **sets the crate swinging** like a pendulum, wide at first, then calmer, but never still.
4. **Hana: Lower** as the swing passes over the platform. The crate lands, and the platform's jaws close.
5. **Both turn a key.** The lift takes the crate down to the galley: **+5 packages**.

**The challenge is timing and trust.** The same presses that deliver can kill:

- **The cut.** Stop 7 is Hana's cab. LOCK while the panel is passing it, and the blade drops into the cab.
- **The drop.** Locked over the platform, the swing carries the crate out over Cleo at the console. Lower while it is there, and it falls on Cleo.

Both are ordinary presses at a dangerous moment, and both can happen by mistake: the panel is fast, and the swing is wide. While a danger lasts, both phones show it: the cab's lamp or the console's lamp flashes, and the presser's own button is striped and says what it would do. Nothing asks to confirm; the press acts.

### Why it changed

The first design that day was a gantry on a grid of steps, with dice accidents near the operators. Having played a timing sketch of this crane, the owner chose it: the Winch's cab right of the platform, "a mechanism of locking system panel, which fast moving to right and left", which "by mistake … cut Hano", and a crate that "has a swinging or pendulum movement", so that not killing the partner "needs attention". The owner said yes to rebuilding the whole Task with it. The dice are gone: mistakes now come from the timing itself.

### Kills, mistakes and the catch

The owner wanted kills by mistake to be possible ("there is chance they kill each other by mistake"). In the crane they come from the timing, with no dice: a lock meant for stop 6 can land on stop 7, and a Lower made a moment too soon can drop the crate on the Panel operator. Each kill takes both participants moving the crane: one locks, the other lowers, or one runs the panel past the other's cab.

Nothing can tell a mistake from a betrayal: not the server, not the phones. The owner decided (12 November 2026):

- **A kill on the Task is not an attack**, because it can be a mistake. It uses no attack opportunity. Nothing limits how often a player kills on Tasks: a betrayer can kill on every Task they join and say it was a mistake, and the owner accepts that.
- **The safety catch sometimes saves by luck: 25%.** Protection always stops a lethal press: the cab's roof buffer catches the blade, or the winch's brake catches the crate (CLANK!). The catch also holds by luck one time in four, by the server's own roll, and looks exactly the same. So a CLANK! never proves that the other player is Protected.

### The crane in numbers

All PROPOSED, for Game Balance to tune:

| | |
| --- | --- |
| The sweep | 220 ms a stop: end to end in 1.32 s, a full lap 2.64 s. A lock takes the nearest stop, so stop 6 is a 0.22 s window as the panel passes it each way. Stop 7 begins half way between 6 and 7, at the end of the rail, where the panel turns back |
| The swing | A lock with the crate hanging starts a swing of 0.9 of a stop each way, in the direction the panel was moving (back off the rail's end at stops 1 and 7). It settles toward 0.38 with a 2.2 s time constant, and never stops. One swing, there and back, takes 1.3 s. A raise ends in a small swing of 0.25 |
| The zones | A falling crate lands where its swing has it. Within 0.3 of a stop of the platform it lands; within 0.42 of the console it falls on the operator; within 0.42 of the intake it goes back in; anywhere else it misses (CLUNK), and the Winch raises it again |
| The danger, in practice | Locked over the platform, the swing is out over the console about a second after the lock, and never again after about 2.3 s. Patience is safe; haste is not |
| Raise, fall | 0.45 s to raise; 0.3 s to fall (the outcome is decided on the press) |
| The time limit | 30 seconds for the whole Task, the briefing inside it (the owner, 12 November 2026): the timer counts down from 0:30 at the Task's start, and the controls work for the last 26 s. A cooperative run takes about 11 s from the start |

![The Supply Room, annotated](../../design/food-supply/review/layout.png)

### The correct position

The confirmed rule: after a partner dies, the survivor completes the delivery alone if the crate is in the correct position, otherwise the Task is lost. **The correct position is over the platform:** the crate on the platform, or still on the hook of the panel locked over it. That gives each operator exactly one way to kill and still deliver:

- **The Winch's:** from the platform stop, a Lower while the swing is over the console. The panel stays locked over the platform, so Hana raises the crate again, lowers it in alone, and turns the Winch's key.
- **The Panel's:** after the landing, while the keys wait. Cleo releases the empty panel, locks it over the cab, and turns the Panel's key alone.

Every other kill loses the Task at once: a cut with the crate still hanging, or a drop with the panel locked anywhere but the platform.

## The phones

Both participants' phones are built on the phone pack's own components (its top bar, pills, toasts, banners, cards and name tags), so the Task reads as part of the same interface. The view is the same crop of the room on both phones. Under it:

- **Cleo, the Panel:**
  - **The sweep strip**: the seven stops, 6 in amber, 7 striped, the console marked as you, and a bar where the panel is now.
  - **One big button**, RELEASE or LOCK. It glows amber when it is the next press: RELEASE, and LOCK only while the panel is passing stop 6. It turns striped and says "Here it cuts Hana" while the panel passes stop 7. Under its label it always says what it would do: "Stops it at 6: the platform", "Stops it over you", "Stops it at 4".
  - **Once landed**, the key comes above it, and RELEASE stays, smaller.
- **Hana, the Winch:**
  - **The swing meter**: the crate's place along the rail from stop 4 to stop 7, the console's band striped, the platform's in amber.
  - **Raise above Lower.** Lower says what it would do now: "Onto the platform" (glowing), "Falls on Cleo" (striped), "Misses: wait", "Back into the hatch".
  - **Once landed**, the key takes their place.
- **Both:** a hint line (40 characters at most) with the next press, a wait or a warning; the timer; the partner's state; and cards for the briefing, a death, and the outcome. After a kill the card waits for the impact to play, so both see the cause first.

![Every state of Cleo's phone](../../design/food-supply/review/phones-panel.png)

![Every state of Hana's phone](../../design/food-supply/review/phones-winch.png)

**Large text.** At 320 × 568 with the game's 200% text:

- The view gives way first, down to a letterboxed strip.
- The hint keeps two lines: on the Winch's phone it is the only place that says the panel is over the cab.
- The meter's legend and the role row go.
- The landed RELEASE becomes small.
- Cards scroll.

Every control is whole and no word is cut; each phone reports its own layout on the sheet.

![The phones at 320 × 568 with the largest text](../../design/food-supply/review/large-text.png)

**Starting and ending** follow the owner's answers (11 and 12 November 2026):

- A Volunteer opens Tasks outside the turn order and asks a Partner, who can join or decline. PROPOSED: 15 s to answer, and no answer declines.
- **A refusal passes to the next volunteer:** anyone else can now start the Task and ask a Partner, and the first to do so goes next. PROPOSED: the refused Volunteer can volunteer again from the next round, and a withdrawn request counts as a refusal.
- **There is no limit of one Task per match.** Instead, the Volunteer and the Partner cannot go for food the next round: their Food Supply row says "You went for food last round", and the partner list marks them. PROPOSED: this holds once the Task starts, whatever its outcome; a refusal starts no Task.
- **The game assigns the controls at random.**
- While the two are away, every board shows their places empty, and a banner names no one.
- Afterwards everyone is back at their places; a participant killed on the Task is Eliminated there, as any death is shown.
- **The other players learn the result only through the food count:** a delivery shows the new count on every phone, naming no Task; nothing else says how it went.
- **Leaving on purpose costs nothing:** it is a disconnect like any other.

![Starting a Task, the other phones, the return and the food warning](../../design/food-supply/review/flow.png)

## Storyboards

Each storyboard is a scripted run of presses played through the design's mechanics model (`design/food-supply/task.mjs`), so every frame shows what the rules give. Each beat shows the room, both phones and a caption; the boards that end in a return show the return. Each also exists as a silent film, at normal motion; cooperation and the drop also with Reduce motion.

| Storyboard | What happens | Sheet | Film |
| --- | --- | --- | --- |
| Cooperation | Raise; release; LOCK as it passes 6; the swing over Cleo, Hana waits; Lower over the platform: landed; two keys: delivered | [board-cooperation](../../design/food-supply/review/board-cooperation.png) | [film](../../design/food-supply/review/film-cooperation.mp4), [reduced](../../design/food-supply/review/film-cooperation-reduced.mp4) |
| The cut | The panel runs past 6 to the cab; Cleo locks it there: CHOP!, lethal, not an attack; the crate hangs at 7: lost | [board-chop](../../design/food-supply/review/board-chop.png) | [film](../../design/food-supply/review/film-chop.mp4) |
| The drop | Locked over the platform; the swing over Cleo; Hana lowers: THUD!, lethal. The panel is still over the platform: Hana raises it again, lowers it in and sends it alone | [board-drop](../../design/food-supply/review/board-drop.png) | [film](../../design/food-supply/review/film-drop.mp4), [reduced](../../design/food-supply/review/film-drop-reduced.mp4) |
| The standoff | Landed; Hana turns the Winch's key; Cleo releases the empty panel instead and cuts; the crate stays clamped; Cleo's key alone sends it | [board-standoff](../../design/food-supply/review/board-standoff.png) | [film](../../design/food-supply/review/film-standoff.mp4) |
| Protection against the cut | The cab's roof buffer catches the blade: CLANK!, STOPPED, the same as the catch's luck; delivered | [board-protection-cut](../../design/food-supply/review/board-protection-cut.png) | [film](../../design/food-supply/review/film-protection-cut.mp4) |
| Protection against the drop | The winch's brake catches the crate: CLANK!, STOPPED, the same as the catch's luck; it swings on; delivered | [board-protection-drop](../../design/food-supply/review/board-protection-drop.png) | [film](../../design/food-supply/review/film-protection-drop.mp4) |
| Mistakes that cost only time | A lock one stop early, over Cleo; released and locked again; a Lower too soon misses (CLUNK); raised again, landed, delivered | [board-mistakes](../../design/food-supply/review/board-mistakes.png) | [film](../../design/food-supply/review/film-mistakes.mp4) |
| Lost: the time runs out | Locked at 3, short of the platform; the 30-second timer (briefing included) runs down | [board-timeout](../../design/food-supply/review/board-timeout.png) | [film](../../design/food-supply/review/film-timeout.mp4) |
| Disconnect | Cleo's phone drops with the panel running; the Task runs on through the grace; cancelled; both return | [board-disconnect](../../design/food-supply/review/board-disconnect.png) | [film](../../design/food-supply/review/film-disconnect.mp4) |

![The drop, beat by beat](../../design/food-supply/review/board-drop.png)

## Artwork

The room is drawn flat and inked by the rooms' own pass (`design/room-pilot/ink-room.mjs`) in a rust family of its own (PROPOSED: deep `#2B1A10`, shadow `#4C2D17`, mid `#82512A`, light `#BC8448`, pale `#E6C590`), with the shared ink and paper and the pack's accent `#F1B84B` for focus. The still picture is exported as [art/supply-room.back.svg](../../design/food-supply/art/supply-room.back.svg). The moving parts are drawn per pose in the crew's ink by `design/food-supply/machine.mjs`:

- **The locking panel:** the carriage, its drum, and a hazard-striped shutter blade that drops when it locks.
- **The cab:** the roof slot the blade comes through at stop 7, the roof buffer that Protection throws across, the warning lamp and the key.
- **The console:** its stop lights, the lock lever and the key.
- **The platform:** its jaws and lamp; it goes down through the deck when sent.
- **The painted stops**, 1 to 7, on the rail.

The operators are the crew rig's figures: Cleo standing at the console, Hana seated in the cab. Down, each slumps over their own controls, as the board draws an Eliminated figure, with no wound and no mark.

![The crane's parts and their states](../../design/food-supply/review/machine.png)

Layer order, back to front: the room; the festoon cable; the platform; the cab's back; Hana, kept inside the cab; the cab's front; Cleo; the console; the stop plates; the locking panel; the cable and hook; the drop line; the crate; the platform's jaws; the effects; the name tags.

## Motion

![Each cue and its Reduce motion form](../../design/food-supply/review/motion.png)

All timings PROPOSED. **Presentation only:** a cue never delays a press, and a new authoritative state always replaces a cue still playing.

| Cue | Normal | Reduce motion |
| --- | --- | --- |
| The sweep | 220 ms a stop, speed lines, the crate leaning back | The panel moves exactly the same (its place is the game); no speed lines, no lean |
| The swing | The pendulum: the crate on its cable, tilting and rising at the ends | The same place along the rail, upright and level |
| Release, lock | The blade lifts (90 ms) or slams down (90 ms) with a clunk | At once; a clunk mark for 400 ms |
| Raise | 450 ms, ease in-out: the crate slides under the hook and rises | At its hanging height at once |
| Lower | 300 ms, ease in, straight down from where the swing had it | Where it falls, at once |
| Land | The jaws close (140 ms), the lamp lights; the empty hook rises (300 ms) | At once |
| Miss | CLUNK, a small bounce (220 ms) | CLUNK still for 600 ms |
| The cut | The blade drives into the cab (120 ms), CHOP! | The blade in the cab at once; CHOP! still |
| The drop | The crate falls on the operator (180 ms), THUD! | The crate on the console at once; THUD! still |
| Stopped (Protection, or the catch's luck) | The roof buffer or the winch's brake (320 ms), CLANK! | Shown thrown, still, with CLANK! for 600 ms |
| Impact | The burst grows (900 ms) | Still for 900 ms |
| Key | 140 ms | At once |
| Send | The platform goes down (1100 ms), +5 | Gone at once; +5 still |
| Warning lamps | Flash, 330 ms on, 330 ms off | Lit steadily |
| Dim (lost, cancelled) | 600 ms | At once |

The sweep and the swing cannot be taken away: they are the Task. Reduce motion takes away everything else that moves. The warning lamps flash 1.5 times a second, well under three. Nothing shakes.

## For Frontend

- **The view:** one SVG scene per moment (`sceneSvg` in `design/food-supply/scene.mjs` is the reference), cropped to `[16, 40, 992, 696]` of the 1024 × 768 picture, in a box that keeps its aspect and letterboxes when the panel needs the height. The name tags are the pack's `.tag`, placed from `tags` in the handoff; Hana's ends at the cab's right edge.
- **Draw from time, not from frames:** the panel's place is `sweep(from, dir, t − since)` and the crate's is `swingOffset(swing, t)`. Both phones animate locally from the shared state on the server's clock; the formulas are in the handoff's `mechanics`.
- **The panel** is a column under the view: hint, then the instrument and the controls docked together at the bottom. The phone CSS (`design/food-supply/phone.css`) is the specification: the view gives way first, down to 112 px (84 px on the narrowest phones at the largest text); only the hint may scroll.
- **Controls:**
  - One tap, one act; no hold, drag or gesture.
  - Send the act the button showed, with the moment of the press on the server's clock (PROPOSED `TASK_PRESS`, below). A double tap on LOCK must not release the panel.
  - Keyboard: Space for RELEASE and LOCK, the arrow keys for Raise and Lower, Enter for the key.
- **States to draw**, from the projection: the buttons (`act`, `enabled`, `next`, `hazard`, `zone`, `stop`, `turned`), `panel`, `crate`, `zone`, `warnings`, `keys`, `you`, `partner`, `secondsLeft`, `briefingLeft`, `outcome`. The phone sheets show each.
- **Never show** Protection, the catch's roll, a reason for a stop, or whether a kill was meant. "Stopped" is the same words whichever caused it.
- **Outside the Task:** the Tasks sheet and the partner list mark the two who went for food last round. After the Task, the other players' phones show the new food count on a delivery and nothing else; only the participants' own toasts name the result.
- **Accessibility:**
  - Each button's name says what it would do now ("Lower. Warning: falls on Cleo.").
  - The view has a text equivalent: where the panel and the crate are, and whether a warning shows.
  - The hint is a polite live region that changes only with what to do; the strip and the meter repeat what the view and the buttons say.
  - Large text and Reduce motion as above.
  - A Task of timing cannot be made fully equal without sight or quick hands: see the open item on timing access.

## For Backend

The design's mechanics model, `design/food-supply/task.mjs`, is a reference, not the engine: Backend implements the rules; this fixes the geometry, the timing and the cause and effect so the phones, the storyboards and the tests agree.

- **State** (`state` in the handoff): phase, seats, the panel (locked at a stop, or running from a stop in a direction since a time), the crate (where it lies, or hanging), the swing, keys, alive, online, the deadline and the outcome, all seen by both participants. Protection and the time of the last change are held by the server only.
- **Start:** no attack opportunity comes into the Task: a kill on the Task is not an attack (the owner, 12 November). Protection is read as the existing rules decide, at the moment of the press.
- **One press** (`act`): either refused, or one of RAISED, RELEASED, LOCKED, LOWERED, LANDED, MISSED, STOPPED, KILLED, KEY, SENT and ENDED.
  - Refusals: briefing, ended, down, not your control, late, stale, busy, crate down, unlocked, locked, up, landed, not landed, turned.
  - After a KILLED, the Task is lost unless the crate is in the correct position.
  - The events and their visibility are listed in the handoff (`events`).
- **Lethal presses:** a LOCK that takes stop 7 (the cut), or a Lower whose landing is the console (the drop). Each is stopped if the partner is Protected, or by luck: the server rolls its own random number for the press, and below 0.25 the catch holds (the owner). Otherwise it kills. Either way it uses nothing, and the roll never reaches a phone.
- **Press timing (PROPOSED):** a press counts at the moment its phone showed, `at` on the server's clock, if it arrives within 300 ms and nothing has changed since; otherwise it is refused (late or stale), and the phone shows the present.
  - What you saw is what you get, within the allowance: a LOCK made over stop 6 that arrives when the panel is already over the cab still stops at 6.
  - A modified phone could choose its moment inside the allowance; Backend may shorten it.
  - The deadline is judged on arrival.
- **Clock:** the briefing's end, the deadline (lost: time), the grace (cancelled: disconnect).
- **Connection:** out of contact, the Task runs on through the grace (PROPOSED 8 s) and the panel keeps running; back in time, nothing paused; out longer, cancelled. A death that resolved first stands. A phone out of contact shows its controls off.
- **Command:** `TASK_PRESS { taskId, act, at }`, a proposal for the shared contract (Integration owns `packages/contracts/`). The answer is the new state with its events to both participants; a refusal goes to the presser only.
- **Asking a Partner**, proposals around the owner's decisions (a Partner can decline; a refusal passes to the next volunteer):
  - From the Volunteer: `TASK_ASK { kind, partner }`, and `TASK_ASK_WITHDRAW { askId }`.
  - From the asked player: `TASK_ANSWER { askId, join }`, within the answer time.
  - Events: `TASK_ASKED` to the asked player, `TASK_DECLINED` to the Volunteer (a decline or no answer), `TASK_STARTED` to both.
  - `TASK_ASK` is refused for anyone who went for food last round, as the Volunteer or the Partner (the owner), and for a Volunteer refused this round (PROPOSED).
  - On `TASK_STARTED` the server assigns the controls at random (the owner) and records the two for the next-round rule. No Task count is kept.

## For Game Balance

- **The two kill-and-deliver paths** (conflict 2): the Winch's drop from the platform stop, which can pass as a mistake, against the Panel's cut in the standoff, which cannot. Is either more tempting? The server assigns the controls at random (the owner, 12 November 2026).
- **The timing:** the sweep (220 ms a stop), the swing (0.9, settling to 0.38, 2.2 s, 1.3 s), the zones (0.3 and 0.42), and the presses' 300 ms allowance. Faster or wider means more mistakes, and more cover for betrayal. A cooperative run takes about 11 seconds from the start; the owner set the whole Task's time at 30 seconds, the briefing inside it.
- **Mistakes:** each costs time (a lock in the wrong place, a miss) or a life (a lock at 7, a Lower over the console). A kill is not an attack and costs its presser nothing (the owner); the catch saves one in four.
- **The food economy:** five packages, five per delivery, one dose per player at each Eating step. There is no limit on Tasks per match, but the two who went for food cannot go the next round (the owner). How often Eating comes decides whether Tasks can keep up; with the stock short, the Eating order decides who goes to the Hospital.

## Visibility

| Who | Sees |
| --- | --- |
| The two participants | The whole Supply Room: the panel running or locked, the swing, every press's effect, both warnings, both keys, the time, each other's alive or offline state, and a STOPPED alike with no reason. Never an attack opportunity, Protection, the other's refused presses, or whether a kill was meant |
| Every other player | Never the Supply Room. Who is away, from the board: the two places are empty (the owner's decision); the banner names no one. The result only through the food count, never how it went (the owner's decision). PROPOSED: not who was asked, or who declined |
| A death | Shown on the return as any death: Eliminated at the participant's previous place. No phone says who, how, or that the Task did it |
| Protection | Never shown. A stop is the same CLANK! whether Protection or the catch's luck (1 in 4) caused it, so it proves nothing |
| Mistakes | Both participants see a lethal press as it happens (CHOP!, THUD!); neither phone says whether it was meant. Everyone else sees only the death, with no cause |
| The food stock | Public: the count, so a delivery shows as five more (the owner's decision); the ship-life food capsules show it. PROPOSED: every phone shows the new count when it changes, and the warning at one package |
| Only the server | Protection, the catch's roll, and why a STOPPED happened |

## Acceptance scenarios

Thirty-seven scenarios, each a start, a list of presses and what must follow, in the handoff (`acceptance`) and in `design/food-supply/scenarios.mjs`. The design's tests play every one through the mechanics model. The nine storyboards are the first nine. The edge cases:

| Scenario | Given and done | Then |
| --- | --- | --- |
| briefing-refused | A Raise during the briefing | Refused (briefing) |
| not-your-control | The Winch presses LOCK | Refused (not your control) |
| release-needs-the-crate-up | RELEASE with the crate in the intake | Refused (crate down) |
| busy-while-raising | RELEASE while the crate is still rising | Refused (busy) |
| lower-needs-the-lock | Lower while the panel runs | Refused (unlocked) |
| lock-twice | A second LOCK on a locked panel | Refused (locked); the panel stays at 6 |
| lock-rounds-to-the-platform | LOCK just short of half way between 6 and 7 | Locked at 6 |
| lock-rounds-to-the-cab | LOCK at half way between 6 and 7 | Locked at 7: the cut; lost |
| press-counts-as-shown | A LOCK made over 6 arrives 250 ms later, when the panel is over the cab | Locked at 6 (PROPOSED) |
| late-press | A LOCK arrives 400 ms after it was made | Refused (late) |
| stale-press | A Lower made before a release arrives after it | Refused (stale) |
| drop-from-the-console-stop | Locked over the console; lowered at once | The drop; not in position: lost |
| lucky-catch-cut | Hana not Protected; LOCK at 7 with the server's roll under 1 in 4 | STOPPED by luck; both alive |
| lucky-catch-drop | Cleo not Protected; Lower over the console, the roll under 1 in 4 | STOPPED by luck; the crate swings on |
| luck-runs-out | LOCK at 7 with a roll of 1 in 4 | The catch does not hold: the cut; lost |
| blocked-twice | Cleo Protected; two Lowers over the console, high rolls | Two STOPPEDs: Protection holds whatever the roll |
| back-into-the-intake | Raised and lowered at once over the intake | MISSED into the intake |
| landed-winch-idle | Raise after the landing | Refused (landed) |
| key-before-landing | A key before the landing | Refused (not landed) |
| key-twice | A key turned twice | Refused (turned) |
| keys-stay-turned | Hana's key; Cleo releases and locks again short of the cab; Cleo's key | Delivered by both (PROPOSED) |
| cut-after-own-key | Cleo's key first, then release and cut | Delivered alone at once |
| reconnect-in-grace | Cleo offline for less than the grace | The Task goes on |
| death-stands-in-grace | Cleo offline; the drop lands | Hana finishes alone: delivered |
| offline-victim-cut | Hana offline after the landing; the cut | Cleo sends alone: delivered |
| dead-cannot-press | Cleo dead; Cleo's RELEASE | Refused (down) |
| survivor-out-of-time | After the drop, Hana never lowers it in | Lost: time |
| cancel-without-death | Hana offline for the whole grace | Cancelled; both alive |

## Genuine rule conflicts

Five tensions inside the owner's decisions, each with a solution that stays inside them. The owner has decided what four of them left open (1, 3, 4 and 5); conflict 2 waits for Game Balance and the owner.

1. **No escape, and a disconnect cancels.**
   - The conflict: if a disconnect cancelled at once, switching off the network would escape an attack.
   - **Solution:** the server judges a disconnect only after a grace (PROPOSED 8 s). In the grace the Task runs on, the panel keeps running, and a cut or a drop resolves; a death before the cancellation stands.
   - *Settled:* a participant can still end a Task they dislike by staying offline, and the owner decided that this costs nothing (12 November 2026). The grace's length is in the timing open item.
2. **Both can betray, and a survivor completes only from the correct position.**
   - The conflict: a betrayal that also takes the crate away from the platform can never deliver, so the rules can make the two betrayals unequal. The gantry let only one operator kill and still deliver.
   - **Solution:** the crane gives each operator exactly one way to kill and still deliver: the Winch's drop from the platform stop, the Panel's cut in the standoff. The server assigns the controls at random (the owner, 12 November 2026).
   - *Left open:* whether the two paths are equally tempting, for Game Balance and the owner.
3. **Protection applies, and Protection is not disclosed.**
   - The conflict: a stopped kill is something both participants see. With a kill on the Task not an attack, nothing else could stop one, so every CLANK! would have meant Protection.
   - **Solution, the owner's (12 November 2026):** the catch also holds by luck one time in four. A CLANK! is the same for Protection and for luck, with no reason on either phone, and no one else learns anything.
   - *Settled.* A presser stopped again and again on the same partner may still suspect Protection; the owner had already accepted that inference.
4. **No automatic attribution, and the return shows the dead.**
   - The conflict: with two participants, the survivor is the only possible killer to anyone who knows who went.
   - **Solution:** no phone states a killer, a cause or a Task death.
   - *Settled:* the owner decided that other players can see on the board who is away, so after a death everyone can work out the survivor. That is accepted, and nothing states it; and since mistakes happen, the survivor can always say it was one.
5. **Kills by mistake, and one attack per match.**
   - The conflict: nothing can tell a mistake from an attack. If a Task kill were an attack, an honest mistake would spend it; if not, the one-attack rule cannot limit kills on Tasks.
   - **Solution, the owner's (12 November 2026):** a kill on the Task is not an attack, and nothing limits how often a player kills on Tasks.
   - *Settled.*

## Open items

| Item | For |
| --- | --- |
| Whether one dose is one package (PROPOSED: yes) | The owner |
| The next-round rule's edges. PROPOSED: it holds once a Task starts, whether it delivers, is lost or is cancelled; a refusal starts no Task, so it does not count; it covers the Food Supply Task only | The owner |
| After a refusal. PROPOSED: the refused Volunteer can volunteer again from the next round; no answer, or a withdrawn request, counts as a refusal; the first to ask a Partner goes next | The owner |
| The Partner request (that a Partner can decline, and that last round's two cannot go, are decided). PROPOSED: who else can be asked (living, outside the Hospital and the Jail, not on a Task), and 15 s to answer (no answer declines) | The owner |
| When a Task may start, how many Food Supply Tasks a round may have, and whether two may run at once | The owner, Backend |
| The timing: the sweep, the swing, the zones, the raise and the fall, the 8 s grace, the 4 s briefing (the 30 s deadline is the owner's) | Game Balance |
| The two kill-and-deliver paths, and the food economy | Game Balance |
| The Eating step's place and order | The owner, Game Balance |
| Press timing: the clock sync and the 300 ms allowance (PROPOSED) | Backend, Integration |
| Timing access: whether a player who cannot react in time can ask for a slower panel or a calmer swing, which changes the danger for their partner too. Nothing is proposed | The owner, Game Balance |
| `TASK_PRESS`, the Task projection and the ruleset version that adopts this Task | Integration |
| The Engine Task (not designed here) | The owner |

## Review files

| File | What it is |
| --- | --- |
| [review/layout.png](../../design/food-supply/review/layout.png) | The room annotated: stops, zones, the swing, the sweep, the cut, callouts |
| `review/board-<id>.png` (9) | Each storyboard, beat by beat, with both phones and the return |
| [review/phones-winch.png](../../design/food-supply/review/phones-winch.png), [review/phones-panel.png](../../design/food-supply/review/phones-panel.png) | Every state of each participant's phone (18 each) |
| [review/flow.png](../../design/food-supply/review/flow.png) | Starting a Task, the Partner, a refusal, the other phones, the return, the food warning, the next round (14 phones) |
| [review/machine.png](../../design/food-supply/review/machine.png) | The crane's parts and their states |
| [review/motion.png](../../design/food-supply/review/motion.png) | Each cue's frames and its Reduce motion form |
| [review/large-text.png](../../design/food-supply/review/large-text.png) | 320 × 568 at 200% text, each phone's measured layout |
| `review/film-<id>.mp4` (11) | The storyboards as silent films; cooperation and the drop also with Reduce motion |
| [review/renders.json](../../design/food-supply/review/renders.json) | Each file's SHA-256 and the browser |

To regenerate:

- `node design/tools/food-supply-export.mjs`: the art and the handoff (`--check` compares).
- `node design/tools/food-supply-render.mjs --sheets --films`: needs Chromium and ffmpeg.

The pages themselves are `design/food-supply/review.html`, `phone.html` and `film.html`. `phone.html` takes `?s=task&board=drop&t=7675&as=winch` (or `as=panel`), `&text=2`, `&motion=reduced` and `&live=1`.

**Limits:**

- Rendered in desktop headless Chromium at each page's CSS size: not a phone, not a real network, not a playtest. The films are silent.
- The mechanics model and the scenarios show the design is consistent. They do not show that the Task is fun, fair or balanced with real people, or that its timing suits a real network, and they are not the engine.
