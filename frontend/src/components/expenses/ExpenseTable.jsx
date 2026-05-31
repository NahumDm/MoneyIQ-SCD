import { formatCurrency, formatDate } from '../../utils/format';

const categoryIcons = {
  Food: '🍽️',
  Transport: '🚌',
  Shopping: '🛍️',
  Bills: '📄',
  Entertainment: '🎬',
  Health: '💊',
  Travel: '✈️',
  Other: '📦',
};

export default function ExpenseTable({ expenses, onEdit, onDelete }) {
  if (!expenses.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <p className="text-4xl">💸</p>
        <p className="mt-3 font-medium text-slate-600">No expenses yet</p>
        <p className="text-sm text-neutral">Add your first expense to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-5 py-3 font-semibold text-slate-600">Date</th>
              <th className="px-5 py-3 font-semibold text-slate-600">Category</th>
              <th className="px-5 py-3 font-semibold text-slate-600">Description</th>
              <th className="px-5 py-3 font-semibold text-slate-600">Location</th>
              <th className="px-5 py-3 font-semibold text-slate-600">Amount</th>
              <th className="px-5 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-b border-slate-50 transition hover:bg-primary/5">
                <td className="px-5 py-4 text-neutral">{formatDate(exp.date)}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                    {categoryIcons[exp.category] || '📦'} {exp.category}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-slate-700">{exp.reason}</td>
                <td className="px-5 py-4 text-neutral">{exp.location}</td>
                <td className="px-5 py-4 font-mono font-semibold text-error">{formatCurrency(exp.amount)}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(exp)} className="rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">Edit</button>
                    <button onClick={() => onDelete(exp)} className="rounded-lg px-2 py-1 text-xs font-medium text-error hover:bg-red-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {expenses.map((exp) => (
          <div key={exp.id} className="rounded-xl bg-white p-4 shadow-card transition hover:shadow-elevated">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{exp.reason}</p>
                <p className="mt-1 text-xs text-neutral">{formatDate(exp.date)} · {exp.location}</p>
              </div>
              <p className="font-mono font-bold text-error">{formatCurrency(exp.amount)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{exp.category}</span>
              <div className="flex gap-2">
                <button onClick={() => onEdit(exp)} className="text-xs font-medium text-primary">Edit</button>
                <button onClick={() => onDelete(exp)} className="text-xs font-medium text-error">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
