"""Resume bounded downloads of official IEX TOPS1.6 archives outside the checkout."""
import argparse, concurrent.futures, json, os, time, urllib.request
from pathlib import Path
from urllib.parse import urlparse, unquote

p = argparse.ArgumentParser()
p.add_argument('date', help='YYYYMMDD')
p.add_argument('output', type=Path)
a = p.parse_args()
import datetime
datetime.datetime.strptime(a.date, '%Y%m%d')
a.output.mkdir(parents=True, exist_ok=True)
index_url = 'https://iextrading.com/api/1.0/hist'
with urllib.request.urlopen(index_url, timeout=45) as response:
    index = json.load(response)
entries = [x for x in index[a.date] if x['feed'] == 'TOPS' and x['version'] == '1.6']
if len(entries) != 1:
    raise ValueError('Expected one official TOPS1.6 archive')
item = entries[0]
name = a.date + '_IEXTP1_TOPS1.6.pcap.gz'
parsed = urlparse(item['link'])
object_path = 'data/feeds/' + a.date + '/' + name
if parsed.hostname != 'www.googleapis.com' or unquote(parsed.path).split('/o/')[-1] != object_path:
    raise ValueError('Unexpected official archive location')
# Same public storage object, with byte-range support; never infer a different feed.
url = 'https://storage.googleapis.com/iex/' + object_path
size = int(item['size'])
target = a.output / name
receipt = {'indexUrl': index_url, 'officialEntry': item, 'downloadUrl': url, 'bytes': size}
(a.output / (a.date + '-download-receipt.json')).write_text(json.dumps(receipt, indent=2) + '\n')
if target.exists():
    if target.stat().st_size != size:
        raise ValueError('Existing assembled archive has incorrect size; preserve it for diagnosis')
    print('Existing complete archive; importer must verify CRC and provenance', flush=True)
    raise SystemExit(0)

def fetch(i):
    start, end = size * i // 4, size * (i + 1) // 4 - 1
    part = a.output / (name + '.range-' + str(i))
    for attempt in range(4):
        offset = part.stat().st_size if part.exists() else 0
        if offset > end - start + 1:
            raise ValueError('Oversized range file')
        if offset == end - start + 1:
            return part
        try:
            request = urllib.request.Request(url, headers={'Range': f'bytes={start+offset}-{end}'})
            with urllib.request.urlopen(request, timeout=45) as response:
                expected = f'bytes {start+offset}-{end}/{size}'
                if response.status != 206 or response.headers.get('Content-Range') != expected:
                    raise ValueError('Range response mismatch')
                with part.open('ab') as output:
                    while chunk := response.read(1024 * 1024):
                        output.write(chunk)
            if part.stat().st_size != end - start + 1:
                raise ValueError('Incomplete range')
            print(a.date, 'completed range', i, flush=True)
            return part
        except (OSError, ValueError) as error:
            print(a.date, 'range', i, 'attempt', attempt + 1, type(error).__name__, flush=True)
            if attempt == 3:
                raise
            time.sleep(min(2 ** attempt, 8))

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    parts = list(pool.map(fetch, range(4)))
staging = a.output / (name + '.assembling')
with staging.open('wb') as output:
    for part in parts:
        with part.open('rb') as source:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
if staging.stat().st_size != size:
    raise ValueError('Assembled size mismatch')
os.replace(staging, target)
print('Assembled official archive', a.date, size, flush=True)
