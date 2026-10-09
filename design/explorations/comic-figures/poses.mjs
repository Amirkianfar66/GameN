// mothership:dev-only
//
// The pilot's poses. Each is a skeleton and a drawing order; every character is drawn in it
// by the same rules, so a pose never says anything about who the character is. Which pose a
// character takes comes only from public facts: the room and the station it stands at, and
// whether the view says it is Injured or Jailed.

import { INK, PAPER, blob, chain, curve, mix } from './rig.mjs';
import { BELT, BOOTS, SUIT, head } from './crew.mjs';

const suitLight = mix(SUIT, PAPER, 0.45);
const mirror = (points, x, dir) => points.map(([dx, dy]) => [x + dx * dir, dy]);

export function hand(cv, c, [x, y], angle = 0, size = 1.15) {
  cv.group(`translate(${x} ${y}) rotate(${angle}) scale(${size})`, () => {
    cv.form(blob([[-4.3, -3.1], [3.8, -3.8], [6.4, 0], [4.3, 4.3], [-3.1, 4.1], [-5, 0.5]]), c.skin, { stroke: 1.9, shadow: blob([[0.6, 1], [6.2, 0.4], [4.2, 4.2], [-1.2, 4]]), dots: false });
    cv.line('M-1.6 -3.2 Q-4 -0.2 -1.8 2.4', { width: 1.1 });
  });
}

export function boot(cv, [x, y], dir = -1) {
  const shape = mirror([[-6, -6], [-6, 3], [-12, 6.5], [-16, 11], [-14, 14.5], [5, 14.5], [7, 10], [6.4, -6]], x, -dir).map(([px, dy]) => [px, y + dy]);
  cv.form(blob(shape, 0.5), BOOTS, { stroke: 2.3, shadow: blob(mirror([[1, -6], [6.4, -6], [7, 10], [5, 14.5], [0, 14.5]], x, -dir).map(([px, dy]) => [px, y + dy]), 0.5), dots: true, depth: 0.3 });
  cv.line(`M${x + 15 * dir} ${y + 11.6} L${x - 6.6 * dir} ${y + 11.6}`, { width: 1.6 });
  cv.line(`M${x - 5.6} ${y - 1} L${x + 5.6} ${y - 1}`, { width: 1.2, color: mix(BOOTS, PAPER, 0.4) });
}

export function patch(cv, c, [x, y], angle) {
  cv.group(`translate(${x} ${y}) rotate(${angle})`, () => {
    cv.form('M-5.4 -2.8 H5.4 V2.8 H-5.4 Z', c.accent, { stroke: 1.6 });
    cv.line('M-5.4 0.2 H5.4', { width: 1.1, color: c.patch });
  });
}

/** The legs and boots of a standing figure, weight on the far leg, with its shadow on the floor. */
function standingLegs(cv) {
  const farLeg = [[53, 126], [49, 175], [46, 213]], nearLeg = [[71, 126], [76, 175], [79, 214]];
  const legR = [11.8, 8.6, 6.4];
  cv.limb(farLeg, legR, SUIT);
  cv.limb(nearLeg, legR, SUIT);
  cv.line(curve([[43, 170], [49, 175.5], [56, 172]]), { width: 1.2 });
  cv.line(curve([[69, 171], [76, 176.5], [83, 173]]), { width: 1.2 });
  boot(cv, [46, 214], -1);
  boot(cv, [79, 215], 1);
}

/** The neck, then the torso over the tops of the legs: the crew suit, its zip, belt and patches. */
function standingTorso(cv, c) {
  cv.form(chain([[59.5, 50], [61, 66]], [6.8, 7.6]), c.skin, { stroke: 2.3, shadow: chain([[64, 50], [65.6, 66]], [4, 4.6]), dots: true });
  const torso = blob([[37.5, 70], [50, 62], [72, 62], [88, 69], [86.5, 88], [81, 110], [83, 128], [62, 133], [42, 128], [44, 110], [37, 89]], 0.85);
  cv.form(torso, SUIT, { stroke: 2.8, shadow: blob([[72, 62.5], [88, 69], [86.5, 88], [81, 110], [83, 128], [72, 131], [75, 108], [77, 84]], 0.85), hatch: [70, 62, 90, 132] });
  cv.line('M61 63.5 L61.6 122', { width: 1.6 });
  cv.line('M51 62.8 L61 74 L71 62.8', { width: 2 });
  cv.line('M46 85 Q52.6 89.6 50.4 100 M74 83 Q69 91.6 73 101', { width: 1.2 });
  cv.line(curve([[41, 75], [40, 86], [42.6, 97]]), { width: 1.2, color: suitLight });
  cv.form('M43.6 118 Q62 123.2 81.4 118 L82 127 Q62 132.6 43.2 127 Z', BELT, { stroke: 2 });
  cv.form('M57.4 118.8 H66.4 V128.2 H57.4 Z', c.patch, { stroke: 1.6 });
  patch(cv, c, [44.6, 73], -22);
  patch(cv, c, [80.6, 72.6], 20);
}

/** A standing figure: what is behind the body, the legs and torso, what is in front, the head. */
function standingWith(cv, c, { behind = () => {}, over = () => {} }) {
  cv.fill('M16 233 A44 6.5 0 1 0 104 233 A44 6.5 0 1 0 16 233 Z', INK, 0.3);
  behind();
  standingLegs(cv);
  standingTorso(cv, c);
  over();
  cv.group('translate(58 36) scale(1.32)', () => head(cv, c, 'front'));
}

const armR = [8.4, 6.8, 5.2];

/** Standing, weight on the far leg, a hand on the hip: the comic stance for any station on a floor. */
export function standing(cv, c) {
  standingWith(cv, c, {
    behind() {
      cv.limb([[39, 73], [31, 106], [33, 134]], armR, SUIT);
      hand(cv, c, [33.5, 139], 95, 1.25);
    },
    over() {
      cv.limb([[84, 72], [103, 100], [85, 122]], armR, SUIT);
      cv.line(curve([[97.6, 93], [101, 101], [107.6, 102]]), { width: 1.3 });
      cv.line('M87 114.6 L91.4 120.2', { width: 2.8, color: c.patch });
      hand(cv, c, [82.6, 123.6], 200, 1.22);
    },
  });
}

/** Standing with the arms folded: waiting, the same for everyone who waits. */
export function standingFolded(cv, c) {
  standingWith(cv, c, {
    over() {
      // The far arm: the upper arm at the side, the forearm across the body under the near arm.
      cv.limb([[40, 74], [35, 100]], [8.4, 7.2], SUIT);
      cv.limb([[36, 103], [60, 108], [84, 103]], [7, 6.4, 5.6], SUIT);
      // The near arm on top: upper arm at the side, forearm across, the hand on the far arm.
      cv.limb([[84, 73], [92, 98]], [8.4, 7.2], SUIT);
      cv.limb([[92, 99], [68, 96], [47, 92]], [7, 6.4, 5.6], SUIT);
      cv.line('M76 93.4 L77 100', { width: 2.6, color: c.patch });
      hand(cv, c, [42.6, 91], 186, 1.18);
      cv.line(curve([[86, 104], [92, 101], [96, 95]]), { width: 1.2 });
    },
  });
}

/** Standing with the hands clasped behind the back: the elbows show, the hands do not. */
export function standingBack(cv, c) {
  standingWith(cv, c, {
    behind() {
      cv.limb([[40, 74], [31, 100], [46, 122]], armR, SUIT);
      cv.limb([[84, 73], [93, 100], [78, 122]], armR, SUIT);
    },
    over() {
      cv.line(curve([[29, 96], [32, 102], [38, 104]]), { width: 1.2 });
      cv.line(curve([[86, 104], [92, 102], [95, 96]]), { width: 1.2 });
    },
  });
}

/** The crew suit's front: torso, zip, collar, patches. Shared by every pose that faces the viewer. */
function suitFront(cv, c, torso, shadow, box, { zip, collar, patches }) {
  cv.form(torso, SUIT, { stroke: 2.8, shadow, hatch: box });
  if (zip) cv.line(zip, { width: 1.6 });
  if (collar) cv.line(collar, { width: 2 });
  for (const [at, angle] of patches) patch(cv, c, at, angle);
}

/** Leaning over a table or a counter, both hands on it: the Command Room's chart table, Room B's counter. Below the prop line it is hidden by the prop. */
export function leaning(cv, c) {
  cv.form(chain([[70, 52], [70, 68]], [7, 7.8]), c.skin, { stroke: 2.3, shadow: chain([[74.6, 52], [74.6, 68]], [4, 4.6]), dots: true });
  suitFront(cv, c,
    blob([[40, 78], [55, 66], [85, 66], [100, 78], [98, 104], [94, 152], [46, 152], [42, 104]], 0.85),
    blob([[80, 66], [100, 78], [98, 104], [94, 152], [80, 152], [84, 104], [86, 80]], 0.85), [76, 66, 102, 152],
    { zip: 'M70 70 L70 152', collar: 'M60 66.4 L70 79 L80 66.4', patches: [[[48, 77], -32], [[92, 77], 32]] });
  cv.line('M52 96 Q58 100 56 110 M88 96 Q82 100 84 110', { width: 1.2 });
  const farArm = [[45, 81], [31, 108], [38, 134]], nearArm = [[95, 81], [109, 108], [102, 134]];
  cv.limb(farArm, [8.8, 7.2, 5.6], SUIT);
  cv.limb(nearArm, [8.8, 7.2, 5.6], SUIT);
  cv.line(curve([[26, 104], [31, 110], [37, 107]]), { width: 1.2 });
  cv.line(curve([[103, 107], [109, 110], [114, 104]]), { width: 1.2 });
  // The hands lie on the table top, over the prop.
  cv.front(() => {
    hand(cv, c, [38.6, 139.4], 96, 1.3);
    hand(cv, c, [101.4, 139.4], 84, 1.3);
  });
  cv.group('translate(70 41) scale(1.32)', () => head(cv, c, 'down'));
}

/** Sitting up in a Hospital bed against the pillow, Injured: a bandage, an arm in a sling. Below the blanket it is hidden by the bed. */
export function inBed(cv, c) {
  cv.form(blob([[52, 30], [118, 34], [124, 74], [60, 76]], 0.6), PAPER, { stroke: 2.4, shadow: blob([[96, 33], [118, 34], [124, 74], [100, 75]], 0.6), dots: true, depth: 0.12 });
  cv.form(chain([[64, 56], [65, 72]], [6.8, 7.6]), c.skin, { stroke: 2.3, shadow: chain([[68.6, 56], [69.6, 72]], [4, 4.6]), dots: true });
  suitFront(cv, c,
    blob([[42, 84], [54, 72], [80, 71], [95, 80], [95, 106], [92, 150], [48, 150], [44, 106]], 0.85),
    blob([[76, 71], [95, 80], [95, 106], [92, 150], [78, 150], [82, 104], [83, 80]], 0.85), [72, 70, 98, 150],
    { zip: 'M66 73 L66.6 150', collar: 'M57 72 L66 82 L76 71.6', patches: [[[47, 83], -26], [[89, 81], 24]] });
  // Both arms rest on the blanket, over the prop. Injured is said by the bandage, the bed and the marker.
  cv.front(() => {
    cv.limb([[46, 88], [36, 114], [52, 130]], [8.4, 6.8, 5.2], SUIT);
    hand(cv, c, [56.6, 131], 10, 1.22);
    cv.limb([[90, 86], [100, 112], [80, 128]], [8.4, 6.8, 5.2], SUIT);
    hand(cv, c, [75, 129.6], 176, 1.2);
  });
  cv.group('translate(64 45) scale(1.3)', () => head(cv, { ...c, bandage: true }, 'front'));
}

/**
 * Seated, seen from the side, facing left: the bench of the Jail (hunched, elbows on the
 * knees, looking down) and a stool at a console (upright, hands forward on the desk).
 */
function seated(cv, c, { hunched }) {
  cv.fill('M18 197 A46 6 0 1 0 110 197 A46 6 0 1 0 18 197 Z', INK, 0.3);
  const legR = [11.6, 8.2, 6];
  if (!hunched) {
    cv.form('M70 140 H108 V148 H70 Z', BELT, { stroke: 2 });
    cv.form('M86 148 H92 V188 H86 Z', BOOTS, { stroke: 1.8 });
    cv.form('M74 188 Q89 184 104 188 L104 192 H74 Z', BOOTS, { stroke: 1.8 });
  }
  // The far leg and arm, behind.
  cv.limb([[92, 132], [60, 130], [58, 182]], legR, SUIT);
  boot(cv, [58, 183], -1);
  if (hunched) cv.limb([[82, 92], [66, 122], [50, 132]], [8, 6.6, 5], SUIT);
  else cv.limb([[94, 90], [84, 116], [60, 112]], [8, 6.6, 5], SUIT);
  // The torso.
  const torso = hunched
    ? blob([[58, 94], [70, 80], [88, 82], [100, 104], [106, 134], [86, 142], [72, 130], [64, 112]], 0.85)
    : blob([[70, 82], [84, 73], [99, 81], [103, 108], [104, 137], [84, 143], [72, 132], [70, 104]], 0.85);
  const shadow = hunched
    ? blob([[86, 82], [100, 104], [106, 134], [94, 140], [90, 110]], 0.85)
    : blob([[94, 78], [103, 108], [104, 137], [94, 141], [92, 108]], 0.85);
  cv.form(torso, SUIT, { stroke: 2.8, shadow, hatch: [84, 74, 108, 144] });
  cv.form(hunched ? 'M72 126 Q90 131 105 127 L106 135 Q90 140 72.6 134 Z' : 'M71 124 Q88 129 103.6 125 L104 133 Q88 138 71.6 132 Z', BELT, { stroke: 1.9 });
  patch(cv, c, hunched ? [80, 88] : [90, 84], hunched ? 34 : 14);
  // The near leg, in front.
  cv.limb([[88, 138], [54, 138], [50, 186]], legR, SUIT);
  cv.line(curve([[50, 131], [56, 139], [50, 146]]), { width: 1.3 });
  boot(cv, [50, 187], -1);
  // The neck and head, then the near arm in front of the body.
  if (hunched) {
    cv.form(chain([[64, 74], [72, 88]], [6.6, 7.4]), c.skin, { stroke: 2.2, shadow: chain([[68, 74], [76, 88]], [3.8, 4.2]), dots: true });
    cv.group('translate(58 64) rotate(-16) scale(1.3)', () => head(cv, c, 'down'));
    cv.limb([[80, 96], [60, 128], [46, 138]], [8.4, 6.8, 5.2], SUIT);
    cv.line(curve([[55, 124], [60, 131], [67, 128]]), { width: 1.2 });
    hand(cv, c, [42, 139], 160, 1.24);
  } else {
    cv.form(chain([[80, 56], [82, 74]], [6.6, 7.4]), c.skin, { stroke: 2.2, shadow: chain([[84.6, 56], [86.6, 74]], [3.8, 4.2]), dots: true });
    cv.group('translate(78 50) scale(1.3)', () => head(cv, c, 'front'));
    cv.limb([[86, 88], [72, 116], [48, 110]], [8.4, 6.8, 5.2], SUIT);
    cv.line(curve([[68, 110], [72, 118], [79, 117]]), { width: 1.2 });
    hand(cv, c, [42, 110], 184, 1.24);
  }
}

export const onBench = (cv, c) => seated(cv, c, { hunched: true });
export const atConsole = (cv, c) => seated(cv, c, { hunched: false });

export const POSES = {
  standing: { draw: standing, viewBox: '0 -8 120 248', width: 120, height: 248, anchor: [62, 233], about: 'Standing on the floor of a room, a hand on the hip: any standing station' },
  standingFolded: { draw: standingFolded, viewBox: '0 -8 120 248', width: 120, height: 248, anchor: [62, 233], about: 'Standing, the arms folded: any standing station' },
  standingBack: { draw: standingBack, viewBox: '0 -8 120 248', width: 120, height: 248, anchor: [62, 233], about: 'Standing, the hands behind the back: any standing station' },
  leaning: { draw: leaning, viewBox: '0 -2 140 152', width: 140, height: 152, anchor: [70, 136], about: 'Leaning over the chart table or the laboratory counter: a station behind a prop; below its line the prop hides it' },
  inBed: { draw: inBed, viewBox: '0 0 140 150', width: 140, height: 150, anchor: [70, 128], about: 'Sitting up in the Hospital bed, Injured; below the blanket the bed hides it' },
  onBench: { draw: onBench, viewBox: '10 22 112 180', width: 112, height: 180, anchor: [86, 140], about: 'Sitting on the Jail bench, hunched: the anchor is the seat' },
  atConsole: { draw: atConsole, viewBox: '10 8 112 194', width: 112, height: 194, anchor: [74, 197], about: 'Seated on a stool at a console, side on: a station at a desk in Room A or Room B' },
};
