"""Local Python coach for Vite. Loads .env.local and serves /api/coach and /api/forecast."""

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "api"
sys.path.insert(0, str(API))

from coach import handler as Coach  # noqa: E402
from forecast import handler as Forecast  # noqa: E402


def load_env():
    for name in (".env.local", ".env"):
        path = ROOT / name
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env()


class Router(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))

    def do_POST(self):
        if self.path.startswith("/api/coach"):
            Coach.do_POST(self)
            return
        if self.path.startswith("/api/forecast"):
            Forecast.do_POST(self)
            return
        self.send_error(404)

    def do_GET(self):
        if self.path.startswith("/api/forecast"):
            Forecast.do_GET(self)
            return
        if self.path.startswith("/api/coach"):
            Coach.do_GET(self)
            return
        self.send_error(404)


if __name__ == "__main__":
    port = int(os.environ.get("HOUSE_MONEY_API_PORT", "8787"))
    HTTPServer(("127.0.0.1", port), Router).serve_forever()
