import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, useToast } from '../hooks/useToast';
import { ROUTES } from '../utils/constants';
import Button from '../components/ui/Button';

export default function VerifyPage() {
  const { verifyEmail, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, otp);
      setSuccess(true);
      toast.success('Email verified successfully!');
      setTimeout(() => navigate(`${ROUTES.LOGIN}?verified=1`), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="text-center">
          <p className="text-neutral">No email provided.</p>
          <Link to={ROUTES.REGISTER} className="mt-2 inline-block font-semibold text-primary">Go to registration</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md animate-scale-in text-center">
        {success ? (
          <div className="rounded-2xl bg-white p-10 shadow-elevated">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">✓</div>
            <h2 className="mt-4 text-xl font-bold text-primary">Verified!</h2>
            <p className="mt-2 text-neutral">Redirecting you to sign in...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-primary">Verify your email</h1>
              <p className="mt-2 text-neutral">
                Enter the 6-digit code sent to<br />
                <span className="font-semibold text-slate-700">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-elevated">
              <div className="flex justify-center gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="h-12 w-10 rounded-xl border border-slate-200 text-center text-lg font-bold text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-12"
                  />
                ))}
              </div>

              <Button type="submit" className="mt-6 w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </form>

            <p className="mt-6 text-sm text-neutral">
              Wrong email?{' '}
              <Link to={ROUTES.REGISTER} className="font-semibold text-primary hover:underline">Register again</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
