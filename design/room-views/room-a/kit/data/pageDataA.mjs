// Room A view A's data page (version 1): geo-A.json and marks-A.json, what each holds and its sha256, with the two marks pictures
// (RA-A-4, AI-generated, with the marks drawn over it by code; labelled so on the picture and in the captions). Version 4 (the Lead,
// 14:36 on 19 November): the plate, RA-A-4 with the cabinet's right frame drawn in code (sheet RA-A version 7), as a file of its own,
// with scene.json's plate entry (version 2) as its record. Writes pub/ with the page (data-a.html) and its files. Generates
// nothing. Usage: node pageDataA.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/';
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex'), J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const G = J('geo-A.json'), M = J('marks-A.json'), SC = J('scene.json'), OC = J('occlusion.json'), H = M.hatch, O = H.opening;
const FILES = [['img/ra-A-4-frame.png', 'The plate, view A’s picture: RA-A-4, AI-generated, with the cabinet’s right frame drawn in code (sheet RA-A version 7), accepted by the Lead. Its record is scene.json’s plate entry.'], ['geo-A.json', 'The painting’s camera; the five stations in view as solids, in room metres, with the faces the stage draws and each solid’s depth range; the three people in view at their spots, with their depth.'],
  ['marks-A.json', 'The hatch’s opening as painted, with its near and far edges; the stage’s deck-level outline; Echo’s wire point. Each is given in painting pixels and on the three phones’ stages.'],
  ['scene.json', 'The three phones as Room B’s views have them: each one’s slice of the painting, the plate on its stage, f and the horizon; the people’s slots at the camera report’s spots (feet, unit, head, box, press area, depth); the out-of-view chip; the food unit’s painted hatch and glass.'],
  ['occlusion.json', 'Who covers whom: the order far to near, any painted piece in front of a person, and every overlap measured, by each pixel’s depth.'],
  ['img/marks-A-hatch.png', 'For this page: RA-A-4 with the hatch’s marks (AI-generated picture, marks drawn by code).'], ['img/marks-A-wire.png', 'For this page: RA-A-4 with Echo’s wire point (AI-generated picture, marks drawn by code).']];
const SRC = { 'img/marks-A-hatch.png': 'marks-A-hatch.png', 'img/marks-A-wire.png': 'marks-A-wire.png', 'img/ra-A-4-frame.png': 'ra-A-4-frame.png' };   // plateA.py's copy
if (sha(SRC['img/ra-A-4-frame.png']) !== SC.plate.sha256) throw new Error("the plate is not the file scene.json's plate entry names");
const fileRows = FILES.map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="h"><code>${sha(SRC[f] ?? f)}</code></td></tr>`).join('');
const PHONES = Object.keys(O.phones);
const pt = p => `${p[0]}, ${p[1]}`;
const cornerRows = O.painting.map((p, i) => `<tr><td>${esc(O.corners[i])}</td><td class="n">${pt(p)}</td>${PHONES.map(k => `<td class="n">${pt(O.phones[k][i])}</td>`).join('')}</tr>`).join('');
const edgeWords = (list) => list.map(e => `${O.corners[e.from].split(' (')[0]} to ${O.corners[e.to].split(' (')[0]}: ${e.side}`);
const stRows = Object.entries(G.stations).map(([k, s]) => `<tr><td>${esc(k)}</td><td class="n">${s.solids.map(o => o.depthM.join('–')).join(', ')} m</td><td class="n">${s.solids.reduce((n, o) => n + o.faces.length, 0)}</td></tr>`).join('');
const pplRows = G.people.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.place)}</td><td class="n">${p.x}, ${p.z}</td><td class="n">${p.Z} m</td></tr>`).join('');
const lid = G.stations['E hatch lid'].solids[0].depthM, W = M.wire;
const html = `<title>Room A view A data</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* a data sheet in Room A's blue steel: one column, tables in their own scroll boxes, two marks pictures */
:root { --bg: #F2F5F9; --panel: #FFFFFF; --sunk: #E6ECF3; --fg: #14202E; --muted: #536173; --line: #D5DEE8; --accent: #2D609E; --accent-soft: #E1EAF5;
  --f-body: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; --f-head: "Space Grotesk", Inter, system-ui, sans-serif; --f-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0E1520; --panel: #16202E; --sunk: #1C2939; --fg: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--fg); font: 400 15px/1.55 var(--f-body); }
.wrap { max-width: 980px; margin: 0 auto; padding-block: 22px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1, h2 { font-family: var(--f-head); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: 27px; line-height: 1.15; } h2 { font-size: 20px; margin-top: 32px; }
p { margin: 10px 0 0; max-width: 72ch; } .dim { color: var(--muted); font-size: 13.5px; }
.status { display: inline-block; margin-top: 12px; padding: 6px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-weight: 600; font-size: 13.5px; }
.pics { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 14px; align-items: start; }
figure { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 8px; min-width: 0; }
figure img { display: block; width: 100%; height: auto; border-radius: 6px; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
.scroll { overflow-x: auto; margin-top: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 11px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: var(--sunk); }
tr:last-child td { border-bottom: 0; } td.n { white-space: nowrap; font-family: var(--f-mono); font-size: 12.5px; } td.h code { font-size: 11.5px; }
code { font-family: var(--f-mono); font-size: 12.5px; overflow-wrap: anywhere; }
ul { margin: 10px 0 0; padding-left: 20px; max-width: 72ch; } li { margin-top: 6px; }
.wide table { min-width: 640px; }
.foot { margin-top: 36px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--muted); }
</style>
<div class="wrap">
<header>
<h1>Room A view A data</h1>
<span class="status">For the Motion builder · version 4 · the framed plate · sheet RA-A version 4’s geometry</span>
<p>The room data for view A, from Vega’s place: the furniture as solids, the hatch’s opening where Lyra’s hands and wrench go in, and the point on Echo’s cabinet the wire comes from. The geometry is sheet RA-A version 4’s, the one RA-A-3 and RA-A-4 were painted on: the 0.88 m cabinet without a door, 0.8 to 1.95 m up, and the 0.48 m lid at 80° from the deck beyond the hatch. The marks are measured on RA-A-4. The plate is RA-A-4 with the cabinet’s right frame drawn in code, and differs from it only at x 527 to 542, y 639 to 880, so they hold for the plate too.</p>
</header>
<h2>The files</h2>
<div class="scroll wide"><table><thead><tr><th>File</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
<h2>The plate</h2>
<div class="pics"><figure style="max-width: 380px"><img src="img/ra-A-4-frame.png" alt="AI-generated picture RA-A-4 with the cabinet's right frame drawn in code: Room A from Vega's place, the electrical cabinet on the back wall, the food unit on the left wall and the open floor hatch" width="1024" height="1536" loading="lazy"><figcaption><b>AI-generated (RA-A-4), its cabinet’s right frame drawn in code.</b> View A’s picture, the plate every phone shows.</figcaption></figure></div>
<ul><li><b>File:</b> <code>img/ra-A-4-frame.png</code>, 1024 × 1536, sha256 <code>${SC.plate.sha256}</code>; its pixels (8-bit RGB, row by row), sha256 <code>${SC.plate.pixelsSha256}</code></li>
<li><b>What it is:</b> ${esc(SC.plate.record)}. Accepted by ${esc(SC.plate.accepted)}.</li>
<li><b>Against RA-A-4</b> (sha256 <code>${SC.plate.start.sha256}</code>): nothing differs outside x ${SC.plate.changed.x.join(' to ')}, y ${SC.plate.changed.y.join(' to ')}. The frame’s record, <code>frame-A.json</code> on the sheet, has sha256 <code>${SC.plate.frameRecord.sha256}</code>.</li></ul>
<h2>The hatch’s opening</h2>
<p>${esc(O.how[0].toUpperCase() + O.how.slice(1))}. ${esc(H.use[0].toUpperCase() + H.use.slice(1))}.</p>
<div class="pics"><figure><img src="img/marks-A-hatch.png" alt="AI-generated picture RA-A-4: the hatch, with its painted opening marked, near edges in gold and far edges in cyan, and the stage's outline dashed" width="760" height="820"><figcaption><b>AI-generated (RA-A-4), marks drawn by code.</b> The hatch at 2 times. Gold: the near edges. Cyan: the far edges. White, dashed: the stage’s deck-level outline. Pink: your wrench point on the big pipe’s collar, (378, 1293).</figcaption></figure></div>
<div class="scroll wide"><table><thead><tr><th>Corner</th><th>Painting px</th>${PHONES.map(k => `<th>${esc(k.replace('x', ' × '))} stage</th>`).join('')}</tr></thead><tbody>${cornerRows}</tbody></table></div>
<ul>${edgeWords(H.nearEdges).map(t => `<li><b>Near:</b> ${esc(t)}</li>`).join('')}${edgeWords(H.farEdges).map(t => `<li><b>Far:</b> ${esc(t)}</li>`).join('')}</ul>
<p class="dim">${esc(H.stageOutline.note[0].toUpperCase() + H.stageOutline.note.slice(1))}. Its corners in painting pixels: ${H.stageOutline.painting.map(p => `(${pt(p)})`).join(', ')}.</p>
<h2>Echo’s wire point</h2>
<div class="pics"><figure style="max-width: 360px"><img src="img/marks-A-wire.png" alt="AI-generated picture RA-A-4: the cabinet's left cables, with the wire point marked beside Echo's slot edge" width="480" height="480"><figcaption><b>AI-generated (RA-A-4), marks drawn by code.</b> 4 times. Pink: the wire point. White, dashed: Echo’s slot edge, x 420.</figcaption></figure></div>
<ul><li><b>Painting:</b> (${pt(W.painting)})${PHONES.map(k => `; ${esc(k.replace('x', ' × '))}: (${pt(W.phones[k][0])})`).join('')}</li>
<li><b>Room:</b> ${W.room.join(', ')} m, on the cabinet’s front face, ${W.room[1]} m up</li>
<li><b>On:</b> ${esc(W.on)}. ${esc(W.painted[0].toUpperCase() + W.painted.slice(1))}.</li>
<li><b>Near Echo:</b> ${esc(W.near)}.</li></ul>
<h2>The solids</h2>
<p>Every station in view, by the sheet’s layer names, in room metres (x east, y up, z north). Depth is along the camera’s axis, from ${G.camera.C.map(v => +v.toFixed(2)).join(', ')}. The lid, ${lid.join(' to ')} m deep, is nearer the camera than a visitor at the food unit (2.59 m, the camera report’s visit), so it stands in front of the visitor’s shins where they overlap.</p>
<div class="scroll"><table><thead><tr><th>Station</th><th>Depth</th><th>Faces</th></tr></thead><tbody>${stRows}</tbody></table></div>
<div class="scroll"><table><thead><tr><th>Person</th><th>Place</th><th>Spot (x, z)</th><th>Depth</th></tr></thead><tbody>${pplRows}</tbody></table></div>
<h2>The phones</h2>
<p>From <code>scene.json</code>. A phone’s stage pixel is the painting pixel less the slice’s origin, over its scale. Every slot is checked against the camera report, and the export stops if one differs.</p>
<div class="scroll wide"><table><thead><tr><th>Phone</th><th>Stage</th><th>Scale</th><th>Slice (painting px)</th><th>Plate on the stage</th><th>f, horizon</th></tr></thead><tbody>${Object.entries(SC.phones).map(([k, p]) => `<tr><td>${esc(k.replace('x', ' × '))}</td><td class="n">${p.W} × ${p.SH}</td><td class="n">${p.k}</td><td class="n">${p.slice.x0}, ${p.slice.y0} – ${p.slice.x1}, ${p.slice.y1}</td><td class="n">${p.plate.left}, ${p.plate.top}; ${p.plate.width} × ${p.plate.height}</td><td class="n">${+p.f.toFixed(2)}, ${+p.hy.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>
<div class="scroll wide"><table><thead><tr><th>Person</th><th>Depth</th><th>Head</th>${Object.keys(SC.phones).map(k => `<th>${esc(k.replace('x', ' × '))}: feet, unit</th>`).join('')}</tr></thead><tbody>${SC.phones['390x844'].people.map((q, i) => `<tr><td>${esc(q.name)}</td><td class="n">${q.Z} m</td><td>${esc(q.headKind)}</td>${Object.values(SC.phones).map(p => `<td class="n">${p.people[i].feet.join(', ')}; ${p.people[i].u}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
<p>The food unit, measured on RA-A-4: its paper-white hatch at painting x 220.5 to 278.5, y 755.5 to 840.5, and its glass at (${SC.unit.painting.glass.c.join(', ')}), about ${SC.unit.painting.glass.r} px across the dark disc and ${SC.unit.painting.glass.ringR} px to the ring’s edge. On the 390 stage that is the hatch from (${SC.phones['390x844'].unit.hatch[0].join(', ')}) to (${SC.phones['390x844'].unit.hatch[2].join(', ')}), and the glass at (${SC.phones['390x844'].unit.glass.c.join(', ')}). Every phone has its own in the file.</p>
<h2>Who covers whom</h2>
<p>From <code>occlusion.json</code>. ${esc(OC.rule[0].toUpperCase() + OC.rule.slice(1))}. ${esc(OC.note)}.</p>
<div class="scroll wide"><table><thead><tr><th>Person</th><th>Piece</th><th>Overlap</th><th>Its depth there</th><th>Person’s depth</th><th>Drawn</th></tr></thead><tbody>${OC.overlaps['390x844'].map(r => `<tr><td>${esc(r.person)}</td><td>${esc(r.piece)}</td><td class="n">${r.overlapPx.toLocaleString('en-GB')} px</td><td class="n">${r.pieceDepthHereM ? r.pieceDepthHereM.join('–') + ' m' : '–'}</td><td class="n">${r.personZ} m</td><td>${esc(r.drawn)}${r.withinTolPx ? ` (${r.withinTolPx} px level with the feet, within 2 cm)` : ''}</td></tr>`).join('')}</tbody></table></div>
<p class="dim">At 390 × 844; the other two phones give the same pieces and counts within 1%. The order, far to near: ${esc(OC.order.join(', '))}.</p>
<footer class="foot"><p>The plate is RA-A-4, a picture the image tool made, with the cabinet’s right frame drawn in code. The two marks pictures are RA-A-4 (sha256 <code>${M.picture.sha256}</code>) with marks drawn over it by code. All three are labelled AI-generated: the marks pictures on the picture and in their captions, the plate in its caption and its record. They are for this page only: never an input and never an asset. The data is test data for the owner’s pages, made by code from the stage and the painting; nothing here is committed.</p></footer>
</div>`;
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB + 'img', { recursive: true });
writeFileSync(PUB + 'data-a.html', html);
for (const [f] of FILES) copyFileSync(DIR + (SRC[f] ?? f), PUB + f);
console.log('data-a.html', html.length, 'chars;', FILES.length, 'files');
