from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import os
os.chdir(Path(__file__).resolve().parents[1]/'dist')
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
 def log_message(self,*args):pass
class Server(ThreadingHTTPServer):request_queue_size=128
print('Preview http://127.0.0.1:8771/',flush=True)
Server(('127.0.0.1',8771),Handler).serve_forever()
