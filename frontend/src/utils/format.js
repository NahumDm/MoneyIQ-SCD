export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount ?? 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function formatDateTimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toIsoDateTime(dateInput) {
  if (!dateInput) return new Date().toISOString();
  return new Date(dateInput).toISOString();
}

export function getMonthLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function groupExpensesByCategory(expenses) {
  return expenses.reduce((acc, exp) => {
    const cat = exp.category || 'Other';
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});
}

export function getTopCategory(expenses) {
  const grouped = groupExpensesByCategory(expenses);
  const entries = Object.entries(grouped);
  if (!entries.length) return { category: '—', amount: 0 };
  return entries.sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }))[0];
}

export function getMonthlyTotal(expenses) {
  const now = new Date();
  return expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);
}
