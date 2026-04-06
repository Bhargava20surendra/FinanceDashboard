/* ─── STATE ─── */
let currentUser = null;
let currentPage = 1;
let totalPages = 1;
const BASE_URL = "https://finance-app-backend.onrender.com";
const ROLE_HINTS = {
  viewer: '👁 Read-only access — view dashboard, records, and summaries.',
  analyst: '📊 Can view everything and create or edit financial records.',
  admin: '⚙ Full control — manage records, users, and all settings.'
};

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('signup-btn').addEventListener('click', signup);
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  document.getElementById('signup-role').addEventListener('change', updateRoleHint);
  await checkAuth();
});

/* ─── TAB SWITCHING ─── */
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('signup-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
  document.getElementById('signup-success').classList.add('hidden');
}

function updateRoleHint() {
  const role = document.getElementById('signup-role').value;
  const hint = document.getElementById('role-hint');
  hint.textContent = ROLE_HINTS[role] || '';
  hint.style.color = role === 'admin' ? 'var(--accent)' : role === 'analyst' ? 'var(--balance)' : 'var(--text3)';
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  } catch (e) { }
}

/* ─── AUTH ─── */
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  if (!username || !password) { showError(errEl, 'Please enter username and password'); return; }

  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) { showError(errEl, data.error || 'Login failed'); return; }
  setUser(data.user);
}

async function signup() {
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const role = document.getElementById('signup-role').value;
  const errEl = document.getElementById('signup-error');
  const okEl = document.getElementById('signup-success');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!username) { showError(errEl, 'Username is required'); return; }
  if (!email) { showError(errEl, 'Email is required'); return; }
  if (!password) { showError(errEl, 'Password is required'); return; }
  if (!role) { showError(errEl, 'Please select a role'); return; }

  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, role })
  });
  const data = await res.json();
  btn.disabled = false;
  btn.textContent = 'Create Account →';

  if (!res.ok) { showError(errEl, data.error || 'Registration failed'); return; }

  // Auto-login on successful registration
  setUser(data.user);
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  document.body.className = '';
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function setUser(user) {
  currentUser = user;
  document.body.className = `role-${user.role}`;
  document.getElementById('sidebar-username').textContent = user.username;
  document.getElementById('sidebar-role').textContent = user.role;
  document.getElementById('user-avatar').textContent = user.username[0].toUpperCase();

  // Clear forms
  ['login-username', 'login-password', 'signup-username', 'signup-email', 'signup-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('signup-role').value = '';
  document.getElementById('role-hint').textContent = '';
  switchTab('login'); // reset tab state for next logout

  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');

  // Show/hide add record button based on role
  const addBtn = document.getElementById('add-record-btn');
  if (user.role === 'viewer') addBtn.style.display = 'none';
  else addBtn.style.display = '';

  // Navigate to role-appropriate default page
  if (user.role === 'admin') navigate('dashboard');
  else if (user.role === 'analyst') navigate('records');
  else navigate('dashboard');  // viewer sees summary dashboard
}

/* ─── NAVIGATION ─── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  if (page === 'dashboard') loadDashboard();
  if (page === 'records') { currentPage = 1; loadRecords(); }
  if (page === 'analytics') loadAnalytics();
  if (page === 'users') loadUsers();
}

/* ─── DASHBOARD ─── */
async function loadDashboard() {
  const [summary, monthly, categories, recent] = await Promise.all([
    apiFetch('/api/dashboard/summary'),
    apiFetch('/api/dashboard/monthly-trends'),
    apiFetch('/api/dashboard/category-totals'),
    apiFetch('/api/dashboard/recent-activity?limit=8')
  ]);

  if (summary) {
    document.getElementById('kpi-income').textContent = fmt(summary.total_income);
    document.getElementById('kpi-expense').textContent = fmt(summary.total_expense);
    const bal = summary.net_balance;
    document.getElementById('kpi-balance').textContent = fmt(bal);
    document.querySelector('.balance-bar').style.background = bal >= 0 ? 'var(--income)' : 'var(--expense)';
  }

  if (monthly) renderMonthlyChart(monthly.monthly_trends);
  if (categories) renderCategoryChart(categories.category_totals);
  if (recent) renderRecentTable(recent.recent_activity);
}

function renderMonthlyChart(trends) {
  const el = document.getElementById('monthly-chart');
  const months = Object.keys(trends).slice(-6);
  if (!months.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div>No data yet</div>'; return; }

  const maxVal = Math.max(...months.flatMap(m => [trends[m].income || 0, trends[m].expense || 0])) || 1;
  const W = 480, H = 160, pad = 30, barW = 18, gap = 60;

  let svgBars = '';
  months.forEach((month, i) => {
    const x = pad + i * gap;
    const inc = ((trends[month].income || 0) / maxVal) * (H - 20);
    const exp = ((trends[month].expense || 0) / maxVal) * (H - 20);
    const label = month.slice(5); // MM
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mLabel = monthNames[parseInt(label)] || label;

    svgBars += `
      <rect class="bar-income" x="${x}" y="${H - inc}" width="${barW}" height="${inc}" rx="3">
        <title>Income: ${fmt(trends[month].income || 0)}</title>
      </rect>
      <rect class="bar-expense" x="${x + barW + 3}" y="${H - exp}" width="${barW}" height="${exp}" rx="3">
        <title>Expense: ${fmt(trends[month].expense || 0)}</title>
      </rect>
      <text class="chart-label" x="${x + barW}" y="${H + 14}" text-anchor="middle">${mLabel}</text>
    `;
  });

  el.innerHTML = `<svg class="bar-chart" viewBox="0 0 ${pad + months.length * gap + 20} ${H + 24}" xmlns="http://www.w3.org/2000/svg">
    <line class="chart-axis" x1="${pad}" y1="${H}" x2="${pad + months.length * gap}" y2="${H}"/>
    ${svgBars}
    <circle cx="10" cy="8" r="4" fill="rgba(74,222,128,0.7)"/>
    <text class="chart-label" x="18" y="12">Income</text>
    <circle cx="70" cy="8" r="4" fill="rgba(248,113,113,0.7)"/>
    <text class="chart-label" x="78" y="12">Expense</text>
  </svg>`;
}

function renderCategoryChart(cats) {
  const el = document.getElementById('category-chart');
  const COLORS = ['#c8a96e', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#94a3b8', '#fbbf24'];
  const entries = Object.entries(cats).map(([k, v]) => ({ name: k, total: (v.income || 0) + (v.expense || 0) }))
    .sort((a, b) => b.total - a.total).slice(0, 8);
  const max = Math.max(...entries.map(e => e.total)) || 1;

  el.innerHTML = `<div class="donut-wrap">${entries.map((e, i) => `
    <div class="donut-item">
      <div class="donut-dot" style="background:${COLORS[i % COLORS.length]}"></div>
      <div class="donut-name">${e.name}</div>
      <div style="flex:1;margin:0 8px;height:4px;background:var(--border);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${(e.total / max * 100).toFixed(0)}%;background:${COLORS[i % COLORS.length]};border-radius:2px;transition:width 0.6s"></div>
      </div>
      <div class="donut-val">${fmt(e.total)}</div>
    </div>`).join('')}
  </div>`;
}

function renderRecentTable(records) {
  const tbody = document.getElementById('recent-table');
  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div>No records yet</div></td></tr>';
    return;
  }
  tbody.innerHTML = records.map(r => `
    <tr>
      <td><span style="font-family:'DM Mono',monospace;font-size:12px">${r.date}</span></td>
      <td style="text-transform:capitalize">${r.category}</td>
      <td><span class="badge badge-${r.type}">${r.type}</span></td>
      <td class="amount-${r.type}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</td>
      <td style="color:var(--text3);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes || '—'}</td>
    </tr>`).join('');
}

/* ─── RECORDS ─── */
async function loadRecords() {
  const type = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const from = document.getElementById('filter-from').value;
  const to = document.getElementById('filter-to').value;

  let url = `/api/records/?page=${currentPage}&per_page=15`;
  if (type) url += `&type=${type}`;
  if (category) url += `&category=${category}`;
  if (from) url += `&date_from=${from}`;
  if (to) url += `&date_to=${to}`;

  const data = await apiFetch(url);
  if (!data) return;

  totalPages = data.pages;
  const tbody = document.getElementById('records-table');
  const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'analyst');
  const canDelete = currentUser && currentUser.role === 'admin';

  if (!data.records.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📋</div>No records found</div></td></tr>';
  } else {
    tbody.innerHTML = data.records.map(r => `
      <tr>
        <td><span style="font-family:'DM Mono',monospace;font-size:12px">${r.date}</span></td>
        <td style="text-transform:capitalize">${r.category}</td>
        <td><span class="badge badge-${r.type}">${r.type}</span></td>
        <td class="amount-${r.type}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</td>
        <td style="color:var(--text3);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes || '—'}</td>
        <td class="analyst-admin">
          <div class="action-cell">
            ${canEdit ? `<button class="btn-edit" onclick="openEditRecord(${r.id})">Edit</button>` : ''}
            ${canDelete ? `<button class="btn-danger" onclick="deleteRecord(${r.id})">Delete</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  }

  renderPagination(data.total, data.pages, data.current_page);
}

function renderPagination(total, pages, page) {
  const el = document.getElementById('records-pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = `<span class="page-info">${total} records</span>`;
  if (page > 1) html += `<button class="page-btn" onclick="goPage(${page - 1})">← Prev</button>`;
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
    html += `<button class="page-btn${i === page ? ' current' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (page < pages) html += `<button class="page-btn" onclick="goPage(${page + 1})">Next →</button>`;
  el.innerHTML = html;
}

function goPage(p) { currentPage = p; loadRecords(); }
function clearFilters() {
  ['filter-type', 'filter-category', 'filter-from', 'filter-to'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
  });
  currentPage = 1;
  loadRecords();
}

/* ─── ANALYTICS ─── */
async function loadAnalytics() {
  const [weekly, categories] = await Promise.all([
    apiFetch('/api/dashboard/weekly-trends'),
    apiFetch('/api/dashboard/category-totals')
  ]);
  if (weekly) renderWeeklyChart(weekly.weekly_trends);
  if (categories) renderCategoryCompare(categories.category_totals);
}

function renderWeeklyChart(trends) {
  const el = document.getElementById('weekly-chart');
  const weeks = Object.keys(trends).slice(-8);
  if (!weeks.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div>No data</div>'; return; }
  const maxVal = Math.max(...weeks.flatMap(w => [trends[w].income || 0, trends[w].expense || 0])) || 1;
  const W = 500, H = 160, pad = 30, barW = 16, gap = 54;

  let bars = '';
  weeks.forEach((w, i) => {
    const x = pad + i * gap;
    const inc = ((trends[w].income || 0) / maxVal) * (H - 20);
    const exp = ((trends[w].expense || 0) / maxVal) * (H - 20);
    const label = 'W' + (w.split('-W')[1] || i + 1);
    bars += `
      <rect class="bar-income" x="${x}" y="${H - inc}" width="${barW}" height="${inc}" rx="3">
        <title>Income: ${fmt(trends[w].income || 0)}</title>
      </rect>
      <rect class="bar-expense" x="${x + barW + 3}" y="${H - exp}" width="${barW}" height="${exp}" rx="3">
        <title>Expense: ${fmt(trends[w].expense || 0)}</title>
      </rect>
      <text class="chart-label" x="${x + barW}" y="${H + 14}" text-anchor="middle">${label}</text>`;
  });

  el.innerHTML = `<svg class="bar-chart" viewBox="0 0 ${pad + weeks.length * gap + 20} ${H + 24}" xmlns="http://www.w3.org/2000/svg">
    <line class="chart-axis" x1="${pad}" y1="${H}" x2="${pad + weeks.length * gap}" y2="${H}"/>
    ${bars}
  </svg>`;
}

function renderCategoryCompare(cats) {
  const el = document.getElementById('category-compare');
  const COLORS = ['#c8a96e', '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#f472b6'];
  const entries = Object.entries(cats)
    .map(([k, v]) => ({ name: k, income: v.income || 0, expense: v.expense || 0 }))
    .filter(e => e.income || e.expense)
    .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
    .slice(0, 7);
  const max = Math.max(...entries.flatMap(e => [e.income, e.expense])) || 1;

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">${entries.map((e, i) => `
    <div>
      <div style="font-size:11px;color:var(--text2);text-transform:capitalize;margin-bottom:4px">${e.name}</div>
      <div style="display:flex;gap:4px;align-items:center">
        <div title="Income ${fmt(e.income)}" style="height:6px;background:rgba(74,222,128,0.7);border-radius:3px;width:${(e.income / max * 120).toFixed(0)}px;min-width:2px"></div>
        <div title="Expense ${fmt(e.expense)}" style="height:6px;background:rgba(248,113,113,0.7);border-radius:3px;width:${(e.expense / max * 120).toFixed(0)}px;min-width:2px"></div>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);margin-left:4px">${fmt(e.income + e.expense)}</span>
      </div>
    </div>`).join('')}
  </div>`;
}

/* ─── USERS ─── */
async function loadUsers() {
  const data = await apiFetch('/api/users/');
  if (!data) return;
  const tbody = document.getElementById('users-table');
  tbody.innerHTML = data.users.map(u => `
    <tr>
      <td style="font-weight:500;color:var(--text)">${u.username}</td>
      <td style="font-size:12px;color:var(--text3)">${u.email}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td><span class="badge badge-${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-cell">
          <button class="btn-edit" onclick="openEditUser(${u.id},'${u.username}','${u.email}','${u.role}',${u.is_active})">Edit</button>
          <button class="btn-danger" onclick="deleteUser(${u.id})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ─── MODALS: RECORD ─── */
function openAddRecord() {
  openModal('Add Financial Record', recordForm(null));
}

async function openEditRecord(id) {
  const data = await apiFetch(`/api/records/${id}`);
  if (!data) return;
  openModal('Edit Record', recordForm(data.record));
}

function recordForm(record) {
  const CATS = ['salary', 'freelance', 'investment', 'rent', 'food', 'utilities', 'transport', 'healthcare', 'entertainment', 'other'];
  return `
    <div id="record-modal-error" class="modal-error hidden"></div>
    <div class="field-group"><label>Type</label>
      <select id="rf-type">
        <option value="income" ${record?.type === 'income' ? 'selected' : ''}>Income</option>
        <option value="expense" ${record?.type === 'expense' ? 'selected' : ''}>Expense</option>
      </select></div>
    <div class="field-group"><label>Amount</label>
      <input type="number" id="rf-amount" step="0.01" min="0.01" placeholder="0.00" value="${record?.amount || ''}"/></div>
    <div class="field-group"><label>Category</label>
      <select id="rf-category">${CATS.map(c => `<option value="${c}" ${record?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field-group"><label>Date</label>
      <input type="date" id="rf-date" value="${record?.date || new Date().toISOString().slice(0, 10)}"/></div>
    <div class="field-group"><label>Notes</label>
      <textarea id="rf-notes" rows="2" placeholder="Optional notes...">${record?.notes || ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveRecord(${record?.id || 'null'})">${record ? 'Update' : 'Create'}</button>
    </div>`;
}

async function saveRecord(id) {
  const errEl = document.getElementById('record-modal-error');
  errEl.classList.add('hidden');
  const payload = {
    type: document.getElementById('rf-type').value,
    amount: parseFloat(document.getElementById('rf-amount').value),
    category: document.getElementById('rf-category').value,
    date: document.getElementById('rf-date').value,
    notes: document.getElementById('rf-notes').value
  };
  if (!payload.date) { showError(errEl, 'Date is required'); return; }
  if (isNaN(payload.amount) || payload.amount <= 0) { showError(errEl, 'Amount must be a positive number'); return; }

  const url = id ? `/api/records/${id}` : '/api/records/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) { showError(errEl, data.error || 'Error saving record'); return; }
  closeModal();
  loadRecords();
}

async function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
  if (res.ok) loadRecords();
}

/* ─── MODALS: USER ─── */
function openAddUser() {
  openModal('Add User', userForm(null));
}

function openEditUser(id, username, email, role, is_active) {
  openModal('Edit User', userForm({ id, username, email, role, is_active }));
}

function userForm(user) {
  return `
    <div id="user-modal-error" class="modal-error hidden"></div>
    <div class="field-group"><label>Username</label>
      <input type="text" id="uf-username" value="${user?.username || ''}" ${user ? 'readonly' : ''}/>
    </div>
    <div class="field-group"><label>Email</label>
      <input type="email" id="uf-email" value="${user?.email || ''}"/></div>
    <div class="field-group"><label>Password ${user ? '(leave blank to keep)' : ''}</label>
      <input type="password" id="uf-password" placeholder="${user ? 'New password (optional)' : 'Password'}"/></div>
    <div class="field-group"><label>Role</label>
      <select id="uf-role">
        <option value="viewer" ${user?.role === 'viewer' ? 'selected' : ''}>Viewer</option>
        <option value="analyst" ${user?.role === 'analyst' ? 'selected' : ''}>Analyst</option>
        <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select></div>
    ${user ? `<div class="field-group"><label>Status</label>
      <select id="uf-active">
        <option value="1" ${user.is_active ? 'selected' : ''}>Active</option>
        <option value="0" ${!user.is_active ? 'selected' : ''}>Inactive</option>
      </select></div>` : ''}
    <div class="modal-actions">
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveUser(${user?.id || 'null'})">${user ? 'Update' : 'Create'}</button>
    </div>`;
}

async function saveUser(id) {
  const errEl = document.getElementById('user-modal-error');
  errEl.classList.add('hidden');
  const payload = {
    username: document.getElementById('uf-username').value.trim(),
    email: document.getElementById('uf-email').value.trim(),
    password: document.getElementById('uf-password').value,
    role: document.getElementById('uf-role').value,
  };
  if (!id && !payload.password) { showError(errEl, 'Password is required'); return; }
  if (!payload.email) { showError(errEl, 'Email is required'); return; }
  if (id) {
    payload.is_active = document.getElementById('uf-active').value === '1';
    if (!payload.password) delete payload.password;
  }

  const url = id ? `/api/users/${id}` : '/api/users/';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) { showError(errEl, data.error || 'Error saving user'); return; }
  closeModal();
  loadUsers();
}

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) { alert(data.error || 'Cannot delete user'); return; }
  loadUsers();
}

/* ─── MODAL HELPERS ─── */
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ─── UTILS ─── */
async function apiFetch(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Something went wrong");  // ✅ ADD THIS
      return null;
    }

    return data;
  } catch (e) {
    alert("Network error");
    return null;
  }
}

function fmt(num) {
  return '₹' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      document.getElementById('login-screen').classList.add('active');
      document.getElementById('app-screen').classList.remove('active');
    }
  } catch (e) {
    document.getElementById('login-screen').classList.add('active');
  }
}
