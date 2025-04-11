import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import requests
import time
from flask import current_app
from app import db
from app.models.models import Asset, VolatilityRecord

class VolatilityService:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.api_key = None
        
        # Try to get API key from config
        try:
            self.api_key = current_app.config.get('COINGECKO_API_KEY')
        except:
            pass
    
    def get_historical_prices(self, coin_id, days=30):
        """
        Get historical prices for a cryptocurrency from CoinGecko API
        """
        endpoint = f"/coins/{coin_id}/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': days,
            'interval': 'daily'
        }
        
        # Add API key if available
        if self.api_key:
            params['x_cg_pro_api_key'] = self.api_key
        
        try:
            response = requests.get(self.base_url + endpoint, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Extract prices (timestamp, price)
            prices = data.get('prices', [])
            
            # Convert to pandas DataFrame
            df = pd.DataFrame(prices, columns=['timestamp', 'price'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            
            return df
        except Exception as e:
            current_app.logger.error(f"Error fetching price data for {coin_id}: {str(e)}")
            return None
    
    def calculate_volatility(self, price_data):
        """
        Calculate volatility (standard deviation of daily returns)
        """
        if price_data is None or len(price_data) < 2:
            return 0
        
        try:
            # Calculate daily returns
            daily_returns = price_data['price'].pct_change().dropna()
            
            # Calculate volatility (standard deviation of returns)
            volatility = daily_returns.std()
            
            return volatility
        except Exception as e:
            current_app.logger.error(f"Error calculating volatility: {str(e)}")
            return 0
    
    def calculate_interest_rate(self, asset, volatility):
        """
        Calculate interest rate based on base rate and volatility
        """
        try:
            # Interest rate = base_rate + (volatility * volatility_multiplier)
            # Convert volatility to basis points (0.01 = 100 bp)
            volatility_component = int(volatility * 10000 * asset.volatility_multiplier / 100)
            
            # Add to base interest rate (already in basis points)
            interest_rate = asset.base_interest_rate + volatility_component
            
            return interest_rate
        except Exception as e:
            current_app.logger.error(f"Error calculating interest rate: {str(e)}")
            return asset.base_interest_rate
    
    def update_asset_volatility(self, asset_id=None):
        """
        Update volatility records for all assets or a specific asset
        """
        try:
            # Query assets
            if asset_id:
                assets = Asset.query.filter_by(id=asset_id, is_active=True).all()
            else:
                assets = Asset.query.filter_by(is_active=True).all()
            
            updated_count = 0
            
            for asset in assets:
                # Skip if no CoinGecko ID
                if not asset.coingecko_id:
                    current_app.logger.warning(f"Asset {asset.symbol} has no CoinGecko ID")
                    continue
                
                # Get historical prices
                price_data = self.get_historical_prices(asset.coingecko_id)
                
                if price_data is None:
                    current_app.logger.warning(f"No price data available for {asset.symbol}")
                    continue
                
                # Calculate volatility
                volatility = self.calculate_volatility(price_data)
                
                # Calculate interest rate
                interest_rate = self.calculate_interest_rate(asset, volatility)
                
                # Create volatility record
                volatility_record = VolatilityRecord(
                    asset_id=asset.id,
                    volatility=float(volatility),
                    period_days=30,
                    effective_interest_rate=interest_rate
                )
                
                db.session.add(volatility_record)
                updated_count += 1
                
                # Rate limit API calls
                time.sleep(1)
            
            # Commit all changes
            db.session.commit()
            
            return updated_count
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating asset volatility: {str(e)}")
            raise
    
    def get_liquidation_candidates(self):
        """
        Find positions that are close to liquidation threshold
        """
        from app.models.models import Position
        from sqlalchemy import text
        
        try:
            # Custom SQL query to find positions with health factor < 1.2
            # This is more complex and would require raw SQL or custom ORM queries
            # For simplicity, we'll use a basic approach here
            
            positions = Position.query.filter(Position.borrowed_amount > 0).all()
            liquidation_candidates = []
            
            for position in positions:
                # Get current asset details including price
                asset = position.asset
                
                # Calculate health factor
                # In a real implementation, you'd get actual on-chain data
                # For now we'll use a simple estimate
                collateral_value = float(position.deposited_amount) * (asset.collateral_factor / 10000)
                borrow_value = float(position.borrowed_amount)
                
                if borrow_value > 0:
                    health_factor = collateral_value / borrow_value
                    
                    if health_factor < 1.2:
                        liquidation_candidates.append({
                            'user_address': position.user.address,
                            'asset_symbol': asset.symbol,
                            'health_factor': health_factor,
                            'position_id': position.id
                        })
            
            return liquidation_candidates
        except Exception as e:
            current_app.logger.error(f"Error finding liquidation candidates: {str(e)}")
            return []