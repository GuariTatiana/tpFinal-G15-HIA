import os
import gzip
import json
import shutil
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

BACKUPS_DIR = "/backups"
LAST_DIR = os.path.join(BACKUPS_DIR, "last")
DB_NAME = os.environ.get("PGDATABASE", "canchas_db")
TEST_DB = os.environ.get("RESTORE_TEST_DB", "restore_test")
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


def psql_scalar(sql, db):
    try:
        r = subprocess.run(
            ["psql", "-d", db, "-At", "-c", sql],
            capture_output=True, text=True, timeout=180,
        )
        if r.returncode != 0:
            return None
        return r.stdout.strip()
    except Exception:  # noqa: BLE001
        return None


def _drop_test_db():
    subprocess.run(
        ["psql", "-d", "postgres", "-c", f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)"],
        capture_output=True, timeout=60,
    )


def _resolve_backup(archivo):
    if archivo:
        for base in (BACKUPS_DIR, LAST_DIR):
            p = os.path.join(base, archivo)
            if os.path.exists(p):
                return p
        return None
    latest = os.path.join(LAST_DIR, f"{DB_NAME}-latest.sql.gz")
    if os.path.exists(latest):
        return latest
    try:
        cands = sorted(f for f in os.listdir(BACKUPS_DIR) if f.endswith(".sql.gz"))
    except OSError:
        cands = []
    return os.path.join(BACKUPS_DIR, cands[-1]) if cands else None


def run_restore_test(archivo=None):
    gz_path = _resolve_backup(archivo)
    if not gz_path or not os.path.exists(gz_path):
        return {"exito": False, "error": "no se encontro archivo de backup"}

    try:
        _drop_test_db()
        c = subprocess.run(
            ["psql", "-d", "postgres", "-c", f"CREATE DATABASE {TEST_DB}"],
            capture_output=True, text=True, timeout=60,
        )
        if c.returncode != 0:
            return {"exito": False, "error": "no se pudo crear BD temporal: " + (c.stderr or "")[-300:]}

        cmd = f"zcat {gz_path} | psql -d {TEST_DB} -v ON_ERROR_STOP=1 -q"
        r = subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.PIPE, timeout=900)
        if r.returncode != 0:
            err = r.stderr.decode(errors="replace")[-800:] if r.stderr else "error desconocido"
            return {"exito": False, "error": "restore fallo: " + err,
                    "archivo": os.path.basename(gz_path)}

        tbl_out = psql_scalar(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
            TEST_DB)
        tables = [t for t in (tbl_out or "").splitlines() if t]

        if tables:
            union = " UNION ALL ".join(f"SELECT count(*) AS c FROM public.\"{t}\"" for t in tables)
            total_test = psql_scalar(f"SELECT COALESCE(SUM(c),0) FROM ({union}) AS s", TEST_DB)
            total_src = psql_scalar(f"SELECT COALESCE(SUM(c),0) FROM ({union}) AS s", DB_NAME)
        else:
            total_test = total_src = "0"

        src_tables = psql_scalar(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE'", DB_NAME)

        n_test = int(total_test) if total_test and total_test.isdigit() else -1
        n_src = int(total_src) if total_src and total_src.isdigit() else -1
        t_src = int(src_tables) if src_tables and src_tables.isdigit() else -1

        return {
            "exito": True,
            "archivo": os.path.basename(gz_path),
            "tablas_restauradas": len(tables),
            "filas_restauradas": n_test,
            "tablas_origen": t_src,
            "filas_origen": n_src,
            "coinciden": (t_src >= 0 and len(tables) == t_src and n_test == n_src),
        }
    except Exception as e:  # noqa: BLE001
        return {"exito": False, "error": str(e)[:500]}
    finally:
        try:
            _drop_test_db()
        except Exception:  # noqa: BLE001
            pass


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._json(200, {"ok": True})
        elif path == "/backup":
            self._json(200, run_backup())
        elif path == "/restore-test":
            q = parse_qs(urlparse(self.path).query)
            self._json(200, run_restore_test(q.get("archivo", [None])[0]))
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/backup":
            self._json(200, run_backup())
        elif path == "/restore-test":
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length) if length else b""
            archivo = None
            try:
                if body:
                    archivo = json.loads(body.decode()).get("archivo")
            except Exception:  # noqa: BLE001
                archivo = None
            self._json(200, run_restore_test(archivo))
        else:
            self._json(404, {"error": "not found"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
