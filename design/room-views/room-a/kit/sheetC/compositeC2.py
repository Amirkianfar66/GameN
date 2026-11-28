# Sheet RA-C version 3: RA-C-2c, view C's step-2 picture completed in code (the Lead, 27 November 2026, 19:08). The kept step 2,
# RA-C-2, is the image tool's keep: RA-C-2's raw edit over RA-C-1 inside the step-2 PLACE mask (version 2.1, with the selective 12 px
# growth), feathered by a 2 px Gaussian. Where a piece of furniture ran past the mask, the keep cut it. RA-C-2c is RA-C-2 with the raw
# edit's pixels taken back inside each cut piece's own painted outline (its ink line), traced on the raw, with 1 px of feather outside
# the outline and nothing else from the raw; then the monitor's painted screen, mid grey in the raw, filled with flat black in code,
# keeping its bezel. So it is a code composite of two AI-generated pictures, RA-C-1 and RA-C-2's raw edit, plus a code fill. No picture
# is generated.
#
# The pieces: the four the Lead named (the crates' left end; the monitor's top, with its frame down to the mask, so RA-C-1's vent box
# no longer shows across it; the toolbox's left side; the hatch rim's top-left), and one more with the same cut, done the same way and
# recorded apart so it can be dropped: the toolbox's handle, whose grip lay wholly above the mask. The hatch rim's cut runs on from its
# top-left corner down the whole left arm to the picture's bottom edge, and across its top band where the gap between the toolbox's and
# the hatch's areas crosses it, so that piece follows the rim's outer ink all the way. The toolbox's piece follows its lid's top edge on
# to the handle's left post, where the mask's top edge had cut that ink too.
#
# How the outlines were read: on the raw, along scan lines across each ink line every 2 px (3 px on the hatch's top), at the midpoint
# between the ink's value and the value just outside it, linear between pixel centres; a few readings on bolts, seams or a wall's dark
# band were dropped and the line taken straight across. Each outline closes inside the mask, at least 6.5 px from its edge, where
# RA-C-2 already equals the raw (the keep's blend reaches 5 px); the checks below confirm RA-C-2 equals the raw just outside every
# closing path and in its feather, within 1.5 px of it.
#
# It also fits view C's screen region to the black, for the live monitor: along each side, the edge where the OKLCH lightness crosses
# 0.12, a straight line fitted through it, and the corners where the lines meet; gated as the colour check gates an opening: 95% of it
# under lightness 0.12.
#
# Reads from <records folder>: img/RA-C-2.png, img/RA-C-2-raw.png and img/RA-C-1.png, each checked by its sha256, and from its own
# folder: ra-C-place.png (the step-2 PLACE mask, version 2.1), ra-C-regions.png and ra-C-empty-regions.png (the step-2 and step-1 maps,
# for the map's screen), each checked. Writes to its own folder: ra-C-2c.png (the plate, AI-generated, not for display without a
# label), composite-C2.json (the record) and screens-C.json (view C's screen for the live monitor). NumPy and Pillow only.
# Usage: python3 -I compositeC2.py <records folder>
import hashlib, importlib.util, json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit('usage: python3 -I compositeC2.py <records folder>')
REC = sys.argv[1]
fsha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
psha = lambda a: hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()
IN = {'RA-C-2': ('img/RA-C-2.png', '70f1a853492bb577bd00b274cac8411dc5928e6a84fe53279b46c8c7ea363910'),
      'RA-C-2-raw': ('img/RA-C-2-raw.png', '0a489ff011c94c12b83e9ed65af1f93b4a90b70a28b3f47882904b1e4fe5e74d'),
      'RA-C-1': ('img/RA-C-1.png', 'ad56119d60d86073282585044f82b4fceb5a9d130d217f096e814516990783b5')}
OWN = {'ra-C-place.png': 'f5a0a84ba4db2544f95b7406cfc24abacf84dae31386d07224d7883eb0c3c5c2',          # version 2.1's step-2 PLACE mask
       'ra-C-regions.png': '9d733786ba6bdc214fc560e22dcf1ee69fe748e1415891fb111e793b78f4e3da',        # the step-2 map
       'ra-C-empty-regions.png': '5d49e067beaebfdbfe51a89281785e75a19a6753e27b477d5347f9c12e512bda'}  # the step-1 map
for k, (f, h) in IN.items():
    if fsha(os.path.join(REC, f)) != h: sys.exit(f'STOP: {f} is not {k}')
for f, h in OWN.items():
    if fsha(os.path.join(D, f)) != h: sys.exit(f'STOP: {f} is not the file version 2.1 published')
rgb = lambda f: np.array(Image.open(f).convert('RGB'))
kept, raw, c1 = rgb(os.path.join(REC, IN['RA-C-2'][0])), rgb(os.path.join(REC, IN['RA-C-2-raw'][0])), rgb(os.path.join(REC, IN['RA-C-1'][0]))
place = np.array(Image.open(os.path.join(D, 'ra-C-place.png')).convert('L')) > 127
H, W = place.shape
# RA-C-2 is the keep of the two AI-generated pictures (rb1_tools.py's composite): checked here, so RA-C-2c's sources are those two
Lm = Image.fromarray((place * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
keepAgain = np.array(Image.composite(Image.fromarray(raw), Image.fromarray(c1), Lm))
keepIsExact = bool((keepAgain == kept).all())
if not keepIsExact: sys.exit("STOP: RA-C-2 is not the keep of RA-C-2's raw over RA-C-1 in the step-2 mask")

# ---- the traced outlines: painting pixels, a pixel spanning i to i + 1. Each runs along the outer edge of the piece's ink line
# outside the mask and closes inside the mask ('closing', the part of the outline that is not ink), where RA-C-2 equals the raw
PIECES = [
 {'key': 'crates', 'listed': True, 'name': "the crates' left end: the upper crate's top-left corner and end cap, and the lower crate's left end, from its top-left cap down its end face to its bottom-left cap",
  'ink': "the upper crate's top edge and end cap (to x 372.2), the lower crate's top edge (y 899.5-901), its top-left diagonal and its end face (x 328.7-333.3), its bottom edge (y 1030.4-1032.7)",
  'note': "the raw's lower crate reaches x 328.7 (its end face and two corner caps), further than the 365 estimated; the outline follows it there",
  'outline': [(438.0, 833.78), (436.5, 833.8), (434.5, 833.85), (432.5, 833.79), (430.5, 831.86), (428.5, 831.72), (426.5, 831.69), (424.5, 831.72),
              (422.5, 831.74), (420.5, 831.79), (418.5, 831.81), (416.5, 831.98), (414.5, 833.41), (412.5, 834.38), (410.5, 834.31), (408.5, 833.39),
              (406.5, 832.27), (404.5, 832.24), (402.5, 832.2), (400.5, 832.09), (398.5, 832.17), (396.5, 832.39), (394.5, 832.81), (392.5, 833.78),
              (390.5, 835.36), (388.5, 837.66), (386.5, 839.95), (384.5, 841.66), (382.5, 843.14), (380.5, 844.68), (378.5, 846.19), (376.5, 847.93),
              (374.29, 850.5), (373.11, 852.5), (372.72, 854.5), (372.44, 856.5), (372.38, 858.5), (372.98, 860.5), (372.32, 862.5), (372.23, 864.5),
              (372.27, 866.5), (372.27, 868.5), (372.23, 870.5), (372.71, 872.5), (374.3, 874.5), (374.87, 876.5), (374.8, 878.5), (374.72, 880.5),
              (374.66, 882.5), (374.71, 884.5), (374.55, 886.5), (374.7, 888.5), (374.35, 890.5), (375.44, 894.5), (375.08, 898.5), (375.0, 900.0),
              (370.5, 901.0), (368.5, 900.85), (366.5, 900.53), (364.5, 900.21), (362.5, 900.43), (360.5, 899.53), (358.5, 899.59), (356.5, 899.94),
              (354.5, 900.18), (351.24, 902.5), (349.85, 904.5), (348.66, 906.5), (347.23, 908.5), (345.55, 910.5), (343.6, 912.5), (342.33, 914.5),
              (340.41, 916.5), (338.9, 918.5), (337.5, 920.5), (335.89, 922.5), (333.96, 924.5), (332.47, 926.5), (331.26, 928.5), (330.23, 930.5),
              (329.31, 932.5), (329.21, 934.5), (329.12, 936.5), (329.09, 938.5), (328.91, 940.5), (328.74, 942.5), (329.11, 944.5), (328.92, 946.5),
              (328.8, 948.5), (328.78, 950.5), (328.75, 952.5), (328.85, 954.5), (329.17, 956.5), (332.75, 958.5), (333.25, 960.5), (332.3, 962.5),
              (331.18, 966.5), (331.47, 968.5), (331.29, 970.5), (331.44, 972.5), (331.44, 974.5), (331.44, 976.5), (331.32, 978.5), (331.24, 980.5),
              (331.54, 988.5), (331.5, 990.5), (331.46, 992.5), (331.5, 994.5), (331.63, 996.5), (331.5, 998.5), (331.44, 1000.5), (331.46, 1002.5),
              (329.9, 1004.5), (329.39, 1006.5), (329.29, 1008.5), (329.39, 1010.5), (329.73, 1012.5), (330.04, 1014.5), (329.85, 1016.5),
              (329.47, 1018.5), (329.26, 1020.5), (329.33, 1022.5), (329.55, 1024.5), (330.14, 1026.5), (331.13, 1028.5), (332.96, 1030.5),
              (334.5, 1031.71), (336.5, 1032.06), (338.5, 1032.61), (340.5, 1032.53), (342.5, 1032.62), (344.5, 1032.48), (346.5, 1032.5),
              (348.5, 1032.4), (350.5, 1032.53), (352.5, 1032.28), (354.5, 1032.32), (356.5, 1032.67), (358.5, 1032.36), (360.5, 1030.78),
              (362.5, 1030.37), (364.5, 1030.83), (366.5, 1030.79), (368.5, 1030.45), (370.5, 1030.48), (372.5, 1030.43), (374.5, 1030.62),
              (376.5, 1030.63), (378.5, 1030.75), (380.5, 1030.77), (382.5, 1030.52), (384.5, 1030.4), (392.0, 1030.5), (392.0, 905.0),
              (420.0, 905.0), (420.0, 880.0), (438.0, 880.0)],
  'closing': [(392.0, 1030.5), (392.0, 905.0), (420.0, 905.0), (420.0, 880.0), (438.0, 880.0), (438.0, 833.78)],
  },
 {'key': 'monitor', 'listed': True, 'name': "the monitor: its frame's top, its left side and its right side, down into the mask",
  'ink': "the frame's outer ink: the top (y 752.9-762.2), the left side (x 915.3-920.5), the right side with its side face (x 1014.9-1017.0), the bottom-left (y 851.6-856.0, to x 951)",
  'outline': [(920.14, 762.5), (920.2, 764.5), (920.29, 766.5), (920.47, 768.5), (920.38, 770.5), (920.14, 772.5), (919.98, 774.5), (919.83, 776.5),
              (919.72, 778.5), (919.64, 780.5), (919.5, 782.5), (919.23, 784.5), (918.88, 786.5), (918.85, 788.5), (918.85, 790.5), (918.78, 792.5),
              (918.73, 794.5), (918.63, 796.5), (918.53, 798.5), (918.16, 800.5), (917.78, 802.5), (917.81, 804.5), (917.65, 806.5), (917.36, 808.5),
              (917.38, 810.5), (917.41, 812.5), (917.28, 814.5), (916.9, 816.5), (916.88, 818.5), (916.77, 820.5), (916.67, 822.5), (916.58, 824.5),
              (916.5, 826.5), (916.31, 828.5), (916.01, 830.5), (915.91, 832.5), (915.84, 834.5), (915.76, 836.5), (915.63, 838.5), (915.65, 840.5),
              (915.48, 842.5), (915.44, 844.5), (915.29, 846.5), (915.39, 848.5), (916.04, 850.5), (917.2, 851.6), (918.5, 852.14), (920.5, 852.88),
              (924.5, 853.77), (926.5, 853.78), (928.5, 853.85), (930.5, 854.14), (934.5, 854.33), (936.5, 854.88), (938.5, 855.18), (940.5, 854.75),
              (951.0, 856.0), (951.0, 812.5), (960.0, 812.5), (1014.9, 823.5), (1014.96, 822.5), (1014.96, 820.5), (1015.09, 818.5), (1015.0, 816.5),
              (1015.04, 814.5), (1015.18, 812.5), (1015.31, 810.5), (1015.5, 808.5), (1015.62, 806.5), (1015.7, 804.5), (1015.79, 802.5),
              (1015.87, 800.5), (1015.93, 798.5), (1015.78, 796.5), (1015.9, 794.5), (1015.75, 792.5), (1015.86, 790.5), (1015.79, 788.5),
              (1015.88, 786.5), (1015.81, 784.5), (1015.93, 782.5), (1015.88, 780.5), (1016.04, 778.5), (1015.96, 776.5), (1016.5, 774.5),
              (1016.5, 772.5), (1016.35, 770.5), (1016.8, 768.5), (1016.4, 766.5), (1016.69, 764.5), (1016.48, 762.5), (1017.01, 760.5),
              (1016.37, 758.5), (1016.0, 757.6), (1015.5, 756.3), (1014.5, 755.3), (1013.5, 754.3), (1012.5, 753.6), (1011.5, 753.65),
              (1009.5, 753.17), (1007.5, 753.09), (1005.5, 752.87), (1003.5, 753.06), (1001.5, 753.11), (999.5, 753.4), (997.5, 753.54),
              (995.5, 753.67), (993.5, 754.26), (991.5, 754.47), (989.5, 754.67), (987.5, 754.88), (985.5, 755.09), (983.5, 755.21), (981.5, 755.61),
              (979.5, 755.63), (977.5, 755.87), (975.5, 755.93), (973.5, 756.28), (971.5, 756.53), (969.5, 756.54), (967.5, 756.74), (965.5, 756.93),
              (963.5, 757.19), (961.5, 757.76), (959.5, 757.78), (957.5, 757.63), (955.5, 758.0), (953.5, 758.33), (951.5, 758.63), (949.5, 758.71),
              (947.5, 758.95), (945.5, 759.02), (939.5, 759.96), (937.5, 760.02), (933.5, 760.78), (931.5, 760.93), (929.5, 760.89), (925.5, 761.34),
              (923.5, 761.87), (921.0, 762.2)],
  'closing': [(951.0, 856.0), (951.0, 812.5), (960.0, 812.5), (1014.9, 823.5)],
  },
 {'key': 'toolbox', 'listed': True, 'name': "the toolbox's left end: its top-left corner, its left side and its bottom-left corner, with its lid's top edge on to the handle's left post",
  'ink': "the lid's top edge (y 1175.7-1186.0), the left side (x 886.3-888.4), the bottom edge (y 1271.2-1290.2, to x 921); at x 953 the handle's left post",
  'outline': [(953.0, 1181.3), (952.5, 1181.17), (950.5, 1180.91), (948.5, 1180.43), (946.5, 1180.12), (944.5, 1179.75), (942.5, 1179.35),
              (940.5, 1179.0), (938.5, 1178.53), (936.5, 1177.97), (934.5, 1177.66), (932.5, 1177.3), (930.5, 1176.74), (928.5, 1176.3),
              (926.5, 1175.81), (924.5, 1175.68), (922.5, 1176.12), (920.5, 1177.15), (918.5, 1177.84), (916.5, 1178.53), (914.5, 1179.17),
              (912.5, 1179.81), (910.5, 1180.68), (908.5, 1181.44), (906.5, 1182.28), (904.5, 1182.95), (902.5, 1183.58), (900.5, 1184.3),
              (898.5, 1185.18), (896.5, 1186.0), (894.5, 1186.96), (892.92, 1188.5), (891.42, 1190.5), (890.17, 1192.5), (888.87, 1194.5),
              (887.93, 1196.5), (887.3, 1198.5), (887.1, 1200.5), (887.18, 1202.5), (887.19, 1204.5), (887.19, 1206.5), (887.2, 1208.5),
              (887.2, 1210.5), (887.17, 1212.5), (886.93, 1214.5), (886.32, 1216.5), (888.01, 1218.5), (888.28, 1220.5), (888.35, 1222.5),
              (888.31, 1224.5), (888.28, 1226.5), (888.25, 1228.5), (888.23, 1230.5), (888.22, 1232.5), (888.2, 1234.5), (888.19, 1236.5),
              (888.18, 1238.5), (888.17, 1240.5), (888.15, 1242.5), (888.14, 1244.5), (888.17, 1246.5), (888.12, 1248.5), (888.1, 1250.5),
              (888.12, 1252.5), (888.11, 1254.5), (888.07, 1256.5), (888.15, 1258.5), (888.13, 1260.5), (888.15, 1262.5), (888.03, 1264.5),
              (887.87, 1266.5), (887.98, 1268.5), (888.96, 1270.5), (889.92, 1272.5), (891.5, 1274.33), (893.5, 1276.79), (895.5, 1277.75),
              (897.5, 1278.74), (899.5, 1279.69), (901.5, 1280.83), (903.5, 1281.88), (905.5, 1282.79), (907.5, 1283.77), (909.5, 1284.68),
              (911.5, 1285.52), (913.5, 1286.36), (915.5, 1287.27), (917.5, 1288.11), (919.5, 1289.21), (921.5, 1290.18), (921.0, 1290.1),
              (921.0, 1184.0), (953.0, 1184.0)],
  'closing': [(953.0, 1184.0), (921.0, 1184.0), (921.0, 1290.1)],
  },
 {'key': 'hatch', 'listed': True, 'name': "the hatch rim: its top-left corner, its top band across the gap between the toolbox's and the hatch's areas, its left arm and its near-left corner, to the picture's bottom edge",
  'ink': "the rim's outer ink: the top (y 1322.4-1323.8), the corner and the left arm (x 875.8-972.4), the near-left corner (to y 1535.0 at x 989.5), then the picture's bottom edge",
  'outline': [(1024.0, 1322.7), (976.5, 1322.7), (973.5, 1322.64), (970.5, 1322.47), (967.5, 1322.43), (964.5, 1322.41), (961.5, 1322.51),
              (958.5, 1322.62), (955.5, 1322.67), (952.5, 1322.71), (949.5, 1322.67), (946.5, 1322.71), (943.5, 1322.72), (940.5, 1322.65),
              (937.5, 1322.72), (934.5, 1322.71), (931.5, 1322.71), (928.5, 1322.74), (925.5, 1322.73), (922.5, 1322.69), (919.5, 1322.69),
              (916.5, 1322.66), (913.5, 1322.59), (910.5, 1322.51), (907.5, 1322.43), (904.5, 1322.53), (901.5, 1322.6), (898.5, 1322.64),
              (895.5, 1322.81), (892.5, 1323.01), (889.5, 1323.84), (883.5, 1326.29), (881.11, 1328.5), (879.25, 1330.5), (878.13, 1332.5),
              (877.16, 1334.5), (876.59, 1336.5), (876.22, 1338.5), (876.29, 1340.5), (876.25, 1342.5), (876.03, 1344.5), (875.78, 1346.5),
              (875.85, 1348.5), (875.9, 1350.5), (876.22, 1352.5), (876.84, 1354.5), (877.86, 1356.5), (879.08, 1358.5), (880.13, 1360.5),
              (881.3, 1362.5), (882.26, 1364.5), (883.37, 1366.5), (884.46, 1368.5), (885.72, 1370.5), (886.99, 1372.5), (888.09, 1374.5),
              (889.25, 1376.5), (890.38, 1378.5), (891.41, 1380.5), (892.76, 1382.5), (893.54, 1384.5), (894.68, 1386.5), (896.01, 1388.5),
              (897.12, 1390.5), (898.11, 1392.5), (899.22, 1394.5), (900.32, 1396.5), (901.45, 1398.5), (902.64, 1400.5), (903.79, 1402.5),
              (904.89, 1404.5), (905.98, 1406.5), (907.31, 1408.5), (909.37, 1412.5), (910.52, 1414.5), (911.78, 1416.5), (913.06, 1418.5),
              (914.08, 1420.5), (915.19, 1422.5), (916.48, 1424.5), (917.83, 1426.5), (918.91, 1428.5), (919.97, 1430.5), (920.9, 1432.5),
              (922.0, 1434.5), (923.01, 1436.5), (924.14, 1438.5), (925.36, 1440.5), (926.48, 1442.5), (927.83, 1444.5), (928.99, 1446.5),
              (930.11, 1448.5), (931.23, 1450.5), (932.41, 1452.5), (933.6, 1454.5), (934.75, 1456.5), (935.81, 1458.5), (936.93, 1460.5),
              (938.17, 1462.5), (939.26, 1464.5), (940.29, 1466.5), (941.18, 1468.5), (942.29, 1470.5), (943.28, 1472.5), (944.36, 1474.5),
              (945.6, 1476.5), (946.85, 1478.5), (947.95, 1480.5), (949.0, 1482.5), (950.26, 1484.5), (951.5, 1486.5), (952.63, 1488.5),
              (953.76, 1490.5), (954.94, 1492.5), (956.27, 1494.5), (957.31, 1496.5), (958.61, 1498.5), (959.76, 1500.5), (960.88, 1502.5),
              (962.04, 1504.5), (963.27, 1506.5), (964.58, 1508.5), (965.71, 1510.5), (966.77, 1512.5), (967.83, 1514.5), (970.12, 1518.5),
              (971.26, 1520.5), (972.37, 1522.5), (973.5, 1524.85), (974.5, 1525.68), (975.5, 1526.17), (977.5, 1527.5), (978.5, 1528.5),
              (979.5, 1529.6), (980.5, 1530.13), (981.5, 1531.15), (982.5, 1531.83), (983.5, 1532.56), (984.5, 1533.05), (985.5, 1533.71),
              (986.5, 1534.12), (987.5, 1534.69), (988.5, 1534.83), (989.5, 1535.0), (990.5, 1536.0), (1024.0, 1536.0), (1024.0, 1505.0),
              (1009.0, 1505.0), (1005.0, 1499.0), (1001.0, 1493.0), (997.0, 1487.0), (993.0, 1481.0), (989.0, 1475.0), (985.0, 1469.0),
              (981.0, 1463.0), (978.0, 1457.0), (974.0, 1451.0), (970.0, 1445.0), (966.0, 1439.0), (962.0, 1433.0), (958.0, 1427.0), (954.0, 1421.0),
              (950.0, 1415.0), (946.0, 1409.0), (942.0, 1403.0), (938.0, 1397.0), (934.0, 1391.0), (930.0, 1385.0), (927.0, 1379.0), (923.0, 1373.0),
              (919.0, 1367.0), (915.0, 1361.0), (915.0, 1355.0), (915.0, 1349.0), (915.0, 1343.0), (915.0, 1339.0), (1024.0, 1339.0)],
  'closing': [(1024.0, 1536.0), (1024.0, 1505.0), (1009.0, 1505.0), (1005.0, 1499.0), (1001.0, 1493.0), (997.0, 1487.0), (993.0, 1481.0),
              (989.0, 1475.0), (985.0, 1469.0), (981.0, 1463.0), (978.0, 1457.0), (974.0, 1451.0), (970.0, 1445.0), (966.0, 1439.0), (962.0, 1433.0),
              (958.0, 1427.0), (954.0, 1421.0), (950.0, 1415.0), (946.0, 1409.0), (942.0, 1403.0), (938.0, 1397.0), (934.0, 1391.0), (930.0, 1385.0),
              (927.0, 1379.0), (923.0, 1373.0), (919.0, 1367.0), (915.0, 1361.0), (915.0, 1355.0), (915.0, 1349.0), (915.0, 1343.0), (915.0, 1339.0),
              (1024.0, 1339.0), (1024.0, 1322.7)],
  },
 {'key': 'handle', 'listed': False, 'name': "the toolbox's handle: its grip, which lay wholly above the mask, and the tops of its posts",
  'ink': "the grip's outer ink (y 1165.4-1174.6) and the posts' outer ink (x 952.7-954.0 and 1012.5-1016.8); the floor seen through the handle stays RA-C-1's",
  'outline': [(953.0, 1184.0), (952.67, 1179.5), (952.78, 1178.5), (952.84, 1177.5), (953.02, 1176.5), (953.14, 1175.5), (953.29, 1174.5),
              (953.6, 1173.5), (954.02, 1172.5), (954.5, 1171.78), (956.5, 1168.73), (958.5, 1167.14), (960.5, 1166.33), (962.5, 1165.6),
              (964.5, 1165.39), (966.5, 1165.41), (968.5, 1165.67), (970.5, 1165.87), (972.5, 1166.2), (974.5, 1166.72), (976.5, 1167.0),
              (978.5, 1167.4), (980.5, 1167.8), (982.5, 1168.1), (984.5, 1168.35), (986.5, 1168.7), (988.5, 1169.09), (990.5, 1169.28),
              (992.5, 1169.72), (994.5, 1170.11), (996.5, 1170.41), (998.5, 1170.86), (1000.5, 1171.03), (1002.5, 1171.24), (1004.5, 1171.83),
              (1006.5, 1172.25), (1008.5, 1172.83), (1010.5, 1173.42), (1012.5, 1174.59), (1013.57, 1175.5), (1014.27, 1176.5), (1014.94, 1177.5),
              (1015.41, 1178.5), (1015.8, 1179.5), (1016.1, 1180.5), (1016.36, 1181.5), (1016.61, 1182.5), (1016.77, 1183.5), (1016.8, 1184.0)],
  'closing': [(1016.8, 1184.0), (953.0, 1184.0)],
  'holes': [[(958.0, 1173.5), (960.0, 1171.4), (962.0, 1171.4), (964.0, 1171.1), (966.0, 1172.0), (968.0, 1172.2), (970.0, 1172.3), (972.0, 1172.6),
             (974.0, 1173.1), (976.0, 1173.2), (978.0, 1174.0), (980.0, 1174.1), (982.0, 1174.3), (984.0, 1175.0), (986.0, 1175.2), (988.0, 1176.3),
             (990.0, 1176.5), (991.0, 1177.0), (967.0, 1177.0), (966.5, 1176.0), (958.0, 1176.0)]],
  },
]
LEFT_ALONE = [{'what': "the contact shadows under the crates and the toolbox, and the monitor's shadow on the wall below and beside it", 'why': "shadows, not pieces (the Lead, for B: leave the contact shadows)"},
              {'what': 'the floor seen through the handle', 'why': "it stays RA-C-1's, as the deck seen through B's toolbox handle stayed RA-B-2's"},
              {'what': "RA-C-1's vent box above the monitor's top, x 941-1011, y 746-757", 'why': "RA-C-1's wall, outside the monitor's outline: the raw's wall there is not taken (nothing else from the raw), so the vent box's top edge still shows above the monitor's top, a light strip 2 to 8 px tall, 338 px that differ visibly from the raw. For the Lead's decision"},
              {'what': "the raw's wall left of the lower crate (its dark band at y 982-1000) and RA-C-1's wall rail", 'why': "RA-C-1's wall stays; the outline runs along the crate's own ink"}]

def sdist(poly, X, Y):   # signed distance from the points to the polygon's outline: + inside, - outside (even-odd)
    P = np.array(poly, float); A, B = P, np.roll(P, -1, axis=0)
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    d = np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
    cross = ((ay <= py) & (by > py)) | ((by <= py) & (ay > py))
    xint = ax + (py - ay) * dx / np.where(dy == 0, 1, dy)
    inside = (cross & (px < xint)).sum(axis=-1) % 2 == 1
    return np.where(inside, d, -d)
def segdist(path, X, Y):   # unsigned distance from the points to an open polyline
    P = np.array(path, float); A, B = P[:-1], P[1:]
    px, py = X[..., None], Y[..., None]; ax, ay, bx, by = A[:, 0], A[:, 1], B[:, 0], B[:, 1]; dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy)).min(axis=-1)
FEATHER = 1.0   # px: alpha 1 inside the outline, falling to 0 over 1 px outside it
alpha = np.zeros((H, W)); per = {}; boxes = {}
for p in PIECES:
    xs = [q[0] for q in p['outline']]; ys = [q[1] for q in p['outline']]
    x0, x1, y0, y1 = max(0, int(min(xs)) - 2), min(W, int(max(xs)) + 3), max(0, int(min(ys)) - 2), min(H, int(max(ys)) + 3)
    X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    d = sdist(p['outline'], X, Y)
    for h in p.get('holes', []): d = np.minimum(d, -sdist(h, X, Y))
    a = np.zeros((H, W)); a[y0:y1, x0:x1] = np.clip(1 + d / FEATHER, 0, 1); per[p['key']] = a; boxes[p['key']] = (x0, y0, x1, y1); alpha = np.maximum(alpha, a)
done = np.rint(kept * (1 - alpha[..., None]) + raw * alpha[..., None]).astype(np.uint8)

# ---- checks on the completions
changedC = (done != kept).any(axis=2); touched = alpha > 0
changedOutsideCompletions = int((changedC & ~touched).sum())
fullRaw = alpha == 1; rawWhereFull = bool((done[fullRaw] == raw[fullRaw]).all())
pieceChecks = {}
for p in PIECES:
    a = per[p['key']]; c = changedC & (a > 0); ys, xs = np.nonzero(c)
    # along the closing path (the part of the outline that is not ink), on its outer side and in its feather (alpha under 1), RA-C-2
    # must already equal the raw, so the join cannot show
    cl = [q for q in p['closing']]
    segs = [(q0, q1) for q0, q1 in zip(cl[:-1], cl[1:]) if not ((q0[0] >= W and q1[0] >= W) or (q0[1] >= H and q1[1] >= H))]
    x0, y0, x1, y1 = boxes[p['key']]; X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    near = np.zeros((H, W), bool)
    for q0, q1 in segs: near[y0:y1, x0:x1] |= segdist([q0, q1], X, Y) <= 1.5
    diff = np.abs(kept.astype(int) - raw.astype(int)).max(axis=2)
    closingDiffer = int((near & (a < 1) & (diff > 0)).sum())
    ux, uy = np.nonzero(~place[y0:y1, x0:x1])[1] + x0 + 0.5, np.nonzero(~place[y0:y1, x0:x1])[0] + y0 + 0.5
    samples = np.array([(q0[0] + s * (q1[0] - q0[0]), q0[1] + s * (q1[1] - q0[1])) for q0, q1 in segs for s in np.linspace(0, 1, max(2, int(np.hypot(q1[0] - q0[0], q1[1] - q0[1]) / 0.5)))])
    depth = float(np.sqrt((samples[:, 0, None] - ux[None]) ** 2 + (samples[:, 1, None] - uy[None]) ** 2).min()) if len(ux) else None
    pieceChecks[p['key']] = {'changedPx': int(c.sum()), 'changedOutsideTheMask': int((c & ~place).sum()), 'changedInsideTheMask': int((c & place).sum()),
                             'changedBox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if c.any() else None,
                             'featherPx': int(((a > 0) & (a < 1)).sum()), 'closingPathPx': int((near & (a < 1)).sum()), 'closingPathPxWhereRA-C-2DiffersFromTheRaw': closingDiffer,
                             'closingPathMinDepthPx': round(depth, 2) if depth is not None else None}
overlap = int((sum((per[p['key']] > 0).astype(int) for p in PIECES) > 1).sum())
if changedOutsideCompletions or not rawWhereFull: sys.exit(f'STOP: {changedOutsideCompletions} px changed outside the completions, or the raw is not taken whole inside them')
if any(v['closingPathPxWhereRA-C-2DiffersFromTheRaw'] for v in pieceChecks.values()): sys.exit('STOP: a closing path runs where RA-C-2 differs from the raw: ' + json.dumps({k: v['closingPathPxWhereRA-C-2DiffersFromTheRaw'] for k, v in pieceChecks.items()}))
listedKeys = [p['key'] for p in PIECES if p['listed']]
changedListed = int((changedC & (sum(per[k] for k in listedKeys) > 0)).sum())

# ---- the screen: the monitor's painted screen (mid grey in the raw) filled with flat black, keeping its bezel. The screen is the
# 4-connected run of pixels at luminance 50 or more (Pillow's 'L') from its centre, bounded by the bezel's inner ink (lower thresholds
# run out through a weak spot in that ink into the frame), plus the one ring of pixels touching it, all darker than 50 (the anti-aliased
# step into the ink), so the black meets the ink with no grey line between
SEED, FILL_T, FILL = (961, 805), 50, (0, 0, 0)
lum = np.array(Image.fromarray(done).convert('L')).astype(int)
scr = np.zeros((H, W), bool); q = deque([SEED[::-1]]); scr[SEED[1], SEED[0]] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        v, u = y + dy, x + dx
        if 0 <= v < H and 0 <= u < W and not scr[v, u] and lum[v, u] >= FILL_T: scr[v, u] = True; q.append((v, u))
ring = np.zeros_like(scr); ring[1:] |= scr[:-1]; ring[:-1] |= scr[1:]; ring[:, 1:] |= scr[:, :-1]; ring[:, :-1] |= scr[:, 1:]; ring &= ~scr
fill = scr | ring
fy, fx = np.nonzero(fill); fillBox = [int(fx.min()), int(fy.min()), int(fx.max()) + 1, int(fy.max()) + 1]
if not (fillBox[0] >= 920 and fillBox[2] <= 1004 and fillBox[1] >= 760 and fillBox[3] <= 852): sys.exit(f'STOP: the screen fill ran out of the bezel: {fillBox}')
if int((lum[ring] >= FILL_T).sum()): sys.exit('STOP: the ring holds a pixel as light as the screen')
out = done.copy(); out[fill] = FILL
changedF = (out != done).any(axis=2)
changed = (out != kept).any(axis=2)
changedOutside = int((changed & ~touched & ~fill).sum())
if changedOutside: sys.exit(f'STOP: {changedOutside} px changed outside the completions and the screen')

# ---- the screen region: fitted to the black in RA-C-2c
spec = importlib.util.spec_from_file_location('cc', os.path.join(D, '..', 'sheet', 'colour-check-ra1.py')); CC = importlib.util.module_from_spec(spec); spec.loader.exec_module(CC)
Lk = CC.oklch(out)[0]; T = 0.12
def crossings(seed, side):   # the edge where the lightness crosses T, scanning outward from the seed box's side, every 2 px
    x0, y0, x1, y1 = seed; pts = []
    if side in ('left', 'right'):
        for y in range(y0 + 2, y1 - 1, 2):
            x = x0 if side == 'left' else x1; step = -1 if side == 'left' else 1
            while Lk[y, x] < T and abs(x - (x0 if side == 'left' else x1)) < 30: x += step
            xin = x - step; l0, l1 = Lk[y, xin], Lk[y, x]; f = (T - l0) / (l1 - l0)
            pts.append(((xin + 0.5) + step * f, y + 0.5))
    else:
        for x in range(x0 + 2, x1 - 1, 2):
            y = y0 if side == 'top' else y1; step = -1 if side == 'top' else 1
            while Lk[y, x] < T and abs(y - (y0 if side == 'top' else y1)) < 30: y += step
            yin = y - step; l0, l1 = Lk[yin, x], Lk[y, x]; f = (T - l0) / (l1 - l0)
            pts.append((x + 0.5, (yin + 0.5) + step * f))
    return pts
def fitline(pts, vertical):   # least squares, x = a + b y for the sides, y = a + b x for the top and bottom; outliers over 1.5 px dropped once
    P = np.array(pts); u, v = (P[:, 1], P[:, 0]) if vertical else (P[:, 0], P[:, 1])
    b, a = np.polyfit(u, v, 1); r = np.abs(v - (a + b * u)); keep = r <= 1.5
    if keep.sum() < len(r): b, a = np.polyfit(u[keep], v[keep], 1); r = np.abs(v - (a + b * u))
    return {'a': float(a), 'b': float(b), 'points': int(keep.sum()), 'dropped': int((~keep).sum()), 'rmsPx': round(float(np.sqrt(np.mean(r[keep] ** 2))), 3)}
def meet(vl, hl):   # x = a1 + b1 y and y = a2 + b2 x
    y = (hl['a'] + hl['b'] * vl['a']) / (1 - hl['b'] * vl['b']); return [round(vl['a'] + vl['b'] * y, 2), round(y, 2)]
smap = np.array(Image.open(os.path.join(D, 'ra-C-regions.png')).convert('RGB')).astype(int)
emap = np.array(Image.open(os.path.join(D, 'ra-C-empty-regions.png')).convert('RGB')).astype(int)
isc = lambda a, c: np.abs(a - np.array(c)).max(axis=2) <= 8
mapScreen = isc(smap, (255, 0, 255)) & ~isc(emap, (255, 0, 255))
SEEDBOX = (936, 776, 988, 838)
lines = {s: fitline(crossings(SEEDBOX, s), s in ('left', 'right')) for s in ('left', 'top', 'right', 'bottom')}
quad = [meet(lines['left'], lines['top']), meet(lines['right'], lines['top']), meet(lines['right'], lines['bottom']), meet(lines['left'], lines['bottom'])]
qx = [c[0] for c in quad]; qy = [c[1] for c in quad]; x0, x1, y0, y1 = int(min(qx)) - 1, int(max(qx)) + 2, int(min(qy)) - 1, int(max(qy)) + 2
X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5); inq = np.zeros((H, W), bool); inq[y0:y1, x0:x1] = sdist(quad, X, Y) > 0
l = Lk[inq]; p95 = round(float(np.percentile(l, 95)), 4)
my, mx = np.nonzero(mapScreen)
screens = [{'name': 'screen', 'corners': quad, 'cornerOrder': 'top-left, top-right, bottom-right, bottom-left',
            'box': [round(min(qx), 2), round(min(qy), 2), round(max(qx), 2), round(max(qy), 2)], 'size': [round(max(qx) - min(qx), 1), round(max(qy) - min(qy), 1)],
            'px': int(inq.sum()), 'p95L': p95, 'maxL': round(float(l.max()), 4), 'medianL': round(float(np.median(l)), 4), 'pass': p95 < T,
            'blackPxInside': int((inq & fill).sum()), 'blackPxOutside': int((fill & ~inq).sum()),
            'edges': {s: {**v, 'form': 'x = a + b y' if s in ('left', 'right') else 'y = a + b x'} for s, v in lines.items()},
            'map': {'box': [int(mx.min()), int(my.min()), int(mx.max()) + 1, int(my.max()) + 1], 'px': int(mapScreen.sum())}}]
if not all(s['pass'] for s in screens): sys.exit('STOP: the fitted screen fails the flat-black gate: ' + ', '.join(f"{s['name']} p95 {s['p95L']}" for s in screens))

Image.fromarray(out).save(os.path.join(D, 'ra-C-2c.png'), optimize=True)
J = lambda o, f: (json.dump(o, open(os.path.join(D, f), 'w'), indent=1), open(os.path.join(D, f), 'a').write('\n'))
plate = {'file': 'ra-C-2c.png', 'sha256': fsha(os.path.join(D, 'ra-C-2c.png')), 'pixelsSha256': psha(out), 'size': [W, H], 'aiGenerated': True, 'codeComposite': True, 'codeFill': True}
src = lambda k, what: {'name': k, 'file': IN[k][0], 'sha256': IN[k][1], 'aiGenerated': True, 'what': what}
J({'view': 'C', 'what': "view C's monitor screen, fitted to the black filled into the painted screen in RA-C-2c, for the live monitor", 'date': '2026-11-27',
   'picture': {'name': 'RA-C-2c', **plate}, 'gate': 'flat black, as the colour check gates an opening (colour-check-ra1.py): 95% of the region under OKLCH lightness 0.12',
   'fill': {'what': "the monitor's painted screen, mid grey in the raw, filled with flat black in code, keeping its bezel", 'colour': list(FILL), 'seed': list(SEED),
            'how': f"the 4-connected pixels at luminance {FILL_T} or more (Pillow's 'L') from the seed, bounded by the bezel's inner ink, plus the one ring of pixels touching them (all darker than {FILL_T})",
            'px': int(fill.sum()), 'box': fillBox, 'screenPx': int(scr.sum()), 'ringPx': int(ring.sum())},
   'method': "along each side, scanning out from inside the black every 2 px, the edge where the OKLCH lightness crosses 0.12 (between pixel centres, linear); a straight line fitted through each side's points (least squares, points more than 1.5 px off dropped once); the corners where the lines meet. The region is the pixels whose centres lie inside the corners' outline.",
   'seedBox': list(SEEDBOX), 'screens': screens, 'map': "the step-2 map's screen (ra-C-regions.png, magenta), for comparison: the painted screen is not where the map draws it",
   'units': 'painting pixels (1024 x 1536); a pixel spans i to i + 1, so corners are in pixel-edge coordinates'}, 'screens-C.json')
J({'sheet': 'RA-C', 'version': 3, 'view': 'C', 'step': 2, 'date': '2026-11-27', 'name': 'RA-C-2c',
   'what': "view C's step-2 picture completed in code: RA-C-2 with RA-C-2's raw edit taken back inside each cut piece's own ink outline, and the monitor's screen filled with flat black",
   'drawnBy': 'code', 'generated': False, 'codeComposite': {'of': ['RA-C-1', "RA-C-2's raw edit"], 'aiGenerated': True,
   'how': "RA-C-2 (the keep of RA-C-2's raw over RA-C-1 in the step-2 mask, rebuilt here and equal pixel for pixel) is the base; inside each traced outline, the raw's pixels, with 1 px of feather outside the outline; nothing else from the raw"},
   'codeFill': {'what': "the monitor's painted screen filled with flat black, keeping its bezel", 'px': int(fill.sum()), 'colour': list(FILL), 'file': 'screens-C.json'},
   'decision': "the Lead, 27 November 2026, 19:08: RA-C-2 held for the same cut edges as B; make RA-C-2c, a code composite, with the screen filled black and fitted",
   'sources': [src('RA-C-2', "the kept step 2 (the base)"), src('RA-C-2-raw', "RA-C-2's raw edit (inside the outlines)"), src('RA-C-1', "view C's accepted step 1 (in RA-C-2, outside the mask)")],
   'mask': {'file': 'ra-C-place.png', 'sha256': fsha(os.path.join(D, 'ra-C-place.png')), 'what': "version 2.1's step-2 PLACE mask"},
   'feather': {'px': FEATHER, 'how': 'alpha = 1 inside the outline, falling linearly to 0 at 1 px outside it, by each pixel centre\'s distance from the outline'},
   'tracing': "on the raw, along scan lines across each ink line every 2 px (3 px on the hatch's top), at the midpoint between the ink's value and the value just outside it, linear between pixel centres; readings on bolts, seams or a wall's dark band dropped and the line taken straight across",
   'pieces': [{k: v for k, v in p.items() if k != 'key'} | {'key': p['key'], 'checks': pieceChecks[p['key']]} for p in PIECES],
   'leftAlone': LEFT_ALONE,
   'checks': {'keepRebuiltExactly': keepIsExact, 'changedPx': int(changed.sum()), 'changedByTheCompletions': int(changedC.sum()), 'changedInTheListedFour': changedListed,
              'changedByTheScreenFill': int((changedF & ~changedC).sum()), 'screenFillPx': int(fill.sum()),
              'changedOutsideTheCompletionsAndTheScreen': changedOutside, 'rawTakenWholeInsideTheOutlines': rawWhereFull, 'overlappingPx': overlap,
              'closingPathsWhereRA-C-2DiffersFromTheRaw': sum(v['closingPathPxWhereRA-C-2DiffersFromTheRaw'] for v in pieceChecks.values()),
              'keepBlendReachesPxInsideTheMask': 5, 'closingPathMinDepthPx': min(v['closingPathMinDepthPx'] for v in pieceChecks.values() if v['closingPathMinDepthPx'] is not None)},
   'pass': changedOutside == 0 and rawWhereFull and keepIsExact,
   'screens': {'file': 'screens-C.json', 'sha256': None, 'gate': {s['name']: {'p95L': s['p95L'], 'pass': s['pass']} for s in screens}},
   'outputs': {'ra-C-2c.png': {'what': 'the plate: RA-C-2c, a code composite of two AI-generated pictures with a code fill', **{k: v for k, v in plate.items() if k != 'file'}}},
   'note': "pixelsSha256 is of the decoded pixels (8-bit RGB, row by row), which another Pillow writes the same; the PNG file's own sha256 may differ with another Pillow or zlib",
   'units': 'painting pixels (1024 x 1536); outlines in pixel-edge coordinates (a pixel spans i to i + 1)'}, 'composite-C2.json')
R = json.load(open(os.path.join(D, 'composite-C2.json'))); R['screens']['sha256'] = fsha(os.path.join(D, 'screens-C.json')); J(R, 'composite-C2.json')
print('RA-C-2c:', plate['pixelsSha256'][:16], '| changed', int(changed.sum()), 'px: completions', int(changedC.sum()), '+ screen fill', int((changedF & ~changedC).sum()), '| outside both', changedOutside)
print('per piece', {k: (v['changedPx'], v['closingPathMinDepthPx'], v['closingPathPxWhereRA-C-2DiffersFromTheRaw']) for k, v in pieceChecks.items()})
print('fill', int(fill.sum()), 'px, box', fillBox, '(screen', int(scr.sum()), '+ ring', int(ring.sum()), ')')
for s in screens: print(f"{s['name']}: corners {s['corners']} | {s['px']} px, p95 L {s['p95L']}, max {s['maxL']} | black inside {s['blackPxInside']}, outside {s['blackPxOutside']} | map box {s['map']['box']}")
