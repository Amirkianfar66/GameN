// mothership:dev-only
//
// The pilot's characters: the same people as the approved standees (design/source/crew/),
// redrawn at comic proportions. What makes each one recognizable is kept: skin, hair,
// glasses, beard, the color of the patches on the crew suit. Every one wears the same crew
// suit, and nothing of a role or a team is drawn on anyone.

import { INK, PAPER, blob, cloud, curve, mix } from './rig.mjs';

export const CREW = {
  c1: { sign: 'Vega', skin: '#7A4B2E', hair: '#151923', hairLight: '#55657E', accent: '#EE8B3A', patch: '#B45A16', glasses: true, hairStyle: 'afro' },
  c2: { sign: 'Rigel', skin: '#F2CDB0', hair: '#C4622D', hairLight: '#E8955E', accent: '#F3CB3F', patch: '#B98F12', hairStyle: 'crop', beard: true },
  c3: { sign: 'Lyra', skin: '#B97A52', hair: '#3B2A22', hairLight: '#6E5244', accent: '#AFCF4E', patch: '#6F8E22', hairStyle: 'bun' },
  c4: { sign: 'Atlas', skin: '#C99468', hair: '#151923', hairLight: '#55657E', accent: '#45A866', patch: '#256F40', hairStyle: 'crop' },
  c5: { sign: 'Orion', skin: '#F4D9C6', hair: '#F4EBDD', hairLight: '#FFFFFF', accent: '#33ADA2', patch: '#177168', hairStyle: 'bald', mustache: true },
  c6: { sign: 'Nova', skin: '#EBC49F', hair: '#151923', hairLight: '#55657E', accent: '#EE7FAE', patch: '#B5447A', hairStyle: 'bob', headset: true },
  c7: { sign: 'Juno', skin: '#D9A679', hair: '#5E3B22', hairLight: '#8A5E3E', accent: '#9A6A47', patch: '#5E3B22', hairStyle: 'crop', goggles: true },
  c8: { sign: 'Mira', skin: '#C98E63', hair: '#55657E', hairLight: '#8696AE', accent: '#E3D6C2', patch: '#8E7B5E', hairStyle: 'hijab' },
  c9: { sign: 'Echo', skin: '#5E3A24', hair: '#1C212B', hairLight: '#39404E', accent: '#39404E', patch: '#1C212B', hairStyle: 'locs', shades: true },
};

export const SUIT = '#C6CDD4';
export const BOOTS = '#34415A';
export const BELT = '#55657E';

const FACE = {
  front: [[-9, -11], [-11.6, -4], [-12.2, 2], [-11, 8], [-8, 12.6], [-3, 15], [4, 13.6], [9.6, 8], [11.6, 0], [11, -8], [3, -13]],
  down: [[-9, -9], [-12, -2], [-12.6, 4], [-11, 10], [-7.6, 14.6], [-2, 16.4], [5, 14.4], [10, 8], [11.6, 0], [10.6, -7], [3, -11]],
};
const FACE_SHADOW = blob([[5, -12], [11, -8], [11.6, 0], [9.6, 8], [4, 13.6], [1.6, 13], [5.2, 6], [6.4, -2]]);

function hairBehind(cv, c, view) {
  const back = view === 'back';
  if (c.hairStyle === 'bun') cv.form(cloud([7, back ? -19 : -20], 6.4, 5.6, 7), c.hair, { stroke: 2, shadow: blob([[9, -25], [13.4, -20], [10, -15], [7, -19]]), dots: false });
  if (c.hairStyle === 'bob') cv.form(blob([[-12, -8], [-9, -17], [1, -20.4], [11, -16], [14.6, -4], [14, 10], [6, 12], [6, -2], [-6, -4], [-12, 6]]), c.hair, { stroke: 2.2, shadow: blob([[8, -17], [14.6, -4], [14, 10], [8, 11], [9, -6]]), dots: true, depth: 0.25 });
  if (c.hairStyle === 'locs') {
    for (const [x, len, dx] of [[13, 30, 2], [9, 33, 1], [4, 31, 0], [-2, 26, -1], [-8, 20, -2]]) cv.form(blob([[x - 2.6, -8], [x + 2.6, -8], [x + 2.4 + dx, len - 10], [x + dx, len - 7], [x - 2.4 + dx, len - 10]], 0.7), c.hair, { stroke: 1.8 });
    cv.form(blob([[-12, -6], [-9, -16], [1, -20], [11, -16], [14.6, -5], [10, 0], [-10, -1]]), c.hair, { stroke: 2.2 });
  }
  if (c.hairStyle === 'hijab') cv.form(blob([[-14, -6], [-10, -17], [1, -21], [12, -17], [16.6, -4], [17, 12], [20, 26], [-2, 26], [-14, 16], [-15, 4]]), c.hair, { stroke: 2.3, shadow: blob([[8, -18], [16.6, -4], [17, 12], [20, 26], [10, 26], [11, 4]]), dots: true, depth: 0.28 });
  if (c.hairStyle === 'afro') {
    const d = cloud([2, view === 'back' ? -8 : -11], 19.5, 16.8, 15);
    cv.form(d, c.hair, { stroke: 2.3, shadow: blob([[8, -27], [20, -18], [22, -6], [16, 5], [8, 3], [12, -8]]), hatch: null, depth: 0.25 });
    for (const [x, y] of [[-12, -16], [-4, -22], [6, -23], [14, -16], [-14, -6], [16, -6], [2, -15]]) cv.line(`M${x} ${y} a2.6 2.6 0 0 1 4.4 1`, { width: 1, color: c.hairLight });
  }
  if (['crop', 'bun'].includes(c.hairStyle) && back) cv.form(blob([[-11, -8], [-6, -15], [5, -16], [12, -9], [12, 2], [0, 4], [-10, 1]]), c.hair, { stroke: 2.2 });
  if (c.hairStyle === 'bald' && back) cv.form(blob([[-10, -6], [-6, -14], [4, -15], [11, -8], [12, 2], [0, 4], [-10, 1]]), c.skin, { stroke: 2.2, shadow: blob([[4, -14], [11, -8], [12, 2], [6, 2]]), dots: true, depth: 0.25 });
}

/**
 * The head, in its own frame: the middle of the face at 0,0, chin at 15, the top of the
 * skull at -13. view: 'front' (three-quarter, facing left), 'down' (looking down and left),
 * 'back' (from behind).
 */
export function head(cv, c, view = 'front') {
  hairBehind(cv, c, view);
  if (view === 'back') {
    cv.form(blob([[-7, 4], [-3, 14], [5, 14.6], [9, 5], [2, 6]]), c.skin, { stroke: 2, shadow: blob([[2, 4], [9, 4], [7, 14], [3, 14.6]]), dots: false });
    cv.form(blob([[9.2, -3], [13, -3.6], [13.6, 2.4], [10.6, 5], [9, 3]]), c.skin, { stroke: 1.6 });
    if (c.hairStyle === 'crop') cv.line('M-8 -4 Q0 -1 10 -5', { width: 1.1, color: c.hairLight });
    return;
  }
  const down = view === 'down';
  cv.form(blob(down ? FACE.down : FACE.front), c.skin, { stroke: 2.3, shadow: FACE_SHADOW, dots: true, depth: 0.28 });
  // The ear, on the side away from the turn.
  cv.form(blob([[9.4, -3.6], [13.2, -4.2], [14, 2], [11, 5.4], [9.2, 3]]), c.skin, { stroke: 1.7, shadow: blob([[11, -2.6], [13.8, 0.6], [11, 5]]), dots: false });
  cv.line('M11.2 -1.4 Q12.6 0.6 11 2.6', { width: 1 });
  // Hair in front.
  if (c.hairStyle === 'afro') {
    cv.form(`${cloud([-1, -12], 13, 4.6, 7, Math.PI * 0.92, Math.PI * 2.08, 0.7)} L9.6 -7 Q0 -10.4 -11.6 -7 Z`, c.hair, { stroke: 1.9 });
  }
  if (c.hairStyle === 'crop' || c.hairStyle === 'bun') {
    cv.form(blob([[-11.4, -6], [-10, -13], [-2, -17.4], [7, -16.4], [12.6, -9], [11.4, -2], [9, -7.6], [1, -10], [-6, -8.6]]), c.hair, { stroke: 2.1, shadow: blob([[6, -16], [12.6, -9], [11.4, -2], [8, -8]]), dots: false });
    cv.line('M-8 -12 Q-2 -15.6 6 -14', { width: 1.1, color: c.hairLight });
  }
  if (c.hairStyle === 'bald') {
    cv.form(cloud([10, -4], 3.4, 4.4, 5, -Math.PI * 0.6, Math.PI * 0.7, 0.75) + ' Z', c.hair, { stroke: 1.6 });
    cv.line('M-6 -11.4 Q1 -14 8 -12', { width: 1.1, color: mix(c.skin, PAPER, 0.5) });
  }
  if (c.hairStyle === 'bob') cv.form(blob([[-12, -5], [-10, -13], [-1, -16.6], [9, -14], [12.6, -7], [6, -9.6], [-3, -8], [-9, -2]]), c.hair, { stroke: 2 });
  if (c.hairStyle === 'locs') cv.form(blob([[-11.6, -6], [-10, -13.6], [-1, -17], [9, -15], [12.4, -8], [5, -9.6], [-4, -8.6]]), c.hair, { stroke: 2 });
  if (c.hairStyle === 'hijab') {
    cv.form('M-13 -6 Q-12 -15 0 -16.6 Q11 -16 14 -7 L13 0 Q8 -9 0 -10 Q-8 -10 -11.4 -3 L-12.4 6 Q-13.6 0 -13 -6 Z', c.hair, { stroke: 2 });
    cv.form('M-12.4 6 Q-11 12 -6 16 Q0 19 6 16.6 L10 26 L-6 26 Q-14 20 -12.4 6 Z', c.hair, { stroke: 2, shadow: 'M2 17.6 L6 16.6 L10 26 L4 26 Z', dots: false });
    cv.line('M-8 -12.6 Q0 -15 9 -11.6', { width: 1.1, color: c.hairLight });
  }
  if (c.beard) {
    cv.form(blob([[-11.4, 4], [-8.4, 9], [-3, 9.6], [3, 8], [9.6, 4], [9.6, 9.4], [4, 15.6], [-3, 17.6], [-8.6, 14.6]]), c.hair, { stroke: 2, shadow: blob([[3, 8], [9.6, 4], [9.6, 9.4], [4, 15.6], [2, 12]]), dots: false });
    cv.form('M-10.6 6.2 Q-6 4.6 -1.4 6.6 Q-5.4 8.4 -10.6 6.2 Z', c.hair, { stroke: 1.1 });
  }
  // Features, looking left. Looking down, the eyes are lids.
  const ey = down ? 0.6 : -1.5;
  cv.line(`M-10.6 ${ey - 5.4} L-5 ${ey - 6.2} M-2 ${ey - 6.2} L5.6 ${ey - 5.4}`, { width: 2.2 });
  if (down) cv.line(`M-9.6 ${ey} Q-7.4 ${ey + 1.4} -5 ${ey} M-0.8 ${ey} Q1.8 ${ey + 1.6} 4.4 ${ey}`, { width: 1.5 });
  else cv.fill(`M-8.6 ${ey} a1.6 2 0 1 0 3.2 0 a1.6 2 0 1 0 -3.2 0 Z M0 ${ey} a1.8 2.2 0 1 0 3.6 0 a1.8 2.2 0 1 0 -3.6 0 Z`, INK);
  cv.line(`M-4.8 ${ey + 2} L-8.8 ${ey + 6.6} L-6.2 ${ey + 7.4}`, { width: 1.5 });
  if (!c.beard) cv.line(down ? 'M-8 11 Q-5 12 -2 10.8' : 'M-8.2 9.8 Q-5.2 11 -1.8 9.6', { width: 1.6 });
  if (c.mustache) cv.form('M-11.4 7.4 Q-8 5 -5 6.6 Q-2 5 1.6 7.2 Q-1 9.4 -5 8.4 Q-9 9.6 -11.4 7.4 Z', c.hair, { stroke: 1.4 });
  if (c.shades) {
    cv.form(`M-11 ${ey - 2.6} H-4.2 Q-4 ${ey + 2.6} -7.6 ${ey + 2.8} Q-10.6 ${ey + 2.6} -11 ${ey - 2.6} Z M-2.6 ${ey - 2.6} H6.4 Q6.6 ${ey + 3} 1.8 ${ey + 3.2} Q-2.4 ${ey + 3} -2.6 ${ey - 2.6} Z`, c.hairLight, { stroke: 1.7 });
    cv.line(`M-4.2 ${ey - 2} H-2.6 M6.4 ${ey - 2} L10.6 ${ey - 3}`, { width: 1.6 });
    cv.line(`M-1 ${ey - 1.4} L1.4 ${ey - 1.4}`, { width: 1, color: PAPER });
  }
  if (c.goggles) {
    cv.line('M-12.4 -11 Q0 -16.6 12.6 -10.6', { width: 3, color: c.patch });
    cv.form('M-9.6 -12.6 a3.6 3.6 0 1 0 7.2 0 a3.6 3.6 0 1 0 -7.2 0 Z M-0.4 -13.4 a4.2 4.2 0 1 0 8.4 0 a4.2 4.2 0 1 0 -8.4 0 Z', '#B9C4D3', { stroke: 1.8 });
    cv.line('M-7.4 -13.6 L-6 -14.6 M2 -14.6 L3.6 -15.6', { width: 1, color: PAPER });
  }
  if (c.headset) {
    cv.line('M-6 -15.6 Q4 -19 12 -9', { width: 2.4 });
    cv.form('M9.6 -4.6 a3.6 4.4 0 1 0 7.2 0 a3.6 4.4 0 1 0 -7.2 0 Z', '#55657E', { stroke: 1.8 });
    cv.line('M11 0 Q4 10 -5 10', { width: 1.5 });
    cv.form('M-7.6 8.6 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 Z', '#55657E', { stroke: 1.2 });
  }
  if (c.glasses) {
    cv.line(`M-10.4 ${ey} a3 3.8 0 1 0 6 0 a3 3.8 0 1 0 -6 0 M-2.4 ${ey} a4.2 4.2 0 1 0 8.4 0 a4.2 4.2 0 1 0 -8.4 0 M-4.4 ${ey - 0.6} L-2.4 ${ey - 0.6} M6 ${ey - 0.6} L10.6 ${ey - 2}`, { width: 1.7 });
    cv.line(`M0 ${ey - 2.4} L1.8 ${ey - 3.4}`, { width: 1, color: PAPER });
  }
  if (c.bandage) {
    cv.form('M-12.4 -9.6 Q0 -14.6 12.6 -9 L12.4 -4.4 Q0 -9.6 -12 -4.8 Z', PAPER, { stroke: 1.7, shadow: 'M5 -12 Q10 -10.4 12.6 -9 L12.4 -4.4 Q8 -6.4 4.4 -7.4 Z', dots: false });
    // No red cross: red is a team's color, and a bandage says Injured without it.
    cv.line('M-9 -9.4 Q0 -12.4 9 -8.4', { width: 0.9, color: mix(PAPER, INK, 0.25) });
  }
  // Light on the lit cheek.
  cv.line(curve([[-11.6, -2], [-12, 3], [-10.6, 8]]), { width: 1, color: mix(c.skin, PAPER, 0.5) });
}
