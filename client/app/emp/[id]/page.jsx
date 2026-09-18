'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployeeCustomers, fetchEmployeeDashboard } from '../../redux/slice/employeeSlice';
import { updateUser } from '../../redux/slice/loginSlice';
import { employeeApi } from '../../redux/api/employeeApi';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import { useToast } from '@/components/Toast';
import DashboardShell from '@/components/DashboardShell';
import EmployeeCustomers from '@/components/EmployeeCustomers';
import AccountSettings from '@/components/AccountSettings';
import { Button, Card, ErrorState, PageLoader, StatCard, Tabs } from '@/components/ui';
import { formatINR } from '@/components/format';

function ReferralCard({ referralId }) {
  const toast = useToast();
  // Only rendered after the session loads in the browser, so window is available.
  const link = `${window.location.origin}/register-customer?ref=${referralId}`;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed. Select the text and copy it manually.');
    }
  };

  return (
    <Card title="Your referral link" description="Share it with customers. Every sign-up through it is credited to you.">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">Referral ID</span>
          <span className="font-mono text-lg font-semibold text-indigo-900">{referralId}</span>
        </div>
        <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">{link}</code>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => copy(referralId, 'Referral ID')}>
            Copy ID
          </Button>
          <Button onClick={() => copy(link, 'Link')}>Copy link</Button>
        </div>
      </div>
    </Card>
  );
}

export default function EmployeeDashboardPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const { user, ready } = useAuth({ roles: ['employee'], ownerId: id });
  const { profile, totals, customers, status, customersStatus, error } = useSelector((state) => state.employee);
  const [tab, setTab] = useState('customers');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (ready) dispatch(fetchEmployeeDashboard({ id }));
  }, [ready, id, dispatch]);

  const reloadCustomers = (paymentStatus = filter) => dispatch(fetchEmployeeCustomers({ id, paymentStatus }));

  useSocketEvent(
    'customerUpdate',
    (payload) => {
      if (payload.paymentStatus === 'paid') toast.success('A customer just completed their payment');
      reloadCustomers();
    },
    ready
  );
  useSocketEvent(
    'employeeUpdateResponse',
    (payload) => payload.id === user?._id && dispatch(updateUser({ email: payload.email })),
    ready
  );

  const revenue = customers.filter((c) => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const pending = customers.filter((c) => c.paymentStatus === 'pending').length;

  return (
    <DashboardShell ready={ready} title={`Hi, ${user?.firstName ?? ''}`} subtitle="Track your referrals and customers.">
      {status === 'failed' ? (
        <ErrorState message={error} onRetry={() => dispatch(fetchEmployeeDashboard({ id }))} />
      ) : !profile || status === 'loading' ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total customers" value={totals?.totalCustomers ?? 0} />
            <StatCard label="Paid customers" value={totals?.paidCustomers ?? 0} />
            <StatCard label="Awaiting payment" value={filter ? '—' : pending} hint={filter ? 'Clear the filter to see this' : undefined} />
            <StatCard label="Revenue generated" value={filter && filter !== 'paid' ? '—' : formatINR(revenue)} />
          </div>

          <ReferralCard referralId={profile.referralId} />

          <Tabs
            tabs={[
              { id: 'customers', label: 'My customers' },
              { id: 'account', label: 'My account' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'customers' && (
            <EmployeeCustomers
              customers={customers}
              loading={customersStatus === 'loading'}
              filter={filter}
              onFilter={(value) => {
                setFilter(value);
                reloadCustomers(value);
              }}
              onChanged={() => reloadCustomers()}
            />
          )}
          {tab === 'account' && user && <AccountSettings user={{ ...profile, ...user }} api={employeeApi} />}
        </div>
      )}
    </DashboardShell>
  );
}
