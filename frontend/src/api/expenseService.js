import apiClient from './client';

export const expenseApi = {
  getAll: (params = {}) => apiClient.get('/expenses', { params }),
  getById: (id) => apiClient.get(`/expenses/${id}`),
  create: (data) => apiClient.post('/expenses', data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data),
  delete: (id) => apiClient.delete(`/expenses/${id}`),
};
