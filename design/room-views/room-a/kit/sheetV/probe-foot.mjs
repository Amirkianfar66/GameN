// Probe (not published): the foot of the wall ahead in views B and E, in the painting, for the before/after crops of the guide
for (const [V, a, b] of [['B', [-2, 0, 2], [2, 0, 2]], ['E', [2, 0, -2], [-2, 0, -2]]]) {
  const g = await import(`../sheet${V}/guide${V}.mjs`), at = p => g.cam.proj(g.cam.view(p)).map(v => +v.toFixed(1));
  const pa = at(a), pb = at(b), slope = (pb[1] - pa[1]) / (pb[0] - pa[0]), yAt = x => +(pa[1] + slope * (x - pa[0])).toFixed(1);
  console.log(V, 'foot from', pa, 'to', pb, '| slope', slope.toFixed(4), '| y at x 0:', yAt(0), 'x 512:', yAt(512), 'x 1024:', yAt(1024));
}
