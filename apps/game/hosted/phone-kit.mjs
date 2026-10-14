// Production composition over current sanitized models. The two drawing modules are exact
// Claude #127 derivatives; no prototype controller or stand-in server enters this module.
import { HACK_ART, RESULT_ART } from './scene-drawing/phone-kit-art.mjs';
import { CREW } from './scene-drawing/crew.mjs';
import { skeletonOf } from './scene-drawing/gestures.mjs';
import { dressedFigureSvg, outfitFor } from './scene-drawing/wardrobe.mjs';
import { publicSceneSeats } from './scene-board.mjs';

const COMPOSITIONS = Object.freeze({
  CAPTAIN_ELECTED: { tone: 'gold', piece: 'vote-captain-star' },
  RUNOFF_REQUIRED: { tone: 'paper', piece: 'vote-tie-burst' },
  NO_CAPTAIN_ELECTED: { tone: 'paper', piece: 'vote-empty-chair' },
  PLAYER_JAILED: { tone: 'steel', piece: 'vote-cell-bars' },
  NO_JAIL_SELECTION: { tone: 'paper', piece: 'vote-empty-cell' },
  PLAYER_RELEASED: { tone: 'gold', piece: 'vote-cell-bars-open' },
  RELEASE_DENIED: { tone: 'steel', piece: 'vote-cell-bars' },
});
export const resultComposition = outcome => COMPOSITIONS[outcome] ?? null;
export function voteCells(result) {
  if (!Number.isInteger(result.eligibleVoterCount) || result.eligibleVoterCount < 0 || result.eligibleVoterCount > 9) return [];
  if (result.kind === 'RELEASE_VOTE') return Array.from({ length: result.eligibleVoterCount }, (_, i) => i < (result.yesCount ?? 0) ? 'subject' : 'other');
  const subject = new Set([result.selectedSeatId, ...result.tiedSeatIds]);
  const cells = result.counts.flatMap(row => Array.from({ length: row.votes }, () => subject.has(row.seatId) ? 'subject' : 'other'));
  return Array.from({ length: result.eligibleVoterCount }, (_, i) => cells[i] ?? 'empty');
}
export function hackPicture(feedback) {
  if (!feedback || !['HACK_DECLARE','HACK_RESULT','HACK'].includes(feedback.stage)) return null;
  if (feedback.stage === 'HACK_DECLARE') return feedback.declaredSide === null ? 'hack-waiting-dots' : null;
  return feedback.declaredSide === null ? 'hack-side-none' : { Blue: 'hack-side-blue', Red: 'hack-side-red', Alien: 'hack-side-alien' }[feedback.declaredSide] ?? null;
}

const seatNode = (root, id) => /^seat-[1-9]$/.test(id ?? '') ? root.querySelector(`.ms-seat[data-seat="${id}"]`) : null;
const span = (document, className, svg) => {
  const node = document.createElement('span'); node.className = className;
  if (svg) node.innerHTML = svg; // Reviewed pure SVG only; never a name or server string.
  return node;
};

/** Drawings add no facts, controls, timers, requests or animation authority. */
export function applyPhoneKit(root, model) {
  const match = model.match;
  if (model.screen !== 'match' || !match) return;
  root.dataset.phoneKit = 'phone-kit-0.1.0';
  const document = root.ownerDocument;
  const seats = (match.board?.zones ?? match.roster?.zones ?? []).flatMap(zone => zone.seats);
  const active = seats.find(seat => seat.isActive);
  const phase = root.querySelector('.ms-phase');
  const character = active ? seatNode(root, active.seatId)?.dataset.character : null;
  let portrait = phase?.querySelector('.pk-who');
  if (character && CREW[character]) {
    if (!portrait) { portrait = span(document, 'pk-who'); portrait.setAttribute('aria-hidden','true'); phase.prepend(portrait); }
    portrait.dataset.character = character;
  } else portrait?.remove();

  const result = match.voteResult;
  for (const panel of root.querySelectorAll('[data-result-id]')) {
    if (!result || panel.dataset.resultId !== result.id) continue;
    const stage = panel.querySelector('[data-phone-kit="vote-stage"]');
    if (!stage) continue; // Menu retains the mandatory semantic result in its compact form.
    const composition = resultComposition(result.outcome);
    if (!composition) continue;
    const ids = result.selectedSeatId ? [result.selectedSeatId] : result.tiedSeatIds;
    const world = publicSceneSeats(model);
    const subjects = ids.map(id => ({ id, character: seatNode(root,id)?.dataset.character,
      facts: world.find(seat => seat.n === Number(id.slice(5))) }));
    const key = JSON.stringify([result.id,result.outcome,subjects,voteCells(result)]);
    if (stage.dataset.kitKey === key) continue;
    stage.dataset.kitKey = key;
    const ground = span(document,'pk-vr__ground',RESULT_ART[`vote-ground-${composition.tone}`]());
    const figures = document.createElement('div'); figures.className = 'pk-vr__subjects';
    for (const subject of subjects) {
      if (!CREW[subject.character] || !subject.facts) continue;
      const gesture = subject.facts.health === 'Injured' ? 'stand+injured' : subject.facts.health === 'Eliminated' ? 'stand+still' : 'stand';
      figures.append(span(document,'pk-vr__fig',dressedFigureSvg(CREW[subject.character],skeletonOf(gesture),{
        outfit:outfitFor(subject.facts.location),prefix:`phone-vote-${subject.id}`,layer:'body',
      })));
    }
    const piece = span(document,`pk-vr__piece pk-vr__piece--${composition.piece}`,RESULT_ART[composition.piece]());
    stage.replaceChildren(ground,figures,piece);
    let count = panel.querySelector('.pk-vr__cells');
    if (!count) { count = document.createElement('div'); count.className='pk-vr__cells'; count.setAttribute('aria-hidden','true'); stage.after(count); }
    count.replaceChildren(...voteCells(result).map(state => { const cell=span(document,'pk-vr__cell');cell.dataset.count=state;return cell; }));
  }

  const feedback = match.privateArea?.content?.hackFeedback;
  const panel = root.querySelector('[data-region="hack-feedback"][data-hack-id]');
  if (panel && feedback && panel.dataset.hackId === feedback.id && panel.dataset.phaseId === feedback.phaseId) {
    const key = hackPicture(feedback), lead = panel.querySelector('[data-phone-kit="hack-lead"]');
    if (key && lead && lead.dataset.kitKey !== key) { lead.dataset.kitKey=key;lead.innerHTML=HACK_ART[key](); }
  }
  // All target phones get the same three pictures, selected only by the choice's label.
  for (const button of root.querySelectorAll('[data-kind="declare-hack-side"] [data-intent="action/choose"]')) {
    const key = { Blue:'hack-side-blue',Red:'hack-side-red',Alien:'hack-side-alien' }[button.dataset.value];
    if (!key || button.querySelector('.pk-declaration-art')) continue;
    const art = span(document,'pk-declaration-art',HACK_ART[key]());art.setAttribute('aria-hidden','true');button.prepend(art);
  }
}
