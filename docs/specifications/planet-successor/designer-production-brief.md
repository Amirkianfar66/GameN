# GameN cinematic and interactive art production brief

Recipient: the existing Claude Code Visual and Motion Designer. Integration handoff, 5 November 2026.

The owner requests AAA-quality animation, live-action video concepts and interactive graphics driven by actual GameN events. Continue your existing GameN art and character work. Deliver usable source assets, working motion studies and a precise Frontend handoff, not only descriptions or image-generation prompts. AAA is the quality ambition: consistent art, convincing character movement, clear interaction, polished composition and sound. It is not a claim that the game has an AAA budget or has passed production validation.

This brief authorizes design production within your existing ownership. It adds no gameplay rules, information permissions, paid production commitments or deployment authorization. The successor game implementation continues in parallel; the whole art library is not a prerequisite for the first correct playable build.

## 1. Start from the actual work

Repository: `Amirkianfar66/GameN`. Read `CLAUDE.md`, `AGENTS.md`, `CODEX_START_HERE.md`, `agents/designer.md`, and the current project context. Historical runner and bootstrap status in these files is not the current assignment: Claude owns Visual and Motion Design; Codex owns the current Frontend, Backend and Integration work.

Record your actual checkout path, branch, HEAD and uncommitted work before changing anything. Inventory your existing local files and PR work, including unmerged artwork. Do not reset or overwrite it and do not substitute old production art for newer reviewed Designer work.

Known source families to reconcile include `design/board-motion/figures/body.mjs`, character motion rigs, scene/slot modules, Hospital ward art, phone kit, ability dossier, Blackout, blocked-impact, patient/prisoner clothing and the private-talk capsule. Locate your current versions; this is not a claim that every historical path exists in the integration checkout. Report any missing source explicitly.

Current gameplay baseline: `db65bb87f05983ff6861d27689ba1b7bab55d051`.
Design reference: `26947b1fbf001275b5f1979f5732824fe08af783`.
Committed successor specification and initial contracts: `29e6ea82a31085df12ddee62758a55646eecbd3a`, branch `codex/successor-rules-integration`.
Session and audience-safe event contract refinement: `79418e72dba99ba99afe047ecb97467fb5e73b62`.

Read these six files together from that commit or the later Integration handoff:

- `docs/specifications/planet-successor/README.md`
- `docs/specifications/planet-successor/owner-decisions.md`
- `docs/specifications/planet-successor/game-design.md`
- `docs/specifications/planet-successor/rules-contracts.md`
- `docs/specifications/planet-successor/motion-requirements.md`
- `docs/specifications/planet-successor/implementation.md`

Integration is refining the candidate contracts with Frontend. Pin the exact adopted commit before production wiring. The candidate is protocol 3, engine `planet-game-1.0.0`, ruleset `in-person-planet-2026-11-05`; it is separate from existing protocol 2 matches. Studio publication is not runtime activation. Do not change `reference/design-canvas/` or historical manifests.

## 2. Art direction and quality

Preserve the established 2D/2.5D Comic Noir and Retro Sci-Fi identity: ink contours, halftone, graphic-novel panels, tactile consoles, deliberate lighting and recognizable crew characters. Retain the existing board composition and interactive locations. Improve staging, depth, material treatment, rigging, reactions and transitions without replacing the approved identity with a generic photorealistic space game.

Create coherent character idle, anticipation, walk, turn, sit, operate, react, recover and settle poses. Ground feet and hands in the scene, respect scene occlusion and preserve each character's identity in normal, patient and prisoner clothes. Idle motion must not suggest microphone activity, a private action, a role, or a decision that the server has not disclosed.

Use live-action video as a distinct proposed content track. Prepare a treatment and short sample for cinematic inserts: spaceship approach, a physical console, emergency corridor, medical machinery or a blackhole passage. Grade and composite them into the comic direction. Identify whether each sample is filmed, generated or stock; record provenance and usable rights. Do not represent generated footage as an actual shoot. If video tools or footage are unavailable, provide the storyboard, animatic, shot list and exact production prompts, and label the finished video as not produced. Do not buy assets or incur production charges without authorization.

Keep selectable characters, room labels, slots, cards and timers as interactive layers. A prerendered movie must not bake in player names, secret roles, variable outcomes or controls. Supply a still/poster and lightweight animated alternative for every video. A video should never be required to understand or complete a turn. Use existing original sound motifs or propose new ones with provenance; private information must also remain private in sound and vibration.

## 3. Current rules that affect the art

- Seven to nine players. Current secret roles: Insider, Doctor, Blue Disabler, Supplier, Undercover, Hacker, Alien; eight adds Red Disabler; nine adds Engineer. Doctor replaces Cracker and Engineer replaces Soldier Blue in current text. Captain and Officer are public offices over a secret role. There is no secret Officer role.
- The private role card may use faction identity. Public crew, clothes, status accents, preload patterns and effects must not identify a hidden faction.
- The ship travels along a Y route to Blue Planet or Red Planet, with one movement per round and no five-round cap. Only Captain and Officer see the current route and final direction. Other players receive neutral completed-movement feedback until arrival. Do not resurrect Final Showdown or direct Code victory.
- Insider sees the three candidate characters and the unordered role set Undercover, Alien, Doctor. Do not pair a role label, string, color or accessible description with an individual candidate. Their own number plus this set gives the complete Code. Alien does not receive the full Code.
- Hacker Scan, the single final Code submission, permanent unlock and once-used Hack Spaceship are distinct states. Unlock is not activation, ship movement or victory. Standard Hack is the separate private-conversation action.
- Hospital has four physical beds in every roster size. Preserve authoritative overflow, offboard and clinical-anchor rules. Do not illustrate a fifth bed or heal an eliminated player. A panel request reserves one of the Doctor's two shared injections; accepted registration is not a successful Rescue.
- Blackhole can select a complete inherited reality. Private phones display their authorized current world; the shared board consistently shows the latest finalized public checkpoint, with live clock, turn and talk participants. No early Blackhole badge or branch label. No personal world identifiers in assets or effects.
- Promises and shown drawings survive Sync but remain restricted to their authorized audiences. Current-round Promise outcomes use finalized selected state, not discarded local scenes. Window drawings are claims, not verified evidence.

## 4. Event and scene coverage

The following names are design catalogue labels, not permission to invent API event types. Map each to an approved field or event with Backend and Frontend. An unsupported trigger remains a labeled design fixture until the shared contract supports it.

| Scene | Required art and interaction | Audience and authoritative boundary |
| --- | --- | --- |
| Lobby and identity | Compact host/join states, nine-character selection matrix, pressed/selected/taken states, automatic assignment transition | Preserve 30-second character selection and randomized initial A/B placement; no initial-room picker |
| Role reveal and private card | A legible full card, restrained reveal, flip/close, loading and concealment states | Own phone only; 30-second minimum reading plus Ready. No collapsed or unreadable card and no extra prose panel |
| Core board and movement | Rich room layers, neutral living crew, stable nameplates, room-tag and empty-slot targets, grounded walks, arrival/settle, movement-spent state | Use authorized current placement; same-room seat changes consume movement. Fixed slots remain hittable. Shared board uses finalized placement |
| Turn and contextual action | Compact top status, central Pass, action overlay, direct on-board targets, selection, pending, registered, rejected and spent states | A receipt stamp never suggests a shot, heal or other result has resolved. Preserve original command/retry semantics |
| Captain and Officer | Election/vote-result panels, public office badges, appointment, public movement-block marker and round expiry | Keep office badges distinct from secret roles. Show only authorized ballots/results; vote result has a five-second server stage |
| Captain RELEASE | Command-console operation, green command signal, Jail unlock, authorized physical prisoners leave | Direct Captain command, once per match; no release vote and no automatic release of Hospital detention reservations |
| Captain EJECT | Protected red button, warning/lockdown, airlock, non-graphic ejection silhouettes, closing/empty-state composition | Direct once-per-match command; affect only authorized physical Jail occupants. Both command spent states persist across Captain changes |
| Ordinary shot and injury | Cause-neutral hit/reaction, injured transition, authoritative Hospital admission; elimination/offboard variant | Reveal no hidden shooter or trajectory. Do not animate proposed damage before the resolved event; respect event audience |
| Blackout Strike | Five seconds lit with stable positions, safe flicker, ten seconds dark, selected-position private feedback, authorized hit and restored light | Identical Blue/Red public treatment and fixed shared timing, including miss, timeout and no strike. No attacker cue or role-specific sound. Windows cannot bypass darkness |
| Protection and Phantom Clone | Private Protection/Clone activation study; identical room-visible attack-block flash/reaction for both | Show the same target/effect/timing/sound to authorized room observers; never expose source/defense cause or replay it to other rooms/shared display without explicit authorization. Clone lasts through the following round and can block multiple eligible attacks |
| Doctor Rescue | Hospital alert, ceiling drone, scan, revival pulse, stabilized monitor, identity-preserving recovery, drone exit | Start only on an authorized successful result. No line from Doctor to patient or source-identifying effect. Suggested 5–6-second full treatment also needs a short nonblocking variant |
| Hospital panel and death | Patient-private code console, pending reservation, wrong/exhausted/no-effect feedback, medical deadline, flatline/shutdown, final state | Empty inventory must not validate a guessed Doctor number. Server controls rescue/death ordering. Four beds; clinical/offboard anchors must not be guessed |
| Supplier and weapons | Private supply interaction, two-target selection vocabulary, inventory receipt and valid resource state | Do not publicly identify Supplier, recipients or hidden resource transfers through a delivery animation unless the contract expressly permits them |
| Insider investigation | Classified cork-board dossier, three portraits, pins, envelope and inspection interaction | All role labels remain an unordered set. No visual or screen-reader mapping from portrait to role |
| Hacker investigation | Private Scanner, correct/incorrect result, next-round cooldown, one Code attempt, unlock and spent states | Show only authorized Code membership/feedback. Keep unknown distinct from false. Unlock never triggers a Red route animation on a public screen |
| Hack Spaceship | Private console breach, armed/eligible/submitting/retained-used states; neutral external ship response if authorized | Red override is visible only through the approved office direction view. After Sync, derive use/effect from selected current state, including inherited activations; do not replay discarded action history |
| Engineer | Private opposite-room snapshot/selection treatment, registered suppression and spent state | Fixed captured identities; no public target glow, cannot-vote badge, suppression count or confirmation sound |
| Private Talk capsule | Capsule directly beside Command Room, approximately half its width; two characters walk in, sit/talk subtly, exit and return | Public participants and transitions; private declaration/content. Capsule is not a sixth playable room. Preserve underlying slots/eligibility. Declaration up to 15 seconds, private result 5 seconds, then the full 60-second talk; entrance must not consume talk time or extend the server timer |
| Blackhole and Sync | Luminous BLACKHOLE title, ship passage, cinematic comic cut and a clear settled-board transition | Trigger only after the authorized reveal/Sync checkpoint. No early branches, counters or population cues. Selected effects and costs stay together; visual completion cannot select the world or finalize gameplay |
| Navigation | Private Y-route instrument panel, direction/tie/acknowledgement states, neutral shared transit, planet arrival composition | Same-side advances; switching keeps depth and costs the round's single movement. Do not expose weight totals, separate Captain weight or pre-override direction |
| Promises | Six distinct fixed cards, exact term/recipient/target, offer/accept/decline, lifetime quotas and four result states | Pair-private. Pending, Fulfilled, Not fulfilled, Condition not met. Never label Not fulfilled as proof of lying; distinguish a submitted vote from its outcome |
| Windows and drawing | Three framed views, four drawing stations, local canvas, Show, immutable chronological images, author and expiry | Only A–B, A–Hospital, B–Jail endpoints. No transitive view or new voice channel; Hospital/Jail may view but have no drawing station. No erase/replace after Show |
| Arrival, no survivors and recovery | Team arrival with eligible Alien co-win, authorized end reveal, no-survivor state, reconnect/stale/asset-failure states | Only authoritative terminal results. All jailed/injured is not no survivors. Restore the latest state on reconnect; do not replay historical death, Sync or cinematic sequences |

## 5. Production deliverables

Deliver in small reviewable packages, preserving your exact source work:

1. **Inventory and gap map:** current source path, commit, SHA-256, author/provenance, approved/proposed status, source family, current runtime use and missing work. Include a before/after contact sheet so newer art cannot silently disappear during integration.
2. **Motion bible and event catalogue:** for every scene above, specify trigger, recipient audience, input fields, start/loop/exit, duration, final state, cancellation, precedence, audio and reduced-motion counterpart. Cover 7/8/9 players and concurrent events.
3. **Three polished pilot treatments:** the Hospital drone sequence; Blackhole reveal/ship passage; Private Talk capsule walking/entry/conversation/exit. Reuse the existing rig and scene art. Include an integrated comic treatment and a separate live-action insert study where appropriate. Review these before multiplying the full library; routine asset work can continue in parallel.
4. **Complete role and environment library:** finish the remaining coverage table in focused asset groups. Deliver editable sources plus runtime exports, transparent layers where appropriate, and static fallbacks. Prompts alone are not finished assets.
5. **Interactive review gallery:** labeled synthetic fixtures that scrub time, switch normal/reduced motion and phone sizes, exercise cancel/reconnect/duplicate events, and compare permitted audiences. Keep this gallery out of production bundles. Show what is implemented versus an animatic or proposal.
6. **Frontend handoff and exact export manifest:** include the integration details below, exact hashes and reproducible generation commands. Explain any dependency not yet available from Backend rather than inventing its data.

Suggested first release order: readable card/board/controls and capsule; current action/outcome feedback; new navigation/Hacker/Engineer/medical/Promise/window states; full cinematic polish and live-action options. This is production sequencing, not removal of any requested art.

## 6. Frontend and Backend coordination

Own only `design/`, `packages/design-tokens/` and `docs/design/` in a separate worktree/branch. Frontend owns player/public components, scene mounting, controller state, retries and browser integration. Backend authorizes events, visibility, deadlines, world selection and resources. Integration owns shared schemas, manifests adopted into runtime, version pins and release.

Before implementation handoff, agree on stable asset IDs, rig/scene coordinates, slot anchors, layer order, container aspect ratios, clipping, camera behavior, CSS/token names, gesture targets and reduced-motion lifecycle. Preserve the approved board hierarchy and capsule placement. New artwork must not force Frontend to guess how state maps to it.

For each exported asset or timeline supply:

- ID/version, source/export paths, SHA-256, byte size, dimensions, frame rate/duration where relevant, alpha/codec details and provenance.
- Required authorized fields; exact contract/event revision; public, room-filtered player, own-private, office-private or pair-private audience.
- Mounting anchor and layer, logical coordinates, semantic labels/text kept outside imagery, masks and pointer behavior.
- Pending versus resolved treatment, duplicate/stale suppression, expiry, cancellation, tab-hidden behavior and restoration after reconnect.
- Normal, reduced-motion, static, muted and asset-failure variants with the same information and interaction.
- Preload/bundle plan reviewed for secret-dependent network requests. Do not introduce large per-role downloads that reveal a player's identity; use neutral uniformly selected loading groups or another reviewed privacy-preserving plan.
- Performance evidence, actual device/browser tested and any untested items.

Propose missing event fields in a handoff request with a concrete scene. Do not edit rules, engine, contracts, API scheduling, Firebase, root manifests/lockfiles or CI to make an animation work. Do not modify live matches, Studio authority or deploy. Integration review adopts named files and hashes; a prototype's presence alone is not approval to ship it.

## 7. Mobile, accessibility and timing acceptance

Primary canvas: a usable phone board at 320×568 and 390×844 CSS pixels, including browser chrome/safe-area constraints. Preserve the compact top bar, central Pass and bottom navigation. Default play must not require page scrolling. Enlarged text and assistive technology must remain usable; do not clip content to satisfy a screenshot.

Room labels, timers, player targets and navigation stay stable and accessible during effects. Retain 44 px targets and a clear selected/pending/final distinction. Do not turn player targeting into a separate long list when the board supplies the targets.

No decorative animation pauses the engine, extends a phase or spends a decision window. Long medical/ejection films need shorter or nonblocking forms; the latest authoritative state takes priority. For Private Talk, coordinate entrance with the existing pre-talk stages and snap to the correct current pose if loading late. A late arrival still uses the original authoritative end time, not a new local 60-second countdown.

Honor reduced motion both at load and when changed during playback. Supply non-flashing equivalents, text/shape alternatives and muted playback; avoid rapid high-contrast flashes. Give camera moves and shake conservative optional treatments that do not move hit targets. Private cues use no public audio by default.

Agree provisional byte/CPU/GPU/video budgets with Frontend from measured phone results. Record cold-load and peak-event costs. Lazy loading must not expose secrets; autoplay failure, unsupported codec, poor connectivity and low-power mode need immediate usable fallbacks. Do not claim real-device, screen-reader or performance validation from desktop screenshots alone.

## 8. Report and review

Return your checkout/branch/base SHA, preserved and changed source inventory, delivered scenes, preview entry points, exact hashes, Frontend adoption instructions, contract requests and checks actually run. List produced video separately from storyboards/prompts and mark missing assets or testing honestly. Distinguish new proposals from owner-approved gameplay.

Keep the main implementation moving: deliver the first usable asset package without waiting for every cinematic. Never substitute an older design silently. If a newer scene cannot be integrated yet, record the exact missing dependency and its fallback so the owner can see which artwork is actually in the playable build.
