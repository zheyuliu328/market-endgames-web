"""Build reviewed dated challenges from public-source intake; never invent quotes."""
import argparse, csv, datetime, hashlib, json, shutil
from decimal import Decimal, ROUND_HALF_UP, localcontext
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('intake', type=Path, help='External source-validation directory')
a = p.parse_args()
out = Path(__file__).resolve().parents[1] / 'dist' / 'data'
chapters = []
schema = ['dateCoordinateMs', 'referencePriceTicks', 'normalizedId', 'unusedVolume', 'observationDate', 'originalReferenceDecimal']

def sha(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()

def emit(key, title, market, instrument, values, scale, initial, held, floor, limit, cap, lot, source, url, source_hash, rights, transform, limits, lag=0, extras=None):
    rows = []
    for n, (day, original, price) in enumerate(values, 1):
        dt = datetime.datetime.strptime(day, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
        ticks = int((price * scale).quantize(Decimal(1), rounding=ROUND_HALF_UP))
        rows.append([int(dt.timestamp()) * 1000, ticks, n, None, day, original])
    assert len(rows) > 1 and all(r[1] > 0 for r in rows)
    assert all(y[0] > x[0] for x, y in zip(rows, rows[1:]))
    instrument = dict(instrument, priceScale=scale, quantityScale=1, cashScale=100)
    package = {'source': source, 'sourceUrl': url, 'sourceSha256': source_hash,
        'marketDataKind': 'reference', 'frequency': 'daily',
        'timestampSemantics': 'observation-date coordinate; not publication or quote-arrival time',
        'schema': schema, 'rows': rows, 'instrument': instrument, 'rights': rights,
        'transformation': transform, 'sampling': 'One actual source value per observation date; missing dates remain absent. No intervening prices, bid/ask quotes or trade volume are reconstructed.',
        'limitations': limits,
        'normalizedRowsSha256': hashlib.sha256(json.dumps(rows, separators=(',', ':')).encode()).hexdigest()}
    if extras:
        package.update(extras)
    file = key + '.json'
    (out / file).write_text(json.dumps(package, indent=2) + '\n')
    rules = {'marketDataKind': 'reference', 'baseAsset': instrument['base'], 'quoteAsset': instrument['quote'],
        'priceScale': scale, 'quantityScale': 1, 'cashScale': 100, 'lotSizeUnits': lot,
        'initialUnits': held, 'initialEquity': initial, 'targetEquity': floor, 'targetUnits': limit,
        'referenceFillUnits': cap, 'sellLagObservations': lag, 'feeBps': 0, 'slippageBps': 0,
        'maxLeverage': 1, 'participationBps': None, 'maxOrderUnits': max(100000, held * 10)}
    brief = f'Take over {held:,} {instrument["base"]} with {initial/100:,.2f} {instrument["quote"]} equity. Finish by {rows[-1][4]} with at least {floor/100:,.2f} {instrument["quote"]} and at most {limit:,} {instrument["base"]}. Orders settle at the next unseen dated reference, with a fictional shared cap of {cap:,} units per observation. No borrowing or shorting.'
    if lag:
        brief += ' Units acquired at one observation cannot be sold until a later observation.'
    chapters.append({'id': key, 'title': title, 'market': market, 'date': rows[0][4], 'endDate': rows[-1][4],
        'file': file, 'rows': len(rows), 'instrument': {k: instrument[k] for k in ['symbol', 'base', 'quote', 'name', 'venue']},
        'rules': rules, 'brief': brief})

# Missions are fictional and designed with known history; they are not blind-test thresholds.
fx_dir = a.intake / 'fx-commodity-intake'
fx = json.loads((fx_dir / 'fx-observations.json').read_text())
for item in fx:
    chf = item['id'] == 'chf-reference'
    raw_file = fx_dir / ('ecb-chf-201501.csv' if chf else 'ecb-gbp-201606.csv')
    currency, start = ('CHF', '2015-01-12') if chf else ('GBP', '2016-06-20')
    vals = []
    with localcontext() as ctx:
        ctx.prec = 70
        for point in item['values']:
            if point['date'] < start:
                continue
            original = point['rate']
            rate = Decimal(original)
            vals.append((point['date'], original, rate if chf else Decimal(1) / rate))
    base, quote = ('EUR', 'CHF') if chf else ('GBP', 'EUR')
    emit('ecb-2015-chf' if chf else 'ecb-2016-gbp', 'The Franc Floor Breaks' if chf else 'Sterling After the Vote', 'FX',
        {'symbol': base + '/' + quote, 'base': base, 'quote': quote, 'name': base + ' holdings / ' + quote, 'venue': 'ECB reference'},
        vals, 1000000, 2000000, 10000, 1900000, 1000, 5000, 100,
        'European Central Bank daily euro foreign-exchange reference rates',
        'https://data-api.ecb.europa.eu/service/data/EXR/D.' + currency + '.EUR.SP00.A', sha(raw_file),
        {'source': 'ECB', 'terms': 'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html', 'attribution': 'Source: European Central Bank. Selected reference rates; date encoding and any reciprocal conversion are our modifications. No ECB endorsement.'},
        'Original source CHF per EUR; exact scale conversion to 1e6.' if chf else 'Original source GBP per EUR. Converted to EUR per GBP by reciprocal, rounded HALF_UP to six decimals. This is a modified reference price, not an original executable ECB quote.',
        ['Reference rates are informational, not transaction prices.', 'Historical publication times are not reconstructed.', 'No spread, financing, interest or currency-market liquidity is modeled.'],
        extras={'sourceRequestUrl': 'https://data-api.ecb.europa.eu/service/data/EXR/D.' + currency + '.EUR.SP00.A?startPeriod=' + ('2015-01-05&endPeriod=2015-01-23' if chf else '2016-06-13&endPeriod=2016-07-01') + '&format=csvdata'})

cotton_dir = a.intake / 'usda-commodity-intake'
cotton = json.loads((cotton_dir / 'cotton-2011-observations.json').read_text())
emit('usda-2011-cotton', 'Cotton: Keep the Cash', 'Commodity',
    {'symbol': 'Cotton/USD', 'base': 'net lb', 'quote': 'USD', 'name': 'Upland cotton spot reference / net pound', 'venue': 'USDA AMS reference'},
    [(v['date'], v['sourceCentsPerPound'], Decimal(v['priceUSDPerPound'])) for v in cotton['observations']],
    10000, 3000000, 10000, 2850000, 1000, 2000, 100,
    'USDA AMS seven-market average upland cotton spot quotation (41-4-34), Annual Cotton Price Statistics 2010-2011 Table 3',
    'https://apps.ams.usda.gov/Cotton/AnnualCNMarketNewsReports/CottonPriceStatistics/ACPS-2010-2011.pdf',
    sha(cotton_dir / 'ACPS-2010-2011.pdf'),
    {'source': 'USDA AMS', 'terms': 'https://www.ams.usda.gov/about-ams/privacy', 'attribution': 'Source: USDA Agricultural Marketing Service, Cotton and Tobacco Program. Selected official spot quotations; unit conversion and fictional inventory game are our modifications.'},
    'Original cents per net pound divided by 100 to obtain USD per net pound; exact 1e4 price scale.',
    ['Virtual cash inventory, not cotton futures or a physical delivery contract.', 'Storage, transportation, grading, delivery and selling costs are omitted.', 'Annual-report observations were compared with contemporaneous weekly reports; precise original release times are unknown.', 'ICE futures and third-party Cotlook data from the same publications are excluded.'])

asia = a.intake / 'asia-intake'
with (asia / 'sse-600519-2024-eod.csv').open() as f:
    all_stock = list(csv.DictReader(f))
stock = [v for v in all_stock if v['date'] >= '20240930']
stock_dates = [datetime.datetime.strptime(v['date'], '%Y%m%d').date().isoformat() for v in stock]
raw_sources = [{'date': day, 'sha256': v['source_raw_sha256']} for day, v in zip(stock_dates, stock)]
source_hash = hashlib.sha256(json.dumps(raw_sources, separators=(',', ':')).encode()).hexdigest()
emit('sse-2024-600519', 'After the Holiday Rally', 'A-share',
    {'symbol': '600519.SSE', 'base': '600519 shares', 'quote': 'CNY', 'name': 'Kweichow Moutai', 'venue': 'SSE EOD'},
    [(day, v['close'], Decimal(v['close'])) for day, v in zip(stock_dates, stock)],
    100, 200000000, 1000, 190000000, 100, 500, 100,
    'Shanghai Stock Exchange end-of-day stock statistics: 600519 closing prices',
    'https://www.sse.com.cn/assortment/stock/list/info/company/index.shtml?COMPANY_CODE=600519', source_hash,
    {'source': 'SSE EOD', 'terms': 'https://www.ciis.com.hk/hongkong/en/uploadfiles/202601/09/2026010917263756201331.pdf', 'attribution': 'Source: Shanghai Stock Exchange. Historical end-of-day closing information; no intraday feed or endorsement. Selected and encoded for a fictional dated challenge.'},
    'Original CNY closing price per share; exact 1e2 scale. Source SHA-256 covers an ordered manifest of original daily JSON hashes.',
    ['Hypothetical next-observation closing-price settlement, not guaranteed exchange execution.', 'Daily OHLC cannot reconstruct auction queues or liquidity at price limits.', '100-share order lots and one-observation resale lag are modeled; inherited shares are already eligible for sale.', 'Dividends, corporate actions, commissions, stamp duty and intraday trading are not modeled.'],
    lag=1, extras={'sourceRecords': raw_sources, 'sourceOHLC': [{'date': day, 'open': v['open'], 'high': v['high'], 'low': v['low'], 'close': v['close']} for day, v in zip(stock_dates, stock)]})

with (asia / 'hk-2008-challenge-windows.csv').open() as f:
    hk = [v for v in csv.DictReader(f) if v['symbol']=='0005.HK' and '2008-10-20'<=v['date']<='2008-10-31']
assert len(hk)==10, 'HSBC source window differs from reviewed admission'
receipt = json.loads((asia / 'hk-ccass-raw/download-receipt.json').read_text())
assert receipt['sha256']==sha(asia / 'hk-ccass-raw/ccass251227.7z')
shutil.copy2(asia / 'webb-original-copyright.txt', out / 'WEBB-NOTICE.txt')
emit('webb-2008-hsbc', 'HSBC: A Bank Under Pressure', 'Hong Kong',
    {'symbol': '0005.HK', 'base': 'HSBC shares', 'quote': 'HKD', 'name': 'HSBC Holdings', 'venue': 'Webb-site daily compilation'},
    [(v['date'], v['close'], Decimal(v['close'])) for v in hk],
    100, 20000000, 1200, 19000000, 400, 400, 400,
    'David M Webb: ccass.quotes numerical compilation, selected HSBC daily closing prices',
    'https://webbrepo.substack.com/p/welcome-to-the-webb-site-repository', receipt['sha256'],
    {'source': 'Webb-site compilation', 'terms': 'https://creativecommons.org/licenses/by/4.0/', 'attribution': 'Source: David M Webb MBE, Webb-site repository, ccass.quotes numerical compilation, CC BY. Selected, date-encoded and scaled for an independent fictional game. Original copyright notice retained in data/WEBB-NOTICE.txt. No HKEX or author endorsement.'},
    'Original compiled daily HKD close per HSBC share; exact 1e2 scale. Only close values selected; bid/ask, volume and original report layout are not republished.',
    ['Permission is from the author for the numerical compilation; this is not a claim that HKEX report files are openly licensed.', 'No source opening prices or intraday timestamps are available; next-observation closing-price fills are hypothetical.', '400-share order lots are supported by official 1999 and 2009 cash-share evidence and 2008 contract evidence; applying them to October2008 is a historical inference.', 'Dividends, corporate actions, commissions, stamp duty and exchange queues are omitted. Selected source window has no detected previous-close adjustment bridge.'],
    extras={'sourceRequestUrl': 'https://drive.google.com/file/d/'+receipt['sourceFileID']+'/view', 'sourceRecords': [{'date':v['date'], 'sourceTupleSha256':v['source_tuple_sha256']} for v in hk]})

chapters.sort(key=lambda c: {'A-share': 0, 'Hong Kong': 1, 'FX': 2, 'Commodity': 3}[c['market']])
(out / 'reference-chapters.json').write_text(json.dumps(chapters, indent=2) + '\n')
print('Built', len(chapters), 'reviewed daily reference challenges; existing IEX catalog unchanged')
