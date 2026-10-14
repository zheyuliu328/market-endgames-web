"""Independent Decimal reconciliation of an actual downloaded quote-challenge report."""
import argparse, datetime, decimal, json, re
from pathlib import Path
D = decimal.Decimal
CENT = D('0.01')
p = argparse.ArgumentParser()
p.add_argument('report', type=Path)
p.add_argument('package', type=Path)
a = p.parse_args()
text = a.report.read_text()
package = json.loads(a.package.read_text())
assert package['sourceSha256'] in text and package['normalizedRowsSha256'] in text
assert package['marketDataKind'] == 'quote'
rows = {r[2]: r for r in package['rows']}
opening = re.search(r'Starting cash/borrowing: \$([\d,]+\.\d{2})', text)
initial_units = D(re.search(r'starting position: ([\d.]+)', text)[1])
initial_cash = D(opening[1].replace(',', ''))
results = []
for prefix in ('ORIGINAL', 'REVISED'):
    if prefix + ' FILLS\n' not in text:
        continue
    cash, held, fills = initial_cash, initial_units, 0
    section = text.split(prefix + ' FILLS\n', 1)[1].split('\n\n', 1)[0]
    for line in section.splitlines()[1:]:
        if not line.strip():
            continue
        time, trade_id, order_id, side, qty, observed, executed, fee, stated_cash = line.split(' | ')
        row = rows[int(trade_id)]
        expected_time = datetime.datetime.fromtimestamp(row[0] // 1000, datetime.timezone.utc).replace(microsecond=(row[0] % 1000) * 1000).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
        assert time == expected_time
        expected = D(row[4] if side == 'buy' else row[1]) / D(package['instrument']['priceScale'])
        assert D(observed) == expected == D(executed), 'Export price differs from admitted source'
        gross = (D(qty) * D(executed)).quantize(CENT, rounding=decimal.ROUND_HALF_UP)
        cash += (-gross if side == 'buy' else gross) - D(fee)
        held += D(qty) if side == 'buy' else -D(qty)
        assert D(stated_cash) == cash
        fills += 1
    section = text.split(prefix + ' RESULT', 1)[1].split('\n\n', 1)[0]
    stated = re.search(r'Equity \$([\d,]+\.\d{2}) = cash \$([\d,]+\.\d{2}) \+ marked position \$([\d,]+\.\d{2})', section)
    values = [D(s.replace(',', '')) for s in stated.groups()]
    mark = D(package['rows'][-1][1]) / D(package['instrument']['priceScale'])
    marked = (mark * held).quantize(CENT, rounding=decimal.ROUND_HALF_UP)
    assert values == [cash + marked, cash, marked], 'Closing bridge does not reconcile'
    results.append({'path': prefix.lower(), 'fills': fills, 'cash': str(cash), 'position': str(held), 'equity': str(cash + marked)})
assert results
print(json.dumps({'status': 'passed', 'method': 'Independent Decimal per-fill cash and actual source row reconciliation', 'results': results}, indent=2))
