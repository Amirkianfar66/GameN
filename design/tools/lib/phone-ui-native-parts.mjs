// mothership:dev-only
//
// What the phone pack draws, and where Frontend's native review harness shows the same state: one
// entry per part of a match, from the menu to the end. design/tools/phone-ui-native-compare.mjs
// captures both and sets them side by side, so a phone-interface pull request can be checked
// against the pack before it merges (the owner's decision of 11 November 2026).
//
// design: the pack's prototype address (design/phone-ui/prototype/index.html?…), as the review sheets
//   and the clickable export name a state. Viewing options (size, text) come from `view`.
// build: the harness page (apps/game/dev/phone, built with its own Vite config) and what to do on it:
//   scenario and params go in its address (?scenario=…&count=9&tuple=phone&…); steps run in order:
//     ['tap', css]                 a finger tap at the middle of the first visible match
//     ['tapText', regexp, opts]    the same, on the first visible control whose name and text match;
//                                  opts.scope narrows the search, opts.exclude skips matching ids
//     ['reveal', regexp]           scrolls the first visible control that matches into the middle
//     ['fill', css, text]          focuses a field, clears it and types the text
//     ['eval', expression]         runs in the page, for the harness's own hooks (window.planetHarness)
//     ['key', name]                Tab, Enter, Escape
//     ['wait', ms]
//   settle: how long after the harness is ready to wait before the steps (1800 ms unless given).
//   null: the harness has no such state; the pack's side is still drawn.
// view: { size: '390x844' | '320x568' | '430x932', text: 1 | 1.5 | 2 } for both sides.
// was: Designer's finding of 11 November 2026 (same, close or differs, and why), the baseline the
//   next review is read against. It is a record, not a rule.
//
// Every name, seat and result is a labelled synthetic fixture on both sides.

export const STAGES = Object.freeze([
  { id: 'start', title: 'Start: menu, hosting, joining' },
  { id: 'pregame', title: 'Before Round 1' },
  { id: 'rooms', title: 'In the rooms' },
  { id: 'turn', title: 'Your turn' },
  { id: 'panels', title: 'Panels and Promises' },
  { id: 'votes', title: 'Votes and offices' },
  { id: 'system', title: 'Host and connection' },
  { id: 'end', title: 'End of the match' },
]);

export const STEP_OPS = Object.freeze(['tap', 'tapText', 'reveal', 'fill', 'eval', 'key', 'wait']);
export const VERDICTS = Object.freeze(['same', 'close', 'differs']);
export const DEFAULT_VIEW = Object.freeze({ size: '390x844', text: 1 });

const part = (id, stage, title, sheet, spec) => Object.freeze({ id, stage, title, sheet, view: { ...DEFAULT_VIEW, ...(spec.view ?? {}) }, design: spec.design, build: spec.build, was: { date: '2026-11-11', verdict: spec.was[0], note: spec.was[1] } });

export const PARTS = Object.freeze([
  part('intro', 'start', "Brand intro", '10', { design: 's=intro&t=1600', build: { scenario: 'join', settle: 700 }, was: ['same', "The approved typed intro, Game N by Plan B."] }),
  part('menu', 'start', "Main menu", '10', { design: 's=menu', build: { scenario: 'join', steps: [['wait', 4500]] }, was: ['differs', "Titled “Mothership”, the project’s working name, instead of Game N. Join, Host and Recover are tabs above an open join form with a Device choice. The design is a menu: Join first and largest, Host second, Recover a quiet link."] }),
  part('host-setup', 'start', "Host setup", '11', { design: 'count=9&s=host-setup', build: { scenario: 'join', steps: [['wait', 4500], ['tap', '#planet-entry-host'], ['wait', 600]] }, was: ['differs', "A drop-down for the player count and “Host a game”. The design has 7, 8 and 9 buttons, the team mix (5 Blue · 3 Red · 1 Alien) and what happens after the room opens."] }),
  part('host-lobby', 'start', "Host lobby", '11', { design: 's=host-lobby&state=full', build: { scenario: 'host' }, was: ['differs', "The seats are folded away (“9 of 9 seats filled”), and bots are a drop-down with “Set bots”. The design lists every seat and sets bots with − and +."] }),
  part('join', 'start', "Join", '12', { design: 's=join&state=empty', build: { scenario: 'join', steps: [['wait', 4500], ['tap', '#planet-entry-join'], ['wait', 400]] }, was: ['differs', "One code field, a Device drop-down and “Request admission”. The design has a box per code character, Player phone or Shared display, and “Ask to join”."] }),
  part('join-wait', 'start', "Waiting for the host", '13', { design: 's=join-wait&state=pending', build: { scenario: 'join', steps: [['wait', 4500], ['fill', '#planet-room-code', 'PLANET'], ['fill', '#planet-display-name', 'Dev'], ['tap', '#planet-join'], ['wait', 1200]] }, was: ['differs', "Plain text: “Waiting for the server to confirm admission.” The design shows an hourglass, “Waiting for the host”, the room code and your name."] }),
  part('recover', 'start', "Recover a seat", '14', { design: 's=recover&state=entry', build: { scenario: 'join', steps: [['wait', 4500], ['tap', '#planet-entry-recover'], ['wait', 600]] }, was: ['close', "The same two fields. The line saying the host makes the code, and that it never appears on the shared display, is missing."] }),
  part('settings-entry', 'start', "Settings before a match", '32', { design: 'from=menu&s=settings', build: { scenario: 'join', steps: [['wait', 4500], ['tap', '#planet-setup-settings'], ['wait', 600]] }, was: ['differs', "A folded “Display settings” line on the join page. The design opens a Display page with Reduce motion and the three text sizes."] }),
  part('characters', 'pregame', "Character selection", '16', { design: 's=choose&state=open', build: { scenario: 'choosing', params: 'flow=3' }, was: ['close', "The 3 × 3 grid, taken characters greyed, the 30-second rule. The timer is small text under the grid instead of in the header."] }),
  part('role-card', 'pregame', "Role card, 0–20 s", '17, 31', { design: 's=role&t=4000', build: { scenario: 'reading', params: 'flow=3&elapsed=4000' }, was: ['differs', "A text box with a small portrait. The design shows the large illustrated role card and “Your film starts in 0:16”. Ready is already lit."] }),
  part('role-film', 'pregame', "Role film, 20–30 s", '17', { design: 's=role&t=26000', build: { scenario: 'reading', params: 'flow=3&elapsed=24000', steps: [['wait', 1500]] }, was: ['same', "The approved film, with Skip. Each capture shows a different role’s film."] }),
  part('role-ready', 'pregame', "Ready, at 30 s", '17', { design: 's=role&t=30000', build: { scenario: 'reading', params: 'flow=3&elapsed=30500', steps: [['wait', 800]] }, was: ['differs', "Ready works, under the text box. The design shows the card with “Hide your phone, then tap Ready”."] }),
  part('boarding', 'pregame', "Boarding film", '19', { design: 's=boarding&t=6000', build: null, was: ['same', "The approved boarding film, with Skip, at two different moments."] }),
  part('room-b', 'rooms', "Room B, your turn", '21', { design: 'room=room-b&s=room&state=own', build: { scenario: 'board' }, was: ['differs', "The room is shrunk to the screen’s width, with dark bands above and below, and people drawn smaller. The design fills the space between the bars (your “too zoom” decision). Pass is a flat tab, and the room’s own “Windows” control is missing."] }),
  part('room-a', 'rooms', "Room A", '20', { design: 'room=room-a&s=room&state=own', build: { scenario: 'doctor' }, was: ['differs', "Shrunk the same way. The “Window · Hospital” control is missing."] }),
  part('command-room', 'rooms', "Command Room", '22', { design: 'room=command-room&s=room&state=own', build: { scenario: 'alien' }, was: ['differs', "It fills better, as its picture is taller, but the “Captain console” control is missing."] }),
  part('hospital', 'rooms', "Hospital", '23', { design: 'room=hospital&s=room', build: { scenario: 'hospital' }, was: ['differs', "The worst case: the ward small at the top over an empty band, the patients tiny. The “Hospital panel” control is missing."] }),
  part('capsule', 'rooms', "Private talk capsule", '25', { design: 's=talk&stage=talk', build: { scenario: 'promises' }, was: ['differs', "The room fills, but the two name tags sit on the bottom edge, away from the people, and the full tab bar stays. The design gives the talk its own “Promises” and “My card”."] }),
  part('board', 'rooms', "The whole board", '26', { design: 's=board', build: { scenario: 'board', steps: [['tap', '#planet-nav-board'], ['wait', 900]] }, was: ['same', "The same layout, and the first tab reads “Room”."] }),
  part('largest-text', 'rooms', "Smallest phone, Largest text", '56', { view: { size: '320x568', text: 2 }, design: 's=result&outcome=PLAYER_JAILED', build: { scenario: 'vote' }, was: ['differs', "At 320 × 568 with 200 % text, the tab labels break mid-word (“Boar/d”), the result names no one, and the top bar takes about 130 px, with the clock on a row of its own. The design keeps whole labels, the result’s headline, and a two-line title with the clock beside it."] }),
  part('pass', 'turn', "Pass", '27.3', { design: 'room=room-a&s=room&state=pass', build: { scenario: 'board', steps: [['tap', '#planet-pass'], ['wait', 600]] }, was: ['differs', "Only “Pass?”. The design says “Pass your turn? The turn goes to Eli · Player 5” and that your move stays open."] }),
  part('actions', 'turn', "Actions", '28', { design: 'active=4&role=Doctor&s=actions', build: { scenario: 'doctor', steps: [['tap', '#planet-nav-actions'], ['wait', 600]] }, was: ['differs', "Only the offered actions, one tall row each, in an otherwise empty sheet. The design shows every action of your role as a tile with its state: 2 injections, Once a round, From Round 4."] }),
  part('targeting', 'turn', "Choosing a target", '29', { design: 'act=rescue&active=4&role=Doctor&s=actions&state=targeting', build: { scenario: 'doctor', steps: [['tap', '#planet-nav-actions'], ['wait', 500], ['tapText', 'Rescue'], ['wait', 700]] }, was: ['close', "Targets are the people where they stand. There is no “Rescue · Choose a player · Cancel” bar, and the centre Pass becomes “×”."] }),
  part('target-check', 'turn', "Check before Register", '29', { design: 'act=rescue&active=4&role=Doctor&s=actions&state=confirm&target=1', build: { scenario: 'doctor', steps: [['tap', '#planet-nav-actions'], ['wait', 500], ['tapText', 'Rescue'], ['wait', 600], ['tapText', 'Crew|Player \\d', { exclude: 'nav|top|pass' }], ['wait', 600]] }, was: ['differs', "Only “Rescue — Player 3?”. The design shows the person and what the action costs and does: “Uses 1 of 2 shared injections”, and when it resolves."] }),
  part('registered', 'turn', "After Register", '29.1', { design: 'act=rescue&active=4&role=Doctor&s=actions&state=registered&target=1', build: { scenario: 'doctor', steps: [['tap', '#planet-nav-actions'], ['wait', 500], ['tapText', 'Rescue'], ['wait', 600], ['tapText', 'Crew|Player \\d', { exclude: 'nav|top|pass' }], ['wait', 600], ['tapText', '^Register'], ['wait', 1200]] }, was: ['differs', "“Registered. Resolution is pending.” (Scan says “Waiting for the authoritative view.”) The design says what will happen and when, with a REGISTERED stamp and a time line."] }),
  part('scan', 'turn', "Hacker: Scan", '42', { design: 's=scan&state=target', build: { scenario: 'hacker', steps: [['tap', '#planet-nav-actions'], ['wait', 500], ['tapText', '^Scan'], ['wait', 700]] }, was: ['differs', "Choosing whom to scan opens the whole board, and the guess that follows is three plain buttons. The design keeps your room with a Scan bar, then puts the person and the guess on one card."] }),
  part('code', 'turn', "Hacker: final Code", '42', { design: 's=code&state=pick', build: { scenario: 'hacker', steps: [['tap', '#planet-nav-actions'], ['wait', 500], ['tapText', 'final Code'], ['wait', 700]] }, was: ['differs', "Nine “Player n” text buttons. The design uses the nine portraits with names and marks Pick 1–4."] }),
  part('clone', 'turn', "Alien: Clone", '29.2', { design: 'act=clone&active=4&role=Alien&s=actions&state=registered', build: { scenario: 'alien', steps: [['tap', '#planet-nav-card'], ['wait', 700]] }, was: ['differs', "The “CLONE ACTIVE” stamp is drawn over its own sentence. The design confirms the Clone with an ACTIVE stamp and a time line."] }),
  part('card', 'turn', "Card", '31', { design: 'role=Hacker&s=card', build: { scenario: 'board', steps: [['tap', '#planet-nav-card'], ['wait', 700]] }, was: ['differs', "A dark box of paragraphs. The design shows the large illustrated card with Card, Knowledge and Resources, and a Hide button."] }),
  part('panels', 'panels', "Panels", '32', { design: 's=panels', build: { scenario: 'board', steps: [['tap', '#planet-nav-panels'], ['wait', 600]] }, was: ['differs', "Tall rows without explanations. The design’s rows say what each panel shows and who can use it, such as “Navigation · Captain and Officer only”."] }),
  part('settings', 'panels', "Settings (⋮)", '32', { design: 's=settings', build: { scenario: 'board', steps: [['tap', '#planet-top-settings'], ['wait', 500], ['tap', 'summary'], ['wait', 500]] }, was: ['differs', "A checkbox and a drop-down under a folded line. The design has a switch with its explanation and Standard / Large / Largest."] }),
  part('players', 'panels', "Players", '32', { design: 's=players', build: { scenario: 'board', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', '^Players'], ['wait', 600]] }, was: ['differs', "Plain text lines (“Player 1 · Crew 1 · Room A · Healthy”). The design has portraits, names, Captain and Officer badges, and injuries."] }),
  part('round-order', 'panels', "Round order", '32', { design: 's=rules', build: { scenario: 'board', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', '^Round order'], ['wait', 600]] }, was: ['differs', "One long sentence. The design lists each phase on its own row with its timing."] }),
  part('windows', 'panels', "Windows", '34', { design: 's=windows&state=view', build: { scenario: 'windows', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', '^Windows'], ['wait', 700]] }, was: ['close', "Window pairs, the drawings and “Unverified” match. Player numbers instead of names."] }),
  part('hospital-panel', 'panels', "Hospital panel", '43', { design: 's=panel&state=enter', build: { scenario: 'hospital', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', 'Hospital panel'], ['wait', 600], ['tapText', 'Hospital panel', { scope: '.planet-sheet' }], ['wait', 700]] }, was: ['close', "The keypad 1–9 and its one-attempt rule match."] }),
  part('promise-offer', 'panels', "Offer a Promise", '33', { design: 's=promises&state=kinds', build: { scenario: 'promises', steps: [['tap', '#planet-top-promises'], ['wait', 600], ['tapText', 'Offer a Promise'], ['wait', 700]] }, was: ['differs', "It first asks you to pick your private-talk partner, who is already known. The design goes straight to “Offer to Ava” and the six kinds."] }),
  part('promise-incoming', 'panels', "A Promise offered to you", '33', { design: 's=promises&state=incoming', build: { scenario: 'promises', steps: [['tap', '#planet-top-promises'], ['wait', 600]] }, was: ['differs', "A line of counts and Accept / Decline rows. The design shows the offer as a card with its exact terms, then Decline or Accept."] }),
  part('promise-results', 'panels', "Promise results", '33.1', { design: 'case=fulfilled&s=promises&state=results', build: { scenario: 'promise-results', steps: [['tap', '#planet-top-promises'], ['wait', 600]] }, was: ['close', "Cards with Pending and Not fulfilled, within the quota. Player numbers instead of names and portraits."] }),
  part('jail-ballot', 'votes', "Jail vote", '35', { design: 'kind=jail&s=vote', build: { scenario: 'board', steps: [['eval', 'window.planetHarness.openJailVote()'], ['wait', 900], ['tap', '#planet-pass'], ['wait', 700]] }, was: ['close', "The 3 × 3 roster and Abstain."] }),
  part('jail-result', 'votes', "Jail result", '38', { design: 'outcome=JAIL_FULL&s=result', build: { scenario: 'vote' }, was: ['differs', "It names no one (“Jail full · no transfer”), sits on dark glass, and shows zero as “–”. The design names the outcome on the paper card, “GUS CHOSEN · JAIL FULL”, with its stamp."] }),
  part('appointment', 'votes', "Officer appointment", '40', { design: 's=captain&state=appoint', build: { scenario: 'appointment', steps: [['tap', '#planet-nav-actions'], ['wait', 700]] }, was: ['differs', "A row inside Actions. The design opens “Choose your Officer” by itself for its 30 seconds, with portraits and the reason someone can’t be chosen."] }),
  part('block', 'votes', "Officer’s block", '40', { design: 's=officer&state=pick', build: { scenario: 'block', steps: [['tap', '#planet-nav-actions'], ['wait', 700]] }, was: ['differs', "A row inside Actions. The design opens “Block movement” by itself, with portraits, Skip and Block."] }),
  part('tie', 'votes', "Navigation tie", '41', { design: 's=nav&state=tie', build: { scenario: 'tie', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', '^Navigation'], ['wait', 700]] }, was: ['differs', "The route map matches, but the choice is in Panels, then Navigation, then “Choose tie direction”. The design shows Blue and Red to the offices directly."] }),
  part('nav-public', 'votes', "Navigation, for everyone", '41', { design: 's=nav&state=public', build: { scenario: 'board', steps: [['tap', '#planet-nav-panels'], ['wait', 500], ['tapText', '^Navigation'], ['wait', 600]] }, was: ['differs', "A line of text in Panels. The design shows everyone the ship travelling for the same 15 seconds."] }),
  part('blackout', 'votes', "Blackout, dark", '30', { design: 's=blackout&state=dark', build: { scenario: 'blackout' }, was: ['close', "The dark room with every position as a ring, and the Disabler choosing a position."] }),
  part('host-controls', 'system', "Host controls in a match", '15', { design: 's=host-controls', build: { scenario: 'board', steps: [['eval', '(() => { const h = window.planetHarness, v = structuredClone(h.value); v.isHost = true; return h.replace(v); })()'], ['wait', 600], ['tap', '#planet-top-settings'], ['wait', 500], ['reveal', 'Check server deadline'], ['wait', 400]] }, was: ['differs', "Inside Settings, as “Check server deadline”, “Run eligible bots” and “Issue recovery for Player 6”. The design has its own sheet in plain words with a code for each seat."] }),
  part('reconnecting', 'system', "Reconnecting", '45', { design: 'room=room-a&s=room&state=reconnecting', build: { scenario: 'board', steps: [['eval', 'window.planetHarness.setReadFailure(true)'], ['eval', 'window.planetHarness.app.session.refresh()'], ['wait', 2500]] }, was: ['differs', "The room disappears behind “Connection interrupted. Your command recovery is retained.” The design keeps the last room, dimmed, with “Connection lost” and Retry."] }),
  part('end', 'end', "End of the match", '44', { design: 's=end&winner=Red', build: { scenario: 'finished' }, was: ['differs', "A text list on glass. The design shows the planet and the ship, the “RED WINS” stamp, and every player’s portrait with their role."] }),
  part('aborted', 'end', "Match aborted", '44', { design: 's=end&winner=aborted', build: { scenario: 'aborted' }, was: ['differs', "Plain text. The design shows the “NO WINNER · MATCH ABORTED” stamp."] }),
]);

/** The harness address of a part's build side, relative to the built harness's root. */
export function buildAddress(build, count = 9) {
  const q = new URLSearchParams({ scenario: build.scenario, count: String(count), tuple: 'phone' });
  for (const [key, value] of new URLSearchParams(build.params ?? '')) q.set(key, value);
  return `/?${q}`;
}

/** Problems with the catalog itself, as sentences; empty when it is sound. */
export function catalogProblems(parts = PARTS, { sheets = null, screens = null, sizes = null } = {}) {
  const problems = [];
  const ids = new Set();
  const stages = new Set(STAGES.map(stage => stage.id));
  for (const p of parts) {
    if (ids.has(p.id)) problems.push(`${p.id}: listed twice`);
    ids.add(p.id);
    if (!/^[a-z0-9-]+$/.test(p.id)) problems.push(`${p.id}: an id is lower-case letters, digits and hyphens`);
    if (!stages.has(p.stage)) problems.push(`${p.id}: no stage ${p.stage}`);
    for (const sheet of p.sheet.split(/,\s*/)) if (sheets && !sheets.has(sheet)) problems.push(`${p.id}: no sheet ${sheet} in the pack`);
    const screen = new URLSearchParams(p.design).get('s');
    if (!screen) problems.push(`${p.id}: the design address names no screen`);
    else if (screens && !screens.has(screen)) problems.push(`${p.id}: the pack has no screen ${screen}`);
    if (sizes && !sizes.has(p.view.size)) problems.push(`${p.id}: no phone size ${p.view.size}`);
    if (![1, 1.5, 2].includes(p.view.text)) problems.push(`${p.id}: text is 1, 1.5 or 2`);
    if (!VERDICTS.includes(p.was.verdict)) problems.push(`${p.id}: the finding is same, close or differs`);
    if (p.build === null) continue;
    if (typeof p.build.scenario !== 'string' || !/^[a-z-]+$/.test(p.build.scenario)) problems.push(`${p.id}: the build names no harness scenario`);
    for (const step of p.build.steps ?? []) {
      if (!STEP_OPS.includes(step[0])) problems.push(`${p.id}: unknown step ${step[0]}`);
      else if (step[0] === 'wait' ? !Number.isFinite(step[1]) : typeof step[1] !== 'string') problems.push(`${p.id}: step ${step[0]} needs ${step[0] === 'wait' ? 'a number' : 'a string'}`);
      if (['tapText', 'reveal'].includes(step[0])) { try { new RegExp(step[1], 'i'); } catch { problems.push(`${p.id}: ${step[1]} is not a pattern`); } }
    }
  }
  return problems;
}
