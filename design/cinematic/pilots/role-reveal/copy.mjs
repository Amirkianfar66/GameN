// mothership:dev-only
//
// The role reveal films' words, proposals in the comic's narration voice (Frontend owns the game's
// copy). Each film tells a small back story, as a comic book gives its characters one (the owner,
// 6 November 2026): `story` is the three panels' narration boxes, the first two looking back at who
// the role-holder was, the third bringing them aboard to what the role does; `play` sits under the
// title and says how the role plays. Page text, never drawn into the picture. The back stories are
// fiction around the role, told to "you" so they fit whichever crew character the player is. Each
// rule they mention is only what the rules give the role (the game design and the owner's
// decisions), never who anyone is.

export const ROLE_REVEAL_COPY = Object.freeze({
  Insider: Object.freeze({
    story: Object.freeze(['Vesta Station. You filed reports nobody read.', 'Then three files crossed your desk.', 'Aboard: Undercover, Alien, Doctor. One each.']),
    play: 'You know who, not which. With you, they are the Code.',
  }),
  Doctor: Object.freeze({
    story: Object.freeze(['Colony Nine, the fever years.', 'When the medicine ran out, you kept two doses.', 'Aboard, your number is the Hospital panel\'s code.']),
    play: 'Two doses for the whole voyage. Who you tell your number is up to you.',
  }),
  'Blue Disabler': Object.freeze({
    story: Object.freeze(['The engine decks of Ceres. You shut things down.', 'They gave you one charge, and no questions.', 'Choose someone in your room: hit at the round\'s end.']),
    play: 'One charge for the whole voyage.',
  }),
  Supplier: Object.freeze({
    story: Object.freeze(['The Belt markets. You could find anything.', 'You still keep two crates nobody knows about.', 'In Round 3, two weapons leave your hold.']),
    play: 'Choose two crew in your room. They never learn who armed them.',
  }),
  Engineer: Object.freeze({
    story: Object.freeze(['The Titan yards. You built ships like this one.', 'You know where every wire runs.', 'One photograph silences the room opposite.']),
    play: 'From Room A or B, capture the room opposite: they do not steer the ship this round.',
  }),
  Undercover: Object.freeze({
    story: Object.freeze(['Red Planet intelligence. No name on any list.', 'They sent you aboard armed.', 'The only weapon aboard at the start is yours.']),
    play: 'Hand out shields: the first attack on a protected crew member fails.',
  }),
  Hacker: Object.freeze({
    story: Object.freeze(['The data dens of Phobos. Every lock had a price.', 'The Red Planet paid you in advance.', 'You know your Undercover. Find the rest of the Code.']),
    play: 'Crack it, and the ship can be pushed toward the Red Planet.',
  }),
  'Red Disabler': Object.freeze({
    story: Object.freeze(['The engine decks of Ceres. You shut things down.', 'They gave you one charge, and no questions.', 'Choose someone in your room: hit at the round\'s end.']),
    play: 'One charge for the whole voyage. You know who the Undercover is.',
  }),
  Alien: Object.freeze({
    story: Object.freeze(['Before the ship, you were a story sailors told.', 'You learned to wear a crew face.', 'A second shadow walks this ship.']),
    play: 'Hold an office to open a Blackhole. Use it and stay alive: you win with whichever side arrives.',
  }),
});

/** The page text that names the role (the plate's lettering is decorative). */
export const roleLine = role => `Your role: ${role}.`;
