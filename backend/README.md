Backend (FastAPI) for Weather Insights

Quick start (Windows, using bash.exe):

1. create a venv and activate it:

```bash
python -m venv .venv
source .venv/Scripts/activate
```

2. install deps:

```bash
pip install -r requirements.txt
```

3. run the server:

```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

The backend uses a local SQLite database file `users.db` by default. Set DATABASE_URL environment variable to change.
