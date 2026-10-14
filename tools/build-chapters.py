"""Materialize fixed educational account mandates from admitted IEX observations."""
import argparse,json,shutil,datetime
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('packages',type=Path);p.add_argument('--date',default='2020-03-16',choices=['2020-03-16','2018-12-24','2020-06-11']);p.add_argument('--append',action='store_true');a=p.parse_args();root=Path(__file__).resolve().parents[1];out=root/'dist/data';out.mkdir(exist_ok=True)
# These mandates were fixed before examining extracted quote returns.
settings={
 '2020-03-16':[('SPY','The Pandemic Exit','SPDR S&P 500 ETF',3000000,100,2940000,10),('QQQ','Tech Under Pressure','Invesco QQQ ETF',2500000,100,2450000,10)],
 '2018-12-24':[('SPY','Christmas Eve Exit','SPDR S&P 500 ETF',3000000,100,2940000,10),('QQQ','A Thin Holiday Market','Invesco QQQ ETF',2500000,100,2450000,10)],
 '2020-06-11':[('SPY','The June Reversal','SPDR S&P 500 ETF',4000000,100,3920000,10),('QQQ','The Venue Liquidity Trap','Invesco QQQ ETF',3000000,100,2940000,10)]
}[a.date]
chapters=json.loads((out/'chapters.json').read_text()) if a.append else []
for sym,title,name,initial,units,floor,limit in settings:
 d=json.loads((a.packages/(sym+'.json')).read_text());assert d['rights']['source']=='IEX HIST'
 assert all(datetime.datetime.fromtimestamp(row[0]/1000,datetime.timezone.utc).date().isoformat()==a.date for row in d['rows']), 'Source date differs from selected chapter'
 date_key=a.date.replace('-','');file=sym+'.json' if a.date=='2020-03-16' else date_key+'-'+sym+'.json';chapter_id='iex-'+date_key+'-'+sym.lower()
 if any(c['id']==chapter_id for c in chapters):raise ValueError('Chapter already exists; preserve existing catalog')
 shutil.copy2(a.packages/(sym+'.json'),out/file)
 deadline=datetime.datetime.fromtimestamp(d['rows'][-1][0]/1000,datetime.timezone.utc).strftime('%H:%M:%S')
 caveat=' IEX bids can be far below asks. Bid-marked losses here are venue-specific and do not describe a consolidated QQQ crash.' if (a.date,sym)==('2020-06-11','QQQ') else ''
 chapters.append({'id':chapter_id,'title':title,'date':a.date,'file':file,'rows':len(d['rows']),'instrument':{'symbol':sym,'base':sym,'quote':'USD','name':name,'venue':'IEX'},'rules':{'marketDataKind':'quote','baseAsset':sym,'quoteAsset':'USD','priceScale':10000,'quantityScale':1,'cashScale':100,'lotSizeUnits':1,'initialUnits':units,'initialEquity':initial,'targetEquity':floor,'targetUnits':limit,'quoteFillUnits':10,'feeBps':0,'slippageBps':0,'maxLeverage':1},'brief':f'Take over {units} {sym} shares on {a.date}, with ${initial/100:,.0f} equity. Finish by {deadline} UTC with at least ${floor/100:,.0f} and at most {limit} shares. Funded long-only account. IEX venue quotes; hypothetical execution.'+caveat})
(out/'chapters.json').write_text(json.dumps(chapters,indent=2)+'\n');print('Built',len(settings),'fixed IEX account challenges for',a.date,'; catalog:',len(chapters))
