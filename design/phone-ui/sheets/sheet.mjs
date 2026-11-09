// mothership:dev-only
//
// Draws one review sheet (sheet.html?id=NN) or the contact sheet (contact.html). Phone frames are the
// prototype in iframes at exact CSS viewports; window.__sheetChecks() measures each frame.

import { SHEETS, SIZES, SECTION_TITLES } from './catalog.mjs';
import { ICONS, ICON_NAMES, iconSvg } from '../prototype/icons.mjs';
import { FIXTURE_LABEL } from '../prototype/fixtures.mjs';
import { h, ic, button, cell, row, list, field, codeBoxes, errorNote, stamp, pill, toast, banner, caption, timer } from '../prototype/ui.mjs';
import { tile } from '../prototype/screens-game.mjs';
import { roleCard } from '../prototype/screens-pregame.mjs';
import { seatOf } from '../prototype/fixtures.mjs';

const PROTO = new URL('../prototype/index.html', import.meta.url).href;
const EVIDENCE = new URL('../../../docs/frontend/evidence/planet-approved-art-shell/', import.meta.url).href;

export const frameUrl = fr => {
  const size = fr.size ?? '390x844';
  const meta = SIZES[size];
  const q = new URLSearchParams(fr.q);
  q.set('safe', meta.safe);
  if (meta.chrome) q.set('chrome', meta.chrome);
  if (fr.text) q.set('text', fr.text);
  if (fr.motion) q.set('motion', fr.motion);
  return `${PROTO}?${q}`;
};

function header(sheet) {
  return h('header.sh-head', h('div.sh-num', sheet.id), h('div.sh-titles',
    h('div.sh-section', SECTION_TITLES[sheet.section] ?? sheet.section), h('h1', sheet.title), sheet.sub ? h('p', sheet.sub) : null,
    h('div.sh-chips', sheet.audience ? h('span.chip', 'Audience · ', h('b', sheet.audience)) : null, sheet.status ? h('span.chip', { 'data-tone': 'amber' }, sheet.status) : null,
      sheet.frames || ['timeline', 'compare'].includes(sheet.kind) ? h('span.chip', { 'data-tone': 'fixture' }, FIXTURE_LABEL) : null)));
}

const ARROW = '<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15h20M17 8l7 7-7 7"/></svg>';

/**
 * One phone frame. fr.tap (a selector in the prototype) puts a ring on what is tapped in it; arrow draws
 * the arrow from this frame to the next (tap-by-tap sheets). Both are review marks outside the phone.
 */
function frameNode(fr, { arrow = false } = {}) {
  const size = fr.size ?? '390x844';
  const [w, hgt] = size.split('x').map(Number);
  const frame = h('iframe', { src: frameUrl(fr), width: String(w), height: String(hgt), title: fr.label, loading: 'eager', scrolling: 'no', 'data-tap': fr.tap ?? null });
  const bezel = h('div.bezel', { 'data-size': size }, size === '390x664' ? h('div.safari-bar', 'gamen · Safari') : null, frame, size === '390x664' ? h('div.safari-bottom') : null,
    fr.tap ? h('span.tap-ring', { hidden: '', 'aria-hidden': 'true' }) : null);
  return h('div.frame', { 'data-arrow': arrow ? '' : null }, arrow ? h('span.tap-arrow', { 'aria-hidden': 'true', html: ARROW }) : null, h('div.frame-label', fr.label), bezel,
    h('div.frame-meta', h('span', `${w} × ${hgt}${fr.text ? ` · text ${Number(fr.text) * 100}%` : ''}${fr.motion ? ' · Reduce motion' : ''}`), h('span', fr.q.replace(/^s=/, ''))),
    fr.notes?.length ? h('ul.frame-notes', fr.notes.map(n => h('li', n))) : null);
}

const node = (label, sub, ref, icon = 'chevronRight', tone = null, extra = {}) => h('div.node', { 'data-tone': tone, ...extra }, h('span.icn', { html: iconSvg(icon, { filled: true }) }), h('span', label, sub ? h('small', sub) : null), ref ? h('span.ref', ref) : null);

// ── Special sheets ───────────────────────────────────────────────────────
const SPECIAL = {
  /** Each tab, tap by tap: frames in order; an arrow follows every frame that taps something. */
  taps(sheet) {
    const n = sheet.frames.length;
    return h('div.frames', { 'data-kind': 'taps' }, sheet.frames.map((fr, i) => frameNode(fr, { arrow: Boolean(fr.tap) && i < n - 1 })));
  },

  flow() {
    return h('div.diagram',
      h('div.flow-cols',
        h('div.flow-col', h('h2', 'Enter'), node('Intro', '2 s · Game N by Plan B', '10', 'flag'), node('Main menu', 'Join · Host · Recover', '10', 'menu'),
          node('Join', 'Room code, name', '12', 'join', null, { class: 'node branch' }), node('Waiting · admitted lobby', '', '13', 'hourglass', null, { class: 'node branch' }),
          node('Host', 'Open room → lobby → Start', '11', 'host', null, { class: 'node branch' }), node('Recover', 'Host’s private code', '14', 'key', null, { class: 'node branch', 'data-last': '' })),
        h('div.flow-col', h('h2', 'Before Round 1'), node('Characters', '30 s · auto-assign', '16', 'players'), node('Role stage', '30 s · card 20 + film 10', '17', 'card', 'private'), node('Ready', 'Every human · bots automatic', '18', 'check', 'private'), node('Boarding', '10 s · shared · Skip is local', '19', 'flag')),
        h('div.flow-col', h('h2', 'Round 1'), node('Before turns', '15 s · no offices yet', '07', 'hourglass'), node('Turns', '60 s each · rooms, actions', '20', 'actions', 'amber'), node('Private talk', '≤15 s + 5 s + 60 s', '25', 'talk'), node('Jail vote', '60 s · Vote replaces Pass', '35', 'vote'), node('Result', '5 s', '38', 'jail'), node('Blackout', '5 s lit + 10 s dark', '30', 'dark'), node('Resolution · fixed move', 'Start → Junction', '41', 'course')),
        h('div.flow-col', h('h2', 'Round 2 and later'), node('Captain election', 'When there is no Captain · runoffs', '36', 'captain'), node('Result → Officer', '5 s · 30 s appointment', '40', 'officer'), node('Before turns', '15 s · block · Blackhole', '40', 'hourglass'), node('Turns and talks', '', '20', 'actions', 'amber'), node('Ship synchronized', '6 s · only after a Blackhole', '44', 'blackhole'), node('Jail vote → result → Blackout', 'today’s order (see 02)', '35', 'vote'), node('Navigation', '15 s neutral · offices confirm', '41', 'course', 'private'), node('Arrival or next round', 'End: 44', '44', 'planet'))),
      h('div.band', h('h3', 'Inside any game phase (own phone)'), h('div.row-nodes',
        node('Room view', 'your room, full screen', '20–24', 'room'), node('Board view', 'never moves you', '26', 'board'), node('Actions', 'targets on the scene', '28', 'actions'), node('Card', 'private', '31', 'card', 'private'), node('Panels', 'Windows · Players · Round order', '32', 'panels'), node('Vote', 'while a ballot is open', '35', 'vote'), node('Promises', 'top bar · pair-private', '33', 'promise', 'private'), node('Settings', 'top bar ⋮ · this phone', '32', 'menu'))),
      h('div.band', h('h3', 'From anywhere'), h('div.row-nodes',
        node('Reconnecting', 'the same seat, no replay', '45', 'retry'), node('Outcome unknown', 'check the original receipt', '45', 'warning'), node('Recover a seat', 'host code, 15 minutes', '14', 'key'), node('Eliminated', 'watch; card stays private', '44', 'eliminated'), node('Host controls', 'host only · from ⋮', '15', 'host'))));
  },

  phases() {
    const seg = (k, label, s, w) => h('div.tl-seg', { 'data-k': k, style: { flex: `${w} 0 0` } }, label, h('small', s));
    const now = [seg('pre', 'Before turns', '15 s', 15), seg('turns', 'Turns', '60 s each', 60), seg('talk', 'Final talk', 'if any', 20), seg('sync', 'Sync', '6 s*', 6), seg('vote', 'Jail vote', '60 s', 60), seg('result', 'Result', '5 s', 8), seg('lit', 'Lit', '5 s', 6), seg('dark', 'Dark', '10 s', 10), seg('resolve', 'Resolve', 'attacks, Rescue', 14), seg('nav', 'Navigation', '15 s + confirms', 22)];
    const next = [seg('pre', 'Before turns', '15 s', 15), seg('turns', 'Turns', '60 s each', 60), seg('talk', 'Final talk', 'if any', 20), seg('sync', 'Sync', '6 s*', 6), seg('lit', 'Lit', '5 s', 6), seg('dark', 'Dark', '10 s', 10), seg('vote', 'Jail vote', '60 s', 60), seg('result', 'Result', '5 s', 8), seg('resolve', 'Resolve', 'attacks, Rescue', 14), seg('nav', 'Navigation', '15 s + confirms', 22)];
    return h('div.diagram',
      h('div', h('div.tl-label', 'Today (authoritative, planet-game-1.1.0)', h('span.chip', 'Blackout after the vote and its result')), h('div.timeline', now),
        h('p.tl-note', 'REQUEST_BLACKOUT is registered as the Disabler’s Role Action on their own turn. The shared window (5 s lit, 10 s dark) comes after the Jail vote and its 5 s result. A Disabler who is no longer free and Healthy when the window starts (for example, just jailed) has the request dropped and keeps the use. * Sync and its 6 s presentation happen only in a round with an actual Blackhole.')),
      h('div', h('div.tl-label', 'Requested by the owner', h('span.chip', { 'data-tone': 'amber' }, 'Integration proposal · pending the rules and contract update')), h('div.timeline', { style: { boxShadow: 'inset 0 0 0 2px #F1B84B' } }, next),
        h('p.tl-note', 'Player turns and final private conversation → Blackhole Sync and its 6 s presentation, when applicable → shared Blackout window: 5 s lit, 10 s dark → Jail voting → 5 s vote result → remaining resolution and navigation.')),
      h('div.band', h('h3', 'Backend and Integration settle before any screen changes (not visual decisions)'), h('ul.list2',
        h('li', 'When the strike resolves: at the window, or with the other attacks after the vote. Today it resolves with them, after the window.'),
        h('li', 'Fixed targets: the position is fixed when chosen; a vote that moves its occupant to Jail afterwards changes who is there at resolution.'),
        h('li', 'The cancellation when a Disabler is jailed: today the request is dropped (use kept) if the Disabler is jailed before the window. With the window first, a later Jail transfer meets an already chosen, already spent strike.'),
        h('li', 'What the board freezes: positions at the window start would be the pre-vote positions.'),
        h('li', 'Windows close while it is dark, so drawing and Show stop before the vote instead of after it.'),
        h('li', 'Meeting Promises still settle at the vote’s actual start, after the window.'),
        h('li', 'The same 15 s, the same look and sound in every round, for both Disablers, with or without a request; the initiator is never shown.'),
        h('li', 'No injury, hit or block is drawn because a position was chosen; only an authoritative resolved event is animated.'))));
  },

  matrix() {
    const cols = ['Before turns', 'Own turn', 'Others’ turns', 'Talk stages', 'Ship sync 6 s', 'Election / Jail vote', 'Result 5 s', 'Blackout lit', 'Blackout dark', 'Navigation', 'Officer appt'];
    const R = (icon, name, where, aud, cells) => ({ icon, name, where, aud, cells });
    const rows = [
      R('pass', 'Pass', 'Centre tab', 'Public turn change', { 1: 'Active player' }),
      R('move', 'Move', 'Actions → scene / Board', 'Public position', { 1: 'Free, Healthy, not blocked, move unused', 2: 'Same', 3: 'Same, if a later turn remains' }),
      R('shoot', 'Shoot', 'Actions → scene', 'Private registration', { 1: 'Round 4+ · free, Healthy, armed · same room' }),
      R('protect', 'Grant Protection', 'Actions → scene', 'Private', { 1: 'Undercover · Role Action' }),
      R('rescue', 'Rescue', 'Actions → scene / other rooms', 'Private', { 1: 'Doctor · injection left' }),
      R('supply', 'Supply', 'Actions → scene', 'Private', { 1: 'Supplier · Round 3' }),
      R('scan', 'Scan', 'Actions → scene', 'Private result', { 1: 'Hacker · Role Action' }),
      R('code', 'Final Code', 'Actions → grid', 'Private', { 0: 'Hacker, Round 2+', 1: 'Hacker', 2: 'Hacker', 3: 'Hacker', 4: 'Hacker', 5: 'Hacker', 6: 'Hacker', 7: 'Hacker', 8: 'Hacker' }),
      R('shipHack', 'Hack Spaceship', 'Actions', 'Private', { 1: 'Hacker · unlocked · in A/B' }),
      R('suppress', 'Suppress navigation', 'Actions', 'Private', { 1: 'Engineer · in A/B' }),
      R('blackhole', 'Blackhole', 'Actions', 'Private', { 0: 'Alien holding an office' }),
      R('clone', 'Clone', 'Actions', 'Private', { 1: 'Alien · Role Action' }),
      R('blackout', 'Request Blackout', 'Actions', 'Private registration', { 1: 'Disabler · Role Action' }),
      R('position', 'Choose a position', 'Scene (positions)', 'Private', { 8: 'Disabler with an admitted request' }),
      R('release', 'Release / Eject', 'Captain console', 'Public result', { 1: 'Captain in Command · prisoners in Jail' }),
      R('officer', 'Appoint Officer', 'Sheet grid', 'Public result', { 10: 'Captain' }),
      R('block', 'Block movement', 'Sheet grid', 'Public marker', { 0: 'Officer' }),
      R('direction', 'Tie direction', 'Navigation sheet', 'Offices only', { 9: 'Officer, genuine tie only' }),
      R('acknowledge', 'Acknowledge', 'Navigation sheet', 'Offices only', { 9: 'Captain, then Officer' }),
      R('vote', 'Vote / Abstain', 'Centre tab → grid', 'Ballot private; totals public', { 5: 'Eligible voters (server)' }),
      R('talk', 'Private talk', 'Actions → scene', 'Public pair', { 1: 'Any living player, once a match' }),
      R('declare', 'Declare side', 'Talk sheet', 'Pair', { 3: 'The target (declare stage)' }),
      R('panel', 'Hospital panel', 'Room chip / Panels', 'Private', { 1: 'Patient · attempt unused', 2: 'Same', 3: 'Same' }),
      R('promise', 'Offer / accept Promise', 'Top bar Promises (in talk)', 'Pair', { 3: 'The pair (talk stage)' }),
      R('window', 'Windows: view', 'Panels / room chip', 'Window’s two rooms', { 0: 'View', 1: 'View', 2: 'View', 3: 'View', 4: 'View', 5: 'View', 6: 'View', 7: 'View', 10: 'View' }),
      R('draw', 'Windows: draw, Show', 'Windows sheet', 'Window’s two rooms', { 0: 'Station occupant', 1: 'Station occupant', 2: 'Station occupant', 3: 'Station occupant', 4: 'Station occupant', 5: 'Station occupant', 6: 'Station occupant', 7: 'Station occupant', 10: 'Station occupant' }),
      R('card', 'Card', 'Card tab', 'Own phone', Object.fromEntries(cols.map((_, i) => [i, 'Always']))),
    ];
    return h('div', h('table.matrix', h('thead', h('tr', h('th', 'Control'), cols.map(c => h('th', c)), h('th', 'Where'), h('th', 'Who sees the result'))),
      h('tbody', rows.map(r => h('tr', h('th', { html: `${iconSvg(r.icon)}${r.name}` }), cols.map((_, i) => r.cells[i] ? h('td.on', r.cells[i]) : h('td', '')), h('td.where', r.where), h('td.aud', r.aud))))),
    h('p.tl-note', 'Today’s phases (planet-game-1.1.0, fb33cecb). “Free, Healthy” means Healthy, not jailed and in Room A, Room B or the Command Room. The server’s offers decide every cell; the phone shows a control only when its offer is present and greys it with a reason otherwise. Under the Blackout proposal (sheet 02) the two Blackout columns move before the vote; no other cell changes.'));
  },

  foundations() {
    const sw = (name, value, use) => h('div.sw', h('i', { style: { background: value } }), h('div', name, h('small', `${value} · ${use}`)));
    return h('div.found',
      h('div', h('h2', { style: { margin: '0 0 14px', font: '700 20px/1.2 Inter' } }, 'Colour roles'), h('div.sw-grid',
        sw('canvas', '#10141C', 'screen ground'), sw('panel', '#202837', 'sheets'), sw('surface-3', '#2A3346', 'controls'), sw('paper', '#F4EBDD', 'cards, stamps'),
        sw('ink', '#151923', 'outlines, text on paper'), sw('interactive-accent', '#F1B84B', 'the next thing to do, active turn'), sw('focus-ring', '#FFD36D', 'keyboard focus'), sw('caption', '#F7C52B', 'room captions, results'),
        sw('text-secondary', '#B9C4D3', 'secondary text'), sw('steel-light', '#8696AE', 'tertiary text'), sw('faction blue', '#70AFFF', 'own card and reveal only'), sw('faction red', '#FF8C8C', 'own card and reveal only')),
      h('p.tl-note', 'Faction colours appear only on a player’s own card, the private talk claim and the end reveal, always with words. Amber never means a team, danger or a result. Errors use paper and a warning shape, not red.'),
      h('h2', { style: { margin: '26px 0 10px', font: '700 20px/1.2 Inter' } }, 'Space, radius, depth'),
      h('div.typeramp', h('div', h('small', 'Spacing (tokens)'), h('span', '4 · 8 · 12 · 16 · 24 · 32 · 48')), h('div', h('small', 'Radius'), h('span', 'controls 14 · groups 14 · sheets 22 · cards 18 · chips full')), h('div', h('small', 'Depth (interface)'), h('span', 'soft shadow 0 10 30 at 45% · translucent bars with 20 px blur')), h('div', h('small', 'Depth (comic)'), h('span', 'hard ink offset 4–6 px, no blur: cards, stamps, result window')), h('div', h('small', 'Targets'), h('span', '44 px minimum; cells and tiles larger')))),
      h('div', h('h2', { style: { margin: '0 0 14px', font: '700 20px/1.2 Inter' } }, 'Type'), h('div.typeramp',
        h('div', h('small', 'Large title · 32/1.15 bold'), h('span', { style: { font: '700 32px/1.15 Inter' } }, 'Join a room')),
        h('div', h('small', 'Sheet title · 20/1.2 bold'), h('span', { style: { font: '700 20px/1.2 Inter' } }, 'Check and register')),
        h('div', h('small', 'Body · 17/1.25 medium'), h('span', { style: { font: '500 17px/1.25 Inter' } }, 'Rescue Eli')),
        h('div', h('small', 'Secondary · 15/1.35'), h('span', { style: { font: '500 15px/1.35 Inter', color: '#B9C4D3' } }, 'Registered now · resolves after the vote')),
        h('div', h('small', 'Caption · 13/1.3 (minimum 12)'), h('span', { style: { font: '500 13px/1.3 Inter', color: '#B9C4D3' } }, 'Player 7 · Turn')),
        h('div', h('small', 'Tab label · 12/1.15 semibold'), h('span', { style: { font: '600 12px/1.15 Inter' } }, 'Actions')),
        h('div', h('small', 'Lettering · 800, 0.06 em, capitals'), h('span.stamp', 'REGISTERED')),
        h('div', h('small', 'Timer · tabular'), timer(42))),
        h('p.tl-note', 'The interface font is the system font (SF Pro on iPhone; Inter in these renders). Lettering is for stamps, captions, role names and results only, never for instructions. Sizes are rem: the Large and Largest settings scale them.'),
        h('h2', { style: { margin: '26px 0 10px', font: '700 20px/1.2 Inter' } }, 'Motion'),
        h('div.typeramp', h('div', h('small', 'Tap feedback'), h('span', '120 ms')), h('div', h('small', 'Sheet up / down'), h('span', '320 ms settle / 220 ms standard')), h('div', h('small', 'Tab and view change'), h('span', '220 ms crossfade; Room ↔ Board 450 ms zoom')), h('div', h('small', 'Card to film (role stage)'), h('span', '700 ms at 20 s; the film starts at its own 0')), h('div', h('small', 'Stamp'), h('span', '120 ms snap')), h('div', h('small', 'Reduce motion'), h('span', 'direct change or the 80 ms fade; films become their stills')))));
  },

  icons() {
    return h('div', h('div.icongrid', ICON_NAMES.map(n => h('div.icon-cell', h('div.pair', h('span', { html: iconSvg(n, { size: 30 }) }), h('span', { html: iconSvg(n, { size: 30, filled: true }) }), h('span', { html: iconSvg(n, { size: 20 }), style: { color: '#B9C4D3' } })), h('b', n), h('small', `${ICONS[n].label} · ${ICONS[n].group}`)))),
      h('p.tl-note', 'Outline for rest, filled (amber here) for selected, 20 px in rows and pills. The accessible name is the control’s own text; the label column is the name to use where an icon stands alone (tab bar, icon buttons). Source: design/phone-ui/prototype/icons.mjs; sprite: design/phone-ui/assets/icons.svg.'));
  },

  controls() {
    const sp = (title, ...kids) => h('div.spec', h('h4', title), h('div.stack', kids));
    const line = (...kids) => h('div.line', kids);
    return h('div', { class: 'ph', style: { position: 'relative', height: 'auto', overflow: 'visible', background: 'transparent', '--safe-t': '0px', '--safe-b': '0px' } }, h('div.specimens',
      sp('Buttons', line(button('Register', { icon: 'check' }), button('Register', { busy: true }), button('Register', { disabled: true })), line(button('Cancel', { kind: 'secondary' }), button('Copy', { kind: 'tinted', icon: 'copy', small: true }), button('Check again', { kind: 'plain' })), line(button('Hide card', { kind: 'secondary', icon: 'hide' }), button('Abort match', { kind: 'warn' }))),
      sp('Choices', h('div.seg', { role: 'radiogroup', style: { width: '300px' } }, ['7', '8', '9'].map((n, i) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(i === 2) }, n))), line(h('span.stepper', h('button', { type: 'button', 'aria-label': 'Fewer' }, ic('minus')), h('output', '2'), h('button', { type: 'button', 'aria-label': 'More' }, ic('plus'))), h('button.switch', { type: 'button', role: 'switch', 'aria-checked': 'true', 'aria-label': 'On' }), h('button.switch', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Off' }))),
      sp('Fields and errors', h('div', { style: { width: '320px' } }, codeBoxes('K7Q2', { focusAt: 4 }), h('div', { style: { height: '10px' } }), field('Your name', { value: 'Dev', count: '3/12' }), field('Your name', { value: 'Devendra Kumar', count: '14/12', invalid: true, focus: true }), errorNote('Use 1–12 characters.'))),
      sp('Lists', h('div', { style: { width: '340px' } }, list(row({ icon: 'promise', tint: 'amber', title: 'Promises', sub: 'Given 0/1 · Received 1/1', chevron: true }), row({ icon: 'course', tint: 'slate', title: 'Navigation', sub: 'Captain and Officer only', chevron: true, disabled: true }), row({ tag: 'div', lead: h('b.num', '4'), title: 'Dev', sub: 'Host' })))),
      sp('Feedback', h('div', { style: { position: 'relative', height: '50px', width: '330px' } }, h('div.toast', { style: { top: '4px' } }, ic('check', { filled: true }), h('span', 'Copied'))), line(stamp('REGISTERED', 'amber'), stamp('JAILED'), stamp('CAPTAIN', 'gold')), line(pill('Pending'), pill('Fulfilled', { icon: 'check', tone: 'amber' }), pill('Blocked', { icon: 'block', tone: 'paper' })), line(caption('Room A'), h('span.num', '4'), timer(8), timer(42))),
      sp('Grid cells', h('div.grid9', { style: { width: '360px', gridTemplateColumns: 'repeat(3, 1fr)' } }, cell(seatOf(1), { state: 'available' }), cell(seatOf(2), { state: 'selected', note: 'Selected', mark: 'check' }), cell(seatOf(3), { state: 'confirmed', note: 'Your vote', mark: 'check' }), cell(seatOf(6), { state: 'ineligible', note: 'In Jail' }), cell(seatOf(7), { state: 'winner', count: 5, note: '5 votes' }), cell(null))),
      sp('Action tiles', h('div.tiles', { style: { width: '360px' } }, tile('rescue', 'Rescue', { badge: '2', note: '2 injections' }), tile('rescue', 'Rescue', { state: 'selected', note: 'Choose a player' }), tile('rescue', 'Rescue', { state: 'submitting', note: 'Registering…' }), tile('rescue', 'Rescue', { state: 'registered', note: 'Eli · after the vote' }), tile('shoot', 'Shoot', { state: 'unavailable', note: 'From Round 4' }), tile('talk', 'Private talk', { state: 'spent', note: 'Used' }))),
      sp('Private role card', h('div', { style: { width: '250px' } }, roleCard('Doctor'))),
      sp('Banners', h('div', { style: { position: 'relative', width: '360px', height: '70px', '--top': '0px' } }, banner({ icon: 'offline', title: 'Connection lost', sub: 'Controls return when the match is current', action: button('Retry', { kind: 'secondary', small: true }) })))));
  },

  timeline(sheet) {
    const marks = [[0, 'Card in · 900 ms turn'], [20000, 'Film starts · 700 ms crossfade'], [30000, 'Ready opens']];
    const bar = h('div', { style: { position: 'relative', margin: '6px 0 28px', maxWidth: '2000px' } },
      h('div.timeline', { style: { height: '64px' } }, h('div.tl-seg', { 'data-k': 'vote', style: { flex: '20 0 0' } }, 'Role card', h('small', '0–20 s · own phone')), h('div.tl-seg', { 'data-k': 'turns', style: { flex: '10 0 0' } }, 'Role film', h('small', '20–30 s · the approved 10 s film')), h('div.tl-seg', { 'data-k': 'resolve', style: { flex: '4 0 0' } }, 'Ready', h('small', 'player’s own tap'))),
      h('p.tl-note', 'One server interval of 30 000 ms (start and end from the server). The phone seeks inside it: a late load, a return from the background or Reduce motion never restarts it. The film never confirms Ready and never starts the match; Ready stays a human action, and setup advances only when the server says so. This replaces the film that today starts when the player taps Reveal.'));
    return [bar, h('div.frames', sheet.frames.map(frameNode))];
  },

  art() {
    return h('div.artrow',
      h('figure', h('img', { src: new URL('../review/inputs/approved-rooms-pr197.jpg', import.meta.url).href, alt: 'The five rooms redrawn in the crew’s ink' }), h('figcaption', h('b', 'Rooms redrawn to match the crew · room-drawing-1.0.0 · ', 'approved by the owner on 8 November 2026'), ' The playable build still draws the earlier rooms. Pending: Integration builds and registers the release and Frontend adopts it (PR 197, DSN-REQ-18). The room views in this pack frame each scene with the same boxes and positions, so they take the new rooms unchanged.')),
      h('figure', h('img', { src: new URL('../review/inputs/approved-room-films-pr197.jpg', import.meta.url).href, alt: 'The films’ room pieces, today and redrawn' }), h('figcaption', h('b', 'The films’ room pieces, redrawn with the rooms · same release'), ' The Jail door, lamp and keypad, the airlock, the Hospital drone and monitors, and the private-talk capsule. Shown to the owner; not yet in the build.')),
      h('div', { style: { gridColumn: '1 / -1' } }, h('ul.list2',
        h('li', h('b', 'In the build (design-0.8.0): '), 'the restyled crew (crew-drawing-1.0.0), the brand intro, the nine role films with team-colour titles, and the boarding film.'),
        h('li', h('b', 'Not in the build: '), 'the five redrawn rooms and the films’ redrawn room pieces (PR 197).'),
        h('li', h('b', 'This pack: '), 'uses the build’s rooms so it can be checked against today’s game; every room view is art-agnostic.'),
        h('li', h('b', 'Also not in the build: '), 'the 30-second card-then-film role stage and the Blackout-before-voting order (proposals in this pack).'))));
  },

  compare() {
    const pair = (src, title, sub) => h('div', h('img', { src, alt: title }), h('div.cap', title, h('small', sub)));
    return h('div.compare',
      pair(`${EVIDENCE}390-844-normal-board.png`, 'Today · the board', 'All rooms at once; small people, small names'),
      h('div', h('iframe', { src: frameUrl({ q: 's=room&room=room-a' }), width: '390', height: '844', style: { border: 0, borderRadius: '30px', boxShadow: '0 0 0 9px #1A1D24, 0 0 0 10.5px #2C313B' } }), h('div.cap', 'Proposal · your room', h('small', 'Board one tap away; targets on people'))),
      pair(`${EVIDENCE}390-844-normal-reading.png`, 'Today · reading your role', 'Reveal, a small card and a paragraph'),
      h('div', h('iframe', { src: frameUrl({ q: 's=role&t=12000' }), width: '390', height: '844', style: { border: 0, borderRadius: '30px', boxShadow: '0 0 0 9px #1A1D24, 0 0 0 10.5px #2C313B' } }), h('div.cap', 'Proposal · the 30 s stage', h('small', 'A large card, then the film, then Ready'))));
  },
};

// ── Page ─────────────────────────────────────────────────────────────────
function sheetPage(sheet) {
  const page = h('main.sheetpage', header(sheet));
  if (SPECIAL[sheet.kind]) page.append(...[SPECIAL[sheet.kind](sheet)].flat());
  else page.append(h('div.frames', sheet.frames.map(frameNode)));
  page.append(h('footer.sh-foot', h('span', 'Game N · phone interface pack · 9 November 2026 · Visual and Motion Designer · a design proposal for owner review'), h('span', 'Rendered in desktop Chromium at each frame’s CSS size · not a phone, screen-reader or performance check')));
  return page;
}

// ── Text contrast, measured on what is drawn ─────────────────────────────
// Sheets are glass over comic art, so a colour pair alone can't say whether text reads. For every
// visible text run in a frame: its rectangles and colour (textRuns); then the render tool makes all
// text transparent (hideText), captures the page, and contrastOf reads the background behind each run
// from that capture. WCAG 2 ratio of the text against its background (for light text the 80th-percentile
// luminance behind it, for dark text the median); large text (24 px, or 18.66 px bold) needs 3:1, other
// text 4.5:1. Text under another element, inactive controls (aria-disabled) and hidden text are left out.
const rgba = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };

function textRuns(f) {
  const win = f.contentWindow, doc = f.contentDocument, box = f.getBoundingClientRect();
  const ox = box.left + f.clientLeft + scrollX, oy = box.top + f.clientTop + scrollY;
  const runs = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    const el = n.parentElement;
    if (!text || !el || el.closest('[aria-hidden="true"], .vh, [aria-disabled="true"], :disabled')) continue;
    const cs = win.getComputedStyle(el);
    const color = rgba(cs.color);
    let opacity = color?.a ?? 1;
    for (let a = el; a; a = a.parentElement) opacity *= Number(win.getComputedStyle(a).opacity);
    if (cs.visibility === 'hidden' || !color || opacity < 0.05) continue;
    const range = doc.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].map(r => ({ x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(win.innerWidth, r.right) - Math.max(0, r.left), h: Math.min(win.innerHeight, r.bottom) - Math.max(0, r.top) })).filter(r => r.w > 2 && r.h > 2);
    const seen = rects.some(r => { const hit = doc.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2); return hit && (hit === el || el.contains(hit) || hit.contains(el)); });
    if (!seen) continue;
    const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
    runs.push({ text: text.slice(0, 40), color, opacity, large: size >= 24 || (size >= 18.66 && weight >= 700), rects: rects.map(r => ({ x: r.x + ox, y: r.y + oy, w: r.w, h: r.h })) });
  }
  return runs;
}

async function contrastOf(png, runsByFrame) {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, gr, b) => 0.2126 * lin(r) + 0.7152 * lin(gr) + 0.0722 * lin(b);
  return runsByFrame.map(runs => {
    if (!Array.isArray(runs)) return { error: runs?.error ?? 'not measured' };
    const results = runs.map(run => {
      const px = [];
      for (const r of run.rects) {
        const d = g.getImageData(Math.round(r.x), Math.round(r.y), Math.max(1, Math.round(r.w)), Math.max(1, Math.round(r.h))).data;
        for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
      }
      const ls = px.map(p => lum(...p)).sort((a, b) => a - b);
      const mid = px[Math.floor(px.length / 2)];
      const seen = [run.color.r, run.color.g, run.color.b].map((v, i) => v * run.opacity + mid[i] * (1 - run.opacity));
      const lt = lum(...seen), median = ls[Math.floor(ls.length / 2)];
      // Light text: the 80th-percentile background (glass and art vary under it). Dark text sits on a solid
      // fill (a pill, a button, a stamp), whose rounded or tilted edges would otherwise count what is around it.
      const lb = lt > median ? ls[Math.floor(ls.length * 0.8)] : median;
      const ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
      return { text: run.text, ratio: Math.round(ratio * 100) / 100, need: run.large ? 3 : 4.5 };
    });
    return { min: results.length ? Math.min(...results.map(r => r.ratio)) : null, low: results.filter(r => r.ratio < r.need) };
  });
}

/** Puts each tap ring on the element its frame taps, once the frames have drawn (same origin). */
function placeTaps(frames) {
  for (const f of frames) {
    if (!f.dataset.tap) continue;
    const ring = f.parentElement.querySelector('.tap-ring');
    const el = f.contentDocument?.querySelector(f.dataset.tap);
    if (!ring || !el) continue;
    const r = el.getBoundingClientRect();
    Object.assign(ring.style, { left: `${f.offsetLeft + r.left + r.width / 2}px`, top: `${f.offsetTop + r.top + r.height / 2}px` });
    ring.hidden = false;
  }
}

function measureFrame(win) {
  const doc = win.document;
  const vw = win.innerWidth;
  const out = { overflowX: doc.documentElement.scrollWidth > vw + 1, small: [], tinyText: [], clipped: 0 };
  for (const el of doc.querySelectorAll('button, a[href], input, select, [role="button"], [role="switch"], [role="radio"], [role="tab"]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    // Pseudo-element hit areas: .btn-sm (+8 px), .swatch (+12 px).
    const extra = el.classList.contains('btn-sm') ? [0, 8] : el.classList.contains('swatch') ? [12, 12] : el.classList.contains('switch') ? [4, 14] : [0, 0];
    if (Math.min(r.width + extra[0], r.height + extra[1]) < 43.5) out.small.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.width)}×${Math.round(r.height)} “${(el.getAttribute('aria-label') ?? el.textContent).trim().slice(0, 24)}”`);
  }
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('.vh, [aria-hidden="true"]')) continue;
    const size = parseFloat(win.getComputedStyle(el).fontSize);
    if (size < 11) out.tinyText.push(`${Math.round(size * 10) / 10}px “${n.textContent.trim().slice(0, 20)}”`);
  }
  for (const el of doc.querySelectorAll('*')) { const cs = win.getComputedStyle(el); if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.clipped += 1; }
  return out;
}

const params = new URLSearchParams(location.search);
if (document.body.dataset.page === 'contact') {
  const groups = [];
  for (const s of SHEETS) { const g = SECTION_TITLES[s.section] ?? s.section; if (!groups.includes(g)) groups.push(g); }
  document.body.append(h('main.contact', h('h1', 'Game N · phone interface pack'), h('p', `${SHEETS.length} numbered sheets · design proposal for owner review · 9 November 2026 · ${FIXTURE_LABEL}`),
    h('div.contact-grid', [...SHEETS].sort((a, b) => a.id.localeCompare(b.id)).map(s => h('div.thumb', h('div.img', { style: { backgroundImage: `url("../review/sheets/${s.id}-${s.slug}.jpg")` } }), h('div', h('b', h('span', s.id), s.title), h('small', `${SECTION_TITLES[s.section] ?? s.section} · ${s.frames ? `${s.frames.length} ${s.frames.length === 1 ? 'frame' : 'frames'}` : 'diagram'}`)))))));
  Promise.all([...document.images].map(i => i.decode().catch(() => {}))).then(() => { window.__sheetReady = true; });
  const bgs = [...document.querySelectorAll('.thumb .img')].map(d => d.style.backgroundImage.slice(5, -2));
  Promise.all(bgs.map(src => new Promise(done => { const im = new Image(); im.onload = im.onerror = done; im.src = src; }))).then(() => { window.__sheetReady = true; });
} else {
  const sheet = SHEETS.find(s => s.id === params.get('id'));
  document.title = sheet ? `${sheet.id} · ${sheet.title}` : 'No sheet';
  document.body.append(sheet ? sheetPage(sheet) : h('p', 'No sheet'));
  const frames = [...document.querySelectorAll('iframe')];
  const ready = f => new Promise(done => { const t0 = Date.now(); const tick = () => { let ok = false; try { ok = f.contentWindow.__phoneReady === true || /\.(png|jpg)$/.test(f.src); } catch { ok = true; } if (ok || Date.now() - t0 > 20000) done(); else setTimeout(tick, 60); }; tick(); });
  Promise.all(frames.map(ready)).then(() => { placeTaps(frames); window.__sheetReady = true; });
  window.__sheetTextRuns = () => frames.map(f => { try { return textRuns(f); } catch (e) { return { error: String(e) }; } });
  window.__sheetHideText = () => {
    const hide = '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }';
    for (const f of frames) { try { const s = f.contentDocument.createElement('style'); s.textContent = hide; f.contentDocument.head.append(s); } catch {} }
    document.head.append(Object.assign(document.createElement('style'), { textContent: '.tap-ring, .tap-arrow { display: none !important; }' }));
  };
  window.__sheetContrast = contrastOf;
  // tap: whether a tap-by-tap frame's tapped element exists (absent for frames that tap nothing).
  window.__sheetChecks = () => frames.map(f => { let m; try { m = measureFrame(f.contentWindow); } catch (e) { m = { error: String(e) }; } const tap = f.dataset.tap ? Boolean(f.contentDocument?.querySelector(f.dataset.tap)) : undefined; return { label: f.title, src: f.getAttribute('src').replace(/^.*index\.html\?/, ''), width: Number(f.width), height: Number(f.height), ...m, ...(tap === undefined ? {} : { tap }) }; });
}
