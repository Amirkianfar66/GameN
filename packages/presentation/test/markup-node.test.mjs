import assert from 'node:assert/strict';
import test from 'node:test';
import { h, planRedraw, splitRegions, textOf, toHtml } from '@mothership/presentation';

test('text and attribute values are escaped wherever they come from', () => {
  const hostile = '<img src=x onerror="alert(1)">&\'';
  const html = toHtml(h('p', { id: 'safe', 'data-note': hostile }, hostile));
  assert.equal(html, '<p id="safe" data-note="&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;">&lt;img src=x onerror="alert(1)"&gt;&amp;\'</p>');
  assert.equal(html.includes('<img'), false);
});

test('markup cannot carry script, inline style, event handlers or a data-chosen navigation target', () => {
  for (const tag of ['script', 'style', 'iframe', 'img', 'form', 'object']) {
    assert.throws(() => h(tag, null), /not permitted/, tag);
  }
  // Attributes are allowed by name, so one nobody thought to forbid is refused as well.
  for (const name of ['onclick', 'onload', 'style', 'src', 'srcdoc', 'action', 'formaction', 'ping', 'background', 'poster', 'target', 'download', 'name', 'value', 'title', 'contenteditable', 'accesskey']) {
    assert.throws(() => h('div', { [name]: 'x' }), /not permitted/, name);
  }
  for (const name of ['class', 'id', 'role', 'tabindex', 'hidden', 'for', 'scope', 'aria-label', 'aria-live', 'data-region', 'data-intent']) {
    assert.doesNotThrow(() => h('div', { [name]: 'x' }), name);
  }
  for (const name of ['aria-', 'data-', 'data-Upper', 'aria_label', 'xml:lang', 'data-x y']) {
    assert.throws(() => h('div', { [name]: 'x' }), /not permitted|Invalid attribute name/, name);
  }
  for (const href of ['https://example.test/', 'javascript:alert(1)', '//example.test', '/path', '#', '#9bad', '# spaced']) {
    assert.throws(() => h('a', { href }, 'link'), /in-page fragment/, href);
  }
  assert.throws(() => h('div', { 'Bad Name': 'x' }), /Invalid attribute name/);
  assert.equal(toHtml(h('a', { href: '#ms-main' }, 'Skip')), '<a href="#ms-main">Skip</a>');
});

test('a node assembled by hand is held to the same rules when it is serialized', () => {
  const text = 'ok';
  assert.throws(() => toHtml({ tag: 'script', attrs: {}, children: ['alert(1)'] }), /Tag not permitted/);
  assert.throws(() => toHtml({ tag: 'div', attrs: { onclick: 'alert(1)' }, children: [text] }), /not permitted/);
  assert.throws(() => toHtml({ tag: 'a', attrs: { href: 'javascript:alert(1)' }, children: [text] }), /in-page fragment/);
  assert.throws(() => toHtml(h('div', null, { tag: 'iframe', attrs: {}, children: [] })), /Tag not permitted/);
  assert.throws(() => splitRegions({ tag: 'div', attrs: {}, children: [{ tag: 'div', attrs: { 'data-region': 'a', style: 'x' }, children: [] }] }), /not permitted/);
  assert.equal(toHtml({ tag: 'p', attrs: { hidden: false, id: 'p' }, children: [text] }), '<p id="p">ok</p>');
});

test('boolean, absent and void handling matches HTML', () => {
  assert.equal(toHtml(h('input', { type: 'checkbox', checked: true, disabled: false, id: 'c' })), '<input type="checkbox" checked id="c">');
  assert.equal(toHtml(h('div', { hidden: true, title: null, lang: undefined })), '<div hidden></div>');
  assert.throws(() => h('input', { type: 'checkbox' }, 'child'), /cannot have children/);
});

test('conditional and nested children flatten in order', () => {
  const node = h('ul', null, [h('li', null, 'a'), null, false, [h('li', null, 'b'), undefined]], h('li', null, 'c'));
  assert.equal(toHtml(node), '<ul><li>a</li><li>b</li><li>c</li></ul>');
  assert.equal(textOf(node), 'abc');
});

test('regions split from the frame so a host can replace only what changed', () => {
  const page = (clock, note) => h('div', { class: 'ms-shell', 'data-motion': 'full' },
    h('header', null, h('p', null, 'Mothership')),
    h('main', null,
      h('div', { 'data-region': 'timer' }, clock),
      h('section', { 'data-region': 'notes' }, h('p', null, note)),
    ));
  const first = splitRegions(page('0:42', 'steady'));
  const second = splitRegions(page('0:41', 'steady'));
  assert.deepEqual(first.rootAttrs, { class: 'ms-shell', 'data-motion': 'full' });
  // A slot has its region's own tag, so it is valid markup wherever the region is.
  assert.equal(first.frameHtml, '<header><p>Mothership</p></header><main><div data-region-slot="timer"></div><section data-region-slot="notes"></section></main>');
  assert.equal(first.frameHtml, second.frameHtml, 'A tick must not rebuild the page frame');
  assert.deepEqual([...first.regions.keys()], ['timer', 'notes']);
  assert.notEqual(first.regions.get('timer'), second.regions.get('timer'));
  assert.equal(first.regions.get('notes'), second.regions.get('notes'));
  assert.equal(first.regions.get('timer'), '<div data-region="timer">0:42</div>');
});

test('a region inside a region is redrawn on its own, and the outer one is listed first', () => {
  const page = (status, step) => h('div', { class: 'ms-shell' },
    h('section', { 'data-region': 'outer', 'data-open': 'true' },
      h('p', null, 'kept'),
      h('ul', null, h('li', { 'data-region': 'inner', 'data-status': status }, h('p', null, step))),
    ));
  const first = splitRegions(page('a', 'one'));
  const second = splitRegions(page('b', 'two'));
  assert.deepEqual([...first.regions.keys()], ['outer', 'inner'], 'A host fills an outer region before the regions inside it');
  assert.equal(first.frameHtml, '<section data-region-slot="outer"></section>');
  assert.equal(first.regions.get('outer'), '<section data-region="outer" data-open="true"><p>kept</p><ul><li data-region-slot="inner"></li></ul></section>');
  assert.equal(first.regions.get('outer'), second.regions.get('outer'), 'A change inside the inner region must not redraw the outer one');
  assert.equal(second.regions.get('inner'), '<li data-region="inner" data-status="b"><p>two</p></li>');
});

test('ambiguous region layouts are rejected instead of rendered unpredictably', () => {
  assert.throws(() => splitRegions(h('div', null, h('div', { 'data-region': 'a' }), h('div', { 'data-region': 'a' }))), /unique/);
  assert.throws(() => splitRegions(h('div', null, h('div', { 'data-region': 'a' }, h('div', { 'data-region': 'a' })))), /unique/);
  assert.throws(() => splitRegions(h('div', { 'data-region': 'root' })), /root cannot itself be a region/);
  // A region id is found again in serialized markup, so it has to be a plain name.
  for (const id of ['A', 'two words', 'a"b', '', '1st', 'a<b']) assert.throws(() => splitRegions(h('div', null, h('div', { 'data-region': id }))), /plain names/, id);
});

// A page with a frame, two regions side by side, and one region nested two deep.
const page = ({ title = 'Mothership', clock = '0:42', open = true, status = 'a', step = 'one', control = 'off' } = {}) => h('div', { class: 'ms-shell' },
  h('header', null, h('p', null, title)),
  h('main', null,
    h('div', { 'data-region': 'timer' }, clock),
    h('section', { 'data-region': 'outer', 'data-open': String(open) },
      h('p', null, 'kept'),
      open ? h('div', { 'data-region': 'middle', 'data-status': status },
        h('p', null, step),
        h('div', { 'data-region': 'inner' }, h('button', { type: 'button', id: 'go', 'aria-disabled': control === 'off' ? 'true' : null }, 'Go')),
      ) : null,
    ),
  ));
const plan = (before, after) => planRedraw(before === null ? null : splitRegions(page(before)), splitRegions(page(after)));
const steps = (before, after) => plan(before, after).steps.map(step => `${step.into} ${step.id}`);

test('the first drawing fills every slot, outermost first', () => {
  const first = plan(null, {});
  assert.equal(first.frame, splitRegions(page()).frameHtml);
  assert.deepEqual(first.steps.map(step => `${step.into} ${step.id}`), ['slot timer', 'slot outer', 'slot middle', 'slot inner']);
  // Carried out in order, a slot always exists by the time its region is drawn: its parent comes first.
  let drawn = first.frame;
  for (const step of first.steps) {
    assert.equal(drawn.split(`data-region-slot="${step.id}"`).length - 1, 1, step.id);
    drawn = drawn.replace(new RegExp(`<[a-z0-9]+ data-region-slot="${step.id}"></[a-z0-9]+>`), step.html);
  }
  assert.equal(drawn.includes('data-region-slot'), false, 'Nothing is left unfilled');
  assert.equal(`<div class="ms-shell">${drawn}</div>`, toHtml(page()));
});

test('a redraw touches only what changed, and whatever sits inside it', () => {
  assert.deepEqual(steps({}, {}), [], 'Nothing changed, nothing is redrawn');
  assert.equal(plan({}, {}).frame, null);
  // A tick.
  assert.deepEqual(steps({}, { clock: '0:41' }), ['region timer']);
  // The innermost region alone: the regions around it, and what else they hold, are left as they are.
  assert.deepEqual(steps({}, { control: 'on' }), ['region inner']);
  // A change to a region's own markup redraws it and refills the region inside it, changed or not.
  assert.deepEqual(steps({}, { step: 'two' }), ['region middle', 'slot inner']);
  assert.deepEqual(steps({}, { status: 'b', control: 'on' }), ['region middle', 'slot inner']);
  // Regions that disappear need no step; ones that appear arrive with the region that now holds them.
  assert.deepEqual(steps({}, { open: false }), ['region outer']);
  assert.deepEqual(steps({ open: false }, {}), ['region outer', 'slot middle', 'slot inner']);
  // Independent changes are each made in place.
  assert.deepEqual(steps({}, { clock: '0:41', control: 'on' }), ['region timer', 'region inner']);
  // The frame itself: everything is drawn again.
  const rebuilt = plan({}, { title: 'Other' });
  assert.notEqual(rebuilt.frame, null);
  assert.deepEqual(rebuilt.steps.map(step => `${step.into} ${step.id}`), ['slot timer', 'slot outer', 'slot middle', 'slot inner']);
});

test('text that merely looks like a slot cannot mislead a redraw', () => {
  const tricky = text => h('div', { class: 'ms-shell' }, h('div', { 'data-region': 'a', 'aria-label': text }, text), h('div', { 'data-region': 'b' }, 'b'));
  for (const text of ['<div data-region-slot="b"></div>', 'data-region-slot="b"', '"><div data-region-slot="b"></div>']) {
    const planned = planRedraw(splitRegions(tricky('plain')), splitRegions(tricky(text)));
    assert.deepEqual(planned.steps.map(step => `${step.into} ${step.id}`), ['region a'], text);
  }
});
