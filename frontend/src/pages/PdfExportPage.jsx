import { useState } from 'react';
import { buildExpenseReportHtml, pdfApi } from '../api/pdfService';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../hooks/useExpenses';
import { getErrorMessage, useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function PdfExportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { expenses, loading } = useExpenses();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [useAll, setUseAll] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredExpenses = useAll
    ? expenses
    : expenses.filter((e) => {
        const d = new Date(e.date);
        if (dateRange.start && d < new Date(dateRange.start)) return false;
        if (dateRange.end && d > new Date(dateRange.end + 'T23:59:59')) return false;
        return true;
      });

  const handleGenerate = async () => {
    if (!filteredExpenses.length) {
      toast.error('No expenses to export');
      return;
    }
    setGenerating(true);
    setDone(false);
    try {
      const html = buildExpenseReportHtml(filteredExpenses, user?.name);
      const { data } = await pdfApi.generate(html);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setDone(true);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <h2 className="text-lg font-bold text-primary">Export Expense Report</h2>
        <p className="mt-1 text-sm text-neutral">Generate a professional PDF summary of your expenses</p>

        <div className="mt-6 space-y-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={useAll}
              onChange={(e) => setUseAll(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <div>
              <p className="font-medium text-slate-800">All expenses</p>
              <p className="text-xs text-neutral">Include every recorded transaction</p>
            </div>
          </label>

          {!useAll && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="input-field !py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="input-field !py-2"
                />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-surface p-4">
            <p className="text-sm text-neutral">
              <span className="font-semibold text-primary">{loading ? '...' : filteredExpenses.length}</span> expenses will be included
            </p>
          </div>
        </div>

        {generating ? (
          <LoadingSpinner label="Generating your report..." />
        ) : (
          <Button onClick={handleGenerate} className="mt-6 w-full" disabled={loading}>
            Generate PDF
          </Button>
        )}

        {done && (
          <div className="mt-4 animate-fade-in rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-center text-sm font-medium text-success">
            ✓ Report generated and downloaded
          </div>
        )}
      </Card>
    </div>
  );
}
