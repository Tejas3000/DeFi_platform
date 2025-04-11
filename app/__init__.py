from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config

# Initialize extensions
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    
    # Enable CORS
    CORS(app)
    
    # Import and register blueprints
    from app.api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    @app.route('/')
    def index():
        return {"message": "DeFi Lending Platform API"}
    
    return app