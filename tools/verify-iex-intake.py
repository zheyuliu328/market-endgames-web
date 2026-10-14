import struct as s,gzip,pathlib,subprocess,json,datetime,sys,tempfile
root=pathlib.Path(tempfile.mkdtemp(prefix='iex-independent-audit-'))
parser=str(pathlib.Path(__file__).with_name('import-iex.py'))
start=int(datetime.datetime(2020,3,16,14,tzinfo=datetime.timezone.utc).timestamp())*10**9
symbols=['SPY','QQQ','AAPL']
def block(t,b):
 b+=b'\0'*((-len(b))%4);n=len(b)+12
 return s.pack('<II',t,n)+b+s.pack('<I',n)
def fixture(mode):
 result=bytearray(block(0x0a0d0d0a,s.pack('<IHHq',0x1a2b3c4d,1,0,-1))+block(1,s.pack('<HHI',1,0,65535)))
 seq=9 if mode=='missing_start' else 1;offset=0
 def packet(msgs,ts,seqdelta=0):
  nonlocal seq,offset
  payload=b''.join(s.pack('<H',len(m))+m for m in msgs)
  data=s.pack('<BBHIIHHqqq',1,0,0x8003,1,123,len(payload),len(msgs),offset,seq+seqdelta,ts)+payload
  udp=s.pack('>HHHH',16641,16641,len(data)+8,0)+data
  ip=s.pack('>BBHHHBBHII',0x45,0,20+len(udp),0,0,64,17,0,0x7f000001,0x7f000001)+udp
  frame=b'\0'*12+s.pack('>H',0x800)+ip
  result.extend(block(6,s.pack('<IIIII',0,0,0,len(frame),len(frame))+frame))
  seq+=len(msgs);offset+=len(payload)
 packet([s.pack('<BBq',83,79,start-10**9)],start-10**9)
 for sym in symbols:
  sy=sym.encode().ljust(8,b' ')
  packet([s.pack('<BBq8s4s',72,84,start-1,sy,b'    ')],start-1)
  if not(mode=='missing_op' and sym=='SPY'):packet([s.pack('<BBq8s',79,78,start-1,sy)],start-1)
 for second in range(1800):
  ts=start+second*10**9+123456
  if mode=='backward_quote' and second==20:ts-=2*10**9
  if mode=='status_halt' and second in (10,20):packet([s.pack('<BBq8s4s',72,72 if second==10 else 84,ts,b'SPY     ',b'NA  ')],ts)
  msgs=[]
  for ix,sym in enumerate(symbols):
   flags=0;bs=100+ix;az=200+ix;bid=2000000+second*100+ix;ask=bid+200
   if mode=='exclusions' and sym=='SPY':
    if second==10:flags=0x80
    if second==11:flags=0x40
    if second==12:bs=0
    if second==13:az=0
    if second==14:ask=bid-1
   msgs.append(s.pack('<BBq8sIqqI',81,flags,ts-123456,sym.encode().ljust(8,b' '),bs,bid,ask,az))
  packet(msgs,ts,1 if mode=='sequence_gap' and second==5 else 0)
 if mode!='missing_end':packet([s.pack('<BBq',83,67,start+1800*10**9)],start+1800*10**9)
 if mode=='truncated':result=result[:-7]
 if mode=='bad_endian':result[8:12]=bytes.fromhex('1a2b3c4d')
 path=root/(mode+'.pcapng.gz')
 with gzip.open(path,'wb') as f:f.write(result)
 return path
results={}
for mode in ['valid','exclusions','missing_op','sequence_gap','truncated','bad_endian','missing_start','missing_end','backward_quote','status_halt']:
 src=fixture(mode);out=root/mode
 cp=subprocess.run([sys.executable,parser,str(src),str(out)],capture_output=True,text=True)
 item={'exit':cp.returncode,'tail':cp.stderr.strip().splitlines()[-1:]}
 if cp.returncode==0:
  rows=json.loads((out/'SPY.json').read_text())['rows'];item.update(count=len(rows),first=rows[0],last=rows[-1])
  assert rows[0]==[1584367200001,2000000,1,None,2000200,'1584367200000000000','1584367200000123456',8,100,200]
  assert len(rows)==(1795 if mode=='exclusions' else 1790 if mode=='status_halt' else 1800)
  if mode=='exclusions':assert max(b[0]-a[0] for a,b in zip(rows,rows[1:]))==6000
 else: assert mode not in ('valid','exclusions','status_halt'),cp.stderr
 results[mode]=item
(root/'results.json').write_text(json.dumps(results,indent=2));print('PASS: ten independent PCAPNG cases; known prices/sizes/times, halt/resume, genuine gaps and malformed-feed rejection. Evidence: '+str(root))
