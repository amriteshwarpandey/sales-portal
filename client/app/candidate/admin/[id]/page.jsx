'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCandidates, setFilter, upsertCandidate } from '../../../redux/slice/candidateSlice';
import { candidateApi } from '../../../redux/api/candidateApi';
import { errorMessage } from '../../../redux/api/client';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import { useDebounce } from '@/components/useDebounce';
import { useToast } from '@/components/Toast';
import DashboardShell from '@/components/DashboardShell';
import CandidateActions from '@/components/CandidateActions';
import { Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Spinner, StatusBadge, Table, Tabs, Td, cx } from '@/components/ui';
import { formatDate, fullName } from '@/components/format';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'invited', label: 'Invited' },
  { id: 'employee', label: 'Hired' },
  { id: 'discarded', label: 'Discarded' },
];

export default function AdminCandidatesPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const { user, ready } = useAuth({ roles: ['admin', 'masteradmin'], ownerId: id });
  const { items, counts, filter, status, error } = useSelector((state) => state.candidate);
  const [search, setSearch] = useState(filter.q);
  const debounced = useDebounce(search);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  // The API checks that `:id` is the logged-in admin, so always act as ourselves.
  const adminId = user?._id;

  useEffect(() => {
    if (!ready) return;
    dispatch(setFilter({ q: debounced }));
    dispatch(fetchCandidates({ adminId }));
  }, [ready, debounced, adminId, dispatch]);

  const reload = () => dispatch(fetchCandidates({ adminId }));
  useSocketEvent('candidateUpdate', reload, ready);

  const changeTab = (statusId) => {
    dispatch(setFilter({ status: statusId }));
    dispatch(fetchCandidates({ adminId }));
  };

  const inviteAll = async () => {
    setBulkBusy(true);
    try {
      const res = await candidateApi.inviteAllShortlisted();
      toast.success(res.failed?.length ? `${res.message}. Failed: ${res.failed.join(', ')}` : res.message);
      setConfirmBulk(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = STATUS_TABS.map((t) => ({ ...t, count: t.id ? counts[t.id] || 0 : total }));

  return (
    <DashboardShell
      ready={ready}
      title="Candidates"
      subtitle="Review applications, send resume requests, and hire."
      actions={
        <>
          <Link
            href="/apply"
            target="_blank"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open application form ↗
          </Link>
          <Button onClick={() => setConfirmBulk(true)} disabled={!counts.shortlisted}>
            Email all shortlisted ({counts.shortlisted || 0})
          </Button>
        </>
      }
    >
      <Card bodyClassName="p-0">
        <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <Tabs tabs={tabs} active={filter.status} onChange={changeTab} />
          </div>
          <div className="pb-3 sm:w-64">
            <Input
              type="search"
              placeholder="Search name, email, college"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search candidates"
            />
          </div>
        </div>

        {status === 'failed' ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : status === 'loading' && items.length === 0 ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No candidates here"
            description={filter.q ? 'Try a different search.' : 'New applications from the careers page show up here.'}
          />
        ) : (
          <div className={cx(status === 'loading' && 'opacity-60')}>
            <Table head={['Candidate', 'Education', 'Status', 'Resume', 'Applied', '']}>
              {items.map((c) => (
                <tr key={c._id} className="align-top hover:bg-slate-50">
                  <Td>
                    <Link href={`/candidate/${c._id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {fullName(c)}
                    </Link>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </Td>
                  <Td>
                    <p>
                      {c.degree}, {c.branch}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.college} · {c.passingYear}
                    </p>
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                    {c.actionBy && <p className="mt-1 text-xs text-slate-400">by {c.actionBy}</p>}
                  </Td>
                  <Td>
                    {c.resumeLink ? (
                      <a href={c.resumeLink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-700 hover:underline">
                        View ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td className="text-right">
                    <CandidateActions
                      candidate={c}
                      adminId={adminId}
                      onUpdated={(updated) => {
                        if (updated) dispatch(upsertCandidate(updated));
                        reload();
                      }}
                    />
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={confirmBulk}
        title="Email all shortlisted candidates?"
        message={`${counts.shortlisted || 0} candidate(s) will get a personal link to submit their resume and will be marked as invited.`}
        confirmLabel="Send emails"
        variant="primary"
        loading={bulkBusy}
        onConfirm={inviteAll}
        onClose={() => setConfirmBulk(false)}
      />
    </DashboardShell>
  );
}
