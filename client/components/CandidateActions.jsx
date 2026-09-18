'use client';

import { useState } from 'react';
import { candidateApi } from '@/app/redux/api/candidateApi';
import { errorMessage } from '@/app/redux/api/client';
import { useToast } from './Toast';
import { Button, ConfirmModal } from './ui';
import { fullName } from './format';

/** Which actions make sense for each status. */
const ACTIONS_BY_STATUS = {
  pending: ['shortlist', 'discard'],
  shortlisted: ['invite', 'hire', 'pending', 'discard'],
  invited: ['hire', 'pending', 'discard'],
  discarded: ['pending'],
  employee: [],
};

const ACTIONS = {
  shortlist: { label: 'Shortlist', variant: 'primary' },
  invite: { label: 'Email resume link', variant: 'secondary' },
  hire: { label: 'Hire as employee', variant: 'success' },
  pending: { label: 'Move to pending', variant: 'ghost' },
  discard: { label: 'Discard', variant: 'ghost', className: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' },
};

export default function CandidateActions({ candidate, adminId, onUpdated, size = 'sm' }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [confirmHire, setConfirmHire] = useState(false);

  const run = async (action) => {
    setBusy(action);
    try {
      let res;
      if (action === 'shortlist') res = await candidateApi.setStatus(adminId, candidate._id, 'shortlisted');
      else if (action === 'discard') res = await candidateApi.setStatus(adminId, candidate._id, 'discarded');
      else if (action === 'pending') res = await candidateApi.setStatus(adminId, candidate._id, 'pending');
      else if (action === 'invite') res = await candidateApi.inviteOne(candidate._id);
      else if (action === 'hire') res = await candidateApi.convertToEmployee(adminId, candidate._id);
      toast.success(res.message);
      setConfirmHire(false);
      onUpdated?.(res.candidate);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const actions = ACTIONS_BY_STATUS[candidate.status] || [];
  if (!actions.length) return <span className="text-xs text-slate-400">No actions</span>;

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        {actions.map((action) => {
          const spec = ACTIONS[action];
          return (
            <Button
              key={action}
              size={size}
              variant={spec.variant}
              className={spec.className}
              loading={busy === action}
              disabled={Boolean(busy)}
              onClick={() => (action === 'hire' ? setConfirmHire(true) : run(action))}
            >
              {spec.label}
            </Button>
          );
        })}
      </div>
      <ConfirmModal
        open={confirmHire}
        title="Hire this candidate?"
        message={`${fullName(candidate)} will get an employee account with a referral ID. Their login details are emailed to ${candidate.email}.`}
        confirmLabel="Hire"
        variant="success"
        loading={busy === 'hire'}
        onConfirm={() => run('hire')}
        onClose={() => setConfirmHire(false)}
      />
    </>
  );
}
