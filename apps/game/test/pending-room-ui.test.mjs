import assert from 'node:assert/strict';
import test from 'node:test';
import { publicSlots } from '../hosted/phone-ui.js';

test('public lobby slots show pending rooms without guessing and preserve older assigned rooms', () => {
  const el = (tag, text, attrs = {}) => ({ tag, text: text ?? '', attrs, children: [], append(...children) { this.children.push(...children); } });
  const words = node => [node.text, ...node.children.map(words)].filter(Boolean).join(' ');
  const rows = publicSlots(el, 4, [
    { seatId: 'seat-1', initialRoom: null },
    { seatId: 'seat-2', initialRoom: 'Room A' },
    { seatId: 'seat-3', initialRoom: 'Room B' },
  ]);
  assert.match(words(rows[0]), /Room assignment pending/);
  assert.doesNotMatch(words(rows[0]), /Room A|Room B|null|undefined/);
  assert.match(words(rows[1]), /Starts in Room A/);
  assert.match(words(rows[2]), /Starts in Room B/);
  assert.match(words(rows[3]), /Open seat/);
});
