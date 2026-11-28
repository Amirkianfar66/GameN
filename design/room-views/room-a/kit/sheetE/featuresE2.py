# Sheet RA-E version 2: RA-E-1's painted features, the kit's fixed obstacles for the Lead's 15 px rule (feat15.py). Writes
# featuresE.json. RA-E-1 is view E's AI-generated step-1 picture (accepted by the Lead on 27 November). Picture pixels of the 1024 x
# 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-E-1 at three times on a 10 px
# grid (sheetV/tracecrop.py), its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines
# the guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints) are not features, as in view A.
# Where Echo's cabinet or Atlas's crates stand in front of a painted feature, their outline must cross it or run along it: those
# places are named exceptions, each with its zone, for the Lead's decision. The orange dot on the east wall's box lies inside the
# cabinet's area, so it is listed with its box, not as a light (the light test fails any light inside a mask): the cabinet covers it.
# Usage: python3 -I featuresE2.py
import json, os
D = os.path.dirname(os.path.abspath(__file__))
R = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
LEAD = "the Lead's decision"
def exc(where, zone, why): return {'where': where, 'zone': zone, 'for': LEAD, 'why': why}
features = [
 {'name': 'paper on the east wall', 'kind': 'paper', 'test': True, 'measured': 'the paper sheet at x 17-49, y 543-664, with its clip at x 27-37 from y 534',
  'polygons': [R(14, 531, 52, 667)],
  'exceptions': [exc("behind the cabinet's top", R(10, 527, 56, 671), "Echo's cabinet stands in front of the paper: the cabinet's top edge crosses it, and its lower part lies inside the cabinet's area.")]},
 {'name': 'pipes on the east wall', 'kind': 'pipes', 'test': True, 'measured': 'two pipes at x 50-83 from above the mask to y 1000, with clamps at y 611-638 and x 34-77, y 921-961',
  'polygons': [R(48, 478, 85, 1002), R(31, 918, 80, 964)],
  'exceptions': [exc("behind the cabinet, along its right side", R(27, 470, 96, 1008), "Echo's cabinet stands in front of the pipes: its top crosses them, and inside its area they run 9 px from its right edge.")]},
 {'name': 'wall box with its indicator light', 'kind': 'box', 'test': True, 'measured': "the box on the east wall at x 22-89, y 686-815, its fitting from y 686, and its orange indicator dot at x 73-79, y 794-800",
  'polygons': [R(20, 683, 91, 817)],
  'exceptions': [exc("inside the cabinet's area, by its right side", R(15, 678, 96, 822), "Echo's cabinet stands in front of the wall box: the box lies inside the cabinet's area, 3 px from its right edge, and the cabinet covers its indicator dot, 14 px inside.")]},
 {'name': 'pipe along the foot of the east wall', 'kind': 'pipes', 'test': True, 'measured': 'the large pipe running down to the left from its end cap at x 59-72, y 989-1009, to the picture\'s edge at y 1026-1114',
  'polygons': [[[0, 1018], [62, 984], [82, 988], [82, 1026], [0, 1122]]],
  'exceptions': [exc("behind the cabinet's foot", R(0, 978, 96, 1126), "The cabinet's lower edge crosses the pipe that runs along the wall's foot: the cabinet stands in front of it.")]},
 {'name': 'pipe along the west wall', 'kind': 'pipes', 'test': True, 'measured': 'the pipe coming round the far corner at x 760-790 from y 840 and running along the west wall from y 895-925 at x 790 to y 955-990 at the right edge, with its clamps at x 760-785, y 838-860 and x 805-836, y 905-940',
  'polygons': [[[756, 836], [792, 836], [792, 893], [1024, 955], [1024, 990], [792, 925], [756, 925]], R(803, 903, 838, 942)],
  'exceptions': [exc("behind the crates' far end", R(752, 830, 1024, 995), "Atlas's crates stand in front of the pipe: their far end crosses its run along the west wall, and its bend round the corner comes within 15 px of their far end.")]},
 {'name': 'locker on the west wall', 'kind': 'locker', 'test': True, 'measured': 'the locker at x 905-1002, y 785-910, with its frame, handle and vents',
  'polygons': [R(902, 782, 1005, 913)],
  'exceptions': [exc("behind the upper crate's top", R(898, 778, 1010, 918), "Atlas's crates stand in front of the locker: the upper crate's top edge crosses it.")]},
]
lights = [{'name': 'indicator dot, south wall box', 'box': [492, 897, 504, 911]}, {'name': 'indicator dot, junction box high on the south wall', 'box': [711, 593, 724, 608]}]
out = {'about': "Painted features on the walls of RA-E-1 (AI-generated, sheet RA-E's accepted step-1 picture), the kit's fixed obstacles for the Lead's 15 px rule (version 2). Picture pixels of the 1024 x 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-E-1 at three times on a 10 px grid, its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines the guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints) are not features, as in view A. Where Echo's cabinet or Atlas's crates stand in front of a painted feature, their outline must cross it or run along it: those places are named exceptions, each with its zone, for the Lead's decision. The orange dot on the east wall's box lies inside the cabinet's area: it is listed with its box, which the cabinet covers, not as a light.",
       'picture': {'name': 'RA-E-1', 'sha256': 'e0d928ef4c1dabd3968b20568bd0d6e3f923682df7f6d938c61bd26cb2d0730f', 'aiGenerated': True},
       'minClearPx': 15, 'rule': "Every step-2 mask edge either clearly overlaps a feature in the test, covering it with at least 15 px to spare, or clears it by at least 15 px (square pixels): no part of the feature lies within 15 px of a mask edge. A named exception, for the Lead's decision, passes only where every such part lies in its zone. The features not in the test are measured and reported.",
       'features': features, 'lights': lights}
json.dump(out, open(os.path.join(D, 'featuresE.json'), 'w'), indent=1)
print(len(features), 'features,', sum(len(f['exceptions']) for f in features), 'exception zones,', len(lights), 'lights')
