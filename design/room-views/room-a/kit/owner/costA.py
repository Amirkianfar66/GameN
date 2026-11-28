# View A owner page's figures for the question (the Lead, 14:59 on 19 November: "exact figures from the image session's records"):
# Room A's pictures as the image session's records give them (each record's cost_usd_est and its roomARunningTotal), read from
# _records/records/RA-A-<n>.json (the records page, version 1795096800-0c3e), and views B to E at their average: 9 pictures planned
# (the empty room and the furniture in each of B, C, D and E, and the food unit in view D) and at most 15 with re-runs. Writes
# cost-A.json. Usage: python3 -I costA.py
import json, os
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(D, '_records', 'records')
pics = [json.load(open(os.path.join(R, f'RA-A-{n}.json'))) for n in range(1, 7)]
for n, p in enumerate(pics, 1):
    if p['roomARunningTotal']['images'] != n: raise SystemExit(f'RA-A-{n}: the running total counts {p["roomARunningTotal"]["images"]} pictures')
total = pics[-1]['roomARunningTotal']['usd']
if abs(total - sum(p['cost_usd_est'] for p in pics)) > 0.0002: raise SystemExit('the running total is not the sum of the estimates')
avg = total / len(pics); PLANNED, MOST = 9, 15
c = {'pictures': [{'name': f'RA-A-{n}', 'usd': f"{p['cost_usd_est']:.4f}", 'result': (p.get('review') or {}).get('result')} for n, p in enumerate(pics, 1)],
     'used': len(pics), 'usedExact': f'{total:.4f}', 'usedUsd': f'{total:.2f}', 'averageUsd': f'{avg:.4f}',
     'planned': PLANNED, 'plannedExact': f'{PLANNED * avg:.4f}', 'plannedUsd': f'{PLANNED * avg:.2f}', 'most': MOST, 'mostExact': f'{MOST * avg:.4f}', 'mostUsd': f'{MOST * avg:.2f}',
     'source': "the image session's records, version 1795096800-0c3e: each record's cost_usd_est and roomARunningTotal"}
json.dump(c, open(os.path.join(D, 'cost-A.json'), 'w'), indent=1); print(json.dumps({k: v for k, v in c.items() if k != 'pictures'}))
