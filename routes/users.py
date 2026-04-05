from flask import Blueprint, request, jsonify
from models import User
from extensions import db
from middleware import login_required, role_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
@role_required('admin')
def get_users():
    users = User.query.all()
    return jsonify({'users': [u.to_dict() for u in users]})

@users_bp.route('/', methods=['POST'])
@role_required('admin')
def create_user():
    data = request.get_json()
    required = ['username', 'email', 'password', 'role']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if data['role'] not in ['viewer', 'analyst', 'admin']:
        return jsonify({'error': 'Role must be viewer, analyst, or admin'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        role=data['role'],
        is_active=data.get('is_active', True)
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created', 'user': user.to_dict()}), 201

@users_bp.route('/<int:user_id>', methods=['PUT'])
@role_required('admin')
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'role' in data:
        if data['role'] not in ['viewer', 'analyst', 'admin']:
            return jsonify({'error': 'Invalid role'}), 400
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'email' in data:
        user.email = data['email']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'User updated', 'user': user.to_dict()})

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@role_required('admin')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == request.current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})

