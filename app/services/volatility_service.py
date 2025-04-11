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
            current_app