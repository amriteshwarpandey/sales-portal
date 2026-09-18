'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllCustomers, fetchStats } from '@/app/redux/slice/adminSlice';
import { adminApi } from '@/app/redux/api/adminApi';
import { errorMessage } from '@/app/redux/api/client';
import { useToast } from './Toast';
import { useDebounce } from './useDebounce';
import { useSocketEvent } from './useSocket';
import { Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Modal, Pagination, Select, Spinner, StatusBadge, Table, Td, cx } from './ui';
import { capitalize, formatDate, formatINR, fullName } from './format';

/** Admin view of every customer, with payment confirmation and refunds. */
export default function CustomerTable() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { items, pagination, query, status, error } = useSelector((state) => state.admin.customers);
  const [search, setSearch] = useState(query.q || '');
  const debounced = useDebounce(search);
  const [markPaid, setMarkPaid] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'refund'|'delete', customer }
  const [busy, setBusy] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      dispatch(fetchAllCustomers({}));
      return;
    }
    dispatch(fetchAllCustomers({ q: debounced, page: 1 }));
  }, [debounced, dispatch]);

  useSocketEvent('customerUpdate', () => dispatch(fetchAllCustomers({})));

  const refresh = () => {
    dispatch(fetchAllCustomers({}));
    dispatch(fetchStats());
  };

  const act = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMessage);
      setMarkPaid(null);
      setConfirm(null);
      setTxnRef('');
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Customers"
      description="Customers sign up with an employee's referral ID."
      bodyClassName="p-0"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="sm:w-40">
            <Select
              aria-label="Filter by payment status"
              value={query.paymentStatus || ''}
              onChange={(e) => dispatch(fetchAllCustomers({ paymentStatus: e.target.value, page: 1 }))}
            >
              <option value="">All payments</option>
              {['pending', 'paid', 'failed', 'refunded'].map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-60">
            <Input type="search" placeholder="Search customers" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
          </div>
        </div>
      }
    >
      {status === 'failed' ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      ) : status !== 'loading' && items.length === 0 ? (
        <EmptyState title="No customers found" description="Share a referral link to get your first sale." />
      ) : (
        <div className={cx(status === 'loading' && 'opacity-60')}>
          {status === 'loading' && items.length === 0 && (
            <div className="flex justify-center py-10 text-slate-400">
              <Spinner />
            </div>
          )}
          {items.length > 0 && (
            <Table head={['Customer', 'Plan', 'Amount', 'Payment', 'Referral', 'Joined', '']}>
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <Td>
                    <p className="font-medium text-slate-900">{fullName(c)}</p>
                    <p className="text-xs text-slate-500">
                      {c.email} · {c.phone}
                    </p>
                  </Td>
                  <Td>{capitalize(c.plan)}</Td>
                  <Td className="tabular-nums">{formatINR(c.amount)}</Td>
                  <Td>
                    <StatusBadge status={c.paymentStatus} />
                    {c.payment?.transactionId && <p className="mt-1 font-mono text-[11px] text-slate-400">{c.payment.transactionId}</p>}
                  </Td>
                  <Td className="font-mono text-xs">{c.referralId}</Td>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.paymentStatus !== 'paid' && (
                        <Button variant="ghost" size="sm" className="text-emerald-700 hover:bg-emerald-50" onClick={() => setMarkPaid(c)}>
                          Mark paid
                        </Button>
                      )}
                      {c.paymentStatus === 'paid' && (
                        <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'refund', customer: c })}>
                          Refund
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirm({ type: 'delete', customer: c })}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination pagination={pagination} onPage={(page) => dispatch(fetchAllCustomers({ page }))} />
        </div>
      )}

      <Modal
        open={Boolean(markPaid)}
        onClose={() => setMarkPaid(null)}
        title="Confirm offline payment"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMarkPaid(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="success"
              loading={busy}
              onClick={() => act(() => adminApi.setPaymentStatus(markPaid._id, 'paid', txnRef), 'Payment confirmed')}
            >
              Confirm payment
            </Button>
          </>
        }
      >
        {markPaid && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Record a payment of <b>{formatINR(markPaid.amount)}</b> from {fullName(markPaid)} received outside the online checkout.
            </p>
            <Input label="Transaction reference (optional)" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="e.g. UPI ref or cheque no." />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.type === 'refund' ? 'Mark as refunded?' : 'Delete customer?'}
        message={
          confirm
            ? confirm.type === 'refund'
              ? `Record a refund of ${formatINR(confirm.customer.amount)} to ${fullName(confirm.customer)}. This does not move money by itself.`
              : `${fullName(confirm.customer)} will be removed permanently.`
            : ''
        }
        confirmLabel={confirm?.type === 'refund' ? 'Mark refunded' : 'Delete'}
        loading={busy}
        onConfirm={() =>
          confirm.type === 'refund'
            ? act(() => adminApi.setPaymentStatus(confirm.customer._id, 'refunded'), 'Marked as refunded')
            : act(() => adminApi.deleteCustomer(confirm.customer._id), 'Customer deleted')
        }
        onClose={() => setConfirm(null)}
      />
    </Card>
  );
}
