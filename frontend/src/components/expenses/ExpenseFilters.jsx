import { EXPENSE_CATEGORIES } from '../../utils/constants';

export default function ExpenseFilters({ filters, onChange, onApply, onClear }) {
  const handle = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral">From Date</label>
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handle('start_date', e.target.value)}
            className="input-field !py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral">To Date</label>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handle('end_date', e.target.value)}
            className="input-field !py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral">Category</label>
          <select
            value={filters.category || ''}
            onChange={(e) => handle('category', e.target.value)}
            className="input-field !py-2"
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral">Min Amount</label>
          <input
            type="number"
            min="0"
            value={filters.min_amount || ''}
            onChange={(e) => handle('min_amount', e.target.value)}
            className="input-field !py-2 font-mono"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral">Max Amount</label>
          <input
            type="number"
            min="0"
            value={filters.max_amount || ''}
            onChange={(e) => handle('max_amount', e.target.value)}
            className="input-field !py-2 font-mono"
            placeholder="1000"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onApply} className="btn-primary !py-2 text-xs">Apply Filters</button>
        <button onClick={onClear} className="btn-secondary !py-2 text-xs">Clear</button>
      </div>
    </div>
  );
}
