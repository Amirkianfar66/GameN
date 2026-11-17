# Room A and Room B: a view from each place

[`gamen-room-visibility-design-v1.json`](gamen-room-visibility-design-v1.json) is the game owner's design for the views in Room A and Room B. They gave it on 17 November 2026, and it is kept here byte for byte (sha256 `36edd4c7ade15cab02dbdfa64cd799edb27e9c3ee338cfb6aea35397ac1ba3df`). The owner's words and decisions around it are recorded in [owner-decisions.md](../owner-decisions.md#17-november-2026-every-room-redesigned-in-one-cyber-comic-noir-style-room-by-room-with-who-builds-what), under "A view from each place in Rooms A and B".

## What it sets

- **The places:** five places on the walls of a square room, A to E, with the centre clear. The letters are places, not players, characters or roles.
- **The view:** each place has a fixed view, 90° across. It never turns, widens or zooms as people come and go, and nobody is moved.
- **A full room:**
  - Each player sees three of the other four and is seen by three.
  - The one place a player can't see is just off their right shoulder, and that person can see them. The circle runs A → D → B → C → E → A.
  - Nobody is seen from behind.
- **Fewer people:** players keep their places.
  - Of the ten pairs, five see each other and five see one way only.
  - With three or more in the room, everyone sees at least one other.

## What the Lead Designer checked

The checks were recomputed from the file's coordinates and directions, independently of its own tables:

- **The tables:** every "sees" and "seen by" list for a full room, and all 32 combinations of occupied places, match the file.
- **The margins:**
  - The nearest seen person's centre is 7.6° inside the view.
  - The nearest unseen person's centre is 25.3° outside it.
- **The drawing angles:** every person is seen from the front, from about 35° on their right and from about 72° on their right, never from the left or from behind. So each crew member needs two new angles.
- **People's height on a phone,** for a 90° view across the screen and a figure 1.75 m tall, by the room's real size:

  | Room across | 390 × 844 | 430 × 932 |
  | --- | --- | --- |
  | 4 m | 124–209 px | 136–231 px |
  | 4.5 m | 110–186 px | 121–205 px |
  | 5 m | 99–167 px | 109–185 px |
  | 6 m | 82–139 px | 91–154 px |

  Today's Room B view draws people 162–189 px tall at 390 × 844.

The file itself says the same: this is geometry only. None of this is a phone render, a game test or a playtest.

## What the owner adopted with it

The owner approved these with the Lead Designer's recommendations ("Yes go as your recommendation"):

- **Who enters where:** the entry order maps to B1 → A, B2 → B, B3 → C, B4 → D, B5 → E, and the same for Room A.
  - Two players who enter an empty room see each other, and any three see at least one other.
  - Integration maps the places, keeping each place's functions.
- **Presence is public; actions are what can be unseen.** The person in a player's blind place shows as a chip on the right edge, for example "Juno · out of view". The chip is also how they are targeted where the rules allow it.
- **Compact rooms,** about 4–4.5 m across, so people stay near today's size.
- **The picture may be drawn a little wider than the rule,** about 96–100°, so the people at the sides and their tags clear the screen's edges. The rule stays 90°, and the hidden person stays at least 20° out of the picture. The layout test decides.
- **The camera** sits at eye height, about 1.6 m, looking level or a little down.
- **The other rooms:** they have fixed places and no blind places, and each has one shared view. The Hospital and the Jail have four places, the Private Room and the Task Room two, and the Command Room one.

## What it does not decide

- **What an unseen action leaves you.** Until this is decided, the blind places hide nothing:
  - what a player who didn't see an action is told;
  - what the Board and the shared display show of it.
  - Backend and Balance propose it, the owner approves it, and the server sends each player only what they saw.
- **The rooms' pictures and the new crew drawings.** They follow the layout test and the owner's look at it. The new crew angles go to the owner before anyone draws them.
- **The rules otherwise.** Room capacities, movement, targeting, the Blackout and private information stay as they are. The Jail's four places are already with Integration ([#96](https://github.com/Amirkianfar66/GameN/issues/96)).
