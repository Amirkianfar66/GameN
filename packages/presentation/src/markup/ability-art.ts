// Field-driven treatments for the uniform 49-asset kit, Designer PR #111 at 49f0db4d.
// The handoff and source paths are recorded in Frontend provenance documentation.
import type { SeatId } from '@mothership/contracts';
import type { ConnectedActionCardModel, ConnectedPrivateAreaModel, ResultModel, SeatModel } from '../model/types.js';
import type { ComicContext } from './comic-shell.js';
import { en } from '../copy/en.js';
import { h } from './node.js';
import type { MarkupElement } from './node.js';
import { hiddenText } from './parts.js';

type Content = NonNullable<ConnectedPrivateAreaModel['content']>;
type Knowledge = NonNullable<Content['knowledge']>;
const bySeat = (a: SeatId, b: SeatId): number => Number(a.slice(5)) - Number(b.slice(5));
const identity = (context: ComicContext, seatId: SeatId) => context.identities?.find(item => item.seatId === seatId);
const look = (context: ComicContext, seatId: SeatId): string | null => {
  const value = identity(context, seatId)?.characterId;
  return typeof value === 'string' && /^c[1-9]$/u.test(value) ? value : null;
};

export function chip(seatId: SeatId, context: ComicContext): MarkupElement {
  const character = look(context, seatId);
  return h('span', { class: 'ab-chip', 'data-seat': seatId.slice(5), 'aria-hidden': 'true' },
    h('span', { class: 'ab-chip__art', 'data-character': character }),
    h('span', { class: 'ab-chip__numeral' }, seatId.slice(5)),
    h('span', { class: 'ab-seat ab-chip__seat' }, seatId.slice(5)));
}

function target(seatId: SeatId | null, mark: string, context: ComicContext, vote: string | null = null): MarkupElement {
  return h('span', { class: `ab-target${mark === 'ballot' ? ' ab-ballot' : ''}`, 'data-mark': mark, 'data-vote': vote, 'aria-hidden': 'true' },
    seatId === null ? null : chip(seatId, context), h('span', { class: 'ab-target__mark' }),
    mark === 'ballot' ? h('span', { class: 'ab-ballot__pencil', 'data-pencil': vote === 'no' ? 'x-mark' : vote === 'abstain' ? 'dash' : 'tick' }) : null);
}

function vials(count: number): MarkupElement {
  return h('span', { class: 'ab-vials', 'data-remaining': String(count), 'aria-hidden': 'true' },
    [0, 1].map(index => h('span', { class: 'ab-vial', 'data-full': String(index < count) })));
}
function rounds(count: number, spent = false, special = false): MarkupElement {
  return h('span', { class: 'ab-rounds', 'aria-hidden': 'true' }, Array.from({ length: Math.min(count, 9) }, () =>
    h('span', { class: 'ab-round', 'data-spent': String(spent), 'data-special': String(special) })));
}
function tags(seatIds: readonly SeatId[], context: ComicContext, tied = false): MarkupElement {
  const sorted = [...seatIds].sort(bySeat);
  return h('span', { class: 'ab-tags', 'data-count': String(sorted.length), 'data-tied': String(tied), 'aria-hidden': 'true' },
    [0, 1].map(index => h('span', { class: 'ab-tag', 'data-filled': String(index < sorted.length) }, sorted[index] ? chip(sorted[index]!, context) : null)),
    h('span', { class: 'ab-tags__string' }));
}

/** Pictures of an own choice; registration never depicts a gameplay result. */
export function stripArt(card: ConnectedActionCardModel, context: ComicContext): { prompt: MarkupElement | null; detail: MarkupElement | null } {
  const art = card.art;
  if (!art || card.kind === null) return { prompt: null, detail: null };
  const first = art.seatIds[0] ?? null;
  const accepted = card.status === 'accepted';
  let prompt: MarkupElement | null = null, detail: MarkupElement | null = null;
  switch (card.kind) {
    case 'scan':
      prompt = first === null ? null : h('span', { class: 'ab-scan-target', 'data-sweeping': String(card.status === 'submitting' || card.status === 'checking'), 'aria-hidden': 'true' }, chip(first, context), h('span', { class: 'ab-scan-target__sweep' }));
      break;
    case 'code':
      detail = h('span', { class: 'ab-code-card', 'data-count': String(art.seatIds.length), 'data-punched': String(accepted), 'aria-hidden': 'true' },
        [0, 1, 2, 3].map(index => h('span', { class: 'ab-code-card__window', 'data-filled': String(index < art.seatIds.length) }, art.seatIds[index] ? chip(art.seatIds[index]!, context) : null)));
      break;
    case 'rescue':
      prompt = first === null ? null : target(first, 'cross', context);
      detail = art.resourceCount === null ? null : vials(art.resourceCount);
      break;
    case 'disable':
      prompt = first === null ? null : target(first, 'spark', context);
      // An accepted own receipt can spend this picture. An unavailable offer cannot.
      detail = accepted || art.offered ? h('span', { class: 'ab-cell', 'data-spent': String(accepted), 'aria-hidden': 'true' }) : null;
      break;
    case 'supply': detail = tags(art.seatIds, context, accepted); break;
    case 'protect': prompt = first === null ? null : target(first, 'shield', context); break;
    case 'shot':
      prompt = first === null ? null : target(first, 'reticle', context);
      detail = rounds(accepted ? 1 : art.resourceCount ?? 0, accepted);
      break;
    case 'showdown-shot':
      prompt = first === null ? null : target(first, 'reticle', context);
      detail = accepted || art.offered ? rounds(1, accepted, true) : null;
      break;
    case 'vote':
    case 'release-vote':
      if (art.vote !== null) prompt = target(first, 'ballot', context, art.vote);
      detail = h('span', { class: 'ab-box', 'data-posted': String(accepted), 'aria-hidden': 'true' });
      break;
    case 'release-choice': detail = first === null ? null : target(first, 'key', context); break;
    case 'hack': prompt = first === null ? null : target(first, 'comms', context); break;
    case 'pass': detail = h('span', { class: 'ab-mic', 'data-passed': String(accepted), 'aria-hidden': 'true' }); break;
  }
  return { prompt, detail };
}

function snapshot(seatId: SeatId, context: ComicContext, { own = false, tape = false } = {}): MarkupElement {
  const name = identity(context, seatId)?.displayName;
  const number = seatId.slice(5);
  return h('button', { type: 'button', class: 'ab-photo', id: `ab-photo-${number}`, 'data-seat': number, 'aria-pressed': String(context.inspect === seatId), 'aria-label': `Player ${number}${name ? `, ${name}` : ''}. Inspect` },
    h('span', { class: 'ab-photo__frame', 'aria-hidden': 'true' }, h('span', { class: 'ab-photo__art', 'data-character': look(context, seatId) }),
      h('span', { class: 'ab-photo__numeral' }, number), h('span', { class: 'ab-photo__pin' }), h('span', { class: 'ab-seat ab-photo__seat' }, number),
      own ? h('span', { class: 'ab-photo__own' }, 'YOU') : null, tape ? h('span', { class: 'ab-photo__tape' }, 'UNDERCOVER') : null),
    h('span', { class: 'ab-photo__caption', 'aria-hidden': 'true' }, h('span', { class: 'ab-seat ab-photo__caption-seat' }, number), h('span', { class: 'ab-photo__name' }, name ?? `Player ${number}`)));
}

function inspectCard(seatIds: readonly SeatId[], context: ComicContext, seats: readonly SeatModel[]): MarkupElement {
  const seat = seats.find(item => item.seatId === context.inspect && seatIds.includes(item.seatId));
  return h('div', { class: 'ab-inspect' }, h('div', { class: 'ab-inspect__card', 'data-region': 'intel-inspect', hidden: !seat }, seat ? [
    h('p', { class: 'ab-inspect__who' }, h('span', { class: 'ab-inspect__lens', 'aria-hidden': 'true' }), h('span', { class: 'ab-seat' }, hiddenText('Player '), String(seat.number)),
      h('span', { class: 'ab-inspect__name' }, identity(context, seat.seatId)?.displayName ?? seat.label)),
    h('p', { class: 'ab-inspect__facts' }, [seat.location, en.marker.health(seat.health), seat.captain ? en.marker.captain : null, seat.jailed ? en.marker.jailed : null].filter(Boolean).join(' · ')),
    h('div', { class: 'ab-inspect__controls' },
      h('button', { type: 'button', class: 'ab-button', id: 'ab-inspect-show', 'data-file-act': 'show', 'data-seat': String(seat.number) }, en.insiderFile.showOnBoard),
      h('button', { type: 'button', class: 'ab-button', id: 'ab-inspect-back', 'data-file-act': 'back', 'data-seat': String(seat.number) }, en.insiderFile.back)),
  ] : null));
}

export function intelFile(knowledge: Knowledge, context: ComicContext, seats: readonly SeatModel[], ownSeatId: SeatId): MarkupElement | null {
  const art = knowledge.art;
  const hacker = art.undercover !== null;
  if (!hacker && !art.code) return null;
  const ids = hacker ? [art.undercover!.seatId] : art.code!.seatIds;
  const sentence = hacker ? art.undercover!.sentence : art.code!.sentence;
  return h('section', { class: 'ab-file', 'data-file': hacker ? 'hacker' : 'alien', 'data-region': 'intel-file', 'data-focus-fallback': 'ab-file-title', 'aria-labelledby': 'ab-file-title' },
    h('div', { class: 'ab-file__tab' }, h('h3', { class: 'ab-file__title', id: 'ab-file-title', tabindex: '-1' }, hacker ? 'Hacker’s file' : 'Alien’s file'),
      h('span', { class: 'ab-stamp', 'data-stamp': 'classified', 'aria-hidden': 'true' }, 'CLASSIFIED')),
    h('p', { class: 'ab-vh ms-visually-hidden' }, sentence),
    hacker ? h('div', { class: 'ab-known' }, h('div', { class: 'ab-known__photo' }, snapshot(ids[0]!, context, { tape: true })),
      h('div', { class: 'ab-known__words' }, h('span', { class: 'ab-known__role' }, 'Undercover'), h('p', { class: 'ab-known__code' },
        h('span', { class: 'ab-code-mark', 'data-struck': 'true', 'aria-hidden': 'true' }), 'Not in the Code'))) :
      h('div', { class: 'ab-file__field' }, (['tl','tr','br','bl'] as const).map(corner => h('span', { class: 'ab-corner-pin', 'data-corner': corner, 'aria-hidden': 'true' })),
        h('ul', { class: 'ab-code-set', 'aria-label': 'The Code: four players, in no order' }, ids.map(seatId => h('li', { class: 'ab-code-set__member' }, snapshot(seatId, context, { own: seatId === ownSeatId })))),
        h('span', { class: 'ab-code-tag', 'aria-hidden': 'true' }, h('span', { class: 'ab-code-mark' }), 'CODE')),
    hacker ? h('section', { class: 'ab-scans', 'aria-labelledby': 'ab-scans-title' }, h('h4', { class: 'ab-scans__title', id: 'ab-scans-title' }, 'Scans'),
      h('ol', { class: 'ab-scans__list' }, art.scans.map(scan => h('li', { class: 'ab-printout', 'data-scan': `${scan.round}:${scan.targetSeatId}`, 'data-result': !scan.matched ? 'wrong' : scan.inCode === true ? 'in-code' : scan.inCode === false ? 'not-in-code' : 'unknown' },
        h('p', { class: 'ms-visually-hidden' }, scan.sentence), h('div', { class: 'ab-printout__paper', 'aria-hidden': 'true' }, chip(scan.targetSeatId, context),
          h('span', { class: 'ab-printout__words' }, h('span', { class: 'ab-printout__round' }, `Round ${scan.round} · ${identity(context, scan.targetSeatId)?.displayName ?? `Player ${scan.targetSeatId.slice(5)}`}`), h('span', { class: 'ab-printout__guess' }, `Guess: ${scan.guess}`)),
          h('span', { class: 'ab-printout__marks' }, h('span', { class: 'ab-stamp ab-printout__stamp', 'data-stamp': scan.matched ? 'right' : 'wrong' }, scan.matched ? 'RIGHT' : 'WRONG'),
            scan.matched && scan.inCode !== null ? h('span', { class: 'ab-code-mark ab-printout__code', 'data-struck': String(!scan.inCode) }) : null)))))) :
      h('p', { class: 'ab-file__note' }, 'Four players, in no order.'),
    inspectCard(ids, context, seats));
}

/** Resource and acknowledgment pictures remain in the seat's open private card. */
export function privateNotes(content: Content, context: ComicContext, ownSeatId: SeatId): MarkupElement[] {
  const nodes: MarkupElement[] = [];
  const art = content.knowledge?.art;
  const kit = (kind: string, picture: MarkupElement, words: string): MarkupElement => h('div', { class: 'ab-kit', 'data-kit': kind }, picture, h('p', { class: 'ab-kit__words' }, words));
  if (art?.rescues) nodes.push(kit('rescue', vials(art.rescues.count), art.rescues.sentence));
  if (art) nodes.push(kit('weapons', rounds(art.weapons.count), art.weapons.sentence));
  if (content.hack && content.hackPartnerSeatId) nodes.push(h('div', { class: 'ab-kit', 'data-kit': 'hack', 'data-partner': content.hackPartnerSeatId },
    h('span', { class: 'ab-link', 'aria-hidden': 'true' }, chip(ownSeatId, context), h('span', { class: 'ab-link__cord' }), chip(content.hackPartnerSeatId, context)), h('p', { class: 'ab-kit__words' }, content.hack)));
  if (art && art.protections.length > 0) nodes.push(h('ul', { class: 'ab-guards' }, art.protections.map(protection => h('li', { class: 'ab-guard', 'data-state': protection.state },
    target(protection.seatId, protection.state === 'used' ? 'shield-used' : 'shield', context), h('p', { class: 'ab-guard__words' }, protection.sentence)))));
  return nodes;
}

export interface DeliveryWords {
  readonly heading: string; readonly none: string; readonly unavailable: string;
  readonly supplied: (names: string) => string;
  readonly received: (result: { readonly round: number }) => string;
}
export function deliveryNotes(context: ComicContext, ownSeatId: SeatId, supplier: boolean, words: DeliveryWords): MarkupElement {
  const own = context.acknowledgments;
  const slips: MarkupElement[] = [];
  const slip = (key: string, seatIds: readonly SeatId[], words: string): MarkupElement => h('li', { class: 'ab-slip', 'data-slip': key },
    seatIds.length ? h('span', { class: 'ab-slip__tags', 'aria-hidden': 'true' }, tags(seatIds, context, true)) : null,
    h('p', { class: 'ab-slip__words' }, words), seatIds.length ? h('span', { class: 'ab-slip__stamp', 'data-stamp': 'delivered', 'aria-hidden': 'true' }, 'DELIVERED') : null);
  if (own?.seatId === ownSeatId) {
    for (const result of own.supplierResults) {
      const ids = [...result.successfulRecipientSeatIds].sort(bySeat);
      slips.push(slip(`supplied:${result.round}:${result.commandId}`, ids, ids.length === 0 ? words.none : words.supplied(ids.map(id => `Player ${id.slice(5)}`).join(' and '))));
    }
    for (const result of own.receivedSupply) slips.push(slip(`received:${result.round}`, [ownSeatId], words.received(result)));
    if (!own.historyAvailable && supplier) slips.push(slip('unavailable', [], words.unavailable));
  }
  return h('div', { class: 'ms-acknowledgments-region', 'data-region': 'own-acknowledgments' }, slips.length ? h('section', { class: 'ab-deliveries', 'aria-labelledby': 'ms-acknowledgments-title' }, h('h3', { class: 'ab-deliveries__title', id: 'ms-acknowledgments-title' }, words.heading), h('ul', { class: 'ab-deliveries__list' }, slips)) : null);
}

/** Public terminal facts. Aborted carries neither a winner nor a cast nor the Code. */
export function resultSheet(result: ResultModel | null, context: ComicContext): MarkupElement {
  return h('div', { class: 'ms-result-region', 'data-region': 'result' }, result ? h('section', { class: 'ms-panel ms-result trial-result', 'data-winner': result.winner?.toLowerCase() ?? 'aborted', 'aria-labelledby': 'ms-result-heading' },
    h('h2', { class: 'ms-panel__heading', id: 'ms-result-heading' }, result.heading),
    h('p', { class: 'ms-result__outcome' }, result.outcome), result.lines.map(line => h('p', { class: 'ms-result__line' }, line)),
    result.reveal ? [h('h3', { class: 'trial-result__heading', id: 'trial-cast-title' }, result.reveal.heading),
      h('ul', { class: 'trial-cast', 'aria-labelledby': 'trial-cast-title' }, result.reveal.roles.map(entry => h('li', { class: 'trial-cast__member', 'data-seat': entry.seatId },
        h('span', { class: 'trial-cast__portrait', 'data-character': look(context, entry.seatId), 'aria-hidden': 'true' }),
        h('span', { class: 'trial-cast__who' }, entry.label, h('span', { class: 'trial-cast__role', 'data-role': entry.role }, entry.role)),
        result.reveal!.codeSeatIds.includes(entry.seatId) ? h('span', { class: 'trial-cast__code', 'aria-hidden': 'true' }) : null))),
      h('p', { class: 'ms-result__line' }, result.reveal.code)] : null,
  ) : null);
}
