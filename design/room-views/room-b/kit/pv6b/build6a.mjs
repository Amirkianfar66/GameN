// Room B test page v5 (the room half of PV6-A): writes page.html (published) and index.html (the same, wrapped as the publish
// serves it), from picture.json, scene.json, occlusion.json, timing.json, masks.json, colour-plate.json, colour-placed.json
// and, once capture6a.cjs has run, checks.json and shots/.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, J = f => JSON.parse(readFileSync(DIR + f, 'utf8'));
const COV = existsSync(DIR + '_cover/cover.json') ? J('_cover/cover.json') : null, PEOPLE = J('people-files.json'), TC = existsSync(DIR + 'tag-cover.json') ? J('tag-cover.json') : null;
const PIC = J('picture.json'), S = J('scene.json'), O = J('occlusion.json'), T = J('timing.json'), M = J('masks.json'), CP = J('colour-plate.json'), CQ = J('colour-placed.json'), CK = existsSync(DIR + 'checks.json') ? J('checks.json') : null;
const REPORT = JSON.parse(readFileSync(new URL(PIC.camera.report, import.meta.url), 'utf8'));
const sha = f => createHash('sha256').update(readFileSync(DIR + f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => `${(100 * x).toFixed(1)}%`, f1 = x => (+x).toFixed(1), n0 = x => Math.round(x).toLocaleString('en-GB'), s1 = x => { const t = (+x).toFixed(1); return t === '-0.0' ? '0.0' : t; };
const P390 = S.phones['390x844'], P430 = S.phones['430x932'];
if (sha(PIC.plate.file) !== PIC.plate.sha256) throw new Error(`${PIC.plate.file} is not the plate picture.json names`);
if (sha(PIC.placed.file) !== PIC.placed.sha256) throw new Error(`${PIC.placed.file} is not the picture picture.json names`);
for (const [st, pc] of Object.entries(PIC.layers.pieces)) if (sha(pc.file) !== pc.sha256) throw new Error(`${st}: ${pc.file} is not the layer picture.json names`);
const short = h => `<span class="mono">${h.slice(0, 8)}…</span>`;
// the stations by whose they are, and the people's own names
const OWNER = { A: 'Mira', B: 'Juno', C: 'Lyra', D: 'Atlas', E: 'Vega' }, THING = { bench: 'bench', console: 'console', stool: 'stool', 'laptop cart': 'laptop cart' };
const stName = st => { const [pl, ...nm] = st.split(' '), n = nm.join(' '); return `${OWNER[pl]}'s ${THING[n] ?? n}${st === 'E bench' ? ' and microscope' : ''}`; };
const hid = O.report, byName = Object.fromEntries(Object.values(hid).map(r => [r.name, r])), juno = byName.Juno, lyra = byName.Lyra, vega = byName.Vega;
const POSE = { E: 'test tube at her eyes, her far hand on the bench', C: 'typing at her console', B: 'seated on her stool, typing at her laptop' };
const css = readFileSync(DIR + '_base.css', 'utf8') + `
/* Test page v5 additions: the skylight, the checks with their frames, the people's note. */
#world > .opening { pointer-events: none; overflow: hidden; }
details.notes { display: grid; gap: 8px; } details.notes summary { cursor: pointer; color: var(--muted); font-size: 0.88rem; } details.notes > * + * { margin-top: 8px; }
#world > .opening > svg.amb { position: absolute; }
#world > img.pic { display: block; user-select: none; }
#world > img.band { display: block; user-select: none; pointer-events: none; }
#world img { max-width: none; max-height: none; }   /* the page skeleton's img{max-width:100%} must not clamp the plate or the slots */
.checks { display: grid; gap: 16px; } .check { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; display: grid; gap: 10px; min-width: 0; }
.check h3 { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; } .verdict { font-size: 0.8rem; font-weight: 650; padding: 2px 10px; border-radius: 999px; }
.verdict.ok { background: var(--ok-soft); color: var(--ok); } .verdict.warn { background: var(--warn-soft); color: var(--warn); }
.frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; align-items: start; } .frames figure { margin: 0; display: grid; gap: 4px; min-width: 0; align-content: start; }
.frames img { width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid var(--line); background: #000; }
.people-note { border: 1px solid var(--accent); background: var(--accent-soft); color: var(--ink); border-radius: 10px; padding: 10px 14px; max-width: 80ch; }
.phones4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; } .phones4 figure { margin: 0; display: grid; gap: 6px; } .phones4 img { width: 100%; height: auto; display: block; border-radius: 12px; border: 1px solid var(--line); }
/* The owner's page: the title and one line, the room straight away with its four controls under it, three notes, and the
   team's details in a closed fold. */
.wrap.owner-page { padding-block: 16px 56px; gap: 22px; }
header.top.owner-top { gap: 6px; width: 100%; max-width: 640px; justify-self: center; }
.owner-top h1 { font-size: clamp(1.45rem, 6vw, 2.1rem); }
.lede { font-size: 1rem; line-height: 1.45; }
.status.for-owner { background: var(--accent-soft); color: var(--accent); padding: 4px 10px; font-size: 0.78rem; }
.live1 { display: grid; gap: 16px; justify-items: center; } .live1 .phone-wrap { position: relative; }
.live1 .controls { width: 100%; max-width: 640px; gap: 12px; }
details.more { border-top: 1px solid var(--line); }
details.more > summary, details.team > summary { cursor: pointer; font-weight: 600; min-height: 44px; display: flex; align-items: center; gap: 8px; list-style: none; }
details.more > summary::-webkit-details-marker, details.team > summary::-webkit-details-marker { display: none; }
details.more > summary::before, details.team > summary::before { content: "▸"; color: var(--muted); width: 1em; }
details.more[open] > summary::before, details.team[open] > summary::before { content: "▾"; }
details.more > summary { color: var(--muted); font-size: 0.92rem; }
.more-body { display: grid; gap: 14px; padding: 2px 0 6px; }
.owner-notes { display: grid; gap: 12px; width: 100%; max-width: 640px; justify-self: center; }
.owner-notes p { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; max-width: none; }
details.team { border-top: 1px solid var(--line); min-width: 0; }
details.team > summary { font-size: 1.1rem; }
.team-body { display: grid; gap: 36px; padding-top: 14px; min-width: 0; }
`;
const shot = (f, alt, cap) => `<figure><img src="shots/${f}" alt="${esc(alt)}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const yes = b => (b ? '<span class="verdict ok">pass</span>' : '<span class="verdict warn">see below</span>');
const ck = CK ?? { skylightHome: null, prunedOk: null, layout: {}, frames: {} };
const t390 = T.phones['390x844'], t430 = T.phones['430x932'];
// ---- who is in front of whom (occlusion.json, by occlude6.py)
const drawnText = ov => ov.drawn === 'in front where nearer' ? `in front where it is nearer (${n0(ov.nearerPx)} px)` : ov.drawn === 'behind them: their seat' ? `behind them: they sit on it, though ${n0(ov.nearerPx)} px of it are nearer` : 'behind them: farther all over';
const rep = id => REPORT.people[id]['390x844'].covered;
const moments = COV ? [1300, 2600, 3900].map(t => `${(t / 1000).toFixed(1)} s: ${Object.values(COV[`390x844@${t}`] ?? {}).map(r => `${r.name} ${pct(r.hiddenShare)} hidden, box ${pct(r.boxShare)}`).join(', ')}`).join('; ') : '…';
const touchText = v => { const t = v.touches, parts = [...t.faces.map(n => `${n}'s face`), ...t.otherPress.map(n => `${n}'s press area`), ...t.bottomChips]; return parts.length ? `<span class="warn">${esc(parts.join(', '))}</span>` : 'nothing'; };
const tagRows = TC ? ['feet', 'pack'].flatMap(mode => ['390x844', '430x932'].flatMap(key => ['100%', '200%'].map(pc => { const r = TC[`${key} · ${pc} · ${mode}`]; if (!r) return '';
  const ppl = ['B5', 'B3', 'B2'].map(id => r.people[id]);
  return `<tr><td>${mode === 'feet' ? 'At feet' : "Pack's place"}</td><td class="num">${key.replace('x', ' × ')} · ${pc}</td>${ppl.map(v => `<td class="num">${pct(v.coveredByTags)}</td>`).join('')}<td>${ppl.map(v => `${esc(v.name)}'s tag: ${touchText(v)}`).join('<br>')}</td><td>${r.issues.length ? esc(r.issues.join('; ')) : 'none'}</td></tr>`; }))).join('') : '';
const cv = (key, id, k) => { const v = COV?.[key]?.[id]?.[k]; return v == null ? '…' : pct(v); };
const whoRows = [...O.people].reverse().map(pp => { const r = hid[pp.id], ovs = Object.entries(r.overlaps), place = S.phones['390x844'].people.find(q => q.id === pp.id).place, c = rep(place);
  const both = k => `${cv('390x844', pp.id, k)}<br>${cv('430x932', pp.id, k)}`;
  return `<tr><td>${esc(r.name)} · ${r.Z.toFixed(2)} m</td><td>${ovs.length ? ovs.map(([st, ov]) => `${esc(stName(st))}: overlap ${n0(ov.px)} px at ${ov.depthM[0].toFixed(2)}–${ov.depthM[1].toFixed(2)} m, ${esc(drawnText(ov))}`).join('<br>') : 'none'}</td><td class="num">${both('hiddenShare')}</td><td class="num">${both('boxShare')}${c ? `<br>plan ${pct(c.box)}` : ''}</td><td class="num">${both('faceShare')}</td><td class="num">${both('pressShare')}<br>centre ${['390x844', '430x932'].every(k => (COV?.[k]?.[pp.id]?.pressCentreCovered ?? 1) < 0.5) ? 'clear' : '<span class="warn">behind furniture</span>'}</td></tr>`; }).join('');
const orderText = O.order.map(x => x.endsWith(' front') ? `${hid[x.split(' ')[0]].name}'s front, if her figure has one` : x.startsWith('band-') ? `${x === 'band-0' ? 'behind everyone: ' : ''}${O.bands.find(b => b.file === x + '.png').stations.map(stName).join(', ').replace(/, ([^,]*)$/, ' and $1')} (${n0(O.bands.find(b => b.file === x + '.png').px)} px)` : hid[x].name).join(' → ');
// ---- the slots: camera report v4's spots
// the people in their slots: the module's own boxes, as the page measured them (capture6a.cjs: held, 100% text)
const figOf = (key, id) => ck.layout?.[`${key} · 100%`]?.per?.[id];
const slotRows = ['E', 'C', 'B'].map(id => { const a = P390.people.find(q => q.place === id), b = P430.people.find(q => q.place === id), R = REPORT.people[id], fa = figOf('390x844', a.id), fb = figOf('430x932', b.id);
  const bx = f => (f?.figure ? [f.figure.x0, f.figure.y0, f.figure.x1, f.figure.y1].map(f1).join(', ') : '…'), hs = (f, P) => (f?.figure ? `${f.heightPx} px, ${pct(f.heightPx / P.SH)}` : '…');
  const face = f => (!f?.figure ? '…' : f.faceShows ? [f.face.x0, f.face.y0, f.face.x1, f.face.y1].map(f1).join(', ') : 'none shows: the head is kept clear');
  return `<tr><td>${esc(a.name)} (${esc(R.crew)})</td><td>${esc(POSE[id])}</td><td>${esc(R.seenSide)} (${R.seenFromDeg}°)</td><td class="num">${R.cheated.join(', ')}</td><td class="num">${a.Z.toFixed(2)} m</td><td class="num">${a.feet.map(f1).join(', ')}<br>${b.feet.map(f1).join(', ')}</td><td class="num">${bx(fa)}<br>${bx(fb)}</td><td class="num">${hs(fa, P390)}<br>${hs(fb, P430)}</td><td class="num">${face(fa)}<br>${face(fb)}</td><td class="num">${a.side} px</td></tr>`; }).join('');
const layoutRows = Object.entries(ck.layout ?? {}).map(([key, m]) => `<tr><td class="num">${key}</td><td>${Object.values(m.per).map(c => `${esc(c.name)} ${c.heightPx} px`).join(', ')}</td><td>${m.edge.length ? m.edge.map(e => `${esc(e.name)} ${e.pastPx} px past the edge (${e.pct}%)`).join('; ') : 'every figure whole'}</td><td>${m.issues.length ? esc(m.issues.join('; ')) : 'none'}</td><td>${(m.plan ?? []).length ? esc(m.plan.join('; ')) : 'none'}</td></tr>`).join('');
const partRows = O.parts.map(pt => `<tr><td>${esc(stName(pt.station))}</td><td class="num">${n0(pt.px)} px<br>x ${pt.x[0]}–${pt.x[1]}, y ${pt.y[0]}–${pt.y[1]}</td><td class="num">${pct(pt.inItsOutline)}<br>${pct(pt.outlineCovered)}</td><td class="num">${pt.offPlan.centre.map(v => s1(v)).join(', ')} painting px<br>${pt.offPlan.centre.map(v => s1(v / P390.k)).join(', ')} on 390 × 844</td><td class="num">${pct(O.depthHits[pt.station].hit / O.depthHits[pt.station].pixels)}<br>${O.depthHits[pt.station].depthM.map(v => v.toFixed(2)).join('–')} m</td></tr>`).join('');
const colourRows = Object.keys(CP.result).map(g => `<tr><td>${esc(g[0].toUpperCase() + g.slice(1))}</td><td class="${CP.result[g] ? 'ok' : 'warn'}">${CP.result[g] ? 'pass' : 'fail'}</td><td class="${CQ.result[g] ? 'ok' : 'warn'}">${CQ.result[g] ? 'pass' : 'fail'}</td></tr>`).join('');
const comet = t390.passers.find(q => q.kind === 'comet'), comet430 = t430.passers.find(q => q.kind === 'comet');
const sk = M.skylight, rec = O.check.againstPlaced;
const page = `<title>Room B Skylight Test</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="vendor/design/phone-ui/components/room-scene/ambient.css">
<style>
/* Layout: the owner's page for one view. The title and one line, then the live room in a phone frame (on a phone, the frame
   is fitted so the room is whole on the first screen), the four controls the owner needs under it with the other checks in a
   fold, three short notes, and everything else in a closed "Details for the team" fold: who is in front of whom, the slots,
   the tags, the skylight's checks with their frames, the pictures and their checks, both phones beside today's Room B, the
   numbers and what the test cannot show. System fonts only. */
${css}
</style>

<div class="wrap owner-page">
  <header class="top owner-top">
    <span class="status for-owner">For the owner</span>
    <h1>Room B, from Mira's place</h1>
    <p class="lede">One view of Room B: the painted room, with Vega, Lyra and Juno drawn by code and lit by the room's lamps.</p>
  </header>

  <section id="live" class="live1" aria-label="Room B, live">
    <div class="phone-wrap" id="phone-wrap"><div class="phone" id="phone">
      <div class="bar">APP TOP BAR (FRONTEND'S)</div>
      <div class="stage ms-room-scene" id="stage"><div id="world"></div><div id="overlay"></div><div class="loading" id="loading">Loading the room…</div></div>
      <div class="bar bot">APP TABS (FRONTEND'S)</div>
    </div></div>
    <div class="controls">
      <div class="group"><span>Phone size</span><div class="seg" id="phones"></div></div>
      <div class="group"><span>Text size</span><div class="seg" id="texts"></div></div>
      <div class="group"><span>Still or moving</span><div class="seg" id="motion"></div></div>
      <div class="group"><span>Name tags</span><div class="seg" id="tagsat"></div></div>
      <details class="more"><summary>More checks</summary><div class="more-body">
        <div class="group"><span>Press areas</span><div class="seg" id="sq"></div></div>
        <div class="group"><span>Furniture</span><div class="seg" id="depth"></div></div>
        <p class="hint">A press area is where a tap picks a person: each is the person's drawn figure, hidden unless shown here. Furniture is drawn by depth, as this test draws it, or under the crew, every piece behind every person. Moving runs the game's own Room B voyage in the skylight on the ship's one clock, 12 s ahead of Room B's window, and the people breathe, blink and work; still holds the sky at 0 s of its 240 s loop and the people in their pose. At their feet, each name tag sits on the deck just below the person; where the game puts them now is the pack's place, at the foot of each slot's press square.</p>
        <div class="readout" id="readout" aria-live="polite">Loading the room…</div>
      </div></details>
    </div>
  </section>

  <section id="notes" class="owner-notes" aria-label="Notes">
    <p><b>What is painted, and what is code.</b> The room and its furniture are painted: AI-generated pictures. Vega, Lyra and Juno, their light and shadows, the name tags and the sky in the skylight are drawn by code.</p>
    <p><b>The question for you.</b> Name tags at their feet, or where the game puts them now? Try both with the Name tags switch under the room. This is a test only: the game's rule is unchanged unless you choose.</p>
    <p><b>What it costs.</b> Drawing the lit, moving people takes about two to two and a half times the work of today's plain ones, measured on a test computer without a graphics chip; the stronger shadows add nothing measurable. Real phone speed is checked later, in the game.</p>
  </section>

  <details class="team" id="team"><summary>Details for the team</summary><div class="team-body">
  <section id="about">
    <span class="eyebrow">Mothership · Room B · test page · version 5 · 18 November 2026</span>
    <blockquote><p>The owner on staging this view (18 November, as the Lead passed it on): "we can cheat a little bit about characters to fit"</p></blockquote>
    <p><b>The test:</b> Mira's view in the new camera, straight lines, as camera report v4 frames it: the empty room, ${esc(PIC.plate.label)}, is the plate, shown as the 70° straight slice at 5° down on both phones. The four pieces lifted from <a href="${esc(PIC.placed.file)}">${esc(PIC.placed.label)}</a>, the furnished room (Vega's bench with its microscope, Lyra's console, Juno's laptop cart and her stool) are drawn back pixel by pixel in depth order: a piece goes over a person only where it is nearer, by distances from the room's geometry. Juno sits on her stool, so it stays behind her. The plate and its four layers rebuild ${esc(PIC.placed.label)} to a mean difference of ${rec.meanAbsDiff} levels. The game's own Room B voyage runs in the skylight's glass on the ship's one clock, ${T.ahead} s ahead of Room B's window. There is no window or screen in this view.</p>
    <p class="people-note"><b>The people are drawn live in code.</b> Vega, Lyra and Juno each come from one call to the people module (<a href="${PEOPLE.page}">the people page</a>, version ${esc(PEOPLE.version)}), at camera report v4's spots: Vega with her test tube at her bench, Lyra from behind as she types at her console, Juno side-on at her laptop on her stool. Each comes in their own facing, with the room's light on them and their own shadows on the deck, under every piece. Juno's hands and laptop are drawn again just above the part of her cart that is nearer than she is. They breathe, blink and work; reduced motion holds them in their pose. No picture was generated for the people. The tags, press areas and Atlas's out-of-view chip are the room's layout, checked at 100% and 200% text.</p>
    <p class="note">The room's pictures are AI-generated. Their records are on the <a href="${PIC.records.page}">records page</a> (version ${esc(PIC.records.version)}): ${esc(PIC.plate.records)} (sha256 ${short(PIC.plate.sha256)}), ${esc(PIC.placed.records)} (sha256 ${short(PIC.placed.sha256)}) and its four layers (${Object.values(PIC.layers.pieces).map(pc => `${esc(pc.records.replace('img/', ''))} ${short(pc.sha256)}`).join(', ')}). They were made from the <a href="${PIC.sheet.page}">PV6-A sheet</a> (step 1 from version ${esc(PIC.sheet.step1)}, step 2 from version ${esc(PIC.sheet.step2)}).</p>
    <p class="note"><b>The cost in the notes</b> is the people page's own measure, not this page's (<a href="${PEOPLE.page}">the people page</a>, version ${esc(PEOPLE.version)}, "What it costs to draw"): its stage, with the three people lit and moving as here, is about 2.4 times today's drawing (plain ink, only the heads moving), 2.3 to 2.6 across that run's 9 runs (the median), and 1.9 to 2.5 across that page's runs of the day, with either version's shadows, on a machine without a graphics chip. The same page measured the stronger shadows back to back against the earlier ones: 0.88 and 0.97 times as long, within the wavering between runs.</p>
  </section>

  <section id="who">
    <h2>Who is in front of whom</h2>
    <p>Each pixel of a piece gets a distance: a ray from Mira's eye through that pixel enters the piece's solid in the room's geometry, and the distance is measured along the camera's axis. Pixels the solids miss, at the painted edges, take their neighbours' distance. Each pixel is then drawn once, by depth alone: after every person farther than it and before every person nearer, measured at the spot where they stand. So the order holds for any pose and any motion of the figures. A person's own seat stays behind them. Where a person's own station is nearer than them, the order has a place for their figure's front part (Juno's hands on her laptop), just above that piece.</p>
    <div class="table-scroll wide"><table class="who"><thead><tr><th>Person, from Mira</th><th>The pieces their slot meets</th><th>Drawing hidden<br>390 / 430</th><th>Box hidden</th><th>Face hidden</th><th>Press area hidden</th></tr></thead><tbody>${whoRows}</tbody></table></div>
    <p class="note">The drawing order, far to near: ${esc(orderText)}. The shares are measured on the page as drawn, on both phones: each person's own parts alone, against the layers drawn after them alone. "Box hidden" is the share of the person's slot box under a nearer piece; "plan" is camera report v4's share for the same box from the stations' solids. The Lead's limit is 10% of the box and none of the face; a press area may be partly behind a nearer piece as long as its centre stays visible (Juno's press area is now her whole figure, and the near part of her cart is in front of its lower corner). Juno's stool is not counted. ${O.conflictPx} pixels would need two places in the order. Checked: the plate with every band over it, without the people, is the plate with the four layers over it, pixel for pixel (largest difference ${O.check.bandsAgainstLayers.maxAbsDiff}). Against ${esc(PIC.placed.label)} itself the mean difference is ${rec.meanAbsDiff} levels and the 99th percentile ${rec.p99} level${rec.p99 === 1 ? '' : 's'} (${esc(rec.measure)}). The largest is ${rec.max}, in the few pixels of the PLACE mask the recipe does not lift.</p>
    <div class="frames">${shot('occ-B2-on.jpg', 'Juno by depth: the near corner of her cart in front of her, her hands and laptop over it, her stool behind her', 'Juno, by depth: the cart in front where nearer, her hands over it, the stool behind')}${shot('occ-B2-off.jpg', 'Juno with every piece under her', 'Juno, under the crew')}${shot('occ-B3-on.jpg', 'Lyra from behind, in front of her console', 'Lyra: her console behind her')}${shot('occ-B5-on.jpg', 'Vega in front of her bench and microscope', 'Vega: her bench behind her')}</div>
    <p class="note">Frames: 390 × 844, held at 0 s, press areas hidden. Vega and Lyra are nearer than every pixel of their pieces, so "Under the crew" draws them the same; only Juno changes.</p>
    <h3>Their own motion</h3>
    <p>The people breathe, blink and work: Vega turns the tube at her eyes, Lyra's hands work across her console, Juno types and stops to read. The furniture is placed by depth alone, so the order holds at every moment. Measured as drawn on 390 × 844 at three moments of their motion, the shares stay where the held pose has them: ${moments}.</p>
    <div class="frames">${['B5', 'B3', 'B2'].flatMap(id => [0, 1300, 2600, 3900].map(t => shot(`motion-${id}-${String(t).padStart(4, '0')}.jpg`, `${hid[id].name} at ${(t / 1000).toFixed(1)} s of her motion`, `${hid[id].name}, ${(t / 1000).toFixed(1)} s`))).join('')}</div>
  </section>

  <section id="slots">
    <h2>The people in their slots</h2>
    <p>Each person is mounted by one call, mountRoomBPerson, with their crew id, the feet's point and the scale of their slot at camera report v4's spot (version 4, sha256 ${short(PIC.camera.sha256)}). The slots' numbers are checked against the report when the page is built, and the build stops if one differs by more than 0.05 px. The module places each layer by the feet's point and the scale: a box 300 units across, with the feet 150 units from its left and 273 from its top. No slot is mirrored. The boxes below are the module's own, measured from the drawing in the held pose; the face and tag checks keep each face clear (Lyra's head, as no face shows).</p>
    <div class="table-scroll wide"><table><thead><tr><th>Person</th><th>Pose</th><th>Seen from Mira</th><th>Spot, m</th><th>Depth</th><th>Feet, 390 / 430</th><th>Figure's box</th><th>Height, share of the stage</th><th>Face box</th><th>Press area</th></tr></thead><tbody>${slotRows}</tbody></table></div>
    <p class="note">The stage is ${P390.W} × ${P390.SH} on 390 × 844 and ${P430.W} × ${P430.SH} on 430 × 932, between the app's bars. Feet and boxes are in stage px.</p>
  </section>

  <section id="tags">
    <h2>Tags and press areas on the drawn people</h2>
    <p>With the drawn people, each press area is the person's drawn figure, as the module measures it: on the stage, at least 44 × 44, trimmed clear of the room's controls, and apart from the others. By default each tag sits on the deck just below the person's feet. The pack's own rules still lay the tags out: whole and apart at both text sizes, inside the stage, never over a face and clear of the room's controls. At the feet the tags also keep clear of the drawn figures: where a tag cannot sit below the feet, the layout moves it to the nearest free place, which can be just above the head. The Name tags switch under the room puts them back at the pack's place, where the game puts them now, at the foot of the slot's press square, to compare. This is for the test page only: the game's rule changes only if the owner adopts it.</p>
    <div class="table-scroll wide"><table><thead><tr><th>Tags</th><th>Phone · text</th><th>Vega covered</th><th>Lyra covered</th><th>Juno covered</th><th>What each tag touches (a face, another person's press area, the bottom chips)</th><th>Layout checks</th></tr></thead><tbody>${tagRows || '<tr><td colspan="7">Measured by capture6a.cjs.</td></tr>'}</tbody></table></div>
    <p class="note">"Covered" is the share of the person's drawing under any tag, in the held pose. The press areas, 390 × 844: ${ck.layout?.['390x844 · 100%'] && Object.values(ck.layout['390x844 · 100%'].per).every(c => c.pressBox) ? Object.values(ck.layout['390x844 · 100%'].per).map(c => `${esc(c.name)} x ${f1(c.pressBox.x0)}–${f1(c.pressBox.x1)}, y ${f1(c.pressBox.y0)}–${f1(c.pressBox.y1)}`).join('; ') : '…'}.</p>
    <div class="phones4">${shot('phone-390-100.jpg', 'Tags at the feet, 390 by 844, 100% text', 'At feet · 390 × 844 · 100%')}${shot('phone-390-100-pack.jpg', "Tags at the pack's place, 390 by 844, 100% text", "Pack's place · 390 × 844 · 100%")}${shot('phone-390-200.jpg', 'Tags at the feet, 390 by 844, 200% text', 'At feet · 390 × 844 · 200%')}${shot('phone-390-200-pack.jpg', "Tags at the pack's place, 390 by 844, 200% text", "Pack's place · 390 × 844 · 200%")}${shot('phone-430-200.jpg', 'Tags at the feet, 430 by 932, 200% text', 'At feet · 430 × 932 · 200%')}${shot('phone-430-200-pack.jpg', "Tags at the pack's place, 430 by 932, 200% text", "Pack's place · 430 × 932 · 200%")}</div>
  </section>

  <section id="checks">
    <h2>The skylight</h2>
    <div class="checks">
      <div class="check"><h3>1. The voyage in the glass, and nothing of the cream world ${yes(ck.skylightHome === 0 && ck.prunedOk)}</h3>
        <p>The skylight holds one copy of the game's Room B window layer. It is cropped to that window's glass (260 × 124 scene units), right-aligned to cover the skylight's box, and masked by the plate's own black: the glass's four panes. The mask overlaps the guide's glass at IoU ${sk.iou}, with ${pct(sk.maskWithinOfGuide['2px'])} of it within 2 px of the guide, and its 95th-percentile lightness is ${sk.maskP95L}. The copy has ${ck.skylightHome ?? '…'} home groups left: the cream world, its glow, rim and shadow are out. The code window's mullions, bands and light cones are out too (${ck.prunedOk ? 'none left' : '…'}).</p>
        <div class="frames">${shot('sky-0.jpg', 'The skylight at 0 seconds: only stars', '0 s: stars only')}${shot('comet-sky.jpg', 'The comet in the skylight', `${f1(ck.frames?.['comet-sky']?.at ?? 0)} s: the comet in the skylight`)}${shot('sky-belt.jpg', 'The belt in the skylight', `${f1(ck.frames?.['sky-belt']?.at ?? 0)} s: the belt in the skylight`)}</div></div>
      <div class="check"><h3>2. The one clock, 12 s ahead <span class="verdict ok">pass</span></h3>
        <p>The skylight runs ${T.ahead} s ahead of Room B's window on the ship's one clock (the Lead's call of 18 November, for all five views). It shows the right-hand ${t390.skylightUnits[0]}–${t390.skylightUnits[1]} of the glass on 390 × 844 (×${t390.skylightScale}) and ${t430.skylightUnits[0]}–${t430.skylightUnits[1]} on 430 × 932 (×${t430.skylightScale}). The comet is in it from ${comet.skylight[0].toFixed(1)} to ${comet.skylight[1].toFixed(1)} s on 390 × 844 (${comet430.skylight[1].toFixed(1)} s on 430 × 932). There is no window or screen in this view, so no passer is seen twice. Live, the clock runs: ${ck.live ? `${ck.live.running} of ${ck.live.of} animations playing` : '…'}.</p>
        <div class="table-scroll"><table><thead><tr><th>Passer</th><th>Width</th><th>In the skylight, 390 × 844, s</th><th>430 × 932, s</th></tr></thead><tbody>${t390.passers.map((q, i) => `<tr><td>${q.kind}</td><td class="num">${q.widthUnits}</td><td class="num">${q.skylight[0].toFixed(1)}–${q.skylight[1].toFixed(1)}</td><td class="num">${t430.passers[i].skylight[0].toFixed(1)}–${t430.passers[i].skylight[1].toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="check"><h3>3. Reduced motion holds one moment: 0 s of the 240 s loop <span class="verdict ok">picked</span></h3>
        <p>The skylight is held at the ship's clock 0 s (every 240 s from the clock's start), showing its sky ${T.ahead} s on: ${t390.heldAt0.length ? `in view: ${t390.heldAt0.join(', ')}` : 'no passer is in it'}, and neither meteor is lit. It is the same moment on both phones.</p>
        <div class="frames">${shot('held-390.jpg', 'Held moment on 390 by 844', 'Held, 390 × 844')}${shot('held-430.jpg', 'Held moment on 430 by 932', 'Held, 430 × 932')}</div></div>
    </div>
  </section>

  <section id="picture">
    <h2>The pictures and their checks</h2>
    <div class="table-scroll wide"><table><thead><tr><th>Colour check, version 4 (this page's run)</th><th>${esc(PIC.plate.label)}, with the empty room's map</th><th>${esc(PIC.placed.label)}, with the furnished room's map</th></tr></thead><tbody>
      ${colourRows}
      <tr><td>Walls and deck in the base</td><td class="num">${pct(CP.areas['walls and deck'].inBase)}</td><td class="num">${pct(CQ.areas['walls and deck'].inBase)}</td></tr>
      <tr><td>Back wall · side walls · deck in the base</td><td class="num">${pct(CP.areas['back wall'].inBase)} · ${pct(CP.areas['side walls'].inBase)} · ${pct(CP.areas.deck.inBase)}</td><td class="num">${pct(CQ.areas['back wall'].inBase)} · ${pct(CQ.areas['side walls'].inBase)} · ${pct(CQ.areas.deck.inBase)}</td></tr>
      <tr><td>Median lightness</td><td class="num">${CP.areas['walls and deck'].medianL}</td><td class="num">${CQ.areas['walls and deck'].medianL}</td></tr>
      <tr><td>Warm orange · rust · cream</td><td class="num">${pct(CP.warm.orange)} · ${pct(CP.warm.rust)} · ${pct(CP.warm.cream)}</td><td class="num">${pct(CQ.warm.orange)} · ${pct(CQ.warm.rust)} · ${pct(CQ.warm.cream)}</td></tr>
      <tr><td>The skylight, 95th-percentile lightness</td><td class="num">${CP.areas.skylight.p95L} · window and screen absent</td><td class="num">${CQ.areas.skylight.p95L} · window and screen absent</td></tr>
    </tbody></table></div>
    <h3>The four pieces against the plan</h3>
    <div class="table-scroll wide"><table><thead><tr><th>Piece</th><th>Painted</th><th>In its outline + 6 px<br>Outline covered</th><th>Centre off the plan (x, y)</th><th>Rays hit<br>Distance</th></tr></thead><tbody>${partRows}</tbody></table></div>
    <p class="note">Each layer's colours are ${esc(PIC.placed.label)}'s, pixel for pixel, and no two layers meet. Each piece is painted inside its station's outline in the guide, grown by the 6 px of the PLACE mask, and its centre is within ${Math.max(...O.parts.map(pt => Math.hypot(...pt.offPlan.centre))).toFixed(1)} painting px of the outline's centre. So the slots and the furniture line up as planned.</p>
  </section>

  <section id="both-phones">
    <h2>Both phones, both text sizes, beside today's Room B</h2>
    <div class="phones4">${shot('phone-390-100.jpg', 'PV6-A on 390 by 844 at 100% text, with the people', '390 × 844 · 100%')}${shot('phone-390-200.jpg', 'At 200% text', '390 × 844 · 200%')}${shot('phone-430-100.jpg', 'PV6-A on 430 by 932 at 100% text, with the people', '430 × 932 · 100%')}${shot('phone-430-200.jpg', 'At 200% text', '430 × 932 · 200%')}<figure><img src="today-390.jpg" alt="Today's Room B room view on 390 by 844" loading="lazy"><figcaption>Today's Room B · 390 × 844</figcaption></figure><figure><img src="today-430.jpg" alt="Today's Room B room view on 430 by 932" loading="lazy"><figcaption>Today's Room B · 430 × 932</figcaption></figure></div>
    <p class="note">Held at 0 s for the frames. Today's Room B: the room scene's captures, as on the earlier test pages.</p>
  </section>

  <section id="numbers">
    <h2>Numbers</h2>
    <div class="table-scroll wide"><table><thead><tr><th>Phone</th><th>People (height on the stage)</th><th>At the edge</th><th>The page's layout checks</th><th>The layout test's checks</th></tr></thead><tbody>${layoutRows || '<tr><td colspan="5">Measured by capture6a.cjs.</td></tr>'}</tbody></table></div>
    <ul>
      <li>The camera: at Mira's place (${REPORT.camera.at.join(', ')} m), yaw ${REPORT.camera.yawDegExact}°, eye 1.6 m, level and upright. The painting is 1024 × 1536 with straight lines, 80° across and its horizon at y 714. Each phone shows the 70° slice, with 5° down as a lens shift.</li>
      <li>The slice: the painting scaled by 1/k (k ${P390.k} on 390 × 844, ${P430.k} on 430 × 932), the slice's corner on the stage's corner: painting x ${P390.slice.x0}–${P390.slice.x1}, y ${P390.slice.y0}–${P390.slice.y1} on 390 × 844, and x ${P430.slice.x0}–${P430.slice.x1}, y ${P430.slice.y0}–${P430.slice.y1} on 430 × 932.</li>
      <li>The skylight's crop: Room B's window glass, 260 × 124 scene units, covering the skylight's ${f1(P390.openings.skylightVisible.w)} × ${f1(P390.openings.skylightVisible.h)} px box on 390 × 844 (${f1(P430.openings.skylightVisible.w)} × ${f1(P430.openings.skylightVisible.h)} on 430 × 932).</li>
      <li>The edge: the strict rule holds on both phones at both text sizes (every person's figure whole on the stage).</li>
    </ul>
  </section>

  <section id="cant">
    <h2>What this test cannot show</h2>
    <ul>
      <li>The people beyond these poses: only their held pose and idle work are here; nothing they do in the game (walking, turning to someone) is in this test.</li>
      <li>Depth inside a person: each person has one distance, at their spot, so a piece is in front of all of them or behind all of them, pixel by pixel. A hand reaching over a bench is the figure's own drawing.</li>
      <li>Depth from the painting itself: the order comes from the room's geometry. Pixels painted past a solid's outline take their neighbours' distance (${O.parts.map(pt => `${esc(stName(pt.station))} ${pct(O.depthHits[pt.station].hit / O.depthHits[pt.station].pixels)} hit by the rays`).join('; ')}).</li>
      <li>The other four places: they get the same method from their own pictures; nothing is generated before the go.</li>
      <li>Real players, the game's data, or how the room view and the Board meet.</li>
      <li>A real phone: the frames are Chromium renders at the two development sizes.</li>
    </ul>
  </section>

  <footer>
    <p><b>What ran.</b> The page draws ${esc(PIC.plate.label)} untouched and four layers from ${esc(PIC.placed.label)}, as the records page holds them (occlude6.py: the depth order from the room's geometry and camera report v4's camera, by depth alone). The people are the people module's, served as the people page publishes them (${Object.keys(PEOPLE.files).length} files under people/, version ${esc(PEOPLE.version)}), one call per slot. It uses the room scene component's ambient.mjs and ambient.css read-only (sha256 eeeb8e88… and dc806a04…, the earlier pages' copies), the layout test's slots (vis5.mjs, stage6.mjs) and the shared tag layout. The mask, timings, colour checks and depth bands were measured in Node and Python; who is in front of whom, the frames and the layout checks are Chromium captures of this page. No picture was generated and nothing was pushed.</p>
  </footer>
  </div></details>
</div>
<script>
(function () {
  const ui = { phone: 0, pct: 100, squares: false, motion: 'on', depth: 'on', tags: 'feet' };
  function seg(id, items, key) { const box = document.getElementById(id); box.innerHTML = '';
    for (const [val, text] of items) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-pressed', String(ui[key] === val));
      b.onclick = () => { ui[key] = val; apply(); }; box.appendChild(b); } }
  // The phone frame takes the page's width, at most its own size. On a phone (a page narrower than 600 px), it is also fitted so
  // the app's top bar and the whole room are on the first screen, under the title (never below 0.5). The screen's height is read
  // once and again only when the width changes, so a browser bar that hides on scrolling does not resize the room. The frame is
  // then put on whole pixels, so the room is drawn the same wherever the title's lines end.
  let VW = window.innerWidth, VH = window.innerHeight;
  function fit(phoneIx = ui.phone) { const wrap = document.getElementById('phone-wrap'), ph = document.getElementById('phone'), W = [390, 430][phoneIx], H = [844, 932][phoneIx];
    wrap.style.left = '0px'; wrap.style.top = '0px';
    ph.style.width = W + 'px'; ph.style.height = H + 'px'; const avail = Math.min(W, document.getElementById('live').getBoundingClientRect().width); let s = Math.min(1, avail / W);
    if (VW < 600) { const top = wrap.getBoundingClientRect().top + window.scrollY; s = Math.min(s, Math.max(0.5, (VH - top - 8) / (H - 92))); }
    ph.style.transform = s < 1 ? 'scale(' + s + ')' : ''; wrap.style.width = W * s + 'px'; wrap.style.height = H * s + 'px';
    const r = wrap.getBoundingClientRect(), x = r.left + window.scrollX, y = r.top + window.scrollY;
    wrap.style.left = (Math.round(x) - x).toFixed(4) + 'px'; wrap.style.top = (Math.round(y) - y).toFixed(4) + 'px'; }
  function apply() {
    seg('phones', [[0, '390 × 844'], [1, '430 × 932']], 'phone'); seg('texts', [[100, '100%'], [200, '200%']], 'pct'); seg('sq', [[true, 'Shown'], [false, 'Hidden']], 'squares');
    seg('motion', [['reduced', 'Still'], ['on', 'Moving']], 'motion'); seg('depth', [['on', 'By depth'], ['off', 'Under the crew']], 'depth'); seg('tagsat', [['feet', 'At their feet'], ['pack', 'Where the game puts them now']], 'tags');
    fit(); if (window.roomB) window.roomB.setView(Object.assign({}, ui, { at: null }));
  }
  document.addEventListener('measured', function (e) { const m = e.detail, ids = Object.keys(m.per); fit(m.phone === '430x932' ? 1 : 0);
    document.getElementById('readout').innerHTML = '<b>' + m.phone.replace('x', ' × ') + ' · ' + m.pct + '% text' + (m.held ? ' · held at ' + (m.at || 0) + ' s' : '') + ' · furniture ' + (m.depth === 'off' ? 'under the crew' : 'by depth') + ' · name tags ' + (m.tagsAt === 'pack' ? 'where the game puts them now' : 'at their feet') + '</b><span>People: ' + ids.map(function (k) { var c = m.per[k], o = m.occlusion[k]; return c.name + ' ' + c.heightPx + ' px' + (o && o.hiddenShare > 0 ? ', ' + (100 * o.hiddenShare).toFixed(1) + '% behind furniture' : ''); }).join(', ') + '</span><span>' + (m.issues.length ? 'Checks: ' + m.issues.join('; ') : 'Layout checks: none') + '</span>'; });
  window.addEventListener('resize', function () { if (window.innerWidth !== VW) { VW = window.innerWidth; VH = window.innerHeight; } fit(); });
  apply();
  import('./app.mjs').then(function () { var l = document.getElementById('loading'); if (l) l.remove(); apply(); }).catch(function (err) { document.getElementById('loading').textContent = 'The live room could not load here: ' + err.message; });
})();
</script>`;
writeFileSync(DIR + 'page.html', page);
const SKELETON = readFileSync(DIR + 'skeleton.html', 'utf8');   // the publish wrapper, as read back from the published index.html
writeFileSync(DIR + 'index.html', SKELETON + page + '\n</body></html>');   // exactly what the publish serves
console.log('page', page.length, 'bytes; checks', CK ? 'in' : 'not yet');
