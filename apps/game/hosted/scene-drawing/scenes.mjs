// Selected public scene geometry from Designer 49f0db4d34d2a2a418f669a13bed660fc665b1b6.
export const SCENES = {
  "command-room": {
    "room": "command-room",
    "inner": [
      20,
      20,
      1004,
      748
    ],
    "focus": [
      64,
      200,
      960,
      620
    ],
    "slots": [
      {
        "id": "C1",
        "at": [
          512,
          574
        ],
        "depth": 440,
        "scale": 1.2,
        "gesture": "captainTable",
        "about": "The Captain, leaning over the chart table on both hands"
      }
    ],
    "layers": {
      "table": {
        "depth": 470
      }
    }
  },
  "room-a": {
    "room": "room-a",
    "inner": [
      20,
      20,
      1004,
      748
    ],
    "focus": [
      322,
      170,
      702,
      700
    ],
    "slots": [
      {
        "id": "A1",
        "down": "slumpDesk",
        "at": [
          518,
          530
        ],
        "scale": 1.02,
        "gesture": "consoleBack",
        "about": "Seated at the workstation, back to us, at the monitors"
      },
      {
        "id": "A2",
        "at": [
          392,
          542
        ],
        "scale": 1.025,
        "gesture": "think",
        "mirror": true,
        "about": "Standing on the deck, an arm across, a hand at the chin"
      },
      {
        "id": "A3",
        "at": [
          690,
          604
        ],
        "scale": 1.07,
        "gesture": "crouchHatch",
        "about": "Crouched at the open floor hatch, a wrench in hand"
      },
      {
        "id": "A4",
        "at": [
          664,
          408
        ],
        "scale": 0.95,
        "gesture": "leanCrates",
        "about": "Leaning back on the crates, the arms folded"
      },
      {
        "id": "A5",
        "at": [
          366,
          394
        ],
        "scale": 0.94,
        "gesture": "wallPanelBack",
        "about": "At the open junction box on the wall, back to us, a hand in the wires"
      }
    ],
    "layers": {}
  },
  "room-b": {
    "room": "room-b",
    "inner": [
      20,
      20,
      1004,
      748
    ],
    "focus": [
      370,
      170,
      770,
      700
    ],
    "slots": [
      {
        "id": "B1",
        "at": [
          562,
          662
        ],
        "scale": 1.08,
        "gesture": "tablet",
        "mirror": true,
        "about": "Standing on the deck, reading a tablet"
      },
      {
        "id": "B2",
        "at": [
          424,
          664
        ],
        "scale": 1.1,
        "gesture": "laptopStool",
        "about": "Seated on a stool, a laptop open on the knees, typing"
      },
      {
        "id": "B3",
        "at": [
          706,
          656
        ],
        "scale": 1.08,
        "gesture": "tankBack",
        "about": "At the specimen tank, back to us, a hand on the glass"
      },
      {
        "id": "B4",
        "down": "slumpBench",
        "at": [
          576,
          488
        ],
        "depth": 400,
        "scale": 0.95,
        "gesture": "leanBench",
        "about": "Behind the bench, leaning on it with both hands, looking at the samples"
      },
      {
        "id": "B5",
        "down": "slumpBench",
        "at": [
          400,
          488
        ],
        "depth": 400,
        "scale": 0.94,
        "gesture": "microscope",
        "about": "Behind the bench, bent over the microscope"
      }
    ],
    "layers": {
      "bench": {
        "depth": 470
      }
    }
  },
  "hospital": {
    "room": "hospital",
    "inner": [
      20,
      20,
      1004,
      748
    ],
    "focus": [
      120,
      160,
      904,
      700
    ],
    "slots": [
      {
        "id": "H1",
        "down": "bedSitting+still",
        "at": [
          232,
          410
        ],
        "scale": 0.98,
        "gesture": "bedSitting",
        "about": "Sitting up in the left bed against the pillow"
      },
      {
        "id": "H2",
        "down": "bedLying+still",
        "at": [
          812,
          410
        ],
        "scale": 0.98,
        "gesture": "bedLying",
        "mirror": true,
        "about": "Lying in the right bed, an arm across the forehead"
      },
      {
        "id": "H3",
        "down": "wheelchair+still",
        "at": [
          372,
          738
        ],
        "scale": 1.1,
        "gesture": "wheelchair",
        "about": "Sitting in the wheelchair, the hands on its wheels"
      },
      {
        "id": "H4",
        "at": [
          530,
          446
        ],
        "scale": 0.98,
        "gesture": "ivPole",
        "about": "On their feet at the IV pole, holding it"
      },
      {
        "id": "H5",
        "down": "benchSling+still",
        "at": [
          652,
          732
        ],
        "scale": 1.1,
        "gesture": "benchSling",
        "mirror": true,
        "about": "Sitting on the bench, an arm held across the body (in a sling when Injured)"
      }
    ],
    "layers": {
      "bedLeft": {
        "depth": 420
      },
      "bedRight": {
        "depth": 421
      }
    }
  },
  "jail": {
    "room": "jail",
    "inner": [
      20,
      20,
      1004,
      748
    ],
    "focus": [
      120,
      160,
      904,
      700
    ],
    "slots": [
      {
        "id": "J1",
        "down": "benchHunched+still",
        "at": [
          246,
          404
        ],
        "scale": 0.98,
        "gesture": "benchHunched",
        "about": "Hunched on the bench, the elbows on the knees, looking down"
      },
      {
        "id": "J2",
        "at": [
          512,
          398
        ],
        "scale": 0.96,
        "gesture": "doorBack",
        "about": "At the door, back to us, both hands flat on it"
      },
      {
        "id": "J3",
        "at": [
          776,
          404
        ],
        "scale": 0.98,
        "gesture": "wallLean",
        "about": "Leaning on the wall, the arms folded, a foot against it"
      },
      {
        "id": "J4",
        "down": "floorSit+still",
        "at": [
          380,
          700
        ],
        "scale": 1.1,
        "gesture": "floorSit",
        "mirror": true,
        "about": "Sitting on the deck against the wall, the knees up, the arms on them"
      },
      {
        "id": "J5",
        "down": "cotLying+still",
        "at": [
          652,
          704
        ],
        "scale": 1.1,
        "gesture": "cotLying",
        "about": "Lying on the cot, the hands behind the head"
      }
    ],
    "layers": {}
  }
};
