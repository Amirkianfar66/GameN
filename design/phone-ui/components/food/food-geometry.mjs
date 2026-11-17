// Drawing coordinates from #231's pinned layout/handoff. No Task model or rules.
export const BOX = Object.freeze([1024, 768]);
export const STOPS = 7, STEP = 128, X0 = 128, DECK = 700;
export const stopX = s => X0 + STEP * s;
export const RAIL = Object.freeze({ top: 74, bottom: 104, left: 30, right: 994 });
export const CARRIAGE = Object.freeze({ half: 58, top: 104, bottom: 140, pivot: 140 });
export const BLADE = Object.freeze({ half: 30, height: 34, up: 140, locked: 158, caught: 164, cut: 226 });
export const CRATE = 104, HANG = 408, PENDULUM = HANG - CARRIAGE.pivot;
export const REST = Object.freeze({ intake: 658, deck: 648, platform: 568, console: 540 });
export const BOXES = Object.freeze({
 intake: Object.freeze([72, 690, 112, 24]), console: Object.freeze([586, 596, 108, 104]),
 platform: Object.freeze([706, 620, 124, 80]), liftWell: Object.freeze([702, 600, 132, 104]),
 cab: Object.freeze([820, 150, 152, 190]), cabWindow: Object.freeze([832, 178, 128, 100]),
 cabBracket: Object.freeze([972, 104, 18, 100]), porthole: Object.freeze([200, 128, 112, 112]),
 sign: Object.freeze([738, 300, 60, 40]),
});
export const OPERATORS = Object.freeze({
 panel: Object.freeze({ feet: [640, 700], head: 491 }),
 winch: Object.freeze({ feet: [896, 333], head: 196 }),
});
export const VIEW = Object.freeze([16, 40, 992, 696]);
export const TAGS = Object.freeze({ panel: Object.freeze([640, 718]), winch: Object.freeze([917, 312]) });
