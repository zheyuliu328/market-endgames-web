import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeAccount,submit,step,replay,value,equity} from '../dist/core/engine.mjs';
import {validateTapePackage} from '../dist/core/tape.mjs';
import {createSession} from '../dist/core/session.mjs';
const dir=new URL('../dist/data/',import.meta.url),chapters=JSON.parse(fs.readFileSync(new URL('chapters.json',dir)));
const results=[];
for(const c of chapters.filter(c=>c.instrument.venue==='IEX')){
 const d=JSON.parse(fs.readFileSync(new URL(c.file,dir)));await validateTapePackage(c,d);
 const s=makeAccount(d.rows,c.rules);assert.ok(s.cash>=0,'Funded initial account');
 submit(s,{side:'sell',units:90,type:'market'});while(!s.done)step(s,d.rows);
 let cash=s.rules.initialEquity-value(d.rows[0][1],s.rules.initialUnits,s.rules),held=s.rules.initialUnits;
 for(const f of s.ledger){const gross=Math.round(f.executionPrice*f.units/100);cash+=(f.side==='buy'?-gross:gross)-f.fee;held+=(f.side==='buy'?f.units:-f.units);assert.equal(cash,f.cash);}
 assert.equal(held,s.units);assert.equal(cash+Math.round(s.price*held/100),equity(s));
 assert.deepEqual(replay(d.rows,s.orders,{},c.rules).ledger,s.ledger);
 const session=createSession(c,d.rows);session.setPaused(false);session.advance(0.01,1,false);assert.equal(session.account.index,0);assert.equal(session.points().length,1,'No future quotes in chart');
 const corrupt=structuredClone(d);corrupt.rows[1][1]++;await assert.rejects(()=>validateTapePackage(c,corrupt),/integrity/);
 results.push({id:c.id,rows:c.rows,initialCash:s.rules.initialEquity-value(d.rows[0][1],s.rules.initialUnits,s.rules),immediate90ShareExitEquity:equity(s),position:s.units});
}
console.log(JSON.stringify({status:'passed',results},null,2));
