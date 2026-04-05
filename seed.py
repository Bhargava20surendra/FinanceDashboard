from models import User, FinancialRecord
from extensions import db
from datetime import date, timedelta
import random

def seed_data():
    if User.query.first():
        return  # Already seeded

    # Create users
    admin = User(username='admin', email='admin@finance.com', role='admin', is_active=True)
    admin.set_password('admin123')

    analyst = User(username='analyst', email='analyst@finance.com', role='analyst', is_active=True)
    analyst.set_password('analyst123')

    viewer = User(username='viewer', email='viewer@finance.com', role='viewer', is_active=True)
    viewer.set_password('viewer123')

    db.session.add_all([admin, analyst, viewer])
    db.session.commit()

    # Seed financial records
    categories_income = ['salary', 'freelance', 'investment']
    categories_expense = ['rent', 'food', 'utilities', 'transport', 'healthcare', 'entertainment']

    records = []
    today = date.today()
    for i in range(60):
        d = today - timedelta(days=i * 3)
        # income
        records.append(FinancialRecord(
            amount=round(random.uniform(500, 5000), 2),
            type='income',
            category=random.choice(categories_income),
            date=d,
            notes='Auto-generated seed record',
            created_by=admin.id
        ))
        # expense
        records.append(FinancialRecord(
            amount=round(random.uniform(50, 2000), 2),
            type='expense',
            category=random.choice(categories_expense),
            date=d,
            notes='Auto-generated seed record',
            created_by=admin.id
        ))

    db.session.add_all(records)
    db.session.commit()
    print("✅ Seed data created. Login with: admin/admin123, analyst/analyst123, viewer/viewer123")
