import {validateChapter} from './chapters.mjs';

// Validate the downloaded package before it can replace the active session.
// Integrity checks do not establish market-data redistribution permission.
export async function validateTapePackage(chapter, data) {
  if (!data || !Array.isArray(data.rows)) throw Error('Historical package has no trade records');
  validateChapter(chapter, data.rows);
  const quotes=chapter.rules?.marketDataKind==='quote';
  const references=chapter.rules?.marketDataKind==='reference';
  const clearing=chapter.rules?.marketDataKind==='clearing',prices=chapter.rules?.marketDataKind==='price';
  if(chapter.rules?.intradayBuyLock&&(data.marketDataKind!=='quote'||data.frequency!=='original L1 snapshots'||data.timestampSemantics!=='publisher Unix-millisecond snapshot timestamp; not independently verified exchange event or first availability time'))throw Error('Original intraday stock snapshot semantics are missing');
  if(references&&(data.marketDataKind!=='reference'||data.frequency!=='daily'||data.timestampSemantics!=='observation-date coordinate; not publication or quote-arrival time'))throw Error('Daily reference semantics are missing');
  if(clearing&&(data.marketDataKind!=='clearing'||data.frequency!=='5-minute'||data.timestampSemantics!=='dispatch-interval ending time (AEST, UTC+10); not first publication or quote-arrival time'))throw Error('Intraday clearing semantics are missing');
  if(prices&&(data.marketDataKind!=='price'||data.frequency!=='tick'||data.timestampSemantics!=='floating source-clock coordinate; timezone and bid/ask side unreported'))throw Error('Source price-tick semantics are missing');
  for (const [label, block] of [['challenge', data], ['context', data.context]]) {
    if (!block) continue;
    const meta = block.provenance || block;
    const schema = block.schema || meta.schema;
    if((prices||clearing)&&block.marketDataKind!==chapter.rules.marketDataKind)throw Error(`${label}: market-data kind mismatch`);
    if(chapter.instrument){
      const i=block.instrument;
      if(!i || ['symbol','base','quote','venue'].some(k=>i[k]!==chapter.instrument[k]) || ['priceScale','quantityScale','cashScale'].some(k=>i[k]!==chapter.rules[k]))throw Error(`${label}: instrument or units mismatch`);
      if(!Array.isArray(schema)||(references?(schema[0]!=='dateCoordinateMs'||schema[1]!=='referencePriceTicks'||schema[3]!=='unusedVolume'||schema[4]!=='observationDate'||block.marketDataKind!=='reference'):clearing?(schema[0]!=='timestampMs'||schema[1]!=='clearingPriceTicks'||schema[3]!=='unusedVolume'||schema[4]!=='intervalEndAest'):prices?(schema[0]!=='sourceClockMs'||schema[1]!=='observedPriceTicks'||schema[3]!=='unusedVolume'||schema[4]!=='sourceClockLiteral'):(schema[0]!=='timestampMs'||(quotes?(schema[1]!=='bidTicks'||schema[3]!=='unusedVolume'||schema[4]!=='askTicks'||block.marketDataKind!=='quote'):(schema[1]!=='priceTicks'||schema[3]!=='volumeBaseDecimal')))))throw Error(`${label}: unsupported schema`);
    }else{
      if (!Array.isArray(schema) || schema[0] !== 'timestampMs' || schema[1] !== 'priceCents' || schema[3] !== 'volumeBTCDecimal')throw Error(`${label}: unsupported price or quantity units`);
      if (meta.pair && meta.pair !== 'XBTUSD') throw Error(`${label}: this engine requires BTC/USD`);
      if (!/Kraken.*BTC\/USD/i.test(block.source || '')) throw Error(`${label}: unsupported historical instrument`);
    }
    if (!Array.isArray(block.rows) || !block.rows.length) throw Error(`${label}: empty trade records`);
    const excluded=new Map();
    for(const item of (quotes?block.exclusions||[]:[])){
      const row=item.row;
      if(!Array.isArray(row)||!Number.isSafeInteger(row[2])||excluded.has(row[2])||!Number.isSafeInteger(row[0])||!Number.isSafeInteger(row[1])||!Number.isSafeInteger(row[4])||!(row[1]<=0||row[4]<row[1]))throw Error(`${label}: invalid exclusion record`);
      excluded.set(row[2],row);
    }
    let previous;
    for (const row of block.rows) {
      if (!Array.isArray(row) || !Number.isSafeInteger(row[0]) || !Number.isSafeInteger(row[1]) || row[1] <= 0 ||
          !Number.isSafeInteger(row[2]) || row[2] < 0 || (references?(row[3]!==null||row[4]!==new Date(row[0]).toISOString().slice(0,10)||typeof row[5]!=='string'||!/^\d+(?:\.\d+)?$/.test(row[5])):clearing?(row[3]!==null||typeof row[4]!=='string'||!/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(row[4])||Date.parse(row[4].replaceAll('/','-').replace(' ','T')+'+10:00')!==row[0]||typeof row[5]!=='string'||!/^\d+(?:\.\d+)?$/.test(row[5])):prices?(row[3]!==null||typeof row[4]!=='string'||typeof row[5]!=='string'||!/^\d+(?:\.\d+)?$/.test(row[5])):quotes?(row[3]!==null||!Number.isSafeInteger(row[4])||row[4]<row[1]):(!/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(String(row[3]))||!Number.isFinite(Number(row[3]))||Number(row[3])<=0)) ||
          (previous && (row[0] < previous[0] || (quotes?row[2]<=previous[2]:row[2] !== previous[2] + 1))))
        throw Error(`${label}: invalid trade record or broken sequence`);
      if(prices&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(row[4])||Date.parse(row[4]+'Z')!==row[0]))throw Error(`${label}: source-clock literal differs from its floating coordinate`);
      if((prices||clearing)&&Math.abs(Number(row[5])*chapter.rules.priceScale-row[1])>1e-8)throw Error(`${label}: original price literal differs from encoded price`);
      if(chapter.rules?.intradayBuyLock&&(!Number.isSafeInteger(row[7])||row[7]<0||![row[5],row[6]].every(n=>typeof n==='string'&&/^\d+(?:\.\d+)?$/.test(n))||Math.abs(Number(row[5])*chapter.rules.priceScale-row[1])>1e-8||Math.abs(Number(row[6])*chapter.rules.priceScale-row[4])>1e-8))throw Error(`${label}: original stock prices or source sequence differ from encoding`);
      if(quotes&&excluded.has(row[2]))throw Error(`${label}: excluded quote is executable`);
      if(clearing&&previous&&row[0]-previous[0]!==300000)throw Error(`${label}: clearing interval is missing or duplicated`);
      if(quotes&&previous&&row[2]-previous[2]-1>excluded.size)throw Error(`${label}: unexplained quote sequence gap`);
      if(quotes&&previous)for(let id=previous[2]+1;id<row[2];id++){
        const omitted=excluded.get(id);
        if(!omitted||omitted[0]<previous[0]||omitted[0]>row[0])throw Error(`${label}: unexplained quote sequence gap`);
      }
      previous = row;
    }
    const expected = block.normalizedRowsSha256 || meta.normalizedRowsSha256;
    if (!/^[0-9a-f]{64}$/.test(expected || '')) throw Error(`${label}: missing integrity hash`);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(block.rows)));
    const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (actual !== expected) throw Error(`${label}: historical data integrity mismatch`);
  }
  if (data.context && (data.context.rows.at(-1)[0] >= data.rows[0][0] || data.context.rows.at(-1)[2] + 1 !== data.rows[0][2]))
    throw Error('Context must end immediately before the challenge trade sequence');
  return data;
}
