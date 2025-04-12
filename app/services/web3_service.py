import json
import os
import time
from functools import wraps
from web3 import Web3
from web3.providers import HTTPProvider
from flask import current_app

def retry_on_failure(max_retries=3, delay=1):
    """Decorator to retry Web3 operations on failure"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        time.sleep(delay * (attempt + 1))
                    continue
            raise last_error
        return wrapper
    return decorator

class Web3Service:
    def __init__(self, provider_uri=None, contract_address=None, contract_abi_path=None):
        # Use provided values or defaults from config
        self.provider_uri = provider_uri
        self.contract_address = contract_address
        self.contract_abi_path = contract_abi_path
        self.w3 = None
        self.contract = None
        
        # Initialize connection and contract
        self._initialize()
    
    def _find_contract_abi(self):
        """Find contract ABI in various possible locations"""
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '../../contracts/abi/DynamicLendingPool.json'),
            os.path.join(os.path.dirname(__file__), '../../artifacts/contracts/DynamicLendingPool.sol/DynamicLendingPool.json'),
            os.path.join(os.path.dirname(__file__), '../../contracts/DynamicLendingPool.sol/DynamicLendingPool.json')
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        raise FileNotFoundError("Could not find contract ABI file")
    
    @retry_on_failure(max_retries=3, delay=1)
    def _initialize(self):
        """Initialize Web3 connection and contract with retry mechanism"""
        try:
            # Get provider URI from config if not provided
            if not self.provider_uri:
                self.provider_uri = current_app.config['WEB3_PROVIDER_URI']
            
            # Connect to provider
            provider = HTTPProvider(self.provider_uri)
            self.w3 = Web3(provider)
            
            # Check connection
            if not self.w3.is_connected():
                raise ConnectionError("Failed to connect to Web3 provider")
            
            # Get contract address from config if not provided
            if not self.contract_address:
                self.contract_address = current_app.config['CONTRACT_ADDRESS']
                if not self.contract_address:
                    raise ValueError("Contract address not configured")
            
            # Load contract ABI
            if not self.contract_abi_path:
                self.contract_abi_path = self._find_contract_abi()
            
            with open(self.contract_abi_path, 'r') as f:
                abi_data = json.load(f)
                contract_abi = abi_data.get('abi', abi_data)  # Handle both full Hardhat artifact and raw ABI
            
            # Initialize contract
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=contract_abi
            )
            
            current_app.logger.info("Web3Service initialized successfully")
        except Exception as e:
            current_app.logger.error(f"Error initializing Web3Service: {str(e)}")
            raise
    
    def _validate_transaction_params(self, address, symbol, amount):
        """Validate transaction parameters"""
        if not self._check_initialized():
            raise ValueError("Web3 service not initialized")
            
        if not self.validate_address(address):
            raise ValueError("Invalid Ethereum address")
            
        if not isinstance(symbol, str) or not symbol:
            raise ValueError("Invalid token symbol")
            
        try:
            amount = int(amount)
            if amount <= 0:
                raise ValueError
        except ValueError:
            raise ValueError("Invalid amount")
            
        # Check if asset exists
        try:
            asset_details = self.contract.functions.getAssetDetails(symbol).call()
            if not asset_details:
                raise ValueError(f"Asset {symbol} not found")
        except Exception as e:
            raise ValueError(f"Failed to validate asset: {str(e)}")
            
        return True

    @retry_on_failure(max_retries=3, delay=1)
    def get_asset_details(self, symbol):
        """Get asset details from smart contract with retry mechanism"""
        if not self._check_initialized():
            return None
        
        return self.contract.functions.getAssetDetails(symbol).call()

    @retry_on_failure(max_retries=3, delay=1)
    def get_asset_price(self, symbol):
        """Get asset price from smart contract with retry mechanism"""
        if not self._check_initialized():
            return None
        
        return self.contract.functions.getAssetPrice(symbol).call()

    def get_all_asset_symbols(self):
        """Get all supported asset symbols"""
        if not self._check_initialized():
            return []
        
        try:
            return self.contract.functions.getAllAssetSymbols().call()
        except Exception as e:
            current_app.logger.error(f"Error getting asset symbols: {str(e)}")
            raise

    @retry_on_failure(max_retries=3, delay=1)
    def get_user_position(self, user_address, symbol):
        """Get user's position with retry mechanism"""
        if not self._check_initialized():
            return None
        
        return self.contract.functions.getUserPosition(
            Web3.to_checksum_address(user_address),
            symbol
        ).call()

    def get_current_interest_rate(self, symbol):
        """Get current interest rate for an asset"""
        if not self._check_initialized():
            return None
        
        try:
            return self.contract.functions.getCurrentInterestRate(symbol).call()
        except Exception as e:
            current_app.logger.error(f"Error getting interest rate for {symbol}: {str(e)}")
            raise
    
    def create_deposit_transaction(self, user_address, symbol, amount):
        """Create deposit transaction data"""
        self._validate_transaction_params(user_address, symbol, amount)
        
        try:
            # Get token address
            asset_details = self.contract.functions.getAssetDetails(symbol).call()
            token_address = asset_details[0]
            
            # Check user balance
            if symbol != 'ETH':
                token_contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=[{
                        "constant": True,
                        "inputs": [{"name": "account", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "", "type": "uint256"}],
                        "type": "function"
                    }]
                )
                balance = token_contract.functions.balanceOf(
                    Web3.to_checksum_address(user_address)
                ).call()
                
                if balance < int(amount):
                    raise ValueError("Insufficient token balance")
            
            # Prepare transaction data
            tx_data = self.contract.encodeABI(
                fn_name='deposit',
                args=[symbol, int(amount)]
            )
            
            return {
                'to': self.contract_address,
                'data': tx_data,
                'value': str(amount) if symbol == 'ETH' else '0',
                'requiresApproval': symbol != 'ETH'
            }
        except Exception as e:
            current_app.logger.error(f"Error creating deposit transaction: {str(e)}")
            raise
    
    def create_withdraw_transaction(self, user_address, symbol, amount):
        """Create withdraw transaction data for frontend"""
        if not self._check_initialized():
            return None
        
        try:
            return {
                'to': self.contract_address,
                'from': user_address,
                'data': self.contract.encodeABI('withdraw', args=[symbol, amount]),
                'gas': 300000,  # Estimated gas
            }
        except Exception as e:
            current_app.logger.error(f"Error creating withdraw transaction: {str(e)}")
            raise
    
    def create_borrow_transaction(self, user_address, symbol, amount):
        """Create borrow transaction data"""
        self._validate_transaction_params(user_address, symbol, amount)
        
        try:
            # Check if user has enough collateral
            position = self.contract.functions.getUserPosition(
                Web3.to_checksum_address(user_address),
                symbol
            ).call()
            
            # Get collateral factor and calculate max borrow
            asset_details = self.contract.functions.getAssetDetails(symbol).call()
            collateral_factor = asset_details[3]  # Assuming this is the collateral factor
            max_borrow = (int(position[0]) * collateral_factor) // 10000  # Convert from basis points
            
            if int(amount) > max_borrow:
                raise ValueError("Insufficient collateral for borrow amount")
            
            # Prepare transaction data
            tx_data = self.contract.encodeABI(
                fn_name='borrow',
                args=[symbol, int(amount)]
            )
            
            return {
                'to': self.contract_address,
                'data': tx_data,
                'value': '0'
            }
        except Exception as e:
            current_app.logger.error(f"Error creating borrow transaction: {str(e)}")
            raise
    
    def create_repay_transaction(self, user_address, symbol, amount):
        """Create repay transaction data"""
        self._validate_transaction_params(user_address, symbol, amount)
        
        try:
            # Get token address
            asset_details = self.contract.functions.getAssetDetails(symbol).call()
            token_address = asset_details[0]
            
            # Check borrowed amount
            position = self.contract.functions.getUserPosition(
                Web3.to_checksum_address(user_address),
                symbol
            ).call()
            
            borrowed_amount = position[1]
            if int(amount) > borrowed_amount:
                raise ValueError("Repay amount exceeds borrowed amount")
            
            # Check user balance for non-ETH assets
            if symbol != 'ETH':
                token_contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=[{
                        "constant": True,
                        "inputs": [{"name": "account", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "", "type": "uint256"}],
                        "type": "function"
                    }]
                )
                balance = token_contract.functions.balanceOf(
                    Web3.to_checksum_address(user_address)
                ).call()
                
                if balance < int(amount):
                    raise ValueError("Insufficient token balance")
            
            # Prepare transaction data
            tx_data = self.contract.encodeABI(
                fn_name='repay',
                args=[symbol, int(amount)]
            )
            
            return {
                'to': self.contract_address,
                'data': tx_data,
                'value': str(amount) if symbol == 'ETH' else '0',
                'requiresApproval': symbol != 'ETH'
            }
        except Exception as e:
            current_app.logger.error(f"Error creating repay transaction: {str(e)}")
            raise
    
    def get_transaction_receipt(self, tx_hash):
        """Get transaction receipt"""
        if not self._check_initialized():
            return None
        
        try:
            return self.w3.eth.get_transaction_receipt(tx_hash)
        except Exception as e:
            current_app.logger.error(f"Error getting transaction receipt for {tx_hash}: {str(e)}")
            raise
    
    def validate_address(self, address):
        """Validate Ethereum address"""
        if not self.w3:
            self._initialize()
        
        try:
            return self.w3.is_address(address)
        except:
            return False
    
    def _check_initialized(self):
        """Check if Web3 and contract are initialized"""
        if not self.w3 or not self.contract:
            self._initialize()
            if not self.w3 or not self.contract:
                return False
        return True