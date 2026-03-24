from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import hashlib
import jwt
import os

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql://root:Sun-Flower0914@localhost/exchange_users')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')

db = SQLAlchemy(app)

# 用户模型
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # scenic_spot, bank, market_maker, regulator
    wallet_address = db.Column(db.String(42), unique=True)
    kyc_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'wallet_address': self.wallet_address,
            'kyc_verified': self.kyc_verified,
            'created_at': self.created_at.isoformat()
        }

# 用户会话
class UserSession(db.Model):
    __tablename__ = 'user_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(512), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# API路由

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'healthy', 'service': 'user-service'})

@app.route('/api/users/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.json

    # 验证必填字段
    required_fields = ['username', 'email', 'password', 'role', 'wallet_address']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    # 验证角色
    valid_roles = ['scenic_spot', 'bank', 'market_maker', 'exchange', 'regulator']
    if data['role'] not in valid_roles:
        return jsonify({'error': 'Invalid role'}), 400

    # 检查用户是否已存在
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409

    if User.query.filter_by(wallet_address=data['wallet_address']).first():
        return jsonify({'error': 'Wallet address already registered'}), 409

    # 创建用户
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=password_hash,
        role=data['role'],
        wallet_address=data['wallet_address']
    )

    db.session.add(user)
    db.session.commit()

    # 注册成功后，调用 blockchain-service 在链上授予角色
    blockchain_url = os.getenv('BLOCKCHAIN_SERVICE_URL', 'http://localhost:8082')
    grant_result = None
    try:
        resp = requests.post(
            f'{blockchain_url}/api/blockchain/auth/grant-role',
            json={'walletAddress': data['wallet_address'], 'role': data['role']},
            timeout=10
        )
        grant_result = resp.json()
    except Exception as e:
        grant_result = {'error': str(e)}

    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(),
        'onChainGrant': grant_result
    }), 201

@app.route('/api/users/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.json

    if 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

    if user.password_hash != password_hash:
        return jsonify({'error': 'Invalid credentials'}), 401

    # 生成JWT token
    token = jwt.encode({
        'user_id': user.id,
        'username': user.username,
        'role': user.role
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """获取用户信息"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict())

@app.route('/api/users/<int:user_id>/kyc', methods=['POST'])
def verify_kyc(user_id):
    """KYC验证"""
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.kyc_verified = True
    db.session.commit()

    return jsonify({
        'message': 'KYC verified successfully',
        'user': user.to_dict()
    })

@app.route('/api/users/role/<role>', methods=['GET'])
def get_users_by_role(role):
    """按角色查询用户"""
    users = User.query.filter_by(role=role).all()
    return jsonify([user.to_dict() for user in users])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    debug_mode = os.getenv('USER_SERVICE_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5001, debug=debug_mode, use_reloader=debug_mode)
