# Sheet RA-D version 2: RA-D-1's painted features, the kit's fixed obstacles for the Lead's 15 px rule (feat15.py). Writes
# featuresD.json. RA-D-1 is view D's AI-generated step-1 picture (accepted by the Lead on 27 November). Picture pixels of the 1024 x
# 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-D-1 at three or four times on a
# 2 px grid (sheetV/fine.py), its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines the
# guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints and their rivets) are not features, as in
# view A. Where Vega's desk and monitors, the hatch's lid or Echo's cabinet stand in front of a painted feature, their outline must
# cross it or run along it: those places are named exceptions, each with its zone, for the Lead's decision; so are the two places
# where an outline runs within 15 px of a feature beside it: the light box between the cabinet (step 2) and the capsule (step 3), and
# the paper above the capsule (step 3). The two indicator lights are listed apart: the light test fails any light inside a mask.
# Usage: python3 -I featuresD2.py
import json, os
D = os.path.dirname(os.path.abspath(__file__))
R = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
LEAD = "the Lead's decision"
def exc(where, zone, why): return {'where': where, 'zone': zone, 'for': LEAD, 'why': why}
features = [
 {'name': 'vent box and its conduits on the north wall', 'kind': 'box', 'test': True, 'measured': 'the box with five vents at x 36-131, y 746-861, and the three conduits below it at x 55-118 down to the pipes at y 900',
  'polygons': [R(34, 744, 133, 863), R(53, 855, 120, 902)],
  'exceptions': [exc("behind the monitors' tops", R(28, 738, 142, 906), "Vega's monitors stand in front of the box: their tops run along its foot, 0 to 9 px from it, and the conduits below it lie inside the desk's area.")]},
 {'name': 'pipes along the north wall', 'kind': 'pipes', 'test': True, 'measured': 'the upper pipes at y 872-902 and the large pipe at y 900-1000, with its clamp at x 95-140, y 925-995 and a bracket at x 275-300, y 870-935, from the picture\'s edge to x 400',
  'polygons': [[[0, 876], [400, 858], [400, 972], [142, 998], [0, 1010]]],
  'exceptions': [exc('behind the desk and its monitors', R(0, 836, 350, 1016), "Vega's desk and monitors stand in front of the pipes: the desk's area covers them to x 210, and its right side and the desk's top cross them from x 210 to 320.")]},
 {'name': 'junction box and pipes in the corner', 'kind': 'box', 'test': True, 'measured': 'the box at x 550-600, y 845-920, the fitting at its right at x 597-626, y 868-922, and the pipes from them to the deck at y 960, x 530-630',
  'polygons': [R(528, 838, 632, 964)],
  'exceptions': [exc("behind the lid's top-left corner", R(520, 830, 642, 972), "The hatch's lid stands in front of the corner's fittings: its top-left corner sits at the box's foot and its left side runs down the pipes to the deck.")]},
 {'name': 'lockers on the east wall', 'kind': 'locker', 'test': True, 'measured': 'the three lockers at x 763-1003, from above the mask to their frame\'s foot at y 722, with their handles at y 620-650',
  'polygons': [R(760, 520, 1006, 726)],
  'exceptions': [exc("behind the cabinet's top", R(752, 596, 1014, 732), "Echo's cabinet stands in front of the lockers: its top crosses their doors at the handles' height, and their lower part lies inside its area.")]},
 {'name': 'light box beside the cabinet', 'kind': 'box', 'test': True, 'measured': 'the box at x 711-768, y 733-782, its conduit down to the pipe at x 728-752, y 780-800, and its orange indicator dot at x 738-746, y 743-750',
  'polygons': [R(709, 731, 770, 784), R(726, 780, 754, 802)],
  'exceptions': [exc("between the cabinet (step 2) and the capsule (step 3)", R(703, 723, 778, 808), "The box sits between Echo's cabinet and the food capsule: the cabinet's left side runs 1 to 5 px from the box's frame, and step 3's mask, the capsule's outline grown 2 px, runs 7 px from its left edge. The dot itself is 16 px from the cabinet's mask and 32 px from the capsule's.")]},
 {'name': 'pipe along the east wall', 'kind': 'pipes', 'test': True, 'measured': 'the pipe from the light box\'s conduit along the east wall at y 785-820, rising to y 765-800 past x 900, with its clamp at x 775-787, y 787-807',
  'polygons': [[[726, 783], [870, 783], [900, 763], [1024, 763], [1024, 802], [900, 802], [872, 822], [726, 822]]],
  'exceptions': [exc('behind the cabinet', R(718, 755, 1024, 830), "Echo's cabinet stands in front of the pipe: the pipe runs into the cabinet's area at its left side and on behind it.")]},
 {'name': 'vent box on the east wall', 'kind': 'box', 'test': True, 'measured': 'the box with its vents at x 877-1010, y 802-960',
  'polygons': [R(874, 798, 1013, 963)],
  'exceptions': [exc("behind the cabinet's lower right", R(866, 790, 1020, 970), "Echo's cabinet stands in front of the vent box: the cabinet's foot crosses the box's upper vents.")]},
 {'name': 'paper on the east wall', 'kind': 'paper', 'test': True, 'measured': 'the paper sheet at x 684-740, y 628-712, with its clip at x 701-726 from y 624',
  'polygons': [R(681, 621, 743, 715)],
  'exceptions': [exc("above the capsule's top (step 3)", R(675, 696, 750, 728), "The food capsule hangs below the paper: step 3's mask (the capsule's outline grown 2 px) runs 8 px below the paper's foot.")]},
]
lights = [{'name': 'indicator dot, light box beside the cabinet', 'box': [734, 739, 750, 754]}, {'name': 'indicator dot, box high on the north wall', 'box': [83, 639, 97, 658]}]
out = {'about': "Painted features near the masks in RA-D-1 (AI-generated, sheet RA-D's accepted step-1 picture), the kit's fixed obstacles for the Lead's 15 px rule (version 2). Picture pixels of the 1024 x 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-D-1 at three or four times on a 2 px grid, its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines the guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints and their rivets) are not features, as in view A. Where Vega's desk and monitors, the hatch's lid or Echo's cabinet stand in front of a painted feature, their outline must cross it or run along it: those places are named exceptions, each with its zone, for the Lead's decision; so are the two places where an outline runs within 15 px of a feature beside it, the light box between the cabinet and the food capsule and the paper above the capsule.",
       'picture': {'name': 'RA-D-1', 'sha256': 'c8842de16d63076fe69306b247bcc643b6dc5576f6c389364ce49bc970f2fe75', 'aiGenerated': True},
       'minClearPx': 15, 'rule': "Every step-2 and step-3 mask edge either clearly overlaps a feature in the test, covering it with at least 15 px to spare, or clears it by at least 15 px (square pixels): no part of the feature lies within 15 px of a mask edge. A named exception, for the Lead's decision, passes only where every such part lies in its zone. The features not in the test are measured and reported.",
       'features': features, 'lights': lights}
json.dump(out, open(os.path.join(D, 'featuresD.json'), 'w'), indent=1)
print(len(features), 'features,', sum(len(f['exceptions']) for f in features), 'exception zones,', len(lights), 'lights')
