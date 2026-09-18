'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser } from '@/app/redux/slice/loginSlice';
import { errorMessage } from '@/app/redux/api/client';
import { useToast } from './Toast';
import { Button, Card, Input, cx } from './ui';
import { formatDate, fullName } from './format';

function Steps({ steps, current }) {
  return (
    <ol className="mb-5 flex items-center gap-2 text-xs font-medium">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cx(
              'flex h-6 w-6 items-center justify-center rounded-full',
              i < current ? 'bg-emerald-100 text-emerald-700' : i === current ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
            )}
          >
            {i < current ? '✓' : i + 1}
          </span>
          <span className={i === current ? 'text-slate-900' : 'text-slate-400'}>{label}</span>
          {i < steps.length - 1 && <span className="h-px w-6 bg-slate-200" />}
        </li>
      ))}
    </ol>
  );
}

function ChangeEmail({ user, api }) {
  const toast = useToast();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setPassword('');
    setOtp('');
    setNewEmail('');
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (step === 0) {
      run(async () => {
        const res = await api.sendOtp(user._id, password);
        toast.success(res.message);
        setPassword('');
        setStep(1);
      });
    } else if (step === 1) {
      run(async () => {
        await api.verifyOtp(user._id, otp);
        setStep(2);
      });
    } else {
      run(async () => {
        const res = await api.updateEmail(user._id, newEmail);
        dispatch(updateUser({ email: res.user.email }));
        toast.success('Email updated');
        reset();
      });
    }
  };

  return (
    <Card title="Change email" description={`Current: ${user.email}`}>
      <Steps steps={['Password', 'Verify code', 'New email']} current={step} />
      <form onSubmit={submit} className="space-y-4">
        {step === 0 && (
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="We'll email a 6-digit code to your current address."
            required
          />
        )}
        {step === 1 && (
          <Input
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            hint={`Sent to ${user.email}. Valid for 5 minutes.`}
            required
          />
        )}
        {step === 2 && (
          <Input label="New email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>
            {step === 0 ? 'Send code' : step === 1 ? 'Verify' : 'Update email'}
          </Button>
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={reset} disabled={loading}>
              Start over
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function ChangePassword({ user, api }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (next.length < 8) return setError('Use at least 8 characters');
      if (next !== confirm) return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      if (step === 0) {
        await api.checkPassword(user._id, current);
        setStep(1);
      } else {
        await api.updatePassword(user._id, current, next);
        toast.success('Password updated');
        setStep(0);
        setCurrent('');
        setNext('');
        setConfirm('');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return (
    <Card title="Change password" description="Use at least 8 characters.">
      <Steps steps={['Current password', 'New password']} current={step} />
      <form onSubmit={submit} className="space-y-4">
        {step === 0 ? (
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        ) : (
          <>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>
            {step === 0 ? 'Continue' : 'Update password'}
          </Button>
          {step === 1 && (
            <Button type="button" variant="ghost" onClick={() => setStep(0)} disabled={loading}>
              Back
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

export default function AccountSettings({ user, api }) {
  const rows = [
    ['Name', fullName(user)],
    ['Email', user.email],
    user.adminId && ['Admin ID', user.adminId],
    user.referralId && ['Referral ID', user.referralId],
    user.phone && ['Phone', user.phone],
    ['Member since', formatDate(user.createdAt)],
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Profile">
        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="truncate text-right font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <ChangeEmail user={user} api={api} />
      <ChangePassword user={user} api={api} />
    </div>
  );
}
