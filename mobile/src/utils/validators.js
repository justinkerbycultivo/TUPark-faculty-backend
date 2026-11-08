// Client-side validation that mirrors backend/routes/auth.js exactly, so the
// user gets the same feedback before a round-trip to the server.

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const STUDENT_ID_RE = /^\d{4}-\d{4,6}$/;
export const CONTACT_RE = /^09\d{9}$/;
export const PLATE_RE = /^[A-Za-z0-9-]{3,10}$/;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function isValidStudentId(value) {
  return STUDENT_ID_RE.test(String(value || '').trim());
}

export function isValidContactNumber(value) {
  return CONTACT_RE.test(String(value || '').trim());
}

export function isValidPlateNumber(value) {
  return PLATE_RE.test(String(value || '').trim());
}

export function isValidPassword(value) {
  return PASSWORD_RE.test(String(value || ''));
}

// Extracts a readable message from an axios error, falling back to a
// generic one. Never fabricates specifics the backend didn't send.
export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message === 'Network Error') {
    return 'Cannot reach the TUPark server. Check your network connection and the API address in config.js.';
  }
  if (error?.message) return error.message;
  return fallback;
}
