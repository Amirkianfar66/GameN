# Owner decisions recorded by Designer

What the game owner decided about look, feel and presentation while working with the Visual and Motion Designer, in the owner's own words, with what each decision covers and what it leaves open.

`AGENTS.md` puts the owner's latest explicit decisions recorded in the repository first among the rule sources. This page is where Designer records the ones it was given. It does not replace the decision register, [docs/decisions.md](../decisions.md), which is Codex's and is source-locked. Designer has not edited it: [DSN-REQ-7](integration-requests.md#dsn-req-7) asks for a newer decision record that points here.

The owner's messages are quoted as written.

## 17 November 2026: every room redesigned in one cyber-comic-noir style, room by room, with who builds what

**Recorded by the Lead Designer from the owner's message to the Lead.**

**What was given.** Four pictures and a written brief:
- **Two room pictures from the owner:** Room A in blue steel, with a round window onto a planet, and Room B, a violet laboratory. Each fills a phone, under bars like the game's.
- **Two frames from an outside artist's animation:** a city street and a ship among asteroids. Like the two frames of 17 November [below](#17-november-2026-generated-backgrounds-and-one-noir-filter-for-the-pre-game-animation-test), they are mood references, described in words. They are not given to a tool as pictures, and the team names no artist in a prompt.
- **A description of the look the owner wants,** which begins: "The most useful description is **illustrative 3D science-fiction animation with an inked graphic-novel finish**." It ends with the same direction for the Designer that the owner gave on 16 November, quoted [below](#16-november-2026-a-hand-inked-graphic-novel-world-for-the-pre-game-animation-test).

**The brief,** as written:

> Consider Frontend agent should not rebuild the Designer agent work at all, so some connects should be by designer for easier integration and avoid future issues, The goal is to **redesign all GameN rooms in a consistent cyber-comic-noir style, with visual depth, animation and clearly defined interactive elements**. This includes Room A, Room B, Command Room, Hospital, Jail, Supply Room and Private Room.
>
> Each room needs both a **layer map** and an **item-by-item specification**. These form the shared reference for Claude Designer and the Frontend agent.
>
> Each scene has three main depth groups:
>
> - **Far:** animated exterior views through windows, such as stars, planets and other space elements. These animations appear within the window openings. Rooms without exterior windows do not need an artificial exterior layer.
> - **Middle:** the room’s structure, including walls, floor, ceiling, window frames and fixed equipment.
> - **Foreground:** elements such as table edges, pipes and furniture fronts that create depth and partially overlap characters.
>
> These groups can contain multiple assets. For example, a desk may need separate back, surface and front pieces so a character’s body appears behind it while their hands rest on top.
>
> For **every item**, define:
>
> - Its position, depth and relationship to surrounding objects.
> - Which parts are still artwork and which require separate movable pieces.
> - Its animation: what moves, what triggers it, whether it loops and when it stops.
> - Its interaction: whether players can use it, how they use it and what feedback they receive.
> - Its possible states, such as open/closed, active/inactive or full/empty.
> - Whether its behaviour is decorative, automatic or driven by an authorized gameplay event.
>
> An item can be **both animated and interactive**. A Hospital panel combines a static housing, changing display content and player input.
>
> **Image generation** supplies environment artwork, prop components and character appearance references. Moving objects can use generated image parts, with their movement controlled by code. Characters remain separate from backgrounds and perform activities appropriate to their positions, such as working at a computer or handling boxes. Decorative activities make the environment feel alive; gameplay outcomes follow the authoritative game state.
>
> **A shared visual finishing filter** unifies backgrounds, props and characters. Harmonize exposure, contrast, colour, ink-like shadows and subtle halftone textures while preserving each location’s atmosphere and keeping faces and interactive objects readable. Use adjustments for different rooms and depth layers. Keep UI, team colours and meaningful status indicators outside the environmental filter.
>
> Bake static finishing effects into artwork where practical, and match animated elements to that appearance. Support **Reduce Motion** for decorative animation and camera movement. The underlying artwork must also agree on perspective, scale and lighting.
>
> **Implementation responsibilities are divided as follows:**
>
> - **Claude Designer owns the visual implementation:** artwork, reusable visual components, layout, styles, character rigs and acting, visual effects, exterior animations, filter treatment and visual states. Claude also writes the specifically assigned connections that mount these components in the game.
> - **Frontend owns the application’s functional integration:** authorized data, server communication, commands, navigation, recovery, accessibility behaviour and runtime performance. Frontend reviews Claude’s game-side connections against these responsibilities.
> - **Backend owns gameplay authority:** rules, permissions, outcomes, timing and information visibility.
> - **Integration coordinates compatible versions, review, merge and deployment.**
>
> **Using code does not automatically make a task the Frontend agent’s responsibility.** Visual and animation code belongs to Claude Designer. Each integration task must have one named implementation owner, with the other agent reviewing it.
>
> The preview and the actual game must consume the **same canonical visual components**. Frontend should connect those components rather than recreate their appearance. Required visual corrections go back into Claude’s canonical source.
>
> The handoff includes registered assets, masks, contact points, animation pivots, interaction areas, component inputs and callbacks, and reference compositions for mobile Room and Board views—with enough margins for planned camera movement.

**What it decides:**
- **Which rooms:** all seven are redesigned in one style: Room A, Room B, the Command Room, the Hospital, the Jail, the Supply Room (Food Supply's) and the Private Room (the private talk's).
- **What each room gets:**
  - a layer map, in the three depth groups (far, middle, foreground);
  - an item-by-item specification, with the six points above for every item;
  - a handoff with the parts the last paragraph lists.

  Designer and Frontend both work from them.
- **Where the pictures come from:**
  - Image generation makes the environments, the props' parts and references for how the characters look.
  - Code moves whatever moves.
  - The characters stay apart from the backgrounds and act at their places.
  - What players see happen in the game comes from the authoritative game state.
- **The finish:** one shared filter, tuned for each room and depth, and baked into still pictures where it can be. The UI, the teams' colours and any status that means something stay outside it.
- **Who builds what:**
  - Designer owns the look in code as well as in pictures, and writes the connections it is given that mount its components in the game.
  - Frontend owns the game's functional side and reviews those connections.
  - Backend owns the rules, and Integration owns versions, review, merge and deployment.
  - Every integration task has one named implementation owner, and the other side reviews it.
  - This confirms and widens the owner's 15 November decision that Designer connects its parts.
- **One source:** the preview and the game use the same canonical components. Visual fixes go back into Designer's source, not into a copy.

**What it changes:** the 17 November record below kept generated pictures out of the game's rooms and left open whether the method would go beyond the Doctor test. It now goes to every room. The rules recorded there apply to every room picture:
- the tool's terms allow commercial use;
- each picture is kept with its tool, its prompt and its date;
- outside frames are references in words only.

**What stays the same until the owner approves the new rooms:**
- The approved rooms (`room-drawing-1.0.0`) stay in the game.
- Each room keeps its five places (the 11 October hard rule).
- The characters are the nine approved crew (`design-0.9.0`), as separate rigs. Any change to their drawing for the new finish is shown to the owner before it is used.
- Components show authorized state and send the player's intent. They decide no outcome.

**The human test:** the Lead recommends that it ships on today's rooms, so nothing in it waits for the redesign; the owner has not answered yet. The game mounts the room scene component, so the new rooms can come later inside it with no change to the game.

**The owner's answers, the same day,** to the Lead's two questions (Room B's rear wall, and which image tool):

> Keep the window as we have animated integrated space sky for all game  move the atom screen to the right wall. my image tool can be 1 agent session here it on Codex,

and, correcting how the Lead first read the second half:

> sorry i did not say codex agent to be image creator , I said it can be session here for images or an agent in codex , as you suggest

- **Room B keeps its exterior window,** with the shared animated sky every window shows. The owner's own picture had put an instrument screen there. The atom display goes on the small screen on the right wall, as #309's B03 has it.
- **Who makes the pictures:** a session in the Designer team, or an agent in Codex, as the Lead suggests. It is not decided until the owner answers the Lead's suggestion.
- **The terms, for OpenAI's image model.** A Codex agent would use it, and the Lead suggests it for a session here too. The Lead checked [OpenAI's Terms of Use](https://openai.com/policies/row-terms-of-use/):
  - the user owns the output, and OpenAI assigns to the user any rights it has in it;
  - AI output must not be presented as made by a person, so each plate's record says it was generated, with its tool, its prompt and its date.

  Whether purely generated pictures can be protected by copyright is a separate question, which these terms don't settle.

**What it leaves open:**
- Who makes the pictures (above).
- Each room's composition and camera. Room B is the first slice (#309), for the owner to see first.

**The owner's style text and three answers, the same day,** in the Designer team's image session ("Designer: room images"), at 10:18 and 10:20 UTC. The Lead read both in that session's own transcript, not from a summary.

The style text, word for word. It is the owner's draft with the three lines under "For our game", which the Lead suggested and the owner kept. The image session saved it with sha256 `f21ffeec2e282454b9370fbcaf78d517d50e7f648ae5ef74740b14d78bdc78d6`.

> Overall :Style and art for every GameN room
>
> Create an illustrated science-fiction world with convincing three-dimensional depth and a hand-inked graphic-novel finish. Use strong silhouettes, expressive outlines, textured shadows and worn materials. Build environments from layered machinery, exposed pipes, suspended cables, overlapping panels and objects that suggest everyday use and repair.
>
> Organize dense detail around clear focal points. Use controlled colour palettes with selective luminous accents, giving each location its own atmosphere. The world should feel active, inhabited and larger than the visible frame: drifting smoke, changing displays, operating machinery, passing objects and layered depth, while the composition stays clear.
>
> For cosmic events, extend this language into saturated colour, orbital geometry, swirling forms and mysterious changes of scale.
>
> Overall: dark, cyber, noir, illustrated science fiction.
>
> For our game:
>
> * These are still pictures; code adds the motion. Paint smoke, screens and moving machinery cleanly, as separate pieces, with no motion blur.
> * The crew stand in these rooms on a phone screen. Put dense detail on the walls and edges, and keep the floor where people stand calm and readable.
> * No people, and no words, letters or logos. Leave screens plain for the game to fill.

The three answers, each with the question and the option text the owner saw:

| Question | The owner's answer | Its option text |
| --- | --- | --- |
| "Camera for the room pictures: should the rooms be seen from above, which keeps every crew member where they stand today, or at eye level, which means moving them?" | **Eye level** | "Camera at head height. The rooms feel more cinematic, but crew positions move, and the sheet and guides have to be redone before any generation." |
| "Room B (the lab) is currently described as "calm, clinical, slightly worn" in dusky grey-violet. Your text says "dark, cyber, noir" overall. How should Room B feel?" | **Darker, more noir** | "Keep the lab's grey-violet family but push it darker and moodier, with deeper shadows and stronger contrast around the few lit accents." |
| ""Leave screens plain for the game to fill": what should a screen opening look like in the still picture?" | **Flat black, empty** | "Each screen is a flat black opening that the game draws into, as the current sheet does." |

The other camera option was "From above": "High three-quarter view looking down about 15–20°. Today's crew positions stay as they are. This is what the current Room B sheet is built for." The Lead had recommended it.

**What it decides:**
- **The room pictures are drawn at eye level,** Room B first.
- **The places move.** In a room drawn at eye level, the five places get new feet, sizes and x positions to suit the camera.
  - Each room keeps its five places, their ids and their order: the 11 October hard rule, and the order the entry rule reads (an entrant takes the lowest free place).
  - A room's new layout goes to the owner before any picture for it is generated.
- **Room B is darker and more noir,** in its grey-violet family.
- **Screens are flat black, empty openings,** which the game draws into.
- **Who makes the pictures:** the Designer team's image session, with OpenAI's image model, as the Lead suggested. The owner gave it their key in the environment's settings.
- **Not generated:** the Room B sheet's versions 5 and 6, both drawn for the high camera. Nothing has been generated.

**What it means for the work:**
- **The Pre-game Animation builder** proposes the eye-level camera and Room B's five places on a test page. The page shows faces and targets at both phone sizes and in the Board's tile. The Lead reviews it, then the owner.
- **After the owner's yes:**
  - the sheet's version 7, with new guides and the darker Room B, and the Lead's go naming it;
  - the in-game animation builder measures the bench's hand contacts again;
  - ship life's walk paths (#230) and the Board's framing follow the new places.
- **Who changes what:**
  - **Designer:** the places' coordinates, in the reviewed room scenes.
  - **Integration:** their runtime ports in `apps/game/hosted/board-v2-drawing/`, the review records in `design/releases/` and the pins.
  - **Frontend:** reviews.
- **Until then,** the approved rooms and today's places stay in the game, as above.

**The owner's idea of a view from each place, and their notes, the same day,** in the Lead's session, word for word:

> for images we can consider each person view , for example anywhere you seat in the room you can see based on your position other players on that room , however the Board-game view can stay simple 2d , what do you think of this idea?

The Lead answered with its costs: a picture per place instead of per room, the crew seen from other sides, the Blackout's shared picture, and fitting four people on a phone. The Lead recommended testing it before deciding. The owner's notes on that answer:

> First note : Hospital and Jail Maximum should be 4 , Room A and Room B : 5 , Task Food : 2 , Command room:1  , inside Board simple view no action available  note 2:  we should consider from each View you can see at Max 4 other user ( can we handle it?)  3 - I did not get what is the issue of Blackout 4 - small screens are not out issue as I told you we are considering just Iphone above 15 and Iphone max size as our first release

After the Pre-game Animation builder's blockout comparison of a shared eye-level view and views from two places (its eye-level page), the owner wrote:

> also private meeting room just need 2 view, we can apply this in 1 of the room to see the result it could be 5 image for 5 view , positions

**What it decides:**
- **A test with real pictures:** Room B drawn from each of its five places, five generated pictures, one per place, lit only. The owner judges the result before the rooms' camera is settled. The Private Room would need two views.
- **Each view shows at most four others.** With these room sizes, that is Room A and Room B; the Hospital, the Jail and the Private Room show fewer, and the Command Room nobody.
- **The first release's phones:** iPhone 15 and later, and the Pro Max size. Designer checks at 390 × 844 and 430 × 932, as AGENTS.md has it.
- **The room sizes as the owner states them:** Room A and Room B five, Hospital four, Command Room one, the Food task two. These match the rules already recorded (CAPACITY-01 on 11 October; HOSPITAL-4 on 18 October; the Food task, 12 November).

**Asked back, and the owner's answers the same day:**

> Jail: 4 , Board can be as it is without change for  now, what do you mean by Blackout remove? also private meeting room just need 2 , explain me more about Option 1, one shared eye-level view per room. and Option 2, each player sees the room from their own place

- **The Jail holds four.** This changes the rule: CAPACITY-01 and CAPACITY-06 (11 October) hold five.
  - It is for Integration and Backend, in a new ruleset version, with Balance's audit.
  - It needs a rule for a Jail vote when the Jail already holds four, which Backend and Balance propose and the owner chooses.
  - Posted on #96, the capacity issue.
- **The Board stays as it is for now.** Release 3 (#310) keeps choosing Move and Rescue across rooms on the Board. "No action" on the Board's simple view belongs to the new room design, not the test release.
- **The Private Room has two places,** so two views.
- **The Blackout's fixed position (sheet 30): answered below.**

**The owner's approval of a departure from sheet 30, the same day,** after the Lead explained the question step by step. Word for word:

> remove the Cancel in Blackout

| Record | |
| --- | --- |
| **Sheet and state** | Sheet 30, the Blackout. The target bar after the Disabler has fixed a position: "Position A3 fixed · Resolves after the window · no effect shown now" |
| **The departure** | That bar has no Cancel (shell 0.2.12's `target.cancel: false`, given by Actions' `blackoutBar({ fixed: true })`). Its words stay |
| **Not changed** | The Cancel while a position is still being chosen ("Choose a position · …"), as T2 has it: "While a target is chosen, Cancel is in the target bar" |
| **Why** | The rule makes a fixed position final, so the sheet's Cancel could not return to choosing. A Cancel that only hides the bar reads as undo. The Gameplay UI builder found the conflict on #310 |
| **Approvals** | Designer's agreement: the Lead Designer recommended it on 17 November 2026. The owner's explicit approval: the message above, the same day (AGENTS.md, the phone gate's item 4) |
| **Scope** | The Blackout's fixed-position bar only, from release 3 (#310), through Actions 0.2.4 on #273 |
| **Date** | 17 November 2026 |

**The owner's arrangement for the per-place test, the same day,** after the Lead explained both options. Word for word:

> We can test on 1 room option B as a test so For **Option 2**, I suggest arranging the player stations around the room's perimeter, with **their backs toward the walls and their faces toward the open centre**.
>
> This would make the room layout support each player's personal viewpoint:
>
> - **Keep the centre open.** Avoid tall equipment or large furniture blocking the view between players.
> - **Place cameras near each player's eye or shoulder position**, with enough clearance from the wall to keep the camera inside the room.
> - **Use low or angled workstations.** Players should be able to operate their equipment while facing inward or slightly sideways. A computer mounted directly on the wall would make its user turn their back to the others again.
> - **Position equipment carefully around faces and hands.** The workstation should communicate what the character is doing without hiding them.
>
> From these positions, other characters should mostly appear from the front, at a three-quarter angle or from the side. This should reduce the need for full rear views and help avoid the weak "camera behind the back wall" composition.
>
> It will still require multiple viewpoints and some side-facing character artwork. Distant characters, name tags and interactive targets also need to remain readable.
>
> **Please try this arrangement in the five-view Room B prototype.** Check every viewpoint at actual mobile size, particularly the most difficult station. The aim is to preserve Option 2's sense of being inside the room while keeping the people and required interactions clearly visible.

**What it sets for the Room B test:**
- **The layout:** the five stations around the walls, facing an open centre, at low or angled workstations, with each camera at the player's eye or shoulder, inside the room.
- **The order:**
  - a blockout of the five views first, checked at 390 × 844 and 430 × 932;
  - then the five generated pictures.
- **The Lead's point for the test:** from a station on a ring, the two nearest neighbours stand far to either side. The blockout measures the field of view each station needs, and compares ways to fit all four others: an uneven ring, a slightly wider lens, or a view the player can drag a little.
- **The crew in the test:** the approved drawings as stand-in cut-outs. New side or three-quarter drawings of the crew go to the owner before anyone draws them.

**Four positions and four views, the same day,** answering the Lead's question after the five-station ring blockout. Word for word:

> Lets for simplicity say 4 positions in each room and 4 view ,always 1 player can not see 1 position if it filled as a test

**What the five-station blockout had shown** ([the ring page](https://claude.ai/artifact/UoYoz7fdGb7i1xtmGZy3CR), version 1):
- From every station, holding all four others needed about 126°, drawn as a curved panorama.
- Everyone was seen from the front or at three-quarter, never from behind, and every tag and tap passed at both phone sizes.
- The people were small: 71–79 px tall across the room and 115–131 px beside you at 390 × 844, against about 330 px in today's room view. Floor lines bent.

**The owner's correction, minutes later,** after the Lead read the message above as two people per view. Word for word:

> Sorry i was saying for test we can see 3 people per view not 2

**What it sets for the Room B test:**
- **Four places, B1–B4,** around the walls, facing the open centre. B5 is left out of the test.
- **Each view shows all three others.** The one place a player can't see is their own: the camera is at their eye, and their own body isn't drawn.
- **The lens:** on a ring of four, each station takes in about 90° plus the people's widths. The blockout measures a straight lens and a curved panorama, and the one that keeps the people largest without visibly stretching them is used.
- **The order:** a blockout of the four views, the Lead's check, then the four generated pictures and a test page for the owner, with today's Room B view beside them for scale.

**What it does not settle:** the game's room capacities stay as recorded above (Room A and Room B hold five) unless the owner changes them. If per-place views are chosen for the game, a room of five needs either a fifth view or a limit of four.

**A third option, asked the same day,** after the Option 1 example ([the test page](https://claude.ai/artifact/PbhNtcYhaDjrNMsFcrL12M), version 1794921470-5f56) and a side-by-side picture of both options. Word for word:

> Do we have a 3rd option as 2.5D eye view of character? Is it something possible to test?

The Lead answered that a 2.5D room can be built and tested:
- **What it is:** one simple 3D set per room, with the crew standing in it as the approved flat drawings, drawn live from any camera.
- **What it needs:** a 3D renderer that the game doesn't have. `three` is an unreviewed dependency in `apps/game` today.
- **The Lead's recommendation:** keep it out of the first human test.

A test that cost nothing was started.

**The owner's choice, minutes later.** Word for word:

> ok so for now we can confirm Option 1 with image generation but I want each image generation integrated with the code one  keep the ambient color of it for example in Room B is feeling Purple so lets more integrate the image and code design to have something feel same, we can test 1 image together

**What it decides:**
- **Option 1, for now.**
  - Each room is one shared eye-level picture, the same for every player in it, made with the image tool.
  - Room B's camera is "Deep, raised back".
  - Per-place views, sideways phones and 2.5D are not chosen for now.
- **Each picture keeps its room's colours from the code.**
  - For Room B, that is its family in tokens 0.5.0: `#2A1446`, `#4B2079`, `#7A3CAD`, `#AE6CD3`, `#DCB6EE`. The source is `color.room.roomB`, also `FAMILIES['room-b']` in `design/room-pilot/rooms.mjs`.
  - Every other room keeps its own family the same way.
  - This refines the earlier "Darker, more noir" answer: Room B stays dark and moody, but purple. The first Option 1 picture drifted to grey-brown.
- **The picture and the code are made to feel like one.**
  - The code's own ambient fills the picture's openings: the window's voyage, the screens, the lights and the tank's bubbles.
  - The crew take the room's light and a floor shadow.
- **One picture first.**
  - Room B is tested together with the owner before any other room is generated.
  - This is the owner's approval for that one picture, and for one re-run if it fails the sheet's checks.

**What it means for the work:**
- **The Pre-game Animation builder** makes the shared-view sheet's next version, with the guide coloured in Room B's family and the palette in the prompt. After the picture, it builds a test page:
  - the picture with the code's ambient and all five crew;
  - live, at 390 × 844 and 430 × 932;
  - beside today's Room B.
- **The Lead** reviews the sheet and names it in the go.
- **The image session** makes the picture and records it.
- **The 2.5D test is paused.** It stays a later option.
- **The places.**
  - Room B keeps its five places, their ids and their order (the 11 October hard rule).
  - Option 1's coordinates go to the owner with the picture.
  - Then they go into Designer's reviewed room scenes, and into Integration's runtime ports and pins.

**What it does not settle:**
- **The human test.** The Lead's recommendation that it ships on today's rooms still waits for the owner's answer.
- **The other rooms' pictures.** They wait for the Room B test.
- **The game's rooms.** Until the owner approves a new room, today's approved rooms and places stay in the game.

**The owner's approval of the colour, the same day,** after seeing the one Room B test picture beside the first Option 1 picture and today's code-drawn Room B. Word for word:

> First let me comment on adding color to rooms ambient I really like the new color more vivid I approve it completely

**The picture:** PV1-P.
- It is on [the records page](https://claude.ai/artifact/DktwvLiaiYHRKTMpQLR97h), version 1794933523-24c0, sha256 `1f24a2cc4eefa6f982bff43612aa03c7327ba744a4aca61a61a9c20e7cb2ed0d`.
- It is AI-generated from the shared-view sheet's version 2 (pv1-shared, version 1794932851-a70e).
- It passed every check on the first attempt. In the colour check, 97% of its walls and deck are in Room B's family, at a median hue of 307°.

**What it decides:**
- **Room pictures are painted in their room's own colour family from the code,** as vivid as this picture. The approval covers the colour of every room's pictures, not only Room B's.
- **How the colour is held:**
  - each picture's guide is painted as the room's colour plan, in the family's five values;
  - the prompt names those values;
  - the colour check confirms the picture before it is used.
- **The reference for strength:** PV1-P is the reference for how strong the colour is.

**What it does not settle:**
- **The camera.** The owner wrote this as their first comment. Whether the rooms use Option 1 or a view from each place comes next.
- **The code's ambient in the picture's openings.** That test page is on hold until the camera is settled.

**A view from each place in Rooms A and B, the same day.** After the colour, the owner returned to the camera. Word for word:

> Honestly, I think the the idea of each player eye is better Idea because it helps game concept as each player can see Minimum 1 and Maximum 3  , because then some actions are not visible on some players and you should trust other players  what they saw inside room, what do you think before you act?

The Lead agreed, on one condition: the picture alone hides nothing. A rule must say who sees whom, and the server must do the hiding. The owner then wrote:

> About the option consider each room A and B can have maximum of 5 players . Each user can see 3 players.  What do you think?

> In your opinion what is the best angle for each person vision control 90 degree or 80 or something else

The Lead recommended about 90°. The owner then gave a design file, with a summary that begins:

> Check this and give me your feedback : This design gives each player a **personal, fixed view of Room A or Room B**, with one consistent blind spot when all five places are occupied.

The file is kept byte for byte at [room-visibility/gamen-room-visibility-design-v1.json](room-visibility/gamen-room-visibility-design-v1.json), sha256 `36edd4c7ade15cab02dbdfa64cd799edb27e9c3ee338cfb6aea35397ac1ba3df`. The Lead recomputed it from its coordinates, and everything matches:
- every list of who sees whom;
- all 32 combinations of occupied places;
- the margins, 7.6° inside the view for the nearest seen person and 25.3° outside it for the nearest unseen one.

[room-visibility/README.md](room-visibility/README.md) has the checks and the phone sizes. The Lead recommended adopting it with additions, and asked whether the Hospital and the Jail also need blind places. The owner answered:

> Because in Hospital and jail locations are fixed and defined by app and they are limited to 4 and private meeting room and task room they are fixed and limited to 2

The Lead then recommended one shared view for each fixed room. The owner:

> Yes go as your recommendation

**What it decides:**
- **Rooms A and B get a view from each place.** This replaces "Option 1, for now" (recorded above) for these two rooms. The geometry is the owner's file, layout `perimeter-five-v1`:
  - five places on the walls, each with a fixed view 90° across;
  - in a full room, each player sees three of the other four and is seen by three;
  - each player's blind place is just off their right shoulder, and nobody is seen from behind.
- **The Lead's additions, adopted with it:**
  - **Entry order:** B1 → A, B2 → B, B3 → C, B4 → D, B5 → E, and the same for Room A. Two players entering an empty room see each other, and any three see at least one other. Integration maps the places, keeping each place's functions.
  - **Presence is public:** the person in a player's blind place shows as a chip on the right edge, for example "Juno · out of view". That chip is also how they are targeted where the rules allow it.
  - **Compact rooms,** about 4–4.5 m across, so people stay near today's size.
  - **The picture may be drawn a little wider than the rule** (about 96–100°), so the people at the sides and their tags clear the screen's edges. The rule stays 90°, and the layout test decides.
  - **The camera** sits at eye height, about 1.6 m, looking level or a little down.
- **The fixed rooms get one shared view each, with no blind places.** Everyone in the room sees everyone:
  - the Hospital and the Jail have four fixed places;
  - the Private Room and the Task Room have two;
  - the Command Room has one.
- **Pictures:** 15 in all, five each for Rooms A and B and one for each of the other five rooms. Each is in its room's colour family from the code (the colour approval above). They are made after the owner sees the layout test.
- **New crew drawings:** each crew member is seen from the front and from about 35° and about 72° on their right. That makes two new angles each, 18 in all, shown to the owner before anyone draws them.

**What it means for the work:**
- **The Pre-game Animation builder** makes a layout test of Room B with exactly this geometry, with no new pictures:
  - the five views;
  - room sizes of 4, 4.5 and 5 m;
  - the 90° rule against a slightly wider picture;
  - the stand-in crew and the out-of-view chip;
  - tags and press areas at both phone sizes and at 100% and 200% text;
  - nobody half visible.
  - The Lead checks it, then the owner sees it.
- **Backend and Balance,** through Integration ([#222](https://github.com/Amirkianfar66/GameN/issues/222)), propose the observation rule for the owner's approval:
  - what a player who didn't see an action is told;
  - what the Board and the shared display show of it.
  - The server sends each player only what they saw.
- **Integration** maps the five places and the per-player projection. The Jail's four places are already with it ([#96](https://github.com/Amirkianfar66/GameN/issues/96)).
- **The image session** waits for a go after the layout test.

**What it does not settle:**
- **The observation rule.** Until it exists, the blind places hide nothing.
- **The human test.** The Lead's recommendation that it ships on today's rooms still waits for the owner's own answer.
- **Other rules.** Capacities, movement, targeting, the Blackout and private information stay as they are, except the Jail at four, which is with Integration.

**The view's settings, the same day,** after the layout test of Room B ([the test page](https://claude.ai/artifact/PyijGrLQSDyFa5zfVjNeac), version 1794956824-0ec9). It used stand-in crew and generated no pictures.
- The Lead had recommended a 100° picture in a 4 m room, looking 5° down.
- The owner asked, word for word:

> But why not 4 m 90 degrees or 95? One arm is not a big deal? Also we can little bit fake the perspective by some tricks?

- The test then measured 90° and 95° with the side-on drawings' width, and the two far people drawn 10%, 15% and 20% larger.
- The owner chose, word for word:

> Lets go with 4 m room, 95° slice, far two people 10% bigger and camera 5° down. Then I want to check with you the ratio Height and width , compare it with  in instagram ratio

**What it decides:**
- **Rooms A and B's views:**
  - a 4 m square room;
  - each phone shows a 95° slice of the view, while the rule of who sees whom stays 90°;
  - the camera sits at 1.6 m and looks 5° down, drawn as a raised horizon so that walls stay upright;
  - in each view the two far people are drawn 10% larger than true perspective, standing on their places, and the near one at true size. Who sees whom doesn't change.
- **The edge rule:** a person's face, name tag and tap area are always fully on screen. A hand or an elbow may cross the edge.
- **The paintings:**
  - each view is painted 120° across on the image tool's 1024 × 1536, with the horizon 747 px from the top;
  - any slice from 90° to 100°, level or 5° down, then fits both phones;
  - the slice and the size trick stay adjustable later, with no new pictures.
- **Room B's five pictures are approved:** in the approved purple, with one re-run each only if a check fails.

**What it means for the work:**
1. The Pre-game Animation builder makes the sheet for the five views from the layout test's geometry: colour-plan guides, the purple palette, flat black openings and a colour check.
2. The Lead reviews it and names it in the go.
3. The image session makes the pictures and records them.
4. Then comes a test page with the game's ambient and the stand-in crew, for the owner.

**What it does not settle:**
- **The 18 new crew angles.** They go to the owner before anyone draws them.
- **The observation rule** ([#222](https://github.com/Amirkianfar66/GameN/issues/222)).
- **The human test.**
- **Room A,** which follows Room B.
- **The height-to-width ratio,** compared with Instagram's. It is next.

**The ceiling, the same evening.**
- The owner asked to compare the room view's height and width with Instagram's. The room view is 390 × 653 on the 390 × 844 phone (1 : 1.67) and 430 × 741 on the 430 × 932 phone (1 : 1.72), close to Instagram's Stories shape (9 : 16, 1 : 1.78).
- The owner then explained, word for word:

> The reason i want to study it is because I feel now user view see a lot of ceiling and floor portion without that much use, i dont know how can we change the view or camera or ratio to make it better

- **What the Lead measured** in Mira's view on the 390 × 844 phone:
  - 44% of the room view is above the heads, 30% is people and 25% is below the feet;
  - a 95° slice on a screen this tall sees about 108° from top to bottom, so tilting the camera only trades ceiling for floor;
  - a narrower slice cuts the people at the edges.
- **The Lead offered three options,** drawn on the layout test picture:
  - A, a glass ceiling onto space, recommended;
  - B, a shorter 4 : 5 room with a strip for the action buttons;
  - C, bigger people, advised against: they would be too tall for the doors and benches, and their hands would miss the benches.
- The owner answered, word for word:

> Lets generate the image based on option A and ceiling be space Glass but not completely lets say partially we can see the image and then decide

**What it decides:**
- **A test of option A in Room B:** part of the ceiling is glass onto space.
  - The Lead reads "partially" as a round skylight over the room's open centre, about 2.2 m across (about a quarter of the ceiling), in a frame. The rest of the ceiling stays solid, with a ring of small lights around the skylight.
  - The glass is painted as a flat opening. The game draws the moving voyage in it, as it does in the windows.
- **One picture first:** Mira's view (place A), from Room B's five approved pictures. The owner decides after seeing it.

**What it means for the work:**
1. The Pre-game Animation builder adds the skylight to the five-view sheet's geometry, guides, region maps and prompts.
2. The Lead reviews the sheet and names it in the go for Mira's view only.
3. The image session makes that picture and records it.
4. A test page shows it with the voyage in the skylight and the stand-in crew, for the owner.

**What it does not settle:**
- **Whether the glass ceiling stays,** and its size: the owner decides after seeing the picture.
- **The other four pictures:** they follow that decision.
- **Option B,** a shorter room with a strip for the buttons. It is not part of this test.
- **Room A's ceiling.**

**The glass ceiling kept, the next morning.**
- PV5-A, Mira's view, was painted with the skylight in two attempts, the one allowed re-run included.
  - Both pass colour-check v3: the glass and the window are flat black (p95 lightness 0.067).
  - The room's shell, the skylight, its frame, the cross and the ring of lights match the guide.
  - Both moved the near furniture:
    - the near bench is drawn bigger and closer;
    - the console is wider;
    - Juno's stool is about 30 px left on the phone;
    - an empty panel was added on the north wall.
- The owner saw the second attempt (PV5-A-2) with still stars in the glass, beside the phone's view of it.
- The Lead asked two things:
  - whether to keep the glass ceiling;
  - whether a masked edit of about $0.06 may fix the furniture in this picture and in each later view that needs it.
- The owner answered, word for word:

> Yes keep the glass ceiling, go ahead with the fix you can spend it

**What it decides:**
- **Room B keeps the partly glass ceiling:** the round skylight over the open centre, as in PV5-A.
- **The furniture fix is approved:** a masked edit that puts the furniture back where the guide has it, about $0.06 each, for PV5-A and for each later view that needs it.
- **The other four views go ahead:** PV5-B to PV5-E, with one re-run each only if a check fails, and a masked edit where the furniture drifts.

**What it means for the work:**
1. The Lead makes the mask for PV5-A-2 (the near bench, the console, the stool and the extra wall panel) and gives the image session the go for one edit.
2. When the fixed picture checks out, the go for PV5-B to PV5-E.
3. The test page takes the fixed picture, and later all five views.

**What it does not settle:**
- **Room A's ceiling.**
- **The 18 new crew angles.** They go to the owner before anyone draws them.
- **The observation rule** ([#222](https://github.com/Amirkianfar66/GameN/issues/222)).

**Furniture placed by code, the same morning.**
- The owner looked at the Mira test page with the fixed picture (PV5-A-3) and the stand-in crew, and said, word for word:

> The position of the characters are totally wrong and not good

- The Lead sent the furniture before and after the fix, and asked what still felt wrong. The owner then asked, word for word:

> What if for furnitures which are in the area of room not attached to wall, we can use the code? What do you think? We can define a perimeter

- **What the Lead measured** on Room B's plan (`room-b-places.json`, sha256 `5ce20bc4…2d90e99b`). The room is 4 m across, and every place stands 0.32 m from its wall.
  - Four pieces stand by the walls, within 0.7 m:
    - Mira's tablet console, 0.19 to 0.59 m from the wall;
    - Juno's stool, 0.07 to 0.41 m;
    - Juno's laptop cart, 0.17 to 0.59 m;
    - Lyra's console, 0.27 to 0.67 m.
  - Two stand out into the room:
    - Atlas's bench, 0.20 to 1.25 m;
    - Vega's bench with its microscope, 0.43 to 0.94 m.
  - In PV5-A the picture model drew three pieces wrong, and two of them stand by the walls: Lyra's console and Juno's stool.
- **The Lead agreed, with two rules:**
  1. Anything inside a line about 0.7 m in from the walls is placed by code.
  2. So is any piece a crew member sits on, leans on or works at, wherever it stands. In Room B that is all seven pieces.
  - Everything else stays in the painting: walls, pipes, shelves, window, screen, skylight, lights and floor.
- **The pieces stay painted,** in the room's own style and light. The code only places them and decides what is in front. Plain shapes drawn by code would look stuck on.
- **Shown without generating anything:** Mira's view taken apart.
  - It uses PV5-A-3 and the empty-room picture from its own fix (`PV5-A-3-s1.png`, sha256 `096735ea…07df4c89`).
  - Their difference inside the fix's outlines gives three pieces on their own: Vega's bench with the microscope, Lyra's console and Juno's stool.
  - Put back over PV5-A-3-s1, the pieces rebuild PV5-A-3, with a mean difference of 0.045 out of 255.
- **The other views,** each in two steps:
  - the empty room first;
  - then one masked edit that paints its pieces inside their exact outlines, the step that fixed PV5-A.
  - This costs about $0.12 a view instead of $0.18. It is within the approval above: one picture, one re-run only if a check fails, and one masked edit a view.
- The owner answered, word for word:

> Yes we can test

**What it decides:**
- **A test of furniture placed by code in Room B,** by the Lead's two rules.
  - The painting keeps the room. The code places the pieces and the crew from the one plan.
  - A piece is drawn over a person only where the piece is nearer.
  - The pieces are painted, never plain shapes.
- **Mira's view is the test,** with the three pieces lifted from PV5-A-3. It needs no new picture.

**What it means for the work:**
1. The Pre-game Animation builder makes the next version of the Mira test page:
   - PV5-A-3-s1 as the room and the three pieces as layers;
   - each person in front of or behind the pieces by distance;
   - a report of which pieces cover whom.
2. The Lead checks the published page at 390 × 844 and 430 × 932 and sends it to the owner.
3. The builder reworks the kit for PV5-B to PV5-E (held by the owner; see below):
   - an empty-room guide for each view, drawn from the plan;
   - one edit's outlines and prompt for every piece the view holds;
   - no removal edits.
4. The other four views follow once the owner has seen the Mira test, within the approval above (held by the owner; see below).

**What it does not settle:**
- **The crew's facing.** The stand-ins still face the camera. The 18 new crew angles go to the owner before anyone draws them.
- **The line's distance in the other rooms.** Each room's sheet sets it.
- **The room view in the game.** The room scene takes the pieces as layers only after the test.
- **Room A's ceiling and the observation rule** ([#222](https://github.com/Amirkianfar66/GameN/issues/222)).

**The other views held, minutes later.**
- The Lead told the owner the other four views would start after the Mira test, about $0.12 a view. The owner answered, word for word:

> For now do not create other views

**What it decides:**
- **PV5-B to PV5-E are on hold:** no pictures, and the builder stops preparing their kit. The approval above stays, unused, until the owner asks for them.
- **Only the Mira test goes ahead.** It needs no new picture.

**The level to reach, an hour later.**
- The owner sent four pictures of Room B with the crew in it, painted together in one style, and asked, word for word:

> How we can reach this level? Explain me without applying

- The four pictures are on the reference page (https://claude.ai/artifact/2sTvJ2J2rYNWLFXaLanUbY, version 1794968151-5de5), with their sha256:
  - ref-1 `62d3e40c…cacc4d07`;
  - ref-2 `c5468def…edfa3cba`;
  - ref-3 `885842a9…1cb966c6`;
  - ref-4 `c874e430…cbf2f88a`.
- **The Lead's answer, applying nothing:**
  - **Why they look better.** The people are painted into the room, so the room's light and shadow fall on them, and they turn toward their work. The camera has straight lines. One person is near, one in the middle, one far. Warm orange lamps play against purple. Screens and props tell a story.
  - **Why the game can't use such pictures.** Any of the nine characters can stand at any place, and people move, eat, get hurt or leave, so frozen pictures would mean thousands of them.
  - **The way there:**
    - the room painted to this standard;
    - the people as layers, either painted per view or painted once per angle and lit by code;
    - the code's finishing: depth order, shadows, the room's light on the people, reflections.
  - **One rule stays:** a pose or prop comes from the place or the character, never from a secret role.
- The owner then answered, word for word:

> Lets test 1 view ,  1the camera  as you explained but we can cheat a little bir about characters to fit ,  2. Colors and lights as you recommended to improve 3. People's should be code because we need them in different status and action but we can test 1 view improving the code to be more close to the image more AAA quality also adding shadow effect and detail .What do you think?

**What it decides:**
- **A one-view test toward the owner's four pictures,** in Mira's view (place A) of Room B.
- **The camera.**
  - Straight lines, a normal camera, about 70° across, at eye level, with the 5° down kept as a raised horizon.
  - The crew's places on screen may be cheated a little so the three in view fit, near, middle and far.
  - Who can see whom does not change.
- **Colour and light,** as in the owner's pictures:
  - purple stays the base;
  - warm orange lamps and their glow, cream lamp cores, a little rust on worn edges, blue-green screens.
  - For this test this departs from Room B's approved colour family and from the colour check's limits (no brown; accents only teal, gold and paper).
- **People drawn by code,** because the game needs them in many states and actions. For this view they are raised toward the pictures:
  - turned toward their work;
  - the room's light on them;
  - shadows;
  - more detail.

**What it means for the work:**
1. The Pre-game Animation builder makes the test's sheet:
   - the straight camera and the cheated places;
   - the new colour plan, measured from the owner's pictures, with its colour check;
   - an empty-room guide, the furniture's outlines and the prompts.
2. The Motion & Cinematics builder draws the three people in view (Vega, Lyra and Juno) turned toward their stations. Sketches go to the owner before they are drawn in full. Then comes the code's light and shadow.
3. The Lead reviews both. One new room picture and one furniture edit (about $0.12, at most $0.18 with one re-run) wait for the owner's yes on the spend.

**What it does not settle:**
- **The spend** for the new picture: asked, and approved below.
- **Room B's glass ceiling** stays (decided above); its ring of lights becomes warm.
- **The colour family and the camera for the game.** Only the test changes; the tokens and the room scene change only if the owner adopts the result.
- **The other four views,** still held.

**The spend approved, minutes later.**
- The Lead asked whether to spend about $0.12 (at most $0.18 with one re-run) on one new room picture and one furniture edit. The owner answered, word for word:

> I approve

**What it decides:**
- **The test's two pictures are approved:** the empty room in the new camera and colours, and one masked edit for its furniture. One re-run only if a check fails.
- **The go comes after review.** The Lead reviews sheet PV6-A first, then gives the image session the go, naming the sheet's version and its hashes.

**The people chosen, about four hours later.**
- The two pictures passed their checks, and the room half of the test page was checked on phones. The Lead then sent the owner the people sketches (https://claude.ai/artifact/VQjScvvYG3DpQf7dGmNXE2, version 1794975865-38fc). With them went four questions, three with a recommendation:
  1. **Lyra:** A, seen from behind as she types (recommended), or B, looking back over her shoulder.
  2. **Juno:** A, a new side view looking down at her laptop (recommended), or B, the approved face looking up toward us.
  3. **Body shape:** keep the crew's current build (recommended), or try the taller build from the owner's pictures.
  4. **The go:** may the builder draw the three in full, with light and shadows?
- The Lead also told the owner the cost of the finish. It takes about 1.5 times as long to draw as today's people. That was measured on a test computer without a graphics chip, so phone speed is checked later, in the game.
- The owner answered, word for word:

> As you recommended

**What it decides:**
- **Vega, as sketched:**
  - the approved face, with the test tube held up before her eyes;
  - her far hand on the bench's near corner, fitted to the painted bench.
- **Lyra: A.** Seen from behind as she types at the console. The back of her head is a new view, drawn by code.
- **Juno: A.** A new side view, looking down at the laptop on her cart.
- **Body shape:** the crew's current build stays. Only these views and poses are new.
- **The go.** The fourth question had no options. The Lead reads the answer as yes: drawing the people in full, with the room's light and shadow, is the plan the owner set in "Lets test 1 view" above.

**What it means for the work:**
1. The Motion & Cinematics builder draws the three in full, with the light and shadow finish, against the real room. That means the furnished picture and the test page's layers. It publishes them on a test page for the Lead's review at 390 × 844 and 430 × 932.
2. After that review, the Pre-game Animation builder puts them in the test page's three places, in the same depth order, and the checks run again.
3. The Lead reviews the whole page, then sends it to the owner.

**What it does not settle:**
- **The other views:** PV5-B to PV5-E stay held.
- **Phone speed:** the finish's cost is measured on a phone, in the game, before anything is adopted.
- **The game's crew drawing.** Lyra's back view, Juno's side view and the finish stay in the test until the owner adopts the result.

**The test accepted, about three hours later.**
- The Lead sent the owner the finished test page: https://claude.ai/artifact/J6bLyir4qCZkutcC94HvUK, version 1794991147-9a35.
  - It shows the painted room, with Vega, Lyra and Juno drawn by code and lit by the room's lamps.
  - It asks one question: name tags at the people's feet (the Lead's recommendation, since there they cover none of the people), or where the game puts them now.
- The owner answered, word for word:

> I happy with the result this way to go. The labels as you recommended, the only thing i would add is a shadow

- The Lead asked two follow-up questions in the session's question dialog, each with its options. The owner chose:
  - for the shadow: **"Stronger people shadows"**, offered as "Make each person's shadow on the floor darker and clearer, so it shows on a phone";
  - for the next step: **"Start the other views"**, offered as "Begin the four other Room B views in this look, about $0.12 each for pictures (at most $0.18 with one re-run)".

**What it decides:**
- **Room B goes this way.** The test is the direction for Room B:
  - the straight camera with the owner's colour and light;
  - the painted room, with the furniture placed by code from the painting;
  - the people drawn by code, with the room's light and shadows on them.
- **Name tags sit at the people's feet.** Where there is no room there at the larger text sizes, a tag goes above the person's head and never over a face. This replaces the pack's place in this look.
- **The people's floor shadows get stronger,** darker and clearer at phone size.
- **The other four Room B views start in this look.**
  - The spend is approved: about $0.12 a view, at most $0.18 with one re-run, so at most $0.72 for the four.
  - This lifts the hold on PV5-B to PV5-E recorded above. They are now made the way the Mira test was made.
- **The rules stay:**
  - each new crew angle goes to the owner as a sketch before it is drawn in full;
  - each picture's go names a reviewed sheet and its hashes;
  - every picture is recorded as AI-generated.

**What it does not settle:**
- **The other rooms** still go room by room, as planned on 17 November, each with the owner's go.
- **The game.** The look reaches the game through Designer's room scene, with Frontend's and Integration's review. A check of the drawing's speed on a phone comes first.
- **The tokens and the room scene** change through Designer's PRs. This record approves the direction, not a release.

**The food capsule kept, minutes later.**
- The owner added, word for word:

> Just don't forget in each room you have a food capsule characters eating from eat like past

**What it decides:**
- **Every room in the new look keeps its food capsule and its eating visits**, as the ship-life package has them (#230). The owner approved that package on 11 November ("approved, go with a fifth wider"). It covers:
  - the capsule: a steel housing, a paper hatch, a tray, a vent and a light;
  - its three states: a warm glow when stocked, dark glass when empty, a steel shutter when not known;
  - the visit: after a turn, walk over, open, eat facing the room, put the wrapper back and walk home, in 6.5 to 7.7 s.
  - The Hospital has none, as approved then.
- **In Room B,** the Pre-game Animation builder gives the capsule a counter place in the new layout, as in view as it can be from the five places.
  - It is painted like the other furniture in every view that shows it.
  - Its light and shutter are drawn by code.
  - The people's visits are drawn by code with the new people.
- **Mira's view (A) was painted without it.** If the capsule falls in that frame, view A needs one more masked edit, and the Lead asks the owner for that spend first.

**What it does not settle:**
- **The capsule's exact place.** It comes with the staging of the four views, for the Lead's review.
- **The food contract.** The visits play in the game only once Integration and Backend give each room's food availability, with its audience, and the turn endings, as the ship-life package's adoption requirements say.

**One capsule for Room B, about an hour later.**
- The Pre-game Animation builder measured where the capsule could go in the five views. It tried counters and every 10 cm of the four walls, on both phones.
  - One unit is in view from at most two of the five places.
  - Two wall units, on the north and the west walls, reach all four new views.
  - All five would need a third unit, which means one more edit to Mira's view.
- The Lead asked in the session's question dialog: "Room B's food capsule: a single capsule can be seen from at most 2 of the room's 5 places, so most players would never see anyone eat. The 11 November design had one capsule per room. How many should Room B have?" The options were:
  - two capsules (recommended): on the north and west walls, each new view showing one, Mira's not, no extra cost;
  - three capsules: one more on the east wall so Mira's view shows one too, with one more edit of that picture, about $0.06, at most $0.12 with one re-run;
  - one capsule: "As designed on 11 November: one on Atlas's bench. Only Juno's and Lyra's views show it; elsewhere people walk out of view to eat. Atlas walks about 3 m around his bench to reach it."
- The owner chose **"One capsule"**.

**What it decides:**
- **Room B keeps one capsule, as the ship-life package has it:** a counter unit on Atlas's bench, at its north-west end, with its hatch facing into the room.
- **Only Juno's view (B) and Lyra's view (C) paint it.** Mira's view (A) needs no edit.
- **In the other views,** a visitor walks out of view to the capsule and back.
- **No extra cost.**

**What it means for the work:**
- **The staging for the four views,** set by the Lead under the owner's "we can cheat a little bit about characters to fit":
  - in D and E, the furniture is the same as in Mira's view;
  - in B and C, a station moves with its person where the view needs it, by up to 0.85 m (Juno's stool and cart in C);
  - every move is listed in the view's sheet.
- **The eating visit** is drawn by code with the new people, as the record above says. The staging carries each walk's path, including where the walker leaves and re-enters a view.

**The pre-game moves to Codex, about half an hour later.**
- The owner asked, word for word:

> I want the agent who responsible for Top bar and bottom bar work on , which is responsible for it? and what do you think if I handle the pregame & Global UI via Codex agents , because I feel the work of Claude is too heavy and Codex agents are free also the work of pregame UI is more related to server and front-end compare the in game , what do you think?

- **The Lead answered:**
  - The top and bottom bars are the Lead's: Designer's phone shell (#265), whose connection in the game is still under way.
  - Moving the pre-game screens to Codex fits, on three conditions:
    1. Codex builds from the approved phone pack, and the shared kit, the bars, the toasts and the banners stay one shared design.
    2. The Lead accepts each pre-game screen's look before it merges.
    3. The pre-game films stay with Designer.
- **The owner answered:**

> I agree but just Lets also path them animations pre game to have one source of truth for pregame , what do you think?

- **The Lead recommended** that Codex own the whole pre-game flow, including when each film plays, while Designer draws the films. Codex owning the films outright would also work, with one rule. The owner answered:

> As you recommended butI would  rather Codex owns the films outright, that works too, with one rule: Codex uses the characters, rooms and style exactly as Designer releases them, and any change to how they look comes to me first.

**What it decides:**
- **Codex agents own the pre-game, end to end:**
  - the pre-game and global screens: main menu and entry, host setup and lobby, join and waiting, recover, character selection, role stage and card, boarding, host controls and display settings;
  - their connection in the game;
  - the pre-game films, outright: the brand intro, the role films and the boarding film, with the paused pre-game animation test.
- **The rule,** in the owner's words: Codex uses the characters, rooms and style exactly as Designer releases them, and any change to how they look comes to "me" first. The owner quoted the Lead's wording, where "me" is the Lead Designer, and the owner approves any look as always. In practice:
  - the crew drawing, the rooms, the tokens, the shared kit, the shell's bars, the toasts and the banners are used as Designer releases them;
  - a change to any of them, or a new look, goes to the Lead first.
- **Codex builds the screens from the approved phone pack,** and the Lead accepts each pre-game screen's look before it merges, as for Frontend today.
- **The Designer builders hand over:**
  - the Pre-game & Global UI builder hands over its open work and stops;
  - the Pre-game Animation builder hands over its paused film test and keeps working on the rooms.
- **The integration owner (Codex Astra)** records the new split in AGENTS.md and the agent roster.
- **The handover is issue #311,** posted the same day. It lists the PRs with their order and state, the splits the Lead decided, the agreements Codex must keep, Designer's acceptance state and the builder's warnings. A comment on it says how the pre-game films are made. The Pre-game & Global UI builder stopped once it was up.

**What it does not settle:**
- **Which Codex agent** takes the work, and when.
- **The top and bottom bars:** they stay with the Lead. The owner's first question also asked for them to be worked on; what they want changed is still to be asked.
- **The open choices of the paused film test,** such as the ship through the window and whether its look goes beyond the Doctor test. They stay the owner's and pass to Codex with the test.

**A builder for the bars and the icons, and the Lead leads, minutes later.**
- Asked what they wanted done on the bars, the owner answered, word for word:

> I want to have a specific agent for the top , bot bar and icons , Icons means all Icons , because I want you to be responsible to handle the design lead not to build

**What it decides:**
- **A new Designer builder, "Designer · Bars & Icons",** owns:
  - the phone shell, which is the top bar, the bottom tab bar, the sheet frame, target bar, banners and toast, and the shared kit they are built from (#265);
  - the shell's connection in the game (#307);
  - every icon in the game, as their one source of truth.
- **The Lead leads and does not build.** The Lead's remaining building work goes to builders:
  - the bars and the kit to the Bars & Icons builder;
  - the room scene component and the room connection (#261, #284) to the rooms builder (until today, the Pre-game Animation builder).
- **The Lead keeps:**
  - the reviews at 390 × 844 and 430 × 932 before the owner sees anything;
  - the briefs and the coordination;
  - this record;
  - the posts on #4 and #222.

**What it does not settle:** the icons' single style. The new builder first inventories every icon and proposes one source. A change to how an icon looks goes to the owner through the Lead.

**The film test's source kept for Codex, about an hour later.**
- **The situation:** the source of the paused Doctor film test was only in one builder's session. That is 26 files under `design/pregame-animation/doctor-test/`: the face and hand drawings, the timing, the sets, the panels, the plates and the noir prototype. Its builder is the Rooms builder, until today the Pre-game Animation builder. The source was never pushed, as the owner's 16 November rule said: no branch until the owner likes a direction. Without it, Codex would have only the test pages' finished pictures.
- **The Lead asked, in the question dialog:**

> May the Rooms builder save it to GitHub as one branch, with no PR, so Codex can build on it?

- **The owner chose:** "Yes, one branch", the Lead's recommendation.

**What it decides:**
- **The branch:** the source goes to one branch, `claude/designer-pregame-doctor-test`, with no PR. Nothing in the game changes, and the test pages stay test pages.
- **The rule:** the 16 November rule is lifted for this handover only. The film test's direction is still the owner's choice.
- **What goes in:** the briefing-room prompts go in the branch as text, so Codex can read them. The owner's own pictures stay out, as they stay out of every image tool.

**What it does not settle:** whether Codex carries on with the test, and the test's open choices, which #311 lists.

**Room B's view D tried again from its plan alone, minutes later.**
- **What happened:** the go for view D (Atlas's view) gave two step-1 pictures. Both were painted well, and both failed the same-room check "every lamp in view lit at its place". The walls were off the plan's lines: the north-east corner sat about 90 px right of the guide's, and the east wall's lamp about 250 px off. Both pictures put the corner near where PV6-A-2 has its own corner. PV6-A-2 is the earlier picture sent with D's guide as the style reference. PV6-A's own first step, sent with its guide alone, had kept its walls on the guide's lines.
- **The spend:** the work stopped within the owner's limit, at about $0.14 of the $0.18 cap. Step 2 was not run.
- **The Lead asked, in the question dialog:**

> May we try D again from its plan alone, at about $0.12 more for D ($0.19 at most with one re-run)? B, C and E would be made the same way, within the spend you already approved.

- **The owner chose:** "Yes, plan alone", the Lead's recommendation.

**What it decides:**
- **D's retry:** step 1 is sent with D's guide alone (the sheet's one-picture prompt, s1-one), then step 2 runs as the sheet has it. That is about $0.12 more for D, $0.19 at most with one re-run.
- **B, C and E** take the same plan-alone first step once D passes, within the owner's earlier approval of about $0.12 a view, at most $0.18 with one re-run.
- **The checks are unchanged.** Each picture is checked against PV6-A for being the same room, and the Lead reviews it before the owner sees it.

**View B's capsule fixed, minutes later.**
- **What happened:** view D's retry passed and was accepted. View B then passed every gate, but its food dispenser came out about twice the approved counter unit's size in each direction. The sheet's capsule shape was about twice the closed housing's outline, and the edit fills each shape. The Lead held view C and asked for corrected sheets.
- **The Lead asked, in the question dialog:**

> Fixing it means one more furniture pass for B, about $0.07. That brings B to about $0.20, about $0.02 over its $0.18 limit. View C will use the corrected plan from the start, within its limit. May we do B's extra pass?

- **The owner chose:** "Yes, fix B", the Lead's recommendation.

**What it decides:**
- **B:** one more furniture pass (step 2) from B's accepted empty room, with the capsule's shape cut to the closed housing's own outline. That is about $0.07, about $0.20 for B in all.
- **C:** made from the corrected sheet, within its earlier limit.
- **The capsule** keeps its approved size, 0.24 × 0.40 × 0.22 m, so the light and hatch that code draws line up with it.

**One complete room to review, minutes later.**
- **The owner asked:** "When the First room test finish?"
- **The Lead answered:** the four new pictures in about an hour; the five views with the crew at their places in the afternoon; the walks and eating in the evening.
- **The owner wrote, word for word:**

> I would like to see 1 complete room with all possible views to review it

**What it decides:**
- **One page:** the owner reviews Room B as one page with all five of its views (A to E, each from one person's place), each complete. That means the painted room, the crew at their places with tags at their feet and their shadows, the food capsule with its light in the views that show it, and the walks to the capsule and the eating visits.
- **No in-between page** goes to the owner.
- **The Lead reviews every view** at 390 × 844 and 430 × 932 before the owner sees the page.

**The capsule painted in its own step, minutes later.**
- **What was found:** the Rooms builder measured view B's rejected picture. The capsule's shape had not been twice the housing; it was the housing plus the same 6 px as every piece. But the capsule and the bench were one connected masked shape. The model stood the dispenser on the bench top's near edge and stretched it up to the capsule's shape, so a tighter capsule shape alone would not stop a repeat.
- **The Lead asked, in the question dialog:**

> To get the food dispenser the right size in views B and C, it needs its own small painting step after the furniture, inside a tight outline. Painted together with Atlas's bench, the image model stretched it. That adds about $0.07 per view: B would be about $0.27 in all, C about $0.20, or at most $0.34 and $0.27 if a step needs its one re-run. Approve the extra step?

- **The owner chose:** "Yes, paint it separately", the Lead's recommendation, over drawing the dispenser in code.

**What it decides:**
- **Two steps for the furniture** in views B and C. Step 2 paints the furniture without the capsule. Step 3 paints only the capsule, in its own tight shape on the painted bench, at its approved size and place.
- **The cost:** about $0.27 for B in all and about $0.20 for C, at most $0.34 and $0.27 with one re-run.
- **The capsule stays painted,** like the furniture. Code draws its light and its moving parts over it.

**View E's stool painted in its own step, minutes later.**
- **What happened:** view E's empty room (step 1) passed every gate. Its furniture pass painted one long three-shelf cart across both the laptop cart's outline and Juno's stool's, and left out the stool. That is the same failure as the capsule: two pieces in one connected masked shape.
- **The Lead asked, in the question dialog:**

> The fix is the same as for the capsule: paint the stool in its own small step. That brings E to about $0.27 in all, or $0.34 at most if a step needs its one re-run, against its $0.18 limit. View C's stool gets the same fix inside its capsule step, at no extra cost. Approve E's extra step?

- **The owner chose:** "Yes, fix E", the Lead's recommendation.

**What it decides:**
- **View E:** step 2 is painted again without the stool, and step 3 paints the stool alone in its own tight shape. That is about $0.14 more, about $0.27 for E in all.
- **View C:** its stool joins the capsule in its step 3, as a separate shape, at no extra cost.
- **The rule for the sheets:** two pieces never share one masked shape. A small piece is painted in its own step.

**Two branches pushed, early that afternoon.**
- **The situation:** two pushes were waiting in the Rooms builder's session:
  - the film test's source, approved by the owner above;
  - the Room B sheet tools, which existed only in that session.
  - That session's safety check refuses an approval passed on by another session. It takes only the owner's own words there.
- **The owner wrote to the Lead:**

> Approve them instead of me

- **The Lead does not pass an approval into another session's check.** The Lead offered to push both branches from this session instead.
- **The owner's word then reached the Rooms builder's session directly.**
  - The builder reports the owner's message there: push both branches with no PR, with none of the owner's pictures, no generated pictures and no keys.
  - Its check still refused the tools commit, which holds 56 pictures drawn by the kit's own code. It asked the owner in its question dialog, and the owner chose "Include them (Recommended)".

**What it decides:**
- **The film test's source:** `claude/designer-pregame-doctor-test` at `85100444`, with no PR, on top of #285's `104a285d`. It is handed to Codex on #311.
- **The Room B sheet tools:** `claude/designer-room-b-sheets` at `c82dc861`, with no PR, one commit on `main`. Everything is under `design/room-b-sheets/`:
  - the generators and the make and verify scripts;
  - the guides, masks, split maps and plans;
  - the camera reports, staging and visits.
- **The 56 pictures in the tools are drawn by its own code.** None is generated and none is the owner's. That was checked by hash, and by the Lead on a contact sheet. To rebuild, the two generated reference pictures are placed from the records page and checked by their hashes.

**The Card tab moves to the right and shows the player's own character, minutes later.**
- **Where the Lead read it:** the owner's message in the Bars & Icons builder's session, in that session's own transcript (14:35 UTC). Word for word:

> So I need to update the bottom bar I want on the card icon move to right and become the rightest icon of bar then instead of it its Icon card show the character icon

**What it decides:**
- **The order:** the bottom bar becomes Board/Room · Actions · Pass/Vote · Panels · Card. The round button stays in the middle, and Card is the rightmost tab.
- **The Card tab's picture:** the player's own character, as the crew portrait the top bar already draws, in place of the card icon.
  - Designer reads "the character icon" this way. The owner is asked to correct it if they meant a drawn icon.
  - It is the viewer's own character, which every player can see, so nothing private shows.
  - Before characters are dealt, or with no portrait, the tab keeps the card icon. It is never empty.
- **It departs from** sheet 08 in all nine states, from 27 and 27.4–27.5, and from every sheet that draws the tab bar.

**Designer's proposals, for what the owner's words leave open.** The owner sees them on the Bars & Icons control page before the build is accepted:
- **Selected:** an amber ring round the portrait and the amber label, where the other tabs fill their icon.
- **Unavailable:** 38 %, as every tab.
- **Size:** the portrait round, in the icon's 26 px box.
- **The label** stays "Card", and so does the tab's accessible name. The portrait is decoration.
- **The private talk's "My card" button** (sheet 25) stays as it is. The owner spoke of the bottom bar.

**How it is built:**
- the Bars & Icons builder makes a new shell version on #265;
- the game's connection on #307 passes the viewer's own person;
- the Lead reviews it at 390 × 844 and 430 × 932.

**Turned heads for Atlas and Lyra as they walk away, that afternoon.**
- **What was found:** in Room B's walks, a walker seen from about 100° to 118° round showed the crew's straight back view on a side-on body. At phone size Atlas's read as a mask: a dark dome over a crescent of skin. Lyra's read better, thanks to her bun. Only approved heads were in use, so no new angle could go in without the owner.
- **The In-game animation builder drew a sheet:** each head beside today's, on a walking body at the phone's own size, three drawings each.
  - Atlas's is a new turned head: his quiff, the ear, the line of brow and jaw, the end of his moustache.
  - Lyra's is the side view already in the accepted module, never shown before.
- **The Lead asked, in the question dialog, with the sheet's link:**

> Room B walks: when Atlas or Lyra walk away at a slant (about 100°–118°), today's back-of-head drawing looks like a mask at phone size, especially Atlas's. The builder drew a turned head for each: a new side-on head for Atlas, and Lyra's existing side view. […] Which should the room page use?

- **The owner chose:** "Turned heads for both", the Lead's recommendation.

**What it decides:**
- **The angles:** Atlas's turned head and Lyra's side view are used from about 100° to 118° round while walking away. That is five of Atlas's drawings and 23 of Lyra's across the five views. The sheet counted 21 of Lyra's; the build counts 23.
- **Everywhere else, nothing changes:** the approved face nearer the front and the back view farther round.
- **Built and checked:** the In-game animation builder built both into all five views of the Room B page (1795016511-67f0). The Lead checked the band's edges:
  - Atlas: the approved face at 97°, his turned head at 101°, the back view at 119°;
  - Lyra: the approved face at 99°, her side view from 102° to 116°, the back view at 119°;
  - no drawing flickers between heads.
- **The rule for new angles stands:** a head the owner hasn't seen goes to them as a sketch first.
- **Lyra at her console in view E** stands, rather than walks, and is seen 97.5° round. The In-game animation builder showed two heads in place on both phones:
  - her side view, eyes on her console;
  - the approved face with its eyes down, turned towards the camera.

  The Lead chose her side view:
  - 97.5° is within the owner's "about 100°";
  - it is the owner's own choice for her turned head;
  - her eyes stay on her work.

  The other head read as a sleepy face turned over her shoulder. Both are drawings the crew already has, so nothing new was drawn.

**The Card tab's portrait is square, like the top bar's, at the same size, minutes later.**
- **Where the Lead read it:** the owner's message in the Bars & Icons builder's session, in that session's own transcript (15:07 UTC). Word for word:

> The shape of it should be similar to the top character icon not circular but cubic same size

**What it decides:**
- **The shape:** the portrait's own square tile, as the top bar draws it. This replaces Designer's round portrait above.
- **The size:** the top bar's, 32 px. This replaces the icon's 26 px box.
- **What stays:**
  - Card is still the rightmost tab.
  - The label is still "Card", and so is the accessible name.
  - With no character the tab shows the card icon, and at 38 % it is unavailable, as every tab.
- **In the Blackout's dark the tab shows the card icon.** The game gives no identities in the dark, so the portrait returns with the lights. Designer keeps that.

**Designer's proposal, for what the words leave open:** an amber outline round the tile, only while Card is open. The soft ring at rest goes, since the top bar's tile has none. The Lead reviews it at 390 × 844 and 430 × 932 before the owner sees it on the Bars & Icons control page.

**How it is built:**
- The Bars & Icons builder made it as shell 0.3.1 on #321 (`f0d52240`, its check recorded at `ebb2b869`: 66 of 66).
- The Lead accepted it at `bf95c1a0`:
  - in all 66 captures, only the Card place changes in the bottom bar;
  - the labels keep their level, and the tile is whole;
  - with no character, the tab is exactly as before.
- The game's connection on #307 takes it next, and the Lead reviews that again.
- The Lead accepted #307 at `68c9a296`. It has the square portrait, and keeps the player's own portrait while reconnecting.

**See the design before the tests, minutes later.**
- **Where the Lead read it:** the owner's message in the Bars & Icons builder's session, in that session's own transcript (15:22 UTC). Word for word:

> Before you run tests let me see the design first

**What it decides:** for any change of look, whether the owner asked for it or the Lead did, the owner sees the drawing before anyone spends time on checks. The order is:
1. The builder makes the change in the component itself. No recorded check and no test suite yet.
2. The control page goes to the owner's link as a draft. It says so at the top: the look only, not checked yet, and it may still change.
3. The Lead gets the same draft at the same moment and looks at it in parallel.
4. After the owner's OK come the recorded check, the test suites, the PR, the game's connection and its check, and the Lead's acceptance of the checked build.

**What stays as before:**
- The draft is built from the real component, never a mock, so the later checks cover exactly what the owner approved.
- A change that isn't only a look keeps the usual order: checks, then the Lead's review, then the owner. That covers behaviour, data, privacy and the game's connection.

**How a draft is kept, the same afternoon** (the Lead's rule for the builders, so a draft runs no tests):
- A draft stays uncommitted where the builder can keep it so.
- A builder's session may have to save and push every change. A draft pushed that way is committed with `[skip ci]`, and its draft PR says "Draft look: checks skipped until the owner's OK". The repository's checks run on pull requests, and GitHub skips them for a head commit that carries those words.
- The first commit after the owner's OK goes without `[skip ci]`, so the full checks run then.
- `[skip ci]` is never used on anything but a draft of a look. A fix that changes nothing drawn, such as moving a drawing into the one icon source, runs its checks at once.

**One more small edit for view C, half an hour later.**
- **What was found:** view C's step-3 picture (PV6-C-4) passed every measured check, but failed by eye in two places:
  - **The jar tops:** the three glass jars on the cart ended in a soft, blurred cut just under the stool's seat. Step 2 had painted them only up to its mask's edge, so the seam showed once the seat was painted behind them. Layering can't fix it: the jar tops are missing from the painting itself.
  - **The dispenser's left edge:** its left side faded softly into the books instead of having an ink edge.
- **The Lead asked, in the question dialog:**

> One more small masked edit would repaint just the jar tops and the dispenser's left edge: about $0.06, one call, no re-run. View C would end at about $0.30, about $0.03 over its $0.27 limit. Should we spend it?

- **The owner chose:** "One more small edit (Recommended)".

**What it decides:**
- **One edit over PV6-C-4,** about $0.06, with no re-run. View C ends at about $0.30.
- **The shapes:** the three jar tops, each in its own tight shape, whole and in front of the seat; and a narrow band along the dispenser's left side.
- **The order:** the Rooms builder's sheet (version 8), the Lead's review, then the image builder's one call.

**The bottom bar's icons painted, as the owner drew it, that afternoon.**
- **Where the Lead read it:** the owner's message in the Bars & Icons builder's session, in that session's own transcript (16:28 UTC), with a picture of the bar. Word for word:

> This is what i am thinking of bottom bar

- **The picture** is the owner's own. It stays in that session; it is not in the repository and is not published.
- **The draft:** the builder drew it in the real shell (#325) and put it on the Bars & Icons control page (version 8) for the owner and the Lead at the same moment, under the order above. The Lead checked it at 390 × 844 and 430 × 932 in all 14 states.
- **The owner's answer** in the same session (17:41 UTC). Word for word:

> I am ok with this new bar

**What it decides:**
- **Board, Actions and Panels are small painted tiles:**
  - the crew portrait's own frame, at its size (32 px) and in its place;
  - a warm orange ground, with the drawing in cream and a brown line.
- **The Card tab** keeps the player's own portrait. With no character, or in the Blackout's dark, it shows the card's tile.
- **The round button's icon** (Pass or Vote) is painted in orange. It turns grey when the button is unavailable.
- **An open tab** has an amber ring round its tile and an amber label. **An unavailable tab's** tile fades with its label.
- **Unchanged:** the words, the order of the tabs, the bar's height and where you tap.
- **One orange for every player,** as in the owner's picture. The page put the choice beside it: a player with a teal character, whose tiles stay orange. The owner asked for no change.
- **It departs from** sheet 08's line icons, in all its states and in every sheet that draws the tab bar.
- **Measured,** as tokens 0.5.0 measures (CIE76): the tile's ground `#EE8B3A` is
  - 40 from Red's accent `#FF8C8C` (the rooms were approved at 16–20),
  - 25 from the amber of interaction `#F1B84B`,
  - 20 from crew c1's accent `#B45A16`.

  The ground is fixed: it says nothing about a player, a team or a role.
- **Scope:** only the game's tab bar and the round button. Rows, sheets, the top bar and the kit keep their line icons.

**How it is built:**
- **Shell 0.3.2 on #325:** a change of look only, with no new input.
- **Icons 1.1.0:** the painted form sits beside the family in the one icon source, and the tiles read it from there. #325 is stacked on #313 for the source's guard, page and test.
- **The checks add:**
  - the tiles, the open ring and the faded tile;
  - the Blackout's card tile in the privacy check;
  - a test that the tile's frame is the portrait's own.
- **Then** #307's re-record and the Lead's review of the checked build.

**Not answered yet,** on the same page: the toast's place, and the two drafts for a long title at the largest text.

**The open drafts approved as the Lead recommended, minutes later.** The owner wrote to the Lead, in the Lead's session (about 17:50 UTC). Word for word:

> I approve all as your recommendation, I just want to see 1 room all the views to see its the way to go or not

**What it approves,** each as the Lead recommended:
- **The toast's place** (the Lead's proposal on the Bars & Icons control page). The toast never covers the top bar, the "Connection lost" banner or an open sheet's title. It takes the first free place below them. With nothing in its way it stays where it is today.
- **A long title at the largest text: both drafts together.**
  - **A:** a squeezed sheet's buttons scroll with its content.
  - **B:** when a title would take more than two lines beside Back and ✕, those two move to a row of their own and the title takes the full width, but only where that makes the head shorter.
  - Measured at 320 × 568 with the Largest text, the content's room goes from 16 px to 162 px. At 390 and 430 with the Standard text nothing moves.
- **The refused command's note** (R2 and A3, on the Promises page), accepted as drawn: a refused command's own words show in the open sheet, above its buttons.
- **The no-break polish** (on the same page): "Player 6" and a name with its seat no longer break across lines in the Pass line and the Promises rows. Promises' "name · time" lines keep today's breaks, which would otherwise add a line at 320.

**How they are built:** the bottom bar's tiles first, as shell 0.3.2. Then the toast, A and B as shell 0.3.3. Then Promises 0.1.1 and Actions 0.2.5 with the refused note and the joins. These change behaviour as well as look, so each keeps the usual order: checks, then the Lead's review, then the owner sees the checked build.

**What the owner wants next:** one room with all its views, to judge whether this is the way to go. That is Room B's page with its five views, which the Lead sends when it is whole.

**Room B, all five views, sent to the owner that evening** (about 20:04 UTC).
- **The page:** https://claude.ai/artifact/KsyaYkrFdS1qdgwQ6v3Fmp, version 1795032082-0b3d. The Lead reviewed it at 390 × 844 and 430 × 932 before sending it, and the builder holds it unchanged while the owner looks.
- **In every view:**
  - the painted room;
  - the crew at their stations, with name tags at their feet and the stronger shadows;
  - the skylight's sky, on one clock for every view;
  - the capsule's light;
  - the walks to the capsule and the meals.
- **Where a view's picture shows them:**
  - the wall window's sky in views C and E, with no home world. Its clock runs ahead of the skylight's, so nothing the ship passes is in both openings at once;
  - Room B's atom diagram on the wall screen in views B and C.
- **The controls:** the view, the phone, Live or Held, 100 % or 200 % text, the capsule's state, each visit alone, and "as in a match".
- **The Lead's checks,** on both phones:
  - every view passes, with no errors and no sideways scroll, and Held is still;
  - one known gap is left. At 200 % on the 390 phone, while Atlas walks out of view E, the accepted tag layout reports that one tag can't be placed clear (drawings 28 to 31 of 112). It comes from the room scene's tag rule for out-of-view chips, which the Lead fixes in the component.
- **Found and fixed in the Lead's review:** in view C, the laptop Juno leaves on the cart was drawn over the jars while Juno was away. It now keeps its place in the room's order, so the jars cover it as when Juno sits there.
- **View C's last fixes:**
  - the jar tops come from PV6-C-5;
  - the dispenser's left edge is drawn by code, in its own layer just after the capsule's, because the edit did not take there;
  - no further picture. View C ended at about $0.30, as approved.
- **Juno in view C** faces the camera, so the head is the approved face, looking down at the laptop as the owner chose for Juno in view A. At that size the lowered eyes can read as closed. The Lead asked the owner whether to keep it or have a "looking down, eyes open" face drawn, with a sketch first.
- **The question to the owner:** is this the way to go for the rooms?

## 17 November 2026: generated backgrounds and one noir filter for the pre-game animation test

**Recorded by the Lead Designer from the owner's messages in the Pre-game Animation builder's session.** The Lead read them there, in that session's own transcript (00:35 and 00:38 UTC), not from a summary.

**What was said.** The owner asked the Pre-game Animation builder:

> But why not work backgrounds we using  image generation, a mix method of images and code ( for parts with interactive and motion graphics)? What is your opinion ?

The builder agreed, with code kept for everything that moves or is the player's own. The owner answered:

> Yes , Then we can use a layer filter on all of them to give feeling of cyber comic Noir style and match 3 layer? What do you think?

**How the builder applies it,** as it told the Lead:
- **Who makes what.** The owner generates the background layers in their own image tool, from prompts the builder writes. Nothing in the builder's session can generate pictures.
- **Code keeps** everything that moves or is the player's own: the crew's acting, the lights, smoke and screens, the cosmic events, the card's mark, the gadget, the player's character and the seat.
- **The first location** is the briefing room, the Doctor test's first 3 s, in three layers: the view through the window, the room and the foreground.
- **The filter** is the same steps on every layer, tuned by depth, with a colour script for each location (steel, rust, cosmos).
  - It runs once, offline, on the plates, and Mira's drawings take the same grade.
  - Only the grain, the halftone and the vignette run on each frame, as layers of the page.
- **The teams' colours.** The filter pulls blues to teal, reds to amber and violets to magenta. Every plate is checked against each team's colour; its four test results are each at least 39.9 from every one.
- A prototype is on the builder's test page: the owner's Room A picture and three of its plates, before and after.

**What it covers:** the Doctor test's backgrounds and its finish, within the scope the 16 November direction [below](#16-november-2026-a-hand-inked-graphic-novel-world-for-the-pre-game-animation-test) set.

**What stays the same,** as for that direction:
- No sound on players' phones.
- The test's length, timing and privacy.
- Test pages only, with no branch or PR until the owner likes a direction.
- It is not part of the human test's deploy, and nothing in the deploy waits for it.

**What it doesn't change:** the game's approved crew (`design-0.9.0`) and rooms (`room-drawing-1.0.0`), the phone pack, and the art releases. No generated picture enters any of them.

**Before a generated picture goes beyond a test page** (the builder's advice, which the Lead keeps as the rule):
- The image tool's terms allow commercial use.
- Each picture is kept with its tool, its prompt and its date.
- The owner's two outside example frames are mood references, described in words. They are not given to a tool as pictures.

**What it leaves open:**
- **The ship through the window.** A generated Mothership would be a new design, which the boarding film would then have to match. The builder offered the owner today's ship, drawn in code. The owner chooses.
- Whether the method goes beyond the Doctor test, as for the direction below.

## 16 November 2026: a hand-inked graphic-novel world for the pre-game animation test

**Recorded by the Lead Designer from the owner's message in the Pre-game Animation builder's session.** The Lead read the message there, in that session's own transcript (23:46 UTC), not from a summary.

**What was said.** The owner wrote to the Pre-game Animation builder:

> Use our characters but redefine them into Create an illustrated science-fiction world with convincing three-dimensional depth and a hand-inked graphic-novel finish. Use strong silhouettes, expressive outlines, textured shadows, and worn materials. Build environments from layered machinery, exposed pipes, suspended cables, overlapping panels, and objects that suggest everyday use and repair.
>
> Organize dense detail around clear focal points. Use controlled colour palettes with selective luminous accents, giving each location its own atmosphere. Animate the world through drifting smoke, changing displays, operating machinery, passing objects, and layered depth. Preserve the clarity of the composition while making the environment feel active, inhabited, and larger than the visible frame.
>
> For cosmic events, extend this language into saturated colour, orbital geometry, swirling forms, and mysterious changes of scale.

**How the builder applies it,** as it told the Lead:
- To the ~4 s Doctor test only, which is its own scope.
- The same nine characters, redrawn in the new graphic-novel finish.
- New environments for the briefing room and Colony Nine, each with its own palette.
- The memory cut at 3,000 ms becomes a small cosmic event.
- The acting, the timing and the beats stay as they are.
- The rough pass in today's look stays on the test page, behind a switch beside the new one.

**What it covers:** the Doctor test's look. For this test, the new look replaces the approved characters' look, which the decision [below](#16-november-2026-no-animation-clips-for-the-test-the-pre-game-films-tried-as-pure-animation-the-animation-work-in-two) had kept.

**What stays the same:**
- No sound on players' phones.
- The film's length, timing and privacy.
- Test pages only, with no branch or PR until the owner likes a direction.
- It is not part of the human test's deploy, and nothing in the deploy waits for it.

**What it doesn't change:**
- The game's approved crew (`design-0.9.0`) and rooms (`room-drawing-1.0.0`).
- The phone pack, and every part being connected for the human test.
- The art releases. Nothing in `design/releases/**` or the crew's rig changes; the new drawings stay with the test.

**What it leaves open:** whether the direction goes beyond the Doctor test. That covers the other role films, boarding and the brand intro, and the game's own crew and rooms. The owner chooses after seeing the test.

**A minute later, story images first.** The owner sent the same direction again (23:47 UTC), ending:

> Before creating the animation let's create some images as story telling of. Doctor role imagine a dark story

So the builder drew "The Last Two Doses": eight still panels of the Doctor's dark story in the new finish, ahead of any further animation.
- Mira plays the Doctor. Everyone else is a faceless shape.
- The pictures carry no words.
- Every panel stays at least 30 (CIE76) from each team's colour.
- Panel 5 never shows what she chose.
- The 4 s animation test it had already started is on its own test page, with today's look behind a switch.
- Both are test pages for the owner, not in the game. Which panels the 10-second film tells is the owner's choice.

## 16 November 2026: no animation clips for the test; the pre-game films tried as pure animation; the animation work in two

**Recorded by the Lead Designer from the owner's answers in the Lead's session.**

**What was said.** The owner wrote:

> As I told you we can stop building animation clips for test, it is not something really needed for the game test, also I want to restyled the game

Before the Lead had answered, the owner wrote again:

> As I told you we can stop building animation clips for test, it is not something really needed for the game test, also I want to test some restyled game animations , because maybe for animations of pre-game we can use pure animations not motion graphic,  this is just for pregame animation parts and not related to test even we can divide animation agent to 2 , one working one in game animations the other pre game animation which feels more like pure animation.wjat do you think?

The Lead recommended three things.
1. **Stop the animation clips for the test.**
   - The brand intro 2.0.0 had just been pushed as a draft (#305). It stays parked.
   - The role films 2.0.0 were never started.
2. **Try pure character animation for the pre-game films,** starting with one short test: about 4 seconds of the Doctor's role film.
   - It goes on a test page for the owner, and is not part of the game test.
   - It keeps the approved characters' look, the 10-second length, no sound on phones, and the role films' privacy.
   - The brand intro stays as it is, since it is typing by nature.
3. **Split the animation work in two:**
   - the Motion & Cinematics builder takes the in-game animations, and until the test is out helps with screens the test needs;
   - a new Pre-game Animation builder takes the brand intro, the role films and boarding. It explores through test pages first, and opens PRs only once the owner likes a direction.

The owner answered:

> Yes let's go with your recommendation

**What it covers:**
- **No animation clip is built for the game test.**
  - #305, the brand intro 2.0.0, is parked: marked paused and not for review, with its branch kept.
  - #285, the boarding film 2.0.0, stays as accepted.
- **The pre-game films are tried as pure animation,** starting with the ~4 s Doctor test, by a new Designer session: the Pre-game Animation builder. Test pages come first, with no branch or PR until the owner likes a direction.
- **The Motion & Cinematics builder becomes the in-game animation builder.**
- **The earlier film decision is reopened for the pre-game films.** The boarding pilot's direction ([earlier the same day](#16-november-2026-the-films-follow-the-boarding-pilot-with-no-sound-on-phones)) stands until the owner chooses after the test.

**What stays the same:**
- No sound on players' phones.
- Each film's length, timing and privacy.
- The approved characters' look.
- No film holds a test release.

**What it leaves open:**
- The pre-game films' direction after the test.
- Whether #305 and #285 continue.

**Later the same evening.** The Pre-game Animation builder had sent its plan for the Doctor test: 0–4,000 ms, with Mira acting, on twos, from the rig and new face and hand drawings. The owner then wrote:

> Preanimations for now are not our concern for deploy human test

The Lead read that as a pause, and told the builder to stop. The owner corrected it:

> I would not say pause it it can work in parallel but as I told before pregame animations can continue the work and I review them but I don't need them for this deploy

So:
- **The pre-game animation work continues in parallel.** The owner reviews it through the Lead.
- **It is not part of the human test's deploy,** and nothing in the deploy waits for it.
- **The builder's approved plan stands,** with its test pages only and no PR.

## 16 November 2026: Designer connects its parts in the game, in four test releases; the films don't hold them

**Recorded by the Lead Designer from the owner's answer in the Lead's session.**

**What was asked.** The owner asked when a playable test deploy will carry the new work ([below](#16-november-2026-three-new-branches-for-the-hospital-panel-and-the-next-films)). The Lead explained the three steps after Designer finishes a part:
1. Integration reviews and merges it.
2. It is connected into the game.
3. Integration deploys it.

The Lead added that the connection is the slowest of the three. The owner asked:

> What is your recommendation

The Lead recommended:

> Let the Designer builders connect their own parts in the game, and release them as four test versions instead of thirty separate ones.

The order the Lead gave:
1. the five rooms (#261 and #284);
2. the top bar and tabs (#265, connected by the Lead) and Food (connected by Frontend);
3. the match screens;
4. before the match, with the new brand intro and role films.

The owner answered:

> Yes as you recommend, just I prefer I have a test playable without role movies, role movies can be created in parallel but they should not hold the test because these are pre game animations,

**What it covers:**
- **Designer writes the game-side connections for the parts it built,** as the Lead did for the rooms (#284).
  - This answers the [15 November](#15-november-2026-designer-connects-the-five-rooms-nothing-related-to-design-inside-the-frontend) decision's open item: who writes each connection.
  - Frontend reviews each connection, and keeps the game's data, commands, navigation and lifecycle.
  - Nothing Designer writes decides what happens in a match.
- **Four test releases, in the order above.** Integration reviews, merges and deploys each one as a single step. The writers:
  - release 2's shell connection: the Lead;
  - release 3: the Gameplay UI builder;
  - release 4: the Pre-game & Global UI builder.

  One writer per release keeps two sessions from changing the same game files at once.
- **The films never hold a test release.**
  - The role films are built in parallel, and each new version joins the game once it is accepted. Until then the game keeps today's films.
  - The owner named the role films. The reason given, that they are pre-game animations, also covers the brand intro and the boarding film's new version (#285), so the Lead applies it to them too.
- **Branches:** each connection is a draft PR on a new branch. This answer covers three:
  - `claude/designer-connect-shell`: release 2, the Lead;
  - `claude/designer-connect-match`: release 3;
  - `claude/designer-connect-pregame`: release 4.

**What stays the same:**
- Integration owns admission, merge and deployment, and sets the dates.
- The approved sheets govern the look, and a departure still needs the owner's approval.
- Each film keeps its length, timing and privacy.

**What it leaves open:**
- The dates. Integration sets them; the Lead asked on #222.
- Frontend's and Integration's agreement to Designer writing the connections. The plan is posted on #222.

## 16 November 2026: three new branches, for the Hospital panel and the next films

**Recorded by the Lead Designer from the owner's answers in the Lead's session.**

**What was asked.** On 16 November the Lead asked:

> May the builders create these three new branches?
> - `claude/designer-hospital-panel`: the Hospital panel.
> - `claude/designer-brand-film`: the brand intro.
> - `claude/designer-role-films-2`: the role films. The plain name already belongs to the role films you merged earlier.

The owner asked:

> Why we need new branches

The Lead explained three things:
- Each separately reviewable change gets its own branch and pull request (`AGENTS.md`).
- The existing branches hold accepted work that is waiting to be merged, and adding new work to one would reopen its review.
- The two films could share one branch, but the Lead recommended keeping them apart: the 2 s intro could be accepted quickly, while the eight role films take longer.

The owner answered:

> All three branches, when can I have the work to have a test deploy playable

**What it covers:**
- **`claude/designer-hospital-panel`:** the Gameplay builder's Hospital panel (sheets 23 and 43). It comes after Move (`actions-0.2.0` on #273), and its interface comes to the Lead before the build.
- **`claude/designer-brand-film`:** the brand intro 2.0.0, by the Motion & Cinematics builder, from #285's head.
- **`claude/designer-role-films-2`:** the role films 2.0.0, by the same builder, with the Doctor first, from #285's head.
- Each one is a stacked draft PR.

**What stays the same:**
- The interface comes before each build.
- The films keep their length, timing and privacy (the [film decision](#16-november-2026-the-films-follow-the-boarding-pilot-with-no-sound-on-phones) below).
- Integration owns merge and publication.

**What it leaves open:** when a playable test deploy will carry this work. That depends on Integration's merges and deploys, and on the game-side connections. The Lead asked Integration for its plan and dates on #222 ([6930095114](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6930095114)).

## 16 November 2026: the films follow the boarding pilot, with no sound on phones

**Recorded by the Lead Designer from the owner's answer in the Lead's session.**

**What was asked.** On 16 November the Lead sent the owner the Motion & Cinematics builder's new boarding film: #285, the pilot for the owner's AAA bar of [8 November](#8-november-2026-the-pre-game-films-again-as-aaa-animation), renewed on 15 November. The Lead asked:

> Is this the direction you want for all the films? The brand intro and the nine role films would come next.

> Sound: I recommend none on players' phones, because 7–9 phones playing in one room would never be in sync. Sound could come later on the shared display only. Is that OK?

Later the same day, the Lead listed the owner's open questions, among them "the direction and sound for the films". The owner answered:

> All as your recommendation

**What it covers:**
- **Direction.** Every pre-game film follows the boarding pilot's direction: its camera, its light, its impacts and its faster drawing method. The 2 s brand intro and the nine role films come next, each as a new version.
- **Sound.** None on players' phones. Sound on the shared display, for public moments only (boarding and ship travel), may come later. It is not started.

**What stays the same:**
- Each film's length and timing, and the approved style.
- The role films' privacy: nothing another player could read over a shoulder or hear.
- Reduce motion.
- Nothing live changes until a new version is accepted.

**What it leaves open:**
- The shared display's sound.
- The order of the films. The Motion & Cinematics builder proposes it, and the Lead approves.

The same reply answered three other questions:
- the rule question recorded [below](#16-november-2026-the-hacker-keeps-scan-after-a-wrong-final-code);
- a new branch for the end screen's Roles list;
- publishing the Pre-game builder's test pages.

The last two are not recorded here.

## 16 November 2026: the Hacker keeps Scan after a wrong final Code

**Recorded by the Lead Designer from the owner's answer in the Lead's session.** This is a rule answer. Integration records rules in the rule overlays, and Backend implements them. It is recorded here because it was given to Designer, with the screen it changes.

**What was asked.** On 16 November, with the Hacker's screens (#301, sheet 42), the Lead asked the owner:

> One rule question for you: **after a wrong final Code, can the Hacker still use Scan?** The design's prototype said "Scan stays available", but the rules record lists this as undecided.

The rules record is CODE-OPEN-02 in `rules/overlays/planet-navigation-code-owner-decisions-2026-10-25.json`: "Define Scan/button behavior after the one final Code submission fails. The failed submission cannot be retried and never unlocks Hack Spaceship; continued Scan availability was not decided."

The owner answered, with the questions above:

> All as your recommendation

The Lead had not yet given a recommendation on this question. It gave one in its reply to that message: keep Scan.

**What it covers:**
- After a wrong final Code, the Hacker keeps Scan, under its usual cooldown and limits.
- Unchanged: the wrong Code can't be retried, and it never unlocks Hack Spaceship.
- No new exception, limit or reset.
- On the phone, the Hacker's CODE WRONG card (#301) again says "Scan stays available", as the pack's prototype draws it. The Scan button's state still comes only from the projection's offers.

**Why the Lead recommended it:**
- No confirmed rule takes Scan away. The overlay closes only the Code and Hack Spaceship, so keeping Scan adds nothing, and taking it away would be a new restriction.
- The match has no round limit. Without Scan, a Hacker whose Code failed would have nothing of their own to do for the rest of it.
- It is what the approved pack's prototype draws.

**What it leaves open:**
- Integration's record of it in the rule overlay, and Backend's implementation and tests.
- Game Design and Balance (#5) may weigh its effect on what the Hacker can learn, and propose otherwise to the owner.

## 16 November 2026: Designer builds every part without waiting for Frontend

**Recorded by the Lead Designer from the owner's message in the Lead's session.**
- **The limit:** when the Designer team began on 15 November, the Lead set a limit on waiting work, stated in the team's set-up on #4. Each builder keeps at most one finished component waiting for Frontend. It writes the next one's interface, but doesn't build it until Frontend reviews or connects one.
- **What prompted the question:** on 16 November the owner asked for test pages of each part. The Lead explained that the main menu (#278) and Actions (#273) had only their interfaces, because their builders had reached that limit. The Lead then asked whether to lift it for those two.

The owner answered:

> But did not we aree on Designer Build the design ?

**What it covers:**
- **The limit is lifted, for every builder.** Designer builds each part as soon as the Lead approves its interface. It doesn't wait for Frontend to review or connect earlier parts.
- **The interface still comes first.** The builder writes it, and the Lead reviews it and posts it on #4 so that Frontend sees it. Then the build starts.
- **Each built part gets a test page** for the owner: a private claude.ai page, as the owner asked on 16 November.
- It follows the [15 November](#15-november-2026-designer-connects-the-five-rooms-nothing-related-to-design-inside-the-frontend) decision: nothing related to design inside the frontend.

**What stays the same:**
- Frontend reviews the code. Integration owns admission, merge and publication.
- Each builder works on one component at a time, in Designer's paths, on draft PRs.

**What it leaves open:** the order of the game-side connections for the new parts. They change the same game files as the room connection (#284), so the Lead sequences them after it.

## 15 November 2026: Designer connects the five rooms; nothing related to design inside the frontend

**Recorded by the Lead Designer from the owner's answer in the Lead's session.**
- The owner had played the deployed build and found that the room windows still don't move.
- The Lead explained that the room scene (#261) draws all five rooms, and that connecting it in the game was Frontend's work.

The Lead then asked:

> Still open for you: should I write the game-side connection for all five rooms myself, with Frontend reviewing it?

The owner answered:

> Yes lets do it for all 5 rooms nothing related to design should be inside of frontend

**What it covers:**
- **Designer writes the room connection.**
  - The game's room view draws Room A, Room B, the Command Room, the Hospital and the Jail through the room scene (#261), all in one release.
  - Frontend reviews it.
  - Integration admits it to the hosted build, adds `room-drawing-1.0.0` to the art bundles (DSN-REQ-18) and publishes.
- **Nothing related to design stays inside the frontend.**
  - The look and motion come from Designer's source in `design/`. The frontend keeps the data, the commands and the lifecycle.
  - A design that the game draws today in `apps/game` moves into Designer's components, and is replaced there rather than kept beside them.
  - This builds on the [14 November](#14-november-2026-one-visual-source-and-clear-ownership) decision.

**What it leaves open:**
- The order in which the rest of the frontend's design code moves: the room films, the private-talk capsule, the board's panels, the shell and the Designer team's screens.
- Who writes each of those connections.
- Designer proposes both on #222.

## 15 November 2026: the Card's empty Knowledge line

**Recorded by the Lead Designer from the owner's answer in the Lead's session.** The Lead asked:

> Should the Card's empty Knowledge line read "You have no knowledge of other players."?

The owner answered:

> As you recommended

The same reply answered one other question, about publishing evidence, which this record does not cover.

**What it covers:** when a player knows nothing about the other players, the Card's Knowledge view reads "You have no knowledge of other players."
- It is `CARD_SHEET_WORDS.noKnowledge` in the Card sheet: [#270](https://github.com/Amirkianfar66/GameN/pull/270), whose handoff is `docs/design/components/card.md`.
- It departs from sheet 31's words, "Your role starts with no knowledge of other players.", which state a rule about the role that the phone can't know.
- It follows T3's principle ([11 November](#11-november-2026-the-build-follows-the-pack)): the phone never works out from the rules what it is not given.

**What it leaves open:** nothing.

## 15 November 2026: Designer delivers the usable visual component

**Recorded by Integration from the owner's Integration chat.** The owner clarified the purpose of the direct-component workflow:

> We should not look for difference we should ask designer to also responsible to share the design not the frontend build it again

Applied with the owner's 14 November decision below: Designer is accountable for delivering the working reusable visual component and its assets in `design/`, with a preview using the same source and a concise integration handoff. Sheets and screenshots remain review material, not instructions for Frontend to build a second interface. Frontend connects authorized data, actions, navigation and lifecycle, and returns any source change to Designer. Comparisons remain integration verification rather than a cycle of independently rebuilding and correcting the appearance. The existing phone review gate, privacy boundaries and pinned historical releases remain in force.

## 14 November 2026: live visual review, direct component reuse and two phone sizes

**Recorded by Integration from the owner's later Integration message.** This supersedes conflicting workflow and capture requirements below, including the earlier generated-port allowance.

> Designer is responsible for the design and builds each visual component once, in design/. Frontend uses it as it is. Frontend connects data, actions, navigation and performance, and does not rebuild, restyle or copy it. If something doesn't fit, Frontend asks Designer to change the source.

The owner requires every phone-interface PR to demonstrate canonical-component use, captures from the deployed site or a harness with production headers at **390 × 844** and **430 × 932**, and Designer's explicit acceptance in the PR. Approved work must not be silently omitted; any deferral needs the owner's decision. These are the two development review sizes; broad screen-size coverage is deferred. Existing accessibility behavior and reduced motion are preserved.

The live review is [#222 comment 6883175136](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6883175136), followed by [the owner's iPhone evidence and Food-policy diagnosis](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6883358473). Earlier Food visual acceptance applies to its captured environment and does not prove production-header compatibility or full phone-pack parity. Existing historical records and pinned release sources remain unchanged.

## 14 November 2026: one visual source and clear ownership

**Recorded by Integration from the owner's Integration chat.** The owner identified duplicated visual work: "I feel like In the current workflow, some visual work is being implemented twice, and the ownership boundaries need to be clearer between Designer agent and Frontend agent, what do you think?" After Integration recommended the workflow below, the owner approved it: **"Yes all as you recommended"**.

The approved recommendation is summarized here; the bullets are not additional verbatim owner quotations:

- Designer owns the canonical reusable visual implementation: layout, styles, artwork, responsive composition, component states and motion. Preview and game use the same visual source.
- Frontend owns authorized-data wiring, user interaction, screen/navigation lifecycle, recovery, accessibility behavior and runtime performance. It consumes the visual source instead of rebuilding its appearance independently.
- Backend owns rules, permissions, outcomes, authoritative timing and disclosure. Integration coordinates the small component interface first, versioned adoption, technical review and release checks.
- Agree inputs/events, audiences and source ownership early; integrate one representative component before completing a large prototype. If packaging needs copies, generate and verify them from the canonical source rather than maintaining divergent visual code.
- Preserve the existing Designer visual approval gate. Recheck changed visible states and dependencies; reuse evidence only when Integration demonstrates that approved rendered inputs remain unchanged. Sheet exceptions still need Designer and owner agreement.
- Finish the frozen Food release without a new visual or architecture rewrite. Apply the workflow to subsequent new work or separately scoped component changes; preserve historical sources and pinned releases.

The detailed working agreement is [visual-component-ownership.md](../architecture/visual-component-ownership.md). This is a workflow decision, not approval of a new sheet, game rule, runtime import, framework change or deployment. Historical dev-only prototypes and fixtures remain excluded from production until a specifically reviewed runtime-safe component is adopted.

## 13 November 2026: Food test 1 correction approval

The owner answered Integration's focused approval request for [#241](https://github.com/Amirkianfar66/GameN/pull/241):

> Approve the focused #241 changes (Recommended)

The request named the half/empty-food wording, the neutral `After Food Supply · Round N` caption, and the small-phone fixes that keep names and controls visible. Designer's agreement and exact reference changes are in [the #240 review](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6859626835) and #241. The reviewed reference is now `3f4cb5e78a5e8d4f1bb17eb3487dcec26df6a594`.

| Sheet/state | Approved departure and reason |
| --- | --- |
| Food stock, including `food-stock-01`, `food-stock-02`, `food-flow-13`, and the Food-profile phone top bars | The owner's separately recorded gauge decision below replaces the earlier warning-banner proposal: a compact public food gauge beneath the clock, amber at one package or less and red at zero. Half/empty wording is retained for screen readers. This confirmation does not restore the superseded banner. |
| `FOOD_RETURNED` board checkpoint | Use `After Food Supply · Round N`, with the existing `Current board · shared:` prefix on a phone's current board. N is the Task round; the caption names the step, never the outcome or cause. |
| Food states at 320 × 568 / 200% text, including long names, Partner requests, sheets, banners and toasts | Keep complete names and partner state inside the view; allow wrapping and the specified scrolling; retain reachable Join/Decline/Cancel controls; stack sheet buttons when needed; keep room labels beneath overlays. The exact layouts are #241's sheets and handoff. |

This is the owner's and Designer's agreement to these focused presentation exceptions before the native port. It changes no gameplay, timing, resources or disclosure permission. It does not authorize the general #228 redesign or #230 ship life. Frontend must still provide refreshed native comparisons, and Designer must explicitly accept the implemented candidate in #240 before merge and deployment.

## 11 November 2026: the Food Supply Task

**The owner asked Designer to design Mothership's two-player Food Supply Task** from confirmed highlights, developing the design solution itself: the room, the operators, the mechanical paths, the hazard regions, the controls, the feedback and the crate's position for survivor completion. Designer's design is [food-supply.md](food-supply.md), a proposal.

| What the owner confirmed | Where the design meets it |
| --- | --- |
| "Initial food stock: five packages. Each successful supply delivery adds five packages." "Food warning appears when one package remains." | +5 on delivery; the warning banner at one package |
| "Each player consumes one dose at their Eating step. Not eating transfers them to Hospital under the existing Hospital rules." | Not designed here; an open item |
| "A volunteer selects a Partner. Tasks happen outside ordinary turns; Task travel is separate from normal movement." "Each player may initiate one Task total per match across Food and Engine. Partner participation can repeat without spending that initiation." | The Tasks sheet and the Partner choice; travel to the Supply Room and back without a move. **The one-Task limit was withdrawn by the owner on 12 November** (below): instead, the two who went for food cannot go the next round |
| "One participant controls vertical movement; the other controls horizontal movement." "Both can betray their partner using movement of the same controller: dropping the crate onto the other player, or driving a moving panel into them." "There is no separate attack button, special trigger, confirmation or armed mode." | The Winch raises and lowers; the Panel runs and locks the locking panel. The Winch's Lower while the swing has the crate over the console drops it on the Panel operator; the Panel's LOCK at the cab's stop drives the panel's blade into the Winch's cab (the crane, below; the first design was a gantry) |
| "There is no escape opportunity. An unblocked attack is lethal and does not send its victim to Hospital. Protection applies." "Each player has one attack opportunity. Its reset scope across repeated Task participation remains unspecified; do not silently choose it." | KILLED on the press; STOPPED under Protection; the opportunity comes from the server and the design never resets it |
| "After a partner dies, the survivor can complete the delivery alone if the crate is in the correct position. Otherwise the Task is lost." "A participant disconnect cancels the Task." | Over the platform is the correct position: the crate on it, or on the hook of the panel locked over it; cancelled after a grace |
| "Other players do not see the Task space on their phones. This does not automatically authorize public killer attribution or Protection disclosure." "The ordinary return flow restores participants to their previous positions, accounting for death and cancellation." | Only the participants' phones draw it; no attribution, no Protection shown; the return to each place |

The owner also asked for low puzzle difficulty with coordination and trust as the challenge, Machinarium as inspiration for expressive machinery, and Mothership's own look; and for genuine rule conflicts to be highlighted separately, with solutions inside the confirmed rules ([five of them](food-supply.md#genuine-rule-conflicts)).

**The same day, the owner answered two of Designer's open questions:**

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "other player can check on board who is not here so they can understand who went for task" | Who is away on a Task is public, through the board: the two participants' places are empty while they are away. The banner on other phones names no one. This settles rule conflict 4: after a death, everyone can work out the survivor, and no phone states it | [food-supply.md](food-supply.md#visibility); the flow sheet |
| "yes they can decline" | The asked Partner can decline. The request has Decline and Join. The time to answer stays PROPOSED (15 s, no answer declines). What follows a decline is the owner's answer of 12 November (below): the next volunteer goes | [food-supply.md](food-supply.md#the-phones); the flow sheet |

The owner asked what the other two questions meant. Designer put them in plain words, each with two answers and an example: is the one attack per match (A) or per Task (B); and does a blocked attack use it up (A) or not (B). The owner answered:

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "lets do something, to make it more interesting, for Task if Player A and B position and the result near each other and there is a small movement in both parts there is chance they kill each other by mistake!" | **Accidents.** Near one of the two (the crate over or beside the Boom operator, or the gantry at the cab's door), if both move at the same moment, the jolt can kill that one by mistake; otherwise it is a close call. An accident is no one's attack. Designer's reading: one of them dies, not both at once. PROPOSED then: a 1 in 4 chance, half a second, the two zones. **Superseded that evening by the owner's crane** (below): the dice are gone, and mistakes come from the timing itself | [food-supply.md](food-supply.md#mistakes-and-attacks) |
| "OK", to "is it OK that a blocked attacker will guess the victim was Protected?" | **Rule conflict 3 is accepted as designed.** A failed attack looks the same whether Protection or a spent attack stopped it, and no one else learns anything; an attacker who knows they still had their attack may infer Protection, and that is acceptable | [food-supply.md](food-supply.md#genuine-rule-conflicts) |
| "A and A" | 1. **One attack per match, not per Task.** If Hana attacks on one Task, Hana cannot attack on any later Task this match. The server holds it across Tasks.<br>2. **A blocked attack uses it up.** If Protection stops Hana's attack, Hana cannot try again, in that Task or a later one. Both were open items; the design never chose either | `design/food-supply/task.mjs`, the scenarios, [food-supply.md](food-supply.md#for-backend) |

**That evening the owner replaced the gantry with a crane.** Designer had built a playable timing sketch of the owner's idea (a private page, simple shapes); the owner said:

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "about the task it close to my idea , but i dont like it completely currently Hano is in left part lets move it to right part right of the platform package should land" | **The Winch's cab is right of the platform.** The rail's seven stops: the intake at 1, Cleo's console at 5, the landing platform at 6, Hana's cab at 7 | [food-supply.md](food-supply.md#the-concept); the layout sheet |
| "Cleo has a mechanism of locking system panel, which fast moving to right and left and the player you should lock it in correct position maybe by mistake it chose the position of Hano and it cut Hano ." | **The locking panel.** RELEASE sets it running end to end, fast (PROPOSED: 0.22 s a stop); LOCK stops it at the stop it is passing. Stop 6 is the correct one; locked at stop 7, its blade drops into Hana's cab: the cut, by mistake or not. **Since 12 November the panel clicks from stop to stop** (the owner's answer after Integration's review, below) | `design/food-supply/task.mjs`; the cut storyboard |
| "the crate also has a swining or pendulum movements make correct to not kill partner need attention" | **The pendulum.** A lock sets the crate swinging, wide at first, calming but never still (PROPOSED: 0.9 of a stop, settling to 0.38, a swing every 1.3 s). Lowered, it falls where its swing has it: over the platform it lands, over the console it falls on Cleo: the drop | [food-supply.md](food-supply.md#the-crane-in-numbers); the drop storyboard |
| "yes, rebuild the full Task with the new crane" | **The whole Task is rebuilt as the crane:** the model, the room and the machine, both phones, the storyboards, the films, the handoff and the tests. The gantry and its dice accidents are retired; kills by mistake now come from the timing | This entry's design, [food-supply.md](food-supply.md) |

**After midnight (12 November), the owner answered Designer's last question, and a side effect of the answer:**

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "lets not make it an attack because not the kill can be by mistake", to whether a kill by mistake should use up the presser's one attack | **A kill on the Task is not an attack.** It uses no attack opportunity, by mistake or not; the Task never reads or spends one. Settles rule conflict 5 | `design/food-supply/task.mjs`; [food-supply.md](food-supply.md#kills-mistakes-and-the-catch) |
| "1 OK", to "nothing limits kills on Tasks: a player could kill on every Task they join and say it was a mistake" | **Accepted.** Nothing limits how often a player kills on Tasks | The rules record (`task-kills`) |
| "Overall time if task to complete is 30 second", then "It should be inside it" (asked whether the briefing counts inside the 30 seconds) | **The whole Task takes 30 seconds, the briefing inside it** (the design had PROPOSED 45 s after the briefing). The timer on both phones counts down from 0:30 at the Task's start; the controls work for the last 26 s (with the PROPOSED 4 s briefing); at 0:00 the Task is lost | `TIMING.deadline` in `design/food-supply/task.mjs`; the timeout storyboard |
| "2 make the catch sometimes save by luck the luck is 25%", to "a CLANK! can now only mean the other player is Protected: OK, or should the safety catch also save people by luck sometimes?" | **The catch saves by luck, 25%.** A lethal press on an unprotected participant is stopped one time in four by the server's own roll, exactly as Protection stops it (CLANK!). So a CLANK! proves nothing. Settles rule conflict 3 again, more strongly | `CATCH` in `design/food-supply/task.mjs`; the scenarios `lucky-catch-cut`, `lucky-catch-drop`, `luck-runs-out` |

**Later on 12 November, the owner answered Designer's questions about starting and leaving a Task** (each with two answers to choose from, Designer's recommendation first, or the owner's own words):

| What the owner said | What it decides | Where |
| --- | --- | --- |
| Chose "Random", to "who decides which player runs the Panel and which runs the Winch?" | **The game assigns the controls at random**, so neither player can choose the control that is easier to betray with. It was PROPOSED | The rules record (`random-controls`); conflict 2 |
| "If the volunteer ask someone and that person says no , we should go to next volunteer", to "when does starting the Task count as used?" | **A refusal passes to the next volunteer.** The refused Volunteer does not ask someone else | The flow sheet (5); the rules record (`next-volunteer`) |
| "There is no rule for 1 task per match , the rule is that volunteer and it's partner can't go for food next round!", to "what happens to the Volunteer who was refused?" | 1. **There is no limit of one Task per match.** The highlight of 11 November ("Each player may initiate one Task total per match") is withdrawn.<br>2. **The Volunteer and their Partner cannot go for food the next round**, neither as a Volunteer nor as a Partner. They can go again the round after.<br>PROPOSED around it: the rule holds once a Task starts, whatever its outcome; a refusal starts no Task; the refused Volunteer can volunteer again from the next round | The rules record (`next-round`); the flow sheet (1, 2, 4 and 14) |
| Chose "Anyone who volunteers", to "who is the next volunteer after a refusal?" | **Anyone:** any other player who wants to can now start the Task and ask a Partner; the first to do so goes next | The rules record (`next-volunteer`) |
| Chose "Only the food count", to "after a Task, what do the other players learn about how it went?" | **Only the food count.** A delivery shows as the stock five higher, on every phone, naming no Task. Nothing else tells the others how it went, and a death shows as any death. It was PROPOSED | The flow sheet (11 and 12); [visibility](food-supply.md#visibility) |
| Chose "No cost", to "should leaving the Task on purpose cost the leaver anything?" | **Leaving costs nothing.** A deliberate disconnect is a disconnect like any other: after the grace the Task is cancelled and both go back, and a kill in the grace still stands. Settles what rule conflict 1 left open | Conflict 1; the rules record (`leaving-free`) |

**After Integration and Frontend reviewed the design (12 November, [#231](https://github.com/Amirkianfar66/GameN/pull/231)), the owner answered one more question, then approved its numbers.** Integration ruled that the server resolves each press when it receives it. With the panel sliding a stop every 0.22 s, a press's travel to the server alone would often have turned Cleo's LOCK at 6 into a cut at 7.

| What the owner said | What it decides | Where |
| --- | --- | --- |
| Chose "Click stop to stop", to "how should Cleo's locking panel move?" (Designer's recommendation; the other answer was a slower smooth slide) | **The locking panel clicks from stop to stop:** a fast snap to the next stop, then a rest there. A LOCK takes the stop it rests at, or the one it is snapping to, so each stop takes a LOCK for half a second, longer than a press's travel. A late LOCK at 6 still cuts the Winch operator. PROPOSED around it: a 0.1 s snap, a 0.4 s rest, and warnings that start 0.15 s early | The rules record (`click-stop`); `TIMING` and `sweep()` in `design/food-supply/task.mjs`; [food-supply.md](food-supply.md#presses-are-judged-when-they-arrive) |
| "this is fine", to "the exact click timings (a 0.1 s snap, then a 0.4 s rest at each stop) and the 0.15 s early warning are my proposals" | **The click's numbers and the margin are the owner's:** a 0.1 s snap and a 0.4 s rest, a stop every half second, and warnings that start 0.15 s before a danger. No real phone or network has tested them: a playtest can still show that they need to change | `TIMING` in `design/food-supply/task.mjs`; the rules record (`click-stop`); `mechanics.sweep` and `mechanics.margin` in the handoff |

**Then the owner asked Designer to decide what Integration listed before the Task can be played:** "Integration lists rules the Task still needs before it can be played, such as when Tasks can start and how eating works as you recommendation" (12 November 2026). Designer's recommendations are therefore the owner's decisions. Each fits the round as the rules have it at the base commit; none changes a rule file.

| What Integration listed | Designer's recommendation, now the owner's | Where |
| --- | --- | --- |
| When a Task can start; how many a round; whether two can run at once | **The Food Supply step**, at the start of each round, after any Captain election and before the pre-turn window.<br>- 30 s to ask; a request made in time keeps its 15 s to answer.<br>- One Task a round at most, never two at once.<br>- Nothing else happens in the step | The rules record (`food-step`); [Playing the Task](food-supply.md#playing-the-task); the flow and states sheets |
| Who can be asked | Two living players outside the Hospital and the Jail, neither of whom went for food last round | `who-can-go` |
| The edges of a refusal | One request at a time; the first to reach the server counts.<br>- 15 s to answer; no answer declines; a withdrawn request is a refusal.<br>- After a refusal, anyone else may ask while the step lasts. The refused Volunteer cannot ask again this round but can still be asked.<br>- The request and its answer are private to the two | `asking` |
| The edges of the next-round rule | It holds once a Task starts, whatever its outcome. A refusal bars no one. It bars the Food Supply step only | `next-round-edges` |
| Return positions and forced transfers | Both come back at the same moment whatever happened, 32.5 s after the start, to the place the server recorded. So the time tells the others nothing. No forced transfer can come during a Task: nothing else happens in the step | `return-place`; `RETURN_AFTER` in `task.mjs` |
| Eating's units and cadence | A package holds **two doses**.<br>- Each living player outside the Hospital eats one dose at the end of their own ordinary turn, in the Jail too.<br>- With the stock short, the turn order decides who eats.<br>- The hungry become Injured at the round's end and go to the Hospital under its existing rules.<br>Five packages are ten doses: one delivery a round feeds up to ten | `meals`; `FOOD.dosesPerPackage` |
| The food count and its warning | Public on every phone, in packages; the warning while one package or less remains | `food-warning` |
| The Blackhole; whole-reality Sync | No Blackhole is active during a Task, because the step comes before the pre-turn window, where a Blackhole is chosen. Every reality inherits what the Task decided: deaths, Protection used, the delivery, who went. Meals and hunger follow the selected reality, like any physical effect | `no-blackhole` |
| Clone (Integration's review) | Clone does not stop a Task hazard: only applicable Protection, besides the catch's luck | `clone` |
| The disconnect grace (Integration's review) | 8 s | `disconnect`; conflict 1 |

**On 13 November 2026 the owner answered what Integration's re-review left ([#231](https://github.com/Amirkianfar66/GameN/pull/231#issuecomment-6837524713)), on Designer's recommendation**, and asked for "a test playable version for me":

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "Hunger details approved" | **The hunger order:** at the round's end, after the retained attacks and actions are resolved and before Rescue, each player who went hungry becomes Injured, in the round's turn order, and goes to the Hospital under its existing rules. A player already Injured or Eliminated by then gets nothing more. A hungry player can be healed from the next round, like any injury | The rules record (`hunger-order`) |
| "The last timing numbers approved" | **The rest of the timing is the owner's, as designed:** the 4 s briefing; the swing (0.9 of a stop, settling to 0.38, a swing every 1.3 s; 0.25 after a raise); the landing zones (0.3 and 0.42 of a stop); 0.45 s to raise and 0.3 s to fall; the 2.5 s outcome card inside the 32.5 s return. A playtest may still change them | The rules record (`timing-final`); `TIMING`, `SWING` and `ZONES` in `design/food-supply/task.mjs` |
| "A slower mode for players who react slowly … none for now" | **No slower mode for now.** A player who cannot play the timing can decline, or not volunteer. Decided again after a playtest | The rules record (`no-slow-mode`) |
| "have a test playable version for me" | **A practice run on one phone** against a bot partner (careful, clumsy, a betrayer or a surprise), with a chosen connection delay; the design's own model plays the server. It found the two keys refusing each other when turned together, now fixed | [Play it](food-supply.md#play-it); `design/food-supply/play.html` |

**Later on 13 November 2026, after playing the practice, the owner changed two things** ("I happy with what I tested it was helpful"):

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "For Winch rise and lower, let's change it to hold and release. So there is 1 button user keeps pressing it to package be up and not press it package release down, if user release it in wrong position the package will break and user should pick an other package" | **The Winch is one button, Hold.** The finger down lifts the crate and keeps it up; the finger off lets it fall. Let go over the platform, with the panel locked, it lands; over the console, it falls on the Panel operator and breaks; anywhere else it **breaks**, and a new crate waits in the intake: the Panel brings the hook back over stop 1 and the Winch holds again. A broken crate costs time, not food.<br>Designer's choices inside it (PROPOSED): over the hatch it drops back in, whole; from a moving panel it breaks even over the platform; a finger already down lifts the crate as soon as the hook is over it; a let-go is never stale; after a stopped drop the brake holds the crate until the Winch holds again.<br>It leaves only the Panel a way to kill and still deliver: the drop always loses the Task now (kept by the owner, below) | The rules record (`hold-release`); [Hold and let go](food-supply.md#hold-and-let-go); `act()` and `fallOf()` in `design/food-supply/task.mjs` |
| "For Panel I want make it harder for user so the speed of left and right movement be twice faster so it would be harder for the user to react" | **The panel clicks twice as fast:** a 0.05 s snap and a 0.2 s rest, four stops a second (first a 0.1 s snap and a 0.4 s rest). The 0.15 s margin stays, so LOCK's glow at a stop lasts 0.1 s, and on a slow connection a LOCK made in it can take the next stop | The rules record (`panel-speed`); `TIMING.move` and `TIMING.rest` |
| "Then let me test it again" | The practice plays both changes, at the same address | [Play it](food-supply.md#play-it) |

**Then, after the second test, the owner answered Designer's two questions** (13 November 2026):

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "Is the faster panel too hard after your test? I approve its okay" | **The panel stays twice as fast:** the 0.05 s snap and the 0.2 s rest are the owner's, with the 0.15 s margin | The rules record (`panel-speed`); `TIMING` |
| "If a crate falls on Cleo, should it stay whole, so the Winch can still kill and deliver? … Task will lost" | **A drop loses the Task:** the crate breaks, and with the Panel operator dead no one can fetch another. Only the Panel can kill and still deliver, by the cut after the landing. Conflict 2 is settled | The rules record (`hold-release`, conflict `survivor-paths`); [Hold and let go](food-supply.md#hold-and-let-go) |


**On #233 the owner adopted the practice's four Hold behaviours** (13 November 2026, [#233](https://github.com/Amirkianfar66/GameN/pull/233#issuecomment-6849280539); Integration recorded it in `rules/overlays/planet-food-task-owner-decision-2026-11-12.json`, `adopted_hold_continuations`). Designer had marked them PROPOSED:

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "Adopt all four practice behaviors (Recommended)" | **Let go over the hatch, it drops back in, whole. It lands only from a locked panel. After a stopped drop the brake holds the crate until the next Hold. The early Hold:** Hold works whenever a crate waits in the intake; a hold made before the hook can lift the crate waits, lifting nothing, and the hook lifts the crate the moment the panel is locked over stop 1 and the crate is in. The Winch's phone shows Hold pressed in and "Waiting for the hook", never lifted; the waiting hold is the Winch's alone | [Hold and let go](food-supply.md#hold-and-let-go); the rules record (`hold-release`); `canLift` in `design/food-supply/task.mjs` |

**Then, for Food test 1, the owner answered Designer's #222 questions** (13 November 2026, [#240](https://github.com/Amirkianfar66/GameN/pull/240)):

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "no lets just visually show the food number maybe with some lines on the device something integrated with device", then "(a) Recommended" | **The food count is a gauge, not a warning.** It is on every phone, always, in the top bar with the clock, under it in the clock's column so the bar keeps its width. It shows the supply icon, one line a package with a short line for a half, and the figure ("4½"). It is amber at one package or less and red at none. There is no warning banner and no words on screen; screen readers hear "Food low: ½ package left" | `phone.mjs` `foodGauge`; the handoff's `food.gauge`; the rules record (`food-warning`) |
| "After the Task, the board caption reads 'After Food Supply · Round N' … Yes" | **The return's caption** is "After Food Supply · Round N", or "Current board · shared: …" on a phone's own current board. It names the step only: never a delivery, a death or a cause | The Visibility table in [food-supply.md](food-supply.md#visibility); `VISIBILITY.others` |
| "small phones as you recommended" | **Small phones at the largest text:** Join and Decline stay in sight; banners keep their title; names stay whole, and a tag may take two lines; a sheet's buttons stack; the room's name sits under menus | The Large text section of [food-supply.md](food-supply.md#the-phones); `phone.css` |

**What it does not decide:**
- **The proposals.** What is still marked PROPOSED (the cues' animation timings, a turned key staying turned, the room's colours, the vibration on danger) waits for the owner. The food economy and all the Task's timing are the owner's; Game Balance can check the economy with a simulation, and a playtest may change the timing. How a press is timed is Integration's direction, not the owner's: the server resolves it on arrival. The catch's 25% is the owner's number. The [open items](food-supply.md#open-items) list them.
- **The game.** No rule, contract, engine or ruleset changes here. Backend implements the rules, Integration owns the contract, and a ruleset version adopts the Task; until then nothing is playable.
- **The owner's detailed handoff file.** `docs/design/food-supply-requirements-2026-11-11.md` and its concept images were on the owner's computer, not in the repository; the design follows the highlights above and will be reconciled with that file.

## 11 November 2026: the build follows the pack

**The owner asked whether the game uses Designer's design in every part, from the menu to the end of a match.** Designer set each part of Frontend's native interface beside the pack's screen for the same state. Of 49 parts, 4 are the same, 8 are close and 37 differ ([the native review](phone-ui-native-review.md#part-by-part-from-the-menu-to-the-end)). The owner asked why, and approved Designer's proposal to fix it.

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "Another question does the game and frontend using exactly your design for each part of app?", then "I mean in all part of game from menu to end of game what are the differences" | Designer compares the native interface with the pack, part by part, and records each difference with its picture | [phone-ui-native-review.md](phone-ui-native-review.md) and its evidence |
| "Just a question why this difference happened and can we solve it to frontend follow exactly the designer claude work?", then "Yes do it" to Designer's proposal | 1. **The phone pack is the specification.** Frontend builds the phone interface from the pack on `main`, each sheet as drawn: its layout, controls, words and behaviour. It cannot match pixel for pixel, since sample matches and real phones differ.<br>2. **A change is an exception.** A change from a sheet needs Designer's and the owner's agreement first, and is recorded on this page. A rule, test or platform reason found while building comes to Designer as a question, not as a quiet change.<br>3. **Designer accepts before a merge.** A pull request that changes the phone interface merges after Designer's visual acceptance, given from a side-by-side of the states it changes.<br>4. **Frontend gets one fix list,** in priority order, with three trade-offs to settle together instead of copying the sheet blindly | This page; [phone-ui-native-review.md](phone-ui-native-review.md); Frontend's fix list, [#222](https://github.com/Amirkianfar66/GameN/issues/222) |
| "agree with T1–T3", answering Designer's recommendation for each of the three trade-offs | **T1, the room's framing.** The room fills the space between the bars, as drawn. Nobody present is cut off: when the people in the room are spread wider than the filled view can show, the view zooms out just far enough to keep each of them whole on screen, and the bands this leaves are the cost. Only a crowd as wide as a full Jail needs it. *(Corrected the same day, #222: whole means each figure as drawn, not only its press area, so a full Room A or Hospital also zooms out a little at some sizes. The decision is unchanged.)* The framing depends only on who the lit room already shows, and it is held still from lights-out to lights-on. This replaces the framing that never depends on who is present (#208), which kept every room small.<br>**T2, Cancel.** While a target is chosen, Cancel is in the target bar, as drawn. The centre button is not turned into Cancel.<br>**T3, actions that are not available.** Every action of the role is a tile, as drawn. The ones the server offers can be used. The others are greyed, with the reason the server gives; where it gives none, the tile says only that the action is not available now. The phone never works out a reason from the rules itself | `phoneFrame` in `design/phone-ui/prototype/art.mjs`; the [handoff](phone-ui-handoff.md#the-shell)'s Room scene, Target bar and Tile; [#222](https://github.com/Amirkianfar66/GameN/issues/222) |

**What it does not decide:**
- **The merge gate itself.** Merges are Integration's, and so are `AGENTS.md` and CI, where such a gate is written. The gate applies once Integration adds it. The owner's instruction to Integration asks for that.
- **The data T3 needs.** Whether the projection carries the reasons and the limits (such as "2 injections" or "From Round 4") is Integration's and Backend's to settle. Until it does, a tile without a reason says only that the action is not available now.
- **The game's rules.** The pack draws the rules; it does not make them. Where a sheet and a rule disagree, the rule stands until the owner decides it in the decision register.
- **When Frontend does the work:** that is Frontend's plan, with Integration.
- **Phones.** The comparison was made in desktop Chromium with Frontend's review harness and its sample matches. It shows what each screen draws, not how it behaves on a phone or in a live match.

## 10 November 2026: the glass stays, and the rows line up

**After Integration's review of the pack, the owner looked at the corrected sheets.** The pack's account is in [phone-ui.md](phone-ui.md).

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "keep the glass at 56%" | The glass sheets keep the level the owner chose on 9 November: the room behind a sheet at 56%, with its tint and blur. To keep every letter at 4.5:1 over the brightest art, light words on glass carry a soft dark halo instead, which darkens only what is right around each letter. Designer had proposed 46% | Every sheet with a glass sheet; the [handoff](phone-ui-handoff.md#the-shell), "Sheet" |
| "also in sheets I saw vote results or some other results panel which the character Icon is not match with right number right to it vertically and in terms of size" | Where ballots and results become rows (larger text), each portrait is the size of the seat number beside it and on the name's line, and the vote count matches them. In the 3 × 3 results, "You" moves to the top-right corner so it no longer covers the vote count | Sheets 35–38, 53, 56 |
| "why  we have under each the N votes text again, I think the number is clear" | A result says each player's count once, by its badge: the "N votes" line under the name is gone from the 3 × 3 and the rows. The cell's accessible name still says "Player 2, Ben, 4 votes"; reasons such as "In Jail" stay | Sheets 37, 38, 51, 54, 56 |

**What it does not decide:** how the halo looks on a phone's screen; it was measured in desktop Chromium only.

## 9 and 10 November 2026: a ship that moves

**With the top bar settled, the owner asked for rooms that are not static.** Designer drew Room A first and sent a short silent video before doing the rest, as the owner prefers. The pack's account is in [phone-ui.md](phone-ui.md#ambient-motion-in-the-rooms-sheet-55).

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "Perfect some other points make the result better is : The monitors and screens look not static. Windows of spaceship in any room not static feeling like the spaceship moving in space. Some color buttons and lights on/ off generally some dynamic environment" | Every room gets an ambient layer: space goes by in its windows, screens retype, scroll and ping, keys and small lights go on and off. It is decorative and the same on every phone | `ambient.mjs`, `ambient.css`; sheet 55 |
| "Room A is fine just for the window i try to create different stars planets effect to make the vast space interesting" | Room A's window shows a voyage: its planet leaves and returns, while a ringed giant, a moon, a comet and asteroids pass, stars drift at three depths, and dust, a galaxy and shooting stars go by. Since made one voyage for the whole ship (below) | Room A |
| "Lets create a window for Room B too" | Room B's middle screen becomes a three-pane window with a voyage of its own, since made part of the ship's one voyage (below). Its atom diagram moves to the small screen on the right wall, where the slit window was | Room B |
| "Yes i am happy you can go for all rooms" | The Command Room and the Hospital get voyages too; screens, keys and lights move in every room. The Jail, which has no window, and the private-talk capsule get quieter motion: a cursor, a scan, light along pipes, blinking lamps, and dust in a lamp's light | Sheet 55; the review copy's videos |
| "just a question the windows motion outside of all rooms are align together? because overall the complete spaceship passing space", then "yes align them" | One voyage for the whole ship: one sky, the same things passing every window and reaching the Command Room first, then Room A, Room B and the Hospital, 6 s apart; one speed for each depth; one cream world sinking and rising in every window together; and one clock, so every room and phone shows the same moment and switching rooms carries on. Room B's teal planet becomes one of the things the ship passes | `ambient.mjs` (`SKY`, `WINDOW_DELAY`, `settleAmbient`); sheet 55 |

**Designer's rules for it, which the owner can overrule:**
- No window shows a blue, red or lavender world or a black hole, nothing follows the ship's course (only the Captain and Officer know it), and no team colour is used.
- Nothing moves that the game uses to say something: the chart table, the berths' monitors and lamps, the Jail's keypad keys and lamp, the capsule's door light.
- With the lights out (the Blackout), every screen and light is off and only the windows move, dimmed like the dark pictures' own windows.
- Reduce motion holds it still.

**What it does not decide:**
- **Cost on phones:** not measured. The clips are desktop Chromium.
- **Adoption:** nothing here is in the playable build. Frontend decides how to build it.

## 9 November 2026: the phone interface after the playtest

**After a playtest, the owner asked for a complete phone interface design pack: a clean interface that feels like an iPhone app, around the approved comic-noir art.** The requirements came with the request of 9 November 2026. The owner's words are quoted below; Designer's answer is the pack in [phone-ui.md](phone-ui.md).

| What the owner asked | What it decides | Where |
| --- | --- | --- |
| "a clean, intuitive interface with an iPhone app feel, while preserving GameN's approved comic-noir artwork, characters, rooms, cards, and animations" | The interface language: iOS-like chrome around the comic scenes | Sheets 04–08 |
| "Remove introductory paragraphs, redundant headings, repeated status messages, and unnecessary instructions." | Short screens; only essential labels, errors and eligibility | Every sheet |
| "The player's current room is the main full-screen scene." and "In room view, the navigation destination says 'Board'. In board view, it says 'Room'. A view switch must never move the player or spend movement." | Room view is the default; Board and Room switch views without moving anyone | Sheets 20–26 |
| "During a voting phase, replace the central Pass control with Vote. Vote opens a 3×3 character grid." | Vote replaces Pass; one 3 × 3 roster for ballots and results | Sheets 35–38 |
| "The owner's new presentation requirement is exactly 30 seconds: 0–20 seconds: the player's role card. 20–30 seconds: that role's existing ten-second animation." | The private role stage | Sheets 17–18; timing in [DSN-REQ-19](integration-requests.md#dsn-req-19) |
| "The owner requires Blackout to be usable before voting." | The order drawn on sheet 02, labelled an Integration proposal | Sheet 02; [DSN-REQ-20](integration-requests.md#dsn-req-20) |

**The owner's first look, the same day.** The owner opened the clickable review copy on a phone and looked at the room view (Room A, screen 9), then asked about the tab bar and the sheets' background, and sent a picture of screen 9 with the top bar and tab bar as the owner wanted them:

| What the owner said | What it decides | Where |
| --- | --- | --- |
| "it feel too zoom , we should a little bit zoomout the view" | The room view is framed wider: the space between the bars, at the smallest scale that still fills it with the room. People are drawn 23% smaller, and 30% more of the room's width shows (390 × 844). The view holds the room's centre and moves only to keep everyone present in view. The first draft had cut people off at the sides of the Hospital and the Jail | Sheets 20–31 and every screen over a room; [phone-ui.md](phone-ui.md#design-decisions) |
| "can you also show add when suer click on each button in menu bar like action or card or more or board what it shows?" | Each bottom-bar button is drawn tap by tap, one sheet per button: a row of screens with a ring on what is tapped and an arrow to what it shows. The review copy opens on the player's own turn, its tab bar can be tapped, and its list has "The tab bar" with every button. Two corrections came with it. Pass now asks once before it ends the turn, as the runtime's confirm step for Pass already does. Move stays open on other players' turns, as the engine allows; the first draft had it closed | Sheets 27.1–27.5 (27.1 Board, 27.2 Actions, 27.3 Pass and Vote, 27.4 Card, 27.5 More, now Panels), 28; the review copy |
| "I dont like the background of them , lets make them glass transparent so user can see the room at the same time" | Every sheet over a room is glass: the room shows through it, and the room above it isn't dimmed. The text on glass is measured against what is really behind it and kept at 4.5:1 or more | Every sheet over a room; [phone-ui.md](phone-ui.md#design-decisions) |
| "what us the glass transparent level? before you start to finish all, lets see 1 together"; on one screen, "more transparent, i want to see the room better"; of three levels, "Clearest" | The clearest level: a 20–34% tint, a 2 px blur, and the room behind darkened to 56%, so people and things show through almost sharp and the text still reads | The `--glass-*` values in `kit.css`; every sheet |
| With the picture: "Settings: Moved the three-dot menu to the top-right, beside the timer, and changed it to vertical (⋮)." "Promises: Added a Promises button with a handshake icon in the top bar, after the player's name." "Bottom navigation: Renamed More to Panels." "Panels icon: Replaced the three dots with a blue stacked-layers icon, clearly different from the Board" | The top bar holds Promises (a handshake) after the name and the settings menu ⋮ beside the clock. ⋮ opens Settings: the phone's display settings and, for the host, Host controls. More is now Panels, with a stacked-layers icon; it keeps Windows, Navigation, the Hospital panel, Players and Round order. Promises shows its word on a turn bar, as drawn; on a phase or talk bar, a narrow phone or larger text it is the handshake alone, so titles keep their room | Sheets 07, 08, 27, 27.5, 27.6, 32 and every screen in a match; `topBar` and `tabs` in `ui.mjs` |
| On the preview of that one screen: "The panels button icon color should be the same as other menu bar icon" | The Panels icon is the same grey as the other tabs, and amber while open, like any open tab. The first preview's blue is gone | `kit.css`; every screen with the tabs |
| Then: "Also Promise icon should be same icon color" | The Promises handshake is the same grey as the other icons (the clock's and the tabs'); the button turns amber only while Promises is open | `kit.css`; every top bar in a match |

**What it does not decide:**
- **The round order and the stage timing:** Backend and Integration change them in the rules and the contract. Designer only draws them.
- **Routine visual choices** (Join as the primary entry, sheets docked between the bars, the icon family, errors in paper rather than red): these were Designer's, under the owner's brief, and the owner can overrule any of them.
- **Adoption:** nothing here is in the playable build.

## 8 November 2026: the pre-game films again, as AAA animation

**The owner asked for the three films a player sees before the game to be made again, at a much higher finish, with the restyled crew and rooms.**

| When | What the owner said | What it decides |
| --- | --- | --- |
| 8 November | "what about the role animations after role and the animation before the role for game?" | The question that opened it: the films around the role reveal had not been redrawn with the new crew |
| 8 November | "we had 3 animation before game, 1 is the Game N by Plan B 2-second app intro, second after 10-second film for each role then 10-second boarding cinematic , go for them like AAA ANIMATION improve the quality" | The three pre-game films are made again at a higher finish: the 2-second brand intro, the 10-second film for each role, and the 10-second boarding |
| 8 November | "For the app start 2 sec can we just have black background and then the texts with Game N by Plan B something simple with typing motion graphic effect", on seeing the first cut of the new intro | The intro is made simple: a black screen, "Game N" typed a letter at a time with a cursor, "by Plan B" typed under it, a hold, a fade to black. The plate, lamp and ink of the first cut are dropped |
| 8 November | "The doctor movie at end of it when Doctor text label appear with yellow color the background of the text is crowded , make it simple blue color", on seeing the Doctor's film | The role film's title is made simple: the page goes almost black, clean behind the name, and DOCTOR rises a letter at a time in plain blue with a thin rule under it. The paper plate, the amber lettering, the ink, dust, impact lines and sheen are dropped, and so is the team emblem that sat on the plate. The blue is the same for every role and kept 30 or more (CIE76) from each team's accent, so it tells a neighbour nothing |
| 8 November | "In Dr animation the card on table with Doctor text on it make it the medical cross" | The role card on the desk in the opener shows the role's mark instead of the portrait, the injector, DOCTOR and the team line: for the Doctor, a medical cross, paper on a dark plate, as the board's Hospital draws its cross. No red, which is a team's colour and the protected emblem. With the team line gone, a role film draws no team colour at all |
| 8 November | "I approve it", answering Designer's "If you approve this Doctor film and the boarding, I'll start the other seven role films", after seeing the Doctor's film with the medical-cross card and the blue title | The Doctor's film and the boarding are approved, as last sent. The other seven role films are made next on the Doctor's pattern, from the storyboards approved on 6 November |
| 8 November | "You used for all blue but For red team roles like undercover , Hacker, red disabler the text  you should use plain red on clean dark background because they are red team and for alien this become purple", on seeing the other seven role films | Each role film's title is in its team's colour: the Blue team's roles in plain blue (`#2979FF`, as the Doctor's), the Red team's (Undercover, Hacker, Red Disabler) in plain red (`#E8423F`), the Alien in purple (`#9B5CFF`). The three have the same lightness, each about 5:1 on the darkened page. The rest of every film keeps no team colour |

**What Designer kept, and why.** The lengths, the beats, the words and the rules the owner approved in the earlier films stay as they were ([PR #187](https://github.com/Amirkianfar66/GameN/pull/187), [#189](https://github.com/Amirkianfar66/GameN/pull/189), [#190](https://github.com/Amirkianfar66/GameN/pull/190)):
- The role films' privacy rules, clock and briefing-room opener: "a first part that shows the guy has become the Doctor", the back story ("imagine it like a comic book"), and fewer words ("it is like tutorial").
- The intro's and the boarding's beats.

What changes is how each beat is drawn, lit, staged and finished ([pregame-films.md](pregame-films.md)).

**The order.** The Doctor's film is the pilot again, as the owner approved last time. The other role films follow once the owner has seen it. The intro and the boarding are delivered whole. The intro was then made simple at the owner's word, and so were the Doctor's title and desk card. The owner then approved the Doctor's film and the boarding (the last four rows).

**What it does not decide:**
- The look of the other seven role films, beyond their titles' colours: the owner has not approved them yet.
- A caution Designer keeps on record: the title, from 7.8 seconds, now shows the team's colour on the player's own phone. A neighbour who glimpses that screen sees the team as well as the role. The owner decided it; the role card the phone shows next carries the team too.
- Adoption: no client plays any of them. The boarding still has no stage to play in (R17 in [pregame-films.md](pregame-films.md)).
- Sound: the films stay silent.

## 7 and 8 November 2026: the rooms redrawn to match the crew

**The owner asked for the rooms to match the restyled crew, saw one room as a test, then approved all five.**

| When | What the owner said | What it decides |
| --- | --- | --- |
| 7 November | "can you also improve each room match with he quality of the new characters? lets start with 1 room image as a test? what do you think?" | One room first, as a test. Designer proposed Room A, the crew bay, drawn by hand in the crew's ink |
| 8 November | "I am really happy with rooms let do it for all", on seeing Room A redrawn | Room A stands as drawn. The other four are redrawn in the same hand and as dark: the Command Room, Room B, the Hospital (the four-berth ward the board shows today) and the Jail |
| 8 November | "yes I am happy", on seeing the five ([PR #197](https://github.com/Amirkianfar66/GameN/pull/197)) | The five rooms stand as drawn: the crew's ink, the noir light, each room's own colour family, and Room A's frame drawn behind its props |

**The approval covers:**
- The drawing only: the places, slots, camera, focus, press areas, props and colour families are today's.
- Room A's one correction: its frame line is drawn behind the props, as today's scenes draw it.

**What it does not decide:** adoption.
- The approved rooms are packaged as `room-drawing-1.0.0`, with lights-out pictures drawn from them ([room-drawing-release.md](room-drawing-release.md), [DSN-REQ-18](integration-requests.md#dsn-req-18)).
- The owner then asked: "what about the animations which need to update?" The films that draw parts of a room again are redrawn with the rooms in the same release:
  - the Captain's Jail door, lamp, keypad and airlock;
  - the Hospital's drone, berth monitors and lamps;
  - the private-talk capsule.

  The films' other art (insets, tags and effects with no room behind them) is left as it is.
- The game, the board and the films are unchanged until Integration registers it and Frontend adopts it.
- The owner has not seen the lights-out pictures or the films' pieces separately.

## 7 November 2026: the character restyle, a pilot of three

**The owner drew a redesign of the nine crew members and chose to try it as a pilot of three: Mira, Nova and Atlas.** The owner's sheet has portraits in app-icon frames and full figures in a two-tone suit. The owner asked, "do you think it's better and is it possible?" Designer answered yes, as a restyle of the code-drawn rig, and asked five questions. The answers:

| # | What the owner said | What it decides |
| --- | --- | --- |
| 1 | "I am Agree with Pilot first … starting with Pilot with 3 of them" | A pilot first: Mira, Nova and Atlas |
| 2 | "do not keep hejab it is not hood for rigging" | Mira is drawn without a hijab, with long hair as on the owner's sheet |
| 3 | "Colors as recommend and the icon border like IOS style" | Nova's pink and Echo's purple move away from the team colours; portraits are framed as iOS app icons |
| 4 | "You can change them 1 fat or thinner" | Atlas and Juno are told apart by build: Atlas heavy |
| 5 | "I created the images … even you can be free to improve them and send me to check … the main Goal is give the design of game style and more like AAA animation but with a specific style Noir, Comic book Style" | The owner's own designs, which Designer may improve; the look is noir and comic-book with a hand-drawn line, and the animation is polished. The owner named a game as the inspiration for the hand-drawn line; nothing is taken from it |

**Later that day, the faces.** The owner reviewed the first renders: "You did a good job on rigging and the body and dress, but the face is not good! I created an example as a better face", with a repainted Mira. What it decides:
- The rig, the body and the suit stand as drawn.
- The faces follow the example: big almond eyes with dark irises, a winged lash line, full brows, a small nose and mouth inside a soft oval face, and hair framing the face.

**Then, how the faces are made.** The owner reviewed the redrawn faces: "Still the faces are not good enough, can we use github project for face like Faces.js or Bean heads or Cubism Web Samples github to improve the result?" Designer recommended tracing the owner's own art instead: those projects draw their own face styles or animate models made in another editor, while the owner's drawings already are the style. The owner answered: "yes go as you recommended". What it decides:
- The pilot's faces are traced from the owner's own art: Mira from the example, Nova and Atlas from the redesign sheet's portraits. The rig adds the blink, the look down and the hair's follow-through.
- The owner did not say which tool made the images. They are recorded as the owner's own art.

**Then, the pilot approved.** The owner was sent the traced faces on the rig (`0a5612d`: the faces beside the owner's art, the review sheet and the motion film) and answered: "i am happy with results". What it decides:
- The pilot stands as drawn: the traced faces and what the rig moves on them, the body and the suit, the animation and the portraits.
- That includes the choices made with the traced faces: the head as large against the body as in the owner's example, and the traced colours moved just clear of the team colours.

**Then, the whole crew.** Asked whether to trace the other six the same way, the owner answered: "Go a head with all of them". What it decides:
- Vega, Rigel, Lyra, Orion, Juno and Echo are traced from the portraits on the owner's redesign sheet and rigged as the pilot is.
- The earlier answers carry over: Juno slim beside Atlas heavy, and Echo in the proposed violet.
- No larger drawings were sent, so the sheet's portraits are the sources.

**What it does not decide:** adoption. The restyle lives in `design/character-pilot/` (handoff: [character-pilot.md](character-pilot.md)). The game, the board, the films and the approved rig are unchanged. Adopting the style is a separate change: the owner's check of the crew first, then the rig's drawing replaced (Frontend re-ports it and Integration re-pins it).

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
