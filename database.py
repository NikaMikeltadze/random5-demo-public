import sqlite3

# Connect to (or create) the database
connection = sqlite3.connect("database.db")
cursor = connection.cursor()

# Create tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS threshold (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hot_temp REAL,
    cold_temp REAL,
    wind REAL,
    wet REAL,
    uncomfortable_humidity REAL
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    day TEXT NOT NULL,
    humidity REAL,
    temp REAL,
    wind REAL,
    hour INTEGER
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    threshold_id INTEGER,
    FOREIGN KEY (threshold_id) REFERENCES threshold(id)
);
""")

# Commit and close
connection.commit()
connection.close()

print("✅ Tables created successfully!")
