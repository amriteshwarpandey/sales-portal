'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { customerApi } from '../redux/api/customerApi';
import { errorMessage } from '../redux/api/client';
import PublicShell from '@/components/PublicShell';
import { Button, Card, Input, PageLoader, cx } from '@/components/ui';
import { formatINR } from '@/components/format';

const PLAN_FEATURES = {
  basic: ['Core CRM features', 'Email support', '1 user'],
  standard: ['Everything in Basic', 'Sales analytics', 'Up to 5 users'],
  premium: ['Everything in Standard', 'Priority support', 'Unlimited users'],
};

const METHODS = [
  ['card', 'Card'],
  ['upi', 'UPI'],
  ['netbanking', 'Net banking'],
];

function Checkout({ customer, order, onPaid }) {
  const [method, setMethod] = useState('card');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await customerApi.confirmPayment(customer._id, order.orderId, method);
      onPaid(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <Card title="Payment" className="md:col-span-3">
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Demo payment gateway: no real money is charged and no card details are collected.
        </p>
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-slate-700">Payment method</legend>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(([value, label]) => (
              <label
                key={value}
                className={cx(
                  'cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors',
                  method === value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <Button size="lg" className="mt-6 w-full" loading={paying} onClick={pay}>
          Pay {formatINR(order.amount)}
        </Button>
      </Card>

      <Card title="Order summary" className="md:col-span-2">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Customer</dt>
            <dd className="font-medium text-slate-900">{order.customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Plan</dt>
            <dd className="font-medium text-slate-900">{order.plan?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Order</dt>
            <dd className="font-mono text-xs text-slate-600">{order.orderId}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
            <dt className="font-medium text-slate-900">Total</dt>
            <dd className="font-semibold text-slate-900">{formatINR(order.amount)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function RegisterCustomer() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    referralId: searchParams.get('ref') || '',
    plan: 'standard',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState(null);
  const [order, setOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    customerApi
      .plans()
      .then((res) => setPlans(res.plans))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // If sign-up worked but checkout failed to start, retry checkout only.
      let registered = customer;
      if (!registered) {
        registered = (await customerApi.register(form)).customer;
        setCustomer(registered);
      }
      setOrder(await customerApi.initiatePayment(registered._id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (receipt) {
    return (
      <PublicShell>
        <Card className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Payment successful</h1>
          <p className="mt-2 text-slate-600">
            {formatINR(receipt.amount)} paid. A receipt has been emailed to {form.email}.
          </p>
          <p className="mt-4 font-mono text-xs text-slate-500">Transaction {receipt.transactionId}</p>
          <Link href="/" className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Done
          </Link>
        </Card>
      </PublicShell>
    );
  }

  if (customer && order) {
    return (
      <PublicShell title="Complete your purchase" subtitle={`Thanks, ${customer.firstName}. One step left.`} width="max-w-4xl">
        <Checkout customer={customer} order={order} onPaid={setReceipt} />
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Choose your plan" subtitle="Sign up with the referral ID your sales representative gave you." width="max-w-4xl">
      {!plans && !error ? (
        <PageLoader />
      ) : (
        <form onSubmit={submit} className="space-y-6">
          <fieldset>
            <legend className="sr-only">Plan</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {(plans || []).map((plan) => (
                <label
                  key={plan.id}
                  className={cx(
                    'cursor-pointer rounded-xl border-2 bg-white p-5 shadow-sm transition-colors',
                    form.plan === plan.id ? 'border-indigo-600' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <input type="radio" name="plan" value={plan.id} checked={form.plan === plan.id} onChange={set('plan')} className="sr-only" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{plan.name}</span>
                    {form.plan === plan.id && <span className="text-sm text-indigo-600">✓ Selected</span>}
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{formatINR(plan.amount)}</p>
                  <p className="text-xs text-slate-500">one-time</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    {(PLAN_FEATURES[plan.id] || []).map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                </label>
              ))}
            </div>
          </fieldset>

          <Card title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
              <Input label="Last name" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
              <Input label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
              <Input label="City (optional)" value={form.city} onChange={set('city')} autoComplete="address-level2" />
              <Input
                label="Referral ID"
                value={form.referralId}
                onChange={(e) => setForm((f) => ({ ...f, referralId: e.target.value.toUpperCase() }))}
                placeholder="EMPXXXXXX"
                className="font-mono"
                required
              />
            </div>
          </Card>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving} disabled={!plans}>
            Continue to payment
          </Button>
        </form>
      )}
    </PublicShell>
  );
}

export default function RegisterCustomerPage() {
  return (
    <Suspense>
      <RegisterCustomer />
    </Suspense>
  );
}
