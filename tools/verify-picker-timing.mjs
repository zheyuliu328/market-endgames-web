// Original synthetic quote/catalog/DOM fixtures only. Event regression against the actual app.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||process.cwd()),t=Date.UTC(2020,2,16,1,30),results=[];
const rows=[[t,1000,1,null,1001],[t+5000,1001,2,null,1002],[t+10000,1002,3,null,1003]];
const instrument={symbol:'TEST',base:'TEST',quote:'USD',venue:'Original synthetic fixture'};
const rules={marketDataKind:'quote',baseAsset:'TEST',quoteAsset:'USD',priceScale:100,quantityScale:1,cashScale:100,lotSizeUnits:1,maxOrderUnits:100,initialUnits:10,initialEquity:20000,targetEquity:0,targetUnits:10,quoteFillUnits:2,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null};
const chapter=(id,title,speed,delay)=>({id,title,file:id+'.json',date:'2020-03-16',rows:rows.length,instrument,rules,brief:title+' — original synthetic briefing.',timedSpeed:speed,timedRouteDelayMs:delay});
const catalog=[chapter('original-fast','Original fast challenge',12,6000),chapter('other-fast','Other fast preview',12,6000),chapter('other-slow','Other slow preview',60,60000)];
const data={marketDataKind:'quote',schema:['timestampMs','bidTicks','normalizedId','unusedVolume','askTicks'],instrument:{...instrument,priceScale:100,quantityScale:1,cashScale:100},rows,normalizedRowsSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),source:'Original synthetic quotes',sourceSha256:'0'.repeat(64),sampling:'Original fixture records only.',rights:{attribution:'Original synthetic fixture',terms:'https://example.invalid/fixture'}};
class Element{
 constructor(id){Object.assign(this,{id,disabled:false,hidden:false,value:'',children:[],dataset:{},textContent:'',open:false,handlers:new Map()});}
 get value(){return this._value||'';}set value(v){this._value=String(v);}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(event,handler){this.handlers.set(event,handler);}setAttribute(k,v){this[k]=v;}
 replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}
 querySelector(){return {disabled:false};}querySelectorAll(){return [];}
 cancel(){this.handlers.get('cancel')?.();this.open=false;}
}
async function run(path){
 let now=0,raf;const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 globalThis.document={getElementById:el,querySelectorAll:()=>[],createTextNode:s=>({textContent:s}),createElement:tag=>new Element(tag),addEventListener(){},hidden:false};globalThis.requestAnimationFrame=fn=>{raf=fn;return 0;};globalThis.localStorage={setItem(){}};
 const series=()=>({setData(){}}),chart=()=>({addSeries:series,removeSeries(){},timeScale:()=>({fitContent(){}})});globalThis.window={LightweightCharts:{createChart:chart,CandlestickSeries:1,LineSeries:2,AreaSeries:3,LineStyle:{Dashed:1},LineType:{WithSteps:1}}};
 el('speed').value='12';el('attemptMode').value='timed';el('kind').value='market';globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('chapters.json')?catalog:data});
 const u=pathToFileURL(resolve(root,'dist/app.mjs'));u.searchParams.set('originalSyntheticTimingRestore',path+Date.now());await import(u.href);assert.equal(el('start').textContent,'Take over the account','Fixture instrument and rules must be admitted');await el('start').onclick();now=900;raf();assert.equal(el('reviewBtn').disabled,false,'Original timed fixture must finish');assert.equal(el('pause').textContent,'Settled');
 el('reviewBtn').onclick();const originalRecord=el('record').textContent;assert.equal(JSON.parse(originalRecord).original.practice.speed,12);el('review').close();
 el('choose').onclick();await el('choices').children[1].onclick();await el('choices').children[2].onclick();
 assert.match(el('timingHelp').textContent,/Fixed 60×/);assert.match(el('timingHelp').textContent,/routing: 60 historical seconds/);
 if(path==='return-button')el('backToAccount').onclick();else el('brief').cancel();
 assert.match(el('timingHelp').textContent,/Fixed 12×/,'Restoration must refresh timing immediately');assert.match(el('timingHelp').textContent,/routing: 6 historical seconds/);
 el('reviewBtn').onclick();assert.equal(el('record').textContent,originalRecord,'Restoration preserves the original completed account');el('review').close();
 el('choose').onclick();assert.equal(el('choices').children[0]['aria-pressed'],'true');assert.ok(el('briefDetails').children.some(c=>c.textContent===catalog[0].brief));assert.match(el('timingHelp').textContent,/Fixed 12×/);assert.match(el('timingHelp').textContent,/routing: 6 historical seconds/);
 return {path,pass:true,restoredTiming:el('timingHelp').textContent,originalAccountPreserved:true,originalSelectionAndBriefRestored:true};
}
for(const path of ['return-button','escape-cancel']){try{results.push(await run(path));}catch(e){results.push({path,pass:false,error:e.stack});}}
const failed=results.filter(r=>!r.pass);console.log(JSON.stringify({method:'Actual app handlers with original synthetic multi-chapter fixtures; no real-browser/numerical/source or release claims',results,passed:results.length-failed.length,failed:failed.length},null,2));if(failed.length)process.exitCode=1;
