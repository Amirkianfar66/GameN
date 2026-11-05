// mothership:dev-only
//
// Proposed words for library group 3 (the Hospital panel). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice: short, plain,
// second person, never a claim the view does not make. Registering a number is never called a
// heal (motion requirements: "registered treatment is not a successful heal"); a refusal for want of
// an injection says that the number was not checked (P21); no word gives the injection count, which
// is the Doctor's alone, or says who the Doctor is.

export const PANEL_COPY = Object.freeze({
  tapePanel: 'Hospital panel',
  // Stamps (the dossier's stamp frame; the words beside them carry the meaning too).
  stampSending: 'Sending',
  stampRegistered: 'Registered',
  stampReserved: 'Reserved',
  stampWrong: 'Wrong number',
  stampTreated: 'Treated',
  stampNoEffect: 'No effect',
  stampNotKept: 'Not kept',
  stampUsed: 'Used',
  // The keypad.
  ask: 'Enter the Doctor\'s player number. You have one attempt in the match. A correct number reserves a shared injection for you; you are treated at this round\'s Rescue stage.',
  choose: number => `Send ${number}? This is your one attempt in the match.`,
  send: 'Send number',
  clear: 'Clear',
  screenEmpty: '– –',
  sending: 'Sending your number to the server…',
  // Results.
  registered: 'Your number is registered. Your one attempt is used.',
  registeredNote: 'The server has not told this phone whether the number was right.',
  reserved: 'Correct. A shared injection is reserved for you. You are treated at the end of this round, at the Rescue stage.',
  reservedNote: 'Until then nothing is healed: an attack before the Rescue stage still counts.',
  wrong: 'Not the Doctor\'s number. Your one attempt is used; no injection was spent.',
  treated: 'You were treated at the Rescue stage.',
  noEffect: 'Your reserved injection was used at the Rescue stage, without effect.',
  discarded: 'The Blackhole did not keep your request. Your one attempt stays used.',
  exhausted: 'The panel has no injection left. Your number was not checked, and your attempt is not used.',
  refused: 'The server did not accept the number. Nothing was used.',
  used: 'You have used your one panel attempt.',
  closed: 'The panel takes a number during the turns of a round you spend in the Hospital.',
  // The medical deadline (the berth's rescue tag, in words).
  // The wording of the berth's deadline badge (motion review of 13 October): the server's due round, never a countdown.
  deadline: d => (d.tone === 'next' ? `Rescue by the end of Round ${d.round}.` : d.tone === 'current' ? `This is the last round for Rescue (Round ${d.round}).` : 'No rescue round is left.'),
  privacy: 'Only you see this panel.',
});
