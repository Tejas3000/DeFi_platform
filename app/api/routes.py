from flask import Blueprint, jsonify, request, current_app, g
from app import db
from app.models.models import User, Asset, Position, Transaction, VolatilityRecord
from app.services.web3_service import Web3Service
from app.services.volatility_service import VolatilityService

api_bp = Blueprint('api', __name__)

def get_web3_service():
    if 'web3_service' not in g:
        g.web3_service = Web3Service()
    return g.web3_service

def get_volatility_service():
    if 'volatility_service' not in g:
        g.volatility_service = VolatilityService()
    return g.volatility_service

@api_bp.before_request
def ensure_services():
    get_web3_service()
    get_volatility_service()

@api_bp.teardown_app_request
def teardown_services(exception=None):
    web3_service = g.pop('web3_service', None)
    volatility_service = g.pop('volatility_service', None)

# Asset endpoints
@api_bp.route('/assets', methods=['GET'])
def get_assets():
    """Get all active assets with their details"""
    assets = Asset.query.filter_by(is_active=True).all()
    result = []
    
    for asset in assets:
        try:
            # Get on-chain data
            asset_details = get_web3_service().get_asset_details(asset.symbol)
            
            # Get latest volatility record
            volatility = VolatilityRecord.query.filter_by(asset_id=asset.id).order_by(VolatilityRecord.timestamp.desc()).first()
            
            result.append({
                'id': asset.id,
                'symbol': asset.symbol,
                'name': asset.name,
                'tokenAddress': asset.token_address,
                'baseInterestRate': asset.base_interest_rate / 100,  # Convert basis points to percentage
                'effectiveInterestRate': get_web3_service().get_current_interest_rate(asset.symbol) / 100,
                'volatility': volatility.volatility if volatility else 0,
                'collateralFactor': asset.collateral_factor / 100,  # Convert basis points to percentage
                'totalDeposited': asset_details[1],
                'totalBorrowed': asset_details[2],
                'price': get_web3_service().get_asset_price(asset.symbol) / 10**8,  # Chainlink returns prices with 8 decimals
            })
        except Exception as e:
            current_app.logger.error(f"Error processing asset {asset.symbol}: {str(e)}")
    
    return jsonify(result)

@api_bp.route('/assets/<string:symbol>', methods=['GET'])
def get_asset(symbol):
    """Get details for a specific asset"""
    asset = Asset.query.filter_by(symbol=symbol, is_active=True).first_or_404()
    
    try:
        # Get on-chain data
        asset_details = get_web3_service().get_asset_details(asset.symbol)
        
        # Get latest volatility record
        volatility = VolatilityRecord.query.filter_by(asset_id=asset.id).order_by(VolatilityRecord.timestamp.desc()).first()
        
        result = {
            'id': asset.id,
            'symbol': asset.symbol,
            'name': asset.name,
            'tokenAddress': asset.token_address,
            'baseInterestRate': asset.base_interest_rate / 100,
            'effectiveInterestRate': get_web3_service().get_current_interest_rate(asset.symbol) / 100,
            'volatility': volatility.volatility if volatility else 0,
            'collateralFactor': asset.collateral_factor / 100,
            'totalDeposited': asset_details[1],
            'totalBorrowed': asset_details[2],
            'price': get_web3_service().get_asset_price(asset.symbol) / 10**8,
        }
        
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Error processing asset {asset.symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# User endpoints
@api_bp.route('/users/<string:address>', methods=['GET'])
def get_user(address):
    """Get user details and positions"""
    # Validate address
    if not get_web3_service().validate_address(address):
        return jsonify({'error': 'Invalid Ethereum address'}), 400
    
    # Find or create user
    user = User.query.filter_by(address=address.lower()).first()
    if not user:
        user = User(address=address.lower())
        db.session.add(user)
        db.session.commit()
    
    # Get user positions
    active_assets = Asset.query.filter_by(is_active=True).all()
    positions = []
    
    for asset in active_assets:
        try:
            # Get on-chain position data
            position_data = get_web3_service().get_user_position(address, asset.symbol)
            deposited, borrowed, interest_due = position_data
            
            if deposited > 0 or borrowed > 0:
                positions.append({
                    'asset': asset.symbol,
                    'deposited': deposited,
                    'borrowed': borrowed,
                    'interestDue': interest_due,
                    'healthFactor': _calculate_health_factor(deposited, borrowed, asset.collateral_factor)
                })
        except Exception as e:
            current_app.logger.error(f"Error getting position for {address} - {asset.symbol}: {str(e)}")
    
    return jsonify({
        'address': user.address,
        'positions': positions
    })

# Transaction preparation endpoints
@api_bp.route('/transactions/deposit', methods=['POST'])
def prepare_deposit():
    """Prepare deposit transaction for signing"""
    data = request.json
    address = data.get('address')
    symbol = data.get('symbol')
    amount = data.get('amount')
    
    if not all([address, symbol, amount]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if not get_web3_service().validate_address(address):
        return jsonify({'error': 'Invalid Ethereum address'}), 400
    
    try:
        # Create transaction data
        tx_data = get_web3_service().create_deposit_transaction(address, symbol, int(amount))
        return jsonify(tx_data)
    except Exception as e:
        current_app.logger.error(f"Error preparing deposit transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/withdraw', methods=['POST'])
def prepare_withdraw():
    """Prepare withdraw transaction for signing"""
    data = request.json
    address = data.get('address')
    symbol = data.get('symbol')
    amount = data.get('amount')
    
    if not all([address, symbol, amount]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if not get_web3_service().validate_address(address):
        return jsonify({'error': 'Invalid Ethereum address'}), 400
    
    try:
        # Create transaction data
        tx_data = get_web3_service().create_withdraw_transaction(address, symbol, int(amount))
        return jsonify(tx_data)
    except Exception as e:
        current_app.logger.error(f"Error preparing withdraw transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/borrow', methods=['POST'])
def prepare_borrow():
    """Prepare borrow transaction for signing"""
    data = request.json
    address = data.get('address')
    symbol = data.get('symbol')
    amount = data.get('amount')
    
    if not all([address, symbol, amount]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if not get_web3_service().validate_address(address):
        return jsonify({'error': 'Invalid Ethereum address'}), 400
    
    try:
        # Create transaction data
        tx_data = get_web3_service().create_borrow_transaction(address, symbol, int(amount))
        return jsonify(tx_data)
    except Exception as e:
        current_app.logger.error(f"Error preparing borrow transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/repay', methods=['POST'])
def prepare_repay():
    """Prepare repay transaction for signing"""
    data = request.json
    address = data.get('address')
    symbol = data.get('symbol')
    amount = data.get('amount')
    
    if not all([address, symbol, amount]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    if not get_web3_service().validate_address(address):
        return jsonify({'error': 'Invalid Ethereum address'}), 400
    
    try:
        # Create transaction data
        tx_data = get_web3_service().create_repay_transaction(address, symbol, int(amount))
        return jsonify(tx_data)
    except Exception as e:
        current_app.logger.error(f"Error preparing repay transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/transactions/record', methods=['POST'])
def record_transaction():
    """Record a successful transaction"""
    data = request.json
    tx_hash = data.get('txHash')
    tx_type = data.get('txType')
    address = data.get('address')
    symbol = data.get('symbol')
    amount = data.get('amount')
    
    if not all([tx_hash, tx_type, address, symbol, amount]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    try:
        # Get receipt to confirm transaction
        receipt = get_web3_service().get_transaction_receipt(tx_hash)
        if not receipt or receipt['status'] != 1:
            return jsonify({'error': 'Transaction failed or not found'}), 400
        
        # Get user and asset
        user = User.query.filter_by(address=address.lower()).first()
        if not user:
            user = User(address=address.lower())
            db.session.add(user)
            db.session.commit()
        
        asset = Asset.query.filter_by(symbol=symbol, is_active=True).first()
        if not asset:
            return jsonify({'error': 'Asset not found'}), 404
        
        # Record transaction
        transaction = Transaction(
            user_id=user.id,
            asset_id=asset.id,
            tx_type=tx_type,
            amount=amount,
            tx_hash=tx_hash,
            block_number=receipt['blockNumber']
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({'success': True, 'id': transaction.id})
    except Exception as e:
        current_app.logger.error(f"Error recording transaction: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Volatility endpoints
@api_bp.route('/volatility/<string:symbol>', methods=['GET'])
def get_volatility_history(symbol):
    """Get volatility history for an asset"""
    asset = Asset.query.filter_by(symbol=symbol, is_active=True).first_or_404()
    
    # Get volatility records
    records = VolatilityRecord.query.filter_by(asset_id=asset.id).order_by(VolatilityRecord.timestamp.desc()).limit(30).all()
    
    result = [{
        'timestamp': record.timestamp.isoformat(),
        'volatility': record.volatility,
        'interestRate': record.effective_interest_rate / 100  # Convert basis points to percentage
    } for record in records]
    
    return jsonify(result)

# Helper functions
def _calculate_health_factor(deposited, borrowed, collateral_factor):
    """Calculate health factor for a position"""
    if borrowed == 0:
        return float('inf')
    
    max_borrow = (deposited * collateral_factor) / 10000  # Convert basis points
    return max_borrow / borrowed