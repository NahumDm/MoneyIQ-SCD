import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, useToast } from '../hooks/useToast';
import { ROUTES } from '../utils/constants';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary via-primary-dark to-primary p-12 text-white lg:flex">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold">EF</div>
          <h1 className="mt-8 text-4xl font-bold leading-tight">ExpenseFlow</h1>
          <p className="mt-4 max-w-sm text-lg text-white/70">
            Track spending, manage budgets, and export reports — all in one calm, professional dashboard.
          </p>
        </div>
        <p className="text-sm text-white/40">Secure · Simple · Smart finance</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-surface px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-primary">Welcome back</h2>
            <p className="mt-2 text-neutral">Sign in to your account</p>
          </div>

          {params.get('expired') && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-amber-800">
              Your session expired. Please sign in again.
            </div>
          )}

          {params.get('verified') && (
            <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-green-800">
              Email verified! You can now sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-8 shadow-elevated">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral">
            Don&apos;t have an account?{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
