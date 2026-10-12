import type { VoteResultModel } from '../model/types.js';
import { en } from '../copy/en.js';
import type { ComicContext } from './comic-shell.js';
import { chip } from './ability-art.js';
import { h } from './node.js';
import type { MarkupElement } from './node.js';

/** Public aggregate composition; this region has no ballot, role, faction or Code input. */
export function renderVoteResultPanel(result: VoteResultModel | null, context: ComicContext = {}): MarkupElement {
  if (result === null) return h('div', { 'data-region': 'vote-result' });
  const compact = context.phoneView === 'more';
  const name = (seatId: string): string => context.identities?.find(item => item.seatId === seatId)?.displayName ?? `Player ${seatId.slice(5)}`;
  return h('section', { class: `feedback-window feedback-window--vote${compact ? ' feedback-window--compact' : ''}`, 'data-region': 'vote-result', 'data-result-id': result.id,
    'data-outcome': result.outcome, 'data-origin-round': String(result.round), 'aria-labelledby': 'ms-vote-result-heading', 'data-focus-fallback': 'ms-vote-result-heading' },
    h('p', { class: 'feedback-window__origin' }, `Round ${result.round} · ${en.phase.kind[result.kind]}`),
    h('h2', { id: 'ms-vote-result-heading', tabindex: '-1' }, result.heading),
    compact || result.selectedSeatId === null ? null : h('div', { class: 'feedback-window__selected' }, chip(result.selectedSeatId, context),
      h('strong', null, name(result.selectedSeatId))),
    h('p', { class: 'feedback-window__summary' }, result.summary),
    !compact && result.tiedSeatIds.length ? h('p', { class: 'feedback-window__ties' }, `Tied: ${result.tiedSeatIds.map(name).join(', ')}`) : null,
    !compact && result.counts.length ? h('ul', { class: 'feedback-window__counts', 'aria-label': 'Published aggregate votes' }, result.counts.map(row =>
      h('li', null, h('span', null, name(row.seatId)), h('strong', null, String(row.votes))))) : null,
    result.lines.map(line => h('p', { class: 'feedback-window__detail' }, line)),
    compact ? null : h('p', { class: 'feedback-window__next' }, 'The next phase starts when this result ends.'),
  );
}
