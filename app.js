// =============================================
//  BHARATH FOOTWEAR — BUSINESS MANAGER
// =============================================

// ---------- DATA LAYER ----------
const DB = {
  KEYS: { SALES: 'bf_sales', EMP: 'bf_emp', BILLS: 'bf_bills', OTHER: 'bf_other', INV: 'bf_inv', MONTHLY: 'bf_monthly' },
  get(k)       { return JSON.parse(localStorage.getItem(this.KEYS[k]) || '[]'); },
  set(k, data) { localStorage.setItem(this.KEYS[k], JSON.stringify(data)); scheduleAutoSync(); },
  add(k, item) { const d = this.get(k); d.push(item); this.set(k, d); },
  remove(k, id){ this.set(k, this.get(k).filter(i => i.id !== id)); },
  update(k, item){ this.set(k, this.get(k).map(i => i.id === item.id ? item : i)); }
};

// ---------- HELPERS ----------
function uid()  { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
function todayStr()     { return new Date().toISOString().slice(0, 10); }
function thisMonthStr() { return new Date().toISOString().slice(0, 7); }

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dayName(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(m) - 1] + ' ' + y;
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 3000);
}

function confirm2(msg) { return window.confirm(msg); }

// Build month options for filter dropdowns (last 24 months + "All")
function buildMonthOptions(selectId, data, dateField = 'date') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const current = sel.value;
  const months = new Set();
  data.forEach(r => {
    const m = (r[dateField] || '').slice(0, 7);
    if (m) months.add(m);
  });
  months.add(thisMonthStr());
  const sorted = [...months].sort().reverse();
  sel.innerHTML = '<option value="all">All Months</option>' +
    sorted.map(m => `<option value="${m}">${fmtMonth(m)}</option>`).join('');
  if (current && [...sel.options].some(o => o.value === current)) sel.value = current;
  else sel.value = thisMonthStr();
}

// ---------- NAVIGATION ----------
const SECTIONS = ['dashboard','sales','expenses','inventory','reports'];
const TITLES   = { dashboard:'Dashboard', sales:'Daily Sales', expenses:'Expenses', inventory:'Inventory', reports:'Reports' };

function showSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById('sec-' + s).classList.toggle('active', s === name);
    document.querySelector(`.nav-item[data-section="${s}"]`).classList.toggle('active', s === name);
  });
  document.getElementById('pageTitle').textContent = TITLES[name];
  closeSidebar();

  if (name === 'dashboard')  renderDashboard();
  if (name === 'sales')      { buildMonthOptions('salesMonthFilter', DB.get('SALES')); renderSalesTable(); }
  if (name === 'expenses')   { renderEmployeeTable(); renderBillsTable(); renderOtherTable(); }
  if (name === 'inventory')  renderInventory();
  if (name === 'reports')    renderReports();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// Expense sub-tabs
function showExpenseTab(tab) {
  document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('exp-' + tab).classList.add('active');
  document.querySelector(`.tab-btn[data-exptab="${tab}"]`).classList.add('active');
  if (tab === 'monthly') { buildMonthOptions('monthlyMonthFilter', DB.get('MONTHLY'), 'month'); renderMonthlyTable(); }
}

// Navigate to monthly tab from reminder
function goToMonthly() {
  showSection('expenses');
  showExpenseTab('monthly');
}

// Dismiss reminder for this month
function dismissReminder() {
  const key = 'bf_reminder_dismissed_' + thisMonthStr();
  localStorage.setItem(key, '1');
  document.getElementById('monthlyReminder').classList.add('hidden');
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const today     = todayStr();
  const thisMonth = thisMonthStr();
  const thisYear  = today.slice(0, 4);

  const sales  = DB.get('SALES');
  const emp    = DB.get('EMP');
  const bills  = DB.get('BILLS');
  const other  = DB.get('OTHER');

  const todaySales = sales.filter(s => s.date === today).reduce((a,s) => a + Number(s.amount), 0);
  const monthSales = sales.filter(s => (s.date||'').startsWith(thisMonth)).reduce((a,s) => a + Number(s.amount), 0);
  const yearSales  = sales.filter(s => (s.date||'').startsWith(thisYear)).reduce((a,s) => a + Number(s.amount), 0);

  const monthly    = DB.get('MONTHLY');
  const monthEmp     = emp    .filter(e => (e.month||'').startsWith(thisMonth)).reduce((a,e) => a + Number(e.salary), 0);
  const monthBills   = bills  .filter(b => (b.date ||'').startsWith(thisMonth)).reduce((a,b) => a + Number(b.amount), 0);
  const monthOther   = other  .filter(o => (o.date ||'').startsWith(thisMonth)).reduce((a,o) => a + Number(o.amount), 0);
  const monthMonthly = monthly.filter(m => (m.month||'').startsWith(thisMonth)).reduce((a,m) => a + Number(m.amount), 0);
  const monthExp     = monthEmp + monthBills + monthOther + monthMonthly;
  const monthNet     = monthSales - monthExp;

  // Show/hide monthly reminder on the 1st of the month
  const reminderEl = document.getElementById('monthlyReminder');
  const today1st   = new Date().getDate() === 1;
  const dismissed  = localStorage.getItem('bf_reminder_dismissed_' + thisMonth);
  if (today1st && !dismissed) {
    reminderEl.classList.remove('hidden');
    document.getElementById('reminderSubText').textContent =
      'Add your rent, loan EMI, insurance and other fixed monthly costs for ' + fmtMonth(thisMonth) + '.';
  } else {
    reminderEl.classList.add('hidden');
  }

  // Stat cards
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card" style="--accent-color:var(--gold)">
      <div class="stat-icon">&#128197;</div>
      <div class="stat-label">Today's Sales</div>
      <div class="stat-value">${inr(todaySales)}</div>
      <div class="stat-sub">${fmtDate(today)}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--green)">
      <div class="stat-icon">&#128200;</div>
      <div class="stat-label">This Month Sales</div>
      <div class="stat-value">${inr(monthSales)}</div>
      <div class="stat-sub">${fmtMonth(thisMonth)}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--purple)">
      <div class="stat-icon">&#127882;</div>
      <div class="stat-label">This Year Sales</div>
      <div class="stat-value">${inr(yearSales)}</div>
      <div class="stat-sub">Jan – ${fmtDate(today).split(' ').slice(1).join(' ')}</div>
    </div>
    <div class="stat-card" style="--accent-color:${monthNet >= 0 ? 'var(--green)' : 'var(--red)'}">
      <div class="stat-icon">&#128181;</div>
      <div class="stat-label">Month Net Profit</div>
      <div class="stat-value" style="color:${monthNet >= 0 ? 'var(--green)' : 'var(--red)'}">${inr(monthNet)}</div>
      <div class="stat-sub">Sales − Expenses</div>
    </div>
  `;

  // Recent sales (last 5)
  const recent = [...sales].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
  const rEl = document.getElementById('dashRecentSales');
  if (!recent.length) {
    rEl.innerHTML = '<div class="empty-state small">No sales recorded yet.</div>';
  } else {
    rEl.innerHTML = '<div class="recent-list">' + recent.map(s => `
      <div class="recent-item">
        <div class="ri-left">
          <span class="ri-note">${fmtDate(s.date)} (${dayName(s.date)})</span>
          <span class="ri-date">${s.notes || 'No notes'}</span>
        </div>
        <span class="ri-amount">${inr(s.amount)}</span>
      </div>`).join('') + '</div>';
  }

  // Expense summary
  const expEl = document.getElementById('dashExpenses');
  expEl.innerHTML = `
    <div class="expense-summary">
      <div class="exp-row"><span class="exp-label">&#128197; Monthly Fixed</span><span class="exp-val">${inr(monthMonthly)}</span></div>
      <div class="exp-row"><span class="exp-label">&#128100; Employee Pay</span><span class="exp-val">${inr(monthEmp)}</span></div>
      <div class="exp-row"><span class="exp-label">&#129534; Bills &amp; Maintenance</span><span class="exp-val">${inr(monthBills)}</span></div>
      <div class="exp-row"><span class="exp-label">&#128204; Other Expenses</span><span class="exp-val">${inr(monthOther)}</span></div>
      <div class="exp-row" style="border-top:2px solid var(--border);margin-top:4px">
        <span class="exp-label" style="font-weight:700;color:var(--text)">Total Expenses</span>
        <span class="exp-val" style="font-size:1rem">${inr(monthExp)}</span>
      </div>
    </div>`;

  // Low stock alert
  const inv = DB.get('INV');
  const low = inv.filter(i => Number(i.qty) <= Number(i.reorder));
  const lEl = document.getElementById('dashLowStock');
  if (!low.length) {
    lEl.innerHTML = '<div class="empty-state small">&#10003; All products are well stocked!</div>';
  } else {
    lEl.innerHTML = '<div class="recent-list">' + low.map(i => `
      <div class="recent-item">
        <div class="ri-left">
          <span class="ri-note">${i.name} (${i.category})</span>
          <span class="ri-date">Reorder level: ${i.reorder} pairs</span>
        </div>
        <span class="badge ${Number(i.qty) === 0 ? 'badge-red' : 'badge-yellow'}">
          ${Number(i.qty) === 0 ? 'Out of Stock' : i.qty + ' left'}
        </span>
      </div>`).join('') + '</div>';
  }
}

// ---------- SALES ----------
let editingSaleId = null;

function saveSale() {
  const date   = document.getElementById('saleDate').value.trim();
  const amount = document.getElementById('saleAmount').value.trim();
  const notes  = document.getElementById('saleNotes').value.trim();

  if (!date)   { toast('Please select a date.', 'error'); return; }
  if (!amount || Number(amount) <= 0) { toast('Please enter a valid amount.', 'error'); return; }

  if (editingSaleId) {
    DB.update('SALES', { id: editingSaleId, date, amount: Number(amount), notes });
    toast('Sale updated successfully!');
    cancelSaleEdit();
  } else {
    DB.add('SALES', { id: uid(), date, amount: Number(amount), notes });
    toast('Sale recorded! Great job today 🎉', 'success');
    document.getElementById('saleAmount').value = '';
    document.getElementById('saleNotes').value = '';
  }
  buildMonthOptions('salesMonthFilter', DB.get('SALES'));
  renderSalesTable();
}

function editSale(id) {
  const sale = DB.get('SALES').find(s => s.id === id);
  if (!sale) return;
  editingSaleId = id;
  document.getElementById('saleDate').value   = sale.date;
  document.getElementById('saleAmount').value = sale.amount;
  document.getElementById('saleNotes').value  = sale.notes || '';
  document.getElementById('saleFormTitle').textContent = '✏️ Edit Sale Entry';
  document.getElementById('saleSaveBtn').textContent   = 'Update Sale';
  document.getElementById('saleCancelBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelSaleEdit() {
  editingSaleId = null;
  document.getElementById('saleFormTitle').textContent = '💰 Record Daily Sale';
  document.getElementById('saleSaveBtn').textContent   = '+ Add Sale';
  document.getElementById('saleCancelBtn').classList.add('hidden');
  document.getElementById('saleDate').value   = todayStr();
  document.getElementById('saleAmount').value = '';
  document.getElementById('saleNotes').value  = '';
}

function deleteSale(id) {
  if (!confirm2('Delete this sale record?')) return;
  DB.remove('SALES', id);
  toast('Sale deleted.', 'warning');
  buildMonthOptions('salesMonthFilter', DB.get('SALES'));
  renderSalesTable();
}

function renderSalesTable() {
  const filterVal = document.getElementById('salesMonthFilter').value || thisMonthStr();
  const all = DB.get('SALES');
  const rows = (filterVal === 'all' ? all : all.filter(s => (s.date||'').startsWith(filterVal)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = rows.reduce((a,s) => a + Number(s.amount), 0);
  const avg   = rows.length ? total / rows.length : 0;

  document.getElementById('salesSummaryBar').innerHTML = rows.length ? `
    <div class="summary-item"><div class="s-label">Total Sales</div><div class="s-value green">${inr(total)}</div></div>
    <div class="summary-item"><div class="s-label">Entries</div><div class="s-value">${rows.length}</div></div>
    <div class="summary-item"><div class="s-label">Daily Average</div><div class="s-value gold">${inr(Math.round(avg))}</div></div>
  ` : '';

  const tbody = document.getElementById('salesTableBody');
  const empty = document.getElementById('salesEmpty');

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = rows.map(s => `
    <tr>
      <td>${fmtDate(s.date)}</td>
      <td>${dayName(s.date)}</td>
      <td class="text-right amount amount-green">${inr(s.amount)}</td>
      <td>${s.notes || '<span style="color:var(--text-2);font-style:italic">—</span>'}</td>
      <td class="text-center">
        <button class="action-btn edit" title="Edit" onclick="editSale('${s.id}')">&#9998;</button>
        <button class="action-btn delete" title="Delete" onclick="deleteSale('${s.id}')">&#128465;</button>
      </td>
    </tr>`).join('');
}

// ---------- EMPLOYEE ----------
let editingEmpId = null;

function saveEmployee() {
  const name   = document.getElementById('empName').value.trim();
  const role   = document.getElementById('empRole').value.trim();
  const salary = document.getElementById('empSalary').value.trim();
  const month  = document.getElementById('empMonth').value;
  const status = document.getElementById('empStatus').value;

  if (!name)   { toast('Please enter employee name.', 'error'); return; }
  if (!salary || Number(salary) <= 0) { toast('Please enter a valid salary.', 'error'); return; }
  if (!month)  { toast('Please select a month.', 'error'); return; }

  const record = { name, role, salary: Number(salary), month, status };
  if (editingEmpId) {
    DB.update('EMP', { id: editingEmpId, ...record });
    toast('Employee record updated!');
    cancelEmpEdit();
  } else {
    DB.add('EMP', { id: uid(), ...record });
    toast('Employee record saved!', 'success');
    document.getElementById('empName').value   = '';
    document.getElementById('empRole').value   = '';
    document.getElementById('empSalary').value = '';
  }
  buildMonthOptions('empMonthFilter', DB.get('EMP'), 'month');
  renderEmployeeTable();
}

function editEmployee(id) {
  const r = DB.get('EMP').find(e => e.id === id);
  if (!r) return;
  editingEmpId = id;
  document.getElementById('empName').value    = r.name;
  document.getElementById('empRole').value    = r.role || '';
  document.getElementById('empSalary').value  = r.salary;
  document.getElementById('empMonth').value   = r.month;
  document.getElementById('empStatus').value  = r.status;
  document.getElementById('empFormTitle').textContent = '✏️ Edit Employee Record';
  document.getElementById('empSaveBtn').textContent   = 'Update Record';
  document.getElementById('empCancelBtn').classList.remove('hidden');
}

function cancelEmpEdit() {
  editingEmpId = null;
  document.getElementById('empFormTitle').textContent = '👤 Add Employee Salary';
  document.getElementById('empSaveBtn').textContent   = '+ Add Record';
  document.getElementById('empCancelBtn').classList.add('hidden');
  document.getElementById('empName').value   = '';
  document.getElementById('empRole').value   = '';
  document.getElementById('empSalary').value = '';
  document.getElementById('empMonth').value  = thisMonthStr();
  document.getElementById('empStatus').value = 'paid';
}

function deleteEmployee(id) {
  if (!confirm2('Delete this employee record?')) return;
  DB.remove('EMP', id);
  toast('Record deleted.', 'warning');
  buildMonthOptions('empMonthFilter', DB.get('EMP'), 'month');
  renderEmployeeTable();
}

function renderEmployeeTable() {
  const filterVal = document.getElementById('empMonthFilter').value || thisMonthStr();
  const all  = DB.get('EMP');
  const rows = (filterVal === 'all' ? all : all.filter(e => (e.month||'').startsWith(filterVal)))
    .sort((a,b) => b.month.localeCompare(a.month));

  const total   = rows.reduce((a,e) => a + Number(e.salary), 0);
  const pending = rows.filter(e => e.status === 'pending').reduce((a,e) => a + Number(e.salary), 0);

  document.getElementById('empSummaryBar').innerHTML = rows.length ? `
    <div class="summary-item"><div class="s-label">Total Salary</div><div class="s-value red">${inr(total)}</div></div>
    <div class="summary-item"><div class="s-label">Employees</div><div class="s-value">${rows.length}</div></div>
    <div class="summary-item"><div class="s-label">Pending</div><div class="s-value" style="color:var(--yellow)">${inr(pending)}</div></div>
  ` : '';

  const tbody = document.getElementById('empTableBody');
  const empty = document.getElementById('empEmpty');
  if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = rows.map(e => `
    <tr>
      <td><strong>${e.name}</strong></td>
      <td>${e.role || '—'}</td>
      <td>${fmtMonth(e.month)}</td>
      <td class="text-right amount amount-red">${inr(e.salary)}</td>
      <td class="text-center"><span class="badge badge-${e.status}">${e.status === 'paid' ? '✅ Paid' : '⏳ Pending'}</span></td>
      <td class="text-center">
        <button class="action-btn edit" onclick="editEmployee('${e.id}')">&#9998;</button>
        <button class="action-btn delete" onclick="deleteEmployee('${e.id}')">&#128465;</button>
      </td>
    </tr>`).join('');
}

// ---------- BILLS ----------
let editingBillId = null;

function saveBill() {
  const type   = document.getElementById('billType').value;
  const desc   = document.getElementById('billDesc').value.trim();
  const amount = document.getElementById('billAmount').value.trim();
  const date   = document.getElementById('billDate').value;
  const status = document.getElementById('billStatus').value;

  if (!amount || Number(amount) <= 0) { toast('Please enter a valid amount.', 'error'); return; }
  if (!date) { toast('Please select a date.', 'error'); return; }

  const record = { type, desc, amount: Number(amount), date, status };
  if (editingBillId) {
    DB.update('BILLS', { id: editingBillId, ...record });
    toast('Bill updated!');
    cancelBillEdit();
  } else {
    DB.add('BILLS', { id: uid(), ...record });
    toast('Bill recorded!', 'success');
    document.getElementById('billDesc').value   = '';
    document.getElementById('billAmount').value = '';
  }
  buildMonthOptions('billMonthFilter', DB.get('BILLS'));
  renderBillsTable();
}

function editBill(id) {
  const r = DB.get('BILLS').find(b => b.id === id);
  if (!r) return;
  editingBillId = id;
  document.getElementById('billType').value   = r.type;
  document.getElementById('billDesc').value   = r.desc || '';
  document.getElementById('billAmount').value = r.amount;
  document.getElementById('billDate').value   = r.date;
  document.getElementById('billStatus').value = r.status;
  document.getElementById('billFormTitle').textContent = '✏️ Edit Bill';
  document.getElementById('billSaveBtn').textContent   = 'Update Bill';
  document.getElementById('billCancelBtn').classList.remove('hidden');
}

function cancelBillEdit() {
  editingBillId = null;
  document.getElementById('billFormTitle').textContent = '🧾 Add Bill / Maintenance';
  document.getElementById('billSaveBtn').textContent   = '+ Add Bill';
  document.getElementById('billCancelBtn').classList.add('hidden');
  document.getElementById('billDesc').value   = '';
  document.getElementById('billAmount').value = '';
  document.getElementById('billDate').value   = todayStr();
  document.getElementById('billStatus').value = 'paid';
}

function deleteBill(id) {
  if (!confirm2('Delete this bill record?')) return;
  DB.remove('BILLS', id);
  toast('Bill deleted.', 'warning');
  buildMonthOptions('billMonthFilter', DB.get('BILLS'));
  renderBillsTable();
}

function renderBillsTable() {
  const filterVal = document.getElementById('billMonthFilter').value || thisMonthStr();
  const all  = DB.get('BILLS');
  const rows = (filterVal === 'all' ? all : all.filter(b => (b.date||'').startsWith(filterVal)))
    .sort((a,b) => b.date.localeCompare(a.date));

  const total   = rows.reduce((a,b) => a + Number(b.amount), 0);
  const pending = rows.filter(b => b.status === 'pending').reduce((a,b) => a + Number(b.amount), 0);

  document.getElementById('billSummaryBar').innerHTML = rows.length ? `
    <div class="summary-item"><div class="s-label">Total Bills</div><div class="s-value red">${inr(total)}</div></div>
    <div class="summary-item"><div class="s-label">Count</div><div class="s-value">${rows.length}</div></div>
    <div class="summary-item"><div class="s-label">Pending</div><div class="s-value" style="color:var(--yellow)">${inr(pending)}</div></div>
  ` : '';

  const tbody = document.getElementById('billsTableBody');
  const empty = document.getElementById('billsEmpty');
  if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = rows.map(b => `
    <tr>
      <td><span class="badge badge-blue">${b.type}</span></td>
      <td>${b.desc || '—'}</td>
      <td>${fmtDate(b.date)}</td>
      <td class="text-right amount amount-red">${inr(b.amount)}</td>
      <td class="text-center"><span class="badge badge-${b.status}">${b.status === 'paid' ? '✅ Paid' : '⏳ Pending'}</span></td>
      <td class="text-center">
        <button class="action-btn edit" onclick="editBill('${b.id}')">&#9998;</button>
        <button class="action-btn delete" onclick="deleteBill('${b.id}')">&#128465;</button>
      </td>
    </tr>`).join('');
}

// ---------- OTHER EXPENSES ----------
let editingOtherId = null;

function saveOther() {
  const desc   = document.getElementById('otherDesc').value.trim();
  const amount = document.getElementById('otherAmount').value.trim();
  const date   = document.getElementById('otherDate').value;

  if (!desc)   { toast('Please enter a description.', 'error'); return; }
  if (!amount || Number(amount) <= 0) { toast('Please enter a valid amount.', 'error'); return; }
  if (!date)   { toast('Please select a date.', 'error'); return; }

  const record = { desc, amount: Number(amount), date };
  if (editingOtherId) {
    DB.update('OTHER', { id: editingOtherId, ...record });
    toast('Expense updated!');
    cancelOtherEdit();
  } else {
    DB.add('OTHER', { id: uid(), ...record });
    toast('Expense recorded!', 'success');
    document.getElementById('otherDesc').value   = '';
    document.getElementById('otherAmount').value = '';
  }
  buildMonthOptions('otherMonthFilter', DB.get('OTHER'));
  renderOtherTable();
}

function editOther(id) {
  const r = DB.get('OTHER').find(o => o.id === id);
  if (!r) return;
  editingOtherId = id;
  document.getElementById('otherDesc').value   = r.desc;
  document.getElementById('otherAmount').value = r.amount;
  document.getElementById('otherDate').value   = r.date;
  document.getElementById('otherFormTitle').textContent = '✏️ Edit Expense';
  document.getElementById('otherSaveBtn').textContent   = 'Update Expense';
  document.getElementById('otherCancelBtn').classList.remove('hidden');
}

function cancelOtherEdit() {
  editingOtherId = null;
  document.getElementById('otherFormTitle').textContent = '📌 Add Other Expense';
  document.getElementById('otherSaveBtn').textContent   = '+ Add Expense';
  document.getElementById('otherCancelBtn').classList.add('hidden');
  document.getElementById('otherDesc').value   = '';
  document.getElementById('otherAmount').value = '';
  document.getElementById('otherDate').value   = todayStr();
}

function deleteOther(id) {
  if (!confirm2('Delete this expense?')) return;
  DB.remove('OTHER', id);
  toast('Expense deleted.', 'warning');
  buildMonthOptions('otherMonthFilter', DB.get('OTHER'));
  renderOtherTable();
}

function renderOtherTable() {
  const filterVal = document.getElementById('otherMonthFilter').value || thisMonthStr();
  const all  = DB.get('OTHER');
  const rows = (filterVal === 'all' ? all : all.filter(o => (o.date||'').startsWith(filterVal)))
    .sort((a,b) => b.date.localeCompare(a.date));

  const total = rows.reduce((a,o) => a + Number(o.amount), 0);

  document.getElementById('otherSummaryBar').innerHTML = rows.length ? `
    <div class="summary-item"><div class="s-label">Total</div><div class="s-value red">${inr(total)}</div></div>
    <div class="summary-item"><div class="s-label">Count</div><div class="s-value">${rows.length}</div></div>
  ` : '';

  const tbody = document.getElementById('otherTableBody');
  const empty = document.getElementById('otherEmpty');
  if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = rows.map(o => `
    <tr>
      <td>${o.desc}</td>
      <td>${fmtDate(o.date)}</td>
      <td class="text-right amount amount-red">${inr(o.amount)}</td>
      <td class="text-center">
        <button class="action-btn edit" onclick="editOther('${o.id}')">&#9998;</button>
        <button class="action-btn delete" onclick="deleteOther('${o.id}')">&#128465;</button>
      </td>
    </tr>`).join('');
}

// ---------- MONTHLY FIXED EXPENSES ----------
let editingMonthlyId = null;

function saveMonthly() {
  const month    = document.getElementById('monthlyMonth').value;
  const category = document.getElementById('monthlyCategory').value;
  const desc     = document.getElementById('monthlyDesc').value.trim();
  const amount   = document.getElementById('monthlyAmount').value.trim();
  const status   = document.getElementById('monthlyStatus').value;

  if (!month)  { toast('Please select a month.', 'error'); return; }
  if (!amount || Number(amount) <= 0) { toast('Please enter a valid amount.', 'error'); return; }

  const record = { month, category, desc, amount: Number(amount), status };
  if (editingMonthlyId) {
    DB.update('MONTHLY', { id: editingMonthlyId, ...record });
    toast('Monthly expense updated!');
    cancelMonthlyEdit();
  } else {
    DB.add('MONTHLY', { id: uid(), ...record });
    toast('Monthly fixed expense saved!', 'success');
    document.getElementById('monthlyDesc').value   = '';
    document.getElementById('monthlyAmount').value = '';
  }
  buildMonthOptions('monthlyMonthFilter', DB.get('MONTHLY'), 'month');
  renderMonthlyTable();
}

function editMonthly(id) {
  const r = DB.get('MONTHLY').find(m => m.id === id);
  if (!r) return;
  editingMonthlyId = id;
  document.getElementById('monthlyMonth').value    = r.month;
  document.getElementById('monthlyCategory').value = r.category;
  document.getElementById('monthlyDesc').value     = r.desc || '';
  document.getElementById('monthlyAmount').value   = r.amount;
  document.getElementById('monthlyStatus').value   = r.status;
  document.getElementById('monthlyFormTitle').textContent = '✏️ Edit Monthly Expense';
  document.getElementById('monthlySaveBtn').textContent   = 'Update Expense';
  document.getElementById('monthlyCancelBtn').classList.remove('hidden');
}

function cancelMonthlyEdit() {
  editingMonthlyId = null;
  document.getElementById('monthlyFormTitle').textContent = '📅 Add Monthly Fixed Expense';
  document.getElementById('monthlySaveBtn').textContent   = '+ Add Monthly Expense';
  document.getElementById('monthlyCancelBtn').classList.add('hidden');
  document.getElementById('monthlyMonth').value    = thisMonthStr();
  document.getElementById('monthlyDesc').value     = '';
  document.getElementById('monthlyAmount').value   = '';
  document.getElementById('monthlyStatus').value   = 'paid';
}

function deleteMonthly(id) {
  if (!confirm2('Delete this monthly fixed expense?')) return;
  DB.remove('MONTHLY', id);
  toast('Expense deleted.', 'warning');
  buildMonthOptions('monthlyMonthFilter', DB.get('MONTHLY'), 'month');
  renderMonthlyTable();
}

function renderMonthlyTable() {
  const filterVal = document.getElementById('monthlyMonthFilter').value || thisMonthStr();
  const all  = DB.get('MONTHLY');
  const rows = (filterVal === 'all' ? all : all.filter(m => (m.month||'').startsWith(filterVal)))
    .sort((a,b) => b.month.localeCompare(a.month));

  const total   = rows.reduce((a,m) => a + Number(m.amount), 0);
  const pending = rows.filter(m => m.status === 'pending').reduce((a,m) => a + Number(m.amount), 0);

  document.getElementById('monthlySummaryBar').innerHTML = rows.length ? `
    <div class="summary-item"><div class="s-label">Total Fixed</div><div class="s-value red">${inr(total)}</div></div>
    <div class="summary-item"><div class="s-label">Entries</div><div class="s-value">${rows.length}</div></div>
    <div class="summary-item"><div class="s-label">Pending</div><div class="s-value" style="color:var(--yellow)">${inr(pending)}</div></div>
  ` : '';

  const tbody = document.getElementById('monthlyTableBody');
  const empty = document.getElementById('monthlyEmpty');
  if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = rows.map(m => `
    <tr>
      <td><strong>${fmtMonth(m.month)}</strong></td>
      <td><span class="badge badge-blue">${m.category}</span></td>
      <td>${m.desc || '—'}</td>
      <td class="text-right amount amount-red">${inr(m.amount)}</td>
      <td class="text-center"><span class="badge badge-${m.status}">${m.status === 'paid' ? '✅ Paid' : '⏳ Pending'}</span></td>
      <td class="text-center">
        <button class="action-btn edit" onclick="editMonthly('${m.id}')">&#9998;</button>
        <button class="action-btn delete" onclick="deleteMonthly('${m.id}')">&#128465;</button>
      </td>
    </tr>`).join('');
}

// ---------- INVENTORY ----------
let editingInvId = null;
let qtyEditId    = null;

function saveInventoryItem() {
  const name      = document.getElementById('invName').value.trim();
  const category  = document.getElementById('invCategory').value;
  const size      = document.getElementById('invSize').value.trim();
  const qty       = document.getElementById('invQty').value.trim();
  const buyPrice  = document.getElementById('invBuyPrice').value.trim();
  const sellPrice = document.getElementById('invSellPrice').value.trim();
  const reorder   = document.getElementById('invReorder').value.trim();

  if (!name) { toast('Please enter a product name.', 'error'); return; }
  if (!qty || Number(qty) < 0) { toast('Please enter a valid quantity.', 'error'); return; }

  const record = {
    name, category, size,
    qty:       Number(qty),
    buyPrice:  Number(buyPrice)  || 0,
    sellPrice: Number(sellPrice) || 0,
    reorder:   Number(reorder)   || 10
  };

  if (editingInvId) {
    DB.update('INV', { id: editingInvId, ...record });
    toast('Product updated!');
    cancelInvEdit();
  } else {
    DB.add('INV', { id: uid(), ...record });
    toast('Product added to inventory!', 'success');
    document.getElementById('invName').value      = '';
    document.getElementById('invSize').value      = '';
    document.getElementById('invQty').value       = '';
    document.getElementById('invBuyPrice').value  = '';
    document.getElementById('invSellPrice').value = '';
    document.getElementById('invReorder').value   = '10';
  }
  renderInventory();
}

function editInventoryItem(id) {
  const r = DB.get('INV').find(i => i.id === id);
  if (!r) return;
  editingInvId = id;
  document.getElementById('invName').value      = r.name;
  document.getElementById('invCategory').value  = r.category;
  document.getElementById('invSize').value      = r.size || '';
  document.getElementById('invQty').value       = r.qty;
  document.getElementById('invBuyPrice').value  = r.buyPrice  || '';
  document.getElementById('invSellPrice').value = r.sellPrice || '';
  document.getElementById('invReorder').value   = r.reorder;
  document.getElementById('invFormTitle').textContent = '✏️ Edit Product';
  document.getElementById('invSaveBtn').textContent   = 'Update Product';
  document.getElementById('invCancelBtn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelInvEdit() {
  editingInvId = null;
  document.getElementById('invFormTitle').textContent = '📦 Add Product to Inventory';
  document.getElementById('invSaveBtn').textContent   = '+ Add to Inventory';
  document.getElementById('invCancelBtn').classList.add('hidden');
  document.getElementById('invName').value      = '';
  document.getElementById('invSize').value      = '';
  document.getElementById('invQty').value       = '';
  document.getElementById('invBuyPrice').value  = '';
  document.getElementById('invSellPrice').value = '';
  document.getElementById('invReorder').value   = '10';
}

function deleteInventoryItem(id) {
  if (!confirm2('Remove this product from inventory?')) return;
  DB.remove('INV', id);
  toast('Product removed.', 'warning');
  renderInventory();
}

function openQtyModal(id) {
  const item = DB.get('INV').find(i => i.id === id);
  if (!item) return;
  qtyEditId = id;
  document.getElementById('qtyModalProduct').textContent = item.name + ' — current qty: ' + item.qty;
  document.getElementById('qtyInput').value = item.qty;
  document.getElementById('qtyModal').style.display = 'flex';
}

function adjustQty(delta) {
  const input = document.getElementById('qtyInput');
  input.value = Math.max(0, Number(input.value) + delta);
}

function saveQty() {
  const qty = Number(document.getElementById('qtyInput').value);
  if (qty < 0) { toast('Quantity cannot be negative.', 'error'); return; }
  const inv = DB.get('INV').map(i => i.id === qtyEditId ? { ...i, qty } : i);
  DB.set('INV', inv);
  toast('Stock quantity updated!', 'success');
  closeQtyModal();
  renderInventory();
}

function closeQtyModal() {
  document.getElementById('qtyModal').style.display = 'none';
  qtyEditId = null;
}

function renderInventory() {
  const items = DB.get('INV').sort((a,b) => a.name.localeCompare(b.name));
  const totalItems  = items.length;
  const totalPairs  = items.reduce((a,i) => a + Number(i.qty), 0);
  const lowCount    = items.filter(i => Number(i.qty) <= Number(i.reorder) && Number(i.qty) > 0).length;
  const outCount    = items.filter(i => Number(i.qty) === 0).length;
  const totalValue  = items.reduce((a,i) => a + Number(i.qty) * Number(i.sellPrice), 0);

  document.getElementById('invSummaryBar').innerHTML = `
    <div class="summary-item"><div class="s-label">Products</div><div class="s-value">${totalItems}</div></div>
    <div class="summary-item"><div class="s-label">Total Pairs</div><div class="s-value">${totalPairs}</div></div>
    <div class="summary-item"><div class="s-label">Low Stock</div><div class="s-value" style="color:var(--yellow)">${lowCount}</div></div>
    <div class="summary-item"><div class="s-label">Out of Stock</div><div class="s-value red">${outCount}</div></div>
    <div class="summary-item"><div class="s-label">Stock Value</div><div class="s-value green">${inr(totalValue)}</div></div>
  `;

  const tbody = document.getElementById('invTableBody');
  const empty = document.getElementById('invEmpty');
  if (!items.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tbody.innerHTML = items.map(i => {
    const qty      = Number(i.qty);
    const reorder  = Number(i.reorder);
    const buy      = Number(i.buyPrice)  || 0;
    const sell     = Number(i.sellPrice) || 0;
    const margin   = buy > 0 ? Math.round(((sell - buy) / buy) * 100) : 0;
    const statusBadge = qty === 0
      ? '<span class="badge badge-red">Out of Stock</span>'
      : qty <= reorder
        ? '<span class="badge badge-yellow">Low Stock</span>'
        : '<span class="badge badge-green">In Stock</span>';
    return `
      <tr>
        <td><strong>${i.name}</strong></td>
        <td>${i.category}</td>
        <td>${i.size || '—'}</td>
        <td class="text-right">
          <div class="qty-cell">
            <button class="qty-inline-btn" onclick="openQtyModal('${i.id}')">&#9998;</button>
            <strong style="min-width:32px;display:inline-block;text-align:right">${qty}</strong>
          </div>
        </td>
        <td class="text-right">${buy ? inr(buy) : '—'}</td>
        <td class="text-right">${sell ? inr(sell) : '—'}</td>
        <td class="text-right">${buy && sell ? `<span style="color:${margin >= 0 ? 'var(--green)' : 'var(--red)'}">${margin}%</span>` : '—'}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <button class="action-btn edit" onclick="editInventoryItem('${i.id}')">&#9998;</button>
          <button class="action-btn delete" onclick="deleteInventoryItem('${i.id}')">&#128465;</button>
        </td>
      </tr>`;
  }).join('');
}

// ---------- REPORTS ----------
function renderReports() {
  const yearSel = document.getElementById('reportYear');
  const years   = new Set();
  const today   = new Date();
  years.add(String(today.getFullYear()));
  years.add(String(today.getFullYear() - 1));

  DB.get('SALES').forEach(s  => years.add((s.date||'').slice(0,4)));
  DB.get('EMP').forEach(e    => years.add((e.month||'').slice(0,4)));
  DB.get('BILLS').forEach(b  => years.add((b.date||'').slice(0,4)));
  DB.get('OTHER').forEach(o  => years.add((o.date||'').slice(0,4)));

  const sorted = [...years].filter(y => y && y.length === 4).sort().reverse();
  const curSel = yearSel.value || String(today.getFullYear());
  yearSel.innerHTML = sorted.map(y => `<option value="${y}">${y}</option>`).join('');
  if ([...yearSel.options].some(o => o.value === curSel)) yearSel.value = curSel;

  const year   = yearSel.value;
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const mNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const sales   = DB.get('SALES');
  const emp     = DB.get('EMP');
  const bills   = DB.get('BILLS');
  const other   = DB.get('OTHER');
  const monthly = DB.get('MONTHLY');

  let yearSalesTotal = 0, yearEmpTotal = 0, yearBillsTotal = 0, yearMonthlyTotal = 0, yearOtherTotal = 0;

  const monthData = months.map((m, idx) => {
    const ym = year + '-' + m;
    const s  = sales  .filter(r => (r.date  ||'').startsWith(ym)).reduce((a,r) => a+Number(r.amount),0);
    const e  = emp    .filter(r => (r.month ||'').startsWith(ym)).reduce((a,r) => a+Number(r.salary),0);
    const b  = bills  .filter(r => (r.date  ||'').startsWith(ym)).reduce((a,r) => a+Number(r.amount),0);
    const mf = monthly.filter(r => (r.month ||'').startsWith(ym)).reduce((a,r) => a+Number(r.amount),0);
    const o  = other  .filter(r => (r.date  ||'').startsWith(ym)).reduce((a,r) => a+Number(r.amount),0);
    const exp = e + b + mf + o;
    const net = s - exp;
    yearSalesTotal += s; yearEmpTotal += e; yearBillsTotal += b; yearMonthlyTotal += mf; yearOtherTotal += o;
    return { month: mNames[idx], short: mShort[idx], s, e, b, mf, o, exp, net };
  });

  const yearExp = yearEmpTotal + yearBillsTotal + yearMonthlyTotal + yearOtherTotal;
  const yearNet = yearSalesTotal - yearExp;

  // Year stat cards
  document.getElementById('reportYearStats').innerHTML = `
    <div class="stat-card" style="--accent-color:var(--green)">
      <div class="stat-icon">&#128200;</div>
      <div class="stat-label">Year Total Sales</div>
      <div class="stat-value">${inr(yearSalesTotal)}</div>
      <div class="stat-sub">${year}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--red)">
      <div class="stat-icon">&#128203;</div>
      <div class="stat-label">Year Total Expenses</div>
      <div class="stat-value" style="color:var(--red)">${inr(yearExp)}</div>
      <div class="stat-sub">Salary + Bills + Other</div>
    </div>
    <div class="stat-card" style="--accent-color:${yearNet >= 0 ? 'var(--green)' : 'var(--red)'}">
      <div class="stat-icon">&#128181;</div>
      <div class="stat-label">Year Net Profit</div>
      <div class="stat-value" style="color:${yearNet >= 0 ? 'var(--green)' : 'var(--red)'}">${inr(yearNet)}</div>
      <div class="stat-sub">Sales − All Expenses</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--gold)">
      <div class="stat-icon">&#128198;</div>
      <div class="stat-label">Avg Monthly Sales</div>
      <div class="stat-value">${inr(Math.round(yearSalesTotal / 12))}</div>
      <div class="stat-sub">Per month average</div>
    </div>
  `;

  // Monthly table
  const dash = '<span style="color:var(--text-2)">—</span>';
  document.getElementById('reportTableBody').innerHTML = monthData.map(d => `
    <tr>
      <td><strong>${d.month}</strong></td>
      <td class="text-right amount-green">${d.s  ? inr(d.s)  : dash}</td>
      <td class="text-right amount-red">${d.e  ? inr(d.e)  : dash}</td>
      <td class="text-right amount-red">${d.b  ? inr(d.b)  : dash}</td>
      <td class="text-right amount-red">${d.mf ? inr(d.mf) : dash}</td>
      <td class="text-right amount-red">${d.o  ? inr(d.o)  : dash}</td>
      <td class="text-right amount-red">${d.exp ? inr(d.exp) : dash}</td>
      <td class="text-right ${d.net >= 0 ? 'report-positive' : 'report-negative'}">${d.s || d.exp ? inr(d.net) : dash}</td>
    </tr>`).join('');

  document.getElementById('reportTableFoot').innerHTML = `
    <tr>
      <td>TOTAL (${year})</td>
      <td class="text-right">${inr(yearSalesTotal)}</td>
      <td class="text-right">${inr(yearEmpTotal)}</td>
      <td class="text-right">${inr(yearBillsTotal)}</td>
      <td class="text-right">${inr(yearMonthlyTotal)}</td>
      <td class="text-right">${inr(yearOtherTotal)}</td>
      <td class="text-right">${inr(yearExp)}</td>
      <td class="text-right ${yearNet >= 0 ? 'report-positive' : 'report-negative'}">${inr(yearNet)}</td>
    </tr>`;

  // Bar chart
  const maxVal = Math.max(...monthData.map(d => Math.max(d.s, d.exp)), 1);
  const chartEl = document.getElementById('barChart');
  const hasData = monthData.some(d => d.s > 0 || d.exp > 0);
  if (!hasData) {
    chartEl.innerHTML = '<div class="bar-empty-msg">No data for ' + year + '. Start recording sales to see the chart.</div>';
  } else {
    chartEl.innerHTML = monthData.map(d => {
      const sh = Math.round((d.s   / maxVal) * 180);
      const eh = Math.round((d.exp / maxVal) * 180);
      return `
        <div class="bar-group" title="${d.month}: Sales ${inr(d.s)}, Expenses ${inr(d.exp)}">
          <div class="bar-pair">
            <div class="bar sales"    style="height:${sh}px"></div>
            <div class="bar expenses" style="height:${eh}px"></div>
          </div>
          <span class="bar-label">${d.short}</span>
        </div>`;
    }).join('');
  }
}

// =============================================
//  WEEKLY AI AGENT
// =============================================

function runAgentNow() {
  const insight = generateWeeklyInsight();
  const notes   = JSON.parse(localStorage.getItem('bf_agent_notes') || '[]');
  notes.unshift({ id: uid(), date: todayStr(), insight });
  if (notes.length > 16) notes.pop(); // keep last 16 weeks
  localStorage.setItem('bf_agent_notes', JSON.stringify(notes));
  localStorage.setItem('bf_last_agent_check', new Date().toISOString());
  renderWeeklyInsight();
  toast('Weekly analysis complete!', 'success');
}

function autoRunAgentIfDue() {
  const last = localStorage.getItem('bf_last_agent_check');
  const due  = !last || (Date.now() - new Date(last).getTime()) > 7 * 24 * 60 * 60 * 1000;
  if (due) runAgentNow();
  else renderWeeklyInsight();
}

function generateWeeklyInsight() {
  const today   = new Date();
  const sales   = DB.get('SALES');
  const emp     = DB.get('EMP');
  const bills   = DB.get('BILLS');
  const monthly = DB.get('MONTHLY');
  const other   = DB.get('OTHER');
  const inv     = DB.get('INV');

  // ---- This week vs last week ----
  const dow           = today.getDay();
  const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - dow); thisWeekStart.setHours(0,0,0,0);
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd   = new Date(thisWeekStart); lastWeekEnd.setDate(thisWeekStart.getDate() - 1); lastWeekEnd.setHours(23,59,59,999);

  const thisWeekSales = sales.filter(s => new Date(s.date + 'T00:00:00') >= thisWeekStart)
                             .reduce((a,s) => a + Number(s.amount), 0);
  const lastWeekSales = sales.filter(s => { const d = new Date(s.date + 'T00:00:00'); return d >= lastWeekStart && d <= lastWeekEnd; })
                             .reduce((a,s) => a + Number(s.amount), 0);

  let salesTrendPct = 0, salesTrendText = 'No sales this week yet';
  if (lastWeekSales > 0) {
    salesTrendPct  = Math.round(((thisWeekSales - lastWeekSales) / lastWeekSales) * 100);
    salesTrendText = salesTrendPct >= 0 ? `▲ ${salesTrendPct}% from last week` : `▼ ${Math.abs(salesTrendPct)}% from last week`;
  } else if (thisWeekSales > 0) {
    salesTrendPct  = 100;
    salesTrendText = '▲ First week with recorded sales';
  }

  // ---- Monthly pace & projection ----
  const thisMonth       = thisMonthStr();
  const monthSales      = sales.filter(s => (s.date||'').startsWith(thisMonth)).reduce((a,s) => a + Number(s.amount), 0);
  const daysInMonth     = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth      = today.getDate();
  const projectedSales  = dayOfMonth > 0 ? Math.round((monthSales / dayOfMonth) * daysInMonth) : 0;
  const paceStatus      = projectedSales > 0
    ? (projectedSales > monthSales * 1.1 ? 'ahead of pace' : projectedSales < monthSales * 0.9 ? 'behind pace' : 'on track')
    : 'no data';

  // ---- Best & worst day of week ----
  const dayTotals = Array(7).fill(0), dayCounts = Array(7).fill(0);
  sales.forEach(s => {
    if (s.date) {
      const d = new Date(s.date + 'T00:00:00').getDay();
      dayTotals[d] += Number(s.amount);
      dayCounts[d]++;
    }
  });
  const dayAvgs   = dayTotals.map((t,i) => dayCounts[i] > 0 ? Math.round(t / dayCounts[i]) : 0);
  const DAYS      = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const bestDayIdx  = dayAvgs.indexOf(Math.max(...dayAvgs));
  const worstDayIdx = dayAvgs.indexOf(Math.min(...dayAvgs.filter(v => v > 0)));
  const bestDay     = dayAvgs[bestDayIdx] > 0 ? DAYS[bestDayIdx] : null;
  const worstDay    = dayAvgs[worstDayIdx] > 0 && bestDayIdx !== worstDayIdx ? DAYS[worstDayIdx] : null;

  // ---- Expense ratio ----
  const monthEmp     = emp    .filter(e => (e.month||'').startsWith(thisMonth)).reduce((a,e) => a + Number(e.salary), 0);
  const monthBills   = bills  .filter(b => (b.date ||'').startsWith(thisMonth)).reduce((a,b) => a + Number(b.amount), 0);
  const monthMonthly = monthly.filter(m => (m.month||'').startsWith(thisMonth)).reduce((a,m) => a + Number(m.amount), 0);
  const monthOther   = other  .filter(o => (o.date ||'').startsWith(thisMonth)).reduce((a,o) => a + Number(o.amount), 0);
  const monthExp     = monthEmp + monthBills + monthMonthly + monthOther;
  const expRatio     = monthSales > 0 ? Math.round((monthExp / monthSales) * 100) : 0;

  // ---- Inventory ----
  const lowStockItems  = inv.filter(i => Number(i.qty) > 0 && Number(i.qty) <= Number(i.reorder));
  const outStockItems  = inv.filter(i => Number(i.qty) === 0);
  const totalStockVal  = inv.reduce((a,i) => a + Number(i.qty) * Number(i.sellPrice || 0), 0);

  // ---- Month-over-month trend (last 3 months) ----
  const prev1Month = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0,7);
  const prev2Month = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0,7);
  const prev1Sales = sales.filter(s => (s.date||'').startsWith(prev1Month)).reduce((a,s) => a + Number(s.amount), 0);
  const prev2Sales = sales.filter(s => (s.date||'').startsWith(prev2Month)).reduce((a,s) => a + Number(s.amount), 0);
  const trend3m    = [prev2Sales, prev1Sales, monthSales].filter(v => v > 0);
  const trendDir   = trend3m.length >= 2
    ? (trend3m[trend3m.length - 1] > trend3m[trend3m.length - 2] ? 'growing' : 'declining')
    : 'insufficient data';

  // ---- Recommendations ----
  const recs = [];

  if (salesTrendPct <= -15)
    recs.push(`Sales dropped ${Math.abs(salesTrendPct)}% this week. Consider a small discount or promotion to attract customers.`);
  else if (salesTrendPct >= 25)
    recs.push(`Sales surged ${salesTrendPct}% this week — great performance! Ensure inventory is stocked to keep up with demand.`);

  if (trendDir === 'growing' && trend3m.length >= 2)
    recs.push(`Monthly sales are on a growing trend over the last ${trend3m.length} months. Keep the momentum going!`);
  else if (trendDir === 'declining' && trend3m.length >= 2)
    recs.push(`Monthly sales have been declining. Review if any seasonal factor or competition is affecting footfall.`);

  if (expRatio > 75)
    recs.push(`Expense ratio is ${expRatio}% — very high. Audit your biggest cost category and look for savings.`);
  else if (expRatio > 0 && expRatio <= 35)
    recs.push(`Expense ratio of ${expRatio}% is excellent — your business is running lean and profitable.`);
  else if (expRatio > 50 && expRatio <= 75)
    recs.push(`Expense ratio of ${expRatio}% is manageable but watch if it rises further.`);

  if (outStockItems.length > 0)
    recs.push(`Restock urgently: ${outStockItems.slice(0,3).map(i => i.name).join(', ')} ${outStockItems.length > 3 ? `+${outStockItems.length-3} more` : ''} are completely out of stock.`);

  if (lowStockItems.length > 0)
    recs.push(`${lowStockItems.length} product(s) are running low — reorder ${lowStockItems.slice(0,2).map(i => i.name).join(', ')} soon to avoid stockouts.`);

  if (bestDay)
    recs.push(`${bestDay} is your highest-earning day on average. Plan special offers or extra staff for ${bestDay}s.`);

  if (worstDay)
    recs.push(`${worstDay} tends to be slow. Consider weekend or mid-week promotions to boost sales on that day.`);

  if (projectedSales > 0 && dayOfMonth < 25)
    recs.push(`You're projected to earn ${inr(projectedSales)} this month. You're currently ${paceStatus}.`);

  if (recs.length === 0)
    recs.push('Keep recording your daily sales and expenses — the more data you enter, the sharper these predictions become!');

  return {
    thisWeekSales, lastWeekSales, salesTrendPct, salesTrendText,
    monthSales, projectedSales, dayOfMonth, daysInMonth, paceStatus,
    bestDay, worstDay, expRatio, monthExp,
    lowStock: lowStockItems.length, outOfStock: outStockItems.length,
    totalStockVal, trendDir, recommendations: recs
  };
}

function renderWeeklyInsight() {
  const notes   = JSON.parse(localStorage.getItem('bf_agent_notes') || '[]');
  const lastChk = localStorage.getItem('bf_last_agent_check');
  const el      = document.getElementById('agentInsightContent');
  const chkEl   = document.getElementById('agentLastChecked');

  if (lastChk) chkEl.textContent = 'Last checked: ' + fmtDate(lastChk.slice(0,10));

  if (!notes.length) {
    el.innerHTML = `<div class="agent-empty"><div style="font-size:2.5rem">&#129302;</div>
      <p>Your AI agent is ready! Click <strong>Run Now</strong> to get your first business insight.</p>
      <p style="font-size:0.8rem;color:var(--text-2)">The agent will run automatically every week after that.</p>
    </div>`;
    return;
  }

  const d = notes[0].insight;
  const trendClass = d.salesTrendPct > 0 ? 'insight-good' : d.salesTrendPct < -10 ? 'insight-bad' : '';
  const expClass   = d.expRatio > 70 ? 'insight-warn' : d.expRatio > 0 ? 'insight-good' : '';

  el.innerHTML = `
    <div class="insight-grid">
      <div class="insight-item ${trendClass}">
        <div class="insight-icon">${d.salesTrendPct >= 0 ? '&#128200;' : '&#128201;'}</div>
        <div class="insight-body">
          <div class="insight-label">This Week's Sales</div>
          <div class="insight-value">${inr(d.thisWeekSales)}</div>
          <div class="insight-note">${d.salesTrendText}<br>Last week: ${inr(d.lastWeekSales)}</div>
        </div>
      </div>
      <div class="insight-item">
        <div class="insight-icon">&#127882;</div>
        <div class="insight-body">
          <div class="insight-label">Month Projection</div>
          <div class="insight-value">${inr(d.projectedSales)}</div>
          <div class="insight-note">${inr(d.monthSales)} earned in ${d.dayOfMonth} of ${d.daysInMonth} days<br>${d.paceStatus}</div>
        </div>
      </div>
      <div class="insight-item">
        <div class="insight-icon">&#127942;</div>
        <div class="insight-body">
          <div class="insight-label">Best Sales Day</div>
          <div class="insight-value">${d.bestDay || '—'}</div>
          <div class="insight-note">${d.worstDay ? 'Slowest day: ' + d.worstDay : 'Based on all recorded sales'}<br>3-month trend: ${d.trendDir}</div>
        </div>
      </div>
      <div class="insight-item ${expClass}">
        <div class="insight-icon">${d.expRatio > 70 ? '&#9888;' : '&#9989;'}</div>
        <div class="insight-body">
          <div class="insight-label">Expense Ratio</div>
          <div class="insight-value">${d.expRatio > 0 ? d.expRatio + '%' : '—'}</div>
          <div class="insight-note">Expenses are ${d.expRatio}% of this month's sales<br>Total expenses: ${inr(d.monthExp)}</div>
        </div>
      </div>
    </div>
    ${(d.outOfStock > 0 || d.lowStock > 0) ? `
    <div class="insight-alert">
      &#9888; Stock Alert: <strong>${d.outOfStock} out of stock</strong>, ${d.lowStock} running low &nbsp;|&nbsp; Stock value on hand: ${inr(d.totalStockVal)}
    </div>` : ''}
    <div class="insight-recommendations">
      <div class="insight-rec-title">&#128161; Recommendations from your Agent</div>
      <ul class="insight-rec-list">
        ${d.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>`;

  renderAgentHistory(notes);
}

function toggleAgentHistory() {
  document.getElementById('agentHistory').classList.toggle('hidden');
}

function renderAgentHistory(notes) {
  if (!notes || notes.length < 2) return;
  const listEl = document.getElementById('agentHistoryList');
  listEl.innerHTML = notes.slice(1).map(n => {
    const d = n.insight;
    return `<div class="history-note">
      <div class="history-note-date">&#128197; Week of ${fmtDate(n.date)}</div>
      <div class="history-note-summary">
        Sales: ${inr(d.thisWeekSales)} (${d.salesTrendText}) &nbsp;|&nbsp;
        Projected month: ${inr(d.projectedSales)} &nbsp;|&nbsp;
        Expense ratio: ${d.expRatio}%
      </div>
    </div>`;
  }).join('');
}

// =============================================
//  AUTO SYNC — fires 1.5s after any data change
// =============================================

let _syncTimer = null;

function scheduleAutoSync() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(autoSyncNow, 1500);
}

async function autoSyncNow() {
  const url = (document.getElementById('sheetsUrl') && document.getElementById('sheetsUrl').value.trim())
              || localStorage.getItem('bf_sheets_url') || '';
  if (!url) return;

  const statusEl = document.getElementById('syncStatus');
  if (statusEl) { statusEl.textContent = '⏳ Auto-saving...'; statusEl.className = ''; }

  const notes = JSON.parse(localStorage.getItem('bf_agent_notes') || '[]');
  const payload = {
    sales:    DB.get('SALES'),
    emp:      DB.get('EMP'),
    bills:    DB.get('BILLS'),
    monthly:  DB.get('MONTHLY'),
    other:    DB.get('OTHER'),
    inv:      DB.get('INV'),
    insights: notes.slice(0, 10)
  };

  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
      mode:    'no-cors'
    });
    if (statusEl) {
      statusEl.textContent = '✅ Auto-saved: ' + new Date().toLocaleTimeString('en-IN');
      statusEl.className   = 'ok';
    }
  } catch (err) {
    if (statusEl) { statusEl.textContent = '⚠️ Auto-save failed'; statusEl.className = 'fail'; }
  }
}


// =============================================
//  GOOGLE SHEETS SYNC
// =============================================

function saveSheetsUrl() {
  const url = document.getElementById('sheetsUrl').value.trim();
  localStorage.setItem('bf_sheets_url', url);
}

async function loadFromSheets() {
  const url = (document.getElementById('sheetsUrl').value.trim()) || localStorage.getItem('bf_sheets_url') || '';
  const statusEl = document.getElementById('syncStatus');

  if (!url) {
    toast('Please enter your Google Apps Script URL first.', 'error');
    return;
  }

  if (statusEl) { statusEl.textContent = '⏳ Loading from Sheets...'; statusEl.className = ''; }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'error') {
      toast('Error: ' + (data.message || 'Unknown error'), 'error');
      if (statusEl) { statusEl.textContent = '❌ Load failed'; statusEl.className = 'fail'; }
      return;
    }

    if (!data.sales && !data.emp && !data.inv) {
      toast('No data found in Sheets yet. Ask your family to press "Sync Now" on their device first.', 'error');
      if (statusEl) { statusEl.textContent = '⚠️ No data in Sheets'; statusEl.className = 'fail'; }
      return;
    }

    // Write directly to localStorage to avoid triggering auto-sync loop
    if (data.sales)   localStorage.setItem(DB.KEYS.SALES,   JSON.stringify(data.sales));
    if (data.emp)     localStorage.setItem(DB.KEYS.EMP,     JSON.stringify(data.emp));
    if (data.bills)   localStorage.setItem(DB.KEYS.BILLS,   JSON.stringify(data.bills));
    if (data.monthly) localStorage.setItem(DB.KEYS.MONTHLY, JSON.stringify(data.monthly));
    if (data.other)   localStorage.setItem(DB.KEYS.OTHER,   JSON.stringify(data.other));
    if (data.inv)     localStorage.setItem(DB.KEYS.INV,     JSON.stringify(data.inv));

    toast('Data loaded from Google Sheets! Dashboard updated.', 'success');
    if (statusEl) {
      statusEl.textContent = '✅ Loaded: ' + new Date().toLocaleTimeString('en-IN');
      statusEl.className = 'ok';
    }

    renderDashboard();
  } catch (err) {
    toast('Could not reach Google Sheets. Check the URL and try again.', 'error');
    if (statusEl) { statusEl.textContent = '❌ Load failed'; statusEl.className = 'fail'; }
  }
}

async function syncToSheets() {
  const url = document.getElementById('sheetsUrl').value.trim() || localStorage.getItem('bf_sheets_url') || '';
  const statusEl = document.getElementById('syncStatus');

  if (!url) {
    toast('Please enter your Google Apps Script Web App URL first.', 'error');
    return;
  }

  const notes = JSON.parse(localStorage.getItem('bf_agent_notes') || '[]');

  const payload = {
    sales:    DB.get('SALES'),
    emp:      DB.get('EMP'),
    bills:    DB.get('BILLS'),
    monthly:  DB.get('MONTHLY'),
    other:    DB.get('OTHER'),
    inv:      DB.get('INV'),
    insights: notes.slice(0, 10)
  };

  statusEl.textContent = '⏳ Syncing...';
  statusEl.className   = '';

  try {
    // no-cors bypasses CORS restriction on Apps Script; response will be opaque (unreadable) but the request goes through
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
      mode:    'no-cors'
    });
    toast('Synced to Google Sheets successfully!', 'success');
    statusEl.textContent = '✅ Last synced: ' + new Date().toLocaleTimeString('en-IN');
    statusEl.className   = 'ok';
  } catch (err) {
    toast('Sync failed. Check your Web App URL.', 'error');
    statusEl.textContent = '❌ Sync failed';
    statusEl.className   = 'fail';
  }
}

// ---------- INIT ----------
function init() {
  // Set today's date
  const now = new Date();
  document.getElementById('topDate').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Greeting
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good Morning!' : hour < 17 ? 'Good Afternoon!' : 'Good Evening!';
  const welcomeEl = document.getElementById('welcomeText');
  if (welcomeEl) welcomeEl.textContent = greet;

  // Default date/month inputs
  document.getElementById('saleDate').value    = todayStr();
  document.getElementById('empMonth').value    = thisMonthStr();
  document.getElementById('billDate').value    = todayStr();
  document.getElementById('otherDate').value   = todayStr();
  document.getElementById('monthlyMonth').value = thisMonthStr();

  // Build initial month filter options
  buildMonthOptions('salesMonthFilter',   DB.get('SALES'));
  buildMonthOptions('empMonthFilter',     DB.get('EMP'),     'month');
  buildMonthOptions('billMonthFilter',    DB.get('BILLS'));
  buildMonthOptions('otherMonthFilter',   DB.get('OTHER'));
  buildMonthOptions('monthlyMonthFilter', DB.get('MONTHLY'), 'month');

  // Restore saved Google Sheets URL (localStorage takes priority, else use the hardcoded default)
  const savedUrl = localStorage.getItem('bf_sheets_url');
  const defaultUrl = 'https://script.google.com/macros/s/AKfycbys_KrMIDLVAlfI_PvOn1JeYfdG5AsuHCyY3qj-tyDAyhtYXlBixUh6LXgkRFPSrTSRUQ/exec';
  document.getElementById('sheetsUrl').value = savedUrl || defaultUrl;

  renderDashboard();
  autoRunAgentIfDue();
}

document.addEventListener('DOMContentLoaded', init);
