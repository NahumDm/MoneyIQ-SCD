import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import PdfExportPage from './pages/PdfExportPage';
import { ROUTES } from './utils/constants';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.VERIFY} element={<VerifyPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.EXPENSES} element={<ExpensesPage />} />
              <Route path={ROUTES.REPORTS} element={<PdfExportPage />} />
            </Route>

            <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
