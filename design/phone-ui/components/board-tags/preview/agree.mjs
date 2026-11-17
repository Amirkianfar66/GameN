// mothership:dev-only
//
// The board tags beside the pack: the pinned prototype's own board (design/phone-ui/prototype/screens-game.mjs
// board(), with screens.mjs paintBoard, art.mjs paintRoom and paintCapsule, kit.css and screens.css; the frozen Food
// release pins ui.mjs, kit.css and art.mjs, so they stay as they are) with its own tags, and the same board with the
// runtime component (../board-tags.mjs) in each panel instead, drawn in the same page from the same synthetic
// fixtures at the Standard text, compared tag by tag: where each sits in its panel, to within half a pixel; its
// words; its look; its number's disc; its office badge. It is how the component shows it draws sheet 26's tag and
// not a second design of it. Sheet 26 is drawn at 390 × 844; the board at 320 × 568 (the narrowest panels) and
// 430 × 932 is the pack's own drawing at those sizes, and the talk is the capsule with two seated.

import { TAG_RULES } from '../board-tags.mjs';
import { drawBoard, mountLayers, phone } from './preview.mjs';
import { BOARD_STATES, PACK_FRAMES } from './states.mjs';

const TOLERANCE = 0.5;
const GAP = TAG_RULES.gap;
const separation = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
const LOOK = ['background-color', 'box-shadow', 'color', 'font-size', 'font-weight', 'line-height', 'border-radius', 'height'];
const lookOf = node => (node ? Object.fromEntries(LOOK.map(p => [p, getComputedStyle(node).getPropertyValue(p)])) : null);
const words = node => (node ? node.innerText.replace(/\s+/g, ' ').trim() : null);
function boxIn(origin, node) {
  if (!node || !origin) return null;
  const o = origin.getBoundingClientRect(), r = node.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
}
const near = (a, b) => (a === null || b === null ? a === b : ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE));

export async function runBoardTagsAgreement() {
  const checks = [];
  for (const c of PACK_FRAMES) {
    const id = `agree: ${c.state} (${BOARD_STATES[c.state].frame ?? 'board'} at ${c.size})`;
    try {
      document.documentElement.style.fontSize = '';
      const pack = phone(c.size);
      Object.assign(pack.style, { position: 'absolute', left: '0', top: '0' });
      drawBoard(pack, c.state);
      const ours = phone(c.size);
      Object.assign(ours.style, { position: 'absolute', left: `${pack.offsetWidth + 20}px`, top: '0' });
      drawBoard(ours, c.state);
      await document.fonts.ready;
      const layers = mountLayers(ours, c.state);
      await frames();
      const differences = [], movedApart = [];
      let compared = 0;
      const panels = [...pack.querySelectorAll('.board-panel')];
      for (const packPanel of panels) {
        const label = packPanel.getAttribute('aria-label');
        const ourPanel = [...ours.querySelectorAll('.board-panel')].find(p => p.getAttribute('aria-label') === label);
        const packTags = [...packPanel.querySelectorAll('.tag')];
        const ourTags = [...ourPanel.querySelectorAll('.ms-bt-tag')];
        if (packTags.length !== ourTags.length) differences.push({ panel: label, part: 'count', pack: packTags.length, ours: ourTags.length });
        // Item 34: where the pack's own tags meet (within 2 px), rule 4 moves them apart, up or down only.
        const closest = (boxes, i) => Math.min(Infinity, ...boxes.filter((_, j) => j !== i).map(b => separation(boxes[i], b)));
        const packBoxes = packTags.map(t => boxIn(packPanel, t)), ourBoxes = ourTags.map(t => boxIn(ourPanel, t));
        const packMeets = packBoxes.some((_, i) => closest(packBoxes, i) < GAP - TOLERANCE);
        const ourApart = ourBoxes.every((_, i) => closest(ourBoxes, i) >= GAP - TOLERANCE);
        for (const t of packTags) {
          const seat = t.querySelector('.num')?.textContent.trim();
          const mine = ourPanel.querySelector(`.ms-bt-tag[data-seat="${seat}"]`);
          compared += 1;
          const parts = {
            box: [boxIn(packPanel, t), boxIn(ourPanel, mine)],
            words: [words(t), words(mine)],
            look: [lookOf(t), lookOf(mine)],
            number: [boxIn(t, t.querySelector('.num')), boxIn(mine, mine?.querySelector('.ms-bt-num'))],
            numberLook: [lookOf(t.querySelector('.num')), lookOf(mine?.querySelector('.ms-bt-num'))],
            office: [boxIn(t, t.querySelector('.office')), boxIn(mine, mine?.querySelector('.ms-bt-office'))],
            name: [boxIn(t, t.querySelector('span:not(.status):not(.office)')), boxIn(mine, mine?.querySelector('.ms-bt-name'))],
            status: [boxIn(t, t.querySelector('.status')), boxIn(mine, mine?.querySelector('.ms-bt-status'))],
            statusLook: [lookOf(t.querySelector('.status')), lookOf(mine?.querySelector('.ms-bt-status'))],
          };
          for (const [part, [a, b]] of Object.entries(parts)) {
            const same = ['box', 'number', 'office', 'name', 'status'].includes(part) ? near(a, b) : JSON.stringify(a) === JSON.stringify(b);
            const vertical = part === 'box' && a && b && ['x', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= TOLERANCE);
            if (!same && vertical && packMeets && ourApart) movedApart.push({ panel: label, seat, packY: a.y, ourY: b.y, packClosest: closest(packBoxes, packTags.indexOf(t)) });
            else if (!same) differences.push({ panel: label, seat, part, pack: a, ours: b });
          }
        }
      }
      for (const l of layers) l.layer.dispose();
      pack.remove();
      ours.remove();
      checks.push({ id, ok: compared > 0 && differences.length === 0, detail: { compared, agreed: compared - movedApart.length, movedApart, differences: differences.slice(0, 12) } });
    } catch (error) {
      checks.push({ id, ok: false, detail: { error: String(error?.stack ?? error) } });
    }
  }
  return { mode: 'agree', ok: checks.length > 0 && checks.every(c => c.ok), checks };
}
