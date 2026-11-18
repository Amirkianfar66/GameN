// View D's people data page: what the In-game animation builder needs to put the people into Atlas's view (scene.json, the
// furniture's depth bands and their order, occlusion.json), as PV6-A's page gave them. Writes page.html. Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => `${(100 * x).toFixed(1)}%`, n0 = x => Math.round(x).toLocaleString('en-GB');
const O = J('occlusion.json'), S = J('scene.json'), PIC = J('picture.json');
const NAME = { B1: 'Mira', B2: 'Juno', B3: 'Lyra', B4: 'Atlas', B5: 'Vega' }, OWN = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' };
const station = s => { const [pl, ...n] = s.split(' '); return `${OWN[pl]}'s ${n.join(' ')}${s === 'E bench' ? ' and microscope' : ''}`; };
const orderRow = x => x.startsWith('band-') ? `<li><code>${x}.png</code>: ${esc(O.bands.find(b => `band-${b.band}` === x).stations.map(station).join(', '))} (${n0(O.bands.find(b => `band-${b.band}` === x).px)} px)</li>`
  : x.endsWith(' front') ? `<li class="front">${NAME[x.split(' ')[0]]}'s “front” element, if their figure has one: a part of their figure drawn over their own station where it is nearer than they are</li>`
  : `<li class="person">${NAME[x]} (${x}), ${O.people.find(p => p.id === x).Z.toFixed(2)} m</li>`;
const FILES = ['scene.json', 'occlusion.json', 'picture.json', 'geo-D.json', ...O.bands.map(b => b.file)];
const ph = k => S.phones[k];
const peopleRows = O.people.map(p => { const r = O.report[p.id], q = ph('390x844').people.find(x => x.id === p.id), q4 = ph('430x932').people.find(x => x.id === p.id);
  return `<tr><td>${esc(r.name)} <span class="mono">${p.id}</span></td><td class="num">${p.Z.toFixed(2)} m</td><td class="num">${q.feet.join(', ')}<br>${q4.feet.join(', ')}</td><td class="num">${q.heightPx} · ${q4.heightPx} px</td><td>${Object.keys(r.inFrontOfThem).length ? Object.entries(r.inFrontOfThem).map(([s, v]) => `${esc(station(s))} ${pct(v)}`).join(', ') : 'nothing'}</td><td class="num">${pct(r.boxShare)} · ${pct(r.lowerShare)}</td><td class="num">${pct(r.faceHidden)} · ${pct(r.pressHiddenShare)}</td></tr>`; }).join('');
const partRows = O.parts.map(p => `<tr><td>${esc(station(p.station))}</td><td class="num">${n0(p.px)}</td><td class="num">${pct(p.inItsOutline)} · ${pct(p.outlineCovered)}</td><td class="num">${O.depthHits[p.station].depthM[0].toFixed(2)}–${O.depthHits[p.station].depthM[1].toFixed(2)} m</td><td class="num">${p.offPlan.centre.join(', ')} px</td></tr>`).join('');
const bandFigs = O.bands.map(b => `<figure><div class="chk"><img src="${b.file}" alt="${esc(b.file)}: ${esc(b.stations.map(station).join(', '))}" width="1024" height="1536" loading="eager"></div><figcaption><code>${b.file}</code> · after ${b.after.length ? b.after.map(i => NAME[i]).join(', ') : 'nobody'} · before ${b.before.map(i => NAME[i]).join(', ')}</figcaption></figure>`).join('');
const fileRows = FILES.map(f => `<tr><td><a href="${f}"><code>${f}</code></a></td><td><span class="mono">${sha(f)}</span></td></tr>`).join('');
const html = `<title>Room B View D Data</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* A plain handoff sheet: one column of tables, the order list first. */
:root { --bg: #f6f4f8; --surface: #ffffff; --ink: #1d1a24; --muted: #625c6e; --line: #ddd7e4; --accent: #6a3fa0; --chk1: #e9e5ee; --chk2: #d9d3e1;
  --f-head: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; --f-body: Inter, ui-sans-serif, system-ui, sans-serif; --f-mono: ui-monospace, "SF Mono", Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #16131b; --surface: #201c27; --ink: #ece8f2; --muted: #a59eb2; --line: #352f3f; --accent: #c3a2ee; --chk1: #2a2532; --chk2: #221e29; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #16131b; --surface: #201c27; --ink: #ece8f2; --muted: #a59eb2; --line: #352f3f; --accent: #c3a2ee; --chk1: #2a2532; --chk2: #221e29; color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--f-body); }
.wrap { max-width: 1000px; margin: 0 auto; padding-block: 24px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }
h1 { font: 650 1.6rem/1.2 var(--f-head); margin: 0; text-wrap: balance; } h2 { font: 600 1.15rem/1.3 var(--f-head); margin: 0; }
p { margin: 0; max-width: 72ch; } .muted { color: var(--muted); } code, .mono { font-family: var(--f-mono); font-size: 0.86em; overflow-wrap: anywhere; }
section { display: grid; gap: 10px; min-width: 0; }
.table-scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; } th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; color: var(--muted); font-size: 0.8rem; letter-spacing: 0.02em; } tr:last-child td { border-bottom: 0; } td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
ol.order { margin: 0; padding-left: 1.4em; display: grid; gap: 4px; } ol.order li.person { font-weight: 600; } ol.order li.front { color: var(--muted); }
.bands { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; } figure { margin: 0; display: grid; gap: 6px; min-width: 0; }
.chk { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: repeating-conic-gradient(var(--chk1) 0 25%, var(--chk2) 0 50%) 0 0 / 16px 16px; }
.chk img { width: 100%; height: auto; display: block; max-width: 100%; } figcaption { font-size: 0.8rem; color: var(--muted); }
.note { border-left: 3px solid var(--accent); padding: 8px 12px; background: var(--surface); border-radius: 0 8px 8px 0; }
a { color: var(--accent); }
</style>
<div class="wrap">
  <header style="display:grid;gap:8px">
    <h1>Room B, view D: the people's data</h1>
    <p class="muted">Atlas's view (sheet PV6-D, version 2), for the In-game animation builder: where Mira, Lyra and Vega stand on both phones, and the furniture cut into depth bands around them, as PV6-A's page gave them for Mira's view. Juno is out of view (the chip); Atlas's own bench and the capsule on it are never drawn here.</p>
  </header>
  <section>
    <h2>Drawing order, far to near</h2>
    <ol class="order">${O.order.map(orderRow).join('')}</ol>
    <p class="muted">By depth alone (the Lead, 18 November): each furniture pixel is drawn after every person farther than it and before every person nearer, so the order holds while the figures move. ${O.conflictPx ? `${O.conflictPx} px conflict.` : 'No conflicts.'} The name tags go above every layer.</p>
  </section>
  <section>
    <h2>The bands</h2>
    <div class="bands">${bandFigs}</div>
    <p class="muted">Each band is a full painting-size RGBA layer (1024 × 1536), so it shares the plate's placement on each phone (scene.json: plate left, top, width, height). Under each band, a 2 px seam fill from the nearer bands closes the gap scaling would open; the nearer band draws those pixels again on top.</p>
  </section>
  <section>
    <h2>The people</h2>
    <div class="table-scroll"><table><thead><tr><th>Who</th><th>Depth</th><th>Feet, 390 · 430 (stage px)</th><th>Height</th><th>In front of them</th><th>Box · lower half hidden</th><th>Face · press area hidden</th></tr></thead><tbody>${peopleRows}</tbody></table></div>
    <p class="muted">Measured with the stand-in shapes in the slots, which the camera report's boxes give; scene.json has each slot's feet, head and its radius, box, scale and press area on both phones, all checked against camera report D (version 2). Vega's own bench is in front of their lower half; their figure's “front” element goes just above band-2, as does Lyra's.</p>
  </section>
  <section>
    <h2>The pieces against the plan</h2>
    <div class="table-scroll"><table><thead><tr><th>Piece</th><th>Pixels</th><th>In its outline · outline covered</th><th>Depth</th><th>Centre off the plan</th></tr></thead><tbody>${partRows}</tbody></table></div>
    <p class="muted">Checks: the bands over the plate give exactly the three layers over it (largest difference ${O.check.bandsAgainstLayers.maxAbsDiff}); against PV6-D-4 the mean difference is ${O.check.againstPlaced.meanAbsDiff} (p99 ${O.check.againstPlaced.p99}). Each person lands in the same place on both phones.</p>
  </section>
  <section>
    <h2>Inputs</h2>
    <p class="note">The plate and the furnished picture are AI-generated (the image session's PV6-D-3 and PV6-D-4, on the records page ${esc(PIC.records.version)}). The bands are cut from PV6-D-4's three lifted layers, which the sheet's own tool reproduces byte for byte.</p>
    <div class="table-scroll"><table><thead><tr><th>Input</th><th>sha256</th></tr></thead><tbody>
      <tr><td>PV6-D-3, the plate (records page)</td><td><span class="mono">${PIC.plate.sha256}</span></td></tr>
      <tr><td>PV6-D-4, the furnished room (records page)</td><td><span class="mono">${PIC.placed.sha256}</span></td></tr>
      ${Object.entries(PIC.layers.pieces).map(([s, v]) => `<tr><td>${esc(station(s))}: <code>${esc(v.file)}</code></td><td><span class="mono">${v.sha256}</span></td></tr>`).join('')}
      <tr><td>Camera report D, version 2</td><td><span class="mono">${PIC.camera.sha256}</span></td></tr>
    </tbody></table></div>
  </section>
  <section>
    <h2>Files</h2>
    <div class="table-scroll"><table><thead><tr><th>File</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
  </section>
</div>`;
writeFileSync(DIR + 'page.html', html); console.log('page.html', html.length, 'chars; files', FILES.join(', '));
