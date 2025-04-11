import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Blockchain configuration
    WEB3_PROVIDER_URI = os.environ.get('WEB3_PROVIDER_URI') or 'http://localhost:8545'
    CONTRACT_ADDRESS = os.environ.get('CONTRACT_ADDRESS')
    
    # Redis configuration
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # API Keys
    COINGECKO_API_KEY = os.environ.get('COINGECKO_API_KEY')