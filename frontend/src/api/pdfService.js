import apiClient from './client';

export const pdfApi = {
  generate: (html, options = {}) =>
    apiClient.post(
      '/pdf/generate',
      { html, options },
      { responseType: 'blob' }
    ),
};

export function buildExpenseReportHtml(expenses, userName = 'User') {
  const rows = expenses
    .map(
      (e) => `
      <tr>
        <td>${new Date(e.date).toLocaleDateString()}</td>
        <td>${e.category}</td>
        <td>${e.reason}</td>
        <td>${e.location}</td>
        <td style="text-align:right;font-weight:600;">$${e.amount.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #1e293b; padding: 40px; }
    h1 { color: #002060; margin-bottom: 4px; }
    .subtitle { color: #64748b; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { background: #002060; color: white; padding: 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .total { margin-top: 24px; text-align: right; font-size: 18px; font-weight: 700; color: #002060; }
  </style>
</head>
<body>
  <h1>Expense Report</h1>
  <p class="subtitle">Prepared for ${userName} · ${new Date().toLocaleDateString()}</p>
  <table>
    <thead>
      <tr><th>Date</th><th>Category</th><th>Reason</th><th>Location</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="5">No expenses</td></tr>'}</tbody>
  </table>
  <p class="total">Total: $${total.toFixed(2)}</p>
</body>
</html>`;
}
