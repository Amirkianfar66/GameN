import { IdentifierSchema } from '@mothership/contracts';
import type { CollectionTarget, DocumentTarget } from './transport.js';

// The documented listener paths, relative to the database root, and nothing else. Every
// transport builds its paths here, so a browser listener and a test adapter cannot drift
// apart, and no caller can name a path of its own.

const UID = /^[A-Za-z0-9_-]{1,128}$/;

function segment(value: string, what: string): string {
  if (!IdentifierSchema.safeParse(value).success) throw new TypeError(`Not a valid ${what}`);
  return value;
}

/** The path of one document, as a list of segments. `uid` is the caller's own verified identity. */
export function documentPath(target: DocumentTarget, uid: string): readonly string[] {
  const root = ['matches', segment(target.matchId, 'match identifier')];
  switch (target.kind) {
    case 'identities': return [...root, 'identities', 'public'];
    case 'seat-session':
    case 'own-acknowledgments':
      if (!UID.test(uid)) throw new TypeError('Not a valid identity');
      return [...root, target.kind === 'seat-session' ? 'seatSessions' : 'ownAcknowledgments', uid];
    case 'lobby': return [...root, 'lobby', 'public'];
    case 'public-view': return [...root, 'views', 'public'];
    case 'player-view':
      if (!UID.test(uid)) throw new TypeError('Not a valid identity');
      return [...root, 'playerViews', uid];
    case 'session': return [...root, 'control', 'session'];
    case 'admission': return [...root, 'admissions', segment(target.admissionId, 'admission identifier')];
    // Server-only collections have no target, and an unknown one is not guessed at.
    default: throw new TypeError('Not a documented listener path');
  }
}

/** The path of one collection, as a list of segments. */
export function collectionPath(target: CollectionTarget): readonly string[] {
  return ['matches', segment(target.matchId, 'match identifier'), 'admissions'];
}
