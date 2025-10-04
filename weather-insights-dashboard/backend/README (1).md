Backend created at /mnt/data/backend

Files:
- app.py : Flask app (uses ../database.db by default)
- create_db.py : Creates missing tables without overwriting data
- requirements.txt : minimal requirements

How to run (development):
1. (Optional) create virtualenv
2. pip install -r requirements.txt
3. Ensure /mnt/data/database.db exists (the uploaded database). If not, run python create_db.py to create it.
4. Start server:
   SECRET_KEY=changeme DB_PATH=/mnt/data/database.db ALLOWED_ORIGINS=http://localhost:3000 python app.py

Notes:
- Passwords are hashed with PBKDF2-HMAC-SHA256 (200k iterations).
- Token is HMAC-signed and expires (default 24h).
- CORS only allows origins in ALLOWED_ORIGINS.