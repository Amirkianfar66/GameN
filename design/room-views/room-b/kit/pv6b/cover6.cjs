// Who is in front of whom, as rendered (Room B test page v5): for each person on one phone (held at 0 s, 100% text, by depth),
// two transparent stage frames from the page itself. "alone": the person's own parts (figure and front) in flat white,
// nothing else. "stack": the same white parts and every band drawn after the person's figure in flat black, each at its own
// place in the page's order, so a front drawn over a band covers it as on the page. rendered-cover.py measures them: the white
// left in "stack" is what is seen of the person; the black is the furniture drawn over them. Other people are left out (the
// limits are about the furniture). Used by capture6a.cjs (the page's numbers) and verify6a.cjs (a published copy's).
module.exports = async function cover(p, S, ix, key, outDir, set, { moment = 0, tag = '' } = {}) {
  await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth: 'on' });
  if (moment) { await p.evaluate(t => window.roomB.peopleAt(t), moment); await p.waitForTimeout(80); }   // a moment of the people's own motion
  const m = await p.evaluate(() => { const r = window.roomB.measure(); return { order: window.roomB.order, per: r.per, squares: r.squares }; });
  const stage = await p.evaluate(() => { window.scrollTo(0, 0); const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  const out = { order: m.order, moment, people: {} };
  for (const q of S.phones[key].people) {
    const i = m.order.indexOf(q.id), after = m.order.slice(i + 1).filter(x => x.startsWith('band-'));
    const mine = [`#world > [data-id="${q.id}"][data-part="body"]`, `#world > [data-id="${q.id}"][data-part="front"]`], theirs = after.map(b => `#world > img.band[data-band="${b}"]`);
    const base = 'html, body, .wrap, .phone, #phone, .stage, #stage { background: transparent !important; box-shadow: none !important; } #overlay, .loading { display: none !important; }';
    for (const [part, keep] of [['alone', mine], ['stack', [...mine, ...theirs]]]) {
      const css = `${base} #world > *:not(${keep.join(', ')}) { display: none !important; } ${mine.join(', ')} { filter: brightness(0) invert(1) !important; }${part === 'stack' && theirs.length ? ` ${theirs.join(', ')} { filter: brightness(0) !important; }` : ''}`;
      const style = await p.addStyleTag({ content: css }); await p.waitForTimeout(120);
      await p.screenshot({ path: `${outDir}/${key}${tag}-${q.id}-${part}.png`, clip: stage, omitBackground: true });
      await style.evaluate(t => t.remove());
    }
    const c = m.per[q.id], fig = c.figure;
    out.people[q.id] = { name: q.name, after, box: [fig.x0, fig.y0, fig.x1, fig.y1], slotBox: q.box, face: c.face ? [c.face.x0, c.face.y0, c.face.x1, c.face.y1] : null, faceShows: c.faceShows, press: m.squares.find(s => s.id === q.id) };
  }
  return out;
};
