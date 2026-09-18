'use client';

import { useState } from 'react';
import { employeeApi } from '@/app/redux/api/employeeApi';
import { errorMessage } from '@/app/redux/api/client';
import { useToast } from './Toast';
import { Button, Card, EmptyState, Input, Modal, Select, StatusBadge, Table, Td, Textarea, cx } from './ui';
import { capitalize, formatDate, formatINR, fullName } from './format';

const PLANS = [
  ['basic', 'Basic'],
  ['standard', 'Standard'],
  ['premium', 'Premium'],
];

function EditCustomerModal({ customer, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city || '',
    notes: customer.notes || '',
    plan: customer.plan,
  });
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (customer.paymentStatus !== 'pending') delete data.plan;
      await employeeApi.updateCustomer(customer._id, data);
      toast.success('Customer updated');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${fullName(customer)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-customer" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-customer" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={form.firstName} onChange={set('firstName')} required />
        <Input label="Last name" value={form.lastName} onChange={set('lastName')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Input label="Phone" value={form.phone} onChange={set('phone')} required />
        <Input label="City" value={form.city} onChange={set('city')} />
        <Select
          label="Plan"
          value={form.plan}
          onChange={set('plan')}
          disabled={customer.paymentStatus !== 'pending'}
          hint={customer.paymentStatus !== 'pending' ? 'Locked after payment' : undefined}
        >
          {PLANS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <div className="sm:col-span-2">
          <Textarea label="Notes" value={form.notes} onChange={set('notes')} maxLength={2000} />
        </div>
      </form>
    </Modal>
  );
}

/** Customers referred by one employee. */
export default function EmployeeCustomers({ customers, loading, filter, onFilter, onChanged, editable = true, title = 'Customers' }) {
  const [editing, setEditing] = useState(null);

  return (
    <Card
      title={title}
      bodyClassName="p-0"
      actions={
        <div className="w-40">
          <Select aria-label="Filter by payment status" value={filter} onChange={(e) => onFilter(e.target.value)}>
            <option value="">All payments</option>
            {['pending', 'paid', 'failed', 'refunded'].map((s) => (
              <option key={s} value={s}>
                {capitalize(s)}
              </option>
            ))}
          </Select>
        </div>
      }
    >
      {customers.length === 0 && !loading ? (
        <EmptyState
          title={filter ? `No ${filter} customers` : 'No customers yet'}
          description={filter ? undefined : 'Customers who sign up with this referral ID will appear here.'}
        />
      ) : (
        <div className={cx(loading && 'opacity-60')}>
          <Table head={['Customer', 'Plan', 'Amount', 'Payment', 'Joined', ...(editable ? [''] : [])]}>
            {customers.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-900">{fullName(c)}</p>
                  <p className="text-xs text-slate-500">
                    {c.email} · {c.phone}
                    {c.city ? ` · ${c.city}` : ''}
                  </p>
                </Td>
                <Td>{capitalize(c.plan)}</Td>
                <Td className="tabular-nums">{formatINR(c.amount)}</Td>
                <Td>
                  <StatusBadge status={c.paymentStatus} />
                </Td>
                <Td>{formatDate(c.createdAt)}</Td>
                {editable && (
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                      Edit
                    </Button>
                  </Td>
                )}
              </tr>
            ))}
          </Table>
        </div>
      )}

      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </Card>
  );
}
