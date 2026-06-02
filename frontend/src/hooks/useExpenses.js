import { useCallback, useEffect, useState } from 'react';
import { expenseApi } from '../api/expenseService';
import { getErrorMessage } from '../hooks/useToast';

export function useExpenses(initialFilters = {}) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchExpenses = useCallback(async (params = filters) => {
    setLoading(true);
    setError(null);
    try {
      const query = {};
      if (params.category) query.category = params.category;

      // Keep 0 as a valid boundary value.
      if (params.min_amount !== '' && params.min_amount !== undefined && params.min_amount !== null) {
        query.min_amount = Number(params.min_amount);
      }
      if (params.max_amount !== '' && params.max_amount !== undefined && params.max_amount !== null) {
        query.max_amount = Number(params.max_amount);
      }

      if (params.start_date) {
        const start = new Date(params.start_date);
        start.setHours(0, 0, 0, 0);
        query.start_date = start.toISOString();
      }
      if (params.end_date) {
        // Include the full selected day in filtering.
        const end = new Date(params.end_date);
        end.setHours(23, 59, 59, 999);
        query.end_date = end.toISOString();
      }

      const { data } = await expenseApi.getAll(query);
      setExpenses(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses(filters);
  }, [fetchExpenses, filters]);

  const createExpense = async (payload) => {
    const { data } = await expenseApi.create(payload);
    setExpenses((prev) => [data, ...prev]);
    return data;
  };

  const updateExpense = async (id, payload) => {
    const { data } = await expenseApi.update(id, payload);
    setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  };

  const deleteExpense = async (id) => {
    await expenseApi.delete(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return {
    expenses,
    loading,
    error,
    filters,
    setFilters,
    refetch: () => fetchExpenses(filters),
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
