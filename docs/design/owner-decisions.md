# Owner decisions recorded by Designer

What the game owner decided about look, feel and presentation while working with the Visual and Motion Designer, in the owner's own words, with what each decision covers and what it leaves open.

`AGENTS.md` puts the owner's latest explicit decisions recorded in the repository first among the rule sources. This page is where Designer records the ones it was given. It does not replace the decision register, [docs/decisions.md](../decisions.md), which is Codex's and is source-locked. Designer has not edited it: [DSN-REQ-7](integration-requests.md#dsn-req-7) asks for a newer decision record that points here.

The owner's messages are quoted as written.

## 6 November 2026: fewer words

**The owner found the film's text too much, like a tutorial, and asked for less of it.**

The owner wrote:

> Lets reduce texts in animation it is like tutorial

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "reduce texts in animation" | Only the two memory panels keep a narration box, of a few words each (for the Doctor, "Colony Nine. The fever years." and "Two doses left."). The panel aboard and the title carry no line |
| 2 | "it is like tutorial" | The film names no role and spells out no rule in words. The pictures show what the role does, and the rules stay on the role card |

### What the Designer did with it

- **The narration.** Every role's narration is cut to two short lines (`design/cinematic/pilots/role-reveal/copy.mjs`), and the storyboards match.
- **The lettering.** Each box is lettered as a comic's caption, a sentence to a line ("COLONY NINE." over "THE FEVER YEARS."), and fitted to its words on every phone, so no line wraps by accident.
- **Tests.** A test holds every line to a few words, naming no role, and holds the panel aboard and the title wordless.
- **Unchanged.** The role is still announced in page text for screen readers at the title. The sound words (DRIP, BEEP) stay, as comic sound effects.

## 6 November 2026: an animated comic's finish

**The owner liked the back story and asked for better quality, like an animated comic book.**

The owner wrote:

> I like it just can we make it better quality like animated comicbook

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "I like it" | The back story, its narration and the ten-second clock stay |
| 2 | "better quality like animated comicbook" | The film is finished as a motion comic: a memory flash out of the gadget's glint, a guided camera panel by panel with a pull-back to the page, comic capitals for the narration, bold ink outlines, cross-hatched panel edges, paper grain, breathing and swaying figures, and review renders at twice the phone's pixels |

### What the Designer did with it

- **Shared by every role:** the flash, the camera and the panels' focus, the inking and the print. They are all timed by the shared clock, so they tell a neighbour nothing.
- **Reduced motion** keeps its three stills, with none of the movement.
- **Tests and renders.** A test covers the flash, the camera, the focus and the print. The three review renders are re-made at 2× and CRF 18.

### What it does not settle

- **Phones.** The renders are desktop Chromium. The filters' cost on a low-end phone is Frontend's to measure.
- **The other eight films** stay storyboards until the owner reviews this pilot.

## 6 November 2026: a back story for every role

**The owner liked the relit pilot much better and asked for a story, then said what kind: a small back story, as a comic book gives each of its characters one, not necessarily the game's own story aboard the spaceship.**

The owner wrote:

> I like it much better but can we have a little bit storyline feeling

> sory to intrupt you but story can be little back story maybe it is not really the story of the game in spaceship imagine it like a comic =book each character has a back story

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "a little bit storyline feeling" | The three panels read as one story, told by a narration box on each panel |
| 2 | "story can be little back story maybe it is not really the story of the game in spaceship" | The first two panels look back at who the role-holder was before the voyage. They are memory, drawn in sepia, and are fiction around the role. The third comes aboard, now, to what the role does |
| 3 | "imagine it like a comic book each character has a back story" | Every role gets its own back story (`role-reveal.md`, section 3). It is told to "you", so it fits whichever crew character the player is, and that character is the protagonist wherever a figure is in colour |

### What the Designer did with it

- **The Doctor's back story.** "Colony Nine, the fever years": the player's own character at the foot of a cot in a field ward. "When the medicine ran out, you kept two doses": a medicine case with every slot empty but two. "Aboard, your number is the Hospital panel's code": the Mothership's Hospital, the keypad lighting the player's number. Under the title: "Two doses for the whole voyage. Who you tell your number is up to you."
- **The other eight.** Their back stories and narration are written as proposals (`design/cinematic/pilots/role-reveal/copy.mjs`; storyboards in `role-reveal.md`).
- **Ten seconds.** Every film is now ten seconds, the top of the owner's five to ten, to give the narration time to be read. It is still the same for every role.
- **Unchanged.** The words stay page text, every colour of the sepia panels is checked as the filter draws it, and reduced motion keeps three stills.

### What it does not settle

- **"Character".** Designer reads it as each role (the Doctor, the Insider…), because the film is the role's. A back story for each of the nine crew characters (Vega, Rigel…) would be another piece of work, and the owner can ask for it.
- **The words** are proposals; the game's copy is Frontend's. The places and names in the back stories (Colony Nine, Vesta Station, Ceres…) are fiction, not rules.
- **The other eight films** stay storyboards until the owner reviews this pilot.

## 6 November 2026: the pilot's card, light and finish

**The owner reviewed the nine-second Doctor pilot and asked for three changes: the card on the desk must match the real role card, the patient and the medical equipment must be brighter, and the whole film should look like a high-end animated noir comic.**

The owner wrote:

> Rotation Doctor on the card is not good and not match with the card. Also Artistically, I would also brighten the patient and medical equipment slightly: the silhouettes blend into the dark backgrounds, especially once three panels share the screen. Make it more like Animation comic book Noir AAA style

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "Rotation Doctor on the card is not good and not match with the card" | The card on the desk is now the player's own role card, drawn as the phone draws it: their portrait, the role's held device, and the name and team line set flat in its plate. It stands straight in a holder. The only turn on it is the portrait's own −2.5°, as on the phone's card, and a test holds that |
| 2 | "brighten the patient and medical equipment slightly: the silhouettes blend into the dark backgrounds, especially once three panels share the screen" | The patient is a navy silhouette with a paper rim light and a pool of light on the wall behind. The berth, monitor, keypad and injector use the lit token steels with bevel highlights. Screens glow and cast their light, things stand on contact shadows, and the panels' walls are lifted |
| 3 | "Make it more like Animation comic book Noir AAA style" | The film is shot as an animated comic. Each panel has three depth layers under a slow push, and the opener has two (2.5D). Light falls in volumetric beams with dust turning in it, panels land with impact lines, and a sheen crosses the title plate. The character leans in to take the gadget and looks at it as it rises |

### What the Designer did with it

- **The card** (`design/cinematic/pilots/role-reveal/briefing.mjs`) uses the phone card's own pieces and proportions: the crew portraits (`piece-crew.card-c1` to `c9`) and the held devices. Every phone now ships all nine portraits as well.
- **The light** is in the Doctor's panels (`doctor.mjs`) and the shared art (`art.mjs`). The palette test still holds every colour drawn at least 30 from the faction accents. The card's small team swatch is the one exception, as on the phone's card.
- **Reduced motion** keeps its three stills, with no dust, impact lines or sheen.
- **The renders.** The three review renders are re-made.

### What it does not settle

- **"AAA"** is a direction, not a measured bar. The renders are desktop Chromium frames, not a phone.
- **The other eight films** stay storyboards until the owner reviews this pilot.

## 6 November 2026: the role film opens as the player takes the role

**The owner reviewed the Doctor's seven-second pilot and asked for a first part that shows the player becoming the Doctor: before boarding the spaceship, the character takes the Hospital gadget from a table where the Doctor card lies, and then sees the three panels.**

The owner wrote:

> ویدیو دکتر ۷ ثانیه ایت خیلی خوبه برای توضیح نقش اما بنظرم یک تیکه اول می خوایم که نشون بده یارو دکتر شده شاید مانند اینکه character قبل سوار شدن به spaceship , gadget hospital  رو‌بر‌ میداره  از روی یک میز که روی میز کارت Doctor هست بعد اش این ۳ پنل رو‌ببینه که ساختی

("Your seven-second Doctor video is very good for explaining the role, but I think we want a first part that shows the guy has become the Doctor: maybe like the character, before boarding the spaceship, picks up the Hospital gadget from a table with the Doctor card on it, and after that sees these three panels you made.")

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "very good for explaining the role" | The three panels, the title and the two captions stay as they were |
| 2 | "a first part that shows the guy has become the Doctor" | Every film opens on the moment the role is taken. The opener and its timing are the same for every role, so every film grows by the same amount |
| 3 | "before boarding the spaceship", "picks up the Hospital gadget from a table with the Doctor card on it" | The briefing room at the dock, the night before the voyage. The Mothership waits beyond the viewport and the role card lies face up under a desk lamp. The player's own character takes the role's gadget from the desk and raises it into the light. The Doctor's gadget is the injector its role card draws, which holds the Hospital's two doses |
| 4 | "after that sees these three panels" | The panels follow at 3 s. Every film is now 9 s long, the same for every role and inside the owner's five to ten seconds |

### What the Designer did with it

- **One opener for all nine roles** (`design/cinematic/pilots/role-reveal/briefing.mjs`). Only the card's name and picture and the gadget belong to the role. A test holds the room, the light, the character and the camera identical for every role.
- **The player's own character.** The figure is the player's lobby character and the only one drawn in colour. The review renders use c4 as a stand-in.
- **No team colour on the gadget.** The role card draws each device in its team's colour. The gadget in the opener is drawn large, so instead it catches the room's starlight, the same for every role. A team's colour stays small: on the card on the desk and on the title plate's emblem.
- **Timing and handoff.** The three review renders are re-made at 9 s. The timing and the Frontend notes are in [docs/design/cinematic/role-reveal.md](cinematic/role-reveal.md).

### What it does not settle

- **"Hospital gadget".** Designer reads this as the Doctor's own device, the injector on its role card. The Hospital panel's keypad stays in panel 3.
- **The other eight films** stay storyboards until the owner reviews this pilot. Each will open the same way, with its own gadget (`role-reveal.md`, section 2).
- **Phones.** The pilot has been rendered in desktop Chromium only.

## 6 November 2026: a film for every role

**A request, then an approval and a creative brief: after seeing their role, each player sees a short film for that role, of five to ten seconds. The Designer proposed a fixed seven seconds for every role, shared privacy rules and one pilot (the Doctor) first; the owner agreed and set the direction.**

The owner wrote:

> می خوام بازیکن ها بعد از دیدن نقش شون یک animation کوتاه ببین پس کلا به ازای هر role یک animation 5 to 10 ثانیه ای . نظرت برای هر Role چیه

("I want players to see a short animation after seeing their role, so one animation of 5 to 10 seconds for each role. What is your idea for each role?")

After the Designer's proposal (the same length, sound and palette for every role, own phone only, a pilot first):

> یا کل طرح و ایده ات موافقم فقط دوست دارم ازتباط انیمشن هر نقش با نقش و کارایی اش و فضای space و sci fi بازی و روح نوآر کمیک بوک هماهگ باشه و به داستان بتزی و محتوا بخوره

("I agree with your whole plan and idea. I only want each role's animation to match the role and what it does, the game's space and sci-fi setting and the noir comic-book spirit, and to fit the game's story and content.")

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | "one animation of 5 to 10 seconds for each role" | A film per role after the role card, inside the role-reading stage. The Designer's plan makes every film exactly 7 s with the same beats, so no length or rhythm tells a neighbour anything |
| 2 | "I agree with your whole plan and idea" | The shared rules: own phone only, silent, one palette and brightness, every film shipped to every phone, a tap skips, never replayed on a reconnect, a reduced-motion form; the Doctor's pilot before the other eight |
| 3 | each film matches "the role and what it does", "space and sci-fi", "the noir comic-book spirit" and "the game's story and content" | Every film is a page of the ship's crew file in a space-noir comic: the role's own device in the light of a viewport's slats, three panels of what the role does in the ship's own rooms, the role's name stamped on the file |

### What the Designer did with it

The storyboards for all nine roles and the Doctor's pilot are on the branch `claude/designer-role-reveal`, stacked on #184 ([docs/design/cinematic/role-reveal.md](cinematic/role-reveal.md); `design/cinematic/pilots/role-reveal/`).

After reviewing the pilot, the owner asked for an opener (the entry above). Every film has been nine seconds since then.

### What it does not settle

- **The other eight films** are storyboards until the owner reviews the Doctor's pilot on a phone.
- **The words** are proposals; the game's copy is Frontend's.
- **Phones.** The pilot has been rendered in desktop Chromium only.

## 6 November 2026: the Blackhole's stage, the route window and seven corrections

**Two timing decisions, P27 and P28, and seven focused corrections, given to the Designer with the latest reviewed Designer head (`ff7b689`, PR [Amirkianfar66/GameN#183](https://github.com/Amirkianfar66/GameN/pull/183)). The owner marked the timing decisions as not to be reopened.**

The owner wrote:

> CONFIRMED TIMING — do not reopen these decisions:
>
> • R1 / P27: after actual Blackhole Sync, there is a separate six-second presentation stage. The full 60-second Jail vote starts afterward. Update the catalogue, handoff and presentation guards that still call R1 undecided.
>
> • R10 / P28: from Round 2, every navigation opportunity has the same full 15-second route-setting window. Only the eligible Officer receives controls for a genuine tie. Early selection cannot shorten the window. Public wording, animation, sound and timing must not reveal whether a tie occurred.

> FOCUSED CORRECTIONS:
>
> • Windows remain lit during Blackout's first five seconds; darkness begins at the authoritative preview deadline.
> • Restored weapons after Blackhole Sync must not be presented as a new Supply delivery.
> • Keypads display player numbers but preserve canonical player IDs for Frontend commands.
> • Rescue animation must leave the player's current authoritative figure and interaction target usable. A healed free player returns to A/B; a healed detained player returns to Jail.
> • Capsule exit remains on the board. Do not add an unapproved covering EJECT stage.
> • Your giver-only "Meet in A/B" Promise wording is correct. Keep it; Backend and Frontend are correcting their mismatch.

| # | What it says | What it decides |
| --- | --- | --- |
| P27 | "a separate six-second presentation stage" after an actual Blackhole Sync | R1 is answered. The Blackhole's 5.2 s stage cut plays on the display in that stage, and the phones play the board treatment from the stage's start. The full 60-second Jail vote follows; no film plays into it |
| P28 | "the same full 15-second route-setting window" at every navigation opportunity from Round 2 | R10 is answered. The route-setting window runs every round, tie or not. Only the eligible Officer sees tie controls, an early choice does not end the window, and every other screen reads the same throughout |
| 1 | windows "lit during Blackout's first five seconds" | A window darkens at `blackout.previewEndsAt`, not at the Blackout's start |
| 2 | "Restored weapons after Blackhole Sync must not be presented as a new Supply delivery" | The Supply receipt needs an explicit delivery marker; a count that grows without one is drawn at rest |
| 3 | "Keypads display player numbers but preserve canonical player IDs" | Every key and target keeps its `seat-N` id for the command and shows N |
| 4 | the Rescue leaves "the player's current authoritative figure and interaction target usable" | The board's own figure is never hidden, greyed or moved during the Rescue |
| 5 | "Capsule exit remains on the board. Do not add an unapproved covering EJECT stage" | S2's exit on the board stands. S7 on the board is the only runtime EJECT; the display cut is a review study |
| 6 | the giver-only "Meet in A/B" wording "is correct. Keep it" | R13(b) is answered: a meeting Promise is the giver's place alone |

### What the Designer did with it

The corrections are on the branch `claude/designer-owner-corrections`, stacked on #183, with a handoff for Frontend in [frontend-corrections-2026-11-06.md](frontend-corrections-2026-11-06.md).

- **The presentation guard** (`design/cinematic/lib/visibility.mjs`): `PRESENTATION_STAGES` holds P27's stage for the Blackhole alone, and `NO_RUNTIME_COVER` keeps the EJECT on the board in every phase.
- **The motion bible** (`cinematic-catalogue-0.11.0`): R1 and R10 answered, R13(b) answered, and two new requests for Backend, R15 and R16.
- **The library:** the windows' dark span, the Supply receipt's marker, the route window, and canonical seat ids in the keypads and seat pickers of groups 1, 3, 4, 6 and 7 (`design/library/seats.mjs`).
- **Pilot 1:** the Rescue's board treatment leaves the patient's figure as the board draws it; its eight board-treatment renders are redone.

### What it does not settle

- **The stage's phase kind** (R16). The protocol 3 candidate has no phase for P27's stage. Until a view carries one, the Blackhole plays behind the crew at the Jail vote's start, covering nothing.
- **The Supply's marker** (R15). The candidate has no event or field that says a weapon was delivered. Until it does, no receipt is drawn.
- **The route window's name.** The candidate calls it `NAV_TIE`. Since it now runs every round the name no longer means a tie; Backend may rename it.
- **Phones.** None of this has been tried on a real phone.

## 13 October 2026: the fixed slots, the ward and the smallest phone

**A go-ahead and an approval, recorded: artwork for the owner's motion specification starts with the board's fixed slots and a Hospital ward, and the smallest phone gets a more compact shell rather than smaller targets or a scrolling board.**

The owner's motion specification of 13 October 2026 reached the Designer through the coordinator's creative brief, for review and planning only. The Designer's review proposed starting artwork with the fixed slots and a 7, 8 or 9-berth Hospital ward, as new files beside the reviewed ones, and asked the owner to say "start". The owner answered:

> start it then

The first step was built as draft PR [Amirkianfar66/GameN#128](https://github.com/Amirkianfar66/GameN/pull/128). The Designer's status message then asked the owner to pick two things:

- **A fix for the smallest phone:** "The board needs 22 px more height than the top bar and navigation leave it. I recommend making those slightly more compact on short phones, so every tap target stays 44 px."
- **The next step:** "the Hospital patient states (heartbeat monitors, rescue-deadline badge, detention tag, rescue drone, flatline) or the Blackout's lights-out window."

The owner answered:

> go as your recommendations

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “start it then” | Artwork starts. The first step is the fixed slots and the ward, as new files (PR #128) |
| 2 | “go as your recommendations”, on the smallest phone | A more compact top bar and navigation on short phones, so that the board fits at 320 × 568 with every target at 44 px. Not 40 px targets, and not a scrolling board |
| 3 | “go as your recommendations”, on the next step | The status message did not recommend either step. The Designer follows its review's production plan, which starts with the Blackout's lights-out window and position numbers (storyboard S1); the Hospital's states come after it |

### What the Designer did with it

**The compact shell** is in `design/board-v2/js/fit.mjs`, for phones whose visible viewport is up to 600 px tall:

| Part | Short phone | Compact |
| --- | --- | --- |
| Top bar | 44 px | 36 px |
| Navigation | 56 px | 48 px |
| Board padding above and below | 5 px | 2 px |
| Raised Pass | 58 px, rising 13 px | 52 px, rising 8 px |

- **Where the sizes come from:** the example in the handoff's option 1. The owner approved the approach as the status message put it, not these sizes.
- **One departure from that example:** the board keeps 5 px of padding at the sides. With 2 px there, Rooms A and B would be wider and 2 px taller.
- **The result:**
  - The board fits 320 × 568 with no height to spare.
  - Every slot is a whole 44 px press area, clear of the Pass, at eight phone sizes (checked).
- **Frontend's instructions:** [board-v2-slots.md](board-v2-slots.md#4-the-layout-from-the-phone-and-the-roster-never-from-who-is-where), sections 4 and 5.

**Correction after the Integration review of 13 October 2026 (its finding 4).** Choosing the shell by height alone left a gap: from 601 px to the short shell's real need (up to 621 px at 430 px wide), the short shell left the rooms short and the lowest targets ran under the navigation. The compact shell's sizes above are unchanged, and it is still the shell up to 600 px. It is now also drawn wherever the phone kit's short shell would not fit, from the usable height after the safe-area insets. Where no shell fits the screen's width, the board narrows to a centred column; where none fits at all, a message replaces the board. Targets stay at 44 px and the board does not scroll, as the owner decided. This corrects the Designer's implementation of the decision; it is not a new owner decision.

### What it does not settle

- **The real bars.** Frontend implements the shell. Their content at 36 and 48 px, with long names and enlarged text, has not been tried. The review page draws stand-ins.
- **Adoption.** `design/board-v2/` is a proposal outside the reviewed manifest. Integration approves each file by name and hash.
- **The ward's look.** The owner has not seen the ward or its captures.
- **The server's part.** A stored public slot per seat, and a Hospital that holds the whole roster, are Backend's. They are proposed in [board-v2-slots.md](board-v2-slots.md#6-for-backend-and-integration-proposals-nothing-accepted), and nothing is accepted. Without them the Blackout cannot reach players.
- **The specification itself.** Its six files are not in this repository. The work followed the brief and the owner's notes; the complete packet has since been read, and the Designer's notes are reconciled with it in [motion-spec-crosswalk.md](motion-spec-crosswalk.md).

## 11 October 2026: the Insider's file, portraits and role labels

**A choice of content, recorded: the Insider's starting knowledge is drawn as the three players' portraits and the three role labels.** The assignment for the ability art, relayed to the Designer on 11 October 2026, says:

> The owner selected CHARACTER PORTRAITS + ROLE LABELS.

and states the rule the drawing keeps: the Insider knows the unordered set of the three players who are Undercover, Alien and Cracker, and not which player has which role. So the file shows the three portraits, with names and seat numbers, and Undercover, Alien and Cracker as one grouped set of labels; it attaches no label to a portrait and implies no mapping through color, position, connecting lines, animation order, accessible labels or asset selection; the candidates are in a stable public order; pressing a portrait may inspect it but adds no evidence; it is private, after gameplay starts, never during the 30-second reading stage, with deliberate open and hide controls and a hidden state.

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “CHARACTER PORTRAITS” | The candidates are drawn by their own chosen crew cards, names and seat numbers, not as seat tokens or words alone |
| 2 | “ROLE LABELS” | The three roles appear as labels, as one set |
| 3 | The coordinator's Insider mockup | An optional reference, not an approved layout: the assignment says so |

### What the Designer did with it

The Insider's file (`design/abilities/`, `abilities-0.1.0`, slice 1 of the ability art): three snapshots pinned in seat order on a cork board, the three role names as label tapes on one slip in one envelope stamped ONE EACH, one string round the whole set, and “Who is which: unknown.” Frontend's instructions: [abilities-handoff.md](abilities-handoff.md).

### What it does not settle

- **The look and the motion** (DSN-D37): the owner chose the content; the board, the envelope, the string and the assembly are the Designer's proposal, not yet seen by the owner.
- **Slices 2 to 7 follow the same rule** (DSN-D37): the Hacker's and the Alien's files, the Scan and Code strips (slice 2), the Rescue's cross and vials, the Disable's reticle and charge, Supply's tags and slips (slice 3), the shot's reticle and rounds and Protection's shields (slice 4), the ballot slips and box, the key and comms rings, a Hack's cord and the speaking turn's microphone (slice 5), the showdown's special shot and the end's result sheet with its ribbon, cast list and the Code's pins (slice 6), the Actions tray's marks and the out-of-date mark on a kept card (slice 7) are the Designer's proposal for their look and motion; their content is the rules' and the release's. At the end the roles are words in their side's colour, with no device art: the owner may ask for the devices there (abilities handoff, section 18.4).
- **Adoption** (DSN-D36): the kit is outside the reviewed manifest until Integration adopts it.

## 11 October 2026: the current look, in the game, before any paint

**A direction, recorded: the look is to be judged in the game, and nothing is painted for now.** Shown the painted draft of Room B beside the comic look (below), with the Designer's suggestion of a mix (painted light on the rooms, inked figures), the owner answered on 11 October 2026:

> dont go with mix lets try whiteout paint the current  in game then i will judge , lets go with reviewer

The owner sent this after interrupting a first wording that read “lets try this in game”.

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “dont go with mix” | No mix: the suggestion of painted light on the rooms with inked figures is not taken |
| 2 | “lets try whiteout paint the current in game” | Read as “without paint”: the current look is tried in the game. That is the board-motion prototype's scenes, full-body figures, gestures and animations, in the comic look, unpainted. The painted draft stays an exploration |
| 3 | “then i will judge” | The owner judges the look in the game. This is a trial, not the look's final approval: DSN-D34 stays open until then |
| 4 | “lets go with reviewer” | The Designer PR, #88, goes to review |

### What happens now

- **PR #88 is ready for review.**
- **Putting the look in the game is Integration's and Frontend's work** ([DSN-REQ-13](integration-requests.md#dsn-req-13), issue [#97](https://github.com/Amirkianfar66/GameN/issues/97)). It needs the scene layers and the figures brought into a build (DSN-D30, DSN-D32). The runtime then draws the 21 places, the move with its walk, the hit and FULL on a room's tag. The hit is a proposal against the reviewed motion contract (DSN-D35). Today's staging release (#95) draws the approved standees on the reviewed rooms. The Designer changes nothing in `apps/game/`, the contracts or the runtime manifest.
- **The painted draft** ([design/explorations/painted-room/](../../design/explorations/painted-room/README.md)) is kept as evidence and is not developed further.

### What it does not settle

- **The final look (DSN-D34).** It is decided after the owner has judged the current look in the game.
- **Whether the trial shows the hit (DSN-D35).** The owner asked for it on 9 October; the reviewed motion contract has no impact for a health change. Integration and Frontend decide with the owner how the trial carries it.
- **The capacity.** It is enforced only when Backend's issue [#96](https://github.com/Amirkianfar66/GameN/issues/96) lands. Until then the trial draws FULL from public occupancy.

## 11 October 2026: one room repainted, as a draft test

**A request, answered with a draft; nothing is decided by it.** After the scenes were drawn, the owner asked the Designer session on 11 October 2026:

> lets repaint just 1 art work as a draft test to compare. it can be just 1 room test

| # | What it says | What it asks for |
| --- | --- | --- |
| 1 | “repaint just 1 art work as a draft test to compare” | One scene drawn again in a painted look, beside the look the board draws today, so the owner can compare the two. It answers the question left open on 9 October (below): is the procedural vector look enough for “like AAA … animation art work”, or should the scenes be repainted (DSN-D34)? |
| 2 | “it can be just 1 room test” | One room only: Room B, the laboratory, with all five of its places taken |

### What was made

- **[design/explorations/painted-room/](../../design/explorations/painted-room/README.md)**: Room B from the same scene, the same five places and the same figures, twice: as the board-motion prototype draws it (flat color, ink outline, halftone), and repainted by code in a painted, lit look (gradients for flat color, thin soft edges for ink, lamplight and shadow, glow from the screen and a teal specimen tank, rim light on the figures, a reflection in the deck, brushwork and grain). Review pictures: side by side, the painted room alone, a detail, and both in a phone panel's framing.
- **It is a code stand-in, not a painting.** Nothing is painted by hand and no image is generated: the comic drawing is put through gradients, blend modes and filters in the browser. An illustrator's repaint would go further.
- **It cannot be an asset as it is.** The drawing vocabulary of design sources has no gradients, filters or blend modes. A painted look would need that vocabulary widened for scene art, with a drawing budget for phones (Integration), or painted raster art with its rights recorded (DSN-D06).

### What it does not settle

- **Which look.** The comic look stays the board's until the owner chooses (DSN-D34). In the phone framing, the painted draft's glow and rim light draw the eye; its figures are softer against the lit deck than the comic's inked ones. Nothing was measured, on a device or otherwise.
- **The owner answered the same day:** no mix and no paint for now; the current look is to be tried in the game first (above).

## 11 October 2026: five a room is a hard rule

**A rule decision, recorded, with its six cases; not yet a rule of the engine.** Asked by the Designer session whether the room capacity of five (9 October, below) should be a hard rule, the owner answered on 11 October 2026:

> yes enforce 5 as a hard rule

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “yes enforce 5 as a hard rule” | At most five players are in Room A, Room B, the Hospital and the Jail at any time; the Command Room holds its one, the Captain. A move into a full room is refused, not drawn as a crowd. It supersedes the sentence of `rules/overlays/location-board-layout-v1.json` that keeps token areas unnumbered to avoid “an artificial room-capacity rule”, for the rooms (owner decisions come first among the rule sources, `AGENTS.md`). The Final Zone of the showdown is not one of the rooms and holds everyone left |

### The six cases, decided

The owner's first answer was the rule. Asked how it applies in six cases, with the Designer's recommendation for each, the owner answered the same day:

> yes go with your recommendations for all six

So the rule is, for Backend to implement ([DSN-REQ-12](integration-requests.md#dsn-req-12), issue [#96](https://github.com/Amirkianfar66/GameN/issues/96)) and Game Balance to audit:

| Case | Decided | Why it was recommended |
| --- | --- | --- |
| A move into a full room | Not offered, and refused by the server if sent. The room's tag says FULL on every screen | Occupancy is public, so every phone can show it before anyone presses |
| Do the Eliminated count? | Yes: an Eliminated character keeps its place | The board never draws more than five, and nine players never fill Room A and Room B together (ten places) |
| A sixth Injured player at the end of a round, the Hospital full | It stays Injured where it is and goes at the next end of round with a free place | Keeps the rule hard; it needs six Injured at once, which is rare |
| The Jail | Five, never exceeded: at most one player is jailed a round, and a match has five rounds | Balance confirms it from the vote rules |
| Starting rooms | Random, but at most five a room (nine players: five and four) | An independent coin flip for each of nine players puts six or more in one room about half the time |
| Returning to “the last room” (healed, released, a Captain who loses the title) when it is full | The other of Room A and Room B, which always has a place | Nine players hold at most eight others; the two rooms have ten places |

### What the design does now

- **The board.** A room's tag says FULL while five are there (the Eliminated among them), on every screen, from public occupancy only: Room A and Room B, where pressing a full room says the release's words, “You cannot move to that room right now.”; and the Hospital and the Jail, so that the table sees why an Injured character waits where it is. The prototype's fixtures never offer a full room, and its check refuses one that does.
- **Until the engine enforces it,** a view carrying six or more in one room is still drawn, as a crowd in which everyone can be pressed: the board must not break on a view the server sends. Those fixtures are labeled beyond the capacity rule.
- **Not changed by the Designer:** the engine, the rules overlays, the contracts and the server's starting rooms (issue #83) are Backend's; Game Balance audits the effect on play.

## 9 October 2026: five places a room, each a scene

**A direction, recorded; the scenes, places and animations drawn for it are a proposal. The capacity it states is not a rule until the rules say so.** Working with the Designer session on 9 October 2026, after the full-body figures below, the owner wrote, with the same reference page:

> I like the idea of gesture but lets say the maximum capacity of each room is 5 . each room should have 5 fix position  like 5 unique gesture, plus some extra gesture related to got shot or walking to other room. and each room should be like AAA game or animation art work similar to AAA Animation .like a scene.each gesture should also have 2 animation one for moving to the other room , and other is if got shot. so overall we have Control room with 1 gesture ,  2 other room a and b each 5 and hospital and jail also each 5 so 21 overall room and some additional for got shot , injured , Dead , moving

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “I like the idea of gesture” | Characters keep the full-body figures of the pilot, each in a gesture of its own rather than a stance |
| 2 | “lets say the maximum capacity of each room is 5” | Each room is drawn for five. **Recorded as the owner's statement of a capacity; not enforced**: the rules have no room capacity, and only a rule change (Backend's engine, with Balance) can refuse a sixth player. Until then six to nine in one room still stand there, in the crowd (layout stress). What a capacity would decide is DSN-D27 |
| 3 | “each room should have 5 fix position like 5 unique gesture” and “Control room with 1 gesture” | Five fixed places a room, each with a gesture no other place has; the Command Room one, the Captain's at the chart table: C1; A1 to A5; B1 to B5; H1 to H5; J1 to J5. The places are given by seat number from who is in the room, the same on every screen |
| 4 | “21 overall room” | Read as 21 places (1 + 5 + 5 + 5 + 5), not 21 rooms: the rules' five locations are unchanged |
| 5 | “each room should be like AAA game or animation art work … like a scene” | Each room is a scene: the approved room around a new deck, the props of its five places and its light, a figure at every place drawn in front of or behind the room's furniture by depth |
| 6 | “each gesture should also have 2 animation one for moving to the other room, and other is if got shot” | Every gesture has both: getting up, a walk and settling into the new place (a public move), and a hit (a public health change) |
| 7 | “some additional for got shot, injured, Dead, moving” | Extra gestures and animations: the jolt of a hit and its burst; Injured, a flinch and a bandage (and a limp when it walks); Eliminated, the place's fall (slumped over the desk or the bench, still where it sits or lies, or down on the deck); the walk |

### What the board-motion prototype now draws

- **21 places** in five scenes (`design/board-motion/scenes/`), each place with its own gesture: in Room A at the workstation, thinking, crouched at the hatch with a wrench, leaning on the crates, at the junction box; in Room B with a tablet, a laptop on the knees, at the specimen tank, leaning on the bench, at the microscope; in the Hospital sitting up in a bed, lying in the other, in the wheelchair, at the IV pole, on the bench; in the Jail hunched on the bench, at the door, against the wall, on the deck, on the cot; the Captain at the chart table. They are listed with what each shows in [board-motion-coverage.md](board-motion-coverage.md#rooms-places-and-gestures).
- **Who takes which place** from public facts only, the same on every screen: the Captain the chart table; elsewhere the places are a function of who is in the room now, the lowest seat first, each at the first free place in its own order by seat number. *Corrected 11 October 2026:* an earlier version let a character keep the place it held in the previous drawing, which a screen that had just reconnected could not know (found by Backend on issue #96).
- **The two animations** for every gesture, generated from the gesture by the rig, so a new gesture has them at once: a move (`cue-public-move`, 900 ms) and a hit (`cue-public-hit`, a proposal: a burst and a jolt, then a flinch and a bandage, or the place's fall).
- **Every press area** stays the place's, whole and apart, measured at 320 to 430 px; an Eliminated character keeps its place's press area.

### What it does not settle

- **The capacity.** Five is drawn, not enforced (DSN-D27). *On 11 October 2026 the owner made it a hard rule (above); enforcing it is Backend's.* Enforcing it would need the rules to say what a move into a full room does, whether the Eliminated count, where a sixth Injured player goes at the end of a round when the Hospital is full, whether the Jail has one, and how the server-random starting rooms respect it.
- **“If got shot.”** A public view says only that a health changed: never that a shot was fired, by whom, with what or from where, and a Disable and a showdown shot also deal damage. The prototype draws one hit for every cause, from no direction. The reviewed motion contract has “a health change is a status change with no impact” and allows a burst only when the attack type is public: drawing the hit is the owner's look against that rule, and drawing a shot as a shot would need a public shot fact (DSN-D35).
- **“Like AAA … animation art work.”** The scenes and figures are vector drawing made procedurally in this repository from the approved rooms and standees, with a cel shadow, halftone and ink: not painted illustration or keyframed animation. They fix the composition (places, depths, layers, gestures, timings) an illustrator or animator could repaint and re-time; a painted look would need raster art and the owner's decision on rights (DSN-D06, DSN-D34).
- **Motion while nothing happens.** No gesture idles or breathes: the pinned tokens say `loops: false` (DSN-D16). An idle loop for each place is possible as an option, if the owner decides it.
- **The reviewed kit and the runtime** are unchanged; adoption is Integration's and Frontend's (DSN-D30, DSN-D32).
- **The owner has not looked at the prototype with the scenes.**

## 9 October 2026: full-body comic characters

**A direction, recorded; the figures drawn for it are a proposal.** Working with the Designer session on 9 October 2026, the owner asked, with the same reference page as on 8 October:

> is it possible to make character in game like this image something more feel comicbook?

The Designer answered with a pilot, [design/explorations/comic-figures/](../../design/explorations/comic-figures/README.md) (its review pictures are kept there; its page and scripts are in git from commit `c005c35`): the nine characters as full-body comic figures posed in the rooms. It asked whether to roll them out on the board, or to look for a painted style instead. The owner answered:

> lets try full body comic

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “make character in game like this image something more feel comicbook” | The characters are drawn as full-body comic figures, people in real positions in the rooms, instead of the bust standees on the board |
| 2 | “lets try full body comic” | The full-body vector route the Designer proposed, not a painted one. It is tried on the board-motion prototype: every piece there is now a posed figure, and the figures are a proposal asset set (`board-motion-0.2.0`) |

### What the board-motion prototype now draws

- The same nine people as the approved standees, full body, in their own colors (design tokens 0.4.0) and the same crew suit, with nothing of a role or a team on anyone. They are drawn by one rig in `design/board-motion/figures/`, so a pose is drawn once for everyone.
- A pose from public facts only. The Captain leans over the chart table. The first Injured character in the Hospital sits up in the bed, bandaged. A Jailed character alone or with one other sits on the bench. The first in Room B works at the counter. Everyone else stands in one of three stances, chosen by seat number, facing into the room. An Eliminated character sits on the floor, greyed. A move is a walk.
- The same press areas, rings, plates, markers and cues as before, measured again at 320 to 430 px.

### What it does not settle

- **The reviewed kit and the runtime.** The approved standees of 7 October stay in `design/source/crew/`, in the exports `design-0.2.0` and in the runtime, and the bust card stays the private role card's picture. Bringing the figures into an export revision is Integration's step, and drawing them in the game is Frontend's (DSN-D32).
- **The crew catalog's rule.** It says a character never changes with health, Jail, the Captain or anything private, and that those are markers on the piece. The figures never change the character (face, skin, hair, colors, suit); they change the pose, and only with public facts. Whether a pose may say what a marker says is DSN-D33.
- **Motion while nothing happens.** The pilot's breathing stays out of the prototype (DSN-D16).
- **A painted look** like the reference's is not chosen. It would need raster art and the owner's decision on rights (DSN-D06).
- **The owner has not looked at the prototype with the figures.**

## 8 October 2026: the board as the game

**A request, recorded; the design drawn for it is not approved.** Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87), opened from the owner's account on 8 October 2026, records the owner's request:

> The game owner requested that every action targeting another player happen on the comic game board: select an action, then tap the player's character in its room. Separate player-picker tabs interrupt the feeling of playing a board game. The owner also requested interactive feedback and motion for all nine characters, all actions and all movement. Phones remain the V1 priority, with a clean screen, top status/timer bar, bottom navigation and no page scrolling in the normal game view.

The same day, starting this work, the owner wrote to the Designer session, with a reference image:

> I want the feeling characters like a comic book inside a room in different real position like a comic book each room maximum 5 player capacity but I want it like interactive .same as image ref i attached here

The reference is not committed. In words: one comic page; COMMAND ROOM across the top, subtitled CAPTAIN in yellow, a figure leaning over a round chart table; ROOM A (ENGINEERING, blue) and ROOM B (LABORATORY, violet) side by side; HOSPITAL (a cross) and JAIL (a padlock) at the bottom; a corridor between the columns drawn with lights and arrows; people standing, at consoles, in a bed, on a bench, with small tags A1, B1, H1, J1; a footer reading MOTHERSHIP PEOPLE · SECRETS · SURVIVAL / SAME SHIP DIFFERENT TRUTHS.

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “every action targeting another player happen on the comic game board: select an action, then tap the player's character in its room” | The board is where a turn is played: Actions opens a compact tray, the eligible characters become pressable on the same board, the choice is confirmed in a strip above navigation. No separate picker |
| 2 | “interactive feedback and motion for all nine characters, all actions and all movement” | Every character has the same full set of interaction states, and its own public flourish when it moves |
| 3 | “Phones remain the V1 priority, with a clean screen, top status/timer bar, bottom navigation and no page scrolling” | Designed and measured at 320 x 568 to 430 x 932 with no page scroll |
| 4 | “characters like a comic book inside a room in different real position” | Characters stand at hand-placed places in each room, as figures in a comic panel: behind the chart table, at the laboratory counter, in the Hospital bed, on the floor; not in a row of tokens |
| 5 | “each room maximum 5 player capacity” | Each room is drawn for one to five. **Read as a drawing instruction, not a rule**: the rules have no room capacity, so six to nine in one room still stand there, in a crowd formation, everyone reachable. Whether five becomes a rule is DSN-D27 |
| 6 | “same as image ref i attached here” | The page of the reference: the five rooms in its order, its slanted captions, its subtitles (DSN-D29). Its corridor arrows are not drawn: the rules give no adjacency (DSN-D28) |

### What it does not settle

- **The design.** The prototype (`design/board-motion/`) and its handoff ([board-motion-handoff.md](board-motion-handoff.md)) are a Designer proposal. **The owner has not looked at it**, and nothing here marks it approved. Issue #87 says it plainly: new artwork and motion treatments still require review.
- **Rules and contracts.** None changed: the ruleset `in-person-v1-pass-2026-10-08`, the room-tag movement and the server-random starting rooms stay as they are. A room capacity would be a rule change (DSN-D27).
- **The questions it raises**, DSN-D27 to DSN-D31 in [README.md](README.md#open-decisions), are open.

## 8 October 2026: phones first for V1

**A priority, recorded; the layouts drawn for it are not approved.** Issue [#76](https://github.com/Amirkianfar66/GameN/issues/76), opened from the owner's account on 8 October 2026, records the owner's request:

> The owner requested, on 8 October 2026: host screen, player joining screen, character selection, role reveal and the main game screen, plus identification of missing screens. **Phones are the V1 priority; desktop follows the same responsive design for now.**

| # | What it says | What it decides |
| --- | --- | --- |
| 1 | “host screen, player joining screen, character selection, role reveal and the main game screen” | Five priority screens, in that order. The fifth is read as gameplay after setup |
| 2 | “plus identification of missing screens” | The supporting states are part of the work: [v1-phone-inventory.md](v1-phone-inventory.md) lists every one with its data source |
| 3 | “Phones are the V1 priority” | Every screen is designed at a phone's width first (390 CSS px, checked at 320 to 430) |
| 4 | “desktop follows the same responsive design for now” | No separate desktop programme: the same hierarchy at comfortable widths |

### What it does not settle

- **The new layouts.** The journey drawn for it ([v1-phone-journey.md](v1-phone-journey.md), prototype `design/v1-phone/`) is a Designer proposal. **The owner has not looked at it**, and nothing here marks it approved.
- **Rules and contracts.** None changed. The 30-second selection, the 30-second minimum reading, every human's Ready and the fresh 60-second first turn are the owner's earlier decisions ([2026-10-07-staged-start.md](../decisions/2026-10-07-staged-start.md)), kept as they are.
- **The comic look.** Unchanged from 7 October; the journey uses the approved rooms, characters and devices as they are.
- **The questions the journey raises**, DSN-D20 to DSN-D26 in [README.md](README.md#open-decisions), are open.



**Approved by the game owner.** After looking at the working page in the session, the owner wrote: "then lets share what you achieve with reviewer, but also ,add note this design is approve by the owner (me)".

What was looked at and approved is [design/explorations/comic-board/](../../design/explorations/comic-board/README.md), as it is in the commit that adds this page (`4fa2ff3`, PR #57): the board as a page of a comic book, rooms printed in color, nine crew characters as the playing pieces with the seat number and the player's name, a move played as a short piece of motion, and the role as a private card on which a device is added to the player's own character.

### The decisions, in the order they were given

| # | The owner's words | What it decides |
| --- | --- | --- |
| 1 | "I want a motion graphic and fill user animation style even if it is more feeling like a card board game but to combine 2 feelings together and it is isnide a comic book ,user can select that room and move to that room , the image I send you is a reference" | The direction: animated, with the feel of a card and board game, inside a comic book. A player selects a room on the board and moves to it. The reference was a page of five rooms, each in one strong color, with slanted yellow captions |
| 2 | "I really like a animation and motion graphic of numbers but now instead of putting numbers as characters lets create characters , the character in rooms not reveal its role but the character and name of player . the character should match with room style and board game style , we can have 9 characters to choose, this not related to role," | The move animation is liked. The playing pieces are characters, not numbered tokens: nine to choose from, in the style of the rooms and of a board game, shown with the player's name. A character has nothing to do with a role and must not reveal one |
| 3 | "Name and number is correct" | A piece's tag carries both the seat number and the player's name |
| 4 | "for now I consider for V1 maximum 9 player" | Version 1 has at most nine players. Nine characters, one each, is enough for it |
| 5 | "after user select character the game , then the role card assigned randomly so user get a role card also . role card graphically is a device added to person animation but visible for that person alone" | The order: a player selects a character, then a role card is dealt at random. A role is shown as a device added to that player's own character, animated, and visible to that player alone |
| 6 | "The portrait of a separate officer in a cap no longer fits this direction .nobody should see other player devices , so it is fine, the device is your private card and board game environment" | The earlier idea of a separate person on each role card is dropped; the Officer portrait drawn for it was never committed and has been taken out. The device stays inside the player's own private card. Nobody sees another player's device |

### What the approval covers

- The look and the feel shown: the comic page, the rooms in the reference's colors, the captions, the character pieces and their tags, the hand of cards, the motion of a move and of the role card being turned up.
- Decisions 3 to 6 above, which the owner gave as answers to questions put to them.

### What it does not settle

The approval is of a design. It changes no rule, no contract and no adopted asset by itself.

- **Rules.** None was changed or reinterpreted. Movement in the page follows the confirmed movement decision and the server's own list of destinations.
- **Contracts.** A player's name and chosen character are not in any contract. Adding them, and the lobby step that sets them, is Codex's and Frontend's ([DSN-REQ-6](integration-requests.md#dsn-req-6)).
- **Adoption.** The page was an exploration when it was approved. What has been adopted since, and what has not, is [below](#adopted-since-and-what-the-owner-has-not-seen).
- **Room names.** The owner's reference names the rooms Medical Room, Lockdown Room, Laboratory and Crew Meeting Room. The approved page uses the rules' names, and the owner said nothing about renaming. They stay Hospital, Jail, Room A and Room B unless the owner decides otherwise.
- **Wording.** The call signs of the nine characters, the words the page adds, and the lines on the nine role cards are proposals.
- **Devices and people.** Whether a phone, a shared display, or people at a table read any of it as intended has not been tried.

### Cautions the Designer keeps on record

The first was put to the owner twice before the approval, and the look was approved as shown. The second is the Designer's own. They are recorded so that a reviewer and Game Balance can weigh them; neither reopens the decision.

- The approved room colors include a red, a blue and a violet room. Those are also the Red team's, the Blue team's and the Alien's colors, and [art-direction.md](art-direction.md) rules faction-coded location lighting out of the public board. A second set of room colors that avoids those three hues is in the page.
- A private card is still seen over a shoulder. The role device is large and carries the team color; it is behind a deliberate turn of the card.

### Adopted since, and what the owner has not seen

On 7 October 2026, after the review of that date, Designer brought the approved page into the design system: the drawings as sources, the colors as tokens, the exports, the contract and the reference stylesheets. **The owner has not looked at the result.** It is recorded here so that what was approved and what was built from it can be told apart.

Unchanged from what was approved:

- The four new room drawings, the nine characters and the nine devices. Each source is the approved drawing byte for byte, apart from its header comment and, in the Command Room, the names of its layers.
- The five color families of the rooms, the caption yellow and its slant, the characters' colors: the same values, now tokens.
- The tag under a piece: seat number, then name. Pieces in one row, every second tag a line lower where a room is crowded.
- The move: 900 ms, 450 ms in the air, started by the public fact.
- A role as a device on the player's own character, seen only by that player.

Designer's own choices in bringing it over, which the owner may want to see:

| Choice | Why | Open as |
| --- | --- | --- |
| On a phone the role card's picture is a thumbnail inside the private sheet, and large only when “About this role” is opened. The approved page showed a large card whenever the card was turned up | Today's private sheet holds the role and the actions together. A large card would push the actions off the screen, and would put a device in its team's color on screen every time the sheet is opened | [DSN-D19](README.md#open-decisions) |
| The comic page is on the shared display only. A phone keeps its list of rooms, with each room's strip, caption and color | A phone's page with rooms to press needs the movement markup of protocol 2, and a way to read it at large text | [DSN-D18](README.md#open-decisions) |
| Nothing moves while nothing happens | The pinned tokens say `loops: false` | [DSN-D16](README.md#open-decisions) |
| A dealt card landing in a hand, and a room coming up when it is picked, are not built | Today's markup has neither a hand nor a room that can be pressed | With DSN-D18 |
| The lines on the nine role cards | The approved page had lines for the Officer only | [DSN-D17](README.md#open-decisions) |

And two things Designer measured after the approval, which do not change it:

- The pink of one character is the nearest of the nine to the Red team's accent, and the Command Room's gold and the yellow of one character are near the amber that means “press this” and “active turn”. The numbers are in the tokens (`measuredColorDistances`) and in [visual-interaction-contract.md](visual-interaction-contract.md#7-design-tokens-040).
- An earlier note said the characters' colors are “kept away from blue, red and violet”. None of them is blue, red or violet. “Kept away” claimed more than was measured, and the sources now say what was measured instead.

## Earlier decisions this page relies on

Recorded elsewhere, not by Designer: the in-person V1 priority ([#9](https://github.com/Amirkianfar66/GameN/issues/9)); the request for expressive comic motion graphics of 26 September 2026 ([motion-direction.md](motion-direction.md)); the confirmed movement decision and the approved V1 decisions V1-01 to V1-21, which are on `codex/v1-connected-merge-candidate` and not yet in this branch's base.
