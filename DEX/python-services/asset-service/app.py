from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from decimal import Decimal
import requests
import os

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql://root:Sun-Flower0914@localhost/exchange_assets')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 资产余额模型
class AssetBalance(db.Model):
    __tablename__ = 'asset_balances'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    wallet_address = db.Column(db.String(42), nullable=False)
    asset_type = db.Column(db.String(20), nullable=False)  # token, nft
    contract_address = db.Column(db.String(42), nullable=False)
    token_id = db.Column(db.String(100))  # NFT token ID
    amount = db.Column(db.Numeric(36, 18), default=0)  # 代币数量
    locked_amount = db.Column(db.Numeric(36, 18), default=0)  # 锁定数量
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'wallet_address': self.wallet_address,
            'asset_type': self.asset_type,
            'contract_address': self.contract_address,
            'token_id': self.token_id,
            'amount': str(self.amount),
            'locked_amount': str(self.locked_amount),
            'available_amount': str(self.amount - self.locked_amount),
            'updated_at': self.updated_at.isoformat()
        }

# 资产交易记录
class AssetTransaction(db.Model):
    __tablename__ = 'asset_transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    tx_hash = db.Column(db.String(66), unique=True)
    tx_type = db.Column(db.String(20), nullable=False)  # deposit, withdraw, trade
    asset_type = db.Column(db.String(20), nullable=False)
    contract_address = db.Column(db.String(42), nullable=False)
    token_id = db.Column(db.String(100))
    amount = db.Column(db.Numeric(36, 18))
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'tx_hash': self.tx_hash,
            'tx_type': self.tx_type,
            'asset_type': self.asset_type,
            'contract_address': self.contract_address,
            'token_id': self.token_id,
            'amount': str(self.amount) if self.amount else None,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

# API路由

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'healthy', 'service': 'asset-service'})

@app.route('/api/assets/balance/<int:user_id>', methods=['GET'])
def get_user_balance(user_id):
    """查询用户资产余额"""
    balances = AssetBalance.query.filter_by(user_id=user_id).all()
    return jsonify([balance.to_dict() for balance in balances])

@app.route('/api/assets/balance/<int:user_id>/<contract_address>', methods=['GET'])
def get_specific_balance(user_id, contract_address):
    """查询特定资产余额"""
    balance = AssetBalance.query.filter_by(
        user_id=user_id,
        contract_address=contract_address
    ).first()

    if not balance:
        return jsonify({'error': 'Balance not found'}), 404

    return jsonify(balance.to_dict())

@app.route('/api/assets/deposit', methods=['POST'])
def deposit():
    """资产充值"""
    data = request.json

    required_fields = ['user_id', 'wallet_address', 'asset_type', 'contract_address']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    # 查找或创建余额记录
    balance = AssetBalance.query.filter_by(
        user_id=data['user_id'],
        contract_address=data['contract_address'],
        token_id=data.get('token_id')
    ).first()

    if not balance:
        balance = AssetBalance(
            user_id=data['user_id'],
            wallet_address=data['wallet_address'],
            asset_type=data['asset_type'],
            contract_address=data['contract_address'],
            token_id=data.get('token_id'),
            amount=Decimal('0'),
            locked_amount=Decimal('0')
        )
        db.session.add(balance)

    # 更新余额
    if data['asset_type'] == 'token':
        amount = Decimal(str(data.get('amount', 0)))
        balance.amount += amount

    # 记录交易
    transaction = AssetTransaction(
        user_id=data['user_id'],
        tx_hash=data.get('tx_hash'),
        tx_type='deposit',
        asset_type=data['asset_type'],
        contract_address=data['contract_address'],
        token_id=data.get('token_id'),
        amount=data.get('amount'),
        status='confirmed'
    )
    db.session.add(transaction)

    db.session.commit()

    return jsonify({
        'message': 'Deposit successful',
        'balance': balance.to_dict(),
        'transaction': transaction.to_dict()
    }), 201

@app.route('/api/assets/withdraw', methods=['POST'])
def withdraw():
    """资产提取"""
    data = request.json

    required_fields = ['user_id', 'contract_address', 'amount']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    balance = AssetBalance.query.filter_by(
        user_id=data['user_id'],
        contract_address=data['contract_address']
    ).first()

    if not balance:
        return jsonify({'error': 'Insufficient balance'}), 400

    amount = Decimal(str(data['amount']))
    available = balance.amount - balance.locked_amount

    if available < amount:
        return jsonify({'error': 'Insufficient available balance'}), 400

    balance.amount -= amount

    # 记录交易
    transaction = AssetTransaction(
        user_id=data['user_id'],
        tx_type='withdraw',
        asset_type='token',
        contract_address=data['contract_address'],
        amount=amount,
        status='pending'
    )
    db.session.add(transaction)

    db.session.commit()

    return jsonify({
        'message': 'Withdraw initiated',
        'balance': balance.to_dict(),
        'transaction': transaction.to_dict()
    })

@app.route('/api/assets/lock', methods=['POST'])
def lock_assets():
    """锁定资产（用于挂单）"""
    data = request.json

    balance = AssetBalance.query.filter_by(
        user_id=data['user_id'],
        contract_address=data['contract_address']
    ).first()

    if not balance:
        return jsonify({'error': 'Balance not found'}), 404

    amount = Decimal(str(data['amount']))
    available = balance.amount - balance.locked_amount

    if available < amount:
        return jsonify({'error': 'Insufficient available balance'}), 400

    balance.locked_amount += amount
    db.session.commit()

    return jsonify({
        'message': 'Assets locked successfully',
        'balance': balance.to_dict()
    })

@app.route('/api/assets/unlock', methods=['POST'])
def unlock_assets():
    """解锁资产（撤单）"""
    data = request.json

    balance = AssetBalance.query.filter_by(
        user_id=data['user_id'],
        contract_address=data['contract_address']
    ).first()

    if not balance:
        return jsonify({'error': 'Balance not found'}), 404

    amount = Decimal(str(data['amount']))

    if balance.locked_amount < amount:
        return jsonify({'error': 'Invalid unlock amount'}), 400

    balance.locked_amount -= amount
    db.session.commit()

    return jsonify({
        'message': 'Assets unlocked successfully',
        'balance': balance.to_dict()
    })

@app.route('/api/assets/transactions/<int:user_id>', methods=['GET'])
def get_transactions(user_id):
    """查询用户交易记录"""
    transactions = AssetTransaction.query.filter_by(user_id=user_id).order_by(
        AssetTransaction.created_at.desc()
    ).limit(100).all()

    return jsonify([tx.to_dict() for tx in transactions])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    debug_mode = os.getenv('ASSET_SERVICE_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5002, debug=debug_mode, use_reloader=debug_mode)
