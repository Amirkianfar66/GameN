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

export const CATALOGUE_VERSION = 'cinematic-catalogue-0.4.0';
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
  'Reduced motion: honoured at load and when changed during playback (a change mid-film switches to the reduced variant at the same t). Reduced variants carry the same information with fades of 80-120 ms, no travel, camera, shake, flash, particles or spin.',
  'Audio: public events only, from the cue sheet (never only inside a video); muted by the device setting; private, room-filtered and pair-private presentations play no public audio by default.',
  'Asset failure: a missing picture or video never blocks: the scene\'s static final state (or its words in the live region) stands alone.',
]);

/** Contract requests the catalogue depends on: named, concrete, for Integration. */
export const REQUESTS = Object.freeze([
  { id: 'R1', scene: 'blackhole-sync', ask: 'A presentation window for BLACKHOLE_SYNCED: the event is published at the Sync checkpoint and the next phase (JAIL_VOTE, 60 s) starts at once. Either a fixed post-Sync stage (e.g. 5 s, like VOTE_RESULT) or confirmation that the display may overlay the vote\'s first 5.2 s while phones show only the 2.4 s band over the board (never over the ballot controls). Until answered, the pilot assumes the overlay and the server\'s vote endsAt is unchanged.' },
  { id: 'R2', scene: 'private-talk', ask: 'The exit: the conversation\'s end is HACK\'s endsAt and the next phase starts at once. Confirm the display may show the 2.8 s exit page over the next phase\'s first seconds, or keep S2\'s board-only exit on the display too.' },
  { id: 'R3', scene: 'doctor-rescue', ask: 'RESCUED carries seatIds, location, slotId and clinicalAnchor: enough. Confirm the published snapshot\'s placement of a rescued patient (still at the berth, or back in a room, as the 1.8.0 fixtures had it), so the film ends on the right figure; the pilot handles both.' },
  { id: 'R4', scene: 'core-movement', ask: 'MOVEMENT_COMPLETED and PLACEMENT_CHANGED carry seatIds, location and slotId but not the origin slot: a walk needs the previous finalized placement (the client keeps the last snapshot). Confirm that a reconnecting client without the previous snapshot snaps instead of walking.' },
  { id: 'R5', scene: 'navigation', ask: 'Neutral shared transit: navigation.lastMovedRound and arrivedAt are public; a neutral "the ship moved" presentation needs nothing else. The office-private route view (privateNavigation) needs the previous position to animate a step; confirm it may be derived from the previous view.' },
  { id: 'R6', scene: 'promises', ask: 'Promise result transitions (Pending to Fulfilled / Not fulfilled / Condition not met) need the evaluation moment: confirm promises[].status changes arrive with a viewRevision at the evaluation (voting start after Sync).' },
  { id: 'R7', scene: 'windows', ask: 'A shown drawing\'s arrival: windows[].drawings[] has order and round but no publishedAt; a stamp-in needs the moment it was shown, or the client stamps on first sight only (no replay on reconnect).' },
  { id: 'R8', scene: 'engineer', ask: 'P14 gives the Engineer a private confirmation of the fixed identities, but the player view has only abilities.engineerSpent. Add the Engineer\'s own record, e.g. abilities.engineerCapture { round, seatIds } (Engineer only), so the confirmation shows the identities the server fixed at registration, never the client\'s preview (someone may move between the two). Until then the file says only that the capture was used.' },
  { id: 'R9', scene: 'hack-spaceship', ask: 'abilities.shipHackSpent cannot tell a hack registered this round (still to apply at this round\'s navigation) from one used in an earlier round. Add abilities.shipHackRound (Hacker only) so the file can say "applies at this round\'s navigation" or "used in Round N". Until then a spent hack is drawn as used, its round unnamed.' },
  { id: 'R10', scene: 'navigation', ask: 'The owner\'s rule is that the Officer privately sees an undecided course (the navigation overlay, confirmed rule 4), but phase.kind NAV_TIE is in every view, the public view and the Captain\'s included, and its 15 s stage runs only on a tie. The public strip and the Captain\'s panel draw the tie stage exactly as the acknowledgement stages ("the course is being set"); the phase kind and its timing still tell anyone. Ask: a neutral phase kind for the tie stage outside the Officer\'s view, or the owner\'s acceptance that a tie is public by its timing.' },
  { id: 'R11', scene: 'navigation', ask: 'privateNavigation.tieChoice and .confirmation have no settled meaning (a tie to choose now, or one chosen; the acknowledgement awaited, or one given). The office panel reads the stage from phase.kind, the controls from offers, and "acknowledged" only from the client\'s own accepted receipt, so an office that reconnects after acknowledging sees "your acknowledgement is closed". Ask: define them, for example confirmation as the acknowledgements already given, so a reconnect can say "you acknowledged".' },
  { id: 'R12', scene: 'hospital-panel-death', ask: 'The patient\'s console cannot show its own result. An accepted PANEL_CODE is only REGISTERED, and abilities.panelAttemptSpent turns true for a right and a wrong number alike, so the view never says whether a shared injection was reserved, whether the Rescue stage treated the patient or spent it without effect, or whether the Blackhole\'s Sync did not keep the request; and no rejection code says that no injection was available (P21: the request is refused before the number is checked, and nothing is spent). The brief asks for pending-reservation, wrong, exhausted and no-effect feedback. Ask: the patient\'s own record, e.g. abilities.panelRequest { round, result: RESERVED | WRONG, status: QUEUED | TREATED | NO_EFFECT | DISCARDED } (that patient only, never the Doctor\'s count), and a rejection code NO_INJECTION that is the same whatever number was sent, so an empty inventory never confirms the Doctor\'s number. If the owner prefers the patient not to learn the result before the Rescue stage, the server sends no result and the console keeps "registered"; it never guesses. Until then the console says only "Your number is registered. Your one attempt is used." and a refusal says "Nothing was used".' },
]);

const S = (id, scene, fields) => Object.freeze({ id, scene, ...fields });

export const CATALOGUE = Object.freeze([
  S('lobby-identity', 'Lobby and identity', {
    status: 'existing (slice 8) + gap', audience: 'session members (public lobby)',
    trigger: 'planet-service.ts session view: status lobby | choosing | reading; members[].characterId; chooseCharacter command result',
    fields: ['status', 'members[].characterId', 'members[].ready', 'own seat'],
    beats: { start: 'matrix appears with the 30 s choosing window', loop: 'taken states update as members choose', exit: 'automatic assignment transition into the role reading stage' },
    durations: { full: 'choosing 30 s (server)', reduced: 'same states, cross-fades 120 ms' },
    final: 'every member with a character; randomized initial A/B placement (no room picker)', cancel: 'a taken character is shown taken at once; a rejected choose returns to selectable', precedence: 'session only',
    audio: 'select click (own phone only)', reduced: 'no slide or pop; state swaps', rosters: '7, 8, 9: the matrix always shows all nine crew; taken greyed', concurrency: 'two members choosing at once: last server state wins',
    assets: ['design/abilities (slice 8: character selection, role card)'], gaps: ['compact host/join states at 320 x 568 against the successor session states'],
  }),
  S('role-reveal', 'Role reveal and private card', {
    status: 'existing (slice 8)', audience: 'own phone only',
    trigger: 'session status reading + player view self.role / self.faction', fields: ['self.role', 'self.faction', 'session reading deadline'],
    beats: { start: 'card face-down, flip on Ready-to-read', loop: 'held: 30 s minimum reading', exit: 'Ready closes; concealment on window blur' },
    durations: { full: 'flip 600 ms; reading 30 s minimum (server)', reduced: 'no flip: face shown with an 80 ms fade' },
    final: 'card closed, retrievable from Card', cancel: 'window blur conceals the card immediately', precedence: 'own phone only',
    audio: 'none public; optional own-phone flip sound muted by default', reduced: 'face fade', rosters: '7: no Red Disabler / Engineer cards; 8: + Red Disabler; 9: + Engineer', concurrency: 'none',
    assets: ['design/abilities (role cards; Doctor and Engineer names)'], gaps: ['Doctor, Engineer card art under current names (obsolete Cracker / Soldier Blue names to correct, see inventory)'],
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
    assets: ['design/phone-kit', 'design/board-v2/js/turns-four.mjs'], gaps: ['successor action names (Engineer, Hack Spaceship) in the action overlay'],
  }),
  S('offices', 'Captain and Officer', {
    status: 'existing (votes) + gap', audience: 'public (offices, tally)',
    trigger: 'phases CAPTAIN_ELECTION, VOTE_RESULT (5 s), OFFICER_APPOINTMENT (30 s), PRE_TURN (15 s); offices.*; lastTally', fields: ['offices.captainSeatId', 'offices.officerSeatId', 'offices.blockedSeatId', 'lastTally'],
    beats: { start: 'tally panel in VOTE_RESULT', loop: 'badges on the board', exit: 'block marker expires at round end' },
    durations: { full: 'VOTE_RESULT 5 s (server)', reduced: 'panel without count-up' },
    final: 'badges held by office holders', cancel: 'runoff replaces the panel', precedence: 'stage-bound',
    audio: 'gavel (public) on result', reduced: 'static panel', rosters: 'n/a', concurrency: 'none',
    assets: ['design/phone-kit (five-second vote result)'], gaps: ['Officer appointment panel', 'Officer badge distinct from secret roles', 'movement-block marker and its round expiry'],
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
    status: 'existing (slice 4, Blackout impact) + gap', audience: 'public outcome; no shooter',
    trigger: 'events INJURED / ELIMINATED (seatIds, location, slotId, clinicalAnchor) after resolution', fields: ['events[].seatIds', 'events[].clinicalAnchor', 'board.seats[].health'],
    beats: { start: 'cause-neutral hit reaction at the victim', loop: 'none', exit: 'injured transition, Hospital admission walk or offboard' },
    durations: { full: '900-1400 ms', reduced: 'swap to injured state' },
    final: 'Injured at a berth / Eliminated', cancel: 'newer placement snaps', precedence: 'below Captain, above movement',
    audio: 'neutral impact (public)', reduced: 'swap', rosters: 'four beds in every roster; overflow / offboard by anchor', concurrency: 'several victims: same frame, each at its slot',
    assets: ['design/board-v2/fx/lighting.mjs (impact)', 'design/board-v2/films/overflow.mjs'], gaps: ['a successor admission walk (proposal)'],
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
    status: 'PILOT 1 (cinematic pass over the approved S5)', audience: 'public',
    trigger: 'event RESCUED (seatIds [patient], location Hospital, slotId Hn, clinicalAnchor HVn), published with the snapshot after Rescue resolution; fourFilmBerth() decides whether a film plays', fields: ['events[].seatIds', 'events[].slotId', 'events[].clinicalAnchor', 'board.seats[]'],
    beats: { start: 'alert (amber blinks, close-up of the unstable trace)', loop: 'iris opens, drone descends, scan, charge', exit: 'revival pulse, stabilized monitor, patient sits up, drone exits, iris closes' },
    durations: { full: '5600 ms (display cut and board)', short: '1600 ms nonblocking', reduced: '1760 ms: two still states' },
    final: 'the patient Healthy where the snapshot places them', cancel: 'a newer snapshot moving the patient; a terminal result', precedence: 'medical: a death at the same berth first',
    audio: 'alert blips, hatch, hum, servo, scan, charge, thump, monitor beeps (public cue sheet)', reduced: 'S5 reduced', rosters: 'four beds for 7, 8, 9; HV5+ plays no film (words only)', concurrency: 'at most two Rescues a round (two shared injections): both play at their berths; the display drops to the board form (no camera) when more than one plays',
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
    status: 'existing (slice 3) + gap', audience: 'own-private', trigger: 'player view self.ordinaryWeapons; command results', fields: ['self.ordinaryWeapons', 'offers[] (two-target)'],
    beats: { start: 'private two-target selection', loop: 'none', exit: 'inventory receipt' }, durations: { full: '900 ms receipt', reduced: 'swap' },
    final: 'inventory count', cancel: 'phase end', precedence: 'own phone', audio: 'none public', reduced: 'swap', rosters: 'n/a', concurrency: 'none',
    assets: ['design/abilities (Supplier)'], gaps: ['Round 3 Supply timing presentation'],
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
    status: 'PILOT 3 (display page over the approved S2; phones keep S2)', audience: 'public pair and transitions; pair-private declaration',
    trigger: 'hackSession {id, actorSeatId, targetSeatId} (public); phases HACK_DECLARE (15 s), HACK_RESULT (5 s), HACK (60 s)', fields: ['hackSession', 'phase.kind', 'phase.startedAt', 'phase.endsAt', 'board.seats[]'],
    beats: { start: 'in HACK_RESULT: page assembles, the pair step out, door opens', loop: 'HACK: seated variations (speaker-neutral)', exit: 'after HACK: door opens, walk out, step back in at the latest places' },
    durations: { full: 'entrance 4900 ms inside the 5 s result stage; exit 2800 ms', reduced: 'entrance 2000 ms, exit 1100 ms (S2 swaps)' },
    final: 'the pair at their latest places', cancel: 'a late load snaps to the current pose; the talk keeps its server endsAt', precedence: 'stage-bound; Sync after it',
    audio: 'steps, door, busy chime (public); no conversation audio', reduced: 'S2 reduced', rosters: 'n/a', concurrency: 'one session at a time',
    assets: ['design/cinematic/pilots/private-talk/', 'design/board-v2/films/capsule.mjs (S2)'], gaps: ['live-action study not needed (comic-only by design)'], request: 'R2',
  }),
  S('blackhole-sync', 'Blackhole and Sync', {
    status: 'PILOT 2', audience: 'public',
    trigger: 'event BLACKHOLE_SYNCED (public, actorSeatId null), after Sync; the board already the selected world\'s finalized checkpoint', fields: ['events[] BLACKHOLE_SYNCED', 'board (FINALIZED)'],
    beats: { start: 'board pulled into an ink bloom', loop: 'space, the blackhole forms, title', exit: 'ship passage, ink-wipe cut, settled board ripple' },
    durations: { full: '5200 ms (display)', short: '2400 ms band (phones)', reduced: '1640 / 1440 ms still card' },
    final: 'the synced board', cancel: 'terminal result', precedence: 'above everything but a terminal result',
    audio: 'rumble, sting, whoosh, cut (public)', reduced: 'still card', rosters: 'n/a', concurrency: 'once per match (one lifetime use)',
    assets: ['design/cinematic/pilots/blackhole/'], gaps: ['live-action insert: study only (NOT PRODUCED)'], request: 'R1',
  }),
  S('navigation', 'Navigation', {
    status: 'library group 2 (proposal)', audience: 'office-private route panel (Captain and Officer); public neutral transit; the destination public only on arrival', trigger: 'privateNavigation (offices); phases NAV_TIE, NAV_CAPTAIN_CONFIRM, NAV_OFFICER_CONFIRM; offers CHOOSE_NAV_DIRECTION, CONFIRM_NAVIGATION; MOVEMENT_COMPLETED (public event); navigation.lastMovedRound, arrivedAt', fields: ['privateNavigation.position', 'privateNavigation.direction', 'offers[]', 'phase.kind', 'navigation.lastMovedRound', 'navigation.arrivedAt', 'events[] MOVEMENT_COMPLETED'],
    beats: { start: 'the Y-route panel: the ship at its place; at navigation the final direction and the step it makes', loop: 'the Officer\'s choice on an undecided course; each office\'s acknowledgement (no veto)', exit: 'the token steps along the arm, across a rung or into a planet; the public transit band, the same every movement' }, durations: { full: 'transit 2400 ms display, 1800 ms phone; panel step 900 ms; stamps 420 to 520 ms', reduced: 'stills with 160 ms fades' },
    final: 'the panel at the new place; the public chip "Round N: the ship moved"', cancel: 'phase end; a refused command changes nothing; a late join draws the result at rest', precedence: 'stage-bound (public band over the board\'s middle, never a control)', audio: 'engine hum and pass (public, the same every movement); none on the offices\' phones', reduced: 'stills', rosters: 'n/a', concurrency: 'one movement a round',
    assets: ['design/library/navigation/ (route panel, 10 course overlays, ship token, tray mark, movement chip; films: transit and both arrivals; exports in design/cinematic/exports/navigation/)', 'design/cinematic/pilots/blackhole/art.mjs shipSvg() (the ship in profile)'], gaps: [], request: ['R5', 'R10', 'R11'],
  }),
  S('promises', 'Promises', {
    status: 'gap (proposal)', audience: 'pair-private', trigger: 'promises[], promiseQuota', fields: ['promises[]', 'promiseQuota'],
    beats: { start: 'offer card', loop: 'accept / decline', exit: 'result stamp' }, durations: { full: '900 ms', reduced: 'swap' },
    final: 'result state', cancel: 'phase end', precedence: 'own phone', audio: 'none public', reduced: 'swap', rosters: 'n/a', concurrency: 'one given, one received per match',
    assets: [], gaps: ['six cards and four result states'], request: 'R6',
  }),
  S('windows', 'Windows and drawing', {
    status: 'gap (proposal)', audience: 'window-scoped', trigger: 'windows[] (canDraw, drawings[])', fields: ['windows[]'],
    beats: { start: 'framed view', loop: 'local canvas', exit: 'Show stamp' }, durations: { full: '600 ms stamp', reduced: 'swap' },
    final: 'immutable image', cancel: 'round end expires', precedence: 'own phone', audio: 'none public', reduced: 'swap', rosters: 'n/a', concurrency: 'chronological',
    assets: [], gaps: ['three framed views, four stations'], request: 'R7',
  }),
  S('arrival-end', 'Arrival, no survivors and recovery', {
    status: 'existing (slice 6, superseded parts) + gap', audience: 'public (endReveal on FINISHED)', trigger: 'phase FINISHED / ABORTED; result {winner, reason, alienCoWinner}; endReveal', fields: ['result', 'endReveal'],
    beats: { start: 'arrival', loop: 'reveal', exit: 'held' }, durations: { full: '6000 ms', reduced: 'stills' },
    final: 'end screen', cancel: 'none', precedence: 'top', audio: 'arrival sting (public)', reduced: 'stills', rosters: 'n/a', concurrency: 'none',
    assets: ['design/abilities (match end; Showdown / Final Zone art is obsolete)', 'design/library/navigation/films.mjs (the arrival at either planet, library group 2)'], gaps: ['no-survivors state', 'reconnect / stale / asset-failure states', 'the end reveal over the arrival'],
  }),
]);
