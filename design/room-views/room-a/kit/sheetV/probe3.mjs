// Probe (not published): each view's walls (role, x-range), corners (x in the painting), light bars (ends in the picture), window box
const V = process.argv[2], g = await import(`../sheet${V}/guide${V}.mjs`);
const { project } = await import('../../roomb/ring/ring4b.mjs');
const P = q => project(g.cam, q), f = v => Math.round(v);
const name = n => (n[2] === -1 ? 'north' : n[2] === 1 ? 'south' : n[0] === -1 ? 'east' : 'west');
console.log('== view', V, 'roles', JSON.stringify(g.ROLES), 'camera', JSON.stringify(g.cam.C ?? null));
for (const q of g.room.quads.filter(q => q.kind === 'wall')) { const pp = P(q.pts); if (!pp) { console.log('  wall', name(q.n), 'behind'); continue; }
  const xs = pp.map(p => p[0]); console.log('  wall', name(q.n), 'x', f(Math.min(...xs)), '-', f(Math.max(...xs)), 'role', g.ROLES[name(q.n)] ?? '-'); }
for (const [x, z] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) { const top = P([[x, 3, z], [x, 3, z], [x, 3, z]]), bot = P([[x, 0, z], [x, 0, z], [x, 0, z]]);
  const v = g.cam.view([x, 1.6, z]); console.log(`  corner ${z > 0 ? 'N' : 'S'}${x > 0 ? 'E' : 'W'}: depth ${v[2].toFixed(2)}`, top ? `x ${f(top[0][0])} (top y ${f(top[0][1])}, foot y ${f(bot[0][1])})` : 'behind'); }
for (const z of [0.7, -0.7]) { const a = P([[-1.3, 3, z], [-1.3, 3, z], [-1.3, 3, z]]), b = P([[1.3, 3, z], [1.3, 3, z], [1.3, 3, z]]);
  console.log(`  bar z ${z}: west end`, a ? a[0].map(f).join(',') : 'behind', '| east end', b ? b[0].map(f).join(',') : 'behind'); }
const win = g.room.quads.filter(q => q.kind === 'window').map(q => P(q.pts)).filter(Boolean).flat();
if (win.length) { const xs = win.map(p => p[0]), ys = win.map(p => p[1]); console.log('  window glass box x', f(Math.min(...xs)), '-', f(Math.max(...xs)), 'y', f(Math.min(...ys)), '-', f(Math.max(...ys))); }
