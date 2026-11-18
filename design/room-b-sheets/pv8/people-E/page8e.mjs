// View E's people data page (page8b.mjs, view B's, for Vega's view): what the In-game animation builder needs to put the people
// into Vega's view (scene.json, the furniture's depth bands and Juno's stool's bands and their order, occlusion.json). The food
// capsule is not in this view. Writes page.html. Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => `${(100 * x).toFixed(1)}%`, n0 = x => Math.round(x).toLocaleString('en-GB');
const O = J('occlusion.json'), S = J('scene.json'), PIC = J('picture.json');
const NAME = { B1: 'Mira', B2: 'Juno', B3: 'Lyra', B4: 'Atlas', B5: 'Vega' }, OWN = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' };
const station = s => (([pl, ...n]) => `${OWN[pl]}'s ${n.join(' ')}`)(s.split(' '));
const C = O.check, R = C.stoolRaisedOverTheFurniture, SEAT = O.people.findIndex(p => p.id === 'B2');
const ALL = [...O.bands.map(b => ({ ...b, kind: 'band' })), ...O.stoolBands.map(b => ({ ...b, kind: 'stool' }))].sort((a, b) => O.order.indexOf(a.file.slice(0, -4)) - O.order.indexOf(b.file.slice(0, -4)));   // in the drawing order
const names = ids => ids.length ? ids.map(i => NAME[i]).join(', ') : 'nobody';
const fileOf = x => ALL.find(b => b.file === `${x}.png`);
const what = b => b.kind === 'stool' ? (b.band > SEAT ? `Juno's stool layer over the cart's right end, which step 3 repainted: drawn with the cart, just after <code>band-${b.band}.png</code>` : 'Juno\'s stool, behind Juno: the seat')
  : esc(b.stations.map(station).join(', '));
const orderRow = x => fileOf(x) ? `<li><code>${x}.png</code>: ${what(fileOf(x))} (${n0(fileOf(x).px)} px)</li>`
  : x.endsWith(' front') ? `<li class="front">${NAME[x.split(' ')[0]]}'s “front” element, if their figure has one: a part of their figure drawn over their own station where it is nearer than they are</li>`
  : `<li class="person">${NAME[x]} (${x}), ${O.people.find(p => p.id === x).Z.toFixed(2)} m</li>`;
const FILES = ['scene.json', 'occlusion.json', 'picture.json', 'geo-E.json', 'guide-openings.json', ...O.bands.map(b => b.file), ...O.stoolBands.map(b => b.file), 'strip-check.json', 'strip-check-2x.png'];
// the Lead's check of the strip against the people (stripcheck8e.py): every frame at rest and along every walk
const SC = J('strip-check.json'), RS = SC.atRest.body, SH = SC.atRest.placeholderShapes390, WK = SC.walks;
if (SC.peoplePixelsCovered !== 0) throw new Error('the strip covers someone who should be in front of the cart: send the Lead the frame, not this page');
const rowOf = (who, frames, under, nearer, place) => `<tr><td>${who}</td><td class="num">${frames}</td><td class="num">${under}</td><td class="num">${nearer}</td><td>${place}</td><td class="num">0</td></tr>`;
const where = pid => O.order.indexOf(pid) < O.order.indexOf('stool-2') ? 'before stool-2' : 'after stool-2';
const checkRows = [rowOf('Juno, seated', 'at rest', `${n0(RS['Juno at rest'].underStrip)} (shape: ${n0(SH.Juno.underStrip)})`, RS['Juno at rest'].nearerThanTheCart, where('B2')),
  rowOf("Juno's walk", n0(WK.Juno.frames), `${WK.Juno.framesUnderTheStrip} frames`, WK.Juno.framesNearerThanTheCartUnderIt, where('B2')),
  rowOf("Atlas, at Atlas's bench", 'at rest', RS['Atlas at rest'].underStrip, RS['Atlas at rest'].nearerThanTheCart, where('B4')),
  rowOf("Atlas's walk", n0(WK.Atlas.frames), `${WK.Atlas.framesUnderTheStrip} frames`, WK.Atlas.framesNearerThanTheCartUnderIt, where('B4')),
  rowOf("Lyra, at Lyra's console", 'at rest', RS['Lyra at rest'].underStrip, RS['Lyra at rest'].nearerThanTheCart, where('B3')),
  rowOf("Lyra's walk", n0(WK.Lyra.frames), `${WK.Lyra.framesUnderTheStrip} frames`, `${WK.Lyra.framesNearerThanTheCartUnderIt} frames (${WK.Lyra.nearerSectionM.join('–')} m along it), up to ${n0(WK.Lyra.mostNearerPx)} px`, where('B3'))].join('');
const ph = k => S.phones[k];
const frontOf = (s, v) => s === 'B stool' ? `the stool layer's strip at the cart's right end ${pct(v)}` : `${esc(station(s))} ${pct(v)}`;
const peopleRows = O.people.map(p => { const r = O.report[p.id], q = ph('390x844').people.find(x => x.id === p.id), q4 = ph('430x932').people.find(x => x.id === p.id);
  return `<tr><td>${esc(r.name)} <span class="mono">${p.id}</span></td><td class="num">${p.Z.toFixed(2)} m</td><td class="num">${q.feet.join(', ')}<br>${q4.feet.join(', ')}</td><td class="num">${q.heightPx} · ${q4.heightPx} px</td><td>${Object.keys(r.inFrontOfThem).length ? Object.entries(r.inFrontOfThem).map(([s, v]) => frontOf(s, v)).join(', ') : 'nothing'}</td><td class="num">${pct(r.boxShare)} · ${pct(r.lowerShare)}</td><td class="num">${pct(r.faceHidden)} · ${pct(r.pressHiddenShare)}</td></tr>`; }).join('');
const partRows = O.parts.map(p => `<tr><td>${esc(station(p.station))}</td><td>${esc(p.from)}</td><td class="num">${n0(p.px)}</td><td class="num">${pct(p.inItsOutline)} · ${pct(p.outlineCovered)}</td><td class="num">${O.depthHits[p.station].depthM[0].toFixed(2)}–${O.depthHits[p.station].depthM[1].toFixed(2)} m</td><td class="num">${p.offPlan.centre.join(', ')} px</td></tr>`).join('');
const bandFigs = ALL.map(b => `<figure><div class="chk"><img src="${b.file}" alt="${esc(b.file)}: ${esc(b.stations.map(station).join(', '))}" width="1024" height="1536" loading="eager"></div><figcaption><code>${b.file}</code> · after ${names(b.after)} · before ${names(b.before)}</figcaption></figure>`).join('');
const fileRows = FILES.map(f => `<tr><td><a href="${f}"><code>${f}</code></a></td><td><span class="mono">${sha(f)}</span></td></tr>`).join('');
// the stool: its two band files cropped around it, the strip drawn with the cart outlined
const crop = [352, 890, 112, 140];   // x, y, w, h in painting pixels: the stool's layer (x 381–446, y 910–1019) with a margin
const stoolFig = `<svg class="stool-fig" viewBox="${crop.join(' ')}" role="img" aria-label="Juno's stool: its layer behind Juno, and the strip at the cart's right end outlined">
  ${O.stoolBands.map(b => `<image href="${b.file}" x="0" y="0" width="1024" height="1536"/>`).join('')}
  <rect x="${R.x[0]}" y="${R.y[0]}" width="${R.x[1] - R.x[0] + 1}" height="${R.y[1] - R.y[0] + 1}" fill="none" stroke="var(--accent2)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
const html = `<title>Room B View E Data</title>
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
.stool-row { display: grid; grid-template-columns: minmax(140px, 220px) 1fr; gap: 16px; align-items: start; }
@media (max-width: 560px) { .stool-row { grid-template-columns: 1fr; } }
.stool-fig { width: 100%; max-width: 220px; height: auto; display: block; border: 1px solid var(--line); border-radius: 8px; background: repeating-conic-gradient(var(--chk1) 0 25%, var(--chk2) 0 50%) 0 0 / 16px 16px; }
.note { border-left: 3px solid var(--accent); padding: 8px 12px; background: var(--surface); border-radius: 0 8px 8px 0; }
a { color: var(--accent); }
</style>
<div class="wrap">
  <header style="display:grid;gap:8px">
    <h1>Room B, view E: the people's data</h1>
    <p class="muted">Vega's view (sheet PV6-E, version 3), for the In-game animation builder. It gives where Juno, Atlas and Lyra stand on both phones, and the furniture and Juno's stool cut into depth bands around them. Mira is out of view (the chip). Vega's own bench and microscope are never drawn here, and the food capsule is not in this view.</p>
  </header>
  <section>
    <h2>Drawing order, far to near</h2>
    <ol class="order">${O.order.map(orderRow).join('')}</ol>
    <p class="muted">By depth alone (the Lead, 18 November): each furniture pixel is drawn after every person farther than it and before every person nearer, so the order holds while the figures move. The stool is Juno's seat, so it stays behind Juno. It has its own band files, each drawn just after the furniture band of the same number. ${O.conflictPx ? `${O.conflictPx} px conflict.` : 'No conflicts.'} The name tags go above every layer.</p>
  </section>
  <section>
    <h2>The bands</h2>
    <div class="bands">${bandFigs}</div>
    <p class="muted">Each band is a full painting-size RGBA layer (1024 × 1536), so it shares the plate's placement on each phone (scene.json: plate left, top, width, height). Under each band, a 2 px seam fill from the nearer bands of the same set closes the gap that scaling would open; the nearer band draws those pixels again on top.</p>
  </section>
  <section>
    <h2>Juno's stool</h2>
    <div class="stool-row">
      ${stoolFig}
      <div style="display:grid;gap:8px;min-width:0">
        <p>The stool was painted in its own step (PV6-E-4) and lifted as its own layer. It is Juno's seat: ${n0(C.seatBehindItsOwnerPx['B stool'] ?? 0)} of its pixels are nearer than Juno by depth and are kept behind Juno, in <code>stool-${O.stoolBands[0].band}.png</code>.</p>
        <p>Outlined: ${n0(R.px)} px (x ${R.x.join('–')}, y ${R.y.join('–')}) where step 3 repainted the cart's right end beside the stool, over the cart's own layer. There the stool's layer is never drawn under the cart pixel beneath it, so those pixels go in <code>stool-${R.toBands.join(', ')}.png</code>, just after <code>band-${R.toBands.join(', ')}.png</code>, as step 3 was painted over step 2. Against PV6-E-4 they differ by ${R.againstPV6E4.asDrawn.meanAbsDiff} on average (the lift's soft edges). With the cart's layer drawn over them instead, ${n0(R.againstPV6E4.furnitureOverTheStool.over16Px)} of the ${n0(R.px)} would differ by more than 16 (mean ${R.againstPV6E4.furnitureOverTheStool.meanAbsDiff}): step 2's seam at the cart's end would show again.</p>
        <p class="muted">The image builder notes a small fringe of unchanged wall and floor beside the post in the stool's layer; the Lead says it does not matter. It is drawn behind Juno with the rest of the stool.</p>
      </div>
    </div>
  </section>
  <section>
    <h2>The strip against the people</h2>
    <p>The Lead's check, 18 November. <code>stool-2.png</code> is drawn after Juno and Atlas, so no one who should be in front of the cart may be under it. Every frame of view E's people was measured: at rest, and along every walk to the food capsule and back (<code>visits-A1.json</code>, every 1 cm), each person as the visits' body, a cylinder 0.2 m in radius and 1.72 m tall. <b>0 people pixels covered.</b></p>
    <div class="table-scroll"><table><thead><tr><th>Who</th><th>Frames</th><th>Under the strip</th><th>Nearer than the cart there</th><th>Their place</th><th>Covered</th></tr></thead><tbody>${checkRows}</tbody></table></div>
    <p class="muted">The cart under the strip is ${SC.strip.cartDepthM[0].toFixed(2)} m away. Juno is under the strip only while farther than the cart: seated, and in the first ${WK.Juno.underSectionM[1]} m of Juno's walk. Lyra crosses in front of the cart's right end early in their walk, at ${WK.Lyra.depthM[0].toFixed(2)}–${WK.Lyra.depthM[1].toFixed(2)} m. They are always the nearest of the three, so their place stays after <code>stool-2.png</code> even with walkers sorted by depth, and the strip goes under them. Mira's walk is out of view. The crop below shows Lyra ${WK.Lyra.mostAt.atM} m along the walk, drawn in their place (left), and the strip pixels where Lyra is nearer than the cart, all under Lyra (right, red), at 2×. It shows the plate and bands (AI-generated), with Lyra's body drawn in code.</p>
    <figure><img src="strip-check-2x.png" alt="Lyra crossing in front of the cart's right end, drawn over the strip, and the strip pixels where Lyra is nearer than the cart" width="692" height="400" loading="lazy" style="width:100%;max-width:692px;height:auto;border-radius:8px;border:1px solid var(--line)"></figure>
  </section>
  <section>
    <h2>The people</h2>
    <div class="table-scroll"><table><thead><tr><th>Who</th><th>Depth</th><th>Feet, 390 · 430 (stage px)</th><th>Height</th><th>In front of them</th><th>Box · lower half hidden</th><th>Face · press area hidden</th></tr></thead><tbody>${peopleRows}</tbody></table></div>
    <p class="muted">Measured with the stand-in shapes in the slots, at the positions the camera report gives. scene.json has each slot's feet, head and radius, box, scale and press area on both phones, all checked against camera report E (version 2). Each person's own station is nearer than them in places, so their figure's “front” element goes just above the band the order names. Juno's stool is drawn behind Juno; only the strip at the cart's right end is in front of Juno, drawn with the cart.</p>
  </section>
  <section>
    <h2>The pieces against the plan</h2>
    <div class="table-scroll"><table><thead><tr><th>Piece</th><th>Lifted from</th><th>Pixels</th><th>In its outline · outline covered</th><th>Depth</th><th>Centre off the plan</th></tr></thead><tbody>${partRows}</tbody></table></div>
    <p class="muted">Checks: the bands over the plate give exactly the four layers over it (largest difference ${C.bandsAgainstLayers.maxAbsDiff}; the furniture bands alone, ${C.bandsAgainstLayers.furnitureOnly}). Against PV6-E-4 the mean difference is ${C.againstPlaced.meanAbsDiff} (p99 ${C.againstPlaced.p99}). Under the furniture, away from step 3's mask, PV6-E-3 and PV6-E-4 are identical (${C.pv6e3AgainstPv6e4UnderTheFurniture.differingPx} px differ). Each person lands in the same place on both phones.</p>
  </section>
  <section>
    <h2>Inputs</h2>
    <p class="note">The plate and the furnished pictures are AI-generated (the image session's PV6-E-1, PV6-E-3 and PV6-E-4, on the records page, version ${esc(PIC.records.version)}). The plate is the step-1 picture. The bands are cut from the four lifted layers, which the sheet's own tool reproduces byte for byte: lift E for the furniture, lift3 E for the stool. The records here keep hashes, not links.</p>
    <div class="table-scroll"><table><thead><tr><th>Input</th><th>sha256</th></tr></thead><tbody>
      <tr><td>PV6-E-1, the plate (step 1)</td><td><span class="mono">${PIC.plate.sha256}</span></td></tr>
      <tr><td>PV6-E-3, the furniture (step 2)</td><td><span class="mono">${PIC.placed2.sha256}</span></td></tr>
      <tr><td>PV6-E-4, with Juno's stool (step 3)</td><td><span class="mono">${PIC.placed.sha256}</span></td></tr>
      ${[...Object.entries(PIC.layers.pieces), ...Object.entries(PIC.layers3.pieces)].map(([s, v]) => `<tr><td>${esc(station(s))}: <code>${esc(v.file)}</code></td><td><span class="mono">${v.sha256}</span></td></tr>`).join('')}
      <tr><td>The furniture's lift record: records/PV6-E-3-lift.json</td><td><span class="mono">${PIC.layers.record.sha256}</span></td></tr>
      <tr><td>The stool's lift record: records/PV6-E-4-lift3.json</td><td><span class="mono">${PIC.layers3.record.sha256}</span></td></tr>
      <tr><td>Sheet PV6-E, version 3: its manifest</td><td><span class="mono">${PIC.sheet.sha256}</span></td></tr>
      <tr><td>Camera report E, version 2</td><td><span class="mono">${PIC.camera.sha256}</span></td></tr>
    </tbody></table></div>
  </section>
  <section>
    <h2>Files</h2>
    <div class="table-scroll"><table><thead><tr><th>File</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
    <p class="muted"><code>guide-openings.json</code> is the skylight as the camera sees it, in painting pixels: its glass outline, its mullions and its box. With the plate's placement in scene.json, it lets the shared voyage be clipped to the plate's black inside the opening. <code>geo-E.json</code> is the painting's camera, the stations' solids and the people's depths that the bands are cut by.</p>
  </section>
</div>`;
writeFileSync(DIR + 'page.html', html); console.log('page.html', html.length, 'chars; files', FILES.join(', '));
