'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../../redux/slice/adminSlice';
import { updateUser } from '../../redux/slice/loginSlice';
import { adminApi } from '../../redux/api/adminApi';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import DashboardShell from '@/components/DashboardShell';
import StatsOverview from '@/components/StatsOverview';
import EmployeeTable from '@/components/EmployeeTable';
import CustomerTable from '@/components/CustomerTable';
import AccountSettings from '@/components/AccountSettings';
import { ErrorState, PageLoader, Tabs } from '@/components/ui';

export default function AdminDashboardPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user, ready } = useAuth({ roles: ['admin', 'masteradmin'], ownerId: id });
  const stats = useSelector((state) => state.admin.stats);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (ready) dispatch(fetchStats());
  }, [ready, dispatch]);

  // Live refresh while the dashboard is open.
  const refreshStats = () => dispatch(fetchStats());
  useSocketEvent('customerUpdate', refreshStats, ready);
  useSocketEvent('candidateUpdate', refreshStats, ready);
  useSocketEvent(
    'adminUpdateResponse',
    (payload) => payload.id === user?._id && dispatch(updateUser({ email: payload.email })),
    ready
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'employees', label: 'Employees', count: stats.data?.totals.employees },
    { id: 'customers', label: 'Customers', count: stats.data?.totals.customers },
    { id: 'account', label: 'My account' },
  ];

  return (
    <DashboardShell
      ready={ready}
      title={`Welcome back, ${user?.firstName ?? ''}`}
      subtitle="Here's how sales and hiring are going."
      actions={
        <Link
          href={`/candidate/admin/${user?._id}`}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Review candidates
          {stats.data?.candidates.pending ? ` (${stats.data.candidates.pending} new)` : ''}
        </Link>
      }
    >
      <div className="mb-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' &&
        (stats.status === 'failed' ? (
          <ErrorState message={stats.error} onRetry={refreshStats} />
        ) : stats.data ? (
          <StatsOverview stats={stats.data} />
        ) : (
          <PageLoader label="Loading analytics…" />
        ))}
      {tab === 'employees' && <EmployeeTable />}
      {tab === 'customers' && <CustomerTable />}
      {tab === 'account' && user && <AccountSettings user={user} api={adminApi} />}
    </DashboardShell>
  );
}
