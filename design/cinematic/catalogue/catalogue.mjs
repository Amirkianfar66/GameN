// mothership:dev-only
//
// The motion bible's event catalogue: every scene of the production brief's coverage table
// (designer-production-brief.md §4, brief 376f437 of 5 November 2026), what triggers it in the
// candidate contract (protocol 3, packages/contracts/src/planet-game.ts at 79418e7), who may see
// it, what it draws, how it starts, loops and ends, how long, what it leaves, what cancels it, what
// it yields to, its sound and its reduced-motion counterpart, with the art that exists and what is
// missing. Scene names are design labels, not API event types: where the contract has no field for
// a trigger, the entry says so and names the request (REQUESTS), and the scene stays a labeled
// design fixture until the contract supports it. Nothing here is a game rule.

export const CATALOGUE_VERSION = 'cinematic-catalogue-0.9.0';
export const CONTRACT = Object.freeze({ protocol: 3, engine: 'planet-game-1.0.0', ruleset: 'in-person-planet-2026-11-05', file: 'packages/contracts/src/planet-game.ts', commit: '79418e72dba99ba99afe047ecb97467fb5e73b62', status: 'candidate; not adopted into runtime' });

/** The lifecycle every presentation follows (the motion bible's rules, for every scene below). */
export const LIFECYCLE = Object.freeze([
  'Clock: t = server time now - the occurrence\'s publishedAt (an event) or the phase\'s startedAt (a stage). Never a local start time, never an animation\'s end. The server\'s endsAt and expiresAt are unchanged by any presentation.',
  'Late load or reconnect: if t >= the film\'s end, draw the final state at once (no replay); if 0 <= t < end, seek to t; a stage presentation (capsule, vote result) snaps to its current pose. Never replay a historical death, Sync or cinematic.',
  'Duplicates: key every presentation by its event id (or phase id); one id plays once per page. A repeated or older viewRevision draws nothing new. An event past expiresAt (publishedAt + 30 s) never starts.',
  'Cancellation: a newer viewRevision that changes what a presentation shows (a seat moved, a phase ended) cancels it: remove its nodes and draw the latest authoritative state. Cancelling never changes game state.',
  'Precedence: terminal result > Sync > Captain commands > medical outcome (death before rescue at one berth) > attack, Blackout and blocked > movement and placement > ambient idles. A higher presentation starting in the same region cancels a lower one to its final state; different regions (another room panel) play concurrently.',
  'Hidden tab: pause nothing on the server; on return compute t again from the server clock and seek or snap. Audio never plays in a hidden tab.',
  'Interaction: press areas, name tags, room labels, timers, Pass and navigation never move, scale or hide for a film; a film may darken or shake only the art layer. Pointer events pass through every film layer.',
  'Gameplay visibility (the owner\'s review of 6 November 2026): by default every film is a board treatment, on phones and the display alike: drawn in the board\'s own layers (a room\'s art, the board\'s film band), under the press areas, slot hits, room labels, timers, Pass and bars, so it covers nothing a player selects or reads. A presentation that covers the board (a display cut, a comic page) plays only in a phase where nobody decides (HACK_RESULT, VOTE_RESULT, FINISHED, ABORTED; design/cinematic/lib/visibility.mjs) and inside that phase\'s own time; in any other phase it gives way to its board treatment from its first frame. No film waits for, extends or takes time from a phase; a presentation stage of its own would be a new phase and is never assumed.',
  'Reduced motion: honoured at load and when changed during playback (a change mid-film switches to the reduced variant at the same t). Reduced variants carry the same information with fades of 80-120 ms, no travel, camera, shake, flash, particles or spin.',
  'Audio: public events only, from the cue sheet (never only inside a video); muted by the device setting; private, room-filtered and pair-private presentations play no public audio by default.',
  'Asset failure: a missing picture or video never blocks: the scene\'s static final state (or its words in the live region) stands alone.',
]);

/** Contract requests the catalogue depends on: named, concrete, for Integration. */
export const REQUESTS = Object.freeze([
  { id: 'R1', scene: 'blackhole-sync', ask: 'Open, for the stage cut only (awaiting the owner\'s approval; not assumed). BLACKHOLE_SYNCED is published at the Sync checkpoint and JAIL_VOTE (60 s) starts at once. The default needs no window: it plays behind the crew, in the rooms\' art, for 2.4 s inside the vote\'s first seconds, on every surface, covering nothing, and the vote\'s endsAt is unchanged. The 5.2 s stage cut covers the board, so it could play only in a presentation stage of its own before the vote (e.g. 5 s, like VOTE_RESULT), which would be a new phase: the owner decides whether one exists.' },
  { id: 'R2', scene: 'private-talk', ask: 'Answered by the owner\'s review of 6 November 2026: the capsule\'s exit stays the live game\'s, on the board. S2\'s approved exit plays on every surface, the display included; there is no exit page. Nothing more is needed.' },
  { id: 'R3', scene: 'doctor-rescue', ask: 'Answered by the owner\'s review of 6 November 2026: the Rescue ends on the authoritative game state. A healed patient who is free returns to Room A or B; one still detained returns to the Jail, wherever the published snapshot places them. The film follows that placement: the patient walks out of the ward, the berth is left empty, and their playable figure at its place is never hidden. RESCUED and the snapshot carry all of it; nothing more is needed.' },
  { id: 'R4', scene: 'core-movement', ask: 'MOVEMENT_COMPLETED and PLACEMENT_CHANGED carry seatIds, location and slotId but not the origin slot: a walk needs the previous finalized placement (the client keeps the last snapshot). Confirm that a reconnecting client without the previous snapshot snaps instead of walking.' },
  { id: 'R5', scene: 'navigation', ask: 'Neutral shared transit: navigation.lastMovedRound and arrivedAt are public; a neutral "the ship moved" presentation needs nothing else. The office-private route view (privateNavigation) needs the previous position to animate a step; confirm it may be derived from the previous view.' },
  { id: 'R6', scene: 'promises', ask: 'Each Promise is evaluated at its own opportunity, not at one shared moment (owner decisions P04, P23 and P24): a meeting Promise when its round\'s voting begins after Sync (the synced places); a Jail Vote or No Jail Vote when its round\'s Jail vote closes (the actual ballot, not the outcome or the admission); Captain Support when the specified election closes (every ballot in which the recipient is a candidate, runoffs included); Officer Selection at that election and its Officer appointment. Same-round Promises finalize at the close of their opportunity in that round; only election Promises may stay Pending until their election or the match end. Confirm that each promises[].status change (Pending to Fulfilled / Not fulfilled / Condition not met) arrives with the viewRevision that closes its own opportunity, so its result plays once, then, and never from a speculative state.' },
  { id: 'R7', scene: 'windows', ask: 'A shown drawing\'s arrival: windows[].drawings[] has order and round but no publishedAt; a stamp-in needs the moment it was shown, or the client stamps on first sight only (no replay on reconnect).' },
  { id: 'R8', scene: 'engineer', ask: 'P14 gives the Engineer a private confirmation of the fixed identities, but the player view has only abilities.engineerSpent. Add the Engineer\'s own record, e.g. abilities.engineerCapture { round, seatIds } (Engineer only), so the confirmation shows the identities the server fixed at registration, never the client\'s preview (someone may move between the two). Until then the file says only that the capture was used.' },
  { id: 'R9', scene: 'hack-spaceship', ask: 'abilities.shipHackSpent cannot tell a hack registered this round (still to apply at this round\'s navigation) from one used in an earlier round. Add abilities.shipHackRound (Hacker only) so the file can say "applies at this round\'s navigation" or "used in Round N". Until then a spent hack is drawn as used, its round unnamed.' },
  { id: 'R10', scene: 'navigation', ask: 'The owner\'s rule is that the Officer privately sees an undecided course (the navigation overlay, confirmed rule 4), but phase.kind NAV_TIE is in every view, the public view and the Captain\'s included, and its 15 s stage runs only on a tie. The public strip and the Captain\'s panel draw the tie stage exactly as the acknowledgement stages ("the course is being set"); the phase kind and its timing still tell anyone. Ask: a neutral phase kind for the tie stage outside the Officer\'s view, or the owner\'s acceptance that a tie is public by its timing.' },
  { id: 'R11', scene: 'navigation', ask: 'privateNavigation.tieChoice and .confirmation have no settled meaning (a tie to choose now, or one chosen; the acknowledgement awaited, or one given). The office panel reads the stage from phase.kind, the controls from offers, and "acknowledged" only from the client\'s own accepted receipt, so an office that reconnects after acknowledging sees "your acknowledgement is closed". Ask: define them, for example confirmation as the acknowledgements already given, so a reconnect can say "you acknowledged".' },
  { id: 'R12', scene: 'hospital-panel-death', ask: 'The patient\'s console cannot show its own result. An accepted PANEL_CODE is only REGISTERED, and abilities.panelAttemptSpent turns true for a right and a wrong number alike, so the view never says whether a shared injection was reserved, whether the Rescue stage treated the patient or spent it without effect, or whether the Blackhole\'s Sync did not keep the request; and no rejection code says that no injection was available (P21: the request is refused before the number is checked, and nothing is spent). The brief asks for pending-reservation, wrong, exhausted and no-effect feedback. Ask: the patient\'s own record, e.g. abilities.panelRequest { round, result: RESERVED | WRONG, status: QUEUED | TREATED | NO_EFFECT | DISCARDED } (that patient only, never the Doctor\'s count), and a rejection code NO_INJECTION that is the same whatever number was sent, so an empty inventory never confirms the Doctor\'s number. If the owner prefers the patient not to learn the result before the Rescue stage, the server sends no result and the console keeps "registered"; it never guesses. Until then the console says only "Your number is registered. Your one attempt is used." and a refusal says "Nothing was used".' },
  { id: 'R13', scene: 'promises', ask: 'A Promise card must state its exact terms (brief; motion requirements), but three terms and one field have no stated sense. (a) NO_JAIL_VOTE has no target (the contract allows one only on JAIL_VOTE): does it rule out voting to jail the recipient, or any Jail ballot at all? The cards read it as "not against the recipient". (b) MEET_A and MEET_B are evaluated at voting start after Sync: whose place decides, the giver\'s alone or both players\'? The cards read it as the giver\'s. (c) electionId is an opaque identifier: add the election\'s round (e.g. electionRound) so a card can say "Round 5\'s Captain election", not only "the next Captain election". (d) promiseQuota.given and .received: does true mean the lifetime slot is used, or still open? Until defined, the ledger reads the slots from the accepted records and never reads promiseQuota.' },
  { id: 'R14', scene: 'lobby-identity', ask: 'The lobby\'s join states need three answers from planet-service.ts. (a) What can a requester read while its admission is pending: a session snapshot with selfSeatId null, a refusal until approved, or nothing? The lobby draws "the host has your request" from requestAdmission\'s ok answer alone, and treats a snapshot with selfSeatId null as the same state. (b) No operation declines an admission: does a request the host never approves stay pending until setup begins, and what does the requester then receive? Until answered, the requester waits with the room code shown and no countdown. (c) A display has no seat, so an admitted display and a pending one both read selfSeatId null: add the requester\'s own standing (e.g. self: { kind, admitted }) or confirm that the client\'s remembered kind decides.' },
]);

const S = (id, scene, fields) => Object.freeze({ id, scene, ...fields });

export const CATALOGUE = Object.freeze([
  S('lobby-identity', 'Lobby and identity', {
    status: 'existing (slice 8) + library group 8 (compact lobby, proposal)', audience: 'session members (public lobby); the host\'s requests and bots on the host\'s phone',
    trigger: 'planet-service.ts session snapshot: status lobby | choosing | reading; roomCode, playerCount, isHost, selfSeatId, members[], pendingAdmissions[]; requestAdmission / approveAdmission / setBots / beginSetup answers; chooseCharacter command result',
    fields: ['status', 'members[].characterId', 'members[].ready', 'own seat'],
    beats: { start: 'matrix appears with the 30 s choosing window', loop: 'taken states update as members choose', exit: 'automatic assignment transition into the role reading stage' },
    durations: { full: 'choosing 30 s (server)', reduced: 'same states, cross-fades 120 ms' },
    final: 'every member with a character; randomized initial A/B placement (no room picker)', cancel: 'a taken character is shown taken at once; a rejected choose returns to selectable', precedence: 'session only',
    audio: 'select click (own phone only)', reduced: 'no slide or pop; state swaps', rosters: '7, 8, 9: the matrix always shows all nine crew; taken greyed', concurrency: 'two members choosing at once: last server state wins',
    assets: ['design/abilities (slice 8: character selection, role card)', 'design/library/successor/ (the lobby at 320 x 568: start, requesting, waiting, host, joined, display, refused, setup; the room-code plate; state map, words, the seat motion)'], gaps: [], request: 'R14',
  }),
  S('role-reveal', 'Role reveal and private card', {
    status: 'existing (slice 8) + library group 8 (current names, the Engineer\'s device)', audience: 'own phone only',
    trigger: 'session status reading + player view self.role / self.faction', fields: ['self.role', 'self.faction', 'session reading deadline'],
    beats: { start: 'card face-down, flip on Ready-to-read', loop: 'held: 30 s minimum reading', exit: 'Ready closes; concealment on window blur' },
    durations: { full: 'flip 600 ms; reading 30 s minimum (server)', reduced: 'no flip: face shown with an 80 ms fade' },
    final: 'card closed, retrievable from Card', cancel: 'window blur conceals the card immediately', precedence: 'own phone only',
    audio: 'none public; optional own-phone flip sound muted by default', reduced: 'face fade', rosters: '7: no Red Disabler / Engineer cards; 8: + Red Disabler; 9: + Engineer', concurrency: 'none',
    assets: ['design/abilities (role cards; Doctor and Engineer names)', 'design/exports/roles (the reviewed held devices; device-cracker draws the Doctor under its historical id)', 'design/library/successor/ (the Engineer\'s held device; names.mjs maps every current role to its device and keeps the removed Officer\'s device undrawn)'], gaps: [],
  }),
  S('core-movement', 'Core board and movement', {
    status: 'existing (board-motion walk, board-v2 slots)', audience: 'public (shared board: finalized placement; phones: own current world)',
    trigger: 'event MOVEMENT_COMPLETED / PLACEMENT_CHANGED (seatIds, location, slotId); board seats', fields: ['events[].seatIds', 'events[].location', 'events[].slotId', 'board.seats[]'],
    beats: { start: 'anticipation 120 ms', loop: 'walk at the approved cadence 1.5 cycles / 450 ms', exit: 'arrival settle 330 ms; movement-spent state on the mover\'s phone' },
    durations: { full: '450-900 ms per move', reduced: 'fade out / fade in at the new slot, 80 ms each' },
    final: 'the seat at its slot in its gesture', cancel: 'a newer placement snaps', precedence: 'below every outcome',
    audio: 'footsteps (public)', reduced: 'swap', rosters: 'slot tables per roster (board-v2 slots-four)', concurrency: 'simultaneous moves animate together; a slot conflict is impossible (server allocates)',
    assets: ['design/board-motion (figures, director)', 'design/board-v2/scenes/slots-four.mjs'], gaps: ['origin slot for walks after reconnect (request R4)'], request: 'R4',
  }),
  S('turn-action', 'Turn and contextual action', {
    status: 'existing (phone kit, turns)', audience: 'own phone; activeSeatId public',
    trigger: 'phase ORDINARY_TURN + activeSeatId; offers[]; command result accepted / rejected', fields: ['phase', 'activeSeatId', 'offers[]', 'self.*Spent'],
    beats: { start: 'your-turn pulse on the top status', loop: 'targets on the board (44 px)', exit: 'receipt stamp: registered, never resolved' },
    durations: { full: 'pulse 600 ms; stamp 900 ms', reduced: 'no pulse; stamp fades' },
    final: 'spent state', cancel: 'phase end closes the overlay', precedence: 'own phone controls stay above every film',
    audio: 'own-phone taps only', reduced: 'no pulse', rosters: 'n/a', concurrency: 'one active seat',
    assets: ['design/phone-kit', 'design/board-v2/js/turns-four.mjs', 'design/library/successor/names.mjs (the overlay\'s successor entries: each command, its current label and its mark from library groups 1 to 6 or the ability kit)'], gaps: [],
  }),
  S('offices', 'Captain and Officer', {
    status: 'existing (votes) + library group 6 (proposal)', audience: 'public (offices, tally, badges, the block marker); the appointment Captain-private; the block panel Officer-private',
    trigger: 'phases CAPTAIN_ELECTION, VOTE_RESULT (5 s), OFFICER_APPOINTMENT (30 s), PRE_TURN (15 s); offices.*; lastTally', fields: ['offices.captainSeatId', 'offices.officerSeatId', 'offices.blockedSeatId', 'lastTally'],
    beats: { start: 'tally panel in VOTE_RESULT; the Captain\'s appointment panel (30 s); the Officer\'s block panel in the pre-turn window (15 s)', loop: 'badges on name tags and the board: the reviewed Captain star, the Officer\'s two chevrons; the block\'s dashed badge and the hazard tape at the blocked figure\'s feet', exit: 'block marker expires at round end (the tape rolls back)' },
    durations: { full: 'VOTE_RESULT 5 s (server); appoint 560 ms, block 480 ms, expire 360 ms', reduced: 'panel without count-up; fades of 160 ms' },
    final: 'badges held by office holders', cancel: 'runoff replaces the panel', precedence: 'stage-bound',
    audio: 'gavel (public) on result', reduced: 'static panel', rosters: 'n/a', concurrency: 'none',
    assets: ['design/phone-kit (five-second vote result)', 'design/exports/public-board marker-captain (the reviewed Captain badge)', 'design/library/offices/ (Officer and block badges and glyphs, the block tape, tray marks; appointment and block panels; state maps, words, motion)'], gaps: [],
  }),
  S('captain-release', 'Captain RELEASE', {
    status: 'existing S6 (approved art, #159)', audience: 'public',
    trigger: 'event CAPTAIN_RELEASE (actorSeatId = Captain, seatIds = released)', fields: ['events[].actorSeatId', 'events[].seatIds', 'board.seats[]'],
    beats: { start: 'console press', loop: 'green signal along the conduit, door unlock', exit: 'prisoners at their new places' },
    durations: { full: '4200 ms (releaseEnd())', reduced: '2240 ms: four stills, 80 ms fades' },
    final: 'Jail door closed, released seats placed', cancel: 'terminal result', precedence: 'Captain commands',
    audio: 'console click, unlock clunk (public)', reduced: 'four stills', rosters: 'n/a', concurrency: 'once per match',
    assets: ['design/board-v2/fx/captain.mjs', 'design/board-v2/films/captain.mjs'], gaps: [],
  }),
  S('captain-eject', 'Captain EJECT', {
    status: 'existing S7 (approved art, #159)', audience: 'public',
    trigger: 'event CAPTAIN_EJECT (actorSeatId, seatIds)', fields: ['events[].actorSeatId', 'events[].seatIds'],
    beats: { start: 'cover lifts, EJECT pressed, lockdown', loop: 'airlock, non-graphic silhouettes', exit: 'empty cell, memorial plaque' },
    durations: { full: '7200 ms (ejectEnd()); a shorter board form exists', reduced: '2560 ms: four stills' },
    final: 'memorial treatment off the board', cancel: 'terminal result', precedence: 'Captain commands',
    audio: 'alarm, hiss (public)', reduced: 'four stills', rosters: 'n/a', concurrency: 'once per match',
    assets: ['design/board-v2/fx/captain.mjs', 'design/board-v2/films/captain.mjs'], gaps: ['a cinematic display cut (proposal, after the pilots review)'],
  }),
  S('shot-injury', 'Ordinary shot and injury', {
    status: 'existing (slice 4, Blackout impact) + library group 8 (admission walk, proposal)', audience: 'public outcome; no shooter',
    trigger: 'events INJURED / ELIMINATED (seatIds, location, slotId, clinicalAnchor) after resolution', fields: ['events[].seatIds', 'events[].clinicalAnchor', 'board.seats[].health'],
    beats: { start: 'cause-neutral hit reaction at the victim', loop: 'none', exit: 'injured transition; the Hospital admission walk (leave with an injured gait, cross between the panels, walk to the berth, lie down: 2400 ms) from a known room slot, else a snap; or offboard' },
    durations: { full: '900-1400 ms', reduced: 'swap to injured state' },
    final: 'Injured at a berth / Eliminated', cancel: 'newer placement snaps', precedence: 'below Captain, above movement',
    audio: 'neutral impact (public)', reduced: 'swap', rosters: 'four beds in every roster; overflow / offboard by anchor', concurrency: 'several victims: same frame, each at its slot',
    assets: ['design/board-v2/fx/lighting.mjs (impact)', 'design/board-v2/films/overflow.mjs', 'design/library/successor/ (the admission walk\'s plan and beats; a snap without R4\'s origin)'], gaps: [], request: 'R4',
  }),
  S('blackout', 'Blackout Strike', {
    status: 'existing (#129, approved)', audience: 'public lighting; selected position private (blackoutTargeting)',
    trigger: 'phase BLACKOUT (15 s) + blackout {previewEndsAt, endsAt}; event BLACKOUT_HIT', fields: ['blackout.previewEndsAt', 'blackout.endsAt', 'blackoutTargeting (own)', 'events BLACKOUT_HIT'],
    beats: { start: '5 s lit, safe flicker', loop: '10 s dark', exit: 'lights return; authorized hit' },
    durations: { full: '15 s (server)', reduced: 'no flicker: a dim step' },
    final: 'lights restored', cancel: 'none (fixed shared timing)', precedence: 'stage-bound',
    audio: 'identical for Blue/Red; no attacker cue', reduced: 'dim step, no flicker', rosters: 'n/a', concurrency: 'one window per round',
    assets: ['design/board-v2/films/blackout.mjs'], gaps: [],
  }),
  S('protection-clone', 'Protection and Phantom Clone', {
    status: 'existing S3 + S4 (approved)', audience: 'private activation; room-filtered ATTACK_BLOCKED (player audience)',
    trigger: 'event ATTACK_BLOCKED (audience player, room observers); abilities.clone / protectionGrants (own)', fields: ['events[] ATTACK_BLOCKED', 'abilities.clone', 'abilities.protectionGrants'],
    beats: { start: 'block flash (identical for both causes)', loop: 'none', exit: 'ATTACK BLOCKED label 1.6 s' },
    durations: { full: '2420 ms (blockedEnd())', reduced: '1760 ms still ring and label' },
    final: 'nothing persists on the board', cancel: 'none', precedence: 'attack class',
    audio: 'none public by default (room-filtered)', reduced: 'still ring', rosters: 'n/a', concurrency: 'several blocks: each in its room',
    assets: ['design/board-v2/films/blocked.mjs', 'design/board-v2/films/clone.mjs'], gaps: [],
  }),
  S('doctor-rescue', 'Doctor Rescue', {
    status: 'PILOT 1 (cinematic pass over the approved S5): the board treatment on phones and the display; the display cut only where nobody decides', audience: 'public',
    trigger: 'event RESCUED (seatIds [patient], location Hospital, slotId Hn, clinicalAnchor HVn), published with the snapshot after Rescue resolution, as the navigation stage or the next round opens (decisions open, so the board treatment plays); fourFilmBerth() decides whether a film plays', fields: ['events[].seatIds', 'events[].slotId', 'events[].clinicalAnchor', 'board.seats[]'],
    beats: { start: 'alert (amber blinks, the unstable trace)', loop: 'iris opens, drone descends, scan, charge', exit: 'revival pulse, stabilized monitor, patient sits up, drone exits; the patient stands and walks out of the ward toward the place the snapshot gives, the berth left empty, the playable figure there back in colour' },
    durations: { full: '6200 ms (board treatment; the display cut the same)', short: '1600 ms nonblocking (stands and leaves the berth)', reduced: '1760 ms: three still states (S5\'s two, then the empty berth)' },
    final: 'the patient Healthy where the snapshot places them (free: Room A or B; still detained: the Jail); the berth empty; never left apparently in a bed, the playable figure never hidden', cancel: 'a newer snapshot moving the patient; a terminal result', precedence: 'medical: a death at the same berth first',
    audio: 'alert blips, hatch, hum, servo, scan, charge, thump, monitor beeps; the seat settle and steps out (public cue sheet)', reduced: 'S5 reduced, then the empty berth', rosters: 'four beds for 7, 8, 9; HV5+ plays no film (words only)', concurrency: 'at most two Rescues a round (two shared injections): both play at their berths, in the board treatment',
    assets: ['design/cinematic/pilots/hospital-rescue/', 'design/board-v2/films/medical.mjs (S5)'], gaps: ['live-action insert: study only (NOT PRODUCED)'], request: 'R3',
  }),
  S('hospital-panel-death', 'Hospital panel and death', {
    status: 'existing S9 / S10 + library group 3 (proposal)', audience: 'patient-private panel (the patient\'s own phone, any role); public death',
    trigger: 'player view offers PANEL_CODE, abilities.panelAttemptSpent, board.seats[].medical; the PANEL_CODE receipt; R12 abilities.panelRequest and rejection NO_INJECTION (proposed); events ELIMINATED with clinicalAnchor', fields: ['offers[] PANEL_CODE', 'abilities.panelAttemptSpent', 'board.seats[].medical (deadline)', 'R12 abilities.panelRequest', 'events ELIMINATED'],
    beats: { start: 'critical loop S9; the console\'s keypad while PANEL_CODE is offered', loop: 'deadline; a number picked, confirmed and sent', exit: 'the receipt (registered), R12 results (reserved, wrong) and fates (treated, no effect, not kept); flatline S10 and shutdown' },
    durations: { full: 'S10 flatline (flatlineEnd()); console: press 180 ms, register 600 ms, reserve 820 ms, wrong 560 ms', reduced: 'still states; console fades of 160 ms' },
    final: 'body at the berth or offboard; the console at rest in its state', cancel: 'Rescue resolved first (server order); the console: phase end, a refused command changes nothing', precedence: 'death before rescue at one berth; the console is own-phone only',
    audio: 'monitor flatline tone (public, soft); none for the console (a sound would tell the ward that a number was tried)', reduced: 'stills', rosters: 'four beds; keypad 1 to 7, 8 or 9', concurrency: 'per berth; one panel attempt per player per match',
    assets: ['design/board-v2/films/medical.mjs (S9, S10)', 'design/library/hospital-panel/ (console, lamps, vial, strike, scan, key caps, tray mark; state map, words, motion)'], gaps: [], request: 'R12',
  }),
  S('supplier', 'Supplier and weapons', {
    status: 'existing (slice 3) + library group 8 (the Round 3 Supply receipt)', audience: 'own-private', trigger: 'player view self.ordinaryWeapons grown at Round 3\'s Supply stage (after Rescue), against the previous view; the Supplier\'s own SUPPLY receipt', fields: ['self.ordinaryWeapons', 'offers[] (two-target)'],
    beats: { start: 'private two-target selection; the Supplier\'s phone says when the delivery happens', loop: 'none', exit: 'each recipient\'s own receipt: the crate drops in and its seal tag lights' }, durations: { full: '520 ms receipt', reduced: '160 ms fade' },
    final: 'inventory count', cancel: 'phase end', precedence: 'own phone', audio: 'none public', reduced: 'swap', rosters: 'n/a', concurrency: 'none',
    assets: ['design/abilities (Supplier)', 'design/library/successor/ (the crate; the receipt\'s state and words)'], gaps: [],
  }),
  S('insider', 'Insider investigation', {
    status: 'existing (slice 1, approved)', audience: 'own-private (Insider)', trigger: 'knowledge.insiderSeatIds', fields: ['knowledge.insiderSeatIds'],
    beats: { start: 'dossier opens', loop: 'inspection', exit: 'close' }, durations: { full: 'interactive', reduced: 'no pin wobble' },
    final: 'dossier closed', cancel: 'window blur conceals', precedence: 'own phone', audio: 'none public', reduced: 'static', rosters: 'n/a', concurrency: 'none',
    assets: ['design/abilities (cork board)'], gaps: [],
  }),
  S('hacker', 'Hacker investigation', {
    status: 'existing (slice 2) + library group 1 (final Code)', audience: 'own-private (Hacker)', trigger: 'knowledge.scanResults; abilities.codeAttempted, shipHackUnlocked, scanBlockedThroughRound; offers SCAN, SUBMIT_CODE', fields: ['knowledge.scanResults[]', 'abilities.codeAttempted', 'abilities.shipHackUnlocked', 'abilities.scanBlockedThroughRound', 'offers[]'],
    beats: { start: 'scanner; final Code card (from Round 2)', loop: 'result', exit: 'cooldown; Code punched: UNLOCKED or WRONG CODE' }, durations: { full: 'scan 1200 ms; final Code unlock 1000 ms, wrong 600 ms', reduced: 'two 80 ms fades' },
    final: 'membership shown; unknown distinct from false; the one final Code spent either way', cancel: 'phase end', precedence: 'own phone', audio: 'none public', reduced: 'swap', rosters: 'n/a', concurrency: 'none',
    assets: ['design/abilities (Hacker file)', 'design/library/hack-engineer/ (final Code states, punch, unlock)'], gaps: [],
  }),
  S('hack-spaceship', 'Hack Spaceship', {
    status: 'library group 1 (proposal)', audience: 'own-private (Hacker); the office direction view shows only the final direction', trigger: 'abilities.shipHackUnlocked, shipHackSpent; offers ACTIVATE_SHIP_HACK; command ACTIVATE_SHIP_HACK (no payload)', fields: ['abilities.shipHackUnlocked', 'abilities.shipHackSpent', 'offers[]', 'self.roleActionSpent', 'board.seats[] (own)'],
    beats: { start: 'sealed cartridge until a correct final Code; armed once unlocked', loop: 'eligible on an offered turn', exit: 'the cartridge seats in the port: RETAINED; later USED' }, durations: { full: 'insert 900 ms on the accepted receipt', reduced: 'two 80 ms fades' },
    final: 'used (scorched cartridge) for the rest of the match in the selected world', cancel: 'phase end; a refused command changes nothing', precedence: 'own phone',
    audio: 'none (private)', reduced: 'swap', rosters: 'n/a', concurrency: 'one activation a match',
    assets: ['design/library/hack-engineer/ (cartridge sealed/armed/used, port, sparks, tray mark)'], gaps: ['no public or office cue for the hack beyond the direction itself: none is authorized'], request: 'R9',
  }),
  S('engineer', 'Engineer', {
    status: 'library group 1 (proposal)', audience: 'own-private (Engineer); targets, offices and the display receive nothing (P14)', trigger: 'abilities.engineerSpent; offers ENGINEER_SUPPRESS; command ENGINEER_SUPPRESS (no payload: the server captures the opposite room)', fields: ['abilities.engineerSpent', 'offers[]', 'board.seats[] (the opposite room, the preview)', 'abilities.engineerCapture (proposed, R8)'],
    beats: { start: 'viewfinder over the opposite room as it is now', loop: 'none', exit: 'brackets close, a dark shutter blink, the print develops: CAPTURED' }, durations: { full: 'capture 1200 ms on the accepted receipt', reduced: 'two 80 ms fades' },
    final: 'the print in the Engineer file, the clamp closed', cancel: 'phase end; a refused command changes nothing', precedence: 'own phone', audio: 'none (no confirmation sound)', reduced: 'swap', rosters: '9 players only', concurrency: 'once a match',
    assets: ['design/library/hack-engineer/ (viewfinder, print, clamp ready/used, tray mark)'], gaps: [], request: 'R8',
  }),
  S('private-talk', 'Private Talk capsule', {
    status: 'PILOT 3 (the display\'s entrance page over the approved S2, in the result stage; the talk and the exit are S2 on the board everywhere)', audience: 'public pair and transitions; pair-private declaration',
    trigger: 'hackSession {id, actorSeatId, targetSeatId} (public); phases HACK_DECLARE (15 s), HACK_RESULT (5 s), HACK (60 s)', fields: ['hackSession', 'phase.kind', 'phase.startedAt', 'phase.endsAt', 'board.seats[]'],
    beats: { start: 'in HACK_RESULT: page assembles, the pair step out, door opens', loop: 'HACK: seated variations (speaker-neutral)', exit: 'after HACK: S2\'s exit on the board, every surface: door opens, walk out, step back in at the latest places' },
    durations: { full: 'entrance 4900 ms inside the 5 s result stage; exit 2530 ms (S2, on the board)', reduced: 'entrance 2000 ms; exit 700 ms (S2 swaps)' },
    final: 'the pair at their latest places', cancel: 'a late load snaps to the current pose; the talk keeps its server endsAt', precedence: 'stage-bound; Sync after it',
    audio: 'steps, door, busy chime (public); no conversation audio', reduced: 'S2 reduced', rosters: 'n/a', concurrency: 'one session at a time',
    assets: ['design/cinematic/pilots/private-talk/', 'design/board-v2/films/capsule.mjs (S2)'], gaps: ['live-action study not needed (comic-only by design)'], request: 'R2',
  }),
  S('blackhole-sync', 'Blackhole and Sync', {
    status: 'PILOT 2: behind the crew on every surface; the display\'s stage cut only with an approved presentation stage (R1)', audience: 'public',
    trigger: 'event BLACKHOLE_SYNCED (public, actorSeatId null), after Sync, as JAIL_VOTE opens; the board already the selected world\'s finalized checkpoint', fields: ['events[] BLACKHOLE_SYNCED', 'board (FINALIZED)'],
    beats: { start: 'each room\'s back wall gives way to one shared field of space', loop: 'the blackhole forms at the board\'s centre; the ship streaks behind the rooms into it', exit: 'the flare; the walls return' },
    durations: { full: '2400 ms behind the crew, every surface, inside the Jail vote\'s first seconds', stage: '5200 ms display cut, only in a presentation stage the owner approves (R1)', reduced: '1440 ms: the still blackhole in the walls' },
    final: 'the synced board', cancel: 'terminal result', precedence: 'above everything but a terminal result; drawn in the rooms\' art, under every figure, tag, label, press area, timer and bar',
    audio: 'sting, whoosh, rumble (public); the stage cut: rumble, sting, whoosh, thump, cut', reduced: 'the still blackhole in the walls, 120 ms fades', rosters: 'n/a', concurrency: 'once per match (one lifetime use)',
    assets: ['design/cinematic/pilots/blackhole/'], gaps: ['live-action insert: study only (NOT PRODUCED)'], request: 'R1',
  }),
  S('navigation', 'Navigation', {
    status: 'library group 2 (proposal)', audience: 'office-private route panel (Captain and Officer); public neutral transit; the destination public only on arrival', trigger: 'privateNavigation (offices); phases NAV_TIE, NAV_CAPTAIN_CONFIRM, NAV_OFFICER_CONFIRM; offers CHOOSE_NAV_DIRECTION, CONFIRM_NAVIGATION; MOVEMENT_COMPLETED (public event); navigation.lastMovedRound, arrivedAt', fields: ['privateNavigation.position', 'privateNavigation.direction', 'offers[]', 'phase.kind', 'navigation.lastMovedRound', 'navigation.arrivedAt', 'events[] MOVEMENT_COMPLETED'],
    beats: { start: 'the Y-route panel: the ship at its place; at navigation the final direction and the step it makes', loop: 'the Officer\'s choice on an undecided course; each office\'s acknowledgement (no veto)', exit: 'the token steps along the arm, across a rung or into a planet; the public transit behind the crew, the same every movement' }, durations: { full: 'transit 2400 ms display, 1800 ms phone; panel step 900 ms; stamps 420 to 520 ms', reduced: 'stills with 160 ms fades' },
    final: 'the panel at the new place; the public chip "Round N: the ship moved"', cancel: 'phase end; a refused command changes nothing; a late join draws the result at rest', precedence: 'stage-bound (public, behind the crew in the rooms\' art layers: it covers nothing as the next round opens)', audio: 'engine hum and pass (public, the same every movement); none on the offices\' phones', reduced: 'stills', rosters: 'n/a', concurrency: 'one movement a round',
    assets: ['design/library/navigation/ (route panel, 10 course overlays, ship token, tray mark, movement chip; films: transit and both arrivals; exports in design/cinematic/exports/navigation/)', 'design/cinematic/pilots/blackhole/art.mjs shipSvg() (the ship in profile)'], gaps: [], request: ['R5', 'R10', 'R11'],
  }),
  S('promises', 'Promises', {
    status: 'library group 4 (proposal)', audience: 'pair-private (the giver\'s and the recipient\'s own phones only)',
    trigger: 'offers OFFER_PROMISE (targetSeatIds, promiseTargetSeatIds), ACCEPT_PROMISE, DECLINE_PROMISE during private talk (phase HACK); promises[] (offerStatus, status) and the command receipts', fields: ['offers[] OFFER_PROMISE / ACCEPT_PROMISE / DECLINE_PROMISE', 'promises[]', 'promiseQuota (not read: R13)'],
    beats: { start: 'six cards in private talk; the exact terms reviewed before sending', loop: 'the offer in transit; Accept and Decline of equal weight', exit: 'the Pending seal on acceptance; the result\'s seal as that Promise\'s own opportunity closes (R6)' },
    durations: { full: 'offer 720 ms, arrive 760 ms, accept 560 ms, decline 600 ms, result 720 ms', reduced: 'fades of 160 ms' },
    final: 'the ledger: one Promise given and one received, each with its status', cancel: 'phase end (an unanswered offer expires); a refused command changes nothing; a reconnect draws everything at rest', precedence: 'own phone (pair-private)',
    audio: 'none (pair-private: a sound would tell the table that a Promise was offered, made or decided)', reduced: 'fades', rosters: 'n/a', concurrency: 'one accepted Promise given and one received per match; declined and unanswered offers use nothing',
    assets: ['design/library/promises/ (six kind pictures, four result seals, the envelope, the card band and the tray mark; state maps, words, motion)'], gaps: [], request: ['R6', 'R13'],
  }),
  S('windows', 'Windows and drawing', {
    status: 'library group 5 (proposal)', audience: 'window-scoped (players at either end of a window); the pad station-private; the station markers public on the board',
    trigger: 'windows[] (windowId, canDraw, drawings[] by order); offers SHOW_WINDOW (windowIds); the SHOW_WINDOW receipt; phase BLACKOUT', fields: ['windows[]', 'offers[] SHOW_WINDOW', 'board.seats[] (own location and slotId)', 'phase.kind'],
    beats: { start: 'the window to the other room: its lintel, the pane with this round\'s shown drawings', loop: 'the local pad at a station (inks, widths, undo, clear); Show after a warning that nothing can be erased', exit: 'the drawing lifts into the pane, SHOWN; a new drawing drops in on first sight; the shade lowers for the Blackout and rises after' },
    durations: { full: 'show 760 ms, arrive 420 ms, dark 420 ms, light 320 ms', reduced: 'fades of 160 ms' },
    final: 'the pane with every drawing shown this round, numbered, with its author; empty at the next round', cancel: 'round end expires the drawings; a refused Show keeps the local drawing; a reconnect draws everything at rest', precedence: 'window audience only; the Blackout darkens every window',
    audio: 'none (a sound would tell the table that someone drew or showed)', reduced: 'fades', rosters: 'n/a', concurrency: 'append-only, in shown order; any number per round within the drawing budget',
    assets: ['design/library/windows/ (three lintels, the station marker, the pad paper, the Blackout shade, the tray mark; the drawing renderer; state maps, words, motion)'], gaps: [], request: 'R7',
  }),
  S('arrival-end', 'Arrival, no survivors and recovery', {
    status: 'library group 7 (proposal) over the arrival films (group 2)', audience: 'public (endReveal on FINISHED); each screen\'s own connection and failure states', trigger: 'phase FINISHED / ABORTED; result {winner, reason, alienCoWinner}; endReveal {roles, code}; the client\'s own transport and clock', fields: ['result', 'endReveal', 'phase.startedAt', 'phase.endsAt'],
    beats: { start: 'the arrival film (group 2)', loop: 'the reveal: the side\'s banner and emblem, each role turning face up in seat order, the Code stamping into its plate; or the no-survivors flat line; or the abort', exit: 'held: the end screen at rest' },
    durations: { full: 'arrival 3400 ms phone / 4200 ms display, then the reveal 1940 ms (7 seats) to 2120 ms (9); no survivors 1300 ms', reduced: 'stills: fades of 160 ms' },
    final: 'the end screen: the ending in words, every role by side, winners marked from the result, the Code', cancel: 'none; a late join seeks, a reconnect after the end draws it at rest (filmDecision)', precedence: 'top',
    audio: 'the arrival\'s single sting (public), no new cue; the reveal, the abort and recovery are silent', reduced: 'stills', rosters: '7, 8 and 9: the reveal lists every seat', concurrency: 'once per match',
    assets: ['design/library/navigation/films.mjs (the arrival at either planet, library group 2)', 'design/library/end/ (side emblems and banners, the Code plate, the flatline, the connection and failure marks; state maps, the film lifecycle decision, words, motion)'], gaps: [],
  }),
]);
