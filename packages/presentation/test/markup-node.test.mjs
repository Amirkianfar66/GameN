import assert from 'node:assert/strict';
import test from 'node:test';
import { h, splitRegions, textOf, toHtml } from '@mothership/presentation';

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
  for (const name of ['onclick', 'onload', 'style', 'src', 'srcdoc', 'action', 'formaction']) {
    assert.throws(() => h('div', { [name]: 'x' }), /not permitted/, name);
  }
  for (const href of ['https://example.test/', 'javascript:alert(1)', '//example.test', '/path', '#', '#9bad', '# spaced']) {
    assert.throws(() => h('a', { href }, 'link'), /in-page fragment/, href);
  }
  assert.throws(() => h('div', { 'Bad Name': 'x' }), /Invalid attribute name/);
  assert.equal(toHtml(h('a', { href: '#ms-main' }, 'Skip')), '<a href="#ms-main">Skip</a>');
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
  assert.equal(first.frameHtml, '<header><p>Mothership</p></header><main><div data-region-slot="timer"></div><div data-region-slot="notes"></div></main>');
  assert.equal(first.frameHtml, second.frameHtml, 'A tick must not rebuild the page frame');
  assert.deepEqual([...first.regions.keys()], ['timer', 'notes']);
  assert.notEqual(first.regions.get('timer'), second.regions.get('timer'));
  assert.equal(first.regions.get('notes'), second.regions.get('notes'));
  assert.equal(first.regions.get('timer'), '<div data-region="timer">0:42</div>');
});

test('ambiguous region layouts are rejected instead of rendered unpredictably', () => {
  assert.throws(() => splitRegions(h('div', null, h('div', { 'data-region': 'a' }, h('div', { 'data-region': 'b' })))), /cannot be nested/);
  assert.throws(() => splitRegions(h('div', null, h('div', { 'data-region': 'a' }), h('div', { 'data-region': 'a' }))), /unique/);
  assert.throws(() => splitRegions(h('div', { 'data-region': 'root' })), /root cannot itself be a region/);
});
