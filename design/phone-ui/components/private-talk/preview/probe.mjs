// mothership:dev-only
//
// The private talk's lifecycle and privacy probe: it drives the real component (../private-talk.mjs, with
// ../../play-parts) inside the real phone shell, in the browser, under whatever headers serve the page
// (design/tools/private-talk-check.mjs serves the production ones), and reports what it saw. Each check is one
// behaviour Frontend relies on; audience, private and leaks are the Lead's five privacy points of 16 November:
//   declare   an offered card reports its side; the choice is Frontend's (nothing changes until it is given back);
//             the cards are one radio group, each kept by its place; the line under them for one side, any side,
//             and none for two; who asked, at the pack's 64 px; the sheet's words while choosing and sending
//   refused   a locked card takes no tap, keeps the focus, is aria-disabled and says "Not for your role"; not
//             interactive or reconnecting, no card takes a tap, and reconnecting says why
//   claim     the claim's words on both phones (D2), for each side and for no declaration (D3); the card or the
//             blank card, hidden from assistive technology; a status; the sheet's titles
//   wait      the initiator's wait (D1): the declarer's portrait and "Dev is choosing a side"; its sheet's words
//   capsule   the cabin's three pictures on the bundles' properties, the two seated (the lower seat on the left),
//             the tags ("You" on this phone's), the ambient; nothing a control; it follows the stage's size
//   audience  only the two talking phones draw the declaration or the claim (each part only for its own viewer);
//             any other viewer, the shared display (no viewer) and a concealed phone get only the pair bar
//   private   a viewer change drops everything, and nothing returns until given again; "Not for your role" is
//             only ever on the declarer's own phone
//   leaks     no side or claim reaches an attribute, the console or onLayout, in any state, through any tap or
//             update; only onSide carries a side
//   inputs    an unknown key, a side that is not one, a side twice, a choice not offered, one person as both, a
//             wrong view or claim, a pair of one, no stage size, a bar without its pair: each an error; a checked
//             input checks to itself
//   focus     a focused card removed returns the focus to the root and reports its place, not its side
//   text      at the Largest text (200 %) on 320 × 568, every word whole: the cards, the claim, the wait, the tags
//   dispose   after dispose(), nothing is left and nothing fires; update() does nothing; the crew is released
//   motion    the capsule's ambient runs on the game's clock when live, and stands still with Reduce motion (the
//             game's or the device's), suspended, or reconnecting
// With the device's Reduce motion emulated, only the motion check runs (the page's mode says which).

import { SIDES, TALK_WORDS, checkCapsule, checkClaim, checkDeclare, claimSheet, declareSheet, mountCapsule, mountClaim, mountDeclare, mountTalkWait, talkBar, waitSheet }
  from '../private-talk.mjs';
import { HACK_ART } from '../../../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';
import { crewMountStats } from '../../../../../apps/game/hosted/crew-runtime.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountPart, mountStage } from './preview.mjs';
import { TALK_STATES } from './states.mjs';

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const microtasks = () => new Promise(done => setTimeout(done, 0));
const MOUNTS = { declare: mountDeclare, claim: mountClaim, wait: mountTalkWait, capsule: mountCapsule };
const SIDE_WORD = /\b(?:blue|red|alien)\b/i;
const AVA = { seat: 'seat-1', name: 'Ava', character: 'c8' }, DEV = { seat: 'seat-4', name: 'Dev', character: 'c1' };

export async function runTalkProbe({ sizes, versions, inputsFor }) {
  const deviceReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mode = deviceReduced ? 'device-reduced' : 'full';
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };

  /** A phone with the shell and one part (in the sheet's body, or the capsule in the stage); no room behind. */
  function phone(key, { extra = {}, sizeKey = '390x844', viewer = null } = {}) {
    const size = sizes[sizeKey], state = TALK_STATES[key];
    const frame = document.createElement('div');
    frame.className = 'pv-phone';
    Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
    document.body.append(frame);
    const intents = [];
    const record = name => (...args) => intents.push([name, ...args]);
    const who = viewer ?? state.viewer;
    const shell = mountPhoneShell(frame, { ...state.shell, viewer: `seat-${who}`, versions, insets: size.insets }, { onSheetAction: record('onSheetAction'), onLayout: record('onLayout') });
    const kind = state.part.kind;
    const host = kind === 'capsule' ? shell.stage : shell.sheetBody;
    const input = { viewer: `seat-${who}`, versions, ...(kind === 'capsule' ? { size: shell.layout().stage, clock: null } : {}), ...state.part.input, ...extra };
    const part = MOUNTS[kind](host, input, { onSide: record('onSide'), onFocusReturn: record('onFocusReturn') });
    return { frame, shell, part, intents, root: part.element, dispose: () => { part.dispose(); shell.dispose(); frame.remove(); } };
  }
  const tap = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  const cards = root => [...root.querySelectorAll('.ms-pt-sides .ms-pp-tile')];
  const words = node => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  /** The words as laid out, as a person (and the accessible name) reads them: a space between the parts. */
  const said = node => (node?.innerText ?? '').replace(/\s+/g, ' ').trim();
  /** Whether a card holds the game's art for this key, as the page serializes it. */
  const holds = (node, key) => { const t = document.createElement('span'); t.innerHTML = HACK_ART[key](); return node.innerHTML === t.innerHTML; };
  /** What a part draws: its words and elements, leaving out the control policy's own hidden reasons. */
  const drawn = root => [...root.children].filter(n => !n.classList.contains('ms-k-vh'));
  const reported = (p, name) => p.intents.filter(i => i[0] === name).map(i => i[1]);
  const px = node => Math.round(node.getBoundingClientRect().width);

  if (mode === 'full') {
    await check('declare', async () => {
      const p = phone('declare-any');
      const [blue, red, alien] = cards(p.root);
      const group = p.root.querySelector('.ms-pt-sides');
      const first = { names: cards(p.root).map(c => words(c.querySelector('.ms-pp-tile-name'))), states: cards(p.root).map(c => c.dataset.state),
        checked: cards(p.root).map(c => c.getAttribute('aria-checked')), roles: cards(p.root).map(c => c.getAttribute('role')), group: [group.getAttribute('role'), group.getAttribute('aria-label')] };
      red.focus();
      tap(red);
      tap(blue);
      const taps = reported(p, 'onSide');
      const unchanged = red.dataset.state === 'available';
      p.part.update({ selected: 'Red' });
      const chosen = { states: cards(p.root).map(c => c.dataset.state), checked: cards(p.root).map(c => c.getAttribute('aria-checked')), kept: cards(p.root)[1] === red && document.activeElement === red };
      const line = () => words(p.root.querySelector('.ms-pt-note'));
      const any = line();
      p.part.update({ sides: ['Blue'], selected: 'Blue' });
      const own = line();
      p.part.update({ sides: ['Blue', 'Red'], selected: null });
      const two = p.root.querySelector('.ms-pt-note');
      const whoBox = p.root.querySelector('.ms-pp-who');
      const asked = [words(whoBox.querySelector('.ms-pp-who-title')), words(whoBox.querySelector('.ms-pp-who-sub')), px(whoBox.querySelector('.ms-k-pt'))];
      p.dispose();
      const sheets = [declareSheet({ selected: null }), declareSheet({ selected: 'Red' }), declareSheet({ selected: 'Blue', phase: 'sending' })]
        .map(s => [s.id, s.title, s.close, ...s.actions.map(a => `${a.id}:${a.label}:${a.icon}:${a.busy ? 'busy' : ''}:${a.enabled ? 'on' : 'off'}`)].join('|'));
      const detail = { first, taps, unchanged, chosen, any, own, two: two === null, asked, sheets, alien: alien.dataset.value };
      return { ok: JSON.stringify(first.names) === '["Blue","Red","Alien"]' && JSON.stringify(first.states) === '["selected","available","available"]'
        && JSON.stringify(first.checked) === '["true","false","false"]' && first.roles.every(r => r === 'radio') && JSON.stringify(first.group) === '["radiogroup","Side to declare"]'
        && JSON.stringify(taps) === '["Red","Blue"]' && unchanged && JSON.stringify(chosen.states) === '["available","selected","available"]' && JSON.stringify(chosen.checked) === '["false","true","false"]'
        && chosen.kept && any === 'Your role may claim any side. Only you see this.' && own === 'Your role declares its own side: Blue. Only you see this.' && detail.two
        && JSON.stringify(asked) === '["Ava asked to talk","Declare a side. It is a claim, not a check.",64]' && detail.alien === '3'
        && JSON.stringify(sheets) === JSON.stringify(['talk-declare|Declare your side|false|declare:Declare a side:declare::off', 'talk-declare|Declare your side|false|declare:Declare Red:declare::on',
          'talk-declare|Declare your side|false|declare:Declare Blue:declare:busy:on']), ...detail };
    });

    await check('refused', async () => {
      const p = phone('declare-own');
      const [blue, red, alien] = cards(p.root);
      red.focus();
      tap(red);
      tap(alien);
      const locked = { taps: reported(p, 'onSide').length, focus: document.activeElement === red, disabled: [blue, red, alien].map(c => c.getAttribute('aria-disabled')),
        states: [blue, red, alien].map(c => c.dataset.state), names: [blue, red, alien].map(said), lock: !!red.querySelector('.ms-pp-tile-note .ms-k-ic'), tag: red.tagName };
      tap(blue);
      const offered = reported(p, 'onSide');
      p.dispose();
      const q = phone('declare-own', { extra: { interactive: false } });
      tap(cards(q.root)[0]);
      const quiet = reported(q, 'onSide').length;
      q.dispose();
      const r = phone('declare-own', { extra: { status: 'stale' } });
      const card = cards(r.root)[0];
      tap(card);
      const stale = { taps: reported(r, 'onSide').length, reason: words(document.getElementById(card.getAttribute('aria-describedby') ?? '')) };
      r.dispose();
      const detail = { locked, offered, quiet, stale };
      return { ok: locked.taps === 0 && locked.focus && JSON.stringify(locked.disabled) === '[null,"true","true"]' && JSON.stringify(locked.states) === '["selected","unavailable","unavailable"]'
        && JSON.stringify(locked.names) === '["Blue","Red Not for your role","Alien Not for your role"]' && locked.lock && locked.tag === 'BUTTON'
        && JSON.stringify(offered) === '["Blue"]' && quiet === 0 && stale.taps === 0 && stale.reason === TALK_WORDS.stale, ...detail };
    });

    await check('claim', async () => {
      const seen = [];
      for (const [key, viewer] of [['claim-declarer', 4], ['claim-initiator', 1]]) {
        const p = phone(key);
        const box = p.root.querySelector('.ms-pt-claim'), card = p.root.querySelector('.ms-pt-card');
        const read = () => [words(box.querySelector('.ms-pp-who-title')), words(box.querySelector('.ms-pp-who-sub'))];
        const blue = { said: read(), art: holds(card, 'hack-side-blue'), hidden: card.getAttribute('aria-hidden'), status: box.getAttribute('role'), portrait: px(box.querySelector('.ms-k-pt')) };
        const sides = [];
        for (const claim of ['Red', 'Alien', null]) {
          p.part.update({ claim });
          sides.push([...read(), holds(card, claim ? `hack-side-${claim.toLowerCase()}` : 'hack-side-none')]);
        }
        seen.push({ viewer, blue, sides, kept: p.root.querySelector('.ms-pt-claim') === box });
        p.dispose();
      }
      const titles = ['declarer', 'initiator'].map(view => claimSheet({ view, partner: AVA, declarer: DEV })).map(s => [s.id, s.title, s.close, s.actions.length].join('|'));
      const [d, i] = seen;
      return { ok: JSON.stringify(d.blue.said) === '["Dev claims Blue","Unverified · only Ava sees this"]' && JSON.stringify(i.blue.said) === '["Dev claims Blue","Unverified · only you see this"]'
        && seen.every(s => s.blue.art && s.blue.hidden === 'true' && s.blue.status === 'status' && s.blue.portrait === 64 && s.kept)
        && JSON.stringify(d.sides) === JSON.stringify([['Dev claims Red', 'Unverified · only Ava sees this', true], ['Dev claims Alien', 'Unverified · only Ava sees this', true], ['No side declared', 'Unverified · only Ava sees this', true]])
        && JSON.stringify(i.sides) === JSON.stringify([['Dev claims Red', 'Unverified · only you see this', true], ['Dev claims Alien', 'Unverified · only you see this', true], ['No side declared', 'Unverified · only you see this', true]])
        && JSON.stringify(titles) === JSON.stringify(['talk-claim|Ava sees your claim|false|0', 'talk-claim|Dev’s claim|false|0']), seen, titles };
    });

    await check('wait', async () => {
      const p = phone('wait');
      const block = p.root.querySelector('.ms-pt-wait');
      const detail = { title: words(block?.querySelector('.ms-k-wait-title')), portrait: px(block.querySelector(':scope > .ms-k-pt')), line: block.querySelector('.ms-k-wait-line')?.hidden,
        sheet: Object.values(waitSheet()).map(v => (Array.isArray(v) ? v.length : v)).join('|') };
      p.dispose();
      return { ok: detail.title === 'Dev is choosing a side' && detail.portrait === 76 && detail.line === true && detail.sheet === 'talk-wait|Private talk|false|0', ...detail };
    });

    await check('capsule', async () => {
      const p = phone('talk');
      await frames();
      const layers = [...p.root.querySelectorAll('.ms-pt-layer')].map(l => [l.dataset.layer, l.style.getPropertyValue('--ms-pt-art'), l.style.zIndex, getComputedStyle(l).backgroundImage.startsWith('url(')]);
      const figs = [...p.root.querySelectorAll('.ms-pt-fig')];
      const tags = [...p.root.querySelectorAll('.ms-pt-tag')].map(t => [said(t), t.hasAttribute('data-self'), Math.round(t.getBoundingClientRect().left)]);
      const seated = { drawn: figs.map(f => !!f.querySelector('svg')), mirrored: figs.map(f => f.style.transform), left: figs.map(f => Math.round(f.getBoundingClientRect().left)) };
      const amb = p.root.querySelector('svg.amb');
      const quiet = { hidden: p.root.getAttribute('aria-hidden'), controls: p.root.querySelectorAll('button, a, input, [tabindex]:not([tabindex="-1"])').length };
      p.part.update({ size: { width: 430, height: 800 } });
      const resized = [p.root.style.width, p.root.style.height];
      p.dispose();
      const q = phone('talk-initiator');
      const theirs = [...q.root.querySelectorAll('.ms-pt-tag')].map(t => [said(t), t.hasAttribute('data-self')]);
      q.part.update({ pair: [TALK_STATES.talk.part.input.pair[1], TALK_STATES.talk.part.input.pair[0]] });
      const reversed = [...q.root.querySelectorAll('.ms-pt-tag')].map(said);
      q.dispose();
      const detail = { layers, seated, tags, amb: amb?.dataset.room ?? null, quiet, resized, theirs, reversed };
      return { ok: JSON.stringify(layers) === JSON.stringify([['back', 'var(--board-v2-art-capsule-back)', '0', true], ['door', 'var(--board-v2-art-capsule-door-0)', '100', true], ['busy', 'var(--board-v2-art-capsule-busy)', '3000', true]])
        && seated.drawn.every(Boolean) && seated.drawn.length === 2 && JSON.stringify(seated.mirrored) === '["scaleX(-1)",""]' && seated.left[0] < seated.left[1]
        && JSON.stringify(tags.map(t => t.slice(0, 2))) === '[["1 Ava",false],["4 You",true]]' && tags[0][2] < tags[1][2] && detail.amb === 'capsule'
        && quiet.hidden === 'true' && quiet.controls === 0 && JSON.stringify(resized) === '["430px","800px"]'
        && JSON.stringify(theirs) === '[["1 You",true],["4 Dev",false]]' && JSON.stringify(reversed) === '["1 You","4 Dev"]', ...detail };
    });

    await check('audience', async () => {
      // Each part, given everything, on each phone: the declarer's (4), the partner's (1), a third (7), the shared display (none).
      const PARTS = { declare: 'declare-any', wait: 'wait', 'claim (declarer)': 'claim-declarer', 'claim (initiator)': 'claim-initiator', capsule: 'talk' };
      const table = {};
      for (const [name, key] of Object.entries(PARTS)) {
        table[name] = {};
        for (const viewer of [4, 1, 7, null]) {
          const p = phone(key, { viewer: viewer ?? 4, extra: viewer === null ? { viewer: null } : {} });
          table[name][viewer ?? 'display'] = drawn(p.root).length > 0 || words(p.root) !== '';
          p.part.update({ status: 'concealed' });
          table[name][`${viewer ?? 'display'} concealed`] = drawn(p.root).length > 0 || words(p.root) !== '';
          p.dispose();
        }
      }
      const want = { declare: [4], wait: [1], 'claim (declarer)': [4], 'claim (initiator)': [1], capsule: [4, 1] };
      const right = Object.entries(table).every(([name, row]) => Object.entries(row).every(([who, shown]) => shown === (!who.endsWith('concealed') && want[name].includes(Number(who)))));
      // A third phone's whole screen in each step: the pair bar, the room scene, and nothing of this component.
      const others = {};
      for (const key of ['declare-other', 'talk-other']) {
        const size = sizes['390x844'], inputs = inputsFor(key, size);
        const frame = document.createElement('div');
        frame.className = 'pv-phone';
        Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
        document.body.append(frame);
        const shell = mountPhoneShell(frame, inputs.shell, {});
        const stage = mountStage(shell, inputs);
        await frames();
        others[key] = { bar: words(frame.querySelector('.ms-ps-tb .ms-ps-lines') ?? frame.querySelector('.ms-ps-tb')), sheet: !!frame.querySelector('.ms-ps-sheet'),
          talk: frame.querySelectorAll('.ms-private-talk').length, room: !!frame.querySelector('.ms-room-scene') };
        stage.dispose(); shell.dispose(); frame.remove();
      }
      return { ok: right && Object.values(others).every(o => o.bar.startsWith('Ava + Dev') && !o.sheet && o.talk === 0 && o.room), table, others };
    });

    await check('private', async () => {
      const results = {};
      const PRIVATE = ['Blue', 'Red', 'Alien', 'Ava', 'Dev', 'claim', 'side', 'Not for your role', 'You'];
      for (const [key, other] of [['declare-own', 1], ['declare-any', 7], ['claim-declarer', 1], ['claim-initiator', 4], ['wait', 4], ['talk', 7], ['talk-initiator', 4]]) {
        const p = phone(key);
        const own = TALK_STATES[key].viewer;
        p.part.update({ viewer: `seat-${other}` });
        const moved = words(p.root) + drawn(p.root).length;
        // Back to the first viewer: nothing returns until its inputs are given again.
        p.part.update({ viewer: `seat-${own}` });
        const back = words(p.root) + drawn(p.root).length;
        p.part.update({ status: 'concealed' });
        const concealed = words(p.root);
        p.part.update({ status: 'live' });
        const shown = words(p.root) + drawn(p.root).length;
        p.dispose();
        results[key] = { moved, back, concealed, shown, leaked: PRIVATE.filter(w => [moved, back, concealed, shown].some(t => t.includes(w))) };
      }
      // "Not for your role", in every state's whole phone: only on the declarer's own phone, while a side is locked.
      const lockWords = {};
      for (const key of Object.keys(TALK_STATES)) {
        const size = sizes[TALK_STATES[key].sizes?.[0] ?? '390x844'], inputs = inputsFor(key, size);
        const frame = document.createElement('div');
        Object.assign(frame.style, { position: 'relative', width: `${size.width}px`, height: `${size.height}px` });
        document.body.append(frame);
        const shell = mountPhoneShell(frame, inputs.shell, {});
        const stage = mountStage(shell, inputs);
        const part = mountPart(shell, inputs.part);
        const has = (frame.textContent ?? '').includes(TALK_WORDS.notForRole);
        const st = TALK_STATES[key], allowed = st.part?.kind === 'declare' && st.viewer === 4 && (st.status ?? 'live') !== 'concealed' && st.part.input.sides.length < 3;
        if (has !== allowed) lockWords[key] = has;
        // The declarer's phone handed to another viewer: the lock goes with everything else.
        if (has) { part.update({ viewer: 'seat-1' }); if ((frame.textContent ?? '').includes(TALK_WORDS.notForRole)) lockWords[`${key} after a viewer change`] = true; }
        part?.dispose(); stage.dispose(); shell.dispose(); frame.remove();
      }
      return { ok: Object.values(results).every(r => r.leaked.length === 0 && r.moved === '0' && r.back === '0' && r.concealed === '' && r.shown === '0') && Object.keys(lockWords).length === 0, results, lockWords };
    });

    await check('leaks', async () => {
      const said = [], layouts = [], callbacks = [];
      const spied = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
      const original = Object.fromEntries(spied.map(k => [k, console[k]]));
      for (const k of spied) console[k] = (...args) => { said.push([k, ...args.map(String)]); original[k](...args); };
      const hits = [];
      const scan = (frame, where) => {
        for (const el of [frame, ...frame.querySelectorAll('*')]) {
          for (const a of el.attributes) if (SIDE_WORD.test(a.value) || SIDE_WORD.test(a.name)) hits.push([where, el.tagName.toLowerCase(), a.name, a.value.slice(0, 80)]);
        }
      };
      try {
        for (const key of Object.keys(TALK_STATES)) {
          const size = sizes[TALK_STATES[key].sizes?.[0] ?? '390x844'], inputs = inputsFor(key, size);
          const frame = document.createElement('div');
          Object.assign(frame.style, { position: 'relative', width: `${size.width}px`, height: `${size.height}px` });
          document.body.append(frame);
          const shell = mountPhoneShell(frame, inputs.shell, { onLayout: layout => layouts.push(JSON.stringify(layout)), onSheetAction: (...args) => callbacks.push(['onSheetAction', ...args]) });
          const stage = mountStage(shell, inputs);
          const part = mountPart(shell, inputs.part, { onSide: () => {}, onFocusReturn: d => callbacks.push(['onFocusReturn', JSON.stringify(d)]) });
          await frames();
          scan(frame, key);
          // Every card tapped, every side chosen, every claim shown: still no side in an attribute.
          for (const card of frame.querySelectorAll('.ms-pt-sides .ms-pp-tile')) { card.focus(); tap(card); }
          const kind = TALK_STATES[key].part?.kind;
          if (kind === 'declare' && TALK_STATES[key].part.input.sides.length === 3) for (const s of SIDES) { part.update({ selected: s }); shell.update({ sheet: declareSheet({ selected: s }) }); scan(frame, `${key} ${s}`); }
          if (kind === 'claim') for (const s of [...SIDES, null]) { part.update({ claim: s }); scan(frame, `${key} ${s}`); }
          frame.querySelector('.ms-ps-sheet-foot .ms-k-btn')?.click();
          part?.update({ status: 'concealed' });
          await microtasks();
          scan(frame, `${key} concealed`);
          part?.dispose(); stage.dispose(); shell.dispose(); frame.remove();
        }
      } finally {
        for (const k of spied) console[k] = original[k];
      }
      const loud = said.filter(s => s.slice(1).some(t => SIDE_WORD.test(t)));
      const laid = layouts.filter(l => SIDE_WORD.test(l));
      const told = callbacks.filter(c => c.slice(1).some(t => SIDE_WORD.test(String(t))));
      return { ok: hits.length === 0 && loud.length === 0 && laid.length === 0 && told.length === 0 && layouts.length > 0,
        hits: hits.slice(0, 20), console: loud.slice(0, 10), onLayout: laid.slice(0, 5), callbacks: told.slice(0, 10), layoutsSeen: layouts.length, callbacksSeen: callbacks.length };
    });

    await check('inputs', async () => inputsCheck());

    await check('focus', async () => {
      const p = phone('declare-any');
      const red = cards(p.root)[1];
      red.focus();
      p.part.update({ status: 'concealed' });
      await microtasks();
      const detail = { onRoot: document.activeElement === p.root, returned: reported(p, 'onFocusReturn') };
      p.dispose();
      return { ok: detail.onRoot && detail.returned.length === 1 && detail.returned[0]?.intent === 'side' && detail.returned[0]?.value === '2', ...detail };
    });

    await check('text', async () => {
      document.documentElement.style.fontSize = '200%';
      const whole = (node, within) => node.getBoundingClientRect().right <= within.getBoundingClientRect().right + 0.5 && node.scrollWidth <= node.clientWidth + 1;
      const p = phone('largest-declare', { sizeKey: '320x568' });
      const list = cards(p.root);
      const top = n => Math.round(n.getBoundingClientRect().top);
      const declare = { perRow: list.filter(n => top(n) === top(list[0])).length, whole: list.every(n => whole(n, n) && [...n.querySelectorAll('.ms-pp-tile-name, .ms-pp-tile-note:not([hidden])')].every(w => whole(w, n))),
        tall: list.every(n => n.getBoundingClientRect().height >= 44), note: whole(p.root.querySelector('.ms-pt-note'), p.root) };
      p.dispose();
      const q = phone('largest-claim', { sizeKey: '320x568' });
      const claim = { who: [...q.root.querySelectorAll('.ms-pp-who-title, .ms-pp-who-sub')].every(w => whole(w, q.root)), card: px(q.root.querySelector('.ms-pt-card')) };
      q.dispose();
      const r = phone('largest-wait', { sizeKey: '320x568' });
      const wait = { title: whole(r.root.querySelector('.ms-k-wait-title'), r.root) };
      r.dispose();
      const s = phone('largest-talk', { sizeKey: '320x568' });
      const tags = [...s.root.querySelectorAll('.ms-pt-tag')].map(t => t.getBoundingClientRect());
      const stage = s.shell.stage.getBoundingClientRect();
      const talk = { inside: tags.every(t => t.left >= stage.left - 0.5 && t.right <= stage.right + 0.5), apart: tags.length === 2 && tags[0].right <= tags[1].left };
      s.dispose();
      document.documentElement.style.fontSize = '';
      return { ok: declare.perRow === 3 && declare.whole && declare.tall && declare.note && claim.who && claim.card <= 160 && wait.title && talk.inside && talk.apart, declare, claim, wait, talk };
    });

    await check('dispose', async () => {
      const p = phone('declare-any');
      const root = p.root, card = cards(root)[1];
      p.part.dispose();
      tap(card);
      p.part.update({ selected: 'Red' });
      const declare = { left: root.isConnected, taps: reported(p, 'onSide').length, body: p.shell.sheetBody?.querySelectorAll('.ms-private-talk').length ?? 0 };
      p.shell.dispose(); p.frame.remove();
      const q = phone('talk');
      const croot = q.root;
      const before = crewMountStats(croot).instances;
      q.part.dispose();
      q.part.update({ size: { width: 300, height: 500 } });
      const capsule = { before, after: crewMountStats(croot).instances, left: croot.isConnected, stage: q.shell.stage.querySelectorAll('.ms-private-talk, svg.amb').length };
      q.shell.dispose(); q.frame.remove();
      return { ok: !declare.left && declare.taps === 0 && declare.body === 0 && capsule.before === 2 && capsule.after === 0 && !capsule.left && capsule.stage === 0, declare, capsule };
    });
  }

  await check('motion', async () => {
    const MOMENT = 130000;
    const running = p => [...p.root.querySelectorAll('svg.amb')].flatMap(svg => svg.getAnimations({ subtree: true }));
    const look = p => { const list = running(p); return { count: list.length, playing: list.filter(a => a.playState === 'running').length, at: Math.round(Number(list[0]?.currentTime ?? NaN) / 1000) }; };
    const live = phone('talk', { extra: { clock: { now: () => SKY_EPOCH + MOMENT } } });
    await frames();
    const onClock = look(live);
    live.part.suspend();
    const suspended = look(live);
    live.part.resume();
    const resumed = look(live);
    live.part.update({ status: 'stale' });
    const stale = look(live);
    live.dispose();
    const calm = phone('talk', { extra: { clock: { now: () => SKY_EPOCH + MOMENT }, reducedMotion: true } });
    await frames();
    const reduced = look(calm);
    calm.dispose();
    const held = phone('talk', { extra: { clock: null } });
    await frames();
    const noClock = look(held);
    held.dispose();
    const detail = { onClock, suspended, resumed, stale, reduced, noClock };
    // With the device's Reduce motion, the ambient stands still even without the game's setting.
    if (deviceReduced) return { ok: onClock.count > 0 && onClock.playing === 0 && reduced.playing === 0 && noClock.playing === 0, ...detail };
    return { ok: onClock.count > 0 && onClock.playing === onClock.count && Math.abs(onClock.at - MOMENT / 1000) <= 1 && suspended.playing === 0 && resumed.playing === resumed.count
      && stale.playing === 0 && reduced.count > 0 && reduced.playing === 0 && noClock.playing === 0 && noClock.at === 0, ...detail };
  });

  return { mode, ok: checks.length > 0 && checks.every(c => c.ok), checks };
}

/** The inputs' checks, run in the page as Frontend's calls would: each wrong input an error; a checked input checks to itself. */
export function inputsCheck() {
  const errors = [];
  const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
  expectError('an unknown key', () => checkDeclare({ colour: 'red' }));
  expectError('a side that is not one', () => checkDeclare({ sides: ['Green'] }));
  expectError('a side twice', () => checkDeclare({ sides: ['Blue', 'Blue'] }));
  expectError('a choice not offered', () => checkDeclare({ sides: ['Blue'], selected: 'Red' }));
  expectError('one person as both', () => checkDeclare({ partner: AVA, declarer: AVA }));
  expectError('a view that is not one', () => checkClaim({ view: 'everyone' }));
  expectError('a claim that is not a side', () => checkClaim({ claim: 'Green' }));
  expectError('a pair of one', () => checkCapsule({ pair: [AVA] }));
  expectError('no stage size', () => checkCapsule({ size: { width: 0, height: 10 } }));
  expectError('a bar without its pair', () => talkBar({ phase: 'talk', pair: [] }));
  expectError('a bar for another phase', () => talkBar({ phase: 'vote', pair: [AVA, DEV] }));
  const d = checkDeclare({ viewer: 4, partner: AVA, declarer: DEV, sides: ['Blue'], selected: 'Blue' });
  const c = checkClaim({ viewer: 1, view: 'initiator', partner: AVA, declarer: DEV, claim: null });
  const k = checkCapsule({ viewer: 4, pair: [{ ...AVA, health: 'Healthy', location: 'Room A' }, { ...DEV, health: 'Injured', location: 'Hospital' }] });
  const same = JSON.stringify([d, c, k]) === JSON.stringify([checkDeclare(d), checkClaim(c), checkCapsule(k)]);
  return { ok: errors.every(([, thrown]) => thrown) && same, errors, same };
}
