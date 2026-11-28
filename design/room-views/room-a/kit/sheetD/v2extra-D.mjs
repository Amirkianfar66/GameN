// Sheet RA-D version 2's own sections (sheetD.mjs, through sheetV's page template): the round window fitted to RA-D-1's painted
// black (window-D.json), the four foot lines and the floor fit on the painted deck (measure-D2.json, floorfit-D.json), and the food
// capsule against the painted corner (check-D2.json), with their review zooms (overlayV2.py, labelled as AI-generated).
// Generates nothing.
export function extra({ J, esc, num, figs, S1P }) {
  const WD = J('window-D.json'), ME = J('measure-D2.json'), CK = J('check-D2.json'), FF = J('floorfit-D.json'), N = esc(S1P.name);
  const sgn = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`, R = WD.region, G = WD.guideWindow.offsetsPx;
  const LEAD = ME.leadsFigures, lead = n => (Array.isArray(LEAD[n]) ? `${sgn(LEAD[n][0])} to ${sgn(LEAD[n][1])}` : sgn(LEAD[n]));
  const LN = { northFoot: 'the north wall’s foot', northSeam1: 'the seam 1 m out from it', eastFoot: 'the east wall’s foot', eastSeam1: 'the seam 1 m out from it', eastSeam0: 'the seam 2 m out' };
  const pair = ls => `${LN[ls[0]]} and ${ls[0].startsWith('north') ? LN[ls[1]] : ls[1] === 'eastSeam1' ? 'the seam 1 m out from it' : 'the seam 2 m out'}`;
  // each spot's two painted lines against the guide's, read at the spot's own x: the wall's foot and the seam beside it
  const at = (k, x, src) => src[k].intercept + src[k].slope * x, offAt = (k, x) => at(k, x, ME) - at(k, x, ME.guide);
  const wallFoot = f => offAt(f.lines[0], f.anchor[0]), seamAt = f => offAt(f.lines[1], f.anchor[0]);
  const matches = f => { const L = LEAD[f.name], w = wallFoot(f); return Array.isArray(L) ? w >= L[0] && w <= L[1] : Math.abs(w - L) <= 3; };
  const nm = f => (f.name === 'capsule visitors' ? 'the visitors’ spot' : f.name);
  const feet = ME.feet.map(f => `<tr><td>${esc(f.name[0].toUpperCase() + f.name.slice(1))}</td><td>(${f.anchor[0].toFixed(0)}, ${f.anchor[1].toFixed(0)})</td><td>${pair(f.lines)}, ${f.fraction.toFixed(2)} of the way</td><td class="n">${sgn(wallFoot(f))}</td><td class="n">${sgn(seamAt(f))}</td><td class="n">${sgn(f.offsetPx)}</td><td class="n">${lead(f.name)}</td><td>${f.moved ? `<span class="pill ok">moves</span> to y ${f.movedTo[1].toFixed(1)}` : 'stays'}</td></tr>`).join('');
  const ok = ME.feet.filter(matches), notOk = ME.feet.filter(f => !matches(f));
  const pts = ME.floorPoints.filter(p => p.offsetPx !== undefined).map(p => `<tr><td>${esc(p.object === 'PC desk' ? 'Vega’s desk' : p.object === 'floor hatch' ? 'The hatch' : 'The lid')}${p.world[1] > 0.001 ? (p.object === 'hatch lid' ? ', its foot' : ', its rim') : ''}</td><td>(${p.px[0].toFixed(0)}, ${p.px[1].toFixed(0)})</td><td class="n">${sgn(p.offsetPx)}</td><td>${p.moved ? `<span class="pill ok">down</span> to y ${p.to[1].toFixed(1)}` : 'stays'}</td></tr>`).join('');
  const moved = ME.feet.filter(f => f.moved).map(f => `${f.name} ${sgn(f.offsetPx)}`), stays = ME.feet.filter(f => !f.moved).map(f => `${f.name} ${sgn(f.offsetPx)}`);
  const hatchMv = FF.points.filter(p => p.object === 'floor hatch'), lidMv = FF.points.filter(p => p.object === 'hatch lid');
  const rng = a => `${Math.min(...a.map(p => p.offsetPx)).toFixed(1)} to ${Math.max(...a.map(p => p.offsetPx)).toFixed(1)}`;
  const CP = CK.capsule, cs = ME.feet.find(f => f.name === 'capsule visitors'), ec = ME.feet.find(f => f.name === 'Echo');
  const echoSeam = (ME.eastSeam1.intercept + ME.eastSeam1.slope * ec.anchor[0]) - (ME.guide.eastSeam1.intercept + ME.guide.eastSeam1.slope * ec.anchor[0]);
  const notes = [
    `<b>The window, fitted to ${N}’s painted black.</b> The moving sky’s outline is the painted opening’s own edge, read on 720 rays from its middle where the lightness reaches 0.12 (<code>window-D.json</code>): ${num(R.px)} px, x ${R.box[0]}–${R.box[2]}, y ${R.box[1]}–${R.box[3]}, flat black (p95 ${R.p95L.toFixed(3)}, under the gate’s 0.12). The guide’s window was ${Math.min(...Object.values(G).map(Math.abs))} to ${Math.max(...Object.values(G).map(Math.abs))} px off it. Steps 2 and 3’s colour map now reads the opening from the painting. <a href="#window">Below</a>.`,
    `<b>The foot lines.</b> Read on the painted deck at each spot: ${moved.join(', ')} move; ${stays.join(', ')} ${stays.length === 1 ? 'stays' : 'stay'}, under the Lead’s 8 px. The visitors’ spot is now in view D’s geometry. <a href="#feet">Below</a>.`,
    `<b>The hatch and its lid reach down to the painted deck.</b> ${hatchMv.length} of the hatch’s points move down ${rng(hatchMv)} px${lidMv.length ? ` and the lid’s foot ${rng(lidMv)} px` : ''}, where the painted deck lies more than 8 px below the guide. Vega’s desk stays: the painted deck under it is within 1 px of the guide. <a href="#feet">Below</a>.`,
    `<b>The capsule stays on the painted east wall:</b> step 3’s mask begins at x ${CP.maskLeftEdgeX}, ${CP.clearOfTheFeetCornerPx.toFixed(0)} px right of where the painted walls’ feet meet (x ${CP.paintedCornerAtTheDeck[0]}) and ${CP.clearPxMin} px or more right of the darkest column by the corner’s pipes (x ${CP.paintedCornerX}). <a href="#capsule">Below</a>.`];
  const sections = `<section id="window">
<h2>The window: the painted opening</h2>
<p>${N} paints the round window’s opening a little left of and lower than the guide’s: its edges are ${Object.entries(G).map(([k, v]) => `${k} ${sgn(v)}`).join(', ')} px from the guide’s (a positive number is the guide’s edge right of or below the painted one). The moving sky must fill exactly the painted black, so its outline is read on ${N} itself: from the black’s middle, 720 rays half a degree apart, each stopped where the OKLCH lightness first reaches 0.12 (the colour check’s own measure), read every 0.1 px. Joined, those edges are the opening’s outline, in <code>window-D.json</code>.</p>
<div class="scroll"><table><tbody>
<tr><td>The opening</td><td>${num(R.px)} px, x ${R.box[0]}–${R.box[2]}, y ${R.box[1]}–${R.box[3]}</td></tr>
<tr><td>Flat black: 95% under lightness 0.12</td><td>p95 ${R.p95L.toFixed(3)}, median ${R.medianL.toFixed(3)} <span class="pill ok">pass</span></td></tr>
<tr><td>Sky over the frame: lit pixels inside the outline</td><td>${num(WD.skyOverTheFrame.px)} px, the anti-aliased step into the frame’s ink</td></tr>
<tr><td>Black left: painted black outside the outline</td><td>${num(WD.blackSliverLeft.px)} px, in specks of 1 to 12 px along its foot at lightness 0.10 to 0.12, the same step, not a sliver</td></tr>
<tr><td>An ellipse fitted to the same edges</td><td>would leave ${num(WD.ellipse.wouldLeave.blackSliverPx)} px black and cover ${num(WD.ellipse.wouldLeave.skyOverTheFramePx)} lit: the painted opening is not quite an ellipse (bolts on the frame’s inner edge, up to ${WD.ellipse.fit.maxOffPx} px), so it is recorded as a summary only</td></tr>
</tbody></table></div>
<p>Steps 2 and 3’s colour map takes its window from the painted opening where it lies inside the guide’s glass (${num(CK.window.mapOpeningPx)} px, ${(100 * CK.window.share).toFixed(1)}% of it); the rest of the glass reads as frame. So the colour check’s opening gate reads flat black on the painting and on the dry run’s code guides alike. Step 1’s files are version 1.1’s, byte for byte.</p>
<div class="pics">${figs('window')}</div>
</section>
<section id="feet">
<h2>The foot lines and the floor, on the painted deck</h2>
<p>${N} paints the walls’ feet flatter than the guide: the north wall’s foot ${Object.entries(ME.northFoot.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ')} px; the east wall’s ${Object.entries(ME.eastFoot.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ')} px (the feet of the kick strips, every 4 px, straight lines within ${ME.northFoot.rmsPx} and ${ME.eastFoot.rmsPx} px). The deck seams beside them turn with them: 1 m out from the north wall ${Object.entries(ME.northSeam1.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ')}; 1 m out from the east wall ${Object.entries(ME.eastSeam1.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ')}. So the painted deck is lower than the guide’s near the corner and higher farther out. Each spot keeps its place between the two guide lines around it, as the camera puts it, and is drawn at the same place between the painted ones, as view E’s crates and Atlas were.</p>
<div class="scroll wide"><table><thead><tr><th>Foot line</th><th>Anchor</th><th>Between</th><th>The wall’s foot at its x, px</th><th>The seam at its x, px</th><th>On the deck at the spot, px</th><th>The Lead’s figure</th><th>Rule: more than 8 px</th></tr></thead><tbody>${feet}</tbody></table></div>
<p>The Lead’s figures are the painted walls’ feet read at each one’s x for ${ok.map(nm).join(', ').replace(/, ([^,]*)$/, ' and $1')} (the table’s fourth column)${notOk.length ? `; ${notOk.map(f => `${nm(f)}’s ${lead(f.name)} is not that reading (${sgn(wallFoot(f))} at x ${f.anchor[0].toFixed(0)}) and was not reproduced`).join('; ')}` : ''}. On the deck at the spot itself the figures differ, because each spot stands between a wall’s foot and a seam, and against the guide the painted seams sit higher than the painted feet: at Echo’s x, 0.7 m out from the east wall, the seam 1 m out runs ${Math.abs(echoSeam).toFixed(0)} px above the guide’s. The rule reads the deck at the spot. The visitors’ spot, where a visitor stands at the food capsule (x ${cs.onDeck[0]}, z ${cs.onDeck[2]} m), is in view D’s geometry (<code>lines-D.json</code>, <code>measure-D2.json</code>); read by the north wall’s lines instead it is ${sgn(cs.crossCheck.offsetPx)} px.</p>
<div class="scroll"><table><thead><tr><th>Floor point</th><th>Guide</th><th>Off, px</th><th>Rule: down, more than 8 px</th></tr></thead><tbody>${pts}</tbody></table></div>
<p>The hatch and the lid stand by the east wall’s lines, the desk by the north wall’s. Only the points listed down move, in the guide and the masks; the desk’s two points outside the picture stay.</p>
</section>
<section id="capsule">
<h2>The capsule and the painted corner</h2>
<p>${N}’s walls’ feet meet at x ${CP.paintedCornerAtTheDeck[0]} on the deck (where the two painted feet’s lines cross); the guide’s corner is x ${CP.guideCorner[0].toFixed(0)}. Over the capsule’s rows the corner is hidden by its pipes: the column darkest on average there, read row by row within 3 px of it, is x ${CP.paintedCornerX}, the shadow at the pipes, right of the corner itself. Step 3’s mask, the capsule’s outline grown 2 px, begins at x ${CP.maskLeftEdgeX}: ${CP.clearOfTheFeetCornerPx.toFixed(0)} px right of the feet’s corner and ${CP.clearPxMin} px or more right of that shadow in every row, on the painted east wall.</p>
<div class="pics">${figs('capsule')}</div>
</section>`;
  return { notes, sections };
}
