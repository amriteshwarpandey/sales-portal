'use client';

import { useEffect, useId } from 'react';
import { capitalize } from './format';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600 disabled:bg-indigo-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 disabled:bg-rose-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600 disabled:bg-emerald-300',
};

const BUTTON_SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 py-24 text-slate-500">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Field({ label, error, hint, id, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50';

export function Input({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <input id={id} className={cx(inputClass, error && 'border-rose-400', className)} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, className, children, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <select id={id} className={cx(inputClass, 'pr-8', className)} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} id={id}>
      <textarea id={id} className={cx(inputClass, 'min-h-24', className)} {...props} />
    </Field>
  );
}

export function Card({ title, description, actions, className, bodyClassName, children }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

const BADGE_TONES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  shortlisted: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  invited: 'bg-violet-50 text-violet-800 ring-violet-600/20',
  discarded: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  employee: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  failed: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  refunded: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  admin: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20',
  masteradmin: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

const BADGE_ICONS = {
  pending: '◷',
  shortlisted: '★',
  invited: '✉',
  discarded: '✕',
  employee: '✓',
  paid: '✓',
  failed: '!',
  refunded: '↺',
};

const BADGE_LABELS = { masteradmin: 'Master admin' };

/** Status pill: always icon + text, never color alone. */
export function StatusBadge({ status, className }) {
  const tone = BADGE_TONES[status] || BADGE_TONES.neutral;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tone, className)}>
      {BADGE_ICONS[status] && <span aria-hidden="true">{BADGE_ICONS[status]}</span>}
      {BADGE_LABELS[status] || capitalize(status)}
    </span>
  );
}

export function StatCard({ label, value, hint, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cx('mt-2 text-2xl font-semibold tracking-tight', accent || 'text-slate-900')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">∅</div>
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <p className="font-medium text-rose-900">Something went wrong</p>
      <p className="text-sm text-rose-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx('animate-fade-in max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-xl', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', variant = 'danger', loading, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            active === tab.id
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cx('ml-2 rounded-full px-2 py-0.5 text-xs', active === tab.id ? 'bg-indigo-50' : 'bg-slate-100')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Table shell with horizontal scroll on narrow screens. */
export function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h, i) => (
              <th
                key={typeof h === 'string' ? h : i}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cx('whitespace-nowrap px-4 py-3 text-slate-700', className)} {...props}>
      {children}
    </td>
  );
}

export { cx };
