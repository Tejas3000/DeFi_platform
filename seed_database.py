#!/usr/bin/env python3
"""
Script to initialize the database with initial assets
Run this script once after setting up the database
"""

import os
import sys
import logging
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models.models import Asset, User, Position, Transaction, VolatilityRecord

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_database.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('seed_database')

def seed_database():
    """Initialize the database with initial assets"""
    logger.info("Starting database seeding")
    
    app = create_app()
    with app.app_context():
        try:
            # Check if assets already exist
            if Asset.query.count() > 0:
                logger.info("Assets already exist in database, skipping seeding")
                return True
            
            # Define initial assets
            initial_assets = [
                {
                    'symbol': 'ETH',
                    'name': 'Ethereum',
                    'token_address': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',  # Native ETH representation
                    'price_feed_address': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',  # Chainlink ETH/USD
                    'decimals': 18,
                    'base_interest_rate': 200,  # 2% base rate (in basis points)
                    'volatility_multiplier': 100,  # Multiplier for volatility component
                    'collateral_factor': 7500,  # 75% collateral factor (in basis points)
                    'coingecko_id': 'ethereum'
                },
                {
                    'symbol': 'WBTC',
                    'name': 'Wrapped Bitcoin',
                    'token_address': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',  # WBTC on Ethereum mainnet
                    'price_feed_address': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',  # Chainlink BTC/USD
                    'decimals': 8,
                    'base_interest_rate': 150,  # 1.5% base rate
                    'volatility_multiplier': 80,
                    'collateral_factor': 7000,  # 70%
                    'coingecko_id': 'wrapped-bitcoin'
                },
                {
                    'symbol': 'USDC',
                    'name': 'USD Coin',
                    'token_address': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',  # USDC on Ethereum mainnet
                    'price_feed_address': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',  # Chainlink USDC/USD
                    'decimals': 6,
                    'base_interest_rate': 500,  # 5% base rate
                    'volatility_multiplier': 20,
                    'collateral_factor': 8500,  # 85%
                    'coingecko_id': 'usd-coin'
                },
                {
                    'symbol': 'DAI',
                    'name': 'Dai Stablecoin',
                    'token_address': '0x6B175474E89094C44Da98b954EedeAC495271d0F',  # DAI on Ethereum mainnet
                    'price_feed_address': '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',  # Chainlink DAI/USD
                    'decimals': 18,
                    'base_interest_rate': 450,  # 4.5% base rate
                    'volatility_multiplier': 25,
                    'collateral_factor': 8000,  # 80%
                    'coingecko_id': 'dai'
                }
            ]
            
            # Add assets to database
            for asset_data in initial_assets:
                asset = Asset(**asset_data)
                db.session.add(asset)
                logger.info(f"Added asset: {asset.symbol}")
            
            # Commit changes
            db.session.commit()
            
            # Initialize volatility records for each asset
            from app.services.volatility_service import VolatilityService
            volatility_service = VolatilityService()
            
            updated_count = volatility_service.update_asset_volatility()
            logger.info(f"Added initial volatility records for {updated_count} assets")
            
            logger.info("Database seeding completed successfully")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error seeding database: {str(e)}")
            return False

if __name__ == "__main__":
    seed_database()