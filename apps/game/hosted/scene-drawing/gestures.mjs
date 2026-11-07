// Runtime drawing port; Designer 49f0db4d34d2a2a418f669a13bed660fc665b1b6; source SHA256 626e0b74fba44d055f0ea79777f4be475fd3998b9bff184ce8ff92b6770fe7c4.
//
// Every gesture of the board-motion figures as a skeleton in the shared frame (body.mjs):
// the floor at y 233, a place's anchor at x 62. A gesture is chosen only by public facts:
// the place a character takes in its room, Injured (the Hospital), Jailed (the Jail) and
// Eliminated; never by anything private.

const FRONT_ARMS = ['legF', 'legN', 'neck', 'torso', 'armF', 'armN', 'head'];

/** Standing, weight on the far leg, a hand on the hip: the base most gestures start from. */
export const STAND = {
  head: [58, 36], tilt: 0, view: 'front',
  neck: [61, 64], pelvis: [62, 124],
  sF: [39, 73], eF: [31, 106], wF: [33, 134], handF: { angle: 95 },
  sN: [84, 72], eN: [103, 100], wN: [85, 122], handN: { angle: 200 },
  hipF: [53, 126], kF: [49, 175], aF: [46, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [76, 175], aN: [79, 215], footN: { dir: 1 },
  shadow: [60, 44],
};

// ---------- Room A: Engineering ----------

/** A1: seated on the stool at the workstation, back to us, the hands at the keyboard. */
const consoleBack = {
  back: true, view: 'back', head: [64, 86], tilt: 2,
  neck: [64, 112], pelvis: [62, 170],
  sF: [41, 120], eF: [30, 148], wF: [46, 146], handF: { type: 'none' },
  sN: [87, 119], eN: [97, 147], wN: [80, 146], handN: { type: 'none' },
  hipF: [53, 174], kF: [47, 190], aF: [44, 222], footF: { dir: -1 },
  hipN: [71, 174], kN: [78, 190], aN: [82, 222], footN: { dir: 1 },
  order: ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'],
};

/** A2: standing, an arm across the body holding the other's elbow, a fist at the chin. */
const think = {
  head: [57, 37], tilt: 5, view: 'front',
  neck: [61, 64], pelvis: [62, 124],
  sF: [39, 74], eF: [41, 104], wF: [68, 108], handF: { angle: 10, type: 'fist' },
  sN: [84, 72], eN: [78, 104], wN: [62, 79], handN: { angle: -110, type: 'fist' },
  hipF: [53, 126], kF: [49, 175], aF: [46, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [80, 174], aN: [84, 214], footN: { dir: 1 },
  shadow: [62, 44],
  order: ['legF', 'legN', 'neck', 'torso', 'armF', 'head', 'armN'],
};

/** A3: crouched at the open hatch, a hand on the deck, a wrench reaching in. */
const crouchHatch = {
  head: [8, 112], tilt: -18, view: 'down',
  neck: [26, 134], pelvis: [62, 182],
  sF: [13, 152], eF: [-6, 178], wF: [-20, 204], handF: { angle: 110, type: 'flat' },
  sN: [46, 129], eN: [32, 157], wN: [8, 172], handN: { angle: 160, type: 'fist', item: 'wrench', itemAngle: 125 },
  hipF: [54, 186], kF: [14, 172], aF: [10, 216], footF: { dir: -1 },
  hipN: [70, 188], kN: [82, 226], aN: [120, 220], footN: { dir: 1, angle: 70 },
  shadow: [56, 66],
  order: ['legN', 'armF', 'legF', 'neck', 'torso', 'armN', 'head'],
};

/** A4: leaning back on the crates, the arms folded, the ankles crossed. */
const leanCrates = {
  head: [66, 38], tilt: -5, view: 'front',
  neck: [66, 66], pelvis: [58, 126],
  sF: [44, 75], eF: [38, 102], wF: [64, 106], handF: { type: 'none' },
  sN: [88, 74], eN: [94, 100], wN: [66, 96], handN: { angle: 182 },
  hipF: [50, 128], kF: [44, 176], aF: [42, 215], footF: { dir: -1 },
  hipN: [67, 128], kN: [58, 176], aN: [34, 214], footN: { dir: -1 },
  shadow: [52, 44],
  order: FRONT_ARMS,
};

/** A5: at the open junction box, back to us, a hand up in the wires, a wrench in the other. */
const wallPanelBack = {
  back: true, view: 'back', head: [56, 36], tilt: -8,
  neck: [60, 64], pelvis: [62, 124],
  sF: [39, 73], eF: [16, 90], wF: [22, 62], handF: { angle: -100 },
  sN: [84, 72], eN: [96, 100], wN: [92, 124], handN: { angle: 95, type: 'fist', item: 'wrench', itemAngle: 92 },
  hipF: [53, 126], kF: [47, 175], aF: [43, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [78, 175], aN: [82, 214], footN: { dir: 1 },
  shadow: [62, 44],
  order: ['armN', 'legF', 'legN', 'neck', 'torso', 'armF', 'head'],
};

// ---------- Room B: Laboratory ----------

/** B1: standing, a tablet in the far hand, the near hand tapping it, looking down at it. */
const tablet = {
  head: [55, 40], tilt: 8, view: 'down',
  neck: [60, 66], pelvis: [62, 124],
  sF: [39, 75], eF: [30, 104], wF: [38, 112], handF: { angle: -70, item: 'tablet', itemAt: [2, -14], itemAngle: -14 },
  sN: [84, 73], eN: [90, 102], wN: [64, 100], handN: { angle: 196 },
  hipF: [53, 126], kF: [49, 175], aF: [46, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [76, 175], aN: [79, 215], footN: { dir: 1 },
  shadow: [60, 44],
  order: FRONT_ARMS,
};

/** B2: seated on the stool, side on, a laptop open on the knees, typing, the head bent to it. */
const laptopStool = {
  head: [50, 94], tilt: 16, view: 'front',
  neck: [61, 119], pelvis: [70, 176],
  sF: [50, 128], eF: [44, 152], wF: [30, 160], handF: { angle: 188, type: 'flat' },
  sN: [78, 126], eN: [70, 154], wN: [44, 160], handN: { angle: 184, type: 'flat' },
  hipF: [62, 178], kF: [26, 175], aF: [28, 217], footF: { dir: -1 },
  hipN: [76, 182], kN: [36, 179], aN: [40, 222], footN: { dir: -1 },
  prop: { item: 'laptop', at: [21, 166], angle: -3 },
  order: ['legF', 'armF', 'neck', 'torso', 'legN', 'prop', 'armN', 'head'],
};

/** B3: at the specimen tank, back to us, a hand flat on the glass, looking up into it. */
const tankBack = {
  back: true, view: 'back', head: [60, 35], tilt: -6,
  neck: [61, 64], pelvis: [62, 124],
  sF: [39, 73], eF: [28, 102], wF: [40, 122], handF: { angle: 40 },
  sN: [84, 72], eN: [104, 90], wN: [96, 62], handN: { angle: -84, type: 'flat' },
  hipF: [53, 126], kF: [47, 175], aF: [42, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [78, 175], aN: [83, 214], footN: { dir: 1 },
  shadow: [62, 44],
  order: ['armF', 'legF', 'legN', 'neck', 'torso', 'armN', 'head'],
};

/** B4: behind the bench, leaning on it with both hands, looking down at the samples. */
const leanBench = {
  head: [62, 54], tilt: 0, view: 'down',
  neck: [62, 80], pelvis: [62, 128],
  sF: [37, 88], eF: [24, 110], wF: [34, 128], handF: { angle: 100, type: 'flat' },
  sN: [87, 88], eN: [100, 110], wN: [90, 128], handN: { angle: 80, type: 'flat' },
  hipF: [53, 130], kF: [50, 178], aF: [48, 216], footF: { dir: -1 },
  hipN: [71, 130], kN: [74, 178], aN: [76, 216], footN: { dir: 1 },
  front: ['armF', 'armN'],
};

/** B5: behind the bench at the microscope, a hand on its focus, a flask held up in the other. */
const microscope = {
  head: [54, 38], tilt: -8, view: 'front',
  neck: [60, 66], pelvis: [62, 124],
  sF: [39, 74], eF: [16, 92], wF: [12, 62], handF: { angle: -100 },
  sN: [84, 73], eN: [100, 98], wN: [88, 82], handN: { angle: -80, type: 'fist', item: 'flask', itemAt: [0, -6], itemAngle: 0 },
  hipF: [53, 126], kF: [49, 175], aF: [46, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [76, 175], aN: [79, 215], footN: { dir: 1 },
  order: FRONT_ARMS,
};

// ---------- Hospital: the Injured, and the healed until the round ends ----------

/** H1: sitting up in bed against the pillow, the arms on the blanket. */
const bedSitting = {
  head: [60, 140], tilt: 0, view: 'front',
  neck: [62, 166], pelvis: [62, 214],
  sF: [40, 172], eF: [30, 198], wF: [44, 214], handF: { angle: 20 },
  sN: [84, 171], eN: [94, 198], wN: [80, 214], handN: { angle: 160 },
  hipF: [54, 216], kF: [52, 240], aF: [50, 256], footF: { type: 'none' },
  hipN: [70, 216], kN: [72, 240], aN: [74, 256], footN: { type: 'none' },
  front: ['armF', 'armN'],
};

/** H2: lying in bed, the head on the pillow, an arm across the forehead, the other on the blanket. */
const bedLying = {
  head: [44, 186], tilt: 0, view: 'down',
  neck: [48, 204], pelvis: [56, 244],
  sF: [28, 208], eF: [20, 226], wF: [36, 238], handF: { angle: 10, type: 'flat' },
  sN: [70, 210], eN: [80, 184], wN: [48, 174], handN: { angle: 196 },
  hipF: [48, 246], kF: [46, 262], aF: [44, 270], footF: { type: 'none' },
  hipN: [64, 246], kN: [66, 262], aN: [68, 270], footN: { type: 'none' },
  order: ['legF', 'legN', 'armF', 'neck', 'torso', 'head', 'armN'],
  front: ['armF'],
  // Only the head and shoulders show above the blanket: that is where it is pressed.
  press: [46, 186],
};

/** H3: sitting in the wheelchair facing us, the hands on its wheels. */
const wheelchair = {
  head: [60, 82], tilt: 0, view: 'front',
  neck: [62, 108], pelvis: [62, 166],
  sF: [40, 116], eF: [28, 144], wF: [24, 166], handF: { angle: 96, type: 'fist' },
  sN: [84, 116], eN: [96, 144], wN: [100, 166], handN: { angle: 84, type: 'fist' },
  hipF: [52, 170], kF: [46, 190], aF: [44, 222], footF: { dir: -1 },
  hipN: [72, 170], kN: [80, 190], aN: [82, 222], footN: { dir: 1 },
  order: ['neck', 'torso', 'legF', 'legN', 'armF', 'armN', 'head'],
};

/** H4: on their feet at the IV pole, gripping it, the other hand at the side. */
const ivPole = {
  head: [56, 40], tilt: 6, view: 'front',
  neck: [61, 66], pelvis: [62, 124],
  sF: [39, 74], eF: [14, 92], wF: [-2, 78], handF: { angle: -84, type: 'fist' },
  sN: [84, 73], eN: [92, 102], wN: [76, 118], handN: { angle: 204 },
  hipF: [53, 126], kF: [50, 175], aF: [47, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [78, 174], aN: [82, 214], footN: { dir: 1 },
  shadow: [60, 44],
  order: FRONT_ARMS,
};

/** H5: sitting on the bench facing us, the near arm held across the body (in a sling when Injured), the other hand on the knee. */
const benchSling = {
  head: [60, 98], tilt: -4, view: 'front', sling: true,
  neck: [62, 124], pelvis: [62, 182],
  sF: [40, 132], eF: [32, 160], wF: [44, 184], handF: { angle: 60 },
  sN: [84, 132], eN: [88, 160], wN: [60, 154], handN: { angle: 192 },
  hipF: [52, 186], kF: [44, 202], aF: [42, 226], footF: { dir: -1 },
  hipN: [72, 186], kN: [80, 202], aN: [82, 226], footN: { dir: 1 },
  order: ['neck', 'torso', 'legF', 'legN', 'armF', 'armN', 'head'],
};

// ---------- Jail: everyone here is Jailed ----------

/** J1: hunched on the bench, the elbows on the knees, the hands clasped, looking down. */
const benchHunched = {
  head: [62, 112], tilt: 0, view: 'down',
  neck: [62, 128], pelvis: [62, 166],
  sF: [42, 136], eF: [44, 178], wF: [58, 176], handF: { angle: 10, type: 'fist' },
  sN: [82, 136], eN: [80, 178], wN: [66, 176], handN: { angle: 170, type: 'fist' },
  hipF: [52, 170], kF: [44, 186], aF: [42, 226], footF: { dir: -1 },
  hipN: [72, 170], kN: [80, 186], aN: [84, 226], footN: { dir: 1 },
  order: ['neck', 'torso', 'legF', 'legN', 'head', 'armF', 'armN'],
};

/** J2: at the door, back to us, both hands flat on it, the head bowed. */
const doorBack = {
  back: true, view: 'back', head: [61, 40], tilt: 0,
  neck: [61, 66], pelvis: [62, 124],
  sF: [39, 74], eF: [24, 92], wF: [30, 62], handF: { angle: -92, type: 'flat' },
  sN: [84, 73], eN: [100, 92], wN: [94, 62], handN: { angle: -88, type: 'flat' },
  hipF: [53, 126], kF: [46, 175], aF: [41, 214], footF: { dir: -1 },
  hipN: [71, 126], kN: [79, 175], aN: [84, 214], footN: { dir: 1 },
  shadow: [62, 44],
  order: ['legF', 'legN', 'neck', 'torso', 'head', 'armF', 'armN'],
};

/** J3: leaning back on the wall, the arms folded, a foot up against it. */
const wallLean = {
  head: [64, 38], tilt: -4, view: 'front',
  neck: [65, 66], pelvis: [60, 126],
  sF: [43, 75], eF: [37, 102], wF: [63, 106], handF: { type: 'none' },
  sN: [87, 74], eN: [93, 100], wN: [65, 96], handN: { angle: 182 },
  hipF: [52, 128], kF: [47, 176], aF: [45, 215], footF: { dir: -1 },
  hipN: [68, 128], kN: [88, 166], aN: [76, 198], footN: { dir: 1, angle: -12 },
  shadow: [52, 40],
  order: FRONT_ARMS,
};

/** J4: sitting on the deck against the wall, the knees up, the forearms crossed on them. */
const floorSit = {
  head: [62, 132], tilt: 0, view: 'front',
  neck: [62, 158], pelvis: [62, 212],
  sF: [41, 166], eF: [34, 186], wF: [62, 180], handF: { angle: 0 },
  sN: [83, 165], eN: [90, 186], wN: [62, 184], handN: { angle: 180 },
  hipF: [52, 214], kF: [40, 176], aF: [36, 218], footF: { dir: -1 },
  hipN: [72, 214], kN: [84, 176], aN: [88, 218], footN: { dir: 1 },
  shadow: [62, 48],
  order: ['neck', 'torso', 'legF', 'legN', 'armF', 'armN', 'head'],
};

/** J5: lying on the cot on the back, a hand behind the head, a knee up. */
const cotLying = {
  head: [-6, 198], tilt: 84, view: 'front',
  neck: [18, 204], pelvis: [76, 210],
  sF: [22, 196], eF: [4, 176], wF: [-12, 190], handF: { type: 'none' },
  sN: [26, 212], eN: [46, 222], wN: [70, 212], handN: { angle: -10 },
  hipF: [80, 206], kF: [126, 208], aF: [168, 208], footF: { dir: 1, angle: -80 },
  hipN: [80, 214], kN: [112, 182], aN: [138, 210], footN: { dir: 1 },
  order: ['armF', 'legF', 'neck', 'torso', 'head', 'legN', 'armN'],
  press: [26, 196],
};

// ---------- Command Room: the Captain ----------

/** C1: the Captain, behind the chart table, leaning over it on both hands, looking down at it. */
const captainTable = {
  head: [62, 58], tilt: 0, view: 'down',
  neck: [62, 84], pelvis: [62, 134],
  sF: [34, 92], eF: [20, 116], wF: [32, 140], handF: { angle: 104, type: 'flat' },
  sN: [90, 92], eN: [104, 116], wN: [92, 140], handN: { angle: 76, type: 'flat' },
  hipF: [53, 136], kF: [50, 184], aF: [48, 222], footF: { dir: -1 },
  hipN: [71, 136], kN: [74, 184], aN: [76, 222], footN: { dir: 1 },
  front: ['armF', 'armN'],
};

// ---------- Standing in a crowd (six or more in one room, until a capacity rule exists) ----------

/** Standing with the arms folded. */
const standFolded = {
  ...STAND,
  sF: [40, 74], eF: [35, 100], wF: [62, 104], handF: { type: 'none' },
  sN: [84, 73], eN: [92, 98], wN: [64, 96], handN: { angle: 182 },
  order: FRONT_ARMS,
};

/** Standing with the hands clasped behind the back. */
const standBack = {
  ...STAND,
  sF: [40, 74], eF: [31, 100], wF: [46, 122], handF: { type: 'none' },
  sN: [84, 73], eN: [93, 100], wN: [78, 122], handN: { type: 'none' },
  order: ['armF', 'armN', 'legF', 'legN', 'neck', 'torso', 'head'],
};

// ---------- Eliminated: down where they were (the public marker says it; nothing shows how) ----------

/** Lying on the deck on the back, an arm out, the eyes closed. No wound, no mark. */
const down = {
  head: [-14, 212], tilt: 82, view: 'down',
  neck: [8, 214], pelvis: [66, 218],
  sF: [12, 206], eF: [-2, 186], wF: [-22, 178], handF: { angle: 200, type: 'open' },
  sN: [16, 222], eN: [36, 228], wN: [58, 226], handN: { angle: 0, type: 'flat' },
  hipF: [70, 214], kF: [106, 200], aF: [136, 220], footF: { dir: 1, angle: -60 },
  hipN: [70, 222], kN: [116, 222], aN: [154, 224], footN: { dir: 1, angle: -84 },
  shadow: [66, 92],
  order: ['armF', 'legF', 'legN', 'neck', 'torso', 'head', 'armN'],
  press: [20, 214],
};

/** Slumped forward at the workstation, back to us, the head down on the desk. */
const slumpDesk = {
  ...consoleBack, head: [66, 104], tilt: 18,
  neck: [65, 122], pelvis: [62, 172],
  sF: [43, 128], eF: [34, 152], wF: [48, 150], sN: [86, 127], eN: [95, 152], wN: [80, 150],
};

/** Slumped over the bench from behind it, the head down on the top between the arms. */
const slumpBench = {
  head: [60, 118], tilt: -70, view: 'down',
  neck: [62, 112], pelvis: [62, 140],
  sF: [36, 112], eF: [20, 124], wF: [30, 134], handF: { angle: 100, type: 'open' },
  sN: [88, 112], eN: [102, 126], wN: [92, 134], handN: { angle: 70, type: 'open' },
  hipF: [53, 142], kF: [50, 188], aF: [48, 226], footF: { dir: -1 },
  hipN: [71, 142], kN: [74, 188], aN: [76, 226], footN: { dir: 1 },
  order: ['legF', 'legN', 'neck', 'torso', 'armF', 'armN', 'head'],
  front: ['armF', 'armN', 'head'],
  press: [62, 112],
};

export const GESTURES = {
  stand: STAND, standFolded, standBack, down, slumpDesk, slumpBench,
  consoleBack, think, crouchHatch, leanCrates, wallPanelBack,
  tablet, laptopStool, tankBack, leanBench, microscope,
  bedSitting, bedLying, wheelchair, ivPole, benchSling,
  benchHunched, doorBack, wallLean, floorSit, cotLying,
  captainTable,
};

/** What each gesture shows, for the manifest, the docs and the review sheets. */
export const ABOUT = {
  stand: 'Standing, a hand on the hip (a crowd of six or more, the Final Zone)',
  standFolded: 'Standing, the arms folded (a crowd, the Final Zone)',
  standBack: 'Standing, the hands behind the back (a crowd, the Final Zone)',
  down: 'Eliminated: lying on the deck, an arm out, the eyes closed; no wound, no mark',
  slumpDesk: 'Eliminated at the workstation: slumped forward, the head on the desk',
  slumpBench: 'Eliminated behind the bench: slumped over it, the head on the top',
  consoleBack: 'Room A, A1: seated at the workstation, back to us, at the monitors',
  think: 'Room A, A2: standing, an arm across the body, a fist at the chin',
  crouchHatch: 'Room A, A3: crouched at the open floor hatch, a hand on the deck, a wrench in the other',
  leanCrates: 'Room A, A4: leaning back on the crates, the arms folded, the ankles crossed',
  wallPanelBack: 'Room A, A5: at the open junction box, back to us, a hand in the wires',
  tablet: 'Room B, B1: standing, reading a tablet',
  laptopStool: 'Room B, B2: seated on a stool, a laptop open on the knees, typing',
  tankBack: 'Room B, B3: at the specimen tank, back to us, a hand on the glass',
  leanBench: 'Room B, B4: behind the bench, leaning on it on both hands',
  microscope: 'Room B, B5: behind the bench at the microscope, a flask held up',
  bedSitting: 'Hospital, H1: sitting up in bed against the pillow',
  bedLying: 'Hospital, H2: lying in bed, an arm across the forehead',
  wheelchair: 'Hospital, H3: sitting in the wheelchair, the hands on its wheels',
  ivPole: 'Hospital, H4: on their feet at the IV stand, holding it',
  benchSling: 'Hospital, H5: sitting on the bench, an arm held across the body (in a sling when Injured)',
  benchHunched: 'Jail, J1: hunched on the bench, the elbows on the knees, looking down',
  doorBack: 'Jail, J2: at the door, back to us, both hands flat on it',
  wallLean: 'Jail, J3: leaning on the wall, the arms folded, a foot against it',
  floorSit: 'Jail, J4: sitting on the deck against the wall, the knees up',
  cotLying: 'Jail, J5: lying on the cot, a hand behind the head, a knee up',
  captainTable: 'Command Room, C1: the Captain, leaning over the chart table on both hands',
};

/** The mark a drawn gesture's name carries when the public view says the character is Injured. */
export const INJURED = '+injured';
/**
 * The mark of a place's fall where the character stays in its gesture (in a bed, on a bench, in
 * the wheelchair): Eliminated, it goes still there, the head dropped and the eyes closed.
 */
export const STILL = '+still';

/**
 * The skeleton a drawn gesture names: a gesture of GESTURES, and with INJURED a bandage round
 * the head and, where the gesture has one, the arm in its sling. A wound is drawn only where
 * the public view says Injured, whatever the place: a healed character in the Hospital wears none.
 * With STILL, the gesture gone still (Eliminated where it sits or lies).
 */
export function skeletonOf(gesture) {
  const [name, ...marks] = String(gesture).split('+');
  let sk = GESTURES[name] ?? GESTURES.stand;
  if (marks.includes('still')) sk = { ...sk, view: sk.view === 'back' ? 'back' : 'down', tilt: (sk.tilt ?? 0) + 18, head: [sk.head[0], sk.head[1] + 4], bandage: false, sling: false };
  if (marks.includes('injured')) return { ...sk, bandage: true };
  return sk.sling ? { ...sk, sling: false } : sk;
}
