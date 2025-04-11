from datetime import datetime
from app import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.String(42), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    positions = db.relationship('Position', backref='user', lazy='dynamic')
    
    def __repr__(self):
        return f'<User {self.address}>'

class Asset(db.Model):
    __tablename__ = 'assets'
    
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    token_address = db.Column(db.String(42), unique=True, nullable=False)
    price_feed_address = db.Column(db.String(42), nullable=False)
    decimals = db.Column(db.Integer, default=18)
    base_interest_rate = db.Column(db.Integer, nullable=False)  # Basis points (1/100 of a percent)
    volatility_multiplier = db.Column(db.Integer, nullable=False)
    collateral_factor = db.Column(db.Integer, nullable=False)  # Basis points
    is_active = db.Column(db.Boolean, default=True)
    coingecko_id = db.Column(db.String(50))  # For price data fetching
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    positions = db.relationship('Position', backref='asset', lazy='dynamic')
    volatility_history = db.relationship('VolatilityRecord', backref='asset', lazy='dynamic')
    
    def __repr__(self):
        return f'<Asset {self.symbol}>'

class Position(db.Model):
    __tablename__ = 'positions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    deposited_amount = db.Column(db.Numeric(precision=36, scale=18), default=0)
    borrowed_amount = db.Column(db.Numeric(precision=36, scale=18), default=0)
    last_interest_update = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Position {self.user_id}:{self.asset_id}>'

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    tx_type = db.Column(db.String(20), nullable=False)  # deposit, withdraw, borrow, repay
    amount = db.Column(db.Numeric(precision=36, scale=18), nullable=False)
    interest_amount = db.Column(db.Numeric(precision=36, scale=18), default=0)
    tx_hash = db.Column(db.String(66), nullable=False)
    block_number = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='transactions')
    asset = db.relationship('Asset', backref='transactions')
    
    def __repr__(self):
        return f'<Transaction {self.tx_type} {self.tx_hash}>'

class VolatilityRecord(db.Model):
    __tablename__ = 'volatility_records'
    
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False)
    volatility = db.Column(db.Float, nullable=False)  # Standard deviation of returns
    period_days = db.Column(db.Integer, default=30)  # Volatility calculation period in days
    effective_interest_rate = db.Column(db.Integer, nullable=False)  # Resulting interest rate in basis points
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<VolatilityRecord {self.asset.symbol} {self.volatility}>'