"""Build an attributed five-minute AEMO clearing-price challenge from its public ZIP.

The output is finalized settlement history, never reconstructed executable quotes.
Pass the original ZIP path; this builder performs no network requests or curve fitting.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
import argparse, csv, io, json, hashlib, zipfile

p = argparse.ArgumentParser()
p.add_argument('archive', type=Path)
a = p.parse_args()
root = Path(__file__).resolve().parents[1]
url = 'https://nemweb.com.au/Data_Archive/Wholesale_Electricity/MMSDM/2022/MMSDM_2022_06/MMSDM_Historical_Data_SQLLoader/DATA/PUBLIC_DVD_DISPATCHPRICE_202206010000.zip'
terms = 'https://www.aemo.com.au/privacy-and-legal-notices/copyright-permissions'
archive_bytes = a.archive.read_bytes()
assert hashlib.sha256(archive_bytes).hexdigest() == 'f62b069ca97c585b5e36d07570d02a545dfcde201f9e67ce40a38c3b8b345721'
with zipfile.ZipFile(a.archive) as z:
    member = next(n for n in z.namelist() if n.upper().endswith('.CSV'))
    raw = z.read(member)
assert hashlib.sha256(raw).hexdigest() == '2fa7dabacbb9e6218f3e175e034e195bbfb0f298a80f8830f30dd702367fa47e'
fields = None
selected = []
for line, r in enumerate(csv.reader(io.StringIO(raw.decode('utf-8-sig'))), 1):
    if r[:4] == ['I', 'DISPATCH', 'PRICE', '4']:
        fields = r[4:]
    elif r[:4] == ['D', 'DISPATCH', 'PRICE', '4']:
        d = dict(zip(fields, r[4:]))
        if d['REGIONID'] == 'NSW1' and d['RUNNO'] == '1' and d['INTERVENTION'] == '0' and '2022/06/12 17:00:00' <= d['SETTLEMENTDATE'] <= '2022/06/12 20:00:00':
            assert d['PRICE_STATUS'] == 'FIRM' and d['MARKETSUSPENDEDFLAG'] == '0'
            assert int(d['APCFLAG']) in (0, 16)
            selected.append((line, d))
selected.sort(key=lambda item: item[1]['SETTLEMENTDATE'])
assert len(selected) == 37
zone = timezone(timedelta(hours=10))
def millis(text):
    return int(datetime.strptime(text, '%Y/%m/%d %H:%M:%S').replace(tzinfo=zone).timestamp() * 1000)
rows, records = [], []
for i, (line, d) in enumerate(selected, 1):
    ticks = Decimal(d['RRP']) * 100000
    assert ticks == ticks.to_integral_value() and ticks > 0
    t = millis(d['SETTLEMENTDATE'])
    assert not rows or t - rows[-1][0] == 300000
    rows.append([t, int(ticks), i, None, d['SETTLEMENTDATE'], d['RRP']])
    records.append({'id': i, 'sourceRowLine': line, 'intervalEndAest': d['SETTLEMENTDATE'], 'lastChangedAest': d['LASTCHANGED'], 'apcFlag': int(d['APCFLAG']), 'intervention': int(d['INTERVENTION']), 'priceStatus': d['PRICE_STATUS'], 'sourceKey': {k: d[k] for k in ['DISPATCHINTERVAL', 'INTERVENTION', 'REGIONID', 'RUNNO', 'SETTLEMENTDATE']}, 'ropLiteral': d['ROP']})
instrument = {'symbol': 'NSW1 electricity', 'base': 'MWh', 'quote': 'AUD', 'venue': 'AEMO NEM', 'name': 'NSW electricity cash-settled exposure', 'priceScale': 100000, 'quantityScale': 1, 'cashScale': 100}
package = {'marketDataKind': 'clearing', 'frequency': '5-minute', 'instrument': instrument, 'schema': ['timestampMs', 'clearingPriceTicks', 'observationId', 'unusedVolume', 'intervalEndAest', 'originalRRPLiteral'], 'rows': rows, 'marketRecords': records, 'source': 'Australian Energy Market Operator: NSW1 finalized five-minute DISPATCHPRICE RRP', 'sourceUrl': url, 'sourceRequestUrl': url, 'sourceSha256': hashlib.sha256(archive_bytes).hexdigest(), 'sourceMemberSha256': hashlib.sha256(raw).hexdigest(), 'sourceArchive': member, 'selectedWindowUTC': '2022-06-12 07:00:00 to 10:00:00 UTC', 'normalizedRowsSha256': hashlib.sha256(json.dumps(rows, separators=(',', ':')).encode()).hexdigest(), 'sampling': 'All 37 ordinary-run, non-intervention observations in the fixed three-hour window; no interpolation or substituted ROP prices.', 'timestampSemantics': 'dispatch-interval ending time (AEST, UTC+10); not first publication or quote-arrival time', 'transformation': 'Original AUD/MWh RRP decimals encoded exactly at 1e5; AEST interval-ending coordinates converted to UTC. Finalized July 13 archive; original LASTCHANGED and price flags retained.', 'rights': {'source': 'AEMO', 'terms': terms, 'attribution': 'Source: Australian Energy Market Operator, public DISPATCHPRICE NSW1 RRP, June 2022. Selected and encoded for a fictional historical cash-settlement challenge; no AEMO endorsement.'}, 'limitations': ['Finalized historical market-clearing prices, not executable quotes or reconstructed first-publication times.', 'Ten APCFLAG=16 records reflect loss-factor price scaling; the actual RRP settlement values are retained. No suspended/intervention or manual/cap/floor flagged rows are used.', 'MWh units represent a fictional cash-settled exposure, not stored physical electricity, dispatch rights, exchange futures or a financial broker contract.', 'Shared capacity, routing, reveal speed, fees and mandates are game assumptions. There is no order-book, physical delivery, storage or collateral/settlement-cycle model.', 'Only this positive-price window is admitted. General negative electricity price accounting is not supported.']}
first = Decimal(rows[0][5])
initial = int((first * 50 / Decimal('0.8') * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
target = int((Decimal(initial) * Decimal('0.9')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
rules = {'marketDataKind': 'clearing', 'initialUnits': 50, 'initialEquity': initial, 'targetUnits': 5, 'targetEquity': target, 'feeBps': 0, 'slippageBps': 0, 'maxLeverage': 1, 'maintenanceBps': 2500, 'participationBps': None, 'referenceFillUnits': 10, 'sellLagObservations': 0, 'lotSizeUnits': 1, 'maxOrderUnits': 100, 'priceScale': 100000, 'quantityScale': 1, 'cashScale': 100, 'baseAsset': 'MWh', 'quoteAsset': 'AUD'}
chapter = {'id': 'aemo-20220612-nsw', 'file': 'aemo-20220612-nsw.json', 'title': 'Power Prices at the Evening Peak', 'date': '2022-06-12', 'rows': len(rows), 'instrument': instrument, 'rules': rules, 'timedSpeed': 60, 'timedRouteDelayMs': 60000, 'brief': f'Take over 50 MWh of fictional cash-settled exposure with AUD {initial/100:,.2f} equity. Reduce to at most 5 MWh and retain AUD {target/100:,.2f} by 20:00 AEST. Actual five-minute NSW clearing prices drive marks and hypothetical later-observation fills. Timed mode runs at 60x with a simulated 60-historical-second user-order delay. This is not physical electricity inventory or executable bid/ask.'}
out = root / 'dist/data'
(out / chapter['file']).write_text(json.dumps(package, indent=2) + '\n')
catalog = json.loads((out / 'chapters.json').read_text())
catalog = [c for c in catalog if c['id'] != chapter['id']] + [chapter]
(out / 'chapters.json').write_text(json.dumps(catalog, indent=2) + '\n')
print(json.dumps({'id': chapter['id'], 'rows': len(rows), 'initialEquityAUD': initial/100, 'targetEquityAUD': target/100, 'normalizedRowsSha256': package['normalizedRowsSha256']}, indent=2))
