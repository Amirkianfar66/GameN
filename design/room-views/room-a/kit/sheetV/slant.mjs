// Probe (not published): for each view, the walls in the painting and the angle each makes with the picture plane (0 = square on,
// 90 = edge on), its share of the painting's width, and its foot's slope in the guide
import { camOf } from '../stageA.mjs';
const DEG = Math.PI / 180;
for (const V of ['A', 'B', 'C', 'D', 'E']) {
  const { C, yaw } = camOf(V), fwd = [Math.sin(yaw), Math.cos(yaw)];   // the camera's facing in (x, z)
  const g = await import(V === 'A' ? '../sheet/guideA.mjs' : `../sheet${V}/guide${V}.mjs`), at = p => g.cam.proj(g.cam.view(p));
  const walls = { north: [[-2, 2], [2, 2], [0, -1]], south: [[2, -2], [-2, -2], [0, 1]], east: [[2, 2], [2, -2], [-1, 0]], west: [[-2, -2], [-2, 2], [1, 0]] };
  const rows = [];
  for (const [n, [a, b, nrm]] of Object.entries(walls)) {
    const facing = -(nrm[0] * fwd[0] + nrm[1] * fwd[1]); if (facing <= 0) continue;   // seen from inside: the wall's inward normal points at the camera
    const ang = Math.acos(Math.min(1, facing)) / DEG, pa = at([a[0], 0, a[1]]), pb = at([b[0], 0, b[1]]);
    const x0 = Math.max(0, Math.min(pa[0], pb[0])), x1 = Math.min(1024, Math.max(pa[0], pb[0])); if (x1 <= x0) continue;
    rows.push(`${n} ${ang.toFixed(1)}° (share ${((x1 - x0) / 1024 * 100).toFixed(0)}%, foot slope ${((pb[1] - pa[1]) / (pb[0] - pa[0])).toFixed(3)})`);
  }
  console.log(V, 'facing', ((Math.atan2(fwd[0], fwd[1]) / DEG + 360) % 360).toFixed(1), '|', rows.join(' | '));
}
