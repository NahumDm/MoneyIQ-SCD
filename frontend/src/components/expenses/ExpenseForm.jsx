import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { formatDateTimeLocal, toIsoDateTime } from '../../utils/format';
import Button from '../ui/Button';

const emptyForm = {
  amount: '',
  category: 'Food',
  reason: '',
  location: '',
  date: formatDateTimeLocal(new Date()),
};

export function getEmptyExpenseForm() {
  return { ...emptyForm, date: formatDateTimeLocal(new Date()) };
}

export function expenseToForm(expense) {
  if (!expense) return getEmptyExpenseForm();
  return {
    amount: String(expense.amount),
    category: expense.category,
    reason: expense.reason,
    location: expense.location,
    date: formatDateTimeLocal(expense.date),
  };
}

export function formToPayload(form) {
  return {
    amount: parseFloat(form.amount),
    category: form.category,
    reason: form.reason.trim(),
    location: form.location.trim(),
    date: toIsoDateTime(form.date),
  };
}

export default function ExpenseForm({ form, onChange, onSubmit, submitLabel, loading }) {
  const handleChange = (e) => {
    onChange({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount ($)</label>
        <input
          type="number"
          name="amount"
          min="0.01"
          step="0.01"
          required
          value={form.amount}
          onChange={handleChange}
          className="input-field font-mono"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
        <select name="category" value={form.category} onChange={handleChange} className="input-field">
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason</label>
        <input
          type="text"
          name="reason"
          required
          value={form.reason}
          onChange={handleChange}
          className="input-field"
          placeholder="What was this expense for?"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Location</label>
        <input
          type="text"
          name="location"
          required
          value={form.location}
          onChange={handleChange}
          className="input-field"
          placeholder="City, store, or venue"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Date & Time</label>
        <input
          type="datetime-local"
          name="date"
          required
          value={form.date}
          onChange={handleChange}
          className="input-field"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
