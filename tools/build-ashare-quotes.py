"""Materialize one author-licensed named L1 snapshot interval from its exact Parquet.

Requires pyarrow. Original published values are preserved; no network requests,
resampling, adjusted prices or simulated market records are generated here.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
import hashlib, json, sys
import pyarrow.parquet as pq

root = Path(__file__).resolve().parents[1]
path = Path(sys.argv[1])
raw = path.read_bytes()
digest = hashlib.sha256(raw).hexdigest()
assert digest == '0b724b9350926a3abc5ce1bdb84ec4e200923a57a41bf5d4fe0bc2bbca8fbef4', 'Wrong original file'
start = int(datetime.fromisoformat('2026-05-06T01:30:00+00:00').timestamp()*1000)
end = int(datetime.fromisoformat('2026-05-06T02:00:00+00:00').timestamp()*1000)
rows, records = [], []
for ordinal, item in enumerate(pq.read_table(path).to_pylist(), 1):
    if not start <= item['ts'] < end:
        continue
    assert item['code'] == '600900.XSHG'
    bid, ask = Decimal(str(item['bid1_price'])), Decimal(str(item['ask1_price']))
    assert 0 < bid <= ask and bid*100 == int(bid*100) and ask*100 == int(ask*100)
    assert item['source_seq'] < 2**53
    row = [item['ts'], int(bid*100), ordinal, None, int(ask*100), str(bid), str(ask), item['source_seq']]
    assert not rows or (row[0] > rows[-1][0] and ordinal == rows[-1][2]+1)
    rows.append(row)
    records.append({'id': ordinal, 'sourceParquetRow': ordinal, 'sourceSequence': item['source_seq'], 'originalFields': item})
assert len(rows) == 600
instrument = {'symbol': '600900.XSHG', 'base': '600900', 'quote': 'CNY', 'venue': 'cooronxon A-share publication', 'name': 'Named A-share L1 snapshot exercise', 'priceScale': 100, 'quantityScale': 1, 'cashScale': 100}
source_url = 'https://huggingface.co/datasets/cooronxon/AShareTickData'
revision = 'cf50faff46a1118524c83b386f32e47d710441f4'
attribution = 'Source: cooronxon, AShareTickData, primary dataset card MIT, revision '+revision+'. Selected original 600900.XSHG L1 snapshots; cent encoding and row ordinals by Market Endgames. Fictional accounts and execution added. No publisher, exchange or vendor endorsement.'
source = {'marketDataKind': 'quote', 'frequency': 'original L1 snapshots', 'instrument': instrument, 'schema': ['timestampMs', 'bidTicks', 'sourceParquetRowOrdinal', 'unusedVolume', 'askTicks', 'originalBidDecimal', 'originalAskDecimal', 'sourceSequence'], 'rows': rows, 'marketRecords': records, 'source': 'cooronxon published original 600900.XSHG L1 snapshots', 'sourceUrl': source_url, 'sourceRequestUrl': source_url+'/resolve/'+revision+'/L1_snapshot/2026-05-06/600900.XSHG.parquet', 'sourceSha256': digest, 'sourceArchive': 'L1_snapshot/2026-05-06/600900.XSHG.parquet', 'selectedWindowUTC': '2026-05-06 01:30:00 to 02:00:00 UTC (09:30 to 10:00 UTC+8)', 'normalizedRowsSha256': hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest(), 'sampling': 'All 600 publisher snapshots in the selected regular-morning interval. Original 2/3/4-second gaps, cent prices, source row ordinals and source sequences retained. No resampling, interpolation, reconstructed quotes or trade volume.', 'timestampSemantics': 'publisher Unix-millisecond snapshot timestamp; not independently verified exchange event or first availability time', 'transformation': 'Original published top bid/ask doubles encoded on their exact cent grid using their round-trip decimal representation. Original Parquet row ordinals, source sequence and five-level fields retained. No adjustment or price interpolation.', 'rights': {'source': 'cooronxon AShareTickData compilation', 'terms': 'https://opensource.org/license/mit', 'attribution': attribution, 'grantUrl': source_url+'/blob/'+revision+'/README.md', 'grantMetadata': 'license: mit', 'grantCardSha256': 'ff6c3a6f10448a5c7abc9942dabb37c4083a6c7de249b75f3e5cc3e9cfb5aa9e'}, 'limitations': ['The primary author DATA repository grants MIT for its numerical compilation. Originating feed/vendor rights are not independently certified; no direct exchange permission is claimed.', 'Original L1 quote provenance is publisher-asserted, not independently crosschecked against an authorised exchange feed. Snapshot timestamps are not guaranteed exchange publication or executable arrival times.', 'Displayed depth is preserved for provenance but never used as guaranteed liquidity. Fills share a fictional 1000-share snapshot cap after simulated routing.', 'Only one regular-morning interval is modeled. Inherited shares may sell; shares bought during the chapter cannot be sold before it ends, approximating the single-day consequence of T+1. No next-day release, short sales, auction queues, financing or price-limit liquidity is reconstructed.', 'Fees and stamp duty are zero game assumptions, not a representation of actual A-share costs. This is an ordinary historical morning, not a claimed black-swan event.']}
initial = int((Decimal(rows[0][1])/100*10000/Decimal('0.8')*100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
target = int((Decimal(initial)*Decimal('0.9')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
rules = {'marketDataKind': 'quote', 'intradayBuyLock': True, 'initialUnits': 10000, 'initialEquity': initial, 'targetUnits': 1000, 'targetEquity': target, 'feeBps': 0, 'slippageBps': 0, 'maxLeverage': 1, 'maintenanceBps': 2500, 'participationBps': None, 'quoteFillUnits': 1000, 'sellLagObservations': 0, 'lotSizeUnits': 100, 'maxOrderUnits': 20000, 'priceScale': 100, 'quantityScale': 1, 'cashScale': 100, 'baseAsset': '600900', 'quoteAsset': 'CNY'}
chapter = {'id': 'ashare-20260506-600900', 'file': 'ashare-20260506-600900.json', 'title': 'An A-share Morning Exit', 'date': '2026-05-06', 'rows': 600, 'instrument': instrument, 'rules': rules, 'displaySymbol': '600900 / CNY', 'clockLabel': 'Historical clock · UTC (local UTC+8)', 'clockZoneLabel': 'UTC', 'timedSpeed': 12, 'timedRouteDelayMs': 6000, 'brief': f'Take over 10,000 inherited 600900.XSHG shares with CNY {initial/100:,.2f} equity. Finish at 09:59:58 UTC+8 with at least CNY {target/100:,.2f} and at most 1,000 shares. Original publisher L1 bid/ask snapshots. Orders use 100-share lots and fictional 1000-share capacity. Any shares bought today remain locked until after this chapter; inherited shares can sell. Ordinary historical morning, not a claimed black-swan event.'}
out = root/'dist/data'
(out/chapter['file']).write_text(json.dumps(source,indent=2)+'\n')
(out/'ASHARE-MIT-NOTICE.txt').write_text(attribution+'\nPrimary DATA grant: '+source['rights']['grantUrl']+'\nPinned card metadata: license: mit\nCard SHA-256: '+source['rights']['grantCardSha256']+'\nMIT license terms: https://opensource.org/license/mit\nThe data card names no separate copyright holder/year; none is invented or borrowed from software. This grant covers rights controlled by the publisher, not a new exchange/vendor license. Changes and residual limits are retained in the package and reports.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n')
catalog = json.loads((out/'chapters.json').read_text())
(out/'chapters.json').write_text(json.dumps([c for c in catalog if c['id']!=chapter['id']]+[chapter],indent=2)+'\n')
print(json.dumps({'id':chapter['id'],'rows':600,'initialEquityCNY':initial/100,'normalizedRowsSha256':source['normalizedRowsSha256']},indent=2))
