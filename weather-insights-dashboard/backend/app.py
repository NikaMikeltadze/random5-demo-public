

import os
import sqlite3
from functools import wraps
from datetime import datetime, timedelta
import json
import hashlib, hmac, base64, secrets
from flask import Flask, request, jsonify, g, send_from_directory

# Configuration
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "database.db"))
SECRET_KEY = os.environ.get("SECRET_KEY", None) or secrets.token_hex(32)
TOKEN_EXP_SECONDS = 60 * 60 * 24  # 24 hours
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = Flask(__name__, static_folder=None)

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()

# Security helpers
def hash_password(password: str, salt: bytes=None):
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return base64.b64encode(salt + dk).decode()

def verify_password(stored: str, provided: str):
    data = base64.b64decode(stored.encode())
    salt = data[:16]
    dk = data[16:]
    test = hashlib.pbkdf2_hmac("sha256", provided.encode(), salt, 200_000)
    return hmac.compare_digest(dk, test)

def make_token(user_id: int, expires_delta: int = TOKEN_EXP_SECONDS):
    payload = f"{user_id}:{int((datetime.utcnow() + timedelta(seconds=expires_delta)).timestamp())}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload.encode() + b"." + sig).decode()
    return token

def verify_token(token: str):
    try:
        raw = base64.urlsafe_b64decode(token.encode())
        payload, sig = raw.rsplit(b".", 1)
        expected = hmac.new(SECRET_KEY.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, sig):
            return None
        user_id_s, exp_s = payload.decode().split(":")
        if int(exp_s) < int(datetime.utcnow().timestamp()):
            return None
        return int(user_id_s)
    except Exception:
        return None

# CORS helper (simple)
@app.after_request
def add_cors(resp):
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return resp

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization","")
        if auth.startswith("Bearer "):
            token = auth.split(" ",1)[1]
            user_id = verify_token(token)
            if user_id:
                g.user_id = user_id
                return f(*args, **kwargs)
        return jsonify({"error":"unauthorized"}), 401
    return wrapper

# Basic endpoints
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    if not (name and email and password):
        return jsonify({"error":"missing fields"}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM user WHERE email = ?", (email,))
    if cur.fetchone():
        return jsonify({"error":"email_exists"}), 400
    pwd = hash_password(password)
    cur.execute("INSERT INTO user (name, email, password) VALUES (?, ?, ?)", (name, email, pwd))
    db.commit()
    uid = cur.lastrowid
    token = make_token(uid)
    return jsonify({"token": token, "user_id": uid})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not (email and password):
        return jsonify({"error":"missing fields"}), 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, password FROM user WHERE email = ?", (email,))
    row = cur.fetchone()
    if not row or not verify_password(row["password"], password):
        return jsonify({"error":"invalid_credentials"}), 401
    token = make_token(row["id"])
    return jsonify({"token": token, "user_id": row["id"]})

@app.route("/api/weather", methods=["GET","POST"])
@require_auth
def weather():
    db = get_db()
    cur = db.cursor()
    if request.method == "GET":
        params = request.args
        q = "SELECT * FROM weather"
        filters = []
        args = []
        if params.get("location"):
            filters.append("location = ?"); args.append(params.get("location"))
        if params.get("day"):
            filters.append("day = ?"); args.append(params.get("day"))
        if filters:
            q += " WHERE " + " AND ".join(filters)
        cur.execute(q, args)
        rows = [dict(r) for r in cur.fetchall()]
        return jsonify(rows)
    else:
        data = request.get_json() or {}
        # validate fields
        required = ["location","day","hour","humidity","temp","wind"]
        if not all(k in data for k in required):
            return jsonify({"error":"missing_fields","required":required}), 400
        cur.execute("INSERT INTO weather (location, day, humidity, temp, wind, hour) VALUES (?, ?, ?, ?, ?, ?)",
                    (data["location"], data["day"], data["humidity"], data["temp"], data["wind"], data["hour"]))
        db.commit()
        return jsonify({"inserted_id": cur.lastrowid}), 201

@app.route("/api/threshold", methods=["GET","PUT"])
@require_auth
def threshold():
    db = get_db()
    cur = db.cursor()
    if request.method == "GET":
        cur.execute("SELECT * FROM threshold")
        rows = [dict(r) for r in cur.fetchall()]
        return jsonify(rows)
    else:
        data = request.get_json() or {}
        # naive update: replace all
        if not data:
            return jsonify({"error":"missing_fields"}), 400
        # Expecting id and fields
        if "id" not in data:
            return jsonify({"error":"missing id"}), 400
        fields = []
        args = []
        for key in ["hot_temp","cold_temp","wind","wet","uncomfortable_humidity"]:
            if key in data:
                fields.append(f"{key} = ?"); args.append(data[key])
        if not fields:
            return jsonify({"error":"no updatable fields"}), 400
        args.append(data["id"])
        q = f"UPDATE threshold SET {', '.join(fields)} WHERE id = ?"
        cur.execute(q, args)
        db.commit()
        return jsonify({"updated": cur.rowcount})

@app.route("/api/me", methods=["GET"])
@require_auth
def me():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, name, email FROM user WHERE id = ?", (g.user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"error":"not_found"}), 404
    return jsonify(dict(row))

# health check
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status":"ok"})

if __name__ == "__main__":
    print("DEV SECRET_KEY (set SECRET_KEY env var in production):", SECRET_KEY)
    app.run(host="0.0.0.0", port=5000, debug=True)