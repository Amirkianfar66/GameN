# Game design specification

Status: consolidated under the owner's blanket approval of the remaining recommendations. This is the next specification, not implemented behavior. Authority, source precedence and the implementation boundary are in the [overview](README.md); individual decisions and integration defaults are distinguished in the [decision register](decision-register.md). The [rules contracts](rules-contracts.md) define the resolution schedule.

## G-01 — Blackout Strike

Blue and Red Disabler each retain one Blackout Strike per match. They use identical public artwork, sound and timing. During their own eligible turn, a Disabler privately registers the role Main Action. The request selects no character and has no public activation cue.

After the Jail vote and its full five-second result, every normal round has one shared fifteen-second Blackout window: five seconds lit, then ten seconds dark. The common lighting sequence runs across all rooms even without an eligible request. Its occurrence, room selection and duration therefore do not announce who requested an attack. Private selection controls are available only to eligible requesting Disablers.

- Cancel a pending request if the Jail vote jails its Disabler, without consuming the once-per-match ability. A requester otherwise unable to enter targeting because they are no longer Healthy/free is likewise canceled before admission. This exception concerns untargeted Blackout requests, not other already-targeted attacks.
- Bind each admitted request to the Disabler's current authoritative room at window opening, after Jail placement. Capture and freeze that room's logical occupancy before the lit preview. No additional movement opportunity is granted.
- Positions are fixed and numbered: five each in A, B and Jail; one in Command; the starting roster count, seven/eight/nine, in Hospital. Empty positions remain selectable. Existing occupants retain their slots; new entrants take a free slot without shifting others.
- In darkness the Disabler selects a remembered position, never a player name or character picker. The first valid selection is final. Responsive layouts represent the same logical positions.
- Empty, own-character or already-Eliminated snapshot positions produce a miss, consume the use and cause no damage. Own positions remain visually neutral and selectable. No replacement, nearest-target correction or self-damage.
- No accepted selection by the dark deadline is a miss and spends the use, including on disconnect. An accepted choice with a lost acknowledgement remains accepted. Invalid input does not lock a choice, but the deadline still applies.
- Both Disablers select independently in the same window. One shared room uses one frozen map. Register both attempts before either resolves; retain two attacks when they select the same occupant.
- The full fifteen seconds always runs. Registered attacks then resolve in the round's stored turn order, role Main Action before ordinary Shot. Each unblocked attack deals one damage. An already-Eliminated target at resolution receives no further effect or replacement, and spent resources remain spent.

Command Room target immunity and existing action restrictions remain applicable. Source-free effects and batched outcome delivery must not reveal the requesting actor, faction or private request order. Public facts can still support ordinary social deduction.

## G-02 — Private Chamber

The two participants, entry, conversation scene and exit are public. Declared-side claims and conversation content are private to the participants. Hack remains available under its existing role-independent eligibility, uses and round limits.

The Chamber is cinematic scenery, not another playable room. It changes no authoritative location, occupancy, target eligibility, movement allowance or immunity.

Keep up to fifteen seconds for declaration, then a full five-second private claim display, then a full sixty-second conversation. A missing declaration shows the existing private no-declaration result. Fit entrance and door closure into the five-second claim stage without obscuring its content. Entrance cannot consume conversation time or wait for client animation acknowledgements. Exit is a nonblocking animation at conversation end; characters return visually to their latest authoritative positions.

V1 uses an in-person private conversation: the pair steps aside or speaks out of others' hearing. The app provides the private claim display and timer, not voice transport, recording or proof that nobody overheard. Gestures are decorative, independent of speech or microphone activity. Bots retain existing automatic declaration/practice behavior; no voice intelligence is implied.

## G-03 — Alien Phantom Clone

- Activate once per match, privately during the Alien's own ordinary turn, only while Healthy and not Jailed. Activation is immediate on server acceptance and uses that turn's role Main Action. Ordinary Shot and Hack remain independent opportunities under their existing rules.
- Private art shows the clone forming and the real Alien fading. Public appearance, wardrobe, idle movement and identity remain ordinary. There is one player, one occupant and one position.
- Activation in Round R lasts through the end of Round R+1, including its full attack resolution. Turn reshuffling, late activation, movement, imprisonment, reconnect or retries do not restart or extend it.
- Last-round exception: unused Clone may activate during Round 5, covering the remaining normal-round effects only. All Clone effects expire at the end of normal Round 5 resolution, before showdown. Earlier match completion also ends the effect; there is no Round 6.
- During normal rounds it blocks ordinary shots and Blackout, including multiple attacks. The first block does not destroy it.
- When Clone and Undercover Protection are both active, Clone blocks eligible normal-round attacks first without consuming Protection. Independently valid Protection remains available after Clone expires under its existing activation, duration and grant rules.
- Later imprisonment leaves the effect active until its original expiry. Later injury does not itself cancel it or grant healing; elimination ends it. Clone cannot prevent Hospital deterioration, Jail voting, Hack, Scan, Rescue or Captain commands.
- Special showdown shots bypass Clone. Existing Protection still blocks and is consumed by its first applicable valid showdown shot. This preserves the separately approved showdown defense rule.

## G-04 — Room-visible defensive outcomes

For a successful block, every seat occupying the affected target's room at the authoritative event checkpoint is an authorized observer. The affected player is included. Retained Eliminated occupants do not gain additional room access, but retain the same room observation boundary. Later entrants receive no historical events.

Clone and Protection use the identical generic impact, color, sound, particles, timing, reaction and `ATTACK BLOCKED` message. Reveal the affected character, never the defensive cause, grantor, hidden role or private resource counters. Repeated observable blocks may legitimately support deduction.

Outside-room phones, a host without a participating seat and the shared display receive no room-level block event, badge, count or sound. Their board still shows ordinary public health/location facts. Room-specific audio is silent by default for in-person play; private listening must not turn the shared speaker into a disclosure channel. Physical observation of another person's phone cannot be prevented by server filtering.

## G-05 — Medical Drone + Emergency Revival

Every Injured player is in Hospital, including an injured prisoner. Hospital capacity and slot count equal the starting match size. There is no injured overflow into A/B/Jail/Command.

Rescue changes Injured to Healthy; it never revives an Eliminated player. Preserve the selected Hospital alert, drone arrival, patient scan, revival pulse, stabilization and departure. The drone originates from Hospital equipment, never from the Cracker's character or location.

Incarceration is separate from health and location. An injured prisoner remains detained in Hospital; a Jail vote against an Injured player records detention without moving them out. Healing a detained patient returns them to Jail; healing a free patient returns them to their remembered A/B room, falling back to the other room if necessary. Medical detention does not create additional Hospital actions or movement.

Captain buttons operate on prisoners physically in Jail. A detained Hospital patient is therefore unaffected by RELEASE/EJECT while in Hospital and returns to Jail if healed. This preserves the buttons' explicit Jail scope and Hospital-only injury.

## G-06 — Captain RELEASE and EJECT

Only the current Captain may activate these commands during their own ordinary turn while in Command Room. Accepted commands execute immediately. Each has an independent, match-wide once-per-match allowance, surviving Captain replacement. These office commands do not consume the hidden role's Main Action, Shot, Hack or movement.

RELEASE frees all living detained occupants physically in Jail and immediately returns them to A/B. There is no vote or selected-prisoner limit. EJECT eliminates all living prisoners physically in Jail, then clears every Jail occupant position, including retained eliminated bodies, into the off-board elimination record. The final Jail scene is empty. Neither command can be blocked by any defense.

Both require at least one living prisoner physically in Jail. Empty or otherwise invalid commands spend no use. If both buttons are pressed, each is revalidated against the committed result of the preceding command; no stale target set is reused. A new Captain cannot recover a spent allowance.

Public location/elimination changes are immediate. Factions are revealed at the normal end-round reveal checkpoint; exact roles and Code remain match-end information. Victory is evaluated after the full normal end-round resolution, preserving already-registered actions rather than ending on an intermediate EJECT victim.

Available, temporarily unavailable and Used states must remain distinct. Preserve the green release console and protected red EJECT button, source-to-Jail command signal, door/airlock scenes and non-graphic ejection.

## G-07 — One full Hospital round

A Healthy-to-Injured transition creates one injury episode and transfers the player directly to Hospital in the same authoritative step. If injury occurs during Round 2 resolution, Round 3 is the complete rescue opportunity. Valid registered Rescue resolves before automatic death at the end of Round 3.

A second unblocked damage eliminates an Injured player immediately; a later Rescue cannot undo that elimination. Healing clears the episode. A later fresh injury creates a new episode and deadline; no-op Rescue, reconnect, imprisonment or animation cannot reset an existing deadline.

Final-round exception: the match follows its existing five-round ending. A patient admitted after Round 4 must be rescued during Round 5 or dies at its end. A new Round 5/showdown injury receives no accelerated Hospital death and does not force an extra round or a new healing window. Existing registered Rescue still resolves normally. The match may end before that new patient's full rescue opportunity occurs; further damage or an applicable elimination effect can still eliminate them.

Hospital states remain Injured/critical, Rescued/drone recovery, and Eliminated/flatline plus life-support shutdown. Preserve the chosen character's identity, patient clothing and authoritative medical status.

If no winner exists after normal Round 5 resolution, preserve the special showdown. All non-eliminated players, including Injured and Jailed, get the existing special shot. They remain in their actual rooms; a shared cinematic layer replaces physical transfer to Final Zone. Showdown shots may target any other surviving participant regardless of room or Command Room immunity. This exception is limited to showdown. Register all targets before resolving in Round 5 turn order, including shots whose registered shooter is eliminated earlier in that sequence; then check victory, otherwise draw.

## G-08 — Global interaction requirements

Preserve the approved phone-first comic board, room-tag movement, direct board-character targeting, central Pass control and compact navigation. Timers belong in the top bar. Keep the board readable and interactive during nonblocking animation, with reduced-motion variants and safe flashing.

Backend authorizes outcomes and audiences. Client animation never changes health, resources, expiry or victory. Reconnect restores current state and remaining server time without replaying historical cinematics. Assets, character sources and the Canvas snapshot are preserved; this document creates no replacement art.

## G-09 — Movement during player turns

Each eligible player has one voluntary move per round. It can be used during another player's turn or after their own turn, while the round's turn sequence is still open. This includes intervening Hack subphases before the final ordinary turn has ended. Accepted movement applies immediately.

The final ordinary turn ending closes voluntary movement, including during any subsequent final-player Hack. Voting/Blackout never reopen it. Existing room, capacity, health and detention restrictions remain; there is no voluntary Hospital/Jail exit or extra move.

Automatic Jail placement, Hospital admission, healing returns, Captain-loss returns and command transfers remain allowed after turns. They consume no voluntary move. Use authoritative numbered slots and preserve existing occupants' positions.

## Preserved sources and superseded behavior

Keep the historical executable versions and all original source bytes. For the next version only, this specification replaces direct-seat Disabler targeting, secret-only defensive outcomes, hidden Hack participant association, absent Clone/EJECT mechanics, the release ballot, persistent injury, Hospital overflow and the old physical Final Zone transfer. It preserves existing faction composition, ordinary shot resources, Captain/Jail voting, Code rules and victory formulas except for the explicitly documented new consequences and terminal exceptions above.
