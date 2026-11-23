import os
import time
import random
import psycopg
from datetime import date, time as dt_time, timedelta
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DB = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("POSTGRES_DB", "canchas_db"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "FutbolGest2026!"),
)

TOTAL_RESERVAS = int(os.getenv("TOTAL_RESERVAS", "6000000"))
BATCH = 10_000

def main():
    conn = psycopg.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT id FROM usuarios WHERE rol='jugador'")
    jugadores = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM canchas")
    canchas = [r[0] for r in cur.fetchall()]
    print(f"jugadores={len(jugadores)} canchas={len(canchas)}")

    print(f"Insertando {TOTAL_RESERVAS} reservas extra...")
    start = time.time()
    for i in range(0, TOTAL_RESERVAS, BATCH):
        rows = []
        for _ in range(min(BATCH, TOTAL_RESERVAS - i)):
            h = random.randint(8, 21)
            rows.append((
                date.today() - timedelta(days=random.randint(0, 365)),
                dt_time(h, 0), dt_time(h + 1, 0),
                random.randint(5000, 30000),
                random.choice(["pendiente", "confirmada", "cancelada", "completada"]),
                random.choice([True, False]),
                random.choice(jugadores), random.choice(canchas)
            ))
        cur.executemany(
            "INSERT INTO reservas (fecha, hora_inicio, hora_fin, monto_total, estado, pagada, jugador_id, cancha_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            rows
        )
        conn.commit()
        if (i // BATCH) % 50 == 0:
            print(f"  {i + BATCH} reservas... {time.time() - start:.1f}s", flush=True)
    print(f"Reservas: {time.time() - start:.1f}s")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
