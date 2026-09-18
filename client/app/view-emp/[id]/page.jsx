'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployeeCustomers, fetchEmployeeDashboard, resetEmployee } from '../../redux/slice/employeeSlice';
import { employeeApi } from '../../redux/api/employeeApi';
import { errorMessage } from '../../redux/api/client';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import { useToast } from '@/components/Toast';
import DashboardShell from '@/components/DashboardShell';
import EmployeeCustomers from '@/components/EmployeeCustomers';
import { Button, Card, ConfirmModal, ErrorState, PageLoader, StatCard } from '@/components/ui';
import { formatDate, formatINR, fullName, initials } from '@/components/format';

export default function ViewEmployeePage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const toast = useToast();
  const { user, ready } = useAuth({ roles: ['admin', 'masteradmin'] });
  const { profile, totals, customers, status, customersStatus, error } = useSelector((state) => state.employee);
  const [filter, setFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    dispatch(fetchEmployeeDashboard({ id, asAdmin: true }));
    return () => dispatch(resetEmployee());
  }, [ready, id, dispatch]);

  const reloadCustomers = (paymentStatus = filter) => dispatch(fetchEmployeeCustomers({ id, paymentStatus }));
  useSocketEvent('customerUpdate', (payload) => payload.referralId === profile?.referralId && reloadCustomers(), ready);

  const remove = async () => {
    setDeleting(true);
    try {
      await employeeApi.deleteEmployee(id);
      toast.success(`${fullName(profile)} was removed`);
      router.replace(`/admin/${user._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  const revenue = customers.filter((c) => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.amount, 0);

  const details = profile
    ? [
        ['Email', profile.email],
        ['Phone', profile.phone || '—'],
        ['Referral ID', profile.referralId],
        ['Degree', [profile.degree, profile.branch].filter(Boolean).join(', ') || '—'],
        ['College', profile.college || '—'],
        ['State', profile.state || '—'],
        ['Passing year', profile.passingYear || '—'],
        ['Hired by', profile.createdBy || '—'],
        ['Joined', formatDate(profile.createdAt)],
      ]
    : [];

  return (
    <DashboardShell
      ready={ready}
      title={profile ? fullName(profile) : 'Employee'}
      subtitle={profile ? `Employee · ${profile.referralId}` : undefined}
      actions={
        profile && (
          <>
            <Link
              href={`/admin/${user?._id}`}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back to dashboard
            </Link>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete employee
            </Button>
          </>
        )
      }
    >
      {status === 'failed' ? (
        <ErrorState message={error} onRetry={() => dispatch(fetchEmployeeDashboard({ id, asAdmin: true }))} />
      ) : !profile || status === 'loading' ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                {initials(profile)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">{fullName(profile)}</p>
                <p className="truncate text-sm text-slate-500">{profile.email}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="truncate text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            {profile.candidate && (
              <Link href={`/candidate/${profile.candidate}`} className="mt-6 inline-block text-sm font-medium text-indigo-700 hover:underline">
                View original application →
              </Link>
            )}
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Customers" value={totals?.totalCustomers ?? 0} />
              <StatCard label="Paid" value={totals?.paidCustomers ?? 0} />
              <StatCard label="Revenue" value={filter && filter !== 'paid' ? '—' : formatINR(revenue)} />
            </div>
            <EmployeeCustomers
              title="Referred customers"
              customers={customers}
              loading={customersStatus === 'loading'}
              filter={filter}
              onFilter={(value) => {
                setFilter(value);
                reloadCustomers(value);
              }}
              onChanged={() => reloadCustomers()}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Delete employee?"
        message={profile ? `${fullName(profile)} will lose access immediately. Their customers stay in the system.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </DashboardShell>
  );
}
