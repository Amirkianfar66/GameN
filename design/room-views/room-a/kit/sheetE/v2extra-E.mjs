// Sheet RA-E version 2's own sections (sheetE.mjs, through sheetV's page template): Atlas's crates on RA-E-1's painted deck (the
// floor fit, from measure-E2.json and kit-E.json), Atlas's foot line, and Echo's cabinet against the painted east-wall strip, with
// their review zooms (overlayV2.py, labelled as AI-generated). Generates nothing.
export function extra({ KIT, J, esc, num, figs, S1P }) {
  const ME = J('measure-E2.json'), AF = KIT.feet[0], EC = J('check-E2.json').echoCabinet, N = esc(S1P.name);
  const sgn = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
  const where = c => `${c.fromWestWallM === 0 ? 'back, at the west wall' : `front, ${c.fromWestWallM} m out`}, ${c.world[2] < -0.5 ? 'far end' : 'near end'}${c.px[0] > 1024 ? ' (outside the picture)' : c.fromWestWallM === 0 ? ' (behind the crates)' : ''}`;
  const rows = ME.crateCorners.map(c => `<tr><td>${where(c)}, x ${Math.round(c.px[0])}</td><td class="n">${c.px[1].toFixed(1)}</td><td class="n">${c.paintedY.toFixed(1)}</td><td class="n">${sgn(c.offsetPx)}</td></tr>`).join('');
  const far = ME.crateCorners.filter(c => c.world[2] < -0.5).map(c => sgn(c.offsetPx)), near = ME.crateCorners.filter(c => c.world[2] > -0.5).map(c => sgn(c.offsetPx));
  const footOff = Object.entries(ME.westFoot.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ');
  const seamOff = Object.entries(ME.westSeam1.offsetByX).map(([x, o]) => `${sgn(o)} at x ${x}`).join(', ');
  const notes = [
    `<b>The crates stand on the painted deck.</b> Their floor corners are drawn on ${N}’s painted deck: ${far.join(' and ')} px at their far end, by the far corner, and ${near.join(' and ')} px at their near end. Only the crates’ area changes, in the mask and the guide: no warp. <a href="#crates">Below</a>.`,
    `<b>Atlas’s foot line.</b> ${sgn(AF.offsetPx)} px off the painted deck: under the Lead’s 8 px, so it stays. <a href="#atlas">Below</a>.`,
    `<b>Echo’s cabinet</b> stays inside the painted east-wall strip: the painted corner is ${EC.paintedLeftOfGuidePx} px left of the guide’s, and the cabinet’s area ends ${EC.clearPxMin} px short of it in every row. <a href="#cabinet">Below</a>.`];
  const sections = `<section id="crates">
<h2>The crates on the painted deck</h2>
<p>${N} paints the west wall’s foot lower than the guide does beside the crates: ${footOff} px, read on the foot of its kick strip (${ME.westFoot.readings} readings, a straight line within ${ME.westFoot.rmsPx} px). Its deck seam 1 m out from the west wall lies ${seamOff} px from the guide’s. So each of the crates’ floor corners keeps its place between the wall’s foot and that seam, as the guide’s camera puts it, and is drawn at the same place between the painted ones, as view B’s desk was. The crates’ tops stay where the camera puts them: their far end grows down onto the painted deck and the near end stays. Nothing else in the guide moves.</p>
<div class="scroll"><table><thead><tr><th>Crates’ floor corner</th><th>Guide y</th><th>Painted y</th><th>Down, px</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="pics">${figs('crates')}</div>
</section>
<section id="atlas">
<h2>Atlas’s foot line</h2>
<p>Atlas stands in front of the crates’ far end, ${AF.fractionWallToSeam} of the way from the west wall’s foot to the seam 1 m out. Kept at that place between the painted lines, Atlas’s anchor sits ${sgn(AF.offsetPx)} px from the guide’s (about ${(AF.offsetPx / 2.191).toFixed(1)} px on the 390 phone). That is under the Lead’s 8 px, so Atlas’s foot line stays where the plan puts it.</p>
</section>
<section id="cabinet">
<h2>Echo’s cabinet and the painted corner</h2>
<p>${N} paints the corner of the east and south walls at x ${EC.paintedCornerX}, ${EC.paintedLeftOfGuidePx} px left of the guide’s (x ${EC.guideCornerX.toFixed(0)}): read as the column darkest on average over the cabinet’s rows, then row by row within 3 px of it, every 10 px from y 600 to 980. Step 2’s mask for the cabinet ends at x ${EC.maskRightEdgeX}, so it stays inside the painted east-wall strip, ${EC.clearPxMin} px short of the corner in every row. The cabinet’s area is unchanged from version 1.1.</p>
<div class="pics">${figs('cabinet')}</div>
</section>`;
  return { notes, sections };
}
