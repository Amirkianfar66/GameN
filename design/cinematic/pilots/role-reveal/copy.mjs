// mothership:dev-only
//
// The role reveal films' two caption lines, proposals in the comic's narration voice (Frontend owns
// the game's copy). Page text, never drawn into the picture: `purpose` shows during the panels, `play`
// under the title. Each line says only what the rules give the role
// (docs/specifications/planet-successor/game-design.md and the owner's decisions), never who anyone is.

export const ROLE_REVEAL_COPY = Object.freeze({
  Insider: Object.freeze({
    purpose: 'Three of them, three roles: Undercover, Alien, Doctor.',
    play: 'You know who, not which. With you, they are the Code.',
  }),
  Doctor: Object.freeze({
    purpose: 'Two doses for the whole voyage.',
    play: 'Your player number is the Hospital panel\'s code. Who you tell is up to you.',
  }),
  'Blue Disabler': Object.freeze({
    purpose: 'One charge for the whole voyage.',
    play: 'Choose someone in your room. They are hit when the round ends.',
  }),
  Supplier: Object.freeze({
    purpose: 'In Round 3, two weapons leave your hold.',
    play: 'Choose two crew in your room. They never learn who armed them.',
  }),
  Engineer: Object.freeze({
    purpose: 'One photograph. One room\'s voice.',
    play: 'From Room A or B, capture the room opposite: they do not steer the ship this round.',
  }),
  Undercover: Object.freeze({
    purpose: 'The only weapon aboard at the start is yours.',
    play: 'Hand out shields: the first attack on a protected crew member fails.',
  }),
  Hacker: Object.freeze({
    purpose: 'You know your Undercover. Find the rest of the Code.',
    play: 'Crack it, and the ship can be pushed toward the Red Planet.',
  }),
  'Red Disabler': Object.freeze({
    purpose: 'One charge for the whole voyage.',
    play: 'Choose someone in your room. They are hit when the round ends. You know who the Undercover is.',
  }),
  Alien: Object.freeze({
    purpose: 'A second shadow walks this ship.',
    play: 'Hold an office to open a Blackhole. Use it and stay alive: you win with whichever side arrives.',
  }),
});

/** The page text that names the role (the plate's lettering is decorative). */
export const roleLine = role => `Your role: ${role}.`;
