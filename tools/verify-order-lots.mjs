import assert from 'node:assert/strict';
import {makeAccount,submit,step,replay} from '../dist/core/engine.mjs';
// Fictional HKD fixture. This does not assert any real security's board lot or fees.
const rules={marketDataKind:'quote',priceScale:100,quantityScale:1,cashScale:100,baseAsset:'TEST',quoteAsset:'HKD',lotSizeUnits:100,initialUnits:1000,initialEquity:40000000,quoteFillUnits:150,feeBps:0,slippageBps:0};
const rows=Array.from({length:6},(_,i)=>[i*1000,35000,i+1,null,35020]);
const s=makeAccount(rows,rules);assert.throws(()=>submit(s,{side:'sell',type:'market',units:50}),/whole lots/);
submit(s,{side:'sell',type:'market',units:200});step(s,rows);assert.equal(s.ledger[0].units,100);step(s,rows);assert.equal(s.units,800);assert.equal(s.cash,12000000);
while(!s.done)step(s,rows);assert.deepEqual(replay(rows,s.orders,{},rules).ledger,s.ledger);assert.throws(()=>replay(rows,s.orders,{1:150},rules),/replacement/);
assert.throws(()=>makeAccount(rows,{...rules,initialUnits:1050}),/whole order lots/);
assert.throws(()=>makeAccount(rows,{...rules,quoteFillUnits:50}),/below one order lot/);
console.log('PASS: fictional whole-lot submission, capacity flooring, cash, replay and fractional-lot rejection.');
