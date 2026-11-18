import os
import time
import random
import psycopg
from faker import Faker
from datetime import date, time as dt_time, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Especificar explícitamente la ruta al directorio raíz del proyecto
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

fake = Faker('es_ES')

DB = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    dbname=os.getenv("POSTGRES_DB", "canchas_db"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "FutbolGest2026!"),
)

TOTAL_RESERVAS = 6_000_000
TOTAL_USUARIOS = 50_000
TOTAL_COMPLEJOS = 1_000
TOTAL_CANCHAS = 5_000
BATCH = 10_000

def main():
    conn = psycopg.connect(**DB)
    conn.autocommit = False
    cur = conn.cursor()

    # 1) Usuarios
    print("Insertando usuarios...")
    start = time.time()
    for i in range(0, TOTAL_USUARIOS, BATCH):
        rows = []
        for _ in range(min(BATCH, TOTAL_USUARIOS - i)):
            rows.append((
                fake.first_name(), fake.last_name(), fake.unique.email(),
                "$2b$10$placeholder", random.choice(["jugador","jugador","jugador","duenio"])
            ))
        cur.executemany(
            "INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (%s,%s,%s,%s,%s)",
            rows
        )
        conn.commit()
    print(f"Usuarios: {time.time()-start:.1f}s")

    # 2) Complejos (solo dueños)
    cur.execute("SELECT id FROM usuarios WHERE rol='duenio'")
    duenios = [r[0] for r in cur.fetchall()]
    print("Insertando complejos...")
    for i in range(0, TOTAL_COMPLEJOS, BATCH):
        rows = []
        for _ in range(min(BATCH, TOTAL_COMPLEJOS - i)):
            rows.append((
                fake.company(), fake.address(), fake.state(),
                fake.phone_number(), random.uniform(-55, -22), random.uniform(-73, -53),
                random.choice(duenios)
            ))
        cur.executemany(
            "INSERT INTO complejos (nombre, direccion, provincia, telefono, latitud, longitud, duenio_id) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            rows
        )
        conn.commit()

    # 3) Canchas
    cur.execute("SELECT id FROM complejos")
    complejos = [r[0] for r in cur.fetchall()]
    print("Insertando canchas...")
    for i in range(0, TOTAL_CANCHAS, BATCH):
        rows = []
        for _ in range(min(BATCH, TOTAL_CANCHAS - i)):
            rows.append((
                f"Cancha {fake.word()}", random.choice(["futbol 5","futbol 7","futbol 11","basketball","tenis","voleibol"]),
                random.randint(5000, 30000), random.choice([60,90,120]),
                random.choice([True, False]), random.choice([True, False]),
                random.randint(10, 30), fake.sentence(), random.choice(complejos)
            ))
        cur.executemany(
            "INSERT INTO canchas (nombre, tipo, precio_hora, duracion_turno, techada, iluminacion, capacidad, descripcion, complejo_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            rows
        )
        conn.commit()

    # 4) Reservas masivas
    cur.execute("SELECT id FROM usuarios WHERE rol='jugador'")
    jugadores = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM canchas")
    canchas = [r[0] for r in cur.fetchall()]
    print("Insertando reservas (esto tarda)...")
    start = time.time()
    for i in range(0, TOTAL_RESERVAS, BATCH):
        rows = []
        for _ in range(min(BATCH, TOTAL_RESERVAS - i)):
            h = random.randint(8, 21)
            rows.append((
                date.today() - timedelta(days=random.randint(0, 365)),
               dt_time(h, 0), dt_time(h+1, 0),
                random.randint(5000, 30000),
                random.choice(["pendiente","confirmada","cancelada","completada"]),
                random.choice([True, False]),
                random.choice(jugadores), random.choice(canchas)
            ))
        cur.executemany(
            "INSERT INTO reservas (fecha, hora_inicio, hora_fin, monto_total, estado, pagada, jugador_id, cancha_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            rows
        )
        conn.commit()
        if (i // BATCH) % 50 == 0:
            print(f"  {i+BATCH} reservas... {time.time()-start:.1f}s")
    print(f"Reservas: {time.time()-start:.1f}s")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()