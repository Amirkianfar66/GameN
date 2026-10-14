# Motion graphics and phone interaction requirements

Use the [consolidated game design](game-design.md) and [authoritative contracts](rules-contracts.md). Preserve the existing Claude character/room sources and approved 2D/2.5D Comic Noir, Retro Sci-Fi, thick outlines, halftone and graphic-novel framing. This is a specification, not asset creation or production adoption.

## Scene requirements

| Scene | Required presentation | Disclosure and timing |
| --- | --- | --- |
| Blackout Strike | Five-second lit room memory preview; ten-second darkness with stable numbered positions; source-free shot/impact and light restoration | One common sequence across every room each normal round, even without requests. Identical Blue/Red effects. No actor-linked cancellation, muzzle direction, room-request highlight or early ending. |
| Private Chamber | Public pair highlight, entrance, sliding door, subtle two-chair conversation and exit | Entry fits within the five-second claim stage; content private, full sixty seconds speech. Chamber is a visual copy, not a new room. |
| Phantom Clone | Private scan, identical duplicate, real-character fade and restoration | Alien-private creation/expiry; normal public appearance. Match the authoritative R+1 expiry and R5 terminal exception. Imprisonment never triggers destruction or reactivation. |
| Shared defense | Impact, energy flash, block and recovery with generic ATTACK BLOCKED | Exact shared Clone/Protection timing, color, particles, sound and reaction. Only authorized room viewers receive the event; shared display gets no block badge/count/sound. |
| Medical Drone recovery | Hospital alert, drone arrival, scan, revival pulse, stabilization, patient recovery and drone exit | Hospital origin, no Cracker source cue. Depict Injured-to-Healthy only; never revive Eliminated. |
| Hospital critical state | Patient clothing, medical bed, unstable monitor, subtle breathing and rescue-round indicator | All Injured are in Hospital. Medical detention uses a neutral restraint/status marker without substituting a healthy prisoner outfit. |
| Hospital death | Slowing monitor, flatline, quiet alarm, equipment shutdown and final stillness | Only after server-authorized elimination. No frontend countdown can cause death or truncate a new final-round injury's lifetime. |
| Captain RELEASE | Green console press, signal, Jail unlock and prisoners leaving | Immediate physical-Jail release. Medical detainees stay in Hospital; no remote unlock is implied. |
| Captain EJECT | Protected red button, warning, Jail locks, airlock, non-graphic ejection, exterior silhouettes and closure | Immediate authorized elimination. Jail finishes empty; all removed occupants use off-board memorial state. No defensive block. |
| Command buttons | Available, temporarily unavailable, accepted activation and Used | Two independent match-wide uses, persistent across Captain replacement. No usable button outside own turn/Command Room or without living prisoners in Jail. |
| Showdown | Shared cinematic emphasis over the existing board, direct participant targeting and authorized results | Authoritative rooms stay unchanged, especially Hospital. Clone never blocks special shots; Protection may use its common generic effect for authorized room viewers. |

## Stable phone board

Keep the approved compact phone flow: character-selection matrix, role card reveal, top-bar timer/state, board, direct room-tag movement, on-board character targeting, central Pass and bottom navigation. Avoid explanatory paragraphs and scrolling on the main game screen. Actions remain on the board rather than opening replacement player lists.

Logical slots are fixed: A/B/Jail five, Command one, Hospital seven/eight/nine by starting roster. Empty slots remain present. Existing occupants keep their slot; arrivals use free slots without shifting everybody. Designer supplies normalized anchors and Frontend maps them to the same server slot IDs across viewports. Idle and reaction motion stays inside stable interactive regions.

Blackout targeting shows neutral position numbers in darkness, including the attacker's own selectable slot. No labels, accessibility shortcut, warning or highlight identify the remembered occupant. Timeouts/empty/self/dead choices never animate invented injury or a replacement target. Two hits follow authorized outcomes; do not merge them into one invented damage event.

Movement is available until the final ordinary turn ends, including intervening Hack stages beforehand. Show accepted moves immediately. Automatic Jail/Hospital/command transfers remain possible afterward. The end of a voluntary movement window must not suppress authoritative forced placement.

Chosen character identity remains recognizable in every state. Healthy Jail occupants wear the prisoner design; Hospital patients wear the patient design, with a detention marker when applicable. Clone is one ordinary-looking occupant, including during transfers. No public costume, idle cadence, fetch, sound or camera focus exposes its hidden role.

## Timing, privacy and accessibility

All scene stages follow server state. Never change health, resources, deadlines, turn or victory from an animation callback. Use opening/accent/settled frames for authorized transitions; interrupted playback lands on the latest state. A completed server result cannot wait for every client's animation acknowledgement.

Blackout runs the full five-plus-ten seconds, including no-request rounds. Reconnect during darkness preserves darkness and remaining time rather than replaying the preview. Resolution effects are batched and presented independently of hidden actor order. A shared screen uses neutral lighting and public state only; phone room effects cannot be inferred from a global sound or badge.

Hack entry runs inside its claim stage without obscuring the five-second private result. Conversation gets all sixty seconds. Exit is nonblocking when that timer ends and uses current authoritative positions, including valid moves made meanwhile. Physical conversation privacy is an in-person procedure; avoid microphone indicators, voice-reactive gestures or any implication that the app provides remote audio.

The earlier 5–6-second Rescue and 6–8-second EJECT values are storyboard targets, not extra engine phases. Keep room labels, targets, timer and navigation usable while cinematics play. Do not hide controls behind a full-screen film or take decision time away through blocking transitions.

Reduced motion uses static states and short fades instead of shake, camera travel or spatial flips. Control flashes and evaluate the final sequences for accessibility; avoid rapid red/full-room flashes. Sound and color are not the only information channels. Room-specific audio defaults to silent in shared physical play.

Remove private content on blur, hidden page, stale phase or lost authorization. Keep the public Hack pair public. Reconnect displays current permitted state without replaying old room events, conversations, attacks or deaths. Private receipts can recover accepted commands without creating historical cinematics.

## Handoff

Claude Designer owns storyboards, editable artwork and motion assets; Codex Frontend owns production interaction/layout/director behavior; Backend owns authoritative events; Integration owns reviewed contract versions, source hashes and pins. Preserve the distinction between PR #127 source fixes, PR #116 setup art and actual production adoption.

Each scene handoff includes editable source/hash, anchors, event inputs, audience, timing/easing, semantic feedback, full/reduced-motion variants, interruption behavior and phone previews. Affected roles review the completed specification together during the separately authorized implementation phase. No new asset work, agent dispatch or deployment is performed by this document.
