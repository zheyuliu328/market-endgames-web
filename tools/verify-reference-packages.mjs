// Original synthetic package challenges; no production verifier helpers.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2] || process.cwd());
const {makeAccount}=await import(pathToFileURL(root+'/dist/core/engine.mjs'));
const {validateTapePackage}=await import(pathToFileURL(root+'/dist/core/tape.mjs'));
const {validateChapter}=await import(pathToFileURL(root+'/dist/core/chapters.mjs'));
const dateCoordinate=s=>Date.parse(s+'T00:00:00Z');
const dates=['2020-03-13','2020-03-16','2020-03-20'];
const rows=dates.map((d,i)=>[dateCoordinate(d),[123455,123457,124001][i],i+1,null,d,['123.455','123.457','124.001'][i]]);
const rules={marketDataKind:'reference',baseAsset:'TEST',quoteAsset:'HKD',priceScale:1000,quantityScale:100,cashScale:100,lotSizeUnits:25,initialUnits:200,initialEquity:100000,targetEquity:90000,targetUnits:0,referenceFillUnits:75,sellLagObservations:0,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null};
const instrument={symbol:'TEST',base:'TEST',quote:'HKD',venue:'Fictional reference publisher'};
const chapter={id:'synthetic-reference',title:'Synthetic date-coordinate check',date:dates[0],endDate:dates.at(-1),rows:rows.length,instrument,rules};
const hash=rr=>createHash('sha256').update(JSON.stringify(rr)).digest('hex');
function pack(){return {marketDataKind:'reference',frequency:'daily',timestampSemantics:'observation-date coordinate; not publication or quote-arrival time',schema:['dateCoordinateMs','referencePriceTicks','normalizedId','unusedVolume','observationDate','originalReferenceDecimal'],instrument:{...instrument,priceScale:1000,quantityScale:100,cashScale:100},rows:structuredClone(rows),normalizedRowsSha256:hash(rows)};}
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'passed'});}catch(e){results.push({name,status:'failed',error:e.stack});}}
async function bad(mutator,rehash=true){const d=pack(),c=structuredClone(chapter);mutator(d,c);if(rehash)d.normalizedRowsSha256=hash(d.rows);await assert.rejects(()=>validateTapePackage(c,d));}
await test('Date-only coordinates allow genuine missing days without inventing observations',async()=>{const d=pack();assert.equal(await validateTapePackage(chapter,d),d);validateChapter(chapter,rows);assert.equal(makeAccount(rows,rules).price,123455);});
await test('Wrong data kind, frequency and real-arrival timestamp claims reject',async()=>{await bad(d=>d.marketDataKind='quote');await bad(d=>d.frequency='minute');await bad(d=>d.timestampSemantics='actual quote-arrival time');});
await test('Intraday coordinate, inconsistent calendar date and duplicated date reject',async()=>{await bad(d=>d.rows[1][0]+=1000);await bad(d=>d.rows[1][4]='2020-03-15');await bad(d=>{d.rows[1][0]=d.rows[0][0];d.rows[1][4]=d.rows[0][4];});});
await test('Wrong asset/currency/scale and quote-style schema reject',async()=>{await bad(d=>d.instrument.quote='USD');await bad(d=>d.instrument.priceScale=100);await bad(d=>d.schema[0]='timestampMs');await bad(d=>d.schema[1]='bidTicks');});
await test('Invented volume and non-decimal source strings reject',async()=>{await bad(d=>d.rows[1][3]='1');await bad(d=>d.rows[1][3]=0);await bad(d=>d.rows[1][5]='NaN');await bad(d=>d.rows[1][5]='-123.457');});
await test('Bounded chapter dates, complete endpoint and sequential normalized IDs enforce',async()=>{await bad((d,c)=>delete c.endDate);await bad((d,c)=>c.endDate='2020-03-21');await bad((d,c)=>c.date='2020-03-14');await bad(d=>d.rows[1][2]=20);});
await test('Integrity tampering and non-positive normalized reference price reject',async()=>{await bad(d=>d.rows[1][1]++,false);await bad(d=>d.rows[1][1]=0);await bad(d=>d.rows[1][1]=-1);});
await test('Funded reference money cannot be NaN, infinity, fractional or unsafe',()=>{for(const initialEquity of [NaN,Infinity,100000.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>makeAccount(rows,{...rules,initialEquity}),'Invalid initial cash '+String(initialEquity));});
const receipt={status:results.every(r=>r.status==='passed')?'passed':'failed',fixturePolicy:'Original synthetic reference prices, fictional publisher, no actual market data. Checks are independent of production verification helpers.',results};console.log(JSON.stringify(receipt,null,2));if(receipt.status==='failed')process.exitCode=1;
