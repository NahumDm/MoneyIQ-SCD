import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, useToast } from '../hooks/useToast';
import { ROUTES } from '../utils/constants';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Check your email for the verification code.');
      navigate(`${ROUTES.VERIFY}?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">EF</div>
          <h1 className="text-2xl font-bold text-primary">Create your account</h1>
          <p className="mt-2 text-neutral">Start managing your expenses today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-8 shadow-elevated">
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Personal Details</h3>
            <div className="space-y-3">
              <input name="name" required value={form.name} onChange={handleChange} className="input-field" placeholder="Full name" />
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="Phone (optional)" />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Account Setup</h3>
            <div className="space-y-3">
              <input name="email" type="email" required value={form.email} onChange={handleChange} className="input-field" placeholder="Email address" />
              <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange} className="input-field" placeholder="Password (min 6 characters)" />
            </div>
          </section>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
