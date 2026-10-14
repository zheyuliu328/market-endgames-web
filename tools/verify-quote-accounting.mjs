import assert from 'node:assert/strict';
import {makeAccount,submit,step,replay,equity} from '../dist/core/engine.mjs';
// Original fictional quotes: timestamp, bid ticks, record index, unused volume, ask ticks.
const tape=[[1000,125000,1,null,125020],[2000,125000,2,null,125020],[3000,125000,3,null,125020],[4000,125000,4,null,125020]];
const rules={marketDataKind:'quote',priceScale:100000,quantityScale:1,cashScale:100,baseAsset:'GBP',quoteAsset:'USD',initialUnits:0,initialEquity:100000,feeBps:0,slippageBps:0,participationBps:null,quoteFillUnits:100,maxOrderUnits:1000};
const s=makeAccount(tape,rules);submit(s,{side:'buy',type:'market',units:100});step(s,tape);
assert.equal(s.cash,87498);assert.equal(equity(s),99998); // Buy 100 GBP at 1.25020, mark at 1.25000: lose $0.02 spread.
submit(s,{side:'sell',type:'market',units:100});step(s,tape);step(s,tape);
assert.equal(s.cash,99998);assert.equal(s.units,0);assert.equal(s.ledger[0].observedPrice,125020);assert.equal(s.ledger[1].observedPrice,125000);
assert.deepEqual(replay(tape,s.orders,{},rules).ledger,s.ledger);
const fifo=makeAccount(tape,rules);submit(fifo,{side:'buy',type:'market',units:80});submit(fifo,{side:'buy',type:'market',units:80});step(fifo,tape);
assert.deepEqual(fifo.ledger.map(f=>f.units),[80,20]);
assert.throws(()=>makeAccount([[1000,125030,1,null,125020]],rules),/crossed/);
assert.throws(()=>makeAccount(tape,{...rules,participationBps:1000}),/traded volume/);
assert.throws(()=>makeAccount(tape,{...rules,quoteFillUnits:null}),/fill cap/);
console.log('PASS: bid/ask spread loss, side-specific execution, unchanged replay, shared hypothetical FIFO cap and invalid quote rejection.');
