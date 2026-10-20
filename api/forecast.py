import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from _brain.coach import clean_desk, facts_for  # noqa: E402
from _brain.http import read_json, send_json  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        data = read_json(self)
        if not isinstance(data, dict):
            send_json(self, 400, {"ok": False, "reason": "bad-json"})
            return
        leftover, forecast = facts_for(clean_desk(data.get("desk")))
        send_json(self, 200, {"ok": True, "leftover": leftover, "forecast": forecast})

    def do_GET(self):
        send_json(self, 200, {"ok": True, "service": "house-money-forecast", "runtime": "python"})
