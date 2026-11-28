# Sheet RA-B version 2: RA-B-2's painted features, the kit's fixed obstacles for the Lead's 15 px rule (feat15.py). Writes
# featuresB.json. RA-B-2 is view B's AI-generated step-1 picture (accepted by the Lead on 27 November). Picture pixels of the 1024 x
# 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-B-2 at three or four times on a
# 10 px grid (sheetV/tracecrop.py), its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines
# the guide itself draws (the kick strips, the deck seams, the corners) are not features, as in view A. Where Vega's desk, its
# monitors or Atlas's crates stand in front of a painted feature, their outline must cross it or run along it: those places are
# named exceptions, each with its zone (the furniture's own outline there, 21 px either side: the mask's 6 px and the rule's 15 px),
# for the Lead's decision. Usage: python3 -I featuresB2.py
import json, os
D = os.path.dirname(os.path.abspath(__file__))
R = lambda x0, y0, x1, y1: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
LEAD = "the Lead's decision"
def exc(where, zone, why): return {'where': where, 'zone': zone, 'for': LEAD, 'why': why}
features = [
 {'name': 'lower pipe run', 'kind': 'pipes', 'test': True, 'measured': "the back wall's long pipe behind the monitors, y 803-818 with its outline and shadow, with its couplings and clamps; from the elbow at x 383 to x 712, 60 px beyond the desk's mask",
  'polygons': [R(383, 800, 712, 821)],
  'exceptions': [exc('behind the two monitors', R(431, 780, 641, 826), "Vega's monitors stand in front of the pipe: their outer sides cross it (x 452 and 619) and their tops run 9 to 14 px above it, so the monitors' outline must cross it and run along it.")]},
 {'name': 'pipe elbow and upper pipe, left', 'kind': 'pipes', 'test': True, 'measured': 'the pipe that comes down the wall at x 386-399 and turns into the lower run at y 789-820',
  'polygons': [[[380, 740], [403, 740], [403, 786], [421, 786], [421, 823], [380, 823]]], 'exceptions': []},
 {'name': 'vertical pipe behind the desk\'s left end', 'kind': 'pipes', 'test': True, 'measured': 'the light pipe at x 381-414 from under the elbow down to the kick strip (y 823-968), with its clamp at y 917-932',
  'polygons': [R(378, 823, 417, 969)],
  'exceptions': [exc("behind the desk's left end", R(372, 818, 420, 972), "The pipe runs down behind the desk's left end: the desk's outline (x 402, the mask's edge x 396) crosses it along its length, and its top meets the tabletop's back-left corner.")]},
 {'name': 'pipe bend, upper left', 'kind': 'pipes', 'test': True, 'measured': "the large pipe that comes down from the ceiling and bends right at y 770-786, ending at the left monitor's top-left corner",
  'polygons': [R(420, 748, 470, 790)],
  'exceptions': [exc("at the left monitor's top-left corner", R(431, 765, 475, 808), "The bend ends behind the left monitor's top-left corner: the monitor's outline (its top at y 793, the mask's edge y 787) runs along it.")]},
 {'name': 'clamp bracket on the lower run', 'kind': 'clamp', 'test': True, 'measured': 'the bracket that stands up from the lower run at x 491-501, y 777-818',
  'polygons': [R(487, 774, 505, 821)],
  'exceptions': [exc("behind the left monitor's top", R(482, 766, 510, 808), "The bracket stands up behind the left monitor's top edge, which crosses it.")]},
 {'name': 'junction box on the lower run', 'kind': 'box', 'test': True, 'measured': 'the box on the lower run at x 540-585, y 788-825, with its outline',
  'polygons': [R(537, 785, 589, 828)],
  'exceptions': [exc("behind the right monitor's top", R(532, 770, 594, 813), "The box sits behind the right monitor's top edge (y 797, the mask's edge y 791), which crosses it.")]},
 {'name': 'vented panel behind the desk', 'kind': 'panel', 'test': True, 'measured': "the large wall panel with its vent, x 429-669, y 834-941, with its frame and bolts; the desk stands in front of it, and its right end leaves the panel's last 20 px showing",
  'polygons': [R(426, 831, 672, 944)],
  'exceptions': [exc("behind the tabletop's back edge, left", R(392, 816, 470, 880), "The tabletop's back edge and the left monitor's lower left side run along the panel's top edge, and the desk's left end crosses its top-left corner."),
                 exc("behind the desk's right end", R(600, 826, 674, 948), "The desk's right end crosses the panel (its outline at x 643, the mask's edge x 649), leaving the panel's right 20 px showing; the right monitor's lower right side and the tabletop's right corner run along its top edge.")]},
 {'name': 'left-wall pipe, outer', 'kind': 'pipes', 'test': True, 'measured': "the west wall's large pipe at x 44-90, from above down to its elbow at y 1046, with its clamp rings (y 909-928 and 969-986)",
  'polygons': [R(40, 760, 94, 1050)],
  'exceptions': [exc("behind the crates' top", R(28, 868, 102, 932), "Atlas's crates stand in front of the pipe: the upper crate's top edge crosses it, and its clamp ring at y 909-928 lies just under that edge.")]},
 {'name': 'left-wall pipe, inner', 'kind': 'pipes', 'test': True, 'measured': "the west wall's second pipe at x 92-135, with its clamp ring at y 877-889",
  'polygons': [R(89, 760, 140, 1002)],
  'exceptions': [exc("behind the crates' top", R(84, 864, 146, 924), "The upper crate's top edge crosses the pipe at its clamp ring.")]},
 {'name': 'pipe elbow and low run, left wall', 'kind': 'pipes', 'test': True, 'measured': "the outer pipe's elbow and the short run to its coupling, x 44-170, y 970-1047: behind the crates, inside their area",
  'polygons': [R(40, 968, 173, 1050)], 'exceptions': []},
 {'name': 'locker with its vent, left wall', 'kind': 'locker', 'test': True, 'measured': 'the west wall locker at x 149-275, y 786-960, its vent at x 205-259, y 881-919',
  'polygons': [R(146, 783, 278, 963)],
  'exceptions': [exc("behind the crates' top right corner", R(140, 876, 221, 966), "The upper crate's top edge and right side cross the locker's lower part; its vent sits 6 px beyond the crates' mask.")]},
 {'name': 'thin pipe run right of the crates', 'kind': 'pipes', 'test': True, 'measured': 'the thin pipe at y 952-986 from x 168 to 330, with its clamp at x 222-245, y 946-986',
  'polygons': [R(165, 943, 333, 990)],
  'exceptions': [exc("behind the crates' right side and the lower crate's top", R(178, 936, 304, 1003), "The pipe passes behind the upper crate's right side and just above the lower crate's top, whose outline runs along it.")]},
 {'name': 'bracket on the thin conduits', 'kind': 'clamp', 'test': True, 'measured': 'the bracket at x 295-310, y 917-943', 'polygons': [R(292, 914, 313, 946)], 'exceptions': []},
]
lights = [{'name': 'indicator dot, left wall', 'box': [337, 536, 339, 541]}, {'name': 'indicator dot, back-wall box', 'box': [478, 593, 484, 602]}, {'name': 'indicator dot, right of the window', 'box': [934, 786, 942, 794]}]
out = {'about': "Painted features on the walls of RA-B-2 (AI-generated, sheet RA-B's accepted step-1 picture), the kit's fixed obstacles for the Lead's 15 px rule (version 2). Picture pixels of the 1024 x 1536 painting; a polygon holds the pixels whose centres lie inside it. Each outline was read from RA-B-2 at three or four times on a 10 px grid, its dark ink outline and any contact shadow included, and drawn a little generous. Structural lines the guide itself draws (the kick strips, the deck seams, the corners) are not features, as in view A. Where Vega's desk, its monitors or Atlas's crates stand in front of a painted feature, their outline must cross it or run along it: those places are named exceptions, each with its zone, for the Lead's decision. Near the toolbox and the hatch, only structural lines lie within 60 px of the mask.",
       'picture': {'name': 'RA-B-2', 'sha256': 'aefddadcb3ce554c215d121dd7a49b8e4197a1dcce77325e54982252c8038605', 'aiGenerated': True},
       'minClearPx': 15, 'rule': "Every step-2 mask edge either clearly overlaps a feature in the test, covering it with at least 15 px to spare, or clears it by at least 15 px (square pixels): no part of the feature lies within 15 px of a mask edge. A named exception, for the Lead's decision, passes only where every such part lies in its zone. The features not in the test are measured and reported.",
       'features': features, 'lights': lights}
json.dump(out, open(os.path.join(D, 'featuresB.json'), 'w'), indent=1)
print(len(features), 'features,', sum(len(f['exceptions']) for f in features), 'exception zones,', len(lights), 'lights')
