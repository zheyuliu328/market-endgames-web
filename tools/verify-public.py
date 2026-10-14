"""Verify the distributable static runtime, notices, hashes and allowed dependencies."""
from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1];dist=root/'dist'
chapters=json.loads((dist/'data/chapters.json').read_text())
references=json.loads((dist/'data/reference-chapters.json').read_text())
allowed={c['file'] for c in chapters}
approved={'SPY.json','QQQ.json','20181224-SPY.json','20181224-QQQ.json','20200611-SPY.json','20200611-QQQ.json','aemo-20220612-nsw.json','jrc-20220307-eurusd.json','ashare-20260506-600900.json'}
assert allowed==approved, 'Catalog differs from reviewed public source allowlist'
assert len({c['id'] for c in chapters})==len(chapters), 'Duplicate chapter ID'
reference_terms={
 'ecb-2015-chf.json':('ECB','https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html'),
 'ecb-2016-gbp.json':('ECB','https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html'),
 'usda-2011-cotton.json':('USDA AMS','https://www.ams.usda.gov/about-ams/privacy'),
 'sse-2024-600519.json':('SSE EOD','https://www.ciis.com.hk/hongkong/en/uploadfiles/202601/09/2026010917263756201331.pdf'),
 'webb-2008-hsbc.json':('Webb-site compilation','https://creativecommons.org/licenses/by/4.0/')}
assert {c['file'] for c in references}==set(reference_terms), 'Reference catalog differs from reviewed source allowlist'
assert len({c['id'] for c in chapters+references})==len(chapters+references), 'Duplicate challenge ID'
assert {f.name for f in (dist/'data').glob('*.json')}==allowed|set(reference_terms)|{'chapters.json','reference-chapters.json'}, 'Unreviewed dataset bundled'
for c in chapters:
 d=json.loads((dist/'data'/c['file']).read_text());assert len(d['rows'])==c['rows'];assert d['normalizedRowsSha256']==hashlib.sha256(json.dumps(d['rows'],separators=(',',':')).encode()).hexdigest()
 if c['file']=='aemo-20220612-nsw.json':
  assert d['marketDataKind']=='clearing' and d['frequency']=='5-minute' and d['instrument']['venue']=='AEMO NEM'
  assert d['rights']['terms']=='https://www.aemo.com.au/privacy-and-legal-notices/copyright-permissions' and d['rights']['source']=='AEMO'
  assert d['sourceSha256']=='f62b069ca97c585b5e36d07570d02a545dfcde201f9e67ce40a38c3b8b345721'
  assert d['sourceMemberSha256']=='2fa7dabacbb9e6218f3e175e034e195bbfb0f298a80f8830f30dd702367fa47e'
  assert d['timestampSemantics']=='dispatch-interval ending time (AEST, UTC+10); not first publication or quote-arrival time'
  assert len(d['marketRecords'])==len(d['rows'])==37
  assert d['normalizedRowsSha256']=='bbf30791b54e8b47a94e24b6f79a847b348e1c804179e03a12b326f674285c28'
  for row,m in zip(d['rows'],d['marketRecords']):
   assert row[3] is None and row[2]==m['id'] and row[4]==m['intervalEndAest']
   assert m['priceStatus']=='FIRM' and m['intervention']==0 and m['apcFlag'] in (0,16)
 elif c['file']=='ashare-20260506-600900.json':
  assert d['marketDataKind']=='quote' and d['frequency']=='original L1 snapshots'
  assert d['rights']['source']=='cooronxon AShareTickData compilation' and d['rights']['grantMetadata']=='license: mit'
  assert d['rights']['grantCardSha256']=='ff6c3a6f10448a5c7abc9942dabb37c4083a6c7de249b75f3e5cc3e9cfb5aa9e'
  assert d['sourceSha256']=='0b724b9350926a3abc5ce1bdb84ec4e200923a57a41bf5d4fe0bc2bbca8fbef4'
  assert d['normalizedRowsSha256']=='97bd9c3d996ef32340ca86cbd1a67c7d258033bd0bdb77286de8f3629114924a'
  assert len(d['rows'])==len(d['marketRecords'])==600
  assert c['rules']['intradayBuyLock'] is True and c['rules']['lotSizeUnits']==100 and c['rules']['maxLeverage']==1
  from decimal import Decimal
  for row,m in zip(d['rows'],d['marketRecords']):
   assert row[3] is None and m['sourceParquetRow']==row[2] and m['sourceSequence']==row[7]
   assert Decimal(row[5])*100==row[1] and Decimal(row[6])*100==row[4]
   assert m['originalFields']['ts']==row[0] and m['originalFields']['code']=='600900.XSHG'
 elif c['file']=='jrc-20220307-eurusd.json':
  assert d['marketDataKind']=='price' and d['frequency']=='tick'
  assert d['rights']['terms']=='https://creativecommons.org/licenses/by/4.0/' and d['rights']['source']=='INFINITECH/JRC publication'
  assert d['sourceSha256']=='f70ea586c4ea33453df4c3d56120bd96407a36fe402833ea9b0246dc5e07f41f'
  assert d['sourceMemberSha256']=='42639a0b82f059512c9b39a772f1c0c3b9c30bd87ee13c5575cf3400b56f6d89'
  assert d['timestampSemantics']=='floating source-clock coordinate; timezone and bid/ask side unreported'
  assert len(d['rows'])==714 and len(d['context']['rows'])==238
  assert d['normalizedRowsSha256']=='3ab8653dfd449d223fc770f06aad21aed3e5d650a89463631e12ed899d483cf5'
  assert d['context']['normalizedRowsSha256']==hashlib.sha256(json.dumps(d['context']['rows'],separators=(',',':')).encode()).hexdigest()
  from datetime import datetime,timezone
  previous=None
  for row in d['context']['rows']+d['rows']:
   assert row[3] is None and len(row)==6
   assert int(datetime.fromisoformat(row[4]).replace(tzinfo=timezone.utc).timestamp()*1000)==row[0]
   from decimal import Decimal
   assert Decimal(row[5])*c['rules']['priceScale']==row[1]
   if previous:assert row[0]>previous[0] and row[2]==previous[2]+1
   previous=row
  assert c['rules']['lotSizeUnits']==1000 and c['rules']['maxLeverage']==1 and c['rules']['referenceFillUnits']==10000
 else:
  assert d['instrument']['venue']=='IEX' and d['rights']['terms']=='https://www.iex.io/legal/hist-data-terms'
for c in references:
 d=json.loads((dist/'data'/c['file']).read_text());assert len(d['rows'])==c['rows'];assert d['marketDataKind']=='reference' and d['frequency']=='daily'
 assert (d['rights']['source'],d['rights']['terms'])==reference_terms[c['file']]
 assert d['timestampSemantics']=='observation-date coordinate; not publication or quote-arrival time'
 assert d['normalizedRowsSha256']==hashlib.sha256(json.dumps(d['rows'],separators=(',',':')).encode()).hexdigest()
 assert d['rights']['attribution'] and d['sourceSha256'] and d['transformation']
 assert c['rules']['referenceFillUnits']>=c['rules']['lotSizeUnits'] and c['rules']['maxLeverage']==1
 assert all(r[3] is None and len(r)==6 for r in d['rows']), 'Invented reference volume/quote fields'
 if d['rights']['source']=='ECB':assert 'format=csvdata' in d['sourceRequestUrl']
assert 'cooronxon' in (dist/'data/ASHARE-MIT-NOTICE.txt').read_text()
assert 'license: mit' in (dist/'data/ASHARE-MIT-NOTICE.txt').read_text()
assert 'Georgios Fatouros' in (dist/'data/JRC-CC-BY-NOTICE.txt').read_text()
assert 'Konstantina Tripodi' in (dist/'data/JRC-CC-BY-NOTICE.txt').read_text()
assert '10.5281/zenodo.7411148' in (dist/'data/JRC-CC-BY-NOTICE.txt').read_text()
assert 'David M Webb' in (dist/'data/WEBB-NOTICE.txt').read_text()
assert (dist/'vendor/LICENSE').read_text().startswith('                                 Apache License')
assert 'TradingView' in (dist/'vendor/NOTICE').read_text()
assert not (dist/'assets').exists(), 'Restricted legacy runtime retained'
for f in dist.rglob('*'):
 if not f.is_file():continue
 s=f.read_text();assert not re.search(r'[\u3400-\u9fff]',s),f'Non-English runtime {f}'
 if f.suffix=='.mjs':
  for dep in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]",s):
   if dep.startswith('.'):assert (f.parent/dep).is_file(),(f,dep)
assert 'IEX Historical Data Terms of Use' in (dist/'credits.html').read_text()
manifest={'source':'IEX HIST venue quotes, author-published named A-share snapshots, AEMO five-minute clearing prices, JRC published FX price ticks and separately identified daily references','sources':sorted(set(reference_terms.values())|{('IEX HIST','https://www.iex.io/legal/hist-data-terms'),('AEMO','https://www.aemo.com.au/privacy-and-legal-notices/copyright-permissions'),('INFINITECH/JRC published compilation','https://creativecommons.org/licenses/by/4.0/'),('cooronxon AShareTickData compilation','https://opensource.org/license/mit')}),'chartDependency':'Lightweight Charts 5.2.1, Apache-2.0','originalTerminal':True,'upstreamTerminalIncluded':False,'files':[]}
for f in sorted(dist.rglob('*')):
 if f.is_file() and f.name!='release-manifest.json':manifest['files'].append({'path':str(f.relative_to(dist)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(dist/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PASS: six IEX quote, one named A-share snapshot, one AEMO clearing, one FX price-tick and five daily reference packages, source-specific terms/hashes, English runtime, dependency notices and legacy exclusion.')
