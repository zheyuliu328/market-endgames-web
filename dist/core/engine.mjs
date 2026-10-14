// Integer cash, price and quantity scales are explicit; defaults preserve BTC/USD chapters.
// Participation limits are a game assumption, not a reconstructed order book.
export const RULES = Object.freeze({version:'2.6',routeDelayMs:0,intradayBuyLock:false,lotSizeUnits:1,marketDataKind:'trade',quoteFillUnits:null,referenceFillUnits:null,sellLagObservations:0,priceScale:100,quantityScale:1000,cashScale:100,maxOrderUnits:100000,baseAsset:'BTC',quoteAsset:'USD',initialUnits:5000,initialEquity:2000000,targetEquity:1600000,targetUnits:1000,feeBps:10,slippageBps:5,maxLeverage:2,maintenanceBps:2500,participationBps:null});
export function rounded(n,d){const result=Number((BigInt(n)+BigInt(d)/2n)/BigInt(d));if(!Number.isSafeInteger(result))throw Error('Calculated amount exceeds the supported integer range');return result;}
export function value(price,units,rules=RULES){
  return rounded(BigInt(price)*BigInt(units)*BigInt(rules.cashScale),BigInt(rules.priceScale)*BigInt(rules.quantityScale));
}
const active=o=>o.status==='pending'||o.status==='partial';
export function capacity(volume,bps,quantityScale=1000){
  if(!Number.isInteger(bps)||bps<1||bps>10000)throw Error('Invalid participation rate');
  const match=/^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(String(volume));
  if(!match)throw Error('Historical volume is required');
  const fraction=match[2]||'',quantity=BigInt(match[1]+fraction),scale=fraction.length-Number(match[3]||0);
  if(!Number.isSafeInteger(scale)||Math.abs(scale)>50)throw Error('Unsupported volume precision');
  const numerator=quantity*BigInt(quantityScale)*BigInt(bps)*(scale<0?10n**BigInt(-scale):1n);
  const units=numerator/((scale>0?10n**BigInt(scale):1n)*10000n);
  if(units>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Volume exceeds supported range');
  return Number(units);
}
export function makeAccount(tape,rules=RULES){
  rules={...RULES,...rules};
  if(!Number.isSafeInteger(rules.routeDelayMs)||rules.routeDelayMs<0||rules.routeDelayMs>86400000)throw Error('Invalid simulated routing delay');
  if(typeof rules.intradayBuyLock!=='boolean')throw Error('Invalid intraday resale policy');
  if(rules.intradayBuyLock&&(rules.marketDataKind!=='quote'||rules.maxLeverage!==1))throw Error('Intraday resale lock requires a funded quote account');
  if(rules.intradayBuyLock){
    for(const k of ['initialEquity','targetEquity','targetUnits'])if(!Number.isSafeInteger(rules[k])||rules[k]<0||(k==='initialEquity'&&rules[k]===0))throw Error('Invalid intraday account amount');
    const day=t=>new Date(t+8*3600000).toISOString().slice(0,10);
    if(tape.length&&tape.some(row=>day(row[0])!==day(tape[0][0])))throw Error('Intraday resale lock supports one UTC+8 trading date only');
  }
  for(const key of ['priceScale','quantityScale','cashScale','maxOrderUnits','lotSizeUnits'])if(!Number.isSafeInteger(rules[key])||rules[key]<=0)throw Error('Invalid instrument scale or order limit');
  if(!Number.isSafeInteger(rules.initialUnits)||rules.initialUnits<0||rules.initialUnits%rules.lotSizeUnits)throw Error('Initial position must use whole order lots');
  if(rules.quoteFillUnits!==null&&rules.quoteFillUnits<rules.lotSizeUnits)throw Error('Quote fill cap is below one order lot');
  if(!tape.length)throw Error('Empty market tape');
  if(!['trade','quote','reference','clearing','price'].includes(rules.marketDataKind))throw Error('Unsupported market data kind');
  if(rules.marketDataKind==='quote'){
    if(rules.participationBps!==null)throw Error('Quote sizes cannot be treated as traded volume');
    if(!Number.isSafeInteger(rules.quoteFillUnits)||rules.quoteFillUnits<=0)throw Error('Quote replay requires an explicit hypothetical fill cap');
    for(const row of tape)if(!Number.isSafeInteger(row[1])||row[1]<=0||!Number.isSafeInteger(row[4])||row[4]<row[1])throw Error('Invalid or crossed historical quote');
  }
  if(['reference','clearing','price'].includes(rules.marketDataKind)){
    for(const key of ['initialEquity','targetEquity','targetUnits'])if(!Number.isSafeInteger(rules[key])||rules[key]<0||(key==='initialEquity'&&rules[key]===0))throw Error('Invalid reference account amount: '+key);
    for(const key of ['feeBps','slippageBps','maintenanceBps'])if(!Number.isSafeInteger(rules[key])||rules[key]<0||rules[key]>10000)throw Error('Invalid reference rate: '+key);
    if(rules.participationBps!==null)throw Error('Reference prices have no executable volume');
    if(!Number.isSafeInteger(rules.referenceFillUnits)||rules.referenceFillUnits<rules.lotSizeUnits)throw Error('Reference replay requires an explicit hypothetical fill cap');
    if(![0,1].includes(rules.sellLagObservations)||(['clearing','price'].includes(rules.marketDataKind)&&rules.sellLagObservations!==0))throw Error('Unsupported reference settlement lag');
    if(rules.maxLeverage!==1)throw Error('Reference accounts must be funded and long-only');
    for(const row of tape)if(!Number.isSafeInteger(row[1])||row[1]<=0||row[3]!==null)throw Error('Invalid reference observation');
  }
  if(rules.participationBps!==null)for(const row of tape)capacity(row[3],rules.participationBps,rules.quantityScale);
  const cash=rules.initialEquity-value(tape[0][1],rules.initialUnits,rules);
  if((['reference','clearing','price'].includes(rules.marketDataKind)||rules.intradayBuyLock)&&cash<0)throw Error('Initial reference account is not fully funded');
  return {rules,cash,units:rules.initialUnits,...(rules.intradayBuyLock?{sellableUnits:rules.initialUnits}:{}),index:0,price:tape[0][1],ask:rules.marketDataKind==='quote'?tape[0][4]:null,time:tape[0][0],fees:0,orders:[],ledger:[],curve:[[tape[0][0],rules.initialEquity]],liquidated:false,done:false};
}
export function equity(s){return s.cash+value(s.price,s.units,s.rules);}
export function submit(s,order,submittedTime=s.time){
  if(!Number.isFinite(submittedTime)||submittedTime<s.time)throw Error('Invalid submission time');
  if(s.done||s.liquidated)throw Error('Account is closed to new orders');
  if(s.rules.marketDataKind==='reference'&&order.type!=='market')throw Error('Daily references do not support intraday stop orders');
  if(['clearing','price'].includes(s.rules.marketDataKind)&&order.type!=='market')throw Error('Single-price observations support market orders only');
  if(!['buy','sell'].includes(order.side)||!['market','stop'].includes(order.type)||!Number.isInteger(order.units)||order.units<=0||order.units>s.rules.maxOrderUnits||order.units%s.rules.lotSizeUnits)throw Error(`Enter whole lots of ${s.rules.lotSizeUnits/s.rules.quantityScale} ${s.rules.baseAsset}; quantity from ${s.rules.lotSizeUnits/s.rules.quantityScale} to ${s.rules.maxOrderUnits/s.rules.quantityScale} ${s.rules.baseAsset}`);
  if(order.type==='stop'&&(order.side!=='sell'||!Number.isInteger(order.stop)||order.stop<=0))throw Error('A sell stop requires a positive trigger price');
  const eligibleAt=submittedTime+s.rules.routeDelayMs;
  if(!Number.isFinite(eligibleAt)||eligibleAt>Number.MAX_SAFE_INTEGER)throw Error('Invalid order eligibility time');
  const o={...order,id:s.orders.filter(o=>!o.automatic).length+1,time:submittedTime,eligibleAt,submittedBid:s.price,submittedAsk:s.ask,afterIndex:s.index,status:'pending',filledUnits:0,fee:0};s.orders.push(o);return o;
}
export function cancel(s,id,time=s.time){
  if(s.done||!Number.isFinite(time)||time<s.time)throw Error('Cancellation is unavailable');
  const o=s.orders.find(o=>o.id===id);if(!o||!active(o)||o.automatic)throw Error('Order cannot be cancelled');
  o.cancelTime=time;o.cancelAfterIndex=s.index;o.status='cancelled';o.reason='Unfilled remainder cancelled';return o;
}
function fill(s,o,units){
  const direction=o.side==='buy'?1:-1;
  const observedPrice=s.rules.marketDataKind==='quote'&&o.side==='buy'?s.ask:s.price;
  const executionPrice=observedPrice+direction*rounded(BigInt(observedPrice)*BigInt(s.rules.slippageBps),10000);
  const gross=value(executionPrice,units,s.rules),fee=rounded(BigInt(gross)*BigInt(s.rules.feeBps),10000);
  const newUnits=s.units+direction*units,newCash=s.cash-direction*gross-fee,postEquity=newCash+value(s.price,newUnits,s.rules);
  if(o.side==='buy'&&(postEquity<=0||value(s.price,newUnits,s.rules)>s.rules.maxLeverage*postEquity)){o.status='rejected';o.reason='Remaining order exceeds exposure limit';return 0;}
  s.cash=newCash;s.units=newUnits;s.fees+=fee;o.filledUnits=(o.filledUnits||0)+units;
  if((s.rules.intradayBuyLock||(s.rules.marketDataKind==='reference'&&s.rules.sellLagObservations===1))&&o.side==='sell')s.sellableUnits-=units;
  o.status=o.filledUnits===o.units?'filled':'partial';o.fillTime=s.time;o.fillPrice=executionPrice;o.fee=(o.fee||0)+fee;
  s.ledger.push({id:o.id,side:o.side,units,time:s.time,tradeId:s.tradeId,observedPrice,executionPrice,gross,fee,cash:s.cash,equity:equity(s),automatic:!!o.automatic});return units;
}
export function step(s,tape){
  if(s.done)return;const next=s.index+1;if(next>=tape.length){finish(s);return;}
  s.index=next;[s.time,s.price,s.tradeId]=tape[next];
  if(s.rules.marketDataKind==='quote')s.ask=tape[next][4];
  if(s.rules.marketDataKind==='reference'&&s.rules.sellLagObservations===1)s.sellableUnits=s.units;
  let available=s.rules.marketDataKind==='quote'?s.rules.quoteFillUnits:['reference','clearing','price'].includes(s.rules.marketDataKind)?s.rules.referenceFillUnits:s.rules.participationBps===null?Infinity:capacity(tape[next][3],s.rules.participationBps,s.rules.quantityScale);
  const notional=value(s.price,s.units,s.rules);
  if(!s.liquidated&&s.units>0&&equity(s)*10000<=notional*s.rules.maintenanceBps){
    s.liquidated=true;
    for(const o of s.orders)if(active(o)){o.status='cancelled';o.reason='Cancelled by risk limit';}
    s.orders.push({id:'liquidation',side:'sell',units:s.units,filledUnits:0,type:'market',time:s.time,afterIndex:s.index-1,status:'pending',fee:0,automatic:true});
  }
  // FIFO shares one capacity allowance; unused fractions do not carry forward.
  for(const o of s.orders){
    if(!active(o)||s.index<=o.afterIndex||s.time<o.time)continue;
    if(o.cancelTime!==undefined&&s.index>o.cancelAfterIndex&&s.time>=o.cancelTime){o.status='cancelled';o.reason='Unfilled remainder cancelled';continue;}
    if(s.time<(o.eligibleAt??o.time))continue;
    if(o.type==='stop'&&!o.triggered){if(s.price>o.stop)continue;o.triggered=true;o.triggerTime=s.time;}
    if(available<=0)continue;
    let units=Math.min(o.units-(o.filledUnits||0),available);
    units=Math.floor(units/s.rules.lotSizeUnits)*s.rules.lotSizeUnits;
    if(units===0)continue;
    if(o.side==='sell'){
      units=Math.min(units,s.units);
      if(s.rules.intradayBuyLock&&s.units>0){units=Math.min(units,s.sellableUnits);if(units===0){o.status='rejected';o.reason='Newly bought shares cannot be resold in this single-day chapter';continue;}}
      if(s.rules.marketDataKind==='reference'&&s.rules.sellLagObservations===1&&s.units>0){units=Math.min(units,s.sellableUnits);if(units===0)continue;}
    }
    if(units===0){o.status='rejected';o.reason='No remaining '+s.rules.baseAsset;continue;}
    available-=fill(s,o,units);
    if(o.side==='sell'&&s.rules.intradayBuyLock&&s.sellableUnits===0&&s.units>0&&active(o)){o.status='rejected';o.reason='Unfilled remainder is newly bought stock, locked for this single-day chapter';}
    if(o.side==='sell'&&s.units===0&&active(o)){o.status='rejected';o.reason='Unfilled remainder exceeds position';}
  }
  s.curve.push([s.time,equity(s)]);
  if((s.liquidated&&s.units===0)||s.index===tape.length-1)finish(s);
}
export function finish(s){s.done=true;for(const o of s.orders)if(active(o)){o.status='expired';o.reason='Challenge ended with an unfilled remainder';}}
export function outcome(s){return {passed:s.done&&!s.liquidated&&equity(s)>=s.rules.targetEquity&&s.units<=s.rules.targetUnits,equity:equity(s),units:s.units,fees:s.fees,liquidated:s.liquidated};}
export function replay(tape,original,changes={},rules=RULES){
  const userOrders=original.filter(o=>!o.automatic),keys=Object.keys(changes);
  if(keys.length>2)throw Error('Only two decisions can be changed');
  for(const id of keys)if(!userOrders.some(o=>String(o.id)===id))throw Error('Unknown order');
  const s=makeAccount(tape,rules);
  s.orders=userOrders.map(o=>{const units=changes[o.id]??o.units;if(!Number.isInteger(units)||units<0||units>s.rules.maxOrderUnits||units%s.rules.lotSizeUnits)throw Error('Invalid replacement quantity');return {id:o.id,time:o.time,eligibleAt:o.time+s.rules.routeDelayMs,submittedBid:o.submittedBid,submittedAsk:o.submittedAsk,afterIndex:o.afterIndex,side:o.side,type:o.type,stop:o.stop,units,filledUnits:0,fee:0,cancelTime:o.cancelTime,cancelAfterIndex:o.cancelAfterIndex,status:units===0?'cancelled':'pending'};});
  while(!s.done)step(s,tape);return s;
}
