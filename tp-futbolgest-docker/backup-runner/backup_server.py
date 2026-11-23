import os
import gzip
import json
import shutil
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer

BACKUPS_DIR = "/backups"
LAST_DIR = os.path.join(BACKUPS_DIR, "last")
DB_NAME = os.environ.get("PGDATABASE", "canchas_db")
PORT = int(os.environ.get("PORT", "8080"))

os.makedirs(LAST_DIR, exist_ok=True)


def run_backup():
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    fname = f"{DB_NAME}-{ts}.sql.gz"
    tmp_sql = "/tmp/backup_dump.sql"
    out_gz = os.path.join(BACKUPS_DIR, fname)
    try:
        with open(tmp_sql, "wb") as dump_file:
            r = subprocess.run(
                ["pg_dump", "-f", tmp_sql],
                stdout=dump_file,
                stderr=subprocess.PIPE,
                timeout=600,
            )
        if r.returncode != 0:
            return {"exito": False, "error": (r.stderr or b"").decode(errors="replace")[-500:]}
        with open(tmp_sql, "rb") as fi, gzip.open(out_gz, "wb") as fo:
            shutil.copyfileobj(fi, fo)
        os.remove(tmp_sql)
        shutil.copy(out_gz, os.path.join(LAST_DIR, f"{DB_NAME}-latest.sql.gz"))
        return {
            "exito": True,
            "archivo": fname,
            "tamano_bytes": os.path.getsize(out_gz),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:  # noqa: BLE001
        return {"exito": False, "error": str(e)[:500]}


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True})
        elif self.path == "/backup":
            self._json(200, run_backup())
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/backup":
            self._json(200, run_backup())
        else:
            self._json(404, {"error": "not found"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
