'use client';

import Link from 'next/link';
import { useState } from 'react';
import { candidateApi } from '../redux/api/candidateApi';
import { errorMessage } from '../redux/api/client';
import PublicShell from '@/components/PublicShell';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => thisYear + 4 - i);

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  college: '',
  state: '',
  branch: '',
  degree: '',
  passingYear: '',
  message: '',
};

export default function ApplyPage() {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await candidateApi.apply({ ...form, passingYear: Number(form.passingYear) });
      setDone(form.firstName);
      setForm(EMPTY);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <PublicShell>
        <Card className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Thanks, {done}!</h1>
          <p className="mt-2 text-slate-600">
            We&apos;ve received your application. If you&apos;re shortlisted, we&apos;ll email you a link to submit your resume.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => setDone(null)}>
              Submit another
            </Button>
            <Link href="/" className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Back to home
            </Link>
          </div>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Join our sales team" subtitle="Tell us about yourself. It takes about two minutes.">
      <Card>
        <form onSubmit={submit} className="space-y-8">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">About you</legend>
            <Input label="First name" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
            <Input label="Last name" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Education</legend>
            <div className="sm:col-span-2">
              <Input label="College / university" value={form.college} onChange={set('college')} required />
            </div>
            <Input label="Degree" placeholder="e.g. B.Tech, BBA, MBA" value={form.degree} onChange={set('degree')} required />
            <Input label="Branch / specialisation" placeholder="e.g. Computer Science" value={form.branch} onChange={set('branch')} required />
            <Select label="State" value={form.state} onChange={set('state')} required>
              <option value="" disabled>
                Select a state
              </option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select label="Passing year" value={form.passingYear} onChange={set('passingYear')} required>
              <option value="" disabled>
                Select a year
              </option>
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </Select>
          </fieldset>

          <Textarea
            label="Anything else? (optional)"
            placeholder="Why sales? Any experience we should know about?"
            value={form.message}
            onChange={set('message')}
            maxLength={2000}
          />

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving}>
            Submit application
          </Button>
        </form>
      </Card>
    </PublicShell>
  );
}
