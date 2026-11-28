// Each light bar's share for a person, the Motion builder's method as agreed with the Lead (19 November), in Room B's frame: from
// the person's chest, 1.2 m up; azimuth 0 = straight into the picture, +90 = screen right, -90 = screen left, 180 = toward the
// camera; elevation above level. Each bar is 27 equal point lights, 0.1 m apart along its 2.6 m (both ends included), 3 m up. A
// bar's share is the sum of its points' 1/d² over that of both bars; its direction is the 1/d²-weighted mean of their directions.
// Only the two bars count: the window gives no light, and the monitors' glow is Vega's own. Generates nothing.
import { LAYOUT, camOf } from './stageA.mjs';
const DEG = Math.PI / 180, r1 = n => +n.toFixed(1), r2 = n => +n.toFixed(2), CEIL = 3.0, CHEST = 1.2, STEP = 0.1;
export const LIGHTS_FRAME = 'from the person\'s chest (1.2 m up): azimuth 0 = straight into the picture, +90 = screen right, -90 = screen left, 180 = toward the camera; elevation above level; share of 1/d² of all lights';
export const LIGHTS_METHOD = 'each bar as 27 equal point lights 0.1 m apart along its 2.6 m, both ends included, 3 m up; its share is the sum of their 1/d²; its direction is their 1/d²-weighted mean; only the two bars count (the window gives no light; the monitors\' glow is Vega\'s own)';
const n = Math.round((2 * LAYOUT.lamps.half) / STEP);
export const barPoints = z => Array.from({ length: n + 1 }, (_, i) => [-LAYOUT.lamps.half + i * STEP, CEIL, z]);
export function lightsFor(view, x, z) {
  const { yaw } = camOf(view), fwd = [Math.sin(yaw), Math.cos(yaw)], right = [Math.cos(yaw), -Math.sin(yaw)], chest = [x, CHEST, z];
  const bars = LAYOUT.lamps.z.map(bz => { let W = 0; const v = [0, 0, 0];
    for (const q of barPoints(bz)) { const d = [q[0] - chest[0], q[1] - chest[1], q[2] - chest[2]], L = Math.hypot(...d), w = 1 / (L * L); W += w;
      v[0] += w * (d[0] * right[0] + d[2] * right[1]) / L; v[1] += w * d[1] / L; v[2] += w * (d[0] * fwd[0] + d[2] * fwd[1]) / L; }
    return { bar: bz > 0 ? 'north bar' : 'south bar', W, az: Math.atan2(v[0], v[2]) / DEG, el: Math.atan2(v[1], Math.hypot(v[0], v[2])) / DEG }; });
  const T = bars.reduce((a, b) => a + b.W, 0);
  return Object.fromEntries(bars.map(b => [b.bar === 'north bar' ? 'northBar' : 'southBar', { azimuthDeg: r1(b.az), elevationDeg: r1(b.el), share: r2(b.W / T) }]));
}
