// Mirrors backend/models/User.js `formattedName()` — needed because several
// admin endpoints return raw populated User sub-documents (surname,
// givenName, middleName) without a precomputed formattedName field, unlike
// the auth/login response which already includes one.
export function formatUserName(user) {
  if (!user) return 'Unknown';
  if (user.formattedName && typeof user.formattedName === 'string') return user.formattedName;
  const surname = (user.surname || '').toUpperCase();
  const given = user.givenName || '';
  const middleInitial = user.middleName ? `${user.middleName.trim().charAt(0).toUpperCase()}.` : '';
  return [`${surname},`, given, middleInitial].filter(Boolean).join(' ').trim();
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
