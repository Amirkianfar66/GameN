// mothership:dev-only
//
// Proposed words for library group 6 (the offices' remaining pieces). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice: short, plain,
// second person, never a claim the view does not make. The Officer is always called a public
// office, never a role or a side; nothing says whether a Captain chose or the clock chose; and the
// pre-turn words read the same whoever acts in that window (the Alien's secret Blackhole runs in it
// too and is never hinted at).

export const OFFICE_COPY = Object.freeze({
  tapeAppoint: 'Appoint an Officer',
  tapeBlock: 'Movement block',
  tapeOffices: 'Offices',
  // Stamps.
  stampSending: 'Sending',
  stampAppointed: 'Appointed',
  stampBlocked: 'Blocked',
  // Badge names (each badge also carries its name as text beside it).
  captain: 'Captain',
  officer: 'Officer',
  blockedBadge: 'No move this round',
  officeNote: 'The Officer is a public office, appointed by the Captain. It says nothing about a player\'s secret role.',
  // The Captain's appointment.
  appointChoose: 'Choose your Officer: another player who is Healthy, not jailed and not in the Hospital. If time runs out, one of them is chosen at random.',
  appointConfirm: name => `Appoint ${name} as Officer? Everyone sees the office.`,
  appoint: 'Appoint',
  back: 'Back',
  appointSending: 'Sending your appointment…',
  appointDone: name => `${name} is your Officer for this term.`,
  appointRefused: 'The server did not accept the appointment. Choose again while time remains.',
  vacant: 'No other player can be Officer now. The office stays empty for this Captain\'s term.',
  appointClosed: 'The appointment is closing.',
  // The Officer's block.
  blockChoose: 'Block one player\'s move this round, if you want to. If you choose no one, nobody is blocked.',
  blockConfirm: name => `Block ${name} from moving this round? Everyone sees the block.`,
  block: 'Block',
  blockSending: 'Sending your block…',
  blockDone: name => `${name} cannot move this round. The block ends with the round.`,
  blockRefused: 'The server did not accept the block. Nothing changed.',
  blockClosed: 'The block is closed for this round.',
  // The public strip.
  appointing: 'The Captain is appointing an Officer.',
  officerIs: name => `Officer: ${name}.`,
  noOfficer: 'No Officer this term.',
  preTurn: 'Before the turns: the Officer may block one player\'s move.',
  quiet: 'Before the turns.',
  blockedIs: name => `${name} cannot move this round.`,
  // The blocked player's own phone.
  selfBlocked: 'You cannot move this round. You can still vote, act and use the windows; a move the game makes for you, to the Hospital or the Jail, still happens.',
});
