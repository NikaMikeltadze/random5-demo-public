import sqlite3

# Connect to the database
connection = sqlite3.connect("database.db")
cursor = connection.cursor()

cursor.execute("INSERT INTO threshold (hot_temp, cold_temp, wind, wet, uncomfortable_humidity) VALUES (35, 5, 20, 80, 90);")
cursor.execute("INSERT INTO user (name, email, password, threshold_id) VALUES ('Luka', 'luka@example.com', '12345', 1);")
cursor.execute("INSERT INTO weather (location, day, humidity, temp, wind, hour) VALUES ('Tbilisi', '2025-10-04', 70, 28, 10, 14);")
connection.commit()

# Example 1: Read all rows from the 'weather' table
cursor.execute("SELECT * FROM weather;")
rows = cursor.fetchall()

print("🌦 Weather data:")
for row in rows:
    print(row)

# Example 2: Read all users
cursor.execute("SELECT id, name, email, threshold_id FROM user;")
users = cursor.fetchall()

print("\n👤 Users:")
for user in users:
    print(user)

# Example 3: Join user and threshold data
cursor.execute("""
SELECT u.name, u.email, t.hot_temp, t.cold_temp
FROM user u
LEFT JOIN threshold t ON u.threshold_id = t.id;
""")
joined_data = cursor.fetchall()

print("\n🧩 User + Threshold:")
for record in joined_data:
    print(record)

# Close the connection
connection.close()
