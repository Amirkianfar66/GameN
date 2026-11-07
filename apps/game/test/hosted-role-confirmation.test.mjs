import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoleConfirmation } from '../hosted/role-confirmation.js';

class Node {
  constructor(tag, text, attrs = {}) { this.tag = tag; this.textContent = text ?? ''; this.attrs = { ...attrs }; this.children = []; this.handlers = {}; this.hidden = false; this.disabled = false; this.innerHTML = ''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; this.innerHTML = ''; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) { this.handlers[name] = callback; }
  async press() { if (!this.disabled && !this.hidden) await this.handlers.click?.(); }
}
const role = (extra = {}) => ({ key: 'deal-a/seat-1/binding-1', role: 'Hacker', characterId: 'c9', ready: false, canConfirm: true, retry: false, ...extra });
function setup(confirm = async () => {}) {
  const nodes = new Map(), calls = [];
  const controls = createRoleConfirmation({ el: (tag, text, attrs) => { const node = new Node(tag, text, attrs); if (attrs?.id) nodes.set(attrs.id, node); return node; },
    onReady: async key => { calls.push(key); await confirm(key); } });
  return { controls, calls, node: id => nodes.get(`setup-role-${id}`) };
}

test('Ready requires an explicit own-role reveal and concealed markup carries no role or art hooks', async () => {
  const s = setup(); s.controls.update(role());
  assert.equal(s.node('card').innerHTML, ''); assert.equal(s.node('card').hidden, true);
  assert.equal(s.node('ready').disabled, true);
  await s.node('ready').press(); assert.equal(s.calls.length, 0);
  await s.node('toggle').press();
  assert.match(s.node('card').innerHTML, /Hacker/); assert.match(s.node('card').innerHTML, /data-device="hacker"/);
  assert.match(s.node('card').innerHTML, /data-character="c9"/); assert.equal(s.node('ready').disabled, false);
  await s.node('toggle').press(); assert.equal(s.node('card').innerHTML, ''); assert.equal(s.node('card').hidden, true);
  await s.node('ready').press(); assert.deepEqual(s.calls, ['deal-a/seat-1/binding-1']);
  assert.equal(s.node('card').innerHTML, ''); s.controls.dispose();
});

test('lost authorization or a new deal/binding erases disclosure and requires a fresh reveal', async () => {
  const s = setup(); s.controls.update(role()); await s.node('toggle').press();
  s.controls.update(null);
  assert.equal(s.node('card').innerHTML, ''); assert.equal(s.node('toggle').disabled, true); assert.equal(s.node('ready').hidden, true);
  s.controls.update(role()); assert.equal(s.node('ready').disabled, true); assert.equal(s.node('card').innerHTML, '');
  await s.node('toggle').press();
  s.controls.update(role({ key: 'deal-a/seat-1/binding-2' }));
  assert.equal(s.node('card').innerHTML, ''); assert.equal(s.node('ready').disabled, true);
  await s.node('toggle').press(); s.controls.conceal(); assert.equal(s.node('card').innerHTML, '');
  s.controls.update(role({ key: 'deal-a/seat-1/binding-2', ready: true }));
  assert.equal(s.node('ready').hidden, true); assert.equal(s.node('toggle').hidden, true);
  assert.match(s.node('status').textContent, /You are ready/);
  s.controls.dispose(); assert.equal(s.controls.node.children.length, 0);
});

test('a pending Ready cannot be double sent and private content stays absent through retry', async () => {
  let complete;
  const s = setup(() => new Promise(resolve => { complete = resolve; }));
  s.controls.update(role()); await s.node('toggle').press();
  const pending = s.node('ready').press();
  assert.equal(s.node('ready').disabled, true); assert.equal(s.node('card').innerHTML, '');
  await s.node('ready').press(); assert.equal(s.calls.length, 1);
  s.controls.update(role({ retry: true })); complete(); await pending;
  assert.match(s.node('ready').textContent, /Retry Ready/); assert.equal(s.node('card').innerHTML, '');
  s.controls.update(role({ canConfirm: false })); assert.equal(s.node('ready').disabled, true);
  s.controls.dispose();
});


test('the reveal contains the role card without a separate instruction or rules paragraph', async () => {
  const s = setup(); s.controls.update(role()); await s.node('toggle').press();
  assert.match(s.node('card').innerHTML, /Hacker/);
  assert.equal(s.node('card').children.length, 0);
  assert.equal(s.node('ready').hidden, false);
  await s.node('toggle').press(); assert.equal(s.node('card').innerHTML, '');
  s.controls.dispose();
});
