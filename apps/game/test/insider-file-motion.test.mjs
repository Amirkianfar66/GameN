import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblyPlan, createInsiderFile, FILE_MOTION, SPOT_MS, threadPath } from '../hosted/insider-file.mjs';

// The Insider's file in the page (the Designer's motion, abilities-0.1.0 at 1453500): the plan of
// its assembly, which may never tell the three players apart, and the host module's lifecycle:
// once per page, finished at rest whenever the file goes or motion is reduced, a ring of 1.6 s.

/** A small element: enough of the DOM for the module, and every animation it is asked for. */
function node(className = '', extra = {}) {
  const children = [];
  const element = {
    className, dataset: {}, attributes: {}, isConnected: true, animations: [], children,
    style: { values: {}, setProperty(name, value) { this.values[name] = value; }, removeProperty(name) { delete this.values[name]; } },
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...nodes) { children.push(...nodes); },
    after(other) { element.parent?.children.push(other); other.parent = element.parent; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400 }),
    getTotalLength: () => 1000,
    scrollIntoView() { element.scrolled = true; },
    animate(frames, options) {
      const animation = { frames, options, finished: false, finish() { this.finished = true; } };
      element.animations.push(animation);
      return animation;
    },
    ...extra,
  };
  return element;
}

/** A drawn file of three snapshots for the given seats, built the way the markup builds it. */
function drawnFile(seats = ['1', '2', '4'], pressed = null, { strung = false } = {}) {
  const file = node('ab-file');
  const field = node('ab-file__field');
  field.parent = file;
  file.children.push(field);
  if (strung) {
    const svg = node('svg');
    svg.attributes.class = 'ab-thread';
    svg.children.push(node('ab-thread__ink'), node('ab-thread__core'));
    file.children.push(svg);
  }
  const corners = Object.fromEntries(['tl', 'tr', 'br', 'bl'].map((corner, index) => [corner, node('ab-corner-pin', { getBoundingClientRect: () => ({ left: index % 3 ? 280 : 10, top: index < 2 ? 40 : 360, width: 18, height: 20, right: 0, bottom: 0 }) })]));
  const photos = seats.map(seat => {
    const photo = node('ab-photo', { pin: node('ab-photo__pin'), query: node('ab-photo__query') });
    photo.dataset.seat = seat;
    photo.pressed = seat === pressed;
    photo.querySelector = selector => (selector === '.ab-photo__pin' ? photo.pin : selector === '.ab-photo__query' ? photo.query : null);
    return photo;
  });
  const parts = { roles: node('ab-roles'), slip: node('ab-roles__slip'), classified: node('ab-stamp'), oneEach: node('ab-stamp') };
  const thread = () => file.children.find(child => child.attributes?.class === 'ab-thread') ?? null;
  file.querySelectorAll = selector => ({
    '.ab-photo': photos, '.ab-photo__query': photos.map(photo => photo.query), '.ab-corner-pin': Object.values(corners),
    '.ab-thread path': thread()?.children ?? [],
  })[selector] ?? [];
  file.querySelector = selector => {
    if (selector === ':scope > .ab-thread') return thread();
    if (selector === ':scope > .ab-file__field' || selector === '.ab-file__field') return field;
    if (selector === '.ab-photo[aria-pressed="true"]') return photos.find(photo => photo.pressed) ?? null;
    const corner = /data-corner="(\w+)"/.exec(selector)?.[1];
    if (corner) return corners[corner];
    return { '.ab-roles': parts.roles, '.ab-roles__slip': parts.slip, '[data-stamp="classified"]': parts.classified, '[data-stamp="one-each"]': parts.oneEach }[selector] ?? null;
  };
  return { file, photos, parts, thread };
}

function page(t) {
  const globals = {
    document: { visibilityState: 'visible', createElementNS: (ns, tag) => { const made = node(tag); made.querySelectorAll = () => made.children; return made; } },
    getComputedStyle: () => ({ transform: 'none', rotate: 'none', opacity: '1' }),
    CSS: { escape: value => value },
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
  let current = null;
  const seats = new Map();
  const root = {
    querySelector: selector => (selector === '.ab-file' ? current : seats.get(/data-seat="([^"]+)"/.exec(selector)?.[1]) ?? null),
    querySelectorAll: () => [...seats.values()].filter(seat => 'spot' in seat.dataset),
  };
  return { root, show: file => { current = file; }, seats };
}

const end = ([, , options]) => (options.delay ?? 0) + options.duration;

test('the string runs pin to pin round the four corners and closes where it began', () => {
  const d = threadPath([[10, 40], [280, 40], [280, 360], [10, 360]]);
  assert.match(d, /^M 10\.0 40\.0 Q /);
  assert.equal(d.match(/Q /g).length, 4);
  assert.match(d, / 10\.0 40\.0$/);
  // Each side sags a little inward: along the top, below the straight line between the two pins.
  assert.match(d, /^M 10\.0 40\.0 Q 145\.0 47\.0 280\.0 40\.0 /);
});

test('the assembly moves every snapshot alike, by position only, and is over in 1,020 ms', () => {
  const plan = assemblyPlan(drawnFile(['1', '2', '4'], null, { strung: true }).file, false);
  const other = assemblyPlan(drawnFile(['3', '6', '9'], null, { strung: true }).file, false);
  // The same plan whatever the three players are: nothing in it is read from a seat.
  assert.deepEqual(other.map(([, frames, options]) => [frames, options]), plan.map(([, frames, options]) => [frames, options]));
  assert.equal(Math.max(...plan.map(end)), FILE_MOTION.total);
  // The three snapshots drop in seat order, 70 ms apart, each the same drop but for its tilt by position.
  const drops = plan.filter(([element]) => element.className === 'ab-photo');
  assert.deepEqual(drops.map(([, , options]) => options.delay), [120, 190, 260]);
  assert.deepEqual(drops.map(([, frames]) => frames[0].transform), ['translateY(-28px) rotate(-7deg) scale(1.08)', 'translateY(-28px) rotate(7deg) scale(1.08)', 'translateY(-28px) rotate(-7deg) scale(1.08)']);
  // The query tags swing on all at once; the three role names move together, as one slip.
  assert.deepEqual(new Set(plan.filter(([element]) => element.className === 'ab-photo__query').map(([, , options]) => options.delay)), new Set([FILE_MOTION.queriesFrom]));
  assert.equal(plan.filter(([element]) => element.className === 'ab-roles__slip').length, 1);
  assert.ok(plan.every(([, , options]) => options.fill === 'backwards'), 'nothing is held after it lands');
  // Reduced: the file appears at rest with one 80 ms fade.
  const reduced = assemblyPlan(drawnFile().file, true);
  assert.equal(reduced.length, 1);
  assert.deepEqual([reduced[0][0].className, reduced[0][2].duration, reduced[0][2].easing], ['ab-file', FILE_MOTION.reducedFade, 'linear']);
});

test('the file assembles once per page, on a deliberate open, and stops at rest whenever it goes', t => {
  const { root, show } = page(t);
  const motion = createInsiderFile(root, { setTimeout: () => 0, clearTimeout: () => {}, now: () => 0 });
  // Drawn without a press of Card (an update, a reconnect): at rest, with its string.
  const first = drawnFile();
  show(first.file);
  motion.before(); motion.after({ requested: false });
  assert.equal(first.file.animations.length, 0);
  assert.ok(first.thread(), 'the string is drawn into the file');
  assert.match(first.thread().children[0].attributes.d, /^M /);
  // The player opens the card: it assembles.
  const opened = drawnFile();
  show(opened.file);
  motion.before(); motion.after({ requested: true });
  const running = [opened.file, ...opened.photos].flatMap(element => element.animations);
  assert.ok(running.length > 0);
  // Closed before it is over: everything is finished, at rest.
  show(null);
  motion.before(); motion.after({ requested: false });
  assert.ok(running.every(animation => animation.finished));
  // Opened again in the same page: at rest, never again.
  const again = drawnFile();
  show(again.file);
  motion.before(); motion.after({ requested: true });
  assert.equal([again.file, ...again.photos].flatMap(element => element.animations).length, 0);
  motion.dispose();
});

test('reduced motion finishes the assembly at once, and an inspected snapshot is given its lift toward the middle', t => {
  const { root, show } = page(t);
  const motion = createInsiderFile(root, { setTimeout: () => 0, clearTimeout: () => {}, now: () => 0 });
  const drawn = drawnFile();
  show(drawn.file);
  motion.before(); motion.after({ requested: true });
  const running = [drawn.file, ...drawn.photos].flatMap(element => element.animations);
  motion.before(); motion.after({ reduced: true });
  assert.ok(running.length > 0 && running.every(animation => animation.finished));
  // Inspecting: the pressed snapshot is lifted by the distance from its middle to the field's.
  const inspected = drawnFile(['1', '2', '4'], '4');
  inspected.photos[2].getBoundingClientRect = () => ({ left: 200, top: 0, width: 80, height: 100, right: 280, bottom: 100 });
  show(inspected.file);
  motion.before(); motion.after({ reduced: true });
  assert.equal(inspected.photos[2].style.values['--ab-lift-x'], `${150 - 240}px`);
  assert.equal(inspected.photos[0].style.values['--ab-lift-x'], undefined);
  motion.dispose();
});

test('a character asked for from the file is ringed on the own board for 1.6 s, carried across a redraw', t => {
  const { root, show, seats } = page(t);
  let clock = 0;
  const timers = [];
  const motion = createInsiderFile(root, { setTimeout: (callback, ms) => { timers.push({ callback, ms }); return timers.length; }, clearTimeout: () => {}, now: () => clock });
  show(null);
  motion.spot('seat-4');
  const seat = node('ms-seat');
  seats.set('seat-4', seat);
  motion.before(); motion.after();
  assert.equal('spot' in seat.dataset, true);
  assert.equal(seat.scrolled, true, 'brought into view on the board');
  assert.deepEqual(timers.map(timer => timer.ms), [SPOT_MS]);
  // The board is redrawn 700 ms in: the new character carries the ring on from there.
  clock = 700;
  const redrawn = node('ms-seat');
  seats.set('seat-4', redrawn);
  motion.before(); motion.after();
  assert.equal('spot' in redrawn.dataset, true);
  assert.equal(redrawn.style.values['--ab-spot-delay'], '-700ms');
  // At 1.6 s it is gone.
  timers[0].callback();
  assert.equal('spot' in redrawn.dataset, false);
  motion.dispose();
});
