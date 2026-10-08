import type { OwnAcknowledgments, FullPracticeBotsDocument } from '@mothership/contracts';
import type { ConnectedPlayerShellModel, TableShellModel } from '../model/types.js';
import { h, isElement } from './node.js';
import type { MarkupElement, MarkupNode } from './node.js';
import { renderConnectedActionCard, renderConnectedPlayerShell } from './connected-player.js';
import { renderTableShell } from './table-shell.js';
import { hiddenText, renderZones } from './parts.js';

/** Public identity only. The transport validates the separately versioned document. */
export interface ComicIdentity {
  readonly seatId: string;
  readonly displayName: string | null;
  readonly characterId: string | null;
}
export interface ComicContext { readonly phoneNotice?: string | null; readonly phoneView?: 'board' | 'actions' | 'role' | 'more'; readonly identities?: readonly ComicIdentity[]; readonly acknowledgments?: OwnAcknowledgments | null; readonly practice?: FullPracticeBotsDocument | null }

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
  if (named && current && context.practice?.botSeatIds.some(seatId => seatId === current)) children.push(h('span', { class: 'ms-seat__bot' }, 'Bot'));
  return { ...node, attrs, children };
}

/** Render only inside an explicitly revealed, currently authorized private panel. */
export function renderComicRoleCard(name: string, ownCharacter: string | null): MarkupElement {
  const look = ROLES[name];
  if (!look) return h('p', { class: 'ms-role-card' }, name);
  // These hooks exist only inside the open private panel. All nine device pictures were
  // requested together before sign-in; revealing this card never fetches a resource.
  return h('div', { class: 'ms-role-card ms-role-card--full', 'data-device': look.device, 'data-character': ownCharacter, 'data-team': look.team.toLowerCase() },
    h('span', { class: 'ms-role-card__art', 'aria-hidden': 'true' }),
    h('div', { class: 'ms-role-card__text' }, h('p', { class: 'ms-role-card__name' }, name), h('p', { class: 'ms-role-card__team' }, `${look.team} team`)),
  );
}

/** Public, opt-in practice status; it never exposes a bot's role or decision inputs. */
function withPracticeNotice(node: MarkupNode, context: ComicContext): MarkupNode {
  if (!isElement(node)) return node;
  const children = node.children.map(child => withPracticeNotice(child, context));
  const bots = context.practice?.botSeatIds.length ?? 0;
  if ((classHas(node, 'phone-menu') || classHas(node, 'ms-main') && !context.phoneView) && bots > 0) children.unshift(h('section', { class: 'ms-practice-notice', 'aria-labelledby': 'ms-practice-heading' },
    h('h2', { id: 'ms-practice-heading' }, `Practice match · ${bots} ${bots === 1 ? 'bot' : 'bots'}`),
    h('p', null, 'Bots make simple legal choices. They do not chat or bluff.')));
  return { ...node, children };
}

/** Add the approved artwork without changing action availability, targets or authority. */
export function renderComicPlayerShell(model: ConnectedPlayerShellModel, context: ComicContext = {}): MarkupElement {
  const match = model.match;
  const source = renderConnectedPlayerShell(model);
  if (!match) return source;
  const phoneView = context.phoneView ?? (match.privateArea.open ? 'actions' : 'board');
  const footer = source.children.find(child => isElement(child) && classHas(child, 'ms-footer')) as MarkupElement;
  const sourceBanners = (source.children.find(child => isElement(child) && classHas(child, 'ms-banners')) as MarkupElement).children.filter(child => isElement(child) && classHas(child, 'ms-banner--data-source'));
  const nav = h('div', { role: 'navigation', class: 'phone-nav', 'aria-label': 'Game navigation', 'data-region': 'phone-navigation' },
    (['board', 'actions', 'pass', 'role', 'more'] as const).map(view => view === 'pass' ? h('button', {
      type: 'button', id: 'ms-phone-pass', 'data-intent': 'action/pass', class: 'phone-pass',
      'aria-label': 'Pass — end your turn', disabled: !match.passTurn.available,
    }, h('span', { class: 'phone-nav__icon phone-nav__icon--pass', 'aria-hidden': 'true' }), h('span', null, 'Pass')) : h('button', {
      type: 'button', id: view === 'role' ? 'ms-private-toggle' : `ms-phone-${view}`,
      'data-phone-view': view, 'aria-pressed': String(phoneView === view),
      'aria-label': view === 'role' ? 'Private card' : view === 'more' ? 'Menu' : view === 'actions' ? 'Actions' : 'Board',
      disabled: match.result && (view === 'role' || view === 'actions') ? true : null,
      'aria-controls': view === 'more' ? 'phone-menu-panel' : view === 'board' ? 'ms-comic-board-heading' : 'ms-private-panel',
      'aria-expanded': view === 'board' ? null : String(phoneView === view),
    }, h('span', { class: `phone-nav__icon phone-nav__icon--${view}`, 'aria-hidden': 'true' }),
    h('span', null, view === 'more' ? 'Menu' : view === 'role' ? 'Card' : view === 'actions' ? 'Actions' : 'Board'))));
  const ownCharacter = character(identityFor(context, match.identity.seatId)?.characterId);
  const privateContent = match.privateArea.content;
  const card = phoneView === 'actions' && !match.result ? privateContent?.actions.card : undefined;
  const dockedAction = card !== undefined && card.body.step !== 'idle';
  const choosing = card?.body.step === 'choosing' ? card.body : null;
  const targetChoices = choosing?.choices.filter(choice => choice.number !== null) ?? [];
  const pickedSeats = choosing?.pickedSeatIds ?? [];
  const passCard = phoneView === 'board' && !match.privateArea.open && !match.result ? match.passTurn.card : null;
  // Selection cues live only on this player's explicitly open action surface. The shared
  // display and the ordinary public board never receive legal targets or picks.
  function boardControls(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    const seatId = String(node.attrs['data-seat'] ?? '');
    if (classHas(node, 'ms-seat') && choosing) {
      const choice = targetChoices.find(item => item.value === seatId);
      const picked = pickedSeats.indexOf(seatId as typeof pickedSeats[number]);
      if (choice) return { ...node, attrs: { ...node.attrs, 'data-board-target': 'eligible' }, children: [
        ...node.children, h('button', { type: 'button', class: 'phone-character-target', id: choice.id,
          'data-intent': 'action/choose', 'data-value': choice.value, 'aria-describedby': 'ms-action-step',
          'aria-label': `Select ${choice.label}${identityFor(context, seatId)?.displayName ? `, ${identityFor(context, seatId)!.displayName}` : ''}`,
        }, hiddenText('Select')),
      ] };
      if (picked >= 0) return { ...node, attrs: { ...node.attrs, 'data-board-target': 'picked' }, children: [
        ...node.children, h('span', { class: 'phone-pick-order', 'aria-label': `Selected ${picked + 1}` }, String(picked + 1)),
      ] };
    }
    return { ...node, children: node.children.map(boardControls) };
  }
  function compactCard(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    // Seat buttons are the illustrated characters on the board. Faction/yes/no/abstain
    // answers still belong in this compact strip, as do Back and explicit confirmation.
    if (classHas(node, 'ms-targets')) return { ...node, children: node.children.filter(child =>
      !isElement(child) || !child.children.some(button => isElement(button) && /^seat-[1-9]$/u.test(String(button.attrs['data-value'])))) };
    if (node.attrs.id === 'ms-action-step' && targetChoices.length > 0) {
      return { ...node, children: [`${card!.title} · Tap a character${pickedSeats.length ? ` (${pickedSeats.length} selected)` : ''}`] };
    }
    return { ...node, children: node.children.map(compactCard) };
  }
  const active = match.roster.zones.flatMap(zone => zone.seats).find(seat => seat.isActive);
  const activeName = active ? identityFor(context, active.seatId)?.displayName : null;
  const turnLine = active ? active.isSelf ? 'Your turn' : `${activeName ?? active.label}’s turn` : match.phase.phaseLabel;
  const ownName = identityFor(context, match.identity.seatId)?.displayName;
  const selfStatus = h('section', { class: 'phone-self', 'data-region': 'phone-self', 'aria-label': 'Your public status' },
    h('strong', null, `Player ${match.identity.number}${ownName ? ` · ${ownName}` : ''}`),
    h('span', null, match.location.name), h('span', null, match.location.self.markers.map(marker => marker.label).join(' · ')));

  const closePanel = (id: string): MarkupElement => h('button', { type: 'button', id, class: 'phone-panel-close', 'data-phone-view': 'board', 'aria-label': 'Close panel' }, '×');
  function roomLabels(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    const room = ({ 'ms-comic-zone-room-a': 'Room A', 'ms-comic-zone-room-b': 'Room B', 'ms-comic-zone-command-room': 'Command Room' } as Record<string, string>)[String(node.attrs.id)];
    if (room) return { ...node, children: [h('button', { type: 'button', id: `phone-move-${room.toLowerCase().replaceAll(' ', '-')}`, class: 'phone-room-move', 'data-move-room': room, 'aria-label': `Move to ${room}` }, ...node.children, h('span', { 'aria-hidden': 'true' }, ' ↗'))] };
    return { ...node, children: node.children.map(roomLabels) };
  }
  const board = h('section', { class: 'ms-panel ms-board', 'aria-labelledby': 'ms-comic-board-heading', 'data-region': 'comic-board' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-comic-board-heading' }, 'The ship'),
    boardControls(roomLabels(renderZones(match.roster.zones, 'ms-comic-zone'))));
  function visit(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    if (classHas(node, 'ms-offers')) {
      const body = privateContent?.actions.card.body;
      const available = body?.step === 'idle' && body.offers.some(offer => offer.kind !== 'move' && offer.open !== null);
      return { ...node, children: available ? node.children.filter(child => !isElement(child) || child.attrs['data-kind'] !== 'move').map(visit) : [h('li', { class: 'phone-empty-actions' }, 'No actions available right now.')] };
    }
    if (classHas(node, 'ms-banners')) return { ...node, children: node.children.filter(child => !sourceBanners.includes(child)) };
    if (node.attrs['data-intent'] === 'action/open') {
      const offer = match!.privateArea.content?.actions.card.body;
      const label = offer?.step === 'idle' ? offer.offers.find(item => item.kind === node.attrs['data-kind'])?.label : undefined;
      if (label) return { ...node, attrs: { ...node.attrs, 'aria-labelledby': String(node.attrs.id) }, children: [label] };
    }
    if (classHas(node, 'ms-role-card') && privateContent) return renderComicRoleCard(privateContent.role.name, ownCharacter);
    if (classHas(node, 'ms-private')) {
      if (match!.result) return h('div', { 'data-region': 'private' });
      if (dockedAction && card) return h('section', { class: 'ms-private phone-action-dock',
        'data-region': 'private', 'data-open': 'true', 'aria-labelledby': 'ms-private-heading', 'data-focus-fallback': 'ms-phone-actions',
      }, h('h2', { id: 'ms-private-heading', class: 'ms-visually-hidden', tabindex: '-1' }, 'Actions'),
      h('div', { id: 'ms-private-panel', class: 'ms-private__panel' }, context.phoneNotice ? h('p', { class: 'phone-panel-notice ms-notice', role: 'status' }, context.phoneNotice) : null, h('div', { class: 'ms-actions' }, compactCard(renderConnectedActionCard(card)))));
      return { ...node, attrs: { ...node.attrs, hidden: !match!.privateArea.open }, children: [h('div', { class: 'phone-panel-head' }, h('h2', { id: 'ms-private-heading', tabindex: '-1' }, phoneView === 'role' ? 'Your card' : 'Actions'), closePanel('phone-private-close')), ...(context.phoneNotice && match!.privateArea.open ? [h('p', { class: 'phone-panel-notice', role: 'status' }, context.phoneNotice)] : []), ...node.children.filter(child => !isElement(child) || !['ms-private-toggle', 'ms-private-hint', 'ms-private-heading'].includes(String(child.attrs.id))).map(visit)] };
    }
    if (node.attrs.id === 'ms-private-heading') return { ...node, attrs: { ...node.attrs, tabindex: '-1', class: 'ms-visually-hidden' }, children: [phoneView === 'role' ? 'Your role' : 'Actions'] };
    if (node.attrs['data-region'] === 'result') return { ...node, attrs: { ...node.attrs, hidden: phoneView === 'more' } };
    if (classHas(node, 'ms-footer')) return h('div', { hidden: true });
    if (classHas(node, 'ms-phase__label') && active) return { ...node, children: [turnLine] };
    let children = node.children.map(visit);
    if (classHas(node, 'ms-private__panel') && privateContent && model.connection === 'live') {
      const knowledge = children.find(child => isElement(child) && child.attrs['data-region'] === 'knowledge');
      if (knowledge) {
        children = children.filter(child => child !== knowledge);
        children.push(h('details', { class: 'phone-knowledge' }, h('summary', null, 'What you know'), knowledge));
      }
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
      const vote = children.find(child => isElement(child) && child.attrs['data-region'] === 'vote');
      const roster = children.find(child => isElement(child) && child.attrs['data-region'] === 'roster');
      children = children.filter(child => child !== location && child !== roster && child !== vote);
      const privateIndex = children.findIndex(child => isElement(child) && child.attrs['data-region'] === 'private');
      children.splice(privateIndex, 0, board);
      if (passCard) children.push(h('section', { class: 'phone-action-dock phone-pass-status', 'data-region': 'pass-status', 'aria-label': 'Turn status', 'aria-live': 'polite' }, renderConnectedActionCard(passCard)));
      // The illustrated board is accompanied by a complete text reading path. Keeping it
      // in a native disclosure preserves its state and focus during countdown redraws.
      children.push(h('section', { id: 'phone-menu-panel', class: 'phone-menu', hidden: phoneView !== 'more', 'aria-labelledby': 'phone-menu-heading' },
        h('div', { class: 'phone-panel-head' }, h('h2', { id: 'phone-menu-heading', tabindex: '-1' }, 'Menu'), closePanel('phone-menu-close')), ...sourceBanners, selfStatus, vote,
        h('details', { class: 'ms-readable-board' }, h('summary', null, 'Players and locations — readable list'), location, roster), ...footer.children), nav);
    }
    return { ...node, children };
  }
  const current = { ...context, phoneView, practice: model.connection === 'live' ? context.practice ?? null : null };
  const rendered = decoratePublic(withPracticeNotice(visit(source), current), current) as MarkupElement;
  return { ...rendered, attrs: { ...rendered.attrs, 'data-phone-view': phoneView, 'data-action-dock': String(dockedAction || passCard !== null) } };
}

export function renderComicTableShell(model: TableShellModel, context: ComicContext = {}): MarkupElement {
  const current = { ...context, practice: model.match && model.connection === 'live' ? context.practice ?? null : null };
  return decoratePublic(withPracticeNotice(renderTableShell(model), current), current) as MarkupElement;
}
