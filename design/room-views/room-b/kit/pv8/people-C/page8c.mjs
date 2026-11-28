// View C's people data page (page8e.mjs and page8b.mjs, views E's and B's, for Lyra's view): what the In-game animation builder
// needs to put the people into Lyra's view (scene.json, the bands and their order, occlusion.json), the food capsule as PV6-C-4
// paints it (the hatch's corners and the glass, on both phones), the wall above Atlas's bench top moved behind everyone, and the
// skylight's and the wall window's masks. Step 4 (sheet C version 8: the jars' tops and the dispenser's left edge) joins when its
// picture passes: its parts in their own band files, fix-<b>.png (occlude8c.py), its numbers in their own section. Writes page.html.
// Generates nothing.
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => `${(100 * x).toFixed(1)}%`, n0 = x => Math.round(x).toLocaleString('en-GB'), f1 = x => (+x).toFixed(1);
const O = J('occlusion.json'), S = J('scene.json'), PIC = J('picture.json'), BE = J('bench-C.json'), MK = J('masks.json'), GO = J('guide-openings.json'), HC = J('hatch-C.json'), GL = J('glass-C.json');
const NAME = { B1: 'Mira', B2: 'Juno', B3: 'Lyra', B4: 'Atlas', B5: 'Vega' }, OWN = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' };
const station = s => s === 'D food capsule' ? "the food capsule on Atlas's bench" : s === 'D dispenser left edge' ? "the food capsule's left edge" : s.endsWith(' top') ? `the ${s.slice(2)} on Juno's cart` : s.startsWith('wall vent strip') ? `the ${s.slice(5)} at the foot of the back wall` : (([pl, ...n]) => `${OWN[pl]}'s ${n.join(' ')}`)(s.split(' '));
const C = O.check, R = C.step3RaisedOverTheFurniture, BW = O.benchWallStrip;
const KINDS = { band: O.bands, wall: O.wallBands, stool: O.stoolBands, capsule: O.capsuleBands, fix: O.fixBands ?? [] };
const S4 = !!PIC.layers4, F4 = O.check.step4, E4 = O.check.edge4, EJ = E4 ? J('edge4-C.json') : null, RG = O.check.againstPlacedByRegion, WORD = n => ({ 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' })[n] ?? String(n);
const fm = x => x >= 10 ? (+x).toFixed(1) : x >= 1 ? (+x).toFixed(2) : String(x);
const NLAYERS = [PIC.layers, PIC.layers3, PIC.layers4].filter(Boolean).reduce((n, l) => n + Object.keys(l.pieces).length, 0);
const ALL = Object.entries(KINDS).flatMap(([kind, bs]) => bs.map(b => ({ ...b, kind }))).sort((a, b) => O.order.indexOf(a.file.slice(0, -4)) - O.order.indexOf(b.file.slice(0, -4)));
const names = ids => ids.length ? ids.map(i => NAME[i]).join(', ') : 'nobody';
const fileOf = x => ALL.find(b => b.file === `${x}.png`);
const what = b => b.kind === 'wall' ? 'the two vent strips at the foot of the back wall: wall, behind everyone'
  : b.kind === 'stool' ? (b.band > O.people.findIndex(p => p.id === 'B2') ? "Juno's stool's edge over the cart, which step 3 repainted: drawn with the cart" : "Juno's stool, behind Juno: the seat")
  : b.kind === 'capsule' ? "the food capsule on Atlas's bench, drawn just after the bench's band"
  : b.kind === 'fix' ? (b.stations.every(x => x.endsWith(' top')) ? `step 4's fix: the ${b.stations.length === 3 ? 'three ' : ''}glass jars' tops on Juno's cart, drawn just after step 3's of this band` : b.stations.join() === 'D dispenser left edge' ? "the food capsule's left edge, drawn by code (edge4-C.json), right after the capsule" : `step 4's fix: ${esc(b.stations.map(station).join(', '))}`)
  : esc(b.stations.map(station).join(', ')) + (b.band === 0 && BW ? ` (with the wall above Atlas's bench top, ${n0(BW.px)} px, behind everyone)` : '');
const orderRow = x => fileOf(x) ? `<li><code>${x}.png</code>: ${what(fileOf(x))} (${n0(fileOf(x).px)} px)</li>`
  : x.endsWith(' front') ? `<li class="front">${NAME[x.split(' ')[0]]}'s “front” element, if their figure has one: a part of their figure drawn over their own station where it is nearer than they are</li>`
  : `<li class="person">${NAME[x]} (${x}), ${O.people.find(p => p.id === x).Z.toFixed(2)} m</li>`;
const FILES = ['scene.json', 'occlusion.json', 'picture.json', 'geo-C.json', 'guide-openings.json', ...ALL.map(b => b.file), 'bench-C.json', 'hatch-C.json', 'glass-C.json', ...(E4 ? ['edge4-C.json'] : []), 'masks.json', ...['skylight', 'window'].filter(n => typeof MK[n] === 'object').map(n => MK[n].file)];
const ph = k => S.phones[k];
const peopleRows = O.people.map(p => { const r = O.report[p.id], q = ph('390x844').people.find(x => x.id === p.id), q4 = ph('430x932').people.find(x => x.id === p.id);
  return `<tr><td>${esc(r.name)} <span class="mono">${p.id}</span>${q.placeholder ? '' : ' (figure)'}</td><td class="num">${p.Z.toFixed(2)} m</td><td class="num">${q.feet.join(', ')}<br>${q4.feet.join(', ')}</td><td class="num">${q.heightPx} · ${q4.heightPx} px</td><td>${Object.keys(r.inFrontOfThem).filter(s => r.inFrontOfThem[s] > 0).length ? Object.entries(r.inFrontOfThem).filter(([, v]) => v > 0).map(([s, v]) => `${esc(station(s))} ${pct(v)}`).join(', ') : 'nothing'}</td><td class="num">${pct(r.boxShare)} · ${pct(r.lowerShare)}</td><td class="num">${pct(r.faceHidden)} · ${pct(r.pressHiddenShare)}</td></tr>`; }).join('');
const partRows = O.parts.map(p => `<tr><td>${esc(station(p.station))}</td><td>${esc(p.from)}</td><td class="num">${n0(p.px)}</td><td class="num">${p.inItsOutline !== undefined ? `${pct(p.inItsOutline)} · ${pct(p.outlineCovered)}` : p.station.startsWith('wall') ? 'its plaque (no station)' : `its shape of step 4 (of ${esc(station(O.depthHits[p.station].of))})`}</td><td class="num">${typeof O.depthHits[p.station].depthM === 'string' ? 'wall' : `${[...new Set(O.depthHits[p.station].depthM.map(x => x.toFixed(2)))].join('–')} m`}</td><td class="num">${p.offPlan ? `${p.offPlan.centre.join(', ')} px` : '—'}</td></tr>`).join('');
const bandFigs = ALL.map(b => `<figure><div class="chk"><img src="${b.file}" alt="${esc(b.file)}: ${esc(b.stations.map(station).join(', '))}" width="1024" height="1536" loading="eager"></div><figcaption><code>${b.file}</code> · after ${names(b.after)} · before ${names(b.before)}</figcaption></figure>`).join('');
const fileRows = FILES.map(f => `<tr><td><a href="${f}"><code>${f}</code></a></td><td><span class="mono">${sha(f)}</span></td></tr>`).join('');
// the capsule: its band cropped around it, with the painted hatch and the measured glass drawn over it (painting pixels, at their centres)
const K = S.capsule, CB = O.capsuleBands[0], mid = p => [p[0] + 0.5, p[1] + 0.5];
const quad = K.painting.hatch.map(mid).map(p => p.join(',')).join(' '), gc = mid(K.painting.glass.centre);
const crop = [596, 766, 82, 112];   // x, y, w, h in painting pixels: the capsule's layer (x 611–662, y 778–865) with a margin
const capsuleFig = `<svg class="capsule-fig" viewBox="${crop.join(' ')}" role="img" aria-label="The capsule's layer, with the painted hatch outlined and the glass marked">
  <image href="${CB.file}" x="0" y="0" width="1024" height="1536"/>
  <polygon points="${quad}" fill="none" stroke="var(--accent)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
  <circle cx="${gc[0]}" cy="${gc[1]}" r="${K.painting.glass.radius}" fill="none" stroke="var(--accent2)" stroke-width="1" vector-effect="non-scaling-stroke"/>
  <circle cx="${gc[0]}" cy="${gc[1]}" r="0.8" fill="var(--accent2)"/></svg>`;
const capRows = ['390x844', '430x932'].map(k => { const c = ph(k).capsule; return `<tr><td>${k.replace('x', ' × ')}</td><td class="num">${c.hatch.map(p => `(${p.map(f1).join(', ')})`).join(' ')}</td><td class="num">${f1(c.hatchBox.x)}, ${f1(c.hatchBox.y)}, ${f1(c.hatchBox.w)} × ${f1(c.hatchBox.h)}</td><td class="num">(${c.glass.centre.map(f1).join(', ')}), r ${f1(c.glass.radius)}</td></tr>`; }).join('')
  + `<tr><td>Painting (pixel indices)</td><td class="num">${K.painting.hatch.map(p => `(${p.join(', ')})`).join(' ')}</td><td class="num">${K.painting.hatchBox.join(', ')}</td><td class="num">(${K.painting.glass.centre.join(', ')}), r ${K.painting.glass.radius}</td></tr>`;
const html = `<title>Room B View C Data</title>
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
.capsule-fig { width: 100%; max-width: 220px; height: auto; display: block; border: 1px solid var(--line); border-radius: 8px; background: repeating-conic-gradient(var(--chk1) 0 25%, var(--chk2) 0 50%) 0 0 / 16px 16px; }
.note { border-left: 3px solid var(--accent); padding: 8px 12px; background: var(--surface); border-radius: 0 8px 8px 0; }
a { color: var(--accent); }
</style>
<div class="wrap">
  <header style="display:grid;gap:8px">
    <h1>Room B, view C: the people's data</h1>
    <p class="muted">Lyra's view (sheet PV6-C, version ${PIC.sheet.version}), for the In-game animation builder. It gives where Mira, Juno and Atlas stand on both phones, the furniture and ${S4 ? "steps 3 and 4's" : "step 3's"} pieces cut into depth bands around them, the food capsule as it is painted, and the skylight's and the window's masks. Vega is out of view (the chip). Lyra's own console is never drawn here.</p>
    <p class="note">${S4 ? `These bands rebuild ${esc(PIC.placed.label)}, C's final picture (step 4)${E4 ? ', but for the food capsule\'s left edge, which is drawn by code' : ''}. The three glass jars' tops join the cart's band in their own file, ${O.fixBands.filter(b => b.stations.every(x => x.endsWith(' top'))).map(b => `<code>${b.file}</code>`).join(' and ')}, drawn just after the stool's edge. ${E4 ? `The capsule's left edge did not take in the edit, so the guide's own edge is drawn by code in its own file, <code>${E4.file}</code>, right after the capsule's (<code>edge4-C.json</code>). ` : ''}Every other layer file is as before.` : `These bands rebuild ${esc(PIC.placed.label)}, step 3's picture. Step 4 (sheet C version 8: the three glass jars' tops on the cart and the dispenser's left edge) is not in them yet. When its picture passes, its parts join the cart's and the capsule's bands. The other files stay as they are.`}</p>
  </header>
  <section>
    <h2>Drawing order, far to near</h2>
    <ol class="order">${O.order.map(orderRow).join('')}</ol>
    <p class="muted">By depth alone (the Lead, 18 November): each pixel is drawn after every person farther than it and before every person nearer, so the order holds while the figures move. Juno's stool is Juno's seat, so it stays behind Juno. The two vent strips are wall, behind everyone. Step 3's pieces have their own band files, each drawn just after the furniture band of the same number, and never under the furniture pixel they were painted over.${S4 ? " Step 4's jar tops take the cart's depth and have their own file, drawn just after step 3's of the same band, never under a pixel they were painted over." : ''}${E4 ? " The capsule's code-drawn edge has its own file too, drawn right after the capsule's." : ''} ${O.conflictPx ? `${O.conflictPx} px conflict.` : 'No conflicts.'} The name tags go above every layer.</p>
  </section>
  <section>
    <h2>The bands</h2>
    <div class="bands">${bandFigs}</div>
    <p class="muted">Each band is a full painting-size RGBA layer (1024 × 1536), so it shares the plate's placement on each phone (scene.json: plate left, top, width, height). Under each band, a 2 px seam fill from the nearer bands of the same set closes the gap that scaling would open; the nearer band draws those pixels again on top.</p>
  </section>
  <section>
    <h2>Atlas's bench: the wall above its top</h2>
    <p>As in view E, the bench's layer reached above the painted bench top. Step 2 re-painted the wall there, with the lower edge of the wall shelf (its board, the bottoms of its jars and books) and its brackets. That strip is wall: <b>${n0(BW.px)} px, now in <code>band-0.png</code>, behind everyone</b> (from bands ${Object.entries(BW.fromBands).map(([b, n]) => `${b}: ${n0(n)} px`).join(', ')}). The microscope, the test tubes in their rack and the coral jar stand on the bench and stay in front, traced along their ink outlines (bench-C.json). The bands still rebuild the layers exactly (largest difference ${C.bandsAgainstLayers.maxAbsDiff}).</p>
    <p>The painted top's back edge, in painting px (straight between the stretches where it shows: the bench's left end and right of the coral jar): ${BE.edge.polyline.map(([x, y]) => `(${x}, ${y})`).join(', ')}. On the 390 stage: ${BE.edge.phones['390x844'].polyline.map(([x, y]) => `(${x}, ${y})`).join(', ')}; on the 430 stage: ${BE.edge.phones['430x932'].polyline.map(([x, y]) => `(${x}, ${y})`).join(', ')}. Atlas's place spans stage x ${BE.edge.phones['390x844'].atlasRange.x.join('–')} on 390.</p>
    <p class="muted">The painted top is lower than the plan's ${BE.height.plansTopM} m: on the plan's back face it reads ${BE.height.at.filter(h => h.x >= 600).map(h => h.onTheBackFaceM.toFixed(2)).join(', ')} m at x ${BE.height.at.filter(h => h.x >= 600).map(h => h.x).join(', ')}. Atlas, with the stand-in shape: ${pct(O.report.B4.hiddenShare)} of the figure hidden, by the bench and the things on it.</p>
  </section>
  <section>
    <h2>The food capsule, as painted</h2>
    <div class="capsule-row">
      ${capsuleFig}
      <div style="display:grid;gap:8px;min-width:0">
        <p>Code follows the painting (the Lead's decision for view B, 18 November). The light, the shutter, the hatch's opening, the tray, the portion and the wrapper fit the painted hatch and the painted glass.</p>
        <p class="muted">The hatch is the face as PV6-C-4 paints it (hatch8c.py): from its frame line to its last bright row, from the middle of its left ramp to its dark right outline. View B's colour rule takes only its upper two thirds here, because the lower third is lit warm (hatch-C.json keeps both). The glass is measured from the capsule's layer (lens8.py, glass-C.json): the dark disc inside the lens's ring, its centre and the radius of a circle of the same area. ${S4 ? `Step 4 repaints neither. In ${esc(PIC.placed.label)}, ${F4.hatchFace.differingPx} of the face's ${n0(F4.hatchFace.px)} px differ from PV6-C-4, all in its first columns beside the edge band (the edit's 2 px feather); the capsule's layer keeps PV6-C-4's colours there, so the hatch the layers draw is the one measured${F4.hatchFace.sameCorners ? `, and re-measured on ${esc(PIC.placed.label)} by the same rule its corners are the same, (${F4.hatchFace.faceRuleBbox['PV6-C-5'].slice(0, 2).join(', ')})–(${F4.hatchFace.faceRuleBbox['PV6-C-5'].slice(2).join(', ')})` : ''}. The glass: ${F4.glass.differingPx} of ${n0(F4.glass.px)} px differ.` : 'Step 4 repaints neither.'} Outlined: the hatch's corners, top left, top right, bottom right and bottom left. Marked: the glass.</p>
      </div>
    </div>
    <div class="table-scroll"><table><thead><tr><th>Where</th><th>Hatch corners: TL, TR, BR, BL</th><th>Hatch box: x, y, w × h</th><th>Glass: centre, radius</th></tr></thead><tbody>${capRows}</tbody></table></div>
  </section>
  <section>
    <h2>Juno's stool and the vent strips</h2>
    <p>The stool was painted in step 3 (PV6-C-4) and lifted as its own layer. It is Juno's seat: ${n0(C.seatBehindItsOwnerPx['B stool'] ?? 0)} of its pixels are nearer than Juno by depth and are kept behind Juno. Its shape was trimmed by the cart's lift (sheet C version 7), so the glass jars on the cart stay in front of it. ${n0(R.px)} px of its soft edge lie over the cart's own layer (x ${R.x.join('–')}, y ${R.y.join('–')}); there it is never drawn under the cart, so those pixels go in <code>stool-${R.toBands.join(', ')}.png</code>, just after <code>band-${R.toBands.join(', ')}.png</code>.</p>
    <p>The two lit strips at the foot of the back wall were repainted in step 3 as plain vent grilles (sheet C version 6). They are wall, drawn behind everyone in <code>wall-0.png</code>.</p>
  </section>
  ${S4 ? `<section>
    <h2>Step 4: the jars' tops and the capsule's left edge</h2>
    <p>Step 4 (sheet C version ${PIC.sheet.version}) was to fix two things in PV6-C-4: the three glass jars on the cart, whose tops step 2 had blurred off at its mask's edge, and the food capsule's left side, which had no ink line. ${esc(PIC.placed4.label)} fixed the jars. Their tops are lifted from it over PV6-C-4 (lift4 C) and take the depth of the piece they belong to: they rise above the cart's solids, so they take the depth of the jars' lower halves in the cart's layer.</p>
    <div class="table-scroll"><table><thead><tr><th>Part</th><th>Lifted</th><th>Pixels (lift · in the layer)</th><th>Depth, as</th><th>Band</th></tr></thead><tbody>${Object.entries(PIC.layers4.pieces).map(([s, v]) => `<tr><td>${esc(station(s))}</td><td>lift4 C</td><td class="num">${n0(v.px)} · ${n0(O.depthHits[s].pixels)}</td><td class="num">${esc(station(O.depthHits[s].of))}, ${[...new Set(O.depthHits[s].depthM.map(x => x.toFixed(2)))].join('–')} m</td><td class="num">${F4.bands[s].bands.join(', ')} (its piece: ${F4.bands[s].itsPieceBands.join(', ')})</td></tr>`).join('')}</tbody></table></div>
    <p class="muted">Away from step 4's shapes (grown 6 px), ${esc(PIC.placed4.label)} is PV6-C-4 in every pixel (${F4.step3AgainstStep4AwayFromIt.differingPx} px differ), so the earlier layers hold. ${F4.raisedOverEarlierPx ? `${n0(F4.raisedOverEarlierPx)} px of step 4 lay over an earlier pixel of a higher band and were raised to it.` : 'No pixel of step 4 had to be raised over an earlier one.'} Juno, with the stand-in shape: ${pct(O.report.B2.hiddenShare)} of the figure hidden, ${pct(Object.entries(O.report.B2.inFrontOfThem).filter(([k]) => k.endsWith(' top')).reduce((n, [, v]) => n + v, 0))} by the jars' tops, which now stand in front of Juno; their face stays clear and their press area's centre shows (${pct(O.report.B2.pressHiddenShare)} of the press area hidden).</p>
    ${E4 ? `<p><b>The capsule's left edge, drawn by code.</b> ${esc(PIC.placed4.label)}'s edit did not take there: it changed ${n0(PIC.layers4.notLifted['D dispenser left edge'].changedPx)} px in the edge's shape, all in parts under the lift's ${n0(PIC.layers4.notLifted['D dispenser left edge'].minPartPx)} px, and the soft streaks into the books remain. So the Lead had it fixed in code, with no further generation (18 November). The guide's own drawing goes into its own file, <code>${E4.file}</code>, drawn right after the capsule's layer, opaque: a 2 px line of ${EJ.line.hex} (rgb ${EJ.line.rgb.join(', ')}) at columns ${EJ.line.columns.join('–')}, rows ${EJ.line.rows.join('–')}, from under the rounded top's corner down to the bench; and above the hatch (rows ${EJ.housing.rows.join('–')}), the housing's colour, rgb ${EJ.housing.rgb.join(', ')}, at columns ${EJ.housing.columns.join('–')}. The hatch's face (from column ${EJ.leftAsPainted.hatchFace.fromColumn}, rows ${EJ.leftAsPainted.hatchFace.rows.join('–')}) and the rim's corner (rows ${EJ.leftAsPainted.rimCorner.rows.join('–')}) stay as painted. Every number is the guide's (fix4-C.json). ${n0(E4.drawnPx)} px are drawn: ${n0(E4.overTheCapsulesLiftPx)} over the capsule's own layer and ${n0(E4.newPx)} just outside it, in the capsule's band (${E4.band}). <code>${E4.drawnAfter}</code> is unchanged, byte for byte (<span class="mono">${E4.capsuleLayerSha256}</span>); <code>${E4.file}</code>: <span class="mono">${E4.sha256}</span>.</p>` : ''}
  </section>
  ` : ''}<section>
    <h2>The skylight and the wall window</h2>
    <p>The painted glass of each opening, cut to the plate's black (masks8.py, PV6-A's skylight method): inside the guide's opening widened by 16 px, ${esc(MK.plate.label)}'s pixels darker than lightness 0.15, opened by 1 px and closed by 2 px. <code>mask-skylight.png</code> and <code>mask-window.png</code> are 1024 × 1536, white, with the mask in alpha (softened by 0.7 px), on the plate's placement. The window, on the left wall and cut by the picture's edge, shows the sky on the one voyage's clock, as the skylight does.</p>
    <div class="table-scroll"><table><thead><tr><th>Opening</th><th>Mask px</th><th>Overlap with the guide (IoU)</th><th>Guide covered</th><th>Within 2 px of the guide</th><th>Box, painting px</th><th>Visible box, 390 · 430 stage</th></tr></thead><tbody>${['skylight', 'window'].filter(n => typeof MK[n] === 'object').map(n => `<tr><td>${n === 'window' ? 'the wall window' : 'the skylight'}</td><td class="num">${n0(MK[n].maskPx)}</td><td class="num">${MK[n].iou}</td><td class="num">${pct(MK[n].guideCovered)}</td><td class="num">${pct(MK[n].maskWithinOfGuide['2px'])}</td><td class="num">${MK[n].bbox.join(', ')}</td><td class="num">${(b => `${b.x}, ${b.y}, ${b.w} × ${b.h}`)(S.phones['390x844'].openings[`${n}Visible`])}<br>${(b => `${b.x}, ${b.y}, ${b.w} × ${b.h}`)(S.phones['430x932'].openings[`${n}Visible`])}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted">The window's painted glass sits a little inside the guide's (its frame is painted wider), which is why its overlap is lower than the skylight's. guide-openings.json holds the window's glass from the plan (its four corners in painting px: ${GO.window.glass.map(([x, y]) => `(${x}, ${y})`).join(', ')}) beside the skylight's glass and cross. scene.json's openings give each one's box on both stages (window, skylight) and the masks' visible boxes (windowVisible, skylightVisible).</p>
  </section>
  <section>
    <h2>The people</h2>
    <div class="table-scroll"><table><thead><tr><th>Who</th><th>Depth</th><th>Feet, 390 · 430 (stage px)</th><th>Height</th><th>In front of them</th><th>Box · lower half hidden</th><th>Face · press area hidden</th></tr></thead><tbody>${peopleRows}</tbody></table></div>
    <p class="muted">Measured with each slot's picture (Mira's figure; the stand-in shapes for Juno and Atlas), at the positions the camera report gives. scene.json has each slot's feet, head and radius, box, scale and press area on both phones, all checked against camera report C (version 2). Each person's own station is nearer than them in places, so their figure's “front” element goes just above the band the order names.</p>
  </section>
  <section>
    <h2>The pieces against the plan</h2>
    <div class="table-scroll"><table><thead><tr><th>Piece</th><th>Lifted from</th><th>Pixels</th><th>In its outline · outline covered</th><th>Depth</th><th>Centre off the plan</th></tr></thead><tbody>${partRows}</tbody></table></div>
    <p class="muted">Checks: the bands over the plate give exactly the ${WORD(NLAYERS)} layers${E4 ? ' and the code-drawn edge' : ''} over it (largest difference ${C.bandsAgainstLayers.maxAbsDiff}; the furniture bands alone, ${C.bandsAgainstLayers.furnitureOnly}). Against ${esc(PIC.placed.label)} the mean difference is ${C.againstPlaced.meanAbsDiff} (p99 ${C.againstPlaced.p99}): the lift's soft edges${RG ? `; away from step 4's shapes ${fm(RG.elsewhere.meanAbsDiff)}, inside the jars' shapes ${fm(RG.jarsShapes.meanAbsDiff)}${E4 ? `, and inside the edge's shape ${fm(RG.edgeShape.meanAbsDiff)}, where the code draws the guide's edge instead of the edit's soft streaks` : ''}` : ''}. Under the furniture away from step 3's shapes, PV6-C-3 and PV6-C-4 differ in ${C.step2AgainstStep3UnderTheFurniture.differingPx} px${S4 ? `; away from step 4's, PV6-C-4 and ${esc(PIC.placed4.label)} in ${F4.step3AgainstStep4AwayFromIt.differingPx}` : ''}.</p>
  </section>
  <section>
    <h2>Inputs</h2>
    <p class="note">The plate and the furnished pictures are AI-generated (the image session's PV6-C-2, PV6-C-3${S4 ? ', PV6-C-4 and PV6-C-5' : ' and PV6-C-4'}, on the records page, version ${esc(PIC.records.version)}). The plate is the step-1 picture. The bands are cut from the ${WORD(NLAYERS)} lifted layers: lift C for the furniture, lift3 C for step 3's pieces${S4 ? `, lift4 C for step 4's jar tops${E4 ? '; the capsule\'s left edge is drawn by code (edge4-C.json)' : ''}` : ''}.</p>
    <div class="table-scroll"><table><thead><tr><th>Input</th><th>sha256</th></tr></thead><tbody>
      <tr><td>PV6-C-2, the plate (step 1)</td><td><span class="mono">${PIC.plate.sha256}</span></td></tr>
      <tr><td>PV6-C-3, the furniture (step 2)</td><td><span class="mono">${PIC.placed2.sha256}</span></td></tr>
      <tr><td>PV6-C-4, step 3</td><td><span class="mono">${PIC.placed3.sha256}</span></td></tr>${S4 ? `
      <tr><td>${esc(PIC.placed4.label)}, step 4</td><td><span class="mono">${PIC.placed4.sha256}</span></td></tr>` : ''}
      ${[...Object.entries(PIC.layers.pieces), ...Object.entries(PIC.layers3.pieces), ...Object.entries(PIC.layers4?.pieces ?? {})].map(([s, v]) => `<tr><td>${esc(station(s))}: <code>${esc(v.file)}</code></td><td><span class="mono">${v.sha256}</span></td></tr>`).join('')}
      <tr><td>Camera report C, version 2</td><td><span class="mono">${PIC.camera.sha256}</span></td></tr>
      <tr><td>Sheet PV6-C, version ${PIC.sheet.version}: its manifest</td><td><span class="mono">${PIC.sheet.sha256}</span></td></tr>
    </tbody></table></div>
  </section>
  <section>
    <h2>Files</h2>
    <div class="table-scroll"><table><thead><tr><th>File</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
  </section>
</div>`;
writeFileSync(DIR + 'page.html', html); console.log('page.html', html.length, 'chars; files', FILES.join(', '));
