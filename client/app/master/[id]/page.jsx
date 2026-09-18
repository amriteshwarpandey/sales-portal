'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { adminApi, masterApi } from '../../redux/api/adminApi';
import { errorMessage } from '../../redux/api/client';
import { updateUser } from '../../redux/slice/loginSlice';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import { useToast } from '@/components/Toast';
import DashboardShell from '@/components/DashboardShell';
import StatsOverview from '@/components/StatsOverview';
import AccountSettings from '@/components/AccountSettings';
import {
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageLoader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Td,
} from '@/components/ui';
import { formatDate, formatDateTime, fullName } from '@/components/format';

function CreateAdminModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = { firstName: '', lastName: '', email: '', password: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await masterApi.createAdmin(form);
      toast.success(`Admin created with ID ${res.admin.adminId}`);
      setForm(empty);
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create admin"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="create-admin" loading={saving}>
            Create admin
          </Button>
        </>
      }
    >
      <form id="create-admin" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={form.firstName} onChange={set('firstName')} required />
        <Input label="Last name" value={form.lastName} onChange={set('lastName')} required />
        <div className="sm:col-span-2">
          <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
            hint="At least 8 characters. Share it securely; the admin can change it after signing in."
            required
          />
        </div>
        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}

function AdminsPanel({ currentUserId }) {
  const toast = useToast();
  const [admins, setAdmins] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    () =>
      masterApi.admins().then(
        (res) => {
          setError(null);
          setAdmins(res.admins);
        },
        (err) => setError(errorMessage(err))
      ),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    setDeleting(true);
    try {
      await masterApi.deleteAdmin(toDelete._id);
      toast.success(`${fullName(toDelete)} was removed`);
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      title="Administrators"
      description="Admins manage candidates, employees and customers."
      bodyClassName="p-0"
      actions={<Button onClick={() => setCreating(true)}>+ New admin</Button>}
    >
      {error ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : !admins ? (
        <PageLoader />
      ) : (
        <Table head={['Name', 'Email', 'Admin ID', 'Role', 'Created', '']}>
          {admins.map((a) => (
            <tr key={a._id} className="hover:bg-slate-50">
              <Td className="font-medium text-slate-900">
                {fullName(a)}
                {a._id === currentUserId && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
              </Td>
              <Td>{a.email}</Td>
              <Td className="font-mono text-xs">{a.adminId}</Td>
              <Td>
                <StatusBadge status={a.role} />
              </Td>
              <Td>{formatDate(a.createdAt)}</Td>
              <Td className="text-right">
                {a.role !== 'masteradmin' && (
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setToDelete(a)}>
                    Delete
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <CreateAdminModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
      <ConfirmModal
        open={Boolean(toDelete)}
        title="Delete admin?"
        message={toDelete ? `${fullName(toDelete)} (${toDelete.adminId}) will lose access immediately.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </Card>
  );
}

const ACTION_FILTERS = [
  ['', 'All actions'],
  ['login', 'Logins'],
  ['candidate', 'Candidates'],
  ['payment', 'Payments'],
  ['customer', 'Customers'],
  ['admin', 'Admins'],
  ['employee', 'Employees'],
  ['email', 'Email changes'],
  ['password', 'Password changes'],
];

function AuditLogPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(
    () =>
      masterApi.auditLogs({ page, action }).then(
        (res) => {
          setError(null);
          setData(res);
        },
        (err) => setError(errorMessage(err))
      ),
    [page, action]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card
      title="Audit log"
      description="Sensitive actions across the portal, newest first."
      bodyClassName="p-0"
      actions={
        <div className="w-44">
          <Select
            aria-label="Filter by action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            {ACTION_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {error ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : !data ? (
        <PageLoader />
      ) : data.logs.length === 0 ? (
        <EmptyState title="No activity recorded" />
      ) : (
        <>
          <Table head={['When', 'Action', 'By', 'Details']}>
            {data.logs.map((log) => (
              <tr key={log._id}>
                <Td className="text-slate-500">{formatDateTime(log.createdAt)}</Td>
                <Td>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{log.action}</code>
                </Td>
                <Td>
                  {log.actorName || 'Public'}
                  {log.actorRole && <span className="ml-1 text-xs text-slate-400">({log.actorRole})</span>}
                </Td>
                <Td className="max-w-md truncate text-xs text-slate-500" title={log.meta ? JSON.stringify(log.meta) : ''}>
                  {log.meta ? JSON.stringify(log.meta) : '—'}
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </Card>
  );
}

export default function MasterAdminPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user, ready } = useAuth({ roles: ['masteradmin'], ownerId: id });
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const loadStats = useCallback(
    () =>
      masterApi.overview().then(
        (res) => {
          setStatsError(null);
          setStats(res);
        },
        (err) => setStatsError(errorMessage(err))
      ),
    []
  );

  useEffect(() => {
    if (ready) loadStats();
  }, [ready, loadStats]);

  useSocketEvent('customerUpdate', loadStats, ready);
  useSocketEvent('candidateUpdate', loadStats, ready);
  useSocketEvent(
    'adminUpdateResponse',
    (payload) => payload.id === user?._id && dispatch(updateUser({ email: payload.email })),
    ready
  );

  return (
    <DashboardShell ready={ready} title="Master console" subtitle="Manage administrators and see everything happening in the portal.">
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'admins', label: 'Admins', count: stats?.totals.admins },
            { id: 'audit', label: 'Audit log' },
            { id: 'account', label: 'My account' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'overview' &&
        (statsError ? <ErrorState message={statsError} onRetry={loadStats} /> : stats ? <StatsOverview stats={stats} /> : <PageLoader />)}
      {tab === 'admins' && <AdminsPanel currentUserId={user?._id} />}
      {tab === 'audit' && <AuditLogPanel />}
      {tab === 'account' && user && <AccountSettings user={user} api={adminApi} />}
    </DashboardShell>
  );
}
