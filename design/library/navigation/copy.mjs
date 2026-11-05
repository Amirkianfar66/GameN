// mothership:dev-only
//
// Proposed words for library group 2 (navigation). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice: short, plain, second
// person, never a claim the view does not make. No word names a weight, a total, a vote count, the
// Captain's share or the direction before a ship hack (P12, P13, the navigation overlay's rule 3).
// The Captain's panel and the public strip never say "tie": only the Officer sees that there is one.

import { armOf, depthOf, isPlanet } from './route.mjs';

const place = position => {
  if (position === 'Start') return 'at Start';
  if (position === 'Junction') return 'at the Junction';
  if (isPlanet(position)) return `at the ${position}`;
  return `on the ${armOf(position)} arm, place ${depthOf(position)} of 3 (${position})`;
};

/** Where the course leads, for the office about to acknowledge it (the route rule's step). */
const courseWords = course => {
  if (!course) return '';
  if (course.kind === 'arrive') return `The ship reaches the ${course.to}.`;
  if (course.kind === 'switch') return `The ship moves across to ${course.to}, the same place on the other arm.`;
  return `The ship moves one place, to ${course.to}.`;
};

const OTHER = Object.freeze({ captain: 'Officer', officer: 'Captain' });
const TITLE = Object.freeze({ captain: 'Captain', officer: 'Officer' });

export const NAV_COPY = Object.freeze({
  // Tapes and stamps.
  tapeCourse: 'Course',
  tapeNavigation: 'Navigation',
  stampSending: 'Sending',
  stampChosen: 'Chosen',
  stampConfirmed: 'Confirmed',
  stampArrived: 'Arrived',
  // The office panel.
  where: position => `The ship is ${place(position)}.`,
  privacy: 'Only the Captain and the Officer see the course.',
  idleNote: 'The course for this round is set at navigation, after the turns and the votes.',
  setting: 'The course is being set.',
  tieAsk: 'The course is undecided this round. Choose Blue or Red. If you do not choose in time, it is drawn at random.',
  chooseBlue: 'Blue',
  chooseRed: 'Red',
  chosen: direction => (direction ? `You chose ${direction}. The Captain acknowledges it next.` : 'Your choice is recorded. The Captain acknowledges it next.'),
  direction: direction => `This round's course: ${direction}.`,
  course: courseWords,
  confirmAsk: office => `Acknowledge the course as ${TITLE[office]}. Acknowledging cannot change it; when the time runs out it is acknowledged for you.`,
  confirmButton: 'Acknowledge course',
  confirmed: 'You acknowledged this round\'s course.',
  closed: 'Your acknowledgement is closed for this round.',
  waiting: stage => `The ${TITLE[stage]} is acknowledging the course.`,
  waitingFor: office => `The ${OTHER[office]} is acknowledging the course.`,
  sending: 'Sending to the server…',
  arrived: position => `The ship reached the ${position}.`,
  // A step just made (the office panel, after a movement it can name).
  stepWords: made => ({
    start: 'The ship left Start for the Junction.',
    advance: `The ship moved to ${made.to}.`,
    switch: `The ship moved across to ${made.to}.`,
    arrive: `The ship reached the ${made.to}.`,
  })[made.kind],
  // The public strip: that the ship moved, never where.
  publicNavigating: 'The course is being set.',
  publicMoved: round => `Round ${round}: the ship moved.`,
  publicTransit: round => `Round ${round}: the ship is under way.`,
  publicArrived: position => `The ship reached the ${position}.`,
  // A refused command (the release's failure words stay Frontend's).
  rejected: 'The server did not accept that. Nothing changed.',
});
