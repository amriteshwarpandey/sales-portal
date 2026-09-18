'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { candidateApi } from '../../redux/api/candidateApi';
import { errorMessage } from '../../redux/api/client';
import { useAuth } from '@/components/useAuth';
import { useSocketEvent } from '@/components/useSocket';
import DashboardShell from '@/components/DashboardShell';
import CandidateActions from '@/components/CandidateActions';
import { Card, ErrorState, PageLoader, StatusBadge } from '@/components/ui';
import { formatDateTime, fullName, initials } from '@/components/format';

export default function CandidateDetailPage() {
  const { id } = useParams();
  const { user, ready } = useAuth({ roles: ['admin', 'masteradmin'] });
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(
    () =>
      candidateApi.get(id).then(
        (res) => {
          setError(null);
          setCandidate(res.candidate);
        },
        (err) => setError(errorMessage(err))
      ),
    [id]
  );

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  useSocketEvent('candidateUpdate', (payload) => payload.id === id && load(), ready);

  const details = candidate
    ? [
        ['Email', <a key="e" href={`mailto:${candidate.email}`} className="text-indigo-700 hover:underline">{candidate.email}</a>],
        ['Phone', candidate.phone],
        ['College', candidate.college],
        ['State', candidate.state],
        ['Degree', candidate.degree],
        ['Branch', candidate.branch],
        ['Passing year', candidate.passingYear],
      ]
    : [];

  return (
    <DashboardShell
      ready={ready}
      title={candidate ? fullName(candidate) : 'Candidate'}
      actions={
        <Link
          href={`/candidate/admin/${user?._id}`}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← All candidates
        </Link>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !candidate ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                  {initials(candidate)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-slate-900">{fullName(candidate)}</p>
                  <p className="text-sm text-slate-500">
                    Applied {formatDateTime(candidate.createdAt)}
                  </p>
                </div>
                <StatusBadge status={candidate.status} className="text-sm" />
              </div>
              <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              {candidate.message && (
                <div className="mt-6 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message from candidate</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{candidate.message}</p>
                </div>
              )}
            </Card>

            <Card title="Actions" description="Emails are sent automatically where relevant.">
              <div className="flex justify-start">
                <CandidateActions candidate={candidate} adminId={user._id} size="md" onUpdated={(updated) => (updated ? setCandidate(updated) : load())} />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Resume">
              {candidate.resumeLink ? (
                <div className="space-y-2">
                  <a
                    href={candidate.resumeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-medium text-indigo-700 hover:underline"
                  >
                    {candidate.resumeLink}
                  </a>
                  <p className="text-xs text-slate-500">Submitted {formatDateTime(candidate.resumeSubmittedAt)}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Not submitted yet.{' '}
                  {candidate.status === 'shortlisted' && 'Use “Email resume link” to request it.'}
                </p>
              )}
            </Card>

            <Card title="History">
              <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {[...(candidate.statusHistory || [])].reverse().map((entry, i) => (
                  <li key={`${entry.status}-${entry.at}-${i}`} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                    <StatusBadge status={entry.status} />
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(entry.at)} · {entry.by}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
