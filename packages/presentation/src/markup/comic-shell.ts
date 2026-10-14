import type { OwnAcknowledgments, FullPracticeBotsDocument, SeatId } from '@mothership/contracts';
import { SHELL_IDS } from '../ids.js';
import { placeSeats, rowsFor } from '../model/stations.js';
import { en } from '../copy/en.js';
import type { ActionBoardMarksModel, CardButtonModel, ConnectedActionCardModel, ConnectedPlayerShellModel, InsiderSetModel, SeatModel, TableShellModel } from '../model/types.js';
import { h, isElement } from './node.js';
import type { MarkupAttributeValue, MarkupChild, MarkupElement, MarkupNode } from './node.js';
import { renderConnectedPlayerShell, renderHackFeedback } from './connected-player.js';
import { renderButton } from './player-shell.js';
import { renderTableShell } from './table-shell.js';
import { hiddenText, renderZones } from './parts.js';
import { deliveryNotes, intelFile, privateNotes, resultSheet, stripArt } from './ability-art.js';
import { renderVoteResultPanel } from './phase-feedback.js';

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
// Release copy remains here for the reviewed quote checks; the treatment shares it.
const DELIVERY_WORDS = {
  heading: 'Supply results', none: 'No players received a weapon from your Round 3 Supply.',
  unavailable: 'Supply result history is unavailable for this match.',
  supplied: (names: string): string => `Your Round 3 Supply granted one weapon each to ${names}.`,
  received: (result: { readonly round: number }): string => `You received one ordinary weapon from Supply in Round ${result.round}.`,
};

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
  if (ownSeat && identity?.displayName) attrs['data-display-name'] = identity.displayName;
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
 * The Insider's file (Designer PR #102 at 1453500; provenance in the Frontend handoff):
 * the three players of the role's starting knowledge as three snapshots pinned in
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
  if (match.boardLayout?.dark) return h('section', { class: 'ms-board', 'aria-label': 'Lights out' },
    h('h2', { id: 'ms-comic-board-heading', class: 'ms-visually-hidden' }, 'The ship'), h('p', null, 'Lights out.'));
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
function renderActionStrip(card: ConnectedActionCardModel, context: ComicContext, boardV2 = false): MarkupElement {
  if (boardV2) return renderBoardV2Action(card);
  const body = card.body;
  const sourceArt = stripArt(card, context);
  // The Code's identities are already on its picked characters and in the exact prompt.
  // Its decorative four-portrait gallery repeats those facts and consumes phone height.
  const compactCode = card.kind === 'code' && (body.step === 'choosing' || body.step === 'confirming');
  const art = compactCode ? { prompt: null, detail: null } : sourceArt;
  const codeConfirmation = card.kind === 'code' && body.step === 'confirming';
  // The step's line, focused after every step. The action's name is set into it as a caption,
  // so "Choose a target" is never read without saying which action it is for.
  const line = (className: string, text: string): MarkupElement => h('p', { class: className, id: SHELL_IDS.actionStep, tabindex: '-1' },
    art.prompt ?? (codeConfirmation ? art.detail : null), compactCode ? null : h('span', { class: 'phone-strip__kind' }, card.title), compactCode ? null : hiddenText(': '), text);
  const detail = (...children: readonly MarkupChild[]): MarkupElement => h('p', { class: 'phone-strip__detail' }, codeConfirmation ? null : art.detail, ...children);
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
      buttons = h('div', { class: 'ms-card__controls', 'data-region': 'action-controls' },
        body.offers.filter(offer => offer.kind === 'declare-hack-side' && offer.open !== null).map(offer =>
          h('button', { type: 'button', class: 'ms-button ms-button--primary', id: offer.open!.id,
            'data-intent': 'action/open', 'data-kind': offer.kind }, offer.label)));
      layout = 'none';
      break;
    case 'choosing': {
      const offered = body.choices.filter(choice => choice.number === null);
      const seats = body.choices.length - offered.length;
      const picked = card.board.picked.length;
      const parts = card.kind === 'supply' ? 2 : card.kind === 'code' ? 4 : 0;
      // Supply and a Code attempt count their picks in numbered dots, the same numbers the board shows.
      const dots = parts > 0 && art.detail === null ? h('span', { class: 'phone-strip__progress', 'aria-hidden': 'true' },
        Array.from({ length: parts }, (_, index) => h('span', { 'data-done': String(index < picked) }, index < picked ? String(index + 1) : ''))) : null;
      words = [
        line('ms-card__prompt', body.prompt),
        // The picked characters already carry the names and equal check marks. Keep
        // the full selection sentence accessible; the dots show its count compactly.
        card.kind === 'code' ? detail(dots, hiddenText(body.progress ?? 'No players selected.')) :
        // A Scan's line already names its seat; the others say what is chosen so far, or how to choose.
        picked > 0 && card.kind !== 'scan' && body.progress ? detail(dots, body.progress)
          : seats > 0 ? detail(dots, hiddenText(card.title), ' · Tap a character') : null,
        h('p', { class: 'ms-card__text ms-visually-hidden' }, body.note),
      ];
      answers = offered.length === 0 ? null : h('ul', { class: 'ms-targets phone-strip__answers', 'aria-labelledby': SHELL_IDS.actionStep },
        offered.map(choice => h('li', null, h('button', { type: 'button', class: 'ms-button ms-target', id: choice.id, 'data-intent': 'action/choose', 'data-value': choice.value },
          h('span', { class: 'ms-target__name' }, choice.label)))));
      buttons = controls(body.back);
      layout = offered.length === 1 ? 'pair' : card.kind !== 'code' && offered.length === 0 && body.back.label.length > 11 ? 'row' : 'side';
      break;
    }
    case 'confirming':
      words = [line('ms-card__prompt', body.prompt), detail(body.consequence)];
      buttons = controls(body.confirm, body.back);
      layout = 'row';
      break;
    case 'busy':
      words = [line('ms-card__text ms-card__busy', body.text), art.detail ? detail() : null];
      layout = 'none';
      break;
    case 'result':
      words = [line('ms-card__result', body.text), body.detail || art.detail ? detail(body.detail) : null];
      buttons = controls(body.action);
      break;
  }
  return h('div', { class: 'ms-card phone-strip', 'data-action': 'connected' },
    // The title stays put while the part below is redrawn, so it can hold focus during a request.
    h('h4', { class: 'ms-card__title', id: SHELL_IDS.actionTitle, tabindex: '-1' }, card.title),
    h('div', {
      class: 'ms-card__state', 'data-region': 'action', 'data-status': card.status, 'data-step': body.step, 'data-selected': String(card.selected),
      // The action the strip is about, when it knows it (a reloaded page may not): the hook for that action's own art.
      'data-kind': card.kind, 'data-resource-count': card.art?.resourceCount === null ? null : card.art?.resourceCount, 'data-strip': layout, 'data-focus-fallback': SHELL_IDS.actionTitle,
    },
      // The release's status word, the same for every action, drawn as a stamp once a command is sent.
      h('p', { class: 'ms-card__status' }, card.statusLabel),
      h('div', { class: 'phone-strip__text' }, words),
      answers, buttons,
    ),
  );
}

/** Native flow controls in Claude's fixed choosing row / lower sheet. No new wire action. */
function renderBoardV2Action(card: ConnectedActionCardModel): MarkupElement {
  const body = card.body;
  const characterChoice = body.step === 'choosing' && (body.choices.some(choice => choice.number !== null) || card.kind === 'blackout-slot');
  const title = h('h4', { class: 'ms-card__title ms-visually-hidden', id: SHELL_IDS.actionTitle, tabindex: '-1' }, card.title);
  const line = (text: string) => h('p', { class: 'ms-card__prompt', id: SHELL_IDS.actionStep, tabindex: '-1' }, text);
  let content: MarkupChild[] = [];
  let controls: MarkupChild[] = [];
  if (characterChoice && body.step === 'choosing') {
    const count = card.board.picked.length;
    const total = card.kind === 'code' ? 4 : card.kind === 'supply' ? 2 : 1;
    const compactPrompt = card.kind === 'blackout-slot' ? 'Choose a frozen position' : card.kind === 'code' ? `Code: choose ${total - count}` : card.kind === 'supply' ? `Supply: choose ${total - count}` : `${card.title}: choose a player`;
    const prompt = line(compactPrompt);
    content = [{ ...prompt, attrs: { ...prompt.attrs, 'aria-label': `${card.title}: ${body.prompt}` } }, hiddenText(body.note), hiddenText(body.progress ?? '')];
    controls = [h('button', { type: 'button', id: 'bv2-choice-private', 'data-board-private': 'toggle', 'aria-label': 'Show private claim and command status' }, 'Status'),
      h('button', { type: 'button', id: 'ms-action-cancel', 'data-intent': 'action/cancel' }, 'Cancel'),
      count > 0 ? h('button', { type: 'button', id: body.back.id, 'data-intent': body.back.intent, 'aria-label': body.back.label }, 'Undo') : null,
      h('span', { class: 'bv2-choice-count', role: 'status' }, `${count} of ${total}`)];
  } else switch (body.step) {
    case 'idle':
      content = [h('p', { class: 'ms-card__prompt' }, 'Choose an action')];
      controls = body.offers.filter(o => o.kind === 'declare-hack-side' && o.open).map(o => h('button', { type: 'button', id: o.open!.id, 'data-intent': 'action/open', 'data-kind': o.kind }, o.label));
      break;
    case 'choosing':
      content = [line(body.prompt), h('p', { class: 'ms-card__text' }, body.note), h('ul', { class: 'ms-targets bv2-side-choices' }, body.choices.map(choice => h('li', null,
        h('button', { type: 'button', id: choice.id, 'data-intent': 'action/choose', 'data-value': choice.value }, choice.label))))];
      controls = [renderButton(body.back)];
      break;
    case 'confirming': content = [line(body.prompt), h('p', { class: 'ms-card__text' }, body.consequence)]; controls = [renderButton(body.back), renderButton(body.confirm)]; break;
    case 'busy': content = [line(body.text)]; break;
    case 'result': content = [line(body.text), body.detail ? h('p', { class: 'ms-card__text' }, body.detail) : null]; controls = body.action ? [renderButton(body.action)] : []; break;
  }
  return h('div', { class: 'ms-card phone-strip bv2-command', 'data-action': 'connected' }, title,
    h('div', { class: `ms-card__state${characterChoice ? ' bv2-choosing' : ''}`, 'data-region': 'action', 'data-status': card.status, 'data-step': body.step,
      'data-kind': card.kind, 'data-focus-fallback': SHELL_IDS.actionTitle },
      h('div', { class: 'bv2-command-body' }, h('p', { class: 'ms-card__status' }, card.statusLabel), ...content),
      h('div', { class: 'ms-card__controls bv2-command-controls', 'data-region': 'action-controls' }, ...controls)));
}

/** Add the approved artwork without changing action availability, targets or authority. */
export function renderComicPlayerShell(model: ConnectedPlayerShellModel, context: ComicContext = {}): MarkupElement {
  const match = model.match;
  // The functional shell keeps one private panel. The illustrated phone gives its current
  // Hack feedback a separate row, while the command card retains its own recovery lifecycle.
  const content = match?.privateArea.content;
  const source = renderConnectedPlayerShell(match && content ? { ...model, match: { ...match,
    privateArea: { ...match.privateArea, content: { ...content, hackFeedback: null } } } } : model);
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
      disabled: (match.result || match.voteResult) && (view === 'role' || view === 'actions') || match.boardLayout?.dark && view === 'role' ? true : null,
      'aria-controls': view === 'more' ? 'phone-menu-panel' : view === 'board' ? 'ms-comic-board-heading' : 'ms-private-panel',
      'aria-expanded': view === 'board' ? null : String(phoneView === view),
    }, h('span', { class: `phone-nav__icon phone-nav__icon--${view}`, 'aria-hidden': 'true' }),
    h('span', null, view === 'more' ? 'Menu' : view === 'role' ? 'Card' : view === 'actions' ? 'Actions' : 'Board'))));
  const dark = match.boardLayout?.dark === true;
  const ownCharacter = dark ? null : character(identityFor(context, match.identity.seatId)?.characterId);
  const privateContent = match.privateArea.content;
  const voteResultPanel = renderVoteResultPanel(match.voteResult, context);
  const card = phoneView === 'actions' && !match.result && !match.voteResult ? privateContent?.actions.card : undefined;
  const hackFeedback = ['actions','role'].includes(phoneView) ? privateContent?.hackFeedback ?? null : null;
  const declarationOffer = card?.body.step === 'idle' && card.body.offers.some(offer => offer.kind === 'declare-hack-side' && offer.open !== null);
  const dockedAction = card !== undefined && (card.body.step !== 'idle' || hackFeedback !== null && declarationOffer);
  const passCard = phoneView === 'board' && !match.privateArea.open && !match.result && !match.voteResult ? match.passTurn.card : null;
  // Selection cues live only on this player's explicitly open action surface. The shared
  // display and the ordinary public board never receive legal targets or picks.
  const board = renderOwnBoard(match, context, dockedAction && card ? card.board : null,
    card?.body.step === 'choosing' ? card.body.choices.filter(choice => choice.number !== null) : []);
  const active = match.roster.zones.flatMap(zone => zone.seats).find(seat => seat.isActive);
  const activeName = active ? identityFor(context, active.seatId)?.displayName : null;
  const turnLine = active ? active.isSelf ? 'Your turn' : `${activeName ?? active.label}’s turn` : match.phase.phaseLabel;
  const ownName = dark ? null : identityFor(context, match.identity.seatId)?.displayName;
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
      if (label) return { ...node, attrs: { ...node.attrs, 'aria-labelledby': String(node.attrs.id) }, children: [h('span', { class: 'ability-offer-icon', 'data-kind': node.attrs['data-kind'], 'aria-hidden': 'true' }), label] };
    }
    if (dark && (classHas(node, 'ms-role-card') || classHas(node, 'ms-knowledge'))) return h('p', null, 'Lights out.');
    if (classHas(node, 'ms-role-card') && privateContent) return renderComicRoleCard(privateContent.role.name, ownCharacter);
    if (classHas(node, 'ms-private')) {
      if (match!.result || match!.voteResult) return h('div', { 'data-region': 'private' });
      if (dockedAction && card) return h('section', { class: 'ms-private phone-action-dock',
        'data-region': 'private', 'data-open': 'true', 'aria-labelledby': 'ms-private-heading', 'data-focus-fallback': 'ms-phone-actions',
      }, h('h2', { id: 'ms-private-heading', class: 'ms-visually-hidden', tabindex: '-1' }, 'Actions'),
      h('div', { id: 'ms-private-panel', class: 'ms-private__panel' }, context.phoneNotice ? h('p', { class: 'phone-panel-notice ms-notice', role: 'status' }, context.phoneNotice) : null,
        h('div', { class: 'ms-actions' }, renderActionStrip(card, context, Boolean(match!.boardLayout)))));
      if (hackFeedback && phoneView === 'actions' && !match!.boardLayout) return h('div', { 'data-region': 'private' });
      return { ...node, attrs: { ...node.attrs, hidden: !match!.privateArea.open }, children: [h('div', { class: 'phone-panel-head' }, h('h2', { id: 'ms-private-heading', tabindex: '-1' }, phoneView === 'role' ? 'Your card' : 'Actions'), closePanel('phone-private-close')), ...(context.phoneNotice && match!.privateArea.open ? [h('p', { class: 'phone-panel-notice', role: 'status' }, context.phoneNotice)] : []), ...(phoneView === 'actions' ? (privateContent?.actions.card.privateStatus ?? []).map(text => h('p', { class: 'bv2-private-status' }, text)) : []), ...node.children.filter(child => !isElement(child) || !['ms-private-toggle', 'ms-private-hint', 'ms-private-heading'].includes(String(child.attrs.id))).map(visit)] };
    }
    if (node.attrs.id === 'ms-private-heading') return { ...node, attrs: { ...node.attrs, tabindex: '-1', class: 'ms-visually-hidden' }, children: [phoneView === 'role' ? 'Your role' : 'Actions'] };
    if (node.attrs['data-region'] === 'result') {
      const result = resultSheet(match!.result, context);
      return { ...result, attrs: { ...result.attrs, hidden: phoneView === 'more' } };
    }
    if (node.attrs['data-region'] === 'vote-result') return phoneView === 'more' && match!.voteResult ? h('div', { 'data-region': 'vote-result' }) : voteResultPanel;
    if (classHas(node, 'ms-footer')) return h('div', { hidden: true });
    if (classHas(node, 'ms-phase__label') && active) return { ...node, children: [turnLine] };
    let children = node.children.map(visit);
    let file: string | null = null;
    if (classHas(node, 'ms-private__panel') && privateContent) {
      // The Insider's three players are drawn in the Insider's file, which says the sentence
      // itself, so the card's list of what the seat knows does not repeat it. Current-view
      // or authorization loss conceals this entire card. Recovery remains internal and a
      // newly confirmed view requires a deliberate reopening.
      const insider = privateContent.knowledge?.insider ?? null;
      children = children.map(child => (isElement(child) && child.attrs['data-region'] === 'knowledge' ? withoutSentence(child, insider?.sentence ?? null) : child));
      if (insider && phoneView === 'role') {
        file = 'insider';
        // Under the role card, which makes way by becoming a row.
        const at = children.findIndex(child => isElement(child) && classHas(child, 'ms-role-card'));
        children.splice(at < 0 ? children.length : at + 1, 0, renderInsiderFile(insider, context, match!.roster.zones.flatMap(zone => zone.seats)));
      }
      const intel = privateContent.knowledge ? intelFile(privateContent.knowledge, context, match!.roster.zones.flatMap(zone => zone.seats), match!.identity.seatId) : null;
      if (intel && phoneView === 'role') {
        file = String(intel.attrs['data-file']);
        const at = children.findIndex(child => isElement(child) && classHas(child, 'ms-role-card'));
        children.splice(at < 0 ? children.length : at + 1, 0, intel);
      }
    }
    if (classHas(node, 'ms-private__panel') && privateContent && model.connection === 'live') {
      const knowledge = children.find(child => isElement(child) && child.attrs['data-region'] === 'knowledge');
      if (knowledge) {
        children = children.filter(child => child !== knowledge);
        children.push(h('details', { class: 'phone-knowledge' }, h('summary', null, 'What you know'), knowledge));
      }
      if (phoneView === 'role') children.push(...privateNotes(privateContent, context, match!.identity.seatId));
      children.push(deliveryNotes(context, match!.identity.seatId, privateContent.role.name === 'Supplier', DELIVERY_WORDS));
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
      const passStatus = passCard ? h('section', { class: 'phone-action-dock phone-pass-status', 'data-region': 'pass-status', 'aria-label': 'Turn status', 'aria-live': 'polite' }, renderActionStrip(passCard, context, Boolean(match!.boardLayout))) : null;
      children.splice(privateIndex + 1, 0, ...(passStatus ? [passStatus] : []),
        h('div', { 'data-region': 'private-hack' }, renderHackFeedback(hackFeedback)), board);
      // The illustrated board is accompanied by a complete text reading path. Keeping it
      // in a native disclosure preserves its state and focus during countdown redraws.
      children.push(h('section', { id: 'phone-menu-panel', class: 'phone-menu', hidden: phoneView !== 'more', 'aria-labelledby': 'phone-menu-heading' },
        h('div', { class: 'phone-panel-head' }, h('h2', { id: 'phone-menu-heading', tabindex: '-1' }, 'Menu'), closePanel('phone-menu-close')),
        phoneView === 'more' && match!.voteResult ? { ...voteResultPanel, attrs: { ...voteResultPanel.attrs, 'data-region': 'menu-vote-result' } } : null,
        h('div', { class: 'phone-menu-content' }, ...sourceBanners, selfStatus, dark ? null : vote,
          dark ? h('p', null, 'Lights out. Public placements are concealed.') : h('details', { class: 'ms-readable-board' }, h('summary', null, 'Players and locations — readable list'), location, roster), ...footer.children)), nav);
    }
    if (file) return { ...node, attrs: { ...node.attrs, 'data-file': file }, children };
    return { ...node, children };
  }
  const current = { ...context, ...(dark ? { identities: [] } : {}), phoneView, practice: model.connection === 'live' ? context.practice ?? null : null };
  const rendered = decoratePublic(withPracticeNotice(visit(source), current), current) as MarkupElement;
  const recovery = match.boardLayout && !match.privateArea.open && match.commandRecovery && !passCard
    ? h('section', { class: 'bv2-recovery', 'data-region': 'command-recovery', 'aria-label': 'Command recovery' },
      h('p', { role: 'status' }, match.commandRecovery.text), match.commandRecovery.canCheck
        ? h('button', { type: 'button', id: 'ms-action-check', 'data-intent': 'action/check-again', disabled: match.commandRecovery.disabled }, 'Check again') : null) : null;
  return { ...rendered, attrs: { ...rendered.attrs, 'data-phone-view': phoneView, 'data-action-dock': String(dockedAction || passCard !== null) }, children: [...rendered.children, ...(recovery ? [recovery] : [])] };
}

export function renderComicTableShell(model: TableShellModel, context: ComicContext = {}): MarkupElement {
  const current = { ...context, practice: model.match && model.connection === 'live' ? context.practice ?? null : null };
  const visit = (node: MarkupNode): MarkupNode => !isElement(node) ? node : node.attrs['data-region'] === 'result' ? resultSheet(model.match?.result ?? null, context)
    : node.attrs['data-region'] === 'vote-result' ? renderVoteResultPanel(model.match?.voteResult ?? null, context) : { ...node, children: node.children.map(visit) };
  return decoratePublic(withPracticeNotice(visit(renderTableShell(model)), current), current) as MarkupElement;
}
