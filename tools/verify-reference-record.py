"""Independent Decimal/source-row audit of an actual browser's exported account record."""
import argparse, collections, json
from decimal import Decimal as D, ROUND_HALF_UP, localcontext
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('record',type=Path);p.add_argument('package',type=Path);a=p.parse_args()
record=json.loads(a.record.read_text());source=json.loads(a.package.read_text());results=[]
assert source['marketDataKind']=='reference'
with localcontext() as ctx:
 ctx.prec=70
 for name in ['original','revised']:
  if name not in record:continue
  account=record[name];r=account['rules'];assert account['done'];rows=source['rows']
  def minor(price,units):return int((D(price)*D(units)*D(r['cashScale'])/D(r['priceScale'])/D(r['quantityScale'])).quantize(D(1),rounding=ROUND_HALF_UP))
  cash=r['initialEquity']-minor(rows[0][1],r['initialUnits']);held=r['initialUnits'];assert cash>=0
  orders={str(o['id']):o for o in account['orders']};by_observation=collections.defaultdict(list)
  for f in account['ledger']:by_observation[f['tradeId']].append(f)
  fills=collections.Counter()
  for i,row in enumerate(rows[1:],1):
   old=held;used=0
   for f in by_observation.pop(row[2],[]):
    order=orders[str(f['id'])];assert f['time']==row[0] and f['observedPrice']==f['executionPrice']==row[1]
    assert i>order['afterIndex'] and row[0]>=order['time'], 'Fill uses current/future submission information'
    assert order.get('cancelAfterIndex',i)>=i, 'Fill occurs after cancellation'
    assert f['units']>0 and f['units']%r['lotSizeUnits']==0
    used+=f['units'];assert used<=r['referenceFillUnits'], 'Shared capacity exceeded'
    gross=minor(row[1],f['units']);fee=int((D(gross)*D(r['feeBps'])/D(10000)).quantize(D(1),rounding=ROUND_HALF_UP));assert f['gross']==gross and f['fee']==fee
    if f['side']=='sell':
     assert f['units']<=held
     if r['sellLagObservations']==1:assert f['units']<=old;old-=f['units']
     held-=f['units'];cash+=gross-fee
    else:held+=f['units'];cash-=gross+fee
    assert cash==f['cash'] and cash>=0
    assert cash+minor(row[1],held)==f['equity']
    fills[str(f['id'])]+=f['units']
   observed_equity=cash+minor(row[1],held)
   assert account['curve'][i]==[row[0],observed_equity]
  assert not by_observation
  assert held==account['units'] and cash==account['cash']
  assert all(fills[str(o['id'])]==o.get('filledUnits',0) for o in account['orders'])
  results.append({'path':name,'fills':len(account['ledger']),'cashMinor':cash,'positionUnits':held,'equityMinor':cash+minor(rows[-1][1],held),'currency':r['quoteAsset']})
print(json.dumps({'status':'passed','method':'Independent Decimal per-fill, source-row, FIFO cap, next-date, cancellation and resale-lag audit','chapter':record['chapter'],'results':results},indent=2))
