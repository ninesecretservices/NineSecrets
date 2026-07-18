import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useStore from '../store/useStore';
import api from '../utils/api';

const inputClass =
  'w-full border border-beige bg-white px-5 py-3 text-sm text-ink outline-none transition-colors focus:border-ink';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setUser = useStore((state) => state.setUser);
  const syncGuestCartToServer = useStore(
    (state) => state.syncGuestCartToServer,
  );
  const navigate = useNavigate();

  const finishAuth = (data) => {
    const { user, accessToken, refreshToken } = data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    // Carry any guest-bag items into the account's cart.
    syncGuestCartToServer();
    if (user.role === 'superadmin' || user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'signin') {
        const res = await api.post('/auth/login', { email, password });
        finishAuth(res.data.data);
      } else {
        const res = await api.post('/auth/signup', { name, email, password });
        finishAuth(res.data.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `${mode === 'signin' ? 'Login' : 'Signup'} failed`,
      );
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-6 py-16 font-body">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-lg font-bold uppercase tracking-[0.12em] text-ink">
            Nine Secrets
          </p>
          <h1 className="mt-3 font-heading text-3xl italic text-ink">
            {mode === 'signin' ? 'Welcome back' : 'Join us'}
          </h1>
        </div>

        {/* Mode toggle */}
        <div className="mb-8 flex justify-center gap-2">
          {[
            ['signin', 'Sign In'],
            ['signup', 'Create Account'],
          ].map(([m, label]) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
              className={`border px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-all ${
                mode === m
                  ? 'border-ink bg-ink text-cream'
                  : 'border-beige text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 bg-blush px-4 py-3 text-center text-sm text-ink">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
                Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-[52px] w-full bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-cream transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {mode === 'signin' && (
          <p className="mt-5 text-center">
            <Link
              to="/forgot-password"
              className="text-[13px] text-mauve-dark underline underline-offset-4"
            >
              Forgot your password?
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
