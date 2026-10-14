import {makeAccount,submit,step,equity,value,outcome,replay,cancel} from './engine.mjs';
import {advanceClock} from './clock.mjs';
import {validateChapter} from './chapters.mjs';

// Standalone historical account session.
// No chart receives an unrevealed record or reconstructed intrabar path.
export function createSession(chapter,tape,onChange=()=>{},contextRows=[]){
  validateChapter(chapter,tape);
  if(contextRows.some((r,i)=>!Number.isSafeInteger(r[0])||r[0]>=tape[0][0]||!Number.isSafeInteger(r[1])||r[1]<=0||!Number.isSafeInteger(r[2])||r[2]>=tape[0][2]||(chapter.rules?.marketDataKind==='quote'?(!Number.isSafeInteger(r[4])||r[4]<r[1]):['clearing','price'].includes(chapter.rules?.marketDataKind)?r[3]!==null:(!Number.isFinite(Number(r[3]))||Number(r[3])<=0))||(i&&(r[0]<contextRows[i-1][0]||r[2]!==contextRows[i-1][2]+1))))throw Error('Invalid pre-challenge context');
  const context=contextRows.map(row=>row.slice());
  const account=makeAccount(tape,chapter.rules);
  const {priceScale,quantityScale,cashScale}=account.rules;
  const instrument=chapter.instrument||{symbol:'BTCUSD',base:'BTC',quote:'USD',name:'Bitcoin / US Dollar',venue:'Kraken spot'};
  if(instrument.base!==account.rules.baseAsset||instrument.quote!==account.rules.quoteAsset)throw Error('Instrument and accounting assets disagree');
  const clock={time:account.time};
  let paused=true,pauseReason='Ready to start';
  const timed=chapter.timing?.mode==='timed',fixedSpeed=timed?chapter.timing.speed:1;
  if(!Number.isFinite(fixedSpeed)||fixedSpeed<=0)throw Error('Invalid timed challenge speed');
  let started=false;
  account.practice={version:2,mode:timed?'timed':'practice',interrupted:false,speed:fixedSpeed,compress:false,events:[{time:clock.time,observedIndex:0,action:'playback',speed:fixedSpeed,compress:false}]};
  function record(action,details={}){account.practice.events.push({time:clock.time,observedIndex:account.index,action,...details});}

  function revealed(){return context.concat(tape.slice(0,account.index+1));}
  function bars(seconds=60){
    if(!Number.isFinite(seconds)||seconds<=0)throw Error('Invalid candle interval');
    const result=[];
    const rows=revealed();
    for(let i=0;i<rows.length;i++){
      const [time,cents]=rows[i],bucket=Math.floor(time/(seconds*1000))*seconds*1000;
      let b=result.at(-1);
      const price=cents/priceScale;
      if(!b||b.time!==bucket){b={time:bucket,d:new Date(bucket).toISOString(),o:price,h:price,l:price,c:price,v:0};result.push(b);}
      b.h=Math.max(b.h,price);b.l=Math.min(b.l,price);b.c=price;
      // Display genuine observed size when present; legacy fixtures count prints.
      b.v+=account.rules.marketDataKind==='quote'?1:['clearing','price'].includes(account.rules.marketDataKind)?0:rows[i][3]===undefined?1:Number(rows[i][3]);
    }
    return result;
  }
  return {
    chapter,account,clock,bars,instrument,contextCount:context.length,startPrice:tape[0][1]/priceScale,
    points(){return revealed().map(([time,price,id,volume])=>({time,p:price/priceScale,v:account.rules.marketDataKind==='quote'?1:['clearing','price'].includes(account.rules.marketDataKind)?0:volume===undefined?1:Number(volume)}));},
    get paused(){return paused;},
    setPaused(next,reason='Paused by you'){
      if(account.done)return;
      if(timed&&started&&next&&reason==='Paused by you')throw Error('Timed mode has no manual pause');
      const changed=paused!==!!next;
      if(timed&&started&&next&&changed)account.practice.interrupted=true;
      paused=!!next;pauseReason=paused?reason:'';
      if(!paused)started=true;
      if(changed)record(paused?'pause':'resume',paused?{reason}:{});
      onChange(this);
    },
    setPlayback(speed,compress){
      if(!Number.isFinite(speed)||speed<=0)throw Error('Invalid replay speed');
      if(timed&&(speed!==fixedSpeed||compress))throw Error('Timed mode uses its fixed historical speed');
      if(account.done)return;
      if(account.practice.speed!==speed||account.practice.compress!==!!compress){
        account.practice.speed=speed;account.practice.compress=!!compress;
        record('playback',{speed,compress:!!compress});
      }
    },
    advance(seconds,speed=1,compress=false){
      if(!paused&&!account.done){
        if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid clock advance');
        this.setPlayback(speed,compress);
        advanceClock(clock,account,tape,seconds,speed,compress,step);
      }
      onChange(this);return this.snapshot();
    },
    order(side,quantity,type='market',trigger){
      if(paused)throw Error('Resume the challenge before placing an order');
      const units=Math.round(quantity*quantityScale);
      if(!Number.isFinite(quantity)||Math.abs(units/quantityScale-quantity)>1e-9)throw Error(`Use increments of ${1/quantityScale} ${instrument.base}`);
      const stop=trigger===undefined?undefined:Math.round(trigger*priceScale);
      if(trigger!==undefined&&(!Number.isFinite(trigger)||Math.abs(stop/priceScale-trigger)>1e-9))throw Error('Stop price must match the instrument price increment');
      const order=submit(account,{side,units,type,stop},clock.time);onChange(this);return order;
    },
    cancel(id){if(paused)throw Error('Resume before cancelling an order');const result=cancel(account,id,clock.time);onChange(this);return result;},
    revise(changes){if(!account.done)throw Error('Finish the challenge before revising decisions');return replay(tape,account.orders,changes,account.rules);},
    snapshot(){const eq=equity(account),mv=value(account.price,account.units,account.rules);
      let units=account.rules.initialUnits,basis=value(tape[0][1],units,account.rules);
      for(const fill of account.ledger){
        if(fill.side==='buy'){basis+=fill.gross;units+=fill.units;}
        else {basis=units?Math.round(basis*(units-fill.units)/units):0;units-=fill.units;}
      }
      const unrealized=mv-basis;
      return {
      cost:units?basis/cashScale/(units/quantityScale):0,unrealized:unrealized/cashScale,
      realized:(eq-account.rules.initialEquity-unrealized)/cashScale,
      equity:eq/cashScale,cash:account.cash/cashScale,mv:mv/cashScale,shares:account.units/quantityScale,
      price:account.price/priceScale,bid:account.price/priceScale,ask:account.ask===null?null:account.ask/priceScale,sellableShares:(account.sellableUnits??account.units)/quantityScale,marketDataKind:account.rules.marketDataKind,fees:account.fees/cashScale,returnPct:(eq/account.rules.initialEquity-1)*100,
      exposureHeadroom:Math.max(0,account.rules.maxLeverage*eq-mv)/cashScale,
      marginRatio:mv?eq/mv*100:null,time:clock.time,observedTime:account.time,
      startTime:tape[0][0],deadline:tape.at(-1)[0],pauseReason,
      done:account.done,paused,observedRecords:account.index+1,outcome:outcome(account)
    };}
  };
}

