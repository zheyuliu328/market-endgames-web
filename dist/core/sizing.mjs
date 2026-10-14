import {value,rounded} from './engine.mjs';
const ceilRatio=(n,d)=>Number((n+d-1n)/d);
// Conservative at the current price, not a fill guarantee or a depth estimate.
// Charge each lot separately with upward rounding to cover any partial-fill split.
export function estimatedBuyUnits(account,divisor=1){
  const r=account.rules;
  if(!Number.isInteger(divisor)||divisor<1)throw Error('Invalid sizing fraction');
  if(account.done||account.liquidated||account.orders.some(o=>o.side==='buy'&&['pending','partial'].includes(o.status)))return 0;
  const observed=r.marketDataKind==='quote'?account.ask:account.price;
  const execution=observed+rounded(BigInt(observed)*BigInt(r.slippageBps),10000);
  const grossPerLot=ceilRatio(BigInt(execution)*BigInt(r.lotSizeUnits)*BigInt(r.cashScale),BigInt(r.priceScale)*BigInt(r.quantityScale));
  const feePerLot=ceilRatio(BigInt(grossPerLot)*BigInt(r.feeBps),10000n);
  const lotCost=grossPerLot+feePerLot;
  let low=0,high=Math.floor(r.maxOrderUnits/r.lotSizeUnits);
  while(low<high){
    const lots=Math.ceil((low+high)/2),units=account.units+lots*r.lotSizeUnits;
    const position=value(account.price,units,r),cash=account.cash-lots*lotCost,eq=cash+position;
    if(eq>0&&position<=r.maxLeverage*eq)low=lots;else high=lots-1;
  }
  return Math.floor(low/divisor)*r.lotSizeUnits;
}
