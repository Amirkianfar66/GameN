// mothership:dev-only
//
// The successor's current names for the art that already exists, so no screen draws an obsolete
// name or an obsolete role (designer-production-brief.md: "Doctor replaces Cracker and Engineer
// replaces Soldier Blue in current text"; the 25 October overlay: the Officer is only a public
// office, never a secret role). The reviewed exports keep their historical ids and bytes (the
// design-0.2.0 manifest is never edited): this table maps each current name to the picture that
// draws it.

/** The nine current secret roles, in the setup order (7, then Red Disabler for 8, Engineer for 9). */
export const CURRENT_ROLES = Object.freeze(['Insider', 'Doctor', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler', 'Engineer']);

/**
 * Each current role's held device: the reviewed export (design/exports/roles, custom property
 * --ms-asset-device-<id>-held) or this group's new one (--sw-asset-sw-device-engineer).
 *   Doctor    the reviewed "device-cracker" art, unchanged: an injector with two vials, the Doctor's
 *             two shared injections. Only its name was obsolete; the picture is current.
 *   Engineer  new (this group): no device existed for the ninth Blue role.
 */
export const ROLE_DEVICES = Object.freeze({
  Insider: { asset: 'device-insider', property: '--ms-asset-device-insider-held', source: 'reviewed' },
  Doctor: { asset: 'device-cracker', property: '--ms-asset-device-cracker-held', source: 'reviewed', note: 'the historical id keeps its bytes; the current name is Doctor' },
  'Blue Disabler': { asset: 'device-blue-disabler', property: '--ms-asset-device-blue-disabler-held', source: 'reviewed' },
  Supplier: { asset: 'device-supplier', property: '--ms-asset-device-supplier-held', source: 'reviewed' },
  Undercover: { asset: 'device-undercover', property: '--ms-asset-device-undercover-held', source: 'reviewed' },
  Hacker: { asset: 'device-hacker', property: '--ms-asset-device-hacker-held', source: 'reviewed' },
  Alien: { asset: 'device-alien', property: '--ms-asset-device-alien-held', source: 'reviewed' },
  'Red Disabler': { asset: 'device-red-disabler', property: '--ms-asset-device-red-disabler-held', source: 'reviewed' },
  Engineer: { asset: 'sw-device-engineer', property: '--sw-asset-sw-device-engineer', source: 'library group 8' },
});

/** Reviewed art that no current screen may draw as a role. */
export const SUPERSEDED = Object.freeze({
  'device-officer': 'the removed Blue Officer secret role (the Officer is a public office: library group 6\'s badge)',
  'icon-action-showdown': 'the removed Showdown (the arrival replaces it: library group 2\'s course and arrival)',
});

/** Names that no current text may use, and what replaces each. */
export const OBSOLETE_NAMES = Object.freeze({ Cracker: 'Doctor', 'Soldier Blue': 'Engineer', Showdown: 'arrival (navigation)', 'Final Zone': 'arrival (navigation)' });

/**
 * The action overlay's successor entries: the command an offer names, its current label, and the
 * tray mark that draws it (each from its library group; the kit's actions keep the ability kit's icon, group 0).
 */
export const OVERLAY = Object.freeze([
  { command: 'ACTIVATE_SHIP_HACK', label: 'Hack Spaceship', mark: '--lib-asset-lib-icon-ship-hack', group: 1 },
  { command: 'ENGINEER_SUPPRESS', label: 'Engineer capture', mark: '--lib-asset-lib-icon-capture', group: 1 },
  { command: 'SUBMIT_CODE', label: 'Final Code', mark: '--ab-asset-icon-action-code', group: 0 },
  { command: 'CHOOSE_NAV_DIRECTION', label: 'Choose the course', mark: '--nav-asset-nav-icon-course', group: 2 },
  { command: 'CONFIRM_NAVIGATION', label: 'Acknowledge the course', mark: '--nav-asset-nav-icon-course', group: 2 },
  { command: 'PANEL_CODE', label: 'Hospital panel', mark: '--hp-asset-hp-icon-panel', group: 3 },
  { command: 'OFFER_PROMISE', label: 'Offer a Promise', mark: '--pr-asset-pr-icon-promise', group: 4 },
  { command: 'ACCEPT_PROMISE', label: 'Answer a Promise', mark: '--pr-asset-pr-icon-promise', group: 4 },
  { command: 'SHOW_WINDOW', label: 'Show a drawing', mark: '--wn-asset-wn-icon-window', group: 5 },
  { command: 'APPOINT_OFFICER', label: 'Appoint an Officer', mark: '--of-asset-of-icon-appoint', group: 6 },
  { command: 'BLOCK_MOVE', label: 'Movement block', mark: '--of-asset-of-icon-block', group: 6 },
  { command: 'RESCUE', label: 'Doctor\'s Rescue', mark: '--ab-asset-icon-action-rescue', group: 0 },
  { command: 'SUPPLY', label: 'Supply', mark: '--ab-asset-icon-action-supply', group: 0 },
]);

/** True when a text uses no obsolete name. */
export const usesCurrentNames = text => !Object.keys(OBSOLETE_NAMES).some(old => new RegExp(`\\b${old}\\b`, 'i').test(text));
