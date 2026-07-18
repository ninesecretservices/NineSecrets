import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      // Endpoint always claims success (anti-enumeration), mirror that here.
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-6 py-16 font-body">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-3 font-heading text-3xl italic text-ink">
          Reset your password
        </h1>
        {sent ? (
          <div className="bg-pastel-green px-4 py-4 text-sm text-ink">
            If that email is registered, a reset link is on its way. Check your
            inbox.
          </div>
        ) : (
          <>
            <p className="mb-8 text-sm text-mauve-dark">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-beige bg-white px-5 py-3 text-sm text-ink outline-none focus:border-ink"
                placeholder="you@example.com"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
        <p className="mt-6">
          <Link
            to="/login"
            className="text-[13px] text-mauve-dark underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
