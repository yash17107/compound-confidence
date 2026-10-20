import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _brain.http import read_json, send_json  # noqa: E402
from _brain.wrap import money_wrap  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = read_json(self)
        if not isinstance(data, dict):
            send_json(self, 400, {"ok": False, "reason": "bad-json"})
            return
        send_json(self, 200, money_wrap(data.get("wrap"), str(data.get("lang") or "en")))

    def do_GET(self):
        send_json(self, 405, {"ok": False, "reason": "post-only"})
