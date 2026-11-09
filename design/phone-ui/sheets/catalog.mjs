// mothership:dev-only
//
// The phone UI pack's review sheets, numbered. Each sheet shows phone frames of the prototype
// (design/phone-ui/prototype) at exact CSS viewports, or a diagram, table or component specimen.
// Frames: q is the prototype address; size defaults to 390x844; safe areas follow the size.
// Audience words: Public (every phone, same view), Own phone (one player's private view),
// Offices (Captain and Officer only), Pair (the two talk participants), Host (the host's phone).

export const SIZES = Object.freeze({
  '320x568': { safe: '20,0', label: '320 × 568 · small phone' },
  '390x844': { safe: '47,34', label: '390 × 844 · standard phone' },
  '430x932': { safe: '59,34', label: '430 × 932 · large phone' },
  '390x664': { safe: '0,0', chrome: '0', label: '390 × 664 · Safari with its toolbars' },
});

const f = (label, q, extra = {}) => ({ label, q, ...extra });

export const SHEETS = Object.freeze([
  // ── Overview, flow and system ─────────────────────────────────────────
  { id: '01', slug: 'flow-map', section: 'Flow', title: 'Flow map', kind: 'flow', sub: 'Every screen of the pack and how a match moves between them. Numbers are sheet numbers.' },
  { id: '02', slug: 'round-order', section: 'Flow', title: 'Round order and the Blackout placement', kind: 'phases', status: 'Integration proposal · pending the rules and contract update', sub: 'Today’s authoritative order, and the owner’s requested order with Blackout before the Jail vote.' },
  { id: '03', slug: 'phase-action-matrix', section: 'Flow', title: 'Phase and action matrix', kind: 'matrix', status: 'For review with Frontend · eligibility stays the server’s', sub: 'Which control appears, for whom, in which authoritative phase. Nothing is offered just because it is “before voting”.' },
  { id: '04', slug: 'foundations', section: 'Components', title: 'Foundations: colour, type, space, depth, motion', kind: 'foundations', sub: 'Tokens 0.5.0 in an iOS-like dark interface; the scenes, crew, cards and stamps stay comic ink.' },
  { id: '05', slug: 'icons', section: 'Components', title: 'Icon family', kind: 'icons', sub: 'One drawing language: 24 px grid, 1.8 px round strokes, a filled form for selected. Every icon has a name; none carries meaning alone.' },
  { id: '06', slug: 'controls', section: 'Components', title: 'Controls, lists, feedback and cards', kind: 'controls', sub: 'The shared components every screen reuses, in each state.' },
  { id: '07', slug: 'top-bar', section: 'J', title: 'Top bar', sub: 'Upper left: the active player’s portrait and name; with no active player, the phase instead. Right: round and authoritative time.', audience: 'Public', frames: [f('Top bar variants', 's=topbars', { size: '390x844', notes: ['Never a stale portrait: outside turns the left shows the phase.', 'Private talk shows the public pair only.', 'The 5 s and 6 s stages show a ring.'] })] },
  { id: '08', slug: 'bottom-tabs', section: 'K', title: 'Bottom navigation', sub: 'Board/Room · Actions · Pass/Vote · Card · More. The first tab names the other view; Pass becomes Vote while a ballot is open.', audience: 'Own phone', frames: [f('Tab bar states', 's=navbars', { notes: ['Selected: amber, filled icon.', 'Unavailable: 38% opacity, still focusable (aria-disabled).', 'Pass is enabled only on your own turn.'] })] },

  // ── A–E ───────────────────────────────────────────────────────────────
  { id: '10', slug: 'intro-menu', section: 'A', title: 'Intro and main menu', sub: 'The approved two-second Game N / by Plan B intro, then three entry points with one clear hierarchy.', audience: 'Own phone', frames: [
    f('Intro · 0.4 s', 's=intro&t=400'), f('Intro · 1.6 s', 's=intro&t=1600'), f('Main menu', 's=menu', { notes: ['Join is primary: most of the table joins.', 'Host is secondary; Recover is a quiet link.'] }), f('Offline', 's=menu&state=offline')] },
  { id: '11', slug: 'host', section: 'B', title: 'Host setup and host lobby', sub: 'Player count, then a lobby with a prominent room code, one-tap Copy, admissions, seats, bots and Start.', audience: 'Host', frames: [
    f('Setup', 's=host-setup&count=9', { notes: ['Only the count is needed to open a room.'] }), f('Lobby · requests', 's=host-lobby&state=requests', { notes: ['Admit per request. There is no Decline operation today (a request closes when setup starts).'] }), f('Copied', 's=host-lobby&state=copied'), f('Full · Start enabled', 's=host-lobby&state=full')] },
  { id: '12', slug: 'join', section: 'C', title: 'Join', sub: 'Room code and name, with compact errors in place.', audience: 'Own phone', frames: [
    f('Empty', 's=join&state=empty'), f('No such room', 's=join&state=no-room'), f('Name too long', 's=join&state=name'), f('Sending', 's=join&state=sending')] },
  { id: '13', slug: 'join-lobby', section: 'C', title: 'Waiting for admission and the player lobby', sub: 'Matches the host’s lobby; the waiting states say only what is true.', audience: 'Own phone', frames: [
    f('Waiting for the host', 's=join-wait&state=pending'), f('Admitted · lobby', 's=join-wait&state=admitted'), f('Room started without you', 's=join-wait&state=closed'), f('Busy', 's=join&state=busy')] },
  { id: '14', slug: 'recover', section: 'D', title: 'Recover', sub: 'A host-issued code returns a seat. Private recovery details never reach a public display.', audience: 'Own phone · Host', frames: [
    f('Entry', 's=recover&state=entry'), f('Refused (wrong, used or expired)', 's=recover&state=refused', { notes: ['The server answers one refusal for all three cases.'] }), f('Seat recovered', 's=recover&state=success'), f('Reconnecting', 's=room&room=room-a&state=reconnecting', { notes: ['The last view stays, dimmed, until the current state returns. Nothing is replayed.'] })] },
  { id: '15', slug: 'host-recovery', section: 'D', title: 'Host controls and a recovery code', sub: 'Issued on the host’s phone, hidden until revealed, never on the shared display.', audience: 'Host', frames: [
    f('Host controls', 's=host-controls'), f('Code · hidden', 's=host-controls&state=code'), f('Code · revealed', 's=host-controls&state=code&reveal=1'), f('Abort · confirm', 's=host-controls&state=abort')] },
  { id: '16', slug: 'characters', section: 'E', title: 'Character selection', sub: 'One screen: the nine in a 3 × 3 grid, a compact timer, no introduction. 30 seconds; unchosen players are assigned automatically.', audience: 'Public grid · own choice', frames: [
    f('Open', 's=choose&state=open'), f('Selected · saving', 's=choose&state=selected'), f('Confirmed · taken', 's=choose&state=confirmed'), f('Last seconds', 's=choose&state=closing'), f('Assigned automatically', 's=choose&state=auto')] },

  // ── F–G ───────────────────────────────────────────────────────────────
  { id: '17', slug: 'role-stage-timeline', section: 'F', title: 'Private role stage · 30 seconds', kind: 'timeline', status: 'Owner requirement · Backend/Integration reconcile Ready and setup timing', sub: '0–20 s the role card; 20–30 s the role’s approved ten-second film; then Ready. Only on the player’s own phone.', audience: 'Own phone', frames: [
    f('0:01 · card', 's=role&t=1000'), f('0:12 · card', 's=role&t=12000'), f('0:20 · film begins', 's=role&t=20200'), f('0:26 · film', 's=role&t=26000'), f('0:30 · Ready', 's=role&t=30000')] },
  { id: '18', slug: 'role-stage-states', section: 'F', title: 'Role stage states', sub: 'Concealed, reduced motion, missing art and a late return: none restarts the stage; time is the server’s.', audience: 'Own phone', frames: [
    f('Concealed', 's=role&t=9000&state=concealed', { notes: ['App left or phone shown: the card hides; the clock keeps running.'] }), f('Reduced motion', 's=role&t=23000&state=reduced', { motion: 'reduced' }), f('Missing art', 's=role&t=24000&state=missing', { notes: ['Text card stays up; the film is not required.'] }), f('Rejoined at 0:25', 's=role&t=25000&state=late'), f('Ready · waiting', 's=role&t=31000&state=waiting')] },
  { id: '19', slug: 'boarding', section: 'G', title: 'Shared boarding into Round 1', sub: 'The approved ten-second boarding. Skip hides the picture on this phone only; the server starts Round 1.', audience: 'Public', frames: [
    f('0:01.5', 's=boarding&t=1500'), f('0:06', 's=boarding&t=6000'), f('Skipped locally', 's=boarding&t=6000&state=skipped'), f('Waiting for the server', 's=boarding&t=10000&state=waiting'), f('Round 1 begins', 's=room&room=room-a&stamp=round1')] },

  // ── H–I ───────────────────────────────────────────────────────────────
  { id: '20', slug: 'room-a', section: 'H', title: 'Room A', sub: 'The player’s own room fills the screen: readable people, names, fixed positions, targets on the people themselves.', audience: 'Own phone (room view)', frames: [
    f('Another player’s turn', 's=room&room=room-a'), f('Your turn', 's=room&room=room-a&state=own', { notes: ['Room interaction: the window station the player sits at.'] }), f('Targeting in the room', 's=actions&role=Doctor&active=4&state=targeting&act=rescue'), f('Move within the room', 's=room&room=room-a&state=move', { notes: ['Moving is an action. The Board tab never moves anyone.'] })] },
  { id: '21', slug: 'room-b', section: 'H', title: 'Room B', sub: 'The same layout for every room; only the scene and its own interaction change.', audience: 'Own phone (room view)', frames: [
    f('Another player’s turn', 's=room&room=room-b'), f('Your turn', 's=room&room=room-b&state=own'), f('Private talk · choose', 's=actions&role=Doctor&active=4&state=targeting&act=talk&room=room-b'), f('Officer’s block shown', 's=officer&state=others')] },
  { id: '22', slug: 'command-room', section: 'H', title: 'Command Room', sub: 'Only the Captain enters. Release and Eject live on the Captain’s console.', audience: 'Own phone (Captain)', frames: [
    f('Captain’s turn', 's=room&room=command-room&state=own'), f('Captain console', 's=captain&state=console'), f('Release · confirm', 's=captain&state=release'), f('Commands used', 's=captain&state=used')] },
  { id: '23', slug: 'hospital', section: 'H', title: 'Hospital', sub: 'Four beds. A patient keeps the room view and has the panel.', audience: 'Own phone (patient)', frames: [
    f('Patient · another turn', 's=room&room=hospital'), f('Hospital panel', 's=panel&state=enter'), f('Number entered', 's=panel&state=entered'), f('Request registered', 's=panel&state=queued')] },
  { id: '24', slug: 'jail', section: 'H', title: 'Jail', sub: 'A detained player still sees the room, votes and talks.', audience: 'Own phone (detained)', frames: [
    f('Detained', 's=room&room=jail'), f('Jail vote from Jail', 's=vote&kind=jail&state=open'), f('Eject from the console', 's=captain&state=eject')] },
  { id: '25', slug: 'private-talk', section: 'H', title: 'Private Talk capsule', sub: 'Up to 15 s to declare, 5 s for the claim, then the full 60 s in the capsule beside the Command Room.', audience: 'Pair (public: who is talking)', frames: [
    f('Declare a side · target', 's=talk&stage=declare'), f('Claim · initiator', 's=talk&stage=result'), f('Talk · 60 s', 's=talk&stage=talk'), f('Promise during talk', 's=promises&state=kinds')] },
  { id: '26', slug: 'board', section: 'I', title: 'The whole board, and switching views', sub: 'Board shows the ship; Room shows your room. Switching never moves you or spends your move.', audience: 'Own phone', frames: [
    f('Room view · tab says Board', 's=room&room=room-a'), f('Board view · tab says Room', 's=board'), f('Move · choose a position', 's=board&state=move'), f('Targets in another room', 's=board&state=targets')] },

  // ── K–N ───────────────────────────────────────────────────────────────
  { id: '27', slug: 'tab-destinations', section: 'K', title: 'Each tab, opened', sub: 'Sheets dock between the bars: the clock and Pass/Vote stay in view.', audience: 'Own phone', frames: [
    f('Board', 's=board'), f('Actions', 's=actions&role=Doctor&active=4'), f('Vote', 's=vote&kind=jail'), f('Card', 's=card&role=Doctor'), f('More', 's=more')] },
  // Each tab, tap by tap: a storyboard per tab. A ring marks what is tapped in a frame; an arrow leads to
  // what that tap shows. Frames without a ring show the same tab at another moment.
  { id: '27.1', slug: 'tap-board', section: 'K', kind: 'taps', title: 'Tap Board: the whole ship, and back', sub: 'Board shows every room at once, with yours marked. The tab then says Room; tap it to come back. Switching never moves you.', audience: 'Own phone', frames: [
    f('Your room · tap Board', 's=room&room=room-a', { tap: '[data-tab="switch"]' }),
    f('The whole ship · tap Room', 's=board', { tap: '[data-tab="switch"]', notes: ['Your room carries the You badge.'] }),
    f('Back in your room', 's=room&room=room-a', { notes: ['Nothing moved: switching views is local.'] }),
    f('Board while moving', 's=board&state=move', { notes: ['From Actions → Move: every empty position on the ship.'] }),
    f('Board while choosing a person', 's=board&state=targets', { notes: ['From an action’s Other rooms: people elsewhere, the rest dimmed.'] })] },
  { id: '27.2', slug: 'tap-actions', section: 'K', kind: 'taps', title: 'Tap Actions: what you can do, then who', sub: 'Actions opens your action tiles. Tap one, then tap the person in the room, check, and register. Nothing happens until the action resolves.', audience: 'Own phone', frames: [
    f('Your turn · tap Actions', 's=room&room=room-a&state=own', { tap: '[data-tab="actions"]' }),
    f('Your actions · tap Rescue', 's=actions&role=Doctor&active=4', { tap: '.tile[aria-label^="Rescue"]' }),
    f('Choose a person · tap Ava', 's=actions&role=Doctor&active=4&state=targeting&act=rescue', { tap: '.press[aria-label^="Ava"]', notes: ['People in other rooms: Other rooms.'] }),
    f('Check · tap Register', 's=actions&role=Doctor&active=4&state=confirm&act=rescue&target=1', { tap: '.sheet-foot .btn:last-child' }),
    f('Registered', 's=actions&role=Doctor&active=4&state=registered&act=rescue&target=1', { notes: ['Nothing happens yet: it resolves after the vote.'] }),
    f('Actions on another player’s turn', 's=actions&role=Doctor&active=7', { notes: ['Move stays open on any turn, once a round.', 'The rest wait for your turn.'] })] },
  { id: '27.3', slug: 'tap-pass', section: 'K', kind: 'taps', title: 'Tap Pass: end your turn (Vote in a vote)', sub: 'Pass asks once, then the turn moves on; it is grey outside your turn. While a ballot is open, the same button is Vote.', audience: 'Own phone', frames: [
    f('Your turn · tap Pass', 's=room&room=room-a&state=own', { tap: '[data-tab="hero"]' }),
    f('One check · tap Pass', 's=room&room=room-a&state=pass', { tap: '.sheet-foot .btn:last-child', notes: ['Passing does not spend your move.'] }),
    f('The turn moves on', 's=room&room=room-a&state=passed', { notes: ['Pass is grey until your next turn.'] }),
    f('A vote opens · tap Vote', 's=vote&kind=jail&state=start', { tap: '[data-tab="hero"]' }),
    f('Your ballot', 's=vote&kind=jail', { notes: ['Choose a person or Abstain; one ballot, private.'] })] },
  { id: '27.4', slug: 'tap-card', section: 'K', kind: 'taps', title: 'Tap Card: your role, privately', sub: 'Your role card, only on your phone. Knowledge and Resources are one tap away; Hide covers the card at once.', audience: 'Own phone', frames: [
    f('Your room · tap Card', 's=room&room=room-a', { tap: '[data-tab="card"]' }),
    f('Your card · tap Knowledge', 's=card&role=Doctor', { tap: '.seg [data-go*="state=knows"]' }),
    f('Knowledge · tap Resources', 's=card&role=Doctor&state=knows', { tap: '.seg [data-go*="state=holds"]' }),
    f('Resources · tap Hide', 's=card&role=Doctor&state=holds', { tap: '[aria-label="Hide card"]' }),
    f('Hidden', 's=card&role=Doctor&state=hidden', { notes: ['Show brings the card back.'] })] },
  { id: '27.5', slug: 'tap-more', section: 'K', kind: 'taps', title: 'Tap More: everything else', sub: 'Promises, Windows, Navigation, the Hospital panel, Players, Round order and Display. A row you cannot use now is grey with the reason.', audience: 'Own phone', frames: [
    f('Your room · tap More', 's=room&room=room-a', { tap: '[data-tab="more"]' }),
    f('More · tap Promises', 's=more', { tap: '[data-go^="s=promises"]' }),
    f('Promises', 's=promises&state=list', { notes: ['‹ returns to More.'] }),
    f('Windows row', 's=windows&state=view'),
    f('Players row', 's=players'),
    f('Display row', 's=settings')] },
  { id: '28', slug: 'actions', section: 'L', title: 'Actions', sub: 'Recognisable icons with short names instead of paragraphs; each tile names its state.', audience: 'Own phone', frames: [
    f('Doctor · your turn', 's=actions&role=Doctor&active=4'), f('Hacker · your turn', 's=actions&role=Hacker&active=4'), f('Undercover · not your turn', 's=actions&role=Undercover&active=7'), f('Registered and spent', 's=actions&role=Doctor&active=4&state=spent')] },
  { id: '29', slug: 'targeting', section: 'L', title: 'Targeting and registering', sub: 'Targets stay on the people in the scene; other rooms are one tap away. Registering is not an effect.', audience: 'Own phone', frames: [
    f('Choose in the scene', 's=actions&role=Doctor&active=4&state=targeting&act=rescue'), f('Other rooms', 's=actions&role=Doctor&active=4&state=offroom&act=rescue'), f('Check and register', 's=actions&role=Doctor&active=4&state=confirm&act=rescue'), f('Registering', 's=actions&role=Doctor&active=4&state=submitting&act=rescue'), f('Registered', 's=actions&role=Doctor&active=4&state=registered&act=rescue', { notes: ['No heal, hit or injury is drawn until the server resolves it.'] })] },
  { id: '30', slug: 'blackout', section: 'L', title: 'Blackout', sub: 'Position targeting, not character selection. Same timing and look for both Disablers; the initiator is never shown.', audience: 'Public window · Disabler’s own picker', frames: [
    f('Request · confirm', 's=actions&role=Blue Disabler&active=4&state=confirm&act=blackout'), f('5 s lit · everyone', 's=blackout&state=lit'), f('10 s dark · everyone', 's=blackout&state=dark'), f('Dark · Disabler picks a position', 's=blackout&state=pick'), f('Position fixed', 's=blackout&state=chosen')] },
  { id: '31', slug: 'card', section: 'M', title: 'Card', sub: 'A large, correctly fitted private card; knowledge and resources one tap away; a clear Hide.', audience: 'Own phone', frames: [
    f('Card', 's=card&role=Doctor'), f('Knowledge · Hacker', 's=card&role=Hacker&state=knows'), f('Resources', 's=card&role=Doctor&state=holds'), f('Hidden', 's=card&role=Doctor&state=hidden')] },
  { id: '32', slug: 'more', section: 'N', title: 'More', sub: 'Compact iOS-style rows; destinations only appear active for those they serve.', audience: 'Own phone', frames: [
    f('More', 's=more'), f('More · host', 's=more&host=1'), f('Players', 's=players'), f('Round order', 's=rules'), f('Display', 's=settings')] },
  { id: '33', slug: 'promises', section: 'N', title: 'Promises', sub: 'Six fixed kinds, exact terms, explicit acceptance, a lifetime quota and four result states. Pair-private.', audience: 'Pair', frames: [
    f('List · during talk', 's=promises&state=list'), f('Choose a kind', 's=promises&state=kinds'), f('Check the terms', 's=promises&state=confirm'), f('Offer received', 's=promises&state=incoming'), f('Results', 's=promises&state=results')] },
  { id: '34', slug: 'windows', section: 'N', title: 'Windows', sub: 'View free at either end; draw and Show only at your station; shown drawings are immutable and expire with the round.', audience: 'Players at the window’s two rooms', frames: [
    f('View', 's=windows&state=view'), f('Draw at your station', 's=windows&state=draw'), f('Shown', 's=windows&state=shown'), f('No window here', 's=windows&state=none')] },

  // ── O–P ───────────────────────────────────────────────────────────────
  { id: '35', slug: 'vote-jail', section: 'O', title: 'Jail vote', sub: 'Vote replaces Pass. A 3 × 3 grid of real portraits, numbers and names; eligibility from the server; Abstain allowed.', audience: 'Own phone (ballot private)', frames: [
    f('Open', 's=vote&kind=jail'), f('Selected', 's=vote&kind=jail&state=selected'), f('Submitted', 's=vote&kind=jail&state=submitted'), f('Abstained', 's=vote&kind=jail&state=abstained'), f('Closed', 's=vote&kind=jail&state=closed')] },
  { id: '36', slug: 'vote-captain', section: 'O', title: 'Captain election and stable placement', sub: 'Seat n is always cell n: 7 and 8 players leave cells empty instead of inventing players.', audience: 'Own phone (ballot private)', frames: [
    f('Election · 9 players', 's=vote&kind=captain'), f('Runoff', 's=vote&kind=captain&state=runoff'), f('8 players', 's=vote&kind=captain&roster=8&state=selected'), f('7 players', 's=vote&kind=jail&roster=7'), f('Can’t vote (eliminated)', 's=vote&kind=jail&state=cannot')] },
  { id: '37', slug: 'results-captain', section: 'P', title: 'Captain election results', sub: 'Five seconds. The same roster with the permitted counts; the result highlighted. Ballots stay private.', audience: 'Public', frames: [
    f('Elected', 's=result&outcome=CAPTAIN_ELECTED'), f('Tie · runoff', 's=result&outcome=RUNOFF_REQUIRED'), f('No Captain', 's=result&outcome=NO_CAPTAIN_ELECTED')] },
  { id: '38', slug: 'results-jail', section: 'P', title: 'Jail vote results', sub: 'Jailed, Jail full (chosen but not moved) and no one jailed. Totals only; never who voted for whom.', audience: 'Public', frames: [
    f('Jailed', 's=result&outcome=PLAYER_JAILED'), f('Chosen · Jail full', 's=result&outcome=JAIL_FULL'), f('No one jailed', 's=result&outcome=NO_JAIL_SELECTION'), f('8 players', 's=result&outcome=PLAYER_JAILED&roster=8')] },

  // ── Q ─────────────────────────────────────────────────────────────────
  { id: '40', slug: 'offices', section: 'Q', title: 'Captain and Officer', sub: 'Officer appointment (30 s) and the Officer’s once-a-round movement block before turns (15 s).', audience: 'Captain · Officer · public result', frames: [
    f('Appoint an Officer', 's=captain&state=appoint'), f('Others wait', 's=captain&state=waiting'), f('Block movement', 's=officer&state=pick'), f('Blocked', 's=officer&state=done')] },
  { id: '41', slug: 'navigation', section: 'Q', title: 'Navigation', sub: 'The same neutral 15 s for everyone; the route, tie and direction only on the offices’ phones.', audience: 'Public · Offices', frames: [
    f('Everyone · setting course', 's=nav&state=public'), f('Captain · route', 's=nav&state=route'), f('Officer · genuine tie', 's=nav&state=tie'), f('Acknowledge · no veto', 's=nav&state=confirm'), f('Everyone · moved', 's=nav&state=moved')] },
  { id: '42', slug: 'scan-code', section: 'Q', title: 'Hacker: Scan and the final Code', sub: 'Private results; one Code attempt; unlocking is not activating.', audience: 'Own phone', frames: [
    f('Scan · choose', 's=scan&state=target'), f('Scan · guess', 's=scan&state=guess'), f('Scan · matched', 's=scan&state=result'), f('Code · four players', 's=code&state=confirm'), f('Code · correct', 's=code&state=correct')] },
  { id: '43', slug: 'hospital-panel', section: 'Q', title: 'Hospital panel', sub: 'Patient-private. An empty injection pool must not confirm the Doctor’s number.', audience: 'Own phone (patient)', frames: [
    f('Enter', 's=panel&state=enter'), f('Registered', 's=panel&state=queued'), f('Wrong number', 's=panel&state=wrong'), f('Unavailable', 's=panel&state=unavailable', { notes: ['Neutral words: no hint about the pool or the number.'] }), f('Attempt used', 's=panel&state=spent')] },
  { id: '44', slug: 'end', section: 'Q', title: 'Blackhole, elimination and the end of a match', sub: 'The six-second presentation after an actual Sync; an eliminated player’s phone; the authorized result.', audience: 'Public · own phone', frames: [
    f('Ship synchronized · 6 s', 's=blackhole'), f('Eliminated', 's=eliminated'), f('Blue wins', 's=end&winner=Blue'), f('Red wins', 's=end&winner=Red'), f('No survivors', 's=end&winner=none')] },
  { id: '45', slug: 'system', section: 'Q', title: 'Loading, reconnecting and the unexpected', sub: 'Every state keeps its words, its positions and an honest next step.', audience: 'Own phone', frames: [
    f('Loading', 's=system&state=loading'), f('Reconnecting', 's=room&room=room-a&state=reconnecting'), f('Outcome unknown', 's=system&state=unknown'), f('Room art unavailable', 's=system&state=asset'), f('Phase closed', 's=system&state=stale')] },

  // ── Viewports, text and motion ────────────────────────────────────────
  { id: '50', slug: 'viewport-320', section: 'V', title: '320 × 568', sub: 'The smallest supported phone. Same content; targets stay 44 px; nothing scrolls sideways.', audience: '—', frames: [
    f('Room', 's=room&room=room-a&state=own', { size: '320x568' }), f('Actions', 's=actions&role=Doctor&active=4', { size: '320x568' }), f('Vote', 's=vote&kind=jail&state=selected', { size: '320x568' }), f('Card', 's=card&role=Doctor', { size: '320x568' }), f('Characters', 's=choose&state=confirmed', { size: '320x568' })] },
  { id: '51', slug: 'viewport-430', section: 'V', title: '430 × 932', sub: 'The largest phone: the scene grows; the bars stay the same height.', audience: '—', frames: [
    f('Room', 's=room&room=room-a&state=own', { size: '430x932' }), f('Board', 's=board', { size: '430x932' }), f('Result', 's=result&outcome=PLAYER_JAILED', { size: '430x932' }), f('Role stage', 's=role&t=12000', { size: '430x932' })] },
  { id: '52', slug: 'browser-chrome', section: 'V', title: 'In Safari, with its toolbars', sub: 'The page gets 390 × 664 when Safari shows its bars; the game still fits without scrolling.', audience: '—', frames: [
    f('Room', 's=room&room=room-a&state=own', { size: '390x664' }), f('Vote', 's=vote&kind=jail', { size: '390x664' }), f('Board', 's=board', { size: '390x664' }), f('Menu', 's=menu', { size: '390x664' })] },
  { id: '53', slug: 'larger-text', section: 'V', title: 'Larger text', sub: 'The game’s Large (150%) and Largest (200%) settings. Bars grow with the text; lists scroll; nothing is clipped to fit.', audience: '—', frames: [
    f('Room · Large', 's=room&room=room-a&state=own', { text: '1.5' }), f('Actions · Large', 's=actions&role=Doctor&active=4', { text: '1.5' }), f('Vote · Large', 's=vote&kind=jail&state=selected', { text: '1.5' }), f('More · Largest', 's=more', { text: '2' }), f('Join · Largest', 's=join&state=no-room', { text: '2' })] },
  { id: '54', slug: 'reduced-motion', section: 'V', title: 'Reduce motion', sub: 'Films become their reviewed stills; sheets, results and the Blackout change directly or with the 80 ms fade. Same facts, same controls.', audience: '—', frames: [
    f('Role film · stills', 's=role&t=23000', { motion: 'reduced' }), f('Boarding · stills', 's=boarding&t=5200', { motion: 'reduced' }), f('Blackout dark', 's=blackout&state=dark', { motion: 'reduced' }), f('Result', 's=result&outcome=CAPTAIN_ELECTED', { motion: 'reduced' })] },

  // ── Art status and the change from today ──────────────────────────────
  { id: '60', slug: 'art-status', section: 'X', title: 'Approved art not yet in the playable build', kind: 'art', sub: 'So newer owner-approved art is not overlooked when this interface is built.' },
  { id: '61', slug: 'today-vs-proposal', section: 'X', title: 'Today’s playable build and this proposal', kind: 'compare', sub: 'The fb33cecb build at 390 × 844 (Frontend’s evidence captures) beside the proposed screens.' },
]);

export const SECTION_TITLES = Object.freeze({
  Flow: 'Flow', Components: 'Components', A: 'A · Entry', B: 'B · Host', C: 'C · Join', D: 'D · Recover', E: 'E · Characters', F: 'F · Role stage', G: 'G · Boarding',
  H: 'H · Rooms', I: 'I · Board', J: 'J · Top bar', K: 'K · Tabs', L: 'L · Actions', M: 'M · Card', N: 'N · More', O: 'O · Voting', P: 'P · Results', Q: 'Q · Gameplay and recovery', V: 'Viewports, text and motion', X: 'Art status',
});
