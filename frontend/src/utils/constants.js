export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
  EXPENSES: '/expenses',
  REPORTS: '/reports',
};

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Travel',
  'Other',
];

export const TOKEN_KEY = 'expenseflow_token';
export const USER_KEY = 'expenseflow_user';
