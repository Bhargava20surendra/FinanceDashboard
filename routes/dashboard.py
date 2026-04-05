from flask import Blueprint, request, jsonify
from models import FinancialRecord
from extensions import db
from middleware import login_required
from sqlalchemy import func
from datetime import datetime, date, timedelta
import calendar

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
@login_required
def summary():
    records = FinancialRecord.query.filter_by(is_deleted=False)

    total_income = db.session.query(func.sum(FinancialRecord.amount))\
        .filter_by(type='income', is_deleted=False).scalar() or 0
    total_expense = db.session.query(func.sum(FinancialRecord.amount))\
        .filter_by(type='expense', is_deleted=False).scalar() or 0

    return jsonify({
        'total_income': round(total_income, 2),
        'total_expense': round(total_expense, 2),
        'net_balance': round(total_income - total_expense, 2)
    })

@dashboard_bp.route('/category-totals', methods=['GET'])
@login_required
def category_totals():
    results = db.session.query(
        FinancialRecord.category,
        FinancialRecord.type,
        func.sum(FinancialRecord.amount).label('total')
    ).filter_by(is_deleted=False)\
     .group_by(FinancialRecord.category, FinancialRecord.type).all()

    data = {}
    for category, rtype, total in results:
        if category not in data:
            data[category] = {'income': 0, 'expense': 0}
        data[category][rtype] = round(total, 2)

    return jsonify({'category_totals': data})

@dashboard_bp.route('/monthly-trends', methods=['GET'])
@login_required
def monthly_trends():
    results = db.session.query(
        func.strftime('%Y-%m', FinancialRecord.date).label('month'),
        FinancialRecord.type,
        func.sum(FinancialRecord.amount).label('total')
    ).filter_by(is_deleted=False)\
     .group_by('month', FinancialRecord.type)\
     .order_by('month').all()

    trends = {}
    for month, rtype, total in results:
        if month not in trends:
            trends[month] = {'income': 0, 'expense': 0}
        trends[month][rtype] = round(total, 2)

    return jsonify({'monthly_trends': trends})

@dashboard_bp.route('/recent-activity', methods=['GET'])
@login_required
def recent_activity():
    limit = int(request.args.get('limit', 10))
    records = FinancialRecord.query.filter_by(is_deleted=False)\
        .order_by(FinancialRecord.created_at.desc()).limit(limit).all()
    return jsonify({'recent_activity': [r.to_dict() for r in records]})

@dashboard_bp.route('/weekly-trends', methods=['GET'])
@login_required
def weekly_trends():
    today = date.today()
    start = today - timedelta(days=today.weekday() + 28)

    results = db.session.query(
        func.strftime('%Y-%W', FinancialRecord.date).label('week'),
        FinancialRecord.type,
        func.sum(FinancialRecord.amount).label('total')
    ).filter(
        FinancialRecord.is_deleted == False,
        FinancialRecord.date >= start
    ).group_by('week', FinancialRecord.type).order_by('week').all()

    trends = {}
    for week, rtype, total in results:
        if week not in trends:
            trends[week] = {'income': 0, 'expense': 0}
        trends[week][rtype] = round(total, 2)

    return jsonify({'weekly_trends': trends})
