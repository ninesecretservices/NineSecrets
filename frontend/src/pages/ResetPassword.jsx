import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import useStore from '../store/useStore';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      toast('Password reset! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-body">
        <p className="text-mauve-dark">
          Invalid reset link.{' '}
          <Link to="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-6 py-16 font-body">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center font-heading text-3xl italic text-ink">
          Choose a new password
        </h1>
        {error && (
          <div className="mb-5 bg-blush px-4 py-3 text-center text-sm text-ink">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-beige bg-white px-5 py-3 text-sm text-ink outline-none focus:border-ink"
            placeholder="New password (min 6 characters)"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-beige bg-white px-5 py-3 text-sm text-ink outline-none focus:border-ink"
            placeholder="Confirm new password"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
