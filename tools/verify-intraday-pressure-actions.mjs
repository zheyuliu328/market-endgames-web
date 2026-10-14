// Portable read-only event tests against the actual intraday app; original synthetic data only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||process.cwd()),results=[];
const t=Date.UTC(2020,2,16,14),rows=[[t,10000,1,null,10010],[t+100,9900,2,null,9910],[t+1000,9000,3,null,9010],[t+10000,8000,4,null,8010],[t+20000,7000,5,null,7010]];
const instrument={symbol:'TEST',base:'TEST',quote:'USD',name:'Original fixture',venue:'Synthetic source'};
const chapter={id:'original-synthetic-actions',title:'Synthetic quote action regression',date:'2020-03-16',file:'test.json',rows:rows.length,instrument,brief:'Original synthetic fixture.',rules:{marketDataKind:'quote',baseAsset:'TEST',quoteAsset:'USD',priceScale:100,quantityScale:1,cashScale:100,lotSizeUnits:1,maxOrderUnits:100,initialUnits:10,initialEquity:200000,targetEquity:0,targetUnits:10,quoteFillUnits:2,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null}};
const data={marketDataKind:'quote',instrument:{...instrument,priceScale:100,quantityScale:1,cashScale:100},schema:['timestampMs','bidTicks','normalizedId','unusedVolume','askTicks'],rows,normalizedRowsSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),source:'Original fictional quotes',sourceUrl:'https://example.invalid/fixture',sourceSha256:'0'.repeat(64),sampling:'Original synthetic source rows.',rights:{attribution:'Original synthetic fixture',terms:'https://example.invalid/fixture'}};
class Element{
 constructor(id){Object.assign(this,{id,disabled:false,hidden:false,value:'',children:[],dataset:{},textContent:'',open:false});}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(){}setAttribute(k,v){this[k]=v;}
 replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}
 querySelector(){return {disabled:false};}querySelectorAll(){return [];}
}
async function setup(name,mode='practice',autoStart=true){
 let now=0,raf;const handlers=new Map(),elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 globalThis.document={getElementById:el,querySelectorAll:()=>[],createTextNode:s=>({textContent:s}),createElement:tag=>new Element(tag),addEventListener:(event,handler)=>handlers.set(event,handler),hidden:false};
 globalThis.requestAnimationFrame=fn=>{raf=fn;return 0;};
 const series=()=>({setData(){},applyOptions(){}}),chart=()=>({addSeries:series,removeSeries(){},timeScale:()=>({fitContent(){}})});
 globalThis.window={LightweightCharts:{createChart:chart,CandlestickSeries:1,LineSeries:2,AreaSeries:3,LineStyle:{Dashed:1}}};globalThis.localStorage={setItem(){}};
 el('speed').value='12';el('attemptMode').value=mode;el('kind').value='market';el('quantity').value='2';
 let requests=0;globalThis.fetch=async()=>({ok:true,json:async()=>++requests===1?[chapter]:data});
 const u=pathToFileURL(resolve(root,'dist/app.mjs'));u.searchParams.set('independentActionAudit',name+Date.now());await import(u.href);assert.equal(el('start').disabled,false);if(autoStart)await el('start').onclick();
 return {el,setNow(value){now=value;},frame(){raf();},visibility(hidden){document.hidden=hidden;handlers.get('visibilitychange')();},record(){el('reviewBtn').onclick();return JSON.parse(el('record').textContent).original;}};
}
async function test(name,run){try{const detail=await run();results.push({name,pass:true,...(detail?{detail}:{})});}catch(e){results.push({name,pass:false,error:e.stack});}}
await test('Actual speed action flushes elapsed budget at old speed',async()=>{const s=await setup('old-speed');s.setNow(40);s.el('speed').value='60';s.el('speed').onchange();assert.equal(Number(s.el('bid').textContent),99,'40 ms at prior 12x is 480 ms, before next quote');s.setNow(60);s.el('quantity').value='2';s.el('sell').onclick();assert.equal(Number(s.el('bid').textContent),90);s.setNow(400);s.frame();const a=s.record();assert.equal(a.orders[0].time,t+1680);assert.equal(a.practice.events.find(e=>e.action==='playback'&&e.speed===60).time,t+480);});
await test('Actual cancellation flush does not cancel a fill that happened before the click',async()=>{const s=await setup('cancel-after-fill');s.setNow(10);s.el('quantity').value='2';s.el('sell').onclick();const cancelButton=s.el('orders').children[0].children.find(child=>child.textContent.startsWith('Cancel remainder'));assert.ok(cancelButton);s.setNow(100);cancelButton.onclick();assert.match(s.el('orderFeedback').textContent,/cannot be cancelled/);s.setNow(1800);s.frame();const a=s.record();assert.equal(a.orders[0].status,'filled');assert.equal(a.ledger.length,1);assert.equal(a.ledger[0].time,t+1000);});
await test('Timed app disables pause/speed/choose and routes at later actual observation',async()=>{const s=await setup('timed-route','timed');assert.equal(s.el('pause').disabled,true);assert.equal(s.el('speed').disabled,true);assert.equal(s.el('choose').disabled,true);s.setNow(50);s.el('quantity').value='2';s.el('sell').onclick();assert.match(s.el('orders').children[0].children[1].textContent,/routing 6\.0/);s.setNow(100);s.frame();assert.match(s.el('orders').children[0].children[1].textContent,/0\/2 filled/);s.setNow(900);s.frame();assert.match(s.el('orders').children[0].children[1].textContent,/2\/2 filled/);s.setNow(1800);s.frame();const a=s.record();assert.equal(a.practice.mode,'timed');assert.equal(a.rules.routeDelayMs,6000);assert.equal(a.orders[0].time,t+600);assert.equal(a.orders[0].eligibleAt,t+6600);assert.equal(a.ledger[0].time,t+10000);assert.equal(a.ledger[0].executionPrice,8000);});
await test('Hidden tab preserves route/order state and reports an assisted timed interruption',async()=>{const s=await setup('timed-hide','timed');s.setNow(50);s.el('quantity').value='2';s.el('sell').onclick();s.setNow(80);s.visibility(true);assert.equal(s.el('pause').disabled,false);assert.match(s.el('timingState').textContent,/interrupted/);s.setNow(10080);s.visibility(false);assert.equal(Number(s.el('bid').textContent),99,'Hidden interval must not advance source records');s.el('pause').onclick();s.setNow(12000);s.frame();const a=s.record();assert.equal(a.practice.interrupted,true);assert.equal(a.orders.length,1);assert.equal(a.orders[0].time,t+600);assert.ok(a.practice.events.find(e=>e.action==='pause'&&e.reason==='Tab hidden'));assert.equal(a.ledger[0].time,t+10000);});
await test('Reopening the picker before first takeover applies the selected timed mode',async()=>{const s=await setup('prestart-picker','timed',false);s.el('brief').close();s.el('choose').onclick();await s.el('start').onclick();assert.match(s.el('timingState').textContent,/Timed/);assert.equal(s.el('pause').disabled,true);});
const failed=results.filter(r=>!r.pass);console.log(JSON.stringify({method:'Actual app handlers; synthetic DOM/chart/fetch/quotes; no browser or deployment claims',results,passed:results.length-failed.length,failed:failed.length},null,2));if(failed.length)process.exitCode=1;
