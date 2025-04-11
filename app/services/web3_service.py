import json
import os
from web3 import Web3
from web3.middleware import geth_poa_middleware
from flask import current_app

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
    
    def _initialize(self):
        """Initialize Web3 connection and contract"""
        try:
            # Get provider URI from config if not provided
            if not self.provider_uri:
                self.provider_uri = current_app.config['WEB3_PROVIDER_URI']
            
            # Connect to provider
            self.w3 = Web3(Web3.HTTPProvider(self.provider_uri))
            
            # Add middleware for PoA chains like Polygon
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            # Check connection
            if not self.w3.is_connected():
                current_app.logger.error("Failed to connect to Web3 provider")
                return
            
            # Get contract address from config if not provided
            if not self.contract_address:
                self.contract_address = current_app.config['CONTRACT_ADDRESS']
            
            # Load contract ABI
            if not self.contract_abi_path:
                # Default ABI path
                contract_abi_path = os.path.join(os.path.dirname(__file__), '../../contracts/abi/DynamicLendingPool.json')
            else:
                contract_abi_path = self.contract_abi_path
            
            with open(contract_abi_path, 'r') as f:
                contract_abi = json.load(f)
            
            # Initialize contract
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.contract_address),
                abi=contract_abi
            )
            
            current_app.logger.info("Web3Service initialized successfully")
        except Exception as e:
            current_app.logger.error(f"Error initializing Web3Service: {str(e)}")
    
    def get_asset_details(self, symbol):
        """Get asset details from smart contract"""
        if not self._check_initialized():
            return None
        
        try:
            return self.contract.functions.getAssetDetails(symbol).call()
        except Exception as e:
            current_app.logger.error(f"Error getting asset details for {symbol}: {str(e)}")
            raise
    
    def get_asset_price(self, symbol):
        """Get asset price from smart contract (via Chainlink)"""
        if not self._check_initialized():
            return None
        
        try:
            return self.contract.functions.getAssetPrice(symbol).call()
        except Exception as e:
            current_app.logger.error(f"Error getting price for {symbol}: {str(e)}")
            raise
    
    def get_all_asset_symbols(self):
        """Get all supported asset symbols"""
        if not self._check_initialized():
            return []
        
        try:
            return self.contract.functions.getAllAssetSymbols().call()
        except Exception as e:
            current_app.logger.error(f"Error getting asset symbols: {str(e)}")
            raise
    
    def get_user_position(self, user_address, symbol):
        """Get user's position for a specific asset"""
        if not self._check_initialized():
            return None
        
        try:
            return self.contract.functions.getUserPosition(
                Web3.to_checksum_address(user_address),
                symbol
            ).call()
        except Exception as e:
            current_app.logger.error(f"Error getting position for {user_address} - {symbol}: {str(e)}")
            raise
    
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
        """Create deposit transaction data for frontend"""
        if not self._check_initialized():
            return None
        
        try:
            # First need to approve tokens
            token_address = self.get_asset_details(symbol)[0]
            
            # Return transaction details
            return {
                'to': self.contract_address,
                'from': user_address,
                'data': self.contract.encodeABI('deposit', args=[symbol, amount]),
                'gas': 300000,  # Estimated gas
                'token': token_address,
                'tokenAmount': amount,
                'requiresApproval': True
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
        """Create borrow transaction data for frontend"""
        if not self._check_initialized():
            return None
        
        try:
            return {
                'to': self.contract_address,
                'from': user_address,
                'data': self.contract.encodeABI('borrow', args=[symbol, amount]),
                'gas': 300000,  # Estimated gas
            }
        except Exception as e:
            current_app.logger.error(f"Error creating borrow transaction: {str(e)}")
            raise
    
    def create_repay_transaction(self, user_address, symbol, amount):
        """Create repay transaction data for frontend"""
        if not self._check_initialized():
            return None
        
        try:
            # Need token address for approval
            token_address = self.get_asset_details(symbol)[0]
            
            return {
                'to': self.contract_address,
                'from': user_address,
                'data': self.contract.encodeABI('repay', args=[symbol, amount]),
                'gas': 300000,  # Estimated gas
                'token': token_address,
                'tokenAmount': amount,
                'requiresApproval': True
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