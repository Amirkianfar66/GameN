# Sheet RA-C version 2: RA-C-1's painted features, the kit's fixed obstacles for the Lead's 15 px rule (feat15.py). Writes
# featuresC.json. RA-C-1 is view C's AI-generated step-1 picture (accepted by the Lead on 27 November). Picture pixels of the 1024 x
# 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-C-1 at three or four times on a
# 10 px grid (sheetV/tracecrop.py), its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines
# the guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints) are not features, as in view A.
# Where Atlas's crates, Vega's desk or its monitor stand in front of a painted feature, their outline must cross it or run along it:
# those places are named exceptions, each with its zone, for the Lead's decision. Usage: python3 -I featuresC2.py
import json, os
D = os.path.dirname(os.path.abspath(__file__))
R = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
LEAD = "the Lead's decision"
def exc(where, zone, why): return {'where': where, 'zone': zone, 'for': LEAD, 'why': why}
features = [
 {'name': 'wall panel behind the crates', 'kind': 'panel', 'test': True, 'measured': "the far wall's raised panel at x 421-528, y 815-895, with its frame and bolts",
  'polygons': [R(418, 812, 531, 898)],
  'exceptions': [exc("behind the upper crate's top and left side", R(405, 800, 535, 900), "Atlas's crates stand in front of the panel: the upper crate's top edge runs 8 px above the panel's top edge, and its left side crosses the panel.")]},
 {'name': 'vent box above the crates', 'kind': 'vent', 'test': True, 'measured': 'the vent box on the far wall at x 420-528, y 750-797, with its bolts',
  'polygons': [R(417, 748, 532, 799)],
  'exceptions': [exc("above the upper crate's top", R(410, 785, 540, 800), "The upper crate's top edge (the mask's edge at y 808) runs 10 to 12 px under the vent box's foot: the crate stands in front of the wall just below it.")]},
 {'name': 'pipe bends right of the crates', 'kind': 'pipes', 'test': True, 'measured': "three pipes coming down at x 581-640 and bending right into the runs at y 844-889, with the clamp at x 664-683",
  'polygons': [[[578, 748], [644, 748], [644, 826], [700, 826], [700, 894], [578, 894]]],
  'exceptions': [exc("behind the lower crate's top right corner", R(566, 849, 628, 916), "The lowest pipe's bend passes behind the lower crate's top right corner, which crosses it; the runs beside it lie just above the crate's sloping side.")]},
 {'name': 'vented wall box behind the monitor', 'kind': 'box', 'test': True, 'measured': "the vented box on the right-hand wall at x 944-1009, y 751-874, its left edge 2 px from the monitor's outline",
  'polygons': [R(941, 748, 1011, 877)],
  'exceptions': [exc("behind the monitor's top and left side", R(924, 784, 1013, 880), "Vega's monitor stands in front of the box: its top crosses the vent and its left side runs along the box's left edge.")]},
 {'name': 'pipes behind the desk\'s far end', 'kind': 'pipes', 'test': True, 'measured': "two pipes along the right-hand wall at y 848-889, from the left of the crop to the vertical pipe at x 920, with the clamp at x 862-879",
  'polygons': [R(790, 843, 921, 893)],
  'exceptions': [exc("behind the desk's far end", R(822, 843, 923, 896), "The desk's far end stands in front of the pipes: its top and its near side cross them.")]},
 {'name': 'vertical pipe beside the monitor', 'kind': 'pipes', 'test': True, 'measured': "the long pipe at x 920-935 from above the crop to the kick strip, with clamps at y 814-822 and 903-909",
  'polygons': [R(917, 738, 939, 1000)],
  'exceptions': [exc("beside the monitor's left side and behind the desk's far end", R(910, 784, 943, 883), "The pipe runs 7 to 22 px left of the monitor's outline and passes behind the desk's far end, whose top crosses it.")]},
]
lights = [{'name': 'indicator dot, left wall box', 'box': [192, 623, 202, 638]}, {'name': 'indicator dot, far wall box, left', 'box': [360, 567, 366, 574]},
          {'name': 'indicator dot, far wall box, right', 'box': [625, 607, 636, 619]}, {'name': 'indicator dot, right-hand wall', 'box': [967, 670, 972, 676]}]
out = {'about': "Painted features on the walls of RA-C-1 (AI-generated, sheet RA-C's accepted step-1 picture), the kit's fixed obstacles for the Lead's 15 px rule (version 2). Picture pixels of the 1024 x 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-C-1 at three or four times on a 10 px grid, its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines the guide itself draws (the kick strips, the deck seams, the corners, the wall panels' joints) are not features, as in view A. Where Atlas's crates, Vega's desk or its monitor stand in front of a painted feature, their outline must cross it or run along it: those places are named exceptions, each with its zone, for the Lead's decision. Near the toolbox and the hatch, only structural lines lie within 60 px of the mask.",
       'picture': {'name': 'RA-C-1', 'sha256': 'ad56119d60d86073282585044f82b4fceb5a9d130d217f096e814516990783b5', 'aiGenerated': True},
       'minClearPx': 15, 'rule': "Every step-2 mask edge either clearly overlaps a feature in the test, covering it with at least 15 px to spare, or clears it by at least 15 px (square pixels): no part of the feature lies within 15 px of a mask edge. A named exception, for the Lead's decision, passes only where every such part lies in its zone. The features not in the test are measured and reported.",
       'features': features, 'lights': lights}
json.dump(out, open(os.path.join(D, 'featuresC.json'), 'w'), indent=1)
print(len(features), 'features,', sum(len(f['exceptions']) for f in features), 'exception zones,', len(lights), 'lights')
