'use client';

import { Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearError, fetchSession, login } from '../redux/slice/loginSlice';
import { dashboardPath } from '../redux/api/loginApi';
import { disconnectSocket } from '@/components/useSocket';
import { Logo } from '@/components/Header';
import { Button, Input, cx } from '@/components/ui';

const DEMO_ACCOUNTS = [
  { as: 'admin', label: 'Master admin', email: 'master@salesportal.local', password: 'Master@12345' },
  { as: 'admin', label: 'Admin', email: 'admin@salesportal.local', password: 'Admin@12345' },
  { as: 'employee', label: 'Employee', email: 'employee@salesportal.local', password: 'Employee@123' },
];

/** Only follow same-site relative redirects. */
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, error, role, user } = useSelector((state) => state.login);
  const [as, setAs] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSession());
  }, [status, dispatch]);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(safeNext(searchParams.get('next')) || dashboardPath(role, user._id));
    }
  }, [status, user, role, router, searchParams]);

  const submit = async (e) => {
    e.preventDefault();
    disconnectSocket();
    dispatch(login({ as, email: email.trim(), password }));
  };

  const pickDemo = (account) => {
    dispatch(clearError());
    setAs(account.as);
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Choose your account type to continue.</p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Account type">
            {[
              ['admin', 'Admin'],
              ['employee', 'Employee'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={as === value}
                onClick={() => {
                  setAs(value);
                  dispatch(clearError());
                }}
                className={cx(
                  'rounded-md py-2 text-sm font-medium transition-colors',
                  as === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label={as === 'admin' ? 'Email or admin ID' : 'Email or referral ID'}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={as === 'admin' ? 'you@company.com or ADM1001' : 'you@company.com or EMPXXXXXX'}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={status === 'loading'}>
              Sign in
            </Button>
          </form>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (run `npm run seed -- --demo`)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => pickDemo(account)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
