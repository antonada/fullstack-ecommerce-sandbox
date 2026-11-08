import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { z } from 'zod';
import type { AuthResponse } from '@shop/shared/schemas';
import { api, ApiFailure } from '../api';
import { useSession } from '../session';

type Auth = z.infer<typeof AuthResponse>;

function useAuthForm(path: string) {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const res = await api<Auth>(path, { method: 'POST', body });
      signIn(res.token, res.user);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiFailure) {
        setError(err.message);
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
      } else {
        setError('Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  }

  return { submit, error, fieldErrors, busy };
}

export function LoginPage() {
  const { expired } = useSession();
  const { submit, error, fieldErrors, busy } = useAuthForm('/auth/login');

  return (
    <section className="narrow">
      <h1>Sign in</h1>
      {expired && (
        <p role="status" className="notice" data-testid="session-expired">
          Your session expired, please sign in again.
        </p>
      )}
      <form onSubmit={submit} noValidate className="form">
        <label>
          Email
          <input name="email" type="email" data-testid="login-email" autoComplete="username" />
          {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}
        </label>
        <label>
          Password
          <input name="password" type="password" data-testid="login-password" autoComplete="current-password" />
          {fieldErrors.password && <span className="error">{fieldErrors.password}</span>}
        </label>
        {error && (
          <p role="alert" className="error" data-testid="auth-error">
            {error}
          </p>
        )}
        <button type="submit" data-testid="login-submit" disabled={busy}>
          Sign in
        </button>
      </form>
      <p className="muted">
        No account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

export function RegisterPage() {
  const { submit, error, fieldErrors, busy } = useAuthForm('/auth/register');

  return (
    <section className="narrow">
      <h1>Create an account</h1>
      <form onSubmit={submit} noValidate className="form">
        <label>
          Name
          <input name="name" data-testid="register-name" autoComplete="name" />
          {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
        </label>
        <label>
          Email
          <input name="email" type="email" data-testid="register-email" autoComplete="email" />
          {fieldErrors.email && <span className="error">{fieldErrors.email}</span>}
        </label>
        <label>
          Password (8+ characters)
          <input name="password" type="password" data-testid="register-password" autoComplete="new-password" />
          {fieldErrors.password && <span className="error">{fieldErrors.password}</span>}
        </label>
        {error && (
          <p role="alert" className="error" data-testid="auth-error">
            {error}
          </p>
        )}
        <button type="submit" data-testid="register-submit" disabled={busy}>
          Create account
        </button>
      </form>
    </section>
  );
}
