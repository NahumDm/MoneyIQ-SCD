import { Link } from 'react-router-dom';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency, getMonthlyTotal, getTopCategory } from '../utils/format';
import { ROUTES } from '../utils/constants';
import Card from '../components/ui/Card';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import ExpenseTable from '../components/expenses/ExpenseTable';

export default function DashboardPage() {
  const { expenses, loading } = useExpenses();
  const monthlyTotal = getMonthlyTotal(expenses);
  const topCategory = getTopCategory(expenses);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);
  const recent = expenses.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card accent="bg-primary">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral">Total Spent</p>
              <p className="mt-2 font-mono text-3xl font-bold text-primary">{formatCurrency(totalAll)}</p>
              <p className="mt-1 text-xs text-neutral">All time</p>
            </Card>
            <Card accent="bg-error">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral">This Month</p>
              <p className="mt-2 font-mono text-3xl font-bold text-error">{formatCurrency(monthlyTotal)}</p>
              <p className="mt-1 text-xs text-neutral">Current month expenses</p>
            </Card>
            <Card accent="bg-warning">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral">Top Category</p>
              <p className="mt-2 text-2xl font-bold text-slate-800">{topCategory.category}</p>
              <p className="mt-1 font-mono text-sm text-neutral">{formatCurrency(topCategory.amount)}</p>
            </Card>
            <Card accent="bg-success">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral">Transactions</p>
              <p className="mt-2 font-mono text-3xl font-bold text-success">{expenses.length}</p>
              <p className="mt-1 text-xs text-neutral">Total recorded</p>
            </Card>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to={ROUTES.EXPENSES} className="btn-primary">+ Add Expense</Link>
        <Link to={ROUTES.REPORTS} className="btn-secondary">Export PDF</Link>
      </div>

      {/* Monthly trend placeholder */}
      <Card>
        <h3 className="mb-4 font-bold text-primary">Monthly Overview</h3>
        <div className="flex h-40 items-end gap-2">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => {
            const h = 20 + ((i + 1) * 13) % 80;
            return (
              <div key={m} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-primary/80 transition hover:bg-primary" style={{ height: `${h}%` }} />
                <span className="text-xs text-neutral">{m}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent transactions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-primary">Recent Transactions</h3>
          <Link to={ROUTES.EXPENSES} className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <ExpenseTable
            expenses={recent}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        )}
      </div>
    </div>
  );
}
