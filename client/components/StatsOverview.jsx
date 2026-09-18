'use client';

import Link from 'next/link';
import RevenueChart from './RevenueChart';
import { Card, EmptyState, StatCard, StatusBadge } from './ui';
import { formatDate, formatINR, fullName } from './format';

const PIPELINE = ['pending', 'shortlisted', 'invited', 'employee', 'discarded'];

export default function StatsOverview({ stats }) {
  const { totals, candidates, monthly, topEmployees, recentCustomers } = stats;
  const pipelineMax = Math.max(...PIPELINE.map((s) => candidates[s] || 0), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue collected" value={formatINR(totals.revenue)} hint={`${totals.paidSales} paid sales`} />
        <StatCard label="Customers" value={totals.customers} hint={`${totals.pendingPayments} awaiting payment`} />
        <StatCard label="Employees" value={totals.employees} hint={`${totals.admins} admins`} />
        <StatCard label="Candidates" value={totals.candidates} hint={`${candidates.pending || 0} awaiting review`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Monthly revenue" description="Paid sales, last 6 months" className="lg:col-span-2">
          <RevenueChart data={monthly} />
        </Card>

        <Card title="Recruitment pipeline" description="Candidates by status">
          <ul className="space-y-4">
            {PIPELINE.map((status) => {
              const count = candidates[status] || 0;
              return (
                <li key={status}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium tabular-nums text-slate-900">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(count / pipelineMax) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top performers" description="By revenue from referred customers" bodyClassName="p-0">
          {topEmployees.length ? (
            <ol className="divide-y divide-slate-100">
              {topEmployees.map((emp, i) => (
                <li key={emp.referralId} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-5 text-sm font-semibold text-slate-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {emp.employeeId ? (
                      <Link href={`/view-emp/${emp.employeeId}`} className="font-medium text-slate-900 hover:text-indigo-700">
                        {emp.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900">{emp.name}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      {emp.referralId} · {emp.customers} customer{emp.customers === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-slate-900">{formatINR(emp.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No sales yet" description="Employees appear here once their customers sign up." />
          )}
        </Card>

        <Card title="Recent customers" bodyClassName="p-0">
          {recentCustomers.length ? (
            <ul className="divide-y divide-slate-100">
              {recentCustomers.map((c) => (
                <li key={c._id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{fullName(c)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(c.createdAt)} · via {c.referralId}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-slate-700">{formatINR(c.amount)}</span>
                  <StatusBadge status={c.paymentStatus} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No customers yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
