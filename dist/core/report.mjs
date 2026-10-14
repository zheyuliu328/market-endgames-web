import {compareAccounts,decisionStatus} from './review.mjs';
import {equity,outcome,replay,value} from './engine.mjs';
function formatters(r){
  const base=r.baseAsset||'BTC',quote=r.quoteAsset||'USD';
  const cashScale=r.cashScale||100,quantityScale=r.quantityScale||1000,priceScale=r.priceScale||100;
  const digits=scale=>Math.ceil(Math.log10(scale));
  const amount=(n,scale)=> (n/scale).toLocaleString('en-US',{minimumFractionDigits:digits(scale),maximumFractionDigits:digits(scale)});
  return {base,quote,money:n=>quote==='USD'?(n/cashScale).toLocaleString('en-US',{style:'currency',currency:'USD'}):amount(n,cashScale)+' '+quote,
    quantity:n=>(n/quantityScale).toFixed(digits(quantityScale))+' '+base,
    price:n=>(n/priceScale).toFixed(digits(priceScale)),units:n=>(n/quantityScale).toFixed(digits(quantityScale)),cash:n=>(n/cashScale).toFixed(digits(cashScale))};
}
const iso=time=>new Date(time).toISOString();
export function metrics(account){
  let peak=account.rules.initialEquity,maxDrawdown=0,maxDrawdownPct=0;
  for(const [,amount] of account.curve){peak=Math.max(peak,amount);maxDrawdown=Math.max(maxDrawdown,peak-amount);maxDrawdownPct=Math.max(maxDrawdownPct,peak>0?(peak-amount)/peak*100:0);}
  return {equity:equity(account),cash:account.cash,position:value(account.price,account.units,account.rules),fees:account.fees,maxDrawdown,maxDrawdownPct};
}
export function explanation(account){
  const {money:usd,quantity:btc}=formatters(account.rules);
  const result=outcome(account),shortfall=Math.max(0,account.rules.targetEquity-result.equity),excess=Math.max(0,account.units-account.rules.targetUnits);
  const reasons=[];
  if(account.liquidated)reasons.push('The maintenance threshold was breached; the risk-limit exit fails the mission.');
  if(shortfall)reasons.push('Closing equity is '+usd(shortfall)+' below the required floor.');
  if(excess)reasons.push('The closing position is '+btc(excess)+' above the permitted limit.');
  if(result.passed)reasons.push('You met both the equity floor and the closing-position limit without a risk-limit breach.');
  const pending=account.orders.filter(o=>o.status==='expired').reduce((sum,o)=>sum+o.units-(o.filledUnits||0),0);
  if(pending)reasons.push(btc(pending)+' of order quantity expired unfilled; submitting an order did not guarantee completion.');
  return reasons.join(' ');
}
export function buildReport(chapter,source,original,revised=null){
  if(!original.done)throw Error('Finish the challenge before exporting');
  if(revised&&!revised.done)throw Error('Revised account is incomplete');
  const reference=replay(source.rows,[],{},original.rules),r=original.rules;
  const {money:usd,quantity:btc,base,quote,price,units,cash}=formatters(r);
  const quotes=r.marketDataKind==='quote',clearing=r.marketDataKind==='clearing',prices=r.marketDataKind==='price';
  const authorQuotes=quotes&&r.intradayBuyLock;
  const references=r.marketDataKind==='reference',when=t=>references?iso(t).slice(0,10):prices?iso(t).slice(0,-1)+' (source clock)':iso(t);
  const lines=['MARKET ENDGAMES — DECISION REVIEW',chapter.title+' | '+chapter.date,'',
    'This is a historical practice exercise. Market observations are real; the account and execution rules are simulated.',
    '', 'MISSION',chapter.brief,
    'Starting equity: '+usd(r.initialEquity)+'; starting position: '+btc(r.initialUnits)+'.',
    'Starting cash/borrowing: '+usd(r.initialEquity-value(source.rows[0][1],r.initialUnits,r))+'.',
    'Required closing equity: '+usd(r.targetEquity)+'; maximum closing position: '+btc(r.targetUnits)+'.',
    '', 'OBSERVED MARKET DATA',source.source,source.sourceUrl,
    'Original source SHA-256: '+(source.sourceSha256||'Unavailable'),
    ...(source.sourceMemberSha256?['Original archive member SHA-256: '+source.sourceMemberSha256]:[]),
    ...(source.sourceRequestUrl?['Original source request: '+source.sourceRequestUrl]:[]),
    ...(source.sourceArchive?['Original capture: '+source.sourceArchive,'Selected source interval: '+(source.selectedWindowUTC||source.selectedWindowSourceClock||'Unreported')]:[]),
    'Observation method: '+(source.sampling||'Source record order retained'),
    ...((references||clearing||prices||authorQuotes)?[(references?'Date semantics: ':'Timestamp semantics: ')+source.timestampSemantics+'.','Transformation: '+source.transformation,...(authorQuotes?['Original first bid/ask: '+source.rows[0][5]+' / '+source.rows[0][6]+'; last: '+source.rows.at(-1)[5]+' / '+source.rows.at(-1)[6]+'. Original Parquet row IDs and source sequences are retained in the data package.']:prices?['Original first tick: '+source.rows[0][4]+' = '+source.rows[0][5]+'; original last tick: '+source.rows.at(-1)[4]+' = '+source.rows.at(-1)[5]+'. Source row IDs and actual execution prices are included in the fills below.']:['Source reference values: '+source.rows.map(row=>row[4]+' = '+row[5]).join('; ')])]:[]),
    'Interval: '+when(source.rows[0][0])+' to '+when(source.rows.at(-1)[0]),
    'Records: '+source.rows.length+(references?'; dated reference observations. There are no historical executable bid/ask, intraday prices or trade volumes.':prices?'; original single-price tick observations; quote side, executable spread and traded quantity are unreported.':clearing?'; actual five-minute market-clearing observations; no executable bid/ask quotes or traded volume.':quotes?'; observed bid/ask quotes and source row order retained. Quote counts are not traded volume.':'; source record IDs, decimal '+base+' sizes and source timestamps retained.'),
    'Normalized rows SHA-256: '+(source.normalizedRowsSha256||source.provenance?.normalizedRowsSha256||'Unavailable'),
    ...(source.context?['Pre-takeover chart context: '+source.context.rows.length+' observed source records; '+when(source.context.rows[0][0])+' to '+when(source.context.rows.at(-1)[0])+'.','Context normalized rows SHA-256: '+(source.context.normalizedRowsSha256||source.context.provenance?.normalizedRowsSha256),'Context affects charts only; account, fees and execution start at takeover.']:[]),
    ...(source.exclusions?.length?['Excluded source observations: '+source.exclusions.length+'. These records are retained in the source package with reasons; no fills occur at them.']:[]),
    '', 'EXECUTION ASSUMPTIONS',
    'Order lot: '+btc(r.lotSizeUnits)+'; executable quantities are floored to whole lots. Sub-lot capacity does not carry forward.',
    prices?'Fictional execution and marks use subsequent original source-price ticks after simulated routing. Bid/ask side is unreported; no spread or real executable liquidity is inferred. Shared fictional FIFO cap: '+btc(r.referenceFillUnits)+' per retained tick.':clearing?'Execution uses the next unseen clearing observation after the declared simulation route delay. This fictional cash-settled exposure uses '+btc(r.referenceFillUnits)+' shared FIFO per observation; no physical delivery, historical traded volume or executable liquidity is inferred.':references?'Orders use the next unseen dated reference under a fictional settlement convention; holdings use the same reference price. Hypothetical shared FIFO cap: '+btc(r.referenceFillUnits)+' per observation. No real executable liquidity is inferred.':quotes?'Execution uses subsequent ask for buys and bid for sells; long holdings are marked at bid. Hypothetical shared FIFO cap: '+btc(r.quoteFillUnits)+' per quote. Provider sizes are not used as available liquidity.':r.participationBps===null?'Participation is unlimited in this scenario; no observed-volume capacity constraint is applied.':'Participation: '+(r.participationBps/100)+'% of each observed print, shared FIFO; quantity floored to '+(1/r.quantityScale)+' '+base+', no fractional carry.',
    'Simulated routing delay: '+r.routeDelayMs+' milliseconds of historical time. User orders can fill only at subsequent source records at or after submission plus this delay. Cancellation is immediate in the model; automatic risk exits bypass the user route delay.',
    'Fee: '+r.feeBps+' bps; adverse slippage: '+r.slippageBps+' bps; gross and fee rounded per fill to '+(1/r.cashScale)+' '+quote+'.',
    'Exposure limit: '+r.maxLeverage+' times equity. Maintenance threshold: '+r.maintenanceBps/100+'% equity/exposure.',
    (clearing||prices)?'Only market orders against subsequent single-price observations are supported; no intraday stop triggers or executable quotes are inferred.':references?'Only dated market settlement is supported; no intraday stop orders. Cancel actions retain completed fills and discard only the remaining quantity.':'A triggered stop stays active. Cancel actions retain completed fills and discard only the remaining quantity.',
    ...(references?['Resale lag: '+r.sellLagObservations+' observation(s). Inherited units are eligible; newly acquired units follow this lag.']:[]),
    ...(r.intradayBuyLock?['Single-day resale policy: inherited shares are eligible. Sells reduce eligible inventory; new buys never replenish it. Newly bought shares cannot be resold during this chapter. This models the within-day consequence of T+1, without next-trading-day release or broker mechanics.']:[]),
    'A buy tranche exceeding buying power rejects the remainder rather than resizing it.',
    ...(references?['','REVEAL CONTROLS — FICTIONAL DATE STEPS','Source observations are real. Wall-clock seconds per reveal are a game setting, not historical market time. Pauses and repeated attempts are allowed.',...(original.practice?.events||[]).map(e=>when(e.time)+' | '+e.action+(e.secondsPerObservation?' | '+e.secondsPerObservation+' game seconds per observation':''))]:practiceLines(original,when)),
    '', 'ORIGINAL RESULT',...accountLines(original),explanation(original),
    '', 'NO-ORDER REFERENCE',
    'Same starting account and risk rules, with no player orders: '+usd(equity(reference))+'.',
    'Original result minus reference: '+usd(equity(original)-equity(reference))+'. This is a hindsight comparison, not evidence of trading skill.',
  ];
  if(revised)lines.push('', 'REVISED RESULT — KNOWN-HISTORY PRACTICE',...accountLines(revised),explanation(revised),
    'Revised minus original equity: '+usd(equity(revised)-equity(original))+'.',
    'Revised minus original fees: '+usd(revised.fees-original.fees)+'.',
    'Order submission and cancellation times are fixed; at most two submitted quantities can change.');
  if(revised){
    const c=compareAccounts(original,revised);
    lines.push('', 'DECISION CHANGES AND ACCOUNT BRIDGE',
      c.changed.length+' of 2 decisions changed. Original saved result is unchanged.',
      'Equity change '+usd(c.equityDelta)+' = cash change '+usd(c.cashDelta)+' + marked-position change '+usd(c.positionDelta)+'. Fees are already included in cash; do not subtract them twice.',
      'Original close: '+when(original.time)+'; revised close: '+when(revised.time)+'. Risk exits can end a path early.',
      'Changes act together, not as independent profit contributions.');
    for(const {original:o,revised:n} of c.affected)lines.push('Order #'+o.id+(o.units!==n.units?' (edited)':' (affected by earlier decisions)')+': requested '+btc(o.units)+' -> '+btc(n.units)+'; filled '+btc(o.filledUnits||0)+' -> '+btc(n.filledUnits||0)+'; '+decisionStatus(o,original)+' -> '+decisionStatus(n,revised)+'. Last fill: '+(o.fillTime===undefined?'none':when(o.fillTime))+' -> '+(n.fillTime===undefined?'none':when(n.fillTime))+'.');
  }
  for(const [label,account] of [['ORIGINAL',original],...(revised?[['REVISED',revised]]:[])]){
    lines.push('',label+' ORDERS',(references?'Observation date':prices?'Floating source time':'Time UTC')+' | ID | Side | Type | Stop '+quote+' | Requested '+base+' | Filled '+base+' | Status | Cancellation '+(references?'date':prices?'source time':'UTC')+' | Reason');
    for(const o of account.orders)lines.push([when(o.time),o.id,o.side,o.type,o.stop===undefined?'—':price(o.stop),units(o.units),units(o.filledUnits||0),decisionStatus(o,account),o.cancelTime===undefined?'—':when(o.cancelTime),o.reason||'—'].join(' | '));
    lines.push('',label+' FILLS',(references?'Observation date | Observation ID':clearing?'Interval ending UTC | Observation ID':prices?'Floating source time | Source row ID':quotes?'Time UTC | Quote record ID':'Time UTC | Trade ID')+' | Order ID | Side | '+base+' | Observed '+quote+' | Execution '+quote+' | Fee '+quote+' | Cash '+quote);
    for(const f of account.ledger)lines.push([when(f.time),f.tradeId,f.id,f.side,units(f.units),price(f.observedPrice),price(f.executionPrice),cash(f.fee),cash(f.cash)].join(' | '));
  }
  if(r.routeDelayMs||clearing||prices){
    lines.push('', 'ORDER ROUTE TIMING', 'Order ID | Submission time | Eligible no earlier than | Observed submission reference');
    for(const o of original.orders.filter(o=>!o.automatic))lines.push([o.id,when(o.time),when(o.eligibleAt??o.time),o.submittedBid===undefined?'Unavailable':price(o.submittedBid)].join(' | '));
  }
  if(clearing){
    lines.push('', 'CLEARING SOURCE FLAGS', 'Observation ID | Source line | Interval ending AEST | LASTCHANGED AEST | APC flag | Intervention | Price status');
    for(const m of source.marketRecords)lines.push([m.id,m.sourceRowLine,m.intervalEndAest,m.lastChangedAest,m.apcFlag,m.intervention,m.priceStatus].join(' | '));
  }
  lines.push('', 'LIMITATIONS',prices?'Original published FX price ticks are replayed in their floating source clock. Timezone and bid/ask side are unreported; no UTC/news alignment, executable spread or traded volume is claimed.':clearing?'Finalized five-minute clearing-price sequence, not historical executable quotes or a broker account. Continuous clock changes do not invent prices between observations.':references?'Dated reference prices with fictional next-observation settlement. No intraday quotes, release-time reconstruction, executable spread, market impact or guaranteed closing-price fills.':quotes?'One quote source and a bounded historical interval. Observed bid/ask spreads are retained, but depth, queue priority and market impact are not reconstructed. Hypothetical fills are not guaranteed executable liquidity.':'One venue and a bounded historical interval. No bid/ask, order-book depth, queue priority or player market impact is reconstructed. Historical volume is not guaranteed available liquidity.',...((references||clearing||prices||authorQuotes)?source.limitations||[]:[]),'The no-order reference may end early after a risk-limit liquidation. The report compares model outcomes, not identical unrestricted holding paths.','Game rules and targets were designed with known history. Repeated attempts are practice, not blind tests or real trading returns.',(references||clearing||prices||authorQuotes)?source.rights.attribution+' Terms: '+source.rights.terms+' . No live orders are transmitted.':'Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use: https://www.iex.io/legal/hist-data-terms . IEX observations are venue-specific, not consolidated U.S. quotes. No live orders are transmitted.');
  return lines.join('\n')+'\n';
}
function accountLines(a){const m=metrics(a),{money:usd,quantity:btc}=formatters(a.rules);return ['Outcome: '+(outcome(a).passed?'MANDATE MET':'MANDATE MISSED'),
  'Equity '+usd(m.equity)+' = cash '+usd(m.cash)+' + marked position '+usd(m.position)+'.',
  'Remaining position: '+btc(a.units)+'; total fees: '+usd(m.fees)+'.',
  'Largest observed peak-to-trough decline: '+usd(m.maxDrawdown)+'; maximum percentage drawdown: '+m.maxDrawdownPct.toFixed(2)+'%.',
  'Executed fills: '+a.ledger.length+'.'];}

function practiceLines(account,when=iso){
  const p=account.practice;
  if(!p)return ['', 'PLAYBACK', 'Playback controls were not recorded for this programmatic account.'];
  return ['', p.mode==='timed'?'PLAYBACK — TIMED CHALLENGE':'PLAYBACK — PRACTICE CONTROLS',
    p.mode==='timed'?'Fixed speed '+p.speed+'x; no manual pause or speed changes. '+(p.interrupted?'This run was interrupted and is an assisted practice result.':'No interruption was recorded. This is still known-history practice, not a competitive or blind result.'):'Pausing is allowed. This is not a competitive stopwatch result. Only observed prices can execute orders.',
    'Quiet-gap compression shortens waiting, never creates market records. Settings and pause events use historical timestamps.',
    ...p.events.map(e=>when(e.time)+' | '+e.action+(e.action==='playback'?' | '+e.speed+'x | compression '+(e.compress?'on':'off'):e.reason?' | '+e.reason:''))];
}
