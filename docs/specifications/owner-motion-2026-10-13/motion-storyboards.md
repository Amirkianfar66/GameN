# Detailed motion concepts and storyboard brief

This appendix restores the scene-level detail from the owner's twelve-part Motion Graphics and Animation Design Decisions and the earlier approved phone/Insider requests. The first handoff summarized those concepts; this appendix is the detailed creative reference for the existing Claude Designer and Codex Frontend.

Read it with [game design](game-design.md), [authoritative contracts](rules-contracts.md), [motion requirements](motion-requirements.md) and the [decision register](decision-register.md). The later owner decisions control mechanics and disclosure: Clone lasts through the following normal round with the R5 exception; Blackout uses the common post-Jail 5+10-second window; defensive impacts are room-visible; Captain commands are direct; all Injured are in Hospital. Original wording suggesting shorter Clone duration or physical Chamber relocation is superseded. This appendix changes no rule, version or source asset. Review and production planning are authorized; implementation and asset generation remain on hold.

## 1. Blue Disabler / Red Disabler — Blackout Strike

**Intent:** a tense memory challenge in the spaceship's darkened rooms. Preserve position targeting; do not substitute selection of a named character.

Storyboard beats:

1. Lights begin flickering and the electrical system shows a brief malfunction.
2. Electrical sparks and power-failure cues lead into the dark room overlay.
3. The room becomes fully dark. Fixed target positions remain available as neutral numbered positions without occupant names, portraits or identifying highlights.
4. The requesting Disabler selects the remembered position during the dark interval.
5. An authorized shot is represented by a source-free gunshot flash or spark and comic impact lines. Do not show a muzzle, beam origin, gaze, camera focus or directional trail that identifies the attacker.
6. Lighting returns and the authoritative result becomes readable.

Fit the cinematic accents around the full five-second lit preview and ten-second dark selection; they must not reduce either interval. Both Disablers share the same window and frozen map where applicable. Blue and Red use the same colors, flashes, timing, sounds and public feedback. Every room uses the common lighting schedule even when no eligible request exists; never imply that a lighting transition alone proves a shot occurred. Only authorized outcomes may show damage or a block. Misses, including self/dead/empty/timeout positions, never invent injury or a replacement victim.

Electrical flicker and flashes need safe, reduced-motion alternatives. Keep slot coordinates and hit areas fixed even when decorative layers shake. Keep private selection feedback private and avoid public timing tied to one requester's action. See G-01 and Q-B01–Q-B03f for the full rules.

## 2. Private Hack — Private Chamber

**Intent:** a secretive, cinematic conversation whose two participants are intentionally public while its contents remain private.

Storyboard beats:

1. Subtly highlight both participating characters.
2. Show a private communication icon without suggesting that an app microphone or recording is active.
3. Their cinematic figures move toward the Private Chamber.
4. The automatic sliding door opens; both enter.
5. The door closes behind them.
6. Subtle conversation loops accompany the complete sixty-second private discussion.
7. At the end, the door opens and both return visually to their latest authoritative board positions.

Chamber environment: a small futuristic room with two chairs facing each other, a small central table, a single overhead light, dark metallic walls, an automatic sliding door and minimal futuristic interface details. Use dark navy, purple, yellow and subtle red accents. Frame the transition with dynamic comic-book panels, thick black borders and dramatic lighting.

Character loops: small head movements, hand gestures, leaning forward/backward, listening poses, blinking and slight posture changes. These loops are decorative and independent of speech, microphone activity, hidden decisions and who is actually speaking. Avoid gestures that communicate the private claim to observers.

All players may see the entrance/exit and the public pair. Only the participants receive the declared-side result and conversation information. Preserve up to fifteen seconds for declaration, five seconds for its private result, then a full sixty seconds for conversation. Entrance fits inside the result stage without obscuring the claim; it consumes no conversation time. Exit is nonblocking. The Chamber adds no room, occupant, capacity cost, targeting change or movement restriction. V1 conversation happens physically in person, not through a new audio service. See G-02 and Q-HK01–Q-HK03.

## 3. Alien — Phantom Clone

**Intent:** a visually perfect stand-in conceals the Alien's defense until an observable interaction occurs.

Private activation beats:

1. Holographic scanning lines surround the character.
2. A duplicate silhouette forms.
3. The duplicate resolves into the same chosen character.
4. The real character gradually becomes invisible.
5. The ordinary-looking clone occupies the existing position.

Public appearance must preserve the chosen character design, colors, clothing, position, idle animations and movement behavior. It must not create a second player, slot or room occupant. Do not expose the duplicate formation, invisibility, expiry, special costume, asset loading or role-specific sound to public viewers. At expiry, private art may reverse the transformation while the public figure stays visually ordinary.

The later duration decision controls: once per match, immediate private activation on the Alien's eligible own turn, active through the end of the following normal round including attack resolution; Round 5 has its documented terminal exception. Multiple eligible normal attacks may be blocked without destroying the clone. Imprisonment does not restart or remove it. The clone does not block every possible action, Captain commands, automatic death or special showdown shots. Use exactly the shared defense treatment below for authorized public impacts. See G-03 and Q-C01–Q-C02f.

## 4. Undercover Protection and Clone — shared defensive impact

**Intent:** observers see that an attack was blocked while the cause and Protection grantor remain ambiguous.

Shared beats:

1. Impact: the incoming attack reaches the affected character.
2. Shield flash: a brief energy flash surrounds that character.
3. Block: an energy wave absorbs or deflects the attack.
4. Recovery: the character returns to its authoritative pose/state without receiving damage from that blocked action. A block is not healing.

Clone and Protection must have identical color, timing, particles, sound, energy wave, character response and feedback. The neutral message is ATTACK BLOCKED. The target is visible; the defense cause, secret role, grantor and resource counters are not. Repeated observable blocks remain legitimate deduction information.

Private activation may differ: Clone uses duplication/invisibility; Undercover's authorized private view may show Protection activation around the chosen character. A private visual does not grant the recipient knowledge that their projection does not authorize.

Deliver the shared impact only to the server-authorized observers in the affected room. Outsiders and the shared display receive no block banner, count or sound. Room audio defaults to silent for in-person use; an optional private sound must remain identical for the two defenses. See G-04 and Q-D01–Q-D02.

## 5. Cracker — Medical Drone + Emergency Revival

**Intent:** urgent but hopeful medical recovery, originating from Hospital infrastructure so the Cracker is never identified.

Phase 1 — Hospital alert:

- Hospital warning lights activate and medical monitors begin blinking.
- The Injured character is already on a medical bed, preserving their identity and patient clothing.
- The heartbeat monitor shows an unstable condition.

Phase 2 — Drone arrival:

- A drone descends from the ceiling or a docking station and approaches the patient.
- Small robotic arms or scanners unfold as it positions above the bed.

Phase 3 — Medical scan:

- Scanning lines travel across the patient.
- A subtle medical hologram and minimal diagnostic elements depict evaluation.

Phase 4 — Emergency revival:

- Energy charges; the drone delivers an electrical revival pulse.
- A brief controlled healing flash passes through the patient.
- The character reacts physically to the pulse without graphic violence.

Phase 5 — Recovery:

- The heartbeat becomes stable and warning indicators return to normal.
- The patient recovers, lifting their head or sitting up.
- Show the authoritative Injured-to-Healthy transition and the correct subsequent room/wardrobe state.

Phase 6 — Drone departure:

- Mechanical arms retract and the drone returns to its dock.
- Hospital lighting settles to normal.

Drone design: compact mechanical body, two or three small robotic arms, central glowing lens, cyan/yellow lights, thick comic outlines and subtle hovering movement. Palette: navy, cyan, electric blue, yellow and white. Mood: urgent, hopeful, dramatic futuristic medical technology.

The 5–6-second recommendation is a storyboard duration, not a server delay or a new gameplay phase. Keep the board usable and settle correctly if interrupted. Recovery occurs only for an authorized Rescue of an Injured player in Hospital. Never revive an Eliminated player, point the drone's origin toward the Cracker or create an outside-Hospital treatment variant. See G-05 and G-07.

## 6. Captain — Prison RELEASE

**Intent:** visible command authority and relief.

Storyboard beats:

1. Show the Captain interacting with the Command Room console.
2. The Captain presses the green RELEASE button.
3. The control panel illuminates.
4. A digital command signal travels toward Jail.
5. Jail security indicators respond.
6. The lock disengages and the mechanical sliding door opens.
7. The released prisoners walk out toward their authoritative destinations.
8. The door returns to its normal state.

Use green as the principal signal with optional cyan console accents, a mechanical button press, digital pulse, unlocking response and clear prisoner movement. The command is direct and has no ballot. Depict only the authorized physical-Jail target set; medical detainees remain in Hospital. The Captain must be on their own turn in Command, and the independent RELEASE allowance is match-wide. No defensive effect can cancel the command. See G-06 and Q-P01–Q-P02.

## 7. Captain — Prison EJECT, selected Option A

**Intent:** dangerous, dramatic command authority without graphic gore. Eject the prisoners themselves; do not detach the whole prison module.

Phase 1 — Command trigger:

- Focus briefly on the Captain at the Command Room console.
- Reveal a large protected red EJECT button with a transparent safety cover.
- The Captain lifts the cover and presses the button.
- Give a strong mechanical click and a controlled red/comic impact accent.

Phase 2 — System alert:

- Red emergency lights and warning signals appear.
- A command pulse travels from Command Room to Jail.

Phase 3 — Jail lockdown:

- Interior safety doors lock and security indicators enter emergency mode.
- Red warning cues, pressure indicators and prisoner reactions establish the threat.

Phase 4 — Airlock opening:

- External locks disengage and the heavy outer door opens.
- Space becomes visible; airflow and suction lines build toward the airlock.

Phase 5 — Prisoner ejection:

- Characters are pulled toward the opening and thrown into space.
- Comic motion lines, limited particles/debris and optional motion blur emphasize force.
- Readable silhouettes remain against the dark exterior; no graphic injury.

Phase 6 — Exterior shot:

- A short exterior spaceship panel shows the prisoners drifting away.
- The open airlock is visible and the scene becomes quieter.

Phase 7 — Closure:

- The airlock closes, emergency lighting settles and Jail is empty.
- A short final panel may return to the Captain's console.

Button label: EJECT or PRISON EJECT. Palette: red, navy, black and amber. Preserve retro sci-fi mechanical locks, pressure effects, graphic-novel panel cuts and restrained dramatic lighting. The 6–8-second recommendation is a storyboard target; it must not block required controls or consume decision time through a full-screen movie. Provide static/reduced-motion alternatives for suction, shake, camera travel and flash.

The authoritative command immediately eliminates its eligible living physical-Jail prisoners and clears Jail occupancy, including retained bodies, into off-board history. Do not visually eject Hospital detainees or invent a block. Treat retained-body cleanup with the same non-graphic silhouette/memorial direction. Exact role/faction disclosure follows the rules, not the cinematic. See G-06 and Q-P02.

## 8. Captain command buttons — state design

RELEASE and EJECT have independent once-per-match allowances shared across all Captains. Changing Captain never restores a used command.

- Available: illuminated, subtly glowing, visibly interactive.
- Activated: deliberate button depression, stronger authorized feedback and the appropriate command signal.
- Used: inactive, no idle glow, label USED and no reactivation feedback.
- Temporarily unavailable: distinguish unmet turn/location/target conditions from a permanently used allowance. This fourth interaction state supplements the owner's three animation states; it adds no game rule.

A rejected or unknown command must not play a successful command cinematic. Frontend uses the receipt/current authoritative outcome and keeps uncertainty recoverable. RELEASE uses green; EJECT uses its protected red control. State is consistent across screens and office changes.

## 9. Hospital — Injured / critical condition

**Intent:** make the full rescue opportunity legible and emotionally present without substituting a client countdown for a rule.

Entry/critical-state beats:

1. Show the authorized transfer into Hospital.
2. Place the recognizable character on a medical bed in patient clothing.
3. Activate the medical monitor and unstable heartbeat waveform.
4. Show controlled red/amber warning indicators.
5. Present the remaining rescue opportunity in round terms from server state.
6. Loop subtle breathing, weak body movement and a restrained pulse/critical-condition indication.

Environmental cues may include a weak heartbeat, irregular waveform, slight lighting variation and desaturated medical displays. Do not use constant aggressive flashing or movement that obscures targets. Injured medical detainees stay in Hospital with a neutral detention indicator, not a healthy prisoner outfit or an illegal Jail placement.

A Round 2 injury receives Round 3 as its full rescue opportunity. Rescue resolves before due automatic death. The following-round deadline and final-round exception in G-07 remain authoritative. A second attack, Rescue, end of match or other authorized outcome may interrupt the critical loop; settle to the latest state without replaying the entry film.

## 10. Hospital — Medical Flatline + Life Support Shutdown

**Intent:** tragic, dramatic and quiet medical elimination, with no graphic violence.

Phase 1 — Critical condition:

- Heartbeat slows, the medical waveform becomes increasingly irregular and warning indicators intensify safely.
- The patient becomes progressively still.

Phase 2 — Flatline:

- The monitor reaches a flat line.
- A short medical alarm may accompany the authorized result.
- Room lighting briefly dims without hiding the board.

Phase 3 — Life-support shutdown:

- Medical equipment powers down.
- Bed lighting fades, warning indicators become inactive and the patient is motionless.

Phase 4 — Final state:

- Mark the character as Eliminated with the correct authoritative representation.
- Equipment stays inactive and Hospital returns to a quiet state.

Palette: dark blue, red, amber and desaturated cyan. Use restrained monitor transitions, fading light and environmental darkening. Play the sequence only after an authorized elimination; the animation cannot kill a patient, shorten their rescue opportunity or turn a new R5 injury into immediate death. Do not reveal the hidden attacker or defense cause through the death scene.

## 11. Global visual, motion and interaction language

Art direction: 2D / 2.5D Comic Noir, retro-futuristic science fiction, thick black outlines, halftone textures/shading, dramatic lighting, limited controlled colors and dynamic graphic-novel framing. Preserve the existing Claude body/character/room source artwork and approved board, rather than replacing it with unrelated art.

Characters should feel alive: restrained body motion, head rotation, hand gestures, reaction poses, blinking, environmental interaction and subtle idle loops. Their chosen identity must survive patient/prisoner wardrobe changes. Idle variation must not expose roles, factions, microphones or hidden decisions. Public Clone appearance must use the ordinary character behavior.

Camera language: short cinematic movements, brief zoom emphasis, dynamic panel transitions, comic cuts, impact frames and controlled screen shake. Keep room labels, timers, target hit areas and navigation stable. Decorative movement stays inside or around stable logical anchors. Preserve five slots in A/B/Jail, one in Command and seven/eight/nine in Hospital according to the roster. No responsive reordering may undermine the memory interaction.

Public, private and room-visible effects are distinct server-authorized audiences. Blue/Red Blackout effects are identical; Clone/Protection impacts are identical; drone origin hides the Cracker; Chamber participants are public while content stays private. Sound, private assets and timing must obey those same boundaries. Never animate success from registration alone or expose hidden causes in DOM labels, particle colors, asset fetches or event ordering.

Reconnection displays current state and remaining server time rather than replaying historical events. Interruption, hidden page and lost authorization remove private content and settle graphics correctly. Animations cannot independently pause turns, change rules or consume a player's allotted time through blocking presentation. Reduced motion uses readable static states/short fades instead of travel, shake, spatial flips or rapid flashes. Preserve semantic feedback and usable enlarged-text reflow; sound/color are not the sole information channel.

## 12. Earlier requested scenes and phone experience to preserve

### Insider — private classified investigation board

The owner requested a comic classified-investigation board for the Insider's privileged information about Undercover, Alien and Cracker. The selected card treatment is **the players' chosen character portraits plus role labels**, rather than anonymous role art alone. Use only identities actually authorized by the Insider's private projection. The board and its transitions remain private; do not put role labels or associations into the shared board, host/display view, shared assets or public motion. Create the detailed layout/treatment within the existing comic language during separately authorized design production. This preserves the requested concept without adding a new disclosure right or gameplay ability.

### Completed vote result

After each completed vote, use a synchronized five-second graphical result panel with comic motion, reminiscent of the game's outcome screen but clearly showing that vote's result. Use the server's result and aggregate outcome, not individual ballots or an invented match winner. Fit the result on the phone and keep it visible even when Menu was open or is reopened; retain access to its controls. Do not restart/extend the server window or let the animation eat the next phase's time. Preserve the existing distinction between skipped votes and completed outcomes, including ties/runoffs where applicable.

### Hack declared-side result

The initiator receives the target's declared side, preserving permitted bluffing. Use the existing participant-private contract rather than an actual-faction reveal. Preserve the approved sequence: up to fifteen seconds to declare, five seconds to read the result, then the complete sixty-second physical conversation. A missing declaration shows No side declared; bots follow the established automatic declaration policy. Integrate this result with the Chamber entrance without obscuring the card or exporting its content to observers.

### Phone screens, board and navigation

Preserve the five requested environments: Host, Join/Lobby, Character Selection, private Role Reveal and Main Game, with necessary result/recovery states fitting their parent flow. Character selection is a clean nine-character matrix; role reveal centers the role card with no unnecessary prose. Maintain the approved thirty-second selection/autoselection and thirty-second minimum role-reading/all-humans-Ready setup rules. Starting A/B location is server-randomized, not chosen in the lobby.

Keep the main board compact on normal phone viewports, with timers/data in the top bar and simple modern bottom navigation: Board, Actions, central Pass, Card and Menu. Move by tapping room-name tags. Choose/apply actions directly on eligible board characters rather than opening a replacement target list or navigating away. Blackout is the deliberate exception that targets remembered positions. Hospital outfits and Jail outfits reflect the authoritative medical/detention state. Improve board/menu polish using the owner's visual references and existing artwork while preserving this layout and interaction direction.

The owner also asked for coherent actionable effects for all movements and actions. For other actions without an individually selected cinematic in this document, the Designer should propose a consistent visual treatment during production planning; a missing bespoke storyboard does not authorize a new mechanic, hidden-information disclosure or pause. Coordinate exact event inputs, portraits, normalized anchors and layering with Frontend before production adoption.

## Deliverable and completeness checklist

The handoff includes all named original concepts and their scene beats: Blackout, Chamber, Phantom Clone, shared defensive impact, Drone Rescue, RELEASE, EJECT, command states, critical Hospital, flatline death, global motion language, plus the earlier Insider, vote-result, Hack-result and phone-board requests.

For each scene, the existing Claude Designer's production plan should identify reusable/editable source, character/prop variants, a storyboard, timing/easing, normalized anchors, authorized event inputs/audience, interruption/reconnect behavior, full/reduced-motion treatment, audio policy and a phone preview plan. Codex Frontend reviews interfaces and implements only after authorization; Backend controls the events. No scene assets or gameplay code are created by this appendix.
