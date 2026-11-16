// mothership:dev-only
//
// The Roles list's lifecycle probe (index.html?probe=1): the runtime component itself (../end-roles.mjs, unchanged),
// mounted on the phone pack's synthetic reveal with a clock the probe moves, in the real DOM with the real styles. It
// checks what the interface the Lead approved promises (docs/design/components/end-roles.md):
//   words     "Roles", a row per seat in seat order ("4 · Dev (you)"), each role as projected and its team said,
//             "Original Code: Players 2, 5, 6, 9" in ascending order, and "Return to lobby"
//   teams     each colour square is its seat's team from `teams` alone, in the tokens' colours; no team, no square
//   time      the list and the button come with the scene's words at `showAt` on the trusted clock, rising 8 px over
//             400 ms; a late phone, and one with no clock or no end phase, shows them at once; a new end phase is a
//             new appearance
//   reduced   the game's Reduce motion (and, in the second run, the device's): at once, with one 80 ms fade
//   lifecycle stale and suspended before the words, they wait; concealed, nothing is drawn or named; dispose twice
//   button    onReturnToLobby() once per tap; taken while stale; refused when not interactive, concealed or suspended;
//             none on the shared display, the focus returning to the root
//   layout    the pack's places at Standard text; 13 px under the title block when that ends lower; the list scrolls
//             and the button stays; the root takes no taps
//   larger    at 150 % and 200 % text, both sizes, every result with a list, over the real end scene: the list
//             never overlaps the title block and holds "Roles" and two one-line rows (the Lead's Q3)
//   refusal   any input it does not know, at every level, and a reveal that does not hold together
// With the device's Reduce motion (the check emulates it), it checks that setting too.
// design/tools/end-roles-check.mjs runs it under the production headers and records each result.
// Desktop Chromium: not a phone, not Safari, not a screen reader.

import { END_BEATS } from '../../end-scene/end-scene.mjs';
import { END_ROLES_MOTION, END_ROLES_WORDS, mountEndRoles } from '../end-roles.mjs';
import { PREVIEW_SIZES, PREVIEW_STATES, REVEAL, ROLES_ROSTER, TEAMS, inputsFor, mountPhone, titleBottom, versions } from './preview.mjs';

const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
const sleep = ms => new Promise(done => setTimeout(done, ms));
const frames = n => new Promise(done => { const step = k => (k ? requestAnimationFrame(() => step(k - 1)) : done()); step(n); });
/** The kit's faction colours (component-kit-0.8.0: the tokens' color.factionPrivateOrRevealed), as the browser computes them. */
const TEAM_RGB = Object.freeze({ Blue: 'rgb(112, 175, 255)', Red: 'rgb(255, 140, 140)', Alien: 'rgb(196, 164, 255)' });
/** The rise's curve: the end scene's easeOutCubic for its words, in CSS. */
const RISE_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** Every name and role of the fixture: none may stay in the page while concealed. */
const SECRETS = [...ROLES_ROSTER.map(p => p.name), ...REVEAL.roles.map(r => r.role), 'Original Code', '(you)'];

/** What the component shows, read from its DOM. */
function seen(m) {
  const root = m.element;
  const list = root.querySelector('.ms-er-list'), actions = root.querySelector('.ms-er-actions');
  const shown = n => !!n && n.isConnected && !n.hidden && getComputedStyle(n).display !== 'none';
  const button = actions?.querySelector('button') ?? null;
  return {
    list: shown(list), actions: shown(actions),
    appear: { list: list?.dataset.appear ?? null, actions: actions?.dataset.appear ?? null },
    label: shown(list) ? list.querySelector('.ms-er-label').textContent : null,
    rows: shown(list) ? [...list.querySelectorAll('.ms-er-row')].map(r => {
      const square = r.querySelector('.ms-er-square');
      return { name: r.querySelector('.ms-er-name').textContent, role: r.querySelector('.ms-er-role').textContent, team: r.querySelector('.ms-er-chip').dataset.team ?? null,
        said: r.querySelector('.ms-er-chip .ms-k-vh').textContent, square: getComputedStyle(square).display === 'none' ? null : getComputedStyle(square).backgroundColor };
    }) : [],
    note: shown(list) ? list.querySelector('.ms-er-note').textContent : null,
    button: shown(actions) ? button.querySelector('.ms-k-btn-label').textContent : null,
    buttonState: button ? { disabled: button.getAttribute('aria-disabled'), off: button.hasAttribute('data-off'), kind: [...button.classList].join(' '), icon: button.querySelector('.ms-k-btn-icon')?.dataset.icon ?? null } : null,
    // A CSS animation's curve is its keyframes' (animation-timing-function), not the effect's.
    animations: root.getAnimations({ subtree: true }).map(a => ({ name: a.animationName, duration: a.effect.getTiming().duration, easing: a.effect.getKeyframes()[0]?.easing ?? null })),
    text: root.textContent,
    hidden: root.getAttribute('aria-hidden'),
  };
}

export async function runEndRolesProbe() {
  const checks = [];
  const check = (id, ok, detail = {}) => { checks.push({ id, ok: !!ok, detail }); };
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'relative', width: '390px', height: '844px', overflow: 'hidden', background: '#10141C' });
  document.body.append(host);
  // The trusted clock: the probe sets where it stands, and whether it runs with real time from there.
  let offset = 0, t0 = performance.now(), running = false, rate = 1;
  const clock = { now: () => EPOCH + offset + (running ? (performance.now() - t0) * rate : 0) };
  const at = (ms, run = false) => { offset = ms; t0 = performance.now(); running = run; };
  const said = [];
  const handlers = { onReturnToLobby: (...args) => said.push(['onReturnToLobby', args.length]), onFocusReturn: detail => said.push(['onFocusReturn', detail]) };
  const base = { reveal: REVEAL, roster: ROLES_ROSTER, teams: TEAMS, window: { id: 'w1', startedAt: EPOCH }, clock, showAt: END_BEATS.arrival.words, viewer: 'seat-4', safe: { bottom: 34 }, versions };
  const mount = (input = {}) => mountEndRoles(host, { ...base, ...input }, handlers);
  const guarded = async (group, run) => {
    try { await run(); } catch (error) { check(`${group}: ran without an exception`, false, { error: String(error?.stack ?? error) }); }
    host.replaceChildren();
    said.length = 0;
  };

  if (deviceReduced) {
    await guarded('device', async () => {
      at(1500);
      const m = mount();
      await frames(2);
      const s = seen(m);
      check('device Reduce motion: before the words\' moment, the list and the button are there at once, with the game\'s setting off', s.list && s.actions && !m.element.dataset.motion, { seen: s });
      check('device Reduce motion: they come with one 80 ms fade and nothing else moves', s.appear.list === 'fade' && s.animations.length > 0
        && s.animations.every(a => a.name === 'ms-er-fade' && a.duration === END_ROLES_MOTION.fade), { animations: s.animations });
      m.dispose();
      // A rise that the device's setting meets is the fade too (the stylesheet's rule).
      at(END_BEATS.arrival.words - 120, true);
      const r = mount({ reducedMotion: false });
      const probe = document.createElement('div');
      probe.dataset.appear = 'rise';
      r.element.append(probe);
      check('device Reduce motion: a rise becomes the 80 ms fade', getComputedStyle(probe).animationName === 'ms-er-fade' && getComputedStyle(probe).animationDuration === '0.08s',
        { name: getComputedStyle(probe).animationName, duration: getComputedStyle(probe).animationDuration });
      r.dispose();
    });
    host.remove();
    return { mode: 'device-reduced', ok: checks.every(c => c.ok), checks };
  }

  await guarded('words', async () => {
    at(6000);
    // The projection's order is not the list's: the rows come in seat order, and the Code ascending.
    const shuffled = { roles: [...REVEAL.roles].reverse(), code: ['seat-9', 'seat-2', 'seat-6', 'seat-5'] };
    const m = mount({ reveal: shuffled });
    const s = seen(m);
    const want = REVEAL.roles.map(r => {
      const n = Number(r.seatId.slice(5)), person = ROLES_ROSTER.find(p => p.seat === n);
      return { name: END_ROLES_WORDS.row(n, person.name, n === 4), role: r.role, team: TEAMS[r.seatId], said: END_ROLES_WORDS.team(TEAMS[r.seatId]) };
    });
    check('words: "Roles", then a row per seat in seat order, "4 · Dev (you)" on the viewer\'s, each role as projected and its team said', s.label === 'Roles'
      && JSON.stringify(s.rows.map(({ name, role, team, said: words }) => ({ name, role, team, said: words }))) === JSON.stringify(want), { rows: s.rows, want });
    check('words: "Original Code: Players 2, 5, 6, 9", in ascending order', s.note === 'Original Code: Players 2, 5, 6, 9', { note: s.note });
    check('words: "Return to lobby", the kit\'s block secondary button with the leave icon', s.button === 'Return to lobby' && /ms-k-btn-secondary/.test(s.buttonState.kind) && /ms-k-btn-block/.test(s.buttonState.kind)
      && /^leave/.test(s.buttonState.icon ?? ''), { button: s.button, state: s.buttonState });
    const list = m.element.querySelector('.ms-er-rows');
    check('words: the rows are a list named "Roles"', list.tagName === 'UL' && document.getElementById(list.getAttribute('aria-labelledby'))?.textContent === 'Roles' && list.children.length === 9);
    // Seven players: seats 1 to 7, the other two seats empty.
    m.update({ reveal: { roles: REVEAL.roles.slice(0, 7), code: ['seat-1', 'seat-3', 'seat-5', 'seat-7'] }, teams: Object.fromEntries(Object.entries(TEAMS).slice(0, 7)), roster: ROLES_ROSTER.slice(0, 7) });
    const seven = seen(m);
    check('words: seven players are seven rows, and the Code is theirs', seven.rows.length === 7 && seven.note === 'Original Code: Players 1, 3, 5, 7', { rows: seven.rows.length, note: seven.note });
    m.update({ viewer: 'seat-2' });
    check('words: "(you)" follows the viewer', seen(m).rows.filter(r => r.name.endsWith('(you)')).map(r => r.name).join() === '2 · Ben (you)');
    m.dispose();
  });

  await guarded('teams', async () => {
    at(6000);
    const m = mount();
    const s = seen(m);
    check('teams: each square is its seat\'s team, in the tokens\' colours', s.rows.every((r, i) => r.square === TEAM_RGB[TEAMS[`seat-${i + 1}`]]), { squares: s.rows.map(r => [r.team, r.square]) });
    // The colour is the team given, never the role's: Undercover given Blue is a Blue square (Frontend's input decides).
    m.update({ teams: { ...TEAMS, 'seat-6': 'Blue', 'seat-9': 'Red' } });
    const swapped = seen(m);
    check('teams: the colour is `teams`\', never worked out from the role', swapped.rows[5].square === TEAM_RGB.Blue && swapped.rows[5].role === 'Undercover'
      && swapped.rows[8].square === TEAM_RGB.Red && swapped.rows[8].role === 'Alien', { six: swapped.rows[5], nine: swapped.rows[8] });
    m.update({ teams: null });
    const none = seen(m);
    check('teams: with no team data, no square and no team said', none.rows.every(r => r.square === null && r.said === '' && r.team === null), { rows: none.rows });
    m.update({ teams: { 'seat-1': 'Blue' } });
    const one = seen(m);
    check('teams: a team for some seats colours only those', one.rows[0].square === TEAM_RGB.Blue && one.rows.slice(1).every(r => r.square === null), { rows: one.rows.map(r => r.square) });
    m.dispose();
  });

  await guarded('time', async () => {
    // An arrival: the words at 3.9 s.
    at(END_BEATS.arrival.words - 200, true);
    const m = mount();
    await sleep(60);
    const early = seen(m);
    await sleep(500);
    const risen = seen(m);
    check('time: an arrival\'s list and button wait for 3.9 s on the trusted clock', !early.list && !early.actions, { early });
    check('time: then they rise, as the scene\'s words do: 400 ms, the words\' curve', risen.list && risen.actions && risen.appear.list === 'rise' && risen.appear.actions === 'rise'
      && risen.animations.length === 2 && risen.animations.every(a => a.name === 'ms-er-rise' && a.duration === END_ROLES_MOTION.rise && a.easing === RISE_EASING), { risen: { appear: risen.appear, animations: risen.animations } });
    const frame = m.element.querySelector('.ms-er-list').getAnimations()[0]?.effect.getKeyframes()[0] ?? null;
    check('time: the rise starts 8 px low and transparent', frame && Number(frame.opacity) === 0 && frame.translate === `0px ${END_ROLES_MOTION.lift}px`, { frame });
    m.dispose();
    // No winner: at 0.6 s.
    at(END_BEATS.none.words - 200, true);
    const none = mount({ showAt: END_BEATS.none.words });
    await sleep(60);
    const noneEarly = seen(none);
    await sleep(500);
    check('time: no winner\'s come at 0.6 s', !noneEarly.list && seen(none).list && seen(none).appear.list === 'rise', { early: noneEarly.list });
    none.dispose();
    // A trusted clock that runs slow against the phone's: the timer wakes before the moment, waits out the rest,
    // and still rises (never shown at once for having woken a little early).
    at(END_BEATS.arrival.words - 200, true);
    rate = 0.8;
    const slow = mount();
    await sleep(210);
    const slowEarly = seen(slow);
    await sleep(300);
    const slowLate = seen(slow);
    rate = 1;
    check('time: on a clock that runs slow, the timer that wakes early waits for the moment, and they still rise', !slowEarly.list && slowLate.list && slowLate.appear.list === 'rise',
      { early: slowEarly.list, late: slowLate.list, appear: slowLate.appear });
    slow.dispose();
    // Late phones, and phones with no clock or no end phase: at once, nothing moving.
    at(6000);
    const late = mount();
    const l = seen(late);
    check('time: a phone that opens late shows them at once, with nothing moving', l.list && l.actions && l.appear.list === null && l.animations.length === 0, { late: l.appear, animations: l.animations });
    late.dispose();
    const noClock = mount({ clock: null }), noWindow = mount({ window: null });
    const nc = seen(noClock), nw = seen(noWindow);
    check('time: with no trusted clock, or no end phase, at once', nc.list && nw.list && nc.animations.length === 0 && nw.animations.length === 0);
    noClock.dispose(); noWindow.dispose();
    // A new end phase is a new appearance; a later showAt for the same phase is not.
    at(6000);
    const again = mount();
    again.update({ showAt: 9000 });
    const kept = seen(again).list;
    const scroller = again.element.querySelector('.ms-er-list');
    scroller.scrollTop = 150;
    const scrolledBefore = scroller.scrollTop;
    at(100, true);
    again.update({ window: { id: 'w2', startedAt: EPOCH }, showAt: 300 });
    check('time: a new end phase starts the list at its top', scrolledBefore > 0 && scroller.scrollTop === 0, { before: scrolledBefore, after: scroller.scrollTop });
    const hidden = !seen(again).list;
    await sleep(500);
    check('time: a new end phase is a new appearance, on its own clock; a later showAt for the same phase hides nothing', kept && hidden && seen(again).list && seen(again).appear.list === 'rise', { kept, hidden });
    again.dispose();
  });

  await guarded('reduced', async () => {
    at(1500);
    const m = mount({ reducedMotion: true });
    const s = seen(m);
    check('reduced: the game\'s Reduce motion shows them at once, marked data-motion="reduced"', s.list && s.actions && m.element.dataset.motion === 'reduced', { appear: s.appear });
    check('reduced: with one 80 ms fade, and nothing else moves', s.appear.list === 'fade' && s.animations.length === 2
      && s.animations.every(a => a.name === 'ms-er-fade' && a.duration === END_ROLES_MOTION.fade), { animations: s.animations });
    m.dispose();
    at(1500, true);
    const w = mount();
    const waiting = !seen(w).list;
    w.update({ reducedMotion: true });
    check('reduced: turned on while they wait, they come at once with the fade', waiting && seen(w).list && seen(w).appear.list === 'fade', { appear: seen(w).appear });
    w.dispose();
  });

  await guarded('lifecycle', async () => {
    // Stale before the words: they wait, as the scene stands still; live after the moment: at once.
    at(END_BEATS.arrival.words - 150, true);
    const m = mount({ status: 'stale' });
    await sleep(300);
    const waited = !seen(m).list && !seen(m).actions;
    m.update({ status: 'live' });
    const back = seen(m);
    check('lifecycle: reconnecting before the words, they wait; live again after the moment, at once', waited && back.list && back.appear.list === null, { waited, appear: back.appear });
    m.dispose();
    at(END_BEATS.arrival.words - 150, true);
    const s = mount();
    s.suspend();
    await sleep(300);
    const held = !seen(s).list;
    s.resume();
    check('lifecycle: suspended before the words, they wait; resumed after the moment, at once', held && seen(s).list && seen(s).appear.list === null, { held });
    // Concealed: nothing of the reveal stays in the page; shown again, at once.
    s.update({ status: 'concealed' });
    const c = seen(s);
    const left = SECRETS.filter(w => c.text.includes(w) || s.element.outerHTML.includes(w));
    check('lifecycle: concealed, nothing is drawn or named (no name, role, team or Code in the page), and it is aria-hidden', !c.list && !c.actions && left.length === 0
      && c.hidden === 'true' && s.element.querySelectorAll('.ms-er-row, .ms-er-actions').length === 0, { left, hidden: c.hidden });
    s.update({ status: 'live' });
    check('lifecycle: shown again, everything at once', seen(s).list && seen(s).actions && seen(s).rows.length === 9 && seen(s).appear.list === null);
    // Concealed before the words: they still wait for the moment.
    at(END_BEATS.arrival.words - 150, true);
    s.update({ window: { id: 'w3', startedAt: EPOCH }, status: 'concealed' });
    s.update({ status: 'live' });
    const before = !seen(s).list;
    await sleep(450);
    const after = seen(s);
    check('lifecycle: concealed and shown before the words, they still come at the moment, rising', before && after.list && after.appear.list === 'rise', { before, list: after.list, appear: after.appear, t: clock.now() - EPOCH });
    // dispose() twice; after it nothing appears, nothing is reported and update() does nothing.
    at(END_BEATS.arrival.words - 100, true);
    const d = mount();
    const root = d.element;
    let threw = null;
    try { d.dispose(); d.dispose(); d.update({ status: 'stale' }); d.suspend(); d.resume(); } catch (error) { threw = String(error); }
    await sleep(200);
    check('lifecycle: dispose() twice is safe; after it the root is gone and its timer with it', threw === null && !root.isConnected && root.querySelector('.ms-er-list')?.hidden !== false, { threw });
    s.dispose();
  });

  await guarded('button', async () => {
    at(6000);
    const m = mount();
    const button = () => m.element.querySelector('.ms-er-actions button');
    button().click();
    button().click();
    check('button: "Return to lobby" reports onReturnToLobby() once per tap, with nothing else', JSON.stringify(said) === JSON.stringify([['onReturnToLobby', 0], ['onReturnToLobby', 0]]), { said: [...said] });
    said.length = 0;
    m.update({ status: 'stale' });
    button().click();
    check('button: reconnecting, it is still taken (it is local)', said.length === 1 && button().getAttribute('aria-disabled') === null, { said: [...said] });
    said.length = 0;
    m.update({ status: 'live', interactive: false });
    button().click();
    check('button: not interactive, refused without dimming, and nothing is reported', said.length === 0 && button().getAttribute('aria-disabled') === 'true' && !button().hasAttribute('data-off'));
    m.update({ interactive: true });
    m.suspend();
    button().click();
    const suspended = said.length === 0 && button().getAttribute('aria-disabled') === 'true';
    m.resume();
    check('button: suspended, refused; resumed, taken', suspended && button().getAttribute('aria-disabled') === null);
    // The shared display: no button; a focused one that goes returns the focus to the root, and says which.
    button().focus();
    m.update({ viewer: null });
    await Promise.resolve();
    await frames(1);
    check('button: the shared display (no viewer) has none, and no "(you)"', !seen(m).actions && seen(m).rows.every(r => !r.name.includes('(you)')));
    check('button: the focused button going returns the focus to the root, and onFocusReturn says which', document.activeElement === m.element
      && JSON.stringify(said) === JSON.stringify([['onFocusReturn', { intent: 'return-lobby', value: null }]]), { said: [...said], active: document.activeElement?.className });
    m.dispose();
    // Aborted: no reveal, the button only.
    const a = mount({ reveal: null, teams: null });
    const s = seen(a);
    check('button: an aborted match (no reveal) has the button only', !s.list && s.actions && s.button === 'Return to lobby' && a.element.querySelectorAll('.ms-er-row').length === 0);
    a.dispose();
  });

  await guarded('layout', async () => {
    at(6000);
    const m = mount();
    const box = n => { const h = host.getBoundingClientRect(), b = n.getBoundingClientRect(); return { x: b.left - h.left, y: b.top - h.top, w: b.width, h: b.height }; };
    const near = (a, b) => Math.abs(a - b) <= 0.5;
    const list = m.element.querySelector('.ms-er-list'), actions = m.element.querySelector('.ms-er-actions'), button = actions.querySelector('button');
    const L = box(list), A = box(actions), B = box(button);
    check('layout: the list from 58 % of the phone to 82 px above the bottom safe area, 12 px from each side', near(L.y, 0.58 * 844) && near(L.y + L.h, 844 - 34 - 82) && near(L.x, 12) && near(L.w, 390 - 24), { list: L });
    check('layout: "Return to lobby" 16 px from each side and 18 px above the bottom safe area, 50 px tall', near(A.x, 16) && near(A.w, 390 - 32) && near(A.y + A.h, 844 - 34 - 18) && near(B.h, 50), { actions: A, button: B });
    const rows = [...list.querySelectorAll('.ms-er-row')].map(r => box(r).h);
    check('layout: each row is 49 px (a 34 px portrait, 7 px above and below, the hairline)', rows.every(h => near(h, 49)), { rows });
    m.update({ clear: { top: 0.58 * 844 + 40 } });
    const pushed = box(list);
    m.update({ clear: { top: 300 } });
    const kept = box(list);
    check('layout: 13 px under the title block when that ends lower than 58 %, else at 58 %', near(pushed.y, 0.58 * 844 + 53) && near(pushed.y + pushed.h, 844 - 34 - 82) && near(kept.y, 0.58 * 844), { pushed, kept });
    m.update({ clear: { top: null }, safe: { bottom: 0 } });
    check('layout: the bottom safe area moves the list and the button with it', near(box(list).y + box(list).h, 844 - 82) && near(box(actions).y + box(actions).h, 844 - 18), { list: box(list), actions: box(actions) });
    m.update({ safe: { bottom: 34 } });
    list.scrollTop = 120;
    await frames(1);
    check('layout: the list scrolls, and the button stays where it is', list.scrollHeight > list.clientHeight && list.scrollTop === 120 && near(box(actions).y, A.y), { scroll: [list.scrollHeight, list.clientHeight, list.scrollTop] });
    const hb = host.getBoundingClientRect();
    const above = document.elementFromPoint(hb.left + 195, hb.top + 200), on = document.elementFromPoint(hb.left + 195, hb.top + 844 - 34 - 18 - 25);
    check('layout: the root takes no taps; the list and the button do', getComputedStyle(m.element).pointerEvents === 'none' && !m.element.contains(above) && m.element.querySelector('.ms-er-actions').contains(on),
      { above: above?.className ?? null, on: on?.className ?? null });
    m.dispose();
  });

  await guarded('larger', async () => {
    // Over the real end scene in the shell, as the game shows it, at the Large and Largest text.
    const results = [];
    for (const text of [150, 200]) {
      document.documentElement.style.fontSize = `${text}%`;
      for (const [sizeKey, size] of Object.entries(PREVIEW_SIZES)) {
        for (const stateKey of ['blue', 'red', 'alien', 'none']) {
          const frame = document.createElement('div');
          Object.assign(frame.style, { position: 'relative', width: `${size.width}px`, height: `${size.height}px`, overflow: 'hidden' });
          host.append(frame);
          const phone = mountPhone(frame, inputsFor(stateKey, size));
          await document.fonts.ready;
          await frames(3);
          const list = phone.roles.element.querySelector('.ms-er-list');
          const f = frame.getBoundingClientRect(), l = list.getBoundingClientRect();
          // Where the scene says its title block ends (layout()), and where the block's box ends on the page: the list
          // keeps 13 px under both.
          const said = titleBottom(phone.scene);
          const block = phone.scene.element.querySelector('.ms-es-title');
          const drawn = block && getComputedStyle(block).display !== 'none' ? block.getBoundingClientRect().bottom - f.top : null;
          const title = said === null && drawn === null ? null : Math.max(said ?? 0, drawn ?? 0);
          const rows = [...list.querySelectorAll('.ms-er-row')].map(r => r.getBoundingClientRect());
          const visible = rows.filter(r => r.top >= l.top - 0.5 && r.bottom <= l.bottom + 0.5).length;
          const oneLine = Math.min(...rows.map(r => r.height));
          const r2 = v => Math.round(v * 100) / 100;
          // "Roles" (with the space under it) and two one-line rows: what the list's region must hold.
          const label = rows[0].top - l.top;
          results.push({ text, size: sizeKey, state: stateKey, titleBottom: title, said, drawn: drawn === null ? null : r2(drawn), listTop: r2(l.top - f.top), listBottom: r2(l.bottom - f.top), listHeight: r2(l.height),
            needs: r2(label + 2 * oneLine), rowHeights: rows.map(r => r2(r.height)), visibleAtTop: visible,
            overlap: title === null ? 0 : r2(Math.max(0, title + 13 - (l.top - f.top))) });
          phone.dispose();
          frame.remove();
        }
      }
    }
    document.documentElement.style.fontSize = '';
    check('larger: at 150 % and 200 %, both sizes, the list never overlaps the title block (13 px under it)', results.every(r => r.overlap <= 0.5), { results });
    check('larger: at 150 % and 200 %, both sizes, every result\'s list holds "Roles" and two one-line rows', results.every(r => r.listHeight >= r.needs - 0.5 && r.visibleAtTop >= 2),
      { results: results.map(r => [r.text, r.size, r.state, r.listHeight, r.needs, r.visibleAtTop]) });
  });

  await guarded('refusal', async () => {
    at(6000);
    const refused = [];
    const tryMount = (label, input) => {
      try { mount(input); refused.push({ label, refused: false }); } catch (error) { refused.push({ label, refused: error instanceof TypeError }); }
      host.replaceChildren();
    };
    const roles = REVEAL.roles;
    tryMount('an input it does not know', { result: { winner: 'Red' } });
    tryMount('a key on the reveal it does not know', { reveal: { ...REVEAL, winner: 'Red' } });
    tryMount('a key on a role it does not know', { reveal: { ...REVEAL, roles: [{ ...roles[0], faction: 'Blue' }, ...roles.slice(1)] } });
    tryMount('a key on the roster it does not know', { roster: [{ ...ROLES_ROSTER[0], role: 'Doctor' }, ...ROLES_ROSTER.slice(1)] });
    tryMount('a seat outside 1–9', { reveal: { ...REVEAL, roles: [{ seatId: 'seat-10', role: 'Doctor' }, ...roles.slice(1)] } });
    tryMount('a seat twice', { reveal: { ...REVEAL, roles: [roles[0], roles[0], ...roles.slice(2)] } });
    tryMount('fewer than seven seats', { reveal: { ...REVEAL, roles: roles.slice(0, 6) } });
    tryMount('a revealed seat not in the roster', { roster: ROLES_ROSTER.slice(0, 8) });
    tryMount('a Code of three seats', { reveal: { ...REVEAL, code: ['seat-1', 'seat-2', 'seat-3'] } });
    tryMount('a Code with a seat twice', { reveal: { ...REVEAL, code: ['seat-1', 'seat-1', 'seat-2', 'seat-3'] } });
    tryMount('a Code seat that is not revealed', { reveal: { roles: roles.slice(0, 7), code: ['seat-1', 'seat-2', 'seat-3', 'seat-9'] }, teams: null });
    tryMount('a team that is not Blue, Red or Alien', { teams: { ...TEAMS, 'seat-1': 'Green' } });
    tryMount('a team for a seat that is not revealed', { reveal: { roles: roles.slice(0, 7), code: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, teams: TEAMS });
    tryMount('a role that is not words', { reveal: { ...REVEAL, roles: [{ seatId: 'seat-1', role: '' }, ...roles.slice(1)] } });
    tryMount('a status it does not know', { status: 'hidden' });
    tryMount('interactive that is not true or false', { interactive: 'yes' });
    tryMount('a window without its start', { window: { id: 'w1' } });
    tryMount('a clock without now()', { clock: { time: 1 } });
    tryMount('a negative showAt', { showAt: -1 });
    tryMount('a safe area it does not know', { safe: { bottom: 34, top: 47 } });
    tryMount('a clear top that is not a number', { clear: { top: '500px' } });
    tryMount('a viewer that is not a seat', { viewer: 'Dev' });
    check('refusal: every input it does not know is refused, at every level, and a reveal that does not hold together', refused.every(r => r.refused), { refused });
  });

  host.remove();
  return { mode: 'full', ok: checks.every(c => c.ok), checks };
}
