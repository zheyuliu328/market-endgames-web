"""Select original CC BY 4.0 publisher price ticks without creating quotes or UTC.

Input: exact published ZIP. No network requests, interpolation or performance search.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
import argparse, csv, io, json, hashlib, zipfile

p = argparse.ArgumentParser()
p.add_argument('archive', type=Path)
a = p.parse_args()
root = Path(__file__).resolve().parents[1]
member = 'Tickdata_download_210907_to_220309/eurusd_09032022.txt'
archive = a.archive.read_bytes()
assert hashlib.sha256(archive).hexdigest() == 'f70ea586c4ea33453df4c3d56120bd96407a36fe402833ea9b0246dc5e07f41f'
assert hashlib.md5(archive).hexdigest() == '1140da1177f22a9c6d13a3c4d6a23ba2'
with zipfile.ZipFile(a.archive) as z:
    raw = z.read(member)
assert hashlib.sha256(raw).hexdigest() == '42639a0b82f059512c9b39a772f1c0c3b9c30bd87ee13c5575cf3400b56f6d89'
context_rows, rows, records = [], [], []
for ordinal, d in enumerate(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))), 1):
    if d['Date'] != '03/07/2022' or not '13:50:00' <= d['Time'] <= '14:30:00':
        continue
    assert len({d[k] for k in ['Open', 'High', 'Low', 'Close']}) == 1
    price = Decimal(d['Close'])
    ticks = price * 100000
    assert price.is_finite() and ticks > 0 and ticks == ticks.to_integral_value()
    dt = datetime.strptime(d['Date'] + ' ' + d['Time'], '%m/%d/%Y %H:%M:%S')
    # UTC is only a numeric chart coordinate here, not the source timezone.
    coordinate = int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
    row = [coordinate, int(ticks), ordinal, None, dt.isoformat(), d['Close']]
    destination = rows if d['Time'] >= '14:00:00' else context_rows
    assert not destination or (row[0] > destination[-1][0] and ordinal == destination[-1][2] + 1)
    destination.append(row)
    records.append({'id': ordinal, 'sourceCsvLine': ordinal + 1, 'sourceDateLiteral': d['Date'], 'sourceTimeLiteral': d['Time'], 'originalFields': d})
assert len(rows) == 714 and len(context_rows) == 238
assert context_rows[-1][2] + 1 == rows[0][2] and context_rows[-1][0] < rows[0][0]
instrument = {'symbol': 'EURUSD', 'base': 'EUR', 'quote': 'USD', 'venue': 'INFINITECH/JRC publication', 'name': 'Euro / US dollar source-price exercise', 'priceScale': 100000, 'quantityScale': 1, 'cashScale': 100}
schema = ['sourceClockMs', 'observedPriceTicks', 'sourceDataRowOrdinal', 'unusedVolume', 'sourceClockLiteral', 'originalPriceLiteral']
def digest(values):
    return hashlib.sha256(json.dumps(values, separators=(',', ':')).encode()).hexdigest()
attribution = 'Georgios Fatouros (INNOV ACTS LTD) and Konstantina Tripodi (JRC Capital Management Consultancy & Research GmbH), High frequency (tick data) of historical FOREX prices, version 1.0.1, DOI 10.5281/zenodo.7411148, CC BY 4.0. Selected window/context and exact integer price encoding by Market Endgames; fictional accounts/execution added. No author endorsement.'
package = {'marketDataKind': 'price', 'frequency': 'tick', 'instrument': instrument, 'schema': schema, 'rows': rows, 'context': {'marketDataKind': 'price', 'instrument': instrument, 'schema': schema, 'rows': context_rows, 'normalizedRowsSha256': digest(context_rows), 'source': 'Same original published EURUSD price records; chart context only'}, 'marketRecords': records, 'source': 'INFINITECH/JRC published EURUSD original single-price ticks', 'sourceUrl': 'https://zenodo.org/records/7411148', 'sourceRequestUrl': 'https://zenodo.org/api/records/7411078/files/Tickdata_download_210907_to_220309.zip/content', 'sourceSha256': hashlib.sha256(archive).hexdigest(), 'sourceMemberSha256': hashlib.sha256(raw).hexdigest(), 'sourceArchive': member, 'selectedWindowSourceClock': '2022-03-07 14:00:00 to 14:30:00, source timezone unreported', 'normalizedRowsSha256': digest(rows), 'sampling': 'All 714 original single-price observations in the declared source-clock window; all 238 preceding observations for chart context only. No interpolation, resampling or reconstructed bid/ask/volume.', 'timestampSemantics': 'floating source-clock coordinate; timezone and bid/ask side unreported', 'transformation': 'Original five-decimal USD-per-EUR prices encoded exactly at 1e5. Original MM/DD/YYYY source clock mapped to a floating numeric chart coordinate, not UTC. Source ordinals and original fields retained; Up/Down are not treated as traded volume.', 'rights': {'source': 'INFINITECH/JRC publication', 'terms': 'https://creativecommons.org/licenses/by/4.0/', 'attribution': attribution}, 'limitations': ['Original publisher numerical compilation under its primary CC BY 4.0 grant; the originating API feed is not identified and full underlying vendor-rights certification is not claimed.', 'Source timezone, quote side and executable status are unreported. Do not align these coordinates with UTC or timed news, or label values bid/ask.', 'Orders, capacity, routing, zero fees and cash settlement are fictional. No executable spread, queue, brokerage financing or real trading return is modeled.', 'The original EURUSD member omits the entire February 2022 period; the initially requested February 24 window is not available. Missing records are not interpolated.']}
initial = int((Decimal(rows[0][5]) * 100000 / Decimal('0.8') * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
target = int((Decimal(initial) * Decimal('0.9')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
rules = {'marketDataKind': 'price', 'initialUnits': 100000, 'initialEquity': initial, 'targetUnits': 10000, 'targetEquity': target, 'feeBps': 0, 'slippageBps': 0, 'maxLeverage': 1, 'maintenanceBps': 2500, 'participationBps': None, 'referenceFillUnits': 10000, 'sellLagObservations': 0, 'lotSizeUnits': 1000, 'maxOrderUnits': 200000, 'priceScale': 100000, 'quantityScale': 1, 'cashScale': 100, 'baseAsset': 'EUR', 'quoteAsset': 'USD'}
chapter = {'id': 'jrc-20220307-eurusd', 'file': 'jrc-20220307-eurusd.json', 'title': 'Euro: Keep an Exit Open', 'date': '2022-03-07', 'rows': len(rows), 'instrument': instrument, 'rules': rules, 'displaySymbol': 'EUR / USD', 'clockLabel': 'Historical source clock · timezone unreported', 'clockZoneLabel': 'source clock', 'timedSpeed': 12, 'timedRouteDelayMs': 6000, 'brief': f'Take over EUR 100,000 with USD {initial/100:,.2f} equity. Reduce to at most EUR 10,000 and keep USD {target/100:,.2f} by the last retained source tick, 14:29:58. Actual original price ticks drive a fictional funded currency exposure. Source timezone and quote side are unreported. Timed mode runs at 12x with 6 historical seconds of simulated routing; no manual pause.'}
out = root / 'dist/data'
(out / chapter['file']).write_text(json.dumps(package, indent=2) + '\n')
(out / 'JRC-CC-BY-NOTICE.txt').write_text(attribution + '\nDataset: https://zenodo.org/records/7411148\nOriginal file version: https://zenodo.org/records/7411078\nLicense: https://creativecommons.org/licenses/by/4.0/\nAuthor publication index: https://innov-acts.com/publications/\nChanges and residual limits are stated in the numerical package and player report. No licence for other providers, files or executable broker quotes is inferred.\n')
catalog = json.loads((out / 'chapters.json').read_text())
(out / 'chapters.json').write_text(json.dumps([c for c in catalog if c['id'] != chapter['id']] + [chapter], indent=2) + '\n')
print(json.dumps({'id': chapter['id'], 'rows': len(rows), 'context': len(context_rows), 'initialEquityUSD': initial/100, 'targetEquityUSD': target/100, 'normalizedRowsSha256': digest(rows)}, indent=2))
