import assert from 'node:assert/strict';
import test from 'node:test';
import { createPracticeControls } from '../hosted/practice-controls.js';

// Inert DOM nodes retain the select behavior and actual event handlers used by the host.
class Node {
  constructor(tag, text, attrs = {}) { this.tag = tag; this.textContent = text ?? ''; this.attrs = attrs; this.children = []; this.handlers = {}; this.disabled = false; this.hidden = false; this.selection = ''; }
  append(...nodes) { this.children.push(...nodes); if (this.tag === 'select' && !this.options.some(x => x.attrs.value === this.selection)) this.selection = this.options[0]?.attrs.value ?? ''; }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  get options() { return this.children.filter(x => x.tag === 'option'); }
  get value() { return this.tag === 'select' ? this.selection : this.attrs.value ?? ''; }
  set value(value) { if (this.tag === 'select') this.selection = this.options.some(x => x.attrs.value === value) ? value : ''; else this.attrs.value = value; }
  async press() { if (!this.disabled) await this.handlers.click?.(); }
  async choose(value) { this.value = value; await this.handlers.change?.(); }
}
function setup() {
  const nodes = new Map(), listeners = new Set(), calls = [];
  let document = null, status = 'unavailable', kept = null, outcome = 'done';
  const lifecycle = { unsettled: () => kept, abandon: () => { kept = null; return true; } };
  const feed = { practice: () => document, practiceStatus: () => status, identities: () => null,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  const controls = createPracticeControls({ matchId: 'practice-match', lifecycle, feed,
    el: (tag, text, attrs) => { const node = new Node(tag, text, attrs); if (attrs?.id) nodes.set(attrs.id, node); return node; },
    api: { setPracticeBots: async body => { calls.push(structuredClone(body)); return {}; } },
    operate: async (key, build, call) => {
      const body = kept?.request ?? build(`request-${calls.length + 1}`);
      await call(body);
      if (outcome === 'unsettled') { kept = { request: body }; return { kind: 'unsettled' }; }
      kept = null;
      if (outcome === 'refused') return { kind: 'refused', code: 'CAPACITY_EXCEEDED' };
      return { kind: 'done', result: { revision: 4, botSeatIds: Array.from({ length: body.botCount }, (_, i) => `seat-${i + 2}`) } };
    } });
  const publish = (bots, revision = 1) => { status = 'current'; document = { botSeatIds: bots, revision }; for (const listener of listeners) listener(); };
  return { controls, calls, node: id => nodes.get(`connected-${id}`),
    lobby: (playerCount = 7, humanSeats = [], bots = [], state = 'lobby') => controls.update({ playerCount, status: state, seats: [...humanSeats, ...bots].map(seatId => ({ seatId, initialRoom: 'Room A' })) }),
    publish, absent() { status = 'absent'; document = null; for (const listener of listeners) listener(); },
    unavailable() { status = 'unavailable'; document = null; for (const listener of listeners) listener(); },
    outcome(value) { outcome = value; }, listeners,
  };
}

test('solo defaults leave a human seat in each supported mode and confirmed legacy absence is usable', () => {
  for (const mode of [7, 8, 9]) {
    const s = setup(); s.lobby(mode);
    assert.equal(s.node('bots-save').disabled, true);
    s.absent();
    assert.equal(s.node('bot-count').value, String(mode - 1));
    assert.equal(s.node('bots-save').textContent, 'Add bots');
    assert.equal(s.node('bots-save').disabled, false);
    assert.equal(s.controls.readyToStart(), true);
    s.controls.dispose();
  }
});
test('available capacity excludes humans and offers zero to remove only bots before start', async () => {
  const s = setup(); s.lobby(7, ['seat-1', 'seat-7'], ['seat-2', 'seat-3']); s.publish(['seat-2', 'seat-3']);
  assert.deepEqual(s.node('bot-count').options.map(x => x.value), ['0','1','2','3','4','5']);
  assert.equal(s.controls.canRecover('seat-2'), false);
  assert.equal(s.controls.canRecover('seat-1'), true);
  await s.node('bot-count').choose('0');
  assert.equal(s.node('bots-save').textContent, 'Remove bots');
  await s.node('bots-save').press();
  assert.equal(s.calls[0].botCount, 0);
  assert.equal(s.controls.readyToStart(), false, 'success waits for the actual roster');
  s.publish([], 4); assert.equal(s.controls.readyToStart(), true);
  s.lobby(7, ['seat-1', 'seat-7'], [], 'running');
  assert.equal(s.node('bots-save').disabled, true);
  s.controls.dispose();
});
test('lost bot setup answer keeps its exact count and ID across later human admission and retries', async () => {
  const s = setup(); s.lobby(); s.absent(); s.outcome('unsettled');
  await s.node('bots-save').press();
  assert.equal(s.calls[0].botCount, 6);
  s.lobby(7, ['seat-1','seat-2']);
  assert.equal(s.node('bot-count').disabled, true);
  assert.equal(s.node('bot-count').value, '6');
  assert.equal(s.controls.readyToStart(), false);
  await s.node('bots-save').press();
  assert.deepEqual(s.calls[0], s.calls[1]);
  await s.node('bots-abandon').press();
  assert.equal(s.node('bot-count').value, '5');
  assert.match(s.node('bots-summary').textContent, /earlier request may still arrive/);
  s.controls.dispose();
});
test('unknown practice metadata disables changes and human recovery, and disposal removes the listener', () => {
  const s = setup(); s.lobby(7, ['seat-1'], ['seat-2']); s.publish(['seat-2']);
  s.unavailable();
  assert.equal(s.node('bots-save').disabled, true);
  assert.equal(s.controls.readyToStart(), false);
  assert.equal(s.controls.canRecover('seat-1'), false);
  s.controls.dispose(); assert.equal(s.listeners.size, 0);
});

test('a pending bot update cannot offer new bot seats for recovery before metadata catches up', async () => {
  const s = setup(); s.lobby(7, ['seat-7']); s.publish([], 1);
  await s.node('bots-save').press();
  const bots = Array.from({ length: 6 }, (_, index) => `seat-${index + 1}`);
  // Independent Firestore documents may be delivered in either order.
  s.lobby(7, ['seat-7'], bots);
  assert.equal(s.controls.canRecover('seat-1'), false, 'lobby-first delivery must not turn a new bot into a recovery choice');
  assert.equal(s.controls.canRecover('seat-7'), false, 'recovery choices wait for this roster update');
  s.publish(bots, 4);
  assert.equal(s.controls.canRecover('seat-1'), false);
  assert.equal(s.controls.canRecover('seat-7'), true);
  s.controls.dispose();
});
