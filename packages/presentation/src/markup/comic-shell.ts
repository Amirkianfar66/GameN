import type { OwnAcknowledgments, FullPracticeBotsDocument, SeatId } from '@mothership/contracts';
import { SHELL_IDS } from '../ids.js';
import { placeSeats, rowsFor } from '../model/stations.js';
import { en } from '../copy/en.js';
import type { ActionBoardMarksModel, CardButtonModel, ConnectedActionCardModel, ConnectedPlayerShellModel, InsiderSetModel, SeatModel, TableShellModel } from '../model/types.js';
import { h, isElement } from './node.js';
import type { MarkupAttributeValue, MarkupChild, MarkupElement, MarkupNode } from './node.js';
import { renderConnectedPlayerShell } from './connected-player.js';
import { renderButton } from './player-shell.js';
import { renderTableShell } from './table-shell.js';
import { hiddenText, renderZones } from './parts.js';

/** Public identity only. The transport validates the separately versioned document. */
export interface ComicIdentity {
  readonly seatId: string;
  readonly displayName: string | null;
  readonly characterId: string | null;
}
export interface ComicContext {
  readonly phoneNotice?: string | null;
  readonly phoneView?: 'board' | 'actions' | 'role' | 'more';
  readonly identities?: readonly ComicIdentity[];
  readonly acknowledgments?: OwnAcknowledgments | null;
  readonly practice?: FullPracticeBotsDocument | null;
  /** The snapshot inspected in the Insider's file, by seat. A phone's own state, set by a deliberate tap. */
  readonly inspect?: string | null;
}

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

/** A seat's public facts, in the words every screen can show: where it is, its health, Captain, Jail. */
function publicFacts(seat: SeatModel): string {
  return [seat.location, en.marker.health(seat.health), seat.captain ? en.marker.captain : null, seat.jailed ? en.marker.jailed : null]
    .filter((fact): fact is string => fact !== null).join(' · ');
}

/**
 * The Insider's file (the Designer's ability art abilities-0.1.0, PR #102 at 1453500;
 * exact source paths in docs/frontend/insider-file.md): the three players of the role's starting knowledge as three snapshots pinned in
 * public seat order, and the three roles they hold between them, one each, as one slip in one
 * envelope below all three. Nothing pairs a player with a role: every snapshot is built the same
 * way, with the same frame, pin, query tag and tilt for its position; no role is written on,
 * beside or about a snapshot; and the roles are one picture with one accessible name, in the
 * rule's order whatever the deal was. A portrait is the character the player chose, a public
 * picture every phone has already loaded. Inspecting a snapshot says only that player's public
 * facts. Render only inside the open private card of the seat's own live view.
 */
function renderInsiderFile(set: InsiderSetModel, context: ComicContext, seats: readonly SeatModel[]): MarkupElement {
  const words = en.insiderFile;
  const inspected = seats.find(seat => seat.seatId === context.inspect && set.seatIds.includes(seat.seatId)) ?? null;
  const snapshots = set.seatIds.map(seatId => {
    const number = seatId.slice(5);
    const identity = identityFor(context, seatId);
    const look = character(identity?.characterId);
    const name = identity?.displayName ?? null;
    // The seat number is an evidence sticker on the portrait (or, without one, the portrait
    // itself), so the caption holds the whole width for the name. A name too long for a small
    // snapshot ends in an ellipsis there and is said whole by the button and the inspect card.
    return h('li', { class: 'ab-suspect' },
      h('button', {
        type: 'button', class: 'ab-photo', id: `ab-photo-${number}`, 'data-seat': number,
        'aria-pressed': String(inspected?.seatId === seatId), 'aria-label': words.inspect(Number(number), name),
      },
      h('span', { class: 'ab-photo__frame', 'aria-hidden': 'true' },
        h('span', { class: 'ab-photo__art', ...(look ? { 'data-character': look } : {}) }),
        h('span', { class: 'ab-photo__numeral' }, number),
        h('span', { class: 'ab-photo__pin' }), h('span', { class: 'ab-photo__query' }),
        h('span', { class: 'ab-seat ab-photo__seat' }, number)),
      h('span', { class: 'ab-photo__caption', 'aria-hidden': 'true' },
        h('span', { class: 'ab-seat ab-photo__caption-seat' }, number), h('span', { class: 'ab-photo__name' }, name))));
  });
  const inspectedName = inspected ? identityFor(context, inspected.seatId)?.displayName ?? null : null;
  // The inspect card's words are redrawn inside a live container that stays put, so they are said
  // when they change. Nothing in it is new: they are facts every screen shows.
  const card = h('div', { class: 'ab-inspect__card', 'data-region': 'insider-inspect', hidden: inspected === null },
    inspected === null ? null : [
      h('p', { class: 'ab-inspect__who' }, h('span', { class: 'ab-inspect__lens', 'aria-hidden': 'true' }),
        h('span', { class: 'ab-seat' }, hiddenText('Player '), String(inspected.number)),
        inspectedName ? [hiddenText(', '), h('span', { class: 'ab-inspect__name' }, inspectedName)] : null),
      h('p', { class: 'ab-inspect__facts' }, publicFacts(inspected)),
      h('div', { class: 'ab-inspect__controls' },
        h('button', { type: 'button', class: 'ab-button', id: 'ab-inspect-show', 'data-file-act': 'show', 'data-seat': String(inspected.number) }, words.showOnBoard),
        h('button', { type: 'button', class: 'ab-button', id: 'ab-inspect-back', 'data-file-act': 'back', 'data-seat': String(inspected.number) }, words.back)),
    ]);
  return h('section', { class: 'ab-file', 'data-file': 'insider', 'aria-labelledby': 'ab-file-title', 'data-region': 'insider-file', 'data-focus-fallback': 'ab-file-title' },
    // The Designer's tab is a header; a div here, so the shell keeps its one banner landmark.
    h('div', { class: 'ab-file__tab' },
      h('h3', { class: 'ab-file__title', id: 'ab-file-title', tabindex: '-1' }, words.title),
      h('span', { class: 'ab-stamp', 'data-stamp': 'classified', 'aria-hidden': 'true' }, words.classified)),
    // The release's own sentence for this knowledge, which the card's list then does not repeat.
    h('p', { class: 'ab-vh ms-visually-hidden' }, set.sentence),
    h('div', { class: 'ab-file__field' },
      (['tl', 'tr', 'br', 'bl'] as const).map(corner => h('span', { class: 'ab-corner-pin', 'data-corner': corner, 'aria-hidden': 'true' })),
      h('ol', { class: 'ab-suspects', 'aria-label': words.suspects, 'data-region': 'insider-suspects', 'data-focus-fallback': 'ab-file-title' }, snapshots),
      // The three roles as one set: one picture with one accessible name, the names stacked in one
      // slip below all three snapshots and beside none, never a list or a row a screen reader or
      // the eye could pair with them.
      h('div', { class: 'ab-roles', role: 'img', 'aria-label': words.roleSet(set.roles) },
        h('span', { class: 'ab-roles__back' }),
        h('span', { class: 'ab-roles__slip' }, set.roles.map(role => h('span', { class: 'ab-roles__name' }, role))),
        h('span', { class: 'ab-roles__front' }), h('span', { class: 'ab-roles__clip' }),
        h('span', { class: 'ab-stamp', 'data-stamp': 'one-each' }, words.oneEach))),
    // The string round the whole set is drawn by the host from the four corner pins, here.
    h('p', { class: 'ab-file__note' }, words.note),
    h('div', { class: 'ab-inspect', 'aria-live': 'polite' }, card));
}

/** The knowledge list without the Insider’s sentence, where the file says it instead. */
function withoutSentence(region: MarkupNode, sentence: string | null): MarkupNode {
  if (sentence === null || !isElement(region)) return region;
  const drop = (node: MarkupNode): MarkupNode | null => {
    if (!isElement(node)) return node;
    if (classHas(node, 'ms-knowledge__item') && node.children.length === 1 && node.children[0] === sentence) return null;
    return { ...node, children: node.children.map(drop).filter((child): child is MarkupNode => child !== null) };
  };
  return drop(region) ?? region;
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

/** The rooms whose name tag is the control that moves there. Hospital and Jail are never entered by choice. */
const MOVE_ROOMS: Readonly<Record<string, string>> = { 'room-a': 'Room A', 'room-b': 'Room B', 'command-room': 'Command Room' };
/** A share of a panel, as a short attribute value. */
const share = (value: number): string => String(Math.round(value * 1000) / 1000);

/**
 * The comic board on the player's own phone. Every character stands at a station worked out
 * from public occupancy alone, so this phone and every other draw the same board. The marks of
 * the player's own command (press areas, picks, a pending command, a tentative move) come only
 * from the open card, and the board is marked as the viewer's own so that a stylesheet draws
 * them nowhere else.
 */
function renderOwnBoard(
  match: NonNullable<ConnectedPlayerShellModel['match']>, context: ComicContext,
  marks: ActionBoardMarksModel | null, choices: readonly { readonly id: string; readonly value: string; readonly label: string }[],
): MarkupElement {
  const zones = match.roster.zones;
  const placed = placeSeats(zones);
  const final = zones.some(zone => zone.id === 'final-zone');
  const ghostZone = marks?.move ? zones.find(zone => zone.name === marks.move!.destination)?.id ?? null : null;
  const ownCharacter = character(identityFor(context, match.identity.seatId)?.characterId);

  function seat(node: MarkupElement): MarkupElement {
    const seatId = String(node.attrs['data-seat']) as SeatId;
    const station = placed.get(seatId);
    const attrs: Record<string, MarkupAttributeValue> = { ...node.attrs };
    if (station) {
      Object.assign(attrs, { 'data-station': station.station, 'data-x': share(station.x), 'data-row': String(station.row), 'data-depth': share(station.depth), 'data-gap': share(station.gap) });
    }
    if (!marks) return { ...node, attrs };
    const children: MarkupNode[] = [...node.children];
    const choice = marks.eligible.includes(seatId) ? choices.find(item => item.value === seatId) : undefined;
    const pick = marks.picked.indexOf(seatId);
    const pending = marks.pending.includes(seatId);
    const state = pending ? 'pending' : pick >= 0 ? (marks.numbered ? 'picked' : 'selected') : choice ? 'eligible' : marks.faint ? 'other' : null;
    if (state !== null) attrs['data-board-target'] = state;
    if (choice) {
      const name = identityFor(context, seatId)?.displayName;
      children.push(h('button', {
        type: 'button', class: 'phone-character-target', id: choice.id, 'data-intent': 'action/choose', 'data-value': choice.value,
        'aria-describedby': SHELL_IDS.actionStep, 'aria-label': `Select ${choice.label}${name ? `, ${name}` : ''}`,
      }, hiddenText('Select')));
    }
    if (pick >= 0) children.push(h('span', { class: 'phone-pick-order', 'data-mark': marks.numbered ? 'number' : 'check' },
      hiddenText(marks.numbered ? 'Selected ' : 'Selected'), h('span', { 'aria-hidden': 'true' }, marks.numbered ? String(pick + 1) : '✓')));
    if (pending) children.push(h('span', { class: 'phone-pick-order', 'data-mark': 'pending', 'aria-hidden': 'true' }, '…'));
    return { ...node, attrs, children };
  }

  function visitBoard(node: MarkupNode): MarkupNode {
    if (!isElement(node)) return node;
    if (classHas(node, 'ms-zones')) return { ...node, attrs: { ...node.attrs, 'data-final': String(final) }, children: node.children.map(visitBoard) };
    if (classHas(node, 'ms-zone')) {
      const id = String(node.attrs['data-zone']);
      const count = zones.find(zone => zone.id === id)?.seats.length ?? 0;
      const rows = rowsFor(id, count);
      const children = node.children.map(visitBoard);
      // The tentative place of the player's own move: decoration over the room asked for, until the view shows them there.
      const ghost = ghostZone === id ? h('span', { class: 'phone-move-ghost', 'data-state': marks!.move!.state, 'data-character': ownCharacter, 'aria-hidden': 'true' },
        h('span', { class: 'phone-move-ghost__art' }), h('span', { class: 'phone-move-ghost__tag' }, 'You?')) : null;
      // During a showdown the Final Zone is the whole board; everyone is still in the readable list.
      const hidden = final && id !== 'final-zone' ? { hidden: true } : {};
      return { ...node, attrs: { ...node.attrs, 'data-count': String(count), 'data-rows': String(rows), 'data-crowd': String(count > 5), ...hidden },
        children: [h('span', { class: 'phone-room-stage', 'aria-hidden': 'true' }), ...children, ...(ghost ? [ghost] : [])] };
    }
    if (classHas(node, 'ms-zone__name')) {
      const zone = String(node.attrs.id).replace(/^ms-comic-zone-/u, '');
      const room = MOVE_ROOMS[zone];
      // A move tag's button is its press area; the slanted caption is drawn on the span inside it.
      if (room) return { ...node, children: [h('button', { type: 'button', id: `phone-move-${zone}`, class: 'phone-room-move', 'data-move-room': room, 'aria-label': `Move to ${room}` },
        h('span', { class: 'phone-room-tag' }, ...node.children, h('span', { class: 'phone-room-tag__go', 'aria-hidden': 'true' }, ' ↗')))] };
      return { ...node, children: [h('span', { class: 'phone-room-tag' }, ...node.children)] };
    }
    if (classHas(node, 'ms-seat') && node.attrs['data-seat'] !== undefined) return seat(node);
    return { ...node, children: node.children.map(visitBoard) };
  }

  return h('section', { class: 'ms-panel ms-board', 'aria-labelledby': 'ms-comic-board-heading', 'data-region': 'comic-board', 'data-board': 'own', 'data-final': String(final) },
    h('h2', { class: 'ms-panel__heading', id: 'ms-comic-board-heading' }, 'The ship'),
    visitBoard(renderZones(zones, 'ms-comic-zone')));
}

/**
 * The strip above navigation: the step's line with the action's name set into it, one detail
 * line, the answers that are not characters, and the controls. The ids, intents and nested
 * regions are those of the release's action card, so focus, redraw and the command controller
 * are unchanged; only the seat answers are gone from it, because they are on the board.
 */
function renderActionStrip(card: ConnectedActionCardModel): MarkupElement {
  const body = card.body;
  // The step's line, focused after every step. The action's name is set into it as a caption,
  // so "Choose a target" is never read without saying which action it is for.
  const line = (className: string, text: string): MarkupElement => h('p', { class: className, id: SHELL_IDS.actionStep, tabindex: '-1' },
    h('span', { class: 'phone-strip__kind' }, card.title), hiddenText(': '), text);
  const detail = (...children: readonly MarkupChild[]): MarkupElement => h('p', { class: 'phone-strip__detail' }, ...children);
  const controls = (...buttons: readonly (CardButtonModel | null)[]): MarkupElement =>
    h('div', { class: 'ms-card__controls', 'data-region': 'action-controls' }, buttons.map(button => (button ? renderButton(button) : null)));
  let words: MarkupChild[] = [];
  let answers: MarkupElement | null = null;
  let buttons: MarkupElement | null = null;
  // Where the controls go: beside the words (side), sharing one row with a single answer
  // (pair), or a row of their own beneath the words (row).
  let layout: 'side' | 'pair' | 'row' | 'none' = 'side';
  switch (body.step) {
    case 'idle':
      return h('div', { class: 'ms-card', 'data-action': 'connected' });
    case 'choosing': {
      const offered = body.choices.filter(choice => choice.number === null);
      const seats = body.choices.length - offered.length;
      const picked = card.board.picked.length;
      const parts = card.kind === 'supply' ? 2 : card.kind === 'code' ? 4 : 0;
      // Supply and a Code attempt count their picks in numbered dots, the same numbers the board shows.
      const dots = parts > 0 ? h('span', { class: 'phone-strip__progress', 'aria-hidden': 'true' },
        Array.from({ length: parts }, (_, index) => h('span', { 'data-done': String(index < picked) }, index < picked ? String(index + 1) : ''))) : null;
      words = [
        line('ms-card__prompt', body.prompt),
        // A Scan's line already names its seat; the others say what is chosen so far, or how to choose.
        picked > 0 && card.kind !== 'scan' && body.progress ? detail(dots, body.progress)
          : seats > 0 ? detail(dots, hiddenText(card.title), ' · Tap a character') : null,
        h('p', { class: 'ms-card__text ms-visually-hidden' }, body.note),
      ];
      answers = offered.length === 0 ? null : h('ul', { class: 'ms-targets phone-strip__answers', 'aria-labelledby': SHELL_IDS.actionStep },
        offered.map(choice => h('li', null, h('button', { type: 'button', class: 'ms-button ms-target', id: choice.id, 'data-intent': 'action/choose', 'data-value': choice.value },
          h('span', { class: 'ms-target__name' }, choice.label)))));
      buttons = controls(body.back);
      layout = offered.length === 1 ? 'pair' : offered.length === 0 && body.back.label.length > 11 ? 'row' : 'side';
      break;
    }
    case 'confirming':
      words = [line('ms-card__prompt', body.prompt), detail(body.consequence)];
      buttons = controls(body.confirm, body.back);
      layout = 'row';
      break;
    case 'busy':
      words = [line('ms-card__text ms-card__busy', body.text)];
      layout = 'none';
      break;
    case 'result':
      words = [line('ms-card__result', body.text), body.detail ? detail(body.detail) : null];
      buttons = controls(body.action);
      break;
  }
  return h('div', { class: 'ms-card phone-strip', 'data-action': 'connected' },
    // The title stays put while the part below is redrawn, so it can hold focus during a request.
    h('h4', { class: 'ms-card__title', id: SHELL_IDS.actionTitle, tabindex: '-1' }, card.title),
    h('div', {
      class: 'ms-card__state', 'data-region': 'action', 'data-status': card.status, 'data-step': body.step, 'data-selected': String(card.selected),
      // The action the strip is about, when it knows it (a reloaded page may not): the hook for that action's own art.
      'data-kind': card.kind, 'data-strip': layout, 'data-focus-fallback': SHELL_IDS.actionTitle,
    },
      // The release's status word, the same for every action, drawn as a stamp once a command is sent.
      h('p', { class: 'ms-card__status' }, card.statusLabel),
      h('div', { class: 'phone-strip__text' }, words),
      answers, buttons,
    ),
  );
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
    (['board', 'actions', 'pass', 'role', 'more'] as const).map(view => view === 'pass' ? !match.passTurn.inRules
      // A match whose ruleset has no Pass keeps the middle of navigation empty, so nothing else moves.
      ? h('span', { class: 'phone-nav__slot', 'aria-hidden': 'true' })
      : h('button', {
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
  const passCard = phoneView === 'board' && !match.privateArea.open && !match.result ? match.passTurn.card : null;
  // Selection cues live only on this player's explicitly open action surface. The shared
  // display and the ordinary public board never receive legal targets or picks.
  const board = renderOwnBoard(match, context, dockedAction && card ? card.board : null,
    card?.body.step === 'choosing' ? card.body.choices.filter(choice => choice.number !== null) : []);
  const active = match.roster.zones.flatMap(zone => zone.seats).find(seat => seat.isActive);
  const activeName = active ? identityFor(context, active.seatId)?.displayName : null;
  const turnLine = active ? active.isSelf ? 'Your turn' : `${activeName ?? active.label}’s turn` : match.phase.phaseLabel;
  const ownName = identityFor(context, match.identity.seatId)?.displayName;
  const selfStatus = h('section', { class: 'phone-self', 'data-region': 'phone-self', 'aria-label': 'Your public status' },
    h('strong', null, `Player ${match.identity.number}${ownName ? ` · ${ownName}` : ''}`),
    h('span', null, match.location.name), h('span', null, match.location.self.markers.map(marker => marker.label).join(' · ')));

  const closePanel = (id: string): MarkupElement => h('button', { type: 'button', id, class: 'phone-panel-close', 'data-phone-view': 'board', 'aria-label': 'Close panel' }, '×');
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
      h('div', { id: 'ms-private-panel', class: 'ms-private__panel' }, context.phoneNotice ? h('p', { class: 'phone-panel-notice ms-notice', role: 'status' }, context.phoneNotice) : null, h('div', { class: 'ms-actions' }, renderActionStrip(card))));
      return { ...node, attrs: { ...node.attrs, hidden: !match!.privateArea.open }, children: [h('div', { class: 'phone-panel-head' }, h('h2', { id: 'ms-private-heading', tabindex: '-1' }, phoneView === 'role' ? 'Your card' : 'Actions'), closePanel('phone-private-close')), ...(context.phoneNotice && match!.privateArea.open ? [h('p', { class: 'phone-panel-notice', role: 'status' }, context.phoneNotice)] : []), ...node.children.filter(child => !isElement(child) || !['ms-private-toggle', 'ms-private-hint', 'ms-private-heading'].includes(String(child.attrs.id))).map(visit)] };
    }
    if (node.attrs.id === 'ms-private-heading') return { ...node, attrs: { ...node.attrs, tabindex: '-1', class: 'ms-visually-hidden' }, children: [phoneView === 'role' ? 'Your role' : 'Actions'] };
    if (node.attrs['data-region'] === 'result') return { ...node, attrs: { ...node.attrs, hidden: phoneView === 'more' } };
    if (classHas(node, 'ms-footer')) return h('div', { hidden: true });
    if (classHas(node, 'ms-phase__label') && active) return { ...node, children: [turnLine] };
    let children = node.children.map(visit);
    let file = false;
    if (classHas(node, 'ms-private__panel') && privateContent) {
      // The Insider's three players are drawn in the Insider's file, which says the sentence
      // itself, so the card's list of what the seat knows does not repeat it. A view the server no
      // longer confirms keeps the card as the release draws it, with the file at rest under the
      // release's "may be out of date" banner (the Designer's DSN-REQ-16 recommendation, pending
      // Integration): it holds nothing the phone does not already hold, and nothing in it acts.
      const insider = privateContent.knowledge?.insider ?? null;
      children = children.map(child => (isElement(child) && child.attrs['data-region'] === 'knowledge' ? withoutSentence(child, insider?.sentence ?? null) : child));
      if (insider && phoneView === 'role') {
        file = true;
        // Under the role card, which makes way by becoming a row.
        const at = children.findIndex(child => isElement(child) && classHas(child, 'ms-role-card'));
        children.splice(at < 0 ? children.length : at + 1, 0, renderInsiderFile(insider, context, match!.roster.zones.flatMap(zone => zone.seats)));
      }
    }
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
      // The strip, the tray or a Pass receipt comes before the board in reading and focus order:
      // focus lands on the strip's question, and the next Tab reaches its answers, then the
      // characters. The page's grid still draws the strip above navigation.
      const passStatus = passCard ? h('section', { class: 'phone-action-dock phone-pass-status', 'data-region': 'pass-status', 'aria-label': 'Turn status', 'aria-live': 'polite' }, renderActionStrip(passCard)) : null;
      children.splice(privateIndex + 1, 0, ...(passStatus ? [passStatus] : []), board);
      // The illustrated board is accompanied by a complete text reading path. Keeping it
      // in a native disclosure preserves its state and focus during countdown redraws.
      children.push(h('section', { id: 'phone-menu-panel', class: 'phone-menu', hidden: phoneView !== 'more', 'aria-labelledby': 'phone-menu-heading' },
        h('div', { class: 'phone-panel-head' }, h('h2', { id: 'phone-menu-heading', tabindex: '-1' }, 'Menu'), closePanel('phone-menu-close')), ...sourceBanners, selfStatus, vote,
        h('details', { class: 'ms-readable-board' }, h('summary', null, 'Players and locations — readable list'), location, roster), ...footer.children), nav);
    }
    if (file) return { ...node, attrs: { ...node.attrs, 'data-file': 'insider' }, children };
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
