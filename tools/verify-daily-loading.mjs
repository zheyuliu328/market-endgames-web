// Original synthetic DOM/fetch harness against the actual daily module. No app/data writes.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2] || process.cwd());
const errors=[];process.on('unhandledRejection',e=>errors.push(String(e?.message || e)));
class Element{
 constructor(id){this.id=id;this.disabled=false;this.hidden=false;this.value='5';this.children=[];this.dataset={};this.textContent='';this.open=false;}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(){}setAttribute(k,v){this[k]=v;}
 replaceChildren(...children){this.children=children;}append(...children){this.children.push(...children);}
}
function setup(){
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 globalThis.document={getElementById:el,querySelectorAll(){return [];},addEventListener(){},createElement:tag=>new Element(tag),hidden:false};
 globalThis.requestAnimationFrame=()=>0;
 const series=()=>({setData(){},applyOptions(){}}),chart=()=>({addSeries:series,timeScale(){return {fitContent(){}};}});
 globalThis.window={LightweightCharts:{createChart:chart,LineSeries:1,AreaSeries:2,LineStyle:{Dashed:1}}};
 return el;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(condition){const deadline=performance.now()+3000;while(!condition()){if(performance.now()>deadline)throw Error('Actual module initialization did not reach the synthetic fetch');await new Promise(resolve=>setTimeout(resolve,1));}}
function moduleUrl(test){const u=pathToFileURL(join(root,'dist/daily.mjs'));u.searchParams.set('syntheticRegression',test);return u.href;}
const date=s=>Date.parse(s+'T00:00:00Z');
const rows=[['2020-03-13',100,'1.00'],['2020-03-16',120,'1.20'],['2020-03-20',130,'1.30']].map(([d,p,s],i)=>[date(d),p,i+1,null,d,s]);
const instrument={symbol:'TEST',base:'TEST',quote:'HKD',name:'Original synthetic input',venue:'Fictional publisher'};
const chapter={id:'test-reference',title:'Original synthetic fixture',market:'Fixture',date:rows[0][4],endDate:rows.at(-1)[4],file:'test.json',rows:rows.length,instrument,rules:{marketDataKind:'reference',baseAsset:'TEST',quoteAsset:'HKD',priceScale:100,quantityScale:1,cashScale:100,lotSizeUnits:1,initialUnits:20,initialEquity:10000,targetEquity:9000,targetUnits:1,referenceFillUnits:5,sellLagObservations:0,feeBps:0,slippageBps:0,maxLeverage:1,participationBps:null},brief:'Synthetic fixture only.'};
const packageData={marketDataKind:'reference',frequency:'daily',timestampSemantics:'observation-date coordinate; not publication or quote-arrival time',schema:['dateCoordinateMs','referencePriceTicks','normalizedId','unusedVolume','observationDate','originalReferenceDecimal'],instrument:{...instrument,priceScale:100,quantityScale:1,cashScale:100},rows,normalizedRowsSha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
const results=[];
async function failCase(name,response){
 const el=setup(),before=errors.length;let resolveFetch,rejectFetch;
 globalThis.fetch=()=>new Promise((resolve,reject)=>{resolveFetch=resolve;rejectFetch=reject;});
 const boot=import(moduleUrl(name));await until(()=>rejectFetch && typeof el('choose').onclick==='function');
 const initialDisabled=el('choose').disabled;
 el('choose').onclick();el('start').onclick();await tick();await tick();
 const earlyPickerOpen=el('brief').open;
 if(response==='network-failure')rejectFetch(Error('Synthetic catalog request failure'));
 else resolveFetch({ok:true,json:async()=>response});
 await boot;el('choose').onclick();el('start').onclick();await tick();await tick();
 assert.equal(initialDisabled,true,'Chooser must be disabled before catalog admission');
 assert.equal(earlyPickerOpen,false,'Early interaction must not open an empty picker');
 assert.equal(el('choose').disabled,true,'Failed catalog keeps chooser disabled');
 assert.equal(el('brief').open,false,'Failed catalog must not open an empty picker');
 assert.match(el('notice').textContent,/reload|retry/i,'Recovery remains explicit');
 assert.deepEqual(errors.slice(before),[],'No unhandled missing-chapter errors');
 results.push({name,status:'passed'});
}
async function successCase(){
 const el=setup(),before=errors.length;let requests=0;
 globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>requests===1?[chapter]:packageData};};
 await import(moduleUrl('valid-catalog'));await tick();
 assert.equal(el('choose').disabled,false,'Admitted nonempty catalog enables chooser');
 assert.equal(el('choices').children.length,1,'Exactly one admitted synthetic choice');
 assert.equal(el('brief').open,true,'Admitted catalog opens the real picker');
 assert.equal(el('start').disabled,false,'Validated synthetic package enables takeover');
 assert.deepEqual(errors.slice(before),[]);
 results.push({name:'Valid catalog/package admits the picker and takeover',status:'passed'});
}
try{
 await failCase('Network failure and early click','network-failure');
 await failCase('Empty catalog and early click',[]);
 await failCase('Wrong catalog type and early click',{unexpected:true});
 await successCase();
 console.log(JSON.stringify({status:'passed',fixturePolicy:'Actual daily module; synthetic DOM, chart, catalog and package. This is an event/loading regression, not real-browser or deployment acceptance.',results},null,2));
}catch(e){console.error(JSON.stringify({status:'failed',results,error:e.stack,unhandledErrors:errors},null,2));process.exitCode=1;}
