// mothership:dev-only
//
// The board tags' probe: it drives the real component (../board-tags.mjs) in the pack's own board, in the browser,
// under whatever headers serve the page (design/tools/board-tags-check.mjs serves the production ones), and reports
// what it saw. Each check is one thing Frontend or the Lead relies on:
//   whole          every tag of every captured board (390 and 430 at Standard, Large and Largest; 320 at Standard)
//                  is 4 px inside its panel, clear of the caption and the "You" pill, says all its words (no "…",
//                  nothing cut), and says them as given: the number, the name or "You", "· Injured" or "· Out"
//   apart          on the same boards, no two tags are within 2 px
//   deterministic  the same people in another order give the same places, in layoutTags() and on the page
//   still          no tag animates or transitions, and nothing moves between frames
//   layer          the layer is above the target rings (3150 over the pack's 3100; Frontend's --ms-board-tags-z sets
//                  it), takes no taps, and a tap at any tag's centre reaches what is beneath
//   privacy        "You" and dim are this viewer's: a new viewer drops both until given again; concealed, the layer
//                  is empty, and shown again it stays empty until the tags are given again
//   inputs         an unknown key, a seat twice, a bad place, health, office, status, size or box is an error; a
//                  checked input checks to itself
//   kept           each tag keeps its element through updates and reorders
//   rules          layoutTags() alone: centred on the press point, 6 px above the foot, above the pack's floor,
//                  inside, clear of a box, the one further back gives way, then "You"
//   dispose        after dispose(), nothing is left and update() does nothing

import { TAG_RULES, checkBoardTags, layoutTags, mountBoardTags } from '../board-tags.mjs';
import { BOARD_STATES, CAPTURES } from './states.mjs';
import { drawGameBoard, mountLayers, phone } from './preview.mjs';

const TOL = 0.5;
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const statusWords = h => (h === 'Injured' ? ' · Injured' : h === 'Eliminated' ? ' · Out' : '');
const separation = (a, b) => Math.max(b.left - (a.left + a.width), a.left - (b.left + b.width), b.top - (a.top + a.height), a.top - (b.top + b.height));

export async function runBoardTagsProbe() {
  const checks = [];
  const check = async (id, fn) => {
    try { const detail = await fn(); checks.push({ id, ok: !!detail.ok, detail }); }
    catch (error) { checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } }); }
  };
  /** A state's board in the game's own panels (Board V2's arrangement), with the component in each; dispose with done(). */
  async function board(state, size = '390x844', text = 100, options = {}) {
    document.documentElement.style.fontSize = text === 100 ? '' : `${text}%`;
    const frame = phone(size);
    Object.assign(frame.style, { position: 'absolute', left: '0', top: '0' });
    const drawn = drawGameBoard(frame, state, size, text);
    await document.fonts.ready;
    const layers = drawn.fits ? mountLayers(frame, state, options) : [];
    await frames();
    return { frame, layers, fits: drawn.fits, done() { for (const l of layers) l.layer.dispose(); frame.remove(); document.documentElement.style.fontSize = ''; } };
  }
  /** What each panel's tags look like on the page, relative to the panel. */
  const seen = layers => layers.map(({ panel, input, layer }) => {
    const p = panel.getBoundingClientRect();
    const tags = [...layer.element.querySelectorAll('.ms-bt-tag')].map(t => {
      const r = t.getBoundingClientRect();
      const cut = [t, ...t.querySelectorAll('.ms-bt-name, .ms-bt-status')].some(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1);
      return { seat: Number(t.dataset.seat), left: r.left - p.left, top: r.top - p.top, width: r.width, height: r.height, text: t.innerText.replace(/\s+/g, ' ').trim(), cut };
    });
    return { panel: panel.getAttribute('aria-label'), input, tags };
  });

  const cases = CAPTURES.filter(c => (BOARD_STATES[c.state].status ?? 'live') === 'live');
  const wholeFails = [], apartFails = [];
  let tagCount = 0;
  const tooShort = [];
  for (const c of cases) {
    const b = await board(c.state, c.size, c.text);
    // Every captured size fits; a board Board V2 would not draw is reported, not measured.
    if (!b.fits) tooShort.push(`${c.size}@${c.text} ${c.state}`);
    for (const panel of seen(b.layers)) {
      const { width, height } = panel.input.size, pad = TAG_RULES.pad;
      for (const t of panel.tags) {
        tagCount += 1;
        const person = panel.input.people.find(p => p.seat === t.seat);
        const want = `${t.seat} ${panel.input.viewer === t.seat ? 'You' : person.name}${statusWords(person.health)}`;
        const problems = [];
        if (t.left < pad - TOL || t.top < pad - TOL || t.left + t.width > width - pad + TOL || t.top + t.height > height - pad + TOL) problems.push('outside');
        if (panel.input.keepClear.some(k => separation(t, k) < -TOL)) problems.push('over a kept-clear box');
        if (t.cut) problems.push('cut');
        if (t.text.includes('…')) problems.push('ellipsis');
        if (t.text !== want) problems.push(`words ${JSON.stringify(t.text)} ≠ ${JSON.stringify(want)}`);
        if (problems.length) wholeFails.push({ case: `${c.size}@${c.text} ${c.state}`, panel: panel.panel, seat: t.seat, problems });
      }
      for (let i = 0; i < panel.tags.length; i += 1) for (let j = i + 1; j < panel.tags.length; j += 1) {
        const gap = separation(panel.tags[i], panel.tags[j]);
        if (gap < TAG_RULES.gap - TOL) apartFails.push({ case: `${c.size}@${c.text} ${c.state}`, panel: panel.panel, seats: [panel.tags[i].seat, panel.tags[j].seat], gap });
      }
    }
    b.done();
  }
  await check('whole', async () => ({ ok: wholeFails.length === 0 && tagCount > 0 && tooShort.length === 0, boards: cases.length, tags: tagCount, tooShort, fails: wholeFails.slice(0, 20) }));
  await check('apart', async () => ({ ok: apartFails.length === 0 && tagCount > 0, boards: cases.length, fails: apartFails.slice(0, 20) }));

  await check('deterministic', async () => {
    const results = {};
    for (const state of ['crowd-ab', 'crowd-hj']) {
      const b = await board(state, '390x844', 200);
      const before = seen(b.layers).map(p => p.tags.map(t => [t.seat, Math.round(t.left * 100), Math.round(t.top * 100)]));
      // The same people, reversed, on the page; and rotated, in layoutTags() alone.
      for (const { layer, input } of b.layers) layer.update({ people: [...input.people].reverse() });
      await frames();
      const after = seen(b.layers).map(p => p.tags.map(t => [t.seat, Math.round(t.left * 100), Math.round(t.top * 100)]).sort((x, y) => x[0] - y[0]));
      const sortedBefore = before.map(p => [...p].sort((x, y) => x[0] - y[0]));
      const pure = b.layers.every(({ input, layer }) => {
        const tags = input.people.map(p => { const n = layer.element.querySelector(`[data-seat="${p.seat}"]`); return { seat: p.seat, at: p.at, width: n.offsetWidth, height: n.offsetHeight, self: p.seat === input.viewer }; });
        const one = layoutTags({ panel: input.size, keepClear: input.keepClear, tags });
        const two = layoutTags({ panel: input.size, keepClear: input.keepClear, tags: [...tags.slice(2), ...tags.slice(0, 2)] });
        return JSON.stringify(one) === JSON.stringify(two);
      });
      results[state] = { page: JSON.stringify(sortedBefore) === JSON.stringify(after), pure };
      b.done();
    }
    return { ok: Object.values(results).every(r => r.page && r.pure), ...results };
  });

  await check('still', async () => {
    const b = await board('crowd-ab', '390x844', 200);
    const tags = b.layers.flatMap(l => [...l.layer.element.querySelectorAll('.ms-bt-tag')]);
    const animations = b.layers.reduce((n, l) => n + l.layer.element.getAnimations({ subtree: true }).length, 0);
    const transitions = tags.filter(t => getComputedStyle(t).transitionDuration.split(',').some(d => parseFloat(d) > 0)).length;
    const at = () => tags.map(t => `${t.offsetLeft},${t.offsetTop}`).join('|');
    const first = at();
    await frames();
    await frames();
    const moved = first !== at();
    b.done();
    return { ok: tags.length > 0 && animations === 0 && transitions === 0 && !moved, tags: tags.length, animations, transitions, moved };
  });

  await check('layer', async () => {
    const b = await board('targets', '390x844', 100);
    const room = b.layers.find(l => l.panel.getAttribute('aria-label') === 'Room A');
    const z = getComputedStyle(room.layer.element).zIndex, rings = [...room.panel.querySelectorAll('.press')].map(n => getComputedStyle(n).zIndex);
    const events = [room.layer.element, ...room.layer.element.querySelectorAll('.ms-bt-tag, .ms-bt-tag *')].map(n => getComputedStyle(n).pointerEvents);
    // A tap at each tag's centre reaches what is beneath: never the layer.
    const through = b.layers.flatMap(l => [...l.layer.element.querySelectorAll('.ms-bt-tag')].map(t => {
      const r = t.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { seat: Number(t.dataset.seat), hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className?.baseVal ?? hit.className).split(' ')[0]}` : null, inLayer: !!hit?.closest('.ms-board-tags') };
    }));
    // Frontend's stacking: Board V2's targets are at 4200, so it sets the layer above them.
    room.panel.style.setProperty('--ms-board-tags-z', '4300');
    const set = getComputedStyle(room.layer.element).zIndex;
    b.done();
    return { ok: z === '3150' && rings.length > 0 && rings.every(r => Number(r) < Number(z)) && events.every(e => e === 'none') && through.length > 0 && through.every(t => !t.inLayer) && set === '4300',
      z, rings: [...new Set(rings)], pointerEvents: [...new Set(events)], through: through.slice(0, 6), set };
  });

  await check('privacy', async () => {
    // The targets frame: Rescue reaches Room A and Eli; Room B's three are dimmed on this viewer's phone.
    const b = await board('targets', '390x844', 100);
    const panelOf = name => b.layers.find(l => l.panel.getAttribute('aria-label') === name);
    const roomA = panelOf('Room A'), roomB = panelOf('Room B');
    const text = l => l.layer.element.innerText.replace(/\s+/g, ' ').trim();
    const dimmed = l => l.layer.element.querySelectorAll('[data-dim]').length;
    const own = l => [...l.layer.element.querySelectorAll('[data-self]')].map(t => t.dataset.seat);
    const start = { you: own(roomA), dimmedB: dimmed(roomB) };
    // A new viewer: "You" moves to their seat, and this viewer's dim is dropped until given again.
    roomA.layer.update({ viewer: 7 });
    roomB.layer.update({ viewer: 7 });
    const handed = { you: own(roomA), dimmedB: dimmed(roomB), textA: text(roomA) };
    roomB.layer.update({ dim: [3] });
    const given = { dimmedB: dimmed(roomB) };
    // Concealed: nothing; shown again: nothing until the tags are given again.
    roomA.layer.update({ status: 'concealed' });
    const concealed = { children: roomA.layer.element.childElementCount, text: text(roomA) };
    roomA.layer.update({ status: 'live' });
    const shown = { children: roomA.layer.element.childElementCount };
    roomA.layer.update({ people: roomA.input.people, viewer: 4 });
    const back = { children: roomA.layer.element.childElementCount, you: own(roomA) };
    b.done();
    const ok = start.you.join() === '4' && start.dimmedB === 3 && handed.you.join() === '7' && handed.dimmedB === 0 && handed.textA.includes('Dev')
      && given.dimmedB === 1 && concealed.children === 0 && concealed.text === '' && shown.children === 0 && back.children === roomA.input.people.length && back.you.join() === '4';
    return { ok, start, handed, given, concealed, shown, back };
  });

  await check('inputs', async () => {
    const base = { size: { width: 180, height: 200 }, people: [{ seat: 4, name: 'Dev', health: 'Healthy', office: null, at: { x: 90, bottom: 150 } }] };
    const errors = [];
    const expectError = (what, fn) => { try { fn(); errors.push([what, false]); } catch { errors.push([what, true]); } };
    expectError('an unknown key', () => checkBoardTags({ ...base, colour: 'red' }));
    expectError('a seat twice', () => checkBoardTags({ ...base, people: [...base.people, { ...base.people[0] }] }));
    expectError('a seat that is not one', () => checkBoardTags({ ...base, people: [{ ...base.people[0], seat: 10 }] }));
    expectError('no place', () => checkBoardTags({ ...base, people: [{ ...base.people[0], at: { x: 90 } }] }));
    expectError('an unknown health', () => checkBoardTags({ ...base, people: [{ ...base.people[0], health: 'Sleeping' }] }));
    expectError('an unknown office', () => checkBoardTags({ ...base, people: [{ ...base.people[0], office: 'admiral' }] }));
    expectError('an unknown status', () => checkBoardTags({ ...base, status: 'asleep' }));
    expectError('no size', () => checkBoardTags({ people: [] }));
    expectError('a bad box', () => checkBoardTags({ ...base, keepClear: [{ left: 0, top: 0, width: -1, height: 5 }] }));
    expectError('a bad dim seat', () => checkBoardTags({ ...base, dim: ['seat-0'] }));
    const host = document.createElement('div');
    document.body.append(host);
    const layer = mountBoardTags(host, base);
    expectError('an unknown key in an update', () => layer.update({ colour: 'red' }));
    layer.dispose();
    host.remove();
    const once = checkBoardTags({ ...base, viewer: 'seat-4', dim: ['seat-4'] }), twice = checkBoardTags(once);
    return { ok: errors.every(([, thrown]) => thrown) && JSON.stringify(once) === JSON.stringify(twice) && once.viewer === 4, errors, idempotent: JSON.stringify(once) === JSON.stringify(twice) };
  });

  await check('kept', async () => {
    const b = await board('crowd-ab', '390x844', 100);
    const room = b.layers.find(l => l.panel.getAttribute('aria-label') === 'Room A');
    const before = new Map([...room.layer.element.querySelectorAll('.ms-bt-tag')].map(t => [t.dataset.seat, t]));
    const people = [...room.input.people].reverse().map(p => (p.seat === 2 ? { ...p, name: 'Benedict' } : p));
    room.layer.update({ people });
    const after = new Map([...room.layer.element.querySelectorAll('.ms-bt-tag')].map(t => [t.dataset.seat, t]));
    const kept = [...before].every(([seat, node]) => after.get(seat) === node);
    const renamed = after.get('2')?.innerText.includes('Benedict');
    b.done();
    return { ok: before.size === 5 && kept && renamed, count: before.size, kept, renamed };
  });

  await check('rules', async () => {
    const panel = { width: 176, height: 186 };
    const tag = (seat, x, bottom, extra = {}) => ({ seat, at: { x, bottom }, width: 60, height: 22, self: false, ...extra });
    const place = (r, seat) => r.places.find(p => p.seat === seat);
    const one = layoutTags({ panel, tags: [tag(1, 88, 120)] });
    const floor = layoutTags({ panel, tags: [tag(1, 88, 186)] });
    const edge = layoutTags({ panel, tags: [tag(1, 2, 120), tag(2, 175, 60)] });
    const clear = layoutTags({ panel, keepClear: [{ left: 0, top: 0, width: 176, height: 40 }], tags: [tag(1, 88, 40)] });
    const back = layoutTags({ panel, tags: [tag(1, 88, 120), tag(2, 92, 110)] });
    const you = layoutTags({ panel, tags: [tag(1, 88, 120, { self: true }), tag(2, 92, 110)] });
    const results = {
      centred: place(one, 1).left === 58 && place(one, 1).top === 114,
      floor: place(floor, 1).top === panel.height - TAG_RULES.footClear,
      inside: place(edge, 1).left === TAG_RULES.pad && place(edge, 2).left === panel.width - TAG_RULES.pad - 60,
      clear: place(clear, 1).top === 40,
      // Seat 2's foot is higher (further back): it gives way, up, by no more than it needs.
      back: place(back, 1).top === 114 && place(back, 2).top === 114 - 22 - TAG_RULES.gap && back.apart,
      // "You" gives way first, even in front: up, though down would be nearer.
      you: place(you, 2).top === 104 && place(you, 1).top === 104 - 22 - TAG_RULES.gap && you.apart,
    };
    return { ok: Object.values(results).every(Boolean), ...results, one: one.places, back: back.places, you: you.places };
  });

  await check('dispose', async () => {
    const b = await board('board', '390x844', 100);
    const { layer, panel } = b.layers[1];
    const element = layer.element;
    layer.dispose();
    let threw = false;
    try { layer.update({ people: [] }); } catch { threw = true; }
    const left = element.isConnected || panel.querySelectorAll('.ms-board-tags').length;
    b.done();
    return { ok: !threw && !left, threw, left: !!left };
  });

  return { mode: 'full', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
