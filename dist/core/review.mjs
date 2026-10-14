import {outcome,value} from './engine.mjs';
export function revisionChanges(account,inputs){
  const changes={},r=account.rules;
  for(const [id,text] of Object.entries(inputs)){
    const order=account.orders.find(o=>!o.automatic&&String(o.id)===id);
    if(!order)throw Error('Unknown order '+id);
    const n=Number(text),units=Math.round(n*r.quantityScale);
    if(String(text).trim()===''||!Number.isFinite(n)||n<0||Math.abs(units/r.quantityScale-n)>1e-9||units%r.lotSizeUnits||units>r.maxOrderUnits)throw Error('Order #'+id+': enter a quantity from 0 to '+r.maxOrderUnits/r.quantityScale+' in increments of '+r.lotSizeUnits/r.quantityScale+' '+r.baseAsset+'.');
    if(units!==order.units)changes[id]=units;
  }
  if(Object.keys(changes).length>2)throw Error('Only two decisions can be changed. Restore another order first.');
  return changes;
}
export function decisionStatus(order,account){
  if(order.units===0&&!order.automatic)return 'Skipped in revision';
  if(account.done&&order.time>account.time&&!order.automatic)return 'Not reached — account closed before this decision';
  return order.status+(order.reason?' — '+order.reason:'');
}
export function compareAccounts(original,revised){
  const a=outcome(original),b=outcome(revised),r=original.rules;
  const changed=original.orders.filter(o=>!o.automatic).filter(o=>revised.orders.find(n=>n.id===o.id)?.units!==o.units);
  const fillPath=(a,id)=>JSON.stringify(a.ledger.filter(f=>f.id===id).map(f=>[f.time,f.tradeId,f.units,f.executionPrice,f.fee]));
  const affected=original.orders.filter(o=>!o.automatic).map(o=>({original:o,revised:revised.orders.find(n=>n.id===o.id)})).filter(({original:o,revised:n})=>n&&(o.units!==n.units||o.filledUnits!==n.filledUnits||o.fee!==n.fee||decisionStatus(o,original)!==decisionStatus(n,revised)||fillPath(original,o.id)!==fillPath(revised,n.id)));
  return {original:a,revised:b,changed,affected,cashDelta:revised.cash-original.cash,positionDelta:value(revised.price,revised.units,r)-value(original.price,original.units,r),equityDelta:b.equity-a.equity,feesDelta:revised.fees-original.fees};
}
