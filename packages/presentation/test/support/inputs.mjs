// Shell inputs built from the authored contract fixture. Test-only.
import { PlayerViewSchema, PublicViewSchema, RoleSchema } from '@mothership/contracts';
import { createOfficerFixture } from '@mothership/contracts/fixtures';

export const fixture = variant => createOfficerFixture(variant ?? 'protected');
export const ROLE_NAMES = RoleSchema.options;
/** Matches any role name, tolerant of the separators an identifier might use. */
export const ROLE_PATTERN = new RegExp(ROLE_NAMES.map(role => role.replaceAll(' ', '[-_ ]*')).join('|'), 'i');

const environment = {
  mode: 'fixture',
  connection: 'live',
  problem: null,
  deadline: { kind: 'running', remainingMs: 42_000 },
  motion: { reducedMotion: false, followsDevice: true },
};

/** Nothing in progress on the Shot card, and nothing this device remembers registering. */
export const IDLE_SHOT = { step: 'idle', registeredTargetSeatId: null };

export function playerInput(view, overrides = {}) {
  return { ...environment, view, privacy: { concealed: false, revealed: false }, shot: IDLE_SHOT, ...overrides };
}
/** The same input with the private panel open, where the Shot card lives. */
export function openInput(view, shot = IDLE_SHOT, overrides = {}) {
  return playerInput(view, { privacy: { concealed: false, revealed: true }, shot, ...overrides });
}
export function tableInput(view, overrides = {}) {
  return { ...environment, view, ...overrides };
}

/** A synthetic variation of an authored view. It must still satisfy the contract schema. */
export function publicVariant(change) {
  const view = structuredClone(fixture().before.public);
  change(view);
  return PublicViewSchema.parse(view);
}
export function playerVariant(base, change) {
  const view = structuredClone(base);
  change(view);
  return PlayerViewSchema.parse(view);
}
