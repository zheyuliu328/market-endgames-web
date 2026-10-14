"""Decode an immutable IEX TOPS1.6 PCAPNG capture; never reconstruct missing prices."""
import argparse,gzip,struct,json,hashlib,datetime,collections
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path)
p.add_argument('--date',default='2020-03-16');p.add_argument('--start',default='14:00');p.add_argument('--minutes',type=int,default=30);a=p.parse_args()
if not 1<=a.minutes<=120:raise ValueError('Selected interval must be 1–120 minutes')
window=datetime.datetime.strptime(a.date+' '+a.start,'%Y-%m-%d %H:%M').replace(tzinfo=datetime.timezone.utc)
symbols={'SPY','QQQ','AAPL'};required={'SPY','QQQ'};selected={s:[] for s in symbols};stats=collections.Counter();state={};transitions=[];seq={};interfaces=[];seen={};errors=[]
start=int(window.timestamp())*10**9;end=start+a.minutes*60*10**9
last={};last_seen={};system_events=[];quality={}
with gzip.open(a.source,'rb') as f:
 while head:=f.read(8):
  if len(head)!=8:raise ValueError('Truncated block header')
  typ,size=struct.unpack('<II',head)
  if size<12 or size>16*1024*1024 or size%4:raise ValueError('Invalid PCAPNG block')
  body=f.read(size-8)
  if len(body)!=size-8 or struct.unpack_from('<I',body,len(body)-4)[0]!=size:raise ValueError('Truncated block')
  if typ==0x0a0d0d0a:
   if body[:4]!=bytes.fromhex('4d3c2b1a'):raise ValueError('Unsupported PCAPNG endian')
   interfaces=[];continue
  if typ==1:interfaces.append(struct.unpack_from('<H',body)[0]);continue
  if typ!=6:continue
  if len(body)<24:raise ValueError('Short enhanced packet block')
  interface,hi,lo,cap,orig=struct.unpack_from('<IIIII',body)
  if interface>=len(interfaces) or cap>len(body)-24:raise ValueError('Invalid capture bounds')
  if interfaces[interface]!=1 or cap!=orig:raise ValueError('Unsupported link or truncated capture')
  frame=body[20:20+cap];stats['packets']+=1
  if len(frame)<14:raise ValueError('Short Ethernet frame')
  off=14;eth=struct.unpack_from('>H',frame,12)[0]
  while eth in (0x8100,0x88a8):eth=struct.unpack_from('>H',frame,off+2)[0];off+=4
  if eth!=0x0800:continue
  if len(frame)<off+20:raise ValueError('Short IPv4 packet')
  ihl=(frame[off]&15)*4
  if ihl<20 or len(frame)<off+ihl+8:raise ValueError('Invalid IPv4 header')
  if frame[off]>>4!=4 or frame[off+9]!=17:continue
  if struct.unpack_from('>H',frame,off+6)[0]&0x3fff:raise ValueError('Fragmented UDP')
  iplen=struct.unpack_from('>H',frame,off+2)[0];u=off+ihl;ul=struct.unpack_from('>H',frame,u+4)[0]
  if ul<8 or u+ul>len(frame) or ul+ihl!=iplen:raise ValueError('Bad UDP length')
  data=frame[u+8:u+ul]
  if len(data)<40:continue
  ver,res,proto,channel,session,plen,count,offset,first,send=struct.unpack_from('<BBHIIHHqqq',data)
  if (ver,proto,channel)!=(1,0x8003,1):raise ValueError('Wrong feed protocol')
  if plen!=len(data)-40:raise ValueError('Payload length mismatch')
  key=(channel,session)
  if count:
   expected=seq.get(key)
   if expected is None and (first,offset)!=(1,0):raise ValueError('Capture lacks start of stream')
   if expected and (first,offset)!=expected:raise ValueError(f'Sequence/offset gap {expected} -> {(first,offset)}')
   seq[key]=(first+count,offset+plen)
  pos=40
  for i in range(count):
   if pos+2>len(data):raise ValueError('Missing message length')
   n=struct.unpack_from('<H',data,pos)[0];pos+=2;msg=data[pos:pos+n];pos+=n
   if n<1 or len(msg)!=n:raise ValueError('Bad message length')
   kind=chr(msg[0]);stats[kind]+=1
   sizes={'Q':42,'H':22,'O':18,'T':38,'B':38,'S':10}
   if kind in sizes and n!=sizes[kind]:raise ValueError('Wrong '+kind+' message length')
   if kind=='S':system_events.append({'event':chr(msg[1]),'sendNs':str(send)});continue
   if kind not in ('Q','H','O','T','B'):continue
   sym=msg[10:18].decode('ascii').strip()
   if sym not in symbols:continue
   if kind=='H':
    state[(sym,'trade')]=chr(msg[1]);transitions.append({'symbol':sym,'kind':'H','status':chr(msg[1]),'sendNs':str(send)});continue
   if kind=='O':
    state[(sym,'op')]=chr(msg[1]);transitions.append({'symbol':sym,'kind':'O','status':chr(msg[1]),'sendNs':str(send)});continue
   if kind=='Q':
    if n!=42:raise ValueError('Wrong quote length')
    _,flags,event,s,bs,bid,ask,az=struct.unpack('<BBq8sIqqI',msg)
    if send<last_seen.get(sym,0):raise ValueError('Backwards quote availability time')
    last_seen[sym]=send
    if not start<=send<end:continue
    stats[sym+'_window_quotes']+=1
    reason='extended' if flags&0x40 else 'unavailable' if flags&0x80 else 'one_sided' if bs==0 or az==0 or bid<=0 or ask<=0 else 'crossed' if ask<bid else 'not_trading' if state.get((sym,'trade'))!='T' else 'operational_halt' if state.get((sym,'op'))!='N' else None
    if reason:stats[sym+'_'+reason]+=1;continue
    if send<last.get(sym,0):raise ValueError('Backwards availability time')
    # Keep the first actual usable quote at least 1s after the previous retained quote.
    if send-last.get(sym,0)<10**9:continue
    last[sym]=send
    selected[sym].append([(send+999999)//1000000,bid,len(selected[sym])+1,None,ask,str(event),str(send),first+i,bs,az])
  if pos!=len(data):raise ValueError('Message count mismatch')
  if stats['packets']%1000000==0:print('decoded packets',stats['packets'],flush=True)
if not any(e['event']=='O' for e in system_events) or not any(e['event']=='C' for e in system_events):raise ValueError('Capture lacks full-day system events')
sha=hashlib.file_digest(a.source.open('rb'),'sha256').hexdigest();
diagnostic={'stats':dict(stats),'retained':{sym:{'count':len(rows),'first':rows[0][0] if rows else None,'last':rows[-1][0] if rows else None,'maxGapMs':max((y[0]-x[0] for x,y in zip(rows,rows[1:])),default=None)} for sym,rows in selected.items()},'statusTransitions':transitions,'sessions':[list(k) for k in seq],'systemEvents':system_events,'admitted':False}
a.output.with_suffix('.diagnostic.json').write_text(json.dumps(diagnostic,indent=2))
print(json.dumps(diagnostic['retained']),flush=True)
if a.output.exists():raise ValueError('Output already exists; use a fresh staging directory')
for sym,rows in selected.items():
 if sym not in required:continue
 if len(rows)<1000 or rows[0][0]-start//1000000>10000 or end//1000000-rows[-1][0]>10000:raise ValueError('Insufficient event coverage: '+sym)
a.output.mkdir(parents=True)
for sym,rows in selected.items():
 if sym not in required:continue
 if len(rows)<1000 or rows[0][0]-start//1000000>10000 or end//1000000-rows[-1][0]>10000:raise ValueError('Insufficient event coverage: '+sym)
 quality[sym]={'retained':len(rows),'firstMs':rows[0][0],'lastMs':rows[-1][0],'maxGapMs':max(y[0]-x[0] for x,y in zip(rows,rows[1:]))}
 out={'source':'IEX HIST TOPS1.6 '+sym+' venue quotes; first eligible quote per >=1s interval','sourceUrl':'https://iextrading.com/trading/market-data/','sourceArchive':a.source.name,'selectedWindowUTC':window.isoformat()+' / '+datetime.datetime.fromtimestamp(end//10**9,datetime.timezone.utc).isoformat(),'sourceSha256':sha,'marketDataKind':'quote','schema':['timestampMs','bidTicks','normalizedId','unusedVolume','askTicks','eventTimestampNs','availabilitySendTimestampNs','sourceSequence','bidSize','askSize'],'rows':rows,'normalizedRowsSha256':hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest(),'instrument':{'symbol':sym,'base':sym,'quote':'USD','venue':'IEX','priceScale':10000,'quantityScale':1,'cashScale':100},'rights':{'source':'IEX HIST','terms':'https://www.iex.io/legal/hist-data-terms','attribution':'Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.'},'sampling':'First usable regular-session two-sided quote >=1s after prior retained quote; availability is IEX transport send time rounded upward to ms. Event ns and transport sequence retained. No interpolation. Observed sizes are informational, not simulated fill capacity.'}
 (a.output/(sym+'.json')).write_text(json.dumps(out,separators=(',',':')))
 print(sym,len(rows),'max gap ms',max(y[0]-x[0] for x,y in zip(rows,rows[1:])),flush=True)
(a.output/'intake-validation.json').write_text(json.dumps({'sourceSha256':sha,'sourceBytes':a.source.stat().st_size,'admittedSymbols':sorted(required),'excludedSymbols':{'AAPL':'Not admitted in this SPY/QQQ release. Observed coverage remains in the diagnostic file.'},'stats':dict(stats),'statusTransitions':transitions,'systemEvents':system_events,'selectedQuality':quality,'priceBasis':'Quote-only. No trade tape, trade-volume bars or trade-derived OHLC. Trade breaks do not change the quoted-price series.','sequenceContinuity':'passed','gzipCRC':'passed','selectedWindowUTC':window.isoformat()+' / '+datetime.datetime.fromtimestamp(end//10**9,datetime.timezone.utc).isoformat()},indent=2))
