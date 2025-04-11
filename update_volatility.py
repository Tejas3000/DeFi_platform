#!/usr/bin/env python3
"""
Cron job script to update asset volatility and interest rates
Run this script daily to keep volatility and interest rates up to date
"""

import os
import sys
import logging
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.services.volatility_service import VolatilityService
from app.services.web3_service import Web3Service
from app import db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('volatility_update.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('volatility_update')

def update_volatility_and_rates():
    """Update volatility for all assets and update interest rates in the smart contract"""
    logger.info("Starting volatility update job")
    
    app = create_app()
    with app.app_context():
        try:
            # Initialize services
            volatility_service = VolatilityService()
            web3_service = Web3Service()
            
            # Update volatility for all assets
            updated_count = volatility_service.update_asset_volatility()
            logger.info(f"Updated volatility for {updated_count} assets")
            
            # For each asset, update the interest rate in the smart contract
            if updated_count > 0:
                from app.models.models import Asset, VolatilityRecord
                
                # Get all active assets
                assets = Asset.query.filter_by(is_active=True).all()
                
                for asset in assets:
                    # Get latest volatility record
                    latest_record = VolatilityRecord.query.filter_by(asset_id=asset.id).order_by(
                        VolatilityRecord.timestamp.desc()).first()
                    
                    if latest_record:
                        try:
                            # Update interest rate in smart contract
                            # Note: This would require a wallet with ETH and proper permissions
                            # In production, use a secure wallet management solution
                            logger.info(f"Would update interest rate for {asset.symbol} to {latest_record.effective_interest_rate} basis points")
                            
                            # Uncomment in production with proper wallet setup
                            # web3_service.update_interest_rate(asset.symbol, latest_record.effective_interest_rate)
                        except Exception as e:
                            logger.error(f"Error updating interest rate for {asset.symbol}: {str(e)}")
            
            # Check for positions nearing liquidation
            try:
                liquidation_candidates = volatility_service.get_liquidation_candidates()
                if liquidation_candidates:
                    logger.warning(f"Found {len(liquidation_candidates)} positions nearing liquidation threshold")
                    for candidate in liquidation_candidates:
                        logger.warning(f"User {candidate['user_address']} has position {candidate['position_id']} with health factor {candidate['health_factor']}")
            except Exception as e:
                logger.error(f"Error checking liquidation candidates: {str(e)}")
            
            logger.info("Volatility update job completed successfully")
            return True
        except Exception as e:
            logger.error(f"Error in volatility update job: {str(e)}")
            return False

if __name__ == "__main__":
    update_volatility_and_rates()