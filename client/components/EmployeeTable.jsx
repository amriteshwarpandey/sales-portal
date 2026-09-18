'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEmployees, fetchStats } from '@/app/redux/slice/adminSlice';
import { employeeApi } from '@/app/redux/api/employeeApi';
import { errorMessage } from '@/app/redux/api/client';
import { useToast } from './Toast';
import { useDebounce } from './useDebounce';
import { useSocketEvent } from './useSocket';
import { Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Pagination, Spinner, Table, Td, cx } from './ui';
import { formatDate, fullName } from './format';

const COLUMNS = [
  { field: 'firstName', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'referralId', label: 'Referral ID' },
  { field: 'totalCustomers', label: 'Customers' },
  { field: 'createdAt', label: 'Joined' },
];

function SortHeader({ column, query, onSort }) {
  const active = query.sortField === column.field;
  const arrow = active ? (query.sortOrder === 'asc' ? '↑' : '↓') : '↕';
  return (
    <button
      onClick={() => onSort(column.field)}
      className={cx('inline-flex items-center gap-1 uppercase', active ? 'text-slate-900' : 'hover:text-slate-700')}
      aria-label={`Sort by ${column.label}`}
    >
      {column.label}
      <span className={active ? 'text-indigo-600' : 'text-slate-300'}>{arrow}</span>
    </button>
  );
}

export default function EmployeeTable() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { items, pagination, query, status, error } = useSelector((state) => state.admin.employees);
  const [search, setSearch] = useState(query.q);
  const debounced = useDebounce(search);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      dispatch(fetchEmployees({}));
      return;
    }
    dispatch(fetchEmployees({ q: debounced, page: 1 }));
  }, [debounced, dispatch]);

  useSocketEvent('employeeUpdateResponse', () => dispatch(fetchEmployees({})));
  useSocketEvent('employeeDeleted', () => dispatch(fetchEmployees({})));

  const onSort = (field) => {
    const sortOrder = query.sortField === field && query.sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch(fetchEmployees({ sortField: field, sortOrder, page: 1 }));
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await employeeApi.deleteEmployee(toDelete._id);
      toast.success(`${fullName(toDelete)} was removed`);
      setToDelete(null);
      dispatch(fetchEmployees({}));
      dispatch(fetchStats());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card
      title="Employees"
      description="Employees are created by converting hired candidates."
      bodyClassName="p-0"
      actions={
        <div className="w-full sm:w-64">
          <Input type="search" placeholder="Search name, email, referral ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search employees" />
        </div>
      }
    >
      {status === 'failed' ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={() => dispatch(fetchEmployees({}))} />
        </div>
      ) : status !== 'loading' && items.length === 0 ? (
        <EmptyState
          title={query.q ? 'No matching employees' : 'No employees yet'}
          description={query.q ? 'Try a different search.' : 'Convert a candidate to an employee from the Candidates page.'}
        />
      ) : (
        <div className={cx('relative', status === 'loading' && 'opacity-60')}>
          {status === 'loading' && items.length === 0 && (
            <div className="flex justify-center py-10 text-slate-400">
              <Spinner />
            </div>
          )}
          {items.length > 0 && (
            <Table head={[...COLUMNS.map((c) => <SortHeader key={c.field} column={c} query={query} onSort={onSort} />), '']}>
              {items.map((emp) => (
                <tr key={emp._id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/view-emp/${emp._id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {fullName(emp)}
                    </Link>
                  </Td>
                  <Td>{emp.email}</Td>
                  <Td className="font-mono text-xs">{emp.referralId}</Td>
                  <Td className="tabular-nums">{emp.totalCustomers}</Td>
                  <Td>{formatDate(emp.createdAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/view-emp/${emp._id}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                        View
                      </Link>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setToDelete(emp)}>
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination pagination={pagination} onPage={(page) => dispatch(fetchEmployees({ page }))} />
        </div>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        title="Delete employee?"
        message={toDelete ? `${fullName(toDelete)} (${toDelete.referralId}) will lose access immediately. Their customers stay in the system.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Card>
  );
}
