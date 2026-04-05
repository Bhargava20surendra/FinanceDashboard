# FinLedger — Finance Dashboard

A full-stack finance dashboard built with **Flask + SQLite + HTML/CSS/JS** featuring role-based access control, financial record management, and analytics.

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app (seeds demo data automatically)
python app.py

# 3. Open http://localhost:5000
```

---

## Demo Accounts

| Username  | Password     | Role     | Permissions                        |
|-----------|-------------|----------|------------------------------------|
| admin     | admin123    | Admin    | Full access — CRUD records + users |
| analyst   | analyst123  | Analyst  | View + create/edit records         |
| viewer    | viewer123   | Viewer   | View-only                          |

---

## Project Structure

```
finance_dashboard/
├── app.py              # Flask app factory, blueprint registration
├── extensions.py       # SQLAlchemy instance
├── models.py           # User, FinancialRecord models
├── middleware.py       # login_required, role_required decorators
├── seed.py             # Demo data seeder
├── requirements.txt
├── routes/
│   ├── auth.py         # Login, logout, /me
│   ├── users.py        # User CRUD (admin only)
│   ├── records.py      # Financial record CRUD + filters
│   └── dashboard.py    # Summary & analytics endpoints
├── templates/
│   └── index.html      # Single-page app shell
└── static/
    ├── css/style.css
    └── js/app.js
```

---

## API Reference

### Auth
| Method | Endpoint         | Access | Description         |
|--------|-----------------|--------|---------------------|
| POST   | /api/auth/login  | Public | Login               |
| POST   | /api/auth/logout | Auth   | Logout              |
| GET    | /api/auth/me     | Auth   | Current user info   |

### Financial Records
| Method | Endpoint              | Access          | Description               |
|--------|-----------------------|-----------------|---------------------------|
| GET    | /api/records/         | All             | List with filters + pagination |
| GET    | /api/records/:id      | All             | Get single record         |
| POST   | /api/records/         | Admin, Analyst  | Create record             |
| PUT    | /api/records/:id      | Admin, Analyst  | Update record             |
| DELETE | /api/records/:id      | Admin only      | Soft delete               |

**Query params for GET /api/records/:**
- `type` — income | expense
- `category` — salary | freelance | investment | rent | food | utilities | transport | healthcare | entertainment | other
- `date_from`, `date_to` — YYYY-MM-DD
- `page`, `per_page` — pagination

### Dashboard
| Method | Endpoint                      | Access | Description              |
|--------|-------------------------------|--------|--------------------------|
| GET    | /api/dashboard/summary        | All    | Total income/expense/net |
| GET    | /api/dashboard/category-totals| All    | Totals grouped by category |
| GET    | /api/dashboard/monthly-trends | All    | Monthly income vs expense |
| GET    | /api/dashboard/weekly-trends  | All    | Weekly cash flow         |
| GET    | /api/dashboard/recent-activity| All    | Last N records           |

### Users (Admin Only)
| Method | Endpoint        | Description    |
|--------|----------------|----------------|
| GET    | /api/users/     | List all users |
| POST   | /api/users/     | Create user    |
| PUT    | /api/users/:id  | Update user    |
| DELETE | /api/users/:id  | Delete user    |

---

## Design Decisions & Assumptions

1. **Session-based auth** — Flask server-side sessions with a secret key. Token/JWT auth would be preferred in production.
2. **Soft deletes** — Records use `is_deleted=True` rather than hard deletion, preserving historical data.
3. **SQLite** — Used for simplicity; swap `SQLALCHEMY_DATABASE_URI` for PostgreSQL in production.
4. **Role model** — Three roles: `viewer` (read-only), `analyst` (read + create/edit records), `admin` (full access including user management).
5. **Categories** — Fixed set of 10 categories. Extendable via a `Category` model in production.
6. **Frontend** — Single-page app in vanilla JS with no framework dependency for simplicity.
7. **Currency** — Displayed in INR (₹) formatting. Easily changed in `fmt()` in app.js.

---

## Security Notes (Production Checklist)
- Replace `SECRET_KEY` with a secure random value from environment variables
- Use HTTPS in production
- Add CSRF protection (Flask-WTF)
- Rate limiting on auth endpoints
- Use PostgreSQL with connection pooling
- Add JWT/OAuth2 instead of session auth for API clients
