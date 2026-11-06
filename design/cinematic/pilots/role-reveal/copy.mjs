// mothership:dev-only
//
// The role reveal films' words, proposals in the comic's narration voice (Frontend owns the game's
// copy). Each film tells a small back story, as a comic book gives its characters one (the owner,
// 6 November 2026), and tells it mostly in pictures: the owner asked for fewer words ("Lets reduce
// texts in animation it is like tutorial"). `story` is the two memory panels' narration boxes, a few
// words each: where the role-holder was, and what they kept. The panel aboard and the title carry no
// line; the rules are the role card's, not the film's. Page text, never drawn into the picture,
// told to "you" so it fits whichever crew character the player is, and never saying who anyone is.

export const ROLE_REVEAL_COPY = Object.freeze({
  Insider: Object.freeze({ story: Object.freeze(['Vesta Station. The archive.', 'Three files. Three faces.']) }),
  Doctor: Object.freeze({ story: Object.freeze(['Colony Nine. The fever years.', 'Two doses left.']) }),
  'Blue Disabler': Object.freeze({ story: Object.freeze(['The engine decks of Ceres.', 'One charge.']) }),
  Supplier: Object.freeze({ story: Object.freeze(['The Belt markets.', 'Two crates, off the books.']) }),
  Engineer: Object.freeze({ story: Object.freeze(['The Titan yards.', 'You know every wire.']) }),
  Undercover: Object.freeze({ story: Object.freeze(['Red Planet intelligence.', 'No name. One gun.']) }),
  Hacker: Object.freeze({ story: Object.freeze(['The data dens of Phobos.', 'Paid in advance.']) }),
  'Red Disabler': Object.freeze({ story: Object.freeze(['The engine decks of Ceres.', 'One charge.']) }),
  Alien: Object.freeze({ story: Object.freeze(['A story sailors told.', 'Then, a second shadow.']) }),
});

/** The page text that names the role (the plate's lettering is decorative). */
export const roleLine = role => `Your role: ${role}.`;
