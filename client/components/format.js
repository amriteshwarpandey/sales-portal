/** Amounts are stored in paise. */
export function formatINR(paise, { compact = false } = {}) {
  const rupees = (paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(rupees);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const fullName = (person) => (person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '');

export const initials = (person) =>
  person ? `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase() : '?';

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
