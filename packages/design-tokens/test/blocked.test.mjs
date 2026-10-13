// mothership:dev-only
//
// ATTACK BLOCKED (design/board-v2/films/blocked.mjs, fx/blocked.mjs, js/blocked-view.mjs;
// docs/design/attack-blocked.md): the film's beats, its single treatment for every defense, its
// reduced variant, its place in the Blackout, its art and where its label goes. These test the
// proposal's own modules: none of them is a rule, a server contract or a measurement of a phone,
// and none says anything about who can block what.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BLACKOUT, blackoutFrame } from '../../../design/board-v2/films/blackout.mjs';
import { BLOCKED, STAR_SIZE, blockedContract, blockedEnd, blockedFrame, blockedStartInBlackout } from '../../../design/board-v2/films/blocked.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, PARTICLE_FRAMES, SHIELD, SHIELD_BOX, SHIELD_FLASH_RADIUS, SHIELD_SIZE, blockParticlesSvg, blockRingSvg, cie76, shieldColorDistances, shieldSvg } from '../../../design/board-v2/fx/blocked.mjs';
import { LABEL_MARGIN, labelBox } from '../../../design/board-v2/js/blocked-view.mjs';
import { BLACKOUT_OUTCOMES } from '../../../design/board-v2/js/fixtures.mjs';
import { fitBoardV2, slotRects } from '../../../design/board-v2/js/fit.mjs';
import { BOARD_ROOMS, ROSTERS } from '../../../design/board-v2/scenes/slots.mjs';

const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];
const drawsAnything = frame => frame.star.on || frame.shield.frame > 0 || frame.ring.opacity > 0 || frame.particles.frame > 0 || frame.label.opacity > 0 || frame.brace[0] !== 0 || frame.brace[1] !== 0;

test('one film for every defense: nothing about the defense, the attacker, a grantor or a count is an input', () => {
  for (const reduced of [false, true]) {
    for (let t = -100; t <= 2600; t += 10) {
      const frame = blockedFrame(t, { reduced });
      assert.deepEqual(blockedFrame(t, { reduced, cause: 'clone' }), frame, `${t}`);
      assert.deepEqual(blockedFrame(t, { reduced, cause: 'protection' }), frame, `${t}`);
      assert.deepEqual(blockedFrame(t, { reduced, attacker: 4, grantor: 6, count: 2, direction: 'left' }), frame, `${t}`);
    }
  }
  const contract = blockedContract();
  assert.equal(contract.inputs.length, 3);
  assert.ok(contract.notInputs.some(input => input.includes('defense')));
  assert.ok(contract.audience.film.startsWith('room-visible'));
  for (const word of ['Alien', 'Undercover', 'Clone', 'Protection']) assert.ok(!JSON.stringify(contract).includes(word), word);
});

test('the storyboard\'s beats: a star, the shield blooming, the ring absorbing, the label held 1 600 ms', () => {
  const at = t => blockedFrame(t);
  // Incoming: a star at the chest, nothing yet says blocked.
  assert.equal(at(60).star.on, true);
  assert.equal(at(60).shield.frame, 0);
  assert.equal(at(60).label.opacity, 0);
  // The shield flashes on (frame 1) and holds as a bubble (frame 2), from 0.8 to 1.05 of its size.
  assert.equal(at(160).shield.frame, 1);
  assert.equal(at(280).shield.frame, 2);
  assert.equal(at(120).shield.scale, BLOCKED.shieldScale[0]);
  assert.ok(Math.abs(at(359).shield.scale - BLOCKED.shieldScale[1]) < 0.001);
  // Absorbed: the ring grows and fades, eight particles scatter, the shield is spent.
  const absorb = at(480);
  assert.equal(absorb.shield.frame, 3);
  assert.ok(absorb.ring.opacity > 0 && absorb.ring.scale > BLOCKED.ringScale[0]);
  assert.ok(absorb.particles.frame >= 1);
  // The brace: back fast, 2 px at most, home by 900.
  for (let t = 0; t <= 1000; t += 5) assert.ok(Math.hypot(...at(t).brace) <= Math.hypot(...BLOCKED.brace.offset) + 1e-9, `${t}`);
  assert.deepEqual(at(900).brace, [0, 0]);
  // ATTACK BLOCKED from 620: held 1 600 ms, faded over 200; the film over at 2 420.
  assert.equal(at(619).label.opacity, 0);
  assert.equal(at(1000).label.opacity, 1);
  assert.equal(at(2219).label.opacity, 1);
  assert.ok(at(2320).label.opacity > 0 && at(2320).label.opacity < 1);
  assert.equal(blockedEnd(), 2420);
  assert.equal(at(2420).done, true);
});

test('reduced motion: a still ring and the label, in over 80 ms, held 1 600, out over 80', () => {
  assert.equal(blockedEnd(true), 1760);
  for (let t = 0; t < 1760; t += 5) {
    const frame = blockedFrame(t, { reduced: true });
    assert.equal(frame.star.on, false, `${t}`);
    assert.equal(frame.shield.frame, 0, `${t}`);
    assert.equal(frame.particles.frame, 0, `${t}`);
    assert.deepEqual(frame.brace, [0, 0], `${t}`);
    assert.equal(frame.ring.scale, 1, `${t}`);
    assert.equal(frame.ring.opacity, frame.label.opacity, `${t}`);
  }
  assert.equal(blockedFrame(80, { reduced: true }).label.opacity, 1);
  assert.equal(blockedFrame(1680, { reduced: true }).label.opacity, 1);
  assert.equal(blockedFrame(1760, { reduced: true }).done, true);
});

test('nothing before the start or after the end, and the words only while the label is up', () => {
  for (const reduced of [false, true]) {
    for (let t = -300; t <= 3000; t += 5) {
      const frame = blockedFrame(t, { reduced });
      if (t < 0 || t >= blockedEnd(reduced)) assert.equal(drawsAnything(frame), false, `${reduced} ${t}`);
      assert.equal(frame.announce, frame.label.opacity > 0, `${reduced} ${t}`);
    }
  }
});

test('in the Blackout a block is a miss in public, and its film waits until the lights are fully back', () => {
  assert.deepEqual(BLACKOUT_OUTCOMES.blocked.hits, []);
  assert.deepEqual(BLACKOUT_OUTCOMES.blocked.after, {});
  for (let t = 0; t <= 19000; t += 25) {
    assert.deepEqual(blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.blocked.hits, windowId: 'w-test' }), blackoutFrame(t, { outcomeAt: 15400, hits: BLACKOUT_OUTCOMES.miss.hits, windowId: 'w-test' }));
  }
  assert.equal(blockedStartInBlackout(15400), 15400 + BLACKOUT.lightsReturn[1]);
  assert.equal(blockedStartInBlackout(15400, { reduced: true }), 15400 + BLACKOUT.reduced.fadeMs);
  // The lights are fully back when it starts.
  assert.equal(blackoutFrame(blockedStartInBlackout(15400), { outcomeAt: 15400, windowId: 'w-test' }).darkness, 0);
  assert.equal(blackoutFrame(blockedStartInBlackout(15400, { reduced: true }), { outcomeAt: 15400, windowId: 'w-test', reduced: true }).darkness, 0);
  // An outcome after the cap: the lights are already back, so it starts with the outcome. No outcome, no film.
  assert.equal(blockedStartInBlackout(20000), 20000);
  assert.equal(blockedStartInBlackout(null), null);
});

test('the art: symmetric, no text, apart from every faction accent, its flash a small core', () => {
  const tokens = JSON.parse(readFileSync(new URL('../src/tokens-0.4.0.json', import.meta.url), 'utf8'));
  assert.deepEqual(FACTION_ACCENTS, tokens.color.factionPrivateOrRevealed);
  for (const [name, { distance }] of Object.entries(shieldColorDistances())) assert.ok(distance >= MIN_ACCENT_DISTANCE, `${name}: ${distance}`);
  assert.equal(cie76('#FFFFFF', '#FFFFFF'), 0);
  for (const svg of [shieldSvg(1), shieldSvg(2), shieldSvg(3), blockRingSvg(), ...PARTICLE_FRAMES.map((_, i) => blockParticlesSvg(i + 1))]) {
    assert.ok(svg.includes(`viewBox="0 0 ${SHIELD_BOX} ${SHIELD_BOX}"`));
    assert.doesNotMatch(svg, /<text\b|<image\b|<script\b|href=/);
  }
  assert.equal((blockParticlesSvg(2).match(/<polygon/g) ?? []).length, 8);
  assert.throws(() => shieldSvg(4));
  assert.throws(() => blockParticlesSvg(0));
  // The flash frame's core, with every slot of a room blocked at once, is a quarter of the panel at most.
  const flashScale = Math.max(...Array.from({ length: 80 }, (_, i) => blockedFrame(120 + i).shield.scale));
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      for (const room of BOARD_ROOMS) {
        const panel = board.panels[room];
        const cores = slotRects(room, roster, panel).reduce((sum, rect) => sum + Math.PI * ((SHIELD_FLASH_RADIUS / SHIELD_BOX) * SHIELD_SIZE * rect.side * flashScale) ** 2, 0);
        assert.ok(cores / (panel.width * panel.height) <= BLACKOUT.flashLimit.panelShare, `${width}x${height} ${roster} ${room}`);
      }
    }
  }
  assert.equal(STAR_SIZE, 1.6);
  assert.ok(SHIELD.core && SHIELD.deep);
});

test('the label: above its target, else below its name tag, inside the panel and never over the caption', () => {
  const panel = { width: 180, height: 200 };
  const caption = { left: 3, top: 3, width: 90, height: 30 };
  const at = (top, x = 120) => ({ left: x - 25, top, side: 50, press: [x, top + 20] });
  // Room above: above it.
  assert.equal(labelBox({ rect: at(100), panel, size: [140, 22], caption }).place, 'above');
  // Above would meet the caption: below the name tag (the tag's foot is the press area's, kept in the panel).
  const below = labelBox({ rect: at(30, 60), panel, size: [140, 22], caption });
  assert.equal(below.place, 'below');
  assert.equal(below.top, 30 + 50 - 14 + 16 + LABEL_MARGIN);
  // Centred on the press point, clamped inside the panel.
  assert.equal(labelBox({ rect: at(100, 170), panel, size: [140, 22], caption: null }).left, panel.width - 140 - LABEL_MARGIN);
  // Every slot of every room at every phone, with a one-line label where it fits and a stacked one where not.
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const board = fitBoardV2({ width, height }, roster);
      for (const room of BOARD_ROOMS) {
        const p = board.panels[room];
        const size = p.width - 2 * LABEL_MARGIN >= 150 ? [150, 24] : [84, 40];
        const cap = { left: 3, top: 3, width: Math.min(p.width - 6, room === 'command-room' ? 160 : 100), height: room === 'hospital' || room === 'jail' ? 26 : 42 };
        for (const rect of slotRects(room, roster, p)) {
          const box = labelBox({ rect, panel: p, size, caption: cap });
          const where = `${width}x${height} ${roster} ${rect.id} (${box.place})`;
          assert.ok(box.left >= LABEL_MARGIN - 1e-9 && box.left + size[0] <= p.width - LABEL_MARGIN + 1e-9, `${where}: across`);
          assert.ok(box.top >= LABEL_MARGIN - 1e-9 && box.top + size[1] <= p.height - LABEL_MARGIN + 1e-9, `${where}: down`);
          const over = box.left < cap.left + cap.width && cap.left < box.left + size[0] && box.top < cap.top + cap.height && cap.top < box.top + size[1];
          assert.equal(over, false, `${where}: over the caption`);
        }
      }
    }
  }
});
