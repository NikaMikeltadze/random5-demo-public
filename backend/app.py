from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from asgiref.wsgi import WsgiToAsgi
import db
from db import init_db, SessionLocal
from models import User
from auth_utils import get_password_hash, verify_password
import os

# Initialize DB tables at import time so ASGI server finds tables
init_db()

flask_app = Flask(__name__)
CORS(flask_app, origins=["http://localhost:5173", "http://localhost:3000"], supports_credentials=True)

flask_app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
jwt = JWTManager(flask_app)


@flask_app.route('/')
def root():
    return jsonify({'status': 'ok'})


@flask_app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'detail': 'email and password required'}), 400
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            return jsonify({'detail': 'Email already registered'}), 400
        user = User(email=email, hashed_password=get_password_hash(password))
        db.add(user)
        db.commit()
        return jsonify({'id': user.id, 'email': user.email}), 201
    finally:
        db.close()


@flask_app.route('/auth/login', methods=['POST'])
def login():
    # Accept either form-encoded (username/password) or JSON
    if request.content_type and 'application/x-www-form-urlencoded' in request.content_type:
        username = request.form.get('username')
        password = request.form.get('password')
    else:
        data = request.get_json() or {}
        username = data.get('username') or data.get('email')
        password = data.get('password')
    if not username or not password:
        return jsonify({'detail': 'username and password required'}), 400
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == username).first()
        if not user or not verify_password(password, user.hashed_password):
            return jsonify({'detail': 'Incorrect username or password'}), 401
        token = create_access_token(identity=user.email)
        return jsonify({'access_token': token, 'token_type': 'bearer'})
    finally:
        db.close()


@flask_app.route('/auth/me', methods=['GET'])
@jwt_required()
def me():
    current_user_email = get_jwt_identity()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == current_user_email).first()
        if not user:
            return jsonify({'detail': 'User not found'}), 404
        return jsonify({'id': user.id, 'email': user.email})
    finally:
        db.close()


# Expose ASGI application for uvicorn while keeping flask_app for direct run
asgi_app = WsgiToAsgi(flask_app)
# module-level name 'app' is what uvicorn expects: make it the ASGI app
app = asgi_app

if __name__ == '__main__':
    # run development server if executed directly
    flask_app.run(host='0.0.0.0', port=8000, debug=True)
