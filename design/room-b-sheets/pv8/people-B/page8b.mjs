// View B's people data page (page8d.mjs, view D's, for Juno's view): what the In-game animation builder needs to put the people
// into Juno's view (scene.json, the furniture's depth bands and the capsule's band and their order, occlusion.json) and the food
// capsule as PV6-B-4 paints it (the hatch's four corners and the lens, on both phones). Writes page.html. Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => `${(100 * x).toFixed(1)}%`, n0 = x => Math.round(x).toLocaleString('en-GB'), f1 = x => (+x).toFixed(1);
const O = J('occlusion.json'), S = J('scene.json'), PIC = J('picture.json');
const NAME = { B1: 'Mira', B2: 'Juno', B3: 'Lyra', B4: 'Atlas', B5: 'Vega' }, OWN = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' };
const station = s => s === 'D food capsule' ? "the food capsule on Atlas's bench" : (([pl, ...n]) => `${OWN[pl]}'s ${n.join(' ')}${s === 'E bench' ? ' and microscope' : ''}`)(s.split(' '));
const ALL = [...O.bands.map(b => ({ ...b, kind: 'band' })), ...O.capsuleBands.map(b => ({ ...b, kind: 'capsule' }))];
const fileOf = x => ALL.find(b => b.file === `${x}.png`);
const orderRow = x => fileOf(x) ? `<li><code>${x}.png</code>: ${esc(fileOf(x).stations.map(station).join(', '))} (${n0(fileOf(x).px)} px)</li>`
  : x.endsWith(' front') ? `<li class="front">${NAME[x.split(' ')[0]]}'s “front” element, if their figure has one: a part of their figure drawn over their own station where it is nearer than they are</li>`
  : `<li class="person">${NAME[x]} (${x}), ${O.people.find(p => p.id === x).Z.toFixed(2)} m</li>`;
const FILES = ['scene.json', 'occlusion.json', 'picture.json', 'geo-B.json', ...O.bands.map(b => b.file), ...O.capsuleBands.map(b => b.file)];
const ph = k => S.phones[k];
const peopleRows = O.people.map(p => { const r = O.report[p.id], q = ph('390x844').people.find(x => x.id === p.id), q4 = ph('430x932').people.find(x => x.id === p.id);
  return `<tr><td>${esc(r.name)} <span class="mono">${p.id}</span></td><td class="num">${p.Z.toFixed(2)} m</td><td class="num">${q.feet.join(', ')}<br>${q4.feet.join(', ')}</td><td class="num">${q.heightPx} · ${q4.heightPx} px</td><td>${Object.keys(r.inFrontOfThem).length ? Object.entries(r.inFrontOfThem).map(([s, v]) => `${esc(station(s))} ${pct(v)}`).join(', ') : 'nothing'}</td><td class="num">${pct(r.boxShare)} · ${pct(r.lowerShare)}</td><td class="num">${pct(r.faceHidden)} · ${pct(r.pressHiddenShare)}</td></tr>`; }).join('');
const partRows = O.parts.map(p => `<tr><td>${esc(station(p.station))}</td><td>${esc(p.from)}</td><td class="num">${n0(p.px)}</td><td class="num">${pct(p.inItsOutline)} · ${pct(p.outlineCovered)}</td><td class="num">${O.depthHits[p.station].depthM[0].toFixed(2)}–${O.depthHits[p.station].depthM[1].toFixed(2)} m</td><td class="num">${p.offPlan.centre.join(', ')} px</td></tr>`).join('');
const bandFigs = ALL.map(b => `<figure><div class="chk"><img src="${b.file}" alt="${esc(b.file)}: ${esc(b.stations.map(station).join(', '))}" width="1024" height="1536" loading="eager"></div><figcaption><code>${b.file}</code> · after ${b.after.length ? b.after.map(i => NAME[i]).join(', ') : 'nobody'} · before ${b.before.map(i => NAME[i]).join(', ')}</figcaption></figure>`).join('');
const fileRows = FILES.map(f => `<tr><td><a href="${f}"><code>${f}</code></a></td><td><span class="mono">${sha(f)}</span></td></tr>`).join('');
// the capsule: its band cropped around it, with the painted hatch and lens drawn over it (painting pixels, at their centres)
const K = S.capsule, CB = O.capsuleBands[0], mid = p => [p[0] + 0.5, p[1] + 0.5];
const quad = K.painting.hatch.map(mid).map(p => p.join(',')).join(' '), lens = mid(K.painting.lens), lc = K.painting.lensCore;
const crop = [276, 770, 116, 146];   // x, y, w, h in painting pixels: the capsule's layer (x 292–373, y 790–901) with a margin
const capsuleFig = `<svg class="capsule-fig" viewBox="${crop.join(' ')}" role="img" aria-label="The capsule's layer, with the painted hatch outlined and the lens marked">
  <image href="${CB.file}" x="0" y="0" width="1024" height="1536"/>
  <polygon points="${quad}" fill="none" stroke="var(--accent)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  <rect x="${lc[0]}" y="${lc[1]}" width="${lc[2] - lc[0] + 1}" height="${lc[3] - lc[1] + 1}" fill="none" stroke="var(--accent2)" stroke-width="1" vector-effect="non-scaling-stroke"/>
  <circle cx="${lens[0]}" cy="${lens[1]}" r="1.2" fill="var(--accent2)"/></svg>`;
const capRows = ['390x844', '430x932'].map(k => { const c = ph(k).capsule; return `<tr><td>${k.replace('x', ' × ')}</td><td class="num">${c.hatch.map(p => `(${p.map(f1).join(', ')})`).join(' ')}</td><td class="num">${f1(c.hatchBox.x)}, ${f1(c.hatchBox.y)}, ${f1(c.hatchBox.w)} × ${f1(c.hatchBox.h)}</td><td class="num">(${c.lens.map(f1).join(', ')})</td><td class="num">${f1(c.lensCore.x)}, ${f1(c.lensCore.y)}, ${f1(c.lensCore.w)} × ${f1(c.lensCore.h)}</td></tr>`; }).join('')
  + `<tr><td>Painting (pixel indices)</td><td class="num">${K.painting.hatch.map(p => `(${p.join(', ')})`).join(' ')}</td><td class="num">${K.painting.hatchBox.join(', ')}</td><td class="num">(${K.painting.lens.join(', ')})</td><td class="num">${K.painting.lensCore.join(', ')}</td></tr>`;
const C = O.check;
const html = `<title>Room B View B Data</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* A plain handoff sheet: one column of tables, the order list first. */
:root { --bg: #f6f4f8; --surface: #ffffff; --ink: #1d1a24; --muted: #625c6e; --line: #ddd7e4; --accent: #6a3fa0; --accent2: #0f7f86; --chk1: #e9e5ee; --chk2: #d9d3e1;
  --f-head: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; --f-body: Inter, ui-sans-serif, system-ui, sans-serif; --f-mono: ui-monospace, "SF Mono", Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #16131b; --surface: #201c27; --ink: #ece8f2; --muted: #a59eb2; --line: #352f3f; --accent: #c3a2ee; --accent2: #5fd0d6; --chk1: #2a2532; --chk2: #221e29; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #16131b; --surface: #201c27; --ink: #ece8f2; --muted: #a59eb2; --line: #352f3f; --accent: #c3a2ee; --accent2: #5fd0d6; --chk1: #2a2532; --chk2: #221e29; color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--f-body); }
.wrap { max-width: 1000px; margin: 0 auto; padding-block: 24px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }
h1 { font: 650 1.6rem/1.2 var(--f-head); margin: 0; text-wrap: balance; } h2 { font: 600 1.15rem/1.3 var(--f-head); margin: 0; }
p { margin: 0; max-width: 72ch; } .muted { color: var(--muted); } code, .mono { font-family: var(--f-mono); font-size: 0.86em; overflow-wrap: anywhere; }
section { display: grid; gap: 10px; min-width: 0; }
.table-scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; } th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; color: var(--muted); font-size: 0.8rem; letter-spacing: 0.02em; } tr:last-child td { border-bottom: 0; } td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
ol.order { margin: 0; padding-left: 1.4em; display: grid; gap: 4px; } ol.order li.person { font-weight: 600; } ol.order li.front { color: var(--muted); }
.bands { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; } figure { margin: 0; display: grid; gap: 6px; min-width: 0; }
.chk { border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: repeating-conic-gradient(var(--chk1) 0 25%, var(--chk2) 0 50%) 0 0 / 16px 16px; }
.chk img { width: 100%; height: auto; display: block; max-width: 100%; } figcaption { font-size: 0.8rem; color: var(--muted); }
.capsule-row { display: grid; grid-template-columns: minmax(140px, 220px) 1fr; gap: 16px; align-items: start; }
@media (max-width: 560px) { .capsule-row { grid-template-columns: 1fr; } }
.capsule-fig { width: 100%; max-width: 260px; height: auto; display: block; border: 1px solid var(--line); border-radius: 8px; background: repeating-conic-gradient(var(--chk1) 0 25%, var(--chk2) 0 50%) 0 0 / 16px 16px; }
.note { border-left: 3px solid var(--accent); padding: 8px 12px; background: var(--surface); border-radius: 0 8px 8px 0; }
a { color: var(--accent); }
</style>
<div class="wrap">
  <header style="display:grid;gap:8px">
    <h1>Room B, view B: the people's data</h1>
    <p class="muted">Juno's view (sheet PV6-B, version 4), for the In-game animation builder. It gives where Mira, Vega and Atlas stand on both phones, the furniture cut into depth bands around them, and the food capsule as it is painted. Lyra is out of view (the chip). Juno's own stool and cart are never drawn here.</p>
  </header>
  <section>
    <h2>Drawing order, far to near</h2>
    <ol class="order">${O.order.map(orderRow).join('')}</ol>
    <p class="muted">By depth alone (the Lead, 18 November): each furniture pixel is drawn after every person farther than it and before every person nearer, so the order holds while the figures move. The capsule stands on Atlas's bench and overlaps it, so it has its own band file. That file is drawn just after the furniture band of the same number, and it never falls under the bench pixel beneath it (${C.capsuleUnderTheBenchPx} px). ${O.conflictPx ? `${O.conflictPx} px conflict.` : 'No conflicts.'} The name tags go above every layer.</p>
  </section>
  <section>
    <h2>The bands</h2>
    <div class="bands">${bandFigs}</div>
    <p class="muted">Each band is a full painting-size RGBA layer (1024 × 1536), so it shares the plate's placement on each phone (scene.json: plate left, top, width, height). Under each band, a 2 px seam fill from the nearer bands of the same set closes the gap that scaling would open; the nearer band draws those pixels again on top.</p>
  </section>
  <section>
    <h2>The food capsule, as painted</h2>
    <div class="capsule-row">
      ${capsuleFig}
      <div style="display:grid;gap:8px;min-width:0">
        <p>The Lead's decision of 18 November: the painted hatch is larger than the sheet's, on purpose. The code follows the painting, not the sheet's projection. The light, the shutter, the hatch's opening, the tray, the portion and the wrapper fit the painted hatch and the painted lens.</p>
        <p class="muted">Outlined: the hatch's four corners, top left, top right, bottom right and bottom left. Marked: the lens's dark core and its centre. Stage points take each painting pixel at its centre. The hatch's box runs from its first pixel's corner to the far side of its last.</p>
      </div>
    </div>
    <div class="table-scroll"><table><thead><tr><th>Where</th><th>Hatch corners: TL, TR, BR, BL</th><th>Hatch box: x, y, w × h</th><th>Lens centre</th><th>Lens core: x, y, w × h</th></tr></thead><tbody>${capRows}</tbody></table></div>
  </section>
  <section>
    <h2>The people</h2>
    <div class="table-scroll"><table><thead><tr><th>Who</th><th>Depth</th><th>Feet, 390 · 430 (stage px)</th><th>Height</th><th>In front of them</th><th>Box · lower half hidden</th><th>Face · press area hidden</th></tr></thead><tbody>${peopleRows}</tbody></table></div>
    <p class="muted">Measured with the stand-in shapes in the slots, at the positions the camera report gives. scene.json has each slot's feet, head and radius, box, scale and press area on both phones, all checked against camera report B (version 2). Each person's own station is nearer than them in places, so their figure's “front” element goes just above the band the order names.</p>
  </section>
  <section>
    <h2>The pieces against the plan</h2>
    <div class="table-scroll"><table><thead><tr><th>Piece</th><th>Lifted from</th><th>Pixels</th><th>In its outline · outline covered</th><th>Depth</th><th>Centre off the plan</th></tr></thead><tbody>${partRows}</tbody></table></div>
    <p class="muted">Checks: the bands over the plate give exactly the four layers over it (largest difference ${C.bandsAgainstLayers.maxAbsDiff}; the furniture bands alone, ${C.bandsAgainstLayers.furnitureOnly}). Against PV6-B-4 the mean difference is ${C.againstPlaced.meanAbsDiff} (p99 ${C.againstPlaced.p99}). Under the furniture, away from step 3's mask, PV6-B-3 and PV6-B-4 are identical (${C.pv6b3AgainstPv6b4UnderTheFurniture.differingPx} px differ). Each person lands in the same place on both phones.</p>
  </section>
  <section>
    <h2>Inputs</h2>
    <p class="note">The plate and the furnished pictures are AI-generated (the image session's PV6-B-1, PV6-B-3 and PV6-B-4, on the records page ${esc(PIC.records.version)}). The plate is the step-1 picture. The bands are cut from the four lifted layers, which the sheet's own tool reproduces byte for byte: lift B for the furniture, lift3 B for the capsule.</p>
    <div class="table-scroll"><table><thead><tr><th>Input</th><th>sha256</th></tr></thead><tbody>
      <tr><td>PV6-B-1, the plate (step 1)</td><td><span class="mono">${PIC.plate.sha256}</span></td></tr>
      <tr><td>PV6-B-3, the furniture (step 2)</td><td><span class="mono">${PIC.placed2.sha256}</span></td></tr>
      <tr><td>PV6-B-4, with the capsule (step 3)</td><td><span class="mono">${PIC.placed.sha256}</span></td></tr>
      ${[...Object.entries(PIC.layers.pieces), ...Object.entries(PIC.layers3.pieces)].map(([s, v]) => `<tr><td>${esc(station(s))}: <code>${esc(v.file)}</code></td><td><span class="mono">${v.sha256}</span></td></tr>`).join('')}
      <tr><td>The painted hatch: records/PV6-B-4-hatch.json</td><td><span class="mono">${PIC.hatch.record.sha256}</span></td></tr>
      <tr><td>The painted lens: records/PV6-B-4.json (its review)</td><td><span class="mono">${PIC.hatch.lensRecord.sha256}</span></td></tr>
      <tr><td>Camera report B, version 2</td><td><span class="mono">${PIC.camera.sha256}</span></td></tr>
    </tbody></table></div>
  </section>
  <section>
    <h2>Files</h2>
    <div class="table-scroll"><table><thead><tr><th>File</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
  </section>
</div>`;
writeFileSync(DIR + 'page.html', html); console.log('page.html', html.length, 'chars; files', FILES.join(', '));
