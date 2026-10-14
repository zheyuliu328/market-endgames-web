// Independent synthetic acceptance using original inputs and no production verification helpers.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2] || process.cwd());
const {makeAccount,submit,step,cancel,replay,equity}=await import(pathToFileURL(root+'/dist/core/engine.mjs'));
const {compareAccounts}=await import(pathToFileURL(root+'/dist/core/review.mjs'));
const baseTime=Date.UTC(2020,2,13);
const days=n=>baseTime+n*86400000;
const tape=(prices,offsets=prices.map((_,i)=>i))=>prices.map((p,i)=>[days(offsets[i]),p,i+1,null]);
const rules=overrides=>({marketDataKind:'reference',baseAsset:'TEST',quoteAsset:'HKD',priceScale:100,quantityScale:1,cashScale:100,lotSizeUnits:1,initialUnits:20,initialEquity:10000,targetEquity:0,targetUnits:0,referenceFillUnits:5,sellLagObservations:0,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null,...overrides});
const finish=(s,rows)=>{let limit=rows.length+2;while(!s.done&&limit-->0)step(s,rows);assert.ok(s.done,'Account terminates');return s;};
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'passed'});}catch(e){results.push({name,status:'failed',error:e.stack});}}
await test('Fractional quantities and non-USD cash reconcile per fill',()=>{
 const rr=tape([123455,123457,124001,125999]);
 const s=makeAccount(rr,rules({baseAsset:'OZ',priceScale:1000,quantityScale:100,lotSizeUnits:25,initialUnits:200,initialEquity:100000,referenceFillUnits:75}));
 assert.equal(s.cash,75309);assert.equal(s.ask,null);const o=submit(s,{side:'sell',type:'market',units:200});assert.equal(s.ledger.length,0);assert.equal(s.price,123455);
 step(s,rr);assert.deepEqual([s.cash,s.units,o.filledUnits],[84568,125,75]);finish(s,rr);
 assert.deepEqual(s.ledger.map(f=>f.gross),[9259,9300,6300]);assert.deepEqual(s.ledger.map(f=>f.units),[75,75,50]);assert.equal(s.cash,100168);assert.equal(equity(s),100168);assert.equal(s.units,0);
 assert.deepEqual(replay(rr,s.orders,{},s.rules).ledger,s.ledger);
});
await test('Cent tie and fees are rounded separately at every fill',()=>{
 const rr=tape([100,101,101,101]);const s=makeAccount(rr,rules({quantityScale:100,initialUnits:100,initialEquity:200,referenceFillUnits:50,feeBps:100}));
 submit(s,{side:'sell',type:'market',units:100});finish(s,rr);
 assert.deepEqual(s.ledger.map(f=>[f.gross,f.fee]),[[51,1],[51,1]]);assert.equal(s.cash,200);assert.equal(s.fees,2);assert.equal(equity(s),200);
});
await test('Shared FIFO reference capacity and unfilled final remainder',()=>{
 const rr=tape([100,100,100,100]);const s=makeAccount(rr,rules({initialUnits:100,initialEquity:20000}));const a=submit(s,{side:'sell',type:'market',units:8}),b=submit(s,{side:'sell',type:'market',units:8});
 step(s,rr);assert.deepEqual([a.filledUnits,b.filledUnits],[5,0]);step(s,rr);assert.deepEqual([a.filledUnits,b.filledUnits],[8,2]);finish(s,rr);
 assert.deepEqual(s.ledger.map(f=>[f.id,f.units]),[[1,5],[1,3],[2,2],[2,5]]);assert.equal(s.units,85);assert.equal(s.cash,11500);assert.equal(b.status,'expired');
});
await test('Cancellation preserves partial fills and unchanged replay',()=>{
 const rr=tape([100,100,100,100]);const s=makeAccount(rr,rules());const o=submit(s,{side:'sell',type:'market',units:12});step(s,rr);cancel(s,o.id);finish(s,rr);
 assert.equal(s.ledger.length,1);assert.equal(s.units,15);assert.equal(s.cash,8500);assert.equal(o.status,'cancelled');assert.deepEqual(replay(rr,s.orders,{},s.rules).ledger,s.ledger);
 const u=makeAccount(rr,rules());const pending=submit(u,{side:'sell',type:'market',units:5});cancel(u,pending.id);finish(u,rr);assert.equal(u.ledger.length,0);assert.equal(u.units,20);
});
await test('Execution never fills before submission or invents missing date prices',()=>{
 const rr=tape([100,120,130],[0,3,7]);const s=makeAccount(rr,rules());submit(s,{side:'sell',type:'market',units:5},days(1));assert.equal(s.index,0);assert.equal(s.price,100);assert.equal(s.ledger.length,0);step(s,rr);
 assert.equal(s.ledger[0].time,days(3));assert.equal(s.ledger[0].observedPrice,120);assert.equal(s.ledger[0].gross,600);finish(s,rr);
 const future=makeAccount(rr,rules());const o=submit(future,{side:'sell',type:'market',units:5},days(8));finish(future,rr);assert.equal(future.ledger.length,0);assert.equal(o.status,'expired');
});
await test('T+1 sells inherited units first and keeps newly bought remainder pending',()=>{
 const rr=tape([10000,11000,12000,12000]);const r=rules({quoteAsset:'CNY',initialUnits:100,initialEquity:4000000,lotSizeUnits:100,referenceFillUnits:300,sellLagObservations:1});const s=makeAccount(rr,r);
 const buy=submit(s,{side:'buy',type:'market',units:100});const sell=submit(s,{side:'sell',type:'market',units:200});step(s,rr);
 assert.deepEqual(s.ledger.map(f=>[f.side,f.units,f.time]),[['buy',100,days(1)],['sell',100,days(1)]]);assert.equal(s.units,100);assert.equal(s.cash,3000000);assert.equal(sell.filledUnits,100);assert.equal(sell.status,'partial');step(s,rr);
 assert.equal(sell.filledUnits,200);assert.equal(s.units,0);assert.equal(s.cash,4200000);assert.equal(s.ledger[2].time,days(2));finish(s,rr);assert.deepEqual(replay(rr,s.orders,{},s.rules).ledger,s.ledger);
});
await test('T+1 zero eligible inventory waits rather than rejecting an owned position',()=>{
 const rr=tape([10000,11000,12000,12000]);const s=makeAccount(rr,rules({quoteAsset:'CNY',initialUnits:0,initialEquity:3000000,lotSizeUnits:100,referenceFillUnits:300,sellLagObservations:1}));submit(s,{side:'buy',type:'market',units:100});const sell=submit(s,{side:'sell',type:'market',units:100});step(s,rr);
 assert.equal(s.ledger.length,1);assert.equal(sell.filledUnits,0);assert.equal(sell.status,'pending');step(s,rr);assert.equal(sell.status,'filled');assert.equal(s.ledger[1].time,days(2));assert.equal(s.cash,3100000);finish(s,rr);
});
await test('T+1 applies across multiple sell orders in the same observation',()=>{
 const rr=tape([10000,11000,12000,12000]);const s=makeAccount(rr,rules({quoteAsset:'CNY',initialUnits:100,initialEquity:4000000,lotSizeUnits:100,referenceFillUnits:400,sellLagObservations:1}));submit(s,{side:'buy',type:'market',units:100});submit(s,{side:'sell',type:'market',units:100});const third=submit(s,{side:'sell',type:'market',units:100});step(s,rr);
 assert.deepEqual(s.ledger.map(f=>f.id),[1,2]);assert.equal(third.status,'pending');step(s,rr);assert.deepEqual(s.ledger.map(f=>f.id),[1,2,3]);assert.equal(s.cash,4200000);assert.equal(s.units,0);finish(s,rr);
});
await test('Cancelling an unsettled sale does not consume future sellable units',()=>{
 const rr=tape([10000,11000,12000,12000]);const s=makeAccount(rr,rules({quoteAsset:'CNY',initialUnits:0,initialEquity:3000000,lotSizeUnits:100,referenceFillUnits:300,sellLagObservations:1}));submit(s,{side:'buy',type:'market',units:100});const sell=submit(s,{side:'sell',type:'market',units:100});step(s,rr);cancel(s,sell.id);submit(s,{side:'sell',type:'market',units:100});finish(s,rr);
 assert.deepEqual(s.ledger.map(f=>[f.id,f.side,f.units]),[[1,'buy',100],[3,'sell',100]]);assert.equal(s.cash,3100000);assert.deepEqual(replay(rr,s.orders,{},s.rules).ledger,s.ledger);
});
await test('Changed upstream buy removes later sale availability without negative holdings',()=>{
 const rr=tape([10000,11000,12000,12000]);const s=makeAccount(rr,rules({quoteAsset:'CNY',initialUnits:0,initialEquity:3000000,lotSizeUnits:100,referenceFillUnits:300,sellLagObservations:1}));submit(s,{side:'buy',type:'market',units:100});submit(s,{side:'sell',type:'market',units:100});finish(s,rr);
 const revised=replay(rr,s.orders,{1:0},s.rules);assert.equal(revised.units,0);assert.equal(revised.cash,3000000);assert.equal(revised.ledger.length,0);assert.ok(revised.orders[1].status==='rejected'||revised.orders[1].status==='expired');assert.equal(s.ledger.length,2);
 // Same requested/fill quantities and status can still hide an economically different fill date.
 const lateTape=tape([100,110,120,130,140]);const t=makeAccount(lateTape,rules({initialUnits:1000,initialEquity:200000,referenceFillUnits:500,sellLagObservations:1,targetEquity:190000,targetUnits:100}));
 submit(t,{side:'sell',type:'market',units:1000});step(t,lateTape);step(t,lateTape);
 submit(t,{side:'buy',type:'market',units:100});submit(t,{side:'sell',type:'market',units:100});finish(t,lateTape);
 const delayed=replay(lateTape,t.orders,{1:800},t.rules),comparison=compareAccounts(t,delayed),before=t.orders.find(o=>o.id===3),after=delayed.orders.find(o=>o.id===3);
 assert.deepEqual([before.units,before.filledUnits,before.status],[after.units,after.filledUnits,after.status]);assert.equal(before.fillTime,days(4));assert.equal(after.fillTime,days(3));
 assert.deepEqual(comparison.affected.map(p=>p.original.id),[1,3]);assert.equal(comparison.equityDelta,3000);assert.equal(equity(t),216000);assert.equal(equity(delayed),219000);
});
await test('Reference requires funded long-only rules, explicit capacity and market orders',()=>{
 const rr=tape([100,101,102]);const s=makeAccount(rr,rules());assert.throws(()=>submit(s,{side:'sell',type:'stop',units:1,stop:100}));
 assert.throws(()=>makeAccount(rr,rules({referenceFillUnits:null})));assert.throws(()=>makeAccount(rr,rules({referenceFillUnits:0})));assert.throws(()=>makeAccount(rr,rules({referenceFillUnits:0.5})));assert.throws(()=>makeAccount(rr,rules({referenceFillUnits:50,lotSizeUnits:100,initialUnits:100})));assert.throws(()=>makeAccount(rr,rules({participationBps:100})));assert.throws(()=>makeAccount(rr,rules({sellLagObservations:-1})));assert.throws(()=>makeAccount(rr,rules({sellLagObservations:0.5})));assert.throws(()=>makeAccount(rr,rules({initialUnits:20000,initialEquity:10000})));assert.throws(()=>makeAccount(rr,rules({maxLeverage:2})));
});
await test('Legacy quote spread, FIFO cap and legacy trade accounting remain unchanged',()=>{
 const qr=[[1000,125000,1,null,125020],[2000,125000,2,null,125020],[3000,125000,3,null,125020],[4000,125000,4,null,125020]];const q=makeAccount(qr,{marketDataKind:'quote',priceScale:100000,quantityScale:1,cashScale:100,baseAsset:'GBP',quoteAsset:'USD',initialUnits:0,initialEquity:100000,feeBps:0,slippageBps:0,participationBps:null,quoteFillUnits:100,maxOrderUnits:1000});submit(q,{side:'buy',type:'market',units:100});step(q,qr);assert.equal(q.cash,87498);assert.equal(equity(q),99998);submit(q,{side:'sell',type:'market',units:100});finish(q,qr);assert.equal(q.cash,99998);assert.deepEqual(replay(qr,q.orders,{},q.rules).ledger,q.ledger);
 const tr=[[1000,10000,1,'1'],[2000,11000,2,'1'],[3000,12000,3,'1']];const r=makeAccount(tr,{marketDataKind:'trade',priceScale:100,quantityScale:1,cashScale:100,baseAsset:'TEST',quoteAsset:'USD',initialUnits:2,initialEquity:30000,feeBps:0,slippageBps:0,participationBps:null,maxLeverage:1,targetEquity:0,targetUnits:0});submit(r,{side:'sell',type:'market',units:1});finish(r,tr);assert.equal(r.cash,21000);assert.equal(r.units,1);assert.equal(equity(r),33000);
});
const receipt={status:results.every(t=>t.status==='passed')?'passed':'failed',fixturePolicy:'Original synthetic inputs only; no source-market history or provider material. Expected money amounts are hand-worked constants independent of engine value().',results};
console.log(JSON.stringify(receipt,null,2));
if(receipt.status!=='passed')process.exitCode=1;
