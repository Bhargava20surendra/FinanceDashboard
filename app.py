from flask import Flask
from extensions import db
from routes.auth import auth_bp, register, login
from routes.users import users_bp
from routes.records import records_bp
from routes.dashboard import dashboard_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'finance-dashboard-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
with app.app_context():
    db.create_all()

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(records_bp, url_prefix='/api/records')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

# Fallback aliases for legacy frontend routes
@app.route('/register', methods=['POST'])
def register_alias():
    return register()

@app.route('/login', methods=['POST'])
def login_alias():
    return login()

# Frontend routes
from flask import render_template
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    # Don't override API routes
    if path.startswith('api/'):
        return {"error": "Not Found"}, 404
    return render_template('index.html')
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        from seed import seed_data
        seed_data()
    app.run(debug=True)
