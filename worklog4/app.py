from flask import Flask
from config.db_config import load_db_config
from routes.login import login_bp
from routes.home import home_bp
from routes.logout import logout_bp
from legacy.views import legacy_bp

# Load configuration
config = load_db_config()
if config is None:
    raise SystemExit("Failed to load configuration from login.txt")

app = Flask(__name__)
app.secret_key = config['secret_key']

# Register blueprints
app.register_blueprint(login_bp)
app.register_blueprint(home_bp)
app.register_blueprint(logout_bp)
app.register_blueprint(legacy_bp, url_prefix='/legacy')

if __name__ == '__main__':
    app.run(debug=True)
