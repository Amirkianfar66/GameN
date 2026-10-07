import type { OwnAcknowledgments } from '@mothership/contracts';
import type { ConnectedPlayerShellModel, TableShellModel } from '../model/types.js';
import { h, isElement } from './node.js';
import type { MarkupElement, MarkupNode } from './node.js';
import { renderConnectedPlayerShell } from './connected-player.js';
import { renderTableShell } from './table-shell.js';
import { hiddenText, renderZones } from './parts.js';

/** Public identity only. The transport validates the separately versioned document. */
export interface ComicIdentity {
  readonly seatId: string;
  readonly displayName: string | null;
  readonly characterId: string | null;
}
export interface ComicContext { readonly identities?: readonly ComicIdentity[]; readonly acknowledgments?: OwnAcknowledgments | null }

const ROLES: Readonly<Record<string, { readonly device: string; readonly team: string }>> = {
  Officer: { device: 'officer', team: 'Blue' }, Insider: { device: 'insider', team: 'Blue' },
  Cracker: { device: 'cracker', team: 'Blue' }, 'Blue Disabler': { device: 'blue-disabler', team: 'Blue' },
  Supplier: { device: 'supplier', team: 'Blue' }, Undercover: { device: 'undercover', team: 'Red' },
  Hacker: { device: 'hacker', team: 'Red' }, 'Red Disabler': { device: 'red-disabler', team: 'Red' },
  Alien: { device: 'alien', team: 'Alien' },
};
const classHas = (node: MarkupElement, name: string): boolean => String(node.attrs.class ?? '').split(' ').includes(name);
const character = (value: string | null | undefined): string | null => typeof value === 'string' && /^c[1-9]$/u.test(value) ? value : null;

function identityFor(context: ComicContext, seat: string): ComicIdentity | undefined {
  return context.identities?.find(item => item.seatId === seat);
}

function nameParts(seat: string, name: string): readonly MarkupNode[] {
  return [h('span', { class: 'ms-seat__number' }, hiddenText('Player '), seat.slice(5)), hiddenText(', '),
    h('span', { class: 'ms-seat__player' }, name)];
}

/** A name is always text; it never chooses a class, a resource or a role. */
function decoratePublic(node: MarkupNode, context: ComicContext, seat: string | null = null): MarkupNode {
  if (!isElement(node)) return node;
  const ownSeat = node.attrs['data-seat'] ?? node.attrs['data-target-seat']
    ?? (node.attrs['data-intent'] === 'action/choose' ? node.attrs['data-value'] : undefined);
  const current = typeof ownSeat === 'string' && /^seat-[1-9]$/u.test(ownSeat) ? ownSeat : seat;
  const identity = current === null ? undefined : identityFor(context, current);
  const attrs = { ...node.attrs };
  if (ownSeat && identity && character(identity.characterId)) attrs['data-character'] = character(identity.characterId)!;
  let children = node.children.map(child => decoratePublic(child, context, current));
  const named = classHas(node, 'ms-seat__name') || classHas(node, 'ms-target__name') || (node.tag === 'th' && node.attrs.scope === 'row');
  if (named && current && identity?.displayName) children = [...nameParts(current, identity.displayName)];
  return { ...node, attrs, children };
}

function roleCard(name: string, ownCharacter: string | null): MarkupElement {
  const look = ROLES[name];
  if (!look) return h('p', { class: 'ms-role-card' }, name);
  // These hooks exist only inside the open private panel. All nine device pictures were
  // requested together before sign-in; revealing this card never fetches a resource.
  return h('div', { class: 'ms-role-card ms-role-card--full', 'data-device': look.device, 'data-character': ownCharacter, 'data-team': look.team.toLowerCase() },
    h('span', { class: 'ms-role-card__art', 'aria-hidden': 'true' }),
    h('div', { class: 'ms-role-card__text' }, h('p', { class: 'ms-role-card__name' }, name), h('p', { class: 'ms-role-card__team' }, `${look.team} team`)),
  );
}

/** Add the approved artwork without changing action availability, targets or authority. */
export function renderComicPlayerShell(model: ConnectedPlayerShellModel, context: ComicContext = {}): MarkupElement {
  const match = model.match;
  const source = renderConnectedPlayerShell(model);
  if (!match) return source;
  const ownCharacter = character(identityFor(context, match.identity.seatId)?.characterId);
  const privateContent = match.privateArea.content;
  const board = h('section', { class: 'ms-panel ms-board', 'aria-labelledby': 'ms-comic-board-heading', 'data-region': 'comic-board' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-comic-board-heading' }, 'The ship'),
    renderZones(match.roster.zones, 'ms-comic-zone'));
  function visit(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    if (classHas(node, 'ms-role-card') && privateContent) return roleCard(privateContent.role.name, ownCharacter);
    let children = node.children.map(visit);
    if (classHas(node, 'ms-private__panel') && privateContent && model.connection === 'live') {
      const own = context.acknowledgments;
      const lines: string[] = [];
      if (own && own.seatId === match!.identity.seatId) {
        for (const result of own.supplierResults) lines.push(result.successfulRecipientSeatIds.length === 0
          ? 'No players received a weapon from your Round 3 Supply.'
          : `Your Round 3 Supply granted one weapon each to ${result.successfulRecipientSeatIds.map(id => `Player ${id.slice(5)}`).join(' and ')}.`);
        for (const result of own.receivedSupply) lines.push(`You received one ordinary weapon from Supply in Round ${result.round}.`);
        if (!own.historyAvailable && privateContent.role.name === 'Supplier') lines.push('Supply result history is unavailable for this match.');
      }
      children.push(h('div', { class: 'ms-acknowledgments-region', 'data-region': 'own-acknowledgments' }, lines.length ?
        h('section', { class: 'ms-acknowledgments', 'aria-labelledby': 'ms-acknowledgments-title' },
          h('h3', { id: 'ms-acknowledgments-title' }, 'Supply results'), lines.map(line => h('p', null, line))) : null));
    }
    if (classHas(node, 'ms-main')) {
      const location = children.find(child => isElement(child) && child.attrs['data-region'] === 'location');
      const roster = children.find(child => isElement(child) && child.attrs['data-region'] === 'roster');
      children = children.filter(child => child !== location && child !== roster);
      const privateIndex = children.findIndex(child => isElement(child) && child.attrs['data-region'] === 'private');
      children.splice(privateIndex, 0, board);
      // The illustrated board is accompanied by a complete text reading path. Keeping it
      // in a native disclosure preserves its state and focus during countdown redraws.
      children.push(h('details', { class: 'ms-readable-board' }, h('summary', null, 'Players and locations — readable list'), location, roster));
    }
    return { ...node, children };
  }
  return decoratePublic(visit(source), context) as MarkupElement;
}

export function renderComicTableShell(model: TableShellModel, context: ComicContext = {}): MarkupElement {
  return decoratePublic(renderTableShell(model), context) as MarkupElement;
}
