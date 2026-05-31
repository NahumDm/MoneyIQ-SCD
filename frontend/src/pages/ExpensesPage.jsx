import { useState } from 'react';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import ExpenseForm, { expenseToForm, formToPayload, getEmptyExpenseForm } from '../components/expenses/ExpenseForm';
import ExpenseTable from '../components/expenses/ExpenseTable';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { useExpenses } from '../hooks/useExpenses';
import { getErrorMessage, useToast } from '../hooks/useToast';

export default function ExpensesPage() {
  const toast = useToast();
  const { expenses, loading, filters, setFilters, createExpense, updateExpense, deleteExpense } = useExpenses();
  const [draftFilters, setDraftFilters] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(getEmptyExpenseForm());
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(getEmptyExpenseForm());
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditing(expense);
    setForm(expenseToForm(expense));
    setModalOpen(true);
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete "${expense.reason}"?`)) return;
    try {
      await deleteExpense(expense.id);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editing) {
        await updateExpense(editing.id, payload);
        toast.success('Expense updated');
      } else {
        await createExpense(payload);
        toast.success('Expense added');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} found</p>
        <Button onClick={openCreate}>+ Add Expense</Button>
      </div>

      <ExpenseFilters
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => setFilters({ ...draftFilters })}
        onClear={() => { setDraftFilters({}); setFilters({}); }}
      />

      {loading ? (
        <LoadingSpinner label="Loading expenses..." />
      ) : (
        <ExpenseTable expenses={expenses} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitLabel={editing ? 'Update Expense' : 'Save Expense'}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
