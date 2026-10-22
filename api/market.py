import os
import sys
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _brain.http import send_json  # noqa: E402
from _brain.market import marketplace  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        ticker = (query.get("ticker") or [None])[0]
        result = marketplace(ticker)
        send_json(self, 200 if result.get("ok") else 400, result)

    def do_POST(self):
        send_json(self, 405, {"ok": False, "reason": "get-only"})
