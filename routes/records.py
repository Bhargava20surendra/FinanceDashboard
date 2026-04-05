from flask import Blueprint, request, jsonify
from models import FinancialRecord
from extensions import db
from middleware import login_required, role_required
from datetime import datetime, date

records_bp = Blueprint('records', __name__)

VALID_CATEGORIES = ['salary', 'freelance', 'investment', 'rent', 'food',
                    'utilities', 'transport', 'healthcare', 'entertainment', 'other']

@records_bp.route('/', methods=['GET'])
@login_required
def get_records():
    query = FinancialRecord.query.filter_by(is_deleted=False)

    # Filters
    record_type = request.args.get('type')
    category = request.args.get('category')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    if record_type in ('income', 'expense'):
        query = query.filter_by(type=record_type)
    if category:
        query = query.filter_by(category=category)
    if date_from:
        try:
            query = query.filter(FinancialRecord.date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        except ValueError:
            return jsonify({'error': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
    if date_to:
        try:
            query = query.filter(FinancialRecord.date <= datetime.strptime(date_to, '%Y-%m-%d').date())
        except ValueError:
            return jsonify({'error': 'Invalid date_to format. Use YYYY-MM-DD'}), 400

    query = query.order_by(FinancialRecord.date.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'records': [r.to_dict() for r in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page
    })

@records_bp.route('/<int:record_id>', methods=['GET'])
@login_required
def get_record(record_id):
    record = FinancialRecord.query.filter_by(id=record_id, is_deleted=False).first_or_404()
    return jsonify({'record': record.to_dict()})

@records_bp.route('/', methods=['POST'])
@role_required('admin', 'analyst')
def create_record():
    data = request.get_json()
    required = ['amount', 'type', 'category', 'date']
    for field in required:
        if data.get(field) is None:
            return jsonify({'error': f'{field} is required'}), 400

    if data['type'] not in ('income', 'expense'):
        return jsonify({'error': 'Type must be income or expense'}), 400
    if data['category'] not in VALID_CATEGORIES:
        return jsonify({'error': f'Category must be one of: {", ".join(VALID_CATEGORIES)}'}), 400

    try:
        amount = float(data['amount'])
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Amount must be a positive number'}), 400

    try:
        record_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    record = FinancialRecord(
        amount=amount,
        type=data['type'],
        category=data['category'],
        date=record_date,
        notes=data.get('notes', ''),
        created_by=request.current_user.id
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'message': 'Record created', 'record': record.to_dict()}), 201

@records_bp.route('/<int:record_id>', methods=['PUT'])
@role_required('admin', 'analyst')
def update_record(record_id):
    record = FinancialRecord.query.filter_by(id=record_id, is_deleted=False).first_or_404()
    data = request.get_json()

    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount <= 0: raise ValueError
            record.amount = amount
        except (ValueError, TypeError):
            return jsonify({'error': 'Amount must be a positive number'}), 400

    if 'type' in data:
        if data['type'] not in ('income', 'expense'):
            return jsonify({'error': 'Type must be income or expense'}), 400
        record.type = data['type']

    if 'category' in data:
        if data['category'] not in VALID_CATEGORIES:
            return jsonify({'error': f'Invalid category'}), 400
        record.category = data['category']

    if 'date' in data:
        try:
            record.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400

    if 'notes' in data:
        record.notes = data['notes']

    record.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Record updated', 'record': record.to_dict()})

@records_bp.route('/<int:record_id>', methods=['DELETE'])
@role_required('admin')
def delete_record(record_id):
    record = FinancialRecord.query.filter_by(id=record_id, is_deleted=False).first_or_404()
    record.is_deleted = True  # soft delete
    db.session.commit()
    return jsonify({'message': 'Record deleted'})
