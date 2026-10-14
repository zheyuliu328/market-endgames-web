// Original synthetic DOM, chart and quote fixtures. Imports the actual app module.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||process.cwd());
const unhandled=[];process.on('unhandledRejection',e=>unhandled.push(String(e?.message||e)));
class Element{
 constructor(id){Object.assign(this,{id,disabled:false,hidden:false,value:'',children:[],dataset:{},textContent:'',open:false});}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(){}setAttribute(k,v){this[k]=v;}
 replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}
 querySelector(){return {disabled:false};}querySelectorAll(){return [];}
}
let wallNow=0,raf;
const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
Object.defineProperty(globalThis,'performance',{value:{now:()=>wallNow},configurable:true});
globalThis.document={getElementById:el,querySelectorAll:()=>[],createTextNode:s=>({textContent:s}),createElement:tag=>new Element(tag),addEventListener(){},hidden:false};
globalThis.requestAnimationFrame=fn=>{raf=fn;return 0;};
const series=()=>({setData(){},applyOptions(){}}),chart=()=>({addSeries:series,removeSeries(){},timeScale:()=>({fitContent(){}})});
globalThis.window={LightweightCharts:{createChart:chart,CandlestickSeries:1,LineSeries:2,AreaSeries:3,LineStyle:{Dashed:1}}};
globalThis.localStorage={setItem(){}};
el('speed').value='12';el('attemptMode').value='practice';el('kind').value='market';el('quantity').value='2';
const t=Date.UTC(2020,2,16,14),rows=[[t,10000,1,null,10010],[t+100,9900,2,null,9910],[t+1000,9000,3,null,9010],[t+10000,8000,4,null,8010],[t+20000,7000,5,null,7010]];
const instrument={symbol:'TEST',base:'TEST',quote:'USD',name:'Original fixture',venue:'Synthetic source'};
const chapter={id:'original-synthetic-actions',title:'Synthetic quote action regression',date:'2020-03-16',file:'test.json',rows:rows.length,instrument,brief:'Original synthetic fixture.',rules:{marketDataKind:'quote',baseAsset:'TEST',quoteAsset:'USD',priceScale:100,quantityScale:1,cashScale:100,lotSizeUnits:1,maxOrderUnits:100,initialUnits:10,initialEquity:200000,targetEquity:0,targetUnits:10,quoteFillUnits:2,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null}};
const data={marketDataKind:'quote',instrument:{...instrument,priceScale:100,quantityScale:1,cashScale:100},schema:['timestampMs','bidTicks','normalizedId','unusedVolume','askTicks'],rows,normalizedRowsSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),source:'Original fictional quotes',sourceUrl:'https://example.invalid/fixture',sourceSha256:'0'.repeat(64),sampling:'Original synthetic source rows.',rights:{attribution:'Original synthetic fixture',terms:'https://example.invalid/fixture'}};
let requests=0;globalThis.fetch=async()=>({ok:true,json:async()=>++requests===1?[chapter]:data});
const u=pathToFileURL(resolve(root,'dist/app.mjs'));u.searchParams.set('independentActionAudit',String(Date.now()));
await import(u.href);
assert.equal(el('start').disabled,false);await el('start').onclick();
wallNow=50;el('quantity').value='2';el('sell').onclick();
assert.equal(el('clock').textContent,'14:00:00');assert.equal(Number(el('bid').textContent),99,'Pre-click sync reveals the prior actual jump');
assert.equal(el('orders').children.length,1);assert.match(el('orders').children[0].children[1].textContent,/0\/2 filled/);
wallNow=80;el('choose').onclick();
assert.equal(el('start').textContent,'Resume current account');
const before={orderCount:el('orders').children.length,order:el('orders').children[0].children[1].textContent,bid:el('bid').textContent,equity:el('equity').textContent};
await el('start').onclick();
const after={orderCount:el('orders').children.length,order:el('orders').children[0]?.children[1].textContent,bid:el('bid').textContent,equity:el('equity').textContent};
const preserved=JSON.stringify(before)===JSON.stringify(after);
console.log(JSON.stringify({method:'Actual app event handlers with original synthetic DOM/chart/quote fixture; not browser acceptance',preClickFlushPassed:true,practiceResume:{before,after,preserved},unhandledErrors:unhandled},null,2));
assert.equal(preserved,true,'Resume current account must retain its orders, revealed quote and accounting state');
