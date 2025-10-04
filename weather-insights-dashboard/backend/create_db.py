"""
Optional helper to initialize database schema if database.db is missing tables.
This script will NOT overwrite existing data but will create missing tables based on expected schema.
"""
import sqlite3, os
DB = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "database.db"))

schema_sql = """
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threshold (
    id INTEGER PRIMARY KEY,
    hot_temp REAL,
    cold_temp REAL,
    wind REAL,
    wet REAL,
    uncomfortable_humidity REAL
);

CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY,
    location TEXT,
    day TEXT,
    humidity REAL,
    temp REAL,
    wind REAL,
    hour INTEGER
);
"""

def init():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.executescript(schema_sql)
    conn.commit()
    conn.close()
    print("Initialized DB (created missing tables). DB path:", DB)

if __name__ == "__main__":
    init()